// ═══════════════════════════════════════════════════════════════════════════
// Caza de errores — módulo Inventarios (consola + excepciones + modales)
// ═══════════════════════════════════════════════════════════════════════════
//
// `verify-inventarios-render.mjs` responde «¿la ruta pinta?». Este responde
// «¿la consola se queja?», que es otra pregunta: un `key` duplicado, un
// `value` sin `onChange`, un `NaN` en un `style` o un `Warning: Each child`
// NO lanzan excepción, así que el arnés anterior los declara limpios.
//
// Captura:
//   1. `Runtime.exceptionThrown`      → excepciones reales
//   2. `Runtime.consoleAPICalled`     → console.error / console.warn
//   3. `Log.entryAdded`               → errores de red y de Chrome
//
// Y abre los modales, que es donde vive la lógica que ninguna ruta monta.
//
// Sonda de vida: si el puerto no responde, ABORTA. Un arnés que navega a la
// página de error de Chrome devuelve «0 errores» y parece verde.

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://localhost:6020";

const t0Global = new Date();
console.log("inicio " + t0Global.toLocaleTimeString("es-CO"));

// ── Red de seguridad: un arnés que muere en silencio miente ───────────────
//
// Antes, un error de sintaxis en un archivo del módulo dejaba este script
// esperando un montaje que nunca llegaba: moría por timeout **sin imprimir
// nada**, y una salida vacía es indistinguible de «todavía no ha terminado».
// Estas tres guardas garantizan que siempre quede un rastro con la causa.
let cdp = null;
let terminado = false;
const despedida = (motivo, codigo) => {
  if (terminado) return;
  terminado = true;
  console.log("\n!! el arnés terminó sin informe: " + motivo);
  console.log("   (una corrida sin resumen NO es una corrida verde)");
  try { if (cdp && cdp.close) cdp.close(); } catch {}
  process.exit(codigo);
};
process.on("uncaughtException", (e) => despedida("excepción no capturada: " + e.message, 3));
process.on("unhandledRejection", (e) => despedida("promesa rechazada: " + (e && e.message ? e.message : e), 3));
process.on("SIGTERM", () => despedida("SIGTERM (timeout del runner)", 4));
process.on("SIGINT", () => despedida("SIGINT", 4));

// ── Sonda de vida: sin esto el informe no vale nada ───────────────────────
try {
  const r = await fetch(APP + "/", { redirect: "manual" });
  if (!r.ok && r.status !== 0) throw new Error("status " + r.status);
  console.log("sonda de vida: " + APP + " → " + r.status);
} catch (e) {
  console.error("ABORTA: el servidor no responde en " + APP + " (" + e.message + ")");
  process.exit(2);
}

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

cdp = await connect((await getPageTarget()).webSocketDebuggerUrl);
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

const waitFor = async (expression, label, timeoutMs = 45000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { if (await evaluate(expression)) return true; } catch {}
    await sleep(300);
  }
  throw new Error("Timeout: " + label);
};

// Ruido conocido que NO es del módulo bajo prueba.
const NOISE = /favicon|\[vite\]|DevTools|Download the React|ResizeObserver loop/i;

// ── Clasificador de quejas de consola ─────────────────────────────────────
//
// Se separa por GRAVEDAD porque no es lo mismo un `console.error` (defecto)
// que un `console.warn` de React (posible defecto). Mezclarlos convierte el
// informe en ruido y nadie lo lee.
const quejas = [];
const clasificar = () => {
  quejas.length = 0;
  for (const e of cdp.events) {
    if (e.method === "Runtime.exceptionThrown") {
      const d = e.params.exceptionDetails;
      const txt = d.exception?.description || d.text || "";
      if (NOISE.test(txt)) continue;
      quejas.push({ gravedad: "excepcion", texto: txt.split("\n").slice(0, 3).join(" | ") });
    } else if (e.method === "Runtime.consoleAPICalled") {
      const tipo = e.params.type;
      if (tipo !== "error" && tipo !== "warning") continue;
      const txt = e.params.args
        .map((a) => a.value ?? a.description ?? a.preview?.description ?? JSON.stringify(a.preview ?? {}))
        .join(" ");
      if (NOISE.test(txt)) continue;
      quejas.push({ gravedad: tipo, texto: txt.split("\n").slice(0, 3).join(" | ").slice(0, 400) });
    } else if (e.method === "Log.entryAdded") {
      const lvl = e.params.entry.level;
      if (lvl !== "error" && lvl !== "warning") continue;
      const txt = e.params.entry.text || "";
      if (NOISE.test(txt)) continue;
      quejas.push({ gravedad: lvl, texto: txt.split("\n").slice(0, 3).join(" | ").slice(0, 400) });
    }
  }
};

let ok = 0, fail = 0;
const check = (label, cond, detail) => {
  if (cond) { ok++; console.log("  OK   " + label); }
  else { fail++; console.log("  FAIL " + label + (detail !== undefined ? "  → " + detail : "")); }
};

const MONTADO = `(() => {
  const raiz = document.getElementById('root');
  if (!raiz || raiz.children.length === 0) return false;
  return !!document.querySelector('h1, h2');
})()`;

/**
 * ¿La app llegó a renderizar, o Vite está sirviendo un módulo que no compila?
 *
 * Esto faltaba, y su ausencia costó una corrida entera: con un error de
 * sintaxis en un archivo del módulo, Vite responde **200** en `/` (sirve el
 * HTML igual) y el error solo aparece al pedir el módulo roto, que deja la
 * pantalla en blanco. El arnés se quedaba esperando el montaje que nunca
 * llegaba y **moría por timeout sin imprimir nada** — indistinguible de «aún
 * no ha terminado». Un arnés mudo es un arnés que miente por omisión.
 *
 * Aquí se pregunta directamente por el error, en vez de esperar a que el
 * montaje ocurra: si Vite trae la página de error de transformación, su
 * `vite-error-overlay` está en el DOM y su texto nombra el archivo y la línea.
 */
const DIAGNOSTICO_VITE = `(() => {
  const ov = document.querySelector('vite-error-overlay');
  if (ov) {
    const sombra = ov.shadowRoot ? ov.shadowRoot.textContent : '';
    return 'overlay de Vite: ' + (sombra || '').replace(/\\s+/g, ' ').trim().slice(0, 300);
  }
  const cuerpo = document.body ? document.body.innerText.trim() : '';
  if (/Internal server error|Transform failed|Pre-transform error/i.test(cuerpo)) {
    return 'cuerpo con error de Vite: ' + cuerpo.replace(/\\s+/g, ' ').slice(0, 300);
  }
  const raiz = document.getElementById('root');
  if (!raiz || raiz.children.length === 0) {
    return 'root vacío y sin overlay: la app no montó (¿módulo roto servido por Vite?)';
  }
  return null;
})()`;

const irA = async (path) => {
  await cdp.send("Page.navigate", { url: APP + path });
  let monto = false;
  try { monto = await waitFor(MONTADO, "montaje " + path, 25000); } catch { monto = false; }
  // Con la app sin montar no se espera el pathname: daría otro timeout encima.
  if (monto) {
    try { await waitFor(`location.pathname === ${JSON.stringify(path)}`, "pathname " + path, 15000); } catch {}
  }
  await sleep(700);
  return monto;
};

// ── Semilla (idéntica al otro arnés; ver allí por qué son estas dos claves) ─
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
      pedidos:     { instalado: true, activo: true, conectores: conectores },
      inventarios: { instalado: true, activo: true, conectores: conectores },
    },
  }));
  return true;
})()`;

await cdp.send("Page.navigate", { url: APP + "/login" });
try { await waitFor(`!!document.getElementById('root')`, "origen para sembrar", 30000); } catch {}
await evaluate(SEMILLA);
console.log("semilla escrita\n");

const RUTAS = [
  "/inventarios",
  "/inventarios/nuevo",
  "/inventarios/elementos",
  "/inventarios/ubicaciones",
  "/inventarios/historial",
  "/inventarios/alertas",
  "/inventarios/reportes",
  "/inventarios/config",
];

// ── Fase 1: cada ruta, con la consola limpia ─────────────────────────────
console.log("── FASE 1 · rutas ──");
const porRuta = [];
for (const path of RUTAS) {
  const antes = cdp.events.length;
  const marcaTiempo = Date.now();
  const monto = await irA(path);
  await sleep(400);
  const nuevos = cdp.events.slice(antes);
  cdp.events.length = 0;      // se consume lo leído
  void marcaTiempo;

  const encontrados = [];
  for (const e of nuevos) {
    if (e.method === "Runtime.exceptionThrown") {
      const txt = e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text || "";
      if (!NOISE.test(txt)) encontrados.push("excepcion: " + txt.split("\n")[0]);
    } else if (e.method === "Runtime.consoleAPICalled" && (e.params.type === "error" || e.params.type === "warning")) {
      const txt = e.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
      if (!NOISE.test(txt)) encontrados.push(e.params.type + ": " + txt.split("\n")[0].slice(0, 300));
    } else if (e.method === "Log.entryAdded" && (e.params.entry.level === "error" || e.params.entry.level === "warning")) {
      const txt = e.params.entry.text || "";
      if (!NOISE.test(txt)) encontrados.push(e.params.entry.level + ": " + txt.split("\n")[0].slice(0, 300));
    }
  }

  const donde = await evaluate("location.pathname");
  const h1 = await evaluate(`(() => { const h = document.querySelector('h1'); return h ? h.textContent.trim() : null; })()`);
  porRuta.push({ path, donde, h1, encontrados, monto });

  // Primero: ¿montó? Sin esto, una ruta en blanco hace que las comprobaciones
  // negativas pasen por vacío y la de `h1` falle por el motivo equivocado.
  check(path + " → montó la app", monto, "no montó en el tiempo de espera");
  if (!monto) {
    // El diagnóstico se pide AQUÍ, solo cuando falta el montaje, para que
    // nombre la causa en vez de dejar un «no montó» a secas.
    console.log("       causa: " + (await evaluate(DIAGNOSTICO_VITE)));
  }
  check(path + " → llegó", donde === path, "quedó en " + donde);
  check(path + " → h1", !!h1, String(h1));
  check(path + " → consola limpia", encontrados.length === 0,
    encontrados.length + " aviso(s): " + encontrados.slice(0, 2).join(" ;; "));
}

// ── Fase 2: los modales, que ninguna ruta monta ──────────────────────────
//
// El alta rápida de elemento, la ficha de elemento y el árbol de ubicaciones
// viven en overlays. Un defecto ahí es invisible para un arnés que solo
// navega rutas.
console.log("\n── FASE 2 · modales ──");

const abrirPorTexto = (texto) => `(() => {
  const btn = [...document.querySelectorAll('button')]
    .find((b) => (b.textContent || '').trim().toLowerCase().includes(${JSON.stringify(texto.toLowerCase())}));
  if (!btn) return 'sin boton: ' + ${JSON.stringify(texto)};
  btn.click();
  return true;
})()`;

const MODALES = [
  // El texto tiene que ser el del botón REAL. «nuevo elemento» era el nombre
  // antiguo y el botón dice «Agregar producto»: el arnés daba un FAIL que
  // culpaba a la pantalla de un defecto del instrumento (la lección de la
  // skill: comprobar la etiqueta antes de creer el rojo).
  ["/inventarios/elementos", "agregar producto", "modal agregar producto"],
  ["/inventarios/ubicaciones", "nueva ubicaci", "modal nueva ubicación"],
];

for (const [ruta, textoBoton, etiqueta] of MODALES) {
  await irA(ruta);
  cdp.events.length = 0;
  const res = await evaluate(abrirPorTexto(textoBoton));
  if (res !== true) {
    check(etiqueta + " → se pudo abrir", false, String(res));
    continue;
  }
  await sleep(900);
  const dialogo = await evaluate(`(() => {
    const d = document.querySelector('[role=dialog]') || document.querySelector('.fixed.inset-0');
    return d ? d.innerText.slice(0, 120) : null;
  })()`);
  const encontrados = [];
  for (const e of cdp.events) {
    if (e.method === "Runtime.exceptionThrown") {
      const txt = e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text || "";
      if (!NOISE.test(txt)) encontrados.push("excepcion: " + txt.split("\n")[0]);
    } else if (e.method === "Runtime.consoleAPICalled" && (e.params.type === "error" || e.params.type === "warning")) {
      const txt = e.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
      if (!NOISE.test(txt)) encontrados.push(e.params.type + ": " + txt.split("\n")[0].slice(0, 300));
    }
  }
  check(etiqueta + " → se abrió", !!dialogo, String(dialogo).slice(0, 60));
  check(etiqueta + " → consola limpia", encontrados.length === 0, encontrados.slice(0, 2).join(" ;; "));
}

// ── Fase 3: el alta rápida dentro del modal de agregar ───────────────────
//
// Es la función que se añadió hoy y la que más riesgo tiene: formulario
// anidado, estado local y creación en el store.
console.log("\n── FASE 3 · alta rápida dentro del conteo ──");
await irA("/inventarios");
const fila = await evaluate(`(() => {
  const tr = document.querySelector('main tbody tr');
  if (!tr) return 'sin filas';
  const c = tr.querySelector('td button, td a');
  if (!c) return 'sin control';
  c.click();
  return true;
})()`);
if (fila === true) {
  await sleep(1000);
  cdp.events.length = 0;
  const abrir = await evaluate(abrirPorTexto("agregar elemento"));
  if (abrir === true) {
    await sleep(900);
    const estados = await evaluate(`(() => {
      const d = document.querySelector('[role=dialog]') || document.querySelector('.fixed.inset-0');
      if (!d) return null;
      const inputs = d.querySelectorAll('input');
      const botones = [...d.querySelectorAll('button')].map(b => b.textContent.trim()).filter(Boolean);
      return { inputs: inputs.length, botones: botones.slice(0, 8), texto: d.innerText.slice(0, 200) };
    })()`);
    const encontrados = [];
    for (const e of cdp.events) {
      if (e.method === "Runtime.exceptionThrown") {
        const txt = e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text || "";
        if (!NOISE.test(txt)) encontrados.push("excepcion: " + txt.split("\n")[0]);
      } else if (e.method === "Runtime.consoleAPICalled" && (e.params.type === "error" || e.params.type === "warning")) {
        const txt = e.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
        if (!NOISE.test(txt)) encontrados.push(e.params.type + ": " + txt.split("\n")[0].slice(0, 300));
      }
    }
    check("modal agregar → se abrió", !!estados, String(estados).slice(0, 80));
    check("modal agregar → tiene inputs", !!estados && estados.inputs > 0, estados ? estados.inputs + " inputs" : "n/a");
    check("modal agregar → consola limpia", encontrados.length === 0, encontrados.slice(0, 2).join(" ;; "));
    console.log("     botones: " + JSON.stringify(estados?.botones));
  } else {
    check("modal agregar → se pudo abrir", false, String(abrir));
  }
} else {
  check("entrar al detalle por fila", false, String(fila));
}

// ── Cierre ───────────────────────────────────────────────────────────────
console.log("\n──────────────────────────────");
console.log("OK:   " + ok);
console.log("FAIL: " + fail);
console.log("fin " + new Date().toLocaleTimeString("es-CO") +
  "  (duración " + Math.round((Date.now() - t0Global.getTime()) / 1000) + "s)");

clasificar();
const porGravedad = quejas.reduce((acc, q) => {
  acc[q.gravedad] = (acc[q.gravedad] || 0) + 1;
  return acc;
}, {});
console.log("quejas acumuladas: " + JSON.stringify(porGravedad));
if (quejas.length) {
  console.log("\n── DETALLE (únicas) ──");
  const vistos = new Set();
  for (const q of quejas) {
    const clave = q.gravedad + "|" + q.texto.slice(0, 80);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    console.log("  [" + q.gravedad + "] " + q.texto);
  }
}

cdp.close();
process.exit(fail === 0 ? 0 : 1);
