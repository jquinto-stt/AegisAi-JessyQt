/**
 * Censo de clases muertas del Modo Enfoque.
 * Una clase que no existe NO da error: deja la superficie sin pintar.
 *
 * Trampa corregida: en el CSS el punto de un nombre de clase va ESCAPADO
 * (`.py-1\.5{…}`), así que un patrón que busque `\.py-1\.5` no matchea nada y
 * declara muerta media hoja. Se normaliza quitando las barras del CSS.
 *
 * Control positivo obligatorio: `flex` y `text-white` tienen que salir VIVAS.
 * Si no, la sonda no está midiendo.
 */
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://127.0.0.1:6020";
const FUENTE = "./packages/apps/web/modules/app/src/pages/pedidos/DisplayPedidosScreen.tsx";
const OUT = "./outputs/display-verify/";
mkdirSync(OUT, { recursive: true });
const log = (s) => { appendFileSync(OUT + ".clases.log", s + "\n"); console.log(s); };

const src = readFileSync(FUENTE, "utf8");
const clases = new Set();
for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g)) {
  const bruto = m[1] ?? m[2] ?? m[3] ?? "";
  const limpio = bruto.replace(/\$\{[^}]*\}/g, " ");
  for (const c of limpio.split(/\s+/)) if (c && !c.includes("$")) clases.add(c);
}
log(`Clases estáticas en el archivo: ${clases.size}`);
log("");

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
const ev = async (e) => {
  const r = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

const lista = [...clases];
const resultado = await ev(`(async () => {
  const hojas = [...document.styleSheets].map(s => { try { return [...s.cssRules].map(r => r.cssText).join("\\n"); } catch { return ""; } }).join("\\n");
  // Normalizar: en el CSS los nombres van con el punto escapado.
  const plano = hojas.split("\\\\").join("");
  const escapa = (c) => c.replace(/[.*+?^\${}()|[\\]\\\\/]/g, "\\\\$&");
  const vivo = (c) => new RegExp("\\\\." + escapa(c) + "(?![a-zA-Z0-9_\\\\[.-])").test(plano);
  const clases = ${JSON.stringify(lista)};
  const muertas = [];
  for (const c of clases) {
    const partes = [c, c.split(":").pop()];
    if (!partes.some(vivo)) muertas.push(c);
  }
  // Control positivo: estas TIENEN que estar vivas o la sonda no mide.
  const control = ["flex", "text-white", "rounded-xl", "items-center", "px-6"]
    .map(c => ({ clase: c, viva: vivo(c) }));
  return { total: clases.length, muertas, control };
})()`);

log("── Control positivo de la sonda ──");
for (const c of resultado.control) log(`   ${c.viva ? "VIVA " : "MUERTA"}  ${c.clase}`);
const controlOk = resultado.control.every((c) => c.viva);
log(`   ${controlOk ? "OK  la sonda mide" : "FALLA el control: la sonda NO mide"}`);
log("");

log(`Clases comprobadas: ${resultado.total}`);
log(`Clases MUERTAS (escritas y sin regla en el CSS): ${resultado.muertas.length}`);
log("");
resultado.muertas.forEach((c) => log("   MUERTA  " + c));

cdp.close();
process.exit(controlOk ? 0 : 1);
