// Guarda del FLIP del TABLERO (`useFlipLista` + `data-flip` en `TableroPage`).
//
// Uso:  CDP_BASE=http://127.0.0.1:9333 APP_URL=http://localhost:6021 \
//         node scripts/verificar-flip-tablero.mjs
//
// ── Qué se comprueba ───────────────────────────────────────────────────────
//
// Al mover un pedido de columna, React desmonta la tarjeta de una lista y la
// monta en otra: la tarjeta que llega es un nodo NUEVO y la pinta
// `animate-aterrizaje`. Lo que se quedaba sin resolver son sus HERMANAS: las que
// estaban delante o detrás se recolocan de golpe y SALTAN a su hueco. El FLIP
// existe para que se desplacen. Eso es lo que mide este arnés.
//
// ── Por qué el disparador es ORDENAR y no mover un pedido ──────────────────
//
// `pedidosStore.moverAColumna` / `moverEstado` ESCRIBEN EN SUPABASE: un clic
// muta la base de DESARROLLO, y los arneses de este proyecto no crean ni mueven
// pedidos. Ordenar, en cambio, es estado puro de React (`criterioOrden` es un
// `useState`): reordena las tarjetas dentro de cada columna y no toca la base.
// El mecanismo medido es el mismo —un reordenamiento del DOM que el FLIP tiene
// que absorber— así que la comprobación vale, y no ensucia datos.
//
// ── Las dos trampas que este arnés lleva incorporadas ──────────────────────
//
// 1. EL PUERTO. Los dos `vite.config.ts` del repo —el nuestro y el de
//    `Repo-prueba-master`— declaran 6020, así que gana el que arranque primero y
//    el otro se desplaza a 6021. Un arnés que asuma 6020 puede estar midiendo el
//    OTRO checkout y reportar verde. Por eso aquí `APP_URL` es OBLIGATORIO y
//    además se comprueba que el servidor sirva de verdad nuestro árbol, pidiendo
//    el módulo bajo prueba: si `useFlipLista.ts` no llega como JavaScript, se
//    ABORTA en vez de medir el sitio equivocado.
//
// 2. EL DISPARADOR QUE NO DISPARA. Un control que no cambia nada deja pasar en
//    verde todas las aserciones negativas: «no hay animaciones» es cierto si el
//    clic no hizo nada. Por eso cada disparo se acompaña de la comprobación de
//    que el ORDEN DE LAS TARJETAS cambió de verdad. Sin eso, la comprobación de
//    `prefers-reduced-motion` pasaría por vacío.
//
// 3. LA LECTURA EN EL MISMO TICK (el FAIL que produjo este arnés, 08/10).
//    Se escribió primero como «pulsa la opción y lee las animaciones en el mismo
//    evaluate», razonando que React procesa los eventos discretos de forma
//    síncrona y que por tanto el DOM ya estaría reordenado al volver del click.
//    **Es falso en este proyecto.** Medido: a los 0 ms el orden de las tarjetas
//    es todavía el viejo y no hay ninguna animación; a los 40 ms el DOM ya está
//    reordenado y los 7 nodos tienen `flip-tablero`. La lectura inmediata
//    devolvía cero siempre, y —peor— la comparación de orden leía el efecto del
//    clic ANTERIOR y lo atribuía al actual: el arnés reportó «Mayor importe
//    cambió el orden» cuando quien lo había cambiado era «Más antiguos
//    primero», 400 ms antes. De ahí las dos reglas de aquí abajo: se SONDEA la
//    animación en vez de leerla, y el orden se compara antes del clic contra
//    después de asentarse, nunca dentro del mismo tick.
//
// Regla general del proyecto: un FAIL que en realidad significa «la sonda miró
// donde no era» es peor que un error de red, porque se persigue un defecto
// inexistente.
const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL;

if (!APP) {
  console.error(
    "\n  ABORTADO: falta APP_URL.\n" +
      "  El puerto NO es fijo: los dos vite.config.ts declaran 6020 y gana el que\n" +
      "  arranque primero. Comprueba el que sirve TU árbol y pásalo explícito:\n" +
      "    netstat -ano | grep LISTENING | grep -E ':60(20|21)'\n" +
      "    CDP_BASE=http://127.0.0.1:9333 APP_URL=http://localhost:6021 node scripts/verificar-flip-tablero.mjs\n",
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
// Es la comprobación que convierte el puerto en un dato medido y no en una
// suposición. `useFlipLista.ts` es el módulo bajo prueba: si el servidor lo
// entrega como JavaScript y contiene sus marcadores, entonces está sirviendo el
// árbol que tiene el cambio. Si devuelve HTML es el fallback de la SPA (una ruta
// que no existe responde 200 con `index.html`), y si devuelve otro JavaScript es
// otro checkout.
{
  const url = `${APP}/src/hooks/useFlipLista.ts`;
  let res, cuerpo;
  try {
    res = await fetch(url);
    cuerpo = await res.text();
  } catch (e) {
    console.error(`\n  ABORTADO: no responde ${url}\n  ${e.message}\n`);
    process.exit(2);
  }
  const tipo = res.headers.get("content-type") || "";
  const esModulo = tipo.includes("javascript") && cuerpo.includes("desplazamientosFlip");
  if (!esModulo) {
    console.error(
      `\n  ABORTADO: ${APP} no está sirviendo el árbol de trabajo.\n` +
        `  ${url}  ->  ${res.status} ${tipo} (${cuerpo.length} B)\n` +
        (tipo.includes("html")
          ? "  Devolvió HTML: es el fallback de la SPA, esa ruta no existe en el servidor.\n"
          : "  No contiene `desplazamientosFlip`: es otro checkout, o Vite no ha recargado.\n"),
    );
    process.exit(2);
  }
  console.log(`  preflight  ${APP} sirve el árbol de trabajo (${res.status} ${tipo})\n`);
}

const cdp = await connect((await getPageTarget()).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
await cdp.send("Page.enable");
await cdp.send("DOM.enable");
await cdp.send("Network.enable");
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
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
    await sleep(350);
  }
  console.log(`  (aviso) no montó a tiempo: ${etiqueta}`);
  return false;
};

let fails = 0;
const check = (l, ok, d) => {
  if (!ok) fails++;
  console.log(`  ${ok ? "OK  " : "FAIL"}  ${l}${d !== undefined ? "  -> " + d : ""}`);
};

const sembrar = () =>
  ev(`(() => {
    localStorage.setItem("necto.session", JSON.stringify({
      modulos:["pedidos","conversaciones","asistente","inventarios"],
      tipoSesion:"administrador", operadorSimuladoId:"op-1", preSimulacion:null,
    }));
    localStorage.setItem("necto.organizacion.v1", JSON.stringify({
      usuario:{nombre:"Vera",perfilCompletado:true},
      organizacion:{id:"org-1",nombre:"Boutique Roma",slug:"boutique-roma",pais:"Colombia",moneda:"COP",
        zonaHoraria:"America/Bogota",tipoEmpresa:"Comercio",tamanoEquipo:"2 a 5 personas",
        logoUrl:"",fechaCreacion:new Date().toISOString()},
      modulos:{pedidos:{instalado:true,activo:true,conectores:{necto_ia:true,whatsapp:false}},
        conversaciones:{instalado:true,activo:true,conectores:{whatsapp:true}},inventarios:{instalado:true,activo:true}},
    }));
    return true;
  })()`);

// ── Sondas dentro de la página ─────────────────────────────────────────────
//
// Sin backticks y sin comentarios `//` dentro de estos literales: el payload se
// embebe en una plantilla de JS y un backtick o un `//` lo rompen en silencio.

const CENSO = `(() => {
  const tarjetas = [...document.querySelectorAll('[data-flip]')];
  const nombreDeColumna = (lista) => {
    let n = lista;
    while (n) {
      const b = n.querySelectorAll('[aria-label^="Opciones de columna "]');
      if (b.length === 1) return b[0].getAttribute('aria-label').replace('Opciones de columna ', '');
      n = n.parentElement;
    }
    return '?';
  };
  const porColumna = {};
  for (const t of tarjetas) {
    const c = nombreDeColumna(t.parentElement);
    porColumna[c] = (porColumna[c] || 0) + 1;
  }
  return { total: tarjetas.length, porColumna };
})()`;

const ORDEN = `(() => [...document.querySelectorAll('[data-flip]')]
  .map((t) => t.getAttribute('data-flip')).join('|'))()`;

const ANIMACIONES = `(() => {
  const flip = [];
  const css = [];
  for (const t of document.querySelectorAll('[data-flip]')) {
    const clave = t.getAttribute('data-flip');
    for (const a of t.getAnimations()) {
      if (a.id === 'flip-tablero') {
        const kf = a.effect.getKeyframes();
        const timing = a.effect.getTiming();
        flip.push({
          clave: clave,
          desde: kf[0] ? kf[0].transform : null,
          hasta: kf[1] ? kf[1].transform : null,
          duracion: timing.duration,
          easing: timing.easing,
        });
      } else {
        css.push({ clave: clave, nombre: a.animationName || '(sin nombre)' });
      }
    }
  }
  return { flip: flip, css: css };
})()`;

/**
 * Pulsa el disparador que recoloca las tarjetas. NO lee nada: el efecto del
 * clic llega en una tarea posterior (ver la trampa 3 de la cabecera).
 *
 * ── Por qué el disparador son las PESTAÑAS de etapa y no el orden (09/10) ──
 *
 * Las fases 2 y 3 pulsaban las opciones del menú «Filtrar y ordenar». Ese botón
 * y su menú se retiraron: el buscador pasó a estar en línea y el orden dejó de
 * ser un ajuste del tablero (es fijo: más recientes primero). Sin él, el
 * reordenado por criterio ya no es una afordancia de usuario, así que un arnés
 * que lo pulsara estaría midiendo una pantalla que ya no existe.
 *
 * El sustituto es la pestaña de etapa, que sigue siendo una afordancia real y
 * **no muta nada**: al filtrar, la rejilla pasa de N columnas a una, la columna
 * superviviente se desplaza y sus tarjetas con ella. Eso es un desplazamiento
 * real que el FLIP tiene que animar — exactamente lo que estas fases miden.
 *
 * El matcher es por PREFIJO, no por igualdad: la pestaña concatena su etiqueta
 * con el contador y sin espacios («En preparación3»), así que una igualdad
 * estricta no encontraría nada y la fase pasaría midiendo el vacío.
 */
const disparar = (etiqueta) =>
  ev(`(() => {
    const boton = [...document.querySelectorAll('button')]
      .find((b) => b.textContent.trim().startsWith(${JSON.stringify(etiqueta)}));
    if (!boton) return false;
    boton.click();
    return true;
  })()`);

/** Vuelve a «Todas las tareas» para que el siguiente disparador parta del tablero completo. */
const volverATodas = () => disparar("Todas las tareas");

/**
 * Vigila las animaciones de los nodos durante toda una ventana y devuelve las
 * que llegue a ver, separadas en FLIP y de CSS.
 *
 * Vigilar y no leer es lo que hace **no vacua** la comprobación de
 * `prefers-reduced-motion`: una sola lectura en el instante equivocado devuelve
 * cero tanto si el FLIP se apagó bien como si la sonda llegó tarde. Muestreando
 * durante toda la vida útil de la animación, un cero significa que no se animó.
 */
const vigilarAnimaciones = async (ms = 500) => {
  const vistas = { flip: [], css: [] };
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const a = await ev(ANIMACIONES);
    vistas.flip.push(...a.flip);
    vistas.css.push(...a.css);
    await sleep(16);
  }
  return vistas;
};

const excepciones = () =>
  cdp.events.filter(
    (e) =>
      e.method === "Runtime.exceptionThrown" &&
      !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e)),
  );

/**
 * Espera a que las tarjetas hayan terminado su animación de entrada.
 *
 * NO se usa un `sleep` fijo: las tarjetas llegan desde Supabase de forma
 * progresiva, así que la última puede montar mucho después que la primera y
 * seguir dentro de su ventana de entrada cuando el arnés dispara. Un `sleep` fijo
 * es una apuesta a cuánto tarda la carga; esto es una espera a la condición real.
 */
const esperarEntradaAsentada = async (timeoutMs = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const pendientes = await ev(`(() => [...document.querySelectorAll('[data-flip]')]
      .filter((t) => /animate-/.test(t.className) || t.getAnimations().length > 0).length)()`);
    if (pendientes === 0) return true;
    await sleep(100);
  }
  return false;
};

/** Claves de las tarjetas presentes ahora mismo. */
const clavesActuales = () =>
  ev(`(() => [...document.querySelectorAll('[data-flip]')]
    .map((t) => t.getAttribute('data-flip')))()`);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 1 — montar el tablero
// ═══════════════════════════════════════════════════════════════════════════
console.log("── Fase 1 · montar el tablero ──");

// Se navega a una ruta cualquiera primero para tener ORIGEN: `localStorage` no se
// puede escribir en `about:blank` (origen opaco). Y no se usa /login porque la
// app redirige a un usuario ya autenticado, así que el formulario nunca pinta.
await cdp.send("Page.navigate", { url: APP + "/" });
await esperar(`!!document.querySelector('#root') && location.origin !== 'null'`, "origen disponible");
await sembrar();

await cdp.send("Page.navigate", { url: APP + "/pedidos" });
const monto = await esperar(
  `location.pathname === "/pedidos" && !!document.querySelector('[data-flip]')`,
  "tablero con tarjetas",
);
if (!monto) {
  const ruta = await ev("location.pathname + location.search");
  console.error(
    `\n  ABORTADO: el tablero no montó con tarjetas (la página está en ${ruta}).\n` +
      "  La ruta del tablero es /pedidos; el catch-all devolvería a /pedidos/inicio.\n" +
      "  Si la ruta es correcta, el tablero está VACÍO: no hay nada que medir.\n",
  );
  cdp.close();
  process.exit(3);
}
await sleep(400);
const entradaAsentada = await esperarEntradaAsentada();
check(
  "las tarjetas terminaron su animación de entrada antes de medir",
  entradaAsentada,
  entradaAsentada ? "(asentada)" : "quedaron tarjetas entrando: la medición de abajo no sería concluyente",
);

const censo = await ev(CENSO);
console.log(`  censo: ${censo.total} tarjetas con data-flip -> ${JSON.stringify(censo.porColumna)}`);
check("el tablero pinta tarjetas marcadas con data-flip", censo.total > 0, `total=${censo.total}`);
check(
  "hay al menos una columna con 2 o más tarjetas (sin eso no hay reordenación que medir)",
  Object.values(censo.porColumna).some((n) => n >= 2),
  JSON.stringify(censo.porColumna),
);

const enReposo = await ev(ANIMACIONES);
check("ninguna animación de FLIP en reposo", enReposo.flip.length === 0, `n=${enReposo.flip.length}`);
check(
  "ninguna animación de entrada de CSS en reposo",
  enReposo.css.length === 0,
  JSON.stringify(enReposo.css.slice(0, 3)),
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 2 — recolocar la disposición produce FLIP
// ═══════════════════════════════════════════════════════════════════════════
console.log("── Fase 2 · recolocar dispara el FLIP ──");

// Disparador: las pestañas de etapa (ver el docblock de `disparar`). Filtrar a
// una sola columna desplaza la columna superviviente y sus tarjetas, que es el
// movimiento que el FLIP tiene que animar. NO muta nada.
const CANDIDATOS = ["En preparación", "Listo", "Confirmado", "En camino"];
let disparo = null;

for (const etiqueta of CANDIDATOS) {
  const ordenAntes = await ev(ORDEN);
  // Las tarjetas que ya estaban antes del disparo. Solo sobre ESTAS tiene sentido
  // exigir «no vuelvas a entrar»: una tarjeta que monta durante la observación
  // —Supabase sigue entregando pedidos— tiene derecho a su entrada.
  const clavesAntes = await clavesActuales();
  if (!(await disparar(etiqueta))) {
    check(`la pestaña «${etiqueta}» existe`, false);
    continue;
  }
  const vistas = await vigilarAnimaciones();
  await sleep(300);
  const ordenDespues = await ev(ORDEN);
  const cambioElOrden = ordenAntes !== ordenDespues;

  const cssPropias = vistas.css.filter((c) => clavesAntes.includes(c.clave));
  console.log(
    `  «${etiqueta}»: disposición ${cambioElOrden ? "CAMBIÓ" : "igual"} · ` +
      `${vistas.flip.length} muestra(s) con FLIP · ${cssPropias.length} de CSS en tarjetas ya presentes`,
  );
  if (cambioElOrden && vistas.flip.length > 0) {
    disparo = { etiqueta, animaciones: vistas.flip, css: cssPropias, clavesAntes };
    break;
  }
  if (cambioElOrden && !disparo) disparo = { etiqueta, animaciones: vistas.flip, css: cssPropias, clavesAntes };
  await volverATodas();
  await sleep(400);
}

check(
  "filtrar por etapa recolocó las tarjetas (si no, no hay nada que medir)",
  disparo !== null,
  disparo ? `«${disparo.etiqueta}»` : "ningún candidato movió nada",
);

if (disparo && disparo.animaciones.length > 0) {
  const anim = disparo.animaciones;
  const claves = [...new Set(anim.map((a) => a.clave))];
  console.log(`  animaron ${claves.length} tarjeta(s)`);
  check("al reordenar, las hermanas se animan", anim.length > 0, `muestras=${anim.length}`);

  // El «invert» del FLIP: el primer fotograma tiene que desplazar de verdad. Una
  // animación de `translate(0px, 0px)` a `translate(0px, 0px)` sería un no-op que
  // pasaría el recuento anterior sin mover nada.
  const conDesplazamiento = anim.filter(
    (a) => a.desde && a.desde !== "translate(0px, 0px)" && a.desde !== "none",
  );
  check(
    "el primer fotograma es un desplazamiento real, no un no-op",
    conDesplazamiento.length > 0,
    conDesplazamiento.length
      ? `p.ej. ${conDesplazamiento[0].desde}`
      : JSON.stringify([...new Set(anim.map((a) => a.desde))]),
  );

  check(
    "todas terminan en la posición natural (translate 0)",
    anim.every((a) => a.hasta === "translate(0px, 0px)"),
    JSON.stringify([...new Set(anim.map((a) => a.hasta))]),
  );

  check(
    "la duración es la del FLIP (260 ms)",
    anim.every((a) => a.duracion === 260),
    JSON.stringify([...new Set(anim.map((a) => a.duracion))]),
  );

  check(
    "la curva es la del tema",
    anim.every((a) => a.easing === "cubic-bezier(0.22, 1, 0.36, 1)"),
    JSON.stringify([...new Set(anim.map((a) => a.easing))]),
  );

  // Una reordenación NO debe re-disparar la entrada de las tarjetas.
  //
  // `animate-entrada-lista` escalona su retardo con el índice, así que al
  // reordenar el retardo cambia y Chrome vuelve a lanzar la animación: la tarjeta
  // se desvanece como si acabara de montarse. Medido antes de arreglarlo: la
  // tarjeta que pasó del índice 1 al 0 tenía una entrada viva a los 30 ms.
  const nombresCss = [...new Set(disparo.css.map((c) => c.nombre))];
  check(
    "reordenar NO re-dispara la animación de entrada de las tarjetas",
    disparo.css.length === 0,
    JSON.stringify(nombresCss.slice(0, 4)),
  );

  // Al terminar no puede quedar ninguna viva: con `fill: "none"` la animación
  // sale de `getAnimations()` en cuanto acaba, y eso es también la prueba de que
  // no se apilan cuando dos reordenaciones se encadenan.
  await sleep(400);
  const alFinal = await ev(ANIMACIONES);
  check("al terminar no queda ninguna animación de FLIP viva", alFinal.flip.length === 0);
  const cssFinal = alFinal.css.filter((c) => disparo.clavesAntes.includes(c.clave));
  check(
    "al terminar no queda ninguna animación de CSS viva en las tarjetas ya presentes",
    cssFinal.length === 0,
    JSON.stringify(cssFinal.slice(0, 3)),
  );
} else {
  check("al reordenar, las hermanas se animan", false, "el orden cambió pero no se animó nada");
}

await sleep(500);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 3 — prefers-reduced-motion apaga el FLIP (control negativo)
// ═══════════════════════════════════════════════════════════════════════════
console.log("── Fase 3 · prefers-reduced-motion apaga el FLIP ──");

await cdp.send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
const emulado = await ev(`window.matchMedia('(prefers-reduced-motion: reduce)').matches`);
check("la emulación de reduced-motion llegó a la página", emulado === true, `matches=${emulado}`);

let conReduccion = null;
for (const etiqueta of ["En preparación", "Listo", "Confirmado", "En camino"]) {
  const ordenAntes = await ev(ORDEN);
  if (!(await disparar(etiqueta))) continue;
  const vistas = await vigilarAnimaciones();
  await sleep(300);
  const ordenDespues = await ev(ORDEN);
  if (ordenAntes === ordenDespues) {
    await volverATodas();
    await sleep(400);
    continue;
  }
  conReduccion = { etiqueta, flip: vistas.flip };
  break;
}

if (conReduccion) {
  console.log(`  «${conReduccion.etiqueta}»: disposición CAMBIÓ · ${conReduccion.flip.length} muestra(s) de FLIP`);
  // Las dos mitades importan. «La disposición cambió» prueba que el efecto se
  // disparó (la firma cambió y el `useLayoutEffect` corrió); «cero animaciones»
  // prueba que la guarda lo apagó. Sin la primera, la segunda pasaría por vacío.
  check(
    "con reduced-motion la disposición cambia pero NO se anima nada",
    conReduccion.flip.length === 0,
    `muestras=${conReduccion.flip.length}`,
  );
} else {
  check(
    "con reduced-motion la disposición cambia pero NO se anima nada",
    false,
    "ningún disparador recolocó nada: la aserción no probaría nada",
  );
}

await cdp.send("Emulation.setEmulatedMedia", { features: [] });

// ═══════════════════════════════════════════════════════════════════════════
// FASE 4 — sin excepciones
// ═══════════════════════════════════════════════════════════════════════════
console.log("── Fase 4 · sin excepciones de runtime ──");
const errs = excepciones();
check("el tablero no lanzó ninguna excepción", errs.length === 0, errs.length ? JSON.stringify(errs.slice(0, 2)) : "(ninguna)");

console.log(`\n  ${fails === 0 ? "TODO OK" : fails + " FAIL"}  (${new Date().toISOString()})`);
cdp.close();
process.exit(fails === 0 ? 0 : 1);
