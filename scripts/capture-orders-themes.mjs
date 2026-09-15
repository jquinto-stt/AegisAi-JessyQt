/**
 * Captura el módulo Pedidos (oscuro y claro) para revisión visual.
 * Uso: NECTO_APP_URL=http://localhost:5173 node scripts/capture-orders-themes.mjs
 *
 * ⚠️ **Se navega con `&section=` explícito.** El módulo abre en el Panel por
 * defecto (`DEFAULT_ORDERS_SECTION`), así que ir a `/app?module=pedidos` a secas
 * dejaba la captura "table" con el Panel dentro —una imagen llamada "tabla" sin
 * ninguna tabla—. La primera captura pide `bandeja`, que sí es una tabla.
 *
 * ⚠️ **Las claves de sección son las del vocabulario**, no nombres "naturales":
 * la mesa de alistamiento es `alistamiento`, **no** `preparacion`. Y un clic a una
 * clave que no existe no falla: `querySelector` devuelve `null`, el `if` se salta
 * el clic y el script sigue como si nada. Por eso `-preparation.png` salía
 * idéntica byte a byte a `-scheduled.png` sin que nadie se enterara. Ahora se pasa
 * por `goSection`, que **comprueba que llegó**.
 *
 * ⚠️ **El detalle se abre por la primera fila que haya**, no por un número fijo.
 * `#1044` no está en la semilla, así que `openDetail` no encontraba nada y la
 * captura del detalle salía igual que la de la tabla, sin drawer. La semilla no es
 * un contrato: se lee lo que hay.
 *
 * ⚠️ Se abre una pestaña **propia** en vez de usar la primera de `/json/list`: con
 * varias guardas corriendo a la vez, capturar la pestaña de otra dejaría las
 * imágenes con la pantalla equivocada.
 */
import { mkdirSync, writeFileSync } from "node:fs";

const CDP = process.env.NECTO_CDP_URL || "http://127.0.0.1:9222";
const APP = process.env.NECTO_APP_URL || "http://localhost:5173";
const OUT = "./artifacts/";
mkdirSync(OUT, { recursive: true });

/**
 * La pestaña que se va a conducir.
 *
 * ⚠️ **Se reutiliza una pestaña existente, no se crea una nueva.** `/json/new`
 * devuelve un target que en esta Chrome queda **congelado**: ni `Page.navigate` ni
 * `location.assign` lo mueven de `about:blank`, y las dos cosas se quedan sin
 * responder hasta agotar su tiempo de espera. Medido con una sonda mínima
 * —`Page.enable` contesta, `Page.navigate` no—, así que no era el script. Es el
 * mismo camino que ya usa la guarda del módulo, que sí funciona.
 *
 * ⚠️ `NECTO_TAB_ID` manda si está puesto: con varias guardas a la vez, sin él se
 * toma la primera pestaña y se contamina el barrido de la otra.
 */
const pages = await (await fetch(`${CDP}/json/list`)).json();
const isPage = (x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools");
const page =
  pages.find((x) => x.id === process.env.NECTO_TAB_ID) ||
  pages.find((x) => isPage(x) && x.url.startsWith(APP)) ||
  pages.find(isPage);
if (!page) throw new Error("no hay ninguna pestaña de tipo page a la que conectarse");
console.log(`pestaña ${page.id} · ${page.url}`);
const target = page;

const ws = new WebSocket(target.webSocketDebuggerUrl);
let msgId = 0;
const pending = new Map();
/**
 * ⚠️ Con tiempo de espera. Sin él, un WebSocket que no abre deja el script
 * **colgado para siempre** —sin error, sin salida, sin capturas—, y desde fuera
 * eso se lee como "el script se quedó tonto", no como "no pudo conectar".
 */
await new Promise((res, rej) => {
  const timer = setTimeout(
    () => rej(new Error(`el WebSocket no abrió en 10 s (${target.webSocketDebuggerUrl})`)),
    10000
  );
  ws.addEventListener("open", () => {
    clearTimeout(timer);
    res();
  });
  ws.addEventListener("error", (e) => {
    clearTimeout(timer);
    rej(new Error(`WebSocket: ${e?.message ?? "error"}`));
  });
});
console.log("cdp conectado");

/** El despachador de respuestas: sin él, ningún `send` resuelve nunca. */
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res: r, rej: j } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result);
  }
});

/**
 * ⚠️ Cada comando lleva **tiempo de espera y traza**. Un `send` que no recibe
 * respuesta deja el script colgado sin decir en qué llamada se quedó, que es la
 * peor clase de fallo para depurar: no hay error que leer.
 */
const send = (method, params = {}, { timeoutMs = 20000, quiet = false } = {}) =>
  new Promise((resolve, reject) => {
    const id = ++msgId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP ${method}: sin respuesta en ${timeoutMs} ms`));
    }, timeoutMs);
    pending.set(id, {
      res: (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      rej: (e) => {
        clearTimeout(timer);
        reject(e);
      },
    });
    if (!quiet) console.log(`  cdp ${method}`);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expr) => {
  const r = await send(
    "Runtime.evaluate",
    {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    },
    // ⚠️ Silencioso: `waitFor` evalúa cada 200 ms, y trazar cada sondeo enterraría
    // las líneas que sí importan —qué captura se escribió y cuál falló—.
    { quiet: true }
  );
  if (r.exceptionDetails)
    throw new Error(r.exceptionDetails.exception?.description || "eval failed");
  return r.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Espera a que algo exista en el DOM, sondeando.
 *
 * ⚠️ Sustituye a los `sleep` fijos que había tras cada navegación. Un `sleep` no
 * espera a nada: sólo pasa el tiempo. En una carga en frío —pestaña nueva, Vite
 * transformando el módulo por primera vez— 4,2 s no alcanzaban, y las dos primeras
 * capturas de la pasada salían **en blanco** (7.676 bytes, idénticas). Nadie se
 * entera mirando el log, porque el script sigue como si hubiera capturado; se
 * entera quien abre las imágenes y ve un hueco.
 */
const waitFor = async (selector, { timeoutMs = 15000 } = {}) => {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return true;
    await sleep(200);
  }
  console.log(`  ⚠️ no apareció ${selector} en ${timeoutMs} ms`);
  return false;
};

/** Navega y espera a que el módulo esté montado de verdad. */
const gotoModule = async (url) => {
  await send("Page.navigate", { url });
  await waitFor("[data-orders-module]");
  await sleep(600);
};
/**
 * Captura una pantalla.
 *
 * ⚠️ `fullPage` existe por el Panel, y sólo por él: es la única pantalla del
 * módulo que **pasa del pliegue** —atención, dos barras operables y siete atajos—,
 * así que a 1100 px de alto la captura cortaba justo las tarjetas de abajo, que
 * son las que llevan a cada pantalla. Un recorte silencioso en la captura se lee
 * como "esa parte no existe".
 */
const shoot = async (name, { fullPage = false } = {}) => {
  const params = { format: "png" };
  if (fullPage) {
    const { cssContentSize } = await send("Page.getLayoutMetrics");
    params.clip = {
      x: 0,
      y: 0,
      width: cssContentSize.width,
      height: cssContentSize.height,
      scale: 1,
    };
    params.captureBeyondViewport = true;
  }
  const r = await send("Page.captureScreenshot", params);
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

/**
 * Va a una sección del módulo y **comprueba que llegó**.
 *
 * ⚠️ Se verifica en vez de confiar en el clic. Una clave mal escrita no lanza
 * nada —`querySelector` devuelve `null` y el `if` se salta el clic—, así que el
 * fallo se descubre tres capturas después, cuando alguien compara las imágenes y
 * ve dos iguales. Mejor saberlo aquí, en la línea que falló.
 */
const goSection = async (key) => {
  const clicked = await evaluate(`(() => {
    const b = document.querySelector('[data-orders-section="${key}"]');
    if (!b) return 'no-existe';
    b.click();
    return 'ok';
  })()`);
  await waitFor(`[data-orders-section="${key}"][aria-current="page"]`, { timeoutMs: 8000 });
  await sleep(700);
  const active = await evaluate(
    `document.querySelector('[data-orders-section][aria-current="page"]')?.getAttribute('data-orders-section') ?? null`
  );
  if (clicked !== "ok" || active !== key) {
    console.log(`  ⚠️ no se pudo abrir «${key}» (clic=${clicked}, activa=${active})`);
    return false;
  }
  return true;
};

/**
 * Abre el detalle de la **primera** fila que haya y devuelve su número.
 *
 * ⚠️ Devuelve el número para poder decir cuál se capturó: una captura de detalle
 * sin la orden a la que pertenece no se puede comparar con nada después.
 */
const openFirstDetail = async () => {
  const number = await evaluate(`(() => {
    const r = document.querySelector('[data-order-row]');
    if (!r) return null;
    r.click();
    return r.getAttribute('data-order-row');
  })()`);
  await sleep(1100);
  return number;
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

  // ── Panel (la puerta de entrada, y la pantalla que más se rediseñó) ──
  await gotoModule(`${APP}/app?module=pedidos&section=panel`);
  await shoot(`orders-${theme}-panel`, { fullPage: true });

  // ── Tabla (Bandeja: la pantalla con tabla) ──
  await gotoModule(`${APP}/app?module=pedidos&section=bandeja`);
  await shoot(`orders-${theme}-table`);

  // ── Detalle desde la primera fila ──
  const detailOrder = await openFirstDetail();
  if (detailOrder) {
    console.log(`  detalle de ${detailOrder}`);
    await shoot(`orders-${theme}-detail`);
    await closeDetail();
  } else {
    console.log("  ⚠️ no había ninguna fila que abrir: el detalle no se capturó");
  }

  // ── Programados ──
  await goSection("programados");
  await shoot(`orders-${theme}-scheduled`);

  // ── Alistamiento ──
  await goSection("alistamiento");
  await shoot(`orders-${theme}-preparation`);

  // ── Despacho (los dos bloques por modalidad) ──
  await goSection("despacho");
  await shoot(`orders-${theme}-dispatch`);

  // ── Historial (listado + visor de auditoría) ──
  await goSection("historial");
  await shoot(`orders-${theme}-history`);

  // ── El detalle anclado junto a una lista larga: es el cambio de fondo ──
  const walkOrder = await openFirstDetail();
  if (walkOrder) {
    console.log(`  detalle anclado de ${walkOrder}`);
    await shoot(`orders-${theme}-detail-anchored`);
    await closeDetail();
  }

  // ── Canales ──
  await goSection("canales");
  await shoot(`orders-${theme}-channels`);

  // ── Configuración ──
  await goSection("configuracion");
  await shoot(`orders-${theme}-config`);

  // ── Widget en el Dashboard ──
  await send("Page.navigate", { url: `${APP}/app?module=dashboard` });
  await sleep(3500);
  await shoot(`orders-${theme}-dashboard-widget`);
}

ws.close();
// ⚠️ La pestaña **no se cierra**: se reutilizó una que ya existía, no se creó. Si
// se cerrara, el siguiente arnés se encontraría el navegador sin ningún `page` al
// que conectarse y fallaría con "no page target" —que es exactamente lo que pasó—
// por un motivo que no tiene nada que ver con lo que estaba comprobando.
console.log("listo");
