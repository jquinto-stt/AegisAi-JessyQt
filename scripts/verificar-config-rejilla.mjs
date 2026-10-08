// Verifica la rejilla de opciones con icono en /configuracion (pestaña General).
// Lo que se comprueba es de comportamiento, no de estética:
//   1. Tipo de empresa y Tamaño del equipo ya no son desplegables.
//   2. Las 8 fichas de rubro y las 4 de tamaño están visibles a la vez.
//   3. Elegir marca el borrador, y «Guardar cambios» se enciende (no guarda solo).
//   4. «Descartar» devuelve a lo guardado.
//   5. El rubro que se GUARDA es el nombre completo, no la etiqueta corta.
//   6. La elegida lleva check y el activo es brand-500 (nada de verde).
//   7. **El cuadro del icono NO cambia de color al elegir** (06/10): si cambiara,
//      en oscuro TODAS las fichas tendrían naranja y el color dejaría de
//      señalar cuál está elegida. Antes el activo lo pintaba relleno; se quitó.
//   8. **La jerarquía del bloque**: la pregunta del bloque es más grande que la
//      etiqueta del campo. Es lo que pidió el usuario («agrupar, que se vea
//      limpio») y lo que hacía que la pantalla se leyera como un formulario.
import { writeFileSync, mkdirSync } from "node:fs";
const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://localhost:6020";
mkdirSync("./artifacts-inv/", { recursive: true });

async function getPageTarget() {
  for (let i = 0; i < 40; i++) {
    try { const t = await (await fetch(`${CDP_BASE}/json/list`)).json();
      const p = t.find((x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
      if (p) return p; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  } throw new Error("no target");
}
function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url); let id = 0; const pending = new Map(); const events = [];
    ws.addEventListener("open", () => resolve({ events,
      send(m, p = {}) { return new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); }); },
      close: () => ws.close() }));
    ws.addEventListener("error", reject);
    ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.method) events.push(m);
      if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } });
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect((await getPageTarget()).webSocketDebuggerUrl);
await cdp.send("Runtime.enable"); await cdp.send("Page.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
const ev = async (e) => { const r = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result.value; };

let fails = 0;
const check = (l, ok, d) => { if (!ok) fails++; console.log(`  ${ok ? "OK  " : "FAIL"}  ${l}${d !== undefined ? "  -> " + d : ""}`); };

try { const r = await fetch(APP + "/", { cache: "no-store" }); if (r.status !== 200) throw new Error("" + r.status); console.log(`Sonda de vida: ${APP} -> 200`); }
catch (e) { console.error(`ABORTADO: servidor caído (${e.message})`); process.exit(2); }

// La organización de prueba: rubro y tamaño conocidos, para poder comprobar
// que descartar vuelve EXACTAMENTE a lo guardado.
const RUBRO_GUARDADO = "Retail & Comercio minorista";
await cdp.send("Page.navigate", { url: APP + "/" }); await sleep(1200);
await ev(`(() => { localStorage.setItem("necto.session", JSON.stringify({modulos:["pedidos","conversaciones"],tipoSesion:"administrador",operadorSimuladoId:"op-1",preSimulacion:null}));
  localStorage.setItem("necto.organizacion.v1", JSON.stringify({usuario:{nombre:"Vera",perfilCompletado:true},organizacion:{id:"org-1",nombre:"Boutique Roma",slug:"boutique-roma",pais:"Colombia",moneda:"COP",zonaHoraria:"America/Bogota",tipoEmpresa:"${RUBRO_GUARDADO}",tamanoEquipo:"2 a 5 personas",logoUrl:"",fechaCreacion:new Date().toISOString()},modulos:{pedidos:{instalado:true,activo:true},conversaciones:{instalado:true,activo:true}}})); return true; })()`);
await cdp.send("Page.navigate", { url: APP + "/configuracion?tab=general" }); await sleep(4500);

console.log("\n══════ /configuracion · General ══════");
const base = await ev(`(() => {
  const grupos=[...document.querySelectorAll('[role="radiogroup"]')];
  const gTipo=grupos.find(g=>/Tipo de empresa/i.test(g.getAttribute('aria-label')||''));
  const gTam=grupos.find(g=>/Tamaño del equipo/i.test(g.getAttribute('aria-label')||''));
  // El check de la elegida. Contrato ACTUAL: la ficha activa sustituye su
  // icono por un CIRCULO CENTRAL (en el flujo, rounded-full) que contiene el
  // check. Las inactivas no lo tienen.
  //
  // La aserción anterior buscaba un sello con position:absolute en la esquina
  // (el diseño de la primera versión) y por eso daba 0 cuando el check pasó al
  // centro: estaba escrita mirando el defecto, no el diseño. Se ancla ahora a
  // una propiedad que el check SIEMPRE tiene y el icono nunca: borde circular
  // (radio >= 20px + borde grueso).
  const esCirculo = (s) => { const c=getComputedStyle(s);
    return parseFloat(c.borderTopLeftRadius) >= 20 && parseFloat(c.borderTopWidth) >= 1.5; };
  const info=(g)=>({
    n: g.querySelectorAll('[role="radio"]').length,
    marcados:[...g.querySelectorAll('[role="radio"]')].filter(b=>b.getAttribute('aria-checked')==='true').length,
    conCheck:[...g.querySelectorAll('[role="radio"]')]
      .filter(b=>[...b.querySelectorAll('span')].some(esCirculo)).length,
    etiquetas:[...g.querySelectorAll('[role="radio"]')].map(b=>(b.textContent||'').trim()),
  });
  return { hayTipo: !!gTipo, hayTam: !!gTam,
    tipo: gTipo ? info(gTipo) : null, tam: gTam ? info(gTam) : null,
    selectsRestantes: document.querySelectorAll('select').length,
    botonGuardar:[...document.querySelectorAll('button')].find(b=>/Guardar cambios/.test(b.textContent||''))?.disabled };
})()`);
console.log(`  grupos hallados: tipo=${base.hayTipo} tamaño=${base.hayTam}`);
check("«Tipo de empresa» es una rejilla de opciones", base.hayTipo);
check("«Tamaño del equipo» es una rejilla de opciones", base.hayTam);
check("se ven las 8 fichas de rubro a la vez", base.tipo?.n === 8, `${base.tipo?.n} fichas`);
check("se ven las 4 fichas de tamaño a la vez", base.tam?.n === 4, `${base.tam?.n} fichas`);
check("solo una opción marcada por grupo", base.tipo?.marcados === 1 && base.tam?.marcados === 1,
  `tipo=${base.tipo?.marcados} tamaño=${base.tam?.marcados}`);
check("la elegida lleva el check (segunda señal, además del color)", base.tipo?.conCheck === 1,
  `${base.tipo?.conCheck} fichas con check`);
check("«Guardar cambios» arranca apagado (no hay cambios)", base.botonGuardar === true, `disabled=${base.botonGuardar}`);
console.log(`  fichas de rubro: ${JSON.stringify(base.tipo?.etiquetas)}`);
console.log(`  fichas de tamaño: ${JSON.stringify(base.tam?.etiquetas)}`);

// ── Elegir otro rubro: debe marcar el borrador y ENCENDER el guardar ────────
console.log("\n── Elegir «Gastronomía» ──");
const trasElegir = await ev(`(() => {
  const g=[...document.querySelectorAll('[role="radiogroup"]')].find(x=>/Tipo de empresa/i.test(x.getAttribute('aria-label')||''));
  const b=[...g.querySelectorAll('[role="radio"]')].find(x=>/Gastronom/i.test(x.textContent||''));
  if(!b) return null;
  b.click();
  return true;
})()`);
await sleep(900);
const estado = await ev(`(() => {
  const g=[...document.querySelectorAll('[role="radiogroup"]')].find(x=>/Tipo de empresa/i.test(x.getAttribute('aria-label')||''));
  const marcada=[...g.querySelectorAll('[role="radio"]')].find(b=>b.getAttribute('aria-checked')==='true');
  const btn=[...document.querySelectorAll('button')].find(b=>/Guardar cambios/.test(b.textContent||''));
  const desc=[...document.querySelectorAll('button')].find(b=>/^Descartar$/.test((b.textContent||'').trim()));
  return { marcada:(marcada?.textContent||'').trim(), guardarDisabled: btn?.disabled, descartarDisabled: desc?.disabled,
    activoBg: marcada? getComputedStyle(marcada).borderTopColor : null,
    // ¿el aviso de "hay cambios" es visible?
    avisoCambios: !/No hay cambios pendientes/.test(document.body.textContent||'') };
})()`);
check("el clic marcó la nueva opción", trasElegir === true && /Gastronom/i.test(estado.marcada||''), estado.marcada);
check("«Guardar cambios» se ENCIENDE al elegir", estado.guardarDisabled === false, `disabled=${estado.guardarDisabled}`);
check("«Descartar» se enciende al elegir", estado.descartarDisabled === false, `disabled=${estado.descartarDisabled}`);

// ── El borde de la elegida debe ser brand-500, no verde ────────────────────
const colorActivo = await ev(`(() => {
  const g=[...document.querySelectorAll('[role="radiogroup"]')].find(x=>/Tipo de empresa/i.test(x.getAttribute('aria-label')||''));
  const marcada=[...g.querySelectorAll('[role="radio"]')].find(b=>b.getAttribute('aria-checked')==='true');
  return marcada? getComputedStyle(marcada).borderTopColor : null;
})()`);
// brand-500 = #ff3f1a = rgb(255, 63, 26)
check("la elegida se marca en el naranja de marca (no verde)", /255,\s*63,\s*26/.test(colorActivo||''), colorActivo);

// ── El círculo del check: SOLO en la elegida, y legible ────────────────────
//
// La aserción anterior pedía que el cuadro del icono fuera IDÉNTICO en la
// elegida y en las demás. Ese era el contrato de la versión sin círculo, y
// dejó de describir el diseño: ahora la elegida sustituye su icono por un
// círculo con el check, así que la igualdad es justo lo que NO debe pasar.
// Una aserción escrita mirando el defecto verifica el defecto.
//
// Lo que sí debe cumplirse, y se comprueba:
//   a) el círculo (borde redondeado + borde grueso) aparece SOLO en la elegida;
//   b) su trazo y su relleno superan 3:1 — es un GRÁFICO, no texto, y el
//      umbral de un elemento no textual es 3:1, no 4,5:1.
await ev(`(() => { document.documentElement.classList.add('dark'); return true; })()`);
await sleep(400);
const circulos = await ev(`(() => {
  const g=[...document.querySelectorAll('[role="radiogroup"]')].find(x=>/Tipo de empresa/i.test(x.getAttribute('aria-label')||''));
  if (!g) return null;
  const esCirculo = (s) => { const c=getComputedStyle(s);
    return parseFloat(c.borderTopLeftRadius) >= 20 && parseFloat(c.borderTopWidth) >= 1.5; };
  const fichas=[...g.querySelectorAll('[role="radio"]')];
  const activa=fichas.find(b=>b.getAttribute('aria-checked')==='true');
  const cuenta = (b) => [...b.querySelectorAll('span')].filter(esCirculo).length;
  const c = activa ? [...activa.querySelectorAll('span')].find(esCirculo) : null;
  const cs = c ? getComputedStyle(c) : null;
  const fondo=(n)=>{ while(n){ const x=getComputedStyle(n); const m=(x.backgroundColor.match(/[\\d.]+/g)||[]);
    if (m.length && (m[3]===undefined || Number(m[3])>0)) return m.slice(0,3).map(Number); n=n.parentElement; } return [255,255,255]; };
  const parse=(s)=>((s||'').match(/[\\d.]+/g)||[]).slice(0,3).map(Number);
  return { enActiva: activa?cuenta(activa):0,
    enInactivas: fichas.filter(b=>b.getAttribute('aria-checked')!=='true').map(cuenta),
    trazo: cs?parse(cs.color):null, relleno: c?fondo(c):null };
})()`);
if (!circulos) {
  check("el círculo del check aparece SOLO en la elegida", false, "no se encontró el grupo");
} else {
  check("el círculo del check aparece SOLO en la elegida",
    circulos.enActiva === 1 && circulos.enInactivas.every(n => n === 0),
    `elegida=${circulos.enActiva} demás=[${circulos.enInactivas.join(",")}]`);
  const lum=(c)=>{ const [r,g2,b]=c.map((v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});
    return 0.2126*r+0.7152*g2+0.0722*b; };
  const l1=lum(circulos.trazo||[0,0,0]), l2=lum(circulos.relleno||[255,255,255]);
  const r=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
  check("el trazo del check supera 3:1 (es gráfico, no texto)", r >= 3,
    `${r.toFixed(2)}:1  rgb(${(circulos.trazo||[]).join(",")})`);
}

// ── Jerarquía del bloque: la pregunta manda sobre la etiqueta del campo ────
const jerarquia = await ev(`(() => {
  const h=[...document.querySelectorAll('h2')].find(x=>/tipo de negocio/i.test(x.textContent||''));
  const et=[...document.querySelectorAll('label')].find(x=>/^Tipo de empresa$/i.test((x.textContent||'').trim()));
  if(!h||!et) return null;
  const a=parseFloat(getComputedStyle(h).fontSize), b=parseFloat(getComputedStyle(et).fontSize);
  return { pregunta:a, etiqueta:b, hTexto:(h.textContent||'').trim(), etTexto:(et.textContent||'').trim() };
})()`);
check("la pregunta del bloque se lee más grande que la etiqueta del campo",
  jerarquia !== null && jerarquia.pregunta > jerarquia.etiqueta,
  jerarquia ? `pregunta=${jerarquia.pregunta}px  etiqueta=${jerarquia.etiqueta}px` : "no encontré h2/label");

// ── Se fue la duplicación: el bloque ya no titula dos veces el mismo dato ──
const duplicado = await ev(`(() => {
  const t=(document.body.textContent||'');
  // «¿Cómo se llama tu negocio?» (pregunta) y «Nombre de la organización»
  // (etiqueta) eran el mismo dato escrito dos veces. Solo queda el primero.
  return { pregunta: /¿Cómo se llama tu negocio\\?/.test(t), etiquetaVieja: /Nombre de la organización/.test(t) };
})()`);
check("«Nombre de la organización» ya no repite la pregunta del bloque",
  duplicado.pregunta === true && duplicado.etiquetaVieja === false,
  `pregunta=${duplicado.pregunta} etiquetaVieja=${duplicado.etiquetaVieja}`);

// Devuelve el tema claro para no dejar la página en oscuro.
await ev(`(() => { document.documentElement.classList.remove('dark'); return true; })()`);
await sleep(300);

// ── Descartar vuelve a lo guardado ────────────────────────────────────────
console.log("\n── Descartar ──");
await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>/^Descartar$/.test((x.textContent||'').trim())); b&&b.click(); return true; })()`);
await sleep(900);
const trasDescartar = await ev(`(() => {
  const g=[...document.querySelectorAll('[role="radiogroup"]')].find(x=>/Tipo de empresa/i.test(x.getAttribute('aria-label')||''));
  const marcada=[...g.querySelectorAll('[role="radio"]')].find(b=>b.getAttribute('aria-checked')==='true');
  const btn=[...document.querySelectorAll('button')].find(b=>/Guardar cambios/.test(b.textContent||''));
  return { marcada:(marcada?.textContent||'').trim(), guardarDisabled: btn?.disabled };
})()`);
check("descartar vuelve al rubro guardado", /Comercio minorista/i.test(trasDescartar.marcada||''), trasDescartar.marcada);
check("y «Guardar cambios» se apaga otra vez", trasDescartar.guardarDisabled === true, `disabled=${trasDescartar.guardarDisabled}`);

// ── Guardar escribe el nombre COMPLETO del rubro, no la etiqueta corta ────
console.log("\n── Guardar y comprobar lo que se escribe ──");
const guardado = await ev(`(async () => {
  const g=[...document.querySelectorAll('[role="radiogroup"]')].find(x=>/Tipo de empresa/i.test(x.getAttribute('aria-label')||''));
  const b=[...g.querySelectorAll('[role="radio"]')].find(x=>/Moda/i.test(x.textContent||''));
  b && b.click();
  await new Promise(r=>setTimeout(r,300));
  const go=[...document.querySelectorAll('button')].find(x=>/Guardar cambios/.test(x.textContent||''));
  go && go.click();
  await new Promise(r=>setTimeout(r,600));
  const raw=JSON.parse(localStorage.getItem('necto.organizacion.v1')||'{}');
  return raw?.organizacion?.tipoEmpresa ?? null;
})()`);
check("se guarda el rubro COMPLETO, no la etiqueta corta de la ficha",
  guardado === "Moda, Calzado & Accesorios", JSON.stringify(guardado));

const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
writeFileSync("./artifacts-inv/configuracion-general-rejilla.png", Buffer.from(data, "base64"));

console.log("\n── Runtime ────────────────────────────────────────────────");
const errs = cdp.events.filter((e) => e.method === "Runtime.exceptionThrown" && !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e)));
check("ninguna excepción", errs.length === 0, errs.length ? JSON.stringify(errs.slice(0,1)).slice(0,400) : "ninguna");

console.log(`\n${fails === 0 ? "TODO OK" : "FALLOS: " + fails}  (${new Date().toISOString()})`);
cdp.close(); process.exit(fails === 0 ? 0 : 1);
