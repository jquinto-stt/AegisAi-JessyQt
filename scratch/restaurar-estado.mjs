/**
 * Devuelve el almacenamiento de la demo a como estaba antes de `capturar-listo.mjs`.
 *
 * Por qué no basta con escribir localStorage y recargar: la app persiste su
 * store en el momento de descargarse, así que sobrescribe la restauración. La
 * solución es inyectar la restauración **antes** de que corran los scripts de la
 * página (`Page.addScriptToEvaluateOnNewDocument`), de forma que la app arranque
 * ya con los datos originales y no tenga nada que reescribir.
 */
import { readFileSync } from "node:fs";

const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://127.0.0.1:6020";
const respaldo = JSON.parse(
  readFileSync("./outputs/display-verify/.respaldo-localstorage.json", "utf8")
);
console.log("respaldo:", Object.keys(respaldo).length, "claves");

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${CDP_BASE}/json/list`);
      const t = (await r.json()).find(
        (x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools")
      );
      if (t) return t;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("sin target CDP");
}

const objetivo = await target();
const ws = new WebSocket(objetivo.webSocketDebuggerUrl);
let id = 0;
const pend = new Map();
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) {
    const { res, rej } = pend.get(m.id);
    pend.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
  }
});
await new Promise((r) => ws.addEventListener("open", r));
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    pend.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });

await send("Runtime.enable");
await send("Page.enable");
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });

const evaluar = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// La restauración, inyectada antes de cualquier script de la página.
const fuente = `(() => { try {
  const r = ${JSON.stringify(respaldo)};
  localStorage.clear();
  for (const k of Object.keys(r)) localStorage.setItem(k, r[k]);
} catch (e) {} })()`;
const inyeccion = await send("Page.addScriptToEvaluateOnNewDocument", { source: fuente });

await send("Page.navigate", { url: APP + "/pedidos/display" });
for (let i = 0; i < 60; i++) {
  if (await evaluar(`!!document.querySelector('header')`).catch(() => false)) break;
  await dormir(300);
}
await dormir(1500);

const iguales = await evaluar(
  `(() => { const r = ${JSON.stringify(respaldo)};
    return { n: localStorage.length, igual: Object.keys(r).every((k) => localStorage.getItem(k) === r[k]) }; })()`
);
const estado = await evaluar(
  `(() => { const p = document.querySelector('main > section span.inline-flex'); return p ? p.textContent.trim() : null; })()`
);
console.log("localStorage igual al respaldo:", iguales.igual, "· claves:", iguales.n);
console.log("estado del protagonista restaurado:", estado);

await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: inyeccion.identifier });
ws.close();
