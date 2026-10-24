import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://127.0.0.1:5199";
const OUT = "./artifacts-verify/";
mkdirSync(OUT, { recursive: true });

async function getPageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${CDP_BASE}/json/list`);
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
  width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
});

const evaluate = async (expression) => {
  const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

const waitFor = async (expression, label, timeoutMs = 45000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { if (await evaluate(expression)) return true; } catch {}
    await sleep(350);
  }
  throw new Error(`Timeout waiting for: ${label}`);
};

const shot = async (name, opts = {}) => {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png", ...opts });
  writeFileSync(OUT + name, Buffer.from(data, "base64"));
};

const fallos = [];
const check = (nombre, ok, detalle = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nombre}${detalle ? " · " + detalle : ""}`);
  if (!ok) fallos.push(nombre);
};

// ── 1. Origen + semilla ────────────────────────────────────────────────────
await cdp.send("Page.navigate", { url: `${APP}/login` });
await sleep(2500);

const ORG = {
  id: "org_verify",
  nombre: "Boutique Roma",
  slug: "boutique-roma",
  pais: "Colombia",
  moneda: "COP",
  zonaHoraria: "America/Bogota",
  tipoEmpresa: "Retail & Comercio minorista",
  tamanoEquipo: "2 a 10 personas",
  logoUrl: "",
  descripcion: "Ropa femenina de autor, hecha en talleres locales.",
  sitioWeb: "https://boutiqueroma.co",
  fechaCreacion: new Date().toISOString(),
};

await evaluate(`(() => {
  localStorage.setItem("necto.session", JSON.stringify({
    modulos: ["pedidos", "inventarios"],
    tipoSesion: "administrador",
    operadorSimuladoId: null,
    preSimulacion: null,
  }));
  localStorage.setItem("necto.organizacion.v1", JSON.stringify({
    usuario: null,
    organizacion: ${JSON.stringify(ORG)},
    organizaciones: [${JSON.stringify(ORG)}],
  }));
  return true;
})()`);

// ── 2. Ir a la pestaña ─────────────────────────────────────────────────────
await cdp.send("Page.navigate", { url: `${APP}/configuracion?tab=general` });
await waitFor(
  `!!document.querySelector('section[aria-label="Vista previa de la identidad del negocio"]')`,
  "la vista previa monta",
  60000
);
await sleep(800);

check("estoy en la pestaña general",
  (await evaluate("location.pathname + location.search")) === "/configuracion?tab=general",
  await evaluate("location.pathname + location.search"));

// ── 3. Contenido real ──────────────────────────────────────────────────────
const nombrePrevia = await evaluate(
  `(() => { const s = document.querySelector('section[aria-label="Vista previa de la identidad del negocio"]');
    return s ? s.querySelector('h3').textContent.trim() : null; })()`
);
check("la vista previa pinta el nombre del negocio", nombrePrevia === "Boutique Roma", String(nombrePrevia));

const datos = await evaluate(
  `(() => { const s = document.querySelector('section[aria-label="Vista previa de la identidad del negocio"]');
    if (!s) return null;
    return [...s.querySelectorAll('p')].map(p => p.textContent.trim()).filter(Boolean); })()`
);
check("la vista previa muestra país, moneda y zona",
  JSON.stringify(datos).includes("Colombia") &&
  JSON.stringify(datos).includes("COP") &&
  JSON.stringify(datos).includes("America/Bogota"),
  JSON.stringify(datos));

check("la descripción sembrada se pinta",
  (await evaluate("document.body.textContent")).includes("Ropa femenina de autor"));

const titulos = await evaluate(
  `[...document.querySelectorAll('h2')].map(h => h.textContent.trim())`
);
check("existen los bloques Datos / Imágenes", 
  titulos.includes("Datos del negocio") && titulos.includes("Imágenes de la identidad"),
  JSON.stringify(titulos));

const fileInputs = await evaluate(`document.querySelectorAll('input[type=file]').length`);
check("hay dos selectores de imagen", fileInputs === 2, `n=${fileInputs}`);

// ── 4. Capturas ────────────────────────────────────────────────────────────
await shot("general-viewport.png");
await shot("general-full.png", { captureBeyondViewport: true });

const errs = cdp.events.filter((e) => e.method === "Runtime.exceptionThrown");
check("sin excepciones en runtime", errs.length === 0, `${errs.length}`);

console.log(`\nRESULTADO: ${fallos.length === 0 ? "TODO OK" : fallos.length + " FALLOS"}`);
cdp.close();
process.exit(fallos.length === 0 ? 0 : 1);
