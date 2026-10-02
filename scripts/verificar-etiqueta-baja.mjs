// ¿La columna «Estado» dice lo mismo que el filtro? El filtro llama «De baja» a
// lo que la fila rotula «Inactivo». Dos vocabularios para el mismo hecho.
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
await send("Page.navigate", { url: APP + "/inventarios/elementos" }); await sleep(4200);
// Filtrar por «De baja» y leer el estado que rotula la fila.
const chip = await ev(`(() => {
  const b = [...document.querySelectorAll('button')].find(x => /De baja/i.test(x.textContent));
  return b ? b.textContent.trim() : null;
})()`);
console.log('chip del filtro: ' + JSON.stringify(chip));
await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => /De baja/i.test(x.textContent)); if (b) b.click(); return true; })()`);
await sleep(1200);
const filas = await ev(`(() => {
  const st = [];
  for (const tr of document.querySelectorAll('tbody tr')) {
    const celdas = [...tr.querySelectorAll('td')].map(td => td.innerText.trim());
    st.push({ producto: celdas[1] ? celdas[1].split('\\n')[0] : '?', estado: celdas[4] || '?' });
  }
  return JSON.stringify(st);
})()`);
const lista = JSON.parse(filas);
console.log('filas tras filtrar por «De baja» (' + lista.length + '):');
for (const f of lista) console.log('   ' + f.producto + '  →  estado rotulado: «' + f.estado + '»');
const mal = lista.filter(f => /inactivo/i.test(f.estado)).length;
console.log('\nfilas rotuladas «Inactivo» dentro del filtro «De baja»: ' + mal + ' / ' + lista.length);
console.log(mal > 0 ? 'DEFECTO: el filtro y la celda usan vocabularios distintos' : 'sin discrepancia');
ws.close();
