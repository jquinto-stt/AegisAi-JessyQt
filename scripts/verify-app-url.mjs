/**
 * Verificación E2E de la URL pública de `/app`.
 *
 * `/app` es la **sede** (el hub de módulos), no un módulo: `MODULES_WITH_VIEWS`
 * está vacío porque las vistas de módulo se retiraron, así que ninguna de las
 * combinaciones `module`/`section`/`tab` tiene pantalla detrás. Esta guarda fija
 * las dos mitades del arreglo que sí son observables hoy:
 *
 *   1. `/app` **no escribe** `module`/`section`/`tab`. Antes el efecto de
 *      redirección reescribía la URL y la dejaba describiendo una pantalla que no
 *      se pinta — y con la pestaña de OTRO módulo dentro, porque los tres
 *      vocabularios comparten la clave `tab`. Un negocio con pedidos entrando por
 *      `?module=inventarios&tab=valuation` acababa en `?section=ordenes&tab=valuation`
 *      (`valuation` es una pestaña de Inventarios en la URL de Pedidos).
 *   2. El módulo/sección que la URL **propone** se contrasta con los módulos que la
 *      sede **tiene**: `?section=…` ya no activa Pedidos en una sede sin Pedidos.
 *
 * ⚠️ El estado de la pestaña (`inventarioTab`, …) **no es observable** mientras no
 * exista vista de módulo: no llega a ninguna superficie. Por eso lo que se fija
 * aquí es el contrato de la URL y el módulo activo, que es lo que hoy tiene
 * consecuencias. Cuando una vista de módulo aterrice, esta suite debe ampliarse
 * para afirmar la pestaña de destino, no sólo la forma de la URL.
 *
 * Uso: con el dev server y Chrome headless --remote-debugging-port=9222 vivos,
 *   node scripts/verify-app-url.mjs
 */

import { mkdirSync } from "node:fs";

const CDP = "http://127.0.0.1:9222";
const APP = process.env.NECTO_APP_URL || "http://localhost:5173";
const EMAIL = "valentina.rios@necto.app";
mkdirSync("./artifacts/", { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

const page = await (async () => {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${CDP}/json/list`);
      const all = await r.json();
      // Con NECTO_TAB_ID se usa la pestaña que asignó el runner (aislamiento);
      // sin él, se conserva el comportamiento histórico de "la primera page".
      const t = all.find(x => x.id === process.env.NECTO_TAB_ID)
        || all.find(x => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
      if (t) return t;
    } catch {}
    await sleep(250);
  }
  throw new Error("no page target");
})();

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const exceptions = [];
await new Promise((res, rej) => {
  ws.addEventListener("open", res);
  ws.addEventListener("error", rej);
  ws.addEventListener("message", ev => {
    const m = JSON.parse(ev.data);
    if (m.method === "Runtime.exceptionThrown") {
      exceptions.push(m.params.exceptionDetails?.exception?.description || JSON.stringify(m.params));
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
    const mid = ++id;
    pending.set(mid, { res, rej });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

await send("Runtime.enable");
await send("Page.enable");
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const evaluate = async expr => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval failed");
  return r.result.value;
};

const nav = async url => {
  await send("Page.navigate", { url });
  for (let i = 0; i < 80; i++) {
    if (await evaluate(`document.readyState === "complete"`)) break;
    await sleep(150);
  }
  await sleep(1100);
};

let fails = 0;
const check = (label, ok, detail) => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  :: " + detail : ""}`);
};

/* ── Semilla ───────────────────────────────────────────────────────────────── */

const PROFILE = JSON.stringify({
  [EMAIL]: {
    email: EMAIL,
    firstName: "Valentina",
    lastName: "Ríos",
    contactPhone: "",
    avatarUrl: "",
    preferences: { theme: "light", notificationChannel: "email" },
    position: "",
    country: "Colombia",
    availabilityShift: "all_shifts",
    twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
});

const branch = modules => ({
  id: "biz-" + (modules.join("-") || "sin-modulos"),
  name: "Sede Centro",
  slug: "sede-centro",
  code: "SUC-01",
  businessType: "restaurant_virtual",
  offerModel: "prepared_products",
  iconKey: "utensils",
  currency: "COP",
  country: "Colombia",
  specialty: "Restaurante a la mesa",
  city: "Medellín",
  address: "Calle 1 # 2-3",
  openingDays: "Lunes a sábado",
  openingHours: "10:00 - 22:00",
  contactPhone: "+57 300 000 0000",
  channels: { whatsapp: false, web: true, pos: true },
  channelConnections: [],
  kitchenBufferMin: 20,
  activeModules: modules,
  createdAt: new Date().toISOString(),
});

/** Siembra sesión + perfil + una sede con los módulos dados, y navega a `url`. */
const seedAndNav = async (modules, url) => {
  const biz = [branch(modules)];
  await nav(APP);
  await evaluate(`
    localStorage.clear();
    localStorage.setItem("necto_local_session", ${JSON.stringify(JSON.stringify({ username: EMAIL, email: EMAIL }))});
    localStorage.setItem("necto_user_profiles", ${JSON.stringify(PROFILE)});
    localStorage.setItem("necto_businesses", ${JSON.stringify(JSON.stringify(biz))});
    localStorage.setItem("necto_active_business_id", ${JSON.stringify(biz[0].id)});
    true;
  `);
  const before = exceptions.length;
  await nav(APP + url);
  return before;
};

const search = () => evaluate(`location.search`);
const hubVisible = () => evaluate(`(document.body.textContent || "").includes("Módulos de tienda")`);

/* ── Fase 1 · `/app` no reescribe la URL de entrada ────────────────────────── */

console.log("\n── Fase 1 · /app no reescribe la URL de entrada ──");

const casos = [
  {
    n: "sede sólo con inventarios entrando por la operación de Pedidos",
    modules: ["inventarios"],
    url: "/app?section=operacion&tab=en-vivo",
  },
  {
    n: "sede con pedidos entrando por el módulo de Inventarios con pestaña suya",
    modules: ["pedidos"],
    url: "/app?module=inventarios&tab=valuation",
  },
  {
    n: "recarga directa de la URL mezclada del reporte",
    modules: ["inventarios"],
    url: "/app?module=inventarios&tab=en-vivo",
  },
  {
    n: "el hub de módulos pedido explícitamente",
    modules: ["inventarios"],
    url: "/app?module=modules-hub",
  },
  {
    n: "sede sin ningún módulo activo",
    modules: [],
    url: "/app?section=operacion&tab=en-vivo",
  },
];

for (const c of casos) {
  const before = await seedAndNav(c.modules, c.url);
  const got = await search();
  const want = c.url.includes("?") ? "?" + c.url.split("?")[1] : "";
  check(`la URL no se reescribe · ${c.n}`, got === want, `pedida ${want} · quedó ${got}`);
  check(`la sede sigue montando · ${c.n}`, (await hubVisible()) === true);
  const errs = exceptions.slice(before);
  check(`sin excepciones · ${c.n}`, errs.length === 0, errs.join(" | ").slice(0, 200));
}

/* ── Fase 2 · la navegación de /app publica el destino que la sede puede honrar ─
 *
 * ⚠️ Esta fase medía "ninguna navegación publica parámetros", y era correcto
 * mientras **ningún** módulo tenía pantalla: `MODULES_WITH_VIEWS` estaba vacío,
 * así que escribir `?module=…` habría prometido una pantalla que no se pintaba.
 * Con la vista de Pedidos ya montada el contrato cambia: el destino **sí** se
 * publica —es lo que hace el enlace compartible y sobrevive al recargado—, pero
 * sólo cuando hay pantalla detrás. Lo que se sigue midiendo es eso: que la
 * navegación no escriba un `module` que la sede no pueda honrar.
 */

console.log("\n── Fase 2 · la navegación publica un destino honrable ──");

/** El ítem "Módulos de tienda" vive en la sección "Sede y tienda": se despliega. */
const ensureSedeOpen = async () => {
  const present = await evaluate(
    `[...document.querySelectorAll(".menu-item")].some(e => (e.textContent || "").includes("Módulos de tienda"))`
  );
  if (present) return true;
  await evaluate(`
    (() => {
      const h = [...document.querySelectorAll("button,div,span,h3")]
        .find(e => (e.textContent || "").trim() === "Sede y tienda");
      if (!h) return false;
      (h.closest("button") || h).click();
      return true;
    })()
  `);
  await sleep(600);
  return evaluate(
    `[...document.querySelectorAll(".menu-item")].some(e => (e.textContent || "").includes("Módulos de tienda"))`
  );
};

await seedAndNav(["inventarios"], "/app");
check("se entra a /app sin parámetros", (await search()) === "", await search());

// ⚠️ "Abrir módulo" vive en el **catálogo de módulos**, no en `/app`. Desde que
// la sede tiene pantalla propia, `/app` pinta el Dashboard de tienda y el
// catálogo se abre pidiéndolo. Se llega por el elemento del sidebar para medir
// que la navegación publica **el destino del catálogo** —que sí tiene pantalla—
// y no cualquier otra cosa.
check("el sidebar lista 'Módulos de tienda'", (await ensureSedeOpen()) === true);
const clickedSidebar = await evaluate(`
  (() => {
    const el = [...document.querySelectorAll(".menu-item")].find(e => (e.textContent || "").includes("Módulos de tienda"));
    if (!el) return false;
    el.click();
    return true;
  })()
`);
check("se pudo pulsar el elemento del sidebar", clickedSidebar === true);
await sleep(700);
check(
  "el sidebar publica el destino del catálogo (que sí tiene pantalla)",
  (await search()) === "?module=modules-hub",
  await search()
);

// ⚠️ Con `inventarios` acoplado y **sin** vista registrada, "Abrir módulo" no
// debe ofrecerse: llevaría a una pantalla que no existe. (Se ofrecía para
// `pedidos` e `inventarios` por igual, y era justo el camino del síntoma
// "selecciono el módulo y no me sale".)
await seedAndNav(["inventarios"], "/app?module=modules-hub");
const inventariosOpenable = await evaluate(`
  (() => {
    const btn = [...document.querySelectorAll("button")]
      .find(b => (b.textContent || "").includes("Abrir módulo")
                 && (b.closest("[data-module-card]")?.getAttribute("data-module-card") === "inventarios"));
    return btn ? { offered: true, card: btn.closest("[data-module-card]")?.getAttribute("data-module-card") } : { offered: false };
  })()
`);
check(
  "no se ofrece abrir un módulo sin pantalla registrada",
  inventariosOpenable.offered === false,
  JSON.stringify(inventariosOpenable)
);

// Y con `pedidos` —que sí tiene vista— la oferta existe y lleva al módulo.
await seedAndNav(["pedidos"], "/app?module=modules-hub");
const pedidosOpenable = await evaluate(`
  (() => {
    const card = document.querySelector('[data-module-card="pedidos"]');
    if (!card) return { card: false };
    const btn = [...card.querySelectorAll("button")].find(b => /Abrir módulo/.test(b.textContent || ""));
    if (!btn) return { card: true, button: false };
    btn.click();
    return { card: true, button: true };
  })()
`);
check(
  "el catálogo ofrece abrir Pedidos (tiene pantalla)",
  pedidosOpenable.card === true && pedidosOpenable.button === true,
  JSON.stringify(pedidosOpenable)
);
await sleep(1200);
check(
  "abrir Pedidos desde el catálogo lleva a su módulo",
  (await search()) === "?module=pedidos" && (await evaluate(`!!document.querySelector('[data-orders-module]')`)) === true,
  await search()
);

/* ── Fase 3 · el destino activo es el que la sede puede honrar ─────────────── */

console.log("\n── Fase 3 · el destino activo es el que la sede puede honrar ──");

/**
 * Estado de los dos destinos de la sección "Sede y tienda".
 *
 * ⚠️ Se leen **los dos**, no sólo el del catálogo: la pregunta de esta fase es
 * cuál de las pantallas de la sede está marcada. Preguntar por una sola cuando
 * hay dos es lo que dejó esta fase ciega al cambio de `/app`.
 */
const sedeItemsActive = async () => {
  if (!(await ensureSedeOpen())) return null;
  return evaluate(`
    (() => {
      const items = [...document.querySelectorAll(".menu-item")];
      const find = (label) => {
        const el = items.find(e => (e.textContent || "").includes(label));
        return el ? el.classList.contains("menu-item-active") : null;
      };
      return { dashboard: find("Dashboard"), hub: find("Módulos de tienda") };
    })()
  `);
};

const activo = [
  // ⚠️ Una sede sin módulos **no puede** estar en un destino de módulo: cae al
  // Dashboard, que es su pantalla. Antes caía al catálogo, que era la única que
  // existía; con el Dashboard ya no hay motivo para aterrizar en el catálogo.
  { n: "sede sin módulos entrando por la operación de Pedidos", modules: [], url: "/app?section=operacion&tab=en-vivo", want: "dashboard" },
  { n: "sede sin módulos entrando por el módulo de Inventarios", modules: [], url: "/app?module=inventarios&tab=catalog", want: "dashboard" },
  // ⚠️ `inventarios` **sigue sin vista** (`MODULES_WITH_VIEWS` sólo registra
  // `pedidos`), así que pedirlo no cambia de pantalla: la sede se queda en su
  // Dashboard en vez de prometer un módulo que no se pinta.
  { n: "sede con pedidos entrando por el módulo de Inventarios", modules: ["pedidos"], url: "/app?module=inventarios&tab=valuation", want: "dashboard" },
  // El catálogo sí se marca cuando se pide explícitamente.
  { n: "el catálogo pedido explícitamente", modules: ["inventarios"], url: "/app?module=modules-hub", want: "hub" },
];

for (const c of activo) {
  await seedAndNav(c.modules, c.url);
  const got = await sedeItemsActive();
  const which = got && got[c.want] === true ? c.want : got && got.dashboard ? "dashboard" : got && got.hub ? "hub" : "ninguno";
  check(`destino activo correcto · ${c.n}`, which === c.want, `esperado ${c.want} · quedó ${which}`);
}

/**
 * ⚠️ El caso que faltaba: `pedidos` **sí tiene vista**, así que pedirlo tiene
 * que sacar la sede de su Dashboard y marcar su módulo. Sin esto, la fase
 * comprobaba la redirección *hacia* el Dashboard pero nunca la contraria.
 */
await seedAndNav(["pedidos"], "/app?module=pedidos");
const conPedidos = await evaluate(`(() => {
  const items = [...document.querySelectorAll(".menu-item")];
  const label = (el) => {
    const t = (el.textContent || "").replace(/\\s+/g, " ").trim();
    if (t) return t;
    return (el.querySelector("button,a")?.getAttribute("title") || "").trim();
  };
  const pedidos = items.find(e => label(e) === "Pedidos");
  return {
    pedidosActive: pedidos ? pedidos.classList.contains("menu-item-active") : null,
    dashboardActive: items.some(e => (e.textContent || "").includes("Dashboard") && e.classList.contains("menu-item-active")),
    moduleMounted: !!document.querySelector('[data-orders-module]'),
  };
})()`);
check(
  "con pedidos acoplado, pedirlo monta su módulo y marca su destino",
  conPedidos.moduleMounted === true && conPedidos.pedidosActive === true && conPedidos.dashboardActive === false,
  JSON.stringify(conPedidos)
);

/* ── Evidencia ─────────────────────────────────────────────────────────────── */

await seedAndNav(["inventarios"], "/app?section=operacion&tab=en-vivo");
await send("Page.captureScreenshot", { format: "png" }).then(async r => {
  const { writeFileSync } = await import("node:fs");
  writeFileSync("./artifacts/app-url.png", Buffer.from(r.data, "base64"));
});

console.log(`\n===== RESULTADO URL /app: ${fails === 0 ? "OK" : fails + " FALLOS"} =====`);
ws.close();
process.exit(fails === 0 ? 0 : 1);
