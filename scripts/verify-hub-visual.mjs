/**
 * Verificación visual del hub tras migrar la identidad de `Repo-prueba-master`.
 *
 * Guarda la **presentación**, no la lógica (eso lo cubre `verify-hub-card.mjs`):
 *
 *   1. el header y el contenido son superficies `rounded-3xl` sobre el gris del
 *      `body` (patrón de la referencia), no bloques `bg-slate` propios;
 *   2. la tarjeta de sede usa el contenedor del DS (`rounded-xl`) y **sí** eleva
 *      con `shadow-theme-md` en hover (decisión explícita del usuario);
 *   3. el estado vacío es una `Card` centrada, no un hero `bg-brand-500`;
 *   4. la firma de marca ("grow together") ya no está;
 *   5. ningún color sale de la paleta de tokens;
 *   6. sin excepciones de runtime.
 *
 * Uso: con dev server + Chrome headless --remote-debugging-port=9222 vivos,
 *   node scripts/verify-hub-visual.mjs
 */

const CDP = "http://127.0.0.1:9222";
const APP = process.env.NECTO_APP_URL || "http://localhost:5173";
const { writeFileSync, mkdirSync } = await import("node:fs");
mkdirSync("./artifacts", { recursive: true });

const page = await (async () => {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${CDP}/json/list`);
      const all = await r.json();
      const t = all.find(x => x.id === process.env.NECTO_TAB_ID)
        || all.find(x => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
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

/**
 * ⚠️ Esperar a que la pantalla esté realmente pintada, no un tiempo fijo.
 *
 * Un `sleep(3500)` pierde la carrera en un arranque en frío de Vite (transform
 * inicial de módulos + hidratación de `localStorage`): el shell se mide todavía
 * vacío y `querySelector('header'|'main')` devuelve `null`, lo que produce
 * FALLOS falsos sobre código correcto — la primera corrida de esta guarda
 * reportó 7 fallos que desaparecieron al repetirla en caliente.
 *
 * Se sondea hasta que el documento tenga `header` y `main` y el `body` tenga
 * texto. Si expira, se sigue igual: la aserción fallará con su propio detalle.
 */
const settle = async (timeout = 20000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const ok = await evaluate(`
        document.readyState === 'complete'
        && !!document.querySelector('header')
        && !!document.querySelector('main')
        && document.body.innerText.trim().length > 50
      `);
      if (ok) { await sleep(350); return true; }
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

// ⚠️ Navegar antes de tocar localStorage (about:blank = origen opaque).
await send("Page.navigate", { url: APP });
await sleep(2500);

// Fijar el tema a claro: la preferencia persiste entre corridas y una medición
// de color en dark mode contra una implementación correcta daría rojo.
await evaluate(`
  localStorage.clear();
  sessionStorage.clear();
  // ⚠️ El hub tiene guarda de autenticación (WorkspacesPage): sin sesión
  // redirige a /login, así que sin sembrarla esta guarda medía la pantalla de
  // acceso y TODAS sus aserciones caían ("sin header", "sin main"). La sesión
  // es estado previo de la pantalla, no el sujeto de la medición.
  // ⚠️ Esto va DENTRO de un template literal: nada de backticks aquí.
  const email = 'hub@necto.app';
  localStorage.setItem('necto_local_session', JSON.stringify({ email }));
  localStorage.setItem('necto_user_profiles', JSON.stringify({ [email]: {
    userId:'u-hub', email, firstName:'Hub', lastName:'Test', contactPhone:'+57 300 000 0000',
    role:'client_admin', preferences:{ theme:'light' },
    auth:{ provider:'password', password:'xxxxxxxx', google:null },
    onboarding:{ newUserCompletedAt: new Date().toISOString() } } }));
  localStorage.setItem('necto_businesses', JSON.stringify([
    { id:'biz-a', name:'Sede Alfa', businessType:'retail_store', city:'Bogotá',
      activeModules:['pedidos'], channels:{whatsapp:true,web:true}, iconKey:'store', createdAt:new Date().toISOString() },
    { id:'biz-b', name:'Sede Beta', businessType:'restaurant_virtual', city:'Cali',
      activeModules:['pedidos'], channels:{whatsapp:true,web:true}, iconKey:'store', createdAt:new Date().toISOString() }
  ]));
  localStorage.setItem('necto_active_business_id','biz-a');
  localStorage.setItem('webforge-ui-preferences', JSON.stringify({ theme:'light' }));
  true;
`);
await send("Page.navigate", { url: `${APP}/workspaces` });
await settle();

// ── 1 · Superficies del chrome ────────────────────────────────────────────
const surfaces = await evaluate(`
  (() => {
    const header = document.querySelector('header');
    const main = document.querySelector('main');
    const body = getComputedStyle(document.body).backgroundColor;
    const r = el => { if (!el) return null; const c = getComputedStyle(el);
      return { radius: c.borderTopLeftRadius, bg: c.backgroundColor, shadow: c.boxShadow }; };
    return { header: r(header), main: r(main), bodyBg: body };
  })()
`);
check("el header es una superficie redondeada (rounded-3xl)",
  surfaces.header && parseFloat(surfaces.header.radius) >= 20,
  surfaces.header ? surfaces.header.radius : "sin header");
check("el contenido es una superficie redondeada (rounded-3xl)",
  surfaces.main && parseFloat(surfaces.main.radius) >= 20,
  surfaces.main ? surfaces.main.radius : "sin main");
check("la pantalla no repinta el gris del body con bg-slate propio",
  !/154,\s*1(55|60)|\b15,\s*23,\s*42\b/.test(surfaces.main?.bg || ""),
  `body=${surfaces.bodyBg} main=${surfaces.main?.bg}`);

// ── 2 · Contenedor y hover de la tarjeta de sede ──────────────────────────
// ⚠️ El ancestro más pequeño que contiene "Entrar" es el **cuerpo** de la tarjeta
// (`px-5 pb-4`), no la tarjeta: el botón vive dentro de un `<div>` sin radio ni
// borde. Anclar en el cuerpo mide el elemento equivocado y reprueba código
// correcto. Se sube desde el botón hasta el primer ancestro que **es** una
// tarjeta del DS (borde + radio definidos).
const card = await evaluate(`
  (() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Entrar'));
    if (!btn) return null;
    let el = btn.parentElement, cardEl = null;
    while (el && el !== document.body) {
      const c = getComputedStyle(el);
      if (parseFloat(c.borderTopWidth) >= 1 && parseFloat(c.borderTopLeftRadius) >= 8) { cardEl = el; break; }
      el = el.parentElement;
    }
    if (!cardEl) return null;
    const c = getComputedStyle(cardEl);
    return { radius: c.borderTopLeftRadius, shadow: c.boxShadow, cls: cardEl.className,
             bg: c.backgroundColor, border: c.borderTopWidth };
  })()
`);
check("la tarjeta de sede existe", card !== null);
check("la tarjeta usa el radio del DS (rounded-xl, no 2xl)",
  card && parseFloat(card.radius) === 12, card ? card.radius : "-");
check("la tarjeta conserva fondo y borde de tarjeta del DS",
  card && parseFloat(card.border) >= 1 && /255,\s*255,\s*255|transparent/.test(card.bg),
  card ? `${card.bg} border=${card.border}` : "-");
check("la tarjeta NO lleva el p-5 del DS (la portada debe sangrar)",
  card && /(^|\s)p-0(\s|$)/.test(card.cls), card ? card.cls.slice(0, 130) : "-");

// El hover-shadow es decisión explícita del usuario: verificar que la clase
// existe en la hoja servida (sin hover real no se puede computar).
const hoverRule = await evaluate(`
  (() => {
    for (const sh of document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch { continue; }
      for (const r of rules) {
        if (r.cssText && r.cssText.includes('hover') && r.cssText.includes('shadow-theme-md')) return r.cssText.slice(0,160);
      }
    }
    return null;
  })()
`);
check("existe una regla hover → shadow-theme-md", hoverRule !== null, hoverRule || "no encontrada");

// ── 3 · Estado vacío = Card centrada, sin hero bg-brand-500 ───────────────
await evaluate(`localStorage.setItem('necto_businesses','[]')`);
await send("Page.navigate", { url: `${APP}/workspaces` });
await settle();

const empty = await evaluate(`
  (() => {
    const t = document.body.innerText;
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Crear mi primera tienda'));
    if (!btn) return null;
    // Subir hasta el contenedor de la Card (el que tiene borde + radio).
    let el = btn, cardEl = null;
    while (el && el !== document.body) {
      const c = getComputedStyle(el);
      if (parseFloat(c.borderTopWidth) >= 1 && parseFloat(c.borderTopLeftRadius) >= 8) { cardEl = el; break; }
      el = el.parentElement;
    }
    const c = cardEl ? getComputedStyle(cardEl) : null;
    return { hasText: t.includes('Aún no tienes sucursales'),
             btnIsBrand: getComputedStyle(btn).backgroundColor,
             cardBg: c ? c.backgroundColor : null, cardRadius: c ? c.borderTopLeftRadius : null,
             hasBrandHero: !!document.querySelector('.bg-brand-500.rounded-3xl') };
  })()
`);
check("el estado vacío se renderiza", empty !== null);
check("el estado vacío vive en una Card con borde y radio", empty && empty.cardRadius !== null,
  empty ? `${empty.cardBg} / ${empty.cardRadius}` : "-");
check("el estado vacío NO es un hero bg-brand-500", empty && empty.hasBrandHero === false);
check("la CTA del estado vacío es un botón de marca",
  empty && /255,\s*63,\s*26/.test(empty.btnIsBrand), empty ? empty.btnIsBrand : "-");

// ── 4 · Sin firma de marca colada ─────────────────────────────────────────
const noSignature = await evaluate(`!document.body.innerText.includes('grow together')`);
check("la firma de marca ya no aparece", noSignature === true);

// ── 5 · Cumplimiento de tokens (barrido de color) ─────────────────────────
await evaluate(`
  localStorage.setItem('necto_businesses', JSON.stringify([
    { id:'biz-a', name:'Sede Alfa', businessType:'retail_store', city:'Bogotá',
      activeModules:['pedidos'], channels:{whatsapp:true,web:true}, iconKey:'store', createdAt:new Date().toISOString() }
  ]));
  true;
`);
await send("Page.navigate", { url: `${APP}/workspaces` });
await settle();

const offTokens = await evaluate(`
  (() => {
    const TOKENS = [
      '#FF3F1A','#E63314','#BF2810','#99200D','#7A1A0B','#4D0F06','#FF6647','#FF8F78','#FFB3A3','#FFD6CC','#FFEDE8','#FFF5F2',
      '#190088','#2A0BB0','#4D1FE0','#7E57FF','#A98FFF','#D2C7FF','#EBE6FF','#F4F2FF',
      '#97D6DF','#EFE6D3',
      '#12B76A','#039855','#32D583','#A6F4C5','#ECFDF3',
      '#F79009','#B54708','#FDB022','#FEDF89',
      '#F04438','#D92D20','#F97066','#FDA29B',
      '#F9FAFB','#F2F4F7','#D0D5DD','#98A2B3','#667085','#344054','#1D2939','#101828','#0C111D',
      '#FFFFFF','#000000'
    ];
    const hex2rgb = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
    const allowed = TOKENS.map(hex2rgb);
    const isAllowed = (r,g,b) => allowed.some(([R,G,B]) =>
      Math.abs(r-R)<=2 && Math.abs(g-G)<=2 && Math.abs(b-B)<=2);
    const bad = new Set();
    const walk = el => {
      const cs = getComputedStyle(el);
      for (const p of ['backgroundColor','color','borderTopColor']) {
        const m = cs[p].match(/rgba?\\((\\d+), (\\d+), (\\d+)/);
        if (!m) continue;
        const [r,g,b] = [+m[1],+m[2],+m[3]];
        if (Math.max(r,g,b)-Math.min(r,g,b) < 34) continue;
        if (isAllowed(r,g,b)) continue;
        bad.add(p+'='+cs[p]+' ('+el.tagName.toLowerCase()+')');
      }
      for (const c of el.children) walk(c);
    };
    walk(document.querySelector('main') || document.body);
    return [...bad].slice(0,10);
  })()
`);
check("ningún color fuera de la paleta de tokens", offTokens.length === 0, offTokens.join(" | "));

// ── 6 · Captura para inspección ───────────────────────────────────────────
const { data } = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("./artifacts/hub-after-refactor.png", Buffer.from(data, "base64"));
console.log("   captura → ./artifacts/hub-after-refactor.png");

check("sin excepciones de runtime", exceptions.length === 0, exceptions.join(" | ").slice(0, 300));

console.log(`\n===== RESULTADO VISUAL HUB: ${fails === 0 ? "OK" : fails + " FALLOS"} =====`);
ws.close();
process.exit(fails === 0 ? 0 : 1);
