import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://127.0.0.1:6020";
const OUT = "./artifacts/";
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
  width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false,
});

const evaluate = async (expression, byValue = true) => {
  const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: byValue, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return byValue ? r.result.value : r.result;
};

const waitFor = async (expression, label, timeoutMs = 25000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { if (await evaluate(expression)) return true; } catch {}
    await sleep(300);
  }
  throw new Error(`Timeout waiting for: ${label}`);
};

const shot = async (name) => {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(OUT + name, Buffer.from(data, "base64"));
};

let passed = 0, failed = 0;
const results = [];
const check = (label, cond, detail = "") => {
  if (cond) { passed++; results.push(`  OK   ${label}`); }
  else { failed++; results.push(`  FAIL ${label}  ${detail}`); }
};

const newExceptions = () =>
  cdp.events.filter(
    (e) => e.method === "Runtime.exceptionThrown" &&
      !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e))
  ).length;

// Helpers para no pelear con el escapado de las plantillas.
//
// IMPORTANTE: no envolver la fuente en JSON.stringify. `Runtime.evaluate`
// devuelve tal cual una expresión que resulte ser un literal de cadena, sin
// reevaluarla — así que `("(() => 42)()")` da la cadena, no 42. Hay que pasar
// el IIFE desnudo.
//
// Tampoco se usan plantillas con `${...}` ni `\r\n` / `\d` / `\uFEFF` literales
// dentro de la expresión: los puntos de código se construyen con
// `String.fromCharCode` y los valores con concatenación.
const CODE_CR = 0x0d;
const CODE_LF = 0x0a;
const CODE_BOM = 0xfeff;
const CRLF = String.fromCharCode(CODE_CR, CODE_LF);

// Devuelve el valor de un KPI leyendo la tarjeta cuyo título coincide.
const leerKpi = async (titulo) => {
  await evaluate("window.__kpiTitulo = " + JSON.stringify(titulo));
  return evaluate([
    "(() => {",
    "  const titulo = window.__kpiTitulo;",
    "  const cards = [...document.querySelectorAll('div')];",
    "  const c = cards.find(d => d.querySelector(':scope > span')?.textContent.trim() === titulo);",
    "  if (!c) return null;",
    "  const spans = [...c.querySelectorAll('span')].map(s => s.textContent.trim());",
    "  const big = spans.find(s => /^[0-9.,$ ]+$/.test(s) && s !== titulo);",
    "  return big === undefined ? null : big;",
    "})()",
  ].join("\n"));
};

// Lee las etiquetas del eje X del gráfico (señal observable de la ventana).
const leerEjeX = () =>
  evaluate([
    "(() => {",
    "  if (!document.querySelector('.apexcharts-canvas')) return null;",
    "  const cats = [...document.querySelectorAll('.apexcharts-xaxis-texts-g text')]",
    "    .map(t => t.textContent.trim());",
    "  return { n: cats.length, primera: cats[0] || '', ultima: cats[cats.length - 1] || '' };",
    "})()",
  ].join("\n"));

// Abre el desplegable de periodo y elige la opción indicada.
const abrirPeriodo = async (etiqueta) => {
  await evaluate(
    "(() => { const t = document.querySelector('.dropdown-toggle'); if (t) t.click(); return true; })()"
  );
  await sleep(400);
  await evaluate([
    "(() => {",
    "  const panel = document.querySelector('div[role=\"listbox\"][aria-label=\"Periodo\"]');",
    "  if (!panel) return false;",
    "  const objetivo = " + JSON.stringify(etiqueta) + ";",
    "  const btn = [...panel.querySelectorAll('button')].find(b => b.textContent.includes(objetivo));",
    "  if (!btn) return false;",
    "  btn.click();",
    "  return true;",
    "})()",
  ].join("\n"));
  await sleep(700);
};

console.log("=== Analítica · verificación de UI ===\n");

// ─── Fase 0: cargar la app ──────────────────────────────────────────────────
await cdp.send("Page.navigate", { url: `${APP}/` });
await sleep(1500);
// Sembrar sesión admin para entrar al shell sin pasar por /login.
await evaluate(`(() => {
  const mods = ["pedidos","analitica","conversaciones","tableros"];
  localStorage.setItem("necto.session", JSON.stringify({
    autenticado: true, tipoSesion: "administrador", operadorId: "op-admin",
    rolId: "admin_tienda", capacidades: [], modulos: mods
  }));
  return true;
})()`);
await cdp.send("Page.navigate", { url: `${APP}/pedidos/analitica` });

await waitFor(
  `!!document.querySelector('h1') || location.pathname.includes('login')`,
  "el encabezado de la página (o redirect a login)"
);

const where = await evaluate(`location.pathname + location.search`);
console.log(`  ruta actual: ${where}`);
check("estoy en /pedidos/analitica", where.includes("/pedidos/analitica"), `ruta=${where}`);

// ═══ Fase 1: KPIs vienen del store (no literales fabricados) ════════════════
console.log("\n── Fase 1 · KPIs desde el store ──");
const before1 = newExceptions();

const kpis = await evaluate(`(() => {
  const titles = ["Total Pedidos","Ticket Promedio","Tasa de Cancelación","Ingresos por Ventas"];
  const cards = [...document.querySelectorAll("div")].filter(d => {
    const t = d.querySelector(":scope > span");
    return t && titles.includes(t.textContent.trim());
  });
  return cards.map(c => {
    const spans = [...c.querySelectorAll(":scope > span")];
    const val = [...c.querySelectorAll("span")].map(s=>s.textContent.trim());
    return { title: c.querySelector(":scope > span").textContent.trim(), all: val };
  });
})()`);
check("se renderizan 4 tarjetas KPI", kpis.length === 4, `encontradas=${kpis.length}`);

const bodyText = await evaluate(`document.querySelector("h1").closest("div").parentElement.parentElement.textContent`);
check("aparece 'Total Pedidos'", bodyText.includes("Total Pedidos"));
check("aparece 'Ticket Promedio'", bodyText.includes("Ticket Promedio"));
check("aparece 'Tasa de Cancelación' (reemplaza Cart Abandonment)", bodyText.includes("Tasa de Cancelación"));
check("NO aparece 'Cart Abandonment'", !bodyText.includes("Cart Abandonment"));
check("NO aparece 'Profit Margin'", !bodyText.includes("Profit Margin"));
check("NO aparece 'Units Sold'", !bodyText.includes("Units Sold"));
check("NO aparece 'Sales by Region'", !bodyText.includes("Sales by Region"));
check("NO aparece 'Traffic Sources'", !bodyText.includes("Traffic Sources"));
check("NO aparece 'Sessions'", !bodyText.includes("Sessions"));
check("NO aparece 'Marketing Spend'", !bodyText.includes("Marketing Spend"));
check("NO aparece 'Redondo Brand' (marca inventada)", !bodyText.includes("Redondo Brand"));
check("NO aparece 'Last 7 days' (pill inerte)", !bodyText.includes("Last 7 days"));

const after1 = newExceptions();
check("[Fase 1] renderiza sin lanzar excepciones", after1 === before1, `antes=${before1} despues=${after1}`);
await shot("01-metricas.png");

// ═══ Fase 2: el selector de periodo es funcional ═══════════════════════════
console.log("\n── Fase 2 · filtro de periodo funcional ──");
const before2 = newExceptions();

const triggerSel = `document.querySelector('.dropdown-toggle')`;
const periodoSel = `${triggerSel} ? ${triggerSel}.textContent.trim() : null`;

check("el trigger dice 'Últimos 7 días'", (await evaluate(periodoSel))?.includes("Últimos 7 días"),
  `texto=${await evaluate(periodoSel)}`);

// Leer el valor de un KPI antes de cambiar el periodo.
const total7 = await leerKpi("Total Pedidos");

// Abrir el dropdown y elegir "Todo el historial"
await evaluate(`${triggerSel}.click()`);
await sleep(400);
const abierto = await evaluate(`(() => {
  const panel = document.querySelector('div[role="listbox"][aria-label="Periodo"]');
  return panel ? [...panel.querySelectorAll("button")].map(b=>b.textContent.trim()) : null;
})()`);
check("el desplegable se abre con 3 opciones", Array.isArray(abierto) && abierto.length === 3,
  `opciones=${JSON.stringify(abierto)}`);
check("las opciones son 7d / 30d / todo",
  JSON.stringify(abierto).includes("Últimos 7 días") &&
  JSON.stringify(abierto).includes("Últimos 30 días") &&
  JSON.stringify(abierto).includes("Todo el historial"), JSON.stringify(abierto));

// Clic en "Todo el historial"
await evaluate(`(() => {
  const panel = document.querySelector('div[role="listbox"][aria-label="Periodo"]');
  const btn = [...panel.querySelectorAll("button")].find(b => b.textContent.includes("Todo el historial"));
  btn.click(); return true;
})()`);
await sleep(500);

const trasCambio = await evaluate(periodoSel);
check("el trigger pasa a 'Todo el historial'", trasCambio?.includes("Todo el historial"), `texto=${trasCambio}`);

const totalTodo = await leerKpi("Total Pedidos");
check("cambiar el periodo no rompe 'Total Pedidos'",
  typeof totalTodo === "string" && /^\d+$/.test(totalTodo), `todo=${totalTodo}`);
check("'Total Pedidos' con todo el historial = 7 (el seed)", totalTodo === "7", `valor=${totalTodo}`);

// ── Discriminar de verdad entre ventanas ───────────────────────────────────
// Los 7 pedidos del seed son todos de hace minutos, así que caen dentro de 7d,
// 30d y todo por igual: comparar el conteo de pedidos NO discrimina. Lo que sí
// depende de la ventana es la SERIE del gráfico, cuya longitud es el número de
// días del periodo (7 / 30 / tramo completo del historial).
//
// NOTA: el store NO persiste pedidos (sólo `pedidosConfig` va a localStorage),
// así que no se puede sembrar un pedido viejo desde fuera. Se verifica la
// ventana por el eje temporal del gráfico, que es la señal observable real.
await abrirPeriodo("Últimos 7 días");
const eje7 = await leerEjeX();
await abrirPeriodo("Últimos 30 días");
const eje30 = await leerEjeX();

check("la serie del gráfico en 7d tiene 7 puntos",
  eje7 && eje7.n === 7, `puntos=${eje7 && eje7.n}`);
check("la serie del gráfico en 30d tiene 30 puntos",
  eje30 && eje30.n === 30, `puntos=${eje30 && eje30.n}`);
check("el filtro de periodo RECALCULA el gráfico (7d=7 ≠ 30d=30)",
  eje7 && eje30 && eje7.n !== eje30.n, `7d=${eje7 && eje7.n} 30d=${eje30 && eje30.n}`);
check("el eje del gráfico se reetiqueta con el periodo elegido",
  eje7 && eje30 && eje7.primera !== eje30.primera,
  `7d[${eje7 && eje7.primera}..${eje7 && eje7.ultima}] 30d[${eje30 && eje30.primera}..${eje30 && eje30.ultima}]`);

await shot("02b-periodo-30d.png");

const after2 = newExceptions();
check("[Fase 2] sin excepciones", after2 === before2, `antes=${before2} despues=${after2}`);
await shot("02-periodo-todo.png");

// ═══ Fase 3: conmutador de vista + tabla ═══════════════════════════════════
console.log("\n── Fase 3 · vista lista + tabla ──");
const before3 = newExceptions();

await evaluate(`(() => {
  const b = [...document.querySelectorAll('button[role="tab"]')].find(x=>x.textContent.includes("Vista Lista"));
  b.click(); return true;
})()`);
await sleep(600);

const tabInfo = await evaluate(`(() => {
  const t = document.querySelector("table");
  if (!t) return null;
  const heads = [...t.querySelectorAll("thead th")].map(h=>h.textContent.replace(/[▲▼◇]/g,"").trim());
  const rows = t.querySelectorAll("tbody tr").length;
  return { heads, rows };
})()`);
check("se renderiza una tabla", tabInfo !== null);
check("la tabla tiene las 8 columnas pedidas",
  tabInfo && JSON.stringify(tabInfo.heads) === JSON.stringify(
    ["ID Pedido","Cliente","Teléfono","Canal","Modalidad","Monto Total","Estado","Fecha"]),
  JSON.stringify(tabInfo?.heads));
check("la tabla muestra las 7 filas del seed", tabInfo?.rows === 7, `filas=${tabInfo?.rows}`);

// ¿El canal usa el vocabulario del store (WhatsApp / Mostrador)?
const canales = await evaluate(`(() => {
  const t = document.querySelector("table");
  return [...t.querySelectorAll("tbody tr")].map(r => r.children[3].textContent.trim());
})()`);
check("la columna Canal usa etiquetas del store", canales.every(c => c === "WhatsApp" || c === "Mostrador"),
  JSON.stringify(canales));

const montos = await evaluate(`(() => {
  const t = document.querySelector("table");
  return [...t.querySelectorAll("tbody tr")].map(r => r.children[5].textContent.trim());
})()`);
check("la columna Monto Total trae importes reales", montos.every(m => /^\$[\d.]+$/.test(m)), JSON.stringify(montos));

const after3 = newExceptions();
check("[Fase 3] sin excepciones", after3 === before3, `antes=${before3} despues=${after3}`);
await shot("03-vista-lista.png");

// ═══ Fase 4: búsqueda + filtro de estado ═══════════════════════════════════
console.log("\n── Fase 4 · búsqueda y filtro ──");
const before4 = newExceptions();

const filasAhora = `document.querySelectorAll("table tbody tr").length`;
const nAntes = await evaluate(filasAhora);

// Escribir en el buscador (React-controlled: usar el setter nativo).
await evaluate(`(() => {
  const el = document.querySelector('input[type="text"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(el, "zzzz-sin-resultados");
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
})()`);
await sleep(600);
const nBuscado = await evaluate(filasAhora);
const mensajeVacio = await evaluate(`document.body.textContent.includes("No hay pedidos que coincidan")`);
check("la búsqueda filtra la tabla", nBuscado < nAntes, `antes=${nAntes} despues=${nBuscado}`);
check("con 0 resultados muestra el estado vacío", mensajeVacio);

// Limpiar
await evaluate(`(() => {
  const el = document.querySelector('input[type="text"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(el, "");
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
})()`);
await sleep(500);
const nLimpio = await evaluate(filasAhora);
check("al limpiar la búsqueda vuelven las 7 filas", nLimpio === 7, `filas=${nLimpio}`);

// Ordenar por cliente
await evaluate(`(() => {
  const t = document.querySelector("table");
  const btns = [...t.querySelectorAll("thead th button")];
  const b = btns.find(x => x.textContent.includes("Cliente"));
  b.click(); return true;
})()`);
await sleep(500);
const clientes = await evaluate(`(() => {
  const t = document.querySelector("table");
  return [...t.querySelectorAll("tbody tr")].map(r => r.children[1].textContent.trim());
})()`);
const ordenados = [...clientes].sort((a, b) => a.localeCompare(b));
check("al pulsar 'Cliente' la tabla se ordena", JSON.stringify(clientes) === JSON.stringify(ordenados),
  JSON.stringify(clientes));

const after4 = newExceptions();
check("[Fase 4] sin excepciones", after4 === before4, `antes=${before4} despues=${after4}`);
await shot("04-busqueda-orden.png");

// ═══ Fase 5: exportación CSV ═══════════════════════════════════════════════
console.log("\n── Fase 5 · exportación CSV ──");
const before5 = newExceptions();

const botonCsv = await evaluate(`(() => {
  const b = [...document.querySelectorAll("button")].find(x => x.textContent.includes("Descargar CSV"));
  return b ? { texto: b.textContent.trim(), deshabilitado: b.disabled } : null;
})()`);
check("existe el botón 'Descargar CSV'", botonCsv !== null, JSON.stringify(botonCsv));
check("el botón está habilitado", botonCsv && botonCsv.deshabilitado === false);

// Interceptar la descarga: capturamos el Blob vía URL.createObjectURL.
const csvCapturado = await evaluate(`(() => {
  window.__csv = null;
  const origCreate = URL.createObjectURL;
  URL.createObjectURL = function (blob) {
    try {
      const fr = new FileReader();
      fr.onload = () => { window.__csv = fr.result; };
      fr.readAsText(blob);
    } catch (e) { window.__csv = "ERR:" + e.message; }
    return origCreate.call(URL, blob);
  };
  const b = [...document.querySelectorAll("button")].find(x => x.textContent.includes("Descargar CSV"));
  b.click();
  return true;
})()`);
await sleep(900);

const csv = await evaluate(`window.__csv`);
check("la exportación produce contenido CSV", typeof csv === "string" && csv.length > 0,
  `tipo=${typeof csv} len=${csv?.length}`);

// El BOM y el CRLF se comprueban con puntos de código, no con literales
// escapados, para no depender del escapado de la plantilla.
const csvSinBom =
  typeof csv === "string" && csv.charCodeAt(0) === CODE_BOM ? csv.slice(1) : (csv || "");
const lineasCsv = csvSinBom.split("\r\n");
const encabezadoEsperado = ["ID Pedido", "Cliente", "Teléfono", "Canal", "Modalidad", "Monto Total", "Estado", "Fecha"];

check("el CSV arranca con el encabezado de 8 columnas",
  typeof csv === "string" && lineasCsv[0] === encabezadoEsperado.join(","),
  JSON.stringify(csv?.slice(0, 140)));
check("el separador de línea es CRLF",
  typeof csv === "string" && csvSinBom.includes(String.fromCharCode(CODE_CR, CODE_LF)),
  `tieneCRLF=${typeof csv === "string" && csvSinBom.includes(String.fromCharCode(CODE_CR, CODE_LF))}`);

const filasDatos = lineasCsv.filter((l) => l.trim() !== "").length - 1;
check("el CSV tiene 7 filas de datos + encabezado",
  typeof csv === "string" && filasDatos === 7,
  `filasDatos=${filasDatos} lineas=${lineasCsv.length}`);
check("cada fila del CSV tiene 8 campos", typeof csv === "string" &&
  lineasCsv.slice(1).filter((l) => l.trim() !== "").every((l) => l.split(",").length >= 8),
  JSON.stringify(lineasCsv[1]?.slice(0, 120)));
check("el CSV incluye un canal del catálogo (WhatsApp)",
  typeof csv === "string" && csv.includes("WhatsApp"));

// Escapado: se invoca la utilidad REAL del bundle con un cliente que contiene
// coma y comillas. Si el escapado fallara, la coma interna partiría la fila.
// (No se puede sembrar un pedido así desde fuera: el store no persiste pedidos.)
const escapadoReal = await evaluate([
  "(async () => {",
  "  const mod = await import('/src/pages/pedidos/analitica.utils.ts');",
  "  const fila = [{",
  "    id: 'px', numero: 'P-X', cliente: 'Pérez, \"El Jefe\"', telefono: '+573001112233',",
  "    modalidad: 'domicilio', estado: 'confirmado', origen: 'whatsapp',",
  "    items: [{ nombre: 'Ítem', cantidad: 1, precio: 5000 }],",
  "    createdAt: '2026-09-17T12:00:00.000Z',",
  "  }];",
  "  const etiquetas = {",
  "    origenLabel: function () { return 'WhatsApp'; },",
  "    modalidadLabel: function () { return 'Domicilio'; },",
  "    estadoLabel: function () { return 'Confirmado'; },",
  "  };",
  "  const texto = mod.construirCsv(mod.CSV_ENCABEZADOS, mod.filasCsv(fila, etiquetas));",
  "  const sep = String.fromCharCode(13, 10);",
  "  const lineas = texto.split(sep).filter(function (l) { return l.trim() !== ''; });",
  "  return { linea: lineas[1] || '', total: lineas.length };",
  "})()",
].join("\n"));

check("la utilidad real entrecomilla y duplica comillas internas",
  typeof (escapadoReal && escapadoReal.linea) === "string" &&
  escapadoReal.linea.includes('"Pérez, ""El Jefe"""'),
  JSON.stringify(escapadoReal && escapadoReal.linea));
check("una fila con comas internas sigue siendo UNA sola fila",
  escapadoReal && escapadoReal.total === 2, `lineas=${escapadoReal && escapadoReal.total}`);

const after5 = newExceptions();
check("[Fase 5] sin excepciones", after5 === before5, `antes=${before5} despues=${after5}`);

// ═══ Fase 6: el nombre del archivo ═════════════════════════════════════════
console.log("\n── Fase 6 · nombre del archivo ──");
const nombreDescarga = await evaluate(`(() => {
  let capturado = null;
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { capturado = this.download; };
  const b = [...document.querySelectorAll("button")].find(x => x.textContent.includes("Descargar CSV"));
  b.click();
  HTMLAnchorElement.prototype.click = origClick;
  return capturado;
})()`);
// El nombre se valida construyendo la expresión regular con RegExp sobre una
// fuente sin escapar dentro de la plantilla (evita el doble escapado).
const PATRON_NOMBRE = /^stockflow-analitica-\d{4}-\d{2}-\d{2}\.csv$/;
check("el archivo se llama stockflow-analitica-YYYY-MM-DD.csv",
  PATRON_NOMBRE.test(nombreDescarga || ""),
  `nombre=${nombreDescarga}`);

// Y además: el nombre coincide con la fecha local de hoy.
const hoyYmdLocal = await evaluate([
  "(() => {",
  "  const d = new Date();",
  "  const pad = (n) => String(n).padStart(2, '0');",
  "  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());",
  "})()",
].join("\n"));
check("el nombre usa la fecha local de hoy",
  nombreDescarga === "stockflow-analitica-" + hoyYmdLocal + ".csv",
  `nombre=${nombreDescarga} hoy=${hoyYmdLocal}`);

// ═══ Fase 7: volver a métricas ═════════════════════════════════════════════
console.log("\n── Fase 7 · volver a métricas ──");
const before7 = newExceptions();
await evaluate(`(() => {
  const b = [...document.querySelectorAll('button[role="tab"]')].find(x=>x.textContent.includes("Métricas"));
  b.click(); return true;
})()`);
await sleep(600);
const hayTabla = await evaluate(`!!document.querySelector("table")`);
check("al volver a Métricas desaparece la tabla", hayTabla === false);
const hayChart = await evaluate(`!!document.querySelector(".apexcharts-canvas")`);
check("en Métricas se renderiza el gráfico", hayChart === true);
const after7 = newExceptions();
check("[Fase 7] sin excepciones", after7 === before7, `antes=${before7} despues=${after7}`);

// ═══ Informe ═══════════════════════════════════════════════════════════════
const errs = cdp.events.filter(
  (e) => e.method === "Runtime.exceptionThrown" || e.method === "Log.entryAdded"
);
console.log("\n=== RESULTADOS ===");
console.log(results.join("\n"));
console.log(`\nPASSED: ${passed}   FAILED: ${failed}`);
const realErrs = errs.filter((e) => !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e)));
console.log("RUNTIME ERRORS:", realErrs.length ? JSON.stringify(realErrs.slice(0, 5)) : "(none)");

cdp.close();
process.exit(failed === 0 ? 0 : 1);
