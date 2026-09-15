// Versión afinada: sólo cuenta deuda REAL, sin falsos positivos de regex.
// - offpal: clases de paleta ajena reales (\b palette-NN), no "translate-y".
// - adhoc: contenedores que tienen rounded + fondo de tarjeta pero NO el
//   borde del patrón DS. Se excluyen canvas/dashboards con fondo propio.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const SRC = "C:/Users/Jessy/Documents/GitHub/StockFlow/packages/apps/web/modules/app/src";

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== "elements") walk(p, out); }
    else if (e.endsWith(".tsx")) out.push(p);
  }
  return out;
};

const DS_CARD = "border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]";

const METRICS = [
  ["arb", /text-\[\d/g],
  ["2xl", /rounded-2xl/g],
  ["offpal", /\b(zinc|slate|emerald|purple|indigo|violet|teal|cyan|rose|pink)-\d{2,3}\b/g],
  ["sh", /\bshadow-(2xl|lg|md)\b/g],
  ["hex", /className="[^"]*#[0-9A-Fa-f]{6}/g],
];

const rows = [];
for (const f of walk(SRC)) {
  const s = readFileSync(f, "utf8");
  const counts = {};
  let total = 0;
  for (const [k, re] of METRICS) {
    const n = (s.match(re) || []).length;
    counts[k] = n;
    total += n;
  }
  // Contenedores con fondo de tarjeta y radio, sin el borde del DS.
  const adhocRe = /className="([^"]*\brounded-(?:xl|2xl)\b[^"]*)"/g;
  let adhoc = 0;
  for (const m of s.matchAll(adhocRe)) {
    const cls = m[1];
    const hasCardBg = /\bbg-white\b/.test(cls) || /dark:bg-gray-9\d\d/.test(cls);
    const isModalOrOverlay = /\b(fixed|absolute|z-\d|backdrop)\b/.test(cls);
    const hasDsBorder = /border-gray-200/.test(cls) || /border\s/.test(cls);
    if (hasCardBg && !hasDsBorder && !isModalOrOverlay) adhoc++;
  }
  counts.adhoc = adhoc;
  total += adhoc;
  if (total > 0) rows.push({ rel: path.relative(SRC, f).replace(/\\/g, "/"), counts, total });
}

rows.sort((a, b) => b.total - a.total);
const keys = [...METRICS.map((m) => m[0]), "adhoc"];
console.log(`Analizados: ${walk(SRC).length} .tsx (sin elements/) · con deuda real: ${rows.length}\n`);
console.log("archivo".padEnd(60) + keys.map((k) => k.padStart(7)).join("") + "  total");
for (const r of rows) {
  console.log(r.rel.padEnd(60) + keys.map((k) => String(r.counts[k]).padStart(7)).join("") + String(r.total).padStart(7));
}
console.log("\narb=npx arbitrario · 2xl=radio ajeno · offpal=paleta ajena · sh=sombra no-token · hex=hex en clase · adhoc=contenedor sin borde DS");
