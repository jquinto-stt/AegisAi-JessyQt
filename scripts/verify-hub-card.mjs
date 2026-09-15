/**
 * Verificación E2E de la tarjeta de sede del hub (Dashboard de franquicias).
 *
 * Guarda de regresión de una decisión de producto: pulsar la **tarjeta** entra en
 * la sede (la marca activa y abre su operación), igual que el botón "Entrar".
 * Antes la tarjeta abría el selector de perfil de acceso, así que tarjeta y botón
 * hacían cosas distintas y "Entrar" era el único camino que cambiaba de sede.
 * El selector se retiró con el catálogo de roles (hoy uno solo: Admin Cliente).
 *
 * Uso: con el dev server y Chrome headless --remote-debugging-port=9222 vivos,
 *   node scripts/verify-hub-card.mjs
 */

const CDP = "http://127.0.0.1:9222";
const APP = process.env.NECTO_APP_URL || "http://localhost:5173";

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
      exceptions.push(m.params.exceptionDetails?.exception?.description || JSON.stringify(m.params));
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

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
});

let fails = 0;
const check = (label, ok, detail) => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  :: " + detail : ""}`);
};

// ⚠️ Navegar ANTES de tocar `localStorage`. La pestaña arranca en `about:blank`,
// cuyo origen es **opaque**: leer `localStorage` ahí lanza `SecurityError` y el
// arnés muere en la primera línea con un error que no tiene nada que ver con el
// código bajo prueba. Necesitamos un origen real primero.
await send("Page.navigate", { url: APP });
await sleep(2500);
await evaluate(`localStorage.clear()`);
await send("Page.navigate", { url: `${APP}/workspaces` });
await sleep(3500);

// Sembrar dos sedes y recargar para que el hub tenga tarjetas.
await evaluate(`
  // ⚠️ El hub tiene guarda de autenticación (WorkspacesPage): sin sesión
  // redirige a /login, así que sin sembrarla estas aserciones medían la
  // pantalla de acceso y caían todas ("el hub lista las sedes" → false/false,
  // "la tarjeta navega a la operación" → /login). La sesión es estado previo.
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
  true;
`);
await send("Page.navigate", { url: `${APP}/workspaces` });
await sleep(3500);

const cards = await evaluate(`
  (() => {
    const t = document.body.innerText;
    return { alfa: t.includes('Sede Alfa'), beta: t.includes('Sede Beta'),
             cambiarPerfil: t.includes('Cambiar Perfil'), activo: localStorage.getItem('necto_active_business_id') };
  })()
`);
check("el hub lista las sedes", cards.alfa && cards.beta, JSON.stringify(cards));
check("el hub ya no ofrece cambiar de perfil", cards.cambiarPerfil === false);
check("sede activa antes del clic", cards.activo === "biz-a", String(cards.activo));

// Pulsar la TARJETA de "Sede Beta" (no el botón Entrar). Se elige el ancestro
// común más pequeño que contiene el nombre de la sede y su botón "Entrar":
// ese es el contenedor de la tarjeta, no la página entera.
const clicked = await evaluate(`
  (() => {
    const cands = [...document.querySelectorAll('div,article,section')].filter(e => {
      const txt = e.textContent || '';
      return txt.includes('Sede Beta') && txt.includes('Entrar');
    });
    if (!cands.length) return false;
    const card = cands.reduce((a, b) => (a.textContent.length <= b.textContent.length ? a : b));
    card.click();
    return true;
  })()
`);
check("se encontró la tarjeta de Sede Beta", clicked === true);
await sleep(1200);

const after = await evaluate(`({ url: location.pathname + location.search, activo: localStorage.getItem('necto_active_business_id') })`);
check("la tarjeta entra en la sede (cambia la sede activa)", after.activo === "biz-b", String(after.activo));
check("la tarjeta navega a la operación de la sede", after.url.startsWith("/app"), after.url);
check("sin excepciones de runtime", exceptions.length === 0, exceptions.join(" | ").slice(0, 300));

// ── "Nueva sucursal": el hub no puede botar a /login en silencio ──────────
// El hub es una ruta **pública**, así que este botón se pulsa a veces sin
// sesión. Antes se navegaba a `/onboarding` y era `OnboardingPage` quien, ya
// dentro, expulsaba a `/login`: panel de sedes, botón habilitado, y de pronto un
// formulario de acceso. La decisión tiene que tomarse **antes de salir**.
const clickNewBranch = `
  (() => {
    const b = [...document.querySelectorAll('button')]
      .find(x => /nueva sucursal|crear mi primera tienda/i.test(x.textContent || ''));
    if (!b) return 'sin-boton';
    b.click();
    return 'click';
  })()
`;

// (a) Sin sesión: al login, pero **con la intención anotada** para volver.
//
// ⚠️ OBSOLETO — esta parte ya no puede pasar, y no por un fallo del producto:
// cuando se escribió, el hub era una ruta **publica** y el boton "Nueva
// sucursal" se veia SIN sesion, asi que era `startBranchCreation` quien anotaba
// la intencion y desviaba al login. `WorkspacesPage` tiene hoy guarda de
// autenticacion, asi que sin sesion la ruta redirige ANTES de pintar el panel:
// el boton no existe (`sin-boton`) y la rama `!profile` de `startBranchCreation`
// solo seria alcanzable si `isAuthenticated` y `profile` se desincronizaran
// (defensiva). Se deja la asercion INTACTA a proposito: es la senal de que el
// contrato se movio de capa, no un fallo que haya que silenciar. Repuntarla al
// contrato actual ("sin sesion, /workspaces redirige al login") es una decision
// de producto/test pendiente, no un arreglo mecanico.
await evaluate(`localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('necto_businesses', JSON.stringify([
    { id:'biz-a', name:'Sede Alfa', businessType:'retail_store', city:'Bogotá',
      activeModules:[], channels:{}, iconKey:'store', createdAt:new Date().toISOString() } ]));
  true;`);
await send("Page.navigate", { url: `${APP}/workspaces` });
await sleep(3500);
const anonClick = await evaluate(clickNewBranch);
await sleep(2500);
const anon = await evaluate(`({ path: location.pathname, intent: sessionStorage.getItem('necto_pending_action') })`);
check("sin sesión, 'Nueva sucursal' lleva al login", anonClick === "click" && anon.path === "/login",
  `${anonClick} path=${anon.path}`);
check("sin sesión, la intención de crear sucursal queda anotada",
  anon.intent === "branch.create", String(anon.intent));

// (b) Con sesión: directo al alta. Es el caso que reportó el usuario.
await evaluate(`localStorage.clear(); sessionStorage.clear();
  const email = 'hub@necto.app';
  localStorage.setItem('necto_local_session', JSON.stringify({ email }));
  localStorage.setItem('necto_user_profiles', JSON.stringify({ [email]: {
    userId:'u-hub', email, firstName:'Hub', lastName:'Test', contactPhone:'+57 300 000 0000',
    role:'client_admin', preferences:{ theme:'light' },
    auth:{ provider:'password', password:'xxxxxxxx', google:null },
    onboarding:{ newUserCompletedAt: new Date().toISOString() } } }));
  localStorage.setItem('necto_businesses', JSON.stringify([
    { id:'biz-a', name:'Sede Alfa', businessType:'retail_store', city:'Bogotá',
      activeModules:[], channels:{}, iconKey:'store', createdAt:new Date().toISOString() } ]));
  true;`);
await send("Page.navigate", { url: `${APP}/workspaces` });
await sleep(3500);
const authClick = await evaluate(clickNewBranch);
await sleep(2500);
const authed = await evaluate(`location.pathname`);
check("con sesión, 'Nueva sucursal' entra al alta (no al login)",
  authClick === "click" && authed === "/onboarding", `${authClick} path=${authed}`);

// (c) La intención se consume: un login posterior no repite el desvío.
await evaluate(`sessionStorage.clear(); true;`);
const consumed = await evaluate(`(async () => {
  const m = await import('/src/compositions/workspace/pending-action.ts');
  m.rememberPendingAction('branch.create');
  const first = m.consumePendingRoute();
  const second = m.consumePendingRoute();
  return { first, second };
})()`);
check("la intención se consume una sola vez (no es pegajosa)",
  consumed.first === "/onboarding" && consumed.second === null, JSON.stringify(consumed));

console.log(`\n===== RESULTADO HUB: ${fails === 0 ? "OK" : fails + " FALLOS"} =====`);
ws.close();
process.exit(fails === 0 ? 0 : 1);
