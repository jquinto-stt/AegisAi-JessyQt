// ═══════════════════════════════════════════════════════════════════════════
// Verificación de render — Catálogo de productos (/inventarios/productos)
// ═══════════════════════════════════════════════════════════════════════════
//
// `tsc rc=0` prueba que los nombres resuelven. NO prueba que la vista pinte:
// un `ReferenceError` de un identificador no importado pasa `tsc` y transforma
// bien (esbuild no resuelve identificadores). Lo único que lo demuestra es
// renderizar la ruta y contar `Runtime.exceptionThrown` ANTES y DESPUÉS.
//
// ── Qué se comprueba, y por qué CADA cosa ────────────────────────────────
//
// No basta con «pintó algo». Las aserciones son sobre el CONTRATO de la
// pantalla: los cuatro rótulos del resumen, las seis columnas de la tabla, que
// los tres estados del semáforo aparezcan de verdad, y que los valores del
// resumen sean los que se derivan del seed. Una captura de una pantalla con
// los números en cero se ve perfecta y no prueba nada.
//
// ── Las capturas de tema se comparan por md5 ─────────────────────────────
//
// Aplicar el tema ANTES de navegar no sirve: el arranque de la app lo revierte
// y las dos capturas salen byte a byte iguales. Se navega, se espera el
// montaje, y SOLO ENTONCES se alterna la clase. Si los dos md5 coinciden, el
// cambio de tema no llegó — no que los temas se vean iguales.

import { writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

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
        (t) => t.type === "page" && t.webSocketDebuggerUrl && !t.url.startsWith("devtools"),
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
      }),
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
await cdp.send("Log.enable");
await cdp.send("Network.enable");
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
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

const waitFor = async (expression, label, timeoutMs = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      if (await evaluate(expression)) return true;
    } catch {}
    await sleep(350);
  }
  throw new Error("Timeout esperando: " + label);
};

/** Captura de PANTALLA COMPLETA del contenedor con scroll, no del viewport. */
const shot = async (name) => {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  const buf = Buffer.from(data, "base64");
  writeFileSync(OUT + name, buf);
  return createHash("md5").update(buf).digest("hex");
};

const NOISE = /favicon|\[vite\]|DevTools|ResizeObserver|Download the React/i;
const nuevasExcepciones = () =>
  cdp.events.filter((e) => {
    if (e.method === "Runtime.exceptionThrown" && !NOISE.test(JSON.stringify(e))) return true;
    if (e.method === "Log.entryAdded" && e.params?.entry?.level === "error") {
      return !NOISE.test(e.params.entry.text || "");
    }
    return false;
  }).length;

let ok = 0;
let fail = 0;
const check = (label, condicion, detalle) => {
  if (condicion) {
    ok++;
    console.log("  OK   " + label);
  } else {
    fail++;
    console.log("  FAIL " + label + (detalle !== undefined ? "  -> " + detalle : ""));
  }
};

// ── Montaje del SPA: se espera el elemento, nunca un sleep fijo ────────────
const MONTADO = "(() => { const r = document.getElementById('root'); return !!r && r.children.length > 0; })()";

// ── Semilla: sesión de administrador + módulo Inventarios ACTIVO ───────────
//
// Dos compuertas se apilan antes de que nada de Inventarios pinte, y las dos
// fallan EN ABIERTO si se siembra mal:
//
//   1. `RequireSession` -> `tipoSesion === "administrador"`.
//   2. `ModuloGuard`    -> `organizacionStore.estaActivo("inventarios")`, que
//      lee `necto.organizacion.v1` -> `modulos.inventarios.activo === true`.
//
// Las dos formas están copiadas de `persistSession()` y de `OrganizacionStorage`.
const SEMILLA = "(() => {" +
  "  localStorage.setItem('necto.session', JSON.stringify({" +
  "    modulos: ['pedidos', 'inventarios']," +
  "    tipoSesion: 'administrador'," +
  "    operadorSimuladoId: null," +
  "    preSimulacion: null," +
  "  }));" +
  "  const conectores = { whatsapp: false, telegram: false, instagram: false, webchat: false, asistente: false };" +
  "  localStorage.setItem('necto.organizacion.v1', JSON.stringify({" +
  "    usuario: { nombre: 'Vera', email: 'demo@necto.io' }," +
  "    organizacion: { nombre: 'Necto Demo', moneda: 'COP', pais: 'Colombia', zonaHoraria: 'America/Bogota' }," +
  "    modulos: {" +
  "      pedidos:     { instalado: true, activo: true, conectores: conectores }," +
  "      inventarios: { instalado: true, activo: true, conectores: conectores }," +
  "    }," +
  "  }));" +
  "  return true;" +
  "})()";

await cdp.send("Page.navigate", { url: APP + "/login" });
await waitFor(MONTADO, "montaje de /login", 45000);
console.log("-- semilla escrita --");
await evaluate(SEMILLA);

const RUTA = "/inventarios/productos";

// ═══════════════════════════════════════════════════════════════════════════
// 1. La pantalla monta
// ═══════════════════════════════════════════════════════════════════════════

const antes = nuevasExcepciones();
await cdp.send("Page.navigate", { url: APP + RUTA });
await waitFor(MONTADO, "montaje de " + RUTA, 45000);
// Se espera un ancla que existe SOLO en esta pantalla, no `location.pathname`:
// el router cambia la URL un tick antes de que React pinte el árbol.
await waitFor("!!document.querySelector('h1')", "el h1 de la pantalla", 20000);
await sleep(600);

const donde = await evaluate("location.pathname");
const h1 = await evaluate("(() => { const h = document.querySelector('h1'); return h ? h.textContent.trim() : null; })()");
const texto = await evaluate("(document.querySelector('main') || document.body).innerText.length");
const despues = nuevasExcepciones();

console.log("-- Pantalla (1/3): monta --");
check("llegó a " + RUTA, donde === RUTA, "quedó en " + donde);
check("renderizó sin lanzar", despues === antes, despues - antes + " excepción(es) nuevas");
check("pintó contenido", texto > 400, texto + " caracteres");
check("el h1 dice «Productos»", h1 === "Productos", String(h1));

const md5Claro = await shot("productos-claro.png");

// ── La sección tiene que estar en la navegación lateral ───────────────────
//
// Sin esto, la pantalla es alcanzable solo escribiendo la URL a mano — y la
// captura se ve perfecta, porque el sidebar no es suyo. Se busca el enlace por
// su `href`, no por el texto: el rótulo puede cambiar sin que la sección deje
// de existir, pero un `href` roto sí es un defecto.
const enlacesInventario = await evaluate(
  "[...document.querySelectorAll('a[href*=\"/inventarios\"]')].map((a) => a.getAttribute('href'))",
);
check(
  "la navegación lateral ofrece /inventarios/productos",
  Array.isArray(enlacesInventario) && enlacesInventario.includes("/inventarios/productos"),
  "enlaces: " + JSON.stringify(enlacesInventario),
);

// ═══════════════════════════════════════════════════════════════════════════
// 2. El resumen: rótulos Y valores reales
// ═══════════════════════════════════════════════════════════════════════════

// Se leen los rótulos por su texto exacto. Un `includes` sobre todo el `main`
// daría verde con la palabra en cualquier sitio; aquí se exige que los cuatro
// rótulos del resumen existan como elementos.
const ROTULOS = ["Categorías", "Productos", "Queda poco", "Agotados"];
const rotulosPresentes = await evaluate(
  "(() => {" +
    "  const main = document.querySelector('main') || document.body;" +
    "  const textos = [...main.querySelectorAll('p')].map((e) => e.textContent.trim());" +
    "  return " + JSON.stringify(ROTULOS) + ".filter((r) => textos.includes(r));" +
    "})()",
);
console.log("-- Pantalla (2/3): resumen --");
check(
  "los 4 rótulos del resumen existen",
  rotulosPresentes.length === 4,
  "encontrados: " + JSON.stringify(rotulosPresentes),
);

// Los valores se comparan contra lo que el SEED produce, calculado a mano, y
// EN EL ORDEN en que la pantalla los pinta:
//   Categorías = 7 · Productos = 15 · Queda poco = 3 · Agotados = 3
//
// El orden importa: la primera versión de esta aserción esperaba `15` primero
// —porque el rótulo «Total de productos» parecía el más importante— y salió
// roja sobre una pantalla correcta. Una aserción que no respeta el orden que
// el componente declara mide una expectativa propia, no el contrato.
//
// Los tres «queda poco» son Ariel (6 ≤ 7), Jet (9 ≤ 10) y Harpic (6 ≤ 6);
// los tres agotados son Arroz Diana, Panela y Papel higiénico.
const VALORES = ["7", "15", "3", "3"];
const cifras = await evaluate(
  "(() => {" +
    "  const main = document.querySelector('main') || document.body;" +
    "  return [...main.querySelectorAll('p')]" +
    "    .filter((e) => e.className.includes('text-2xl'))" +
    "    .map((e) => e.textContent.trim());" +
    "})()",
);
check(
  "las 4 cifras del resumen son las del seed",
  JSON.stringify(cifras) === JSON.stringify(VALORES),
  "leídas: " + JSON.stringify(cifras) + " · esperadas: " + JSON.stringify(VALORES),
);

// ═══════════════════════════════════════════════════════════════════════════
// 3. La tabla: columnas, filas y los TRES estados del semáforo
// ═══════════════════════════════════════════════════════════════════════════

const ENCABEZADOS = [
  "Producto",
  "Precio de compra",
  "Cuántos hay",
  "Mínimo",
  "Vence",
  "Estado",
];
const encabezados = await evaluate(
  "(() => {" +
    "  const th = document.querySelectorAll('main thead tr:first-child > *');" +
    "  return [...th].map((e) => e.textContent.trim());" +
    "})()",
);
check(
  "la tabla tiene las 6 columnas del contrato",
  JSON.stringify(encabezados) === JSON.stringify(ENCABEZADOS),
  "leídas: " + JSON.stringify(encabezados),
);

const filas = await evaluate("document.querySelectorAll('main tbody tr').length");
check("la página pinta 10 filas (el tamaño de página)", filas === 10, filas + " filas");

// Los tres estados tienen que aparecer en la PRIMERA página. Si el seed se
// desajusta, «Queda poco» desaparece de la tabla y la pantalla sigue viéndose
// bien — que es exactamente el fallo que tuvo la primera versión del seed.
const ESTADOS = ["Disponible", "Queda poco", "Agotado"];
const estadosEnTabla = await evaluate(
  "(() => {" +
    "  const main = document.querySelector('main') || document.body;" +
    "  const textos = [...main.querySelectorAll('tbody span')].map((e) => e.textContent.trim());" +
    "  return " + JSON.stringify(ESTADOS) + ".filter((e) => textos.includes(e));" +
    "})()",
);
check(
  "los 3 estados del semáforo aparecen en la tabla",
  estadosEnTabla.length === 3,
  "encontrados: " + JSON.stringify(estadosEnTabla),
);

const paginacion = await evaluate(
  "(() => {" +
    "  const main = document.querySelector('main') || document.body;" +
    "  const p = [...main.querySelectorAll('p')].find((e) => e.textContent.includes('Página'));" +
    "  return p ? p.textContent.trim() : null;" +
    "})()",
);
check("la paginación dice «Página 1 de 2»", paginacion === "Página 1 de 2", String(paginacion));

// ═══════════════════════════════════════════════════════════════════════════
// 4. Interacción: filtros y modal
// ═══════════════════════════════════════════════════════════════════════════
//
// Los clics van en funciones que se llaman UNA VEZ, fuera de todo sondeo: un
// `click()` dentro de una espera que se reintenta se re-ejecuta en cada
// reintento y en una SPA acaba midiendo otra pantalla.

async function pulsarBotonPorTexto(etiqueta) {
  return await evaluate(
    "(() => {" +
      "  const main = document.querySelector('main') || document.body;" +
      "  const b = [...main.querySelectorAll('button')].find((e) => e.textContent.trim() === " +
      JSON.stringify(etiqueta) +
      ");" +
      "  if (!b) return false;" +
      "  b.click();" +
      "  return true;" +
      "})()",
  );
}

console.log("-- Pantalla (3/3): interacción --");

const pulsoFiltros = await pulsarBotonPorTexto("Filtros");
await sleep(500);
const selectsFiltro = await evaluate("document.querySelectorAll('main select').length");
check("el botón «Filtros» existe", pulsoFiltros === true);
check("«Filtros» revela los 3 desplegables", selectsFiltro === 3, selectsFiltro + " selects");

// Un desplegable sin nombre accesible es un control que un lector de pantalla
// anuncia como «lista desplegable» a secas. `Select` del catálogo no acepta
// `id`, así que el nombre va por `aria-label` — y esto lo comprueba.
const nombresSelect = await evaluate(
  "[...document.querySelectorAll('main select')].map((s) => s.getAttribute('aria-label'))",
);
check(
  "los 3 desplegables tienen nombre accesible",
  Array.isArray(nombresSelect) && nombresSelect.every((n) => !!n && n.length > 0),
  JSON.stringify(nombresSelect),
);

const antesModal = nuevasExcepciones();
const pulsoModal = await pulsarBotonPorTexto("Añadir producto");
await waitFor("!!document.getElementById('titulo-modal-producto')", "el modal", 15000);
await sleep(400);
const tituloModal = await evaluate(
  "(() => { const h = document.getElementById('titulo-modal-producto'); return h ? h.textContent.trim() : null; })()",
);
const camposModal = await evaluate(
  "(() => {" +
    "  const m = document.querySelector('.modal');" +
    "  if (!m) return null;" +
    "  const etiquetas = [...m.querySelectorAll('label')].map((e) => e.textContent.trim());" +
    "  return {" +
    "    etiquetas: etiquetas," +
    "    selects: m.querySelectorAll('select').length," +
    "    archivo: m.querySelectorAll('input[type=file]').length," +
    "    mencionaFoto: m.textContent.includes('Foto del producto')," +
    "  };" +
    "})()",
);
const erroresModal = nuevasExcepciones() - antesModal;
check("el botón «Añadir producto» abre el modal", pulsoModal === true);
check("el modal se titula «Añadir producto»", tituloModal === "Añadir producto", String(tituloModal));

// Se comprueba por ETIQUETA y no por número de controles: contar inputs mide
// la maqueta, no el contrato. La primera versión esperaba 9 y salió roja con 7
// sobre un modal correcto — porque «Categoría» y «Se cuenta en» son `<select>`
// y el campo de la foto es un `<input type=file>` escondido.
//
// «Foto del producto» NO está en esta lista: es el rótulo de un bloque, no la
// etiqueta de un campo, y se pinta como `<p>`. Buscarla entre los `<label>`
// daba rojo sobre un modal correcto — tercera aserción mal escrita de la
// misma corrida, y las tres por describir la maqueta en vez del contrato.
const ETIQUETAS_MODAL = [
  "Nombre del producto",
  "Código del producto",
  "Categoría",
  "Se cuenta en",
  "Precio de compra",
  "Cuántos tienes ahora",
  "Fecha de vencimiento",
  "Cantidad mínima",
];
const faltantes = Array.isArray(camposModal?.etiquetas)
  ? ETIQUETAS_MODAL.filter((e) => !camposModal.etiquetas.includes(e))
  : ETIQUETAS_MODAL;
check(
  "el modal trae los 8 campos del contrato",
  faltantes.length === 0,
  "faltan: " + JSON.stringify(faltantes),
);
check(
  "el modal rotula la zona de la foto",
  camposModal?.mencionaFoto === true,
  "no se encontró el texto «Foto del producto»",
);
check(
  "el modal tiene los 2 desplegables y el selector de foto",
  camposModal?.selects === 2 && camposModal?.archivo === 1,
  "selects=" + camposModal?.selects + " archivo=" + camposModal?.archivo,
);
check("abrir el modal no lanzó errores", erroresModal === 0, erroresModal + " excepción(es)");

// Se cierra para poder capturar la pantalla limpia.
await evaluate(
  "(() => { const b = document.querySelector('.modal button[aria-label=\"Cerrar\"]'); if (b) b.click(); return true; })()",
);
await sleep(500);

// ═══════════════════════════════════════════════════════════════════════════
// 5. Los dos temas, con md5 distintos
// ═══════════════════════════════════════════════════════════════════════════

await evaluate(
  "(() => {" +
    "  document.documentElement.classList.add('dark');" +
    "  document.documentElement.setAttribute('data-theme', 'dark');" +
    "  return true;" +
  "})()",
);
await sleep(700);
const esOscuro = await evaluate("document.documentElement.classList.contains('dark')");
const md5Oscuro = await shot("productos-oscuro.png");

check("el tema oscuro se aplicó de verdad", esOscuro === true);
check(
  "las dos capturas difieren (el tema no es decorativo)",
  md5Claro !== md5Oscuro,
  "md5 claro=" + md5Claro.slice(0, 8) + " oscuro=" + md5Oscuro.slice(0, 8),
);

// Se vuelve al claro para dejar la app como estaba.
await evaluate(
  "(() => {" +
    "  document.documentElement.classList.remove('dark');" +
    "  document.documentElement.setAttribute('data-theme', 'light');" +
    "  return true;" +
  "})()",
);

// ═══════════════════════════════════════════════════════════════════════════
// Cierre
// ═══════════════════════════════════════════════════════════════════════════

const errs = cdp.events.filter(
  (e) =>
    (e.method === "Runtime.exceptionThrown" && !NOISE.test(JSON.stringify(e))) ||
    (e.method === "Log.entryAdded" &&
      e.params?.entry?.level === "error" &&
      !NOISE.test(e.params.entry.text || "")),
);
console.log("-- ERRORES DE RUNTIME --");
console.log(errs.length ? JSON.stringify(errs.slice(0, 4), null, 2) : "(ninguno)");

console.log("------------------------------");
console.log("OK:   " + ok);
console.log("FAIL: " + fail);
cdp.close();
// `process.exitCode` y no `process.exit()`: cerrar con el WebSocket vivo puede
// truncar la salida.
process.exitCode = fail === 0 ? 0 : 1;
