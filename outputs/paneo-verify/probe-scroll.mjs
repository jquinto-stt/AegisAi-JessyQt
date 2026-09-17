// Sonda desechable: ¿el paneo de entrada provoca scroll horizontal de página?
const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://localhost:4173";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const res = await fetch(`${CDP_BASE}/json/list`);
const page = (await res.json()).find((t) => t.type === "page" && !t.url.startsWith("devtools"));
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
await new Promise((r) => ws.addEventListener("open", r));
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res: r } = pending.get(m.id);
    pending.delete(m.id);
    r(m.result);
  }
});
const send = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id;
    pending.set(i, { res: r });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: APP + "/" });
await sleep(1200);
await evaluate(
  `localStorage.removeItem("necto.assistant"); localStorage.setItem("necto.session", JSON.stringify({modulos:["pedidos"],tipoSesion:"administrador",operadorSimuladoId:null,preSimulacion:null})); true`,
);
await send("Page.navigate", { url: APP + "/asistente" });
await sleep(1500);

await evaluate(`(() => {
  window.__ov = { pico: 0, muestras: 0, conScroll: 0 };
  const tick = () => {
    const o = window.__ov;
    const de = document.documentElement;
    const over = de.scrollWidth - de.clientWidth;
    o.muestras++;
    if (over > 0) { o.conScroll++; if (over > o.pico) o.pico = over; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return true;
})()`);

await evaluate(`(() => {
  const ta = document.querySelector('textarea[placeholder="¿Cómo puedo ayudarte?"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  setter.call(ta, "Genera una hoja de cálculo con el top 10 de productos");
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
})()`);
await sleep(150);
await evaluate(
  `(() => { const b = document.querySelector('button[aria-label="Enviar"]'); if (b && !b.disabled) b.click(); return true; })()`,
);

await sleep(120);
const who = await evaluate(`(() => {
  const de = document.documentElement;
  const over = de.scrollWidth - de.clientWidth;
  const out = { overflow: over, culpables: [] };
  if (over > 0) {
    const limite = de.clientWidth;
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.right > limite + 0.5) {
        out.culpables.push({
          tag: el.tagName,
          cls: String(el.className).slice(0, 80),
          right: Math.round(r.right),
          transform: getComputedStyle(el).transform,
        });
      }
    }
    out.culpables = out.culpables.slice(0, 6);
  }
  return out;
})()`);
console.log("AL MONTAR:", JSON.stringify(who, null, 2));

await sleep(1200);
console.log("MUESTREO rAF:", await evaluate(`JSON.stringify(window.__ov)`));
console.log(
  "EN REPOSO:",
  await evaluate(
    `(() => { const de = document.documentElement; return JSON.stringify({ overflow: de.scrollWidth - de.clientWidth, animName: getComputedStyle(document.querySelector("aside.paneo-entrada")).animationName }); })()`,
  ),
);
ws.close();
