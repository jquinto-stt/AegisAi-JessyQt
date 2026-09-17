import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "./artifacts/";
mkdirSync(OUT, { recursive: true });
const CDP = "http://127.0.0.1:9333";
const TARGET = process.env.REF_URL || "https://demo.tailadmin.com/ai-settings.html";

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
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440, height: 1400, deviceScaleFactor: 1, mobile: false,
});

const evaluate = async (expression, byValue = true) => {
  const m = await send("Runtime.evaluate", { expression, returnByValue: byValue, awaitPromise: true });
  const r = m.result;
  if (!r) throw new Error("no result: " + JSON.stringify(m).slice(0, 300));
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
  return byValue ? r.result.value : r.result;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (v) => JSON.stringify(v);
const expr = (...lines) => lines.join("\n");

await send("Page.navigate", { url: TARGET });
// Wait for real content, not a fixed sleep.
for (let i = 0; i < 40; i++) {
  const ready = await evaluate("!!document.querySelector('h1,h2,h3') && document.readyState === 'complete'");
  if (ready) break;
  await sleep(400);
}
await sleep(1200);
console.log("url:", await evaluate("location.href"));
console.log("title:", await evaluate("document.title"));
console.log("h count:", await evaluate("document.querySelectorAll('h1,h2,h3,h4').length"));
console.log("body chars:", await evaluate("document.body.innerText.length"));

// 1) Outline: the main content regions and their headings.
const outline = await evaluate(expr(
  "(() => {",
  "  const out = [];",
  "  const heads = [...document.querySelectorAll('h1,h2,h3,h4')];",
  "  for (const h of heads) {",
  "    out.push({ tag: h.tagName, text: h.textContent.trim().replace(/\\s+/g, ' ') });",
  "  }",
  "  return out;",
  "})()"
));
console.log("=== HEADINGS ===");
for (const h of outline || []) console.log(`  ${h.tag}  ${h.text}`);

// 2) Every form control with its label and type.
const controls = await evaluate(expr(
  "(() => {",
  "  const out = [];",
  "  const labels = [...document.querySelectorAll('label')];",
  "  for (const l of labels) {",
  "    const txt = l.textContent.trim().replace(/\\s+/g, ' ').slice(0, 70);",
  "    const id = l.getAttribute('for');",
  "    let ctrl = id ? document.getElementById(id) : l.querySelector('input,select,textarea,button');",
  "    if (!ctrl && l.parentElement) ctrl = l.parentElement.querySelector('input,select,textarea,button');",
  "    out.push({ label: txt, tag: ctrl ? ctrl.tagName : 'none', type: ctrl ? (ctrl.type || '') : '', value: ctrl && ctrl.value ? String(ctrl.value).slice(0, 40) : '' });",
  "  }",
  "  return out;",
  "})()"
));
console.log("\n=== LABELLED CONTROLS ===");
for (const c of controls || []) console.log(`  [${c.tag}${c.type ? ":" + c.type : ""}] ${c.label}${c.value ? "  = " + c.value : ""}`);

// 3) All inputs/selects/checkboxes/switches regardless of label association.
const rawControls = await evaluate(expr(
  "(() => {",
  "  const out = [];",
  "  for (const el of document.querySelectorAll('input,select,textarea')) {",
  "    const t = el.tagName === 'INPUT' ? (el.type || 'text') : el.tagName.toLowerCase();",
  "    if (t === 'hidden') continue;",
  "    const ph = el.getAttribute('placeholder') || '';",
  "    const aria = el.getAttribute('aria-label') || '';",
  "    out.push({ t, ph, aria, checked: el.checked === true });",
  "  }",
  "  return out;",
  "})()"
));
console.log("\n=== ALL CONTROLS (raw) ===");
for (const c of rawControls || []) console.log(`  ${c.t.padEnd(10)} placeholder=${q(c.ph)} aria=${q(c.aria)}${c.checked ? "  [checked]" : ""}`);

// 4) Buttons and links.
const buttons = await evaluate(expr(
  "(() => [...document.querySelectorAll('button,a')].map(b => ({",
  "  tag: b.tagName, text: b.textContent.trim().replace(/\\s+/g, ' ').slice(0, 50),",
  "})).filter(b => b.text))()"
));
console.log("\n=== BUTTONS / LINKS ===");
for (const b of buttons || []) console.log(`  [${b.tag}] ${b.text}`);

// 5) Navigation items in the sidebar.
const nav = await evaluate(expr(
  "(() => [...document.querySelectorAll('aside a, nav a')].map(a => a.textContent.trim().replace(/\\s+/g, ' ')).filter(Boolean))()"
));
console.log("\n=== NAV ===");
for (const n of nav || []) console.log(`  ${n}`);

// 6) Headings before each button, so we know which card each action lives in.
const cards = await evaluate(expr(
  "(() => {",
  "  const out = [];",
  "  for (const h of document.querySelectorAll('h1,h2,h3,h4')) {",
  "    const box = h.closest('div[class*=rounded], section, div[class*=bg-white]');",
  "    const scope = box || h.parentElement;",
  "    const btns = [...scope.querySelectorAll('button')].map(b => b.textContent.trim()).filter(Boolean);",
  "    out.push({ head: h.textContent.trim().replace(/\\s+/g, ' '), buttons: btns });",
  "  }",
  "  return out;",
  "})()"
));
console.log("\n=== HEADING -> CARD BUTTONS ===");
for (const c of cards || []) console.log(`  ${c.head}  ->  ${JSON.stringify(c.buttons)}`);

const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
if (shot.result && shot.result.data) {
  writeFileSync(OUT + "ref-ai-settings-full.png", Buffer.from(shot.result.data, "base64"));
  console.log("\nscreenshot: artifacts/ref-ai-settings-full.png");
} else {
  const fallback = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(OUT + "ref-ai-settings-full.png", Buffer.from(fallback.result.data, "base64"));
  console.log("\nscreenshot (viewport only): artifacts/ref-ai-settings-full.png");
}
ws.close();
