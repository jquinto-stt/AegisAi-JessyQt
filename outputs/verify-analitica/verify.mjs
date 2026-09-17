// Verificación de la página de Analítica cableada a datos reales.
//
// Contrato que se comprueba:
//   1. No queda ninguna cifra simulada del panel genérico (visitantes, Google,
//      tailadmin, Desktop/Mobile/Tablet, Direct/Referral...).
//   2. Los KPIs del rango coinciden con los desgloses de canal, modalidad y pago
//      (controles cruzados: si un desglose y el KPI no cuadran, algo miente).
//   3. El periodo manda: cambiar de 7 a 30 días cambia el número de columnas.
//   4. La vista lista cuenta lo mismo que el KPI del periodo.
//   5. Ningún paso lanza una excepción de runtime.
//
// Uso: CDP_BASE=http://127.0.0.1:9333 node verify.mjs
import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://localhost:4173";
const OUT = "C:/Users/Jessy/Documents/GitHub/StockFlow/outputs/verify-analitica/";
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
  height: 1100,
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
    await sleep(300);
  }
  throw new Error("Timeout waiting for: " + label);
};

const q = (v) => JSON.stringify(v);
const newExceptions = () =>
  cdp.events.filter(
    (e) =>
      e.method === "Runtime.exceptionThrown" &&
      !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e))
  ).length;

const shot = async (name) => {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(OUT + name, Buffer.from(data, "base64"));
};

// ── Helpers de UI ───────────────────────────────────────────────────────────

// Columnas dibujadas por gráfico, en orden de aparición en el DOM.
// Se filtran los lienzos sin barras (sparkline y donut) para que el índice 0 sea
// el gráfico de volumen y el 1 el apilado, sin depender del orden de montaje.
const columnasPorGrafico = () =>
  evaluate(
    [
      "(() => {",
      "  return [...document.querySelectorAll('.apexcharts-canvas')]",
      "    .map(c => c.querySelectorAll('.apexcharts-bar-area').length)",
      "    .filter(n => n > 0);",
      "})()",
    ].join("\n")
  );

// Lee un KpiCard por su título y devuelve { valor, pie }.
const leerKpi = (titulo) =>
  evaluate(
    [
      "(() => {",
      "  const objetivo = " + q(titulo) + ";",
      "  const span = [...document.querySelectorAll('main span')]",
      "    .find(s => s.textContent.trim() === objetivo);",
      "  if (!span) return null;",
      "  const card = span.parentElement;",
      "  const partes = [...card.querySelectorAll('span')].map(s => s.textContent.trim());",
      "  return { valor: partes[1], pie: partes[2] };",
      "})()",
    ].join("\n")
  );

// Totales de una tarjeta de desglose: lee las filas "Etiqueta", "N · P%".
// La tarjeta se alcanza desde su propio h2 (`div.rounded-2xl`), no desde el
// envoltorio del título: `closest('div')` devolvía el bloque del encabezado y la
// lectura salía vacía, que es exactamente el fallo que este lector debe detectar.
const leerDesglose = (titulo) =>
  evaluate(
    [
      "(() => {",
      "  const objetivo = " + q(titulo) + ";",
      "  const h = [...document.querySelectorAll('main h2')].find(e => e.textContent.trim() === objetivo);",
      "  if (!h) return null;",
      "  const card = h.closest('div.rounded-2xl');",
      "  if (!card) return null;",
      "  return [...card.querySelectorAll('div.mt-4 > div')].map(f => {",
      "    const spans = [...f.querySelectorAll('span')].map(s => s.textContent.trim());",
      "    const etiqueta = spans[0];",
      "    const dato = spans[spans.length - 1];",
      "    const m = dato.match(/^([0-9.]+) . ([0-9]+)%$/);",
      "    return { etiqueta, total: m ? Number(m[1].replace(/[.]/g, '')) : null, cuota: m ? Number(m[2]) : null };",
      "  });",
      "})()",
    ].join("\n")
  );

// Leyenda del gráfico apilado: "Etiqueta", "(N)".
const leerLeyendaEstados = () =>
  evaluate(
    [
      "(() => {",
      "  const out = [];",
      "  for (const d of document.querySelectorAll('main div.flex-wrap > div.flex')) {",
      "    const s = [...d.querySelectorAll('span')].map(x => x.textContent.trim());",
      "    if (s.length >= 3 && /^[(][0-9]+[)]$/.test(s[2])) out.push({ estado: s[1], total: Number(s[2].slice(1, -1)) });",
      "  }",
      "  return out;",
      "})()",
    ].join("\n")
  );

// Leyenda del donut de pago: "Pagado · 3 (43%)".
const leerLeyendaPago = () =>
  evaluate(
    [
      "(() => {",
      "  const out = [];",
      "  for (const span of document.querySelectorAll('main span')) {",
      "    const m = span.textContent.trim().match(/^(Pagado|Pendiente) . ([0-9.]+) [(]([0-9]+)%[)]$/);",
      "    if (m) out.push({ etiqueta: m[1], total: Number(m[2].replace(/[.]/g, '')), cuota: Number(m[3]) });",
      "  }",
      "  return out;",
      "})()",
    ].join("\n")
  );

const pulsarPildora = (label) =>
  evaluate(
    [
      "(() => {",
      "  const objetivo = " + q(label) + ";",
      "  const b = [...document.querySelectorAll('main button')]",
      "    .find(x => x.textContent.trim() === objetivo && x.hasAttribute('aria-pressed'));",
      "  if (!b) return false;",
      "  b.click();",
      "  return true;",
      "})()",
    ].join("\n")
  );

const irAVista = (label) =>
  evaluate(
    [
      "(() => {",
      "  const objetivo = " + q(label) + ";",
      "  const b = [...document.querySelectorAll('main button[role=tab]')]",
      "    .find(x => x.textContent.trim() === objetivo);",
      "  if (!b) return false;",
      "  b.click();",
      "  return true;",
      "})()",
    ].join("\n")
  );

// ── Montaje ─────────────────────────────────────────────────────────────────

const SESSION = {
  modulos: ["pedidos"],
  tipoSesion: "administrador",
  operadorSimuladoId: null,
  preSimulacion: null,
};

console.log("── Fase 0 · sesión y ruta ──────────────────────────────────────────");
await cdp.send("Page.navigate", { url: APP + "/" });
await waitFor("!!document.body", "body inicial");
await evaluate('localStorage.setItem("necto.session", ' + q(JSON.stringify(SESSION)) + ")");
await cdp.send("Page.navigate", { url: APP + "/pedidos/analitica" });
await waitFor('!!document.querySelector("h1")', "h1 montado");
await sleep(2000);
check("estoy en /pedidos/analitica", (await evaluate("location.pathname")) === "/pedidos/analitica");

// ── Fase 1 · no queda nada simulado ─────────────────────────────────────────

console.log("\n── Fase 1 · ausencia de datos simulados ───────────────────────────");
const patronFalso =
  "Visitantes|Desktop|Mobile|Tablet|Google|Facebook|Threads|tailadmin|Referral|Organic Search|Social|Usuarios activos|4[.]7K|22[.]1K|Sesiones por dispositivo|Páginas principales|Canales principales|Canales de adquisición";
const falso = await evaluate(
  "new RegExp(" + q(patronFalso) + ").test(document.body.innerText)"
);
check("el DOM no contiene ninguna cifra del panel genérico", falso === false, "encontrado=" + falso);

const titulos = await evaluate(
  "[...document.querySelectorAll('main h2')].map(e => e.textContent.trim())"
);
const esperados = [
  "Pedidos por canal",
  "Modalidades de entrega",
  "Pedidos en curso",
  "Pedidos por estado",
  "Estado de pago",
];
check(
  "las 5 tarjetas de bloque llevan títulos del dominio de pedidos",
  esperados.every((t) => titulos.includes(t)),
  JSON.stringify(titulos)
);

// ── Fase 2 · periodo por defecto: 7 días ────────────────────────────────────

console.log("\n── Fase 2 · periodo 7 días ────────────────────────────────────────");
const kpiPedidos = await leerKpi("Pedidos del periodo");
const total = Number(String(kpiPedidos.valor).replace(/[.]/g, ""));
check("el KPI 'Pedidos del periodo' es un número positivo", Number.isFinite(total) && total > 0, JSON.stringify(kpiPedidos));

const cols7 = await columnasPorGrafico();
check("el gráfico de volumen dibuja 7 columnas (una por día)", cols7[0] === 7, JSON.stringify(cols7));
check(
  "el gráfico apilado dibuja 7 días x estados presentes",
  cols7[1] === 7 * (await leerLeyendaEstados()).length,
  JSON.stringify(cols7)
);

// Controles cruzados: cada desglose tiene que cuadrar con el KPI del periodo.
const canal = await leerDesglose("Pedidos por canal");
const sumaCanal = canal.reduce((s, f) => s + (f.total || 0), 0);
check("los canales suman el total del periodo", sumaCanal === total, sumaCanal + " vs " + total);
check(
  "las cuotas de canal suman 100%",
  canal.reduce((s, f) => s + (f.cuota || 0), 0) === 100,
  JSON.stringify(canal)
);

const modalidad = await leerDesglose("Modalidades de entrega");
const sumaModalidad = modalidad.reduce((s, f) => s + (f.total || 0), 0);
check("las modalidades suman el total del periodo", sumaModalidad === total, sumaModalidad + " vs " + total);

const estados = await leerLeyendaEstados();
const sumaEstados = estados.reduce((s, e) => s + e.total, 0);
check(
  "los estados del gráfico apilado suman el total del periodo",
  sumaEstados === total,
  sumaEstados + " vs " + total
);

const pago = await leerLeyendaPago();
const sumaPago = pago.reduce((s, p) => s + p.total, 0);
check("pagado + pendiente suman el total del periodo", sumaPago === total, sumaPago + " vs " + total);
check(
  "las cuotas de pago suman 100%",
  pago.reduce((s, p) => s + p.cuota, 0) === 100,
  JSON.stringify(pago)
);

// El título del gráfico apilado no debe prometer más de lo que dibuja.
const notaTodo = await evaluate(
  "document.body.innerText.includes('gráficos: últimos 30 días')"
);
check("en un periodo con ventana no se añade la nota de acotado", notaTodo === false, "nota=" + notaTodo);

const exFase2 = newExceptions();
check("la fase no lanzó excepciones", exFase2 === 0, "excepciones=" + exFase2);
await shot("01-metricas-7d.png");

// ── Fase 3 · el periodo manda ───────────────────────────────────────────────

console.log("\n── Fase 3 · el periodo manda (7 → 30 días → todo) ─────────────────");
check("pulso la píldora '30 días'", (await pulsarPildora("30 días")) === true);
await sleep(1800);
const cols30 = await columnasPorGrafico();
check("con 30 días el gráfico de volumen dibuja 30 columnas", cols30[0] === 30, JSON.stringify(cols30));
check("las columnas cambian respecto a 7 días", cols30[0] !== cols7[0], cols7[0] + " -> " + cols30[0]);
await shot("02-metricas-30d.png");

check("pulso la píldora 'Todo'", (await pulsarPildora("Todo")) === true);
await sleep(1800);
const notaTodoOn = await evaluate(
  "document.body.innerText.includes('gráficos: últimos 30 días')"
);
check(
  "con 'Todo' se declara que los gráficos se acotan a 30 días",
  notaTodoOn === true,
  "nota=" + notaTodoOn
);
const kpiTodo = await leerKpi("Pedidos del periodo");
check(
  "con 'Todo' el KPI abarca más que la ventana de 30 días o la iguala",
  Number(String(kpiTodo.valor).replace(/[.]/g, "")) >= total,
  JSON.stringify(kpiTodo)
);
await shot("03-metricas-todo.png");

const exFase3 = newExceptions();
check("la fase no lanzó excepciones", exFase3 === 0, "excepciones=" + exFase3);

// ── Fase 4 · la vista lista cuenta lo mismo ─────────────────────────────────

console.log("\n── Fase 4 · control cruzado con la vista lista ────────────────────");
check("pulso 'Vista Lista'", (await irAVista("Vista Lista")) === true);
await waitFor("!!document.querySelector('main tbody tr')", "filas de la tabla");
await sleep(600);

const resumen = await evaluate(
  [
    "(() => {",
    "  const m = document.body.innerText.match(/([0-9]+) de ([0-9]+) pedidos/);",
    "  return {",
    "    mostrados: m ? Number(m[1]) : null,",
    "    total: m ? Number(m[2]) : null,",
    "    filas: document.querySelectorAll('main tbody tr').length,",
    "  };",
    "})()",
  ].join("\n")
);
check(
  "la tabla muestra tantas filas como pedidos declara el resumen",
  resumen.mostrados === resumen.filas,
  JSON.stringify(resumen)
);
check(
  "la vista lista y el KPI del periodo cuentan lo mismo",
  resumen.total === Number(String(kpiTodo.valor).replace(/[.]/g, "")),
  JSON.stringify(resumen) + " vs KPI " + kpiTodo.valor
);
await shot("04-vista-lista.png");

const exFase4 = newExceptions();
check("la fase no lanzó excepciones", exFase4 === 0, "excepciones=" + exFase4);

console.log("\n── Resultado ──────────────────────────────────────────────────────");
console.log(failures === 0 ? "TODO OK (" + 0 + " fallos)" : "FALLOS: " + failures);
console.log("RUNTIME ERRORS (total):", newExceptions());

cdp.close();
process.exit(failures === 0 ? 0 : 1);
