/**
 * Captura visual de Configuración de sede — las 6 secciones en tema oscuro.
 *
 * No es un guardián: no asevera nada, sólo produce evidencia. El guardián de la
 * pantalla es `verify-settings-layout.mjs`, que además dispara sus propias
 * capturas en tema claro. Éste existe porque el guardián siembra `theme:'light'`
 * y una revisión de diseño en tema oscuro necesita las dos pieles.
 *
 * Uso: con dev server + Chrome headless --remote-debugging-port=9222 vivos,
 *   node scripts/capture-settings-dark.mjs
 */
const CDP = "http://127.0.0.1:9222";
const APP = process.env.NECTO_APP_URL || "http://localhost:5174";
const { writeFileSync, mkdirSync } = await import("node:fs");
mkdirSync("./artifacts", { recursive: true });

const page = await (async () => {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${CDP}/json/list`);
      const all = await r.json();
      const t = all.find((x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
      if (t) return t;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("no page target");
})();

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
await new Promise((res, rej) => {
  ws.addEventListener("open", res);
  ws.addEventListener("error", rej);
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    }
  });
});
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evaluate = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval failed");
  return r.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1100,
  deviceScaleFactor: 1,
  mobile: false,
});

const shot = async (name) => {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`./artifacts/dark-${name}.png`, Buffer.from(data, "base64"));
  console.log("  · dark-" + name + ".png");
};

const waitFor = async (expr, label, timeout = 15000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      if (await evaluate(expr)) return true;
    } catch {}
    await sleep(150);
  }
  console.log(`      (timeout esperando: ${label})`);
  return false;
};

await send("Page.navigate", { url: APP });
await waitFor('document.readyState === "complete"', "readyState");
await sleep(1200);

// Sede con los dos módulos para que los seis apartados del asistente existan.
await evaluate(`
  localStorage.clear();
  localStorage.setItem('necto_businesses', JSON.stringify([
    { id:'biz-a', name:'Ferretería & Suministros La Tuerca', businessType:'retail_store',
      city:'Medellín', country:'Colombia', currency:'COP', code:'SUC-01', slug:'la-tuerca',
      address:'Carrera 43A # 1-50', openingDays:'Lunes a sábado', openingHours:'10:00 - 22:00',
      activeModules:['pedidos','inventarios'], channels:{whatsapp:true,web:true,pos:true},
      iconKey:'store', createdAt:new Date().toISOString() }]));
  localStorage.setItem('necto_active_business_id','biz-a');
  localStorage.setItem('webforge-ui-preferences', JSON.stringify({ theme:'dark' }));
  true;`);

await send("Page.navigate", { url: `${APP}/app?section=configuracion` });
await waitFor(`!!document.getElementById('business-settings-title')`, "settings modal");
await sleep(700);

const DIALOG = `document.getElementById('business-settings-title').closest('[role=dialog]')`;
const clickTab = (label) =>
  evaluate(`(() => { const d = ${DIALOG};
    const nav = d && d.querySelectorAll('nav button');
    const b = nav && [...nav].find(x => x.textContent.trim() === ${JSON.stringify(label)});
    if (!b) return null; b.click(); return b.textContent.trim(); })()`);
const clickSubTab = (label) =>
  evaluate(`(() => { const d = ${DIALOG};
    const list = d && d.querySelector('[role=tablist][aria-label="Apartados del asistente"]');
    const b = list && [...list.querySelectorAll('button[role=tab]')]
      .find(x => x.textContent.trim() === ${JSON.stringify(label)});
    if (!b) return false; b.click(); return true; })()`);

const tabs = [
  ["General", "general"],
  ["Canales de entrada", "canales"],
  ["Asistente de WhatsApp IA", "asistente"],
  ["Pagos", "pagos"],
  ["Marca y visual", "marca"],
  ["Operaciones", "operaciones"],
];

console.log("\n── Tema oscuro · las seis secciones ──");
for (const [label, slug] of tabs) {
  const clicked = await clickTab(label);
  await sleep(650);
  console.log(`[${label}] ${clicked ? "ok" : "NO ENCONTRADA"}`);
  await shot(slug);
}

console.log("\n── Tema oscuro · apartados del asistente ──");
await clickTab("Asistente de WhatsApp IA");
await sleep(650);
for (const sub of [
  "Identidad y comportamiento",
  "Conocimiento y capacidades",
  "Reglas de pedidos",
  "Pasar a un asesor",
  "Horarios y disponibilidad",
  "Experiencia del cliente",
]) {
  const ok = await clickSubTab(sub);
  await sleep(600);
  const slug = sub
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
  console.log(`[${sub}] ${ok ? "ok" : "NO ENCONTRADO"}`);
  await shot("asistente-" + slug);
}

console.log("\nCapturas en ./artifacts/dark-*.png");
ws.close();
process.exit(0);
