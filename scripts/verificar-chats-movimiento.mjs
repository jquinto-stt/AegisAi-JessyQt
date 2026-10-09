// Guarda del movimiento de la consola de CHATS (`ConversacionesPage` / `ChatView`
// / `Composer`) — tercera pantalla de la cadencia Inicio -> Tablero -> Chats ->
// Inventarios.
//
// Uso:  CDP_BASE=http://127.0.0.1:9333 APP_URL=http://localhost:6020 \
//         node scripts/verificar-chats-movimiento.mjs
//
// ── Qué se comprueba, y por qué cada cosa ──────────────────────────────────
//
// 1. LA TRANSICIÓN ENTRE PESTAÑAS. `ChatView` alterna «Conversación» e
//    «Historial de pedidos» con un ternario cuyas DOS ramas son un `<div>`.
//    React reconcilia por posición, así que sin `key` reutiliza el MISMO nodo y
//    el `animate-aparecer` no se vuelve a disparar: el cambio de pestaña era un
//    salto seco. Se comprueban las dos mitades —que el nodo es NUEVO tras la
//    ida y vuelta, y que trae un fundido real—, porque cualquiera de las dos
//    sola pasa en verde con el defecto presente: sin `key` el fundido no existe
//    (falla la segunda) y con `key` pero sin clase el nodo es nuevo y no funde
//    (falla la primera).
//
// 2. EL BOTÓN «↓ Nuevos mensajes» entra con fundido en vez de aparecer de golpe.
//
// 3. EL AUTO-SCROLL RESPETA `prefers-reduced-motion`. Esta es la comprobación
//    que más importa y la única que mide ACCESIBILIDAD, no estética.
//    `scrollIntoView({ behavior: "smooth" })` es movimiento que el navegador NO
//    neutraliza con la media query —la guarda de `css/base.css` solo alcanza a
//    las animaciones declaradas en el tema—, así que un desplazamiento suave se
//    ejecuta igual aunque el usuario haya pedido menos movimiento. Se sustituyó
//    por `comportamientoScroll()`. Aquí se engancha `Element.prototype
//    .scrollIntoView` y se LEE el `behavior` que el producto pide de verdad, en
//    los dos estados de la preferencia. Una aserción sobre el código fuente no
//    valdría: probaría que la función existe, no que se llama.
//
// ── Las trampas que este arnés lleva incorporadas ──────────────────────────
//
// A. EL PUERTO. Los dos `vite.config.ts` del repo —el nuestro y el de
//    `Repo-prueba-master`— declaran 6020, así que gana el que arranque primero.
//    `APP_URL` es OBLIGATORIO y además se comprueba que el servidor sirva de
//    verdad nuestro árbol, pidiendo los dos módulos bajo prueba: si no llegan
//    como JavaScript con sus marcadores, se ABORTA en vez de medir otro
//    checkout y reportar verde.
//
// B. LA VENTANA DE LA ANIMACIÓN. Una animación de 200 ms se escapa si se lee
//    «cuando convenga». Por eso no se lee: se VIGILA desde dentro de la página
//    con `requestAnimationFrame` hasta verla, y solo entonces se resuelve. Un
//    cero pasa a significar «no se animó», no «la sonda llegó tarde».
//
// C. LA ASERCIÓN VACUA. «Con reduced-motion no se anima» es cierto si el
//    disparador no hizo nada. Por eso la fase 4 exige que la preferencia haya
//    llegado a la página Y que la llamada se haya producido, y compara el
//    `behavior` de los dos estados: si ambos leyeran lo mismo, la fase no
//    probaría nada.
//
// D. LOS DATOS. El disparador es abrir/cerrar pestañas y pulsar «Nuevos
//    mensajes»: estado puro de React. No se envía ningún mensaje ni se mueve
//    ningún pedido, así que el arnés no escribe en Supabase.
//
// E. LA SESIÓN SIN SEMBRAR. Sin sesión, la app redirige a `/login` y todas las
//    aserciones pasarían por vacío midiendo un formulario. La fase 1 siembra
//    sesión, organización y canales, y comprueba que la ruta pedida es la que
//    quedó montada.
const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL;

if (!APP) {
  console.error(
    "\n  ABORTADO: falta APP_URL.\n" +
      "  El puerto NO es fijo: los dos vite.config.ts declaran 6020 y gana el que\n" +
      "  arranque primero. Comprueba el que sirve TU árbol y pásalo explícito:\n" +
      "    netstat -ano | grep LISTENING | grep -E ':60(20|21)'\n" +
      "    CDP_BASE=http://127.0.0.1:9333 APP_URL=http://localhost:6020 node scripts/verificar-chats-movimiento.mjs\n",
  );
  process.exit(2);
}

async function getPageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const t = await (await fetch(`${CDP_BASE}/json/list`)).json();
      const p = t.find((x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
      if (p) return p;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("no hay target de pagina en CDP");
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    const events = [];
    ws.addEventListener("open", () =>
      resolve({
        events,
        send(m, p = {}) {
          return new Promise((res, rej) => {
            const i = ++id;
            pending.set(i, { res, rej });
            ws.send(JSON.stringify({ id: i, method: m, params: p }));
          });
        },
        close: () => ws.close(),
      }),
    );
    ws.addEventListener("error", reject);
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(e.data);
      if (m.method) events.push(m);
      if (m.id && pending.has(m.id)) {
        const { res, rej } = pending.get(m.id);
        pending.delete(m.id);
        m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
      }
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Preflight: ¿el servidor sirve NUESTRO árbol? ───────────────────────────
//
// Pide los dos módulos que llevan el cambio y exige sus marcadores. Devuelve
// HTML => es el fallback de la SPA (esa ruta no existe). Devuelve otro JS => es
// otro checkout. En ninguno de los dos casos se mide: se aborta.
{
  const objetivos = [
    { url: `${APP}/src/utils/index.ts`, marcador: "comportamientoScroll" },
    { url: `${APP}/src/pages/conversaciones/components/ChatView.tsx`, marcador: "animate-aparecer" },
  ];
  for (const o of objetivos) {
    let res, cuerpo;
    try {
      res = await fetch(o.url);
      cuerpo = await res.text();
    } catch (e) {
      console.error(`\n  ABORTADO: no responde ${o.url}\n  ${e.message}\n`);
      process.exit(2);
    }
    const tipo = res.headers.get("content-type") || "";
    if (!tipo.includes("javascript") || !cuerpo.includes(o.marcador)) {
      console.error(
        `\n  ABORTADO: ${APP} no está sirviendo el árbol de trabajo.\n` +
          `  ${o.url}  ->  ${res.status} ${tipo} (${cuerpo.length} B)\n` +
          (tipo.includes("html")
            ? "  Devolvió HTML: es el fallback de la SPA, esa ruta no existe en el servidor.\n"
            : `  No contiene \`${o.marcador}\`: es otro checkout, o Vite no ha recargado.\n`),
      );
      process.exit(2);
    }
  }
  console.log(`  preflight  ${APP} sirve el árbol de trabajo (2/2 módulos con marcador)\n`);
}

const cdp = await connect((await getPageTarget()).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
await cdp.send("Page.enable");
await cdp.send("DOM.enable");
await cdp.send("Network.enable");
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
// Supabase BLOQUEADO a propósito: este arnés mide MOVIMIENTO de la interfaz, no
// el backend. Sin bloquearlo, `cargarDesdeBase()` reemplaza el seed por las filas
// reales —que pueden ser cero— y la conversación autoseleccionada se queda
// apuntando a un id que ya no existe: ChatView deja de montar y no habría
// pestañas que medir. Bloqueado, el store cae al seed con su motivo y la pantalla
// queda determinista. La contrapartida se dice: lo que se mide aquí es la UI con
// datos de ejemplo, no la lectura de la base.
await cdp.send("Network.setBlockedURLs", { urls: ["*supabase.co*", "*supabase.in*"] });
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1600,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

const ev = async (expression) => {
  const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

const esperar = async (expression, etiqueta, timeoutMs = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      if (await ev(expression)) return true;
    } catch {}
    await sleep(300);
  }
  console.log(`  (aviso) no montó a tiempo: ${etiqueta}`);
  return false;
};

let fails = 0;
const check = (l, ok, d) => {
  if (!ok) fails++;
  console.log(`  ${ok ? "OK  " : "FAIL"}  ${l}${d !== undefined ? "  -> " + d : ""}`);
};

// ── Semilla ────────────────────────────────────────────────────────────────
//
// `conversaciones` persiste en `necto.conversaciones_v3`: se borra para forzar
// el seed y que la bandeja no dependa de lo que dejara una corrida anterior.
// Los canales van ACTIVOS: con los canales caídos y la bandeja vacía la página
// pinta el estado vacío y no habría chat que medir.
const sembrar = () =>
  ev(`(() => {
    localStorage.removeItem("necto.conversaciones_v3");
    localStorage.setItem("necto.session", JSON.stringify({
      modulos:["pedidos","conversaciones","asistente","inventarios"],
      tipoSesion:"administrador", operadorSimuladoId:"op-1", preSimulacion:null,
    }));
    localStorage.setItem("necto.organizacion.v1", JSON.stringify({
      usuario:{nombre:"Vera",perfilCompletado:true},
      organizacion:{id:"org-1",nombre:"Boutique Roma",slug:"boutique-roma",pais:"Colombia",moneda:"COP",
        zonaHoraria:"America/Bogota",tipoEmpresa:"Comercio",tamanoEquipo:"2 a 5 personas",
        logoUrl:"",fechaCreacion:new Date().toISOString()},
      modulos:{pedidos:{instalado:true,activo:true,conectores:{necto_ia:true,whatsapp:true}},
        conversaciones:{instalado:true,activo:true,conectores:{whatsapp:true}},inventarios:{instalado:true,activo:true}},
    }));
    localStorage.setItem("pedidos_canales_integraciones", JSON.stringify({whatsapp:true,instagram:false,facebook:false}));
    return true;
  })()`);

// ── Sondas dentro de la página ─────────────────────────────────────────────
//
// Sin backticks y sin comentarios `//` dentro de estos literales: el payload se
// embebe en una plantilla de JS y un backtick o un `//` lo rompen en silencio.

const PANEL = (etiqueta) => `document.querySelector('[role="tabpanel"][aria-label="' + ${JSON.stringify(etiqueta)} + '"]')`;

const MONTADO = `!!document.querySelector('[role="tablist"]') && ${PANEL("Conversación")} !== null`;

const CHAT_SCROLL = `(() => {
  const c = ${PANEL("Conversación")};
  if (!c) return null;
  return { scrollHeight: c.scrollHeight, clientHeight: c.clientHeight, desplazable: c.scrollHeight - c.clientHeight };
})()`;

const SUBIR_CHAT = `(() => {
  const c = ${PANEL("Conversación")};
  if (!c) return false;
  c.scrollTop = 0;
  return true;
})()`;

const BAJAR_CHAT = `(() => {
  const c = ${PANEL("Conversación")};
  if (!c) return null;
  c.scrollTop = c.scrollHeight;
  return c.scrollTop;
})()`;

// El botón «↓ Nuevos mensajes» lo enciende `handleScroll`, que solo corre si el
// contenedor se desplaza DE VERDAD. Y aquí está la trampa: al volver a la
// pestaña «Conversación» el panel se remonta y el hilo arranca YA arriba, así que
// poner `scrollTop = 0` sobre algo que ya vale 0 no emite ningún evento y el
// botón no aparece nunca —un FAIL que acusaría al producto de una sonda mal
// colocada—. Hay que bajar primero y subir después.
const prepararBotonNuevos = async () => {
  await ev(BAJAR_CHAT);
  await sleep(250);
  await ev(SUBIR_CHAT);
};

const MARCAR_PANEL = `(() => {
  const p = ${PANEL("Conversación")};
  if (!p) return false;
  window.__panelConversacion = p;
  return true;
})()`;

const PANEL_ES_EL_MISMO_NODO = `(() => {
  const p = ${PANEL("Conversación")};
  return p !== null && p === window.__panelConversacion;
})()`;

const PULSAR_PESTANA = (etiqueta) => `(() => {
  const b = [...document.querySelectorAll('[role="tab"]')]
    .find((x) => x.textContent.trim().includes(${JSON.stringify(etiqueta)}));
  if (!b) return false;
  b.click();
  return true;
})()`;

const PULSAR_NUEVOS = `(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Nuevos mensajes'));
  if (!b) return false;
  b.click();
  return true;
})()`;

// Vigila una animación hasta verla, desde DENTRO de la página. Devuelve las
// animaciones que el nodo tenga en el fotograma en que se detectan, o la lista
// vacía si a los 3 s el nodo existe pero nunca animó.
const VIGILAR_PANEL = (etiqueta) => `(() => new Promise((resolve) => {
  const t0 = performance.now();
  const tick = () => {
    const p = ${PANEL(etiqueta)};
    if (p) {
      const anims = p.getAnimations().map((a) => ({ nombre: a.animationName || '(js)', dur: a.effect.getTiming().duration }));
      if (anims.length > 0) { resolve({ montado: true, anims: anims }); return; }
    }
    if (performance.now() - t0 > 3000) { resolve({ montado: !!p, anims: [] }); return; }
    requestAnimationFrame(tick);
  };
  tick();
}))()`;

const VIGILAR_BOTON_NUEVOS = `(() => new Promise((resolve) => {
  const t0 = performance.now();
  const buscar = () => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Nuevos mensajes'));
  const tick = () => {
    const b = buscar();
    if (b) {
      const anims = b.getAnimations().map((a) => ({ nombre: a.animationName || '(js)', dur: a.effect.getTiming().duration }));
      if (anims.length > 0) { resolve({ visible: true, anims: anims }); return; }
    }
    if (performance.now() - t0 > 3000) { resolve({ visible: !!b, anims: [] }); return; }
    requestAnimationFrame(tick);
  };
  tick();
}))()`;

// Sonda del auto-scroll: engancha `scrollIntoView` y anota el `behavior` que el
// producto pide. Es lo único que prueba que `comportamientoScroll()` se usa de
// verdad: una aserción sobre el fuente solo probaría que la función existe.
const INSTALAR_SONDA_SCROLL = `(() => {
  if (!window.__sondaScroll) {
    const original = Element.prototype.scrollIntoView;
    window.__sondaScroll = { llamadas: [], original: original };
    Element.prototype.scrollIntoView = function (opts) {
      window.__sondaScroll.llamadas.push(opts && opts.behavior ? opts.behavior : '(sin opciones)');
      return original.apply(this, arguments);
    };
  }
  window.__sondaScroll.llamadas = [];
  return true;
})()`;

const LEER_SONDA_SCROLL = `(() => (window.__sondaScroll ? window.__sondaScroll.llamadas : null))()`;

const excepciones = () =>
  cdp.events.filter(
    (e) =>
      e.method === "Runtime.exceptionThrown" &&
      !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e)),
  );

// React informa de un error de render por `console.error` con el STACK DE
// COMPONENTES («The above error occurred in the <X> component»). Sin capturarlo,
// un «fewer hooks than expected» no dice en QUÉ componente, y se pierde el
// tiempo leyendo el árbol entero.
const erroresConsola = () =>
  cdp.events
    .filter((e) => e.method === "Runtime.consoleAPICalled" && e.params.type === "error")
    .map((e) => (e.params.args || []).map((a) => a.value || a.description || "").join(" "))
    .filter((t) => t && !/favicon|\[vite\]|DevTools|ResizeObserver/.test(t));

// Delta por paso: un total al final dice que ALGO lanzó; el delta dice CUÁL.
let errPrev = 0;
const delta = (etiqueta) => {
  const n = excepciones().length;
  if (n !== errPrev) {
    console.log(`  !! ${n - errPrev} excepción(es) nueva(s) tras: ${etiqueta}`);
    const desc = excepciones()
      .slice(errPrev)
      .map((e) => e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text)
      .map((t) => String(t).split("\n")[0]);
    for (const d of desc) console.log(`     - ${d}`);
    const comp = erroresConsola().filter((t) => /The above error occurred/.test(t));
    if (comp.length) console.log(`     ${comp[comp.length - 1].split("\n").slice(0, 12).join(" | ")}`);
  }
  errPrev = n;
};

const esFundidoDePanel = (anims) =>
  anims.some((a) => a.nombre === "aparecer" && a.dur === 200);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 1 — montar la consola de chats
// ═══════════════════════════════════════════════════════════════════════════
console.log("── Fase 1 · montar la consola de chats ──");

// Primero una ruta cualquiera para tener ORIGEN: `localStorage` no se puede
// escribir en `about:blank` (origen opaco). No se usa /login porque la app
// redirige a un usuario ya autenticado y el formulario nunca pintaría.
await cdp.send("Page.navigate", { url: APP + "/" });
await esperar(`!!document.querySelector('#root') && location.origin !== 'null'`, "origen disponible");
await sembrar();

// La ruta es `/pedidos/chats`: `/conversaciones` es un `<Navigate>` que
// redirige, así que navegar a la ruta corta mediría la redirección y no la
// pantalla.
await cdp.send("Page.navigate", { url: APP + "/pedidos/chats" });
const monto = await esperar(MONTADO, "consola de chats montada", 60000);
if (!monto) {
  const ruta = await ev("location.pathname + location.search");
  console.error(
    `\n  ABORTADO: la consola no montó (la página está en ${ruta}).\n` +
      "  La ruta es /pedidos/chats (exige el módulo `pedidos` y `channels.read`).\n" +
      "  Si la ruta es correcta, la bandeja está VACÍA: no hay chat que medir.\n",
  );
  cdp.close();
  process.exit(3);
}
await sleep(600);

// Estabilidad: que el panel siga montado durante ~1,8 s seguidos. Un montaje que
// se desmonta a los pocos cientos de milisegundos no es un montaje —es la
// selección quedándose colgada cuando la fuente de datos cambia—, y medir sobre
// él produciría FAILs que hablan del arranque, no del movimiento.
let estable = true;
for (let i = 0; i < 12; i++) {
  await sleep(150);
  if (!(await ev(`${PANEL("Conversación")} !== null`))) {
    estable = false;
    break;
  }
}

check("la ruta montada es /pedidos/chats", (await ev("location.pathname")) === "/pedidos/chats");
check(
  "el panel de Conversación sigue montado 1,8 s después (el montaje es estable)",
  estable === true,
  estable ? undefined : "el panel se desmontó solo: la selección quedó colgando",
);
check("hay un panel de Conversación montado", (await ev(`${PANEL("Conversación")} !== null`)) === true);

const info = await ev(CHAT_SCROLL);
check(
  "el hilo es desplazable (sin eso el botón «Nuevos mensajes» nunca aparece)",
  info !== null && info.desplazable > 150,
  info ? `scrollHeight=${info.scrollHeight} clientHeight=${info.clientHeight} desplazable=${info.desplazable}` : "no hay panel",
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 2 — la pestaña cambia con un nodo NUEVO y con fundido
// ═══════════════════════════════════════════════════════════════════════════
console.log("── Fase 2 · transición entre pestañas ──");

await ev(MARCAR_PANEL);
const hayPestanaPedidos = await ev(
  `[...document.querySelectorAll('[role="tab"]')].some((x) => x.textContent.trim().includes('Historial de pedidos'))`,
);
check("existe la pestaña «Historial de pedidos»", hayPestanaPedidos === true);

await ev(PULSAR_PESTANA("Historial de pedidos"));
const aPedidos = await ev(VIGILAR_PANEL("Historial de pedidos"));
delta("abrir la pestaña «Historial de pedidos»");
check("la pestaña «Historial de pedidos» monta su panel", aPedidos.montado === true);
check(
  "el panel de pedidos entra con un fundido de 200 ms",
  esFundidoDePanel(aPedidos.anims),
  JSON.stringify(aPedidos.anims),
);

// Vuelta a «Conversación»: aquí es donde se ve si el `key` está. Sin él React
// reutiliza el nodo y esta comprobación falla aunque la de arriba pase.
await ev(PULSAR_PESTANA("Conversación"));
const aConversacion = await ev(VIGILAR_PANEL("Conversación"));
delta("volver a la pestaña «Conversación»");
check("la pestaña «Conversación» vuelve a montar su panel", aConversacion.montado === true);
// El panel de Conversación NO lleva fundido propio, y es deliberado: su
// superficie ya se anima con la cascada de los mensajes (`animate-entrada-lista`),
// y encadenarle además un fundido sería una segunda animación sobre lo mismo
// —«una animación por superficie»—. Lo que se comprueba aquí es esa decisión:
// que NO se le añadió un fundido, y que la cascada de los mensajes sigue viva.
check(
  "el panel de conversación NO añade un fundido propio (lo anima la cascada de mensajes)",
  esFundidoDePanel(aConversacion.anims) === false,
  JSON.stringify(aConversacion.anims),
);
const cascada = await ev(`(() => {
  const p = ${PANEL("Conversación")};
  if (!p) return -1;
  return p.querySelectorAll('.animate-entrada-lista').length;
})()`);
check("los mensajes del hilo conservan su cascada de entrada", cascada > 0, `n=${cascada}`);
const mismoNodo = await ev(PANEL_ES_EL_MISMO_NODO);
check(
  "tras la ida y vuelta el panel es un NODO NUEVO (el `key` hace su trabajo)",
  mismoNodo === false,
  mismoNodo ? "React reutilizó el mismo nodo: falta `key={vistaActiva}`" : "nodo distinto",
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 3 — el botón «Nuevos mensajes» entra con fundido
// ═══════════════════════════════════════════════════════════════════════════
console.log("── Fase 3 · botón «Nuevos mensajes» ──");

await ev(INSTALAR_SONDA_SCROLL);
await prepararBotonNuevos();
const boton = await ev(VIGILAR_BOTON_NUEVOS);
delta("subir el hilo");
check("al subir el hilo aparece el botón «↓ Nuevos mensajes»", boton.visible === true);
check(
  "el botón entra con un fundido de 200 ms",
  esFundidoDePanel(boton.anims),
  JSON.stringify(boton.anims),
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 4 — el auto-scroll respeta prefers-reduced-motion (accesibilidad)
// ═══════════════════════════════════════════════════════════════════════════
console.log("── Fase 4 · el auto-scroll respeta prefers-reduced-motion ──");

const pulsadoNormal = await ev(PULSAR_NUEVOS);
const llamadasNormal = await ev(LEER_SONDA_SCROLL);
check("el botón «Nuevos mensajes» se pudo pulsar", pulsadoNormal === true);
check(
  "sin la preferencia, el desplazamiento es suave",
  Array.isArray(llamadasNormal) && llamadasNormal.length > 0 && llamadasNormal.every((b) => b === "smooth"),
  JSON.stringify(llamadasNormal),
);

await cdp.send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
const emulado = await ev(`window.matchMedia('(prefers-reduced-motion: reduce)').matches`);
check("la emulación de reduced-motion llegó a la página", emulado === true, `matches=${emulado}`);

// Hay que volver a subir el hilo: el clic anterior bajó al final y el botón ya
// no está. Sin esto la fase leería una lista vacía y pasaría por vacío.
await ev(INSTALAR_SONDA_SCROLL);
await prepararBotonNuevos();
const botonReducido = await ev(VIGILAR_BOTON_NUEVOS);
check(
  "con reduced-motion el botón vuelve a aparecer (el disparador sigue vivo)",
  botonReducido.visible === true,
);

const pulsadoReducido = await ev(PULSAR_NUEVOS);
const llamadasReducido = await ev(LEER_SONDA_SCROLL);
check("el botón se pudo pulsar con la preferencia activa", pulsadoReducido === true);
check(
  "con reduced-motion el desplazamiento SALTA (auto), no se anima",
  Array.isArray(llamadasReducido) && llamadasReducido.length > 0 && llamadasReducido.every((b) => b === "auto"),
  JSON.stringify(llamadasReducido),
);

await cdp.send("Emulation.setEmulatedMedia", { features: [] });

// ═══════════════════════════════════════════════════════════════════════════
// FASE 5 — sin excepciones, y el servidor sigue vivo
// ═══════════════════════════════════════════════════════════════════════════
console.log("── Fase 5 · sin excepciones ──");
const errs = excepciones();
check("la consola de chats no lanzó ninguna excepción", errs.length === 0, errs.length ? JSON.stringify(errs.slice(0, 2)) : "(ninguna)");

// Sonda de vida EN EL MOMENTO del informe: un puerto que respondió hace una hora
// no es un puerto vivo, y un verde sobre un servidor muerto es una mentira.
let vivo = false;
try {
  const r = await fetch(APP + "/");
  vivo = r.status === 200;
} catch {}
check("el servidor sigue respondiendo al emitir el informe", vivo === true, APP);

console.log(`\n  ${fails === 0 ? "TODO OK" : fails + " FAIL"}  (${new Date().toISOString()})`);
cdp.close();
process.exit(fails === 0 ? 0 : 1);
