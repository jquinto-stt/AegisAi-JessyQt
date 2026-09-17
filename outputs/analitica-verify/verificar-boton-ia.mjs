/**
 * Verificación del botón "NECTO AI" de Analítica tras volverlo sobrio.
 *
 * Qué comprueba, y por qué cada cosa:
 *   1. El botón existe, conserva su `title` y su icono.
 *   2. No queda NADA del tratamiento anterior: ni degradado, ni animación de
 *      pulso, ni escalado. Se leen estilos COMPUTADOS, no el className: así la
 *      prueba no se puede satisfacer renombrando una clase.
 *   3. Está alineado con el resto de la barra (misma altura que «Descargar CSV»,
 *      mismo radio y misma tipografía que el selector de periodo). "Sobrio"
 *      significa, medible, "no desentona".
 *   4. El naranja de marca es el único rasgo personalizado.
 *   5. Se respeta el contrato de acceso: sin `assistant.use` el botón NO se
 *      pinta, porque /asistente está guardada por esa capacidad.
 *
 * Trampas respetadas (todas documentadas en REFERENCIA.md):
 *   - `Runtime.evaluate` devuelve el literal de cadena sin reevaluarlo: los IIFE
 *     se pasan desnudos, nunca envueltos en JSON.stringify.
 *   - El payload está en `.result.result.value`.
 *   - La sesión se siembra ANTES de navegar.
 *   - **Tailwind v4 emite `oklab(...)`, no `rgb(...)`.** Comparar cadenas contra
 *     "rgb(255, 179, 163)" falla aunque el color sea correcto. Por eso los
 *     colores se resuelven a sRGB pintándolos en un canvas de 1×1 y leyendo el
 *     píxel: funciona con cualquier espacio de color.
 *   - **La instantánea de sesión NO tiene `rolId` ni `operadorId`.** Su forma es
 *     `{ modulos, tipoSesion, operadorSimuladoId, preSimulacion }`. El rol sale
 *     de `operadoresStore.porId(operadorSimuladoId).rolId`. Sembrar un
 *     `operadorSimuladoId` inexistente (o ninguno) hace caer la sesión al estado
 *     de administrador y **el guard de capacidad parece fallar por culpa del
 *     arnés, no de la página**. Ids reales: d0 admin_tienda · d1
 *     supervisor_pedidos · d2 vendedor (SIN assistant.use) · d3 vendedor.
 */

import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://localhost:4173";
const OUT = "./artifacts-boton-ia/";
mkdirSync(OUT, { recursive: true });

async function getPageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${CDP_BASE}/json/list`);
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
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

const evaluate = async (expression, byValue = true) => {
  const r = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: byValue,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return byValue ? r.result.value : r.result;
};

const waitFor = async (expression, label, timeoutMs = 25000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      if (await evaluate(expression)) return true;
    } catch {}
    await sleep(300);
  }
  throw new Error(`Timeout waiting for: ${label}`);
};

const shot = async (name) => {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(OUT + name, Buffer.from(data, "base64"));
};

const shotClip = async (name, clip) => {
  const { data } = await cdp.send("Page.captureScreenshot", {
    format: "png",
    clip: { ...clip, scale: 2 },
  });
  writeFileSync(OUT + name, Buffer.from(data, "base64"));
};

let passed = 0;
let failed = 0;
const results = [];
const check = (label, cond, detail = "") => {
  if (cond) {
    passed++;
    results.push(`  OK   ${label}`);
  } else {
    failed++;
    results.push(`  FAIL ${label}${detail ? "  → " + detail : ""}`);
  }
};

// ── Siembra de estado (formas REALES, verificadas contra los stores) ────────

/**
 * @param tipoSesion "administrador" entra como admin_tienda; "operador" usa el
 *                   rol del operador simulado.
 * @param operadorSimuladoId id real del seed de operadores (d0..d3) o null.
 */
const seedSession = (tipoSesion, operadorSimuladoId) =>
  evaluate(
    [
      "(() => {",
      "  localStorage.setItem('necto.session', JSON.stringify({",
      "    modulos: ['pedidos', 'analitica', 'conversaciones'],",
      "    tipoSesion: " + JSON.stringify(tipoSesion) + ",",
      "    operadorSimuladoId: " + JSON.stringify(operadorSimuladoId) + ",",
      "    preSimulacion: null",
      "  }));",
      "  return true;",
      "})()",
    ].join("\n")
  );

const seedTheme = (theme) =>
  evaluate(
    [
      "(() => {",
      "  localStorage.setItem('webforge-ui-preferences', JSON.stringify({ theme: " +
        JSON.stringify(theme) +
        " }));",
      "  return true;",
      "})()",
    ].join("\n")
  );

// Mide con estilos COMPUTADOS y resuelve los colores a sRGB real.
const medirBotones = () =>
  evaluate(
    [
      "(() => {",
      "  // Tailwind v4 devuelve oklab(): hay que resolver a sRGB para poder",
      "  // afirmar nada sobre el color. Un canvas de 1x1 lo hace por nosotros.",
      "  const cv = document.createElement('canvas');",
      "  cv.width = 1; cv.height = 1;",
      "  const ctx = cv.getContext('2d', { willReadFrequently: true });",
      "  const resolver = (color) => {",
      "    ctx.clearRect(0, 0, 1, 1);",
      "    ctx.fillStyle = '#000';",
      "    ctx.fillStyle = color;",
      "    ctx.fillRect(0, 0, 1, 1);",
      "    const d = ctx.getImageData(0, 0, 1, 1).data;",
      "    return [d[0], d[1], d[2], Math.round((d[3] / 255) * 100) / 100];",
      "  };",
      "  const porTexto = (t) => [...document.querySelectorAll('button')]",
      "    .find(b => b.textContent.trim() === t);",
      "  const ia = porTexto('NECTO AI');",
      "  const csv = porTexto('Descargar CSV');",
      "  const periodo = document.querySelector('.dropdown-toggle');",
      "  const salida = { ia: null, csv: null, periodo: null };",
      "  const geo = (el) => {",
      "    const cs = getComputedStyle(el);",
      "    const r = el.getBoundingClientRect();",
      "    return {",
      "      ancho: Math.round(r.width),",
      "      alto: Math.round(r.height),",
      "      radio: cs.borderTopLeftRadius,",
      "      tamanoFuente: cs.fontSize,",
      "      pesoFuente: cs.fontWeight",
      "    };",
      "  };",
      "  if (csv) salida.csv = geo(csv);",
      "  if (periodo) salida.periodo = geo(periodo);",
      "  if (!ia) return salida;",
      "  const cs = getComputedStyle(ia);",
      "  const r = ia.getBoundingClientRect();",
      "  const conAnimacion = ia.querySelector('[class*=\"animate-\"]');",
      "  salida.ia = Object.assign(geo(ia), {",
      "    colorTexto: resolver(cs.color),",
      "    fondo: resolver(cs.backgroundColor),",
      "    colorBorde: resolver(cs.borderTopColor),",
      "    colorIcono: ia.querySelector('svg') ? resolver(getComputedStyle(ia.querySelector('svg')).color) : null,",
      "    anchoBorde: cs.borderTopWidth,",
      "    imagenFondo: cs.backgroundImage,",
      "    transicion: cs.transitionProperty,",
      "    transformacion: cs.transform,",
      "    cursor: cs.cursor,",
      "    title: ia.getAttribute('title') || '',",
      "    tieneIcono: !!ia.querySelector('svg'),",
      "    claseAnimada: conAnimacion ? conAnimacion.getAttribute('class') : null,",
      "    tieneDegradado: !!ia.querySelector('[class*=\"bg-gradient\"]')",
      "      || cs.backgroundImage.indexOf('gradient') !== -1",
      "  });",
      "  const fila = ia.parentElement;",
      "  if (fila) {",
      "    const rf = fila.getBoundingClientRect();",
      "    salida.clipFila = {",
      "      x: Math.max(0, rf.left - 8),",
      "      y: Math.max(0, rf.top - 8),",
      "      width: Math.min(rf.width + 16, 1440),",
      "      height: rf.height + 16",
      "    };",
      "  }",
      "  return salida;",
      "})()",
    ].join("\n")
  );

const existeBotonIA = () =>
  evaluate(
    "(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'NECTO AI'))()"
  );

const paginaViva = () =>
  evaluate(
    "(() => { const h = document.querySelector('h1'); return h ? h.textContent.trim() : null; })()"
  );

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const rgb = (v) => (v ? `rgb(${v[0]}, ${v[1]}, ${v[2]}) @${v[3]}` : "—");

/**
 * Tratamiento visual esperado del botón.
 *
 * Al cambiar el diseño del botón, cambiar SOLO este bloque: las aserciones de
 * color leen de aquí. Existe porque el primer intento (tinte pálido de marca:
 * `brand-200` / `brand-50/60` / `brand-700`) se descartó por lavado — el
 * veredicto fue "sencillo pero feo, sin nada especial". El diseño vigente es la
 * **marca sólida y plana**: la identidad la da el color, la sobriedad la da la
 * planitud, no la falta de color.
 */
const TRATAMIENTO = {
  nombre: "A · naranja sólido de marca",
  fondo: [255, 63, 26, 1], // brand-500 #ff3f1a, opaco
  texto: [255, 255, 255, 1],
  anchoBorde: "0px", // sin contorno: el color no compite con un borde
  fondoOscuro: [255, 63, 26, 1], // la marca sólida no cambia de tema
  textoOscuro: [255, 255, 255, 1],
};

// ── Fase 0: sesión admin + tema claro ──────────────────────────────────────
console.log("=== Botón NECTO AI en Analítica · verificación ===\n");

await cdp.send("Page.navigate", { url: `${APP}/` });
await sleep(1500);
await seedSession("administrador", null);
await seedTheme("light");
await cdp.send("Page.navigate", { url: `${APP}/pedidos/analitica` });
await waitFor(
  "!!document.querySelector('h1') || location.pathname.indexOf('login') !== -1",
  "el encabezado de la página"
);

const titulo = await paginaViva();
check("La página de Analítica carga con sesión de administrador", !!titulo, `h1=${titulo}`);
// Contrapartida positiva de la comprobación de rol de la fase 6: con
// `admin_tienda` el enlace a Equipo (team.manage) SÍ está. Las dos juntas
// demuestran que el rol se aplica de verdad y que la fase 6 no mide una sesión
// caída al estado de administrador.
check(
  "Con administrador, el enlace a Equipo SÍ está (team.manage)",
  (await evaluate("(() => !!document.querySelector('a[href=\"/pedidos/equipo\"]'))()")) === true
);

const claro = await medirBotones();

// ── 1. Existencia y accesibilidad ─────────────────────────────────────────
check("El botón NECTO AI existe en la barra de acciones", !!claro.ia);
if (!claro.ia) {
  console.log(results.join("\n"));
  cdp.close();
  process.exit(1);
}
check("Conserva un `title` descriptivo", claro.ia.title.length > 10, claro.ia.title);
check("Lleva el icono de asistente", claro.ia.tieneIcono === true);

// ── 2. Nada del tratamiento anterior ──────────────────────────────────────
check(
  "Sin degradado (ni en el fondo ni en ningún hijo)",
  claro.ia.tieneDegradado === false,
  `background-image=${claro.ia.imagenFondo}`
);
check(
  "Sin animación de pulso ni ninguna otra animación",
  claro.ia.claseAnimada === null,
  `encontrado: ${claro.ia.claseAnimada}`
);
check(
  "Sin escalado permanente (transform = none)",
  claro.ia.transformacion === "none",
  claro.ia.transformacion
);
check(
  "Transiciona color, no `all` (no hay saltos de tamaño)",
  claro.ia.transicion.indexOf("color") !== -1 &&
    claro.ia.transicion.indexOf("all") === -1,
  claro.ia.transicion
);

// ── 3. Alineación con el resto de la barra ────────────────────────────────
check(
  "Misma altura que «Descargar CSV»",
  claro.csv !== null && Math.abs(claro.ia.alto - claro.csv.alto) <= 1,
  `ia=${claro.ia.alto}px  csv=${claro.csv && claro.csv.alto}px`
);
check(
  "Mismo radio y tipografía que el selector de periodo",
  claro.periodo !== null &&
    claro.ia.radio === claro.periodo.radio &&
    claro.ia.tamanoFuente === claro.periodo.tamanoFuente,
  `ia=${claro.ia.radio}/${claro.ia.tamanoFuente}  periodo=${claro.periodo && claro.periodo.radio}/${claro.periodo && claro.periodo.tamanoFuente}`
);
check(
  "Peso semibold (600), no extrabold (800) como antes",
  claro.ia.pesoFuente === "600",
  claro.ia.pesoFuente
);
check(
  "Sin borde ni contorno (0px), no el marco de 1.5px anterior",
  claro.ia.anchoBorde === TRATAMIENTO.anchoBorde,
  claro.ia.anchoBorde
);

// ── 4. El rasgo personalizado: la marca sólida ────────────────────────────
check(
  "Fondo en naranja de marca sólido y opaco (brand-500)",
  igual(claro.ia.fondo, TRATAMIENTO.fondo),
  rgb(claro.ia.fondo)
);
check(
  "Texto blanco sobre el naranja (el contraste de la marca)",
  igual(claro.ia.colorTexto, TRATAMIENTO.texto),
  rgb(claro.ia.colorTexto)
);

if (claro.clipFila) await shotClip("boton-ia-claro.png", claro.clipFila);
await shot("pagina-ia-claro.png");

// ── 5. Tema oscuro ────────────────────────────────────────────────────────
await seedTheme("dark");
await cdp.send("Page.navigate", { url: `${APP}/pedidos/analitica` });
await waitFor("!!document.querySelector('h1')", "el encabezado en tema oscuro");
await sleep(700);

check(
  "El tema oscuro se aplica de verdad",
  (await evaluate("document.documentElement.classList.contains('dark')")) === true
);

const oscuro = await medirBotones();
check("El botón sigue existiendo en tema oscuro", !!oscuro.ia);
if (oscuro.ia) {
  // brand-300 #ff8f78 · brand-500 #ff3f1a al 30 %
  check(
    "En oscuro el fondo sigue siendo el naranja sólido de marca",
    igual(oscuro.ia.fondo, TRATAMIENTO.fondoOscuro),
    rgb(oscuro.ia.fondo)
  );
  check(
    "En oscuro el texto sigue siendo blanco",
    igual(oscuro.ia.colorTexto, TRATAMIENTO.textoOscuro),
    rgb(oscuro.ia.colorTexto)
  );
  check(
    "En oscuro tampoco hay degradado ni animación",
    oscuro.ia.tieneDegradado === false && oscuro.ia.claseAnimada === null
  );
  if (oscuro.clipFila) await shotClip("boton-ia-oscuro.png", oscuro.clipFila);
}
await shot("pagina-ia-oscuro.png");

// ── 6. Contrato de acceso: sin `assistant.use` no se pinta ────────────────
await seedTheme("light");
// d2 = Mateo Vargas, rolId "vendedor": NO tiene assistant.use.
await seedSession("operador", "d2");
await cdp.send("Page.navigate", { url: `${APP}/pedidos/analitica` });
await waitFor("!!document.querySelector('h1')", "el encabezado con rol Operador");
await sleep(700);

const sigueViva = await paginaViva();
check("Con rol Operador la página sigue renderizando", !!sigueViva, `h1=${sigueViva}`);

// Señal INDEPENDIENTE de que el rol se aplicó de verdad y no se cayó al estado
// de administrador (la trampa clásica del arnés): el vendedor no tiene
// `team.manage`, así que el enlace de la barra lateral a /pedidos/equipo debe
// faltar. Si apareciera, estaríamos midiendo la sesión equivocada.
const enlaceEquipo = await evaluate(
  "(() => !!document.querySelector('a[href=\"/pedidos/equipo\"]'))()"
);
check(
  "El rol se aplicó de verdad: sin `team.manage` no hay enlace a Equipo",
  enlaceEquipo === false
);
check(
  "Sin `assistant.use` el botón NECTO AI NO se pinta",
  (await existeBotonIA()) === false
);
if (claro.clipFila) await shotClip("boton-ia-sin-permiso.png", claro.clipFila);

// ── Informe ───────────────────────────────────────────────────────────────
console.log(results.join("\n"));
console.log(`\n  ${passed} OK · ${failed} FAIL`);
console.log("\n  Botón NECTO AI (tema claro):");
console.log("  " + JSON.stringify(claro.ia, null, 2).split("\n").join("\n  "));
console.log("\n  Vecinos →  CSV: " + JSON.stringify(claro.csv) + "   periodo: " + JSON.stringify(claro.periodo));
console.log("\n  Capturas en " + OUT);

cdp.close();
process.exit(failed === 0 ? 0 : 1);
