import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "./artifacts/";
mkdirSync(OUT, { recursive: true });
const CDP = "http://127.0.0.1:9333";
const TARGET = "https://demo.tailadmin.com/ai-settings.html";

const res = await fetch(`${CDP}/json/list`);
const targets = await res.json();
const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl && !t.url.startsWith("devtools"));
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
await new Promise((r) => ws.addEventListener("open", r));
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) =>
  new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

const evaluate = async (expression) => {
  const m = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  const r = m.result;
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const expr = (...l) => l.join("\n");
const q = (v) => JSON.stringify(v);

await send("Page.navigate", { url: TARGET });
for (let i = 0; i < 40; i++) {
  if (await evaluate("document.readyState === 'complete' && document.querySelectorAll('h2').length > 3")) break;
  await sleep(400);
}
await sleep(1500);

// Read EVERY h3 card: its subtitle, its toggle states, its buttons, its selects.
const sections = await evaluate(expr(
  "(() => {",
  "  const out = [];",
  "  const h2s = [...document.querySelectorAll('h2')];",
  "  for (const h2 of h2s) {",
  "    const entry = { section: h2.textContent.trim(), cards: [] };",
  "    // Walk forward collecting h3s until the next h2.",
  "    let n = h2.parentElement;",
  "    const scope = n ? n.parentElement : h2.parentElement;",
  "    const h3s = [...scope.querySelectorAll('h3')];",
  "    for (const h3 of h3s) {",
  "      const card = h3.closest('div[class*=rounded-xl], div[class*=rounded-2xl], div') || h3.parentElement;",
  "      const txt = card ? card.innerText.replace(/\\n+/g, ' | ').slice(0, 220) : '';",
  "      entry.cards.push({ title: h3.textContent.trim(), text: txt });",
  "    }",
  "    out.push(entry);",
  "  }",
  "  return out;",
  "})()"
));

// Print deduped: only main content h3s (skip sidebar h3 'Menú/Support/others').
const SIDEBAR = new Set(["Menú", "Support", "others", "Panel n.º 1 de Tailwind CSS"]);
for (const s of sections || []) {
  if (!s.section || SIDEBAR.has(s.section)) continue;
  console.log(`\n########## H2: ${s.section}`);
  const seen = new Set();
  for (const c of s.cards) {
    if (SIDEBAR.has(c.title) || seen.has(c.title)) continue;
    seen.add(c.title);
    console.log(`  · ${c.title}`);
    console.log(`      ${c.text}`);
  }
}

// Selects and their options.
const selects = await evaluate(expr(
  "(() => [...document.querySelectorAll('select')].map(s => ({",
  "  aria: s.getAttribute('aria-label') || '',",
  "  opts: [...s.options].map(o => o.textContent.trim()),",
  "  sel: s.value,",
  "})))()"
));
console.log("\n=== SELECTS ===");
for (const s of selects || []) console.log(`  [${s.aria}] sel=${q(s.sel)} opts=${JSON.stringify(s.opts)}`);

// Toggle rows: text immediately preceding each switch + its state.
const toggles = await evaluate(expr(
  "(() => {",
  "  const out = [];",
  "  for (const cb of document.querySelectorAll('input[type=checkbox]')) {",
  "    const w = cb.closest('label') || cb.parentElement?.parentElement || cb.parentElement;",
  "    const txt = w ? w.innerText.replace(/\\n+/g, ' | ').slice(0, 120) : '';",
  "    out.push({ on: cb.checked, txt });",
  "  }",
  "  return out;",
  "})()"
));
console.log("\n=== TOGGLES ===");
for (const t of toggles || []) console.log(`  ${t.on ? "[ON ]" : "[off]"} ${t.txt}`);

// Sliders with their current value and surrounding label.
const sliders = await evaluate(expr(
  "(() => {",
  "  const out = [];",
  "  for (const r of document.querySelectorAll('input[type=range]')) {",
  "    const w = r.closest('div')?.parentElement || r.parentElement;",
  "    const txt = w ? w.innerText.replace(/\\n+/g, ' | ').slice(0, 140) : '';",
  "    out.push({ min: r.min, max: r.max, step: r.step, val: r.value, txt });",
  "  }",
  "  return out;",
  "})()"
));
console.log("\n=== SLIDERS ===");
for (const s of sliders || []) console.log(`  ${s.val} (${s.min}..${s.max} step ${s.step})  ${s.txt}`);

// Model / connector lists: read text of list items near those headings.
const modelRows = await evaluate(expr(
  "(() => {",
  "  const h = [...document.querySelectorAll('h3')].find(x => x.textContent.trim() === 'All Models');",
  "  if (!h) return null;",
  "  let box = h.parentElement; for (let i=0;i<4 && box;i++) box = box.parentElement;",
  "  return box ? box.innerText.replace(/\\n+/g,' | ').slice(0, 1600) : null;",
  "})()"
));
console.log("\n=== ALL MODELS BLOCK ===");
console.log(modelRows);

const appsRows = await evaluate(expr(
  "(() => {",
  "  const h = [...document.querySelectorAll('h3')].find(x => x.textContent.trim() === 'Apps');",
  "  if (!h) return null;",
  "  let box = h.parentElement; for (let i=0;i<4 && box;i++) box = box.parentElement;",
  "  return box ? box.innerText.replace(/\\n+/g,' | ').slice(0, 1400) : null;",
  "})()"
));
console.log("\n=== APPS BLOCK ===");
console.log(appsRows);

// Capture each section by scrolling to its h2.
const h2Names = await evaluate(expr(
  "(() => [...document.querySelectorAll('h2')].map(h => h.textContent.trim()))()"
));
const wanted = ["Personalization", "Memory", "File & Media", "Models", "Connector", "Data Control"];
for (const name of wanted) {
  const ok = await evaluate(expr(
    "(() => {",
    "  const h = [...document.querySelectorAll('h2')].find(x => x.textContent.trim() === " + q(name) + ");",
    "  if (!h) return false;",
    "  h.scrollIntoView({ block: 'start' }); return true;",
    "})()"
  ));
  if (!ok) { console.log(`scroll fail: ${name}`); continue; }
  await sleep(500);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  const safe = name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  writeFileSync(OUT + `ref-${safe}.png`, Buffer.from(shot.result.data, "base64"));
  console.log(`captured: ref-${safe}.png`);
}
ws.close();
