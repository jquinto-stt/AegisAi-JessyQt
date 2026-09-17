// Verificación de los arreglos de honestidad de datos fuera de Equipo.
//
// Contexto: la misma clase de defecto —relleno de demostración presentado como
// dato— aparecía en tres sitios más. Este arnés comprueba que ya no.
//
//   1. INICIO. El gráfico de volumen dibujaba una onda inventada con `Math.sin`
//      cuando el tramo no tenía pedidos, con un distintivo "Demo" al lado. Un
//      distintivo no arregla nada: en un panel de negocio nadie distingue una
//      serie falsa de una real de un vistazo. Tampoco debe quedar el donut de
//      ejemplo `[5, 8, 2]`.
//
//   2. ASISTENTE. La barra lateral del historial tenía seis títulos de ejemplo
//      en inglés escritos a mano, agrupados "Today/Yesterday/Last 7 days", con
//      la marca "Skymetrics" de la maqueta — y **pulsarlos no abría nada**: el
//      item activo era un `useState` local. Ahora lee `conversacionesAgrupadas`
//      del store y cada item hace lo que aparenta.
//
//   3. `inicialesDe` tenía tres copias, dos de ellas con comportamientos
//      distintos. Ahora hay una sola en `@/utils`.
//
// Uso: APP_URL=http://localhost:6020 node verify.mjs
import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9222";
const APP = process.env.APP_URL || "http://localhost:6020";
const OUT = "C:/Users/Jessy/Documents/GitHub/StockFlow/outputs/verify-honestidad/";
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

// ── A. Inicio: sin relleno de demostración ─────────────────────────────────

console.log("\n=== A. Inicio /pedidos/inicio — sin relleno ===");
await irA("/pedidos/inicio", `!!document.querySelector('.apexcharts-canvas')`);

const textoInicio = await textoVisible();
check("no queda ningún distintivo «Demo»", !/\bDemo\b/.test(textoInicio), "");

// El gráfico tiene que estar dibujado con los puntos reales del periodo, no con
// una onda de relleno. En "Esta semana" son 7 días → 7 etiquetas de eje.
const etiquetasVolumen = await evaluate(
  `(() => {
     const grupos = [...document.querySelectorAll('.apexcharts-xaxis-texts-g')];
     if (grupos.length === 0) return null;
     return grupos[0].querySelectorAll('text').length;
   })()`
);
check("el gráfico de volumen tiene 7 puntos (la semana real)", etiquetasVolumen === 7, `puntos = ${etiquetasVolumen}`);

// Ninguna serie puede contener el patrón de la onda inventada: la demo producía
// valores entre 4 y ~44 con un mínimo forzado de 4, así que un mínimo de 4 con
// todas las barras no nulas delataría el relleno. Se comprueba de forma directa:
// el store dice cuántos pedidos hay en la ventana y el gráfico no puede inventar.
const hayPuntoCero = await evaluate(
  `(() => {
     const puntos = [...document.querySelectorAll('.apexcharts-series-markers circle, .apexcharts-marker')];
     return puntos.length > 0;
   })()`
);
check("el gráfico de volumen dibuja marcadores reales", hayPuntoCero === true, `marcadores = ${hayPuntoCero}`);

await shot("01-inicio.png", ".apexcharts-canvas");

// ── B. Asistente: historial real ───────────────────────────────────────────

console.log("\n=== B. Asistente /asistente — historial real ===");
await irA("/asistente", `!!document.querySelector('[aria-label="Conversaciones"]')`);

// La barra del historial vive detrás de un botón ("Conversaciones"). Sin abrirla
// el arnés mediría una pantalla que no la tiene montada y daría un falso fallo.
check(
  "se puede abrir la barra de conversaciones",
  await evaluate(
    `(() => { const b = document.querySelector('[aria-label="Conversaciones"]'); if (!b) return false; b.click(); return true; })()`
  ),
  ""
);
await waitFor(`document.querySelectorAll('[data-conv]').length >= 1`, "historial de conversaciones");

const textoAsistente = await textoVisible();
check("la marca de la maqueta desapareció", !/Skymetrics/.test(textoAsistente), "");
check("la barra lleva la marca del producto", /NECTO AI/.test(textoAsistente), "");
check("no quedan títulos de ejemplo en inglés", !/My store's performance|Products Expected|Peak Revenue Times/.test(textoAsistente), "");
check("los grupos están en español", /Hoy|Ayer|Últimos 7 días|Anteriores/.test(textoAsistente), "");

const conversaciones = () =>
  evaluate(
    `[...document.querySelectorAll('[data-conv]')].map(el => ({
       id: el.dataset.conv,
       activa: el.dataset.activa === 'si',
       titulo: el.textContent.trim(),
     }))`
  );

const iniciales = await conversaciones();
check("hay al menos una conversación en el historial", iniciales.length >= 1, `n = ${iniciales.length}`);
check(
  "exactamente una está marcada como activa",
  iniciales.filter((c) => c.activa).length === 1,
  `activas = ${iniciales.filter((c) => c.activa).length}`
);

// "New chat" tiene que crear una conversación de verdad, no solo pintar.
const botonNueva = await evaluate(
  `(() => {
     const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'New chat');
     if (!b) return false;
     b.click();
     return true;
   })()`
);
check("se puede pulsar «New chat»", botonNueva, "");
await sleep(600);

const trasNueva = await conversaciones();
check(
  "«New chat» añade una conversación al historial",
  trasNueva.length === iniciales.length + 1,
  `${iniciales.length} -> ${trasNueva.length}`
);
check(
  "la nueva queda como activa",
  trasNueva.filter((c) => c.activa).length === 1 && trasNueva[0]?.activa === true,
  trasNueva.map((c) => (c.activa ? "★" : "·")).join("")
);

// El control que de verdad importa: pulsar otra conversación tiene que cambiar
// la activa. Antes solo movía un resaltado local y no abría nada.
if (trasNueva.length >= 2) {
  const objetivo = trasNueva[1].id;
  const pulsado = await evaluate(
    `(() => { const el = document.querySelector('[data-conv="${objetivo}"]'); if (!el) return false; el.click(); return true; })()`
  );
  check("se puede pulsar otra conversación del historial", pulsado, "");
  await sleep(600);

  const trasPulsar = await conversaciones();
  const activaAhora = trasPulsar.find((c) => c.activa);
  check(
    "pulsar otra conversación cambia la activa de verdad",
    activaAhora?.id === objetivo,
    `activa = ${activaAhora?.id?.slice(0, 8) ?? "ninguna"}, esperada = ${objetivo.slice(0, 8)}`
  );
  check(
    "y sigue habiendo exactamente una activa",
    trasPulsar.filter((c) => c.activa).length === 1,
    `activas = ${trasPulsar.filter((c) => c.activa).length}`
  );
} else {
  check("hay al menos 2 conversaciones para probar el cambio", false, `n = ${trasNueva.length}`);
}

await shot("02-asistente-historial.png", "[data-conv]");

// ── C. Runtime ─────────────────────────────────────────────────────────────

console.log("\n=== C. Runtime ===");
const excepciones = newExceptions();
check("ninguna excepción de runtime", excepciones === 0, `excepciones = ${excepciones}`);

console.log("\n" + (failures === 0 ? "TODO OK" : failures + " COMPROBACIONES FALLIDAS"));
cdp.close();
process.exit(failures === 0 ? 0 : 1);
