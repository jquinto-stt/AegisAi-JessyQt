import { writeFileSync, mkdirSync } from "node:fs";

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICACIÓN · la barra de pestañas dentro del ChatDrawer
// ═══════════════════════════════════════════════════════════════════════════
//
// `ChatView` es COMPARTIDO entre la consola `/conversaciones` y el slide-over de
// chat rápido (`ChatDrawer`, que abren el Tablero y la vista de Inicio). Añadir
// una barra de pestañas a `ChatView` toca las dos superficies, así que hay que
// comprobar que en el drawer —que ya trae su propia cabecera y vive en un
// contenedor con scroll— no se rompe nada: ni la barra se sale, ni el hilo queda
// aplastado, ni el composer desaparece.
//
// El drawer se abre desde el Tablero pulsando el botón «WhatsApp» de una tarjeta.
// No todos los pedidos tienen hilo, así que se recorren varios hasta encontrar
// uno que sí: la ausencia de hilo es un caso legítimo, no un fallo.

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

const poner = (n, v) => evaluate("window." + n + " = " + JSON.stringify(v));

console.log("=== ChatDrawer · la barra de pestañas no rompe el slide-over ===\n");

await cdp.send("Page.navigate", { url: `${APP}/` });
await sleep(2000);

await evaluate(`(() => {
  localStorage.setItem("necto.session", JSON.stringify({
    modulos: ["pedidos"],
    tipoSesion: "administrador",
    operadorSimuladoId: null,
    preSimulacion: null
  }));
  localStorage.setItem("webforge-ui-preferences", JSON.stringify({
    theme: "light", sidebarExpanded: true
  }));
  localStorage.removeItem("necto.integraciones");
  return true;
})()`);

await cdp.send("Page.navigate", { url: `${APP}/pedidos` });
await waitFor("document.body.textContent.includes('WhatsApp')", "el tablero");
await sleep(1200);

/** Cuántos botones «WhatsApp» hay en el tablero. */
const nBotones = await evaluate(
  "[...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'WhatsApp').length",
);
console.log(`  botones «WhatsApp» en el tablero: ${nBotones}`);
check("el tablero ofrece abrir el chat de un pedido", nBotones > 0, `n=${nBotones}`);

// Recorrer los botones hasta encontrar un pedido que SÍ tenga hilo.
let abierto = false;
for (let i = 0; i < Math.min(nBotones, 12); i++) {
  await poner("__i", i);
  await evaluate(
    [
      "(() => {",
      "  const bs = [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'WhatsApp');",
      "  const b = bs[window.__i];",
      "  if (!b) return false;",
      "  b.click();",
      "  return true;",
      "})()",
    ].join("\n"),
  );
  await sleep(700);

  const tieneTabs = await evaluate(
    "!!document.querySelector('[role=\"dialog\"] [role=\"tablist\"][aria-label=\"Vistas de la conversación\"]')",
  );
  if (tieneTabs) {
    abierto = true;
    break;
  }

  // Cerrar el drawer antes de probar el siguiente pedido.
  await evaluate(
    [
      "(() => {",
      "  const b = document.querySelector('[role=\"dialog\"] button[aria-label=\"Cerrar\"]');",
      "  if (b) b.click();",
      "  return true;",
      "})()",
    ].join("\n"),
  );
  await sleep(500);
}

check("se abre el drawer con el hilo de un pedido", abierto === true);

if (abierto) {
  const tabs = await evaluate(
    [
      "(() => {",
      "  const barra = document.querySelector('[role=\"dialog\"] [role=\"tablist\"][aria-label=\"Vistas de la conversación\"]');",
      "  return [...barra.querySelectorAll('[role=\"tab\"]')].map(t => t.textContent.trim());",
      "})()",
    ].join("\n"),
  );
  check(
    "el drawer muestra las pestañas «Conversación» y «Pedidos»",
    JSON.stringify(tabs) === JSON.stringify(["Conversación", "Pedidos"]),
    JSON.stringify(tabs),
  );

  // La barra debe caber dentro del panel, sin desbordar por arriba ni por abajo.
  const geometria = await evaluate(
    [
      "(() => {",
      "  const panel = document.querySelector('[role=\"dialog\"] aside');",
      "  const barra = document.querySelector('[role=\"dialog\"] [role=\"tablist\"][aria-label=\"Vistas de la conversación\"]');",
      "  const composer = document.querySelector('[role=\"dialog\"] textarea, [role=\"dialog\"] input[type=\"text\"]');",
      "  const r = panel.getBoundingClientRect();",
      "  const b = barra.getBoundingClientRect();",
      "  return {",
      "    dentroArriba: b.top >= r.top - 1,",
      "    dentroAbajo: b.bottom <= r.bottom + 1,",
      "    altoBarra: Math.round(b.height),",
      "    altoPanel: Math.round(r.height),",
      "    hayComposer: !!composer,",
      "  };",
      "})()",
    ].join("\n"),
  );
  check("la barra cabe dentro del panel del drawer", geometria?.dentroArriba && geometria?.dentroAbajo, JSON.stringify(geometria));
  check("la barra tiene altura razonable (no se aplasta)", (geometria?.altoBarra || 0) >= 24, JSON.stringify(geometria));
  check("el composer del drawer sigue presente", geometria?.hayComposer === true);
  await shot("08-drawer-tabs-conversacion.png");

  // Pestaña de módulo dentro del drawer.
  await poner("__tab", "Pedidos");
  await evaluate(
    [
      "(() => {",
      "  const barra = document.querySelector('[role=\"dialog\"] [role=\"tablist\"][aria-label=\"Vistas de la conversación\"]');",
      "  const t = [...barra.querySelectorAll('[role=\"tab\"]')].find(x => x.textContent.trim() === window.__tab);",
      "  if (t) t.click();",
      "  return true;",
      "})()",
    ].join("\n"),
  );
  await sleep(700);

  const panelModulo = await evaluate(
    "!!document.querySelector('[role=\"dialog\"] [role=\"tabpanel\"][aria-label=\"Pedidos\"]')",
  );
  check("la pestaña «Pedidos» monta su contexto dentro del drawer", panelModulo === true);

  const titulo = await evaluate(
    [
      "(() => {",
      "  const p = document.querySelector('[role=\"dialog\"] [role=\"tabpanel\"][aria-label=\"Pedidos\"]');",
      "  if (!p) return '';",
      "  const t = p.querySelector('p');",
      "  return t ? t.textContent.trim() : '';",
      "})()",
    ].join("\n"),
  );
  check(
    "el contexto del drawer se rotula con el contacto",
    typeof titulo === "string" && titulo.startsWith("Pedidos de "),
    `titulo=${titulo}`,
  );
  await shot("09-drawer-tabs-pedidos.png");
}

console.log("\n" + results.join("\n"));
console.log(`\n=== ${passed} OK · ${failed} FAIL ===`);
cdp.close();
process.exit(failed === 0 ? 0 : 1);
