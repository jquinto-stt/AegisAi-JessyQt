/**
 * verify-help-page.mjs — Centro de ayuda (`/ayuda`).
 *
 * Comprueba la página de ayuda de punta a punta contra el navegador real:
 * que renderice sin excepciones, que el hero use el verde del contenido público
 * (`public-500`, el mismo de `/soporte` y de las legales), que los cuatro sellos
 * y los cuatro pasos existan, y que el acordeón se comporte como un acordeón
 * (una sola pregunta abierta, la primera abierta al llegar).
 *
 * Uso:  node scripts/verify-help-page.mjs
 *       NECTO_APP_URL=http://localhost:5173 node scripts/verify-help-page.mjs
 *
 * Requiere el dev server y Chrome con CDP ya levantados (ver skill cdp-ui-verify).
 */

import { writeFileSync, mkdirSync } from "node:fs";

const APP_URL = process.env.NECTO_APP_URL || "http://localhost:5173";
const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9222";
const OUT = "./artifacts/";
mkdirSync(OUT, { recursive: true });

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

/* ── Navegación ──────────────────────────────────────────────────────── */
console.log("\n── Fase 1 · La página carga ──");

await cdp.send("Page.navigate", { url: `${APP_URL}/ayuda` });
await waitFor(
  `document.querySelector("h1") && document.querySelector("h1").textContent.includes("Ayuda")`,
  "el h1 del centro de ayuda"
);

const exceptionsOnLoad = newExceptions();
check("renderiza sin excepciones de runtime", exceptionsOnLoad === 0, `${exceptionsOnLoad} excepción(es)`);

const heroColor = await evaluate(`(() => {
  const h1 = document.querySelector("h1");
  const band = h1 && h1.closest("section");
  return band ? getComputedStyle(band).backgroundColor : null;
})()`);
check(
  "el hero usa el verde del contenido público (public-500)",
  heroColor === "rgb(23, 179, 99)",
  `background-color = ${heroColor}`
);

const features = await evaluate(
  `document.querySelectorAll("section:first-of-type svg").length`
);
check("el hero pinta los 4 sellos", features >= 4, `${features} iconos`);

await shot("ayuda-01-hero.png");

/* ── Pasos ───────────────────────────────────────────────────────────── */
console.log("\n── Fase 2 · Primeros pasos ──");

const steps = await evaluate(`(() => {
  const ol = document.querySelector("ol");
  if (!ol) return null;
  const items = [...ol.querySelectorAll(":scope > li")];
  // La insignia es el span SIN aria-hidden: el otro span del ítem es el conector
  // decorativo, que va vacío. Un querySelector("span") a secas devolvía el
  // conector en los pasos 1-3 y solo acertaba en el último (que no lo lleva).
  const badgeOf = (li) =>
    [...li.children].find((el) => el.tagName === "SPAN" && !el.hasAttribute("aria-hidden"));
  return {
    count: items.length,
    numbers: items.map((li) => badgeOf(li)?.textContent?.trim()),
    titles: items.map(li => li.querySelector("h3")?.textContent?.trim()),
    // El conector es un span absoluto; el último paso no debe tenerlo.
    connectors: items.filter(li => li.querySelector('span[aria-hidden="true"]')).length,
  };
})()`);

check("hay 4 pasos", steps?.count === 4, `count = ${steps?.count}`);
check(
  "los pasos están numerados 1..4",
  JSON.stringify(steps?.numbers) === JSON.stringify(["1", "2", "3", "4"]),
  JSON.stringify(steps?.numbers)
);
check(
  "cada paso tiene título",
  Array.isArray(steps?.titles) && steps.titles.every((t) => t && t.length > 3),
  JSON.stringify(steps?.titles)
);
check(
  "los conectores son n-1 (el último paso no lo lleva)",
  steps?.connectors === 3,
  `conectores = ${steps?.connectors}`
);

await evaluate(`window.scrollTo(0, document.querySelector("ol").getBoundingClientRect().top + window.scrollY - 120)`);
await sleep(400);
await shot("ayuda-02-pasos.png");

/* ── Acordeón ────────────────────────────────────────────────────────── */
console.log("\n── Fase 3 · Acordeón de preguntas ──");

/** Lee el estado real del acordeón desde el DOM (aria-expanded manda). */
const accordionState = () =>
  evaluate(`(() => {
    const buttons = [...document.querySelectorAll('button[aria-expanded]')];
    return {
      total: buttons.length,
      open: buttons.filter(b => b.getAttribute("aria-expanded") === "true").length,
      openIndex: buttons.findIndex(b => b.getAttribute("aria-expanded") === "true"),
      questions: buttons.map(b => b.textContent.trim().slice(0, 40)),
      // El cuerpo de la abierta debe existir y no estar vacío.
      openBodyLength: (() => {
        const open = buttons.find(b => b.getAttribute("aria-expanded") === "true");
        if (!open) return 0;
        const card = open.parentElement;
        const p = card && card.querySelector("p");
        return p ? p.textContent.trim().length : 0;
      })(),
      minusCount: document.querySelectorAll("section svg.lucide-minus").length,
      plusCount: document.querySelectorAll("section svg.lucide-plus").length,
    };
  })()`);

const s0 = await accordionState();
check("hay 7 preguntas", s0.total === 7, `total = ${s0.total}`);
check("llega con una pregunta abierta", s0.open === 1, `abiertas = ${s0.open}`);
check("la abierta es la primera", s0.openIndex === 0, `índice = ${s0.openIndex}`);
check("la pregunta abierta muestra su respuesta", s0.openBodyLength > 40, `${s0.openBodyLength} caracteres`);

await evaluate(`window.scrollTo(0, document.body.scrollHeight)`);
await sleep(400);
await shot("ayuda-03-faq.png");

// Abrir la tercera: debe cerrar la primera.
await evaluate(`document.querySelectorAll('button[aria-expanded]')[2].click()`);
await sleep(400);

const s1 = await accordionState();
check("al abrir otra, se cierra la anterior", s1.open === 1 && s1.openIndex === 2, `abiertas = ${s1.open}, índice = ${s1.openIndex}`);
check("el icono cambia a − en la abierta", s1.minusCount === 1, `− = ${s1.minusCount}`);
check("las cerradas muestran +", s1.plusCount === 6, `+ = ${s1.plusCount}`);

await shot("ayuda-04-faq-abierta.png");

// Volver a pulsarla: debe cerrarse y quedar todas cerradas.
await evaluate(`document.querySelectorAll('button[aria-expanded]')[2].click()`);
await sleep(400);
const s2 = await accordionState();
check("volver a pulsar la cierra (ninguna abierta)", s2.open === 0, `abiertas = ${s2.open}`);

/* ── Sin sesión ──────────────────────────────────────────────────────── */
console.log("\n── Fase 4 · Acceso libre ──");

const sessionKeys = await evaluate(`(() => {
  const keys = Object.keys(localStorage);
  return keys.filter(k => /session|profile/i.test(k)).length;
})()`);
const backLabel = await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find(b => /Volver al hub|Iniciar sesión/.test(b.textContent));
  return btn ? btn.textContent.trim() : null;
})()`);
check("sin sesión, ofrece iniciar sesión", sessionKeys === 0 && backLabel === "Iniciar sesión", `claves = ${sessionKeys}, botón = "${backLabel}"`);

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
