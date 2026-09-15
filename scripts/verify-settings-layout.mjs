/**
 * Guarda de la pantalla de Configuración de sede — modal con navegación vertical.
 *
 * Fija las tres invariantes del modal. Las tres se rompieron ya una vez, así que
 * cada una está atada a una clase concreta:
 *
 *   1. **Una sola navegación.** El modal monta su propio `aside` con las seis
 *      secciones y el overlay **cubre todo el viewport** (`inset-0`, sin
 *      `xl:left-[290px]`). Si deja ver el sidebar de la app, sus atajos
 *      "Canales de entrada" y "Asistente de WhatsApp IA" se pintan a la vez que las
 *      mismas entradas de esta navegación: dos columnas listando lo mismo.
 *   2. **El header del shell no tapa los ajustes.** El header es `z-99999`; con
 *      el overlay por debajo (`z-[9999]`), la barra de búsqueda se pintaba
 *      *sobre* los ajustes y ocultaba su título.
 *   3. **El contenido no se descuadra.** El bloque vive en un `main` que ocupa
 *      el ancho restante, con `max-w-4xl mx-auto`. Cuando el `main` medía 829 px
 *      (menos que los 896 del formulario) su `mx-auto` no centraba nada:
 *      contenido pegado a la izquierda, hueco a la derecha.
 *
 * Uso: con dev server + Chrome headless --remote-debugging-port=9222 vivos,
 *   node scripts/verify-settings-layout.mjs
 */
const CDP = "http://127.0.0.1:9222";
const APP = process.env.NECTO_APP_URL || "http://localhost:5174";
const { writeFileSync, mkdirSync } = await import("node:fs");
mkdirSync("./artifacts", { recursive: true });

const page = await (async () => {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${CDP}/json/list`);
      const all = await r.json();
      const t = all.find(x => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
      if (t) return t;
    } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error("no page target");
})();

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const exceptions = [];
await new Promise((res, rej) => {
  ws.addEventListener("open", res);
  ws.addEventListener("error", rej);
  ws.addEventListener("message", ev => {
    const m = JSON.parse(ev.data);
    if (m.method === "Runtime.exceptionThrown") {
      const d = m.params.exceptionDetails?.exception?.description || JSON.stringify(m.params);
      if (!/favicon|\[vite\]|DevTools|ResizeObserver/.test(d)) exceptions.push(d);
    }
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    }
  });
});
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const mid = ++id;
    pending.set(mid, { res, rej });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
const evaluate = async expr => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval failed");
  return r.result.value;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const settle = async (timeout = 25000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const ok = await evaluate(`
        document.readyState === 'complete'
        && !!document.querySelector('header')
        && document.body.innerText.trim().length > 50`);
      if (ok) { await sleep(400); return true; }
    } catch {}
    await sleep(250);
  }
  return false;
};

await send("Runtime.enable");
await send("Page.enable");
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

let fails = 0;
const check = (label, ok, detail) => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  :: " + detail : ""}`);
};
const shot = async name => {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`./artifacts/${name}`, Buffer.from(data, "base64"));
};

await send("Page.navigate", { url: APP });
await sleep(2500);
await evaluate(`
  localStorage.clear();
  localStorage.setItem('necto_businesses', JSON.stringify([
    { id:'biz-a', name:'Ferretería & Suministros La Tuerca', businessType:'retail_store',
      city:'Medellín', country:'Colombia', currency:'COP', code:'SUC-01', slug:'la-tuerca',
      address:'Carrera 43A # 1-50', openingDays:'Lunes a sábado', openingHours:'10:00 - 22:00',
      activeModules:['pedidos','inventarios'], channels:{whatsapp:true,web:true,pos:true},
      iconKey:'store', createdAt:new Date().toISOString() }]));
  localStorage.setItem('necto_active_business_id','biz-a');
  localStorage.setItem('webforge-ui-preferences', JSON.stringify({ theme:'light' }));
  true;`);

const DIALOG = `document.getElementById('business-settings-title').closest('[role=dialog]')`;
// El header del shell es el primero del documento que NO vive dentro del modal
// (el modal también tiene un `<header>` en su columna de navegación).
const SHELL_HEADER = `[...document.querySelectorAll('header')].find(x => !${DIALOG}.contains(x))`;

// El modal tarda en montar y su localizador **no es null-safe**: es
// `getElementById(...).closest(...)`, así que consultarlo antes de tiempo no
// devuelve `null`, **lanza** — y `evaluate` propaga la excepción, matando el
// arnés con un rojo que no señala ningún defecto del producto.
//
// ⚠️ Por eso el sondeo NO puede usar `DIALOG`: sondear con la misma expresión que
// no es null-safe reproduce exactamente el crash que pretende evitar. Se sondea
// el elemento por su id (`getElementById` devuelve `null`, no lanza) y sólo
// después se evalúa `DIALOG`, que ya es seguro.
const esperarAjustes = async (intentos = 40) => {
  for (let i = 0; i < intentos; i++) {
    if (await evaluate(`!!document.getElementById('business-settings-title')`)) return true;
    await sleep(300);
  }
  return false;
};

await send("Page.navigate", { url: `${APP}/app?section=configuracion` });
await settle();
await esperarAjustes();
check("los ajustes de sede se abren", await evaluate(`!!${DIALOG}`));

// ── 1 · Una sola navegación: la del modal, con el sidebar de la app tapado ──
const nav = await evaluate(`
  (() => { const d = ${DIALOG};
    const a = d && d.querySelector('aside');
    if (!a) return null;
    return { buttons: [...a.querySelectorAll('nav button')].map(b => b.textContent.trim()) }; })()
`);
check("el modal monta la navegación lateral con las 6 secciones",
  !!nav && nav.buttons.length === 6, nav ? JSON.stringify(nav.buttons) : "sin aside");

const LAYERS = `
  (() => { const d = ${DIALOG};
    const h = ${SHELL_HEADER};
    const z = el => el ? parseInt(getComputedStyle(el).zIndex, 10) || 0 : 0;
    const t = document.getElementById('business-settings-title');
    const r = t.getBoundingClientRect();
    const top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    // (150,400) cae sobre el sidebar de la app cuando el overlay NO lo tapa.
    const overSidebar = document.elementFromPoint(150, 400);
    return { dialogZ: z(d), headerZ: z(h),
             topmostIsSettings: !!(top && d.contains(top)),
             sidebarCovered: !!(overSidebar && d.contains(overSidebar)),
             topmost: top ? top.tagName.toLowerCase() + '.' + String(top.className).slice(0, 40) : null }; })()`;
const layers = await evaluate(LAYERS);
check("el overlay queda por encima del header del shell",
  layers.dialogZ > layers.headerZ, `overlay=${layers.dialogZ} header=${layers.headerZ}`);
check("nada del shell se pinta sobre el título de los ajustes",
  layers.topmostIsSettings === true, `arriba hay: ${layers.topmost}`);
check("el sidebar de la app no asoma (no hay una segunda navegación)",
  layers.sidebarCovered === true);

// ── 2 · El contenido está centrado y con ancho de diseño ──────────────────
// La referencia es el **padding box del `main`** (que tiene scroll propio y
// reserva el ancho de su scrollbar), no el viewport.
const measure = () => evaluate(`
  (() => { const d = ${DIALOG};
    const main = d.querySelector('main');
    const block = main.firstElementChild;
    const mb = main.getBoundingClientRect();
    const innerLeft = mb.left;
    const innerRight = mb.left + main.clientWidth;
    const b = block.getBoundingClientRect();
    return { width: Math.round(b.width), mainWidth: main.clientWidth,
             left: Math.round(b.left - innerLeft), right: Math.round(innerRight - b.right) }; })()
`);
const geo = await measure();
check("el contenido se centra en el panel (márgenes simétricos)",
  Math.abs(geo.left - geo.right) <= 2, `izq=${geo.left} der=${geo.right}`);
check("el bloque de contenido alcanza el ancho de diseño (max-w-4xl = 896)",
  geo.width >= 880, `width=${geo.width}`);
check("el panel de contenido tiene ancho suficiente (no se descuadra)",
  geo.mainWidth > 900, `main=${geo.mainWidth}`);

// ── 3 · Las seis secciones renderizan, sin excepciones ────────────────────
const content = () => evaluate(`(() => { const d = ${DIALOG}; const m = d && d.querySelector('main'); return m ? m.innerText : null; })()`);
const newExceptions = () => exceptions.length;
const clickTab = label => evaluate(`
  (() => { const d = ${DIALOG};
    const nav = d && d.querySelectorAll('nav button');
    const b = nav && [...nav].find(x => x.textContent.trim() === ${JSON.stringify(label)});
    if (!b) return null; b.click(); return b.textContent.trim(); })()
`);

let prev = "";
for (const t of ["General", "Canales de entrada", "Asistente de WhatsApp IA", "Pagos", "Marca y visual", "Operaciones"]) {
  const before = newExceptions();
  const clicked = await clickTab(t);
  await sleep(700);
  const text = (await content()) || "";
  check(`[${t}] renderiza contenido propio`, clicked !== null && text.length > 100, `len=${text.length}`);
  check(`[${t}] sin excepciones`, newExceptions() === before);
  if (t !== "General") check(`[${t}] el contenido cambia`, text !== prev);
  prev = text;
  await shot(`sede-restored-${t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")}.png`);
}

// ── 4 · Sub-navegación del asistente: rejilla, sin scroll horizontal ──────
// ⚠️ Antes era una fila de píldoras con `overflow-x-auto` que pedía ~940 px
// para 832 disponibles: salía barra horizontal y "Horarios"/"Experiencia"
// quedaban fuera de vista. `scrollWidth > clientWidth` lo delata, y el
// `getBoundingClientRect` de cada botón dice qué quedaba recortado.
const SUB_NAV = `[role=tablist][aria-label="Apartados del asistente"]`;
await clickTab("Asistente de WhatsApp IA");
await sleep(700);
const sub = await evaluate(`
  (() => { const d = ${DIALOG};
    const list = d.querySelector('${SUB_NAV}');
    if (!list) return null;
    const lb = list.getBoundingClientRect();
    const btns = [...list.querySelectorAll('button[role=tab]')];
    return { count: btns.length,
             scrollsX: list.scrollWidth > list.clientWidth + 1,
             clipped: btns.filter(b => { const r = b.getBoundingClientRect();
               return r.right > lb.right + 1 || r.left < lb.left - 1; }).length,
             truncated: btns.map(b => b.querySelector('span'))
               .filter(s => s && s.scrollWidth > s.clientWidth + 1)
               .map(s => s.textContent.trim()),
             labels: btns.map(b => b.textContent.trim()) }; })()
`);
check("el asistente lista los 6 apartados en su sub-navegación",
  !!sub && sub.count === 6, sub ? JSON.stringify(sub.labels) : "sin sub-navegación");
check("la sub-navegación NO tiene scroll horizontal",
  !!sub && sub.scrollsX === false);
check("ningún apartado queda fuera de la barra",
  !!sub && sub.clipped === 0, sub ? `recortados=${sub.clipped}` : "-");
check("ninguna etiqueta de apartado queda truncada",
  !!sub && sub.truncated.length === 0, sub ? JSON.stringify(sub.truncated) : "-");
await shot("sede-restored-asistente-subnav.png");

// ── 5 · Anchos grandes: el descuadre se veía sobre todo aquí ──────────────
await send("Emulation.setDeviceMetricsOverride", { width: 2040, height: 1000, deviceScaleFactor: 1, mobile: false });
await sleep(600);
const wideLayers = await evaluate(LAYERS);
const wide = await measure();
check("a 2040 px el sidebar de la app sigue tapado", wideLayers.sidebarCovered === true);
check("a 2040 px el contenido sigue centrado",
  Math.abs(wide.left - wide.right) <= 2, `izq=${wide.left} der=${wide.right} w=${wide.width}`);
await shot("sede-restored-2040.png");

// ── 6 · Panel de WhatsApp empotrado en la sección: hero de dos columnas ──
// El panel dejó de ser una tarjeta con la lista de requisitos, y después dejó de
// ser un sub-modal: ahora es la presentación del canal **dentro** de Canales de
// Entrada, visible sin pulsar nada. Se mide la rejilla del propio panel (no un
// diálogo), una sola cabecera, y el color: `bg-whatsapp-900` sólo pinta si el
// token existe — un color inventado sería un no-op silencioso y el panel saldría
// transparente, con el mismo aspecto que "sin fondo".
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await sleep(400);
await clickTab("Canales de entrada");
await sleep(700);
// El panel ya NO vive en un sub-modal: está empotrado en la sección. Se comprueba
// que aparece **sin pulsar nada** y que no hay diálogo propio — si volviera a
// haberlo, la sección quedaría otra vez vacía de contenido hasta hacer clic.
const inline = await evaluate(`
  (() => { const d = ${DIALOG};
    const t = document.getElementById('whatsapp-connect-title');
    return { hay: !!t, dentro: !!t && d.contains(t),
             subModal: !!document.querySelector('[aria-labelledby="whatsapp-connect-title"]') }; })()
`);
check("el panel de conexión está empotrado en la sección, sin sub-modal",
  inline.hay === true && inline.dentro === true && inline.subModal === false,
  `visible=${inline.hay} dentroDeAjustes=${inline.dentro} subModal=${inline.subModal}`);
await sleep(300);

// El panel es su propia raíz de dos columnas (`div.grid`), no un `[role=dialog]`.
const WA = `document.getElementById('whatsapp-connect-title')?.closest('div.grid')`;
const hero = await evaluate(`
  (() => { const d = ${WA};
    if (!d) return null;
    const hexToRgb = h => { h = h.trim().replace('#','');
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      return 'rgb(' + parseInt(h.slice(0,2),16) + ', ' + parseInt(h.slice(2,4),16) + ', ' + parseInt(h.slice(4,6),16) + ')'; };
    const token = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue('--color-whatsapp-900'));
    const token500 = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue('--color-whatsapp-500'));
    // Aquí 'd' ES la raíz del panel (la rejilla), así que las columnas son sus
    // hijas directas. Cuando vivía en el sub-modal, 'd' era el overlay
    // (fixed inset-0, 1425 px) y había que bajar dos niveles hasta el panel.
    const panel = d;
    const cols = [...d.children];
    const green = cols.find(c => getComputedStyle(c).backgroundColor === token);
    // ⚠️ "El único SVG que no es un icono de lucide" era **falso**, y la aserción
    // medía otro elemento: el wallpaper también es un <svg> sin clase lucide y se
    // pinta ANTES que la ilustración, así que querySelector devolvía el patrón
    // (383 px = justo el ancho del panel verde) y la comprobación pasaba **aunque
    // la ilustración no existiera**. El rótulo del canal mete además un glifo de
    // 16 px. La ilustración es el mayor de los que no son el wallpaper.
    const noLucide = [...d.querySelectorAll('svg:not([class*="lucide"])')];
    const svg = noLucide
      .filter(s => !s.querySelector('pattern'))
      .sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
    const cta = [...d.querySelectorAll('button')].find(b => /Conectar/.test(b.textContent));
    const link = d.querySelector('a[href="/ayuda"]');
    const l0 = cols[0] ? cols[0].getBoundingClientRect() : null;
    const lg = green ? green.getBoundingClientRect() : null;
    // Patrón de garabatos: si 'fill="url(#…)"' no resuelve a un <pattern> que
    // exista, el fondo sale LISO y sin error — el fallo más silencioso de todos,
    // porque un panel verde liso parece una decisión de diseño.
    const patRect = d.querySelector('rect[fill^="url(#"]');
    const patId = patRect ? patRect.getAttribute('fill').slice(5, -1) : null;
    const pat = patId ? document.getElementById(patId) : null;
    // Firma de la integración. Se mide dentro del lockup, no en todo el panel: la
    // ilustración también tiene trazos con el fill del canal (la cola de la
    // burbuja saliente), así que un selector global daría por bueno el logotipo
    // sin que exista.
    const lock = green ? green.querySelector('[aria-label="Necto con WhatsApp"]') : null;
    const lockImg = lock ? lock.querySelector('img[src*="necto"]') : null;
    // El color RESUELTO de cada trazo: un token que no exista deja el fill
    // inválido y el logotipo se pinta NEGRO sin lanzar ningún error.
    const lockFills = lock ? [...lock.querySelectorAll('path')].map(p => getComputedStyle(p).fill) : [];
    const brand = {
      necto: !!lockImg,
      nectoWidth: lockImg ? Math.round(lockImg.getBoundingClientRect().width) : 0,
      cross: green ? green.textContent.indexOf("\u00D7") !== -1 : false,
      bubble: lockFills.indexOf(token500) !== -1,
      handset: lockFills.indexOf("rgb(255, 255, 255)") !== -1,
    };
    const pattern = pat && pat.tagName.toLowerCase() === "pattern"
      ? { id: patId, doodles: pat.querySelectorAll('g > g').length,
          w: parseFloat(pat.getAttribute('width')), h: parseFloat(pat.getAttribute('height')) }
      : null;
    return { width: Math.round(panel.getBoundingClientRect().width),
             headings: d.querySelectorAll('h1,h2,h3').length,
             token, greenBg: green ? getComputedStyle(green).backgroundColor : null,
             columns: cols.length,
             sideBySide: !!(l0 && lg && l0.right <= lg.left + 1 && Math.abs(l0.top - lg.top) <= 1),
             svgW: svg ? Math.round(svg.getBoundingClientRect().width) : 0,
             // Dos burbujas = conversación. Un solo rect redondeado sería un
             // icono suelto, que es justo lo que el panel dejó de ser.
             bubbles: svg ? svg.querySelectorAll('rect[rx]').length : 0,
             cta: cta ? cta.textContent.trim() : null,
             linkTarget: link ? link.getAttribute('target') : null,
             pattern,
             brand,
             lockup: green ? /WhatsApp Business/i.test(green.textContent) : false,
             scrollsX: panel.scrollWidth > panel.clientWidth + 1 }; })()
`);
check("el panel dedicado se renderiza dentro de la sección", !!hero);
check("una sola cabecera: el modal no repite el título del panel",
  hero?.headings === 1, `headings=${hero?.headings}`);
check("el panel de marca usa el verde de WhatsApp (token real, no un hex inventado)",
  !!hero && hero.greenBg === hero.token, `bg=${hero?.greenBg} token=${hero?.token}`);
check("lectura y panel de marca van en dos columnas",
  hero?.sideBySide === true, `columnas=${hero?.columns}`);
check("la ilustración SVG se pinta con tamaño",
  (hero?.svgW || 0) > 120, `w=${hero?.svgW}`);
check("la ilustración es una conversación de dos burbujas, no un icono suelto",
  (hero?.bubbles || 0) >= 2, `burbujas=${hero?.bubbles}`);
check("el patrón del panel resuelve a un <pattern> existente (un url(#…) roto dejaría el fondo liso sin avisar)",
  !!hero?.pattern, hero?.pattern ? `id=${hero.pattern.id}` : "el fill no resuelve a ningún <pattern>");
check("el patrón es el mosaico de garabatos del canal",
  !!hero?.pattern && hero.pattern.doodles >= 8 && hero.pattern.w > 0 && hero.pattern.h > 0,
  hero?.pattern ? `garabatos=${hero.pattern.doodles} losa=${hero.pattern.w}x${hero.pattern.h}` : "-");
check("el panel verde rotula el canal",
  hero?.lockup === true);
check("el panel firma la integración con los dos logotipos (Necto × WhatsApp)",
  !!hero?.brand && hero.brand.necto === true && hero.brand.cross === true && hero.brand.nectoWidth > 80,
  hero?.brand ? `necto=${hero.brand.nectoWidth}px cruz=${hero.brand.cross}` : "-");
check("el logotipo de WhatsApp pinta con tokens que resuelven (burbuja del canal + auricular blanco)",
  !!hero?.brand && hero.brand.bubble === true && hero.brand.handset === true,
  hero?.brand ? `burbuja=${hero.brand.bubble} auricular=${hero.brand.handset}` : "-");
check("el CTA de conexión está presente", !!hero?.cta, hero?.cta || "-");
check("la ayuda abre el Centro de Ayuda en otra pestaña",
  hero?.linkTarget === "_blank", `target=${hero?.linkTarget}`);
check("el panel no desborda en horizontal", hero?.scrollsX === false);
// Antes se comprobaba que midiera 768 (el ancho del flujo de Meta en un modal).
// Empotrado, el ancho lo manda la columna de ajustes; lo que hay que asegurar es
// que la ocupa entera y no se queda como una tarjeta estrecha a un lado.
check("el panel ocupa el ancho de la columna de ajustes",
  !!hero && hero.width >= 600, `w=${hero?.width}`);
await shot("whatsapp-connect-hero.png");

// ── 7 · El otro consumidor del panel: el paso de WhatsApp del alta de sede ──
// El panel se comparte con `/onboarding`, donde vive dentro de una columna de
// 576 px. El corte a dos columnas no puede depender del viewport: a 1440 px de
// pantalla un `md:` metía dos columnas de ~200 px dentro de esa columna y el hero
// quedaba ilegible (aunque el modal, a 768 px, se viera bien). La invariante que
// se fija aquí es la que falló: **o se apila, o cada columna tiene ancho de
// sobra** — nunca dos columnas aplastadas.
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: APP });
await sleep(2000);
await evaluate(`
  localStorage.clear();
  localStorage.setItem('necto_local_session', JSON.stringify({ email:'admin@necto.app' }));
  localStorage.setItem('necto_user_profiles', JSON.stringify({
    'admin@necto.app': { userId:'u-1', email:'admin@necto.app', firstName:'Admin', lastName:'Necto',
      onboarding:{ newUserCompletedAt: new Date().toISOString() } } }));
  localStorage.setItem('webforge-ui-preferences', JSON.stringify({ theme:'light' }));
  true;`);
const beforeOnb = exceptions.length;
await send("Page.navigate", { url: `${APP}/onboarding` });

const onbReady = await (async () => {
  for (let i = 0; i < 40; i++) {
    if (await evaluate(`!!document.querySelector('button[aria-label="WhatsApp Business"]')`)) return true;
    await sleep(400);
  }
  return false;
})();
check("el alta de sede abre en /onboarding",
  onbReady && (await evaluate(`location.pathname`)) === "/onboarding");

// El stepper habilita todos los segmentos mientras el paso actual permita
// avanzar, así que se salta al paso de WhatsApp sin recorrer el wizard entero.
const jumped = await (async () => {
  for (let i = 0; i < 20; i++) {
    const r = await evaluate(`
      (() => { const seg = [...document.querySelectorAll('button[aria-label]')]
          .find(b => b.getAttribute('aria-label') === 'WhatsApp Business');
        if (!seg) return 'no-segment';
        if (seg.disabled) return 'disabled';
        seg.click(); return 'clicked'; })()
    `);
    if (r === "clicked") return r;
    await sleep(300);
  }
  return "never-enabled";
})();
check("se puede saltar al paso de WhatsApp Business", jumped === "clicked", jumped);
// Esperar a que el panel monte, no un `sleep` fijo. Con 900 ms bastaba casi
// siempre, pero si la pestaña venía de una recarga de HMR el panel aún no estaba
// y las 6 comprobaciones de este paso salían rojas **por el reloj, no por el
// código** — un falso rojo que entrena a ignorar el rojo. Sondear el elemento es
// lo mismo que ya hace el bucle de arriba con el segmento.
const onbReady2 = await (async () => {
  for (let i = 0; i < 30; i++) {
    if (await evaluate(`!!document.getElementById('whatsapp-connect-title')`)) return true;
    await sleep(300);
  }
  return false;
})();

const onb = await evaluate(`
  (() => { const title = document.getElementById('whatsapp-connect-title');
    if (!title) return null;
    const grid = title.closest('div.grid');
    const tracks = getComputedStyle(grid).gridTemplateColumns.split(' ').map(v => parseFloat(v));
    const txt = (document.querySelector('main') || document.body).innerText;
    return { tracks: tracks.length,
             narrowest: Math.round(Math.min.apply(null, tracks)),
             overflow: grid.scrollWidth > grid.clientWidth + 1,
             // Mismo filtro que en el modal: fuera el wallpaper (que también es
             // un <svg> sin clase lucide) y fuera el glifo de 16 px del rótulo.
             illustration: [...document.querySelectorAll('svg:not([class*="lucide"])')]
               .filter(s => !s.querySelector('pattern'))
               .some(s => s.getBoundingClientRect().width > 120),
             contextNote: /Quedará vinculado el teléfono de la sede/.test(txt),
             oldBenefitCard: /Pedidos conversacionales|Asistente IA atendiendo|Avisos automáticos/.test(txt),
             benefits: (txt.match(/Responde al instante|Recibe pedidos automáticamente|Atiende 24\\/7/g) || []).length,
             skip: /Continuar sin conectarlo/.test(txt) }; })()
`);
check("el paso de WhatsApp renderiza el panel dedicado", !!onb,
  onbReady2 ? undefined : "el panel no montó en 9 s");
check("el panel no se aplasta: o se apila, o cada columna tiene ancho de sobra",
  !!onb && (onb.tracks === 1 || onb.narrowest >= 300),
  onb ? `columnas=${onb.tracks} la más estrecha=${onb.narrowest}` : "-");
check("el panel no desborda en horizontal dentro de la columna del alta",
  !!onb && onb.overflow === false);
check("la ilustración se pinta también en el alta", !!onb && onb.illustration === true);
check("el alta conserva el teléfono que quedará vinculado", !!onb && onb.contextNote === true);
check("el alta ya no repite los motivos en una tarjeta propia",
  !!onb && onb.oldBenefitCard === false && onb.benefits === 3,
  onb ? `motivos=${onb.benefits} tarjeta_vieja=${onb.oldBenefitCard}` : "-");
check("el alta conserva su salida sin conectar", !!onb && onb.skip === true);
check("el alta no lanza excepciones", exceptions.length === beforeOnb);
await shot("whatsapp-connect-onboarding.png");

// ── 8 · Gating por módulo: sin el módulo, la tarjeta no puede afirmar nada ──
// El gating se mide con **las dos sedes**: la que tiene Pedidos y la que no. Medir
// sólo el caso "sin módulo" no discrimina —el texto podría faltar por cualquier
// otro motivo (otro apartado, otro render, una tarjeta que no está)—. El mismo
// lector sobre el mismo código con dos fixtures distintas sí discrimina: si las
// dos dan lo mismo, la prueba no está midiendo el gating.
//
// ⚠️ La tarjeta "Gestión de pedidos" vive en el apartado **Conocimiento &
// Capacidades**, no en "Reglas de pedidos" (ese es el bloque OMS de creación y
// confirmación de pedidos: otro contenido). La primera versión de esta fase
// pulsaba "Reglas de pedidos", y las tres comprobaciones salían verdes porque el
// texto no estaba *en ninguna parte*, no porque el gating funcionara.
//
// ⚠️ "Sin módulo" no es único de esta tarjeta: el distintivo de Inventarios usa el
// mismo rótulo cuando su módulo falta. Por eso el lector se ancla a la **fila** de
// pedidos (su título → el `[data-settings-row]` que lo contiene) en vez de mirar el
// panel entero. Antes el ancla era `closest('div[class*="rounded-xl"]')`, que
// funcionaba porque cada origen era su propia tarjeta; ahora los seis orígenes
// viven en **una** tarjeta con filas separadas por hairline, y ese selector
// devolvería la tarjeta entera —con el "Sin módulo" de inventarios dentro—, que es
// justo el motivo equivocado por el que esta comprobación no debe pasar.
const clickSubTab = label => evaluate(`
  (() => { const d = ${DIALOG};
    const list = d && d.querySelector('${SUB_NAV}');
    const b = list && [...list.querySelectorAll('button[role=tab]')]
      .find(x => x.textContent.trim() === ${JSON.stringify(label)});
    if (!b) return false; b.click(); return true; })()
`);

// Sembrar la sede desde cero, no parchear lo que quede: el paso 7 navega a
// `/onboarding` y la app reescribe el almacenamiento, así que la clave del
// fixture inicial ya no sobrevive. Parchear el remanente ataba la prueba al orden
// de las fases; sembrar la desata.
const seedSede = async modules => {
  await send("Page.navigate", { url: APP });
  await sleep(1800);
  await evaluate(`
    localStorage.clear();
    localStorage.setItem('necto_businesses', JSON.stringify([
      { id:'biz-a', name:'Ferretería & Suministros La Tuerca', businessType:'retail_store',
        city:'Medellín', country:'Colombia', currency:'COP', code:'SUC-01', slug:'la-tuerca',
        address:'Carrera 43A # 1-50', openingDays:'Lunes a sábado', openingHours:'10:00 - 22:00',
        activeModules:${JSON.stringify(modules)}, channels:{whatsapp:true,web:true,pos:true},
        iconKey:'store', createdAt:new Date().toISOString() }]));
    localStorage.setItem('necto_active_business_id','biz-a');
    localStorage.setItem('webforge-ui-preferences', JSON.stringify({ theme:'light' }));
    true;`);
  await send("Page.navigate", { url: `${APP}/app?section=configuracion` });
  // Sondear el modal, no esperar un tiempo fijo. Con 2200 ms casi siempre bastaba,
  // pero cuando no bastaba el arnés **moría** con `Cannot read properties of null
  // (reading 'closest')` al evaluar el propio localizador del diálogo — un rojo que
  // no señala ningún defecto del producto. Misma lección que el paso 7.
  await esperarAjustes();
  await sleep(400);
  await clickTab("Asistente de WhatsApp IA");
  await sleep(600);
  await clickSubTab("Conocimiento y capacidades");
  await sleep(600);
};

// Un único lector: anclado a la fila de pedidos, así que el mismo código decide
// qué dice la fila en los dos estados.
const leerPedidos = () => evaluate(`
  (() => { const d = ${DIALOG};
    if (!d) return null;
    const h = [...d.querySelectorAll('h3, h4')].find(x => x.textContent.trim() === 'Gestión de pedidos');
    if (!h) return { tarjeta: false };
    const row = h.closest('[data-settings-row]') || h;
    const t = row.innerText;
    return { tarjeta: true,
             conectado: /Pedidos conectados/.test(t),
             sinModulo: /Sin módulo/.test(t),
             lista: /Capacidades operativas/.test(t) }; })()
`);

// La captura es del viewport, y la fila queda por debajo del pliegue en este
// apartado: sin centrarla, la evidencia que se adjunta no contiene el objeto que
// se afirma haber medido.
const enfocarPedidos = () => evaluate(`
  (() => { const d = ${DIALOG};
    const h = [...d.querySelectorAll('h3, h4')].find(x => x.textContent.trim() === 'Gestión de pedidos');
    if (!h) return false;
    h.scrollIntoView({ block: 'center' });
    return true; })()
`);

const beforeGating = exceptions.length;

// (a) Control positivo: con Pedidos activo la tarjeta sí declara la conexión y sí
// lista sus capacidades. Sin este estado, el "Sin módulo" de (b) no demostraría nada.
await seedSede(["pedidos", "inventarios"]);
const conPedidos = await leerPedidos();
await enfocarPedidos();
await shot("asistente-pedidos-con-modulo.png");
check("con el módulo de Pedidos la tarjeta lo declara conectado y muestra sus capacidades",
  !!conPedidos && conPedidos.tarjeta === true && conPedidos.conectado === true
    && conPedidos.sinModulo === false && conPedidos.lista === true,
  conPedidos ? `tarjeta=${conPedidos.tarjeta} conectado=${conPedidos.conectado} sinModulo=${conPedidos.sinModulo} lista=${conPedidos.lista}` : "-");

// (b) Mismo lector, misma ruta, sede sin Pedidos: tiene que cambiar de respuesta.
await seedSede(["inventarios"]);
const sinPedidos = await leerPedidos();
await enfocarPedidos();
await shot("asistente-pedidos-sin-modulo.png");
check("sin el módulo de Pedidos la tarjeta sigue visible (no desaparece el bloque)",
  !!sinPedidos && sinPedidos.tarjeta === true, `tarjeta=${sinPedidos?.tarjeta}`);
check("sin el módulo de Pedidos la tarjeta NO afirma que los pedidos están conectados",
  !!sinPedidos && sinPedidos.conectado === false && sinPedidos.sinModulo === true,
  sinPedidos ? `conectado=${sinPedidos.conectado} sinModulo=${sinPedidos.sinModulo}` : "-");
check("sin el módulo de Pedidos se retira su lista de capacidades, no se deja vacía",
  !!sinPedidos && sinPedidos.lista === false, `lista=${sinPedidos?.lista}`);

// Y el módulo que sí sigue activo no se cae con él: el gating es por módulo, no global.
const conInventario = await evaluate(`
  (() => { const d = ${DIALOG};
    return { vivo: /Consulta de inventario en tiempo real/.test(d.innerText) }; })()
`);
check("quitar Pedidos no arrastra a Inventarios (el gating es por módulo, no global)",
  conInventario.vivo === true, `inventario=${conInventario.vivo}`);
check("la pestaña del asistente no lanza excepciones al cambiar de módulos",
  exceptions.length === beforeGating, exceptions.slice(beforeGating).join(" | ").slice(0, 200));

// ── 9 · El apartado también declara su módulo, no sólo las tarjetas de dentro ──
// Gatear las tarjetas dejaba la puerta abierta: con Pedidos apagado, "Reglas de
// pedidos" seguía en la barra y dejaba configurar la creación y confirmación de
// pedidos de un módulo que la sede no tiene. Mismo patrón que la fase 8: un lector,
// dos sedes, y la respuesta tiene que cambiar.
const leerApartados = () => evaluate(`
  (() => { const d = ${DIALOG};
    const list = d && d.querySelector('${SUB_NAV}');
    if (!list) return null;
    const tabs = [...list.querySelectorAll('button[role=tab]')];
    const labels = tabs.map(b => b.textContent.trim());
    return { labels,
             cuenta: labels.length,
             reglas: labels.indexOf('Reglas de pedidos') !== -1,
             seleccionados: tabs.filter(b => b.getAttribute('aria-selected') === 'true').length,
             contenidoOms: /Cómo entran los pedidos/.test(d.innerText) }; })()
`);

const beforeApartados = exceptions.length;

// (a) Control positivo: con Pedidos, el apartado existe y su contenido se pinta.
await seedSede(["pedidos", "inventarios"]);
await clickSubTab("Reglas de pedidos");
await sleep(600);
const conOms = await leerApartados();
await evaluate(`(() => { const d = ${DIALOG};
  const l = d && d.querySelector('${SUB_NAV}');
  if (l) l.scrollIntoView({ block: 'start' });
  return true; })()`);
await shot("asistente-apartados-con-pedidos.png");
check("con el módulo de Pedidos el apartado 'Reglas de pedidos' está en la barra y se abre",
  !!conOms && conOms.reglas === true && conOms.cuenta === 6 && conOms.contenidoOms === true,
  conOms ? `apartados=${conOms.cuenta} reglas=${conOms.reglas} contenido=${conOms.contenidoOms}` : "-");

// (b) Sin Pedidos: el apartado desaparece de la barra y su contenido no se puede alcanzar.
await seedSede(["inventarios"]);
const sinOms = await leerApartados();
await evaluate(`(() => { const d = ${DIALOG};
  const l = d && d.querySelector('${SUB_NAV}');
  if (l) l.scrollIntoView({ block: 'start' });
  return true; })()`);
await shot("asistente-apartados-sin-pedidos.png");
check("sin el módulo de Pedidos el apartado desaparece de la barra (no se deja deshabilitado)",
  !!sinOms && sinOms.reglas === false && sinOms.cuenta === 5,
  sinOms ? `apartados=${sinOms.cuenta} ${JSON.stringify(sinOms.labels)}` : "-");
// No basta con que el apartado no esté en la barra: hay que **intentar** llegar.
// Sin este clic la comprobación pasaba por estar en otro apartado, no por ser
// inalcanzable — el mismo verde vacuo que la fase 8, un nivel más arriba. Y se
// demuestra con la mutación: neutralizado el filtro, el botón reaparece y este
// clic lo encuentra.
const llegoAlOms = await clickSubTab("Reglas de pedidos");
await sleep(500);
const trasIntento = await leerApartados();
check("sin el módulo de Pedidos su contenido no se alcanza ni intentándolo",
  llegoAlOms === false && !!trasIntento && trasIntento.contenidoOms === false,
  `botonEncontrado=${llegoAlOms} contenidoOms=${trasIntento?.contenidoOms}`);
check("la barra sigue con un apartado seleccionado (el activo cae, no queda fantasma)",
  !!trasIntento && trasIntento.seleccionados === 1, `seleccionados=${trasIntento?.seleccionados}`);
check("quitar Pedidos no lanza excepciones al reconstruir la barra",
  exceptions.length === beforeApartados, exceptions.slice(beforeApartados).join(" | ").slice(0, 200));

check("sin excepciones de runtime", exceptions.length === 0, exceptions.join(" | ").slice(0, 300));

console.log(`\n===== CONFIGURACIÓN DE SEDE: ${fails === 0 ? "OK" : fails + " FALLOS"} =====`);
ws.close();
process.exit(fails === 0 ? 0 : 1);
