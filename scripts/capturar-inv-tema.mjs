// Captura las rutas de Inventarios en un tema dado, para revisarlas con el ojo.
const CDP_BASE = "http://127.0.0.1:9333", APP = "http://localhost:6020";
const TEMA = process.env.TEMA || "oscuro";
const OUT = "outputs/";
const { writeFileSync, mkdirSync } = await import("node:fs");
mkdirSync(OUT, { recursive: true });
const RUTAS = [["inicio","/inventarios"],["elementos","/inventarios/elementos"],["ubicaciones","/inventarios/ubicaciones"],["historial","/inventarios/historial"],["alertas","/inventarios/alertas"],["reportes","/inventarios/reportes"]];
async function target() {
  for (let i = 0; i < 40; i++) {
    try { const t = (await (await fetch(CDP_BASE + "/json/list")).json()).find((x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools")); if (t) return t; } catch {}
    await new Promise((s) => setTimeout(s, 250));
  }
  throw new Error("sin target CDP");
}
const ws = new WebSocket((await target()).webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res) => ws.addEventListener("open", res));
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } });
const send = (m, p = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async (x) => { const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
const sleep = (m) => new Promise((s) => setTimeout(s, m));
await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: APP + "/login" }); await sleep(2500);
await ev(`(() => { localStorage.setItem('necto.session', JSON.stringify({ modulos:['pedidos','inventarios'], tipoSesion:'administrador', operadorSimuladoId:null, preSimulacion:null })); const c={whatsapp:false,telegram:false,instagram:false,webchat:false,asistente:false}; localStorage.setItem('necto.organizacion.v1', JSON.stringify({ usuario:{nombre:'Vera',email:'demo@necto.io'}, organizacion:{nombre:'Necto Demo',moneda:'COP',pais:'Colombia',zonaHoraria:'America/Bogota'}, modulos:{ pedidos:{instalado:true,activo:true,conectores:c}, inventarios:{instalado:true,activo:true,conectores:c} } })); let a={}; try{a=JSON.parse(localStorage.getItem('webforge-ui-preferences')||'{}');}catch(e){} localStorage.setItem('webforge-ui-preferences', JSON.stringify(Object.assign({},a,{theme:'${TEMA === "oscuro" ? "dark" : "light"}'}))); return true; })()`);
for (const [nombre, ruta] of RUTAS) {
  await send("Page.navigate", { url: APP + ruta }); await sleep(4200);
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  const f = OUT + "inv-" + nombre + "-" + TEMA + ".png";
  writeFileSync(f, Buffer.from(data, "base64"));
  console.log("  " + f);
}
ws.close();
