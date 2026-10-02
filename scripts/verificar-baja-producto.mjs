// Verificación funcional: dar de baja y reactivar DESDE LA LISTA de productos.
//
// No basta con «el botón existe»: hay que pulsarlo, confirmar en el modal y
// comprobar que el elemento cambió de estado y el contador del filtro se movió.
import { writeFileSync, mkdirSync } from "node:fs";
const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://localhost:6020";
mkdirSync("./artifacts-inv/", { recursive: true });

const r0 = await fetch(APP + "/");
if (r0.status !== 200) { console.error("ABORTA: 6020 → " + r0.status); process.exit(2); }
console.log("sonda de vida 6020 → " + r0.status);

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
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method) eventos.push(m);
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
await sleep(3200);

let ok = 0, fail = 0;
const check = (l, c, d) => { if (c) { ok++; console.log("  OK   " + l); } else { fail++; console.log("  FAIL " + l + (d !== undefined ? "  → " + d : "")); } };

// Estado inicial: cuántos activos y cuántos de baja según los filtros.
const leerFiltros = () => ev(`(() => {
  const out = {};
  for (const b of document.querySelectorAll('main button')) {
    const t = (b.textContent || '').trim();
    const m = t.match(/^(Todos|Activos|De baja|Sin usar)\\s*(\\d+)$/i);
    if (m) out[m[1].toLowerCase()] = Number(m[2]);
  }
  return out;
})()`);

const antes = await leerFiltros();
console.log("  filtros antes: " + JSON.stringify(antes));

// Fila objetivo: un producto ACTIVO y visible.
const objetivo = await ev(`(() => {
  const tr = [...document.querySelectorAll('main tbody tr')].find((t) => /Activo/i.test(t.innerText));
  if (!tr) return null;
  const botones = [...tr.querySelectorAll('td button')];
  const baja = botones.find((b) => (b.getAttribute('title') || '') === 'Dar de baja');
  if (!baja) return { error: 'sin boton Dar de baja', titulos: botones.map(b => b.getAttribute('title')) };
  return { codigo: tr.querySelector('td')?.innerText.trim(), tieneBaja: !!baja };
})()`);
console.log("  objetivo: " + JSON.stringify(objetivo));
check("la fila activa ofrece «Dar de baja»", objetivo && objetivo.tieneBaja === true, JSON.stringify(objetivo));
check("NO navega al pulsar (stopPropagation)", objetivo && !objetivo.error, "el boton no se encontro");

// Pulsar el botón de baja de esa fila → debe abrir el modal de confirmación.
await ev(`(() => {
  const tr = [...document.querySelectorAll('main tbody tr')].find((t) => /Activo/i.test(t.innerText));
  [...tr.querySelectorAll('td button')].find((b) => (b.getAttribute('title') || '') === 'Dar de baja').click();
  return true;
})()`);
await sleep(700);
const modalAbierto = await ev(`(() => {
  const d = [...document.querySelectorAll('h2')].find(h => /Dar de baja este producto/i.test(h.textContent));
  return d ? d.textContent.trim() : null;
})()`);
const sigueEnLista = await ev("location.pathname");
check("se abrió el modal de confirmación", !!modalAbierto, String(modalAbierto));
check("seguimos en la lista (el click no navegó)", sigueEnLista === "/inventarios/elementos", sigueEnLista);

const { data: shotModal } = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("./artifacts-inv/confirmar-baja.png", Buffer.from(shotModal, "base64"));

// Confirmar.
await ev(`(() => {
  const b = [...document.querySelectorAll('button')].find(x => (x.textContent||'').trim() === 'Dar de baja');
  b.click(); return true;
})()`);
await sleep(900);

const despues = await leerFiltros();
console.log("  filtros después: " + JSON.stringify(despues));
check("«De baja» subió en 1", (despues['de baja'] ?? 0) === (antes['de baja'] ?? 0) + 1,
  (antes['de baja'] ?? 0) + " → " + (despues['de baja'] ?? 0));
check("«Activos» bajó en 1", (despues['activos'] ?? 0) === (antes['activos'] ?? 0) - 1,
  (antes['activos'] ?? 0) + " → " + (despues['activos'] ?? 0));
check("el modal se cerró", !(await ev(`!!document.querySelector('h2') && /Dar de baja este producto/i.test([...document.querySelectorAll('h2')].map(h=>h.textContent).join(' '))`)));

// La fila que era activa ahora debe ofrecer «Reactivar».
const reactivar = await ev(`(() => {
  const tr = [...document.querySelectorAll('main tbody tr')].find((t) => ${JSON.stringify(objetivo?.codigo ?? '')} && t.innerText.includes(${JSON.stringify(objetivo?.codigo ?? '')}));
  if (!tr) return 'fila no encontrada';
  return [...tr.querySelectorAll('td button')].map(b => b.getAttribute('title'));
})()`);
console.log("  acciones de la fila tras la baja: " + JSON.stringify(reactivar));
check("la fila ahora ofrece «Reactivar»", Array.isArray(reactivar) && reactivar.includes("Reactivar"), JSON.stringify(reactivar));

// Reactivar sin confirmación extra.
await ev(`(() => {
  const tr = [...document.querySelectorAll('main tbody tr')].find((t) => t.innerText.includes(${JSON.stringify(objetivo?.codigo ?? '')}));
  [...tr.querySelectorAll('td button')].find((b) => (b.getAttribute('title') || '') === 'Reactivar').click();
  return true;
})()`);
await sleep(700);
await ev(`(() => {
  const b = [...document.querySelectorAll('button')].find(x => (x.textContent||'').trim() === 'Reactivar');
  if (b) b.click();
  return true;
})()`);
await sleep(900);
const final = await leerFiltros();
console.log("  filtros finales: " + JSON.stringify(final));
check("volvió al estado inicial", (final['de baja'] ?? 0) === (antes['de baja'] ?? 0),
  JSON.stringify(antes) + " → " + JSON.stringify(final));

// Consola del recorrido.
const NOISE = /favicon|\[vite\]|DevTools|Download the React|ResizeObserver loop/i;
const quejas = eventos.filter((e) =>
  (e.method === "Runtime.exceptionThrown" && !NOISE.test(JSON.stringify(e))) ||
  (e.method === "Runtime.consoleAPICalled" && (e.params.type === "error" || e.params.type === "warning") &&
    !NOISE.test(e.params.args.map((a) => a.value ?? a.description ?? "").join(" "))) ||
  (e.method === "Log.entryAdded" && e.params.entry.level === "error" && !NOISE.test(e.params.entry.text || ""))
);
check("consola limpia durante el ciclo", quejas.length === 0, quejas.length + " queja(s): " +
  JSON.stringify(quejas.slice(0, 2).map(q => q.method)));

const { data: shotFinal } = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("./artifacts-inv/productos-tras-ciclo.png", Buffer.from(shotFinal, "base64"));

console.log("\n──────────────────────────────");
console.log("OK:   " + ok);
console.log("FAIL: " + fail);
console.log("fin " + new Date().toLocaleTimeString("es-CO"));
ws.close();
process.exit(fail === 0 ? 0 : 1);
