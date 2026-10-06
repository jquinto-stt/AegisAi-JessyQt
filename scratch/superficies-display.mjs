/**
 * Mide la escalera de superficies y el color real del borde, en los dos estados.
 * Trampa: Tailwind v4 emite `oklab(...)`/`oklch(...)`; hay que resolver a sRGB
 * con un canvas, no parsear la cadena.
 */
import { appendFileSync, mkdirSync } from "node:fs";

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://127.0.0.1:6020";
const OUT = "./outputs/display-verify/";
mkdirSync(OUT, { recursive: true });
const log = (s) => { appendFileSync(OUT + ".superficies.log", s + "\n"); console.log(s); };

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

const MEDIR = `(() => {
  const cv = document.createElement("canvas"); cv.width = 1; cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const toRGB = (c) => { ctx.clearRect(0,0,1,1); ctx.fillStyle="#000"; ctx.fillStyle=c;
    ctx.fillRect(0,0,1,1); const d = ctx.getImageData(0,0,1,1).data; return "rgb(" + d[0] + "," + d[1] + "," + d[2] + ")"; };
  const lum = (c) => { const m = c.match(/rgb\\((\\d+),(\\d+),(\\d+)\\)/); if (!m) return null;
    const [r,g,b] = [+m[1],+m[2],+m[3]].map(v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
    return +(0.2126*r + 0.7152*g + 0.0722*b).toFixed(4); };
  const ratio = (a, b) => { const L1 = Math.max(a,b), L2 = Math.min(a,b); return +((L1+0.05)/(L2+0.05)).toFixed(2); };

  const raiz = document.querySelector('.min-h-screen');
  const main = document.querySelector('main');
  const card = main ? main.querySelector('.rounded-3xl') : null;
  const aside = document.querySelector('main aside');
  const header = document.querySelector('header');
  const footer = document.querySelector('footer');

  const bg = (el) => el ? toRGB(getComputedStyle(el).backgroundColor) : null;
  const bd = (el) => el ? { color: toRGB(getComputedStyle(el).borderTopColor), w: getComputedStyle(el).borderTopWidth } : null;

  const cLienzo = bg(raiz), cCard = bg(card), cAside = bg(aside), cHeader = bg(header);
  const L = { lienzo: lum(cLienzo), card: lum(cCard), aside: lum(cAside) };

  return {
    superficies: {
      lienzo: cLienzo, cabecera: cHeader, tarjeta: cCard, panelCola: cAside, pie: bg(footer),
      _hex_en_fuente: { lienzo: "#07090e", cabecera: "#0c1017/80", tarjeta: "#0f1420/90", panel: "#0c1017/90" },
    },
    contraste: {
      "tarjeta vs lienzo": ratio(L.card, L.lienzo),
      "panel vs lienzo": ratio(L.aside, L.lienzo),
      "cabecera vs lienzo": ratio(lum(cHeader), L.lienzo),
    },
    bordes: { tarjeta: bd(card), panel: bd(aside) },
    gradiente_ambiente: (() => { const d = raiz ? raiz.querySelector('div') : null;
      return d ? getComputedStyle(d).backgroundImage.slice(0, 160) : null; })(),
    alturas: {
      tarjeta: card ? Math.round(card.getBoundingClientRect().height) : null,
      panel: aside ? Math.round(aside.getBoundingClientRect().height) : null,
    },
  };
})()`;

log("═══════ ESTADO CON PEDIDOS ═══════");
await cdp.send("Page.navigate", { url: APP + "/pedidos/display" });
for (let i = 0; i < 60; i++) { if (await ev(`!!document.querySelector('main .rounded-3xl')`)) break; await sleep(400); }
await sleep(1400);
log(JSON.stringify(await ev(MEDIR), null, 2));

log("");
log("═══════ ESTADO VACÍO (soloListos=1) ═══════");
await cdp.send("Page.navigate", { url: APP + "/pedidos/display?soloListos=1" });
for (let i = 0; i < 60; i++) { if (await ev(`!!document.querySelector('main .rounded-3xl')`)) break; await sleep(400); }
await sleep(1400);
log(JSON.stringify(await ev(MEDIR), null, 2));

// Proporcion de vacio de la tarjeta en el estado vacio
log("");
log("── Vacío de la tarjeta en el estado vacío ──");
log(JSON.stringify(await ev(`(() => {
  const card = document.querySelector('main .rounded-3xl');
  const cs = getComputedStyle(card);
  const pt = parseFloat(cs.paddingTop), pb = parseFloat(cs.paddingBottom);
  const caja = card.clientHeight - pt - pb;
  const hijos = [...card.children];
  const span = hijos.length ? hijos[hijos.length-1].getBoundingClientRect().bottom - hijos[0].getBoundingClientRect().top : 0;
  return { cajaContenido: Math.round(caja), altoContenido: Math.round(span),
           vacio: Math.round(caja - span), pct: Math.round(((caja - span)/caja)*100) };
})()`), null, 2));

cdp.close();
process.exit(0);
