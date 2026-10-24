import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://127.0.0.1:5199";
const OUT = "./artifacts-verify/";
mkdirSync(OUT, { recursive: true });

writeFileSync(
  OUT + "certificado.pdf",
  Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n", "utf8")
);

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

const ORG = {
  id: "org_verify", nombre: "Boutique Roma", slug: "boutique-roma",
  pais: "Colombia", moneda: "COP", zonaHoraria: "America/Bogota",
  tipoEmpresa: "Retail & Comercio minorista", tamanoEquipo: "2 a 5 personas",
  logoUrl: "", descripcion: "", sitioWeb: "", fechaCreacion: new Date().toISOString(),
};

// Estado limpio: sin cuentas y con fiscal aprobado.
await cdp.send("Page.navigate", { url: `${APP}/login` });
await sleep(2000);
await evaluate(`(() => {
  const org = ${JSON.stringify(ORG)};
  org.verificacion = { estado: "aprobado", persona: "natural", nombreCompleto: "Wiltrido Bilbao", tipoDocumento: "Cédula de ciudadanía", numeroDocumento: "10005678909" };
  localStorage.setItem("necto.session", JSON.stringify({ modulos: ["pedidos","inventarios"], tipoSesion: "administrador", operadorSimuladoId: null, preSimulacion: null }));
  localStorage.setItem("necto.organizacion.v1", JSON.stringify({ usuario: null, organizacion: org, organizaciones: [org] }));
  const raw = localStorage.getItem("webforge-ui-preferences") || "{}";
  let ui = {}; try { ui = JSON.parse(raw); } catch {}
  ui.themePreference = "light"; localStorage.setItem("webforge-ui-preferences", JSON.stringify(ui));
  return true;
})()`);

await cdp.send("Page.navigate", { url: `${APP}/configuracion?tab=general&seccion=bancarios` });
await sleep(3000);
await shot("bancos-1-entrada.png");

await clickTexto("Registrar Cuenta Bancaria");
await sleep(800);
await shot("bancos-2-codigo.png");

const codigo = ((await evaluate("document.body.innerText")).match(/se muestra aquí: ([A-Z0-9]{6})/) || [])[1] || "";
await setInput("#ban-codigo", codigo);
await sleep(200);
await clickTexto("Validar");
await sleep(800);
await setInput("#ban-titular", "Eddiberto Saez");
await setInput("#ban-numdoc", "1000567890");
await setInput("#ban-numero", "00179343193");
await sleep(300);
await shot("bancos-3-formulario.png");

await clickTexto("Siguiente");
await sleep(800);
await subir("input#ban-certificado", "certificado.pdf");
await sleep(700);
await evaluate(`document.querySelectorAll('input[type=checkbox]')[0].click()`);
await sleep(300);
await shot("bancos-4-certificado.png");

await clickTexto("Finalizar");
await sleep(900);
await shot("bancos-5-lista.png");

cdp.close();
process.exit(0);
