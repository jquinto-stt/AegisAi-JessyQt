// ═══════════════════════════════════════════════════════════════════════════
// Sonda de tarjetas de métrica — ¿existe el tono «neutro» en /inventarios?
// ═══════════════════════════════════════════════════════════════════════════
//
// El control negativo del censo pinchó el tono `neutro` de `TarjetaMetrica` y el
// censo siguió VERDE. Hay dos explicaciones y no se parecen en nada:
//   (a) el instrumento es ciego (no mira el icono de esa tarjeta), o
//   (b) la tarjeta no se renderiza con los datos de demo.
// Esta sonda distingue (a) de (b): lista los iconos de tarjeta y su color/bg
// computados. Si `neutro` no aparece, el punto de sabotaje estaba muerto y hay
// que elegir otro — el verde del censo no estaba mintiendo por ceguera.
//
// Se usa el `WebSocket` global de Node 22 (NO `import 'ws'`): un `import` desde
// `%TEMP%` no resuelve el paquete y el script muere con ERR_MODULE_NOT_FOUND.

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://localhost:6020";
const TEMA = process.env.TEMA || "claro";

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const t = (await (await fetch(CDP_BASE + "/json/list")).json())
        .find((x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
      if (t) return t;
    } catch { /* Chrome aún no está listo */ }
    await new Promise((s) => setTimeout(s, 250));
  }
  throw new Error("sin target CDP");
}

const ws = new WebSocket((await target()).webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res) => ws.addEventListener("open", res));
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
});
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => { const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
const sleep = (m) => new Promise((s) => setTimeout(s, m));

await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

// Sembrar sesión (misma forma que los otros arneses).
await send("Page.navigate", { url: APP + "/login" });
await sleep(2500);
await ev(`(() => {
  localStorage.setItem('necto.session', JSON.stringify({ modulos:['pedidos','inventarios'], tipoSesion:'administrador', operadorSimuladoId:null, preSimulacion:null }));
  const c = { whatsapp:false, telegram:false, instagram:false, webchat:false, asistente:false };
  localStorage.setItem('necto.organizacion.v1', JSON.stringify({
    usuario:{nombre:'Vera',email:'demo@necto.io'},
    organizacion:{nombre:'Necto Demo',moneda:'COP',pais:'Colombia',zonaHoraria:'America/Bogota'},
    modulos:{ pedidos:{instalado:true,activo:true,conectores:c}, inventarios:{instalado:true,activo:true,conectores:c} },
  }));
  return true;
})()`);

const v = TEMA === "oscuro" ? "dark" : "light";
await ev(
  "(() => {" +
  "  let actual = {};" +
  "  try { actual = JSON.parse(localStorage.getItem('webforge-ui-preferences') || '{}'); } catch (e) {}" +
  "  localStorage.setItem('webforge-ui-preferences', JSON.stringify(Object.assign({}, actual, { theme: '" + v + "' })));" +
  "  return true;" +
  "})()"
);

await send("Page.navigate", { url: APP + "/inventarios" });
await sleep(3200);

console.log("tema fijado: " + v + " · ruta /inventarios");

const res = await ev(`(() => {
  const salida = [];
  for (const sp of document.querySelectorAll('span')) {
    const cs = getComputedStyle(sp);
    const h = sp.getBoundingClientRect().height;
    if (h < 30 || h > 50) continue;
    if (sp.children.length > 0) continue;
    salida.push({ texto: (sp.textContent || '').slice(0, 24), color: cs.color, bg: cs.backgroundColor, alto: Math.round(h) });
  }
  return JSON.stringify(salida.slice(0, 40));
})()`);

const lista = JSON.parse(res);
console.log("candidatos a icono de tarjeta: " + lista.length);
for (const o of lista) {
  const marca = o.color === "rgb(102, 112, 133)" ? "  <-- #667085 = gray-500" : "";
  console.log("  " + o.alto + "px  color=" + o.color + "  bg=" + o.bg + marca);
}

ws.close();
