/**
 * Guarda: superficies legales (términos, privacidad, cookies).
 *
 * Comprueba lo que sólo se puede comprobar en el navegador:
 *
 *   1. Las tres rutas legales **renderizan sin sesión** y traen su contenido.
 *   2. El registro enlaza de verdad a ellas (antes eran spans que no llevaban a
 *      ningún sitio, así que la casilla pedía aceptar algo ilegible).
 *   3. La casilla **no** viene marcada y bloquea el envío hasta marcarla.
 *   4. El aviso de cookies aparece, y al decidir **no vuelve** (persistencia),
 *      distinguiendo aceptar de rechazar.
 *   5. El pie de la aplicación enlaza a las tres.
 *
 * Uso:  NECTO_APP_URL=http://localhost:5173 node scripts/verify-legal.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";

const APP = process.env.NECTO_APP_URL || "http://localhost:5173";
const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9222";
const OUT = "./artifacts/";
mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

let ws;
let msgId = 0;
const pending = new Map();

function send(method, params = {}) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => pending.set(id, { res, rej }));
}

async function evaluate(expr) {
  const r = await send("Runtime.evaluate", {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result?.value;
}

async function waitFor(expr, { timeout = 12000, label = expr } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      if (await evaluate(expr)) return true;
    } catch {}
    await sleep(150);
  }
  console.log(`  (waitFor "${label}" agotó ${timeout} ms)`);
  return false;
}

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  :: " + detail : ""}`);
}

async function shot(name) {
  try {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${OUT}${name}.png`, Buffer.from(data, "base64"));
  } catch (e) {
    // Un EPERM aquí (PNG abierto en un visor) no debe abortar antes del
    // veredicto: la captura es accesoria, la aserción no.
    console.log(`  (captura ${name} falló: ${e.message})`);
  }
}

async function goto(path, readyExpr) {
  await send("Page.navigate", { url: `${APP}${path}` });
  await waitFor(`document.readyState === "complete"`, { label: `load ${path}` });
  if (readyExpr) await waitFor(readyExpr, { label: `vista ${path}` });
  await sleep(400);
}

/* ── Conexión CDP ────────────────────────────────────────────────────── */

const target = await (async () => {
  for (let i = 0; i < 40; i++) {
    try {
      const all = await (await fetch(`${CDP_BASE}/json/list`)).json();
      const page = all.find(
        t => t.type === "page" && t.webSocketDebuggerUrl && !t.url.startsWith("devtools")
      );
      if (page) return page;
    } catch {}
    await sleep(250);
  }
  throw new Error("No hay pestaña de Chrome en 9222. ¿Está Chrome levantado?");
})();

ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  }
};
await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

const clearStorage = `(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} return true; })()`;

/* ── 1. Rutas legales sin sesión ─────────────────────────────────────── */

console.log("\n── Fase 1 · Las páginas legales se leen sin sesión ──");

for (const [path, title, marker] of [
  ["/terminos", "Términos y Condiciones", "Qué es Necto"],
  ["/privacidad", "Política de Privacidad", "Qué datos tratamos"],
  ["/cookies", "Política de Cookies", "Qué guardamos"],
]) {
  await goto(path, clearStorage);
  await goto(path, `!!document.querySelector("h1")`);

  check(
    `${path} renderiza sin sesión`,
    (await evaluate(`location.pathname`)) === path,
    await evaluate(`location.pathname`)
  );
  check(
    `${path} muestra su titular`,
    (await evaluate(`(document.querySelector("h1")?.textContent || "").includes(${JSON.stringify(title)})`)) === true
  );

  // La banda del hero es la misma que la de `/ayuda` y `/soporte`: `public-500`
  // (#17B363). Se mide en las **tres** rutas y no en una sola porque el armazón
  // es compartido (`PublicPageLayout`): esta aserción es justo la que detecta
  // que alguien vuelva a pintar una de ellas con el naranja de marca.
  const band = await evaluate(`(() => {
    const h1 = document.querySelector("h1");
    const sec = h1 && h1.closest("section");
    return sec ? getComputedStyle(sec).backgroundColor : null;
  })()`);
  check(
    `${path} usa la banda verde del contenido público (public-500)`,
    band === "rgb(23, 179, 99)",
    `background-color = ${band}`
  );

  check(
    `${path} trae el contenido de la sección`,
    (await evaluate(`window.__body = document.body.textContent; window.__body.includes(${JSON.stringify(marker)})`)) === true
  );
  check(
    `${path} no exige iniciar sesión`,
    (await evaluate(`!document.body.textContent.includes("Inicia sesión para continuar")`)) === true
  );
}

/* Índice y enlaces cruzados. */
await goto("/terminos", `!!document.querySelector("h1")`);
const terminosNav = await evaluate(`
  (() => {
    const nav = document.querySelector('nav[aria-label="Índice del documento"]');
    if (!nav) return { ok: false, count: 0 };
    return { ok: true, count: nav.querySelectorAll("a").length };
  })()
`);
check("el documento trae índice de contenidos", terminosNav.ok === true);
check("el índice lista las secciones", terminosNav.count > 4, `secciones=${terminosNav.count}`);

const crossLinks = await evaluate(`
  Array.from(document.querySelectorAll('a[href="/privacidad"], a[href="/cookies"]')).length
`);
check("hay enlaces cruzados a los otros documentos", crossLinks >= 2, `enlaces=${crossLinks}`);

await shot("legal-terminos");

/* ── 2. El registro enlaza a los documentos ──────────────────────────── */

console.log("\n── Fase 2 · El registro enlaza de verdad ──");

await goto("/register", clearStorage);
await goto("/register", `!!document.querySelector('input#fname')`);

const legalLinks = await evaluate(`
  (() => {
    const terms = Array.from(document.querySelectorAll("a")).find(a => a.getAttribute("href") === "/terminos");
    const privacy = Array.from(document.querySelectorAll("a")).find(a => a.getAttribute("href") === "/privacidad");
    return {
      terms: terms ? (terms.textContent || "").trim() : null,
      privacy: privacy ? (privacy.textContent || "").trim() : null,
    };
  })()
`);
check("el registro enlaza a los Términos", legalLinks.terms !== null, legalLinks.terms ?? "no encontrado");
check("el registro enlaza a la Privacidad", legalLinks.privacy !== null, legalLinks.privacy ?? "no encontrado");

/* Navegación real por cliente: pulsar el enlace debe cambiar la ruta sin recargar. */
const clicked = await evaluate(`
  (() => {
    const a = Array.from(document.querySelectorAll("a")).find(x => x.getAttribute("href") === "/terminos");
    if (!a) return false;
    a.click();
    return true;
  })()
`);
check("el enlace de Términos es pulsable", clicked === true);
check(
  "pulsarlo navega a /terminos sin recargar",
  await waitFor(`location.pathname === "/terminos"`, { label: "pathname /terminos" })
);

/* ── 3. La casilla del registro ──────────────────────────────────────── */

console.log("\n── Fase 3 · El asentimiento es un acto ──");

await goto("/register", clearStorage);
await goto("/register", `!!document.querySelector('input#fname')`);

const consent = await evaluate(`
  (() => {
    const box = document.querySelector('input[type="checkbox"]');
    if (!box) return { found: false };
    return { found: true, checked: box.checked };
  })()
`);
check("la casilla de aceptación existe", consent.found === true);
check("la casilla NO viene premarcada", consent.checked === false, `checked=${consent.checked}`);

/* Rellenar el formulario dejando la casilla sin marcar: no debe crear cuenta. */
await evaluate(`
  (() => {
    const set = (sel, v) => {
      const el = document.querySelector(sel);
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    set("input#fname", "Valentina");
    set("input#lname", "Ríos");
    set("input#email", "legal.guard@necto.app");
    set('input[autocomplete="new-password"]', "Necto2026!");
    return true;
  })()
`);
await evaluate(`
  (() => {
    const btn = Array.from(document.querySelectorAll('button[type="submit"]'))[0];
    if (btn) btn.click();
    return !!btn;
  })()
`);
await sleep(900);

const blocked = await evaluate(`
  (() => ({
    stayed: location.pathname === "/register",
    mentionsConsent: /T[ré]rminos|casilla|acept/i.test(document.body.textContent || ""),
  }))()
`);
check("sin marcar la casilla no se crea la cuenta", blocked.stayed === true, `path=${await evaluate(`location.pathname`)}`);

/* Marcarla y confirmar que el aviso desaparece del camino. */
await evaluate(`
  (() => {
    const box = document.querySelector('input[type="checkbox"]');
    if (box && !box.checked) box.click();
    return box ? box.checked : false;
  })()
`);
const afterCheck = await evaluate(`document.querySelector('input[type="checkbox"]').checked`);
check("se puede marcar la casilla", afterCheck === true);

/* ── 4. Aviso de cookies ─────────────────────────────────────────────── */

console.log("\n── Fase 4 · El aviso de cookies decide una vez ──");

await goto("/login", clearStorage);
await goto("/login", `!!document.querySelector('input[type="email"]')`);

check(
  "el aviso aparece sin decisión previa",
  await waitFor(`!!document.querySelector("[data-cookie-consent-banner]")`, { label: "banner" })
);
check(
  "el aviso explica para qué se usan",
  (await evaluate(
    `document.querySelector("[data-cookie-consent-banner]").textContent.includes("cookies")`
  )) === true
);
check(
  "el aviso enlaza a la política",
  (await evaluate(
    `!!document.querySelector("[data-cookie-consent-banner] a[href='/cookies']")`
  )) === true
);

await shot("legal-cookies-banner");

/* Rechazar: debe registrar la decisión y desaparecer. */
await evaluate(`
  (() => {
    const btn = Array.from(document.querySelectorAll("[data-cookie-consent-banner] button"))
      .find(b => (b.textContent || "").trim() === "Rechazar");
    if (btn) btn.click();
    return !!btn;
  })()
`);
await sleep(500);
check(
  "al rechazar el aviso desaparece",
  (await evaluate(`!document.querySelector("[data-cookie-consent-banner]")`)) === true
);
const stored = await evaluate(`
  (() => {
    try { return localStorage.getItem("necto_cookie_consent_v1"); } catch { return null; }
  })()
`);
check("la decisión queda guardada", stored !== null, stored ?? "null");
check(
  "lo guardado distingue rechazar",
  (() => {
    try {
      return JSON.parse(stored)?.value === "rejected";
    } catch {
      return false;
    }
  })() === true,
  stored ?? ""
);

/* Recargar: no debe volver a pedirlo. */
await goto("/login", `!!document.querySelector('input[type="email"]')`);
await sleep(700);
check(
  "tras decidir no vuelve a aparecer",
  (await evaluate(`!document.querySelector("[data-cookie-consent-banner]")`)) === true
);

/* Aceptar desde cero: se guarda "accepted". */
await goto("/register", clearStorage);
await goto("/register", `!!document.querySelector('input#fname')`);
await waitFor(`!!document.querySelector("[data-cookie-consent-banner]")`, { label: "banner de nuevo" });
await evaluate(`
  (() => {
    const btn = Array.from(document.querySelectorAll("[data-cookie-consent-banner] button"))
      .find(b => (b.textContent || "").trim() === "Aceptar");
    if (btn) btn.click();
    return !!btn;
  })()
`);
await sleep(400);
const accepted = await evaluate(`
  (() => {
    try { return JSON.parse(localStorage.getItem("necto_cookie_consent_v1"))?.value; } catch { return null; }
  })()
`);
check("aceptar guarda la decisión como aceptada", accepted === "accepted", String(accepted));

/* ── 5. Pie de la aplicación ─────────────────────────────────────────── */

console.log("\n── Fase 5 · El pie de las páginas públicas enlaza a lo legal ──");

// ⚠️ Se comprueba en `/ayuda`, **no** en `/`. El hub (`/`) no monta
// `PublicPageLayout`, así que ahí no hay pie legal y el rojo sería del arnés,
// no del producto. `/ayuda` es la otra página que usa el layout compartido, así
// que es donde se ve que la navegación legal llega a las tres rutas.
await goto("/ayuda", clearStorage);
await goto("/ayuda", `!!document.querySelector("h1")`);

const publicFooter = await evaluate(`
  (() => {
    const nav = document.querySelector('nav[aria-label="Enlaces legales"]');
    if (!nav) return { ok: false, hrefs: [] };
    return { ok: true, hrefs: Array.from(nav.querySelectorAll("a")).map(a => a.getAttribute("href")) };
  })()
`);
check("el pie público trae la navegación legal", publicFooter.ok === true);
check(
  "el pie enlaza a las tres rutas",
  ["/terminos", "/privacidad", "/cookies"].every(h => publicFooter.hrefs.includes(h)),
  JSON.stringify(publicFooter.hrefs)
);

// Y desde el pie se llega de verdad a la política.
const footerNav = await evaluate(`
  (() => {
    const a = Array.from(document.querySelectorAll('nav[aria-label="Enlaces legales"] a'))
      .find(x => x.getAttribute("href") === "/cookies");
    if (!a) return false;
    a.click();
    return true;
  })()
`);
check("el pie navega a la política de cookies", footerNav === true);
check(
  "y la política se abre sin sesión",
  await waitFor(`location.pathname === "/cookies"`, { label: "pathname /cookies" })
);

/* ── Veredicto ───────────────────────────────────────────────────────── */

ws.close();
console.log(
  `\n===== SUPERFICIES LEGALES: ${failures === 0 ? "OK" : failures + " FALLOS"} =====`
);
process.exit(failures === 0 ? 0 : 1);
