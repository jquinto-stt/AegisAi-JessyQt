// ═══════════════════════════════════════════════════════════════════════════
// Verificación de render — módulo Inventarios
// ═══════════════════════════════════════════════════════════════════════════
//
// `tsc rc=0` prueba que los nombres resuelven. NO prueba que la vista renderice:
// un `ReferenceError` de un identificador no importado pasa `tsc` y transforma
// bien (esbuild no resuelve identificadores). Lo único que lo demuestra es
// renderizar cada ruta y contar `Runtime.exceptionThrown` ANTES y DESPUÉS de
// cada navegación, para saber QUÉ superficie lanzó.

import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://localhost:6020";
const OUT = "./artifacts-inv/";
mkdirSync(OUT, { recursive: true });

async function getPageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(CDP_BASE + "/json/list");
      const targets = await res.json();
      const page = targets.find(
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
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
});

const evaluate = async (expression) => {
  const r = await cdp.send("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

const waitFor = async (expression, label, timeoutMs = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { if (await evaluate(expression)) return true; } catch {}
    await sleep(350);
  }
  throw new Error("Timeout waiting for: " + label);
};

const shot = async (name) => {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(OUT + name, Buffer.from(data, "base64"));
};

const NOISE = /favicon|\[vite\]|DevTools|ResizeObserver|Download the React/i;
const newExceptions = () =>
  cdp.events.filter((e) => {
    if (e.method === "Runtime.exceptionThrown" && !NOISE.test(JSON.stringify(e))) return true;
    if (e.method === "Log.entryAdded" && e.params?.entry?.level === "error") {
      return !NOISE.test(e.params.entry.text || "");
    }
    return false;
  }).length;

let ok = 0, fail = 0;
const check = (label, condition, detail) => {
  if (condition) { ok++; console.log("  OK   " + label); }
  else { fail++; console.log("  FAIL " + label + (detail !== undefined ? "  → " + detail : "")); }
};

// ── Montaje del SPA: se espera el elemento, nunca un sleep fijo ────────────
const MONTADO = `(() => {
  const raiz = document.getElementById('root');
  if (!raiz || raiz.children.length === 0) return false;
  return !!document.querySelector('h1, h2');
})()`;

const irA = async (path, ancla) => {
  await cdp.send("Page.navigate", { url: APP + path });
  try { await waitFor(MONTADO, "montaje de " + path, 45000); }
  catch { await sleep(2500); }
  if (ancla) {
    try { await waitFor(ancla, "ancla de " + path, 20000); } catch {}
  }
  await sleep(500);
};

// ── Semilla: sesión de administrador + módulo Inventarios ACTIVO ───────────
//
// Dos compuertas se apilan antes de que nada de Inventarios pinte, y ambas
// fallan *en abierto* si se siembra mal:
//
//   1. `RequireSession` → `accessContext.autenticado`, que es
//      `tipoSesion === "administrador"` (no depende de `modulos`).
//   2. `ModuloGuard` → `organizacionStore.estaActivo("inventarios")`, que lee
//      `necto.organizacion.v1` → `modulos.inventarios.activo === true`.
//
// Las dos formas están copiadas de `persistSession()` (session.store.ts:187) y
// de `OrganizacionStorage` (organizacion.store.ts:190), no deducidas de los
// campos que un componente lee: un snapshot inventado se ignora **sin aviso**,
// la sesión resuelve a su estado más privilegiado y la medida siguiente mide la
// pantalla equivocada.
//
// Se escribe DESPUÉS de tener un origen (esta carga de `/login`) y ANTES de
// navegar a cualquier ruta del módulo.
const SEMILLA = `(() => {
  localStorage.setItem('necto.session', JSON.stringify({
    modulos: ['pedidos', 'inventarios'],
    tipoSesion: 'administrador',
    operadorSimuladoId: null,
    preSimulacion: null,
  }));
  const conectores = { whatsapp: false, telegram: false, instagram: false, webchat: false, asistente: false };
  localStorage.setItem('necto.organizacion.v1', JSON.stringify({
    usuario: { nombre: 'Vera', email: 'demo@necto.io' },
    organizacion: { nombre: 'Necto Demo', moneda: 'COP', pais: 'Colombia', zonaHoraria: 'America/Bogota' },
    modulos: {
      pedidos:     { instalado: true, activo: true,  conectores: conectores },
      inventarios: { instalado: true, activo: true,  conectores: conectores },
    },
  }));
  return {
    sesion: localStorage.getItem('necto.session'),
    org: localStorage.getItem('necto.organizacion.v1').slice(0, 200),
  };
})()`;
console.log("── semilla escrita ──");
console.log(JSON.stringify(await evaluate(SEMILLA), null, 2).slice(0, 900));

const RUTAS = [
  ["/inventarios", "Listado de conteos", `!!document.querySelector('h1')`],
  ["/inventarios/nuevo", "Crear conteo", `!!document.querySelector('h1')`],
  ["/inventarios/elementos", "Catálogo de elementos", `!!document.querySelector('h1')`],
  ["/inventarios/ubicaciones", "Árbol de ubicaciones", `!!document.querySelector('h1')`],
  ["/inventarios/historial", "Historial", `!!document.querySelector('h1')`],
  ["/inventarios/alertas", "Alertas", `!!document.querySelector('h1')`],
  ["/inventarios/reportes", "Reportes", `!!document.querySelector('h1')`],
  ["/inventarios/config", "Configuración", `!!document.querySelector('h1')`],
];

let ultimoPath = "";
for (const [path, nombre, ancla] of RUTAS) {
  const antes = newExceptions();
  await irA(path, ancla);
  const despues = newExceptions();
  const donde = await evaluate("location.pathname + location.search");
  ultimoPath = donde;
  const h1 = await evaluate(`(() => { const h = document.querySelector('h1'); return h ? h.textContent.trim() : null; })()`);
  const texto = await evaluate(`(() => { const m = document.querySelector('main') || document.body; return m.innerText.length; })()`);
  await shot("ruta-" + path.split("/").join("_") + ".png");

  console.log("── " + nombre + " (" + path + ") ──");
  // Primero: ¿se midió algo? Sin esto, un `null` de un `h1` ausente hace que
  // las comprobaciones negativas pasen por VACÍO y las positivas fallen por el
  // motivo equivocado.
  check("[" + nombre + "] llegó a " + path, donde === path, "quedó en " + donde);
  check("[" + nombre + "] renderizó sin lanzar", despues === antes, (despues - antes) + " excepción(es) nuevas");
  check("[" + nombre + "] pintó contenido", texto > 120, texto + " caracteres");
  check("[" + nombre + "] tiene h1", !!h1, String(h1));
}

// El seed tiene que haber SURTIDO efecto: si `estaActivo` hubiera leído `false`,
// todas las rutas anteriores habrían medido `/configuracion?tab=modulos` y la
// comprobación de "llegó a" habría sido la única en avisar.
check(
  "la semilla de organización dejó Inventarios activo",
  (await evaluate(`(() => {
     const raw = localStorage.getItem('necto.organizacion.v1');
     if (!raw) return false;
     return JSON.parse(raw).modulos.inventarios.activo === true;
   })()`)) === true
);

// ── Los dos detalles: se llega por una FILA, no por el sidebar ─────────────
//
// El selector tiene que ser específico o el sidebar gana: `a[href*="/inventarios/"]`
// devuelve el ítem «Elementos» de la navegación lateral, que existe en toda
// ruta. La comprobación anterior midió `/inventarios/elementos` y lo llamó
// «detalle de conteo» — un verde con la superficie equivocada, que es peor que
// un rojo. Se exige ahora un id: `/inventarios/<algo>` que NO sea una sección
// conocida.

const SECCIONES_CONOCIDAS = [
  "nuevo", "elementos", "ubicaciones", "historial", "alertas", "reportes", "config",
];

// ── Los dos detalles: las filas navegan con `onClick`, NO con <a> ──────────
//
// La primera versión de esta sonda buscaba `a[href^="/inventarios/"]` y fallaba
// con «las filas no exponen enlace». Era falso: `InventariosTabla` y
// `ElementosPage` navegan con el `onClick` del `<tr>` (el patrón del proyecto).
// Un selector que solo mira `<a>` no ve una fila clicable, y el FAIL culpaba a
// la pantalla de un defecto del instrumento.
//
// Se navega pulsando la fila de verdad, que además es lo que hace el usuario.

/**
 * Pulsa el primer control clicable de la fila.
 *
 * El `TableRow` del catálogo NO acepta `onClick` (no extiende los props del
 * `<tr>`), así que el proyecto cuelga la navegación de una celda — está escrito
 * en `InventariosTabla.tsx:72`. **Pero no siempre de la MISMA celda**: el
 * listado de conteos la pone en la primera (el nombre del conteo) y el catálogo
 * de elementos en la segunda (el nombre del elemento), porque la primera es el
 * código. Buscar solo en la primera celda daba «el catálogo no navega» sobre una
 * tabla que navega.
 *
 * Se recorre la fila entera hasta encontrar `button` o `a`: el instrumento
 * copia el contrato del componente, no supone el del DOM ni el de otra pantalla.
 */
async function pulsarFilaEn(indice = 0) {
  return await evaluate(
    "(() => {" +
    "  const filas = [...document.querySelectorAll('main tbody tr')];" +
    "  const tr = filas[" + indice + "];" +
    "  if (!tr) return 'sin filas';" +
    "  const control = tr.querySelector('td button, td a');" +
    "  if (!control) return 'sin control clicable en la fila';" +
    "  control.click();" +
    "  return true;" +
    "})()"
  );
}

// El listado de conteos: hay que VOLVER a él antes de pulsar una fila.
//
// La primera versión de esta sonda pulsaba «la primera fila» sin navegar antes,
// así que lo hacía **sobre `/inventarios/config`** —la última ruta del bucle—
// donde `main tbody tr` no existe y el click no va a ningún sitio. El FAIL decía
// «el listado no navega» sobre una pantalla que no era el listado. Un paso que
// asume dónde está el navegador es un paso que mide otra cosa en cuanto alguien
// reordena lo de arriba.
await irA("/inventarios", `!!document.querySelector('h1')`);

const urlAntesDetalle = await evaluate("location.pathname");
const hayFilaConteo = await pulsarFilaEn(0);
if (hayFilaConteo) {
  await sleep(900);
  const antes = newExceptions();
  // Tras el click, React Router cambia la URL sin recargar: se espera el montaje.
  try { await waitFor(MONTADO, "detalle tras click", 15000); } catch {}
  await sleep(600);
  const despues = newExceptions();
  const donde = await evaluate("location.pathname");
  const texto = await evaluate("(document.querySelector('main') || document.body).innerText.length");
  await shot("detalle-conteo.png");
  console.log("── Detalle de conteo (click en fila) ──");
  check("[detalle] navegó fuera del listado", donde !== urlAntesDetalle, "sigue en " + donde);
  check("[detalle] llegó a /inventarios/<id>", /^\/inventarios\/[^/]+$/.test(donde), donde);
  check("[detalle] renderizó sin lanzar", despues === antes, (despues - antes) + " excepción(es) nuevas");
  check("[detalle] pintó contenido", texto > 200, texto + " caracteres");
} else {
  check("[detalle] el listado tiene filas clicables", false,
    "resultado del click: " + hayFilaConteo + " · filas=" +
    (await evaluate("document.querySelectorAll('main tbody tr').length")));
}

// Detalle de elemento: mismo criterio — se pulsan las filas de su propio listado.
await irA("/inventarios/elementos", `!!document.querySelector('h1')`);
const urlAntesElemento = await evaluate("location.pathname");
const hayFilaElemento = await pulsarFilaEn(0);
if (hayFilaElemento) {
  await sleep(900);
  const antes = newExceptions();
  try { await waitFor(MONTADO, "detalle de elemento tras click", 15000); } catch {}
  await sleep(600);
  const despues = newExceptions();
  const donde = await evaluate("location.pathname");
  const texto = await evaluate("(document.querySelector('main') || document.body).innerText.length");
  await shot("detalle-elemento.png");
  console.log("── Detalle de elemento (click en fila) ──");
  check("[elemento] navegó fuera del listado", donde !== urlAntesElemento, "sigue en " + donde);
  check("[elemento] llegó a /inventarios/elementos/<id>", /^\/inventarios\/elementos\/[^/]+$/.test(donde), donde);
  check("[elemento] renderizó sin lanzar", despues === antes, (despues - antes) + " excepción(es) nuevas");
  check("[elemento] pintó contenido", texto > 200, texto + " caracteres");
} else {
  check("[elemento] el catálogo tiene filas clicables", false, "sin filas en tbody");
}

// ── Errores acumulados y cierre ───────────────────────────────────────────
const errs = cdp.events.filter(
  (e) =>
    (e.method === "Runtime.exceptionThrown" && !NOISE.test(JSON.stringify(e))) ||
    (e.method === "Log.entryAdded" && e.params?.entry?.level === "error" && !NOISE.test(e.params.entry.text || ""))
);
console.log("── RUNTIME ERRORS ──");
console.log(errs.length ? JSON.stringify(errs.slice(0, 6), null, 2) : "(ninguno)");

console.log("──────────────────────────────");
console.log("OK:   " + ok);
console.log("FAIL: " + fail);
console.log("última ruta medida: " + ultimoPath);
cdp.close();
process.exit(fail === 0 ? 0 : 1);
