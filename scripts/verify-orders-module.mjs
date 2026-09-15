/**
 * Verificación del módulo Pedidos (OMS universal) — **suite operativa**.
 * =====================================================================
 *
 * Guarda de regresión de la **arquitectura** del módulo, no de un detalle visual.
 * Lo que defiende, en el orden del pedido:
 *
 *  1. **Propiedad (§1, §24, §29).** Pedidos es dueño de la orden y de nada más.
 *     Se comprueba que el módulo **no importa** catálogo, inventario, canales ni
 *     IA: si mañana alguien mete el stock "para terminar la tarea", el módulo deja
 *     de ser reemplazable y pasa a ser el *god module* que §29 prohíbe.
 *  2. **Agnosticismo (§7, §22).** Cero vocabulario de rubro en el núcleo. El mismo
 *     tipo sirve para tornillos y para platos: eso se prueba con una semilla de
 *     siete rubros, que es la **única** excepción declarada al barrido.
 *  3. **Una sola fuente de verdad (§16).** La máquina de estados, los universos de
 *     cada pantalla, los umbrales y las acciones viven en un sitio; ninguna vista
 *     declara los suyos. Las acciones se derivan del estado real (§14) y se
 *     derivan en **un solo** componente — el detalle.
 *  4. **Una suite de pantallas, no una vista plana (§26).** Los ocho destinos y su
 *     orden —el Panel abre el recorrido—, con una sola tabla de rótulos compartida
 *     por la barra del módulo, la barra lateral, el breadcrumb y los atajos del
 *     Panel.
 *  5. **Las cifras viven en el Panel, no en cada pestaña (§5, §12, §15).** Las
 *     cuatro tarjetas de métrica que la cabecera repetía en las cinco pantallas de
 *     trabajo se retiraron: **cero** `[data-orders-metric]` en todo el módulo. La
 *     coherencia no se pierde — se comprueba **cruzando superficies**: la cifra
 *     que el Panel da para una pantalla tiene que ser la que cuenta el filtro de
 *     esa pantalla, y su fila de atención, el filtro que nombra. Los universos
 *     siguen cubriendo todos los estados sin dejar ninguno huérfano, y el tablero
 *     de la Bandeja tiene que sumar exactamente lo mismo que su lista.
 *  6. **El widget es del módulo, el Dashboard es de la Tienda (§25)**: el widget
 *     sólo se pinta con `pedidos` acoplado, y el shell no conoce ningún módulo.
 *  7. **Configurar es cambiar algo (§17).** Cada ajuste de «Configuración del
 *     flujo» lleva su **efecto medido** sobre órdenes reales, y los dos avisos
 *     —que se guardaban sin que ninguna pantalla los leyera— se comprueban por el
 *     DOM de la pantalla destino: apagado, la alerta no está.
 *
 * ⚠️ Las aserciones de la Parte 5 leen **anclas `data-*`**, no texto: el módulo usa
 * el vocabulario visual del catálogo, así que comprobar por prosa ataría la guarda
 * a la redacción de cada rótulo.
 *
 * Uso: con el dev server y Chrome headless --remote-debugging-port=9222 vivos,
 *   NECTO_APP_URL=http://localhost:5173 node scripts/verify-orders-module.mjs
 *
 * ⚠️ El puerto por defecto es el de `npm run dev`. Si se levanta Vite en otro
 * —pasa cuando el 5173 lo tiene retenido otro proceso— hay que pasar
 * `NECTO_APP_URL`, o la guarda hablará con un origen muerto y todo saldrá rojo.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SRC = path.join(ROOT, "packages/apps/web/modules/app/src");
const ORDERS = path.join(SRC, "compositions/orders");

const CDP = process.env.NECTO_CDP_URL || "http://127.0.0.1:9222";
// ⚠️ El puerto por defecto es el del dev server de este repo (y el que asume
// `verify-all.mjs` al limpiar el `localStorage`). Antes decía 5174, que no es el
// que arranca `npm run dev`: el arnés aislado apuntaba a un servidor inexistente.
const APP = process.env.NECTO_APP_URL || "http://localhost:5173";

let fails = 0;
const check = (label, ok, detail) => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  :: " + detail : ""}`);
};

/** Quita comentarios: el módulo **documenta** las reglas y las nombra en prosa. */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const read = (...parts) => stripComments(readFileSync(path.join(...parts), "utf8"));

/** Todos los `.ts`/`.tsx` del módulo, con su contenido. */
function moduleFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name) && !/_smoke|_probe/.test(entry.name))
        // ⚠️ `rel` se normaliza a `/`. En Windows `path.relative` devuelve
        // `compositions\orders\views\…` con barras invertidas, así que cualquier
        // filtro del tipo `f.rel.includes("/views/")` no casa con **nada**: la
        // lista queda vacía y un `every()` sobre vacío da verde sin haber
        // comprobado nada. La guarda mentía justo donde más importa.
        out.push({
          path: full,
          rel: path.relative(SRC, full).split(path.sep).join("/"),
          src: readFileSync(full, "utf8"),
        });
    }
  };
  walk(ORDERS);
  return out;
}

const files = moduleFiles();
const code = files.map((f) => ({ ...f, bare: stripComments(f.src) }));

/* ══════════════════════════════════════════════════════════════════════════
 * Parte 1 — Propiedad (§1, §24, §29): el módulo no invade otros dominios
 * ════════════════════════════════════════════════════════════════════════ */

console.log("── Propiedad del módulo (§1, §24) ──");

/**
 * ⚠️ Cada entrada es un dominio que **no** es de Pedidos. El patrón busca
 * importaciones y llamadas, no prosa: por eso se mira el código sin comentarios.
 * `@/contracts/order.contract` sí es suyo; `@/contracts/inventory` no.
 */
const FOREIGN = [
  { name: "inventario / stock", re: /from\s+["'][^"']*inventor[^"']*["']|useInventory|StockLevel|kardex/i },
  { name: "catálogo de productos", re: /from\s+["'][^"']*catalog[^"']*["']|useCatalog|useProducts\s*\(/i },
  // ⚠️ Se busca la **escritura** (`setChannelConnection(`) y las importaciones al
  // dominio de canales — no el nombre del prop `onOpenStoreChannels`, que es un
  // puente de navegación y no una dependencia (sería un falso positivo). El
  // vocabulario de `ChannelType` sí entra: es una **lectura** de la tienda (§18).
  {
    name: "canales (implementación)",
    re: /setChannelConnection\s*\(|disconnectChannel\s*\(|from\s+["'][^"']*(channel-connections|waba|embedded-signup)[^"']*["']/i,
  },
  { name: "asistente IA", re: /from\s+["'][^"']*(assistant|openai|llm)[^"']*["']|useAssistant|ChatCompletion/i },
  { name: "clientes como dominio global", re: /from\s+["'][^"']*customer[^"']*["']|useCustomers\s*\(/i },
];
for (const f of FOREIGN) {
  const hit = code.filter((f2) => f.re.test(f2.bare));
  check(
    `Pedidos no depende de ${f.name}`,
    hit.length === 0,
    hit.map((h) => h.rel).join(", ")
  );
}

// El único consumo de la Tienda es por referencia (`businessId`) y el predicado
// de canal, que es una **lectura** del estado de la tienda — no su administración.
const storeImports = code.filter((f) => /from\s+["']@\/context\/BusinessContext["']/.test(f.bare));
check(
  "Pedidos consume la Tienda por contexto, no la copia",
  storeImports.length > 0,
  `${storeImports.length} archivos`
);

// Ninguna vista escribe `status` a mano: la transición pasa siempre por el contexto.
const handWrites = code.filter(
  (f) => f.rel.includes("/views/") && /status:\s*["'](PENDING|CONFIRMED|READY|COMPLETED)["']/.test(f.bare)
);
check(
  "ninguna vista asigna `status` a mano (la puerta es `transitionOrder`)",
  handWrites.length === 0,
  handWrites.map((h) => h.rel).join(", ")
);

// Pedidos **emite** hechos; no ejecuta efectos de otros módulos (§6).
const ctxSrc = read(ORDERS, "context/OrdersContext.tsx");
check(
  "§6 — Pedidos publica su ciclo de vida en el bus y no ejecuta efectos ajenos",
  /eventBus\.publish\(\s*["']pedidos\.order\.lifecycle["']/.test(ctxSrc),
  ""
);

/* ══════════════════════════════════════════════════════════════════════════
 * Parte 2 — Agnosticismo (§7, §22): cero vocabulario de rubro en el núcleo
 * ════════════════════════════════════════════════════════════════════════ */

console.log("\n── Agnosticismo (§7, §22) ──");

/**
 * ⚠️ La semilla queda **fuera** de este barrido, y es una decisión, no una grieta.
 * Su trabajo es justamente probar que siete rubros distintos caben en el mismo
 * tipo `Order` (§22): un actor llamado "Cocina" o un solicitante llamado "Mesa 7"
 * son **datos** de la orden de un restaurante, no vocabulario del núcleo. Si el
 * modelo necesitara un campo para que entrara la ferretería, la semilla no
 * compilaría — y ése es el valor de tenerlas juntas.
 */
const SEED = "mock-orders.ts";
const core = code.filter((f) => !f.rel.endsWith(SEED));

const RUBRO = [
  /\bcocina\b/i,
  /\bmesero\b/i,
  /\breceta\b/i,
  /\bcomanda\b/i,
  /\bchef\b/i,
  /\bcamarero\b/i,
  /requiresKitchenDisplay/,
];
const rubroHits = [];
for (const f of core)
  for (const re of RUBRO) if (re.test(f.bare)) rubroHits.push(`${f.rel} :: ${re}`);
check(
  "§22 — el núcleo (sin la semilla) no usa vocabulario de cocina/restaurante",
  rubroHits.length === 0,
  rubroHits.slice(0, 5).join(" | ")
);

/**
 * ⚠️ "Mesa" pasó a ser vocabulario **operativo** del módulo —"Mesa de
 * Alistamiento" es un puesto de trabajo, y una ferretería también tiene banco de
 * empaque—, así que prohibir la palabra dejaría de distinguir nada. Lo que se
 * prohíbe es la **mesa como sujeto de la orden**: el patrón de un OMS de salón,
 * donde la orden se identifica por su mesa o su turno en vez de por su número.
 *
 * El barrido estructural sí mira **todos** los archivos (incluida la semilla): un
 * campo `mesaId` sería un agujero en el modelo, no un dato de ejemplo.
 */
const TABLE_STRUCTURAL = [/\bmesaId\b/, /\btableId\b/, /\btableNumber\b/, /\bturnoId\b/, /\bsalonId\b/];
const tableHits = [];
for (const f of code)
  for (const re of TABLE_STRUCTURAL) if (re.test(f.bare)) tableHits.push(`${f.rel} :: ${re}`);
check(
  "§22 — ninguna orden se identifica por mesa, turno o salón (el sujeto es la orden)",
  tableHits.length === 0,
  tableHits.slice(0, 5).join(" | ")
);

const tableDataHits = core.filter((f) => /\bmesa\s*\d+/i.test(f.bare)).map((f) => f.rel);
check(
  "§22 — el núcleo tampoco nombra mesas numeradas (eso es un dato de la semilla)",
  tableDataHits.length === 0,
  tableDataHits.join(", ")
);

// El contrato declara las entidades de Pedidos y **no** las ajenas.
const contract = read(SRC, "contracts/order.contract.ts");
const OWNS = ["Order", "OrderItem", "OrderStatus", "OrderStatusHistoryEntry", "OrderFulfillment", "OrderPayment", "OrderSchedule", "OrderSource"];
const OWNED_OK = OWNS.filter((n) => new RegExp(`(interface|type)\\s+${n}\\b`).test(contract));
check(
  "el contrato declara las entidades que le pertenecen (§24)",
  OWNED_OK.length >= 7,
  `${OWNED_OK.length}/${OWNS.length}: ${OWNED_OK.join(",")}`
);
const NOT_OWNS = ["interface Product", "interface Stock", "interface Customer", "interface ChannelConfig", "interface AssistantConfig"];
const NOT_OWNED = NOT_OWNS.filter((n) => new RegExp(n).test(contract));
check(
  "el contrato NO declara las entidades ajenas (§24)",
  NOT_OWNED.length === 0,
  NOT_OWNED.join(", ")
);

/* ══════════════════════════════════════════════════════════════════════════
 * Parte 3 — Una sola fuente de verdad (§4, §8, §13, §14, §16)
 *
 * ⚠️ Se ejercita **en el navegador**, no en Node: el módulo importa con el alias
 * `@/…`, que Node no resuelve — pero Vite sí. Cargarlo por el dev server es además
 * más fiel: se prueba el mismo módulo que se ejecuta en pantalla.
 * ════════════════════════════════════════════════════════════════════════ */

console.log("\n── Una sola fuente de verdad (§4, §8, §16) ──");

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
      const { res: r, rej: j } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result);
    }
  });
});
/**
 * ⚠️ Cada comando lleva **timeout**. Sin él, un renderer atascado —el caso real:
 * un objetivo que acepta la conexión WebSocket pero nunca contesta a
 * `Runtime.enable`— deja la guarda colgada para siempre, sin una sola línea de
 * salida. Un rojo se arregla; un cuelgue silencioso se investiga durante media
 * hora, y encima parece que el arnés "no encontró nada".
 */
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = ++msgId;
    const timer = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        rej(new Error(`TIMEOUT ${method} tras 30s`));
      }
    }, 30000);
    pending.set(id, {
      res: (v) => {
        clearTimeout(timer);
        res(v);
      },
      rej: (e) => {
        clearTimeout(timer);
        rej(e);
      },
    });
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

/**
 * Espera a que `selector` exista —o a que deje de existir—, hasta agotar el plazo.
 *
 * ⚠️ Existe porque un `sleep` fijo no es una espera, es una apuesta. Y en este
 * entorno la apuesta se pierde: Vite reoptimiza dependencias al cambiar imports y
 * fuerza una recarga completa, así que el primer montaje tras un cambio de código
 * tarda bastante más que los 4 s que la guarda daba por hechos. El resultado eran
 * rojos **fantasma** —"no se encontró la raíz" en las cinco pantallas— que
 * desaparecían al volver a ejecutar sin tocar nada. Una guarda que miente entrena
 * a ignorarla.
 */
const waitFor = async (selector, { timeoutMs = 15000, present = true } = {}) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const ok = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      return ${present ? "!!el" : "!el"};
    })()`);
    if (ok === true) return true;
    if (Date.now() > deadline) return false;
    await sleep(250);
  }
};

/**
 * Espera a que se cumpla una **expresión**, no un selector.
 *
 * ⚠️ Para condiciones que no son "existe este nodo": "las acciones del detalle han
 * cambiado", "el almacén ya guardó el valor". Un `sleep` no puede expresar eso, y
 * por eso los pasos que encadenan una transición con la siguiente se rompían al
 * azar: la segunda salía antes de que la primera hubiera terminado.
 */
const waitUntil = async (expression, { timeoutMs = 10000 } = {}) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if ((await evaluate(expression)) === true) return true;
    if (Date.now() > deadline) return false;
    await sleep(250);
  }
};

/**
 * Navega y **espera a que la superficie pedida esté de verdad**.
 *
 * ⚠️ El reintento no es paranoia. La tabla de rutas de la app termina en
 * `<Route path="*" element={<Navigate to="/" replace />} />`, y `/` es el hub de
 * franquicias: si la navegación llega antes de que el router esté montado, la app
 * aterriza en el hub **en silencio**, sin error y sin URL rota. A partir de ahí
 * todas las aserciones hablan de una pantalla que no es — y las negativas
 * ("no hay módulo", "no hay widget") pasan por el motivo equivocado, que es la
 * peor forma de pasar. Se detecta porque `ready` no aparece, y se reintenta.
 */
const goto = async (path, ready) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    await send("Page.navigate", { url: `${APP}${path}` });
    if (await waitFor(ready, { timeoutMs: 12000 })) return true;
    await sleep(500);
  }
  return false;
};

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});

// Navegar primero: sin origen no hay `import()` de módulos del dev server.
await send("Page.navigate", { url: APP });
await sleep(2500);

/**
 * Carga la máquina de estados **real** a través de Vite y devuelve un resumen de
 * sus respuestas. Si el alias no resolviera, `import()` lanza y la aserción se
 * pone roja en vez de dar verde sin haber probado nada.
 */
const MACHINE_URL = `${APP}/src/compositions/orders/order-status.constants.ts`;
const machine = await evaluate(`(async () => {
  try {
    const m = await import(${JSON.stringify(MACHINE_URL)});
    const c = await import(${JSON.stringify(
      `${APP}/src/contracts/order.contract.ts`
    )});
    const mk = (over = {}) => ({ id: 'o', status: 'PENDING', fulfillment: { mode: 'delivery' }, ...over });
    return {
      ok: true,
      transitions: m.ORDER_TRANSITIONS,
      pickupToTransit: m.canTransition(mk({ status: 'READY', fulfillment: { mode: 'pickup' } }), 'IN_TRANSIT'),
      deliveryToTransit: m.canTransition(mk({ status: 'READY', fulfillment: { mode: 'delivery' } }), 'IN_TRANSIT'),
      serviceToTransit: m.canTransition(mk({ status: 'READY', fulfillment: { mode: 'service' } }), 'IN_TRANSIT'),
      pendingToReturned: m.canTransition(mk({ status: 'PENDING' }), 'RETURNED'),
      deliveredToReturned: m.canTransition(mk({ status: 'DELIVERED' }), 'RETURNED'),
      pendingActions: m.orderActionsFor(mk()).map(a => a.to).sort(),
      completedActions: m.orderActionsFor(mk({ status: 'COMPLETED' })).map(a => a.to),
      terminal: c.TERMINAL_ORDER_STATUSES,
      cancelReq: m.ORDER_TRANSITION_REQUIREMENTS.CANCELLED,
      alwaysVisible: m.ORDER_BOARD_ALWAYS_VISIBLE,
    };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
})()`);

check(
  "se pudo cargar la máquina de estados real (vía Vite)",
  machine.ok === true,
  machine.error
);

if (machine.ok) {
  const T = machine.transitions;
  check(
    "§4 — PENDING va a CONFIRMED y a CANCELLED",
    T.PENDING.includes("CONFIRMED") && T.PENDING.includes("CANCELLED"),
    T.PENDING.join(",")
  );
  // ⚠️ `COMPLETED` **no** es un callejón sin salida: §9 permite devolver una orden
  // completada (fue entregada, así que puede volver). Lo que no puede es avanzar a
  // nada más. Se afirma la regla real, no "cero transiciones".
  check(
    "§9 — COMPLETED sólo puede ir a RETURNED (no avanza a ningún estado nuevo)",
    T.COMPLETED.join(",") === "RETURNED",
    T.COMPLETED.join(",")
  );
  check(
    "§9 — los estados terminales son los que declara el contrato",
    machine.terminal.join(",") === "COMPLETED,CANCELLED,RETURNED",
    machine.terminal.join(",")
  );
  check("CANCELLED es terminal", T.CANCELLED.length === 0);
  check("RETURNED es terminal", T.RETURNED.length === 0);

  // §8 — la modalidad restringe. Las tres que **no** usan transporte no pueden
  // pasar por tránsito: el camino `READY → DELIVERED` es suyo y sólo suyo.
  check("§8 — una recogida NO puede pasar a IN_TRANSIT", machine.pickupToTransit === false);
  check("§8 — una atención en sitio NO puede pasar a IN_TRANSIT", machine.serviceToTransit === false);
  check("§8 — un envío SÍ puede pasar a IN_TRANSIT", machine.deliveryToTransit === true);

  // §9 — no se devuelve lo que nunca se entregó.
  check("§9 — no se devuelve una orden que nunca se entregó", machine.pendingToReturned === false);
  check("§9 — sí se devuelve una entregada", machine.deliveredToReturned === true);

  // §14 — el ejemplo literal del pedido.
  check(
    "§14 — PENDIENTE ofrece Confirmar y Cancelar, y nada más",
    machine.pendingActions.join(",") === "CANCELLED,CONFIRMED",
    machine.pendingActions.join(",")
  );
  check(
    "§9 — cancelar exige motivo y va en tono destructivo",
    machine.cancelReq?.requiresReason === true && machine.cancelReq?.tone === "destructive"
  );
  check(
    "§14 — una COMPLETADA no ofrece avanzar; sólo registrar devolución",
    machine.completedActions.length <= 1 &&
      machine.completedActions.every((s) => s === "RETURNED"),
    machine.completedActions.join(",")
  );
  check(
    "§13 — los estados terminales no son columnas de trabajo",
    !machine.alwaysVisible.includes("COMPLETED") &&
      !machine.alwaysVisible.includes("CANCELLED") &&
      !machine.alwaysVisible.includes("RETURNED"),
    machine.alwaysVisible.join(",")
  );
}

/* ── §16 — la capa operativa es la única que declara universos ───────────── */

const opsSrc = read(ORDERS, "operational/order-operations.ts");
check(
  "§16 — los cuatro universos de trabajo y la traducción estado→pantalla viven en la capa operativa",
  ["INBOX_STATUSES", "PREPARATION_STATUSES", "DISPATCH_STATUSES", "HISTORY_STATUSES", "screenForStatus"].every(
    (n) => new RegExp(n).test(opsSrc)
  ),
  ""
);
check(
  "§8/§13 — `DELIVERED` pertenece al despacho (una entrega sin cerrar sigue siendo trabajo)",
  /DISPATCH_STATUSES[^;]*"DELIVERED"/.test(opsSrc),
  ""
);
const screensDecl = opsSrc.match(/OPERATIONAL_SCREENS\s*=\s*\[([\s\S]*?)\]\s*as\s+const/);
const operationalScreens = screensDecl
  ? [...screensDecl[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
  : [];
check(
  "§12 — las cinco pantallas que operan órdenes son las que declara la capa operativa",
  operationalScreens.join(",") === "bandeja,alistamiento,despacho,programados,historial",
  operationalScreens.join(",")
);

// Ninguna vista declara su propio conjunto de estados ni su propio mapa de
// transiciones: si lo hiciera, habría una segunda máquina de estados escondida.
const ownStatusSets = code.filter(
  (f) =>
    f.rel.includes("/views/") &&
    /(PENDING|CONFIRMED|IN_PREPARATION|READY|IN_TRANSIT|DELIVERED|COMPLETED|CANCELLED|RETURNED)\s*:\s*\[/.test(f.bare)
);
check(
  "§16 — ninguna vista declara su propio conjunto de estados",
  ownStatusSets.length === 0,
  ownStatusSets.map((h) => h.rel).join(", ")
);

/* ── §13/§14 — las acciones se derivan del estado y viven en un solo sitio ── */

const actionDerivers = code.filter(
  (f) => /orderActionsFor/.test(f.bare) && !f.rel.endsWith("order-status.constants.ts")
);
check(
  "§13 — sólo el detalle deriva acciones de la orden (ni las filas ni las tarjetas)",
  actionDerivers.length === 1 && actionDerivers[0].rel.endsWith("views/OrderDetailDrawer.tsx"),
  actionDerivers.map((f) => f.rel).join(", ")
);

const transitionCallers = code.filter(
  (f) => /transitionOrder\s*\(/.test(f.bare) && !f.rel.endsWith("context/OrdersContext.tsx")
);
check(
  "§14 — la única puerta de escritura del estado es el detalle",
  transitionCallers.length === 1 && transitionCallers[0].rel.endsWith("views/OrderDetailDrawer.tsx"),
  transitionCallers.map((f) => f.rel).join(", ")
);

// ⚠️ §13 hablaba del board (columnas por estado, tarjetas sin botones). El board se
// retiró, así que lo que la regla protege ahora es su sucesor: la **tabla**
// compartida tampoco puede llevar acciones dentro de la fila — el único acceso es
// abrir el detalle, que es donde viven las acciones derivadas del estado.
const tableSrc = read(ORDERS, "shared/OrdersTable.tsx");
check(
  "§13 — la fila de la tabla no lleva botones de acción (sólo abre el detalle)",
  !/<Button/.test(tableSrc) && !/CardAction/.test(tableSrc),
  ""
);

const STALE_VIEWS = [
  "views/OrdersView.tsx",
  "views/OrdersTable.tsx",
  "views/OrdersBoard.tsx",
  "views/PreparationView.tsx",
  "views/ScheduledView.tsx",
  "views/OrdersConfigView.tsx",
];
const staleLeft = STALE_VIEWS.filter((rel) => existsSync(path.join(ORDERS, rel)));
check(
  "§11 — las vistas de la versión plana ya no existen (ni su archivo)",
  staleLeft.length === 0,
  staleLeft.join(", ")
);

/* ══════════════════════════════════════════════════════════════════════════
 * Parte 4 — Registro en el shell y navegación modular (§25, §26, §30 Fase 4)
 * ════════════════════════════════════════════════════════════════════════ */

console.log("\n── Registro en el shell (§26) ──");

const nectoApp = read(SRC, "pages/NectoApp.tsx");
const ordersModuleSrc = read(ORDERS, "OrdersModule.tsx");

check(
  "el shell registra `pedidos` como módulo con vista",
  /MODULES_WITH_VIEWS[^=]*=\s*\[[^\]]*["']pedidos["']/.test(nectoApp)
);
check("el shell monta `<OrdersModule>`", /<OrdersModule\b/.test(nectoApp));
check(
  "el shell monta el `OrdersProvider` una sola vez, por encima del cuerpo",
  (nectoApp.match(/<OrdersProvider\b/g) || []).length === 1
);
check(
  "§25 — el widget se declara en el catálogo del Dashboard con `source: \"pedidos\"` (aparece y desaparece con el módulo)",
  /id:\s*"pedidos-summary"[\s\S]{0,160}source:\s*"pedidos"/.test(
    read(SRC, "compositions/store-dashboard/dashboard-widgets.tsx")
  ),
  ""
);

// El módulo no declara su propio provider: el estado es uno solo.
check(
  "`OrdersModule` NO monta un provider propio (no hay dos almacenes)",
  !/<OrdersProvider/.test(ordersModuleSrc)
);

// ⚠️ Se lee el **texto** de `ORDERS_SECTIONS` en vez de importarlo: el módulo usa
// el alias `@/…`, que Node no resuelve. El orden declarado es justo lo que la
// guarda tiene que fijar, y esto lo lee sin depender del runtime.
//
// ⚠️ Y se lee de `shared/orders-destinations.ts`, **no** de `OrdersModule.tsx`: el
// vocabulario se mudó allí cuando el Panel —una vista— necesitó listar los
// destinos, porque una vista que importa el shell cierra el ciclo
// `OrdersModule → OrdersPanelView → OrdersModule`. Si alguien lo devolviera al
// shell, este `match` devolvería `null`, `declaredSections` quedaría vacío y la
// aserción de orden se pondría roja: la mudanza está sujeta por construcción.
const destinationsSrc = read(ORDERS, "shared/orders-destinations.ts");

const EXPECTED_SECTIONS =
  "panel,bandeja,alistamiento,despacho,programados,historial,canales,configuracion";

const sectionsDecl = destinationsSrc.match(
  /ORDERS_SECTIONS\s*=\s*\[([^\]]*)\]\s*as\s+const/
);
const declaredSections = sectionsDecl
  ? [...sectionsDecl[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
  : [];
check(
  "§26 — los ocho destinos del módulo, en el orden del recorrido de trabajo",
  declaredSections.join(",") === EXPECTED_SECTIONS,
  declaredSections.join(",")
);
check(
  "§18 — «conversaciones»/«whatsapp» no son destinos de Pedidos (el canal no es la orden)",
  !declaredSections.includes("conversaciones") && !declaredSections.includes("whatsapp")
);

/**
 * ⚠️ El **Panel abre el recorrido**: es el primer destino y es la puerta de
 * entrada del módulo. Se comprueban las dos cosas juntas porque son la misma
 * decisión: si el Panel dejara de ser el primero pero siguiera siendo el
 * `DEFAULT_ORDERS_SECTION`, la barra abriría en una pantalla que no es la
 * primera que se lee, y el orden dejaría de contar el recorrido.
 */
check(
  "§26 — el Panel abre el recorrido: es el primer destino Y la puerta de entrada",
  declaredSections[0] === "panel" &&
    /DEFAULT_ORDERS_SECTION[^=]*=\s*"panel"/.test(destinationsSrc),
  `primero=${declaredSections[0]}`
);

// La descripción de cada destino —rótulo largo, corto e icono— sale de una tabla.
const metaDecl = destinationsSrc.match(/ORDERS_SECTION_META[^=]*=\s*\[([\s\S]*?)\n\];/);
const metaBody = metaDecl ? metaDecl[1] : "";
const metaKeys = [...metaBody.matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]);
check(
  "§26 — `ORDERS_SECTION_META` describe los ocho destinos, en el mismo orden",
  metaKeys.join(",") === EXPECTED_SECTIONS,
  metaKeys.join(",")
);
check(
  "§26 — cada destino trae rótulo largo, corto, icono y **propósito** (una sola tabla para las tres navegaciones)",
  metaKeys.length === 8 &&
    (metaBody.match(/label:/g) || []).length === 8 &&
    (metaBody.match(/shortLabel:/g) || []).length === 8 &&
    (metaBody.match(/icon:/g) || []).length === 8 &&
    (metaBody.match(/purpose:/g) || []).length === 8,
  `labels=${(metaBody.match(/label:/g) || []).length} short=${(metaBody.match(/shortLabel:/g) || []).length} purpose=${(metaBody.match(/purpose:/g) || []).length}`
);

/**
 * ⚠️ El módulo **reexporta** el vocabulario. No es cosmético: cinco consumidores
 * —la barra del módulo, la barra lateral, el breadcrumb, el widget y el Panel—
 * importan desde `OrdersModule`, y si la reexportación desapareciera habría que
 * tocar los cinco a la vez para una mudanza de archivo.
 */
check(
  "§26 — `OrdersModule` reexporta el vocabulario (los consumidores no cambian al mudarse)",
  /export\s*\{[\s\S]{0,200}ORDERS_SECTIONS[\s\S]{0,200}\}\s*from\s*["']\.\/shared\/orders-destinations["']/.test(
    ordersModuleSrc
  ) && /DEFAULT_ORDERS_SECTION/.test(ordersModuleSrc),
  ""
);

const indexSrc = read(ORDERS, "index.ts");
check(
  "§26 — la superficie pública exporta `ORDERS_SECTION_META` y `DEFAULT_ORDERS_SECTION`",
  /export\s*\{[^}]*ORDERS_SECTION_META/.test(indexSrc) &&
    /export\s*\{[^}]*DEFAULT_ORDERS_SECTION/.test(indexSrc),
  ""
);

const sidebar = read(SRC, "compositions/shell/StockFlowSidebar.tsx");
check(
  "§26 — la barra lateral lista los sub-destinos de Pedidos desde la MISMA tabla de rótulos",
  /ORDERS_SECTION_META/.test(sidebar) &&
    /data-orders-subnav/.test(sidebar) &&
    /data-orders-sidebar-section/.test(sidebar),
  ""
);
check(
  "§26 — los sub-destinos sólo se pintan con la barra expandida (colapsada queda «Pedidos»)",
  /entry\.key === "pedidos"\s*&&\s*sidebarExpanded\s*&&\s*onNavigateOrdersSection/.test(sidebar),
  ""
);
check(
  "§26 — el shell deriva los rótulos del breadcrumb de `ORDERS_SECTION_META` (no de una lista paralela)",
  /ORDERS_SECTION_META\.map/.test(nectoApp),
  ""
);
check(
  "§26 — el shell y el módulo abren por la misma puerta (`DEFAULT_ORDERS_SECTION`)",
  /DEFAULT_ORDERS_SECTION/.test(nectoApp) &&
    /initialSection\s*=\s*DEFAULT_ORDERS_SECTION/.test(ordersModuleSrc)
);

// ⚠️ El vocabulario retirado (`ordenes`, `programados` como sección única…) ya no
// puede aparecer como literal: era lo que hacía que el widget pidiera una pantalla
// inexistente y "funcionara" sólo por el fallback de `oneOfSections`.
const staleVocab = [
  { rel: "pages/NectoApp.tsx", src: nectoApp },
  { rel: "compositions/orders/OrdersModule.tsx", src: ordersModuleSrc },
  { rel: "compositions/store-dashboard/dashboard-widgets.tsx", src: read(SRC, "compositions/store-dashboard/dashboard-widgets.tsx") },
].filter((f) => /["']ordenes["']/.test(f.src));
check(
  "§26 — el vocabulario de secciones retirado (`ordenes`) ya no aparece en ningún literal",
  staleVocab.length === 0,
  staleVocab.map((f) => f.rel).join(", ")
);

/* ══════════════════════════════════════════════════════════════════════════
 * Parte 5 — La suite en pantalla (la conexión CDP ya está abierta)
 * ════════════════════════════════════════════════════════════════════════ */

console.log("\n── La suite en pantalla ──");

const STORE = {
  id: "biz-orders",
  name: "Ferretería El Tornillo",
  slug: "ferreteria-el-tornillo",
  businessType: "retail_store",
  iconKey: "store",
  currency: "COP",
  city: "Bogotá",
  channels: { whatsapp: false, web: false, pos: false },
  channelConnections: [],
  kitchenBufferMin: 15,
  // ⚠️ Explícito: sin esto la migración siembra módulos y el caso A dejaría de
  // probar "Pedidos desacoplado".
  activeModules: [],
  createdAt: new Date().toISOString(),
};
const seed = (business) => `
  localStorage.setItem('necto_businesses', JSON.stringify([${JSON.stringify(business)}]));
  localStorage.setItem('necto_active_business_id', ${JSON.stringify(business.id)});
  true;
`;

// ⚠️ Navegar ANTES de tocar `localStorage`: en `about:blank` el origen es opaco.
await send("Page.navigate", { url: APP });
await sleep(2500);
await evaluate("localStorage.clear()");

/* ── Estado A — Pedidos DESACOPLADO: ni vista ni widget ────────────────── */

await evaluate(seed(STORE));
await goto("/app?module=pedidos", "aside");
await sleep(600);

check(
  "sin `pedidos` acoplado no hay módulo en pantalla",
  (await evaluate("!document.querySelector('[data-orders-module]')")) === true
);
check(
  "sin `pedidos` acoplado no hay widget en el Dashboard",
  (await evaluate("!document.querySelector('[data-pedidos-widget]')")) === true
);

/* ── Estado B — Pedidos ACOPLADO: vista + widget ──────────────────────── */

await evaluate(seed({ ...STORE, activeModules: ["pedidos"] }));
const moduleReady = await goto("/app?module=pedidos", "[data-orders-module]");

check(
  "con `pedidos` el módulo se pinta",
  moduleReady === true,
  moduleReady ? "" : "la app no llegó a montar el módulo en 3 intentos"
);

const nav = await evaluate(
  `[...document.querySelectorAll('[data-orders-section]')].map(b => b.getAttribute('data-orders-section'))`
);
check(
  "§26 — la barra del módulo ofrece los ocho destinos, en orden",
  nav.join(",") === EXPECTED_SECTIONS,
  nav.join(",")
);

const defaultSection = await evaluate(`(() => ({
  current: document.querySelector('[data-orders-section][aria-current="page"]')?.getAttribute('data-orders-section') ?? null,
  panel: !!document.querySelector('[data-orders-panel]'),
  inbox: !!document.querySelector('[data-orders-inbox]'),
}))()`);
/**
 * ⚠️ El módulo abre en el **Panel**, no en la Bandeja. La Bandeja es donde hay
 * trabajo, pero no donde se sabe *qué* trabajo: una lista de órdenes no dice si
 * además hay algo vencido en Programados. Y se exige que la Bandeja **no** esté
 * montada: si ambas superficies coexistieran, el Panel sería una pestaña más en
 * lugar de la puerta de entrada, y el operador vería dos veces la misma cola.
 */
check(
  "§26 — el módulo abre en el Panel de pedidos (y sólo en él)",
  defaultSection.current === "panel" &&
    defaultSection.panel === true &&
    defaultSection.inbox === false,
  JSON.stringify(defaultSection)
);

/* ── Helper: leer una pantalla operativa por sus anclas ────────────────── */

const clickSection = (key) => `(() => {
  const b = document.querySelector('[data-orders-section="${key}"]');
  if (!b) return false;
  b.click();
  return true;
})()`;

/** La superficie que **prueba** que cada destino está montado de verdad. */
const SECTION_ANCHOR = {
  panel: "[data-orders-panel]",
  bandeja: "[data-orders-inbox]",
  alistamiento: "[data-orders-preparation]",
  despacho: "[data-orders-dispatch]",
  programados: "[data-orders-scheduled]",
  historial: "[data-orders-history]",
  canales: "[data-channels-view]",
  configuracion: "[data-orders-config]",
};

/**
 * Abre una sección del módulo y **espera a su superficie**, reintentando el clic.
 *
 * ⚠️ Es la versión correcta de `clickSection(...)` + `sleep(N)`: el `sleep` no
 * espera a nada, sólo pasa el tiempo, y cuando la vista tarda en montar la guarda
 * lee una pantalla vacía y se pone roja por un motivo que no existe.
 *
 * ⚠️ Y reintenta el clic porque un clic puede **perderse**: React delega los
 * eventos en la raíz, así que si la barra se re-renderiza entre el
 * `querySelector` y el `click`, se pulsa un nodo ya desprendido y no pasa nada —
 * sin error, sin excepción, sin rastro. Eso producía un rojo intermitente en una
 * pantalla distinta cada vez, que es la peor clase de fallo: el que parece que
 * "a veces falla la app".
 */
const openSection = async (key) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const clicked = await evaluate(clickSection(key));
    if (!clicked) return false;
    const active = await waitFor(
      `[data-orders-section="${key}"][aria-current="page"]`,
      { timeoutMs: 8000 }
    );
    if (active && (await waitFor(SECTION_ANCHOR[key], { timeoutMs: 8000 }))) return true;
  }
  return false;
};

/**
 * Pulsa el primer elemento que case con `selector` y **devuelve si existía**.
 *
 * ⚠️ Existe porque `document.querySelector(sel).click()` dentro de un `evaluate`
 * tumba el proceso entero cuando el elemento no está: `Runtime.evaluate` devuelve
 * un `exceptionDetails` y el helper `evaluate` lo relanza. Un fallo de la app se
 * convertía así en un *crash* de la guarda —sin resumen de fallos, sin el resto
 * de secciones— en vez de en una aserción roja. Todo clic dentro de `evaluate`
 * pasa por aquí.
 */
const clickFirst = (selector, { root = "document" } = {}) => `(() => {
  const el = ${root}.querySelector(${JSON.stringify(selector)});
  if (!el) return false;
  el.click();
  return true;
})()`;

/* ── El Panel de Pedidos (§5, §12) ─────────────────────────────────────── */

/**
 * El Panel sustituye a las cuatro tarjetas que **cada** pestaña repetía en su
 * cabecera. Lo que hay que defender aquí no es que "haya cifras" —eso ya lo hacía
 * la cabecera, y era el problema—, sino lo que la cabecera no hacía:
 *
 *   1. **Cada cifra lleva a su lista, y con la fase puesta.** Un contador que no
 *      se puede accionar es decoración; aquí cada fila declara pantalla destino
 *      *y* fase, y la fase tiene que existir de verdad en esa pantalla.
 *   2. **Una sola cifra por destino.** Es la razón de ser de la pantalla: si cada
 *      atajo creciera a tres números, volveríamos al Dashboard embutido en cada
 *      pestaña que esto viene a retirar.
 *   3. **El Panel no se pone un atajo a sí mismo**: siete atajos, no ocho.
 */
const panel = await evaluate(`(() => {
  const root = document.querySelector('[data-orders-panel]');
  if (!root) return null;
  const attr = (el, a) => el.getAttribute(a);
  return {
    blocks: [...root.querySelectorAll('[data-orders-panel-block]')].map(b => attr(b, 'data-orders-panel-block')),
    attention: [...root.querySelectorAll('[data-orders-attention]')].map(a => ({
      key: attr(a, 'data-orders-attention'),
      count: Number(attr(a, 'data-orders-attention-count')),
      target: attr(a, 'data-orders-attention-target'),
      phase: attr(a, 'data-orders-attention-phase'),
    })),
    clear: !!root.querySelector('[data-orders-attention-clear]'),
    shortcuts: [...root.querySelectorAll('[data-orders-shortcut]')].map(s => ({
      key: attr(s, 'data-orders-shortcut'),
      value: attr(s, 'data-orders-shortcut-value'),
    })),
    rhythm: [...root.querySelectorAll('[data-orders-rhythm]')].map(r => ({
      key: attr(r, 'data-orders-rhythm'),
      value: Number(attr(r, 'data-orders-rhythm-value')),
      // ⚠️ Los tres totales del día son **puertas**, no cifras pintadas. Se
      // comprueba el nombre de la etiqueta y no "es pulsable" a secas: un div con
      // un manejador de clic pasaría un onclick suelto y no sería alcanzable con
      // el teclado, que es la mitad de la accesibilidad de un atajo.
      tag: r.tagName,
      label: attr(r, 'aria-label'),
    })),
    /* ── Las barras que se retiraron (§5) ────────────────────────────────── */
    /**
     * ⚠️ "Flujo por estado" y "Reparto por canal" se retiraron del Panel: eran dos
     * franjas de color entre lo urgente y los atajos que repetían, en forma de
     * gráfico, lo que las tarjetas de destino dicen en forma de puerta. Esta cuenta
     * es la que impide que vuelvan sin que nadie lo note.
     */
    flowBars: root.querySelectorAll('[data-orders-flow-bar]').length,
    dayChart: !!root.querySelector('[data-orders-day-chart]'),
    dayEmpty: !!root.querySelector('[data-orders-day-empty]'),
    // La frase que interpreta los tres números del día. Sin ancla no se puede
    // leer, y sin leerla la guarda sólo sabe que hay un párrafo.
    dayReading: (root.querySelector('[data-orders-day-reading]')?.textContent || '').trim(),
    dayHours: [...root.querySelectorAll('[data-orders-day-hour]')].map(d => ({
      hour: Number(attr(d, 'data-orders-day-hour')),
      entered: Number(attr(d, 'data-orders-day-entered')),
      closed: Number(attr(d, 'data-orders-day-closed')),
    })),
    // ⚠️ La analítica retirada se anunciaba con una insignia "TailAdmin" en
    // pantalla: el nombre de la plantilla de referencia no es información para el
    // tendero. Se comprueba que no vuelva.
    templateName: /tailadmin/i.test(root.textContent || ''),
    // ⚠️ Ninguna tarjeta de métrica puede sobrevivir **aquí**: el Panel existe
    // justamente para retirarlas de todas las pantallas, y traerlas al Panel sería
    // devolver el problema a su sitio natural.
    metrics: root.querySelectorAll('[data-orders-metric]').length,
  };
})()`);

check("§5 — el Panel de Pedidos es una superficie real", panel !== null);

/** El destino y la fase que `attentionItems()` emite para cada condición. */
const ATTENTION_TARGETS = {
  staleInbox: "bandeja",
  latePreparation: "alistamiento",
  unsentReady: "despacho",
  overdueScheduled: "programados",
};
const ATTENTION_ORDER = Object.keys(ATTENTION_TARGETS);

/*
 * ⚠️ Aquí vivía `STAGE_TARGETS`: la tabla independiente de "a qué pantalla y con
 * qué fase lleva cada tramo del flujo por estado". Se retiró con la barra que
 * medía —el Panel ya no tiene tramos que pulsar—, y no se sustituye por nada: el
 * salto con fase se sigue midiendo, con la misma fuerza, sobre las filas de
 * atención (más abajo) y sobre las tarjetas de destino.
 */

if (panel) {
  check(
    "§5 — el Panel tiene sus tres bloques: qué atender, a dónde ir y cómo va el día",
    panel.blocks.join(",") === "attention,destinations,rhythm",
    panel.blocks.join(",")
  );
  check(
    "§12 — el Panel no repite la cabecera de métricas (es lo que viene a retirar)",
    panel.metrics === 0,
    `${panel.metrics} tarjetas de métrica dentro del Panel`
  );

  const renderedKeys = panel.attention.map((a) => a.key);
  check(
    "§5 — las condiciones se pintan en orden de prioridad del flujo, cada una con su pantalla",
    renderedKeys.length >= 1 &&
      renderedKeys.join(",") === ATTENTION_ORDER.filter((k) => renderedKeys.includes(k)).join(",") &&
      panel.attention.every((a) => ATTENTION_TARGETS[a.key] === a.target),
    panel.attention.map((a) => `${a.key}→${a.target}`).join(", ")
  );
  check(
    "§5 — sólo se pinta la condición con cifra; el cero no es una fila (y hay una salida cuando no hay nada)",
    panel.attention.every((a) => a.count > 0) &&
      (panel.attention.length > 0 || panel.clear === true),
    panel.attention.map((a) => `${a.key}=${a.count}`).join(" ") || "todas a cero"
  );
  check(
    "§5 — cada cifra viaja con la fase con la que hay que abrir su pantalla",
    panel.attention.every((a) => typeof a.phase === "string" && a.phase.length > 0),
    panel.attention.map((a) => `${a.key}→${a.target}#${a.phase}`).join(", ")
  );

  const shortcutKeys = panel.shortcuts.map((s) => s.key);
  check(
    "§5 — hay un atajo por pantalla, y el Panel no se pone un atajo a sí mismo",
    shortcutKeys.join(",") ===
      EXPECTED_SECTIONS.split(",").filter((k) => k !== "panel").join(","),
    shortcutKeys.join(",")
  );
  check(
    "§5 — cada atajo trae su cifra viva (un atajo sin cifra no dice si merece la pena entrar)",
    panel.shortcuts.length === 7 &&
      panel.shortcuts.every((s) => s.value !== null && s.value !== "" && !Number.isNaN(Number(s.value))),
    panel.shortcuts.map((s) => `${s.key}=${s.value}`).join(" ")
  );
  check(
    "§12 — el Panel cierra con el pulso del día: entradas, completadas y canceladas",
    panel.rhythm.map((r) => r.key).join(",") === "entered,completed,cancelled" &&
      panel.rhythm.every((r) => Number.isFinite(r.value)),
    panel.rhythm.map((r) => `${r.key}=${r.value}`).join(" ")
  );

  /* ── Los gráficos que se operan (§5), medidos contra el almacén ───────── */

  /**
   * ⚠️ La comprobación que de verdad importa no es "hay dos barras", sino que
   * **las cifras de las barras sumen lo que hay en el almacén**.
   *
   * La analítica que esta pantalla tenía antes pintaba `counts.whatsapp || 14`
   * —y leía además `order.source.channel`, un campo que **no existe** en el
   * contrato, de modo que el respaldo se aplicaba siempre—: cuatro canales con
   * cifras inventadas que sumaban 63 sobre una tienda con 25 órdenes. Una
   * aserción sobre la *forma* de la barra habría pasado en verde; ésta no.
   *
   * Y se lee el **almacén persistido**, no el DOM: medir la pantalla contra sí
   * misma no comprueba nada.
   */
  const storeFlow = await evaluate(`(() => {
    const businessId = localStorage.getItem('necto_active_business_id');
    const raw = localStorage.getItem('necto_orders_v1');
    const all = raw ? JSON.parse(raw) : [];
    const mine = all.filter(o => o && o.businessId === businessId);
    const byStatus = {};
    const bySource = {};
    for (const order of mine) {
      byStatus[order.status] = (byStatus[order.status] || 0) + 1;
      const key = String((order.source && order.source.type) || '').toUpperCase();
      bySource[key] = (bySource[key] || 0) + 1;
    }
    // ⚠️ El flujo vivo se declara aquí, no se lee del código: la guarda tiene que
    // saber por su cuenta qué es "trabajo pendiente" para poder medir la pantalla
    // contra esa expectativa. Una orden cerrada no espera a nadie.
    const LIVE = ['PENDING','CONFIRMED','IN_PREPARATION','READY','IN_TRANSIT','DELIVERED'];
    const openTotal = mine.filter(o => LIVE.includes(o.status)).length;
    // El pulso horario se recalcula aquí, con la misma regla que la pantalla pero
    // escrita aparte: día **local**, y el cierre es la última entrada del historial.
    const today = new Date();
    const isToday = (iso) => {
      const d = new Date(iso);
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    };
    const byHour = {};
    // ⚠️ Un **cierre** es una orden en estado terminal cuya última entrada del
    // historial es de hoy. Las dos condiciones a la vez, y escritas aquí como
    // contrato: la primera versión de esta guarda copió la condición de la
    // implementación —que sólo miraba la fecha— y por eso las dos coincidían en
    // contar como cierres 20 órdenes de las que sólo 3 lo estaban. Una guarda que
    // repite la regla del código comprueba que el código coincide consigo mismo.
    const CLOSED = ['COMPLETED', 'CANCELLED', 'RETURNED'];
    let returnedToday = 0;
    for (const order of mine) {
      if (isToday(order.createdAt)) {
        const h = new Date(order.createdAt).getHours();
        if (!byHour[h]) byHour[h] = { entered: 0, closed: 0 };
        byHour[h].entered += 1;
      }
      const last = order.history && order.history[order.history.length - 1];
      if (last && last.at && CLOSED.includes(order.status) && isToday(last.at)) {
        const h = new Date(last.at).getHours();
        if (!byHour[h]) byHour[h] = { entered: 0, closed: 0 };
        byHour[h].closed += 1;
        if (order.status === 'RETURNED') returnedToday += 1;
      }
    }
    return { total: mine.length, openTotal, live: LIVE, byStatus, bySource, byHour, returnedToday };
  })()`);

  /**
   * ⚠️ Las dos barras se retiraron del Panel, y esta aserción existe para que no
   * vuelvan por la puerta de atrás.
   *
   * "Flujo por estado" repetía, en forma de gráfico, la cifra que la tarjeta de
   * destino de al lado ya da —con el nombre de la pantalla que la resuelve, que es
   * lo que la hace accionable—. "Reparto por canal" es un dato comercial, no
   * operativo: quien alista y despacha no decide nada por saber el porcentaje que
   * entró por WhatsApp. Y las dos juntas ocupaban la franja más valiosa de la
   * pantalla, entre lo urgente y los atajos.
   *
   * Un elemento que se puede quitar sin perder ni una decisión posible es ruido.
   * Esto no comprueba que el código coincida consigo mismo: comprueba que **no**
   * está lo que se decidió quitar.
   */
  check(
    "§5 — las dos barras del Panel siguen retiradas (flujo por estado y reparto por canal)",
    panel.flowBars === 0,
    `barras=${panel.flowBars}`
  );

  check(
    "§5 — el pulso del día se dibuja sólo si hubo actividad, y lo dice cuando no la hubo",
    panel.dayChart !== panel.dayEmpty,
    `gráfico=${panel.dayChart} vacío=${panel.dayEmpty}`
  );

  /**
   * ⚠️ Comprobar que hay columnas no es comprobar que el gráfico **diga la
   * verdad**. Estas dos aserciones comparan cada altura con el almacén, hora por
   * hora: son las que impiden que un gráfico bonito y vacío pase por bueno.
   */
  const chartEntered = panel.dayHours.reduce((sum, h) => sum + h.entered, 0);
  const chartClosed = panel.dayHours.reduce((sum, h) => sum + h.closed, 0);
  const storeEntered = Object.values(storeFlow.byHour).reduce((sum, h) => sum + h.entered, 0);
  const storeClosed = Object.values(storeFlow.byHour).reduce((sum, h) => sum + h.closed, 0);
  check(
    "§5 — el pulso del día es un gráfico REAL: sus columnas suman las órdenes de hoy del almacén",
    chartEntered === storeEntered && chartClosed === storeClosed,
    `entraron ${chartEntered}/${storeEntered} · se cerraron ${chartClosed}/${storeClosed}`
  );
  check(
    "§5 — y cada hora lleva su cifra, hora por hora",
    panel.dayHours.every(
      (h) =>
        h.entered === (storeFlow.byHour[h.hour]?.entered ?? 0) &&
        h.closed === (storeFlow.byHour[h.hour]?.closed ?? 0)
    ),
    panel.dayHours.map((h) => `${h.hour}:${h.entered}/${h.closed}`).join(" ")
  );

  /**
   * ⚠️ Y una que **no** depende de mi propia recomputación, porque ésa es la que
   * se puede equivocar conmigo: los cierres del gráfico no pueden superar lo que
   * el propio Panel afirma haber cerrado tres centímetros más abajo.
   *
   * Esta aserción es la que habría cazado el fallo de verdad: la primera versión
   * contaba como cierre cualquier orden *tocada* hoy —incluidas las que siguen en
   * alistamiento— y el gráfico llegó a mostrar 20 cierres mientras las cifras de
   * al lado decían 2 completadas y 1 cancelada.
   */
  const shownCompleted = panel.rhythm.find((r) => r.key === "completed")?.value ?? 0;
  const shownCancelled = panel.rhythm.find((r) => r.key === "cancelled")?.value ?? 0;
  check(
    "§5 — los cierres del gráfico no superan lo que el Panel dice haber cerrado",
    chartClosed >= shownCompleted + shownCancelled &&
      chartClosed <= shownCompleted + shownCancelled + storeFlow.returnedToday,
    `gráfico=${chartClosed} vs panel=${shownCompleted}+${shownCancelled}+${storeFlow.returnedToday} devueltas`
  );
  check(
    "§12 — los tres totales del día son botones con su destino escrito",
    panel.rhythm.every((r) => r.tag === "BUTTON" && typeof r.label === "string" && r.label.length > 0),
    panel.rhythm.map((r) => `${r.key}:${r.tag}`).join(" ")
  );

  /**
   * ⚠️ La frase que interpreta el día tiene que hacer **la misma cuenta** que el
   * gráfico que tiene justo encima.
   *
   * Aquí vivía el mismo error de definición que en `todayHours`, un piso más
   * arriba: la frase restaba sólo las completadas, así que anunciaba «entraron 18
   * más de las que se cerraron» sobre una leyenda «Se cerraron» que valía 3. Dos
   * definiciones distintas de «cerrada» en la misma tarjeta. La cuenta se
   * recomputa aquí desde las columnas del gráfico, no desde el texto del Panel.
   */
  const expectedNet = Math.abs(chartEntered - chartClosed);
  const readingNumber = Number((panel.dayReading.match(/(\d+)\s+(?:orden|órdenes)/) || [])[1] ?? NaN);
  check(
    "§5 — la frase del día hace la misma cuenta que el gráfico que tiene al lado",
    chartEntered === chartClosed
      ? Number.isNaN(readingNumber) && /cola se mantuvo|no se movió nada/.test(panel.dayReading)
      : readingNumber === expectedNet,
    `frase="${panel.dayReading}" → dice ${readingNumber} vs ${chartEntered}-${chartClosed}=${expectedNet}`
  );
  check(
    "§5 — la plantilla de referencia no se anuncia en pantalla",
    panel.templateName === false,
    "aparece «TailAdmin» dentro del Panel"
  );

  /* ── El atajo de verdad: pulsar una cifra abre su lista, ya filtrada ──── */

  /**
   * ⚠️ Se elige la fila **de mayor prioridad que exista** en vez de una fija: si
   * la semilla no tuviera, por ejemplo, ninguna orden vencida en Programados, una
   * aserción clavada en `overdueScheduled` fallaría por la semilla y no por el
   * enlace. Así se prueba el mecanismo con la condición que haya.
   */
  const picked = panel.attention[0];
  const deepLink = await (async () => {
    if (!picked) return { skipped: "ninguna condición con cifra que pulsar" };
    const clicked = await evaluate(
      clickFirst(`[data-orders-attention="${picked.key}"]`)
    );
    if (!clicked) return { skipped: `no se pudo pulsar ${picked.key}` };
    await sleep(1500);

    return await evaluate(`(() => {
      const seg = document.querySelector(
        '[data-node-id="necto.el.segmented.segment.' + ${JSON.stringify(picked.phase)} + '"]'
      );
      // ⚠️ El ancla se resuelve con la MISMA tabla que usa el resto de la guarda.
      // Construirla como "[data-orders-<destino>]" parecía obvio y estaba mal: la
      // Bandeja no se llama "data-orders-bandeja", se llama "data-orders-inbox". El
      // resultado era "rows: -1" —no hay raíz— y una aserción roja sobre un enlace
      // que funcionaba.
      const root = document.querySelector(${JSON.stringify(SECTION_ANCHOR[picked.target])});
      return {
        section: document.querySelector('[data-orders-section][aria-current="page"]')?.getAttribute('data-orders-section') ?? null,
        phaseActive: seg?.getAttribute('data-state') === 'active',
        phaseBadge: Number(document.querySelector('[data-order-filter="' + ${JSON.stringify(picked.phase)} + '"]')?.getAttribute('data-order-filter-count')),
        rows: root ? root.querySelectorAll('[data-order-row]').length : -1,
        url: location.pathname + location.search,
      };
    })()`);
  })();

  check(
    "§5 — pulsar una cifra del Panel abre SU pantalla (no una genérica)",
    deepLink.skipped === undefined && deepLink.section === picked?.target,
    deepLink.skipped || JSON.stringify(deepLink)
  );
  check(
    "§5 — y la abre con la fase puesta: la lista trae exactamente lo que la cifra prometió",
    deepLink.skipped === undefined &&
      deepLink.phaseActive === true &&
      deepLink.rows >= 1 &&
      deepLink.rows === deepLink.phaseBadge,
    `fase=${picked?.phase} activa=${deepLink.phaseActive} filas=${deepLink.rows} vs badge=${deepLink.phaseBadge}`
  );
  check(
    "§26 — el atajo publica la pantalla en la URL (el enlace es enlazable)",
    deepLink.skipped === undefined && new RegExp(`section=${picked?.target}`).test(deepLink.url || ""),
    deepLink.url
  );

  /* ── Y una tarjeta de destino navega, no sólo informa ────────────────── */

  /**
   * ⚠️ Hay que **volver al Panel** antes de pulsar una tarjeta: el paseo anterior
   * acaba de navegar a la pantalla de la condición que pulsó, así que el Panel ya
   * no está montado y la tarjeta no existe en el DOM. Sin esto, la guarda diría "no
   * se pudo pulsar" y culparía a la tarjeta de un fallo de secuencia suyo.
   */
  await openSection("panel");

  /**
   * ⚠️ Esta comprobación **sustituye** a la que pulsaba un tramo del gráfico, y no
   * deja un hueco: hasta ahora se medía que las cifras de las tarjetas de destino
   * coinciden con el universo de su pantalla (más abajo), pero no que pulsarlas
   * lleve allí. Un panel cuyas cifras son correctas y cuyos botones no navegan es
   * exactamente el cuadro de mando que esta pantalla existe para no ser.
   *
   * ⚠️ Se elige una tarjeta que no sea Canales: Canales no opera órdenes, así que
   * probaría el salto a medias.
   */
  const shortcutProbe = panel.shortcuts.find((s) => s.key !== "canales");
  const shortcutLink = await (async () => {
    if (!shortcutProbe) return { skipped: "ninguna tarjeta de destino que pulsar" };
    const clicked = await evaluate(clickFirst(`[data-orders-shortcut="${shortcutProbe.key}"]`));
    if (!clicked) return { skipped: `no se pudo pulsar ${shortcutProbe.key}` };
    await sleep(1500);

    return await evaluate(`(() => ({
      section: document.querySelector('[data-orders-section][aria-current="page"]')?.getAttribute('data-orders-section') ?? null,
      url: location.pathname + location.search,
    }))()`);
  })();

  check(
    "§5 — pulsar una tarjeta de destino abre SU pantalla (no una genérica)",
    shortcutLink.skipped === undefined && shortcutLink.section === shortcutProbe.key,
    shortcutLink.skipped || JSON.stringify(shortcutLink)
  );
  check(
    "§26 — y el salto queda en la URL (el atajo es enlazable)",
    shortcutLink.skipped === undefined &&
      new RegExp(`section=${shortcutProbe.key}`).test(shortcutLink.url || ""),
    shortcutLink.url
  );

  // Volver al Panel: el resto de la suite navega por su cuenta, pero dejarlo
  // abierto evita que una sección a medio camino ensucie la siguiente lectura.
  await openSection("panel");
}

const readScreen = (anchor) => evaluate(`(() => {
  const root = document.querySelector(${JSON.stringify(anchor)});
  if (!root) return null;
  const num = (el, attr) => Number(el.getAttribute(attr));
  const stag = root.querySelector('[data-orders-stagnation]');
  return {
    /**
     * ⚠️ Cero, y es una aserción, no un dato informativo. Las cuatro tarjetas de
     * métrica vivían en la cabecera de **las cinco** pantallas de trabajo con los
     * mismos cuatro números; su sitio es el Panel. Si alguna vuelve, esta cifra
     * deja de ser 0 y la guarda lo dice.
     */
    metrics: root.querySelectorAll('[data-orders-metric]').length,
    filters: [...root.querySelectorAll('[data-order-filter]')].map(f => ({
      key: f.getAttribute('data-order-filter'),
      count: num(f, 'data-order-filter-count'),
    })),
    rows: [...root.querySelectorAll('[data-order-row]')].map(b => b.getAttribute('data-order-row')),
    cards: [...root.querySelectorAll('[data-preparation-card]')].map(c => c.getAttribute('data-preparation-card')),
    urgencies: [...new Set([...root.querySelectorAll('[data-preparation-card]')].map(c => c.getAttribute('data-order-urgency')))],
    statuses: [...new Set([...root.querySelectorAll('[data-order-status]')].map(s => s.getAttribute('data-order-status')))],
    scheduleStates: [...new Set([...root.querySelectorAll('[data-order-schedule-state]')].map(s => s.getAttribute('data-order-schedule-state')))],
    days: [...root.querySelectorAll('[data-scheduled-day]')].map(d => d.getAttribute('data-scheduled-day')),
    blocks: [...root.querySelectorAll('[data-dispatch-block]')].map(d => d.getAttribute('data-dispatch-block')),
    destinations: root.querySelectorAll('[data-order-destination]').length,
    reasons: root.querySelectorAll('[data-order-reason]').length,
    closed: root.querySelectorAll('[data-order-closed]').length,
    items: root.querySelectorAll('[data-preparation-items]').length,
    audit: !!root.querySelector('[data-orders-audit]'),
    auditReason: !!root.querySelector('[data-orders-audit-reason]'),
    /** El ciclo abrió→cerró del visor de auditoría, en minutos. */
    auditCycle: root.querySelector('[data-orders-audit-cycle]')?.getAttribute('data-orders-audit-cycle-minutes') ?? null,
    /** El tramo que se salió del umbral, con el estado culpable. */
    auditOverrun: root.querySelector('[data-orders-audit-overrun]')?.getAttribute('data-orders-audit-overrun') ?? null,
    timeline: root.querySelectorAll('[data-timeline-entry]').length,
    /**
     * Los tramos del recorrido: cuánto estuvo la orden en cada estado.
     *
     * ⚠️ Es lo que el visor anterior no daba, y por eso el historial "narraba en
     * lugar de auditar". Cada píldora declara su estado, sus minutos y si pasó el
     * umbral, así que la guarda puede exigir las tres cosas.
     */
    visits: [...root.querySelectorAll('[data-timeline-visit]')].map(v => ({
      status: v.getAttribute('data-timeline-visit'),
      minutes: v.getAttribute('data-timeline-visit-minutes'),
      long: v.getAttribute('data-timeline-visit-long'),
    })),
    /** Las referencias externas ("wa_conv_8812", "ticket_7731") que el contrato guardaba y nadie enseñaba. */
    actorRefs: root.querySelectorAll('[data-timeline-actor-ref]').length,
    /** Los metadatos por cambio (canal, pago, regla). */
    metadata: root.querySelectorAll('[data-timeline-metadata]').length,
    /** El tablero (§ kanban) y sus carriles. */
    board: root.querySelector('[data-orders-board]')?.getAttribute('data-orders-board') ?? null,
    lanes: [...root.querySelectorAll('[data-orders-lane]')].map(l => ({
      key: l.getAttribute('data-orders-lane'),
      count: num(l, 'data-orders-lane-count'),
    })),
    boardCards: root.querySelectorAll('[data-orders-board-card]').length,
    orphans: root.querySelectorAll('[data-orders-lane-orphans]').length,
    /** El conmutador lista/tablero de la Bandeja. */
    viewSwitcher: !!root.querySelector('[data-intent="orders.inbox.view"]'),
    header: !!root.querySelector('[data-orders-screen-header]'),
    search: !!root.querySelector('[data-node-id="necto.el.search.input"]'),
    empty: root.querySelector('[data-orders-empty]')?.getAttribute('data-orders-empty') ?? null,
    stagnation: stag ? num(stag, 'data-orders-stagnation') : null,
    resultText: (root.querySelector('[data-orders-filters] p')?.textContent || '').replace(/\\s+/g, ' ').trim(),
  };
})()`);

/**
 * Lo que cada pantalla **debe** filtrar, y con qué cifra del Panel tiene que cuadrar.
 *
 * ⚠️ Aquí vivía un `metrics: "pending,confirmed,waiting,total"` por pantalla: la
 * guarda fijaba las **cuatro tarjetas de la cabecera**. Se retiraron del módulo
 * —eran las mismas cuatro en las cinco pantallas, un Dashboard embutido en cada
 * pestaña— y con ellas se fue esa aserción.
 *
 * ⚠️ Pero la guarda no se queda sin comprobar la coherencia: la **cambia de
 * sitio**. Antes se exigía que la cabecera de una pantalla cuadrara con sus
 * propios filtros; ahora se exige que la cifra del **Panel** cuadre con el filtro
 * de la pantalla a la que lleva. Es más fuerte, porque cruza dos superficies: si
 * el Panel se inventara un número, o si una pantalla cambiara su universo y el
 * Panel no, la resta canta. Eso es exactamente "una sola fuente de verdad" (§16).
 *
 * ⚠️ `partition` sólo se declara donde las fases **particionan** el universo. En la
 * Bandeja no lo hacen: "Espera larga" es un juicio sobre el tiempo que se solapa
 * con "Por validar" y "Confirmadas", así que ahí la suma que cuadra es
 * `pending + confirmed === all` y `waiting` sólo puede ser ≤ `all`.
 */
const SCREENS = [
  {
    key: "bandeja",
    anchor: "[data-orders-inbox]",
    filters: "all,pending,confirmed,waiting",
    partition: null,
    /** El atajo del Panel "Bandeja" cuenta el universo entero de la pantalla. */
    panelFigure: "all",
    /** Y su fila de atención es, literalmente, la fase "Espera larga". */
    panelAttention: ["staleInbox", "waiting"],
    statuses: ["PENDING", "CONFIRMED"],
    body: "rows",
  },
  {
    key: "alistamiento",
    anchor: "[data-orders-preparation]",
    filters: "all,fresh,working,late",
    partition: ["fresh", "working", "late"],
    panelFigure: "all",
    panelAttention: ["latePreparation", "late"],
    statuses: ["IN_PREPARATION"],
    body: "cards",
  },
  {
    key: "despacho",
    anchor: "[data-orders-dispatch]",
    filters: "all,ready,transit,delivered",
    partition: ["ready", "transit", "delivered"],
    panelFigure: "all",
    panelAttention: ["unsentReady", "ready"],
    statuses: ["READY", "IN_TRANSIT", "DELIVERED"],
    body: "rows",
  },
  {
    key: "programados",
    anchor: "[data-orders-scheduled]",
    filters: "all,overdue,due_soon,upcoming",
    partition: ["overdue", "due_soon", "upcoming"],
    panelFigure: "all",
    panelAttention: ["overdueScheduled", "overdue"],
    statuses: [],
    body: "rows",
  },
  {
    key: "historial",
    anchor: "[data-orders-history]",
    filters: "all,completed,cancelled,returned",
    partition: ["completed", "cancelled", "returned"],
    panelFigure: "all",
    // El Historial no tiene fila de atención propia: lo cerrado no reclama nada.
    panelAttention: null,
    statuses: ["COMPLETED", "CANCELLED", "RETURNED"],
    body: "rows",
  },
];

const screensRead = {};

for (const screen of SCREENS) {
  // ⚠️ `openSection` espera a la superficie **y reintenta el clic**: la sección se
  // monta cuando el clic cambia el estado, y un clic perdido en una barra que se
  // re-renderiza dejaba esta pantalla —y sólo esta— en rojo, al azar.
  const opened = await openSection(screen.key);
  check(`se puede abrir «${screen.key}»`, opened === true);

  const s = await readScreen(screen.anchor);
  screensRead[screen.key] = s;

  if (!s) {
    check(`§26 — «${screen.key}» tiene su propia superficie (${screen.anchor})`, false, "no se encontró la raíz");
    continue;
  }

  check(
    `§12 — «${screen.key}» abre con su cabecera de fase y SIN tarjetas de métrica`,
    s.header === true && s.metrics === 0,
    `cabecera=${s.header} métricas=${s.metrics}`
  );

  const filterKeys = s.filters.map((f) => f.key).join(",");
  check(
    `§27 — «${screen.key}» filtra por fase con conteo por opción`,
    filterKeys === screen.filters && s.filters.length >= 4 && s.filters.every((f) => Number.isFinite(f.count)),
    filterKeys
  );

  const byKey = Object.fromEntries(s.filters.map((f) => [f.key, f.count]));

  if (screen.partition) {
    const sum = screen.partition.reduce((acc, k) => acc + (byKey[k] ?? 0), 0);
    check(
      `§27 — los conteos de «${screen.key}» particionan el universo (suma = total)`,
      sum === byKey.all,
      `${screen.partition.join("+")}=${sum} vs all=${byKey.all}`
    );
  } else {
    check(
      `§27 — en «${screen.key}» las fases se solapan: «Por validar» + «Confirmadas» = total, y «Espera larga» ≤ total`,
      byKey.pending + byKey.confirmed === byKey.all && byKey.waiting <= byKey.all,
      JSON.stringify(byKey)
    );
  }

  /**
   * ⚠️ La coherencia se comprueba **contra el Panel**, no contra una cabecera
   * propia que ya no existe. Es la versión fuerte de "una sola fuente de verdad"
   * (§16): cruza dos superficies distintas, así que no se puede satisfacer
   * escribiendo el mismo literal dos veces — hay que derivar las dos del mismo
   * universo. Si el Panel se inventara una cifra, o si una pantalla cambiara su
   * universo y el Panel no, la resta canta.
   */
  const panelShortcut = panel?.shortcuts.find((sc) => sc.key === screen.key);
  check(
    `§16 — la cifra que el Panel da para «${screen.key}» es la que cuenta su propio universo`,
    panelShortcut !== undefined && Number(panelShortcut.value) === byKey.all,
    `Panel=${panelShortcut?.value} vs filtro all=${byKey.all}`
  );

  if (screen.panelAttention) {
    const [attentionKey, filterKey] = screen.panelAttention;
    const item = panel?.attention.find((a) => a.key === attentionKey);
    /**
     * ⚠️ Sólo se puede exigir la igualdad cuando el Panel **pinta** la fila: el
     * cero no es una fila, así que una condición a cero no se ve. Por eso la
     * aserción acepta "no pintada" sólo si el filtro de la pantalla también es
     * cero — que es exactamente la misma afirmación, dicha por el otro lado.
     */
    check(
      `§16 — la atención «${attentionKey}» del Panel y el filtro «${filterKey}» de «${screen.key}» son el mismo número`,
      item ? item.count === byKey[filterKey] : byKey[filterKey] === 0,
      item
        ? `Panel=${item.count} vs filtro ${filterKey}=${byKey[filterKey]}`
        : `no pintada · filtro ${filterKey}=${byKey[filterKey]}`
    );
  }

  const body = screen.body === "cards" ? s.cards : s.rows;
  check(
    `§12 — «${screen.key}» lista órdenes reales de la sede (la semilla la cubre)`,
    body.length >= 1,
    `${body.length} ${screen.body === "cards" ? "tarjetas" : "filas"}`
  );

  if (screen.statuses.length > 0) {
    const missing = screen.statuses.filter((st) => !s.statuses.includes(st));
    check(
      `§16 — «${screen.key}» cubre los estados que le tocan (ninguno huérfano)`,
      missing.length === 0,
      `esperados ${screen.statuses.join(",")} · vistos ${s.statuses.join(",")}`
    );
  }

  check(`§12 — «${screen.key}» ofrece búsqueda instantánea`, s.search === true);

  /* ── Extras por pantalla ─────────────────────────────────────────────── */

  if (screen.key === "bandeja") {
    check(
      "§12 — la Bandeja avisa de las órdenes que llevan demasiado sin validar",
      s.stagnation !== null && s.stagnation >= 1,
      `stagnation=${s.stagnation}`
    );
    check(
      "§27 — la Bandeja dice cuántas órdenes hay detrás de cada fase",
      /^\d+ órdenes en bandeja$/.test(s.resultText),
      s.resultText
    );

    /* ── §12 — la Bandeja puede verse como tablero, si el operador lo pide ── */

    /**
     * ⚠️ Lo que hay que defender no es "hay un kanban", sino que **las dos vistas
     * son la misma lista**. Un tablero que contara por su cuenta sería una segunda
     * fuente de verdad disfrazada de vista, y el operador vería cifras distintas
     * según el botón que hubiera pulsado. Por eso se exige que los carriles sumen
     * el universo, que las tarjetas sean las mismas órdenes que las filas, y que
     * cada tarjeta lleve el **mismo ancla** que su fila (`data-order-row`), para
     * que abrir una orden funcione igual desde las dos.
     */
    const board = await (async () => {
      const toBoard = await evaluate(
        clickFirst('[data-node-id="necto.el.segmented.segment.board"]')
      );
      if (!toBoard) return { skipped: "la Bandeja no ofrece el conmutador de vista" };
      await waitFor('[data-orders-board="bandeja"]', { timeoutMs: 6000 });
      const read = await evaluate(`(() => {
        const root = document.querySelector('[data-orders-inbox]');
        const board = root?.querySelector('[data-orders-board]');
        if (!board) return null;
        return {
          anchor: board.getAttribute('data-orders-board'),
          lanes: [...board.querySelectorAll('[data-orders-lane]')].map(l => ({
            key: l.getAttribute('data-orders-lane'),
            count: Number(l.getAttribute('data-orders-lane-count')),
          })),
          cards: [...board.querySelectorAll('[data-orders-board-card]')].map(c => c.getAttribute('data-orders-board-card')),
          rows: [...board.querySelectorAll('[data-order-row]')].map(c => c.getAttribute('data-order-row')),
          orphans: board.querySelectorAll('[data-orders-lane-orphans]').length,
        };
      })()`);
      // Volver a la lista **por el camino real** (el conmutador), no recargando:
      // así se comprueba también que el conmutador funciona en los dos sentidos.
      await evaluate(clickFirst('[data-node-id="necto.el.segmented.segment.list"]'));
      await waitFor('[data-orders-board]', { present: false, timeoutMs: 6000 });
      return read ?? { skipped: "el tablero no se pintó" };
    })();

    check(
      "§12 — la Bandeja puede verse como tablero, a voluntad del operador",
      board.skipped === undefined && board.anchor === "bandeja" && board.lanes.length === 2,
      board.skipped || `carriles=${board.lanes.map((l) => l.key).join(",")}`
    );
    check(
      "§16 — el tablero es la MISMA lista: un carril por estado de la bandeja, y suman el universo",
      board.skipped === undefined &&
        board.lanes.map((l) => l.key).join(",") === "PENDING,CONFIRMED" &&
        board.lanes.reduce((n, l) => n + l.count, 0) === byKey.all &&
        board.rows.length === byKey.all,
      board.skipped || `carriles=${JSON.stringify(board.lanes)} tarjetas=${board.rows.length} vs all=${byKey.all}`
    );
    check(
      "§12 — cada tarjeta lleva el mismo ancla que su fila, y ninguna orden se queda sin carril",
      board.skipped === undefined &&
        board.cards.length === board.rows.length &&
        board.rows.every((n) => board.cards.includes(n)) &&
        board.orphans === 0,
      board.skipped || `tarjetas=${board.cards.length} anclas=${board.rows.length} huérfanos=${board.orphans}`
    );

    // Estado vacío: filtrar hasta que no quede nada tiene que **explicarse**, no
    // dejar un hueco. Se teclea en la búsqueda real (el `input` controlado se
    // actualiza con el setter nativo + evento `input`, que es lo que React lee).
    const typed = await evaluate(`(() => {
      const input = document.querySelector('[data-node-id="necto.el.search.input"]');
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'zzzz-sin-resultados');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);
    await waitFor('[data-orders-empty="bandeja"]', { timeoutMs: 6000 });
    const emptied = await evaluate(`(() => {
      const root = document.querySelector('[data-orders-inbox]');
      const empty = root?.querySelector('[data-orders-empty]');
      return {
        anchor: empty?.getAttribute('data-orders-empty') ?? null,
        text: (empty?.textContent || '').replace(/\\s+/g, ' ').trim(),
        rows: root ? root.querySelectorAll('[data-order-row]').length : -1,
        hasClear: [...(root?.querySelectorAll('button') || [])].some(b => /Limpiar filtros/.test(b.textContent || '')),
      };
    })()`);
    check(
      "§12 — cuando el filtro no deja nada, la pantalla lo explica y ofrece salida (no un hueco)",
      typed === true &&
        emptied.anchor === "bandeja" &&
        emptied.rows === 0 &&
        emptied.text.length > 40 &&
        emptied.hasClear,
      JSON.stringify(emptied).slice(0, 180)
    );
  }

  if (screen.key === "alistamiento") {
    check(
      "§16 — la Mesa muestra las líneas de cada orden sin abrir el detalle (es una mesa, no una tabla)",
      s.cards.length >= 1 && s.items === s.cards.length,
      `${s.items} listas de ítems / ${s.cards.length} tarjetas`
    );
    check(
      "§12 — cada tarjeta declara su nivel de urgencia derivado del umbral",
      s.urgencies.length >= 1 &&
        s.urgencies.every((u) => ["fresh", "working", "late"].includes(u)),
      s.urgencies.join(",")
    );
    check(
      "§12 — la Mesa avisa de las órdenes demoradas",
      s.stagnation !== null && s.stagnation >= 1,
      `stagnation=${s.stagnation}`
    );
  }

  if (screen.key === "despacho") {
    check(
      "§8 — el Despacho separa «se entregan en el local» de «salen con transporte»",
      s.blocks.join(",") === "despacho-local,despacho-transporte",
      s.blocks.join(",")
    );
    check(
      "§8 — el bloque con transporte es el único que necesita destino",
      s.destinations >= 1,
      `${s.destinations} destinos`
    );
    check(
      "§13 — una orden DELIVERED sigue en Despacho (llegó, pero falta cerrarla)",
      s.statuses.includes("DELIVERED"),
      s.statuses.join(",")
    );
  }

  if (screen.key === "programados") {
    check(
      "§15 — las programadas se agrupan por jornada",
      s.days.length >= 1,
      s.days.join(",")
    );
    check(
      "§15 — se distingue la fecha comprometida de su situación temporal",
      s.scheduleStates.length >= 1 &&
        s.scheduleStates.every((st) => ["upcoming", "due_soon", "overdue"].includes(st)),
      s.scheduleStates.join(",")
    );
  }

  if (screen.key === "historial") {
    check(
      "§10 — el Historial muestra cuándo se cerró cada orden y su motivo",
      s.closed >= 1 && s.reasons >= 1,
      `${s.closed} cierres · ${s.reasons} motivos`
    );
    check(
      "§10 — hay un visor de auditoría en línea, con el recorrido completo",
      s.audit === true && s.auditReason === true && s.timeline >= 1,
      `timeline=${s.timeline}`
    );

    /* ── El visor rediseñado: de narrar a auditar ─────────────────────────
     *
     * ⚠️ El visor anterior era una pila de cuatro pares rótulo/valor y, debajo,
     * la misma línea de tiempo del detalle. Tenía tres defectos de **diseño**, no
     * de contenido, y las tres aserciones siguientes los fijan uno a uno:
     *
     *   1. No decía cuánto costó nada → ahora cada tramo declara sus minutos y el
     *      ciclo entero su total.
     *   2. No juzgaba → ahora contrasta cada tramo con el umbral configurado (§17)
     *      y destaca el peor.
     *   3. No enseñaba lo que el contrato ya guardaba → ahora salen la referencia
     *      externa del actor y los metadatos del cambio.
     */

    check(
      "§10 — el visor dice cuánto duró el ciclo entero (abrió → cerró)",
      s.auditCycle !== null && Number(s.auditCycle) > 0,
      `ciclo=${s.auditCycle} min`
    );

    /**
     * ⚠️ Se admite **un** tramo sin minutos, y tiene que ser el último: el estado
     * actual de la orden no ha terminado, así que medirlo daría una cifra que
     * crece sola con el reloj. Cualquier otro tramo sin minutos sería un hueco.
     */
    const measuredVisits = s.visits.filter((v) => v.minutes !== null && v.minutes !== "");
    check(
      "§10 — cada tramo cerrado del recorrido declara cuánto duró",
      s.visits.length >= 2 && measuredVisits.length === s.visits.length - 1,
      `${measuredVisits.length} tramos medidos de ${s.visits.length} · ${s.visits
        .map((v) => `${v.status}=${v.minutes ?? "abierto"}`)
        .join(" ")}`
    );

    check(
      "§10 — el visor JUZGA los tramos contra el umbral de la tienda, no sólo los cuenta",
      s.visits.some((v) => v.long === "true") && s.auditOverrun !== null,
      `largos=${s.visits
        .filter((v) => v.long === "true")
        .map((v) => v.status)
        .join(",")} · tramo destacado=${s.auditOverrun}`
    );

    check(
      "§10 — el visor enseña la referencia externa del actor (lo que el contrato guardaba y nadie mostraba)",
      s.actorRefs >= 1,
      `${s.actorRefs} referencias`
    );
    check(
      "§10 — y los metadatos de cada cambio (canal, pago, regla)",
      s.metadata >= 1,
      `${s.metadata} metadatos`
    );
  }
}

/* ── §8 — la modalidad que no usa transporte no ofrece tránsito ────────── */

const noTransit = await (async () => {
  await openSection("despacho");
  const number = await evaluate(`(() => {
    const block = document.querySelector('[data-dispatch-block="despacho-local"]');
    const tr = [...(block?.querySelectorAll('tbody tr') || [])]
      .find(r => r.querySelector('[data-order-status]')?.getAttribute('data-order-status') === 'READY');
    return tr?.querySelector('[data-order-row]')?.getAttribute('data-order-row') ?? null;
  })()`);
  if (!number) return { skipped: "no hay orden READY en el bloque local" };

  // ⚠️ Sin guarda, un `null` aquí aborta el proceso y la guarda se lleva por
  // delante todas las secciones que vienen después. Si la fila no aparece, la
  // aserción debe ponerse roja —no reventar—.
  const opened = await evaluate(clickFirst(`[data-order-row="${number}"]`));
  if (!opened) return { number, opened: false };
  await sleep(1000);
  const actions = await evaluate(
    `[...document.querySelectorAll('[data-order-detail] [data-order-action]')].map(s => s.getAttribute('data-order-action'))`
  );
  await evaluate(`(() => {
    const d = document.querySelector('[data-order-detail]');
    const btn = d && [...d.querySelectorAll('button')].find(b => (b.getAttribute('aria-label')||'') === 'Cerrar detalle');
    if (btn) btn.click();
    return true;
  })()`);
  await sleep(800);
  return { number, opened: true, actions };
})();

check(
  "§8 — una orden del bloque local (recogida / en sitio / servicio) no ofrece pasar a tránsito",
  noTransit.opened === true &&
    Array.isArray(noTransit.actions) &&
    noTransit.actions.includes("DELIVERED") &&
    !noTransit.actions.includes("IN_TRANSIT"),
  noTransit.skipped || `${noTransit.number} → ${(noTransit.actions || []).join(",") || "sin acciones"}`
);

/* ── §14 — el detalle es una superficie real y sus acciones se derivan ───
 *
 * ⚠️ Se abre desde la **Bandeja**, no desde donde quedó el ratón: la primera fila
 * de la Bandeja es una orden `PENDING` de WhatsApp, que es justo el caso que hay
 * que probar (no debe ofrecer saltarse el flujo, y su origen trae referencia de
 * hilo). Abriendo la primera fila de cualquier pantalla, la aserción hablaría de
 * otra orden y afirmaría cosas que no ha comprobado.
 */

await openSection("bandeja");
const inboxOpened = await evaluate(clickFirst("[data-orders-inbox] [data-order-row]"));
await sleep(1000);
const detail = await evaluate(`(() => {
  const d = document.querySelector('[data-order-detail]');
  if (!d) return null;
  return {
    number: d.getAttribute('data-order-detail'),
    statusChip: !!d.querySelector('[data-order-status]'),
    actions: [...d.querySelectorAll('[data-order-action]')].map(e => e.getAttribute('data-order-action')),
    sections: [...d.querySelectorAll('[data-detail-section]')].map(e => e.getAttribute('data-detail-section')),
    items: d.querySelectorAll('[data-order-item]').length,
    hasTimeline: !!d.querySelector('[data-order-timeline]'),
    timelineEntries: d.querySelectorAll('[data-timeline-entry]').length,
    origin: d.querySelector('[data-order-origin]')?.getAttribute('data-order-origin') ?? null,
    originText: (d.querySelector('[data-order-origin]')?.textContent || '').replace(/\\s+/g, ' ').trim(),
    actionTexts: [...d.querySelectorAll('[data-order-action]')].map(e => (e.textContent || '').replace(/\\s+/g, ' ').trim()),
  };
})()`);
check(
  "§14 — el detalle es una superficie real",
  detail !== null,
  inboxOpened ? JSON.stringify(detail)?.slice(0, 120) : "la Bandeja no ofreció ninguna fila que abrir"
);
if (detail) {
  check("§10 — el detalle muestra el historial de la orden", detail.hasTimeline && detail.timelineEntries >= 1, `${detail.timelineEntries} entradas`);
  check("§14 — el detalle lista los ítems de la orden", detail.items >= 1, `${detail.items}`);
  check("§14 — el detalle muestra el estado de la orden", detail.statusChip);
  check(
    "§14 — las acciones del detalle se derivan del estado (no hay una lista fija)",
    Array.isArray(detail.actions) && detail.actions.length > 0,
    detail.actions.join(",")
  );
  check(
    "§14 — una orden PENDIENTE no ofrece 'Entregar' ni 'Completar'",
    !detail.actions.includes("DELIVERED") && !detail.actions.includes("COMPLETED"),
    detail.actions.join(",")
  );
  check(
    "§18 — el detalle declara el Origen de la orden en su propia sección",
    detail.sections.includes("origin") && detail.origin !== null,
    `${detail.origin} :: ${detail.sections.join(",")}`
  );
  check(
    "§18 — el origen nombra la referencia del hilo (origen trazable)",
    /wa_conv_\d+|cart_\d+|ticket_\d+|erp_doc_\d+/.test(detail.originText),
    detail.originText.slice(0, 100)
  );
  check(
    "§27 — cada acción dice qué ocurre al ejecutarla (no sólo el verbo)",
    detail.actionTexts.length === detail.actions.length &&
      detail.actionTexts.every(t => t.length > 12),
    detail.actionTexts.join(" | ").slice(0, 120)
  );
}

// Cerrar el detalle.
await evaluate(`(() => {
  const d = document.querySelector('[data-order-detail]');
  const btn = d && [...d.querySelectorAll('button')].find(b => (b.getAttribute('aria-label')||'') === 'Cerrar detalle');
  if (btn) btn.click();
  return true;
})()`);
await sleep(800);

/* ── §27 — el cierre se ve (E2E) ─────────────────────────────────────────
 *
 * El defecto reportado: al cerrar una orden, la fila desaparecía de la operación
 * sin confirmación ni rastro. Aquí se recorre el cierre de verdad —una orden en
 * tránsito, `IN_TRANSIT → DELIVERED → COMPLETED`— y se exige que la pantalla
 * **confirme** el movimiento y ofrezca ir a ver la orden cerrada, y que ese
 * ofrecimiento **lleve de verdad** a donde vive ahora.
 */
const closure = await (async () => {
  await openSection("despacho");

  const transitNumber = await evaluate(`(() => {
    const block = document.querySelector('[data-dispatch-block="despacho-transporte"]');
    const tr = [...(block?.querySelectorAll('tbody tr') || [])]
      .find(r => r.querySelector('[data-order-status]')?.getAttribute('data-order-status') === 'IN_TRANSIT');
    return tr?.querySelector('[data-order-row]')?.getAttribute('data-order-row') ?? null;
  })()`);
  if (!transitNumber) return { skipped: "no hay orden IN_TRANSIT en el bloque de transporte" };

  const closureOpened = await evaluate(clickFirst(`[data-order-row="${transitNumber}"]`));
  if (!closureOpened) return { skipped: `la fila #${transitNumber} no se pudo abrir` };
  await sleep(1000);

  // Se avanza con la acción que más acerca al cierre, sin saltarse ningún paso
  // válido: el detalle sólo ofrece transiciones que la máquina de estados admite.
  const walked = [];
  for (let i = 0; i < 4; i++) {
    const step = await evaluate(`(() => {
      const d = document.querySelector('[data-order-detail]');
      if (!d) return null;
      const available = [...d.querySelectorAll('[data-order-action]')].map(s => s.getAttribute('data-order-action'));
      const next = ['COMPLETED','DELIVERED','IN_TRANSIT'].find(a => available.includes(a));
      if (!next) return { available, done: true };
      const btn = d.querySelector('[data-order-action-button="' + next + '"]');
      if (btn) btn.click();
      return { picked: next, available };
    })()`);
    if (!step || step.done) break;
    walked.push(step.picked);

    /**
     * ⚠️ Se espera a que el detalle **cambie de acciones**, no a un reloj. La
     * transición es asíncrona: con un `sleep` fijo, el paso siguiente podía pulsar
     * "Completar" mientras "Marcar como entregada" seguía en vuelo, y la segunda
     * transición se rechazaba por partir de un estado ya obsoleto. El recorrido
     * quedaba a medias —`walked` decía "DELIVERED, COMPLETED" pero la orden sólo
     * había llegado a Entregada— y la guarda culpaba al aviso de movimiento, que
     * funcionaba perfectamente.
     */
    const before = JSON.stringify(step.available);
    const changed = await waitUntil(
      `JSON.stringify([...document.querySelectorAll('[data-order-detail] [data-order-action]')].map(s => s.getAttribute('data-order-action'))) !== ${JSON.stringify(before)}`,
      { timeoutMs: 8000 }
    );
    if (!changed) break;
    if (step.picked === "COMPLETED") break;
  }

  await evaluate(`(() => {
    const d = document.querySelector('[data-order-detail]');
    const btn = d && [...d.querySelectorAll('button')].find(b => (b.getAttribute('aria-label')||'') === 'Cerrar detalle');
    if (btn) btn.click();
    return true;
  })()`);
  await sleep(900);

  const band = await evaluate(`(() => {
    const b = document.querySelector('[data-order-movement]');
    if (!b) return null;
    return {
      to: b.getAttribute('data-order-movement'),
      text: (b.textContent || '').replace(/\\s+/g, ' ').trim(),
      role: b.getAttribute('role'),
      seeLabel: [...b.querySelectorAll('button')].map(x => (x.textContent || '').trim()).join(' | '),
      inDispatch: !!b.closest('[data-orders-dispatch]'),
    };
  })()`);

  // El ofrecimiento tiene que llevar a donde vive ahora la orden.
  await evaluate(`(() => {
    const b = document.querySelector('[data-order-movement]');
    const btn = b && [...b.querySelectorAll('button')].find(x => /^Ver en /.test((x.textContent || '').trim()));
    if (btn) btn.click();
    return true;
  })()`);
  await sleep(1300);

  /**
   * ⚠️ El conteo de «Completadas» se lee **en Historial**, después del salto: en
   * Despacho esa fase no existe, así que leerlo antes devolvía `undefined` y la
   * aserción no probaba nada sobre la pantalla que sí cuenta los cierres.
   */
  const landed = await evaluate(`(() => ({
    section: document.querySelector('[data-orders-section][aria-current="page"]')?.getAttribute('data-orders-section') ?? null,
    hasHistory: !!document.querySelector('[data-orders-history]'),
    hasOrder: !!document.querySelector('[data-orders-history] [data-order-row="${transitNumber}"]'),
    completedCount: Number(document.querySelector('[data-order-filter="completed"]')?.getAttribute('data-order-filter-count')),
    url: location.pathname + location.search,
  }))()`);

  return { transitNumber, walked, band, landed };
})();

check(
  "§27 — cerrar una orden se confirma en la pantalla (no desaparece en silencio)",
  Boolean(closure.band) && closure.band.to === "COMPLETED" && closure.band.inDispatch === true,
  JSON.stringify(closure).slice(0, 220)
);
check(
  "§27 — la confirmación dice de qué estado a cuál y ofrece ir a verla",
  Boolean(closure.band) &&
    closure.band.role === "status" &&
    /pasó de/i.test(closure.band.text) &&
    /^Ver en /.test(closure.band.seeLabel),
  closure.band?.text?.slice(0, 140)
);
check(
  "§27 — el ofrecimiento nombra el destino correcto («Ver en Historial y auditoría»)",
  /Ver en Historial y auditoría/.test(closure.band?.seeLabel || ""),
  closure.band?.seeLabel
);
check(
  "§27 — tras cerrar, Historial cuenta la orden como completada",
  closure.landed?.completedCount === 3,
  `filtro Completadas=${closure.landed?.completedCount}`
);
check(
  "§27 — «Ver en …» lleva de verdad a donde vive ahora la orden (y lo publica en la URL)",
  closure.landed?.section === "historial" &&
    closure.landed?.hasHistory === true &&
    closure.landed?.hasOrder === true &&
    /section=historial/.test(closure.landed?.url || ""),
  JSON.stringify(closure.landed)
);

/* ── Canales (§18) y Configuración del flujo (§17) ─────────────────────── */

check("se puede abrir Canales", (await openSection("canales")) === true);
const channels = await evaluate(`(() => {
  const root = document.querySelector('[data-channels-view]');
  return {
    root: !!root,
    boundary: !!root?.querySelector('[data-channels-boundary]'),
    cards: [...(root?.querySelectorAll('[data-channel-card]') || [])].map(c => c.getAttribute('data-channel-card')),
    volumes: (root?.querySelectorAll('[data-channel-volume]') || []).length,
    buttons: [...(root?.querySelectorAll('button') || [])]
      .map(b => (b.textContent || '').replace(/\\s+/g, ' ').trim()).filter(Boolean),
    fields: (root?.querySelectorAll('input, select, textarea') || []).length,
    text: (root?.textContent || '').replace(/\\s+/g, ' '),
  };
})()`);
check(
  "§18 — Canales refleja el origen de las órdenes de la sede",
  channels.root === true && channels.cards.length >= 3,
  `${channels.cards.join(",")}`
);
/**
 * ⚠️ Lo que se prohíbe no es la **palabra** "webhook" —la nota de frontera la
 * nombra justamente para decir que no vive aquí—, sino la **capacidad**: que esta
 * pantalla ofrezca conectar, autenticar o guardar credenciales. Se comprueba por
 * los controles que existen, no por el texto que se lee.
 */
check(
  "§18/§28 — Canales no ofrece ni un control propio de canal (ni conexión, ni credenciales)",
  // ⚠️ Se comprueba que el único botón es el **puente** a la configuración de sede
  // —el destino se llama así en pantalla, no "Ajustes de Sede"— y que no hay ni un
  // campo de formulario. La aserción anterior buscaba el literal viejo y llevaba
  // tiempo en rojo por una copia, no por una fuga de dominio.
  channels.buttons.length >= 1 &&
    channels.buttons.every(t => /configuración de sede/i.test(t)) &&
    channels.fields === 0 &&
    !/Embedded Signup|wabaId|access_token|Bearer /i.test(channels.text),
  `botones=[${channels.buttons.join(" | ")}] campos=${channels.fields}`
);
check(
  "§26 — Canales dice en pantalla de quién es la configuración (nota de frontera)",
  channels.boundary === true
);
check(
  "§18 — cada origen declara su volumen real, separando lo vivo de lo cerrado",
  channels.volumes >= channels.cards.length && /en curso · \d+ cerradas/.test(channels.text),
  `${channels.volumes} volúmenes`
);

check("se puede abrir Configuración del flujo", (await openSection("configuracion")) === true);
const config = await evaluate(`(() => {
  const root = document.querySelector('[data-orders-config]');
  const text = (root?.textContent || '').replace(/\\s+/g, ' ');
  return {
    root: !!root,
    rows: root ? root.querySelectorAll('[data-settings-row]').length : 0,
    numbers: [...(root?.querySelectorAll('input[type="number"]') || [])].map(i => ({
      label: i.getAttribute('aria-label'),
      value: i.value,
    })),
    toggles: [...(root?.querySelectorAll('[role="switch"]') || [])].map(t => ({
      label: t.getAttribute('aria-label'),
      state: t.getAttribute('data-state'),
      disabled: t.disabled === true,
    })),
    /**
     * ⚠️ El efecto **medido** de cada ajuste. Es la pieza que faltaba en toda la
     * pantalla: una descripción explica la regla; esto responde "¿y ahora mismo?".
     * Sin ello, comprobar si un umbral está bien puesto obligaba a salir de aquí
     * e ir a contar a otra pantalla.
     */
    effects: [...(root?.querySelectorAll('[data-orders-effect]') || [])].map(e => ({
      anchor: e.getAttribute('data-orders-effect'),
      text: (e.textContent || '').replace(/\\s+/g, ' ').replace('Efecto ahora mismo', '').trim(),
    })),
    text,
  };
})()`);
check(
  "§17 — la Configuración del flujo usa el vocabulario de ajustes y edita parámetros propios de Pedidos",
  config.root === true && config.rows >= 4 && config.numbers.length >= 2,
  `${config.rows} filas · ${config.numbers.map(n => n.value).join("/")}`
);
check(
  "§17 — no reimplementa la configuración de la Tienda (es un puente a Ajustes de Sede)",
  /Abrir la configuración de sede/.test(config.text) && !/contraseña|password|correo electrónico/i.test(config.text),
  ""
);

/**
 * ⚠️ Lo que se le reprochaba a esta pantalla era que **no se distinguía qué se
 * puede cambiar de qué se está documentando**: cinco ajustes reales rodeados de
 * prosa —una sección entera que era una tabla de referencia de nueve filas, otra
 * que narraba el ciclo de vida—, más un bloque de datos de la sede que no se
 * edita aquí. Un ajuste entre veinte párrafos no se encuentra.
 */
check(
  "§17 — la pantalla no documenta: no queda ninguna sección de referencia ni de prosa",
  !/Significado de cada estado/i.test(config.text) &&
    !/Ciclo de vida de las órdenes/i.test(config.text) &&
    !/Estado en esta sede/i.test(config.text),
  ""
);
check(
  "§17 — no quedan controles muertos (nada deshabilitado, nada de sólo lectura disfrazado de ajuste)",
  config.toggles.every((t) => t.disabled === false) &&
    (await evaluate("document.querySelectorAll('[data-orders-config] [disabled]').length")) === 0,
  `toggles=${config.toggles.map((t) => `${t.label}=${t.state}${t.disabled ? "(disabled)" : ""}`).join(" ")}`
);

/**
 * ⚠️ **Cada** ajuste lleva su efecto medido, y se exige que sean cinco y que
 * ninguno esté vacío. Un ajuste sin efecto es exactamente el control decorativo
 * que había antes: se guarda un número y ninguna superficie lo lee.
 */
const effectAnchors = config.effects.map((e) => e.anchor);
check(
  "§17 — cada uno de los cinco ajustes dice qué está haciendo AHORA, medido sobre órdenes reales",
  effectAnchors.join(",") ===
    "stagnationMinutes,inboxWaitMinutes,alertOnStagnation,alertOnScheduledOverdue,groupScheduledByDay" &&
    config.effects.every((e) => e.text.length > 20),
  config.effects.map((e) => `${e.anchor}="${e.text.slice(0, 48)}"`).join(" | ")
);

/**
 * ⚠️ Y el efecto tiene que ser **una medición**, no una frase fija: se comprueba
 * que los dos umbrales llevan cifras dentro del texto. Un efecto redactado sin
 * números —"las órdenes demoradas se marcan"— pasaría la aserción anterior y no
 * diría nada del estado de la sede.
 */
check(
  "§17 — el efecto de un umbral lleva cifras: es una medición, no una descripción de la regla",
  config.effects
    .filter((e) => e.anchor === "stagnationMinutes" || e.anchor === "inboxWaitMinutes")
    .every((e) => /\d/.test(e.text)),
  config.effects
    .filter((e) => e.anchor === "stagnationMinutes" || e.anchor === "inboxWaitMinutes")
    .map((e) => `${e.anchor}="${e.text}"`)
    .join(" | ")
);

/**
 * §17 — el umbral **persiste** y las pantallas reaccionan a la vez.
 *
 * ⚠️ Se elige 240 min porque **discrimina**: las dos órdenes en alistamiento llevan
 * 33 y 52 min, así que con el umbral de fábrica (25) son "Demoradas" y con 240 no
 * lo son. Un valor que diera el mismo resultado en ambos casos no probaría nada.
 */
const threshold = await (async () => {
  const typed = await evaluate(`(() => {
    const input = [...document.querySelectorAll('input[type="number"]')]
      .find(i => (i.getAttribute('aria-label') || '').includes('demora'));
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '240');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  await sleep(700);

  const stored = await evaluate(`(() => {
    const raw = localStorage.getItem('necto_orders_flow_v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.['biz-orders']?.stagnationMinutes ?? null;
  })()`);

  await openSection("alistamiento");
  const after = await evaluate(`(() => ({
    late: Number(document.querySelector('[data-order-filter="late"]')?.getAttribute('data-order-filter-count')),
    fresh: Number(document.querySelector('[data-order-filter="fresh"]')?.getAttribute('data-order-filter-count')),
    all: Number(document.querySelector('[data-order-filter="all"]')?.getAttribute('data-order-filter-count')),
    cards: document.querySelectorAll('[data-preparation-card]').length,
    urgencies: [...new Set([...document.querySelectorAll('[data-preparation-card]')].map(c => c.getAttribute('data-order-urgency')))],
  }))()`);

  // Restaurar de fábrica y comprobar que el cambio también viaja de vuelta.
  await openSection("configuracion");
  await evaluate(`(() => {
    const btn = [...document.querySelectorAll('button')].find(b => (b.textContent || '').trim() === 'Restaurar valores por defecto');
    if (btn) btn.click();
    return true;
  })()`);
  await sleep(800);
  const restored = await evaluate(`(() => {
    const raw = localStorage.getItem('necto_orders_flow_v1');
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.['biz-orders']?.stagnationMinutes ?? null;
  })()`);

  return { typed, stored, after, restored };
})();

check(
  "§17 — el umbral de demora se persiste por sede (no es un control decorativo)",
  threshold.typed === true && threshold.stored === 240,
  String(threshold.stored)
);
const alistBefore = screensRead.alistamiento?.filters.find((f) => f.key === "late")?.count;
check(
  "§17 — subir el umbral a 240 min reencuadra Alistamiento: de 2 demoradas a 0, todas en «Recién iniciada»",
  alistBefore === 2 &&
    threshold.after.late === 0 &&
    threshold.after.fresh === 3 &&
    threshold.after.cards === 3 &&
    threshold.after.urgencies.join(",") === "fresh",
  `antes=${alistBefore} después=${JSON.stringify(threshold.after)}`
);
check(
  "§17 — restaurar devuelve el umbral de fábrica y lo reescribe",
  threshold.restored === 25,
  String(threshold.restored)
);

/* ── §17 — los dos avisos tienen consumidor (dejaron de ser ajustes muertos) ──
 *
 * ⚠️ `alertOnStagnation` y `alertOnScheduledOverdue` se guardaban y **ninguna
 * pantalla los leía**: eran los dos "ajustes" que se señalaron como mediocres, y
 * con razón — un interruptor que no cambia nada es un adorno. En vez de borrarlos
 * se **conectaron**: cuatro pantallas respetan el primero, y Programados ganó el
 * aviso de vencidas para el segundo.
 *
 * ⚠️ Comprobarlo por el texto del efecto no valdría: el efecto es prosa y podría
 * describir un comportamiento que no existe. Se comprueba por el **DOM de la
 * pantalla destino**: con el aviso apagado la alerta no está, con él encendido
 * está. Eso es lo que separa un ajuste de un rótulo.
 */
const alertSwitch = (label) =>
  `(() => {
    const t = document.querySelector('[data-orders-config] [role="switch"][aria-label="' + ${JSON.stringify(label)} + '"]');
    if (!t) return null;
    t.click();
    return true;
  })()`;

const alertGating = await (async () => {
  const effectOf = (anchor) =>
    evaluate(
      `(document.querySelector('[data-orders-effect="${anchor}"]')?.textContent || '').replace(/\\s+/g, ' ').trim()`
    );
  const stagnationAlert = (screen) =>
    evaluate(`!!document.querySelector('[data-orders-${screen}] [data-orders-stagnation]')`);

  if ((await evaluate("!!document.querySelector('[data-orders-config]')")) !== true) {
    await openSection("configuracion");
  }

  const effectOn = await effectOf("alertOnStagnation");
  const toggledOff = await evaluate(alertSwitch("Avisar de órdenes demoradas"));
  await sleep(700);
  const storedOff = await evaluate(
    `JSON.parse(localStorage.getItem('necto_orders_flow_v1') || '{}')?.['biz-orders']?.alertOnStagnation ?? null`
  );
  const effectOff = await effectOf("alertOnStagnation");

  // Con el aviso apagado, Alistamiento no debe pintar la alerta.
  await openSection("alistamiento");
  const alistOff = await stagnationAlert("preparation");

  // Y con su propio aviso apagado, Programados tampoco señala las vencidas.
  await openSection("configuracion");
  const overdueToggled = await evaluate(alertSwitch("Avisar de programadas vencidas"));
  await sleep(700);
  await openSection("programados");
  const overdueOff = await evaluate("!!document.querySelector('[data-orders-overdue]')");

  // Volver a encenderlo todo **por el camino real** (el interruptor, no el almacén).
  // ⚠️ Con una pausa entre los dos: son dos estados de React que se persisten, y
  // pulsar los dos en el mismo tick deja al segundo leyendo el `checked` del render
  // anterior. Se espera a que el primero se asiente.
  await openSection("configuracion");
  await evaluate(alertSwitch("Avisar de órdenes demoradas"));
  await sleep(500);
  await evaluate(alertSwitch("Avisar de programadas vencidas"));
  await sleep(700);
  const storedBackOn = await evaluate(
    `JSON.parse(localStorage.getItem('necto_orders_flow_v1') || '{}')?.['biz-orders'] ?? null`
  );

  await openSection("alistamiento");
  const alistOn = await stagnationAlert("preparation");
  await openSection("programados");
  const overdueOn = await evaluate("!!document.querySelector('[data-orders-overdue]')");

  return {
    toggledOff,
    storedOff,
    effectOn,
    effectOff,
    alistOff,
    alistOn,
    overdueToggled,
    overdueOff,
    overdueOn,
    storedBackOn,
  };
})();

check(
  "§17 — «Avisar de órdenes demoradas» tiene consumidor: apagado, Alistamiento deja de señalar",
  alertGating.toggledOff === true &&
    alertGating.storedOff === false &&
    alertGating.alistOff === false &&
    alertGating.alistOn === true,
  `apagado → alerta=${alertGating.alistOff} · encendido → alerta=${alertGating.alistOn}`
);
check(
  "§17 — y el efecto del ajuste cambia con él (no es una frase fija)",
  alertGating.effectOn !== alertGating.effectOff &&
    /Encendido/.test(String(alertGating.effectOn)) &&
    /Apagado/.test(String(alertGating.effectOff)),
  `encendido="${String(alertGating.effectOn).slice(0, 60)}" · apagado="${String(alertGating.effectOff).slice(0, 60)}"`
);
check(
  "§17 — «Avisar de programadas vencidas» tiene consumidor: apagado, Programados no señala las vencidas",
  alertGating.overdueToggled === true &&
    alertGating.overdueOff === false &&
    alertGating.overdueOn === true,
  `apagado → aviso=${alertGating.overdueOff} · encendido → aviso=${alertGating.overdueOn}`
);
check(
  "§17 — la guarda deja los dos avisos como los encontró",
  alertGating.storedBackOn?.alertOnStagnation === true &&
    alertGating.storedBackOn?.alertOnScheduledOverdue === true,
  JSON.stringify(alertGating.storedBackOn)
);

/* ── Widget del Dashboard (§25) ───────────────────────────────────────── */

/**
 * ⚠️ Se navega a `?module=dashboard` **explícito**, no a `/app` a secas, y se
 * espera al widget. Dos motivos, y los dos costaron rojos fantasma:
 *
 *  1. La tabla de rutas termina en `<Route path="*" element={<Navigate to="/"/>}>`
 *     y `/` es el hub de franquicias, así que una navegación que llegue antes de
 *     que el router esté montado acaba en `/workspaces` **sin ningún error**. El
 *     widget no está allí, y la aserción se ponía roja hablando de una pantalla que
 *     la guarda ni siquiera había abierto.
 *  2. El Dashboard de la Tienda es un **destino** (`module=dashboard`), no la
 *     ausencia de destino: nombrarlo hace que la aserción diga lo que comprueba.
 */
const dashboardReady = await goto("/app?module=dashboard", "[data-pedidos-widget]");

const widget = await evaluate(`(() => {
  const w = document.querySelector('[data-pedidos-widget]');
  if (!w) return null;
  return {
    stats: [...w.querySelectorAll('[data-pedidos-stat]')].map(s => s.getAttribute('data-pedidos-stat')),
    activity: [...w.querySelectorAll('[data-pedidos-activity]')].length,
    hasLink: (w.textContent || '').includes('Ver pedidos'),
  };
})()`);
check(
  "§25 — el widget de Pedidos se pinta en el Dashboard de la Tienda",
  widget !== null,
  dashboardReady ? "" : "la app no montó el Dashboard en 3 intentos"
);
if (widget) {
  check("§25 — el widget resume la actividad (4 cifras)", widget.stats.length === 4, widget.stats.join(","));
  check("§25 — el widget enlaza al módulo", widget.hasLink);
}

// §25 — la navegación la ejecuta el shell, no el widget.
const beforeNav = await evaluate("!!document.querySelector('[data-orders-module]')");
await evaluate(`(() => {
  const w = document.querySelector('[data-pedidos-widget]');
  const b = w && [...w.querySelectorAll('button')].find(x => (x.textContent||'').includes('Ver pedidos'));
  if (b) b.click();
  return true;
})()`);
await sleep(1600);
const afterNav = await evaluate(`(() => ({
  hasModule: !!document.querySelector('[data-orders-module]'),
  section: document.querySelector('[data-orders-section][aria-current="page"]')?.getAttribute('data-orders-section') ?? null,
}))()`);
check(
  "§25 — «Ver pedidos» lleva al módulo, a su puerta de entrada (el Panel)",
  beforeNav === false && afterNav.hasModule === true && afterNav.section === "panel",
  JSON.stringify(afterNav)
);

/* ── La URL describe la pantalla (§26) ─────────────────────────────────── */

const crumb = await evaluate(`(() => {
  const t = document.body.textContent.replace(/\\s+/g, ' ');
  const i = t.indexOf('Operación');
  return i >= 0 ? t.slice(i, i + 80) : null;
})()`);
check(
  "§26 — el breadcrumb describe la pantalla real (Operación / Pedidos / Panel de pedidos)",
  /Operación\s*Pedidos\s*Panel de pedidos/.test((crumb || "").replace(/\s+/g, " ")),
  String(crumb).slice(0, 90)
);

/* ── Accesibilidad mínima y excepciones ──────────────────────────────── */

/**
 * ⚠️ El Panel **no** tiene buscador ni cabecera de fase, y es correcto: no hay
 * ninguna lista que buscar ni ninguna fase que encabezar. Por eso las aserciones
 * de búsqueda y cabecera se hacen sobre una pantalla de trabajo concreta, no sobre
 * "la pantalla activa" —que tras el widget es el Panel—. Comprobar "la activa" era
 * comprobar la que quedara abierta, que es justo lo que una guarda no debe fijar.
 */
await openSection("bandeja");

const a11y = await evaluate(`(() => ({
  nav: !!document.querySelector('nav[aria-label="Secciones de Pedidos"]'),
  current: !!document.querySelector('[data-orders-section][aria-current="page"]'),
  search: !!document.querySelector('[data-node-id="necto.el.search.input"]'),
  screenHeader: !!document.querySelector('[data-orders-screen-header]'),
}))()`);
check(
  "la barra del módulo declara `aria-label` y la sección activa",
  a11y.nav && a11y.current
);
check(
  "una pantalla de trabajo ofrece búsqueda y cabecera de fase",
  a11y.search && a11y.screenHeader
);

/* ── §26 — la barra lateral: el módulo sigue siendo alcanzable ────────────
 *
 * ⚠️ El módulo podía estar implementado y aun así ser **inalcanzable**: con la
 * barra colapsada (78 px, el estado por defecto) el `MenuItem` de grupo no pintaba
 * a sus hijos, así que el enlace "Pedidos" no estaba en el DOM. Ése era el síntoma
 * real de "selecciono pedidos y no me sale el módulo": no era el módulo, era el
 * acceso. Y ahora hay además sub-destinos que **sólo** pueden pintarse expandida.
 */
await evaluate(`(() => {
  localStorage.setItem('necto_sidebar_open_sections',
    JSON.stringify({ conversacional: true, modulos: true, sede: true }));
  localStorage.setItem('necto_sidebar_expanded', 'false');
  return true;
})()`);
// ⚠️ Con destino explícito y esperando al módulo: ver la nota del widget (§25).
await goto("/app?module=pedidos", "[data-orders-module]");

await evaluate(`(() => {
  const btn = [...document.querySelectorAll('button')]
    .find(b => (b.getAttribute('title') || '') === 'Colapsar barra lateral');
  if (btn && document.querySelector('aside')?.getBoundingClientRect().width > 100) btn.click();
  return true;
})()`);
await sleep(900);

const collapsedNav = await evaluate(`(() => {
  const aside = document.querySelector('aside');
  if (!aside) return null;
  const label = (li) => {
    const t = (li.textContent || '').replace(/\\s+/g, ' ').trim();
    if (t) return t;
    const el = li.querySelector('button, a');
    return (el?.getAttribute('title') || '').trim();
  };
  const lis = [...aside.querySelectorAll('li')];
  const pedidos = lis.find(li => label(li) === 'Pedidos');
  return {
    width: Math.round(aside.getBoundingClientRect().width),
    hasPedidos: !!pedidos,
    subnav: aside.querySelectorAll('[data-orders-sidebar-section]').length,
  };
})()`);

check(
  "§26 — con la barra COLAPSADA el módulo sigue en el DOM",
  collapsedNav?.width < 100 && collapsedNav?.hasPedidos === true,
  JSON.stringify(collapsedNav)
);
check(
  "§26 — colapsada no se listan los ocho sub-destinos (se pintan sólo expandida)",
  collapsedNav?.subnav === 0,
  String(collapsedNav?.subnav)
);

// Expandir por el camino real (el toggle del header) y comprobar los sub-destinos.
await evaluate(`(() => {
  const btn = [...document.querySelectorAll('button')]
    .find(b => (b.getAttribute('title') || '') === 'Expandir barra lateral');
  if (btn) btn.click();
  return true;
})()`);
await sleep(900);

const expandedNav = await evaluate(`(() => {
  const aside = document.querySelector('aside');
  const items = [...(aside?.querySelectorAll('[data-orders-sidebar-section]') || [])]
    .map(b => b.getAttribute('data-orders-sidebar-section'));
  return {
    width: Math.round(aside?.getBoundingClientRect().width ?? 0),
    subnav: items,
    parentLabel: [...(aside?.querySelectorAll('li') || [])]
      .map(li => (li.textContent || '').replace(/\\s+/g, ' ').trim())
      .find(t => t === 'Pedidos') ?? null,
  };
})()`);
check(
  "§26 — expandida, la barra lateral lista los ocho sub-destinos de Pedidos, en orden",
  expandedNav.subnav.join(",") === EXPECTED_SECTIONS,
  expandedNav.subnav.join(",")
);
check(
  "§26 — el destino padre sigue llamándose exactamente «Pedidos» (los hijos son hermanos, no anidados)",
  expandedNav.parentLabel === "Pedidos",
  String(expandedNav.parentLabel)
);

// Un sub-destino de la barra lateral lleva a su pantalla.
const subnavJump = await evaluate(`(() => {
  const b = document.querySelector('[data-orders-sidebar-section="programados"]');
  if (!b) return false;
  b.click();
  return true;
})()`);
await sleep(1400);
const subnavLanded = await evaluate(`(() => ({
  section: document.querySelector('[data-orders-section][aria-current="page"]')?.getAttribute('data-orders-section') ?? null,
  scheduled: !!document.querySelector('[data-orders-scheduled]'),
  url: location.pathname + location.search,
}))()`);
check(
  "§26 — pulsar un sub-destino de la barra lateral abre esa pantalla del módulo",
  subnavJump === true &&
    subnavLanded.section === "programados" &&
    subnavLanded.scheduled === true &&
    /section=programados/.test(subnavLanded.url),
  JSON.stringify(subnavLanded)
);

check(
  "sin excepciones de runtime",
  exceptions.length === 0,
  exceptions.join(" | ").slice(0, 400)
);

console.log(`\n===== RESULTADO PEDIDOS: ${fails === 0 ? "OK" : fails + " FALLOS"} =====`);
ws.close();
process.exit(fails === 0 ? 0 : 1);
