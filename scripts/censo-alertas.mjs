// Pregunta: ¿las alertas que dependen del reloj tienen arreglo desde la UI?
// Se inspecciona la alerta, su acción y si el store ofrece una mutación.
import { mkdirSync, writeFileSync } from "node:fs";
const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://localhost:6020";
mkdirSync("./artifacts-inv/", { recursive: true });

const r0 = await fetch(APP + "/");
if (r0.status !== 200) { console.error("ABORTA 6020 → " + r0.status); process.exit(2); }
console.log("sonda 6020 → " + r0.status);

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
let id = 0; const pend = new Map(); const eventos = [];
await new Promise((res) => ws.addEventListener("open", res));
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.method) eventos.push(m);
  if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
});
const send = (m, p = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async (x) => { const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
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
  })); return true; })()`);

await send("Page.navigate", { url: APP + "/inventarios/alertas" });
await sleep(3200);

const censo = await ev(`(() => {
  const cards = [...document.querySelectorAll('main .rounded-2xl, main [class*=Card], main > div > div')];
  const items = [...document.querySelectorAll('main h3')].map((h) => {
    const cont = h.closest('div.flex, div');
    const card = h.closest('[class*=rounded]') || h.parentElement.parentElement.parentElement;
    const texto = card ? card.innerText : '';
    const botones = card ? [...card.querySelectorAll('button')].map(b => b.textContent.trim()) : [];
    return { titulo: h.textContent.trim(), botones, texto: texto.slice(0, 220) };
  });
  return items;
})()`);
console.log("\n── ALERTAS VISIBLES ──");
for (const it of censo) {
  console.log("• " + it.titulo);
  console.log("   acciones: " + JSON.stringify(it.botones));
}

const hayResolver = await ev(`/marcar como|resolver|descartar|archivar|ignorar/i.test(document.querySelector('main').innerText)`);
console.log("\n¿la pantalla ofrece resolver/descartar? " + hayResolver);

const filtros = await ev(`[...document.querySelectorAll('main button')].map(b=>b.textContent.trim()).filter(Boolean).slice(0,10)`);
console.log("controles: " + JSON.stringify(filtros));

const { data } = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("./artifacts-inv/alertas-censo.png", Buffer.from(data, "base64"));
console.log("\ncaptura → artifacts-inv/alertas-censo.png");
ws.close();
process.exit(0);
