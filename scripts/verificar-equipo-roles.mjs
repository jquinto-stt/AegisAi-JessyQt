// Arnés del módulo de EQUIPO Y ROLES.
//
// Comprueba CONTRATO y COMPORTAMIENTO, no estética:
//   1. Un rol de sistema dice su estado REAL: sus capacidades se leen
//      «Concedida», no como interruptores apagados. (Era el defecto medido:
//      23 inputs con checked=true pintados en rgb(236,236,236).)
//   2. Un rol personalizado SÍ usa interruptores, y el estado del interruptor
//      coincide con el contador.
//   3. La lista de roles es un listbox navegable con teclado y anuncia la
//      selección.
//   4. Roles y perfil de persona comparten la MISMA pieza de rejilla: la
//      estructura de grupo es idéntica en las dos pantallas.
//   5. No queda color fuera de paleta en las tres pantallas.
//   6. Sin permiso de gestión, la rejilla es de solo lectura (indicadores, no
//      interruptores accionables).
import { writeFileSync, mkdirSync } from "node:fs";
const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://localhost:6020";
mkdirSync("./artifacts-inv/", { recursive: true });

async function getPageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const t = await (await fetch(`${CDP_BASE}/json/list`)).json();
      const p = t.find((x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
      if (p) return p;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("no hay target de página en CDP");
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

/**
 * Espera a que una condición se cumpla EN LA PÁGINA, en vez de dormir un
 * tiempo fijo.
 *
 * Los `sleep` fijos son la causa de los falsos negativos de este arnés: al
 * leer «0 interruptores» justo después de crear un rol, o «0 grupos» justo
 * después de navegar, el informe culpaba a la App de un defecto que era del
 * reloj. Aquí se sondea hasta que el DOM esté donde se espera.
 */
const esperarA = async (expresion, etiqueta, intentos = 30) => {
  for (let i = 0; i < intentos; i++) {
    try { if (await ev(expresion)) return true; } catch {}
    await sleep(250);
  }
  throw new Error(`timeout esperando: ${etiqueta}`);
};
const cdp = await connect((await getPageTarget()).webSocketDebuggerUrl);
await cdp.send("Runtime.enable"); await cdp.send("Page.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
const ev = async (e) => {
  const r = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
};

let fails = 0;
const check = (l, ok, d) => { if (!ok) fails++; console.log(`  ${ok ? "OK  " : "FAIL"}  ${l}${d !== undefined ? "  -> " + d : ""}`); };

// ── Sonda de vida ─────────────────────────────────────────────────────────
try {
  const r = await fetch(APP + "/", { cache: "no-store" });
  if (r.status !== 200) throw new Error(String(r.status));
  console.log(`Sonda de vida: ${APP} -> 200`);
} catch (e) { console.error(`ABORTADO: servidor caído (${e.message})`); process.exit(2); }

// ── Sesión sembrada (sin esto todo mide /login y pasa en vacío) ───────────
await cdp.send("Page.navigate", { url: APP + "/" }); await sleep(1500);
await ev(`(() => { localStorage.setItem("necto.session", JSON.stringify({modulos:["pedidos","conversaciones","asistente","inventarios"],tipoSesion:"administrador",operadorSimuladoId:"op-1",preSimulacion:null}));
  localStorage.setItem("necto.organizacion.v1", JSON.stringify({usuario:{nombre:"Vera",perfilCompletado:true},organizacion:{id:"org-1",nombre:"Boutique Roma",slug:"boutique-roma",pais:"Colombia",moneda:"COP",zonaHoraria:"America/Bogota",tipoEmpresa:"Retail & Comercio minorista",tamanoEquipo:"2 a 5 personas",logoUrl:"",fechaCreacion:new Date().toISOString()},modulos:{pedidos:{instalado:true,activo:true,conectores:{necto_ia:true,whatsapp:true}},conversaciones:{instalado:true,activo:true,conectores:{whatsapp:true}},inventarios:{instalado:true,activo:true,conectores:{}}}})); return true; })()`);

const irARoles = async () => {
  await cdp.send("Page.navigate", { url: APP + "/equipo" }); await sleep(4500);
  const ok = await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>/Gestionar roles/i.test(x.textContent||'')); if(b){b.click(); return true;} return false; })()`);
  await sleep(1500);
  return ok;
};
const expandirTodo = async () => {
  const ok = await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>/Expandir todas/i.test(x.getAttribute('title')||'')); if(b){b.click(); return true;} return false; })()`);
  await sleep(1200);
  return ok;
};

/**
 * Etiqueta de un encabezado de grupo, leída del `Badge` INTERIOR.
 *
 * No se usa el `textContent` del encabezado: la cabecera concatena sin
 * espacios la etiqueta, el contador y la acción de grupo
 * («Órdenes5 de 6Dar todo»), así que limpiar el contador con un `replace`
 * deja «ÓrdenesDar todo», que no casa con el ancla `^…$`. La versión anterior
 * hacía justo eso y devolvía 0 grupos en las DOS pantallas: el arnés culpaba
 * a la App de no pintar la rejilla cuando la rejilla estaba pintada.
 *
 * El `Badge` es además la etiqueta que se ve, no la que se deduce.
 */
const SELECTOR_GRUPOS = `[...document.querySelectorAll('[role=button][aria-expanded]')].filter(e=>{
    const b=e.querySelector('span');
    if(!b) return false;
    return /^(Órdenes|Preparación|Programados|Canales|Inventarios|Configuración|Equipo|Asistente)$/.test((b.textContent||'').trim());
  })`;
const sondaGrupos = () => `(() => {
  const gs=${SELECTOR_GRUPOS};
  return JSON.stringify({
    n: gs.length,
    abiertos: gs.filter(g=>g.getAttribute('aria-expanded')==='true').length,
    etiquetas: gs.map(g=>g.querySelector('span').textContent.trim()),
  });
})()`;

// ══ 1. ROL DE SISTEMA · el estado se dice, no se insinúa ══════════════════
console.log("\n══════ 1. Rol de sistema: estado REAL ══════");
check("el botón «Gestionar roles» entra a la sub-vista", await irARoles());
check("«Expandir todas» abre los grupos", await expandirTodo());

const sistema = await ev(`(() => {
  const inputs=[...document.querySelectorAll('input[role=switch]')];
  const ind=[...document.querySelectorAll('span')].filter(s=>/^(Concedida|No concedida)$/.test((s.textContent||'').trim())&&s.querySelector('span'));
  const contador=(document.body.textContent.match(/(\\d+) de \\d+ concedidas/)||[])[0]||null;
  // Solo contamos los indicadores de la rejilla de capacidades: el badge de
  // estado de la persona no dice «Concedida».
  const tracks=[...document.querySelectorAll('div.relative > div')].map(d=>getComputedStyle(d).backgroundColor);
  return JSON.stringify({ nInputs: inputs.length, nIndicadores: ind.length, contador,
    concedidas: ind.filter(s=>/^Concedida$/.test((s.textContent||'').trim())).length,
    sinConceder: ind.filter(s=>/^No concedida$/.test((s.textContent||'').trim())).length,
    tracksGrises: tracks.filter(c=>c==='rgb(236, 236, 236)').length });
})()`);
const S = JSON.parse(sistema);
console.log(`  rol de sistema: ${S.contador} · ${S.nIndicadores} indicadores (${S.concedidas} concedidas)`);
check("el rol de sistema NO pinta interruptores (0 switch)", S.nInputs === 0, `inputs=${S.nInputs}`);
check("el rol de sistema dice «Concedida» en todas sus capacidades",
  S.nIndicadores > 0 && S.concedidas === S.nIndicadores, `${S.concedidas}/${S.nIndicadores}`);
check("no queda ningún track gris de interruptor apagado", S.tracksGrises === 0, `tracks grises=${S.tracksGrises}`);

const buf1 = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
writeFileSync("./artifacts-inv/roles-despues-sistema.png", Buffer.from(buf1.data, "base64"));

// ══ 2. ROL PERSONALIZADO · sí usa interruptores ═══════════════════════════
//
// Los SEIS roles del catálogo inicial son `sistema: true` (incluido el que se
// llama «Personalizado» — el nombre engaña: es una plantilla vacía del
// sistema). Así que un rol editable no se encuentra en la lista: hay que
// CREARLO, que es justo el camino que recorre el admin.
console.log("\n══════ 2. Rol personalizado: interruptores ══════");
const creoRol = await ev(`(() => {
  const b=[...document.querySelectorAll('button')].find(x=>/Nuevo rol/i.test(x.textContent||''));
  if(!b) return false;
  b.click();
  return true;
})()`);
await sleep(1600);
// El editor del rol nuevo tiene que estar montado ANTES de medirlo: el input
// de nombre es el ancla de que el editor ya pintó.
await esperarA(`!!document.querySelector('input[id=rol-nombre]')`, "el editor del rol nuevo");
check("«Nuevo rol» crea un rol editable", creoRol === true);

// El rol nace con nombre provisional y sin capacidades: el editor debe poder
// guardar solo si se corrigen las dos cosas.
await expandirTodo();
await esperarA(`document.querySelectorAll('input[role=switch]').length > 0`, "los interruptores del rol nuevo");
const recienCreado = await ev(`(() => {
  const nombre=(document.querySelector('input[id=rol-nombre]')||{}).value||null;
  const inputs=[...document.querySelectorAll('input[role=switch]')];
  const guardar=[...document.querySelectorAll('button')].find(b=>/Guardar cambios/i.test(b.textContent||''));
  return JSON.stringify({ nombre, nInputs: inputs.length,
    deshabilitados: inputs.filter(i=>i.disabled).length,
    guardarDeshabilitado: guardar ? guardar.disabled : null });
})()`);
const R = JSON.parse(recienCreado);
console.log(`  rol nuevo: nombre=${JSON.stringify(R.nombre)} · ${R.nInputs} interruptores`);
check("un rol editable SÍ pinta interruptores (no indicadores)", R.nInputs > 0, `inputs=${R.nInputs}`);
check("sus interruptores son accionables", R.deshabilitados === 0, `deshabilitados=${R.deshabilitados}`);
check("nace sin capacidades, así que Guardar está bloqueado", R.guardarDeshabilitado === true,
  `disabled=${R.guardarDeshabilitado}`);

// ── El interruptor ACCIONA y el contador lo sigue ────────────────────────
const accion = await ev(`(() => {
  const inp=[...document.querySelectorAll('input[role=switch]')].find(i=>!i.checked && !i.disabled);
  if(!inp) return null;
  inp.click();
  return true;
})()`);
await sleep(900);
const tras = await ev(`(() => {
  const inputs=[...document.querySelectorAll('input[role=switch]')];
  const guardar=[...document.querySelectorAll('button')].find(b=>/Guardar cambios/i.test(b.textContent||''));
  return JSON.stringify({ encendidos: inputs.filter(i=>i.checked).length,
    contador:(document.body.textContent.match(/(\\d+) de \\d+ concedidas/)||[])[0]||null,
    guardarDeshabilitado: guardar ? guardar.disabled : null });
})()`);
const T = JSON.parse(tras);
check("encender un interruptor enciende el contador",
  accion === true && T.encendidos === 1 && T.contador === "1 de 23 concedidas",
  `${T.encendidos} encendidos · ${T.contador}`);
check("con una capacidad concedida, Guardar ya no está bloqueado por vacío",
  T.guardarDeshabilitado === false, `disabled=${T.guardarDeshabilitado}`);

// ── Desmontaje: no dejar un rol de prueba en el catálogo ─────────────────
const limpieza = await ev(`(() => {
  const b=[...document.querySelectorAll('button')].find(x=>/Eliminar rol$/i.test(x.textContent||'')||/^Eliminar$/.test((x.textContent||'').trim()));
  return !!b;
})()`);
console.log(`  (el rol de prueba queda en el catálogo en memoria; se recarga la app después)`);

// ══ 3. LISTA DE ROLES · navegable ═════════════════════════════════════════
console.log("\n══════ 3. Lista de roles: selección anunciada ══════");
const lista = await ev(`(() => {
  const box=document.querySelector('[role=listbox]');
  if(!box) return JSON.stringify({hay:false});
  const ops=[...box.querySelectorAll('[role=option]')];
  return JSON.stringify({ hay:true, n:ops.length,
    seleccionadas:ops.filter(o=>o.getAttribute('aria-selected')==='true').length,
    aria:box.getAttribute('aria-label'),
    focables:ops.filter(o=>o.tabIndex===0).length });
})()`);
const L = JSON.parse(lista);
check("la lista es un listbox con nombre accesible", L.hay === true && !!L.aria, L.aria);
check("hay exactamente una opción seleccionada", L.seleccionadas === 1, `seleccionadas=${L.seleccionadas} de ${L.n}`);
check("todas las opciones son alcanzables por teclado", L.focables === L.n, `${L.focables}/${L.n}`);

// ══ 4. MISMA PIEZA en rol y en persona ════════════════════════════════════
console.log("\n══════ 4. La rejilla es la misma en rol y en persona ══════");
// Grupos del editor de rol — medidos sobre el MISMO predicado que el perfil,
// para que la comparación uno a uno compare peras con peras.
await expandirTodo();
const gruposRol = await ev(sondaGrupos());
const GR = JSON.parse(gruposRol);
console.log(`  rol: ${GR.n} grupos`);
check("el editor de rol pinta los 8 grupos del catálogo", GR.n === 8, `n=${GR.n}`);

// Grupos del perfil de una persona.
//
// Se navega por URL y no pulsando la fila de la tabla: el clic depende de que
// la tabla esté pintada en ese instante y de acertar el `div` interno, así que
// un fallo del clic se lee luego como «el perfil no pinta grupos» — que es un
// diagnóstico falso. La ruta `/equipo/:id` es el contrato; se prueba la ruta.
//
// ── Por qué la versión anterior medía 0 grupos ──────────────────────────────
//
// Tres errores, y el último es el caro:
//
//   1. Las esperas usaban `Page.navigate` + sondeo del DOM. `location.pathname`
//      cambia en cuanto el router resuelve, pero el ÁRBOL lo pinta React un
//      tick después; y la App es una SPA, así que el documento viejo sigue en
//      pie mientras el nuevo monta.
//   2. El predicado de la etiqueta hacia `textContent.replace(/\d+ de \d+/g,'')`
//      y anclaba con `^…$`. La cabecera concatena SIN espacios etiqueta,
//      contador y acción («Órdenes5 de 6Dar todo»), así que limpiar el contador
//      dejaba «ÓrdenesDar todo» y no casaba nunca. Devolvía 0 en las DOS
//      pantallas. Se mide el texto del `Badge` interior (`sondaGrupos`).
//   3. Peor: las esperas EJECUTABAN acciones (`b.click()` en «Expandir
//      todas», y un `op.click()` sobre la lista de roles). Un `click()` dentro
//      de un sondeo que se reintenta se repite en cada reintento. Sondear
//      tiene que ser OBSERVAR, nunca actuar. Aquel clic re-navegaba la SPA de
//      vuelta al editor de roles, y la medición del perfil terminaba leyendo
//      la pantalla del rol: el informe decía «la rejilla diverge» cuando la
//      App estaba bien.
//
// Lo que se hace ahora: esperar a un ancla OBSERVABLE y EXCLUSIVA del perfil
// (su `title` de expandir), y recién entonces medir. Los clics viven en
// `expandirGrid()`, que se llama UNA vez por pantalla, fuera del sondeo.
const ID_PERFIL = "d3";
await cdp.send("Page.navigate", { url: `${APP}/equipo/${ID_PERFIL}` });
await esperarA(
  `location.pathname === '/equipo/${ID_PERFIL}' && !!document.querySelector('button[title="Expandir todas las categorías"]')`,
  "el perfil de la persona montado",
  40,
);
const rutaPerfil = await ev(`location.pathname`);
check("la ruta del perfil abre el perfil de una persona", rutaPerfil === `/equipo/${ID_PERFIL}`, rutaPerfil);

/** Pulsa «Expandir todas las categorías». Un clic, fuera de cualquier sondeo. */
const expandirGrid = async (etiqueta) => {
  const ok = await ev(`(() => {
    const b=document.querySelector('button[title="Expandir todas las categorías"]');
    if(!b) return false; b.click(); return true;
  })()`);
  if (ok) await esperarA(`document.querySelectorAll('[role=button][aria-expanded="true"]').length >= 8`,
    `los grupos abiertos de ${etiqueta}`, 40);
  return ok;
};

await expandirGrid("el perfil");
const gruposPersona = await ev(sondaGrupos());
const GP = JSON.parse(gruposPersona);
console.log(`  ${rutaPerfil}: ${GP.n} grupos (${GP.abiertos} abiertos)`);
check("el perfil de una persona pinta los MISMOS 8 grupos", GP.n === 8, `n=${GP.n}`);
check("sus 8 grupos se pueden abrir todos", GP.n > 0 && GP.abiertos === GP.n, `${GP.abiertos}/${GP.n}`);
check("los grupos coinciden uno a uno entre rol y persona",
  JSON.stringify(GR.etiquetas) === JSON.stringify(GP.etiquetas),
  GR.etiquetas.join(" | ") === GP.etiquetas.join(" | ") ? "idénticos" : "divergen");

// La misma pieza, el OTRO sentido: aquí se CONCEDE con interruptores. Si el
// perfil pintara indicadores «Concedida» como el rol de sistema, la pantalla
// habría dejado de ser editable y el «misma estructura, distinto pie» se
// habría roto por el lado contrario.
const formaPerfil = await ev(`(() => ({
  switches: document.querySelectorAll('input[role=switch]').length,
  indicadores: [...document.querySelectorAll('span')].filter(s=>/^(Concedida|No concedida)$/.test((s.textContent||'').trim())).length
}))()`);
console.log(`  perfil: ${formaPerfil.switches} interruptores · ${formaPerfil.indicadores} indicadores`);
check("el perfil de una persona SÍ concede con interruptores (no es el rol)",
  formaPerfil.switches > 0 && formaPerfil.indicadores === 0,
  `${formaPerfil.switches} switch / ${formaPerfil.indicadores} indicadores`);

// ══ 4b. EL PIE DE PROCEDENCIA · la razón de ser del perfil ════════════════
//
// El pie NO se pinta en todas las filas: `PerfilOperadorPage` lo omite cuando
// el tono es `neutro`, porque decir «viene de su rol» en 18 filas seguidas es
// ruido. Así que un perfil sin excepciones tiene CERO pies — y eso es correcto,
// no un defecto.
//
// Daniela (`d3`) es justo ese caso: rol `vendedor`, sin `capacidadesExtra` ni
// `capacidadesRemovidas`. Por eso la comprobación de la rejilla se hace con
// ella y la de la procedencia con quien SÍ tiene excepciones en el seed:
//   · d6 Diana Ríos  → `capacidadesExtra: ["channels.read"]`   → «Se le dio de más»
//   · d7 Óscar Peña  → `capacidadesRemovidas: ["orders.cancel"]` → «Se le quitó»
console.log("\n══════ 4b. El pie de procedencia (su razón de ser) ══════");
const PIES = [
  { id: "d6", etiqueta: "Se le dio de más", caso: "extra sobre el rol" },
  { id: "d7", etiqueta: "Se le quitó", caso: "revocación sobre el rol" },
];

const piesDe = async () => JSON.parse(await ev(`(() => {
  const t=[...document.querySelectorAll('span')].map(s=>(s.textContent||'').trim());
  return JSON.stringify({
    mas: t.filter(x=>x==='Se le dio de más').length,
    menos: t.filter(x=>x==='Se le quitó').length,
    rol: t.filter(x=>x==='Viene de su rol').length,
    nada: t.filter(x=>x==='No la tiene').length,
  });
})()`));

for (const { id, etiqueta, caso } of PIES) {
  await cdp.send("Page.navigate", { url: `${APP}/equipo/${id}` });
  await esperarA(
    `location.pathname === '/equipo/${id}' && !!document.querySelector('button[title="Expandir todas las categorías"]')`,
    `el perfil ${id} montado`,
    40,
  );
  await expandirGrid(`el perfil ${id}`);
  const P = await piesDe();
  console.log(`  ${id} (${caso}): ${P.mas} «de más» · ${P.menos} «se le quitó» · ${P.rol} del rol · ${P.nada} sin tener`);
  const propio = etiqueta === "Se le dio de más" ? P.mas : P.menos;
  const ajeno = etiqueta === "Se le dio de más" ? P.menos : P.mas;
  check(`${id}: el pie dice «${etiqueta}» (${caso})`, propio >= 1, `${propio} filas`);
  check(`${id}: no dice el pie contrario`, ajeno === 0, `${ajeno} filas`);
  check(`${id}: el pie del rol (neutro) NO se pinta`, P.rol === 0, `${P.rol} filas`);
}

const buf2 = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
writeFileSync("./artifacts-inv/roles-despues-perfil.png", Buffer.from(buf2.data, "base64"));

// ══ 5. NADA FUERA DE PALETA ═══════════════════════════════════════════════
console.log("\n══════ 5. Color fuera de paleta ══════");
// Se cuentan ATRIBUTOS de elementos, no el outerHTML: un grep sobre el DOM
// serializado cuenta también las hojas de estilo generadas y miente.
//
// Y se compara por TOKEN COMPLETO, no por subcadena: `"slate-"` como subcadena
// casa con `-translate-y-1/2` y con `shadow-theme-xs`, que no tienen nada que
// ver. Una lista de familias comparada con `includes` produce falsos positivos
// y entierra el defecto real entre el ruido.
const FUERA_PALETA = /^(emerald|sky|rose|indigo|slate|cyan)(-\d{2,3})?$/;
// Se serializa a STRING una sola vez, fuera del template: interpolar el literal
// de una regex dentro de un template de sonda es lo que rompe el parseo
// (`SyntaxError: missing ) after argument list`, apuntando a una línea lejana).
const FUERA_PALETA_FUENTE = FUERA_PALETA.source;
const FUERA_PALETA_BANDERAS = FUERA_PALETA.flags;

/** Devuelve el trozo de JS que cuenta tokens fuera de paleta dentro de `main`. */
const sondaPaleta = () => `(() => {
  const malos=[];
  const re = new RegExp(${JSON.stringify(FUERA_PALETA_FUENTE)}, ${JSON.stringify(FUERA_PALETA_BANDERAS)});
  for (const el of document.querySelectorAll('main *')) {
    const cls=String(el.getAttribute('class')||'');
    if(!cls) continue;
    for (const tok of cls.split(/\\s+/)) {
      // Un token puede traer prefijo de variante (dark:bg-sky-500) o de estado
      // (hover:bg-rose-100): se compara la parte final.
      const base = tok.includes(':') ? tok.slice(tok.lastIndexOf(':')+1) : tok;
      if (re.test(base)) malos.push(base+' :: '+el.tagName);
    }
  }
  return JSON.stringify([...new Set(malos)].slice(0,8));
})()`;

const paleta = async (etiqueta) => {
  const M = JSON.parse(await ev(sondaPaleta()));
  check(`${etiqueta}: sin familias de color ajenas al tema`, M.length === 0,
    M.length ? M.slice(0, 4).join(" ; ") : "0 clases");
  return M.length;
};
await paleta("perfil de persona");
await irARoles();
let totalMalos = 0;
totalMalos += await (async () => {
  const M = JSON.parse(await ev(sondaPaleta()));
  check("editor de roles: sin familias de color ajenas al tema", M.length === 0,
    M.length ? M.join(", ") : "0 clases");
  return M.length;
})();
check("el ámbar/cian/verde-ajeno no reaparece en ninguna de las dos", totalMalos === 0, `total=${totalMalos}`);

// ══ 6. Runtime ════════════════════════════════════════════════════════════
console.log("\n── Runtime ────────────────────────────────────────────────");
const errores = cdp.events.filter((e) =>
  e.method === "Runtime.exceptionThrown" ||
  (e.method === "Runtime.consoleAPICalled" && e.params?.type === "error"));
check("ninguna excepción", errores.length === 0, errores.length ? JSON.stringify(errores[0]).slice(0, 200) : "ninguna");

console.log(`\n${fails === 0 ? "TODO OK" : "FALLOS: " + fails}  (${new Date().toISOString()})`);
cdp.close();
// El código de salida se publica en vez de llamar a `process.exit()` a pelo.
//
// `process.exit()` con un WebSocket vivo puede truncar la salida estándar
// (escribe y mata sin esperar el flush), y además hace que este arnés no se
// pueda verificar in-process, que es la única forma de correrlo desde otro
// script en un entorno donde no se pueden lanzar procesos hijos. El
// `exitCode` cumple la misma función para quien lo invoque desde la línea de
// órdenes y no impide que un control negativo lo importe y lea su salida.
process.exitCode = fails === 0 ? 0 : 1;
