import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = "http://127.0.0.1:9333";
const OUT = "./artifacts-verify/";
mkdirSync(OUT, { recursive: true });

async function getPageTarget() {
  const res = await fetch(`${CDP_BASE}/json/list`);
  const targets = await res.json();
  return targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl && !t.url.startsWith("devtools"));
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
      })
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

const cdp = await connect((await getPageTarget()).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 2, mobile: false });

const evaluate = async (expression) => {
  const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

const rect = await evaluate(`(() => {
  const s = document.querySelector('section[aria-label="Vista previa de la identidad del negocio"]');
  if (!s) return null;
  const r = s.getBoundingClientRect();
  return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height };
})()`);

const { data } = await cdp.send("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: true,
  clip: { x: rect.x - 8, y: rect.y - 8, width: rect.width + 16, height: rect.height + 16, scale: 2 },
});
writeFileSync(OUT + "previa-zoom.png", Buffer.from(data, "base64"));

// Modo oscuro: fijar preferencia y recargar
await evaluate(`(() => {
  const raw = localStorage.getItem("webforge-ui-preferences") || "{}";
  let ui = {};
  try { ui = JSON.parse(raw); } catch {}
  ui.themePreference = "dark";
  localStorage.setItem("webforge-ui-preferences", JSON.stringify(ui));
  return true;
})()`);
await cdp.send("Page.reload", { ignoreCache: true });
await new Promise((r) => setTimeout(r, 5000));

const dark = await evaluate(`document.documentElement.classList.contains("dark")`);
console.log("DARK:", dark);
if (dark) {
  const r2 = await evaluate(`(() => {
    const s = document.querySelector('section[aria-label="Vista previa de la identidad del negocio"]');
    if (!s) return null;
    const r = s.getBoundingClientRect();
    return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height };
  })()`);
  if (r2) {
    const { data: d2 } = await cdp.send("Page.captureScreenshot", {
      format: "png", captureBeyondViewport: true,
      clip: { x: r2.x - 8, y: r2.y - 8, width: r2.width + 16, height: r2.height + 16, scale: 2 },
    });
    writeFileSync(OUT + "previa-zoom-oscuro.png", Buffer.from(d2, "base64"));
  }
}

cdp.close();
process.exit(0);
