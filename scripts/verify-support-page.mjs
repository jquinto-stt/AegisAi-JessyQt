/**
 * verify-support-page.mjs — Soporte (`/soporte`).
 *
 * Comprueba la página de soporte de punta a punta contra el navegador real:
 *
 *   1. carga sin sesión, con la banda en el verde del contenido público;
 *   2. los tres canales existen y apuntan a donde dicen;
 *   3. el formulario **valida** (no deja enviar en vacío) y **registra** lo que
 *      se escribió —incluida la referencia que enseña la confirmación—;
 *   4. el puente `/ayuda → /soporte` navega sin recargar la página;
 *   5. el botón de soporte de la cabecera de la aplicación lleva a `/soporte`.
 *
 * Uso:  node scripts/verify-support-page.mjs
 *       NECTO_APP_URL=http://localhost:5173 node scripts/verify-support-page.mjs
 *
 * Requiere el dev server y Chrome con CDP ya levantados (ver skill cdp-ui-verify).
 *
 * ⚠️ Es **autocontenida**: siembra sus propias fixtures (el registro de
 * solicitudes y, para la última fase, una sesión y una sede) antes de medir. No
 * hereda nada del arnés que haya corrido antes en la misma pestaña.
 */

import { writeFileSync, mkdirSync } from "node:fs";

const APP_URL = process.env.NECTO_APP_URL || "http://localhost:5173";
const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9222";
const OUT = "./artifacts/";
mkdirSync(OUT, { recursive: true });

/** Clave del registro de solicitudes. Tiene que coincidir con
 *  `pages/support/support-requests.ts`; si allí se sube la versión, aquí también. */
const REQUESTS_KEY = "necto_support_requests_v1";

/* ── Contadores ──────────────────────────────────────────────────────── */
let passed = 0;
const failures = [];
function check(label, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(label);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/* ── Boilerplate CDP ─────────────────────────────────────────────────── */
async function getPageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${CDP_BASE}/json/list`);
      const targets = await res.json();
      // NECTO_TAB_ID = pestaña dedicada asignada por verify-all.mjs (aislamiento).
      const page = targets.find((t) => t.id === process.env.NECTO_TAB_ID)
        || targets.find(
          (t) => t.type === "page" && t.webSocketDebuggerUrl && !t.url.startsWith("devtools")
        );
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
            const msgId = ++id;
            pending.set(msgId, { res, rej });
            ws.send(JSON.stringify({ id: msgId, method, params }));
          });
        },
        close: () => ws.close(),
      })
    );
    ws.addEventListener("error", reject);
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method) events.push(msg);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
      }
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cdp = await connect((await getPageTarget()).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
await cdp.send("Page.enable");
await cdp.send("DOM.enable");
await cdp.send("Network.enable");
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
// Headless arranca a 800×600: sin esto el layout de escritorio no se maqueta.
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

const evaluate = async (expression) => {
  const r = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

const waitFor = async (expression, label, timeoutMs = 25000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      if (await evaluate(expression)) return true;
    } catch {}
    await sleep(350);
  }
  throw new Error(`Timeout waiting for: ${label}`);
};

const shot = async (name) => {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(OUT + name, Buffer.from(data, "base64"));
};

/** Excepciones de runtime, filtrando el ruido del dev server. */
const newExceptions = () =>
  cdp.events.filter(
    (e) =>
      e.method === "Runtime.exceptionThrown" &&
      !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e))
  ).length;

/**
 * Escribe en un control **de React**.
 *
 * ⚠️ `el.value = x` no basta: React guarda el valor anterior en su tracker y
 * descarta el `input` que sigue. Hay que pasar por el setter del prototipo, que
 * es el que el tracker no ha visto. `proto` distingue `<input>` de `<textarea>`.
 */
const fill = (selector, value, proto = "HTMLInputElement") =>
  evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return "sin-control";
    const setter = Object.getOwnPropertyDescriptor(window.${proto}.prototype, "value").set;
    setter.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return el.value;
  })()`);

/* ═══════════════════════════════════════════════════════════════════════
   Fase 1 · La página carga sin sesión
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── Fase 1 · Carga sin sesión ──");

// ⚠️ Navegar ANTES de tocar `localStorage`: la pestaña arranca en `about:blank`,
// cuyo origen es **opaque** y acceder a `localStorage` ahí lanza `SecurityError`.
await cdp.send("Page.navigate", { url: APP_URL });
await waitFor(`!!document.body`, "el primer render");
// ⚠️ `localStorage.clear()` y no sólo borrar la clave del registro: la fase 1
// mide el estado **sin sesión**, así que el arnés tiene que sembrar también su
// ausencia. Sin esto hereda la sesión que dejó la fase 6 de la corrida anterior
// —mismo origen, mismo `localStorage`— y el botón de vuelta dice "Volver al
// hub": un rojo que no tiene nada que ver con el producto. Y la fase 3 depende
// de lo mismo: con sesión, el correo llega precargado y "enviar vacío" deja de
// marcar ese campo.
await evaluate(`localStorage.clear()`);

await cdp.send("Page.navigate", { url: `${APP_URL}/soporte` });
await waitFor(
  `document.querySelector("h1") && document.querySelector("h1").textContent.includes("Estamos para ayudarte")`,
  "el h1 de soporte"
);

const exceptionsOnLoad = newExceptions();
check("renderiza sin excepciones de runtime", exceptionsOnLoad === 0, `${exceptionsOnLoad} excepción(es)`);

const heroColor = await evaluate(`(() => {
  const h1 = document.querySelector("h1");
  const band = h1 && h1.closest("section");
  return band ? getComputedStyle(band).backgroundColor : null;
})()`);
check(
  "el hero usa el verde del contenido público (public-500 #17B363)",
  heroColor === "rgb(23, 179, 99)",
  `background-color = ${heroColor}`
);

const seals = await evaluate(
  `document.querySelectorAll("section:first-of-type svg").length`
);
check("el hero pinta los 4 sellos", seals >= 4, `${seals} iconos`);

const backLabel = await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find(b => /Volver al hub|Iniciar sesión/.test(b.textContent));
  return btn ? btn.textContent.trim() : null;
})()`);
check("sin sesión, ofrece iniciar sesión", backLabel === "Iniciar sesión", `botón = "${backLabel}"`);

await shot("soporte-01-hero.png");

/* ═══════════════════════════════════════════════════════════════════════
   Fase 2 · Canales de contacto
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── Fase 2 · Canales de contacto ──");

const channels = await evaluate(`(() => {
  const h = document.getElementById("support-channels");
  const sec = h && h.closest("section");
  if (!sec) return null;
  return [...sec.querySelectorAll("a")].map(a => ({
    href: a.getAttribute("href"),
    text: a.textContent.replace(/\\s+/g, " ").trim().slice(0, 46),
  }));
})()`);

check("hay 3 canales", Array.isArray(channels) && channels.length === 3, `count = ${channels?.length}`);
check(
  "el primer canal es el centro de ayuda y navega dentro de la app",
  channels?.[0]?.href === "/ayuda",
  JSON.stringify(channels?.[0])
);
check(
  "el canal del formulario es un ancla de la propia página",
  channels?.[1]?.href === "#solicitud",
  JSON.stringify(channels?.[1])
);
check(
  "el canal de correo es un mailto al buzón declarado",
  channels?.[2]?.href === "mailto:soporte@necto.app",
  JSON.stringify(channels?.[2])
);

await evaluate(`window.scrollTo(0, document.getElementById("support-channels").getBoundingClientRect().top + window.scrollY - 140)`);
await sleep(400);
await shot("soporte-02-canales.png");

/* ═══════════════════════════════════════════════════════════════════════
   Fase 3 · El formulario valida y registra
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── Fase 3 · Formulario ──");

const formPresent = await evaluate(`!!document.querySelector("[data-support-request-form]")`);
check("el formulario existe", formPresent === true);

// 3.a — Enviar en vacío: los tres campos deben marcarse.
await evaluate(`document.querySelector("[data-support-submit]").click()`);
await sleep(600);

const errors = await evaluate(`(() => {
  const read = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const p = el.parentElement && el.parentElement.querySelector("p");
    return p ? p.textContent.trim() : null;
  };
  return {
    subject: read("#support-subject"),
    message: read("#support-message"),
    email: read("#support-email"),
    // El envío no debe haber ocurrido: sigue el formulario y no la confirmación.
    stillForm: !!document.querySelector("[data-support-request-form]"),
    stored: localStorage.getItem(${JSON.stringify(REQUESTS_KEY)}),
  };
})()`);

check("el asunto se marca en rojo al enviar vacío", (errors.subject || "").length > 10, `"${errors.subject}"`);
check("la descripción se marca en rojo al enviar vacío", (errors.message || "").length > 10, `"${errors.message}"`);
check("el correo se marca en rojo al enviar vacío", (errors.email || "").length > 10, `"${errors.email}"`);
check("un envío inválido no registra nada", errors.stored === null, String(errors.stored));

await evaluate(`window.scrollTo(0, document.getElementById("solicitud").getBoundingClientRect().top + window.scrollY - 100)`);
await sleep(400);
await shot("soporte-03-formulario.png");

// 3.b — Rellenar con datos válidos. El asunto y el correo se eligen **no
// vacíos** para que la aserción de persistencia pruebe la captura de verdad.
const SUBJECT = "No puedo entrar con mi correo";
const MESSAGE =
  "Escribo la contraseña correcta y la pantalla se queda cargando. Ya probé en otro navegador y pasa lo mismo.";
const EMAIL = "prueba.soporte@necto.app";

const written = {
  subject: await fill("#support-subject", SUBJECT),
  message: await fill("#support-message", MESSAGE, "HTMLTextAreaElement"),
  email: await fill("#support-email", EMAIL),
};
check(
  "los tres campos aceptan lo escrito (estado de React, no sólo el DOM)",
  written.subject === SUBJECT && written.message === MESSAGE && written.email === EMAIL,
  JSON.stringify(written)
);

await evaluate(`document.querySelector("[data-support-submit]").click()`);
await waitFor(`!!document.querySelector("[data-support-sent]")`, "la confirmación de envío");
await sleep(400);

const confirmation = await evaluate(`(() => {
  const panel = document.querySelector("[data-support-sent]");
  if (!panel) return null;
  const ref = panel.querySelector("[data-support-reference]");
  return {
    reference: ref ? ref.textContent.trim() : null,
    text: panel.textContent.replace(/\\s+/g, " ").trim(),
    formGone: !document.querySelector("[data-support-request-form]"),
  };
})()`);

check("el formulario se sustituye por la confirmación", confirmation?.formGone === true);
check(
  "la confirmación enseña una referencia con formato SUP-AAAAMMDD-XXXX",
  /^SUP-\d{8}-[A-Z0-9]{4}$/.test(confirmation?.reference || ""),
  `referencia = ${confirmation?.reference}`
);
check(
  "la confirmación devuelve el motivo, el asunto y el correo enviados",
  (confirmation?.text || "").includes(SUBJECT) && (confirmation?.text || "").includes(EMAIL),
  (confirmation?.text || "").slice(0, 120)
);

await shot("soporte-04-confirmacion.png");

/* ═══════════════════════════════════════════════════════════════════════
   Fase 4 · Lo que se enseña es lo que se guarda
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── Fase 4 · Persistencia ──");

// ⚠️ Se relee el almacenamiento DESPUÉS del envío y se compara con lo que la
// confirmación acaba de pintar. Un guardado que sólo actualizara el estado de
// React pasaría cualquier aserción de pantalla y fallaría aquí.
const stored = await evaluate(`(() => {
  const raw = localStorage.getItem(${JSON.stringify(REQUESTS_KEY)});
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return "json-invalido"; }
})()`);

const record = Array.isArray(stored) ? stored[0] : null;
check("el registro guarda una solicitud", Array.isArray(stored) && stored.length === 1, `count = ${stored?.length}`);
check(
  "la referencia guardada es la que se enseñó",
  record?.reference === confirmation?.reference,
  `guardada = ${record?.reference} · mostrada = ${confirmation?.reference}`
);
check("se guardó el asunto tal cual", record?.subject === SUBJECT, String(record?.subject));
check("se guardó la descripción completa", record?.message === MESSAGE, String(record?.message));
check("se guardó el correo normalizado", record?.email === EMAIL, String(record?.email));
check(
  "se guardó el motivo y la fecha",
  record?.topic === "acceso" && !Number.isNaN(Date.parse(record?.createdAt)),
  `topic = ${record?.topic} · createdAt = ${record?.createdAt}`
);

// 4.b — "Enviar otra solicitud" devuelve el formulario vacío, sin borrar el registro.
await evaluate(`(() => {
  const btn = [...document.querySelectorAll("[data-support-sent] button")]
    .find(b => /otra solicitud/i.test(b.textContent));
  if (btn) btn.click();
  return !!btn;
})()`);
await waitFor(`!!document.querySelector("[data-support-request-form]")`, "el formulario de vuelta");
await sleep(300);

const afterReset = await evaluate(`(() => ({
  subject: document.querySelector("#support-subject").value,
  message: document.querySelector("#support-message").value,
  kept: (JSON.parse(localStorage.getItem(${JSON.stringify(REQUESTS_KEY)}) || "[]")).length,
}))()`);
check(
  "el formulario vuelve vacío pero el registro se conserva",
  afterReset.subject === "" && afterReset.message === "" && afterReset.kept === 1,
  JSON.stringify(afterReset)
);

/* ═══════════════════════════════════════════════════════════════════════
   Fase 5 · El puente desde el centro de ayuda
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── Fase 5 · /ayuda → /soporte ──");

await cdp.send("Page.navigate", { url: `${APP_URL}/ayuda` });
await waitFor(
  `document.querySelector("h1") && document.querySelector("h1").textContent.includes("Ayuda")`,
  "el h1 del centro de ayuda"
);

const bridge = await evaluate(`(() => {
  const links = [...document.querySelectorAll('a[href="/soporte"]')];
  return { count: links.length, text: links.map(a => a.textContent.trim()) };
})()`);
check("el centro de ayuda ofrece el enlace a soporte", bridge.count === 1, JSON.stringify(bridge));

// Marcador en `window`: si sobrevive al clic, la navegación fue de cliente y no
// una recarga completa.
await evaluate(`window.__nectoClientNav = true; document.querySelector('a[href="/soporte"]').click(); true`);
// ⚠️ Esperar por el **titular montado**, no por `location.pathname`: la ruta
// cambia al confirmarse la navegación, antes de que React pinte la página, así
// que esperar por la ruta mide un DOM todavía vacío.
await waitFor(
  `location.pathname === "/soporte" && ((document.querySelector("h1") || {}).textContent || "").includes("Estamos para ayudarte")`,
  "la ruta y el titular de soporte tras el clic"
);
await sleep(300);

const bridgeAfter = await evaluate(`({
  path: location.pathname,
  clientNav: window.__nectoClientNav === true,
  h1: (document.querySelector("h1") || {}).textContent || "",
})`);
check(
  "el clic navega a /soporte sin recargar la página",
  bridgeAfter.path === "/soporte" && bridgeAfter.clientNav === true,
  JSON.stringify(bridgeAfter)
);
check(
  "y la página destino monta su titular",
  bridgeAfter.h1.includes("Estamos para ayudarte"),
  `h1 = "${bridgeAfter.h1}"`
);

/* ═══════════════════════════════════════════════════════════════════════
   Fase 6 · El botón de la cabecera de la aplicación
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── Fase 6 · Acceso desde la app ──");

// El hub tiene guarda de autenticación: sin sesión redirige a `/login`, así que
// la sesión es **estado previo** y hay que sembrarla. Mismo patrón que
// `verify-hub-card.mjs` (⚠️ dentro de un template literal: nada de backticks).
await evaluate(`
  const email = 'soporte.verify@necto.app';
  localStorage.setItem('necto_local_session', JSON.stringify({ email }));
  localStorage.setItem('necto_user_profiles', JSON.stringify({ [email]: {
    userId:'u-soporte', email, firstName:'Soporte', lastName:'Verify', contactPhone:'+57 300 000 0000',
    role:'client_admin', preferences:{ theme:'light' },
    auth:{ provider:'password', password:'xxxxxxxx', google:null },
    onboarding:{ newUserCompletedAt: new Date().toISOString() } } }));
  localStorage.setItem('necto_businesses', JSON.stringify([
    { id:'biz-soporte', name:'Sede Soporte', businessType:'retail_store', city:'Bogotá',
      activeModules:['pedidos'], channels:{whatsapp:true,web:true}, iconKey:'store', createdAt:new Date().toISOString() }
  ]));
  localStorage.setItem('necto_active_business_id','biz-soporte');
  true;
`);

await cdp.send("Page.navigate", { url: `${APP_URL}/workspaces` });
// ⚠️ Se espera por el **control**, no por la ruta. `location.pathname` ya vale
// `/workspaces` antes de que React monte la página: esperar por la ruta devolvía
// un DOM vacío y el arnés moría con `Cannot read properties of null (reading
// 'click')` en lugar de reportar un rojo. La condición es total —incluye el
// redirect a `/login`, que es el fallo real que hay que distinguir— para que el
// arnés no se cuelgue si la sesión sembrada no toma.
await waitFor(
  `!!document.querySelector('button[aria-label="Soporte"]') || location.pathname === "/login"`,
  "la cabecera del hub (o el redirect a /login)"
);

const hub = await evaluate(`(() => ({
  path: location.pathname,
  count: [...document.querySelectorAll('button[aria-label="Soporte"]')].length,
}))()`);

check(
  "el hub con sesión monta su cabecera (no redirige a /login)",
  hub.path === "/workspaces",
  JSON.stringify(hub)
);
check("la cabecera del hub muestra el botón de soporte", hub.count >= 1, JSON.stringify(hub));

if (hub.count >= 1) {
  await evaluate(`document.querySelector('button[aria-label="Soporte"]').click(); true`);
  await waitFor(
    `location.pathname === "/soporte" && !!document.querySelector("[data-support-request-form]")`,
    "la página de soporte desde el botón de la cabecera"
  );
  await sleep(300);

  const fromApp = await evaluate(`(() => {
    const back = [...document.querySelectorAll("button")].find(b => /Volver al hub|Iniciar sesión/.test(b.textContent));
    return { path: location.pathname, back: back ? back.textContent.trim() : null };
  })()`);
  check("el botón de soporte lleva a /soporte", fromApp.path === "/soporte", JSON.stringify(fromApp));
  check(
    "con sesión, la vuelta ofrece el hub",
    fromApp.back === "Volver al hub",
    `botón = "${fromApp.back}"`
  );

  // La precarga del correo sólo existe **con sesión**, así que se mide aquí y no
  // en la fase 3: sin sesión el campo está vacío por definición y la aserción no
  // probaría nada. Es el control positivo que le falta a "enviar vacío marca el
  // correo" — sin este par, un formulario que ignorara la sesión pasaría las dos.
  let prefilled = null;
  for (let i = 0; i < 10; i++) {
    prefilled = await evaluate(`(document.querySelector("#support-email") || {}).value ?? null`);
    if (prefilled) break;
    await sleep(300);
  }
  check(
    "con sesión, el correo de respuesta llega precargado",
    prefilled === "soporte.verify@necto.app",
    `value = ${JSON.stringify(prefilled)}`
  );
} else {
  // Rojo explícito en lugar de excepción: el arnés debe decir **qué** falló.
  check("el botón de soporte lleva a /soporte", false, "no se encontró el botón");
  check("con sesión, la vuelta ofrece el hub", false, "no se encontró el botón");
}

/* ── Cierre ──────────────────────────────────────────────────────────── */
const totalExceptions = newExceptions();
check("no hay excepciones acumuladas", totalExceptions === 0, `${totalExceptions} excepción(es)`);

console.log("\n════════════════════════════════════════");
console.log(`RESULTADO: ${passed}/${passed + failures.length}`);
if (failures.length) {
  console.log("FALLOS:");
  failures.forEach((f) => console.log(`  · ${f}`));
}
const errs = cdp.events.filter((e) => e.method === "Runtime.exceptionThrown");
console.log("RUNTIME ERRORS:", errs.length ? JSON.stringify(errs.slice(0, 3)) : "(none)");
console.log(`Capturas en ${OUT}`);
console.log("════════════════════════════════════════\n");

cdp.close();
process.exit(failures.length === 0 ? 0 : 1);
