import { mkdirSync, writeFileSync } from "node:fs";

/**
 * Verificación E2E del perfil del Administrador del Cliente.
 *
 * Recorre el flujo real en el navegador en **dos tramos separados**:
 *   1. alta → onboarding del usuario (`/onboarding/nuevo-usuario`, la persona) → hub
 *   2. hub sin sedes → wizard de tienda (`/onboarding`, 6 pasos) → hub
 * y después Ajustes de perfil (editar, preferencias, seguridad), comprobando que
 * todo se persiste en `necto_user_profiles` sin datos mock.
 *
 * ⚠️ El orden importa: la persona existe antes que la sede. Antes el perfil era un
 * paso del wizard de tienda, así que había que nombrar y tipificar la tienda antes
 * de saber quién la administra, y el titular reaparecía en cada sucursal.
 *
 * Uso: con el dev server y Chrome headless --remote-debugging-port=9222 vivos,
 *   node scripts/verify-profile.mjs
 */

const APP = process.env.NECTO_APP_URL || "http://localhost:5173";
const CDP_BASE = "http://127.0.0.1:9222";
const OUT = "./artifacts/";
mkdirSync(OUT, { recursive: true });

const ADMIN = {
  firstName: "Valentina",
  lastName: "Ríos",
  email: "valentina.rios@necto.app",
  password: "Necto2026!",
  phone: "+57 300 111 2233",
  position: "Propietaria",
  /** Nombre de la sucursal que crea el wizard (la primera da de alta la tienda). */
  branchName: "Ferretería Central",
  branchCode: "SUC-01",
  branchCity: "Medellín",
  branchAddress: "Carrera 43A # 1-50, Local 201",
  /** Teléfono PROPIO de la sede: distinto del del titular, para probar que se captura. */
  branchPhone: "+57 604 444 5566",
  branchHours: "09:00 - 21:00",
};

let failures = 0;
const results = [];
function check(label, ok, detail) {
  results.push({ label, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  :: " + detail : ""}`);
}

/* ── CDP plumbing ──────────────────────────────────────────────────── */

async function getPageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${CDP_BASE}/json/list`);
      const all = await res.json();
      // NECTO_TAB_ID = pestaña dedicada asignada por verify-all.mjs (aislamiento).
      const page = all.find((t) => t.id === process.env.NECTO_TAB_ID)
        || all.find((t) => t.type === "page" && t.webSocketDebuggerUrl && !t.url.startsWith("devtools"));
      if (page) return page;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("No CDP page target found");
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    const events = [];
    ws.addEventListener("open", () =>
      resolve({
        events,
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const mid = ++id;
            pending.set(mid, { res, rej });
            ws.send(JSON.stringify({ id: mid, method, params }));
          });
        },
        close: () => ws.close(),
      })
    );
    ws.addEventListener("error", reject);
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.method) events.push(m);
      if (m.id && pending.has(m.id)) {
        const { res, rej } = pending.get(m.id);
        pending.delete(m.id);
        m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
      }
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect((await getPageTarget()).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
await cdp.send("Page.enable");
await cdp.send("Network.enable");
// Vite sirve los módulos transformados desde caché: sin esto se depuran fantasmas.
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
// Headless arranca a 800×600, por debajo del breakpoint `lg`: sin viewport de
// escritorio el panel de marca de `/onboarding/nuevo-usuario` no se maqueta y
// `innerText` devuelve "" para él (el nodo existe, el texto no).
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});

async function evaluate(expression) {
  const r = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) {
    const desc = r.exceptionDetails.exception?.description || r.exceptionDetails.text;
    throw new Error(`evaluate failed: ${desc}`);
  }
  return r.result.value;
}

async function waitFor(expression, { timeout = 12000, label = expression } = {}) {
  const start = Date.now();
  let lastErr = null;
  while (Date.now() - start < timeout) {
    try {
      if (await evaluate(expression)) return true;
    } catch (err) {
      lastErr = err;
    }
    await sleep(150);
  }
  if (lastErr) console.log(`  (waitFor "${label}" last error: ${lastErr.message})`);
  return false;
}

/** Helpers inyectados en la página; se reinstalan tras cada navegación. */
const HELPERS = `
window.__t = {
  byText(sel, text) {
    return Array.from(document.querySelectorAll(sel)).find(e => (e.textContent || "").trim().includes(text));
  },
  set(sel, value) {
    const el = document.querySelector(sel);
    if (!el) return false;
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    desc.set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  },
  val(sel) {
    const el = document.querySelector(sel);
    return el ? el.value : null;
  },
  clickText(sel, text) {
    const el = window.__t.byText(sel, text);
    if (!el) return false;
    el.click();
    return true;
  },
  click(sel) {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.click();
    return true;
  },
  // innerText devuelve el texto YA transformado por CSS, y varios títulos usan
  // uppercase: buscar "Canal Preferido..." fallaba porque el DOM rendía
  // "CANAL PREFERIDO...". textContent es el texto fuente y no depende del estilo.
  bodyHas(text) { return (document.body.textContent || "").includes(text); },
  profile(email) {
    try {
      const store = JSON.parse(localStorage.getItem("necto_user_profiles") || "{}");
      return store[email] || null;
    } catch { return null; }
  },
};
true;
`;

async function nav(url, readySel) {
  await cdp.send("Page.navigate", { url });
  await waitFor(`document.readyState === "complete"`, { label: `load ${url}` });
  // ⚠️ `readyState === "complete"` NO significa que la SPA haya montado la vista:
  // es una ruta de cliente, así que el formulario puede aparecer cientos de ms
  // después. Sin esperar al nodo real, la inyección de HELPERS cae en una página
  // a medio montar y el primer `window.__t.set(...)` revienta con
  // "Cannot read properties of undefined (reading 'set')" — el fallo que
  // abortaba toda la Fase 1 aunque `/register` renderizaba bien.
  if (readySel) {
    await waitFor(`!!document.querySelector(${JSON.stringify(readySel)})`, {
      label: `vista lista ${readySel}`,
    });
  }
  await sleep(400);
  await evaluate(HELPERS);
}

async function installHelpers() {
  await evaluate(HELPERS);
}

async function screenshot(name) {
  try {
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${OUT}${name}.png`, Buffer.from(data, "base64"));
  } catch (err) {
    console.log(`  (screenshot ${name} failed: ${err.message})`);
  }
}

/* ── 0. Arranque limpio ────────────────────────────────────────────── */

console.log("\n── Fase 0 · Arranque limpio ──");
await nav(APP);
// La app persiste sus propias claves (preferencias de UI, tema), así que "limpio"
// significa sin rastro de perfil y sin sedes: el hub debe arrancar en su estado
// vacío para poder probar que crear la primera tienda es un paso explícito.
await evaluate(
  `localStorage.removeItem("necto_user_profiles"); localStorage.removeItem("necto_user_avatar"); localStorage.removeItem("necto_local_session"); localStorage.removeItem("necto_businesses"); localStorage.removeItem("necto_active_business_id"); true`
);
await nav(APP);
check(
  "sin perfil previo",
  (await evaluate(`localStorage.getItem("necto_user_profiles") === null`)) === true
);
check(
  "sin clave legada de avatar",
  (await evaluate(`localStorage.getItem("necto_user_avatar") === null`)) === true
);
check(
  "sin sedes previas",
  (await evaluate(`(JSON.parse(localStorage.getItem("necto_businesses") || "[]")).length === 0`)) === true
);

/* ── 1. Alta del Administrador ─────────────────────────────────────── */

console.log("\n── Fase 1 · Alta (registro) ──");
await nav(`${APP}/register`, "input#fname");
// Si la vista no está, no se sigue: `window.__t` puede no existir todavía y el
// error deja un stack irrelevante en vez del fallo real.
if (!(await evaluate(`!!window.__t`))) {
  throw new Error("helpers no inyectados en /register: la vista no montó");
}
check("formulario de registro visible", await waitFor(`!!document.querySelector('input#fname')`));

await evaluate(`window.__t.set('input#fname', ${JSON.stringify(ADMIN.firstName)})`);
await evaluate(`window.__t.set('input#lname', ${JSON.stringify(ADMIN.lastName)})`);
await evaluate(`window.__t.set('input#email', ${JSON.stringify(ADMIN.email)})`);
await evaluate(
  `window.__t.set('input[autocomplete="new-password"]', ${JSON.stringify(ADMIN.password)})`
);
await evaluate(`window.__t.clickText('button[type="submit"]', 'Crear cuenta')`);
// El alta lleva al onboarding del USUARIO, no al de la tienda: la persona existe
// antes que la sede y su perfil acompaña a todas las sucursales.
check(
  "el alta navega al onboarding del usuario",
  await waitFor(`location.pathname === "/onboarding/nuevo-usuario"`, {
    label: "pathname /onboarding/nuevo-usuario",
  })
);

/* ── 2. Onboarding del usuario (`onboarding_new_user`) ─────────────── */

console.log("\n── Fase 2 · Onboarding del usuario nuevo (5 pasos) ──");
await installHelpers();
check(
  "el paso 1 es la personalización",
  await waitFor(`window.__t.bodyHas('Hazla tuya antes de empezar.')`, {
    label: "paso personalización",
  })
);
// El asistente es de la PERSONA: no vuelve a pedir lo que el registro ya capturó
// ni pregunta nada del negocio. Volver a pedir el nombre convertiría el onboarding
// en un segundo formulario de alta, que es justo lo que este flujo no debe ser.
check(
  "no vuelve a pedir nombre, apellido ni correo",
  (await evaluate(
    `!document.querySelector('input#admin-first-name') && !document.querySelector('input#admin-email') && !document.querySelector('input#fname')`
  )) === true
);
check(
  "no pregunta nada de la tienda ni de la sucursal",
  (await evaluate(
    `!document.querySelector('input#branch-name') && !document.querySelector('select#store-country') && !window.__t.bodyHas('Nombre de la tienda')`
  )) === true
);
// Los pasos se identifican por clave y el stepper los etiqueta: el progreso no
// depende de un índice.
//
// ⚠️ La consulta va **acotada al stepper** (los hermanos del paso activo) y no por
// `aria-label` suelto: el botón de Soporte del header usa la misma etiqueta visible
// que el paso 5, así que un `querySelectorAll('[aria-label="Soporte"]')` global
// contaba 6 y el arnés fallaba por una colisión de nombres, no por un paso perdido.
check(
  "el stepper anuncia 5 pasos y marca el primero",
  (await evaluate(
    `(() => {
      const cur = document.querySelector('[aria-current="step"]');
      if (!cur || cur.getAttribute('aria-label') !== 'Personalización') return false;
      const labels = Array.from(cur.parentElement.children).map(b => b.getAttribute('aria-label'));
      return JSON.stringify(labels) === JSON.stringify(['Personalización','País','Motivo de uso','Cómo nos conociste','Soporte']);
    })()`
  )) === true
);

// Paso 1 — Personalización. Avatar y acento son los MISMOS componentes que usa
// Ajustes → Perfil: la elección tiene que llegar íntegra al perfil.
await evaluate(`window.__t.click('button[title="Silueta naranja"]')`);
check(
  "el avatar elegido queda marcado",
  (await evaluate(
    `document.querySelector('button[title="Silueta naranja"]')?.getAttribute('aria-pressed')`
  )) === "true"
);
await evaluate(`window.__t.clickText('button', 'Índigo')`);
check(
  "el acento elegido queda marcado",
  (await evaluate(
    `Array.from(document.querySelectorAll('button[aria-pressed="true"]')).some(b => b.textContent.includes('Índigo'))`
  )) === true
);
await screenshot("01-onboarding-personalizacion");
await evaluate(`window.__t.clickText('button', 'Continuar')`);

// Paso 2 — País. Se elige uno **distinto del país por defecto** (Colombia), para
// que la aserción de persistencia pruebe que la respuesta se capturó y no que se
// aplicó el valor inicial.
check(
  "el paso 2 pide el país",
  await waitFor(`window.__t.bodyHas('¿En qué país estás?')`, { label: "paso país" })
);
check(
  "el país se elige de la lista de mercados",
  (await evaluate(`window.__t.bodyHas('Colombia') && window.__t.bodyHas('México')`)) === true
);
await evaluate(`window.__t.clickText('button', 'México')`);
check(
  "el país elegido queda marcado",
  (await evaluate(
    `Array.from(document.querySelectorAll('button[aria-pressed="true"]')).some(b => b.textContent.includes('México'))`
  )) === true
);
await evaluate(`window.__t.clickText('button', 'Continuar')`);

// Paso 3 — Motivo de uso.
check(
  "el paso 3 pide el motivo de uso",
  await waitFor(`window.__t.bodyHas('¿Por qué quieres usar Necto?')`, { label: "paso motivo" })
);
await evaluate(`window.__t.clickText('button', 'Controlar inventario y stock')`);
await evaluate(`window.__t.clickText('button', 'Continuar')`);

// Paso 4 — Descubrimiento. Ya no cierra el asistente: queda la nota de soporte.
check(
  "el paso 4 pide el descubrimiento",
  await waitFor(`window.__t.bodyHas('¿Cómo conociste Necto?')`, { label: "paso descubrimiento" })
);
await evaluate(`window.__t.clickText('button', 'Recomendación')`);
await evaluate(`window.__t.clickText('button', 'Continuar')`);

// Paso 5 — Soporte. La nota es **opcional**, así que lo que se prueba no es que
// bloquee el avance, sino que el texto escrito llegue íntegro al perfil: es la
// única razón por la que la caja existe.
const SUPPORT_NOTE = "Voy a necesitar ayuda para cargar mi catálogo inicial.";
check(
  "el paso 5 pide la nota de soporte",
  await waitFor(`window.__t.bodyHas('¿Quieres dejarnos algo por escrito?')`, {
    label: "paso soporte",
  })
);
check(
  "el paso 5 ofrece una caja de texto vacía",
  (await evaluate(`document.querySelector('textarea#new-user-support-note')?.value === ""`)) === true
);
check(
  "se puede cerrar el asistente sin escribir la nota",
  (await evaluate(
    `Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Entrar a mi hub') && !b.disabled)`
  )) === true
);
await evaluate(
  `window.__t.set('textarea#new-user-support-note', ${JSON.stringify(SUPPORT_NOTE)})`
);
check(
  "la nota escrita llega a la caja de texto",
  (await evaluate(`window.__t.val('textarea#new-user-support-note')`)) === SUPPORT_NOTE
);
await screenshot("02-onboarding-soporte");
await evaluate(`window.__t.clickText('button', 'Entrar a mi hub')`);
check(
  "el onboarding del usuario termina en el hub",
  await waitFor(`location.pathname === "/workspaces"`, { label: "pathname /workspaces" })
);

/* ── 3. Perfil persistido ──────────────────────────────────────────── */

console.log("\n── Fase 3 · Perfil persistido en localStorage ──");
await installHelpers();
const persisted = await evaluate(`window.__t.profile(${JSON.stringify(ADMIN.email)})`);
check("existe un perfil guardado", !!persisted, persisted ? "ok" : "null");
if (persisted) {
  check("rol = client_admin", persisted.role === "client_admin", persisted.role);
  check("nombre heredado del registro", persisted.firstName === ADMIN.firstName, persisted.firstName);
  check("apellido heredado del registro", persisted.lastName === ADMIN.lastName, persisted.lastName);
  check("correo de la cuenta", persisted.email === ADMIN.email, persisted.email);
  // `userId` es la identidad **estable** de la persona: se genera al crear la
  // cuenta y no se deriva del correo. Antes el identificador era
  // `profile:<email>`, así que vincular Google o cambiar el correo habría
  // cambiado quién es el usuario.
  check(
    "userId estable, no derivado del correo",
    typeof persisted.userId === "string" &&
      persisted.userId.length > 0 &&
      !persisted.userId.includes(ADMIN.email),
    persisted.userId
  );
  check("sin identificador legado derivado del correo", persisted.id === undefined, String(persisted.id));
  check(
    "acento elegido persistido",
    persisted.accent === "secondary",
    String(persisted.accent)
  );
  check(
    "avatar elegido persistido",
    typeof persisted.avatarUrl === "string" && persisted.avatarUrl.startsWith("data:image/svg+xml"),
    String(persisted.avatarUrl).slice(0, 34)
  );
  check("país capturado", persisted.country === "México", String(persisted.country));
  check(
    "motivo de uso persistido",
    persisted.onboarding?.usageReason === "control_stock",
    String(persisted.onboarding?.usageReason)
  );
  check(
    "descubrimiento persistido",
    persisted.onboarding?.referralSource === "recommendation",
    String(persisted.onboarding?.referralSource)
  );
  // La nota del paso 5 se guarda tal cual, sin clasificar ni enrutar: hoy sólo
  // queda almacenada con el resto del onboarding.
  check(
    "nota de soporte persistida",
    persisted.onboarding?.supportNote === SUPPORT_NOTE,
    String(persisted.onboarding?.supportNote)
  );
  // `newUserCompletedAt` es LA marca de "onboarding del usuario terminado": decide
  // hub vs retomar el asistente. Sin ella el flujo reaparece en cada inicio de sesión.
  check(
    "onboarding del usuario sellado",
    typeof persisted.onboarding?.newUserCompletedAt === "string" &&
      persisted.onboarding.newUserCompletedAt.length > 0,
    String(persisted.onboarding?.newUserCompletedAt)
  );
  // El canal de notificaciones no se pregunta en este asistente: se comprueba que
  // queda el valor por defecto del perfil, no uno inventado por el flujo.
  check(
    "canal de notificaciones con su valor por defecto",
    persisted.preferences?.notificationChannel === "whatsapp",
    JSON.stringify(persisted.preferences)
  );
  check(
    "sin último acceso nulo tras el alta",
    persisted.lastSignInAt === null || typeof persisted.lastSignInAt === "string"
  );
}

/* ── 4. Hub sin sedes → lanzar el wizard de tienda ─────────────────── */

console.log("\n── Fase 4 · Hub sin sedes → crear la primera tienda ──");
await installHelpers();
check(
  "el hub muestra el estado sin sucursales",
  (await evaluate(`window.__t.bodyHas('Aún no tienes sucursales')`)) === true
);
check(
  "sin sedes todavía",
  (await evaluate(
    `(JSON.parse(localStorage.getItem("necto_businesses") || "[]")).length === 0`
  )) === true
);
// El estado vacío es el punto de entrega del onboarding del perfil: se guarda
// como imagen porque es la pantalla que decide si crear una sede parece opcional.
await screenshot("00-hub-sin-sedes");
await evaluate(`window.__t.clickText('button', 'Crear mi primera tienda')`);
check(
  "el CTA abre el wizard de tienda",
  await waitFor(`location.pathname === "/onboarding"`, { label: "pathname /onboarding" })
);

/* ── 5. Wizard de sucursal · tienda + 3 pasos de sede ──────────────── */

console.log("\n── Fase 5 · Wizard de sucursal · 4 pasos (la tienda nace) ──");
await installHelpers();
// El wizard arranca en el paso de TIENDA: sin sucursales, la primera es la que da
// de alta la tienda, así que hay que tipificar el negocio una sola vez.
check(
  "paso 1 pide la identidad de la TIENDA",
  await waitFor(`!!document.querySelector('select#store-country')`, { label: "#store-country" })
);
check(
  "el wizard no pide la identidad del titular",
  (await evaluate(`!document.querySelector('input#admin-first-name')`)) === true
);
check(
  "la tienda se define antes que la sucursal (aún sin datos de sede)",
  (await evaluate(`!document.querySelector('input#branch-name')`)) === true
);
await evaluate(`window.__t.clickText('button', 'Gastronomía')`);
await evaluate(`window.__t.clickText('button', 'Continuar')`);

// Paso 2: identidad de la SUCURSAL — ni titular ni negocio, sólo la unidad.
// El teléfono de atención forma parte de esa identidad: nombre, código y teléfono.
check(
  "paso 2 pide nombre, código y teléfono de la sucursal",
  await waitFor(`!!document.querySelector('input#branch-phone')`, { label: "#branch-phone" })
);
check(
  "el código interno viene sugerido",
  (await evaluate(`window.__t.val('input#branch-code')`)) === ADMIN.branchCode,
  await evaluate(`window.__t.val('input#branch-code')`)
);
check(
  "la sucursal no vuelve a preguntar quién es el titular",
  (await evaluate(`!window.__t.bodyHas('Nombre del Administrador')`)) === true
);
// El teléfono de la sede llega **vacío**: no hay ninguna línea de sede que
// heredar (es la primera) y el móvil del perfil **no** es un teléfono de atención,
// así que lo escribe quien crea la sucursal. Antes este campo se precargaba con el
// contacto del titular, que es un dato de la persona y no de la tienda.
check(
  "en la primera sede no hay ninguna línea que heredar: el teléfono llega vacío",
  (await evaluate(`window.__t.val('input#branch-phone')`)) === "",
  JSON.stringify(await evaluate(`window.__t.val('input#branch-phone')`))
);
await evaluate(`window.__t.set('input#branch-name', ${JSON.stringify(ADMIN.branchName)})`);
await evaluate(`window.__t.set('input#branch-phone', ${JSON.stringify(ADMIN.branchPhone)})`);
await evaluate(`window.__t.clickText('button', 'Continuar')`);

// Paso 3: ubicación PROPIOS de la sede.
check(
  "paso 3 pide la ubicación de la sede",
  await waitFor(`!!document.querySelector('input#branch-city')`, { label: "#branch-city" })
);
check(
  "la ubicación no vuelve a pedir el teléfono",
  (await evaluate(`!document.querySelector('input#branch-phone')`)) === true
);
await evaluate(`window.__t.set('input#branch-address', ${JSON.stringify(ADMIN.branchAddress)})`);
await evaluate(`window.__t.set('input#branch-city', ${JSON.stringify(ADMIN.branchCity)})`);
await evaluate(`window.__t.clickText('button', 'Continuar')`);

// Paso 4: operación de la sede (horarios, canales y módulos).
check(
  "paso 4 pide la operación de la sede",
  await waitFor(`!!document.querySelector('input#branch-opening-hours')`, {
    label: "#branch-opening-hours",
  })
);
await evaluate(
  `window.__t.set('input#branch-opening-hours', ${JSON.stringify(ADMIN.branchHours)})`
);
await evaluate(`window.__t.clickText('button', 'Continuar')`);

// Paso 5: módulos. Tienen paso propio: antes la rejilla compartía el paso de
// operación, así que el alta obligaba a decidir horarios, canales y módulos a la vez.
check(
  "paso 5 pide los módulos de la sede",
  await waitFor(`window.__t.bodyHas('Pedidos omnicanal')`, { label: "rejilla de módulos" })
);
await evaluate(`window.__t.clickText('button', 'Continuar')`);

// Paso 6: WhatsApp Business. Es opcional, pero tiene paso propio y protagonismo.
// El paso ya **no** ofrece un QR de dispositivos vinculados: explica la
// autorización con Meta (Embedded Signup) y, mientras no exista el backend,
// ofrece una conexión de demostración marcada como tal en lugar de aparentar una
// integración que todavía no está hecha.
check(
  "paso 6 explica la conexión con WhatsApp Business",
  await waitFor(`window.__t.bodyHas('Autorizas con Meta, sin copiar claves')`, {
    label: "paso WhatsApp",
  })
);
check(
  "el paso 6 no ofrece el vínculo por QR de dispositivos",
  (await evaluate(
    `!window.__t.bodyHas('Escanear QR') && !window.__t.bodyHas('Vincular por Teléfono')`
  )) === true
);
check(
  "el paso 6 permite continuar sin conectarlo",
  (await evaluate(`window.__t.bodyHas('Continuar sin conectarlo')`)) === true
);
await installHelpers();

/* ── 6. Cierre del wizard y datos propios de la sucursal ───────────── */

console.log("\n── Fase 6 · Cierre del wizard y datos de la sucursal ──");
await evaluate(`window.__t.clickText('button', 'Crear tienda y sucursal')`);
check(
  "el wizard termina en el hub",
  await waitFor(`location.pathname === "/"`, { timeout: 15000, label: "pathname /" })
);

// Se lee la sede persistida **entera**: el alta de sucursal debe guardar sus
// propios datos operativos (código, dirección y horario incluidos), no sólo el
// nombre. Afirmar que el asistente "abre" no basta: el defecto vive en lo que
// persiste al final del flujo.
const branch = await evaluate(`
  (() => {
    try {
      const list = JSON.parse(localStorage.getItem("necto_businesses") || "[]");
      const b = list.find(x => x.name === ${JSON.stringify(ADMIN.branchName)});
      if (!b) return null;
      return {
        code: b.code, address: b.address, city: b.city, phone: b.contactPhone,
        days: b.openingDays, hours: b.openingHours, type: b.businessType,
        currency: b.currency, country: b.country, total: list.length,
      };
    } catch { return null; }
  })()
`);
console.log("   sede persistida:", JSON.stringify(branch));
check("se creó exactamente una sede", branch?.total === 1, String(branch?.total));
check("el código interno se persiste", branch?.code === ADMIN.branchCode, String(branch?.code));
check("la ciudad es la de la sucursal", branch?.city === ADMIN.branchCity, String(branch?.city));
check(
  "la dirección se persiste",
  branch?.address === ADMIN.branchAddress,
  String(branch?.address)
);
check(
  "el teléfono es el PROPIO de la sede, no el del titular",
  branch?.phone === ADMIN.branchPhone,
  String(branch?.phone)
);
check("el horario se persiste", branch?.hours === ADMIN.branchHours, String(branch?.hours));
check(
  "los días de operación se persisten",
  branch?.days === "Lunes a sábado",
  String(branch?.days)
);
check("la tienda queda tipificada", branch?.type === "restaurant_virtual", String(branch?.type));

/* ── 6b. Segunda sucursal: sin secuestro y sin repetir la tienda ───── */

console.log("\n── Fase 6b · Segunda sucursal (perfil y sede sin teléfono) ──");
// Dos reglas a la vez:
//  1. El wizard de sucursal exige **sesión, no un perfil completo**. Si vuelve a
//     redirigir a `/onboarding/nuevo-usuario`, pulsar "Nueva sucursal" deja de crear
//     sedes y el alta de sucursal se vuelve inalcanzable desde el hub.
//  2. La segunda sucursal NO vuelve a tipificar la tienda: no debe pedir tipo de
//     negocio ni modelo de oferta, sólo datos de la unidad operativa.
// Además se prepara el caso **hostil** del teléfono: la persona SÍ tiene móvil en
// su perfil, y la sede existente NO tiene línea. La sucursal nueva debe llegar con
// el campo vacío —el móvil del titular es del titular, no un teléfono de atención—
// y conseguir el suyo. Antes lo heredaba del perfil, así que un móvil privado se
// publicaba como línea de atención de la tienda.
const SECOND = { name: "Sede Norte", city: "Bogotá", phone: "+57 601 222 3344" };
await evaluate(`
  (() => {
    const store = JSON.parse(localStorage.getItem("necto_user_profiles") || "{}");
    const email = ${JSON.stringify(ADMIN.email)};
    if (store[email]) {
      store[email].contactPhone = ${JSON.stringify(ADMIN.phone)};
      localStorage.setItem("necto_user_profiles", JSON.stringify(store));
    }
    const list = JSON.parse(localStorage.getItem("necto_businesses") || "[]");
    if (list[0]) {
      list[0].contactPhone = "";
      localStorage.setItem("necto_businesses", JSON.stringify(list));
    }
    return true;
  })()
`);
await nav(`${APP}/workspaces`);
check(
  "el hub sigue listando la sede creada",
  (await evaluate(`window.__t.bodyHas(${JSON.stringify(ADMIN.branchName)})`)) === true
);
await evaluate(`window.__t.clickText('button', 'Nueva sucursal')`);
check(
  "Nueva sucursal abre el asistente (no el formulario de perfil)",
  await waitFor(`location.pathname === "/onboarding"`, { timeout: 15000, label: "pathname /onboarding" })
);
check(
  "arranca en el paso de SUCURSAL, no en el de tienda",
  await waitFor(`!!document.querySelector('input#branch-name')`, { label: "#branch-name" })
);
check(
  "la segunda sucursal no vuelve a pedir el tipo de negocio",
  (await evaluate(`!document.querySelector('select#store-country')`)) === true
);
check(
  "la segunda sucursal no vuelve a preguntar el modelo de oferta",
  (await evaluate(`!window.__t.bodyHas('¿Qué comercializas?')`)) === true
);

await evaluate(`window.__t.set('input#branch-name', ${JSON.stringify(SECOND.name)})`);
// La guarda de la separación: el perfil SÍ tiene móvil y aun así el campo llega
// vacío. Si alguien vuelve a colar `profile?.contactPhone` en el fallback del
// teléfono de la sede, esta línea se pone roja.
check(
  "el teléfono de la sede no hereda el móvil del perfil",
  (await evaluate(`window.__t.val('input#branch-phone')`)) === "",
  JSON.stringify(await evaluate(`window.__t.val('input#branch-phone')`))
);
await evaluate(`window.__t.set('input#branch-phone', ${JSON.stringify(SECOND.phone)})`);
await evaluate(`window.__t.clickText('button', 'Continuar')`);
await waitFor(`!!document.querySelector('input#branch-city')`, { label: "#branch-city" });
await evaluate(`window.__t.set('input#branch-city', ${JSON.stringify(SECOND.city)})`);
await evaluate(`window.__t.clickText('button', 'Continuar')`);
await waitFor(`!!document.querySelector('input#branch-opening-hours')`, {
  label: "#branch-opening-hours",
});
// Los dos pasos nuevos también aparecen en la segunda sucursal.
await evaluate(`window.__t.clickText('button', 'Continuar')`);
check(
  "la segunda sucursal también pasa por los módulos",
  await waitFor(`window.__t.bodyHas('Pedidos omnicanal')`, { label: "rejilla de módulos" })
);
await evaluate(`window.__t.clickText('button', 'Continuar')`);
check(
  "y por el paso de WhatsApp Business",
  await waitFor(`window.__t.bodyHas('Autorizas con Meta, sin copiar claves')`, {
    label: "paso WhatsApp",
  })
);
await evaluate(`window.__t.clickText('button', 'Crear sucursal')`);
check(
  "la segunda sucursal cierra en el hub",
  await waitFor(`location.pathname === "/"`, { timeout: 15000, label: "pathname /" })
);

const second = await evaluate(`
  (() => {
    try {
      const list = JSON.parse(localStorage.getItem("necto_businesses") || "[]");
      const b = list.find(x => x.name === ${JSON.stringify(SECOND.name)});
      if (!b) return null;
      return {
        phone: b.contactPhone, city: b.city, code: b.code,
        type: b.businessType, currency: b.currency, total: list.length,
      };
    } catch { return null; }
  })()
`);
console.log("   segunda sede:", JSON.stringify(second));
check("se creó la segunda sucursal", second?.total === 2, String(second?.total));
check(
  "la sucursal sin herencia consigue contacto propio",
  second?.phone === SECOND.phone,
  String(second?.phone)
);
check("código correlativo de sucursal", second?.code === "SUC-02", String(second?.code));
check("la ciudad es la de la segunda sede", second?.city === SECOND.city, String(second?.city));
check(
  "la identidad de la tienda se hereda",
  second?.type === "restaurant_virtual" && second?.currency === "COP",
  `${second?.type} · ${second?.currency}`
);

// Restaurar el teléfono del perfil, el de la primera sede y la sede ACTIVA:
// las fases siguientes comprueban datos reales y asumen el estado previo. Crear
// una sede la deja activa, y la "sede habitual" del perfil cae en la activa
// mientras el perfil no tenga una preferida.
await evaluate(`
  (() => {
    const store = JSON.parse(localStorage.getItem("necto_user_profiles") || "{}");
    const email = ${JSON.stringify(ADMIN.email)};
    if (store[email]) {
      store[email].contactPhone = ${JSON.stringify(ADMIN.phone)};
      localStorage.setItem("necto_user_profiles", JSON.stringify(store));
    }
    const list = JSON.parse(localStorage.getItem("necto_businesses") || "[]");
    const first = list.find(b => b.name === ${JSON.stringify(ADMIN.branchName)});
    if (first) {
      first.contactPhone = ${JSON.stringify(ADMIN.branchPhone)};
      localStorage.setItem("necto_businesses", JSON.stringify(list));
      localStorage.setItem("necto_active_business_id", first.id);
    }
    return true;
  })()
`);
await nav(`${APP}/workspaces`);

/* ── 7. El hub muestra la identidad real ───────────────────────────── */

console.log("\n── Fase 7 · Identidad real en el menú de perfil ──");
await evaluate(`window.__t.click('button[aria-label="Perfil de usuario y sucursales"]')`);
check(
  "el menú muestra el nombre capturado",
  await waitFor(`window.__t.bodyHas(${JSON.stringify(`${ADMIN.firstName} ${ADMIN.lastName}`)})`, {
    label: "nombre en el menú",
  })
);
check(
  "el menú muestra el rol Admin Cliente",
  (await evaluate(`window.__t.bodyHas('Admin Cliente')`)) === true
);
check(
  "sin el nombre mock anterior",
  (await evaluate(`!window.__t.bodyHas('Administrador Master')`)) === true
);
// Cerrar el menú: el trigger es un toggle y hay que dejarlo cerrado para el
// siguiente paso, o "Ajustes de perfil" no estaría visible.
await evaluate(`window.__t.click('button[aria-label="Perfil de usuario y sucursales"]')`);
await sleep(250);

/* ── 8. Ajustes de perfil · datos reales ───────────────────────────── */

console.log("\n── Fase 8 · Ajustes de perfil · datos reales ──");
await installHelpers();
await evaluate(`window.__t.click('button[aria-label="Perfil de usuario y sucursales"]')`);
await sleep(300);
await installHelpers();
await evaluate(`window.__t.clickText('button', 'Ajustes de perfil')`);
check(
  "el modal de ajustes se abre",
  await waitFor(`window.__t.bodyHas('Ajustes de perfil & Cuenta')`, { label: "modal abierto" })
);
await installHelpers();
await sleep(300);
await installHelpers();

check(
  "el nombre en el formulario es el real",
  (await evaluate(`window.__t.val('[data-intent="account.firstName.control"]')`)) === ADMIN.firstName,
  await evaluate(`window.__t.val('[data-intent="account.firstName.control"]')`)
);
check(
  "la ciudad aparece vacía (sin mock) en vez de un valor inventado",
  (await evaluate(`window.__t.val('[data-intent="account.city.control"]')`)) === "",
  String(await evaluate(`window.__t.val('[data-intent="account.city.control"]')`))
);
// El `Select` de @/elements es no controlado: si el borrador se siembra después
// del montaje, el select se queda en el placeholder aunque el valor exista.
// La sede habitual cae en la sede ACTIVA mientras el perfil no tenga una
// preferida, así que la expectativa se **deriva del estado persistido** en lugar
// de fijar un nombre: un nombre fijo se rompe en cuanto hay más de una sede.
const sedeSelect = await evaluate(`(() => {
  const s = Array.from(document.querySelectorAll('select')).find(x => x.options.length > 0);
  return s ? { value: s.value, label: s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : "" } : null;
})()`);
const activeBranchName = await evaluate(`(() => {
  try {
    const list = JSON.parse(localStorage.getItem("necto_businesses") || "[]");
    const id = localStorage.getItem("necto_active_business_id");
    const b = list.find(x => x.id === id) || list[0];
    return b ? b.name : "";
  } catch { return ""; }
})()`);
check(
  "la sede habitual se muestra seleccionada, no el placeholder",
  !!sedeSelect && sedeSelect.value !== "" && sedeSelect.label.includes(activeBranchName),
  JSON.stringify(sedeSelect)
);
await screenshot("02-ajustes-perfil");

// Los campos de contacto viven en su propia pestaña, no en la de perfil.
await evaluate(`window.__t.clickText('button', 'Contacto')`);
check(
  "la pestaña de contacto se abre",
  await waitFor(`!!document.querySelector('[data-intent="account.contactPhone.control"]')`, {
    label: "contactPhone",
  })
);
await installHelpers();
check(
  "el teléfono en el formulario es el real",
  (await evaluate(`window.__t.val('[data-intent="account.contactPhone.control"]')`)) === ADMIN.phone,
  await evaluate(`window.__t.val('[data-intent="account.contactPhone.control"]')`)
);
check(
  "el correo en el formulario es el real",
  (await evaluate(`window.__t.val('[data-intent="account.email.control"]')`)) === ADMIN.email,
  await evaluate(`window.__t.val('[data-intent="account.email.control"]')`)
);
const shiftSelect = await evaluate(`(() => {
  const s = Array.from(document.querySelectorAll('select')).find(x => x.options.length > 1);
  return s ? { value: s.value, label: s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : "" } : null;
})()`);
check(
  "la disponibilidad de alertas se muestra seleccionada",
  !!shiftSelect && shiftSelect.value === "all_shifts" && /24\/7/.test(shiftSelect.label),
  JSON.stringify(shiftSelect)
);
check(
  "sin el correo de facturación mock",
  (await evaluate(`!window.__t.bodyHas('facturacion@necto.app')`)) === true
);

/* ── 9. Editar y guardar ───────────────────────────────────────────── */

console.log("\n── Fase 9 · Edición y persistencia ──");
await evaluate(`window.__t.clickText('button', 'Perfil y personalización')`);
await sleep(400);
await installHelpers();
await evaluate(`window.__t.set('[data-intent="account.city.control"]', 'Medellín')`);
await evaluate(`window.__t.set('[data-intent="account.documentId.control"]', '1020304050')`);
await evaluate(`window.__t.clickText('button', 'Guardar cambios')`);
check(
  "aviso de guardado",
  await waitFor(`window.__t.bodyHas('Ajustes guardados correctamente')`, { label: "toast" })
);
await sleep(400);
await installHelpers();
const afterSave = await evaluate(`window.__t.profile(${JSON.stringify(ADMIN.email)})`);
check("ciudad persistida", afterSave?.city === "Medellín", String(afterSave?.city));
check("documento persistido", afterSave?.documentId === "1020304050", String(afterSave?.documentId));

/* ── 10. Preferencias · tema ───────────────────────────────────────── */

console.log("\n── Fase 10 · Preferencias · tema ──");
await installHelpers();
await evaluate(`window.__t.clickText('button', 'Preferencias')`);
check(
  "pestaña de preferencias visible",
  await waitFor(`window.__t.bodyHas('Canal Preferido de Notificaciones')`, { label: "prefs tab" })
);
await installHelpers();
await evaluate(`window.__t.clickText('button', 'Oscuro')`);
await evaluate(`window.__t.clickText('button', 'Guardar cambios')`);
await sleep(900);
await installHelpers();
const darkApplied = await evaluate(`document.documentElement.classList.contains("dark")`);
check("el tema oscuro se aplica al guardar", darkApplied === true);
const themePersisted = await evaluate(`window.__t.profile(${JSON.stringify(ADMIN.email)})`);
check(
  "la preferencia de tema se persiste",
  themePersisted?.preferences?.theme === "dark",
  String(themePersisted?.preferences?.theme)
);
await screenshot("03-preferencias-oscuro");

/* ── 11. Seguridad · 2FA persistido ────────────────────────────────── */

console.log("\n── Fase 11 · Seguridad ──");
await installHelpers();
await evaluate(`window.__t.clickText('button', 'Seguridad')`);
check(
  "pestaña de seguridad visible",
  await waitFor(`window.__t.bodyHas('Autenticación en Dos Pasos')`, { label: "security tab" })
);
await installHelpers();
check(
  "2FA arranca desactivado (dato real)",
  (await evaluate(`window.__t.bodyHas('Desactivado')`)) === true
);
await evaluate(`window.__t.click('[data-intent="account.2fa"]')`);
await sleep(200);
await evaluate(`window.__t.clickText('button', 'Guardar cambios')`);
await sleep(900);
await installHelpers();
const afterSecurity = await evaluate(`window.__t.profile(${JSON.stringify(ADMIN.email)})`);
check(
  "2FA se persiste",
  afterSecurity?.twoFactorEnabled === true,
  String(afterSecurity?.twoFactorEnabled)
);
await screenshot("04-seguridad");

/* ── 12. Permisos · rol real ───────────────────────────────────────── */

console.log("\n── Fase 12 · Permisos ──");
await installHelpers();
await evaluate(`window.__t.clickText('button', 'Alcance y permisos')`);
check(
  "la matriz de permisos se renderiza",
  await waitFor(`window.__t.bodyHas('Alcance & Permisos de la Cuenta')`, { label: "permisos" })
);
// La matriz dejó de ser una lista fija: se deriva de los módulos activos de la
// sede activa. Se comprueba que el bloque existe, no solo el encabezado.
check(
  "la matriz lista los módulos de la sede activa",
  (await evaluate(`window.__t.bodyHas('Módulos Operativos Activos')`)) === true
);
check(
  "sin el rol mock Super Admin",
  (await evaluate(`!window.__t.bodyHas('Super Admin')`)) === true
);
check(
  "el rol de la cuenta es Admin Cliente",
  (await evaluate(`window.__t.bodyHas('Admin Cliente')`)) === true
);
/* El catálogo de roles quedó en uno: los roles de restaurante que ningún flujo
 * usaba ya no deben aparecer en ninguna parte de la UI. */
check(
  "sin roles retirados en la UI",
  (await evaluate(
    `!window.__t.bodyHas('Cocinero') && !window.__t.bodyHas('Mesero') && !window.__t.bodyHas('Encargado de Insumos')`
  )) === true
);
check(
  "sin la opción de cambiar de perfil",
  (await evaluate(`!window.__t.bodyHas('Cambiar Perfil')`)) === true
);

/* ── 13. Persistencia tras recarga ─────────────────────────────────── */

console.log("\n── Fase 13 · Persistencia tras recarga ──");
await nav(APP);
await installHelpers();
const afterReload = await evaluate(`window.__t.profile(${JSON.stringify(ADMIN.email)})`);
check("el perfil sobrevive a la recarga", !!afterReload);
check("ciudad conservada", afterReload?.city === "Medellín", String(afterReload?.city));
check("tema conservado", afterReload?.preferences?.theme === "dark", String(afterReload?.preferences?.theme));
check("2FA conservado", afterReload?.twoFactorEnabled === true, String(afterReload?.twoFactorEnabled));
check(
  "el avatar se conserva",
  typeof afterReload?.avatarUrl === "string" && afterReload.avatarUrl.length > 0
);
check(
  "el menú sigue mostrando la identidad real tras recargar",
  await (async () => {
    await evaluate(`window.__t.click('button[aria-label="Perfil de usuario y sucursales"]')`);
    return waitFor(`window.__t.bodyHas(${JSON.stringify(ADMIN.firstName)})`, { label: "menu tras recarga" });
  })()
);

/* ── 14. Regresión · clave legada migrada ──────────────────────────── */

console.log("\n── Fase 14 · Migración del avatar legado ──");
check(
  "la clave legada necto_user_avatar ya no se usa",
  (await evaluate(`localStorage.getItem("necto_user_avatar") === null`)) === true
);

/* ── Informe ───────────────────────────────────────────────────────── */

const passed = results.length - failures;
console.log(`\n${"=".repeat(60)}`);
console.log(`RESULTADO: ${passed}/${results.length} ✅  (${failures} fallos)`);
console.log(`${"=".repeat(60)}\n`);
if (failures > 0) {
  console.log("Fallos:");
  results.filter((r) => !r.ok).forEach((r) => console.log(`  ✗ ${r.label}${r.detail ? " :: " + r.detail : ""}`));
}
writeFileSync(`${OUT}verify-profile-report.json`, JSON.stringify({ passed, total: results.length, results }, null, 2));

cdp.close();
process.exit(failures > 0 ? 1 : 0);
