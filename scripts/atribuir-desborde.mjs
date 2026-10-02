// ═══════════════════════════════════════════════════════════════════════════
// ¿El desborde es MÍO o del shell? — comparación con una pantalla ajena
// ═══════════════════════════════════════════════════════════════════════════
//
// Medir solo Inventarios no permite atribuir la causa: todo lo que se ve
// desbordar está DENTRO del shell. Si `/pedidos` —que no toqué en esta sesión—
// desborda lo mismo, el defecto es del layout compartido y no del módulo nuevo;
// si Pedidos está limpio y Inventarios no, es mío. Sin esta comparación, el
// arreglo se aplicaría en el sitio equivocado.

const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://localhost:6020";

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(CDP_BASE + "/json/list");
      const t = (await r.json()).find((x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
      if (t) return t;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("no target");
}

const ws = new WebSocket((await target()).webSocketDebuggerUrl);
let id = 0;
const pend = new Map();
await new Promise((res, rej) => {
  ws.addEventListener("open", res);
  ws.addEventListener("error", rej);
});
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) {
    const { res, rej } = pend.get(m.id);
    pend.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
  }
});
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    pend.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const ev = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

await send("Page.navigate", { url: APP + "/login" });
await sleep(2500);
await ev(
  "(() => {" +
  "  localStorage.setItem('necto.session', JSON.stringify({ modulos:['pedidos','inventarios'], tipoSesion:'administrador', operadorSimuladoId:null, preSimulacion:null }));" +
  "  const c = { whatsapp:false, telegram:false, instagram:false, webchat:false, asistente:false };" +
  "  localStorage.setItem('necto.organizacion.v1', JSON.stringify({ usuario:{nombre:'Vera',email:'d@n.co'}, organizacion:{nombre:'Necto Demo',moneda:'COP',pais:'Colombia',zonaHoraria:'America/Bogota'}, modulos:{ pedidos:{instalado:true,activo:true,conectores:c}, inventarios:{instalado:true,activo:true,conectores:c} } }));" +
  "})()"
);

const MEDIR =
  "(() => {" +
  "  const doc = document.documentElement;" +
  "  const main = document.querySelector('main');" +
  "  const panel = document.querySelector('.necto-panel');" +
  "  const caja = (el) => el ? (Math.round(el.getBoundingClientRect().width) + ' (scroll ' + el.scrollWidth + ')') : 'n/a';" +
  "  let culpable = null;" +
  "  document.querySelectorAll('body *').forEach((el) => {" +
  "    if (el.scrollWidth > doc.clientWidth + 2 && !culpable) {" +
  "      culpable = el.tagName + '.' + String(el.className).slice(0, 90) + '  scroll=' + el.scrollWidth;" +
  "    }" +
  "  });" +
  "  return {" +
  "    viewport: doc.clientWidth," +
  "    docScroll: doc.scrollWidth," +
  "    desborde: doc.scrollWidth - doc.clientWidth," +
  "    main: caja(main)," +
  "    panel: caja(panel)," +
  "    primerCulpable: culpable," +
  "  };" +
  "})()";

for (const ruta of ["/pedidos", "/pedidos/inicio", "/pedidos/historial", "/inventarios", "/inventarios/elementos"]) {
  await send("Page.navigate", { url: APP + ruta });
  await sleep(3000);
  const m = await ev(MEDIR);
  const etiqueta = m.desborde > 2 ? "DESBORDA +" + m.desborde + "px" : "OK";
  console.log("── " + ruta.padEnd(26) + " " + etiqueta);
  console.log("     viewport=" + m.viewport + "  docScroll=" + m.docScroll + "  main=" + m.main + "  panel=" + m.panel);
  if (m.primerCulpable) console.log("     primer elemento que desborda: " + m.primerCulpable);
}

ws.close();
process.exit(0);
