/**
 * Verificación E2E del **ámbito tienda** frente al **ámbito sucursal**.
 *
 * El modelo es `Titular → Tienda → Sucursales`. La identidad del negocio (tipo,
 * moneda, país, icono, especialidad) es **una sola** para toda la tienda; el resto
 * (nombre, código, dirección, ciudad, contacto, horarios, módulos, canales) es de
 * cada sucursal. El modal de Ajustes difuminaba esa frontera y estas tres guardas
 * fijan que no vuelva a ocurrir:
 *
 *  1. **Bifurcación.** `businessType`/`currency`/`country` se editaban como si
 *     fueran de la sede. Con 2+ sedes, cambiarlos en una sola dejaba la otra con
 *     el valor anterior y la sede siguiente **heredaba el nuevo**, así que la red
 *     acababa con dos tipos de negocio —y por tanto dos vocabularios de módulos—
 *     bajo la misma tienda. Medido antes de arreglarlo.
 *  2. **Select parcial.** El select de tipo ofrecía **3 de los 15** arquetipos del
 *     catálogo, así que una sede de farmacia se mostraba como "Gastronomía". El
 *     valor persistido **no** se perdía (manda el estado, no el DOM): sólo una
 *     aserción sobre lo *renderizado* lo detecta.
 *  3. **País como texto libre.** Al pasar `country` a ámbito tienda, un texto libre
 *     divergiría toda la red ("colombia" vs "Colombia"). Es lista cerrada, y un
 *     país fuera del catálogo se conserva como opción extra (sin pérdida).
 *
 * Uso: con el dev server y Chrome headless --remote-debugging-port=9222 vivos,
 *   node scripts/verify-store-scope.mjs
 */

const CDP = "http://127.0.0.1:9222";
const APP = process.env.NECTO_APP_URL || "http://localhost:5173";
const EMAIL = "valentina.rios@necto.app";

/* ── Harness ───────────────────────────────────────────────────────── */

const page = await (async () => {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${CDP}/json/list`);
      const all = await r.json();
      const t = all.find(x => x.id === process.env.NECTO_TAB_ID)
        || all.find(x => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
      if (t) return t;
    } catch {}
    await new Promise(r => setTimeout(r, 250));
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
const evaluate = async expr => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval failed");
  return r.result.value;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

await send("Runtime.enable");
await send("Page.enable");
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
// Headless arranca a 800×600: sin viewport ancho el modal no maqueta sus tabs.
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440, height: 980, deviceScaleFactor: 1, mobile: false,
});

let fails = 0;
const check = (label, ok, detail) => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail !== undefined ? "  :: " + detail : ""}`);
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

/* Se reinstala tras cada navegación: el contexto de página se pierde. */
const HELPERS = `
window.__t = {
  byText: (sel, t) => [...document.querySelectorAll(sel)].find(e => (e.textContent || "").trim().includes(t)),
  has: sel => !!document.querySelector(sel),
  val: sel => { const el = document.querySelector(sel); return el ? el.value : null; },
  set(sel, v) {
    const el = document.querySelector(sel);
    if (!el) return false;
    const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  },
  clickText(sel, t) { const el = this.byText(sel, t); if (!el) return false; el.click(); return true; },
  store() { try { return JSON.parse(localStorage.getItem("necto_businesses") || "[]"); } catch { return []; } },
  types() { return this.store().map(b => ({ n: b.name, t: b.businessType, i: b.iconKey, s: b.specialty })); },
  /* El select de tipo es el que contiene un arquetipo; el de país, el que contiene un mercado. */
  bizSelect() { return [...document.querySelectorAll("select")].find(s => [...s.options].some(o => o.value === "retail_store")) || null; },
  countrySelect() { return [...document.querySelectorAll("select")].find(s => [...s.options].some(o => o.value === "Colombia")) || null; },
  setBiz(v) {
    const s = this.bizSelect();
    if (!s) return false;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(s, v);
    s.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  },
  selectState(which) {
    const s = which === "country" ? this.countrySelect() : this.bizSelect();
    if (!s) return null;
    return { value: s.value, first: s.options[0] && s.options[0].value,
             text: s.options[s.selectedIndex] && s.options[s.selectedIndex].textContent.trim(),
             n: s.options.length,
             groups: [...s.querySelectorAll("optgroup")].map(g => g.label) };
  },
  openCardSettings(name) {
    // El title del boton es COPY VISIBLE y se reescribio en el commit
    // "style(copy): drop the jargon": "Configurar branding, bot y parametros de la
    // sede" paso a "Configurar la imagen, el asistente y los ajustes de la sede".
    // El selector literal quedo huerfano. Se ancla a un prefijo estable del copy
    // actual en vez del texto entero: si el titulo se vuelve a reescribir, falla
    // una vez y se arregla aqui, en lugar de fallar en silencio.
    const BTN = 'button[title^="Configurar la imagen"]';
    const card = [...document.querySelectorAll("div")].find(d =>
      (d.textContent || "").includes(name) && d.querySelector(BTN));
    if (!card) return false;
    card.querySelector(BTN).click();
    return true;
  },
};
true;
`;

const nav = async url => {
  await send("Page.navigate", { url });
  await waitFor('document.readyState === "complete"', "readyState");
  await sleep(900);
  await evaluate(HELPERS);
};

/* ── Fixtures ──────────────────────────────────────────────────────── */

const PROFILE = JSON.stringify({
  [EMAIL]: {
    email: EMAIL, firstName: "Valentina", lastName: "Ríos", contactPhone: "+57 300 111 2233",
    avatarUrl: "", preferences: { theme: "light", notificationChannel: "email" },
    position: "Propietaria", country: "Colombia", availabilityShift: "all_shifts",
    twoFactorEnabled: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
});

const branch = (name, code, over = {}) => ({
  id: "biz-" + code.toLowerCase(), name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), code,
  businessType: "restaurant_virtual", offerModel: "prepared_products", iconKey: "utensils",
  currency: "COP", country: "Colombia", specialty: "Restaurante a la mesa",
  city: "Medellín", address: "Calle 1 # 2-3", openingDays: "Lunes a sábado", openingHours: "10:00 - 22:00",
  contactPhone: "+57 300 000 0000", channels: { whatsapp: false, web: true, pos: true },
  kitchenBufferMin: 20, activeModules: ["pedidos", "inventarios"], createdAt: new Date().toISOString(),
  ...over,
});

/** Siembra el almacén y aterriza en el hub. El harness no depende de datos demo. */
const seed = async businesses => {
  await nav(APP);
  await evaluate(`
    localStorage.clear();
    localStorage.setItem("necto_local_session", ${JSON.stringify(JSON.stringify({ username: EMAIL, email: EMAIL }))});
    localStorage.setItem("necto_user_profiles", ${JSON.stringify(PROFILE)});
    localStorage.setItem("necto_businesses", ${JSON.stringify(JSON.stringify(businesses))});
    localStorage.setItem("necto_active_business_id", ${JSON.stringify(businesses[0].id)});
    true;
  `);
  await nav(`${APP}/workspaces`);
};

/* ── Fase 1 · La red no se bifurca ─────────────────────────────────── */

console.log("── Fase 1 · Editar la identidad en una sede alcanza a toda la red ──");
await seed([branch("Sede Centro", "SUC-01"), branch("Sede Norte", "SUC-02")]);

const antes = await evaluate(`window.__t.types()`);
check("arranca con un solo tipo de negocio en la red", new Set(antes.map(b => b.t)).size === 1,
  JSON.stringify(antes.map(b => b.t)));

check("abre los ajustes de una sede", await evaluate(`window.__t.openCardSettings("Sede Centro")`));
check("el modal carga el select de tipo", await waitFor(`!!window.__t.bizSelect()`, "#bizSelect"));

check("cambia el tipo de negocio", await evaluate(`window.__t.setBiz("retail_store")`));
await evaluate(`window.__t.clickText("button", "Guardar cambios")`);
await sleep(1500);

const trasGuardar = await evaluate(`window.__t.types()`);
check("las DOS sedes cambian de tipo (antes se bifurcaba)",
  trasGuardar.length === 2 && trasGuardar.every(b => b.t === "retail_store"),
  JSON.stringify(trasGuardar.map(b => `${b.n}=${b.t}`)));
check("el icono se re-deriva del arquetipo",
  trasGuardar.every(b => b.i === "store"), JSON.stringify(trasGuardar.map(b => b.i)));
check("la especialidad se re-deriva del arquetipo",
  trasGuardar.every(b => b.s === "Minimarket / general"), JSON.stringify(trasGuardar.map(b => b.s)));

// Una sede nueva debe heredar UNA identidad, no la última editada.
await nav(`${APP}/workspaces`);
await evaluate(`window.__t.clickText("button", "Nueva sucursal")`);
check("el wizard de sucursal abre en el paso de identidad",
  await waitFor(`!!document.querySelector("input#branch-name")`, "#branch-name"));
check("la sede nueva NO vuelve a pedir el tipo de negocio",
  (await evaluate(`!window.__t.has("#store-country")`)) === true);
await evaluate(`window.__t.set("input#branch-name", "Sede Occidente")`);
await evaluate(`window.__t.clickText("button", "Continuar")`);
await waitFor(`!!document.querySelector("input#branch-city")`, "#branch-city");
await evaluate(`window.__t.set("input#branch-city", "Cali")`);
await evaluate(`window.__t.clickText("button", "Continuar")`);
await waitFor(`!!document.querySelector("input#branch-opening-hours")`, "#branch-opening-hours");
check("la operación ya NO mezcla la selección de módulos",
  (await evaluate(`!document.body.textContent.includes("Pedidos omnicanal")`)) === true);
await evaluate(`window.__t.clickText("button", "Continuar")`);
check("el alta tiene un paso propio para los módulos",
  await waitFor(`document.body.textContent.includes("Pedidos omnicanal")`, "rejilla de módulos"));
await evaluate(`window.__t.clickText("button", "Continuar")`);
check("y otro para conectar WhatsApp Business",
  await waitFor(`document.body.textContent.includes("WhatsApp Business")`, "paso WhatsApp"));
await evaluate(`window.__t.clickText("button", "Crear sucursal")`);
await waitFor(`location.pathname === "/"`, "pathname /", 20000);

const final = await evaluate(`window.__t.types()`);
check("la tercera sede se creó", final.length === 3, String(final.length));
check("SIN BIFURCACIÓN: la red entera comparte un único tipo",
  new Set(final.map(b => b.t)).size === 1,
  JSON.stringify(final.map(b => `${b.n}=${b.t}`)));

/* ── Fase 2 · El select de tipo no miente ──────────────────────────── */

console.log("\n── Fase 2 · El select de tipo muestra el arquetipo REAL de la sede ──");
await seed([branch("Sede Farmacia", "SUC-01", {
  businessType: "pharmacy_health", iconKey: "pill", specialty: "Droguería y farmacia", kitchenBufferMin: 10,
})]);

check("abre los ajustes de la farmacia", await evaluate(`window.__t.openCardSettings("Sede Farmacia")`));
check("el modal carga el select de tipo", await waitFor(`!!window.__t.bizSelect()`, "#bizSelect"));

const tipo = await evaluate(`window.__t.selectState("biz")`);
check("el select ofrece el catálogo entero (15 arquetipos)", tipo && tipo.n === 15, tipo && String(tipo.n));
check("agrupado por categorías", tipo && tipo.groups.length === 4, tipo && JSON.stringify(tipo.groups));
check("muestra el arquetipo real, no uno por defecto", tipo && tipo.value === "pharmacy_health", tipo && tipo.value);
check("con su etiqueta legible", tipo && tipo.text === "Droguería y farmacia", tipo && tipo.text);

// Guardar sin tocar nada no debe reescribir el tipo.
await evaluate(`window.__t.clickText("button", "Guardar cambios")`);
await sleep(1500);
const persistido = await evaluate(`window.__t.store()[0].businessType`);
check("guardar sin tocar nada conserva el tipo", persistido === "pharmacy_health", String(persistido));

/* ── Fase 3 · El país es lista cerrada y sin pérdida ───────────────── */

console.log("\n── Fase 3 · País: lista cerrada, y sin perder un valor fuera de catálogo ──");
await seed([branch("Sede Uno", "SUC-01", { country: "Colombia" })]);
await evaluate(`window.__t.openCardSettings("Sede Uno")`);
await waitFor(`!!window.__t.countrySelect()`, "#countrySelect");

const pais = await evaluate(`window.__t.selectState("country")`);
check("el país es una lista cerrada de 8 mercados", pais && pais.n === 8, pais && String(pais.n));
check("muestra el país real de la sede", pais && pais.value === "Colombia", pais && pais.value);

await seed([branch("Sede Uno", "SUC-01", { country: "Uruguay" })]);
await evaluate(`window.__t.openCardSettings("Sede Uno")`);
await waitFor(`!!window.__t.countrySelect()`, "#countrySelect");

const paisRaro = await evaluate(`window.__t.selectState("country")`);
check("un país fuera del catálogo NO se pierde", paisRaro && paisRaro.value === "Uruguay", paisRaro && paisRaro.value);
check("se añade como primera opción", paisRaro && paisRaro.first === "Uruguay", paisRaro && paisRaro.first);
check("catálogo + el extra", paisRaro && paisRaro.n === 9, paisRaro && String(paisRaro.n));

/* ── Cierre ────────────────────────────────────────────────────────── */

const ruido = /favicon|\[vite\]|DevTools|ResizeObserver/;
const reales = exceptions.filter(e => !ruido.test(e));
console.log("\n########## Errores de runtime ##########");
check("sin excepciones de runtime", reales.length === 0, reales.join(" | ").slice(0, 300));

console.log(`\n===== RESULTADO ÁMBITO TIENDA: ${fails === 0 ? "OK" : fails + " FALLOS"} =====`);
ws.close();
process.exit(fails === 0 ? 0 : 1);
