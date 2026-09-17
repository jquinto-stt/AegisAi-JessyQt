// Sonda de descubrimiento: ¿qué renderiza de verdad la página de Analítica?
// Uso: CDP_BASE=http://127.0.0.1:9333 node probe.mjs
import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://localhost:4173";
const OUT = "C:/Users/Jessy/Documents/GitHub/StockFlow/outputs/verify-analitica/";
mkdirSync(OUT, { recursive: true });

async function getPageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(CDP_BASE + "/json/list");
      const targets = await res.json();
      const page = targets.find(
        (t) => t.type === "page" && t.webSocketDebuggerUrl && !t.url.startsWith("devtools")
      );
      if (page) return page;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("No CDP page target found");
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    const events = [];
    ws.addEventListener("open", () =>
      resolve({
        events,
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const msgId = ++id;
            pending.set(msgId, { res, rej });
            ws.send(JSON.stringify({ id: msgId, method, params }));
          });
        },
        close: () => ws.close(),
      })
    );
    ws.addEventListener("error", reject);
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method) events.push(msg);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
      }
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cdp = await connect((await getPageTarget()).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
await cdp.send("Page.enable");
await cdp.send("Network.enable");
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1100,
  deviceScaleFactor: 1,
  mobile: false,
});

const evaluate = async (expression) => {
  const r = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

const waitFor = async (expression, label, timeoutMs = 25000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      if (await evaluate(expression)) return true;
    } catch {}
    await sleep(350);
  }
  throw new Error("Timeout waiting for: " + label);
};

const q = (v) => JSON.stringify(v);

const SESSION = {
  modulos: ["pedidos"],
  tipoSesion: "administrador",
  operadorSimuladoId: null,
  preSimulacion: null,
};

// 1) Tomar el origen y sembrar la sesión (el guard `RequireSession` la exige).
await cdp.send("Page.navigate", { url: APP + "/" });
await waitFor("!!document.body", "body inicial");
await evaluate(
  'localStorage.setItem("necto.session", ' + q(JSON.stringify(SESSION)) + ")"
);

// 2) Ruta bajo prueba.
await cdp.send("Page.navigate", { url: APP + "/pedidos/analitica" });
await waitFor('location.pathname === "/pedidos/analitica"', "ruta analitica");
await waitFor('!!document.querySelector("h1")', "h1 montado");
await sleep(2500); // deja asentar los gráficos de Apex

const info = await evaluate(
  [
    "(() => {",
    "  const t = (el) => (el ? el.textContent.trim() : null);",
    "  const out = {};",
    "  out.path = location.pathname;",
    "  out.h1 = t(document.querySelector('h1'));",
    "  out.subtitulo = t(document.querySelector('h1') && document.querySelector('h1').nextElementSibling);",
    "  out.titulosTarjeta = [...document.querySelectorAll('main h2')].map(t);",
    "  out.canvas = document.querySelectorAll('.apexcharts-canvas').length;",
    "  out.barras = document.querySelectorAll('.apexcharts-bar-area').length;",
    "  out.etiquetasX = [...document.querySelectorAll('.apexcharts-xaxis-texts-g text')].map(t);",
    "  out.etiquetasY = [...document.querySelectorAll('.apexcharts-yaxis-texts-g text')].map(t);",
    "  out.leyendas = [...document.querySelectorAll('.apexcharts-legend-text')].map(t);",
    "  out.falso = /Visitantes|Desktop|Mobile|Tablet|Google|Facebook|Threads|tailadmin|Referral|Organic Search|Social|Usuarios activos|4[.]7K|22[.]1K/.test(document.body.innerText);",
    "  out.texto = (document.querySelector('main') || document.body).innerText.slice(0, 5000);",
    "  return out;",
    "})()",
  ].join("\n")
);

console.log(JSON.stringify(info, null, 2));

const shot = async (name) => {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(OUT + name, Buffer.from(data, "base64"));
};
await shot("probe-metricas.png");

const errs = cdp.events.filter(
  (e) =>
    e.method === "Runtime.exceptionThrown" &&
    !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e))
);
console.log("RUNTIME ERRORS:", errs.length ? JSON.stringify(errs.slice(0, 3)) : "(none)");

cdp.close();
process.exit(0);
