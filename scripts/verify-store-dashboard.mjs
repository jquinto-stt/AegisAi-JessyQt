/**
 * Verificación E2E del **Dashboard de la Tienda**.
 *
 * Guarda de regresión de una decisión de arquitectura, no de un detalle visual:
 *
 *   Dashboard de tienda = shell + widgets aportados por capacidades
 *
 * La tienda **existe primero**; los módulos se acoplan después y aportan sus
 * propios widgets. Hoy no hay ningún módulo implementado, así que el Dashboard
 * sólo pinta los widgets de la propia tienda — y eso **no es un caso especial**:
 * es el mismo filtro devolviendo menos.
 *
 * Lo que esta guarda defiende:
 *
 *  1. **El eje `source` discrimina de verdad.** Se ejercita el predicado con un
 *     catálogo sintético que sí trae un widget de módulo, para probar el gating
 *     **sin necesitar un módulo real**. Un lector, dos estados, la respuesta
 *     cambia: con la tienda sin módulos el widget de módulo no sale; con el
 *     módulo acoplado, sí. Si el predicado se rompiera (devolviera siempre
 *     todo), esta aserción se pone roja.
 *  2. **El shell no conoce ningún módulo.** No debe nombrar `"pedidos"` ni
 *     `"inventarios"` en su código: filtra por `source`, no pregunta por
 *     módulos concretos. Es lo que permite que un módulo aterrice mañana sin
 *     tocar el shell.
 *  3. **La tienda sin módulos tiene su propia pantalla.** `/app` pinta el
 *     Dashboard, no el catálogo de módulos; el catálogo sigue alcanzable
 *     pidiéndolo (`?module=modules-hub`).
 *  4. **El Dashboard no inventa información.** Sin actividad, el widget dice
 *     "todavía no hay actividad" con la acción que la desbloquea, en vez de
 *     rellenar el hueco con métricas de una operación que no existe.
 *  5. **Los widgets leen el estado real de la tienda.** El mismo lector sobre
 *     dos tiendas (sin canales / con WhatsApp conectado) tiene que responder
 *     distinto: si el estado estuviera pintado a mano, las dos dirían lo mismo.
 *
 * Uso: con el dev server y Chrome headless --remote-debugging-port=9222 vivos,
 *   node scripts/verify-store-dashboard.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const DASH = path.join(
  ROOT,
  "packages/apps/web/modules/app/src/compositions/store-dashboard"
);

const CDP = "http://127.0.0.1:9222";
const APP = process.env.NECTO_APP_URL || "http://localhost:5173";

let fails = 0;
const check = (label, ok, detail) => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  :: " + detail : ""}`);
};

/** Cuenta apariciones de un texto exacto. */
const countOf = (haystack, needle) =>
  haystack === null ? 0 : haystack.split(needle).length - 1;

/**
 * Quita comentarios antes de inspeccionar código.
 *
 * ⚠️ Hace falta: el shell **documenta** en prosa que no sabe qué es un pedido, y
 * esa prosa nombra "Pedidos" e "Inventarios". Buscar los módulos sobre el texto
 * crudo marcaría en rojo justo el comentario que explica la regla.
 */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

/* ══════════════════════════════════════════════════════════════════════════
 * Parte 1 — El eje `source` (sin navegador)
 * ════════════════════════════════════════════════════════════════════════ */

console.log("── El eje del catálogo ──");

// El predicado es un módulo puro: se puede ejercitar directamente. Node lo
// importa con *type stripping* (>= 22.18, activo por defecto). Si el runtime es
// más viejo, se dice en voz alta en lugar de dar verde sin haber probado nada.
let dashboardWidgetsFor;
try {
  const mod = await import(
    pathToFileURL(path.join(DASH, "store-dashboard.utils.ts")).href
  );
  dashboardWidgetsFor = mod.dashboardWidgetsFor;
} catch (err) {
  check(
    "se pudo cargar el predicado de gating (Node >= 22.18 para leer .ts)",
    false,
    err.message
  );
}

if (dashboardWidgetsFor) {
  /** Un widget mínimo: al selector sólo le importan `source` y `order`. */
  const w = (id, source, order) => ({ id, source, span: "full", order, render: () => null });

  const synthetic = [w("modulo", "pedidos", 20), w("base", "store", 10)];
  const sinModulo = dashboardWidgetsFor(synthetic, []).map((x) => x.id);
  const conPedidos = dashboardWidgetsFor(synthetic, ["pedidos"]).map((x) => x.id);
  const conOtro = dashboardWidgetsFor(synthetic, ["inventarios"]).map((x) => x.id);

  // ⚠️ El control positivo: **un lector, dos estados**. Si el predicado dejara de
  // filtrar (devolviera siempre el catálogo entero), la primera aserción se cae.
  check(
    "tienda sin módulos: el widget de módulo NO se pinta",
    sinModulo.join(",") === "base",
    sinModulo.join(",")
  );
  check(
    "tienda con Pedidos: el widget del módulo SÍ se pinta",
    conPedidos.join(",") === "base,modulo",
    conPedidos.join(",")
  );
  check(
    "el gating discrimina (mismo lector, dos estados)",
    sinModulo.length !== conPedidos.length,
    `${sinModulo.length} vs ${conPedidos.length}`
  );
  check(
    "un módulo distinto no enciende el widget",
    conOtro.join(",") === "base",
    conOtro.join(",")
  );
  check("el orden lo manda `order`, no el catálogo", conPedidos[0] === "base");

  const cat = [w("b", "store", 2), w("a", "store", 1)];
  dashboardWidgetsFor(cat, []);
  check("el selector no muta el catálogo", cat.map((x) => x.id).join(",") === "b,a");
}

/* ── El catálogo real: hoy Pedidos ya aporta su widget ─────────────────── */

const catalogueSrc = readFileSync(path.join(DASH, "dashboard-widgets.tsx"), "utf8");
// ⚠️ El catálogo **documenta** cada widget con un bloque de comentario dentro del
// propio objeto, entre `{` y `id:`. Un patrón que exija `{\s*id:` deja fuera justo
// los widgets mejor explicados — y Pedidos es uno de ellos. Se descartan los
// comentarios antes de leer.
const catalogueBare = stripComments(catalogueSrc);
const realWidgets = [
  ...catalogueBare.matchAll(
    /\{\s*id:\s*"([^"]+)",\s*source:\s*"([^"]+)",\s*span:\s*"([^"]+)",\s*order:\s*(\d+)/g
  ),
].map((m) => ({ id: m[1], source: m[2], span: m[3], order: Number(m[4]), render: () => null }));

check("se leyó el catálogo real de widgets", realWidgets.length >= 5, `${realWidgets.length}`);
check(
  "el catálogo tiene los cuatro widgets base de la tienda",
  ["store-identity", "store-activity", "store-channels", "store-actions"].every((id) =>
    realWidgets.some((x) => x.id === id)
  ),
  realWidgets.map((x) => x.id).join(",")
);
// ⚠️ Pedidos ya está implementado y aporta `pedidos-summary` con
// `source: "pedidos"`. Antes esta aserción exigía que **ningún** widget declarara
// módulo, porque ninguno existía; hoy lo que hay que fijar es lo contrario —que el
// widget de un módulo declare su `source` y que el resto siga siendo de la tienda—.
check(
  "el widget de Pedidos declara su `source` de módulo (§25)",
  realWidgets.some((x) => x.id === "pedidos-summary" && x.source === "pedidos"),
  realWidgets.map((x) => `${x.id}:${x.source}`).join(" ")
);
check(
  "los widgets de la Tienda siguen declarando `source: \"store\"`",
  realWidgets
    .filter((x) => x.id !== "pedidos-summary")
    .every((x) => x.source === "store"),
  realWidgets.filter((x) => x.source !== "store").map((x) => x.id).join(",")
);
check(
  "la franja de módulos (20–29) la ocupa Pedidos",
  realWidgets.some((x) => x.order >= 20 && x.order < 30 && x.id === "pedidos-summary"),
  realWidgets.map((x) => `${x.id}:${x.order}`).join(" ")
);

/* ── El shell no conoce ningún módulo ──────────────────────────────────── */

const shellCode = stripComments(readFileSync(path.join(DASH, "StoreDashboard.tsx"), "utf8"));
check(
  "el shell filtra por el predicado y no por una lista fija",
  /dashboardWidgetsFor\(\s*STORE_DASHBOARD_WIDGETS\s*,\s*business\.activeModules\s*\)/.test(shellCode)
);
check(
  "el shell no nombra ningún módulo en su código",
  !/["'`](pedidos|inventarios|referidos|turnos|reservas|agendamiento)["'`]/.test(shellCode),
  (shellCode.match(/["'`](pedidos|inventarios)["'`]/g) || []).join(",")
);

/* ══════════════════════════════════════════════════════════════════════════
 * Parte 2 — La pantalla (con navegador)
 * ════════════════════════════════════════════════════════════════════════ */

console.log("\n── La pantalla ──");

const page = await (async () => {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${CDP}/json/list`);
      const all = await r.json();
      const t =
        all.find((x) => x.id === process.env.NECTO_TAB_ID) ||
        all.find((x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
      if (t) return t;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("no page target");
})();

const ws = new WebSocket(page.webSocketDebuggerUrl);
let msgId = 0;
const pending = new Map();
const exceptions = [];
await new Promise((res, rej) => {
  ws.addEventListener("open", res);
  ws.addEventListener("error", rej);
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === "Runtime.exceptionThrown") {
      exceptions.push(
        m.params.exceptionDetails?.exception?.description || JSON.stringify(m.params)
      );
    }
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    }
  });
});
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const mid = ++msgId;
    pending.set(mid, { res, rej });
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

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

/* ── Sondas ───────────────────────────────────────────────────────────────
 * ⚠️ Cada sonda es **de un paso** y ancla la lectura al elemento que nombra.
 * Un localizador encadenado sobre una búsqueda que puede dar `null`
 * (`getElementById(x).closest(...)`) **lanza**, no devuelve `null`, y el
 * `evaluate` propaga el error: el arnés moriría en vez de reportar rojo.
 * ─────────────────────────────────────────────────────────────────────── */

/** Texto de la tarjeta cuyo titular es `title`, o `null` si no está en pantalla. */
const cardText = (title) => `(() => {
  const h = [...document.querySelectorAll('h4')].find(n => (n.textContent || '').trim() === ${JSON.stringify(title)});
  if (!h) return null;
  const card = h.closest('div.rounded-xl');
  return card ? (card.textContent || '').replace(/\\s+/g, ' ').trim() : null;
})()`;

/** Texto del bloque de identidad (la tarjeta del `h2` con el nombre de la sede). */
const identityText = (name) => `(() => {
  const h = [...document.querySelectorAll('h2')].find(n => (n.textContent || '').includes(${JSON.stringify(name)}));
  if (!h) return null;
  const card = h.closest('div.rounded-xl');
  return card ? (card.textContent || '').replace(/\\s+/g, ' ').trim() : null;
})()`;

/** Pulsa el botón que contiene `text` **dentro** de la tarjeta `title`. */
const clickInCard = (title, text) => `(() => {
  const h = [...document.querySelectorAll('h4')].find(n => (n.textContent || '').trim() === ${JSON.stringify(title)});
  if (!h) return false;
  const card = h.closest('div.rounded-xl');
  if (!card) return false;
  const btn = [...card.querySelectorAll('button')].find(b => (b.textContent || '').includes(${JSON.stringify(text)}));
  if (!btn) return false;
  btn.click();
  return true;
})()`;

const HUB_MARKER = "Activa o desactiva las capacidades operativas";

const STORE = {
  id: "biz-dash",
  name: "Ferretería El Tornillo",
  slug: "ferreteria-el-tornillo",
  businessType: "retail_store",
  iconKey: "store",
  currency: "COP",
  city: "Bogotá",
  channels: { whatsapp: false, web: false, pos: false },
  channelConnections: [],
  kitchenBufferMin: 15,
  // ⚠️ Explícito: si se omite, la migración de `useBusinesses` siembra
  // `["pedidos","inventarios","referidos"]` y la tienda dejaría de estar vacía.
  activeModules: [],
  createdAt: new Date().toISOString(),
};

const seed = (business) => `
  localStorage.setItem('necto_businesses', JSON.stringify([${JSON.stringify(business)}]));
  localStorage.setItem('necto_active_business_id', ${JSON.stringify(business.id)});
  true;
`;

// ⚠️ Navegar ANTES de tocar `localStorage`: en `about:blank` el origen es opaco
// y `localStorage` lanza `SecurityError`.
await send("Page.navigate", { url: APP });
await sleep(2500);
await evaluate(`localStorage.clear()`);

/* ── Estado A — tienda recién creada, sin módulos ─────────────────────── */

await evaluate(seed(STORE));
await send("Page.navigate", { url: `${APP}/app` });
await sleep(3500);

const identity = await evaluate(identityText(STORE.name));
check("la sede tiene pantalla propia: el Dashboard pinta su identidad", identity !== null, String(identity).slice(0, 80));
check(
  "la identidad es la de la tienda (nombre + lema)",
  (identity || "").includes(STORE.name) &&
    (identity || "").includes("Todo lo importante de tu operación"),
  String(identity).slice(0, 140)
);
check("la identidad muestra la ciudad", (identity || "").includes("Bogotá"));

const canales = await evaluate(cardText("Canales"));
check("hay widget de Canales", canales !== null);
check(
  "los tres canales existen como filas aunque no haya ninguno conectado",
  ["WhatsApp", "Tienda web", "Punto de venta"].every((c) => (canales || "").includes(c)),
  String(canales).slice(0, 160)
);
check(
  "ningún canal nace conectado (3 × No conectado)",
  countOf(canales, "No conectado") === 3,
  `No conectado ×${countOf(canales, "No conectado")}`
);
check(
  "no hay ningún canal conectado sin conexión registrada",
  countOf(canales, "Conectado") === 0,
  `Conectado ×${countOf(canales, "Conectado")}`
);

const acciones = await evaluate(cardText("Acciones"));
check("hay widget de Acciones", acciones !== null);
check(
  "las tres acciones de la tienda están",
  ["Conectar canal", "Acoplar módulo", "Configurar tienda"].every((a) =>
    (acciones || "").includes(a)
  ),
  String(acciones).slice(0, 160)
);

const actividad = await evaluate(cardText("Actividad"));
check("hay widget de Actividad", actividad !== null);
check(
  "sin actividad, lo dice en vez de inventarla",
  (actividad || "").includes("Todavía no hay actividad en esta tienda."),
  String(actividad).slice(0, 160)
);
check(
  "el estado vacío trae la acción que lo desbloquea",
  (actividad || "").includes("Conectar canal"),
  String(actividad).slice(0, 160)
);

// ⚠️ El Dashboard **no** debe responder con datos de módulos que no existen.
const bodyA = await evaluate(`document.body.textContent`);
const FABRICATED = ["Pedidos de hoy", "stock bajo", "productos registrados", "productos agotados", "#1042"];
check(
  "el Dashboard no fabrica métricas de módulos inexistentes",
  FABRICATED.every((s) => !bodyA.includes(s)),
  FABRICATED.filter((s) => bodyA.includes(s)).join(" | ")
);
check(
  "el cuerpo es el Dashboard, no el catálogo de módulos",
  !bodyA.includes(HUB_MARKER)
);

/* ── Estado B — la misma tienda, ahora con WhatsApp conectado ─────────── */

await evaluate(
  seed({
    ...STORE,
    channelConnections: [
      { businessId: STORE.id, type: "whatsapp", status: "connected", displayPhoneNumber: "+57 300 000 0000" },
    ],
  })
);
await send("Page.navigate", { url: `${APP}/app` });
await sleep(3000);

// ⚠️ Mismo lector, otro estado. Si los widgets pintaran un estado fijo en vez de
// leer la tienda, estas dos aserciones dirían lo mismo que las del estado A.
const canalesB = await evaluate(cardText("Canales"));
check(
  "con WhatsApp conectado, el widget lo refleja (1 conectado, 2 no)",
  countOf(canalesB, "No conectado") === 2 && countOf(canalesB, "Conectado") === 1,
  `No conectado ×${countOf(canalesB, "No conectado")} · Conectado ×${countOf(canalesB, "Conectado")}`
);

const actividadB = await evaluate(cardText("Actividad"));
check(
  "con canal pero sin módulos, la acción del estado vacío cambia a acoplar módulo",
  (actividadB || "").includes("Acoplar módulo") && !(actividadB || "").includes("Conectar canal"),
  String(actividadB).slice(0, 160)
);

/* ── Estado C — el catálogo de módulos sigue alcanzable ───────────────── */

await send("Page.navigate", { url: `${APP}/app?module=modules-hub` });
await sleep(3000);

const bodyC = await evaluate(`document.body.textContent`);
check("`?module=modules-hub` abre el catálogo de módulos", bodyC.includes(HUB_MARKER));
check("el catálogo no pinta el Dashboard encima", (await evaluate(cardText("Canales"))) === null);

/* ── Estado D — las acciones del Dashboard no son decorativas ─────────── */

await send("Page.navigate", { url: `${APP}/app` });
await sleep(3000);

check("la acción 'Acoplar módulo' está en pantalla", (await evaluate(cardText("Acciones"))) !== null);
// ⚠️ El "antes" es lo que hace real el "después": sin él, la aserción de destino
// pasaría también si el catálogo ya estuviera en pantalla y el botón no hiciera nada.
check("antes de pulsar, el catálogo no está en pantalla", !(await evaluate(`document.body.textContent`)).includes(HUB_MARKER));
const clickedModules = await evaluate(clickInCard("Acciones", "Acoplar módulo"));
check("se pudo pulsar 'Acoplar módulo'", clickedModules === true);
await sleep(1200);
check(
  "'Acoplar módulo' lleva al catálogo de módulos",
  (await evaluate(`document.body.textContent`)).includes(HUB_MARKER)
);

await send("Page.navigate", { url: `${APP}/app` });
await sleep(3000);

// ⚠️ Se pulsa en **Acciones**, no en Actividad: la acción del widget de Actividad
// depende del estado (con canal conectado pasa a "Acoplar módulo"), así que
// anclarse ahí haría que esta aserción midiera el estado sembrado en vez de la
// acción. "Conectar canal" en Acciones es incondicional.
check("antes de pulsar, Ajustes está cerrado", !(await evaluate(`!!document.querySelector('[role="dialog"]')`)));
const clickedChannel = await evaluate(clickInCard("Acciones", "Conectar canal"));
check("se pudo pulsar 'Conectar canal'", clickedChannel === true);
await sleep(1200);
check("'Conectar canal' abre Ajustes de la sede", await evaluate(`!!document.querySelector('[role="dialog"]')`));
check(
  "'Conectar canal' abre directamente en Canales de entrada",
  // ⚠️ El rótulo real es "Puntos de contacto" (minúscula), de
  // `business-settings.constants.ts`. La aserción pedía "Puntos de Contacto" con
  // mayúscula y llevaba tiempo en rojo por un detalle de copy, no por un fallo:
  // se compara sin distinguir mayúsculas para que el copy no rompa la guarda.
  await evaluate(`(() => {
    const d = document.querySelector('[role="dialog"]');
    return !!d && (d.textContent || '').toLowerCase().includes('puntos de contacto');
  })()`)
);

check(
  "sin excepciones de runtime",
  exceptions.length === 0,
  exceptions.join(" | ").slice(0, 300)
);

console.log(`\n===== RESULTADO DASHBOARD: ${fails === 0 ? "OK" : fails + " FALLOS"} =====`);
ws.close();
process.exit(fails === 0 ? 0 : 1);
