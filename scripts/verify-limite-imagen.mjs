import { writeFileSync } from "node:fs";

const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://127.0.0.1:5199";
const SEL_PREVIA = 'section[aria-label="Vista previa de la identidad del negocio"]';

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

await cdp.send("Page.navigate", { url: `${APP}/configuracion?tab=general` });
await waitFor(`!!document.querySelector('input#org-logo')`, "el input de logo");
await sleep(600);

const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "input#org-logo" });
await cdp.send("DOM.setFileInputFiles", {
  nodeId,
  files: [process.cwd().split("\\").join("/") + "/artifacts-verify/logo-grande.png"],
});

await sleep(1500);

const error = await evaluate(`(() => {
  const e = document.querySelector('p[role="alert"]');
  return e ? e.textContent.trim() : null;
})()`);
check("rechaza el archivo de 300 KB y dice el peso real",
  !!error && /300 KB/.test(error) && /200 KB/.test(error), String(error));

const src = await evaluate(`(() => {
  const img = document.querySelector('${SEL_PREVIA} img');
  return img ? img.src.slice(0, 5) : 'sin-imagen';
})()`);
check("la vista previa no cambia con el archivo rechazado", src !== "data:", String(src));

console.log(`\nRESULTADO: ${fallos.length === 0 ? "TODO OK" : fallos.length + " FALLOS"}`);
cdp.close();
process.exit(fallos.length === 0 ? 0 : 1);
