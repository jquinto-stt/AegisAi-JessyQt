// Guarda del TABLERO: el consumidor principal de `columnasTablero`.
//
// Uso:  CDP_BASE=http://127.0.0.1:9444 APP_URL=http://localhost:6020 \
//         node scripts/verificar-tablero-columnas.mjs
//
// `columnasTablero` pasó a reconciliar los interruptores del pipeline con la
// lista personalizada (regla única en `componerColumnas`). El tablero es quien
// la lee y hasta ahora no tenía guarda propia —las de configuración miran
// `/pedidos/config`, que es el EDITOR, no quien consume el resultado—, así que
// aquí se comprueba de extremo a extremo: con la lista personalizada persistida
// (que contiene `confirmado`) y el interruptor APAGADO, la columna «Confirmado»
// no puede pintarse, y la columna PROPIA no se pierde por el camino.
//
// ── Las dos trampas que hicieron falsos FAIL (07/10) ───────────────────────
//
// 1. LA RUTA. El tablero está en `/pedidos`, NO en `/pedidos/tablero`
//    (`App.tsx:154`; `operadores.store.ts:90` lo confirma con
//    `{ id:"tablero", path:"/pedidos" }`). Navegar a una ruta inexistente no da
//    404: el catch-all devuelve a `/pedidos/inicio` y el recuento de columnas
//    sale 0. Aquí eso produjo 6 FAILs que acusaban al código cuando el defecto
//    era de la sonda. Por eso `irAlTablero()` exige `location.pathname` y ABORTA
//    si no cuadra, en vez de reportar un FAIL que manda a buscar un fantasma.
//
// 2. EL MARCADOR. El humo de `/pedidos/crear` buscaba «Nuevo pedido»: esa cadena
//    no existe en el código (el `h1` real es «Crear pedido», `CrearPedidoPage`
//    :563), así que el check no podía pasar nunca. Y buscar «Inicio» o «Crear
//    pedido» en el body entero tampoco vale: salen en el menú lateral, así que
//    pasaría aunque la página no montara. Ahora se lee el `h1` de la PÁGINA.
//
// Regla general: un FAIL que en realidad significa «la sonda miró donde no era»
// es peor que un error de red, porque se persigue un defecto inexistente.
const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9444";
const APP = process.env.APP_URL || "http://localhost:6020";

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
      })
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
const cdp = await connect((await getPageTarget()).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
await cdp.send("Page.enable");
await cdp.send("Log.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1200, deviceScaleFactor: 1, mobile: false });

const ev = async (e) => {
  const r = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
};

const esperar = async (expr, etiqueta, timeoutMs = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      if (await ev(expr)) return true;
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

const sembrar = (config) =>
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
    localStorage.setItem("necto.pedidosConfig", JSON.stringify(${JSON.stringify(config)}));
    return true;
  })()`);

const leerColumnasTablero = () =>
  ev(`(() => [...document.querySelectorAll('[aria-label^="Opciones de columna "]')]
        .map((b) => (b.getAttribute("aria-label") || "").replace("Opciones de columna ", "")))()`);

/**
 * Navega al tablero y ABORTA si la ruta no es la esperada.
 *
 * La ruta del tablero es `/pedidos` (`App.tsx:154`). Navegar a una ruta
 * inexistente no da 404: el catch-all devuelve a `/pedidos/inicio` y el recuento
 * de columnas sale 0. Eso produjo 6 FAILs que acusaban al código. Un FAIL que en
 * realidad es «la sonda miró donde no era» es peor que un error: se persigue un
 * defecto inexistente. Por eso la ruta se comprueba y, si no cuadra, se corta.
 */
const irAlTablero = async (etiqueta) => {
  await cdp.send("Page.navigate", { url: APP + "/pedidos" });
  const ok = await esperar(
    `location.pathname === "/pedidos" && !!document.querySelector('[aria-label^="Opciones de columna "]')`,
    etiqueta,
  );
  if (!ok) {
    const ruta = await ev("location.pathname + location.search");
    console.error(
      `\n  ABORTADO: el tablero no montó en /pedidos (la página está en ${ruta}).\n` +
      `  Comprueba la ruta real en App.tsx antes de creer el recuento de columnas.\n`,
    );
    cdp.close();
    process.exit(3);
  }
  await sleep(600);
};

const LISTA_PERSONALIZADA = [
  { id: "nuevo", label: "Pendiente de pago" },
  { id: "confirmado", label: "Confirmado" },
  { id: "en_preparacion", label: "En preparación" },
  { id: "listo", label: "Listo" },
  { id: "en_camino", label: "En camino" },
  { id: "col_x1", label: "En revisión de calidad" },
];

try {
  const r = await fetch(APP + "/", { cache: "no-store" });
  if (r.status !== 200) throw new Error("" + r.status);
  console.log(`Sonda de vida: ${APP} -> 200`);
} catch (e) {
  console.error(`ABORTADO: servidor caído (${e.message})`);
  process.exit(2);
}

// ── Caso A: lista personalizada + interruptor ENCENDIDO → 6 columnas ────────
await cdp.send("Page.navigate", { url: APP + "/" });
await sleep(1500);
await sembrar({
  usarConfirmado: true,
  usarEnCamino: true,
  modalidades: ["retiro", "domicilio", "en_sitio"],
  umbralUrgencia: 15,
  aliasEstados: {},
  aliasModalidades: {},
  tiemposObjetivo: {},
  horario: { activo: false, dias: [1, 2, 3, 4, 5], apertura: "08:00", cierre: "20:00" },
  alertaAtencion: { activo: false, cadaSegundos: 30 },
  avisoFueraHorario: { activo: false, mensaje: "" },
  catalogo: [],
  plantillas: {},
  columnasPersonalizadas: LISTA_PERSONALIZADA,
});
await irAlTablero("/pedidos (tablero) — caso A");

const conSwitch = await leerColumnasTablero();
check("con el interruptor encendido el tablero pinta las 6 columnas",
  conSwitch.length === 6, `${conSwitch.length}: ${JSON.stringify(conSwitch)}`);
check("y la columna propia aparece", conSwitch.includes("En revisión de calidad"), JSON.stringify(conSwitch));

// ── Caso B: la MISMA lista, interruptor APAGADO → 5 columnas, sin Confirmado ─
await sembrar({
  usarConfirmado: false,
  usarEnCamino: true,
  modalidades: ["retiro", "domicilio", "en_sitio"],
  umbralUrgencia: 15,
  aliasEstados: {},
  aliasModalidades: {},
  tiemposObjetivo: {},
  horario: { activo: false, dias: [1, 2, 3, 4, 5], apertura: "08:00", cierre: "20:00" },
  alertaAtencion: { activo: false, cadaSegundos: 30 },
  avisoFueraHorario: { activo: false, mensaje: "" },
  catalogo: [],
  plantillas: {},
  columnasPersonalizadas: LISTA_PERSONALIZADA,
});
await irAlTablero("/pedidos (tablero) — caso B");

const sinSwitch = await leerColumnasTablero();
check("apagar el interruptor quita «Confirmado» del tablero",
  !sinSwitch.includes("Confirmado"), JSON.stringify(sinSwitch));
check("y no se lleva por delante la columna propia",
  sinSwitch.includes("En revisión de calidad"), JSON.stringify(sinSwitch));
check("quedan 5 columnas", sinSwitch.length === 5, `${sinSwitch.length}: ${JSON.stringify(sinSwitch)}`);

// ── Caso C: el alias manda sobre la copia congelada de la lista ─────────────
await sembrar({
  usarConfirmado: true,
  usarEnCamino: true,
  modalidades: ["retiro", "domicilio", "en_sitio"],
  umbralUrgencia: 15,
  aliasEstados: { listo: "Ya está" },
  aliasModalidades: {},
  tiemposObjetivo: {},
  horario: { activo: false, dias: [1, 2, 3, 4, 5], apertura: "08:00", cierre: "20:00" },
  alertaAtencion: { activo: false, cadaSegundos: 30 },
  avisoFueraHorario: { activo: false, mensaje: "" },
  catalogo: [],
  plantillas: {},
  columnasPersonalizadas: LISTA_PERSONALIZADA,
});
await irAlTablero("/pedidos (tablero) — caso C");

const conAlias = await leerColumnasTablero();
check("el alias renombra la columna del tablero (la copia vieja ya no manda)",
  conAlias.includes("Ya está") && !conAlias.includes("Listo"), JSON.stringify(conAlias));

// ── Caso D: humo de Inicio y Crear pedido ──────────────────────────────────
//
// El marcador se lee del `h1` de la PÁGINA, no del texto del body. «Inicio» y
// «Crear pedido» aparecen también en el menú lateral, así que un `includes`
// sobre el body entero pasaría aunque la página no montara: un check que miente.
// Y el título real de `/pedidos/crear` es «Crear pedido» —«Nuevo pedido» no
// existe en el código—, que es como esta comprobación llevaba dando FAIL.
// Se exige además que la ruta no haya cambiado, porque el catch-all redirige.
for (const [ruta, h1Esperado] of [
  ["/pedidos/inicio", "Bienvenido de nuevo"],
  ["/pedidos/crear", "Crear pedido"],
]) {
  await cdp.send("Page.navigate", { url: APP + ruta });
  const ok = await esperar(
    `(() => {
       if (location.pathname !== ${JSON.stringify(ruta)}) return false;
       const hs = [...document.querySelectorAll("h1")].map((h) => (h.textContent || "").trim());
       return hs.some((t) => t.includes(${JSON.stringify(h1Esperado)}));
     })()`,
    ruta,
  );
  check(`${ruta} monta con su h1 («${h1Esperado}»)`, ok);
}

const errs = cdp.events.filter(
  (e) => e.method === "Runtime.exceptionThrown" && !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e)),
);
check("ninguna excepción de runtime en todo el recorrido", errs.length === 0,
  errs.length ? JSON.stringify(errs.slice(0, 1)).slice(0, 300) : "ninguna");

console.log(`\n${fails === 0 ? "TODO OK" : "FALLOS: " + fails}  (${new Date().toISOString()})`);
cdp.close();
process.exit(fails === 0 ? 0 : 1);
