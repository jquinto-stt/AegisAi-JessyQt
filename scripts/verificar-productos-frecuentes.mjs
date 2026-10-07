// Verifica el renombrado «Catálogo rápido» -> «Productos frecuentes» en la config de Pedidos.
// Comprueba el rótulo de navegación, el encabezado de la sección y que el vocabulario
// viejo no quede en ningún sitio visible.
import { writeFileSync, mkdirSync } from "node:fs";
const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://localhost:6020";
mkdirSync("./artifacts-inv/", { recursive: true });

async function getPageTarget() {
  for (let i = 0; i < 40; i++) {
    try { const t = await (await fetch(`${CDP_BASE}/json/list`)).json();
      const p = t.find((x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
      if (p) return p; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  } throw new Error("no target");
}
function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url); let id = 0; const pending = new Map(); const events = [];
    ws.addEventListener("open", () => resolve({ events,
      send(m, p = {}) { return new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); }); },
      close: () => ws.close() }));
    ws.addEventListener("error", reject);
    ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.method) events.push(m);
      if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } });
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect((await getPageTarget()).webSocketDebuggerUrl);
await cdp.send("Runtime.enable"); await cdp.send("Page.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
const ev = async (e) => { const r = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result.value; };

let fails = 0;
const check = (l, ok, d) => { if (!ok) fails++; console.log(`  ${ok ? "OK  " : "FAIL"}  ${l}${d !== undefined ? "  -> " + d : ""}`); };

try { const r = await fetch(APP + "/", { cache: "no-store" }); if (r.status !== 200) throw new Error("" + r.status); console.log(`Sonda de vida: ${APP} -> 200`); }
catch (e) { console.error(`ABORTADO: servidor caído (${e.message})`); process.exit(2); }

console.log("\n══════ /pedidos/config · sección Productos frecuentes ══════");
await cdp.send("Page.navigate", { url: APP + "/" }); await sleep(1200);
await ev(`(() => { localStorage.setItem("necto.session", JSON.stringify({modulos:["pedidos","conversaciones"],tipoSesion:"administrador",operadorSimuladoId:"op-1",preSimulacion:null}));
  localStorage.setItem("necto.organizacion.v1", JSON.stringify({usuario:{nombre:"Vera",perfilCompletado:true},organizacion:{id:"org-1",nombre:"Boutique Roma",slug:"boutique-roma",pais:"Colombia",moneda:"COP",zonaHoraria:"America/Bogota",tipoEmpresa:"Comercio",tamanoEquipo:"2 a 5 personas",logoUrl:"",fechaCreacion:new Date().toISOString()},modulos:{pedidos:{instalado:true,activo:true},conversaciones:{instalado:true,activo:true}}})); return true; })()`);
// ── Se entra por URL, no por una navegación lateral ──────────────────────────
//
// Esta guarda pulsaba el botón de una `nav` de secciones que `/pedidos/config`
// NUNCA tuvo: el clic no ocurría, la sección no se abría y las tres aserciones
// de abajo medían el HUB —donde «Productos frecuentes» sí aparece, como rótulo
// de la tarjeta—. Es decir, la guarda llevaba tiempo en rojo y, peor, sus dos
// checks verdes eran ciertos por el sitio equivocado.
//
// La sección es direccionable por `?seccion=`, que es el contrato de las cuatro
// pantallas de configuración (y lo que comprueba `verificar-config-hub.mjs`).
// Se ancla la espera en una frase que existe SOLO en la sección: el hub no la
// tiene, así que un fallo se lee como «no montó», no como «no encontré el
// texto».
await cdp.send("Page.navigate", { url: APP + "/pedidos/config?seccion=catalogo" });

const montada = await (async () => {
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    try {
      if (await ev(`document.body ? (document.body.innerText || "").includes("¿Qué vendes siempre?") : false`)) return true;
    } catch {}
    await sleep(300);
  }
  console.log("  (aviso) la sección no montó a tiempo");
  return false;
})();
check("la sección monta por enlace directo (no es el hub)", montada);

const r = await ev(`(() => {
  const txt=document.body.textContent||'';
  const h=[...document.querySelectorAll('h1,h2,h3')].map(e=>(e.textContent||'').trim()).filter(Boolean);
  const visibles=[...document.querySelectorAll('span,p,h1,h2,h3,button,div')]
    .filter(e=>e.offsetParent!==null&&e.children.length===0)
    .map(e=>(e.textContent||'').trim()).filter(Boolean);
  return {
    titulo: document.title,
    encabezados: h.slice(0,14),
    tieneViejo: /Catálogo rápido|Catálogo Rápido|CATÁLOGO RÁPIDO|productos rápidos|Productos rápidos/i.test(txt),
    tieneNuevo: /Productos frecuentes/.test(txt),
    // El aviso que deslinda esta lista del Catálogo real
    deslinde: /no se publica ni lleva foto/i.test(txt),
    // Que el nombre viejo NO esté en ningún nodo visible
    viejoVisible: visibles.filter(t=>/Catálogo rápido|productos rápidos/i.test(t)),
  };
})()`);
console.log(`  título del navegador: ${r.titulo}`);
console.log(`  encabezados: ${JSON.stringify(r.encabezados)}`);
check("el vocabulario viejo «Catálogo rápido» desapareció", !r.tieneViejo, r.tieneViejo ? JSON.stringify(r.viejoVisible) : "ninguno");
check("el vocabulario nuevo está en pantalla", r.tieneNuevo, r.tieneNuevo ? "Productos frecuentes" : "ausente");
check("la sección deslinda de Catálogo (no se publica ni lleva foto)", r.deslinde);

const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
writeFileSync("./artifacts-inv/pedidos-config-productos-frecuentes.png", Buffer.from(data, "base64"));

console.log("\n── Runtime ────────────────────────────────────────────────");
const errs = cdp.events.filter((e) => e.method === "Runtime.exceptionThrown" && !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e)));
check("ninguna excepción", errs.length === 0, errs.length ? JSON.stringify(errs.slice(0,1)).slice(0,400) : "ninguna");

console.log(`\n${fails === 0 ? "TODO OK" : "FALLOS: " + fails}  (${new Date().toISOString()})`);
cdp.close(); process.exit(fails === 0 ? 0 : 1);
