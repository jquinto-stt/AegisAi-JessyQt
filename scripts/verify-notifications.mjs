import { writeFileSync, mkdirSync } from "node:fs";

// Vite binds to [::1] only on this machine, so 127.0.0.1 is refused. Use the
// hostname and let the resolver pick IPv6. El puerto por defecto es el de `npm
// run dev` (5173); apuntar a otro con NECTO_APP_URL. Con un puerto muerto la
// navegación deja la pestaña en una página de error con origen opaco, y el
// primer síntoma es un `SecurityError` al tocar `localStorage`, no un timeout.
const APP = process.env.NECTO_APP_URL || "http://localhost:5173";
const CDP_BASE = "http://127.0.0.1:9222";
const OUT = "./artifacts/";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const results = [];
function check(label, ok, detail) {
  results.push({ label, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  :: " + detail : ""}`);
}

async function getPageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${CDP_BASE}/json/list`);
      const all = await res.json();
      // NECTO_TAB_ID = pestaña dedicada asignada por verify-all.mjs (aislamiento).
      const page = all.find((t) => t.id === process.env.NECTO_TAB_ID)
        || all.find((t) => t.type === "page" && t.webSocketDebuggerUrl && !t.url.startsWith("devtools"));
      if (page) return page;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("No CDP page target found");
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    const events = [];
    ws.addEventListener("open", () => resolve({
      events,
      send(method, params = {}) {
        return new Promise((res, rej) => {
          const mid = ++id; pending.set(mid, { res, rej });
          ws.send(JSON.stringify({ id: mid, method, params }));
        });
      },
      close: () => ws.close(),
    }));
    ws.addEventListener("error", reject);
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.method) events.push(m);
      if (m.id && pending.has(m.id)) {
        const { res, rej } = pending.get(m.id); pending.delete(m.id);
        m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
      }
    });
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cdp = await connect((await getPageTarget()).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
await cdp.send("Page.enable");
await cdp.send("DOM.enable");
await cdp.send("Log.enable");
await cdp.send("Network.enable");
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

const evaluate = async (expression) => {
  const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const waitFor = async (expr, label, ms = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluate(expr)) return true; } catch {} await sleep(300); }
  throw new Error("Timeout: " + label);
};
const shot = async (n) => {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(OUT + n, Buffer.from(data, "base64"));
};
const goto = async (u) => { await cdp.send("Page.navigate", { url: u + "?cb=" + Date.now() }); await sleep(1500); };
const readQueue = () => evaluate(`(() => { try { return JSON.parse(localStorage.getItem("necto_notifications") || "null"); } catch { return "PARSE_ERR"; } })()`);

const seed = async () => {
  // ⚠️ No se visita `/login` para sembrar: `SignInForm` ahora redirige fuera de
  // `/login` a quien ya tiene sesión (al hub, o al onboarding del perfil si le
  // falta), así que el formulario no llega a renderizarse y el `waitFor` de un
  // `input` caduca. Se abre cualquier página solo para tener un origen donde
  // tocar `localStorage`, y de ahí se entra directo a `/app`.
  await goto(APP);
  // El harness siembra su propia sede (como `verify-hub-card`): el modal de
  // Configuración de sede edita una sede real. Sin ella la app abre el modal en
  // borrador de "Nueva Sede" y, al no haber logo, el único control de rango del
  // modal (`TransformControls`, el encuadre del logo) no se renderiza.
  await evaluate(`
    localStorage.clear();
    localStorage.setItem("necto_local_session", JSON.stringify({username:"admin@necto.app",email:"admin@necto.app"}));
    localStorage.setItem("necto_businesses", JSON.stringify([{
      id: "biz-harness", name: "Sede de Prueba", slug: "sede-de-prueba",
      businessType: "retail_store", iconKey: "store",
      logoUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
      currency: "COP", city: "Bogotá, Colombia",
      channels: { whatsapp: true, web: true, pos: true },
      kitchenBufferMin: 10, specialty: "Pruebas",
      activeModules: ["pedidos", "inventarios"],
      setupProgress: { whatsappConnected: true, menuConfigured: true, kitchenConfigured: false, teamInvited: false },
      createdAt: new Date().toISOString()
    }]));
    localStorage.setItem("necto_active_business_id", "biz-harness");
    true;
  `);
  await goto(APP + "/app");
  await waitFor(`!!document.querySelector('button[aria-label="Notificaciones de Necto IA"]')`, "bell", 30000);
};


// The panel is scoped to the bell's own container. A global `h4` sweep would
// happily match an "Notificaciones" heading from any other surface.
const PANEL = `(() => {
  const b = document.querySelector('button[aria-label="Notificaciones de Necto IA"]');
  if (!b) return null;
  const root = b.closest("div.relative");
  if (!root) return null;
  const panel = root.querySelector("div.absolute");
  return panel ? panel.innerText : null;
})()`;

// `aria-expanded` is the component's own source of truth, so drive the panel
// from it instead of blind-toggling the bell. A toggle assumes you know the
// current state; after any earlier interaction you do not, and one wrong
// assumption desyncs every later assertion in the run.
const panelOpen = () => evaluate(
  `(() => { const b=document.querySelector('button[aria-label="Notificaciones de Necto IA"]');
    return b ? b.getAttribute("aria-expanded") === "true" : false; })()`
);

const ensureOpen = async () => {
  for (let i = 0; i < 5; i++) {
    if (await panelOpen()) return true;
    await evaluate(`(() => { const b=document.querySelector('button[aria-label="Notificaciones de Necto IA"]'); if(b) b.click(); return !!b; })()`);
    await sleep(500);
  }
  return await panelOpen();
};
const ensureClosed = async () => {
  for (let i = 0; i < 5; i++) {
    if (!(await panelOpen())) return true;
    await evaluate(`(() => { const ov=document.querySelector('div.fixed.inset-0.z-40'); if(ov){ov.click(); return "backdrop";}
      const b=document.querySelector('button[aria-label="Notificaciones de Necto IA"]'); if(b) b.click(); return "bell"; })()`);
    await sleep(500);
  }
  return !(await panelOpen());
};

// Run a snippet with `panel` bound to the dropdown element, so control lookups
// can never escape into the rest of the shell.
const inPanel = (js) => evaluate(`(() => {
  const b = document.querySelector('button[aria-label="Notificaciones de Necto IA"]');
  const root = b && b.closest("div.relative");
  const panel = root && root.querySelector("div.absolute");
  if (!panel) return null;
  ${js}
})()`);

const openSettings = () => evaluate(`
  (() => { const b = document.querySelector('button[title="Configuración de sede"]'); if (!b) return false; b.click(); return true; })()
`);

console.log("\n########## FLUJO 3: estado vacio ##########\n");
await seed();
// El rol **ya no vive en el sidebar** (lote 13). `SidebarFooter` sigue recibiendo
// `activeRoleName` pero no lo pinta —es una prop muerta—: su pie ahora es
// Dashboard, Configuración, Ayuda, Soporte y Cerrar sesión. El rol se mudó al
// dropdown de perfil, donde es una píldora informativa:
// `<span title="Rol de la cuenta: …">`. Se repunta la aserción a donde el rol
// está de verdad, abriendo antes el dropdown.
await evaluate(
  `(() => { const b=document.querySelector('button[aria-label="Perfil de usuario y sucursales"]'); if(b) b.click(); return !!b; })()`
);
await sleep(600);
const roleRow = await evaluate(`
  (() => { const r = document.querySelector('[title^="Rol de la cuenta"]');
    return r ? { tag: r.tagName, title: r.getAttribute('title'), interactive: !!r.closest('button') } : null; })()
`);
check("el dropdown de perfil muestra el rol", !!roleRow, JSON.stringify(roleRow));
check(
  "el rol es una píldora informativa (no es un botón)",
  roleRow?.tag === "SPAN" && roleRow?.interactive === false,
  JSON.stringify(roleRow)
);
// Se guarda la nueva ubicación del rol: es un cambio de UI que conviene mirar.
await shot("00-sidebar-rol.png");
// El dropdown se cierra: dejarlo abierto pondría una capa que intercepta clicks
// y desincronizaría las aserciones siguientes.
await evaluate(
  `(() => { const b=document.querySelector('button[aria-label="Perfil de usuario y sucursales"]'); if(b) b.click(); return !!b; })()`
);
await sleep(500);
check("El panel arranca cerrado", !(await panelOpen()));
check("La campana abre el panel", await ensureOpen());
await sleep(500);
// Scoped to the panel itself — `body.innerText` is the wrong instrument: it
// also picks up aria/hidden text from the rest of the shell.
const panelEmpty = (await evaluate(PANEL)) || "";
check("Estado vacio: titulo presente", panelEmpty.includes("Sin notificaciones por ahora"));
check("Estado vacio: texto de ayuda presente", panelEmpty.includes("Aquí verás los avisos de tu operación."));
check("Estado vacio: sin badge 'nuevas'", !/\d+ nuevas/.test(panelEmpty));
check("Nada persistido con la cola vacia", (await readQueue()) === null);
await shot("01-estado-vacio.png");
check("Cerrar el panel funciona (backdrop)", await ensureClosed());
check("El cierre se refleja en aria-expanded", !(await panelOpen()));

console.log("\n########## FLUJO 1: guardar configuracion -> notificacion visible ##########\n");

check("Boton 'Configuracion de Sede' encontrado y clickeado", await openSettings());
await sleep(2000);
await waitFor(`!!document.getElementById("business-settings-title")`, "settings modal", 15000);
check("Modal de configuracion abierto", true);
await shot("02-modal-abierto.png");

const dlg = `document.getElementById("business-settings-title").closest('[role=dialog]')`;
const tabNames = await evaluate(`[...${dlg}.querySelectorAll('button')].map(b=>(b.innerText||'').trim()).filter(Boolean).slice(0,20)`);
console.log("  controles del modal:", JSON.stringify(tabNames));

const clickTab = (name) => evaluate(`
  (() => { const bs=[...${dlg}.querySelectorAll('button')];
    const h=bs.find(b=>new RegExp('^'+${JSON.stringify(name)}+'$','i').test((b.innerText||'').trim()));
    if(!h) return null; h.click(); return h.innerText.trim(); })()
`);

// NOTE: the modal has NO "store pace" control. Its only range input is the
// logo/banner framing control in "Marca y visual" (TransformControls). Store
// pace is a 3-state value (rapida|habitual|demorada) whose only setter,
// `setStorePace`, has no UI consumer anywhere in src/ — so emitter #1 of the
// notification pipeline is unreachable today. What this flow actually proves
// is emitter #2: `handleSave` publishes on every save, pace change or not.
let sliderTab = null;
for (const t of ["Operaciones", "General", "Canales de entrada", "Pagos", "Marca y visual"]) {
  const ok = await clickTab(t);
  if (!ok) continue;
  await sleep(900);
  const n = await evaluate(`${dlg}.querySelectorAll('input[type=range]').length`);
  console.log(`  [${t}] range inputs=${n}`);
  if (n > 0) { sliderTab = t; break; }
}

check("Se encontro un input range en el modal (encuadre de logo/banner)", !!sliderTab, sliderTab ? `pestana "${sliderTab}"` : "no encontrado");

const paceControl = await evaluate(`
  (() => { const rs = [...${dlg}.querySelectorAll('input[type=range]')];
    const labels = rs.map(r => ((r.closest('div')?.innerText || '').trim().split('\\n')[0] || '').slice(0, 24));
    return { count: rs.length, labels,
      anyRitmo: rs.some(r => /ritmo/i.test(r.closest('div')?.innerText || '')) }; })()
`);
console.log("  ranges del modal:", JSON.stringify(paceControl));
// The question is not "how many" but "does any of them control the pace?".
check("Ningun range del modal controla el ritmo",
  paceControl.count > 0 && paceControl.anyRitmo === false,
  JSON.stringify(paceControl));

if (sliderTab) {
  const info = await evaluate(`
    (() => { const r = ${dlg}.querySelector('input[type=range]');
      return { value: r.value, min: r.min, max: r.max, label: (r.closest('div')?.innerText||'').slice(0,100) }; })()
  `);
  console.log("  control de encuadre:", JSON.stringify(info));
  await shot("03-modal-marca-visual.png");

  // Move the framing control through React's own value tracker
  await evaluate(`
    (() => {
      const r = ${dlg}.querySelector('input[type=range]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      const target = r.value === r.max ? r.min : String(Number(r.value) + 1);
      setter.call(r, target);
      r.dispatchEvent(new Event('input', { bubbles: true }));
      r.dispatchEvent(new Event('change', { bubbles: true }));
      return r.value;
    })()
  `);
  await sleep(800);
  const afterSlider = await evaluate(`${dlg}.querySelector('input[type=range]').value`);
  console.log("  valor del control tras mover:", afterSlider);

  // Save
  const saved = await evaluate(`
    (() => { const bs=[...${dlg}.querySelectorAll('button')];
      const h=bs.find(b=>/^Guardar/i.test((b.innerText||'').trim()));
      if(!h) return null; h.click(); return h.innerText.trim(); })()
  `);
  console.log("  boton guardar:", JSON.stringify(saved));
  await sleep(2500);

  const queueAfter = await readQueue();
  console.log("  cola persistida:", JSON.stringify(queueAfter));
  check("El guardado persistio exactamente 1 notificacion", Array.isArray(queueAfter) && queueAfter.length === 1,
    Array.isArray(queueAfter) ? `${queueAfter.length} item(s)` : String(queueAfter));
  check("Ningun item persistido usa el sourceKey de ritmo",
    Array.isArray(queueAfter) && !queueAfter.some((n) => n.sourceKey === "store_pace_changed"),
    Array.isArray(queueAfter) ? JSON.stringify(queueAfter.map((n) => n.sourceKey)) : "n/a");
  check("Modal cerrado tras guardar", !(await evaluate(`!!document.getElementById("business-settings-title")`)));

  // Every assertion below is scoped to the dropdown panel itself. `body.innerText`
  // is the wrong instrument here: the shell is full of hidden/aria text, and a
  // positive assertion on the OPEN panel is what we actually mean.
  const didOpen = await ensureOpen();
  const panelText = await evaluate(PANEL);
  check("Se abrio el panel de la campana", didOpen && panelText !== null, panelText === null ? "panel no encontrado" : "ok");
  const pt = panelText || "";
  check("El panel lista 'Configuración guardada'", pt.includes("Configuración guardada"));
  check("El panel NO lista la notificacion de ritmo (era un falso positivo)",
    !pt.includes("Ritmo de operación actualizado"),
    "el modal no tiene control de ritmo, asi que no puede afirmar que cambio");
  check("El panel muestra el badge '1 nuevas'", pt.includes("1 nuevas"));
  check("El panel NO muestra el estado vacio", !pt.includes("Sin notificaciones por ahora"));
  check("El timestamp es relativo", /Ahora|Hace \d+/.test(pt));
  await shot("04-campana-con-notificaciones.png");

  // ---- Flow 2: persistence across reload ----
  console.log("\n########## FLUJO 2: persistencia tras recargar ##########\n");
  await goto(APP + "/app");
  await waitFor(`!!document.querySelector('button[aria-label="Notificaciones de Necto IA"]')`, "bell", 30000);
  check("Tras recargar, la campana reabre el panel", await ensureOpen());
  const panel2 = await evaluate(PANEL);
  check("Tras recargar, 'Configuración guardada' sigue en el panel", !!panel2 && panel2.includes("Configuración guardada"));
  check("Tras recargar, la cola sigue en localStorage", Array.isArray(await readQueue()));
  await shot("05-tras-recargar.png");

  // Timestamp must be relative + derived, not a frozen string
  const timeLabel = ((await evaluate(PANEL)) || "").match(/Ahora|Hace \d+ (min|h|d)/);
  check("El timestamp se renderiza relativo (no congelado)", !!timeLabel, String(timeLabel));

  // ---- Mark all read (scoped to the panel) ----
  const marked = await inPanel(`
    const bs=[...panel.querySelectorAll('button')];
    const h=bs.find(x=>/Marcar leídas/i.test((x.innerText||'').trim()));
    if(!h) return null; h.click(); return true;
  `);
  check("El boton 'Marcar leidas' existe en el panel", marked === true);
  await sleep(800);
  const queueRead = await readQueue();
  check("'Marcar leidas' marca toda la cola como leida",
    Array.isArray(queueRead) && queueRead.every((n) => n.read === true),
    Array.isArray(queueRead) ? JSON.stringify(queueRead.map((n) => n.read)) : "n/a");
  const panelRead = (await evaluate(PANEL)) || "";
  check("Tras marcar, el badge 'nuevas' desaparece del panel", !/\d+ nuevas/.test(panelRead));
}

/* ── FLUJO 4 y 5: WhatsApp (vincular / desvincular) ─────────────────────
 * Both emitters share `sourceKey: "whatsapp_connection"` and the queue
 * refreshes an existing row instead of stacking, so linking and then
 * unlinking inside the 60 s dedupe window is the interesting case.
 * ────────────────────────────────────────────────────────────────────── */

console.log("\n########## FLUJO 4: vincular WhatsApp ##########\n");
await seed();
check("Panel cerrado al empezar el flujo 4", !(await panelOpen()));
check("Boton 'Configuracion de Sede' encontrado", await openSettings());
await sleep(2000);
await waitFor(`!!document.getElementById("business-settings-title")`, "settings modal", 15000);

const dlg2 = `document.getElementById("business-settings-title").closest('[role=dialog]')`;
const clickDlgTab = (name) => evaluate(`
  (() => { const bs=[...${dlg2}.querySelectorAll('button')];
    const h=bs.find(b=>new RegExp('^'+${JSON.stringify(name)}+'$','i').test((b.innerText||'').trim()));
    if(!h) return null; h.click(); return h.innerText.trim(); })()
`);

check("Pestana 'Canales de entrada' abierta", !!(await clickDlgTab("Canales de entrada")));
await sleep(900);

// La UI cambió (lote 13): el vínculo **ya no** es un sub-modal con QR y un paso
// de "Confirmar Vinculación". `WhatsAppConnectPanel` está empotrado en Canales de
// Entrada y su botón primario conecta directamente —en modo demostración, porque
// sin backend no hay Embedded Signup de Meta—. Ver `ChannelsTab`, que lo cablea
// como `onConnectDemo={handleConfirmWhatsAppConnection}`.
const openConnect = await evaluate(`
  (() => { const bs=[...${dlg2}.querySelectorAll('button')];
    const h=bs.find(b=>/^Conectar (con Meta|en modo demostración)$/i.test((b.innerText||'').trim()));
    if(!h) return null; h.click(); return h.innerText.trim(); })()
`);
check("Boton de conexion WhatsApp encontrado", !!openConnect, String(openConnect));
await sleep(900);

// Ya no hay paso de confirmación: el botón del panel ES el disparador.
// `handleConfirmWhatsAppConnection` publica la notificación tras su propio
// setTimeout de 1800 ms, así que se espera por encima de eso.
await sleep(3000);

const q4 = await readQueue();
console.log("  cola tras vincular:", JSON.stringify(q4));
check("Vincular persiste exactamente 1 notificacion", Array.isArray(q4) && q4.length === 1,
  Array.isArray(q4) ? `${q4.length} item(s)` : String(q4));
check("Titulo 'WhatsApp vinculado'", q4?.[0]?.title === "WhatsApp vinculado", JSON.stringify(q4?.[0]?.title));
check("type 'system'", q4?.[0]?.type === "system", String(q4?.[0]?.type));
check("sourceKey 'whatsapp_connection'", q4?.[0]?.sourceKey === "whatsapp_connection", String(q4?.[0]?.sourceKey));
check("La descripcion menciona la sesion activa", String(q4?.[0]?.desc || "").includes("quedó activa"));
// `necto_whatsapp_connected` se **retiró a propósito**: la conexión dejó de ser
// del navegador —dos tiendas compartían el mismo "conectado" y una tienda nueva
// nacía conectada— y la única fuente es `business.channelConnections`
// (`ChannelConnection[]`). Se asserta esa fuente, no la clave muerta.
const channelStatus = () => evaluate(`
  (() => { try {
    const bs = JSON.parse(localStorage.getItem("necto_businesses") || "[]");
    const b = bs.find(x => x.id === "biz-harness");
    const c = (b?.channelConnections || []).find(x => x.type === "whatsapp");
    return c?.status ?? null;
  } catch { return "PARSE_ERR"; } })()
`);
const connAfterConnect = await channelStatus();
check("la conexion queda en channelConnections (status connected)",
  connAfterConnect === "connected", String(connAfterConnect));

console.log("\n########## FLUJO 5: desvincular WhatsApp (dentro de la ventana de dedupe) ##########\n");
/*
  Conectar **reinicia la pestaña activa del modal a "General"**.

  No es un artefacto del arnés: `setChannelConnection` reemplaza el objeto
  `business`, el hook `useBusinessSettingsForm` se re-inicializa y `activeTab`
  vuelve a su valor por defecto. Con la pestaña en "General" el contenido de
  Canales está desmontado —el panel vive dentro de `{enableWhatsapp && …}` en
  `ChannelsTab`— así que hay que volver a entrar antes de buscar el botón.
*/
await clickDlgTab("Canales de entrada");
await sleep(900);
// El botón de desconexión del panel se llama `Desconectar`, no `Desvincular`.
const disc = await evaluate(`
  (() => { const bs=[...${dlg2}.querySelectorAll('button')];
    const h=bs.find(b=>/^Desconectar$/i.test((b.innerText||'').trim()));
    if(!h) return null; h.click(); return true; })()
`);
check("Boton 'Desconectar' encontrado y clickeado", disc === true);
await sleep(1200);

const q5 = await readQueue();
console.log("  cola tras desvincular:", JSON.stringify(q5));
check("Desvincular no apila una segunda fila (dedupe por sourceKey)",
  Array.isArray(q5) && q5.length === 1, Array.isArray(q5) ? `${q5.length} item(s)` : String(q5));
check("La descripcion pasa a la de desvinculacion",
  String(q5?.[0]?.desc || "").includes("La sesión se cerró"), JSON.stringify(q5?.[0]?.desc));
// A refresh must not keep a stale title/type: the row has to describe the
// LATEST state of the connection, not the state it was created in.
check("El titulo pasa a 'WhatsApp desvinculado'", q5?.[0]?.title === "WhatsApp desvinculado",
  `titulo actual: ${JSON.stringify(q5?.[0]?.title)}`);
check("El type pasa a 'alert'", q5?.[0]?.type === "alert", `type actual: ${JSON.stringify(q5?.[0]?.type)}`);
const connAfterDisconnect = await channelStatus();
check("la desconexion se refleja en channelConnections (ya no 'connected')",
  connAfterDisconnect !== "connected", String(connAfterDisconnect));

// Close the settings overlay and read what the bell actually paints.
await evaluate(`(() => { const bs=[...document.querySelectorAll('button')];
  const h=bs.find(b=>/^Descartar$/i.test((b.innerText||'').trim())); if(h) h.click(); return !!h; })()`);
await sleep(1200);
const opened5 = await ensureOpen();
const panel5 = (await evaluate(PANEL)) || "";
check("La campana muestra 'WhatsApp desvinculado'", opened5 && panel5.includes("WhatsApp desvinculado"),
  panel5.slice(0, 90).replace(/\n/g, " | "));
check("La campana NO muestra el titulo obsoleto 'WhatsApp vinculado'", !panel5.includes("WhatsApp vinculado"));
await shot("06-whatsapp-desvinculado.png");

/* ── FLUJO 6: smoke test de las 6 pestanas y las 6 sub-pestanas del bot ──
 * The bot tab is the largest file in the app (1168 LOC) and had never been
 * rendered during verification. A module full of undefined identifiers
 * transforms perfectly and throws the instant React renders it, so the point
 * here is to catch `Runtime.exceptionThrown`, not to assert styling.
 * ────────────────────────────────────────────────────────────────────── */

console.log("\n########## FLUJO 6: smoke test de todas las pestanas ##########\n");
await seed();
check("Configuracion de Sede abierta", await openSettings());
await sleep(2000);
await waitFor(`!!document.getElementById("business-settings-title")`, "settings modal", 15000);

const dlg3 = `document.getElementById("business-settings-title").closest('[role=dialog]')`;
const content = () => evaluate(`(() => { const f=${dlg3}.querySelector("form"); return f ? f.innerText : null; })()`);
const newExceptions = () => cdp.events.filter((e) =>
  e.method === "Runtime.exceptionThrown" &&
  !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e))).length;

check("El modal expone un <form> como area de contenido", (await content()) !== null);

const clickBtn = (label) => evaluate(`
  (() => { const bs=[...${dlg3}.querySelectorAll('button')];
    const h=bs.find(b=>new RegExp('^'+${JSON.stringify(label)}+'$','i').test((b.innerText||'').trim()));
    if(!h) return null; h.click(); return h.innerText.trim(); })()
`);

let prevText = "";
for (const t of ["General", "Canales de entrada", "Asistente de WhatsApp IA", "Pagos", "Marca y visual", "Operaciones"]) {
  const before = newExceptions();
  const clicked = await clickBtn(t);
  await sleep(900);
  const text = (await content()) || "";
  const after = newExceptions();
  check(`[${t}] renderiza contenido`, clicked !== null && text.length > 100, `len=${text.length} click=${JSON.stringify(clicked)}`);
  check(`[${t}] sin excepciones de runtime`, after === before, after > before ? "NUEVA EXCEPCION" : "ok");
  if (t !== "General") check(`[${t}] el contenido cambia respecto a la pestana anterior`, text !== prevText);
  prevText = text;
}

console.log("\n--- sub-pestanas del Asistente de WhatsApp IA ---\n");
await clickBtn("Asistente de WhatsApp IA");
await sleep(900);
// ⚠️ Los rótulos tienen que ser los **exactos** de `BOT_SUB_TABS`
// (`business-settings.constants.ts`): `clickBtn` compara con `^…$`, no por
// subcadena. Aquí decía "Identidad", "Horarios" y "Experiencia" —abreviaturas
// que no existen en la barra—, así que esos tres clics no enganchaban y sus
// comprobaciones pasaban en verde comparando el contenido del asistente consigo
// mismo: la aserción "el contenido cambia" no medía ningún cambio.
let prevSub = "";
for (const st of ["Identidad y comportamiento", "Conocimiento y capacidades", "Reglas de pedidos", "Pasar a un asesor", "Horarios y disponibilidad", "Experiencia del cliente"]) {
  const before = newExceptions();
  const clicked = await clickBtn(st);
  await sleep(900);
  const text = (await content()) || "";
  const after = newExceptions();
  check(`[bot:${st}] renderiza contenido`, clicked !== null && text.length > 100, `len=${text.length}`);
  check(`[bot:${st}] sin excepciones de runtime`, after === before, after > before ? "NUEVA EXCEPCION" : "ok");
  // Cada sub-pestana debe CAMBIAR el contenido. Sin esto, un click que no
  // engancha (copy desalineado) daria `len` identico al anterior y pasaria.
  check(`[bot:${st}] el contenido cambia respecto a la sub-pestana anterior`,
        clicked !== null && text !== prevSub, `len=${text.length}`);
  prevSub = text;
}
await shot("07-bot-experiencia.png");

console.log("\n########## Errores de runtime ##########\n");
const errs = cdp.events.filter((e) => e.method === "Runtime.exceptionThrown" ||
  (e.method === "Log.entryAdded" && e.params?.entry?.level === "error"));
const filtered = errs.filter((e) => !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e)));
check("Sin excepciones de runtime", filtered.length === 0,
  filtered.length ? JSON.stringify(filtered.slice(0, 2)).slice(0, 700) : "(none)");

console.log(`\n########## RESULTADO: ${results.length - failures}/${results.length} OK ##########\n`);
cdp.close();
process.exit(failures === 0 ? 0 : 1);
