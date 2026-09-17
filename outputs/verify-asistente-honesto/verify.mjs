// Verificación de la tercera pasada de honestidad: el asistente NECTO AI.
//
// Contexto: la primera pasada quitó el relleno de demostración del panel de
// Inicio y el historial falso de la barra de conversaciones. Al revisar las
// capturas de esa pasada quedaron a la vista dos cosas que no se habían
// mirado, y este arnés comprueba que ya están bien:
//
//   1. TARJETAS DEL ESTADO VACÍO. La primera tarjeta —la que ve todo el mundo
//      al abrir el asistente— decía "Top 10 Productos · Generar una hoja de
//      cálculo con los productos de mayor rotación". No estaba muerta: al
//      pulsarla el motor respondía. Pero respondía a otra pregunta, porque
//      `REGLAS_INTENCION` enruta "hoja de cálculo"/"top" a `getVentasPeriodo`,
//      que devuelve el total de ventas del periodo. La tarjeta prometía un
//      ranking de productos que ningún tool registrado puede producir.
//
//      La comprobación que importa NO es que el texto sea distinto: es que al
//      pulsar cada tarjeta llegue una respuesta con evidencia de la
//      herramienta que la tarjeta anuncia. Por eso cada tarjeta expone su
//      `toolId` en `data-sugerencia` y aquí se contrasta con la respuesta real.
//
//   2. BLOQUE DE ACCIONES DE LA BARRA. Seguía en inglés ("Back", "New chat",
//      "Update Model") en una interfaz en español. Y "Update Model" no era una
//      función pendiente sino imposible: NECTO AI corre sobre un motor de
//      reglas local, sin backend y sin modelo. En su lugar va "Eliminar
//      conversación", una capacidad real del store que no era alcanzable desde
//      ninguna pantalla. Se verifica el ciclo completo de borrado, incluida la
//      confirmación en dos pasos y su cancelación.
//
// Uso: APP_URL=http://localhost:6021 node verify.mjs
import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9222";
const APP = process.env.APP_URL || "http://localhost:6021";
const OUT = "C:/Users/Jessy/Documents/GitHub/StockFlow/outputs/verify-asistente-honesto/";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (label, ok, detail) => {
  console.log((ok ? "  OK   " : "  FAIL ") + label + (detail === undefined ? "" : "  -> " + detail));
  if (!ok) failures++;
};

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
await cdp.send("Network.enable");
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

const evaluate = async (expression) => {
  const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

const waitFor = async (expression, label, timeoutMs = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      if (await evaluate(expression)) return true;
    } catch {}
    await sleep(300);
  }
  throw new Error("Timeout waiting for: " + label);
};

/**
 * Establece la sesión en el origen antes de navegar a una ruta protegida.
 *
 * `RequireSession` redirige a `/login` sin sesión, y la sesión vive en
 * `localStorage` bajo `necto.session` — que es POR ORIGEN. Un Chrome recién
 * lanzado no la tiene, así que el arnés la escribe él mismo en vez de depender
 * de un perfil concreto: `{modulos, tipoSesion}` y nada más, porque la sesión
 * no guarda capacidades (se derivan del rol en cada render).
 */
const establecerSesion = async () => {
  await cdp.send("Page.navigate", { url: APP + "/login" });
  await sleep(2500);
  await evaluate(`(() => {
    localStorage.setItem("necto.session", JSON.stringify({
      modulos: ["pedidos"],
      tipoSesion: "administrador",
      operadorSimuladoId: null,
      preSimulacion: null,
    }));
    return localStorage.getItem("necto.session");
  })()`);
};

const newExceptions = () =>
  cdp.events.filter(
    (e) =>
      e.method === "Runtime.exceptionThrown" &&
      !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e))
  ).length;

const shot = async (name, sel) => {
  if (sel) {
    await evaluate(
      `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (el) el.scrollIntoView({block:'center'}); })()`
    );
    await sleep(300);
  }
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(OUT + name, Buffer.from(data, "base64"));
};

const irA = async (ruta, espera) => {
  await cdp.send("Page.navigate", { url: APP + ruta });
  await sleep(1000);
  await waitFor(espera, ruta);
};

const textoVisible = () => evaluate(`document.body.innerText`);

/** Pulsa el primer elemento que case con el selector. Devuelve si existía. */
const pulsar = (sel) =>
  evaluate(
    `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`
  );

const conversaciones = () =>
  evaluate(
    `[...document.querySelectorAll('[data-conv]')].map(el => ({
       id: el.dataset.conv,
       activa: el.dataset.activa === 'si',
       titulo: el.textContent.trim(),
     }))`
  );

const sugerencias = () =>
  evaluate(
    `[...document.querySelectorAll('[data-sugerencia]')].map(el => ({
       toolId: el.dataset.sugerencia,
       texto: el.innerText.replace(/\\n+/g, ' | '),
     }))`
  );

// ── A. Barra de conversaciones: idioma y control real ──────────────────────

console.log("\n=== A. Barra lateral — idioma y control real ===");
await establecerSesion();
await irA("/asistente", `!!document.querySelector('[aria-label="Conversaciones"]')`);

check(
  "se puede abrir la barra de conversaciones",
  await pulsar('[aria-label="Conversaciones"]'),
  ""
);
await waitFor(`!!document.querySelector('[data-accion="nueva"]')`, "acciones de la barra");

const textoBarra = await textoVisible();
check("«Volver» está en español", /Volver/.test(textoBarra), "");
check("«Nueva conversación» está en español", /Nueva conversación/.test(textoBarra), "");
check("«Eliminar conversación» está presente", /Eliminar conversación/.test(textoBarra), "");

// Los tres rótulos ingleses de la maqueta, y en particular el control imposible.
check("no queda «Update Model»", !/Update Model/.test(textoBarra), "");
check("no queda «New chat»", !/New chat/.test(textoBarra), "");
check("no queda «Back» como rótulo suelto", !/\bBack\b/.test(textoBarra), "");

const acciones = await evaluate(
  `[...document.querySelectorAll('[data-accion]')].map(el => ({
     accion: el.dataset.accion,
     label: el.textContent.trim(),
     deshabilitado: el.disabled === true,
   }))`
);
check(
  "las tres acciones declaradas son volver / nueva / eliminar",
  JSON.stringify(acciones.map((a) => a.accion).sort()) ===
    JSON.stringify(["eliminar", "nueva", "volver"]),
  acciones.map((a) => `${a.accion}${a.deshabilitado ? "(off)" : ""}`).join(", ")
);

// ── B. Tarjetas del estado vacío ───────────────────────────────────────────

console.log("\n=== B. Estado vacío — las tarjetas prometen lo que cumplen ===");

// Un hilo recién creado para garantizar el estado vacío (las conversaciones se
// persisten, así que no se puede asumir que la pantalla arranca sin mensajes).
await pulsar('[data-accion="nueva"]');
await sleep(700);
await waitFor(`document.querySelectorAll('[data-sugerencia]').length > 0`, "tarjetas de sugerencia");

const tarjetas = await sugerencias();
check("hay exactamente 3 tarjetas", tarjetas.length === 3, `n = ${tarjetas.length}`);
check(
  "cada tarjeta declara a qué herramienta lleva",
  tarjetas.every((t) => typeof t.toolId === "string" && t.toolId.startsWith("pedidos.")),
  tarjetas.map((t) => t.toolId).join(", ")
);

// OJO con el alcance: se comprueba el TEXTO DE LAS TARJETAS, no el cuerpo
// entero de la página.
//
// La primera versión de este arnés miraba `document.body.innerText` y daba un
// falso fallo: "Top 10" sigue apareciendo en la barra lateral, como TÍTULO de
// una conversación real de una sesión anterior — la pregunta que alguien envió
// de verdad cuando la tarjeta existía. Eso es dato del usuario, no una promesa
// de la interfaz, y borrarlo sería reescribir su historial. Lo que no puede
// quedar es que la INTERFAZ prometa un ranking de productos.
const textoTarjetas = tarjetas.map((t) => t.texto).join(" | ");
check("ninguna tarjeta promete un «Top 10»", !/Top 10/i.test(textoTarjetas), textoTarjetas);
check(
  "ninguna tarjeta promete «productos de mayor rotación»",
  !/mayor rotación/i.test(textoTarjetas),
  ""
);
check("ninguna tarjeta lleva texto en inglés", !/Products|Spreadsheet/i.test(textoTarjetas), "");

await shot("01-asistente-vacio.png", "[data-sugerencia]");

// ── C. Pulsar una tarjeta llega a su herramienta ───────────────────────────

console.log("\n=== C. Pulsar una tarjeta produce una respuesta real ===");

// Se elige la tarjeta de pendientes: su Fact "Pendientes" es inequívoco y no lo
// produce ninguna otra tool del catálogo.
const objetivo = tarjetas.find((t) => t.toolId === "pedidos.getPendientes");
check("existe la tarjeta de pedidos pendientes", objetivo !== undefined, objetivo?.texto ?? "");

check("se puede pulsar la tarjeta", await pulsar('[data-sugerencia="pedidos.getPendientes"]'), "");
await waitFor(`/Hechos:/.test(document.body.innerText)`, "respuesta del asistente", 60000);
await sleep(600);

const textoRespuesta = await textoVisible();
check(
  "la pregunta de la tarjeta se envió tal cual",
  /¿Cuáles son los pedidos pendientes\?/i.test(textoRespuesta),
  ""
);
check("llegó una respuesta con hechos («Hechos:»)", /Hechos:/.test(textoRespuesta), "");
check(
  "el hecho es el de getPendientes (label «Pendientes»)",
  /Pendientes:\s*\d+/.test(textoRespuesta),
  (textoRespuesta.match(/Pendientes:\s*\d+/) ?? ["(sin coincidencia)"])[0]
);
check(
  "no aparece un ranking de productos inventado",
  !/Oversized|Tote Bag|mayor rotación/i.test(textoRespuesta),
  ""
);

// Cross-control: el número del hecho y el número de filas del artefacto los
// produce el MISMO tool por dos caminos distintos. Si no coinciden, uno de los
// dos miente. (El artefacto sustituye al panel de hechos cuando está abierto,
// así que el artefacto es la superficie visible que hay que medir.)
const factN = Number((textoRespuesta.match(/Pendientes:\s*(\d+)/) ?? [])[1]);
const filasArtefacto = Number((textoRespuesta.match(/×\s*(\d+)\s*registros?/i) ?? [])[1]);

check(
  "el hecho «Pendientes» trae un número",
  Number.isFinite(factN) && factN > 0,
  `Pendientes = ${factN}`
);
check(
  "el artefacto se renderizó con su tabla",
  Number.isFinite(filasArtefacto),
  `registros = ${filasArtefacto}`
);
check(
  "el conteo del hecho y las filas del artefacto coinciden",
  factN === filasArtefacto,
  `hecho = ${factN}, filas = ${filasArtefacto}`
);

await shot("02-asistente-respuesta.png", null);

// ── D. Borrado de conversación: ciclo completo ─────────────────────────────

console.log("\n=== D. Eliminar conversación — confirmación en dos pasos ===");

// El canvas del artefacto SUSTITUYE a la barra en el layout de AsistentePage
// (`activeArtifact ? canvas : barraAbierta ? barra : panelDeHechos`). Así que
// para llegar al botón de borrar hay que cerrar el canvas y reabrir la barra
// —exactamente lo que haría el usuario— y no asumir que la barra sigue ahí.
check(
  "se puede cerrar el canvas del artefacto",
  await pulsar('[aria-label="Cerrar canvas"]'),
  ""
);
await sleep(600);

// OJO: "Conversaciones" es un TOGGLE sobre `barraAbierta`, y ese estado NO se
// resetea cuando el canvas ocupa su lugar — el canvas simplemente no la
// renderiza. Así que al cerrar el canvas la barra vuelve sola, y pulsar el
// botón sin comprobar antes la apagaría. Se comprueba el estado real en vez de
// asumirlo: es el mismo error que cometió la primera versión de este arnés.
const barraVisible = await evaluate(`!!document.querySelector('[data-accion="eliminar"]')`);
if (!barraVisible) {
  await pulsar('[aria-label="Conversaciones"]');
}
await waitFor(`!!document.querySelector('[data-accion="eliminar"]')`, "acciones de la barra", 20000);
await sleep(300);
check("la barra de conversaciones está disponible", true, barraVisible ? "ya estaba abierta" : "hubo que reabrirla");

const antes = await conversaciones();
check("hay conversaciones en el historial", antes.length >= 1, `n = ${antes.length}`);

// Ahora la conversación activa tiene contenido, así que borrar debe estar
// habilitado. Antes de escribir en ella no lo estaba, y eso es correcto: un
// botón de borrar sobre un hilo vacío no tendría nada que borrar.
const botonEliminar = await evaluate(
  `(() => { const b = document.querySelector('[data-accion="eliminar"]');
     return b ? b.disabled === true : null; })()`
);
check("con una conversación con contenido, borrar está habilitado", botonEliminar === false, `disabled = ${botonEliminar}`);

check("se puede armar el borrado", await pulsar('[data-accion="eliminar"]'), "");
await sleep(300);
check(
  "aparece la confirmación en dos pasos",
  await evaluate(`!!document.querySelector('[data-confirmar-eliminar="si"]')`),
  ""
);
check(
  "la confirmación dice qué se va a borrar y que es irreversible",
  /No se puede deshacer/.test(await textoVisible()),
  ""
);

// Cancelar no debe borrar nada.
check("se puede cancelar", await pulsar('[data-accion="cancelar-eliminar"]'), "");
await sleep(300);
const trasCancelar = await conversaciones();
check(
  "cancelar no borra nada",
  trasCancelar.length === antes.length,
  `${antes.length} -> ${trasCancelar.length}`
);
check(
  "tras cancelar vuelven las acciones normales",
  await evaluate(`!!document.querySelector('[data-accion="eliminar"]')`),
  ""
);

// Ahora sí: confirmar borra exactamente una y deja una activa.
//
// Se identifica por ID, no por título: el título de una conversación se deriva
// de su primera pregunta, y pulsar la misma tarjeta en dos sesiones produce dos
// conversaciones con el MISMO título. Comparar por texto daba un falso fallo.
const activaAntes = antes.find((c) => c.activa);
await pulsar('[data-accion="eliminar"]');
await sleep(300);
await pulsar('[data-accion="confirmar-eliminar"]');
await sleep(800);

const trasBorrar = await conversaciones();
check(
  "confirmar borra exactamente una conversación",
  trasBorrar.length === antes.length - 1,
  `${antes.length} -> ${trasBorrar.length}`
);
check(
  "la conversación borrada ya no está en el historial",
  activaAntes === undefined || !trasBorrar.some((c) => c.id === activaAntes.id),
  `borrada = ${activaAntes?.id?.slice(0, 8) ?? "(ninguna)"} «${activaAntes?.titulo ?? ""}»`
);
check(
  "sigue habiendo exactamente una activa",
  trasBorrar.filter((c) => c.activa).length === 1,
  `activas = ${trasBorrar.filter((c) => c.activa).length}`
);

await shot("03-asistente-tras-borrar.png", "[data-conv]");

// ── E. Runtime ─────────────────────────────────────────────────────────────

console.log("\n=== E. Runtime ===");
const excepciones = newExceptions();
check("ninguna excepción de runtime", excepciones === 0, `excepciones = ${excepciones}`);

console.log("\n" + (failures === 0 ? "TODO OK" : failures + " COMPROBACIONES FALLIDAS"));
cdp.close();
process.exit(failures === 0 ? 0 : 1);
