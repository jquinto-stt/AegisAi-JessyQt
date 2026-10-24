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

const pills = () =>
  evaluate(`[...document.querySelectorAll('button[aria-pressed]')]
    .filter(b => !['Inicio','Tabla','Lista'].includes(b.textContent.trim()))
    .map(b => b.textContent.replace(/\\s+/g,' ').trim())`);

// ── 1. Inicio: la regilla son las 4 etapas ────────────────────────────────
const pInicio = await pills();
check("en Inicio la regilla tiene las 4 etapas",
  pInicio.length === 4 &&
  /Por preparar/.test(pInicio[0]) && /En preparación/.test(pInicio[1]) &&
  /En tránsito/.test(pInicio[2]) && /Finalizadas/.test(pInicio[3]),
  JSON.stringify(pInicio));
check("cada etapa lleva su contador", pInicio.every((p) => /\d+$/.test(p)), JSON.stringify(pInicio));

const textoInicio = await evaluate("document.body.innerText");
// «Por confirmar» sí aparece en la tabla (sub-línea del estado); lo que no
// debe aparecer es la regilla de estados de Tabla.
check("no hay una segunda fila de filtros duplicada",
  !textoInicio.includes("Todas las tareas"));

const filasPorPreparar = await evaluate(`document.querySelectorAll('tbody tr').length`);
check("la tabla muestra solo la etapa activa", filasPorPreparar > 0, `${filasPorPreparar} filas`);

const { data: shot1 } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
writeFileSync(OUT + "filtros-inicio.png", Buffer.from(shot1, "base64"));

// ── 2. Cambiar de etapa cambia la tabla ───────────────────────────────────
await evaluate(`[...document.querySelectorAll('button[aria-pressed]')].find(b => /Finalizadas/.test(b.textContent)).click()`);
await sleep(700);
const filasFinalizadas = await evaluate(`document.querySelectorAll('tbody tr').length`);
const resumen = await evaluate("document.body.innerText");
check("cambiar de etapa cambia el contenido",
  filasFinalizadas !== filasPorPreparar || resumen.includes("Finalizadas ·"),
  `${filasPorPreparar} → ${filasFinalizadas}`);

// ── 3. Tabla: la regilla pasa a los estados ───────────────────────────────
await evaluate(`[...document.querySelectorAll('button[aria-pressed]')].find(b => b.textContent.trim() === 'Tabla').click()`);
await sleep(900);
const pTabla = await pills();
check("en Tabla la regilla son los estados",
  pTabla.some((p) => /Todas las tareas/.test(p)) && pTabla.some((p) => /En camino/.test(p)),
  JSON.stringify(pTabla));
check("y ya no están las etapas del inicio",
  !pTabla.some((p) => /Finalizadas/.test(p)), JSON.stringify(pTabla));

// ── 4. Lista: misma regilla de estados ────────────────────────────────────
await evaluate(`[...document.querySelectorAll('button[aria-pressed]')].find(b => b.textContent.trim() === 'Lista').click()`);
await sleep(900);
const pLista = await pills();
check("en Lista se mantiene la regilla de estados",
  pLista.some((p) => /Todas las tareas/.test(p)), JSON.stringify(pLista));

// ── 5. Volver a Inicio: recupera sus etapas ───────────────────────────────
await evaluate(`[...document.querySelectorAll('button[aria-pressed]')].find(b => b.textContent.trim() === 'Inicio').click()`);
await sleep(800);
const pVuelta = await pills();
check("al volver a Inicio reaparecen las etapas", pVuelta.length === 4, JSON.stringify(pVuelta));

const errs = cdp.events.filter((e) => e.method === "Runtime.exceptionThrown");
check("sin excepciones en runtime", errs.length === 0, String(errs.length));

console.log(`\nRESULTADO: ${fallos.length === 0 ? "TODO OK" : fallos.length + " FALLOS"}`);
cdp.close();
process.exit(fallos.length === 0 ? 0 : 1);
