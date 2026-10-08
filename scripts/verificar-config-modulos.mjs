// Verifica la pestaña «Módulos e integraciones» tras migrar sus SVG a Heroicons.
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
await cdp.send("Runtime.enable"); await cdp.send("Page.enable"); await cdp.send("DOM.enable");
await cdp.send("Network.enable"); await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
const ev = async (e) => { const r = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result.value; };

let fails = 0;
const check = (l, ok, d) => { if (!ok) fails++; console.log(`  ${ok ? "OK  " : "FAIL"}  ${l}${d !== undefined ? "  -> " + d : ""}`); };

// Sonda de vida
try { const r = await fetch(APP + "/", { cache: "no-store" }); if (r.status !== 200) throw new Error("" + r.status); console.log(`Sonda de vida: ${APP} -> 200`); }
catch (e) { console.error(`ABORTADO: servidor caído (${e.message})`); process.exit(2); }

await cdp.send("Page.navigate", { url: APP + "/" }); await sleep(1500);
await ev(`(() => { localStorage.setItem("necto.session", JSON.stringify({modulos:["pedidos","conversaciones"],tipoSesion:"administrador",operadorSimuladoId:"op-1",preSimulacion:null}));
  localStorage.setItem("necto.organizacion.v1", JSON.stringify({usuario:{nombre:"Vera",perfilCompletado:true},organizacion:{id:"org-1",nombre:"Boutique Roma",slug:"boutique-roma",pais:"Colombia",moneda:"COP",zonaHoraria:"America/Bogota",tipoEmpresa:"Restaurante",tamanoEquipo:"2 a 5 personas",logoUrl:"",fechaCreacion:new Date().toISOString()},modulos:{pedidos:{instalado:true,activo:true},conversaciones:{instalado:true,activo:true}}})); return true; })()`);
await cdp.send("Page.navigate", { url: APP + "/configuracion?tab=modulos" }); await sleep(4500);

console.log("\n── Fase 1 · la pestaña monta ──────────────────────────────");
const h1 = await ev(`(() => { const h=[...document.querySelectorAll('h1')].find(x=>x.offsetParent!==null); return h?h.textContent.trim():null; })()`);
check("hay h1 visible", h1 !== null, h1);

console.log("\n── Fase 2 · literales en español ──────────────────────────");
const txt = await ev(`document.body.textContent`);
check("ya no dice «Integrations»", !/Integrations/.test(txt));
check("ya no dice «Details»", !/\bDetails\b/.test(txt));
check("dice «Integraciones»", /Integraciones/.test(txt));
check("dice «Ver detalles»", /Ver detalles/.test(txt));

console.log("\n── Fase 3 · los logos de módulo son svg de Heroicons ──────");
const logos = await ev(`(() => {
  const out = [];
  for (const d of document.querySelectorAll('div.rounded-2xl, div.rounded-xl')) {
    if (d.offsetParent === null) continue;
    const svg = d.querySelector('svg');
    if (!svg) continue;
    const r = svg.getBoundingClientRect();
    if (r.width < 16 || r.width > 40) continue;
    const cls = String(d.className);
    if (!/bg-secondary-50|bg-accent-50/.test(cls)) continue;
    out.push({ cuadro: cls.slice(0, 55), svgW: Math.round(r.width), svgH: Math.round(r.height),
      vb: svg.getAttribute('viewBox'), strokeW: svg.getAttribute('stroke-width'),
      paths: svg.querySelectorAll('path,circle').length, src: svg.outerHTML.slice(0, 70) });
  }
  return out;
})()`);
console.log("  logos encontrados: " + logos.length);
for (const l of logos) console.log("    " + l.svgW + "x" + l.svgH + "  " + l.cuadro);
check("hay al menos un logo de módulo con svg", logos.length > 0, logos.length);
// Los de Heroicons llevan viewBox "0 0 24 24" y stroke-width="1.5" por defecto.
const sonHeroicons = logos.filter((l) => l.vb === "0 0 24 24");
check("todos los logos traen viewBox 0 0 24 24", sonHeroicons.length === logos.length, sonHeroicons.length + "/" + logos.length);

console.log("\n── Fase 4 · runtime ───────────────────────────────────────");
const errs = cdp.events.filter((e) => e.method === "Runtime.exceptionThrown" && !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e)));
check("ninguna excepción", errs.length === 0, errs.length ? JSON.stringify(errs.slice(0, 1)).slice(0, 350) : "ninguna");

const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
writeFileSync("./artifacts-inv/config-modulos-tarjetas.png", Buffer.from(data, "base64"));

console.log(`\n${fails === 0 ? "TODO OK" : "FALLOS: " + fails}  (${new Date().toISOString()})`);
cdp.close(); process.exit(fails === 0 ? 0 : 1);
