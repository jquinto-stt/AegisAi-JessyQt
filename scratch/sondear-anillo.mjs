/**
 * ¿El anillo naranja de la tarjeta es el destello, o algo permanente?
 *
 * Contexto: el PNG muestra `rgb(255,60,16)` en los cuatro bordes de la tarjeta,
 * pero el `borderTopColor` calculado es `white/10`. Así que el naranja no es el
 * borde. Se mide el `boxShadow` calculado —donde Tailwind emite el `ring`— en dos
 * instantes separados, para distinguir «destello de 900 ms» de «anillo pegado».
 */
import { writeFileSync } from "node:fs";

const CDP = "http://127.0.0.1:9333";
const APP = "http://127.0.0.1:6020";

const t = (await (await fetch(CDP + "/json/list")).json()).find(
  (x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools")
);
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0;
const p = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && p.has(m.id)) {
    const { res, rej } = p.get(m.id);
    p.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
  }
});
await new Promise((r) => ws.addEventListener("open", r));
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    p.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });

await send("Runtime.enable");
await send("Page.enable");
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Emulation.setDeviceMetricsOverride", {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  mobile: false,
});

const ev = async (e) => {
  const r = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const SONDA = `(() => {
  const seccion = document.querySelector('main > section');
  const tarjeta = seccion && seccion.firstElementChild;
  if (!tarjeta) return null;
  const cs = getComputedStyle(tarjeta);
  return {
    clases: String(tarjeta.className).slice(0, 120),
    bordeColor: cs.borderTopColor,
    bordeAncho: cs.borderTopWidth,
    sombra: cs.boxShadow,
    outline: cs.outline,
    transform: cs.transform,
  };
})()`;

await send("Page.navigate", { url: "about:blank" });
await dormir(600);
await send("Page.navigate", { url: APP + "/pedidos/display" });
for (let i = 0; i < 80; i++) {
  if (await ev(`!!document.querySelector('main > section')`).catch(() => false)) break;
  await dormir(200);
}

for (const espera of [600, 1200, 2500, 4000]) {
  await dormir(espera === 600 ? 600 : espera - (espera === 1200 ? 600 : espera === 2500 ? 1200 : 2500));
  const s = await ev(SONDA);
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`./outputs/display-verify/.ring-${espera}.png`, Buffer.from(data, "base64"));
  console.log(`\n── a los ${espera} ms ──`);
  console.log("  clases :", s.clases);
  console.log("  borde  :", s.bordeAncho, s.bordeColor);
  console.log("  sombra :", s.sombra.slice(0, 140));
  console.log("  transform:", s.transform);
}

ws.close();
