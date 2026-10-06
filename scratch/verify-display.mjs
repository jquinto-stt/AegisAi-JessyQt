/**
 * Auditoría del «Modo Enfoque» (/pedidos/display).
 *
 * Dos trabajos:
 *  1. Capturar la pantalla tal como la ve el operador.
 *  2. Censar el color PINTADO contra los tokens del tema.
 *
 * Trampa que ya costó una sesión: Tailwind v4 emite `oklab(...)` para colores con
 * alfa, así que parsear `rgb(...)` con una regex no matchea nada y la auditoría
 * informa «limpio» habiendo inspeccionado cero valores. Se resuelve pintando el
 * color en un canvas de 1x1 y leyendo el píxel.
 */
import { writeFileSync, mkdirSync, appendFileSync } from "node:fs";

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://127.0.0.1:6020";
const OUT = process.env.OUT_DIR || "./outputs/display-verify/";
mkdirSync(OUT, { recursive: true });

const log = (s) => {
  appendFileSync(OUT + ".probe.log", s + "\n");
  console.log(s);
};

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
  width: 1920,
  height: 1080,
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
  throw new Error(`Timeout esperando: ${label}`);
};

const shot = async (name) => {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(OUT + name, Buffer.from(data, "base64"));
  log(`  captura -> ${name}`);
};

let fallos = 0;
const check = (titulo, ok, detalle = "") => {
  if (!ok) fallos++;
  log(`  ${ok ? "OK  " : "FAIL"} ${titulo}${detalle ? "  · " + detalle : ""}`);
};

// ── El payload de auditoría de color. Lista blanca = familias del tema. ──────
const AUDITORIA = `(() => {
  const TOKENS = [];
  const push = (arr) => arr.forEach((h) => TOKENS.push(h));
  // brand (naranja de marca)
  push(["#fff5f2","#ffede8","#ffd6cc","#ffb3a3","#ff8f78","#ff6647","#ff3c10","#e63314","#bf2810","#99200d","#7a1a0b","#4d0f06"]);
  // secondary (indigo de marca)
  push(["#f4f2ff","#ebe6ff","#d2c7ff","#a98fff","#7e57ff","#4d1fe0","#2a0bb0","#15008b","#14006e","#0f0054","#0a003a","#060022"]);
  // accent (celeste de marca)
  push(["#f5fcfd","#eaf7f9","#d5eff3","#b6e3ea","#71d6e0","#6bc2ce","#45aebd","#348a97","#2a6f79","#22585f","#1c474d","#0f2a2e"]);
  // success / warning / error (rampas semanticas del tema)
  push(["#f6fef9","#ecfdf3","#d1fadf","#a6f4c5","#6ce9a6","#32d583","#12b76a","#039855","#027a48","#05603a","#054f31","#053321"]);
  push(["#fffcf5","#fffaeb","#fef0c7","#fedf89","#fec84b","#fdb022","#f79009","#dc6803","#b54708","#93370d","#7a2e0e","#4e1d09"]);
  push(["#fffbfa","#fef3f2","#fee4e2","#fecdca","#fda29b","#f97066","#f04438","#d92d20","#b42318","#912018","#7a271a","#55160c"]);
  // tinta
  push(["#1d3261","#535250"]);
  // gris del tema (rampa azul-noche vigente)
  push(["#fcfcfd","#f9fafb","#f2f4f7","#e4e7ec","#d0d5dd","#98a2b3","#667085","#475467","#344054","#1d2939","#101828","#0c111d","#1a2231"]);
  push(["#ffffff","#f2e7d3"]);

  const hex2rgb = (h) => [1,3,5].map((i) => parseInt(h.slice(i, i+2), 16));
  const allowed = TOKENS.map(hex2rgb);

  const cv = document.createElement("canvas");
  cv.width = 1; cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const toSRGB = (color) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  };
  const isAllowed = (r, g, b) =>
    allowed.some(([R,G,B]) => Math.abs(r-R) <= 4 && Math.abs(g-G) <= 4 && Math.abs(b-B) <= 4);

  const bad = new Map();
  let inspeccionados = 0;
  const walk = (el) => {
    const cs = getComputedStyle(el);
    for (const p of ["backgroundColor", "color", "borderTopColor"]) {
      const v = cs[p];
      if (v === "rgba(0, 0, 0, 0)") continue;
      inspeccionados++;
      const [r, g, b] = toSRGB(v);
      if (Math.max(r,g,b) - Math.min(r,g,b) < 30) continue;   // neutros
      if (isAllowed(r, g, b)) continue;
      const clave = p + "=" + v + " -> rgb(" + r + "," + g + "," + b + ")";
      if (!bad.has(clave)) bad.set(clave, el.tagName.toLowerCase() + "." + String(el.className).slice(0, 70));
    }
    for (const c of el.children) walk(c);
  };
  walk(document.body);
  return { inspeccionados, malos: [...bad].map(([k, v]) => k + "  [" + v + "]") };
})()`;

// ═══ Fase 1 · montaje ═══════════════════════════════════════════════════════
log("── Fase 1 · montaje de /pedidos/display ──");
await cdp.send("Page.navigate", { url: APP + "/pedidos/display" });
await waitFor(
  `(() => { const r = document.getElementById('root'); return !!r && r.children.length > 0; })()`,
  "montaje de la app"
);
await waitFor(`!!document.querySelector('header')`, "la cabecera del display");
// 2,6 s y no 1,2 s: el destello dura 900 ms y su anillo se desvanece con
// `transition-all duration-300`, así que a 1,2 s la captura lo pilla a medias y
// el borde de la tarjeta sale naranja. Se espera a que el estado asiente.
await sleep(2600);

const donde = await evaluate(`location.pathname`);
check("la ruta es la pedida", donde === "/pedidos/display", `location.pathname = ${donde}`);

const texto = await evaluate(`document.body.innerText`);
check("la pantalla renderiza contenido", (texto || "").trim().length > 80, `${(texto||"").length} chars`);

// El rótulo del modo, que es lo que la identifica
check("dice «Modo Enfoque»", /Modo Enfoque/i.test(texto || ""));

// ── La marca ────────────────────────────────────────────────────────────────
// Esta línea afirmaba «dice StockFlow». Era una aserción que **verificaba el
// defecto**: el producto se llama NECTO, y el nombre de la empresa que lo
// construye no es su logotipo. Se sustituye por lo que de verdad hay que
// exigir —el lockup canónico, servido desde `public/images/logo/` y con píxeles
// reales— más la comprobación de que el rótulo viejo ya no está.
check("NO dice «StockFlow»", !/StockFlow/i.test(texto || ""));
const logo = await evaluate(`(() => {
  const img = [...document.querySelectorAll('img')]
    .find((i) => /necto-(full|icon)/.test(i.getAttribute('src') || ''));
  if (!img) return null;
  const r = img.getBoundingClientRect();
  return {
    src: img.getAttribute('src'),
    w: img.naturalWidth,
    h: img.naturalHeight,
    visible: r.width > 0 && r.height > 0,
  };
})()`);
check(
  "monta el lockup NECTO",
  !!logo && logo.w > 0 && logo.visible,
  logo ? `${logo.src} · ${logo.w}x${logo.h} · visible=${logo.visible}` : "no encontrado"
);

// ── El protagonista no puede inventarse el estado ───────────────────────────
// El defecto que esto vigila: la tarjeta grande rotulaba con un par fijo del JSX
// («Listo para entrega» / «En preparación»), así que un pedido `confirmado` se
// anunciaba como «En preparación» mientras la fila de la cola del MISMO pedido
// decía «Confirmado». Dos rótulos distintos para el mismo hecho, en la misma
// pantalla, y el grande es el que se lee desde el otro lado de la sala.
// Se exige que coincidan: el error no puede volver sin que el arnés lo diga.
const coherencia = await evaluate(`(() => {
  const txt = (n) => (n.textContent || '').trim().replace(/\\s+/g, ' ');
  const esPildora = (s) => /uppercase/.test(s.className || '') && /rounded-full/.test(s.className || '');
  const pildoras = (raiz) => [...raiz.querySelectorAll('span')].filter(esPildora).map(txt);

  const main = document.querySelector('main');
  const seccion = main && main.querySelector('section');
  const aside = main && main.querySelector('aside');
  if (!seccion || !aside) return { ok: false, motivo: 'sin protagonista o sin cola' };

  const numero = [...seccion.querySelectorAll('span')]
    .map((s) => ({ t: txt(s), size: parseFloat(getComputedStyle(s).fontSize) || 0 }))
    .filter((s) => /^[A-Z]{2,}-[0-9]+$/.test(s.t))
    .sort((a, b) => b.size - a.size)
    .map((s) => s.t)[0];
  if (!numero) return { ok: false, motivo: 'sin número protagonista' };

  const enHeroe = pildoras(seccion)[0] || '';
  const fila = [...aside.querySelectorAll('div')].find(
    (n) => /cursor-pointer/.test(n.className || '') && txt(n).startsWith(numero)
  );
  const enCola = fila ? pildoras(fila)[0] || '' : '';
  return { ok: true, numero, enHeroe, enCola };
})()`);
check(
  "el protagonista no se inventa el estado",
  !!coherencia && coherencia.ok === true && coherencia.enHeroe !== "" && coherencia.enHeroe === coherencia.enCola,
  coherencia && coherencia.ok
    ? `${coherencia.numero}: tarjeta «${coherencia.enHeroe}» vs cola «${coherencia.enCola}»`
    : (coherencia && coherencia.motivo) || "no se pudo leer"
);

// ── Familias ajenas — comprobación ESTRUCTURAL ──────────────────────────────
// El censo de color dice qué se PINTA; esto dice qué se ESCRIBE. Hacen falta
// los dos: una clase que no existe no da error y deja la superficie sin pintar,
// y un color del tema puede llegar con un valor inesperado. `emerald`, `slate`,
// `amber` y `cyan` no son familias declaradas en `theme.css`, así que caen a la
// paleta por defecto de Tailwind — que es exactamente cómo entró el verde.
const ajenas = await evaluate(`(() => {
  const RE = /-(slate|emerald|amber|cyan|indigo|violet|purple|pink|rose|fuchsia|sky|teal|lime|zinc|neutral|stone|orange|blue|green|red|yellow)-\\d/;
  const hits = new Map();
  for (const el of document.querySelectorAll('*')) {
    const c = typeof el.className === 'string' ? el.className : '';
    if (!c) continue;
    for (const tok of c.split(/\\s+/)) {
      const m = RE.exec(tok);
      if (m) hits.set(m[1], (hits.get(m[1]) || 0) + 1);
    }
  }
  return [...hits].map(([k, v]) => k + ' x' + v);
})()`);
check(
  "ninguna familia ajena de Tailwind",
  ajenas.length === 0,
  ajenas.length ? ajenas.join(", ") : "0"
);
if (ajenas.length) ajenas.forEach((a) => log("     " + a));

// ── El destello tiene que APAGARSE ──────────────────────────────────────────
// Regresión concreta, no una precaución genérica. La versión anterior dejaba el
// anillo encendido PARA SIEMPRE: el `return` del efecto limpiaba el temporizador
// y, con el doble montaje de StrictMode (`src/app/index.tsx`), la segunda pasada
// salía por el `return` temprano sin programar otro. El resultado medido sobre el
// PNG era `rgb(255, 60, 16)` —naranja de marca— en los cuatro bordes de la
// tarjeta de forma permanente.
//
// Se mira el `box-shadow`, que es donde Tailwind emite el `ring`: una capa de
// anillo tiene desplazamiento cero y un `spread` distinto de cero.
const sombraTarjeta = await evaluate(
  `(() => { const t = document.querySelector('main > section')?.firstElementChild;
            return t ? getComputedStyle(t).boxShadow : null; })()`
);
const capasSombra = (sombraTarjeta || "").split(/,(?![^(]*\))/).map((c) => c.trim());
const anillosVivos = capasSombra.filter(
  (c) => /0px 0px 0px [1-9]/.test(c) && !/rgba\(0, 0, 0, 0\)/.test(c)
);
check(
  "el destello se apaga solo (sin anillo a los 2,6 s)",
  anillosVivos.length === 0,
  anillosVivos.length ? anillosVivos.join(" | ") : "sin anillo"
);

await shot("01-display-1920.png");

// ═══ Fase 2 · censo de color pintado ════════════════════════════════════════
log("");
log("── Fase 2 · color pintado contra los tokens del tema ──");
const audit = await evaluate(AUDITORIA);
check("la auditoría inspeccionó valores de color", audit.inspeccionados > 50, `${audit.inspeccionados} declaraciones`);
check(
  "ningún color fuera de la paleta del tema",
  audit.malos.length === 0,
  `${audit.malos.length} fuera de paleta`
);
if (audit.malos.length) {
  log("  ── colores ajenos encontrados ──");
  audit.malos.slice(0, 40).forEach((m) => log("     " + m));
}

// ═══ Fase 3 · los dos estados y el modal de lanzamiento ════════════════════
log("");
log("── Fase 3 · otros estados y la superficie de lanzamiento ──");
await cdp.send("Page.navigate", { url: APP + "/pedidos/display?soloListos=1" });
await waitFor(`!!document.querySelector('header')`, "la cabecera (soloListos)");
await sleep(900);
await shot("02-display-solo-listos.png");

await cdp.send("Page.navigate", { url: APP + "/pedidos/inicio" });
await waitFor(`!!document.querySelector('h1')`, "Inicio");
await sleep(1500);
const textoInicio = await evaluate(`document.body.innerText`);
check("Inicio monta y ofrece el lanzador", /Modo Enfoque/i.test(textoInicio || ""));
await shot("03-inicio.png");

// Abrir el modal de configuración
const abierto = await evaluate(`(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Modo Enfoque/i.test(x.textContent));
  if (!b) return false;
  b.click();
  return true;
})()`);
check("el botón «Modo Enfoque» existe en Inicio", abierto === true);
if (abierto) {
  await sleep(900);
  await shot("04-modal-configurar-display.png");
}

// ═══ Cierre ═════════════════════════════════════════════════════════════════
const errs = cdp.events.filter(
  (e) =>
    e.method === "Runtime.exceptionThrown" &&
    !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e))
);
log("");
log(`ERRORES DE RUNTIME: ${errs.length ? JSON.stringify(errs.slice(0, 4)) : "(ninguno)"}`);
log(`RESULTADO: ${fallos === 0 ? "OK" : fallos + " FAIL"}`);

cdp.close();
process.exit(fallos === 0 ? 0 : 1);
