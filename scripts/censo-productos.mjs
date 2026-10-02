// Comprobación puntual: ¿el catálogo de Productos ofrece dar de baja, o solo
// el detalle? Y ¿el elemento inactivo se distingue?
import { writeFileSync, mkdirSync } from "node:fs";
const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://localhost:6020";
mkdirSync("./artifacts-inv/", { recursive: true });

const r = await fetch(APP + "/");
if (r.status !== 200) { console.error("ABORTA: 6020 → " + r.status); process.exit(2); }
console.log("sonda de vida 6020 → " + r.status);

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const t = (await (await fetch(CDP_BASE + "/json/list")).json())
        .find((x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
      if (t) return t;
    } catch {}
    await new Promise((s) => setTimeout(s, 250));
  }
  throw new Error("sin target");
}
const ws = new WebSocket((await target()).webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res) => ws.addEventListener("open", res));
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
});
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => { const r = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
const sleep = (m) => new Promise((s) => setTimeout(s, m));

await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

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

await send("Page.navigate", { url: APP + "/inventarios/elementos" });
await sleep(3000);

console.log("\n── CATÁLOGO DE PRODUCTOS ──");
const censo = await ev(`(() => {
  const filas = [...document.querySelectorAll('main tbody tr')];
  return filas.map((tr) => {
    const celdas = [...tr.querySelectorAll('td')];
    const botones = [...tr.querySelectorAll('td button')].map(b => b.getAttribute('title') || b.textContent.trim());
    return {
      codigo: celdas[0]?.innerText.trim(),
      nombre: celdas[1]?.innerText.split('\\n')[0].trim(),
      estado: celdas[4]?.innerText.trim(),
      acciones: botones,
    };
  });
})()`);
for (const f of censo) console.log("  " + JSON.stringify(f));

const accionesGlobales = await ev(`[...document.querySelectorAll('main button')].map(b => b.textContent.trim()).filter(Boolean).slice(0, 14)`);
console.log("\n  botones visibles en main: " + JSON.stringify(accionesGlobales));

// ¿Aparece algún texto de baja/reactivar en la pantalla del catálogo?
const tieneBaja = await ev(`/dar de baja|reactivar/i.test(document.querySelector('main').innerText)`);
console.log("  ¿el catálogo menciona dar de baja o reactivar? " + tieneBaja);

const { data } = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("./artifacts-inv/censo-productos.png", Buffer.from(data, "base64"));
console.log("\n  captura → artifacts-inv/censo-productos.png");
ws.close();
process.exit(0);
