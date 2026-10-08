// Verifica el HUB DE TARJETAS de las tres pantallas de configuración de módulo:
//   /pedidos/config · /conversaciones/config · /asistente/config
//
// Lo que se comprueba es de COMPORTAMIENTO y de contrato, no de estética:
//   1. Sin `?seccion=` se pinta el hub: una tarjeta por sección, con su acción.
//   2. Al pulsar una tarjeta la URL pasa a `?seccion=<clave>` y se entra a la
//      sección — NO se despliega el contenido debajo del hub.
//   3. Dentro hay «Volver a Configuración» y devuelve al hub (URL sin parámetro).
//   4. Un enlace directo con `?seccion=` válido renderiza esa sección directa.
//   5. Un `?seccion=` inventado NO deja la pantalla en blanco: cae al hub.
//   6. El hub no usa el verde #17b363 (verde fuera de la paleta) y el realce es
//      el naranja de marca.
//   7. La tarjeta es un `<button>` (alcanzable por teclado), no un div con clic.
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
const cdp = await connect((await getPageTarget()).webSocketDebuggerUrl);
await cdp.send("Runtime.enable"); await cdp.send("Page.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
const ev = async (e) => {
  const r = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
  return r.result.value;
};

let fails = 0;
const check = (l, ok, d) => { if (!ok) fails++; console.log(`  ${ok ? "OK  " : "FAIL"}  ${l}${d !== undefined ? "  -> " + d : ""}`); };

// ── Sonda de vida ─────────────────────────────────────────────────────────
try {
  const r = await fetch(APP + "/", { cache: "no-store" });
  if (r.status !== 200) throw new Error("" + r.status);
  console.log(`Sonda de vida: ${APP} -> 200`);
} catch (e) { console.error(`ABORTADO: servidor caído (${e.message})`); process.exit(2); }

// Sesión con los módulos y CONECTORES necesarios.
//
// Ojo con la forma: `ModuloGuard` no pregunta «¿está instalado el módulo?» sino
// `organizacionStore.estaActivo(id)`, y ahí `asistente` NO es un módulo sino el
// CONECTOR `necto_ia` de Pedidos, y `conversaciones` el conector `whatsapp`.
// `normalizarModulos` reconstruye el Record entero y es **fail-closed**: todo lo
// que no sea exactamente `true` queda en `false`, y `modulos[id].conectores` es
// un objeto anidado. Una siembra con `modulos:{asistente:{instalado:true}}` —la
// que puse primero— no activa nada: la pantalla redirige a
// `/configuracion?tab=modulos` y el arnés medía esa redirección creyendo medir
// el hub. Es el fallo clásico de arnés: los checks pasan en vacío.
await cdp.send("Page.navigate", { url: APP + "/" }); await sleep(1200);
await ev(`(() => {
  localStorage.setItem("necto.session", JSON.stringify({
    modulos:["pedidos","conversaciones","asistente","inventarios"],
    tipoSesion:"administrador", operadorSimuladoId:"op-1", preSimulacion:null,
  }));
  localStorage.setItem("necto.organizacion.v1", JSON.stringify({
    usuario:{nombre:"Vera",perfilCompletado:true},
    organizacion:{id:"org-1",nombre:"Boutique Roma",slug:"boutique-roma",pais:"Colombia",moneda:"COP",
      zonaHoraria:"America/Bogota",tipoEmpresa:"Retail & Comercio minorista",tamanoEquipo:"2 a 5 personas",
      logoUrl:"",fechaCreacion:new Date().toISOString()},
    modulos:{
      pedidos:{instalado:true,activo:true,conectores:{necto_ia:true,whatsapp:false}},
      conversaciones:{instalado:true,activo:true,conectores:{whatsapp:true,necto_ia:false}},
      inventarios:{instalado:true,activo:true,conectores:{}},
    },
  }));
  return true;
})()`);

/** Las tres pantallas. `secciones` es el nº declarado en su catálogo
 *  (`ORDEN_SECCIONES`): pedidos 5 · conversaciones 4 · asistente 6.
 *
 *  Los dos números que bajaron son DECISIONES, no ajustes:
 *
 *   · conversaciones 8 → 4: se retiraron «Perfil del canal» y «Automatización y
 *     escalado» (ninguna tenía un solo control), «Módulos conectados» (la misma
 *     línea de código que «Módulos integrados» del asistente), «Apariencia»
 *     (preferencia de toda la aplicación) y «Horario de atención» (es del
 *     negocio: se edita en Pedidos). Entró «Atención automática».
 *   · asistente 7 → 6: se retiró su «Apariencia», cuyos tres controles o sobraban
 *     o mentían. La apariencia se administra en `/configuracion → Apariencia`.
 *
 *  Se escriben aquí a propósito —y se comprueban— en vez de solo contar lo que
 *  pinta el DOM: si el hub pintara 5 tarjetas donde el catálogo declara 4, la
 *  aserción «hay 5 tarjetas» estaría de acuerdo con el defecto. El número es la
 *  segunda fuente, independiente de la primera. */
const PANTALLAS = [
  { ruta: "/pedidos/config",         nombre: "Pedidos",        secciones: 5 },
  { ruta: "/conversaciones/config",  nombre: "Conversaciones", secciones: 4 },
  { ruta: "/asistente/config",       nombre: "Asistente",      secciones: 6 },
  // Inventarios entró al hub el 06/10. Antes tenía navegación lateral
  // (`ConfigSectionNav`) y la sección vivía en un `useState`, así que no había
  // pantalla de entrada ni enlace directo a una sección. Se verifica aquí, con
  // el mismo contrato que las otras tres, en vez de darlo por bueno porque
  // `tsc` compila: compilar no dice si el hub se pinta.
  //
  // Su número pasó de 4 a 5 el 07/10 con el rediseño retail
  // (`pages/inventarios/ConfigPage.tsx` declara alertas · general · codigos ·
  // categorias · ajustes). Esta línea la mantiene otra sesión: si su catálogo
  // crece y este número no, la guarda mide el defecto en vez de cazarlo.
  { ruta: "/inventarios/config",     nombre: "Inventarios",    secciones: 5 },
];

for (const p of PANTALLAS) {
  console.log(`\n══════ ${p.ruta} ══════`);

  // ── 1 · Vista raíz: el hub ────────────────────────────────────────────────
  await cdp.send("Page.navigate", { url: APP + p.ruta }); await sleep(4200);

  // SONDA DE VIDA, antes de cualquier aserción: ¿seguimos en la pantalla que
  // creemos? Una guarda de módulo o de permiso redirige a otra ruta, y entonces
  // todas las comprobaciones siguientes miden ESA página y pasan o fallan por
  // motivos ajenos al hub. Sin esto, el arnés informa de la pantalla equivocada.
  const aterrizaje = await ev(`(() => location.pathname + location.search)()`);
  if (aterrizaje !== p.ruta) {
    check(`la pantalla responde en ${p.ruta} (sin redirección de guarda)`, false,
      `aterrizó en ${aterrizaje}`);
    continue;
  }

  const hub = await ev(`(() => {
    const t = [...document.querySelectorAll('button')].filter(b => /Entrar a configurar/i.test(b.textContent||''));
    const caja = t[0];
    const cs = caja ? getComputedStyle(caja) : null;
    return {
      tarjetas: t.length,
      // Cada tarjeta tiene su rótulo de acción.
      conAccion: t.filter(b => /Entrar a configurar/.test(b.textContent||'')).length,
      // La tarjeta debe ser un CONTROL, no un div con onClick.
      esBoton: t.every(b => b.tagName === 'BUTTON'),
      // ¿Cuadrícula? El contenedor de las tarjetas debe exponer grid.
      contenedorGrid: caja ? getComputedStyle(caja.parentElement.parentElement).display : null,
      radio: cs ? cs.borderTopLeftRadius : null,
      bordeAncho: cs ? cs.borderTopWidth : null,
      // El realce NO puede ser el verde retirado de la paleta.
      hexVerde: /17b363/i.test(caja ? caja.outerHTML : ''),
      // Ni el fondo del icono puede llevar el verde.
      iconoVerde: [...document.querySelectorAll('span svg')].some(s => /17b363/i.test((s.closest('span')||{}).outerHTML||'')),
      // El hub NO debe montar el panel de una sección a la vez.
      tieneVolver: [...document.querySelectorAll('button')].some(b => /Volver a Configuración/i.test(b.textContent||'')),
    };
  })()`);

  check(`el hub pinta ${p.secciones} tarjetas de sección`, hub.tarjetas === p.secciones, `${hub.tarjetas} tarjetas`);
  check("cada tarjeta tiene su enlace «Entrar a configurar»", hub.conAccion === p.secciones, `${hub.conAccion}`);
  check("la tarjeta es un <button> (alcanzable por teclado)", hub.esBoton === true);
  check("las tarjetas van en cuadrícula", hub.contenedorGrid === "grid", hub.contenedorGrid);
  check("la tarjeta es prominente (radio 3xl = 24px)", hub.radio === "24px", hub.radio);
  check("la tarjeta lleva borde de 2px", hub.bordeAncho === "2px", hub.bordeAncho);
  check("el realce NO usa el verde #17b363 (fuera de la paleta)", hub.hexVerde === false);
  check("el icono NO usa el verde #17b363", hub.iconoVerde === false);
  check("el hub NO muestra el «Volver» (no es una sección)", hub.tieneVolver === false);

  // ── 2 · Pulsar la primera tarjeta: entra a la sección ─────────────────────
  const primera = await ev(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => /Entrar a configurar/i.test(x.textContent||''));
    if (!b) return null;
    b.click();
    return true;
  })()`);
  await sleep(1400);

  const dentro = await ev(`(() => {
    const url = location.pathname + location.search;
    const volver = [...document.querySelectorAll('button')].find(b => /Volver a Configuración/i.test(b.textContent||''));
    return {
      url,
      tieneParametro: /[?&]seccion=/.test(url),
      tieneVolver: !!volver,
      // NO debe seguir habiendo 5-8 tarjetas de hub a la vez que la sección.
      tarjetasHub: [...document.querySelectorAll('button')].filter(b => /Entrar a configurar/i.test(b.textContent||'')).length,
    };
  })()`);

  check("pulsar la tarjeta añade `?seccion=` a la URL", dentro.tieneParametro === true, dentro.url);
  check("entra a la sección a PANTALLA COMPLETA (el hub desaparece)", dentro.tarjetasHub === 0, `${dentro.tarjetasHub} tarjetas quedaron`);
  check("dentro aparece «Volver a Configuración»", dentro.tieneVolver === true);

  // ── 3 · Volver devuelve al hub ────────────────────────────────────────────
  await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>/Volver a Configuración/i.test(x.textContent||'')); b&&b.click(); return true; })()`);
  await sleep(1400);
  const vuelta = await ev(`(() => ({
    url: location.pathname + location.search,
    tarjetas: [...document.querySelectorAll('button')].filter(b => /Entrar a configurar/i.test(b.textContent||'')).length,
  }))()`);
  check("«Volver» quita el parámetro y vuelve al hub",
    vuelta.tarjetas === p.secciones && !/[?&]seccion=/.test(vuelta.url),
    `${vuelta.tarjetas} tarjetas · ${vuelta.url}`);

  // ── 4 · Enlace directo con ?seccion= ──────────────────────────────────────
  const clave = await ev(`(() => {
    // La clave real de la primera sección, leída del DOM tras pulsarla, no
    // escrita a mano: una clave inventada probaría otra cosa.
    const b = [...document.querySelectorAll('button')].find(x => /Entrar a configurar/i.test(x.textContent||''));
    return b ? (b.textContent||'').trim().slice(0,40) : null;
  })()`);
  // Se obtiene la clave navegando una vez y leyendo la URL resultante.
  await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>/Entrar a configurar/i.test(x.textContent||'')); b&&b.click(); return true; })()`);
  await sleep(1300);
  const claveReal = await ev(`(() => { const m=location.search.match(/[?&]seccion=([A-Za-z0-9_-]+)/); return m?m[1]:null; })()`);
  check("la sección tiene una clave estable en la URL", typeof claveReal === "string" && claveReal.length > 0, claveReal);

  // Recarga DIRECTA a esa URL: debe renderizar la sección, con su «Volver».
  await cdp.send("Page.navigate", { url: APP + p.ruta + "?seccion=" + claveReal }); await sleep(4200);
  const directo = await ev(`(() => ({
    tarjetasHub: [...document.querySelectorAll('button')].filter(b => /Entrar a configurar/i.test(b.textContent||'')).length,
    tieneVolver: [...document.querySelectorAll('button')].some(b => /Volver a Configuración/i.test(b.textContent||'')),
    url: location.pathname + location.search,
  }))()`);
  check("un enlace directo con `?seccion=` abre ESA sección",
    directo.tieneVolver === true && directo.tarjetasHub === 0,
    `${directo.url} · volver=${directo.tieneVolver}`);

  // ── 5 · Parámetro inventado: no puede dejar la pantalla en blanco ─────────
  await cdp.send("Page.navigate", { url: APP + p.ruta + "?seccion=no_existe_esta_seccion" }); await sleep(4200);
  const invalido = await ev(`(() => ({
    tarjetas: [...document.querySelectorAll('button')].filter(b => /Entrar a configurar/i.test(b.textContent||'')).length,
    texto: (document.body.innerText||'').trim().length,
  }))()`);
  check("un `?seccion=` inventado cae al hub (no deja la pantalla en blanco)",
    invalido.tarjetas === p.secciones && invalido.texto > 200,
    `${invalido.tarjetas} tarjetas · ${invalido.texto} chars`);
}

// ── 6 · Contraste de los textos del hub, en los DOS temas ──────────────────
//
// El requisito de calidad de la spec incluye «accesibilidad», y accesibilidad
// sin medir el contraste no es nada. Este bloque existe por un defecto REAL: el
// enlace «Entrar a configurar» se pintó en `brand-500` sobre blanco, que mide
// **3,51:1** — por debajo de 4,5:1 para texto normal (la etiqueta es
// `text-sm font-semibold`, no cuenta como texto grande). Se corrigió a
// `brand-700` en claro y `brand-400` en oscuro; esto lo fija.
//
// Se mide el color COMPUTADO y el fondo EFECTIVO (subiendo al primer ancestro
// con fondo no transparente). Medir la clase declarada miente: el mismo
// `text-brand-500` da 3,51:1 sobre blanco y 5,24:1 sobre la tarjeta oscura.
for (const [tema, dir] of [["claro", "light"], ["oscuro", "dark"]]) {
  await cdp.send("Page.navigate", { url: APP + "/conversaciones/config" }); await sleep(4200);
  await ev(`(() => { document.documentElement.classList.toggle('dark', ${dir === "dark"});
    document.documentElement.setAttribute('data-theme', '${dir}');
    try { localStorage.setItem('necto.theme', '${dir}'); } catch(e) {} return true; })()`);
  await sleep(800);

  const pares = await ev(`(() => {
    const parse = (s) => { const m = (s||'').match(/[\\d.]+/g); return m ? m.slice(0,3).map(Number) : null; };
    const fondoDe = (el) => { let n = el;
      while (n) { const cs = getComputedStyle(n);
        const c = parse(cs.backgroundColor);
        const a = (cs.backgroundColor.match(/[\\d.]+/g)||[])[3];
        if (c && (a === undefined || Number(a) > 0)) return c;
        n = n.parentElement; }
      return [255,255,255]; };
    const b = [...document.querySelectorAll('button')].find(x => /Entrar a configurar/i.test(x.textContent||''));
    if (!b) return null;
    const spans = [...b.querySelectorAll('span')];
    const titulo = spans.find(s => /font-bold/.test(s.className));
    const accion = spans.find(s => /Entrar a configurar/.test(s.textContent||''));
    const desc = spans.find(s => /text-sm/.test(s.className)
      && !/font-bold/.test(s.className) && !/Entrar a configurar/.test(s.textContent||''));
    const tomar = (el) => el ? { c: parse(getComputedStyle(el).color), f: fondoDe(el) } : null;
    return JSON.stringify({ titulo: tomar(titulo), desc: tomar(desc), accion: tomar(accion) });
  })()`);

  if (!pares) { check(`contraste del hub en ${tema}`, false, "no se encontró la tarjeta"); continue; }
  const o = JSON.parse(pares);
  const lum = (c) => { const [r, g, bl] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
  for (const [k, v] of Object.entries(o)) {
    if (!v || !v.c) { check(`contraste ${k} en ${tema}`, false, "elemento no encontrado"); continue; }
    const l1 = lum(v.c), l2 = lum(v.f);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    check(`contraste ${k} en ${tema} >= 4.5:1`, ratio >= 4.5, `${ratio.toFixed(2)}:1`);
  }
}

// ── Captura del hub y de una sección, en los dos temas ─────────────────────
for (const [tema, dir] of [["claro", "light"], ["oscuro", "dark"]]) {
  await cdp.send("Page.navigate", { url: APP + "/conversaciones/config" }); await sleep(4200);
  await ev(`(() => { document.documentElement.classList.toggle('dark', ${dir === "dark"});
    document.documentElement.setAttribute('data-theme', '${dir}');
    try { localStorage.setItem('necto.theme', '${dir}'); } catch(e) {} return true; })()`);
  await sleep(800);
  // Recorte a la zona del hub, en coordenadas de DOCUMENTO (ver REFERENCIA).
  const caja = await ev(`(() => {
    const b=[...document.querySelectorAll('button')].find(x=>/Entrar a configurar/i.test(x.textContent||''));
    if(!b) return null;
    const lista=b.closest('ul');
    const r=(lista||b).getBoundingClientRect();
    let sc=0,n=(lista||b).parentElement;
    while(n){ if(n.scrollTop){sc=n.scrollTop;break;} n=n.parentElement; }
    return JSON.stringify({x:Math.max(0,Math.round(r.left)-16),y:Math.max(0,Math.round(r.top))+sc+ -0,
      w:Math.round(r.width)+32,h:Math.round(r.height)+32});
  })()`);
  if (!caja) { console.log(`  (sin hub para capturar en ${tema})`); continue; }
  const b = JSON.parse(caja);
  if (![b.x,b.y,b.w,b.h].every(Number.isFinite) || b.w < 50 || b.h < 50) {
    console.log(`  rect inválido en ${tema}:`, caja); continue;
  }
  const { data } = await cdp.send("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true,
    clip: { x: b.x, y: b.y, width: b.w, height: b.h, scale: 1 },
  });
  writeFileSync(`./artifacts-inv/hub-conversaciones-${tema}.png`, Buffer.from(data, "base64"));
  console.log(`  capturada: hub-conversaciones-${tema}.png (${b.w}x${b.h})`);
}

// ── 7 · ESTÁNDAR DE ANCHO: las cuatro pantallas miden lo mismo ─────────────
//
// El usuario fijó el 06/10 que las tarjetas de configuración deben compartir un
// estándar. El arnés recorrió este mismo terreno al revés —probé `auto-fit`, que
// dejaba `/configuracion` en 510px y los módulos en 333px— así que la aserción
// se escribe para cazar exactamente esa divergencia.
//
// Se mide el ANCHO REAL de la tarjeta en las cuatro pantallas (incluida
// `/configuracion`, que no está en `PANTALLAS` porque su hub tiene 2 tarjetas y
// no tiene guarda de módulo) y se exige que coincidan.
console.log("\n══════ estándar de ancho · las 4 pantallas ══════");
const RUTAS_ANCHO = [
  ["/configuracion", "configuracion"],
  ...PANTALLAS.map((p) => [p.ruta, p.nombre.toLowerCase()]),
];
const anchos = [];
for (const [ruta, nombre] of RUTAS_ANCHO) {
  await cdp.send("Page.navigate", { url: APP + ruta }); await sleep(4200);
  const m = await ev(`(() => {
    const b=[...document.querySelectorAll('button')].find(x=>/Entrar a configurar/i.test(x.textContent||''));
    if(!b) return null;
    const r=b.getBoundingClientRect();
    const ul=b.closest('ul');
    const cu=getComputedStyle(ul).gridTemplateColumns.split(' ').filter(Boolean).length;
    return JSON.stringify({ ruta: location.pathname, ancho: Math.round(r.width),
      alto: Math.round(r.height), columnas: cu });
  })()`);
  if (!m) { check(`el hub de ${ruta} responde`, false, "sin tarjetas"); continue; }
  anchos.push(JSON.parse(m));
}
for (const a of anchos) {
  console.log(`  ${a.ruta.padEnd(24)} ancho=${a.ancho}px  alto=${a.alto}px  columnas=${a.columnas}`);
}
const setAnchos = [...new Set(anchos.map((a) => a.ancho))];
// ── Se agrupan por Nº DE TARJETAS, no se exige un ancho único ───────────────
//
// `ConfigHub` dimensiona la cuadrícula según el nº de tarjetas: con 2 tarjetas
// (`/configuracion`) usa `max-w-2xl` a 2 columnas; con más, `lg:grid-cols-3
// xl:grid-cols-4` a ancho completo. El ancho de tarjeta DIVERGE a propósito
// entre los dos grupos —un hub de 2 tarjetas a 242px dejaría media pantalla
// vacía— así que exigir un ancho único era una expectativa previa al rediseño
// del 06/10, no un contrato. Lo que sí es contrato: que todas las pantallas del
// MISMO tamaño compartan ancho exacto. Si divergen dentro de un grupo, es que
// alguien tocó una y no las otras.
const porTarjetas = new Map();
for (const a of anchos) {
  if (!porTarjetas.has(a.columnas)) porTarjetas.set(a.columnas, []);
  porTarjetas.get(a.columnas).push(a);
}
for (const [columnas, grupo] of [...porTarjetas.entries()].sort((x, y) => x[0] - y[0])) {
  const set = [...new Set(grupo.map((a) => a.ancho))];
  check(`las ${grupo.length} pantallas de ${columnas} columnas comparten ancho`,
    set.length === 1,
    set.length === 1
      ? `todas ${set[0]}px · ${grupo.map((a) => a.ruta).join(", ")}`
      : `divergen dentro del grupo: ${JSON.stringify(set)} · ${grupo.map((a) => a.ruta).join(", ")}`);
}
// Y se deja constancia de que la divergencia entre grupos es la esperada: 2
// columnas para el hub corto, 4 para los módulos. Escrito como aserción, para
// que si el hub de 2 tarjetas se pasara a 4 columnas o al revés, se sepa.
// ── Tres grupos, uno por nº de tarjetas (07/10) ─────────────────────────────
//
// `ConfigHub` dimensiona la cuadrícula según el nº de tarjetas: 2 → 2 columnas,
// 3 → 3, y de 4 en adelante → 3/4. La aserción exigía "2,4" mientras
// `/configuracion` tenía dos tarjetas; el 07/10 le entró «Apariencia» y pasó a
// tres, así que HOY solo hay dos tamaños en uso: 3 (`/configuracion`) y 4 (las
// cuatro pantallas de módulo). Un FAIL aquí con "2" en la lista significaría que
// alguien volvió a dejar un hub con dos tarjetas; con un 5, que una pantalla
// creció sin que nadie lo decidiera.
check("los hubs van a 3 y 4 columnas (ya no queda ninguno de 2 tarjetas)",
  [...porTarjetas.keys()].sort((a, b) => a - b).join(",") === "3,4",
  `columnas observadas: ${[...porTarjetas.keys()].sort((a, b) => a - b).join(", ")}`);
check("ninguna pantalla de módulo se quedó sin cuadrícula",
  anchos.length === RUTAS_ANCHO.length, `${anchos.length}/${RUTAS_ANCHO.length} medidas`);

console.log("\n── Runtime ────────────────────────────────────────────────");
const errs = cdp.events.filter((e) => e.method === "Runtime.exceptionThrown"
  && !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e)));
check("ninguna excepción", errs.length === 0, errs.length ? JSON.stringify(errs.slice(0,1)).slice(0,400) : "ninguna");

console.log(`\n${fails === 0 ? "TODO OK" : "FALLOS: " + fails}  (${new Date().toISOString()})`);
cdp.close();
process.exit(fails === 0 ? 0 : 1);
