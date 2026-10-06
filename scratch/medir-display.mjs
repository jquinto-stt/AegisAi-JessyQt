/**
 * Sonda de maquetación del Modo Enfoque. Mide, no opina.
 *  1. ¿Se recorta el reloj de la cabecera?
 *  2. ¿Cuánto espacio muerto tiene la tarjeta protagonista?
 *  3. ¿Cuánto espacio muerto tiene el panel de cola?
 *  4. ¿Existen las clases sospechosas en el CSS servido?
 */
import { appendFileSync, mkdirSync } from "node:fs";

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://127.0.0.1:6020";
const OUT = "./outputs/display-verify/";
mkdirSync(OUT, { recursive: true });
const log = (s) => { appendFileSync(OUT + ".medir.log", s + "\n"); console.log(s); };

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const t = await (await fetch(`${CDP_BASE}/json/list`)).json();
      const p = t.find((x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
      if (p) return p;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("sin target CDP");
}
const objetivo = await target();
const cdp = await new Promise((res, rej) => {
  const ws = new WebSocket(objetivo.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  ws.addEventListener("open", () => res({
    send: (m, p = {}) => new Promise((r, j) => { const i = ++id; pend.set(i, { r, j }); ws.send(JSON.stringify({ id: i, method: m, params: p })); }),
    close: () => ws.close(),
  }));
  ws.addEventListener("error", rej);
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { const { r, j } = pend.get(m.id); pend.delete(m.id); m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result); }
  });
});
await cdp.send("Runtime.enable");
await cdp.send("Page.enable");
await cdp.send("Network.enable");
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

const ev = async (e) => {
  const r = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await cdp.send("Page.navigate", { url: APP + "/pedidos/display" });
for (let i = 0; i < 60; i++) { if (await ev(`!!document.querySelector('header')`)) break; await sleep(400); }
await sleep(1500);

const R = (sel) => `(() => { const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null;
  const r=e.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom),right:Math.round(r.right)}; })()`;

log("═══ 1. CABECERA: ¿se recorta algo? ═══");
log(JSON.stringify(await ev(`(() => {
  const h = document.querySelector('header');
  const cs = getComputedStyle(h);
  const hijos = [...h.children].map(c => { const r=c.getBoundingClientRect();
    return { cls:String(c.className).slice(0,44), x:Math.round(r.x), w:Math.round(r.width), right:Math.round(r.right) }; });
  return { header: {w: Math.round(h.getBoundingClientRect().width), scrollW: h.scrollWidth, clientW: h.clientWidth},
           overflow: h.scrollWidth - h.clientWidth, flexWrap: cs.flexWrap, hijos };
})()`), null, 2));

log("");
log("═══ 2. EL RELOJ ═══");
log(JSON.stringify(await ev(`(() => {
  // el reloj: el span con tabular-nums dentro del header
  const sp = document.querySelector('header span.tabular-nums');
  if (!sp) return { encontrado: false };
  const r = sp.getBoundingClientRect();
  const padre = sp.closest('div');
  const rp = padre.getBoundingClientRect();
  const cs = getComputedStyle(sp);
  return { encontrado: true, texto: sp.textContent, rect: {w:Math.round(r.width), right:Math.round(r.right)},
           padre: {right: Math.round(rp.right), w: Math.round(rp.width)},
           scrollW: sp.scrollWidth, clientW: sp.clientWidth,
           recortado: sp.scrollWidth > sp.clientWidth + 1,
           desbordaCabecera: Math.round(r.right) > Math.round(document.querySelector('header').getBoundingClientRect().right),
           fontSize: cs.fontSize, whiteSpace: cs.whiteSpace, overflow: cs.overflow };
})()`), null, 2));

log("");
log("═══ 3. TARJETA PROTAGONISTA: espacio muerto ═══");
log(JSON.stringify(await ev(`(() => {
  const card = document.querySelector('main .rounded-3xl');
  if (!card) return null;
  const cs = getComputedStyle(card);
  const pt = parseFloat(cs.paddingTop), pb = parseFloat(cs.paddingBottom);
  const caja = card.clientHeight - pt - pb;
  const hijos = [...card.children];
  if (!hijos.length) return { vacia: true, alto: card.clientHeight };
  const span = hijos[hijos.length-1].getBoundingClientRect().bottom - hijos[0].getBoundingClientRect().top;
  const r = card.getBoundingClientRect();
  return { alto: Math.round(r.height), w: Math.round(r.width),
           cajaContenido: Math.round(caja), altoContenido: Math.round(span),
           muerto: Math.round(caja - span),
           pctMuerto: Math.round(((caja - span) / caja) * 100),
           padding: cs.padding, display: cs.display, alignItems: cs.alignItems, justifyContent: cs.justifyContent,
           nHijos: hijos.length };
})()`), null, 2));

log("");
log("═══ 4. PANEL DE COLA: espacio muerto ═══");
log(JSON.stringify(await ev(`(() => {
  const aside = document.querySelector('main aside');
  if (!aside) return null;
  const r = aside.getBoundingClientRect();
  const lista = aside.querySelector('.overflow-y-auto');
  const items = lista ? [...lista.children] : [];
  const ultimo = items.length ? items[items.length-1].getBoundingClientRect().bottom : null;
  return { alto: Math.round(r.height), nItems: items.length,
           finDeItems: ultimo ? Math.round(ultimo) : null,
           muertoAbajo: ultimo ? Math.round(r.bottom - ultimo) : null,
           pctMuerto: ultimo ? Math.round(((r.bottom - ultimo) / r.height) * 100) : null };
})()`), null, 2));

log("");
log("═══ 5. clases sospechosas en el CSS servido ═══");
log(JSON.stringify(await ev(`(async () => {
  const hojas = [...document.styleSheets].map(s => { try { return [...s.cssRules].map(r => r.cssText).join("\\n"); } catch { return ""; } }).join("\\n");
  const busca = (cls) => new RegExp("\\\\." + cls.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&") + "(?![a-zA-Z0-9_-])").test(hojas);
  return { "size-4.5": busca("size-4.5"), "size-3.5": busca("size-3.5"), "size-2": busca("size-2"),
           "text-[6.5rem]": busca("text-\\\\[6\\\\.5rem\\\\]"),
           "bg-emerald-500": busca("bg-emerald-500"), "bg-slate-400": busca("bg-slate-400"),
           "animate-ping": busca("animate-ping"), "tabular-nums": busca("tabular-nums"),
           "font-mono": busca("font-mono"), "backdrop-blur-xl": busca("backdrop-blur-xl") };
})()`), null, 2));

cdp.close();
process.exit(0);
