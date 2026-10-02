// ═══════════════════════════════════════════════════════════════════════════
// Medición de desborde — la captura dice «se ve cortado», esto dice POR QUÉ
// ═══════════════════════════════════════════════════════════════════════════
//
// Un PNG muestra el síntoma; `scrollWidth` vs `clientWidth` da la causa. Se
// busca el elemento concreto que se sale y cuánto, en vez de suponer que es la
// tabla. Si nada desborda, el «corte» era del encuadre de la captura y no del
// layout — dos diagnósticos opuestos que una imagen no distingue.

import { writeFileSync, mkdirSync } from "node:fs";
mkdirSync("./artifacts-inv/", { recursive: true });

const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://localhost:6020";

async function getPageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(CDP_BASE + "/json/list");
      const t = (await res.json()).find(
        (x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools")
      );
      if (t) return t;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("no CDP target");
}

const ws = new WebSocket((await getPageTarget()).webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
await new Promise((res, rej) => {
  ws.addEventListener("open", res);
  ws.addEventListener("error", rej);
});
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
  }
});
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });

const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send("Runtime.enable");
await send("Page.enable");
// 1440 es el ancho de la captura donde se vio el corte. Se prueban varios.
for (const ancho of [1440, 1280, 1920]) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: ancho, height: 1000, deviceScaleFactor: 1, mobile: false,
  });

  await send("Page.navigate", { url: APP + "/login" });
  await sleep(2500);
  await evaluate(
    "(() => {" +
    "  localStorage.setItem('necto.session', JSON.stringify({ modulos:['pedidos','inventarios'], tipoSesion:'administrador', operadorSimuladoId:null, preSimulacion:null }));" +
    "  const c = { whatsapp:false, telegram:false, instagram:false, webchat:false, asistente:false };" +
    "  localStorage.setItem('necto.organizacion.v1', JSON.stringify({ usuario:{nombre:'Vera',email:'d@n.co'}, organizacion:{nombre:'Necto Demo',moneda:'COP',pais:'Colombia',zonaHoraria:'America/Bogota'}, modulos:{ pedidos:{instalado:true,activo:true,conectores:c}, inventarios:{instalado:true,activo:true,conectores:c} } }));" +
    "})()"
  );

  for (const ruta of ["/inventarios", "/inventarios/elementos", "/inventarios/reportes", "/inventarios/historial"]) {
    await send("Page.navigate", { url: APP + ruta });
    await sleep(2800);

    const informe = await evaluate(
      "(() => {" +
      "  const main = document.querySelector('main') || document.body;" +
      "  const doc = document.documentElement;" +
      "  const desbordes = [];" +
      "  const limite = main.clientWidth;" +
      "  main.querySelectorAll('*').forEach((el) => {" +
      "    const r = el.getBoundingClientRect();" +
      "    if (r.width === 0) return;" +
      "    const exceso = Math.round(r.right - limite);" +
      "    if (exceso > 2) {" +
      "      const ya = desbordes.some(d => d.clase === el.className);" +
      "      if (!ya && desbordes.length < 6) {" +
      "        desbordes.push({ exceso, tag: el.tagName, clase: String(el.className).slice(0, 110) });" +
      "      }" +
      "    }" +
      "  });" +
      "  return {" +
      "    mainClient: limite," +
      "    mainScroll: main.scrollWidth," +
      "    docScroll: doc.scrollWidth," +
      "    docClient: doc.clientWidth," +
      "    desborda: main.scrollWidth > limite + 2," +
      "    desbordes," +
      "  };" +
      "})()"
    );

    console.log("═══ " + ruta + "  @ " + ancho + "px ═══");
    console.log("  main  client/scroll: " + informe.mainClient + " / " + informe.mainScroll +
      (informe.desborda ? "   ← DESBORDA " + (informe.mainScroll - informe.mainClient) + "px" : "   OK"));
    console.log("  documento client/scroll: " + informe.docClient + " / " + informe.docScroll);
    if (informe.desbordes.length) {
      for (const d of informe.desbordes) {
        console.log("    +" + d.exceso + "px  <" + d.tag + ">  " + d.clase);
      }
    } else {
      console.log("    (ningún elemento se sale del contenedor)");
    }
  }
}

ws.close();
process.exit(0);
