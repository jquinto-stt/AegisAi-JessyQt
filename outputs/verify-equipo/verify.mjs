// Verificación del rediseño de Equipo (perfil, roles y lista) contra la app real.
//
// Lo que se comprueba, y por qué:
//
//   1. LA TRADUCCIÓN NO MIENTE. Los 7 chips de área tienen que coincidir con lo
//      que dice el modelo de autorización. Se contrastan con un control cruzado:
//      la suma de capacidades de las 7 áreas tiene que dar el mismo número que
//      el contador de permisos del desplegable (18 en total).
//
//   2. LA JERGA DESAPARECIÓ DE LA VISTA POR DEFECTO. Ni códigos técnicos
//      (`orders.read`) ni los cuatro estados de procedencia. Tienen que seguir
//      existiendo, pero detrás de "Ajustar permisos uno por uno".
//
//   3. LA DIVULGACIÓN PROGRESIVA FUNCIONA. Cerrada: 0 interruptores. Abierta:
//      exactamente 18.
//
//   4. LA PANTALLA REACCIONA EN VIVO. Apagar un área entera mueve el chip, el
//      contador de áreas completas y el bloque de ajustes en el mismo frame.
//
//   5. EL ASISTENTE DE TAREAS DEJA EL CONJUNTO EXACTO. Aplicar "Solo consulta"
//      tiene que producir exactamente los niveles que predice el modelo.
//
// Uso: APP_URL=http://localhost:6020 node verify.mjs
import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9222";
const APP = process.env.APP_URL || "http://localhost:6020";
const OUT = "C:/Users/Jessy/Documents/GitHub/StockFlow/outputs/verify-equipo/";
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

const waitFor = async (expression, label, timeoutMs = 25000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      if (await evaluate(expression)) return true;
    } catch {}
    await sleep(300);
  }
  throw new Error("Timeout waiting for: " + label);
};

const newExceptions = () =>
  cdp.events.filter(
    (e) =>
      e.method === "Runtime.exceptionThrown" &&
      !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e))
  ).length;

// Enfoca un elemento antes de capturar: si no, la foto sale siempre con la
// página en la parte de arriba y no se ve lo que se acaba de comprobar.
const scrollA = async (sel) => {
  await evaluate(
    `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.scrollIntoView({block:'center'}); return true; })()`
  );
  await sleep(350);
};

const shot = async (name, sel) => {
  if (sel) await scrollA(sel);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(OUT + name, Buffer.from(data, "base64"));
};

const irA = async (ruta, espera) => {
  await cdp.send("Page.navigate", { url: APP + ruta });
  await sleep(900);
  await waitFor(espera, ruta);
};

// ── Lectores ────────────────────────────────────────────────────────────────

// Las 7 filas de área, tal como las ve el usuario.
const leerAreas = () =>
  evaluate(
    `[...document.querySelectorAll('[data-area]')].map(el => ({
       id: el.dataset.area,
       nivel: el.dataset.nivel,
       activas: Number(el.dataset.activas),
       total: Number(el.dataset.total),
       texto: el.innerText,
     }))`
  );

// Contador del encabezado del desplegable: "13 de 18 activos".
const leerContadorPermisos = () =>
  evaluate(
    `(() => {
       const m = document.body.innerText.match(/(\\d+) de 18 activos/);
       return m ? Number(m[1]) : null;
     })()`
  );

// Contador de áreas completas del encabezado: "4 de 7 áreas completas".
const leerAreasCompletas = () =>
  evaluate(
    `(() => {
       const m = document.body.innerText.match(/(\\d+) de 7 áreas completas/);
       return m ? Number(m[1]) : null;
     })()`
  );

const pulsarPorTexto = (texto, indice = 0) =>
  evaluate(
    `(() => {
       const b = [...document.querySelectorAll('button')].filter(x => x.textContent.trim() === ${JSON.stringify(texto)});
       if (!b[${indice}]) return false;
       b[${indice}].click();
       return true;
     })()`
  );

const pulsarContiene = (texto) =>
  evaluate(
    `(() => {
       const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes(${JSON.stringify(texto)}));
       if (!b) return false;
       b.click();
       return true;
     })()`
  );

const nInterruptores = () => evaluate(`document.querySelectorAll('input[role="switch"]').length`);

const textoVisible = () => evaluate(`document.body.innerText`);

// ── A. Perfil de una persona (Camila Ortiz, supervisora) ────────────────────

console.log("\n=== A. Perfil /pedidos/equipo/d1 — resumen en lenguaje llano ===");
await irA("/pedidos/equipo/d1", `document.querySelectorAll('[data-area]').length === 7`);
await shot("01-perfil-resumen.png");

const areas = await leerAreas();
check("hay exactamente 7 áreas de negocio", areas.length === 7, areas.map((a) => a.id).join(", "));

// El rol supervisor_pedidos da 15 de las 18 capacidades. Reparto esperado:
//   ordenes 6/6 · preparacion 2/2 · programados 2/2 · canales 3/3
//   ajustes 1/2 · equipo 1/2 · asistente 0/1
const esperado = {
  ordenes: { nivel: "si", activas: 6, total: 6 },
  preparacion: { nivel: "si", activas: 2, total: 2 },
  programados: { nivel: "si", activas: 2, total: 2 },
  canales: { nivel: "si", activas: 3, total: 3 },
  ajustes: { nivel: "parcial", activas: 1, total: 2 },
  equipo: { nivel: "parcial", activas: 1, total: 2 },
  asistente: { nivel: "no", activas: 0, total: 1 },
};

for (const [id, exp] of Object.entries(esperado)) {
  const real = areas.find((a) => a.id === id);
  check(
    `área ${id} = ${exp.nivel} (${exp.activas}/${exp.total})`,
    real && real.nivel === exp.nivel && real.activas === exp.activas && real.total === exp.total,
    real ? `${real.nivel} (${real.activas}/${real.total})` : "no encontrada"
  );
}

// Control cruzado: la suma de las 7 áreas tiene que dar el total del catálogo.
const sumaActivas = areas.reduce((n, a) => n + a.activas, 0);
const sumaTotal = areas.reduce((n, a) => n + a.total, 0);
const contador = await leerContadorPermisos();
check("la suma de áreas cubre las 18 capacidades", sumaTotal === 18, `suma total = ${sumaTotal}`);
check(
  "las áreas activas coinciden con el contador de permisos",
  contador !== null && sumaActivas === contador,
  `áreas = ${sumaActivas}, contador = ${contador}`
);

// El contador de áreas completas se calcula, no se escribe a mano.
const completas = await leerAreasCompletas();
const completasEsperadas = areas.filter((a) => a.nivel === "si").length;
check(
  "el contador de áreas completas coincide con los chips",
  completas === completasEsperadas,
  `cabecera = ${completas}, chips = ${completasEsperadas}`
);

// La frase de cabecera se lee en frases separadas, no en un encadenado de comas.
const frase = await evaluate(
  `(() => { const m = document.body.innerText.match(/Cubre \\d+ de 7 áreas[^\\n]*/); return m ? m[0] : null; })()`
);
check("la frase de cabecera existe", !!frase, frase);
check(
  "la frase va en oraciones separadas por punto",
  !!frase && frase.split(". ").length >= 2,
  frase
);

// ── B. La jerga no está en la vista por defecto ─────────────────────────────

console.log("\n=== B. Lenguaje: sin jerga técnica en la vista por defecto ===");
const texto = await textoVisible();

const codigos = ["orders.read", "orders.confirm", "preparation.manage", "channels.respond", "team.manage", "assistant.use"];
const codigosVisibles = codigos.filter((c) => texto.includes(c));
check("ningún código técnico visible", codigosVisibles.length === 0, codigosVisibles.join(", ") || "ninguno");

const jerga = ["Heredado del rol", "Concedido a mano", "Revocado a mano", "No concedido", "Capacidad / Acción"];
const jergaVisible = jerga.filter((j) => texto.includes(j));
check("ninguna etiqueta de procedencia en crudo", jergaVisible.length === 0, jergaVisible.join(", ") || "ninguna");

check("no aparece la palabra «capacidad» en la vista principal", !/capacidad/i.test(texto), "");
check("se habla de «áreas»", /áreas completas/.test(texto), "");
check("se habla de «permisos»", /permisos/i.test(texto), "");

// ── C. Divulgación progresiva ───────────────────────────────────────────────

console.log("\n=== C. Divulgación progresiva de los 18 interruptores ===");
const cerrado = await nInterruptores();
check("cerrado por defecto: 0 interruptores", cerrado === 0, `encontrados = ${cerrado}`);

check("el desplegable está anunciado", await pulsarContiene("Ajustar permisos uno por uno"), "");
await sleep(500);
const abierto = await nInterruptores();
check("abierto: exactamente 18 interruptores", abierto === 18, `encontrados = ${abierto}`);

const textoAbierto = await textoVisible();
check("al abrir, el código técnico sigue sin mostrarse", !/orders\.read/.test(textoAbierto), "");
check("al abrir, las procedencias solo aparecen si hay desviación", !/Heredado del rol/.test(textoAbierto), "");
await shot("02-perfil-permisos-abiertos.png", "input[role='switch']");

// ── D. Cambio en vivo ───────────────────────────────────────────────────────

console.log("\n=== D. La pantalla reacciona en vivo ===");
const antes = await leerAreas();
check("antes: Pedidos está completo", antes.find((a) => a.id === "ordenes")?.nivel === "si", "");
const completasAntes = await leerAreasCompletas();

// "Quitar todo" del primer bloque de área = Órdenes (el primero del catálogo).
check("se pulsa «Quitar todo» en la primera área", await pulsarPorTexto("Quitar todo", 0), "");
await sleep(500);

const despues = await leerAreas();
const ordenesDespues = despues.find((a) => a.id === "ordenes");
check("Pedidos pasa a «no» (0/6)", ordenesDespues?.nivel === "no" && ordenesDespues?.activas === 0, ordenesDespues ? `${ordenesDespues.nivel} (${ordenesDespues.activas}/6)` : "no encontrada");

const completasDespues = await leerAreasCompletas();
check(
  "el contador de áreas completas baja en 1",
  completasDespues === completasAntes - 1,
  `${completasAntes} -> ${completasDespues}`
);

const textoTrasQuitar = await textoVisible();
check("aparece el bloque de ajustes a mano", /ajustes? solo para/.test(textoTrasQuitar), "");
check("los ajustes se cuentan como «se le quitó»", /se le quitó/.test(textoTrasQuitar), "");
check("se ofrece deshacer con «Dejar solo su rol»", /Dejar solo su rol/.test(textoTrasQuitar), "");
await shot("03-perfil-tras-quitar-pedidos.png", "[data-area]");

// Deshacer devuelve la persona a su rol: control de ida y vuelta.
check("se pulsa «Dejar solo su rol»", await pulsarContiene("Dejar solo su rol"), "");
await sleep(500);
const trasDeshacer = await leerAreas();
check(
  "deshacer restaura las 7 áreas del rol",
  trasDeshacer.filter((a) => a.nivel === "si").length === 4,
  `completas = ${trasDeshacer.filter((a) => a.nivel === "si").length}`
);
check("y el bloque de ajustes desaparece", !/solo para Camila/.test(await textoVisible()), "");

// ── E. Asistente de tareas ──────────────────────────────────────────────────

console.log("\n=== E. Asistente de tareas: «Solo consulta» ===");
check("existe el chip del perfil", await evaluate(`!!document.querySelector('[data-perfil="consulta"]')`), "");

// El chip tiene que explicar qué hace el perfil, no solo cuántos permisos mueve.
const chipConsulta = await evaluate(
  `(() => { const el = document.querySelector('[data-perfil="consulta"]'); return el ? el.innerText : null; })()`
);
check("el chip describe el oficio", !!chipConsulta && /mirar los pedidos/i.test(chipConsulta), chipConsulta?.replace(/\n/g, " | "));
check("el chip avisa del delta de permisos", !!chipConsulta && /quita \d+/.test(chipConsulta), chipConsulta?.replace(/\n/g, " | "));

await evaluate(`document.querySelector('[data-perfil="consulta"]').click()`);
await sleep(500);

// "Solo consulta" = orders.read + preparation.read + scheduled.read
const esperadoConsulta = {
  ordenes: { nivel: "parcial", activas: 1, total: 6 },
  preparacion: { nivel: "parcial", activas: 1, total: 2 },
  programados: { nivel: "parcial", activas: 1, total: 2 },
  canales: { nivel: "no", activas: 0, total: 3 },
  ajustes: { nivel: "no", activas: 0, total: 2 },
  equipo: { nivel: "no", activas: 0, total: 2 },
  asistente: { nivel: "no", activas: 0, total: 1 },
};

const trasPreset = await leerAreas();
for (const [id, exp] of Object.entries(esperadoConsulta)) {
  const real = trasPreset.find((a) => a.id === id);
  check(
    `perfil aplicado: ${id} = ${exp.nivel} (${exp.activas}/${exp.total})`,
    real && real.nivel === exp.nivel && real.activas === exp.activas,
    real ? `${real.nivel} (${real.activas}/${real.total})` : "no encontrada"
  );
}

const completasPreset = await leerAreasCompletas();
check("«Solo consulta» no completa ninguna área", completasPreset === 0, `completas = ${completasPreset}`);

const contadorPreset = await leerContadorPermisos();
const sumaPreset = trasPreset.reduce((n, a) => n + a.activas, 0);
check(
  "control cruzado: áreas = contador de permisos",
  sumaPreset === contadorPreset,
  `áreas = ${sumaPreset}, contador = ${contadorPreset}`
);
check("el chip activo se marca como «Actual»", /Actual/.test(await textoVisible()), "");
await shot("04-perfil-preset-consulta.png", "[data-perfil='consulta']");

// ── F. Lista de equipo y roles ──────────────────────────────────────────────

console.log("\n=== F. Lista de equipo y editor de roles ===");
await irA("/pedidos/equipo", `document.body.innerText.includes('Qué puede hacer')`);
const textoEquipo = await textoVisible();
check("la columna se llama «Qué puede hacer»", textoEquipo.includes("Qué puede hacer"), "");
check("los badges de área usan el nombre de negocio", textoEquipo.includes("Conversaciones"), "");
check("ya no se usa «Canales» como nombre de área", !/\bCanales\b/.test(textoEquipo), "");
check("la vista de equipo explica el modelo en lenguaje llano", /el rol define qué puede hacer/i.test(textoEquipo), "");
await shot("05-equipo-lista.png");

check("se puede abrir la pestaña de roles", await pulsarContiene("Gestionar roles"), "");
await sleep(800);
const textoRoles = await textoVisible();
check("los roles se cuentan por áreas", /Cubre \d+ de 7 áreas/.test(textoRoles), "");
check("la vista de roles explica qué es un rol en lenguaje llano", /paquete de permisos con nombre/i.test(textoRoles), "");
check("el editor muestra el resumen por áreas", /Qué puede hacer este rol/.test(textoRoles), "");
check("sin códigos técnicos en roles", !/orders\.read/.test(textoRoles), "");
check("el editor no usa píldoras de filtro con fracciones", !/Todas \(\d+\/18\)/.test(textoRoles), "");
await shot("06-roles.png", "input[role='switch']");

// ── G. Runtime ──────────────────────────────────────────────────────────────

console.log("\n=== G. Runtime ===");
const excepciones = newExceptions();
check("ninguna excepción de runtime", excepciones === 0, `excepciones = ${excepciones}`);

console.log("\n" + (failures === 0 ? "TODO OK" : failures + " COMPROBACIONES FALLIDAS"));
cdp.close();
process.exit(failures === 0 ? 0 : 1);
