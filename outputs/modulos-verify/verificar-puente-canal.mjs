import { writeFileSync, mkdirSync } from "node:fs";

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICACIÓN · Puente «Contexto en WhatsApp» en la config del canal
// ═══════════════════════════════════════════════════════════════════════════
//
// Arnés CDP para Windows (agent-browser no soporta Windows). Comprueba los dos
// cambios que resuelven el defecto de descubribilidad:
//
//   1. La barra lateral ya no tiene dos entradas llamadas «Configuración».
//   2. La config del canal explica de dónde salen las pestañas del chat, sin
//      ofrecer ningún control sobre ellas.
//
// La comprobación que de verdad importa es la FASE 4: desconectar Pedidos desde
// IA tiene que cambiar lo que dice la tarjeta del canal. Si las dos pantallas
// discreparan, habría DOS fuentes de verdad y la tarjeta sería decorativa —
// exactamente el defecto que se quiere evitar.
//
// Trampas del arnés (documentadas en REFERENCIA.md) que se respetan aquí:
//   · `Runtime.evaluate` devuelve un literal de cadena SIN reevaluarlo → los
//     IIFE se pasan desnudos, nunca envueltos en JSON.stringify.
//   · El payload está en `.result.result.value`.
//   · Hay que SEMBRAR la sesión antes de navegar o todo redirige a /login.
//   · El primer `Page.navigate` tras arrancar puede tardar → 60 s.

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://localhost:4173";
const OUT = "./artifacts/";
mkdirSync(OUT, { recursive: true });

async function getPageTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${CDP_BASE}/json/list`);
      const targets = await res.json();
      const page = targets.find(
        (t) => t.type === "page" && t.webSocketDebuggerUrl && !t.url.startsWith("devtools"),
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cdp = await connect((await getPageTarget()).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
await cdp.send("Page.enable");
await cdp.send("DOM.enable");
await cdp.send("Network.enable");
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1100,
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

const waitFor = async (expression, label, timeoutMs = 60000) => {
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

let passed = 0;
let failed = 0;
const results = [];
const check = (label, cond, detail = "") => {
  if (cond) {
    passed++;
    results.push(`  OK   ${label}`);
  } else {
    failed++;
    results.push(`  FAIL ${label}  ${detail}`);
  }
};

const newExceptions = () =>
  cdp.events.filter(
    (e) =>
      e.method === "Runtime.exceptionThrown" &&
      !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e)),
  ).length;

// ── Utilidades de interacción ──────────────────────────────────────────────

const poner = (nombre, valor) =>
  evaluate("window." + nombre + " = " + JSON.stringify(valor));

const irA = async (ruta) => {
  await cdp.send("Page.navigate", { url: APP + ruta });
  await waitFor("document.readyState === 'complete'", "load de " + ruta);
  await sleep(900);
};

const clickSeccion = async (label) => {
  await poner("__sec", label);
  return evaluate(
    [
      "(() => {",
      "  const nav = document.querySelector('[aria-label^=\"Secciones de\"]');",
      "  if (!nav) return false;",
      "  const b = [...nav.querySelectorAll('button')].find(x => x.textContent.trim() === window.__sec);",
      "  if (!b) return false;",
      "  b.click();",
      "  return true;",
      "})()",
    ].join("\n"),
  );
};

/** Etiqueta visible de la entrada de la barra lateral que apunta a `ruta`. */
const etiquetaDeNav = async (ruta) => {
  await poner("__ruta", ruta);
  return evaluate(
    [
      "(() => {",
      "  const a = [...document.querySelectorAll('a[href]')]",
      "    .find(x => new URL(x.href, location.origin).pathname === window.__ruta);",
      "  if (!a) return null;",
      "  const t = a.querySelector('.menu-item-text');",
      "  return t ? t.textContent.trim() : null;",
      "})()",
    ].join("\n"),
  );
};

/** Todas las etiquetas de la barra lateral (incluye el pie). */
const etiquetasDeNav = () =>
  evaluate(
    "[...document.querySelectorAll('.menu-item-text')].map(e => e.textContent.trim())",
  );

/**
 * Texto íntegro de la tarjeta cuyo encabezado es `titulo`.
 *
 * `CardHead` pinta un `<h2>` como hijo DIRECTO del contenedor de la tarjeta, así
 * que `parentElement` es la tarjeta entera. Se localiza por encabezado y no por
 * clase CSS para que un cambio de estilos no invalide el arnés.
 */
const leerTarjeta = async (titulo) => {
  await poner("__tit", titulo);
  return evaluate(
    [
      "(() => {",
      "  const h = [...document.querySelectorAll('h2')]",
      "    .find(x => x.textContent.trim() === window.__tit);",
      "  if (!h) return null;",
      "  const card = h.parentElement;",
      "  return {",
      "    texto: card.textContent,",
      "    interruptores: card.querySelectorAll('input[role=\"switch\"]').length,",
      "    botones: [...card.querySelectorAll('button')].map(b => b.textContent.trim()),",
      "  };",
      "})()",
    ].join("\n"),
  );
};

/** Estado del interruptor de conexión de un módulo en la config de la IA. */
const leerSwitch = async (modulo) => {
  await poner("__mod", modulo);
  return evaluate(
    [
      "(() => {",
      "  const sw = document.querySelector('input[role=\"switch\"][aria-label=\"Conectar ' + window.__mod + ' al asistente\"]');",
      "  return sw ? { checked: sw.checked, disabled: sw.disabled } : null;",
      "})()",
    ].join("\n"),
  );
};

const pulsarSwitch = async (modulo) => {
  await poner("__mod", modulo);
  return evaluate(
    [
      "(() => {",
      "  const sw = document.querySelector('input[role=\"switch\"][aria-label=\"Conectar ' + window.__mod + ' al asistente\"]');",
      "  if (!sw) return false;",
      "  sw.click();",
      "  return true;",
      "})()",
    ].join("\n"),
  );
};

const pulsarBoton = async (texto) => {
  await poner("__btn", texto);
  return evaluate(
    [
      "(() => {",
      "  const b = [...document.querySelectorAll('button')]",
      "    .find(x => x.textContent.trim() === window.__btn);",
      "  if (!b) return false;",
      "  b.click();",
      "  return true;",
      "})()",
    ].join("\n"),
  );
};

// ═══════════════════════════════════════════════════════════════════════════

console.log("=== Puente «Contexto en WhatsApp» · verificación de UI ===\n");

// ─── Fase 0 · cargar la app y sembrar la sesión ────────────────────────────
await cdp.send("Page.navigate", { url: `${APP}/` });
await sleep(2000);

await evaluate(`(() => {
  localStorage.setItem("necto.session", JSON.stringify({
    modulos: ["pedidos"],
    tipoSesion: "administrador",
    operadorSimuladoId: null,
    preSimulacion: null
  }));
  localStorage.removeItem("necto.integraciones");
  return true;
})()`);

await irA("/conversaciones/config");
await waitFor("!!document.querySelector('h1')", "el encabezado de la configuración del canal");

const excBase = newExceptions();
const ruta0 = await evaluate("location.pathname");
console.log(`  ruta: ${ruta0}`);
check("estoy en /conversaciones/config", ruta0 === "/conversaciones/config", `ruta=${ruta0}`);
await shot("10-canal-perfil-puente.png");

// ═══ Fase 1 · la barra lateral ya no es ambigua ═══════════════════════════
console.log("\n── Fase 1 · Etiquetas de la barra lateral ──");

const etiquetaCanal = await etiquetaDeNav("/conversaciones/config");
const etiquetaIA = await etiquetaDeNav("/asistente/config");

check(
  "el enlace a /conversaciones/config se rotula «Configuración del canal»",
  etiquetaCanal === "Configuración del canal",
  `leído=${JSON.stringify(etiquetaCanal)}`,
);
check(
  "el enlace a /asistente/config se rotula «Configuración de la IA»",
  etiquetaIA === "Configuración de la IA",
  `leído=${JSON.stringify(etiquetaIA)}`,
);
check(
  "las dos entradas ya NO comparten etiqueta",
  !!etiquetaCanal && !!etiquetaIA && etiquetaCanal !== etiquetaIA,
  `canal=${etiquetaCanal} ia=${etiquetaIA}`,
);

// El pie del sidebar conserva una tercera «Configuración» que apunta a
// /configuracion (PlaceholderPage). Se REPORTA, no se falla: es andamiaje
// heredado y honesto («en construcción»), fuera del alcance de este cambio.
const todas = await etiquetasDeNav();
const exactas = todas.filter((t) => t === "Configuración").length;
console.log(`  nota: quedan ${exactas} entrada(s) con la etiqueta exacta «Configuración» (pie → /configuracion)`);

// ═══ Fase 2 · la tarjeta puente existe y no ofrece control ════════════════
console.log("\n── Fase 2 · Tarjeta «Contexto en WhatsApp» ──");

const enPerfil = await clickSeccion("Perfil del canal");
await sleep(700);
check("la navegación tiene «Perfil del canal»", enPerfil === true);

const tarjeta = await leerTarjeta("Contexto en WhatsApp");
check("existe la tarjeta «Contexto en WhatsApp» en Perfil del canal", tarjeta !== null);

if (tarjeta) {
  check(
    "la tarjeta refleja «Conversación + 1» (Pedidos conectado)",
    tarjeta.texto.includes("Conversación + 1"),
    tarjeta.texto.slice(0, 160),
  );
  check(
    "declara que la conexión NO se configura aquí",
    tarjeta.texto.includes("Esta conexión no se configura aquí"),
  );
  check(
    "ofrece el enlace a Módulos integrados de NECTO AI",
    tarjeta.botones.some((b) => b.includes("Módulos integrados")),
    JSON.stringify(tarjeta.botones),
  );
  check(
    "la tarjeta NO ofrece ningún interruptor (es de solo lectura)",
    tarjeta.interruptores === 0,
    `interruptores=${tarjeta.interruptores}`,
  );
  check(
    "NO avisa de «sin módulos» cuando hay uno conectado",
    !tarjeta.texto.includes("El asistente no tiene ningún módulo conectado"),
  );
}

// ═══ Fase 3 · el enlace lleva de verdad a la configuración de la IA ═══════
console.log("\n── Fase 3 · El enlace navega ──");

const pulsado = await pulsarBoton("Abrir Módulos integrados en NECTO AI");
await sleep(1200);
const rutaTrasBoton = await evaluate("location.pathname");
check("el botón existe y se pulsa", pulsado === true);
check(
  "el botón lleva a /asistente/config",
  rutaTrasBoton === "/asistente/config",
  `ruta=${rutaTrasBoton}`,
);

// ═══ Fase 4 · la prueba que importa: una sola fuente de verdad ════════════
//
// Si la tarjeta del canal no cambiara al desconectar el módulo desde IA, sería
// decorativa y habría DOS verdades sobre el mismo hecho.
console.log("\n── Fase 4 · Desconectar en IA cambia lo que dice el canal ──");

await clickSeccion("Módulos integrados");
await sleep(700);
const antes = await leerSwitch("Pedidos");
check("Pedidos está conectado antes de la prueba", antes?.checked === true, JSON.stringify(antes));

await pulsarSwitch("Pedidos");
await sleep(700);
const despues = await leerSwitch("Pedidos");
check("el interruptor queda apagado", despues?.checked === false, JSON.stringify(despues));

await irA("/conversaciones/config");
await clickSeccion("Perfil del canal");
await sleep(700);
const tarjetaSin = await leerTarjeta("Contexto en WhatsApp");

check("la tarjeta sigue existiendo con 0 módulos", tarjetaSin !== null);
if (tarjetaSin) {
  check(
    "la fila pasa a «Solo la conversación»",
    tarjetaSin.texto.includes("Solo la conversación"),
    tarjetaSin.texto.slice(0, 200),
  );
  check(
    "avisa de que el asistente no tiene módulos conectados",
    tarjetaSin.texto.includes("El asistente no tiene ningún módulo conectado"),
  );
  check(
    "y aclara que no es un fallo del canal",
    tarjetaSin.texto.includes("No es un fallo del canal"),
  );
  check(
    "sigue sin ofrecer ningún interruptor",
    tarjetaSin.interruptores === 0,
    `interruptores=${tarjetaSin.interruptores}`,
  );
}
await shot("11-canal-puente-sin-modulos.png");

// Restaurar el estado de fábrica para no dejar el asistente sin herramientas.
await irA("/asistente/config");
await clickSeccion("Módulos integrados");
await sleep(700);
await pulsarSwitch("Pedidos");
await sleep(700);
const restaurado = await leerSwitch("Pedidos");
check("se restaura Pedidos conectado al terminar", restaurado?.checked === true, JSON.stringify(restaurado));

// ═══ Fase 5 · sin excepciones nuevas ══════════════════════════════════════
console.log("\n── Fase 5 · Consola ──");
const excFinal = newExceptions();
check("no hay excepciones de runtime nuevas", excFinal === excBase, `antes=${excBase} ahora=${excFinal}`);

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n" + results.join("\n"));
console.log(`\n=== ${passed} OK · ${failed} FAIL ===`);
cdp.close();
process.exit(failed === 0 ? 0 : 1);
