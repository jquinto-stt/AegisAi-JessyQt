// ═══════════════════════════════════════════════════════════════════════════
// Humo de Inventarios — las 8 rutas cargan sin errores de runtime
// ═══════════════════════════════════════════════════════════════════════════
//
// `tsc rc=0` NO modela el runtime: sólo renderizar cada vista lo demuestra. Este
// arnés escucha `Runtime.exceptionThrown` y `console.error` en cada ruta y
// comprueba que el contenedor principal tenga contenido visible.
//
// Guarda clave: si 0 rutas se miden, sale con código 6 («NO CONCLUYENTE»). Un
// instrumento vacío no puede leerse como verde.

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://localhost:6020";
const TEMA = process.env.TEMA || "oscuro";
const RUTAS = [
  "/inventarios",
  "/inventarios/elementos",
  "/inventarios/ubicaciones",
  "/inventarios/historial",
  "/inventarios/alertas",
  "/inventarios/reportes",
  "/inventarios/config",
  "/inventarios/nuevo",
];

const t0 = new Date();
console.log("inicio " + t0.toLocaleTimeString("es-CO") + " · tema=" + TEMA);

try {
  const r = await fetch(APP + "/", { redirect: "manual" });
  console.log("sonda de vida: " + APP + " → " + r.status);
  if (r.status !== 200) { console.error("ABORTA: el servidor no sirve 200"); process.exit(2); }
} catch (e) {
  console.error("ABORTA: " + APP + " no responde (" + e.message + ")");
  process.exit(2);
}

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const t = (await (await fetch(CDP_BASE + "/json/list")).json())
        .find((x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
      if (t) return t;
    } catch { /* Chrome aún no listo */ }
    await new Promise((s) => setTimeout(s, 250));
  }
  throw new Error("sin target CDP");
}

const ws = new WebSocket((await target()).webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res) => ws.addEventListener("open", res));

// Los eventos se acumulan aquí y se vacían en cada ruta.
let errores = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) {
    const { res, rej } = pend.get(m.id); pend.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    return;
  }
  if (m.method === "Runtime.exceptionThrown") {
    const d = m.params.exceptionDetails;
    errores.push("EXCEPCIÓN: " + (d.exception?.description || d.text || "?").split("\n")[0]);
  }
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
    const txt = m.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
    if (txt.trim()) errores.push("console.error: " + txt.split("\n")[0].slice(0, 160));
  }
});

const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => { const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
const sleep = (m) => new Promise((s) => setTimeout(s, m));

await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

await send("Page.navigate", { url: APP + "/login" });
await sleep(2500);
await ev(`(() => {
  localStorage.setItem('necto.session', JSON.stringify({ modulos:['pedidos','inventarios'], tipoSesion:'administrador', operadorSimuladoId:null, preSimulacion:null }));
  const c = { whatsapp:false, telegram:false, instagram:false, webchat:false, asistente:false };
  localStorage.setItem('necto.organizacion.v1', JSON.stringify({
    usuario:{nombre:'Vera',email:'demo@necto.io'},
    organizacion:{nombre:'Necto Demo',moneda:'COP',pais:'Colombia',zonaHoraria:'America/Bogota'},
    modulos:{ pedidos:{instalado:true,activo:true,conectores:c}, inventarios:{instalado:true,activo:true,conectores:c} },
  }));
  let actual = {};
  try { actual = JSON.parse(localStorage.getItem('webforge-ui-preferences') || '{}'); } catch (e) {}
  localStorage.setItem('webforge-ui-preferences', JSON.stringify(Object.assign({}, actual, { theme: '${TEMA === "oscuro" ? "dark" : "light"}' })));
  return true;
})()`);

let medidas = 0, fallidas = 0;
for (const ruta of RUTAS) {
  errores = [];
  await send("Page.navigate", { url: APP + "/configuracion" });
  await sleep(1500);
  await send("Page.navigate", { url: APP + ruta });
  await sleep(4200);

  const info = await ev(`(() => {
    const raiz = document.querySelector('main') || document.body;
    const txt = (raiz.innerText || '').trim();
    return JSON.stringify({ largo: txt.length, h1: (document.querySelector('h1')||{}).textContent || '', titulo: document.title });
  })()`);
  const { largo, h1 } = JSON.parse(info);

  if (largo < 80) { console.log("  FALLA  " + ruta + "  contenido visible insuficiente (" + largo + " chars)"); fallidas++; continue; }
  if (errores.length) { console.log("  FALLA  " + ruta + "  " + errores.length + " error(es):\n         · " + errores.join("\n         · ")); fallidas++; continue; }
  medidas++;
  console.log("  OK     " + ruta + "  (" + largo + " chars · «" + h1.slice(0, 42) + "»)");
}

console.log("\n" + "─".repeat(30));
console.log("rutas limpias: " + medidas + " / " + RUTAS.length + " · rutas con falla: " + fallidas);
console.log("fin " + new Date().toLocaleTimeString("es-CO"));

if (medidas === 0) { console.error("NO CONCLUYENTE: no se midió ninguna ruta"); process.exit(6); }
ws.close();
process.exit(fallidas === 0 ? 0 : 1);
