import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://127.0.0.1:5199";
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

const shot = async (nombre) => {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(OUT + nombre, Buffer.from(data, "base64"));
  console.log("captura", nombre);
};

const clickTexto = (t) =>
  evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(t)}); if (!b) return 'no-existe'; b.click(); return 'ok'; })()`);

const setInput = (sel, valor) =>
  evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, ${JSON.stringify(valor)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);

const subir = async (selector, ruta) => {
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
  await cdp.send("DOM.setFileInputFiles", {
    nodeId,
    files: [process.cwd().split("\\").join("/") + "/artifacts-verify/" + ruta],
  });
};

// Estado limpio
await cdp.send("Page.navigate", { url: `${APP}/configuracion?tab=general&seccion=fiscales` });
await sleep(2500);
await evaluate(`(() => {
  const d = JSON.parse(localStorage.getItem("necto.organizacion.v1"));
  delete d.organizacion.verificacion;
  localStorage.setItem("necto.organizacion.v1", JSON.stringify(d));
  return true;
})()`);
await cdp.send("Page.reload", { ignoreCache: false });
await sleep(2500);

await shot("verif-1-entrada.png");

await clickTexto("Registrar documentos");
await sleep(700);
await shot("verif-2-terminos.png");

await evaluate(`document.querySelector('input[type=checkbox]').click()`);
await sleep(300);
await clickTexto("Aceptar y continuar");
await sleep(700);
await setInput("#ver-nombre", "Wiltrido Bilbao");
await setInput("#ver-numero", "10005678909");
await sleep(300);
await shot("verif-3-identidad.png");

await clickTexto("Siguiente");
await sleep(900);
await shot("verif-4-codigo.png");

const texto = await evaluate("document.body.innerText");
const codigo = (texto.match(/se muestra aquí: ([A-Z0-9]{6})/) || [])[1] || "";
await setInput("#ver-codigo", codigo);
await sleep(200);
await clickTexto("Validar");
await sleep(900);

await subir("input#ver-documento", "cedula.png");
await sleep(600);
await subir("input#ver-selfie", "selfie.png");
await sleep(700);
await shot("verif-5-documentos.png");

await clickTexto("Siguiente");
await sleep(800);
await subir("input#ver-comprobante", "recibo.pdf");
await sleep(700);
await shot("verif-6-comprobante.png");

await clickTexto("Finalizar");
await sleep(900);
await shot("verif-7-final.png");

cdp.close();
process.exit(0);
