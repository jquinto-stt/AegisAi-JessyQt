import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://127.0.0.1:5199";
const OUT = "./artifacts-verify/";
mkdirSync(OUT, { recursive: true });

// PNG 32x32 rojo, generado a mano (sin dependencias).
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAKklEQVR42u3OsQ0AIAwDMLf/0Z0YkHiA6mJb" +
  "iuO4OwAAAPjVAAAAAAB8YwGx0QGx8wAAAABJRU5ErkJggg==",
  "base64"
);
writeFileSync(OUT + "logo-prueba.png", png);

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect((await getPageTarget()).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
await cdp.send("Page.enable");
await cdp.send("DOM.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

const evaluate = async (expression) => {
  const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

const waitFor = async (expression, label, timeoutMs = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { if (await evaluate(expression)) return true; } catch {}
    await sleep(300);
  }
  throw new Error(`Timeout: ${label}`);
};

const fallos = [];
const check = (n, ok, d = "") => { console.log(`${ok ? "OK  " : "FAIL"} ${n}${d ? " · " + d : ""}`); if (!ok) fallos.push(n); };

// Tema claro para la captura
await cdp.send("Page.navigate", { url: `${APP}/configuracion?tab=general` });
await waitFor(`!!document.querySelector('input#org-logo')`, "el input de logo");
await evaluate(`(() => { const raw = localStorage.getItem("webforge-ui-preferences") || "{}";
  let ui = {}; try { ui = JSON.parse(raw); } catch {}
  ui.themePreference = "light"; localStorage.setItem("webforge-ui-preferences", JSON.stringify(ui)); return true; })()`);
await cdp.send("Page.reload", { ignoreCache: false });
await waitFor(`!!document.querySelector('input#org-logo')`, "el input de logo tras recargar");
await sleep(600);

// ── Subir el archivo por el input real ─────────────────────────────────────
const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "input#org-logo" });
await cdp.send("DOM.setFileInputFiles", {
  nodeId,
  files: [process.cwd().replace(/\\\\/g, "/") + "/artifacts-verify/logo-prueba.png"],
});

await waitFor(
  `(() => { const img = document.querySelector('section[aria-label="Vista previa de la identidad del negocio"] img');
    return !!img && img.src.startsWith("data:"); })()`,
  "la vista previa refleja la imagen subida"
);
check("la vista previa pinta el logo subido", true);

const enBorrador = await evaluate(
  `(() => { const s = document.querySelector('section[aria-label="Vista previa de la identidad del negocio"]');
    const img = s.querySelector('img'); return img ? img.src.slice(0, 22) : null; })()`
);
check("el src es un data URL", String(enBorrador).startsWith("data:image/"), String(enBorrador));

// Guardar
const guardar = await evaluate(`(() => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Guardar cambios');
  if (!b || b.disabled) return false; b.click(); return true; })()`);
check("el botón Guardar estaba habilitado tras subir", guardar === true);

await sleep(900);
const guardado = await evaluate(`(() => {
  const raw = localStorage.getItem("necto.organizacion.v1");
  const o = raw ? JSON.parse(raw).organizacion : null;
  return o && o.logoUrl ? o.logoUrl.slice(0, 22) : null; })()`);
check("el logo quedó persistido en localStorage", String(guardado).startsWith("data:image/"), String(guardado));

// Recargar: debe sobrevivir
await cdp.send("Page.reload", { ignoreCache: false });
await waitFor(`!!document.querySelector('section[aria-label="Vista previa de la identidad del negocio"]')`, "la previa tras recargar");
await sleep(700);
const trasRecarga = await evaluate(`(() => {
  const img = document.querySelector('section[aria-label="Vista previa de la identidad del negocio"] img');
  return img ? img.src.slice(0, 22) : null; })()`);
check("el logo sobrevive a la recarga", String(trasRecarga).startsWith("data:image/"), String(trasRecarga));

// Limpiar el logo sembrado para dejar la captura final limpia
await evaluate(`(() => {
  const raw = localStorage.getItem("necto.organizacion.v1");
  const d = JSON.parse(raw); d.organizacion.logoUrl = ""; d.organizaciones[0].logoUrl = "";
  localStorage.setItem("necto.organizacion.v1", JSON.stringify(d)); return true; })()`);
await cdp.send("Page.reload", { ignoreCache: false });
await waitFor(`!!document.querySelector('section[aria-label="Vista previa de la identidad del negocio"]')`, "la previa final");
await sleep(700);

const { data } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
writeFileSync(OUT + "general-final.png", Buffer.from(data, "base64"));

console.log(`\nRESULTADO: ${fallos.length === 0 ? "TODO OK" : fallos.length + " FALLOS"}`);
cdp.close();
process.exit(fallos.length === 0 ? 0 : 1);
