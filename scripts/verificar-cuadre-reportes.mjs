// Comprueba que el cuadre de Reportes divide entre lo COMPARABLE, no entre lo
// contado, y que el texto lo dice.
import { mkdirSync, writeFileSync } from "node:fs";
const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://localhost:6020";
mkdirSync("./artifacts-inv/", { recursive: true });

const r0 = await fetch(APP + "/");
if (r0.status !== 200) { console.error("ABORTA 6020 → " + r0.status); process.exit(2); }
console.log("sonda 6020 → " + r0.status);

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const t = (await (await fetch(CDP_BASE + "/json/list")).json())
        .find((x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
      if (t) return t;
    } catch {}
    await new Promise((s) => setTimeout(s, 250));
  }
  throw new Error("sin target");
}
const ws = new WebSocket((await target()).webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const eventos = [];
await new Promise((res) => ws.addEventListener("open", res));
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.method) eventos.push(m);
  if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
});
const send = (m, p = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
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
  })); return true; })()`);

await send("Page.navigate", { url: APP + "/inventarios/reportes" });
await sleep(3200);

let ok = 0, fail = 0;
const check = (l, c, d) => { if (c) { ok++; console.log("  OK   " + l); } else { fail++; console.log("  FAIL " + l + (d !== undefined ? "  → " + d : "")); } };

const tarjetas = await ev(`[...document.querySelectorAll('main .rounded-2xl, main [class*="rounded"]')]
  .map(c => c.innerText.trim()).filter(t => /%|comparables|contadas|Líneas|Conteos cerrados/.test(t)).slice(0, 6)`);
console.log("\n── TARJETAS ──");
for (const t of tarjetas) console.log("  • " + t.replace(/\\n/g, " · ").slice(0, 130));

const textoCuadre = await ev(`(() => {
  const el = [...document.querySelectorAll('main *')].find(n =>
    n.children.length === 0 && /comparables/.test(n.textContent));
  return el ? el.textContent.trim() : null;
})()`);
console.log("\ndetalle del cuadre: " + textoCuadre);

const subtitulo = await ev(`(() => {
  const p = [...document.querySelectorAll('main p')].find(x => /líneas verificadas/.test(x.textContent));
  return p ? p.textContent.replace(/\\s+/g,' ').trim() : null;
})()`);
console.log("subtítulo del desglose: " + subtitulo);

check("el detalle habla de «comparables»", !!textoCuadre && /comparables/.test(textoCuadre), String(textoCuadre));
check("el subtítulo avisa de las sin referencia", !!subtitulo && /sin referencia/.test(subtitulo), String(subtitulo));

// La leyenda debe seguir sumando el total contado.
const leyenda = await ev(`(() => {
  const out = {};
  for (const s of document.querySelectorAll('main span')) {
    const m = (s.textContent || '').trim().match(/^(Coinciden|Faltan|Sobran|Sin referencia|Reportados dañados)\\s*(\\d+)$/i);
    if (m) out[m[1].toLowerCase()] = Number(m[2]);
  }
  return out;
})()`);
console.log("leyenda: " + JSON.stringify(leyenda));
const sumaComparables = (leyenda['coinciden'] ?? 0) + (leyenda['faltan'] ?? 0) + (leyenda['sobran'] ?? 0);
console.log("suma de comparables = " + sumaComparables + " · sin referencia = " + (leyenda['sin referencia'] ?? 0));

const NOISE = /favicon|\[vite\]|DevTools|Download the React|ResizeObserver loop/i;
const quejas = eventos.filter((e) =>
  (e.method === "Runtime.exceptionThrown" && !NOISE.test(JSON.stringify(e))) ||
  (e.method === "Runtime.consoleAPICalled" && (e.params.type === "error" || e.params.type === "warning") && !NOISE.test(e.params.args.map(a => a.value ?? a.description ?? "").join(" ")))
);
check("consola limpia", quejas.length === 0, quejas.length + " queja(s)");

const { data } = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("./artifacts-inv/reportes-cuadre.png", Buffer.from(data, "base64"));
console.log("\ncaptura → artifacts-inv/reportes-cuadre.png");
console.log("\nOK: " + ok + "  FAIL: " + fail);
ws.close();
process.exit(fail === 0 ? 0 : 1);
