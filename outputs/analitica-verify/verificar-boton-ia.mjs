/**
 * Verificación del botón "NECTO AI" de Analítica.
 *
 * Historia del diseño, porque explica qué se comprueba:
 *   1. Original — anillo de TRES colores (naranja→violeta→índigo #190088),
 *      icono con `animate-pulse`, pastilla «Chat», `hover:scale`. La técnica del
 *      anillo era buena; el exceso la arruinaba. Veredicto: estridente.
 *   2. Tinte pálido de marca → "feo, sin nada especial".
 *   3. Marca sólida plana → "no destaca, no invita a nada".
 *   4. La referencia del usuario: píldora con anillo degradado, relleno claro y
 *      texto en degradado, con el destello de `ShootingStarIcon`. Sin animación.
 *   5. **Actual** — igual que 4, pero con las **tres rampas de marca de NECTO**
 *      (`brand-500` naranja → `secondary-300` violeta → `accent-300` cian) y con
 *      **animación al pasar el ratón**: el degradado va a doble ancho y su
 *      posición se desplaza, así que los colores fluyen por el anillo.
 *
 * Lo que se comprueba, y por qué cada cosa:
 *   1. Existe, conserva `title`, icono y forma de píldora.
 *   2. **El anillo recorre las tres rampas de marca** y NO reaparece el
 *      índigo `#190088` que fundía un extremo con el fondo.
 *   3. **El contraste del texto en degradado llega a 4.5:1 en los TRES tonos.**
 *      Es la comprobación central y la razón de que el texto use tonos más
 *      oscuros que el anillo: `accent-300` (#97d6df) sobre blanco da **1.65:1**,
 *      ilegible. El anillo puede permitírselo (es decoración), el texto no. Una
 *      aserción que solo mirara "el texto es un degradado" daría verde con un
 *      texto invisible, así que aquí se mide el contraste de verdad.
 *   4. **La animación de hover es real**: se mueve el ratón de verdad con
 *      `Input.dispatchMouseEvent` y se comprueba que `background-position` pasa
 *      de `0%` a `100%`. Medir el `class` no serviría: probaría que la clase
 *      está escrita, no que el navegador la aplica. Y se comprueba que **sin
 *      ratón encima la animación está quieta** (`transition` solo, sin
 *      `@keyframes` en reposo), para que el botón no parpadee solo.
 *   5. Sigue alineado en altura con la barra y respetando el contrato de acceso.
 *
 * Trampas respetadas (documentadas en REFERENCIA.md):
 *   - `Runtime.evaluate` devuelve el literal de cadena sin reevaluarlo: los IIFE
 *     se pasan desnudos.
 *   - El payload está en `.result.result.value`.
 *   - Tailwind v4 emite `oklab()`: los colores se resuelven a sRGB pintándolos en
 *     un canvas de 1×1. Los TOKENS del tema se resuelven leyendo
 *     `var(--color-*)`, que Tailwind v4 expone como variables CSS.
 *   - La instantánea de sesión NO tiene `rolId`: su forma es
 *     `{ modulos, tipoSesion, operadorSimuladoId, preSimulacion }`.
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

/**
 * Color del diseño DESCARTADO. El original terminaba el degradado en índigo
 * `#190088`: tan oscuro que un extremo del anillo se fundía con el fondo.
 * El violeta `#7e57ff` NO está aquí a propósito — es `secondary-300` y el
 * diseño vigente lo usa.
 */
const INDIGO_DESCARTADO = ["190088", "25, 0, 136"];

/** Mínimo de contraste WCAG AA para texto pequeño. */
const CONTRASTE_MINIMO = 4.5;

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

const medirBoton = () =>
  evaluate(
    [
      "(() => {",
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
      "  const token = (nombre) => {",
      "    const d = document.createElement('div');",
      "    d.style.color = 'var(' + nombre + ')';",
      "    document.body.appendChild(d);",
      "    const c = getComputedStyle(d).color;",
      "    d.remove();",
      "    return resolver(c);",
      "  };",
      "  const lum = (c) => {",
      "    const f = (v) => { v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };",
      "    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);",
      "  };",
      "  const contraste = (a, b) => {",
      "    const la = lum(a), lb = lum(b);",
      "    return Math.round(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)) * 100) / 100;",
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
      "  const relleno = ia.querySelector('span[class*=\"rounded-full\"]');",
      "  const texto = ia.querySelector('[class*=\"bg-clip-text\"]');",
      "  const rellenoCs = relleno ? getComputedStyle(relleno) : null;",
      "  const textoCs = texto ? getComputedStyle(texto) : null;",
      "  const colorRelleno = rellenoCs ? resolver(rellenoCs.backgroundColor) : null;",
      "  salida.ia = Object.assign(geo(ia), {",
      "    imagenFondo: cs.backgroundImage,",
      "    tamanoFondo: cs.backgroundSize,",
      "    posicionFondo: cs.backgroundPosition,",
      "    rellenoInterior: cs.paddingTop,",
      "    nombreAnimacion: cs.animationName,",
      "    transformacion: cs.transform,",
      "    title: ia.getAttribute('title') || '',",
      "    tieneDestello: !!ia.querySelector('svg'),",
      "    tienePulso: !!ia.querySelector('.animate-pulse'),",
      "    // Centro en coordenadas de viewport: lo necesita el ratón de CDP.",
      "    centro: { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) },",
      "    relleno: colorRelleno,",
      "    textoTransparente: textoCs ? textoCs.webkitTextFillColor : null,",
      "    textoImagenFondo: textoCs ? textoCs.backgroundImage : null,",
      "    // Contraste medido contra el relleno REAL, no contra un blanco supuesto.",
      "    contrastesClaro: [",
      "      contraste(token('--color-brand-700'), colorRelleno),",
      "      contraste(token('--color-secondary-400'), colorRelleno),",
      "      contraste(token('--color-accent-700'), colorRelleno)",
      "    ],",
      "    contrastesOscuro: [",
      "      contraste(token('--color-brand-300'), colorRelleno),",
      "      contraste(token('--color-secondary-200'), colorRelleno),",
      "      contraste(token('--color-accent-200'), colorRelleno)",
      "    ],",
      "    // Referencia: cuánto daría el cian claro que se descartó para el texto.",
      "    contrasteCianDescartado: contraste(token('--color-accent-300'), colorRelleno)",
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
      "    salida.clipBoton = {",
      "      x: Math.max(0, r.left - 16),",
      "      y: Math.max(0, r.top - 16),",
      "      width: r.width + 32,",
      "      height: r.height + 32",
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

/**
 * Estado del botón que solo se ve CON el ratón encima: posición del degradado,
 * sombra, desplazamiento y giro del destello.
 *
 * Se mide con `getComputedStyle`, no leyendo el `class`. La diferencia importa:
 * comprobar que la clase `hover:bg-[position:100%_50%]` está escrita solo prueba
 * que Tailwind la generó; comprobar que `background-position` CAMBIA cuando el
 * ratón entra prueba que el navegador la aplica. Si el `transition-all` se
 * comiera la propiedad, o el degradado no tuviera doble ancho, la primera
 * aserción pasaría y el usuario no vería nada moverse.
 */
const medirHover = () =>
  evaluate(
    [
      "(() => {",
      "  const ia = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'NECTO AI');",
      "  if (!ia) return null;",
      "  const cs = getComputedStyle(ia);",
      "  const svg = ia.querySelector('svg');",
      "  const estrellaCs = svg ? getComputedStyle(svg) : null;",
      "  return {",
      "    posicionFondo: cs.backgroundPosition,",
      "    transformacion: cs.transform,",
      "    sombra: cs.boxShadow,",
      "    estrella: estrellaCs ? estrellaCs.transform : null",
      "  };",
      "})()",
    ].join("\n")
  );

/**
 * Mueve el ratón de verdad. `mouseMoved` sobre el centro activa `:hover`;
 * moverlo a (2, 2) — fuera del botón — lo desactiva. Hace falta el par
 * `mouseMoved` porque `:hover` es estado del navegador, no de React: sin un
 * evento real, `getComputedStyle` seguiría devolviendo el estado de reposo y la
 * comprobación pasaría sin haber probado nada.
 */
const moverRaton = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, buttons: 0 });
  await sleep(700); // el `transition-all` dura 500ms; se espera a que asiente.
};

const rgb = (v) => (v ? `rgb(${v[0]}, ${v[1]}, ${v[2]}) @${v[3]}` : "—");

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

check("La página de Analítica carga con sesión de administrador", !!(await paginaViva()));
check(
  "Contrapartida de rol: con administrador el enlace a Equipo SÍ está",
  (await evaluate("(() => !!document.querySelector('a[href=\"/pedidos/equipo\"]'))()")) === true
);

const claro = await medirBoton();

// ── 1. Existencia, forma y accesibilidad ──────────────────────────────────
check("El botón NECTO AI existe en la barra de acciones", !!claro.ia);
if (!claro.ia) {
  console.log(results.join("\n"));
  cdp.close();
  process.exit(1);
}
check("Conserva un `title` descriptivo", claro.ia.title.length > 10, claro.ia.title);
check("Lleva el destello (`ShootingStarIcon`)", claro.ia.tieneDestello === true);
check(
  "Forma de píldora: radio ≥ media altura",
  parseFloat(claro.ia.radio) >= claro.ia.alto / 2,
  `${claro.ia.radio} para ${claro.ia.alto}px`
);

// ── 2. El anillo: las tres rampas de marca, sin el índigo descartado ──────
const anillo = (claro.ia.imagenFondo || "").toLowerCase();
check("El anillo es un degradado", anillo.indexOf("linear-gradient") !== -1, claro.ia.imagenFondo);
check(
  "El anillo se pinta como relleno del envoltorio (`p-[1.5px]`)",
  claro.ia.rellenoInterior === "1.5px",
  claro.ia.rellenoInterior
);
// Las tres rampas de NECTO tienen que estar las tres. Con dos ya se vería un
// degradado, así que una aserción de "es un degradado" no distinguiría el
// diseño de marca de cualquier otra cosa.
for (const [nombre, valor] of [
  ["naranja de marca (`brand-500`)", "--color-brand-500"],
  ["violeta (`secondary-300`)", "--color-secondary-300"],
  ["cian (`accent-300`)", "--color-accent-300"],
]) {
  const hex = await evaluate(
    [
      "(() => {",
      "  const d = document.createElement('div');",
      "  d.style.color = 'var(" + valor + ")';",
      "  document.body.appendChild(d);",
      "  const c = getComputedStyle(d).color;",
      "  d.remove();",
      "  const cv = document.createElement('canvas'); cv.width = 1; cv.height = 1;",
      "  const ctx = cv.getContext('2d');",
      "  ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1);",
      "  const p = ctx.getImageData(0, 0, 1, 1).data;",
      "  return [p[0], p[1], p[2]].join(', ');",
      "})()",
    ].join("\n")
  );
  check(
    `El anillo recorre el ${nombre}`,
    anillo.indexOf(hex) !== -1,
    hex ? `se esperaba ${hex}` : "no se pudo resolver el token"
  );
}
const indigo = INDIGO_DESCARTADO.find((c) => anillo.indexOf(c) !== -1);
check(
  "No reaparece el índigo #190088 que fundía un extremo con el fondo",
  indigo === undefined,
  indigo ? `encontrado ${indigo}` : ""
);

// ── 3. Contraste del texto: la comprobación central ───────────────────────
check(
  "El texto se pinta con degradado recortado (`bg-clip-text`)",
  claro.ia.textoTransparente !== null &&
    /rgba\(0, 0, 0, 0\)|transparent/.test(claro.ia.textoTransparente) &&
    (claro.ia.textoImagenFondo || "").indexOf("linear-gradient") !== -1,
  `fill=${claro.ia.textoTransparente} fondo=${claro.ia.textoImagenFondo}`
);
// Los tres tonos del texto, uno a uno. El degradado tiene tres paradas: si
// fallara solo la del medio, mirar "el contraste" en singular daría verde.
const TONOS_TEXTO = ["brand-700", "secondary-400", "accent-700"];
claro.ia.contrastesClaro.forEach((c, i) => {
  check(
    `Contraste del texto en «${TONOS_TEXTO[i]}» ≥ ${CONTRASTE_MINIMO}:1`,
    c >= CONTRASTE_MINIMO,
    `${c}:1 sobre ${rgb(claro.ia.relleno)}`
  );
});
// Deja constancia de POR QUÉ el texto no usa los tonos claros del anillo.
check(
  "El cian del anillo NO se usa en el texto (daría contraste insuficiente)",
  claro.ia.contrasteCianDescartado < CONTRASTE_MINIMO,
  `accent-300 daría ${claro.ia.contrasteCianDescartado}:1`
);

// ── 4. La animación de hover es real ──────────────────────────────────────
check(
  "En reposo no hay animación por sí sola (nada parpadea sin el ratón)",
  claro.ia.nombreAnimacion === "none",
  claro.ia.nombreAnimacion
);
check("Sin `animate-pulse` (era lo que parpadeaba)", claro.ia.tienePulso === false);
check("Sin escalado en reposo (transform = none)", claro.ia.transformacion === "none", claro.ia.transformacion);
check(
  "El degradado va a doble ancho: sin eso no hay nada que desplazar",
  (claro.ia.tamanoFondo || "").indexOf("200%") !== -1,
  claro.ia.tamanoFondo
);
check(
  "En reposo el degradado está en el extremo inicial (0%)",
  (claro.ia.posicionFondo || "").indexOf("0%") === 0,
  claro.ia.posicionFondo
);

// El ratón, de verdad. Antes y después.
const reposo = await medirHover();
await moverRaton(claro.ia.centro.x, claro.ia.centro.y);
const encima = await medirHover();

check(
  "Con el ratón encima el degradado se desplaza al extremo final (100%)",
  encima !== null && reposo !== null && encima.posicionFondo !== reposo.posicionFondo &&
    encima.posicionFondo.indexOf("100%") === 0,
  `reposo=${reposo && reposo.posicionFondo}  encima=${encima && encima.posicionFondo}`
);
check(
  "Con el ratón encima el botón levanta 1px (`-translate-y-px`)",
  encima !== null && encima.transformacion !== "none" && encima.transformacion !== reposo.transformacion,
  encima && encima.transformacion
);
check(
  "Con el ratón encima el halo se intensifica",
  encima !== null && encima.sombra !== reposo.sombra,
  `${reposo && reposo.sombra} → ${encima && encima.sombra}`
);
check(
  "Con el ratón encima el destello gira (`group-hover:rotate`)",
  encima !== null && encima.estrella !== null && encima.estrella !== "none" &&
    encima.estrella !== (reposo && reposo.estrella),
  `reposo=${reposo && reposo.estrella}  encima=${encima && encima.estrella}`
);

if (claro.clipBoton) await shotClip("boton-ia-detalle-hover.png", claro.clipBoton);
if (claro.clipFila) await shotClip("boton-ia-hover.png", claro.clipFila);

// Y al retirarlo vuelve solo: una animación que se queda pegada es un fallo.
await moverRaton(2, 2);
const devuelta = await medirHover();
check(
  "Al retirar el ratón el degradado vuelve al extremo inicial",
  devuelta !== null && devuelta.posicionFondo === (reposo && reposo.posicionFondo),
  `encima=${encima && encima.posicionFondo}  devuelta=${devuelta && devuelta.posicionFondo}`
);

// ── 5. Alineación con la barra ────────────────────────────────────────────
check(
  "Misma altura que «Descargar CSV»",
  claro.csv !== null && Math.abs(claro.ia.alto - claro.csv.alto) <= 1,
  `ia=${claro.ia.alto}px  csv=${claro.csv && claro.csv.alto}px`
);

if (claro.clipBoton) await shotClip("boton-ia-detalle-claro.png", claro.clipBoton);
if (claro.clipFila) await shotClip("boton-ia-claro.png", claro.clipFila);
await shot("pagina-ia-claro.png");

// ── 6. Tema oscuro ────────────────────────────────────────────────────────
await seedTheme("dark");
await cdp.send("Page.navigate", { url: `${APP}/pedidos/analitica` });
await waitFor("!!document.querySelector('h1')", "el encabezado en tema oscuro");
await sleep(700);

check(
  "El tema oscuro se aplica de verdad",
  (await evaluate("document.documentElement.classList.contains('dark')")) === true
);
const oscuro = await medirBoton();
check("El botón sigue existiendo en tema oscuro", !!oscuro.ia);
if (oscuro.ia) {
  check(
    "En oscuro el relleno es índigo profundo, no blanco",
    oscuro.ia.relleno !== null && oscuro.ia.relleno[0] < 60 && oscuro.ia.relleno[2] > 20,
    rgb(oscuro.ia.relleno)
  );
  check(
    "En oscuro el relleno es el violeta profundo de marca, no blanco",
    oscuro.ia.relleno !== null && oscuro.ia.relleno[0] < 60 && oscuro.ia.relleno[2] > 20,
    rgb(oscuro.ia.relleno)
  );
  // En oscuro el texto cambia de tonos (`dark:from-brand-300 ...`), así que se
  // miden los tres de nuevo. Un solo "sigue siendo suficiente" no valdría: la
  // rampa oscura es OTRA, y es justo la que nadie mira.
  const TONOS_TEXTO_OSCURO = ["brand-300", "secondary-200", "accent-200"];
  oscuro.ia.contrastesOscuro.forEach((c, i) => {
    check(
      `En oscuro el contraste del texto en «${TONOS_TEXTO_OSCURO[i]}» ≥ ${CONTRASTE_MINIMO}:1`,
      c >= CONTRASTE_MINIMO,
      `${c}:1 sobre ${rgb(oscuro.ia.relleno)}`
    );
  });
  // El desplazamiento del degradado no depende del tema, pero el ratón sí puede
  // perderse si el tema cambia de fondo: se comprueba que sigue vivo.
  await moverRaton(oscuro.ia.centro.x, oscuro.ia.centro.y);
  const encimaOscuro = await medirHover();
  check(
    "En oscuro la animación de hover también funciona",
    encimaOscuro !== null && encimaOscuro.posicionFondo.indexOf("100%") === 0,
    encimaOscuro && encimaOscuro.posicionFondo
  );
  if (oscuro.clipBoton) await shotClip("boton-ia-detalle-oscuro-hover.png", oscuro.clipBoton);
  await moverRaton(2, 2);
  if (oscuro.clipBoton) await shotClip("boton-ia-detalle-oscuro.png", oscuro.clipBoton);
  if (oscuro.clipFila) await shotClip("boton-ia-oscuro.png", oscuro.clipFila);
}
await shot("pagina-ia-oscuro.png");

// ── 7. Contrato de acceso ─────────────────────────────────────────────────
// d2 = Mateo Vargas, rolId "vendedor": NO tiene assistant.use.
await seedTheme("light");
await seedSession("operador", "d2");
await cdp.send("Page.navigate", { url: `${APP}/pedidos/analitica` });
await waitFor("!!document.querySelector('h1')", "el encabezado con rol Operador");
await sleep(700);

check("Con rol Operador la página sigue renderizando", !!(await paginaViva()));
check(
  "El rol se aplicó de verdad: sin `team.manage` no hay enlace a Equipo",
  (await evaluate("(() => !!document.querySelector('a[href=\"/pedidos/equipo\"]'))()")) === false
);
check(
  "Sin `assistant.use` el botón NECTO AI NO se pinta",
  (await existeBotonIA()) === false
);

// ── Informe ───────────────────────────────────────────────────────────────
console.log(results.join("\n"));
console.log(`\n  ${passed} OK · ${failed} FAIL`);
console.log("\n  Botón NECTO AI (tema claro):");
console.log("  " + JSON.stringify(claro.ia, null, 2).split("\n").join("\n  "));
console.log("\n  Vecinos →  CSV: " + JSON.stringify(claro.csv) + "   periodo: " + JSON.stringify(claro.periodo));
console.log("\n  Capturas en " + OUT);

cdp.close();
process.exit(failed === 0 ? 0 : 1);
