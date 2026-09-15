/**
 * audit-ui-copy.mjs — Inventario de copy visible para el usuario.
 *
 * Extrae los literales que el usuario **lee en pantalla** (texto JSX y props de
 * presentación) y marca los que contienen jerga técnica. Deja fuera a propósito:
 * comentarios de código, identificadores, clases de Tailwind, rutas e imports —
 * nada de eso lo ve el usuario, y "amigabilizarlo" sería trabajo perdido.
 *
 * Uso:  node scripts/audit-ui-copy.mjs            # solo los marcados
 *       node scripts/audit-ui-copy.mjs --all      # inventario completo
 *       node scripts/audit-ui-copy.mjs --json     # salida para procesar
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = "packages/apps/web/modules/app/src";
const SHOW_ALL = process.argv.includes("--all");
const AS_JSON = process.argv.includes("--json");

/* Props cuyo valor es copy que el usuario lee. */
const UI_PROPS = [
  "label", "title", "desc", "description", "subtitle", "sub", "question", "answer",
  "body", "hint", "badge", "placeholder", "eyebrow", "emptyTitle", "emptyBody",
  "ctaLabel", "confirmLabel", "aria-label", "text", "message", "notice", "tagline",
  "headline", "caption", "helper", "tooltip", "note",
];

/**
 * Jerga técnica que un dueño de negocio no debería leer. Cada entrada lleva el
 * reemplazo sugerido para que el informe sea accionable y no una lista de quejas.
 */
const JARGON = [
  [/\bpayload\b/i, "datos / contenido"],
  [/\bseed(ear|ed)?\b/i, "datos de ejemplo"],
  [/\barquetipo/i, "tipo de negocio"],
  [/\bstoreIdentity\b/i, "identidad de la tienda"],
  [/\bscope|ámbito\b/i, "alcance"],
  [/\bOMS\b/, "reglas de pedidos"],
  [/\bKDS\b/, "pantalla de cocina"],
  [/\bhandoff\b/i, "pasar a una persona"],
  [/\bwebhook\b/i, "conexión"],
  [/\bendpoint\b/i, "dirección del servicio"],
  [/\bJSON\b/, "datos"],
  [/\bUUID\b|\buserId\b/, "identificador"],
  [/\bslug\b/i, "dirección web"],
  [/\bmock\b/i, "simulación"],
  [/\blocalStorage\b/i, "almacenamiento del navegador"],
  [/\bcaché|cache\b/i, "memoria temporal"],
  [/\bbuffer\b/i, "margen"],
  [/\bsemántica\b/i, "vocabulario"],
  [/\bmatriz\b/i, "tabla"],
  [/\bflag\b/i, "indicador"],
  [/\bAPI\b/, "servicio"],
  [/\btoken\b/i, "credencial"],
  [/\binstancia\b/i, "copia"],
  [/\bentidad\b/i, "registro"],
  [/\bboolean|\bstring\b|\bnumber\b/i, "valor"],
  [/\bmodo local\b|\bdemo\b/i, "modo de prueba"],
  [/\bCognito\b/i, "servicio de acceso"],
  [/\bUserPool\b/i, "servicio de acceso"],
  [/\bnull\b|\bundefined\b/i, "(vacío)"],
  [/§\s?\d/, "(referencia interna)"],
  [/\bsección\s+\d/i, "(referencia interna)"],
  [/\bCRUD\b/, "gestión"],
  [/\bCTA\b/, "botón principal"],
  [/\bUI\b|\bUX\b/, "interfaz"],
  [/\brender/i, "mostrar"],
  [/\bdefault\b/i, "predeterminado"],
  // ── Tono interno: el usuario no debería leer cómo está construido ──
  [/\bidentificador(\s+interno)?\b/i, "quitar: el usuario no lo necesita"],
  [/\binterno\b|\binterna\b/i, "quitar salvo que sea un dato real (código interno)"],
  [/\bonboarding\b|\bwizard\b/i, "usar el nombre visible del flujo"],
  [/\bflujo\b/i, "proceso / pasos"],
  [/\barquitectura\b/i, "quitar"],
  [/\bmodelo de (datos|tres)\b/i, "quitar"],
  [/\bpersist/i, "guardar"],
  [/\bsincroniz/i, "actualizar"],
  [/\bcredencial/i, "contraseña / forma de entrar"],
  [/\bcorreo de la cuenta\b/i, "revisar: puede bastar «correo»"],
  [/\bno se crea un usuario nuevo\b/i, "quitar: detalle de implementación"],
  [/\bmisma cuenta\b/i, "revisar: suele ser detalle interno"],
  // ── Anglicismos y jerga de producto que un dueño de tienda no usa ──
  [/\bbranding\b/i, "identidad visual / imagen"],
  // Ojo con `\b`: en JS el límite de palabra es ASCII, así que `\bbot\b` casa
  // también con el "Bot" de «Botón». Se usa un límite consciente de Unicode.
  [/(?<![\p{L}])bot(?![\p{L}])/iu, "asistente"],
  [/\bparámetro/i, "ajuste / opción"],
  [/\bconsolidad/i, "reunido / en un solo lugar"],
  [/\bauditoría\s*360/i, "visión completa"],
  [/\bKPI\b/, "indicador"],
  [/\bSLA\b/, "tiempo de respuesta"],
  [/\bCRM\b|\bERP\b/, "sistema de gestión"],
  [/\bcheckout\b/i, "pago"],
  [/\bdashboard\b/i, "panel"],
  [/\bwidget\b/i, "bloque"],
  [/\bfeedback\b/i, "comentarios"],
  [/\binsights?\b/i, "conclusiones"],
  [/\bhardware\b/i, "equipo"],
  [/\bsoftware\b/i, "programa"],
  [/\bhosting\b/i, "alojamiento"],
  [/\bdeploy|\bdespliegue\b/i, "publicar"],
  [/\bmétricas?\b/i, "cifras"],
];

/** Descarta lo que claramente no es copy. */
function looksLikeCopy(s) {
  const t = s.trim();
  if (t.length < 3) return false;
  if (!/[a-záéíóúñ]/i.test(t)) return false;
  if (/^[\d\s.,:%$+-]+$/.test(t)) return false;
  // Clases de Tailwind, rutas, imports, nombres de archivo, hex, MIME…
  if (/(^|\s)(flex|grid|rounded|text-|bg-|border-|dark:|hover:|px-|py-|gap-|w-|h-|mt-|mb-|space-y-)/.test(t)) return false;
  if (/^[\w./@-]+\.(tsx?|mjs|js|css|png|svg|json|webp|jpg)$/.test(t)) return false;
  if (/^https?:\/\//.test(t)) return false;
  if (/^#?[0-9a-f]{3,8}$/i.test(t)) return false;
  if (/^[a-z0-9_]+(-[a-z0-9_]+)+$/.test(t)) return false; // kebab-case / ids
  if (/^[A-Z_]+$/.test(t)) return false;                    // CONSTANTES
  if (/^data:/.test(t)) return false;
  if (/^\/[\w/.-]*$/.test(t)) return false;                 // rutas
  if (/^\d+(px|rem|em|%|ms|s|min)$/.test(t)) return false;
  return true;
}

/**
 * Quita comentarios e imports para no auditar lo invisible.
 *
 * ⚠️ Se sustituyen por espacios **conservando los saltos de línea**: si se
 * borraran sin más, todos los números de línea del informe quedarían
 * desplazados y el informe sería inútil para localizar el copy.
 */
function stripInvisible(src) {
  const blank = (m) => m.replace(/[^\n]/g, " ");
  return src
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/^[ \t]*\/\/.*$/gm, blank)
    .replace(/^[ \t]*import[\s\S]*?from\s+["'][^"']+["'];?/gm, blank)
    .replace(/^[ \t]*export\s+\{[^}]*\}\s+from\s+["'][^"']+["'];?/gm, blank);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** Posición (línea) de un índice dentro del texto. */
const lineAt = (src, index) => src.slice(0, index).split("\n").length;

const findings = [];
const all = [];

for (const file of walk(SRC)) {
  const raw = readFileSync(file, "utf8");
  const src = stripInvisible(raw);
  const rel = relative(SRC, file).replace(/\\/g, "/");

  const push = (value, index) => {
    if (!looksLikeCopy(value)) return;
    const clean = value.replace(/\s+/g, " ").trim();
    const hits = JARGON.filter(([re]) => re.test(clean)).map(([re, fix]) => ({
      term: (clean.match(re) || [""])[0],
      fix,
    }));
    // Copy de párrafo: en una interfaz, una indicación de más de ~200 caracteres
    // suele ser una explicación que sobra o que debería vivir en la ayuda.
    if (clean.length > 200) hits.push({ term: `${clean.length} car.`, fix: "acortar o mover a Ayuda" });
    const rec = { file: rel, line: lineAt(src, index), text: clean, hits };
    all.push(rec);
    if (hits.length) findings.push(rec);
  };

  // 1) Texto JSX entre etiquetas: >Hola<  (sin llaves ni anidamiento)
  for (const m of src.matchAll(/>\s*([^<>{}\n]{4,200}?)\s*</g)) push(m[1], m.index);

  // 2) Props de UI con literal: `label="..."` (JSX) y `label: "..."` (objeto).
  //    El patrón con dos puntos importa: en este proyecto el copy vive sobre todo
  //    en archivos de constantes con objetos, no en atributos JSX.
  const propRe = new RegExp(
    `\\b(${UI_PROPS.join("|")})\\s*[:=]\\s*(?:"([^"]{3,400})"|\\{\\s*"([^"]{3,400})"\\s*\\})`,
    "g"
  );
  for (const m of src.matchAll(propRe)) push(m[2] ?? m[3], m.index);

  // 3) Ternarios de copy dentro de JSX: cond ? "Texto" : "Otro"
  for (const m of src.matchAll(/\?\s*"([^"]{4,200})"\s*:\s*"([^"]{4,200})"/g)) {
    push(m[1], m.index);
    push(m[2], m.index);
  }
}

if (AS_JSON) {
  console.log(JSON.stringify({ total: all.length, flagged: findings }, null, 2));
  process.exit(0);
}

if (SHOW_ALL) {
  console.log(`\nINVENTARIO COMPLETO — ${all.length} cadenas visibles\n`);
  for (const r of all) console.log(`${r.file}:${r.line}  ${r.text}`);
}

console.log(`\n${"═".repeat(72)}`);
console.log(`COPY VISIBLE AUDITADO: ${all.length} cadenas · CON JERGA: ${findings.length}`);
console.log(`${"═".repeat(72)}\n`);

const byFile = new Map();
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}
for (const [file, items] of [...byFile].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n${file}  (${items.length})`);
  for (const i of items) {
    const terms = [...new Set(i.hits.map((h) => h.term))].join(", ");
    console.log(`  L${i.line}  [${terms}]  ${i.text.slice(0, 110)}`);
  }
}
console.log("");
