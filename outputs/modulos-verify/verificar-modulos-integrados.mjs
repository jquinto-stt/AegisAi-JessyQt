import { writeFileSync, mkdirSync } from "node:fs";

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICACIÓN · Módulos integrados (IA) + pestañas de contexto (WhatsApp)
// ═══════════════════════════════════════════════════════════════════════════
//
// Arnés CDP para Windows (agent-browser no soporta Windows). Comprueba la
// afirmación central de la funcionalidad de punta a punta, contra el build real:
//
//   conectar/desconectar un módulo en IA → Módulos integrados
//        ↓  cambia de verdad el alcance del asistente (N de M herramientas)
//        ↓  aparece/desaparece la pestaña de contexto en el chat
//
// Trampas del arnés (ya documentadas en REFERENCIA.md) que se respetan aquí:
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

/** Pasa un valor a la página para no pelear con el escapado dentro del IIFE. */
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

/** Lee el estado del control de conexión de un módulo y el texto de su tarjeta. */
const leerTarjeta = async (modulo) => {
  await poner("__mod", modulo);
  return evaluate(
    [
      "(() => {",
      "  const sw = document.querySelector('input[role=\"switch\"][aria-label=\"Conectar ' + window.__mod + ' al asistente\"]');",
      "  if (!sw) return null;",
      "  const card = sw.closest('div.rounded-xl');",
      "  return {",
      "    existe: true,",
      "    checked: sw.checked,",
      "    disabled: sw.disabled,",
      "    texto: card ? card.textContent : '',",
      "  };",
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

/**
 * Lee el valor de una fila etiqueta/valor de una tarjeta de configuración.
 * Se ancla a la estructura de la fila (exactamente dos hijos, el segundo el
 * valor) en vez de a su posición en la tarjeta.
 */
const leerFila = async (titulo) => {
  await poner("__fila", titulo);
  return evaluate(
    [
      "(() => {",
      "  const fila = [...document.querySelectorAll('div')].find(d => {",
      "    const hijos = [...d.children];",
      "    if (hijos.length !== 2) return false;",
      "    if (!hijos[0].textContent.trim().startsWith(window.__fila)) return false;",
      "    return hijos[1].tagName === 'SPAN';",
      "  });",
      "  return fila ? fila.children[1].textContent.trim() : null;",
      "})()",
    ].join("\n"),
  );
};

const leerTabs = () =>
  evaluate(
    [
      "(() => {",
      "  const barra = document.querySelector('[role=\"tablist\"][aria-label=\"Vistas de la conversación\"]');",
      "  if (!barra) return null;",
      "  return [...barra.querySelectorAll('[role=\"tab\"]')].map(t => ({",
      "    label: t.textContent.trim(),",
      "    activo: t.getAttribute('aria-selected') === 'true',",
      "  }));",
      "})()",
    ].join("\n"),
  );

const clickTab = async (label) => {
  await poner("__tab", label);
  return evaluate(
    [
      "(() => {",
      "  const barra = document.querySelector('[role=\"tablist\"][aria-label=\"Vistas de la conversación\"]');",
      "  if (!barra) return false;",
      "  const t = [...barra.querySelectorAll('[role=\"tab\"]')].find(x => x.textContent.trim() === window.__tab);",
      "  if (!t) return false;",
      "  t.click();",
      "  return true;",
      "})()",
    ].join("\n"),
  );
};

/** ¿Está montado el panel del hilo de conversación? */
const hiloMontado = () =>
  evaluate("!!document.querySelector('[role=\"tabpanel\"][aria-label=\"Conversación\"]')");

/** ¿Está montado el panel de contexto de un módulo? */
const panelModuloMontado = async (label) => {
  await poner("__tab", label);
  return evaluate(
    "!!document.querySelector('[role=\"tabpanel\"][aria-label=\"' + window.__tab + '\"]')",
  );
};

/** Lee el contexto que un módulo aporta a la conversación abierta. */
const leerContextoModulo = async (label) => {
  await poner("__tab", label);
  return evaluate(
    [
      "(() => {",
      "  const panel = document.querySelector('[role=\"tabpanel\"][aria-label=\"' + window.__tab + '\"]');",
      "  if (!panel) return null;",
      "  const ps = [...panel.querySelectorAll('p')].map(p => p.textContent.trim());",
      "  const filas = [...panel.querySelectorAll('li')];",
      "  return {",
      "    titulo: ps[0] || '',",
      "    meta: ps[1] || '',",
      "    filas: filas.length,",
      "    numeros: filas.map(li => (li.querySelector('span') || {}).textContent || ''),",
      "  };",
      "})()",
    ].join("\n"),
  );
};

/** Nº de filas de la bandeja de chats. */
const filasBandeja = () =>
  evaluate(
    "document.querySelectorAll('aside[aria-label=\"Bandeja de chats\"] div.animate-entrada-lista').length",
  );

const clickFilaBandeja = async (i) => {
  await poner("__i", i);
  return evaluate(
    [
      "(() => {",
      "  const filas = [...document.querySelectorAll('aside[aria-label=\"Bandeja de chats\"] div.animate-entrada-lista')];",
      "  const f = filas[window.__i];",
      "  if (!f) return false;",
      "  f.click();",
      "  return true;",
      "})()",
    ].join("\n"),
  );
};

// ═══════════════════════════════════════════════════════════════════════════
console.log("=== Módulos integrados · verificación de UI ===\n");

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

await irA("/asistente/config");
await waitFor("!!document.querySelector('h1')", "el encabezado de configuración");

const excBase = newExceptions();
const ruta0 = await evaluate("location.pathname");
console.log(`  ruta: ${ruta0}`);
check("estoy en /asistente/config", ruta0 === "/asistente/config", `ruta=${ruta0}`);
await shot("00-config-perfil.png");

// ═══ Fase 1 · la sección existe y declara la verdad ═══════════════════════
console.log("\n── Fase 1 · Módulos integrados: estado real ──");

const hayEntradaNav = await clickSeccion("Módulos integrados");
await sleep(700);
check("la navegación tiene la entrada «Módulos integrados»", hayEntradaNav === true);

const encabezado = await evaluate(
  "[...document.querySelectorAll('h3')].map(h => h.textContent.trim()).includes('Módulos conectados al asistente')",
);
check("el panel es «Módulos conectados al asistente»", encabezado === true);

const controles = await evaluate(
  "document.querySelectorAll('input[role=\"switch\"][aria-label^=\"Conectar \"]').length",
);
check("hay exactamente 2 módulos ofrecidos (Pedidos e Inventario)", controles === 2, `n=${controles}`);

const pedidos = await leerTarjeta("Pedidos");
check("Pedidos existe con su control", !!pedidos?.existe);
check("Pedidos está CONECTADO (control encendido)", pedidos?.checked === true, JSON.stringify(pedidos));
check("el control de Pedidos es operable", pedidos?.disabled === false);
check(
  "Pedidos se rotula «Conectado»",
  !!pedidos?.texto.includes("Conectado"),
  pedidos?.texto?.slice(0, 120),
);

const inventario = await leerTarjeta("Inventario");
check("Inventario existe con su tarjeta", !!inventario?.existe);
check("Inventario está DESCONECTADO", inventario?.checked === false, JSON.stringify(inventario));
check(
  "el control de Inventario está DESHABILITADO (no se puede conectar lo que no existe)",
  inventario?.disabled === true,
);
check(
  "Inventario se rotula «No disponible»",
  !!inventario?.texto.includes("No disponible"),
  inventario?.texto?.slice(0, 140),
);
check(
  "Inventario explica por qué no se puede conectar",
  !!inventario?.texto.includes("no tiene proveedor de herramientas"),
);

const modulosConectados = await leerFila("Módulos conectados");
const herramientas = await leerFila("Herramientas habilitadas");
const contextoWhatsApp = await leerFila("Contexto en WhatsApp");
check("fila «Módulos conectados» = 1", modulosConectados === "1", `valor=${modulosConectados}`);
check(
  "fila «Herramientas habilitadas» = N de M con N > 0",
  /^(\d+) de (\d+)$/.test(herramientas || "") && Number((herramientas || "0").split(" ")[0]) > 0,
  `valor=${herramientas}`,
);
check(
  "fila «Contexto en WhatsApp» = «Conversación + 1»",
  contextoWhatsApp === "Conversación + 1",
  `valor=${contextoWhatsApp}`,
);
check(
  "no aparece el aviso de «ningún módulo conectado»",
  (await evaluate("document.body.textContent.includes('no tiene ningún módulo conectado')")) === false,
);
await shot("01-config-modulos-conectado.png");

// ═══ Fase 2 · desconectar Pedidos: el alcance del asistente cae a cero ════
console.log("\n── Fase 2 · Desconectar Pedidos ──");

await pulsarSwitch("Pedidos");
await sleep(800);

const pedidosOff = await leerTarjeta("Pedidos");
check("el control queda apagado", pedidosOff?.checked === false, JSON.stringify(pedidosOff));
check("Pedidos se rotula «Desconectado»", !!pedidosOff?.texto.includes("Desconectado"));

const herramientas0 = await leerFila("Herramientas habilitadas");
check(
  "las herramientas habilitadas caen a 0 (el interruptor NO es decorativo)",
  (herramientas0 || "").startsWith("0 de "),
  `valor=${herramientas0}`,
);
check("fila «Módulos conectados» = 0", (await leerFila("Módulos conectados")) === "0");
check(
  "fila «Contexto en WhatsApp» = «Solo la conversación»",
  (await leerFila("Contexto en WhatsApp")) === "Solo la conversación",
);
check(
  "avisa de que el asistente se quedó sin módulos",
  (await evaluate(
    "document.body.textContent.includes('El asistente no tiene ningún módulo conectado')",
  )) === true,
);
const persistido = await evaluate("localStorage.getItem('necto.integraciones')");
check("la desconexión se persiste", persistido === "[]", `valor=${persistido}`);
await shot("02-config-modulos-desconectado.png");

// ═══ Fase 3 · WhatsApp refleja la desconexión ═════════════════════════════
console.log("\n── Fase 3 · WhatsApp sin módulos conectados ──");

await irA("/conversaciones");
await waitFor("!!document.querySelector('[role=\"tablist\"][aria-label=\"Vistas de la conversación\"]')", "la barra de pestañas");

const tabsSin = await leerTabs();
check(
  "solo hay la pestaña «Conversación»",
  JSON.stringify(tabsSin) === JSON.stringify([{ label: "Conversación", activo: true }]),
  JSON.stringify(tabsSin),
);
check(
  "NO hay pestaña de Pedidos",
  (tabsSin || []).every((t) => t.label !== "Pedidos"),
);
check("el hilo de la conversación está montado", (await hiloMontado()) === true);
await shot("03-whatsapp-sin-modulos.png");

// ═══ Fase 4 · reconectar desde IA ═════════════════════════════════════════
console.log("\n── Fase 4 · Reconectar Pedidos desde IA ──");

await irA("/asistente/config");
await clickSeccion("Módulos integrados");
await sleep(700);
await pulsarSwitch("Pedidos");
await sleep(800);

const pedidosOn = await leerTarjeta("Pedidos");
check("el control vuelve a estar encendido", pedidosOn?.checked === true);
check("Pedidos se rotula «Conectado»", !!pedidosOn?.texto.includes("Conectado"));
check("fila «Módulos conectados» = 1", (await leerFila("Módulos conectados")) === "1");
const herramientas1 = await leerFila("Herramientas habilitadas");
check(
  "las herramientas se recuperan",
  /^(\d+) de \d+$/.test(herramientas1 || "") && Number((herramientas1 || "0").split(" ")[0]) > 0,
  `valor=${herramientas1}`,
);

// ═══ Fase 5 · WhatsApp refleja la conexión (pestaña + contexto real) ══════
console.log("\n── Fase 5 · Pestaña de contexto en el chat ──");

await irA("/conversaciones");
await waitFor("!!document.querySelector('[role=\"tablist\"][aria-label=\"Vistas de la conversación\"]')", "la barra de pestañas");

const tabsCon = await leerTabs();
check(
  "aparecen «Conversación» y «Pedidos»",
  JSON.stringify((tabsCon || []).map((t) => t.label)) ===
    JSON.stringify(["Conversación", "Pedidos"]),
  JSON.stringify(tabsCon),
);
check("la vista por defecto sigue siendo la conversación", tabsCon?.[0]?.activo === true);

const abierto = await clickTab("Pedidos");
await sleep(700);
check("se puede pulsar la pestaña «Pedidos»", abierto === true);

const tabsTrasClick = await leerTabs();
check(
  "«Pedidos» queda como pestaña activa",
  tabsTrasClick?.find((t) => t.label === "Pedidos")?.activo === true,
  JSON.stringify(tabsTrasClick),
);
check(
  "el panel del módulo se rotula «Pedidos»",
  (await panelModuloMontado("Pedidos")) === true,
);
check(
  "el hilo de la conversación se SUSTITUYE (no se apila debajo)",
  (await hiloMontado()) === false,
);

// El contexto debe traer pedidos REALES de un contacto: se recorre la bandeja
// hasta encontrar una conversación con pedidos, en vez de darlo por supuesto.
let contexto = await leerContextoModulo("Pedidos");
const nBandeja = await filasBandeja();
let encontrado = null;

for (let i = 0; i < Math.min(nBandeja, 8); i++) {
  if ((contexto?.filas || 0) > 0) {
    encontrado = { i, contexto };
    break;
  }
  await clickFilaBandeja(i);
  await sleep(600);
  await clickTab("Pedidos");
  await sleep(600);
  contexto = await leerContextoModulo("Pedidos");
}

check(
  "el módulo aporta el contexto de la conversación (rotulado con el contacto)",
  typeof contexto?.titulo === "string" && contexto.titulo.startsWith("Pedidos de "),
  JSON.stringify(contexto),
);
check(
  "hay al menos una conversación con pedidos y el encabezado cuadra con las filas",
  !!encontrado && encontrado.contexto.filas > 0,
  `filas=${contexto?.filas} meta=${contexto?.meta}`,
);
if (encontrado) {
  const n = encontrado.contexto.filas;
  check(
    `el encabezado declara ${n} pedido(s) y se pintan ${n} fila(s)`,
    encontrado.contexto.meta.startsWith(String(n)),
    `meta=${encontrado.contexto.meta}`,
  );
  check(
    "cada fila es un pedido real (lleva su número)",
    encontrado.contexto.numeros.every((x) => /^P-\d+/.test(x)),
    JSON.stringify(encontrado.contexto.numeros),
  );
}
await shot("04-whatsapp-contexto-pedidos.png");

// Volver a la conversación debe restaurar el hilo.
await clickTab("Conversación");
await sleep(600);
check("volver a «Conversación» restaura el hilo", (await hiloMontado()) === true);
await shot("05-whatsapp-conversacion.png");

// ═══ Fase 6 · la conexión sobrevive a la recarga ══════════════════════════
console.log("\n── Fase 6 · Persistencia entre recargas ──");

await irA("/conversaciones");
await waitFor("!!document.querySelector('[role=\"tablist\"][aria-label=\"Vistas de la conversación\"]')", "la barra tras recargar");
const tabsRecarga = await leerTabs();
check(
  "tras recargar sigue estando la pestaña «Pedidos»",
  JSON.stringify((tabsRecarga || []).map((t) => t.label)) ===
    JSON.stringify(["Conversación", "Pedidos"]),
  JSON.stringify(tabsRecarga),
);

// ═══ Fase 7 · sin excepciones nuevas ══════════════════════════════════════
console.log("\n── Fase 7 · Consola ──");
const excFinal = newExceptions();
check("no hay excepciones de runtime nuevas", excFinal === excBase, `antes=${excBase} ahora=${excFinal}`);

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n" + results.join("\n"));
console.log(`\n=== ${passed} OK · ${failed} FAIL ===`);
cdp.close();
process.exit(failed === 0 ? 0 : 1);
