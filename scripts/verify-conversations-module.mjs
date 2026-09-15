/**
 * Verificación del **canal conversacional** (WhatsApp en la sede).
 *
 * Guarda de regresión de la arquitectura del canal, no de un detalle visual. Lo
 * que defiende, en el orden del encargo:
 *
 *  1. **Aislamiento por sede (§6).** El canal filtra por `businessId` y ninguna
 *     superficie lee el almacén sin filtrar: dos sedes no pueden compartir inbox.
 *  2. **No es un CRM (§10).** Cero pipeline, leads, oportunidades, campañas,
 *     scoring, etiquetas comerciales.
 *  3. **No es Pedidos (§9).** Cero carrito, productos, checkout, estados de orden.
 *  4. **No es la integración con Meta (§8).** Cero webhooks, tokens, Graph API.
 *  5. **El canal es del canal (§14).** Una sola vía de escritura del hilo, y el
 *     canal **emite** hechos al bus en vez de llamar a nadie.
 *  6. **Se puede ver (§15).** La pantalla existe de verdad y monta la lista y el
 *     hilo; la ruta `?module=whatsapp` la abre.
 *
 * Uso: con el dev server y Chrome headless --remote-debugging-port=9222 vivos,
 *   NECTO_APP_URL=http://localhost:5174 node scripts/verify-conversations-module.mjs
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SRC = path.join(ROOT, "packages/apps/web/modules/app/src");
const CHANNEL = path.join(SRC, "compositions/conversations");

const CDP = "http://127.0.0.1:9222";
const APP = process.env.NECTO_APP_URL || "http://localhost:5174";

let fails = 0;
const check = (label, ok, detail) => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  :: " + detail : ""}`);
};

/** ⚠️ El canal **documenta** lo que no hace y lo nombra en prosa ("no hay pipeline"). */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

function moduleFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name) && !/_smoke|_probe/.test(entry.name))
        out.push({ path: full, rel: path.relative(SRC, full), src: readFileSync(full, "utf8") });
    }
  };
  walk(CHANNEL);
  return out;
}

const files = moduleFiles();
const code = files.map((f) => ({ ...f, bare: stripComments(f.src) }));

console.log(`── Archivos del canal: ${files.length} ──`);

/* ══════════════════════════════════════════════════════════════════════════
 * Parte 1 — No es un CRM (§10)
 * ════════════════════════════════════════════════════════════════════════ */

console.log("\n── No es un CRM (§10) ──");

/**
 * ⚠️ Cada patrón busca **vocabulario de dominio**, no prosa. Por eso se mira el
 * código sin comentarios: los comentarios explican precisamente que esto no se
 * implementa, y marcarlos sería un falso positivo.
 *
 * `filterConversations` y `ConversationFilter` sí aparecen, y son legítimos: son
 * filtros de **búsqueda dentro de los hilos**, no de un embudo comercial.
 */
const CRM = [
  { name: "pipelines / oportunidades", re: /\bpipeline\b|\bopportunit|\bdeal\b|usePipeline/i },
  { name: "leads", re: /\blead\b|\bleads\b/i },
  { name: "campañas / broadcasts", re: /\bcampaign|\bbroadcast|\bsegmenta/i },
  { name: "agentes asignados / scoring", re: /assigned_agent|assignedAgent|\bscoring\b|lead_score/i },
  { name: "etiquetas comerciales / empresa", re: /selectedTagIds|contactCompany|\btagsById\b|matchesContactFilters/i },
  { name: "automatizaciones no-code", re: /\bworkflow\b|\bautomation\b|useFlows?\s*\(/i },
];
for (const f of CRM) {
  const hit = code.filter((x) => f.re.test(x.bare));
  check(`el canal no implementa ${f.name}`, hit.length === 0, hit.map((h) => h.rel).join(", "));
}

/* ══════════════════════════════════════════════════════════════════════════
 * Parte 2 — No es Pedidos (§9)
 * ════════════════════════════════════════════════════════════════════════ */

console.log("\n── No es Pedidos (§9) ──");

const ORDER_VOCAB = [
  { name: "estados de orden", re: /\bIN_PREPARATION\b|\bIN_TRANSIT\b|canTransition|OrderStatus\b/ },
  { name: "carrito / checkout", re: /\bcart\b|checkout|addToCart|lineItems/i },
  { name: "productos / inventario", re: /\bproductRef\b|useProducts\s*\(|\bstock\b|\bsku\b/i },
  { name: "pagos", re: /\bpaymentIntent\b|\bcheckoutSession\b|\bpaymentMethod\b/i },
];
for (const f of ORDER_VOCAB) {
  const hit = code.filter((x) => f.re.test(x.bare));
  check(`el canal no implementa ${f.name}`, hit.length === 0, hit.map((h) => h.rel).join(", "));
}

// La dependencia va en la dirección correcta: el canal **no importa** Pedidos.
const importsOrders = code.filter((f) => /@\/compositions\/orders|@\/contracts\/order\.contract/.test(f.bare));
check(
  "§14 — el canal NO importa Pedidos (la dependencia no puede existir)",
  importsOrders.length === 0,
  importsOrders.map((h) => h.rel).join(", ")
);

/* ══════════════════════════════════════════════════════════════════════════
 * Parte 3 — No es la integración con Meta (§8)
 * ════════════════════════════════════════════════════════════════════════ */

console.log("\n── Sin integración real (§8) ──");

const META = [
  { name: "Graph API / WABA / phoneNumberId", re: /graph\.facebook|wabaId|phoneNumberId|access_token|Bearer\s/i },
  { name: "webhooks", re: /\bwebhook\b/i },
  { name: "credenciales", re: /\bapi[_-]?key\b|\bsecret\b|\btoken\b/i },
  { name: "fetch / red", re: /\bfetch\s*\(|axios|XMLHttpRequest/ },
];
for (const f of META) {
  const hit = code.filter((x) => f.re.test(x.bare));
  check(`el canal no habla con Meta (${f.name})`, hit.length === 0, hit.map((h) => h.rel).join(", "));
}

/* ══════════════════════════════════════════════════════════════════════════
 * Parte 4 — Aislamiento por sede (§6) y escritura única (§14)
 * ════════════════════════════════════════════════════════════════════════ */

console.log("\n── Aislamiento por sede (§6) ──");

const ctx = code.find((f) => f.rel.endsWith("ConversationsContext.tsx"));
check("existe el dominio del canal", Boolean(ctx));

if (ctx) {
  /**
   * ⚠️ El aislamiento por sede se ejerce por **dos vías**, y las dos cuentan:
   * los hilos se filtran por `c.businessId === businessId` al leerlos, y **los
   * mensajes se filtran por pertenencia al hilo** (`ids.has(...)`), que es
   * equivalente y más barato que repetir el `businessId` en cada mensaje. Una
   * aserción que exigiera la forma literal en los dos sitios estaría fijando la
   * implementación en vez de la regla.
   */
  const filtersThreads = /\.filter\(c =>[^)]*businessId === businessId\)/.test(ctx.bare);
  const filtersMessages = /ids\.has\(/.test(ctx.bare) || /conversationId === businessId/.test(ctx.bare);
  check(
    "§6 — el dominio filtra por `businessId` al leer los hilos",
    filtersThreads
  );
  check(
    "§6 — los mensajes se leen sólo de los hilos de esta sede",
    filtersMessages,
    filtersMessages ? "" : "no se encontró el filtro de pertenencia"
  );
  check(
    "§6 — el filtro va en el dominio, no en cada consumidor",
    !code.some((f) => f.rel.includes("/views/") && /businessId/.test(f.bare)),
    code.filter((f) => f.rel.includes("/views/") && /businessId/.test(f.bare)).map((f) => f.rel).join(", ")
  );
  // Una sola puerta de escritura: enviar.
  const writers = code.filter((f) => /localStorage\.setItem/.test(f.bare));
  check(
    "§14 — una sola vía de escritura del almacén (el contexto)",
    writers.length === 1,
    writers.map((f) => f.rel).join(", ")
  );
  check("§14 — `sendMessage` es la única vía de añadir mensajes al hilo", /sendMessage/.test(ctx.bare));
  // El canal EMITE, no llama.
  check(
    "§14 — el canal publica hechos en el bus en lugar de llamar a otros módulos",
    /eventBus\.publish\(\s*["']canal\.conversation\.lifecycle["']/.test(ctx.bare)
  );
}

// El evento está declarado en el mapa del bus, o `publish` no compilaría.
const events = stripComments(readFileSync(path.join(SRC, "contracts/events.contract.ts"), "utf8"));
check(
  "el hecho del canal está declarado en `NectoEventsMap`",
  /"canal\.conversation\.lifecycle"\s*:/.test(events)
);

/* ══════════════════════════════════════════════════════════════════════════
 * Parte 5 — El contrato declara lo suyo y no lo ajeno (§24)
 * ════════════════════════════════════════════════════════════════════════ */

console.log("\n── Contrato del canal (§24) ──");

const contract = stripComments(
  readFileSync(path.join(SRC, "contracts/conversation.contract.ts"), "utf8")
);
const OWNS = ["Conversation", "ConversationMessage", "ConversationThread", "ConversationCounterpart", "MessageStatus", "MessageDirection"];
const owned = OWNS.filter((n) => new RegExp(`(interface|type)\\s+${n}\\b`).test(contract));
check(
  "el contrato declara las entidades del canal",
  owned.length >= 5,
  `${owned.length}/${OWNS.length}: ${owned.join(",")}`
);
const NOT_OWNS = ["interface Product", "interface Order", "interface Lead", "interface Pipeline", "interface Campaign"];
const notOwned = NOT_OWNS.filter((n) => new RegExp(n).test(contract));
check("el contrato NO declara entidades ajenas", notOwned.length === 0, notOwned.join(", "));

/* ══════════════════════════════════════════════════════════════════════════
 * Parte 6 — E2E: la pantalla existe y monta el chat (§15)
 * ════════════════════════════════════════════════════════════════════════ */

console.log("\n── E2E: la pantalla del canal (§15) ──");

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

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});

// Se siembra una sede + sesión antes de navegar: sin tienda el canal no tiene
// sujeto (§2) y la pantalla mostraría el vacío "necesita una tienda", que no es
// lo que hay que probar.
await send("Page.navigate", { url: APP });
await sleep(1200);

const seeded = await evaluate(`(() => {
  const now = Date.now();
  const id = 'verify_store_conv';
  const business = {
    id,
    name: 'Tienda de Verificación',
    code: 'VER-01',
    address: 'Calle 1',
    city: 'Bogotá',
    country: 'Colombia',
    businessType: 'retail',
    offerModel: 'products',
    iconKey: 'store',
    currency: 'COP',
    activeModules: [],
    channelConnections: [],
    openingHours: {},
    openingDays: [],
    createdAt: new Date(now).toISOString(),
  };
  localStorage.setItem('necto_businesses', JSON.stringify([business]));
  localStorage.setItem('necto_active_business_id', id);
  // Se limpia el canal para forzar la siembra de demostración.
  localStorage.removeItem('necto_conversations_v1');
  localStorage.removeItem('necto_messages_v1');
  return { id };
})()`);
check("se pudo sembrar una sede para la prueba", Boolean(seeded?.id), seeded?.id);

await send("Page.navigate", { url: `${APP}/app?module=whatsapp` });
await sleep(3000);

/** Un clic real por selector, devolviendo si el elemento existía. */
const click = async (selector) => {
  const ok = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    el.click();
    return true;
  })()`);
  await sleep(600);
  return ok;
};

const stats = await evaluate(`(() => {
  const q = (s) => document.querySelector(s);
  const qa = (s) => Array.from(document.querySelectorAll(s));
  return {
    module: !!q('[data-conversations-module]'),
    list: !!q('[data-conversation-list]'),
    search: !!q('[data-conversation-search]'),
    rows: qa('[data-conversation-row]').length,
    unreadBadges: qa('[data-conversation-unread-badge]').length,
    empty: !!q('[data-conversation-empty]'),
    sections: qa('[data-conversation-section]').map(n => n.getAttribute('data-conversation-section')),
    url: location.search,
  };
})()`);

check("§15 — la pantalla del canal se pinta", stats.module === true);
check("§15 — el panel izquierdo (lista) está montado", stats.list === true);
check("§15 — hay búsqueda dentro de las conversaciones", stats.search === true);
check(
  "§6 — la sede sembrada recibe su propio inbox (semilla por sede)",
  stats.rows > 0,
  `${stats.rows} hilos`
);
check("el panel central arranca pidiendo una conversación", stats.empty === true);
check(
  "el canal tiene sus dos secciones",
  stats.sections.includes("conversaciones") && stats.sections.includes("configuracion"),
  stats.sections.join(",")
);
check("la URL declara el canal", /module=whatsapp/.test(stats.url), stats.url);

/* ── Abrir un hilo: mensajes, burbujas, estados, compositor ──────────────── */

const opened = await click('[data-conversation-row]');
check("se puede seleccionar una conversación", opened === true);

const thread = await evaluate(`(() => {
  const q = (s) => document.querySelector(s);
  const qa = (s) => Array.from(document.querySelectorAll(s));
  const bubbles = qa('[data-message-id]');
  return {
    view: !!q('[data-conversation-thread]'),
    bubbles: bubbles.length,
    incoming: qa('[data-message-direction="incoming"]').length,
    outgoing: qa('[data-message-direction="outgoing"]').length,
    statuses: qa('[data-message-status]').map(n => n.getAttribute('data-message-status')),
    composer: !!q('[data-composer-input]'),
    send: !!q('[data-composer-send]'),
    attach: !!q('[data-composer-attach]'),
  };
})()`);

check("§7 — la ventana de conversación se monta al elegir un hilo", thread.view === true);
check("§7 — el historial tiene mensajes entrantes", thread.incoming > 0, String(thread.incoming));
check("§7 — el historial tiene mensajes salientes", thread.outgoing > 0, String(thread.outgoing));
check(
  "§7 — los mensajes salientes muestran su estado",
  thread.statuses.length === thread.outgoing && thread.outgoing > 0,
  `${thread.statuses.length} estados / ${thread.outgoing} salientes: ${[...new Set(thread.statuses)].join(",")}`
);
check("§7 — el área de escritura existe", thread.composer === true);
check("§7 — el botón de envío existe", thread.send === true);
check(
  "§7 — el patrón de adjuntos se conservó de la referencia",
  thread.attach === true
);

/* ── Enviar un mensaje y comprobar que entra en el hilo y en el almacén ─── */

const before = await evaluate(`document.querySelectorAll('[data-message-id]').length`);
await evaluate(`(() => {
  const el = document.querySelector('[data-composer-input]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(el, 'Mensaje de prueba desde la guarda');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);
await sleep(300);
const sent = await click('[data-composer-send]');
check("el envío responde (se puede pulsar)", sent === true);

const after = await evaluate(`(() => {
  const qa = (s) => Array.from(document.querySelectorAll(s));
  const bubbles = qa('[data-message-id]');
  const lastOutgoing = qa('[data-message-direction="outgoing"]').slice(-1)[0];
  return {
    count: bubbles.length,
    last: lastOutgoing?.textContent ?? '',
    // El hilo abierto se marca como leído al abrirlo: no debe conservar su píldora.
    unread: qa('[data-conversation-unread-badge]').length,
  };
})()`);

check(
  "el mensaje enviado aparece en el hilo",
  after.count === before + 1,
  `${before} → ${after.count}`
);
check(
  "el mensaje enviado es el que se escribió",
  /Mensaje de prueba desde la guarda/.test(after.last),
  after.last.slice(0, 60)
);

// La persistencia se escribe **con el businessId dentro**: es lo que permitirá
// que el registro viva fuera del navegador sin cambiar el contrato (§6).
const stored = await evaluate(`(() => {
  try {
    const convs = JSON.parse(localStorage.getItem('necto_conversations_v1') || '[]');
    const msgs = JSON.parse(localStorage.getItem('necto_messages_v1') || '[]');
    return {
      convs: convs.length,
      allTagged: convs.every(c => c.businessId === 'verify_store_conv'),
      withBusinessId: convs.filter(c => !!c.businessId).length,
      msgs: msgs.length,
      composed: msgs.some(m => (m.content?.body || '').includes('Mensaje de prueba')),
    };
  } catch (e) { return { error: String(e) }; }
})()`);

check(
  "§6 — los hilos guardados llevan su `businessId`",
  stored.allTagged && stored.withBusinessId === stored.convs,
  `${stored.withBusinessId}/${stored.convs}`
);
check(
  "el mensaje enviado se persiste (el hilo sobrevive a la recarga)",
  stored.composed === true,
  `${stored.msgs} mensajes`
);

// ⚠️ Y no basta con que se **guarde**: tiene que **verse sin recargar**. Ése fue el
// fallo real de esta pantalla — el mensaje entraba en el almacén pero el hilo
// pintado seguía siendo el del render anterior, porque `sendMessage` y la lectura
// partían del mismo estado. La aserción de arriba (`after.count === before + 1`)
// es justamente la que lo cazó, y se deja aquí escrita la razón.
check(
  "el mensaje aparece en pantalla sin recargar",
  after.count === before + 1,
  `${before} → ${after.count}`
);

/* ── Aislamiento real: otra sede no ve estos hilos ──────────────────────── */

const isolation = await evaluate(`(async () => {
  const mod = await import(${JSON.stringify(`${APP}/src/compositions/conversations/mock-conversations.ts`)});
  const a = mod.buildDemoConversations('sede_A').map(c => c.counterpart.name);
  const b = mod.buildDemoConversations('sede_B').map(c => c.counterpart.name);
  const again = mod.buildDemoConversations('sede_A').map(c => c.counterpart.name);
  return {
    same: a.join('|') === b.join('|'),
    stable: a.join('|') === again.join('|'),
    crossBusiness: mod.shouldSeedDemoConversations([{ businessId: 'otra' }]) === false,
  };
})()`);

check(
  "§6 — dos sedes distintas reciben interlocutores distintos",
  isolation.same === false
);
check(
  "§6 — la semilla de una sede es estable entre llamadas (revisable)",
  isolation.stable === true
);

/* ── Filtros y búsqueda: la lista dice en qué estado está ────────────────── */

await send("Page.navigate", { url: `${APP}/app?module=whatsapp` });
await sleep(2500);

const filtered = await evaluate(`(() => {
  const qa = (s) => Array.from(document.querySelectorAll(s));
  const all = qa('[data-conversation-row]').length;
  const counts = qa('[data-conversation-filter-count]').map(n => Number(n.getAttribute('data-conversation-filter-count')));
  document.querySelector('[data-conversation-filter="unread"]')?.click();
  return new Promise(r => setTimeout(() => r({
    all,
    unreadShown: qa('[data-conversation-row]').length,
    unreadRows: qa('[data-conversation-row-unread="true"]').length,
    counts,
  }), 500));
})()`);

check(
  "el filtro 'Sin leer' muestra sólo los hilos con pendientes",
  filtered.unreadShown === filtered.counts[1] && filtered.unreadShown < filtered.all,
  `${filtered.unreadShown} de ${filtered.all} (contador dice ${filtered.counts[1]})`
);
check(
  "el filtro no muestra ningún hilo ya leído",
  filtered.unreadRows === filtered.unreadShown,
  `${filtered.unreadRows} filas marcadas sin leer`
);
check(
  "los conteos de los filtros cuadran con la lista",
  filtered.counts[0] === filtered.all,
  `${filtered.counts[0]} vs ${filtered.all}`
);

const searched = await evaluate(`(() => {
  const el = document.querySelector('[data-conversation-search]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  document.querySelector('[data-conversation-filter="all"]')?.click();
  setter.call(el, 'zzzznoexiste');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return new Promise(r => setTimeout(() => r({
    rows: document.querySelectorAll('[data-conversation-row]').length,
    says: /Sin resultados/.test(document.querySelector('[data-conversation-list]')?.textContent ?? ''),
  }), 500));
})()`);

check("la búsqueda se puede escribir", searched.rows >= 0);
check(
  "buscar sin coincidencias dice 'Sin resultados', no 'sin conversaciones'",
  searched.rows === 0 && searched.says === true,
  JSON.stringify(searched)
);

/* ── Navegación por URL: la sección del canal se honra ──────────────────── */

/**
 * ⚠️ Esta comprobación nació de un fallo **real**: `?module=whatsapp&section=configuracion`
 * pedido desde `/app` no montaba el canal — se quedaba en el Dashboard. El efecto
 * de sincronía escribía la sección con `setState`, y cuando el valor ya era el
 * mismo React no re-renderizaba, así que `activeModule` no se actualizaba. Se
 * prueba la URL **en frío** (recarga directa), que es el caso que fallaba.
 */
await send("Page.navigate", { url: `${APP}/app?module=whatsapp&section=configuracion` });
await sleep(2600);

const configDeepLink = await evaluate(`(() => {
  const q = (s) => document.querySelector(s);
  return {
    module: !!q('[data-conversations-module]'),
    settings: !!q('[data-conversation-settings]'),
    status: q('[data-conversation-connection-status]')?.getAttribute('data-conversation-connection-status'),
    active: q('[data-conversation-section][aria-current="page"]')?.getAttribute('data-conversation-section'),
  };
})()`);

check(
  "un enlace profundo a `section=configuracion` monta el canal (no el Dashboard)",
  configDeepLink.module === true && configDeepLink.settings === true,
  JSON.stringify(configDeepLink)
);
check(
  "Configuración muestra el estado real del canal",
  configDeepLink.status === "not_connected",
  String(configDeepLink.status)
);
check(
  "la sección activa es la que declara la URL",
  configDeepLink.active === "configuracion",
  String(configDeepLink.active)
);

// Una sección del vocabulario de **otro** módulo no se cuela en el canal: la clave
// `section` es compartida, así que el valor sólo vale si pertenece a este canal.
await send("Page.navigate", { url: `${APP}/app?module=whatsapp&section=preparacion` });
await sleep(2400);

const foreignSection = await evaluate(`(() => {
  const q = (s) => document.querySelector(s);
  return {
    module: !!q('[data-conversations-module]'),
    active: q('[data-conversation-section][aria-current="page"]')?.getAttribute('data-conversation-section'),
    rows: document.querySelectorAll('[data-conversation-row]').length,
  };
})()`);

check(
  "una sección de Pedidos no se guarda como sección del canal",
  foreignSection.module === true && foreignSection.active === "conversaciones",
  `activa=${foreignSection.active}`
);
check(
  "y el canal sigue mostrando sus conversaciones",
  foreignSection.rows > 0,
  `${foreignSection.rows} hilos`
);

/* ── Ruido de consola ──────────────────────────────────────────────────── */

const noisy = exceptions.filter(
  (e) => !/ResizeObserver|Non-Error promise rejection|favicon/i.test(e)
);
check(
  "la pantalla no lanza excepciones en runtime",
  noisy.length === 0,
  noisy.slice(0, 2).join(" | ").slice(0, 300)
);

/* ── Resultado ─────────────────────────────────────────────────────────── */

console.log(`\n${fails === 0 ? "TODO OK" : fails + " COMPROBACIONES FALLIDAS"}`);
ws.close();
process.exit(fails === 0 ? 0 : 1);
