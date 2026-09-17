import { writeFileSync, mkdirSync, appendFileSync } from "node:fs";

// ═══════════════════════════════════════════════════════════════════════════
// verify-paneo.mjs — Paneo de entrada + esqueleto de carga de la tarjeta del
// Canvas del asistente (NECTO AI).
// ═══════════════════════════════════════════════════════════════════════════
//
// Fases:
//   1. Arranque: sesión sembrada + /asistente montado.
//   2. Pregunta 1 → la tarjeta entra con el paneo Y mostrando el esqueleto,
//      y al asentarse revela los datos.
//   3. Pregunta 2 → la tarjeta nueva vuelve a entrar con esqueleto (se repite).
//   4. prefers-reduced-motion: reduce → entra sin animación y sin esqueleto.
//
// El esqueleto se mide con un muestreador rAF en la página, no con un sleep: su
// ventana real es de cientos de ms y un sleep ciego la pierde.

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://localhost:4173";
const OUT = "./outputs/paneo-verify/";
mkdirSync(OUT, { recursive: true });

const LOG = OUT + "run.log";
writeFileSync(LOG, "");
const log = (s) => {
  appendFileSync(LOG, s + "\n");
  console.log(s);
};

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures += 1;
  log(`${ok ? "  OK  " : " FAIL "} ${name}${detail === undefined ? "" : "  → " + detail}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getPageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${CDP_BASE}/json/list`);
      const targets = await res.json();
      const page = targets.find(
        (t) => t.type === "page" && t.webSocketDebuggerUrl && !t.url.startsWith("devtools"),
      );
      if (page) return page;
    } catch {}
    await sleep(250);
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

const cdp = await connect((await getPageTarget()).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
await cdp.send("Page.enable");
await cdp.send("DOM.enable");
await cdp.send("Network.enable");
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
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

/** Poll lento, para estados que duran. */
const waitFor = async (expression, label, timeoutMs = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      if (await evaluate(expression)) return true;
    } catch {}
    await sleep(200);
  }
  throw new Error("Timeout esperando: " + label);
};

/**
 * Poll rápido (40 ms) para estados que duran ~420 ms. Con el poll de 200 ms el
 * esqueleto se puede escapar por completo entre dos muestras.
 */
const waitForFast = async (expression, label, timeoutMs = 6000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      if (await evaluate(expression)) return true;
    } catch {}
    await sleep(40);
  }
  return false;
};

const shot = async (name) => {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(OUT + name, Buffer.from(data, "base64"));
};

const q = (v) => JSON.stringify(v);
const expr = (...lines) => lines.join("\n");

const newExceptions = () =>
  cdp.events.filter(
    (e) =>
      e.method === "Runtime.exceptionThrown" &&
      !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e)),
  ).length;

const TARJETA = "aside.paneo-entrada";
const ESQUELETO = TARJETA + " .animate-pulse";

/** Lee el estado observable de la tarjeta y de su esqueleto. */
const leerTarjeta = () =>
  evaluate(
    expr(
      "(() => {",
      "  const a = document.querySelector(" + q(TARJETA) + ");",
      "  if (!a) return null;",
      "  const barras = [...a.querySelectorAll('.animate-pulse')];",
      "  const celdas = [...a.querySelectorAll('tbody td')];",
      "  const cs = getComputedStyle(a);",
      "  const csBarra = barras.length ? getComputedStyle(barras[0]) : null;",
      "  return {",
      "    anim: cs.animationName, dur: cs.animationDuration, fill: cs.animationFillMode,",
      "    barras: barras.length,",
      "    alturas: barras.slice(0, 4).map(b => Math.round(b.getBoundingClientRect().height)),",
      "    anchos: barras.slice(0, 4).map(b => Math.round(b.getBoundingClientRect().width)),",
      "    barraAnim: csBarra ? csBarra.animationName : null,",
      "    barraBg: csBarra ? csBarra.backgroundColor : null,",
      "    conTexto: celdas.filter(c => c.textContent.trim() !== '').length,",
      "  };",
      "})()",
    ),
  );

// ═══ FASE 1 — arranque ═════════════════════════════════════════════════════
log("\n── Fase 1 · arranque ──");
await cdp.send("Page.navigate", { url: APP + "/" });
await sleep(1500);

// La sesión se siembra DESPUÉS de tener un origen y ANTES de ir a la ruta
// protegida: /asistente está tras CapabilityGuard("assistant.use").
//
// Se borra `necto.assistant` a propósito: `AssistantStore` persiste el hilo en
// localStorage (ver `ASSISTANT_KEY` en assistant.store.ts) y el perfil de Chrome
// es el mismo entre ejecuciones, así que sin este borrado cada corrida arrastra
// la conversación de la anterior. Los checks son por-tarjeta y no se rompen,
// pero un arnés tiene que arrancar en un estado conocido, no en el que dejó la
// corrida previa.
await evaluate(
  expr(
    "(() => {",
    "  localStorage.removeItem(" + q("necto.assistant") + ");",
    "  localStorage.setItem(" +
      q("necto.session") +
      ", JSON.stringify({ modulos: [" +
      q("pedidos") +
      "], tipoSesion: " +
      q("administrador") +
      ", operadorSimuladoId: null, preSimulacion: null }));",
    "  return true;",
    "})()",
  ),
);

await cdp.send("Page.navigate", { url: APP + "/asistente" });
await waitFor(
  '!!document.querySelector(\'textarea[placeholder="¿Cómo puedo ayudarte?"]\')',
  "el composer del asistente",
);
check("la ruta /asistente monta el composer", true);
const pathOk = await evaluate("location.pathname");
check("estoy en /asistente (no redirigido)", pathOk === "/asistente", pathOk);

// Muestreador rAF del esqueleto: mide la ventana real, no una estimación.
//
// Mide además el desborde horizontal del documento. El paneo arranca 32px a la
// derecha de una tarjeta que ya está pegada al borde, así que sin recorte la
// página gana 4px de ancho durante la entrada y la barra de scroll horizontal
// parpadea. Es un defecto de 3 fotogramas: solo se ve muestreando por fotograma.
await evaluate(
  expr(
    "(() => {",
    "  window.__pulse = { visto: false, desde: null, hasta: null, muestras: 0, conPulse: 0, ovPico: 0, ovFrames: 0 };",
    "  const tick = () => {",
    "    const p = window.__pulse;",
    "    p.muestras++;",
    "    const de = document.documentElement;",
    "    const ov = de.scrollWidth - de.clientWidth;",
    "    if (ov > 0) { p.ovFrames++; if (ov > p.ovPico) p.ovPico = ov; }",
    "    if (document.querySelector(" + q(ESQUELETO) + ")) {",
    "      p.conPulse++;",
    "      p.visto = true;",
    "      const t = performance.now();",
    "      if (p.desde === null) p.desde = t;",
    "      p.hasta = t;",
    "    }",
    "    requestAnimationFrame(tick);",
    "  };",
    "  requestAnimationFrame(tick);",
    "  return true;",
    "})()",
  ),
);

const enviar = async (texto) => {
  // React ignora `el.value = x`: hay que pasar por el setter del prototipo.
  await evaluate(
    expr(
      "(() => {",
      "  const ta = document.querySelector('textarea[placeholder=\"¿Cómo puedo ayudarte?\"]');",
      "  if (!ta) return false;",
      "  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;",
      "  setter.call(ta, " + q(texto) + ");",
      "  ta.dispatchEvent(new Event('input', { bubbles: true }));",
      "  return true;",
      "})()",
    ),
  );
  await sleep(150);
  return evaluate(
    '(() => { const b = document.querySelector(\'button[aria-label="Enviar"]\'); if (!b || b.disabled) return false; b.click(); return true; })()',
  );
};

const PROMPT = "Genera una hoja de cálculo con el top 10 de productos";

/**
 * Señal de "el asistente ya no está pensando".
 *
 * NO sirve el botón de enviar: queda `disabled` también cuando el textarea está
 * vacío, y el Composer lo vacía al enviar. El único elemento que refleja
 * `pensando` sin ambigüedad es el `disabled` del propio textarea.
 */
const COMPOSER_LISTO =
  "(() => { const ta = document.querySelector('textarea[placeholder=\"¿Cómo puedo ayudarte?\"]'); return !!ta && !ta.disabled; })()";

const resetMuestreo = () =>
  evaluate(
    "(() => { window.__pulse = { visto:false, desde:null, hasta:null, muestras:0, conPulse:0, ovPico:0, ovFrames:0 }; return true; })()",
  );

// ═══ FASE 2 — pregunta 1: entrada con paneo + esqueleto ════════════════════
log("\n── Fase 2 · pregunta 1: entrada de la tarjeta ──");
const exAntes = newExceptions();
await resetMuestreo();
await enviar(PROMPT);

await waitFor("!!document.querySelector(" + q(TARJETA) + ")", "la tarjeta del Canvas");
check("la tarjeta del Canvas aparece al enviar la pregunta", true);

// La ventana del esqueleto es ~420 ms: hay que mirarla con poll rápido.
const esqueletoEnEntrada = await waitForFast(
  "!!document.querySelector(" + q(ESQUELETO) + ")",
  "el esqueleto de entrada",
);
check("la tarjeta entra MOSTRANDO el esqueleto de carga", esqueletoEnEntrada);

const enEntrada = await leerTarjeta();
log("  durante la entrada: " + JSON.stringify(enEntrada));
check(
  "el paneo de entrada está aplicado",
  enEntrada && enEntrada.anim === "paneo-entrada",
  enEntrada && enEntrada.anim,
);
check("la duración del paneo es 0.42s", enEntrada && enEntrada.dur === "0.42s", enEntrada && enEntrada.dur);
check(
  "el fill-mode es backwards (no deja transform vivo)",
  enEntrada && enEntrada.fill === "backwards",
  enEntrada && enEntrada.fill,
);
check(
  "hay varias barras de esqueleto (no una)",
  enEntrada && enEntrada.barras > 5,
  enEntrada && enEntrada.barras + " barras",
);
check(
  "las barras pulsan de verdad (animationName=pulse)",
  enEntrada && enEntrada.barraAnim === "pulse",
  enEntrada && enEntrada.barraAnim,
);
check(
  "las barras tienen tamaño real (no 0x0)",
  enEntrada && enEntrada.alturas.length > 0 && enEntrada.alturas.every((h) => h > 0) && enEntrada.anchos.every((w) => w > 0),
  enEntrada && JSON.stringify({ alturas: enEntrada.alturas, anchos: enEntrada.anchos }),
);
await shot("fase2-entrada-con-esqueleto.png");

// Al asentarse el paneo, los datos sustituyen al esqueleto.
await waitFor(
  "(() => { const a = document.querySelector(" + q(TARJETA) + "); return !!a && a.querySelectorAll('.animate-pulse').length === 0; })()",
  "el esqueleto sustituido por datos",
);
const trasRevelar = await leerTarjeta();
log("  tras revelar: " + JSON.stringify(trasRevelar));
check("tras el paneo no queda ningún esqueleto", trasRevelar && trasRevelar.barras === 0);
check(
  "la hoja revela celdas con contenido",
  trasRevelar && trasRevelar.conTexto > 5,
  trasRevelar && trasRevelar.conTexto + " celdas con texto",
);
const pulse1 = JSON.parse(await evaluate("JSON.stringify(window.__pulse)"));
const ventana1 = pulse1.desde !== null && pulse1.hasta !== null ? Math.round(pulse1.hasta - pulse1.desde) : 0;
check("la ventana del esqueleto es visible (>200 ms)", ventana1 > 200, ventana1 + " ms de " + pulse1.muestras + " fotogramas");
check(
  "el paneo NO desborda la página (sin parpadeo de scroll horizontal)",
  pulse1.ovFrames === 0,
  pulse1.ovFrames + " fotogramas con desborde, pico " + pulse1.ovPico + "px de " + pulse1.muestras,
);
await shot("fase2-tarjeta-con-datos.png");

// ═══ FASE 3 — pregunta 2: el efecto se repite ══════════════════════════════
log("\n── Fase 3 · pregunta 2: el efecto se repite ──");
await waitFor(COMPOSER_LISTO, "el composer habilitado de nuevo");

const idAntes = await evaluate(
  "(() => { const a = document.querySelector(" + q(TARJETA) + "); if (!a) return null; a.dataset.sonda = 'antes'; return true; })()",
);
check("se marcó la tarjeta anterior para detectar el remontaje", idAntes === true);

await resetMuestreo();
await enviar(PROMPT);
const esqueleto2 = await waitForFast(
  "!!document.querySelector(" + q(ESQUELETO) + ")",
  "el esqueleto de la segunda tarjeta",
);
check("la segunda pregunta vuelve a mostrar el esqueleto", esqueleto2);

// La sonda desaparece ⟹ React montó un nodo NUEVO (la `key` fuerza remontaje),
// que es lo que hace que la animación se reproduzca.
const sonda = await evaluate(
  "(() => { const a = document.querySelector(" + q(TARJETA) + "); return a ? a.dataset.sonda ?? null : null; })()",
);
check(
  "la tarjeta se REMONTA (nodo nuevo), no se reutiliza",
  sonda === null,
  sonda === null ? "sonda ausente ⟹ nodo nuevo" : "sonda presente ⟹ nodo reutilizado",
);
const anim2 = await leerTarjeta();
check(
  "la segunda tarjeta vuelve a animar el paneo",
  anim2 && anim2.anim === "paneo-entrada",
  anim2 && anim2.anim,
);
await shot("fase3-segunda-entrada.png");

await waitFor(
  "(() => { const a = document.querySelector(" + q(TARJETA) + "); return !!a && a.querySelectorAll('.animate-pulse').length === 0; })()",
  "el esqueleto de la segunda tarjeta sustituido",
);
const pulse2 = JSON.parse(await evaluate("JSON.stringify(window.__pulse)"));
const ventana2 = pulse2.desde !== null && pulse2.hasta !== null ? Math.round(pulse2.hasta - pulse2.desde) : 0;
check("la ventana del esqueleto se repite", ventana2 > 200, ventana2 + " ms");
check(
  "la segunda entrada tampoco desborda la página",
  pulse2.ovFrames === 0,
  pulse2.ovFrames + " fotogramas con desborde, pico " + pulse2.ovPico + "px",
);

// ═══ FASE 4 — prefers-reduced-motion ═══════════════════════════════════════
log("\n── Fase 4 · prefers-reduced-motion: reduce ──");
await cdp.send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
check(
  "el navegador reporta reduced-motion",
  (await evaluate('window.matchMedia("(prefers-reduced-motion: reduce)").matches')) === true,
);

await waitFor(COMPOSER_LISTO, "el composer habilitado");
await enviar(PROMPT);
await waitFor("!!document.querySelector(" + q(TARJETA) + ")", "la tarjeta en modo reducido");
const reducido = await leerTarjeta();
log("  en modo reducido: " + JSON.stringify(reducido));
check("con reduced-motion la tarjeta NO anima", reducido && reducido.anim === "none", reducido && reducido.anim);
check(
  "con reduced-motion NO se retiene el contenido (sin esqueleto)",
  reducido && reducido.barras === 0,
  reducido && reducido.barras + " barras",
);
check(
  "con reduced-motion los datos están presentes igualmente",
  reducido && reducido.conTexto > 5,
  reducido && reducido.conTexto + " celdas con texto",
);
await shot("fase4-reduced-motion.png");

await cdp.send("Emulation.setEmulatedMedia", { features: [] });

// ═══ Cierre ════════════════════════════════════════════════════════════════
const exDespues = newExceptions();
check("no hay excepciones de runtime nuevas", exDespues === exAntes, exAntes + " → " + exDespues);

log("\n══════════════════════════════════════════════");
log(failures === 0 ? "VEREDICTO: TODO OK" : "VEREDICTO: " + failures + " FALLOS");
log("══════════════════════════════════════════════");

cdp.close();
process.exit(failures === 0 ? 0 : 1);
