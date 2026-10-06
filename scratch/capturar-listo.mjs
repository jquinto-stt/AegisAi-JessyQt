/**
 * Captura el estado «listo» de /pedidos/display —la banda naranja—, que el seed
 * no trae: no hay ningún pedido en `listo`, así que esa mitad del diseño nunca
 * se renderiza y por tanto nunca se audita.
 *
 * Para verla hay que avanzar un pedido de verdad. El guion **fotografía todo
 * localStorage antes de tocar nada y lo restaura al final**, así que la demo
 * queda exactamente como estaba. Si la restauración falla, se dice.
 */
import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://127.0.0.1:6020";
const OUT = "./outputs/display-verify/";
mkdirSync(OUT, { recursive: true });

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
await send("Emulation.setDeviceMetricsOverride", {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  mobile: false,
});

const evaluar = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const capturar = async (nombre) => {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(OUT + nombre, Buffer.from(data, "base64"));
  console.log("  captura ->", nombre);
};

await send("Page.navigate", { url: APP + "/pedidos/display" });
for (let i = 0; i < 60; i++) {
  if (await evaluar(`!!document.querySelector('header')`).catch(() => false)) break;
  await dormir(300);
}
await dormir(1200);

// ── Fotografía del almacenamiento ───────────────────────────────────────────
const respaldo = await evaluar(
  `(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; })()`
);
writeFileSync(OUT + ".respaldo-localstorage.json", JSON.stringify(respaldo, null, 1));
console.log("  respaldo de localStorage:", Object.keys(respaldo).length, "claves");

const estadoHero = () =>
  evaluar(
    `(() => { const p = document.querySelector('main > section span.inline-flex'); return p ? p.textContent.trim() : null; })()`
  );

console.log("  estado del protagonista al empezar:", await estadoHero());

// ── Avanzar hasta que el protagonista quede listo ───────────────────────────
for (let intento = 1; intento <= 4; intento++) {
  const est = await estadoHero();
  if (est && /listo/i.test(est)) break;
  const pulsado = await evaluar(
    `(() => { const b = [...document.querySelectorAll('main button')].find(x => /Avanzar a/i.test(x.textContent||'')); if (!b) return false; b.click(); return true; })()`
  );
  if (!pulsado) {
    console.log("  no encontre el boton de avance; me detengo");
    break;
  }
  console.log("  avance", intento, "->", await (async () => (await dormir(700), estadoHero()))());
}

await dormir(1500);
console.log("  estado final del protagonista:", await estadoHero());

// ── La auditoría de color, sobre la banda naranja ───────────────────────────
const AUDITORIA = `(() => {
  const TOKENS = [];
  const push = (a) => a.forEach((h) => TOKENS.push(h));
  push(["#fff5f2","#ffede8","#ffd6cc","#ffb3a3","#ff8f78","#ff6647","#ff3c10","#e63314","#bf2810","#99200d","#7a1a0b","#4d0f06"]);
  push(["#f4f2ff","#ebe6ff","#d2c7ff","#a98fff","#7e57ff","#4d1fe0","#2a0bb0","#15008b","#14006e","#0f0054","#0a003a","#060022"]);
  push(["#f5fcfd","#eaf7f9","#d5eff3","#b6e3ea","#71d6e0","#6bc2ce","#45aebd","#348a97","#2a6f79","#22585f","#1c474d","#0f2a2e"]);
  push(["#f6fef9","#ecfdf3","#d1fadf","#a6f4c5","#6ce9a6","#32d583","#12b76a","#039855","#027a48","#05603a","#054f31","#053321"]);
  push(["#fffcf5","#fffaeb","#fef0c7","#fedf89","#fec84b","#fdb022","#f79009","#dc6803","#b54708","#93370d","#7a2e0e","#4e1d09"]);
  push(["#fffbfa","#fef3f2","#fee4e2","#fecdca","#fda29b","#f97066","#f04438","#d92d20","#b42318","#912018","#7a271a","#55160c"]);
  push(["#1d3261","#535250"]);
  push(["#fcfcfd","#f9fafb","#f2f4f7","#e4e7ec","#d0d5dd","#98a2b3","#667085","#475467","#344054","#1d2939","#101828","#0c111d","#1a2231"]);
  push(["#ffffff","#f2e7d3"]);
  const hex2rgb = (h) => [1,3,5].map((i) => parseInt(h.slice(i, i+2), 16));
  const allowed = TOKENS.map(hex2rgb);
  const cv = document.createElement("canvas"); cv.width = 1; cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const toSRGB = (c) => { ctx.clearRect(0,0,1,1); ctx.fillStyle = "#000"; ctx.fillStyle = c; ctx.fillRect(0,0,1,1); const d = ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2]]; };
  const ok = (r,g,b) => allowed.some(([R,G,B]) => Math.abs(r-R)<=4 && Math.abs(g-G)<=4 && Math.abs(b-B)<=4);
  const bad = new Map(); let n = 0;
  const walk = (el) => {
    const cs = getComputedStyle(el);
    for (const p of ["backgroundColor","color","borderTopColor"]) {
      const v = cs[p];
      if (v === "rgba(0, 0, 0, 0)") continue;
      n++;
      const [r,g,b] = toSRGB(v);
      if (Math.max(r,g,b) - Math.min(r,g,b) < 30) continue;
      if (ok(r,g,b)) continue;
      const k = p + "=" + v + " -> rgb(" + r + "," + g + "," + b + ")";
      if (!bad.has(k)) bad.set(k, el.tagName.toLowerCase() + "." + String(el.className).slice(0,60));
    }
    for (const c of el.children) walk(c);
  };
  walk(document.body);
  return { inspeccionados: n, malos: [...bad].map(([k,v]) => k + "  [" + v + "]") };
})()`;

const audit = await evaluar(AUDITORIA);
console.log("  color · declaraciones:", audit.inspeccionados, "· fuera de paleta:", audit.malos.length);
audit.malos.slice(0, 20).forEach((m) => console.log("     " + m));

await capturar("05-display-listo.png");

// ── Restaurar el almacenamiento ─────────────────────────────────────────────
const restaurado = await evaluar(
  `(() => {
    const r = ${JSON.stringify(respaldo)};
    localStorage.clear();
    for (const k of Object.keys(r)) localStorage.setItem(k, r[k]);
    const igual = Object.keys(r).length === localStorage.length &&
      Object.keys(r).every((k) => localStorage.getItem(k) === r[k]);
    return igual;
  })()`
);
console.log("  localStorage restaurado:", restaurado ? "SI, identico" : "NO — revisar el respaldo");
await send("Page.navigate", { url: APP + "/pedidos/display" });
await dormir(1200);
console.log("  estado tras restaurar:", await estadoHero());

ws.close();
