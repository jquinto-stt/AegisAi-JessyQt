// Verifica la pantalla de catálogo tras el renombrado, la neutralización y el arreglo de contraste.
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
await cdp.send("Network.enable"); await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
const ev = async (e) => { const r = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result.value; };

let fails = 0;
const check = (l, ok, d) => { if (!ok) fails++; console.log(`  ${ok ? "OK  " : "FAIL"}  ${l}${d !== undefined ? "  -> " + d : ""}`); };

try { const r = await fetch(APP + "/", { cache: "no-store" }); if (r.status !== 200) throw new Error("" + r.status); console.log(`Sonda de vida: ${APP} -> 200`); }
catch (e) { console.error(`ABORTADO: servidor caído (${e.message})`); process.exit(2); }

const SONDAS = `(() => {
  const cv=document.createElement('canvas'); cv.width=1; cv.height=1;
  const ctx=cv.getContext('2d',{willReadFrequently:true});
  const toRGB=(c)=>{ctx.clearRect(0,0,1,1);ctx.fillStyle='#000';ctx.fillStyle=c;ctx.fillRect(0,0,1,1);
    const d=ctx.getImageData(0,0,1,1).data;return [d[0],d[1],d[2]];};
  const lum=(rgb)=>{const a=rgb.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
    return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];};
  const ratio=(f,b)=>{const L1=lum(f),L2=lum(b);return Math.round(((Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05))*100)/100;};
  const fondoDe=(el)=>{let n=el;while(n&&n!==document.documentElement){const cs=getComputedStyle(n);
    if(cs.backgroundColor&&cs.backgroundColor!=='rgba(0, 0, 0, 0)') return toRGB(cs.backgroundColor); n=n.parentElement;}
    return [255,255,255];};
  const violaciones=[];
  for(const el of document.querySelectorAll('span,p,div,h1,h2,button,a')){
    if(el.offsetParent===null||!el.textContent.trim()||el.children.length>0) continue;
    const cs=getComputedStyle(el); const fg=toRGB(cs.color), bg=fondoDe(el);
    const r=ratio(fg,bg);
    if(r<4.5) violaciones.push({txt:el.textContent.trim().slice(0,40),fg:'#'+fg.map(x=>x.toString(16).padStart(2,'0')).join(''),bg:'#'+bg.map(x=>x.toString(16).padStart(2,'0')).join(''),ratio:r,cls:String(el.className).slice(0,60),enArmazon:!!el.closest('aside,nav,footer,[data-shell],[class*=sidebar],[class*=footer]')});
  }
  const txt=document.body.textContent||'';
  const h1=[...document.querySelectorAll('h1')].find(x=>x.offsetParent!==null);
  // El armazón (menú lateral, pie de página, nav) no es esta pantalla: se mide
  // aparte, porque arreglarlo aquí lo arreglaría para las 20 pantallas, no para una.
  const delCatalogo=violaciones.filter(v=>!v.enArmazon);
  // Un sello "Destacado" debe corresponder a UN dato, no a "el primero de la lista".
  const destacados=[...document.querySelectorAll('*')].filter(el=>el.children.length===0&&/^Destacado$/i.test(el.textContent.trim())).length;
  return {
    titulo: document.title,
    h1: h1?h1.textContent.trim():null,
    violaciones: delCatalogo.length,
    violacionesArmazon: violaciones.length-delCatalogo.length,
    peores: delCatalogo.sort((a,b)=>a.ratio-b.ratio).slice(0,4),
    // Vocabulario de restaurante que NO debe quedar
    encuentra: ['Hamburguesa','Cheesecake','Papas Rústicas','Limonada','Tiramisú','Alitas','Pizza','Combos y Platos','Acompañamientos','Postres','Bebidas','plato','carta ','Menú y'].filter(w=>txt.includes(w)),
    dicePregunta: txt.match(/Producto de ejemplo/g) ? (txt.match(/Producto de ejemplo/g)||[]).length : 0,
    destacados,
    productos: [...document.querySelectorAll('h3')].filter(x=>x.offsetParent!==null).length,
    // La marca NECTO debe aparecer UNA vez en el mueble de la pantalla (cabecera
    // o barra lateral). El pie lleva SU PROPIA marca sobre la banda naranja
    // (necto-sobre-naranja.svg): es otra superficie, no un duplicado, y no entra
    // en la cuenta.
    //
    // OJO con el filtro: la barra lateral va en position:fixed, así que su
    // offsetParent es null aunque se vea. Exigir offsetParent al CONTENEDOR
    // descarta justo la caja que tiene el logo y el check da 0 — acusando al
    // producto de un fallo del selector. La visibilidad se mide en el img.
    // El nombre de la pantalla es UNO. Decía «Catálogo Digital» en la cabecera
    // mientras el título del navegador, la barra lateral y el h1 decían
    // «Catálogo»: cuatro sitios, dos nombres. Se congela en singular.
    nombresDistintos: (txt.match(/Catálogo( Digital| de Productos)?/g)||[])
      .map(m=>m.replace(/\s+/g,' ').trim())
      .filter((v,i,a)=>a.indexOf(v)===i),
    marcas: (()=>{
      const cajas=[...document.querySelectorAll('header,aside,nav')].filter(e=>!e.closest('footer'));
      for (const c of cajas) {
        const imgs=[...c.querySelectorAll('img[alt="NECTO"]')].filter(i=>i.offsetParent!==null).length;
        const textos=[...c.querySelectorAll('*')].filter(e=>e.children.length===0&&/^NECTO\\.?$/.test((e.textContent||'').trim())).length;
        if (imgs+textos>0) return imgs+textos;
      }
      return 0; })(),
  };
})()`;

for (const [ruta, nombre] of [["/catalogo-clientes", "menu-publico"], ["/pedidos/catalogo", "pedidos-catalogo"]]) {
  console.log(`\n══════ ${ruta} ══════`);
  await cdp.send("Page.navigate", { url: APP + "/" }); await sleep(1200);
  await ev(`(() => { localStorage.setItem("necto.session", JSON.stringify({modulos:["pedidos","conversaciones"],tipoSesion:"administrador",operadorSimuladoId:"op-1",preSimulacion:null}));
    localStorage.setItem("necto.organizacion.v1", JSON.stringify({usuario:{nombre:"Vera",perfilCompletado:true},organizacion:{id:"org-1",nombre:"Boutique Roma",slug:"boutique-roma",pais:"Colombia",moneda:"COP",zonaHoraria:"America/Bogota",tipoEmpresa:"Comercio",tamanoEquipo:"2 a 5 personas",logoUrl:"",fechaCreacion:new Date().toISOString()},modulos:{pedidos:{instalado:true,activo:true},conversaciones:{instalado:true,activo:true}}})); return true; })()`);
  await cdp.send("Page.navigate", { url: APP + ruta }); await sleep(4500);
  const r = await ev(SONDAS);
  console.log(`  título del navegador: ${r.titulo}`);
  console.log(`  h1: ${r.h1}`);
  check("el título del navegador no está genérico", r.titulo && !/^Vite|^WorkBuddy|^$/.test(r.titulo), r.titulo);
  check("sin vocabulario de restaurante", r.encuentra.length === 0, r.encuentra.length ? JSON.stringify(r.encuentra) : "ninguno");
  check("sin violaciones de contraste en la pantalla (<4.5:1)", r.violaciones === 0, r.violaciones + (r.violaciones ? " · peores: " + JSON.stringify(r.peores) : "") + (r.violacionesArmazon ? ` · (armazón excluido: ${r.violacionesArmazon})` : ""));
  check("«Destacado» no se regala a la posición 0", r.destacados === 0, `${r.destacados} productos sellados como Destacado`);
  check("la marca NECTO aparece una sola vez", r.marcas === 1, `${r.marcas} marcas visibles en la cabecera`);
  check("el nombre de la pantalla es uno solo", !r.nombresDistintos.includes("Catálogo Digital"), JSON.stringify(r.nombresDistintos));
  if (ruta === "/catalogo-clientes" || ruta === "/menu") check("los productos son genéricos", r.dicePregunta > 0, r.dicePregunta + " productos de ejemplo");
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`./artifacts-inv/${nombre}.png`, Buffer.from(data, "base64"));
}

console.log("\n── Runtime ────────────────────────────────────────────────");
const errs = cdp.events.filter((e) => e.method === "Runtime.exceptionThrown" && !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e)));
check("ninguna excepción", errs.length === 0, errs.length ? JSON.stringify(errs.slice(0,1)).slice(0,400) : "ninguna");

console.log(`\n${fails === 0 ? "TODO OK" : "FALLOS: " + fails}  (${new Date().toISOString()})`);
cdp.close(); process.exit(fails === 0 ? 0 : 1);
