/**
 * Captura el módulo Pedidos (oscuro y claro) para revisión visual.
 * Uso: NECTO_APP_URL=http://localhost:5174 node scripts/capture-orders-themes.mjs
 *
 * ⚠️ La bandeja es **sólo tabla** desde que se retiró la vista Board. Este script
 * tenía pasos de Board (un botón "Board" y tarjetas `[data-board-card]`) que ya no
 * existen: se abren las filas con `[data-order-row]`, que es la ancla real.
 *
 * ⚠️ Se abre una pestaña **propia** en vez de usar la primera de `/json/list`: con
 * varias guardas corriendo a la vez, capturar la pestaña de otra dejaría las
 * imágenes con la pantalla equivocada.
 */
import { mkdirSync, writeFileSync } from "node:fs";

const CDP = "http://127.0.0.1:9222";
const APP = process.env.NECTO_APP_URL || "http://localhost:5174";
const OUT = "./artifacts/";
mkdirSync(OUT, { recursive: true });

/** Pestaña propia: se abre con `/json/new` y se cierra al terminar. */
const target = await (
  await fetch(`${CDP}/json/new?${encodeURIComponent(APP)}`, { method: "PUT" })
).json();

const ws = new WebSocket(target.webSocketDebuggerUrl);
let msgId = 0;
const pending = new Map();
await new Promise((res, rej) => {
  ws.addEventListener("open", res);
  ws.addEventListener("error", rej);
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res: r, rej: j } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result);
    }
  });
});
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = ++msgId;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expr) => {
  const r = await send("Runtime.evaluate", {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails)
    throw new Error(r.exceptionDetails.exception?.description || "eval failed");
  return r.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shoot = async (name) => {
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${OUT}${name}.png`, Buffer.from(r.data, "base64"));
  console.log(`shot: ${name}.png`);
};

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1600,
  height: 1100,
  deviceScaleFactor: 1,
  mobile: false,
});

await send("Page.navigate", { url: APP });
await sleep(2500);

const STORE = {
  id: "biz-shot",
  name: "Ferretería El Tornillo",
  slug: "ferreteria",
  businessType: "retail_store",
  iconKey: "store",
  currency: "COP",
  city: "Bogotá",
  address: "Cra 45 #12-30",
  channels: { whatsapp: true, web: true, pos: true },
  channelConnections: [
    {
      businessId: "biz-shot",
      type: "whatsapp",
      status: "connected",
      displayPhoneNumber: "+57 310 555 0114",
    },
  ],
  kitchenBufferMin: 15,
  activeModules: ["pedidos"],
  createdAt: new Date().toISOString(),
};

/* Abre el detalle de una orden por número y deja el drawer montado. */
const openDetail = async (number) => {
  await evaluate(
    `(() => { const r = document.querySelector('[data-order-row="${number}"]'); if (r) r.click(); return !!r; })()`
  );
  await sleep(1100);
};
const closeDetail = async () => {
  await evaluate(`(() => {
    const d = document.querySelector('[data-order-detail]');
    const x = d && [...d.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Cerrar detalle');
    if (x) x.click(); return true; })()`);
  await sleep(700);
};

for (const theme of ["dark", "light"]) {
  await evaluate(`
    localStorage.setItem('necto_businesses', JSON.stringify([${JSON.stringify(STORE)}]));
    localStorage.setItem('necto_active_business_id', 'biz-shot');
    localStorage.setItem('webforge-ui-preferences', JSON.stringify({ theme: '${theme}' }));
    localStorage.removeItem('necto_orders_v1');
    true;`);

  // ── Tabla ──
  await send("Page.navigate", { url: `${APP}/app?module=pedidos` });
  await sleep(4200);
  await shoot(`orders-${theme}-table`);

  // ── Detalle desde la fila (la vista Board ya no existe) ──
  await openDetail("#1044");
  await shoot(`orders-${theme}-detail`);
  await closeDetail();

  // ── Programados ──
  await evaluate(`(() => { const b = document.querySelector('[data-orders-section="programados"]'); if (b) b.click(); return true; })()`);
  await sleep(1100);
  await shoot(`orders-${theme}-scheduled`);

  // ── Preparación ──
  await evaluate(`(() => { const b = document.querySelector('[data-orders-section="preparacion"]'); if (b) b.click(); return true; })()`);
  await sleep(1100);
  await shoot(`orders-${theme}-preparation`);

  // ── Canales ──
  await evaluate(`(() => { const b = document.querySelector('[data-orders-section="canales"]'); if (b) b.click(); return true; })()`);
  await sleep(1100);
  await shoot(`orders-${theme}-channels`);

  // ── Configuración ──
  await evaluate(`(() => { const b = document.querySelector('[data-orders-section="configuracion"]'); if (b) b.click(); return true; })()`);
  await sleep(1100);
  await shoot(`orders-${theme}-config`);

  // ── Widget en el Dashboard ──
  await send("Page.navigate", { url: `${APP}/app` });
  await sleep(3500);
  await shoot(`orders-${theme}-dashboard-widget`);
}

ws.close();
// Cerrar la pestaña propia: se dejó abierta para no interferir con otras guardas.
await fetch(`${CDP}/json/close/${target.id}`).catch(() => {});
console.log("listo");
