import { writeFileSync, mkdirSync, readFileSync } from "node:fs";

const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://127.0.0.1:5199";
const OUT = "./artifacts-verify/";
mkdirSync(OUT, { recursive: true });

writeFileSync(OUT + "cedula.png", readFileSync("Docs/diseno-inventario/catalogo-movil-claro.jpg"));
writeFileSync(OUT + "selfie.png", readFileSync("Docs/diseno-inventario/reorden-movil-oscuro.jpg"));
writeFileSync(
  OUT + "recibo.pdf",
  Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n", "utf8")
);

async function getPageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${CDP_BASE}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl && !t.url.startsWith("devtools"));
      if (page) return page;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("No CDP page target");
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
      })
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

const clickTexto = (t) =>
  evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(t)}); if (!b) return 'no-existe'; if (b.disabled) return 'disabled'; b.click(); return 'ok'; })()`);

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

await cdp.send("Page.navigate", { url: `${APP}/login` });
await sleep(2500);
await evaluate(`(() => {
  localStorage.setItem("necto.session", JSON.stringify({ modulos: ["pedidos","inventarios"], tipoSesion: "administrador", operadorSimuladoId: null, preSimulacion: null }));
  localStorage.setItem("necto.organizacion.v1", JSON.stringify({ usuario: null, organizacion: ${JSON.stringify(ORG)}, organizaciones: [${JSON.stringify(ORG)}] }));
  const raw = localStorage.getItem("webforge-ui-preferences") || "{}";
  let ui = {}; try { ui = JSON.parse(raw); } catch {}
  ui.themePreference = "light"; localStorage.setItem("webforge-ui-preferences", JSON.stringify(ui));
  return true;
})()`);

await cdp.send("Page.navigate", { url: `${APP}/configuracion?tab=general&seccion=fiscales` });
await waitFor(`document.body.innerText.includes("Registrar documentos")`, "entrada");

// Recorrido completo
await clickTexto("Registrar documentos");
await sleep(600);
await evaluate(`document.querySelector('input[type=checkbox]').click()`);
await sleep(200);
await clickTexto("Aceptar y continuar");
await sleep(600);
await setInput("#ver-nombre", "Wiltrido Bilbao");
await setInput("#ver-numero", "10005678909");
await sleep(200);
await clickTexto("Siguiente");
await sleep(700);
const codigo = ((await evaluate("document.body.innerText")).match(/se muestra aquí: ([A-Z0-9]{6})/) || [])[1] || "";
await setInput("#ver-codigo", codigo);
await sleep(200);
await clickTexto("Validar");
await sleep(700);
await subir("input#ver-documento", "cedula.png");
await sleep(500);
await subir("input#ver-selfie", "selfie.png");
await sleep(500);
await clickTexto("Siguiente");
await sleep(700);
await subir("input#ver-comprobante", "recibo.pdf");
await sleep(600);
await clickTexto("Finalizar");
await waitFor(`document.body.innerText.includes("Documentos registrados")`, "en revisión");

// ── Aprobar (demostración) ────────────────────────────────────────────────
check("el botón de aprobación se declara demostración",
  (await evaluate("document.body.innerText")).includes("Marcar como aprobado (demostración)"));
check("aprueba", (await clickTexto("Marcar como aprobado (demostración)")) === "ok");
await waitFor(`document.body.innerText.includes("Documentos Aprobados")`, "pantalla de aprobado");
await sleep(700);

const texto = await evaluate("document.body.innerText");
check("el sello dice «Documentos Aprobados»", texto.includes("Documentos Aprobados"));
check("aparecen los datos personales",
  texto.includes("Wiltrido Bilbao") && texto.includes("natural") &&
  texto.includes("Cédula de ciudadanía") && texto.includes("10005678909"));
check("aparecen los dos documentos",
  texto.includes("Documento de Identificación") && texto.includes("Comprobante de Dirección"));

const descargas = await evaluate(`[...document.querySelectorAll('a[download]')].map(a => ({ nombre: a.getAttribute('download'), href: a.getAttribute('href').slice(0, 20) }))`);
check("las dos descargas son reales (data URL)", descargas.length === 2 && descargas.every((d) => d.href.startsWith("data:")), JSON.stringify(descargas));
check("la foto del rostro se muestra",
  (await evaluate(`!!document.querySelector('img[alt="Foto del rostro registrada"]')`)) === true);

const estado = await evaluate(`(() => { const d = JSON.parse(localStorage.getItem("necto.organizacion.v1")); return d.organizacion.verificacion.estado; })()`);
check("el estado quedó en aprobado", estado === "aprobado", String(estado));

const { data: shot } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
writeFileSync(OUT + "aprobado-real.png", Buffer.from(shot, "base64"));

// Persistencia
await cdp.send("Page.reload", { ignoreCache: false });
await waitFor(`document.body.innerText.includes("Documentos Aprobados")`, "aprobado tras recargar");
check("la aprobación sobrevive a la recarga", true);

// La tarjeta del submenú también lo refleja
await cdp.send("Page.navigate", { url: `${APP}/configuracion?tab=general` });
await sleep(2500);
check("el submenú muestra «Documentos aprobados»",
  (await evaluate("document.body.innerText")).includes("Documentos aprobados"));

const errs = cdp.events.filter((e) => e.method === "Runtime.exceptionThrown");
check("sin excepciones en runtime", errs.length === 0, String(errs.length));

console.log(`\nRESULTADO: ${fallos.length === 0 ? "TODO OK" : fallos.length + " FALLOS"}`);
cdp.close();
process.exit(fallos.length === 0 ? 0 : 1);
