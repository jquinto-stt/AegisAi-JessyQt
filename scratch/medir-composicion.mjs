/**
 * Sondeo de COMPOSICIÓN de /pedidos/display.
 *
 * Responde cuatro preguntas que las capturas no pueden responder solas:
 *   1. La escalera de superficies, con el color COMPUESTO (no el declarado).
 *   2. El borde real de la tarjeta protagonista — la captura lo veía naranja y
 *      el código dice `border-white/10`; una de las dos miente.
 *   3. Cuánto hueco muerto deja el panel de la cola.
 *   4. Cuánto hueco muerto deja la caja de la comanda (ancho de la caja contra
 *      ancho de su contenido).
 */
const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://127.0.0.1:6020";

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${CDP_BASE}/json/list`);
      const t = (await r.json()).find(
        (x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools")
      );
      if (t) return t;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("sin target CDP");
}

const objetivo = await target();
const ws = new WebSocket(objetivo.webSocketDebuggerUrl);
let id = 0;
const pend = new Map();
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) {
    const { res, rej } = pend.get(m.id);
    pend.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
  }
});
await new Promise((r) => ws.addEventListener("open", r));
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    pend.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  mobile: false,
});

const evaluar = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const SONDA = `(() => {
  // Compone un color con alfa sobre su padre, subiendo por el arbol hasta dar
  // con una superficie opaca. Es la unica forma de saber QUE se ve.
  const parse = (c) => {
    const m = c.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(/[,\\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const sobre = (frente, fondo) => ({
    r: frente.r * frente.a + fondo.r * (1 - frente.a),
    g: frente.g * frente.a + fondo.g * (1 - frente.a),
    b: frente.b * frente.a + fondo.b * (1 - frente.a),
    a: 1,
  });
  const compuesto = (el) => {
    const capas = [];
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) { capas.push(c); if (c.a === 1) break; }
    }
    let acc = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = capas.length - 1; i >= 0; i--) acc = sobre(capas[i], acc);
    return 'rgb(' + Math.round(acc.r) + ',' + Math.round(acc.g) + ',' + Math.round(acc.b) + ')';
  };
  const rgb = (c) => { const p = parse(c); return p ? 'rgb(' + p.r + ',' + p.g + ',' + p.b + ')' : c; };
  const desc = (el) => el ? el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 46) : '(nada)';
  const caja = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };

  const raiz = document.querySelector('#root > div') || document.body.firstElementChild;
  const cabecera = document.querySelector('header');
  const seccion = document.querySelector('main > section');
  const tarjeta = seccion && seccion.firstElementChild;
  const panel = document.querySelector('aside');
  const lista = panel && panel.querySelector('.necto-escalonado');
  const filas = lista ? [...lista.children] : [];
  const comanda = [...document.querySelectorAll('main div')].find(
    (d) => /Detalle de la comanda/i.test(d.textContent || '') && d.className.includes('rounded-2xl')
  );

  const escalera = [
    ['lienzo', raiz],
    ['cabecera', cabecera],
    ['tarjeta', tarjeta],
    ['panel cola', panel],
    ['fila cola 1', filas[0]],
    ['comanda', comanda],
  ].filter(([, el]) => el).map(([nombre, el]) => {
    const cs = getComputedStyle(el);
    return {
      nombre,
      el: desc(el),
      fondo: compuesto(el),
      borde: cs.borderTopWidth === '0px' ? 'sin borde' : rgb(cs.borderTopColor) + ' ' + cs.borderTopWidth,
      sombra: cs.boxShadow === 'none' ? 'sin sombra' : cs.boxShadow.slice(0, 60),
      radio: cs.borderTopLeftRadius,
      caja: caja(el),
    };
  });

  // Hueco muerto del panel de la cola: desde el fin de la ultima fila hasta el
  // inicio del pie de sincronizacion.
  let huecoCola = null;
  if (panel && lista && filas.length) {
    const finFilas = filas[filas.length - 1].getBoundingClientRect().bottom;
    const pie = panel.lastElementChild.getBoundingClientRect();
    const rPanel = panel.getBoundingClientRect();
    huecoCola = {
      altoPanel: Math.round(rPanel.height),
      finUltimaFila: Math.round(finFilas),
      inicioPie: Math.round(pie.top),
      hueco: Math.round(pie.top - finFilas),
      pct: Math.round(((pie.top - finFilas) / rPanel.height) * 100),
    };
  }

  // La comanda: ya no es una caja, así que no se mide «caja contra contenido».
  // Se mide el bloque real —etiqueta + fichas— y cuánto ocupan las fichas.
  let comandaFichas = null;
  const bloqueComanda = [...document.querySelectorAll('main div')].find(
    (d) =>
      /Detalle de la comanda/i.test(d.textContent || '') &&
      d.className.includes('flex-col') &&
      d.className.includes('items-center')
  );
  if (bloqueComanda) {
    const cont = bloqueComanda.lastElementChild;
    const hijos = [...cont.children];
    const suma = hijos.reduce((a, c) => a + c.getBoundingClientRect().width, 0);
    const rb = bloqueComanda.getBoundingClientRect();
    comandaFichas = {
      fichas: hijos.length,
      anchoFichas: Math.round(suma),
      anchoBloque: Math.round(rb.width),
      altoBloque: Math.round(rb.height),
    };
  }

  return {
    escalera,
    huecoCola,
    comandaFichas,
    alturaCabecera: cabecera ? Math.round(cabecera.getBoundingClientRect().height) : null,
    filas: filas.length,
    heroePresente: !!(seccion && /Avanzar a/i.test(seccion.textContent || '')),
  };
})()`;

for (const [etiqueta, url] of [
  ["PROTAGONISTA (hay pedido)", APP + "/pedidos/display"],
  ["VACÍO (soloListos=1)", APP + "/pedidos/display?soloListos=1"],
]) {
  await send("Page.navigate", { url });
  for (let i = 0; i < 60; i++) {
    if (await evaluar(`!!document.querySelector('header')`).catch(() => false)) break;
    await dormir(300);
  }
  await dormir(1400); // deja pasar el destello de 900 ms
  console.log("\n═══════ " + etiqueta + " ═══════");
  console.log(JSON.stringify(await evaluar(SONDA), null, 1));
}

ws.close();
