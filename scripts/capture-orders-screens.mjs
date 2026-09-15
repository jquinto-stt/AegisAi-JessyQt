/**
 * Capturas de la suite de Pedidos — prueba visual del diseño, en **ambos temas**.
 *
 * Recorre los ocho destinos del módulo, el tablero de la Bandeja y el detalle de
 * una orden, y lo hace dos veces: una forzando `light` y otra forzando `dark`. El
 * brief exige compatibilidad claro/oscuro, y una sola tanda no lo demuestra.
 *
 * ⚠️ **Crea su propia pestaña** (`PUT /json/new`) y la cierra al terminar, en vez
 * de buscar "la primera pestaña que haya". Buscarla era una trampa de dos filos:
 * si la pestaña elegida estaba ocupada —o con su hilo principal atascado— el
 * arnés se quedaba esperando para siempre sin imprimir nada, y si estaba sana
 * pero la estaba usando alguien, la captura le robaba la pantalla. Una pestaña
 * propia no puede fallar por ninguna de las dos razones.
 *
 * ⚠️ Toda orden CDP lleva **timeout**. Sin él, un renderer atascado convierte el
 * arnés en un proceso colgado que no dice por qué — que es exactamente lo que
 * pasó cuando el servidor de desarrollo se cayó y la primera pestaña se quedó
 * esperando su respuesta.
 *
 * ⚠️ El tema se siembra en la forma **plana** que escribe `ui.store.ts`
 * (`JSON.stringify(this.preferences)` → `{ theme, sidebarExpanded }`), NO en la
 * forma de `zustand/persist` (`{ state: {...}, version: 0 }`). Con la forma
 * equivocada el ajuste se ignora en silencio y las dos tandas salen idénticas.
 *
 * ⚠️ El aviso de cookies se marca como decidido antes de navegar: si no, sale en
 * la esquina inferior derecha de todas las imágenes.
 *
 * Uso:  node scripts/capture-orders-screens.mjs
 *       NECTO_APP_URL=http://localhost:5180 node scripts/capture-orders-screens.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";

const CDP = process.env.NECTO_CDP_URL || "http://127.0.0.1:9222";
const APP = process.env.NECTO_APP_URL || "http://localhost:5173";
const OUT = "artifacts/pedidos-suite/";

/* ── Pestaña propia ────────────────────────────────────────────────────────── */

const target = await (
  await fetch(`${CDP}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" })
).json();

const ws = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let id = 0;
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
  }
});
await new Promise((r) => ws.addEventListener("open", r));

const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const mid = ++id;
    // 30 s: cargar el módulo en frío obliga a Vite a transformar media app, y el
    // primer `Page.navigate` de la tanda puede tardar bastante más que los demás.
    const timer = setTimeout(() => {
      if (pending.has(mid)) {
        pending.delete(mid);
        rej(new Error(`TIMEOUT ${method} tras 30s`));
      }
    }, 30000);
    pending.set(mid, {
      res: (v) => { clearTimeout(timer); res(v); },
      rej: (e) => { clearTimeout(timer); rej(e); },
    });
    ws.send(JSON.stringify({ id: mid, method, params }));
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
const shot = async (dir, name) => {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(dir + name, Buffer.from(data, "base64"));
  console.log("  → " + dir + name);
};

/** Pulsa un botón y dice si existía, sin reventar el proceso si no está. */
const clickFirst = (selector) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return false;
  el.click();
  return true;
})()`;

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1512,
  height: 1150,
  deviceScaleFactor: 2,
  mobile: false,
});

const business = {
  id: "biz-orders",
  name: "Almacén Central",
  type: "restaurant",
  currency: "COP",
  city: "Bogotá",
  channels: { whatsapp: true, web: true, pos: true },
  channelConnections: [],
  kitchenBufferMin: 15,
  activeModules: ["pedidos"],
  createdAt: new Date().toISOString(),
};

const SECTIONS = [
  ["panel", "00-panel-de-pedidos"],
  ["bandeja", "01-bandeja-de-entrada"],
  ["alistamiento", "02-mesa-de-alistamiento"],
  ["despacho", "03-despacho-y-entrega"],
  ["programados", "04-programados"],
  ["historial", "05-historial-y-auditoria"],
  ["canales", "06-canales-de-origen"],
  ["configuracion", "07-configuracion-del-flujo"],
];

await send("Page.navigate", { url: APP });
await sleep(4000);
await evaluate("localStorage.clear()");

/** Confirma que el tema pedido es el que la app está pintando de verdad. */
const themeApplied = (theme) =>
  evaluate(`(() => {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    return {
      want: ${JSON.stringify(theme)},
      isDark,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      ok: ${JSON.stringify(theme)} === 'dark' ? isDark : !isDark,
    };
  })()`);

for (const theme of ["light", "dark"]) {
  const dir = `${OUT}${theme}/`;
  mkdirSync(dir, { recursive: true });

  await evaluate(`(() => {
    localStorage.setItem('necto_businesses', JSON.stringify([${JSON.stringify(business)}]));
    localStorage.setItem('necto_active_business_id', 'biz-orders');
    localStorage.setItem('necto_cookie_consent_v1', JSON.stringify({
      value: 'accepted', decidedAt: new Date().toISOString() }));
    localStorage.setItem('webforge-ui-preferences', JSON.stringify({
      theme: ${JSON.stringify(theme)}, sidebarExpanded: true }));
    return true;
  })()`);

  await send("Page.navigate", { url: `${APP}/app?module=pedidos` });
  await sleep(6000);

  const applied = await themeApplied(theme);
  console.log(
    `\nTema ${theme}: html.dark=${applied.isDark} · fondo=${applied.bodyBg} · ${
      applied.ok ? "OK" : "!! NO COINCIDE"
    }`
  );
  if (!applied.ok) throw new Error(`El tema ${theme} no se aplicó; abortando.`);

  for (const [key, file] of SECTIONS) {
    const ok = await evaluate(clickFirst(`[data-orders-section="${key}"]`));
    if (!ok) {
      console.log(`  !! no se encontró la sección ${key}`);
      continue;
    }
    await sleep(1600);
    await shot(dir, `${file}.png`);
  }

  /* ── El tablero de la Bandeja (§ Tablero) ──────────────────────────────── */
  await evaluate(clickFirst('[data-orders-section="bandeja"]'));
  await sleep(1400);
  const boardOn = await evaluate(
    clickFirst('[data-node-id="necto.el.segmented.segment.board"]')
  );
  if (boardOn) {
    await sleep(1200);
    await shot(dir, "08-bandeja-tablero.png");
    // Se vuelve a la lista: la captura del detalle de abajo cuenta con ella.
    await evaluate(clickFirst('[data-node-id="necto.el.segmented.segment.list"]'));
    await sleep(900);
  } else {
    console.log("  !! no se encontró el conmutador de vista (tablero)");
  }

  /* ── El detalle unificado, abierto desde la Bandeja ────────────────────── */
  const opened = await evaluate(
    clickFirst('[data-orders-inbox] [data-order-row]')
  );
  if (opened) {
    await sleep(1400);
    await shot(dir, "09-detalle-de-orden.png");
  } else {
    console.log("  !! no se pudo abrir el detalle");
  }
}

ws.close();
await fetch(`${CDP}/json/close/${target.id}`);
console.log("\nListo.");
