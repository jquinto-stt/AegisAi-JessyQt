import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://127.0.0.1:5199";
const OUT = "./artifacts-verify/";
mkdirSync(OUT, { recursive: true });

async function getPageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${CDP_BASE}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl && !t.url.startsWith("devtools"));
      if (page) return page;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("No CDP page target");
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
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

const evaluate = async (expression) => {
  const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

const waitFor = async (expression, label, timeoutMs = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { if (await evaluate(expression)) return true; } catch {}
    await sleep(300);
  }
  throw new Error(`Timeout: ${label}`);
};

const fallos = [];
const check = (n, ok, d = "") => { console.log(`${ok ? "OK  " : "FAIL"} ${n}${d ? " · " + d : ""}`); if (!ok) fallos.push(n); };

const MODULOS = {
  pedidos: { instalado: true, activo: true, conectores: { necto_ia: false, whatsapp: true } },
  inventarios: { instalado: true, activo: true, conectores: { necto_ia: false, whatsapp: false } },
};
const ORG = {
  id: "org_verify", nombre: "Boutique Roma", slug: "boutique-roma",
  pais: "Colombia", moneda: "COP", zonaHoraria: "America/Bogota",
  tipoEmpresa: "Retail & Comercio minorista", tamanoEquipo: "2 a 5 personas",
  logoUrl: "", descripcion: "", sitioWeb: "", fechaCreacion: new Date().toISOString(),
};

await cdp.send("Page.navigate", { url: `${APP}/login` });
await sleep(2500);
await evaluate(`(() => {
  const org = { ...${JSON.stringify(ORG)}, modulos: ${JSON.stringify(MODULOS)} };
  localStorage.setItem("necto.session", JSON.stringify({ modulos: ["pedidos","inventarios"], tipoSesion: "administrador", operadorSimuladoId: null, preSimulacion: null }));
  localStorage.setItem("necto.organizacion.v1", JSON.stringify({ usuario: null, organizacion: org, organizaciones: [org], modulos: ${JSON.stringify(MODULOS)} }));
  localStorage.removeItem("necto.pedidosVista");
  const raw = localStorage.getItem("webforge-ui-preferences") || "{}";
  let ui = {}; try { ui = JSON.parse(raw); } catch {}
  ui.themePreference = "light"; localStorage.setItem("webforge-ui-preferences", JSON.stringify(ui));
  return true;
})()`);

await cdp.send("Page.navigate", { url: `${APP}/pedidos` });
await waitFor(`document.body.innerText.includes("Añadir pedido")`, "el tablero");
await sleep(1000);

const chips = () =>
  evaluate(`(() => {
    const b = [...document.querySelectorAll('button[aria-pressed]')].filter(x => ['Por confirmar','Pendiente'].includes(x.textContent.trim()));
    return b.map(x => ({ t: x.textContent.trim(), p: x.getAttribute('aria-pressed') }));
  })()`);

// ── 1. Los dos chips de Inicio ────────────────────────────────────────────
const c0 = await chips();
check("en Inicio están los botones Por confirmar y Pendiente",
  c0.map((c) => c.t).join("|") === "Por confirmar|Pendiente", JSON.stringify(c0));
check("arrancan apagados", c0.every((c) => c.p === "false"), JSON.stringify(c0));

const filasBase = await evaluate(`document.querySelectorAll('tbody tr').length`);

await evaluate(`[...document.querySelectorAll('button[aria-pressed]')].find(b => b.textContent.trim() === 'Por confirmar').click()`);
await sleep(700);
const filasConf = await evaluate(`document.querySelectorAll('tbody tr').length`);
check("«Por confirmar» filtra la tabla", filasConf <= filasBase, `${filasBase} → ${filasConf}`);
check("el chip queda encendido", (await chips())[0].p === "true");

await evaluate(`[...document.querySelectorAll('button[aria-pressed]')].find(b => b.textContent.trim() === 'Pendiente').click()`);
await sleep(700);
const filasAmbos = await evaluate(`document.querySelectorAll('tbody tr').length`);
check("«Pendiente» se suma al filtro", filasAmbos <= filasConf, `${filasConf} → ${filasAmbos}`);

const { data: shot1 } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
writeFileSync(OUT + "chips-inicio.png", Buffer.from(shot1, "base64"));

// ── 2. Restablecer ────────────────────────────────────────────────────────
const hayReset = await evaluate(`!!document.querySelector('button[aria-label="Restablecer filtros"]')`);
check("existe el botón de restablecer", hayReset);

await evaluate(`document.querySelector('button[aria-label="Restablecer filtros"]').click()`);
await sleep(800);
const c1 = await chips();
const filasReset = await evaluate(`document.querySelectorAll('tbody tr').length`);
check("restablecer apaga los chips", c1.every((c) => c.p === "false"), JSON.stringify(c1));
check("y devuelve la etapa inicial (Por preparar)", filasReset === filasBase, `${filasReset} vs ${filasBase}`);
const etapaActiva = await evaluate(`(() => {
  const b = [...document.querySelectorAll('button[aria-pressed]')].find(x => /Por preparar/.test(x.textContent));
  return b ? b.getAttribute('aria-pressed') : null;
})()`);
check("la etapa vuelve a «Por preparar»", etapaActiva === "true", String(etapaActiva));

// ── 3. El reset también limpia en Tabla ───────────────────────────────────
await evaluate(`[...document.querySelectorAll('button[aria-pressed]')].find(b => b.textContent.trim() === 'Tabla').click()`);
await sleep(800);
await evaluate(`[...document.querySelectorAll('button[aria-pressed]')].find(b => /En camino/.test(b.textContent)).click()`);
await sleep(600);
await evaluate(`document.querySelector('button[aria-label="Restablecer filtros"]').click()`);
await sleep(700);
const todasActiva = await evaluate(`(() => {
  const b = [...document.querySelectorAll('button[aria-pressed]')].find(x => /Todas las tareas/.test(x.textContent));
  return b ? b.getAttribute('aria-pressed') : null;
})()`);
check("en Tabla, restablecer vuelve a «Todas las tareas»", todasActiva === "true", String(todasActiva));

const errs = cdp.events.filter((e) => e.method === "Runtime.exceptionThrown");
check("sin excepciones en runtime", errs.length === 0, String(errs.length));

console.log(`\nRESULTADO: ${fallos.length === 0 ? "TODO OK" : fallos.length + " FALLOS"}`);
cdp.close();
process.exit(fallos.length === 0 ? 0 : 1);
