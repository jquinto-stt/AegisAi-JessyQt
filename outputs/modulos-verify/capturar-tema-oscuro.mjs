import { writeFileSync, mkdirSync } from "node:fs";

// ═══════════════════════════════════════════════════════════════════════════
// CAPTURA · Módulos integrados y pestañas de contexto en TEMA OSCURO
// ═══════════════════════════════════════════════════════════════════════════
//
// El resto de la app se ve en claro porque `uiStore` arranca en `light`. Como
// las superficies nuevas usan variantes `dark:` en cada contenedor, se comprueba
// aparte que el tema oscuro no deja texto ilegible ni superficies claras
// sueltas. Se siembra la preferencia ANTES de cargar para que la app arranque ya
// en oscuro (sembrar la clase `.dark` a mano no probaría el arranque real).

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
    ws.addEventListener("open", () =>
      resolve({
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

const poner = (n, v) => evaluate("window." + n + " = " + JSON.stringify(v));

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

await cdp.send("Page.navigate", { url: `${APP}/` });
await sleep(2000);

// Sesión de administrador + preferencia de tema oscuro, ANTES de navegar.
await evaluate(`(() => {
  localStorage.setItem("necto.session", JSON.stringify({
    modulos: ["pedidos"],
    tipoSesion: "administrador",
    operadorSimuladoId: null,
    preSimulacion: null
  }));
  localStorage.setItem("necto.ui", JSON.stringify({}));
  localStorage.setItem("webforge-ui-preferences", JSON.stringify({
    theme: "dark",
    sidebarExpanded: true
  }));
  localStorage.removeItem("necto.integraciones");
  return true;
})()`);

// ── Configuración de IA → Módulos integrados ──
await cdp.send("Page.navigate", { url: `${APP}/asistente/config` });
await waitFor("!!document.querySelector('h1')", "config");
await sleep(900);

await poner("__sec", "Módulos integrados");
await evaluate(
  [
    "(() => {",
    "  const nav = document.querySelector('[aria-label^=\"Secciones de\"]');",
    "  const b = [...nav.querySelectorAll('button')].find(x => x.textContent.trim() === window.__sec);",
    "  if (b) b.click();",
    "  return true;",
    "})()",
  ].join("\n"),
);
await sleep(800);

const temaOscuroActivo = await evaluate(
  "document.documentElement.classList.contains('dark')",
);
console.log(`  tema oscuro activo: ${temaOscuroActivo}`);
await shot("06-config-modulos-dark.png");

// ── Conversaciones → pestaña de contexto, en oscuro ──
await cdp.send("Page.navigate", { url: `${APP}/conversaciones` });
await waitFor(
  "!!document.querySelector('[role=\"tablist\"][aria-label=\"Vistas de la conversación\"]')",
  "pestañas",
);
await sleep(900);
await clickTab("Pedidos");
await sleep(800);
await shot("07-whatsapp-contexto-pedidos-dark.png");

console.log("  capturas en oscuro: 06-config-modulos-dark.png, 07-whatsapp-contexto-pedidos-dark.png");
cdp.close();
