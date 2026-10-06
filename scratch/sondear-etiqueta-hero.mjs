// Sonda: ¿de dónde saca el protagonista su etiqueta de estado?
// Objetivo — encontrar (a) el número protagonista, (b) su píldora de estado y
// (c) la píldora de estado de la fila de la cola con ese mismo número, para
// poder exigir que digan lo mismo.
const APP = "http://127.0.0.1:6020";
const CDP = "http://127.0.0.1:9333";

async function targets() {
  const r = await fetch(CDP + "/json/list");
  return r.json();
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pend = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) {
      const { resolve, reject } = pend.get(m.id);
      pend.delete(m.id);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
    }
  });
  const ready = new Promise((res) => ws.addEventListener("open", res));
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const i = ++id;
      pend.set(i, { resolve, reject });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  return { ready, send, close: () => ws.close() };
}

const list = await targets();
let page = list.find((t) => t.type === "page" && t.url.startsWith(APP));
if (!page) {
  const nuevo = await fetch(CDP + "/json/new?" + encodeURIComponent(APP + "/pedidos/display"), {
    method: "PUT",
  });
  page = await nuevo.json();
}
const cdp = connect(page.webSocketDebuggerUrl);
await cdp.ready;
await cdp.send("Runtime.enable");
await cdp.send("Page.enable");

const evaluate = async (expr) => {
  const r = await cdp.send("Runtime.evaluate", {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
};

await cdp.send("Page.navigate", { url: APP + "/pedidos/display" });
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 400));
  const ok = await evaluate(`!!document.querySelector('main')`);
  if (ok) break;
}
await new Promise((r) => setTimeout(r, 2600));

const out = await evaluate(`(() => {
  const texto = (n) => (n.textContent || '').trim().replace(/\\s+/g, ' ');
  const esPildora = (s) => /uppercase/.test(s.className || '') && /rounded-full/.test(s.className || '');

  const spans = [...document.querySelectorAll('span')];
  const nums = spans
    .map((s) => ({ t: texto(s), size: parseFloat(getComputedStyle(s).fontSize) || 0 }))
    .filter((s) => /^[A-Z]{2,}-[0-9]+$/.test(s.t))
    .sort((a, b) => b.size - a.size);

  const main = document.querySelector('main');
  const seccion = main.querySelector('section');
  const aside = main.querySelector('aside');

  const pildoraDe = (raiz) =>
    [...raiz.querySelectorAll('span')].filter(esPildora).map((s) => texto(s));

  // Las filas de la cola: el contenedor que lleva el número y un botón.
  const filas = [...aside.querySelectorAll('button, [role=button], li, div')]
    .filter((n) => /^[A-Z]{2,}-[0-9]+/.test(texto(n)))
    .map((n) => ({
      tag: n.tagName.toLowerCase(),
      cls: (n.className || '').toString().slice(0, 90),
      numero: (texto(n).match(/^[A-Z]{2,}-[0-9]+/) || [''])[0],
      pildoras: pildoraDe(n).slice(0, 3),
      largo: texto(n).length,
    }));

  return {
    numeros: nums.slice(0, 4),
    pildorasHeroe: seccion ? pildoraDe(seccion).slice(0, 4) : null,
    filas: filas.slice(0, 8),
    filasTotal: filas.length,
  };
})()`);

console.log(JSON.stringify(out, null, 2));
cdp.close();
