// ¿Por qué /inventarios da 0 chars en el humo? ¿No renderiza, o el selector
// `main` no es donde vive el contenido en esa ruta?
const CDP_BASE = "http://127.0.0.1:9333", APP = "http://localhost:6020";
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
await send("Page.navigate", { url: APP + "/login" }); await sleep(2500);
await ev(`(() => { localStorage.setItem('necto.session', JSON.stringify({ modulos:['pedidos','inventarios'], tipoSesion:'administrador', operadorSimuladoId:null, preSimulacion:null })); const c={whatsapp:false,telegram:false,instagram:false,webchat:false,asistente:false}; localStorage.setItem('necto.organizacion.v1', JSON.stringify({ usuario:{nombre:'Vera',email:'demo@necto.io'}, organizacion:{nombre:'Necto Demo',moneda:'COP',pais:'Colombia',zonaHoraria:'America/Bogota'}, modulos:{ pedidos:{instalado:true,activo:true,conectores:c}, inventarios:{instalado:true,activo:true,conectores:c} } })); return true; })()`);
await send("Page.navigate", { url: APP + "/inventarios" }); await sleep(3500);
const r = await ev(`(() => JSON.stringify({
  url: location.pathname,
  hayMain: !!document.querySelector('main'),
  largoMain: (document.querySelector('main')?.innerText || '').trim().length,
  largoBody: (document.body.innerText || '').trim().length,
  h1: [...document.querySelectorAll('h1,h2')].map(h=>h.textContent.trim()).slice(0,4),
  hijosRaiz: [...document.body.children].map(c=>c.tagName+'.'+(c.className||'').toString().slice(0,40)),
}))()`);
console.log(r);
ws.close();
