// ═══════════════════════════════════════════════════════════════════════════
// verificar-config-pedidos.mjs
// ═══════════════════════════════════════════════════════════════════════════
//
// Verifica las DOS superficies nuevas de la configuración de Pedidos, que son
// las que cierran los dos hallazgos de la auditoría del 07/10:
//
//   1. **«Cuentas y cobros» deja de ser decorativa.** Sus once controles no los
//      leía nadie. Ahora el selector de método de pago de «Crear pedido» se
//      construye con los medios ENCENDIDOS, y los datos de la cuenta aparecen
//      al elegir transferencia.
//   2. **Columnas del tablero.** La capacidad ya existía en el store —crear,
//      renombrar, reordenar, eliminar— y no tenía ninguna pantalla.
//
// ── Por qué esta guarda NO crea un pedido ────────────────────────────────
// `crearPedido` escribe en Supabase (base de DESARROLLO). Un arnés que crea
// pedidos deja basura en la base compartida y contamina la sesión de quien esté
// trabajando en paralelo. Todo lo que se mide aquí se ve ANTES de enviar el
// formulario, así que el arnés no muta nada.
//
// Uso:  CDP_BASE=http://127.0.0.1:9444 APP_URL=http://localhost:6020 \
//         node scripts/verificar-config-pedidos.mjs

import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://localhost:6020";
const OUT = "./artifacts-inv/";
mkdirSync(OUT, { recursive: true });

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
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1400, deviceScaleFactor: 1, mobile: false });

const ev = async (e) => {
  const r = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
  return r.result.value;
};

let fails = 0;
const check = (l, ok, d) => {
  if (!ok) fails++;
  console.log(`  ${ok ? "OK  " : "FAIL"}  ${l}${d !== undefined ? "  -> " + d : ""}`);
};

/**
 * Espera a que la pantalla MONTE, en vez de dormir un rato fijo.
 *
 * Un `sleep(4200)` funciona cuando la guarda corre sola y falla cuando corre
 * detrás de otras dos: el servidor de desarrollo compila bajo demanda y la
 * primera pantalla pesada puede tardar más. La diferencia entre un arnés que
 * espera y uno que duerme es la diferencia entre un informe y una moneda al aire.
 *
 * Ancla en un elemento que existe SOLO en la pantalla destino —no en
 * `location.pathname`, que cambia un tick antes del paint— y devuelve `false` si
 * se agota el tiempo, para que las aserciones fallen por su motivo y no por un
 * `null` sin explicación.
 */
const esperar = async (expresion, etiqueta, timeoutMs = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      if (await ev(expresion)) return true;
    } catch {}
    await sleep(300);
  }
  console.log(`  (aviso) no montó a tiempo: ${etiqueta}`);
  return false;
};

try {
  const r = await fetch(APP + "/", { cache: "no-store" });
  if (r.status !== 200) throw new Error("" + r.status);
  console.log(`Sonda de vida: ${APP} -> 200`);
} catch (e) {
  console.error(`ABORTADO: servidor caído (${e.message})`);
  process.exit(2);
}

// ── Sesión + configuración sembradas ──────────────────────────────────────
//
// La configuración se siembra a mano para poder AFIRMAR qué debe verse:
// transferencia y efectivo encendidos; contra entrega y link de pago APAGADOS;
// una sola cuenta con número y las otras dos vacías.
await cdp.send("Page.navigate", { url: APP + "/" });
await sleep(1500);
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
  localStorage.setItem("necto.pedidosConfig", JSON.stringify({
    datosBancarios: {
      titular: "Boutique Roma",
      nequi: "300 123 4567",
      daviplata: "",
      bancolombia: "",
      instrucciones: "Envía el comprobante con tu número de pedido.",
      efectivoActivo: true,
      transferenciaActivo: true,
      contraEntregaActivo: false,
      linkPagoActivo: false,
      linkPagoTipo: "globalpay",
      linkPagoUrl: "",
    },
  }));
  return true;
})()`);

// ═══════════════════════════════════════════════════════════════════════════
// 1 · La sección «Cuentas y cobros» enseña lo que PRODUCE
// ═══════════════════════════════════════════════════════════════════════════
await cdp.send("Page.navigate", { url: APP + "/pedidos/config?seccion=pagos" });
await esperar(
  `!!document.querySelector('input[aria-label="Aceptar transferencias"]')`,
  "/pedidos/config?seccion=pagos",
);

const pagos = await ev(`(() => {
  const txt = document.body.innerText || "";
  // Los interruptores se leen por su aria-label: son los cuatro medios.
  const switchDe = (aria) => {
    const el = document.querySelector('input[aria-label="' + aria + '"]');
    if (!el) return null;
    return el.getAttribute("aria-checked") ?? String(el.checked);
  };
  return {
    texto: txt,
    transferencia: switchDe("Aceptar transferencias"),
    contraEntrega: switchDe("Aceptar contra entrega"),
    linkPago: switchDe("Aceptar link de pago"),
    efectivo: switchDe("Aceptar efectivo en local"),
  };
})()`);

check("la sección monta y muestra los cuatro medios de cobro",
  pagos.transferencia !== null && pagos.contraEntrega !== null && pagos.linkPago !== null && pagos.efectivo !== null,
  `transf=${pagos.transferencia} contra=${pagos.contraEntrega} link=${pagos.linkPago} efectivo=${pagos.efectivo}`);
check("los interruptores reflejan lo guardado (contra entrega y link APAGADOS)",
  pagos.contraEntrega === "false" && pagos.linkPago === "false",
  `contra=${pagos.contraEntrega} link=${pagos.linkPago}`);
check("el mensaje de cobro derivado incluye la cuenta con número",
  /Nequi: 300 123 4567/.test(pagos.texto), "Nequi: 300 123 4567");
check("el mensaje de cobro incluye el titular y las indicaciones",
  /Titular: Boutique Roma/.test(pagos.texto) && /Envía el comprobante con tu número de pedido\./.test(pagos.texto));
check("el mensaje NO ofrece pago en línea (el link está apagado)",
  !/Pago en línea:/.test(pagos.texto));
check("sin link de pago NO se pinta la tarjeta de pasarela (no hay enlace que enseñar)",
  !/checkout\/P-001/.test(pagos.texto));

// ── Encender el link desde la UI: la pasarela aparece y el mensaje cambia ──
//
// Es la prueba de que el interruptor está CABLEADO: no basta con que se pueda
// pulsar; tiene que cambiar lo que se ve.
const encender = await ev(`(() => {
  const el = document.querySelector('input[aria-label="Aceptar link de pago"]');
  if (!el) return false;
  el.click();
  return true;
})()`);
await sleep(900);
const trasEncender = await ev(`(() => (document.body.innerText || ""))()`);

check("encender el link hace aparecer la tarjeta de pasarela con el enlace",
  encender === true && /checkout\/P-001/.test(trasEncender),
  "checkout/P-001 en el texto");
check("y el mensaje de cobro pasa a incluir la línea «Pago en línea»",
  /Pago en línea:/.test(trasEncender));

// ═══════════════════════════════════════════════════════════════════════════
// 2 · «Crear pedido» honra los interruptores
// ═══════════════════════════════════════════════════════════════════════════
await cdp.send("Page.navigate", { url: APP + "/pedidos/crear" });
await esperar(
  `[...document.querySelectorAll('button[title]')].some((b) => /El cliente transfiere/.test(b.getAttribute("title") || ""))`,
  "/pedidos/crear",
);

const selector = await ev(`(() => {
  // Los botones del selector llevan el atributo title con la descripción del
  // medio: es la forma precisa de encontrarlos sin confundirlos con otra cosa.
  // (Sin comillas invertidas en este comentario: cerrarían el template.)
  const botones = [...document.querySelectorAll('button[title]')].filter((b) =>
    /Cobro en caja|El cliente transfiere|El cliente paga al recibir|Pago en línea con el enlace/.test(b.getAttribute("title") || "")
  );
  return botones.map((b) => (b.textContent || "").trim());
})()`);

check("el selector ofrece 2 medios (los encendidos), no los 4",
  selector.length === 2, `${selector.length}: ${JSON.stringify(selector)}`);
check("ofrece Efectivo y Transferencia",
  selector.some((s) => /Efectivo/.test(s)) && selector.some((s) => /Transferencia/.test(s)),
  JSON.stringify(selector));
check("NO ofrece Contra entrega (apagado)", !selector.some((s) => /Contra entrega/.test(s)));
check("NO ofrece Tarjeta o PSE (apagado)", !selector.some((s) => /Tarjeta o PSE/.test(s)));

// Elegir transferencia debe enseñar las cuentas.
const trasElegir = await ev(`(() => {
  const b = [...document.querySelectorAll('button[title]')].find((x) =>
    /El cliente transfiere/.test(x.getAttribute("title") || "")
  );
  if (!b) return null;
  b.click();
  return true;
})()`);
await sleep(700);
const datosCuenta = await ev(`(() => {
  const t = document.body.innerText || "";
  return {
    titular: /Titular:/.test(t) && /Boutique Roma/.test(t),
    nequi: /300 123 4567/.test(t),
    instrucciones: /Envía el comprobante/.test(t),
  };
})()`);
check("elegir Transferencia muestra los datos de la cuenta",
  trasElegir === true && datosCuenta.titular && datosCuenta.nequi && datosCuenta.instrucciones,
  JSON.stringify(datosCuenta));

// ═══════════════════════════════════════════════════════════════════════════
// 3 · Columnas del tablero: el editor existe y reordena
// ═══════════════════════════════════════════════════════════════════════════
await cdp.send("Page.navigate", { url: APP + "/pedidos/config?seccion=flujo" });
await esperar(
  `!!document.querySelector('button[aria-label^="Subir la columna"]')`,
  "/pedidos/config?seccion=flujo",
);

const columnasAntes = await ev(`(() => {
  const filas = [...document.querySelectorAll('button[aria-label^="Subir la columna"]')]
    .map((b) => (b.getAttribute("aria-label") || "").replace("Subir la columna ", ""));
  return filas;
})()`);

check("el editor lista las columnas del tablero (5: el pipeline sin entregado)",
  columnasAntes.length === 5, `${columnasAntes.length}: ${JSON.stringify(columnasAntes)}`);
check("la primera columna es «Pendiente de pago» (el rótulo del store)",
  columnasAntes[0] === "Pendiente de pago", String(columnasAntes[0]));
check("la última NO es «Entregado» (es terminal y vive en el historial)",
  !/Entregado/.test(columnasAntes[columnasAntes.length - 1] || ""), String(columnasAntes[columnasAntes.length - 1]));

// Bajar la primera columna debe intercambiarla con la segunda.
await ev(`(() => {
  const b = [...document.querySelectorAll('button[aria-label^="Bajar la columna"]')][0];
  b && b.click();
  return true;
})()`);
await sleep(700);
const columnasDespues = await ev(`(() => {
  return [...document.querySelectorAll('button[aria-label^="Subir la columna"]')]
    .map((b) => (b.getAttribute("aria-label") || "").replace("Subir la columna ", ""));
})()`);

check("bajar la primera columna la intercambia con la segunda",
  columnasDespues[0] === columnasAntes[1] && columnasDespues[1] === columnasAntes[0],
  `${JSON.stringify(columnasAntes)} -> ${JSON.stringify(columnasDespues)}`);

// El botón de subir de la primera columna está deshabilitado: no hay a dónde subir.
const primeroDeshabilitado = await ev(`(() => {
  const b = [...document.querySelectorAll('button[aria-label^="Subir la columna"]')][0];
  return b ? b.disabled : null;
})()`);
check("subir la primera columna está deshabilitado (no hay hueco arriba)", primeroDeshabilitado === true);

const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
writeFileSync(OUT + "pedidos-config-columnas.png", Buffer.from(data, "base64"));

// ═══════════════════════════════════════════════════════════════════════════
// 4 · Los interruptores del pipeline MANDAN sobre el editor de columnas
// ═══════════════════════════════════════════════════════════════════════════
//
// El defecto: `columnasTablero` devolvía la lista personalizada tal cual, y esa
// lista lleva `confirmado` y `en_camino` dentro desde el momento en que el
// usuario la tocó una vez (`asegurarColumnasPersonalizadas` las copia). Apagar
// el interruptor no cambiaba nada: el control se dejaba pulsar y mentía.
//
// Se mide SIN GUARDAR: el borrador ya tiene que reflejar el efecto, porque es
// el mismo par de funciones puras el que resuelve la lista en la pantalla y en
// el store.
const leerColumnas = () =>
  ev(`(() => [...document.querySelectorAll('button[aria-label^="Subir la columna"]')]
        .map((b) => (b.getAttribute("aria-label") || "").replace("Subir la columna ", "")))()`);

await cdp.send("Page.navigate", { url: APP + "/pedidos/config?seccion=flujo" });
await esperar(
  `!!document.querySelector('input[aria-label="Usar estado Confirmado"]')`,
  "/pedidos/config?seccion=flujo (interruptores)",
);

const conConfirmado = await leerColumnas();
check("con el interruptor encendido, «Confirmado» está en las columnas",
  conConfirmado.includes("Confirmado"), JSON.stringify(conConfirmado));

const apagar = (aria) =>
  ev(`(() => { const el = document.querySelector('input[aria-label="' + ${JSON.stringify(aria)} + '"]'); if (el) el.click(); return !!el; })()`);

await apagar("Usar estado Confirmado");
await sleep(700);
const sinConfirmado = await leerColumnas();
check("apagar «Confirmado» lo quita de las columnas ANTES de guardar",
  !sinConfirmado.includes("Confirmado"), JSON.stringify(sinConfirmado));
check("y no se lleva por delante las demás columnas",
  sinConfirmado.length === conConfirmado.length - 1,
  `${conConfirmado.length} -> ${sinConfirmado.length}`);

// Volver a encenderlo la devuelve: apagar no puede ser una pérdida.
await apagar("Usar estado Confirmado");
await sleep(700);
const devuelta = await leerColumnas();
check("volver a encenderlo devuelve la columna", devuelta.includes("Confirmado"), JSON.stringify(devuelta));

// ═══════════════════════════════════════════════════════════════════════════
// 5 · El nombre de una etapa lo fija el alias, no la copia de la columna
// ═══════════════════════════════════════════════════════════════════════════
//
// El defecto: `estadoLabel` preguntaba primero a `columnasPersonalizadas`, que
// guarda una COPIA del nombre del momento en que se sembró. Escribir un alias
// nuevo no cambiaba nada en el tablero: perdía contra un dato viejo.
//
// El input es controlado por React, así que hay que usar el setter nativo y
// disparar el evento `input`: asignar `.value` a pelo no notifica a React y la
// aserción mediría el DOM sin que el estado se hubiera movido.
await ev(`(() => {
  const el = document.getElementById("alias-e-listo");
  if (!el) return false;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(el, "Ya está");
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
})()`);
await sleep(700);
const renombradas = await leerColumnas();
check("escribir el alias renombra la columna del tablero",
  renombradas.includes("Ya está"), JSON.stringify(renombradas));
check("y el nombre de fábrica ya no aparece en la lista",
  !renombradas.includes("Listo"), JSON.stringify(renombradas));

// ═══════════════════════════════════════════════════════════════════════════
// 6 · «Descartar cambios» devuelve el borrador a lo confirmado
// ═══════════════════════════════════════════════════════════════════════════
//
// El borrador existía para que «Descartar cambios» significara algo, y el botón
// no estaba: la página se lo daba por supuesto por escrito y no lo pintaba. Un
// borrador sin forma de descartarlo es solo un guardado con más pasos.
const descartado = await ev(`(() => {
  const b = [...document.querySelectorAll("button")].find((x) => (x.textContent || "").trim() === "Descartar cambios");
  if (!b) return false;
  b.click();
  return true;
})()`);
await sleep(700);
const trasDescartar = await leerColumnas();
check("«Descartar cambios» existe y devuelve el nombre original",
  descartado === true && trasDescartar.includes("Listo"), JSON.stringify(trasDescartar));
check("y no deja rastro del alias sin guardar",
  !trasDescartar.includes("Ya está"), JSON.stringify(trasDescartar));

// ═══════════════════════════════════════════════════════════════════════════
// 7 · «Perfil de negocio» NO escribe al instante
// ═══════════════════════════════════════════════════════════════════════════
//
// El defecto: la tarjeta llamaba a `setPerfilComercial(key, true)` —un clic
// SUSTITUÍA todos los pedidos del negocio por cinco de ejemplo— y lo hacía
// saltándose el borrador. La prueba de que ya no lo hace es directa: el
// almacenamiento del store NO cambia hasta pulsar «Guardar cambios».
await cdp.send("Page.navigate", { url: APP + "/pedidos/config?seccion=perfil" });
await esperar(
  `!!document.querySelector('[role="radiogroup"][aria-label="Perfil de negocio"]')`,
  "/pedidos/config?seccion=perfil",
);

const configAntes = await ev(`localStorage.getItem("necto.pedidosConfig")`);
const activosAntes = await ev(`(() => document.querySelectorAll('[role="radio"][aria-checked="true"]').length)()`);
check("la rejilla de perfiles tiene exactamente un perfil activo", activosAntes === 1, String(activosAntes));

const elegido = await ev(`(() => {
  const objetivo = [...document.querySelectorAll('[role="radio"]')].find((r) => r.getAttribute("aria-checked") === "false");
  if (!objetivo) return null;
  const nombre = (objetivo.textContent || "").slice(0, 40);
  objetivo.click();
  return nombre;
})()`);
await sleep(700);
const configDespues = await ev(`localStorage.getItem("necto.pedidosConfig")`);
check("elegir un perfil NO escribe en el almacenamiento: pasa por Guardar",
  elegido !== null && configDespues === configAntes,
  elegido === null ? "no se encontró ninguna tarjeta inactiva" : "clic en " + elegido);

const activosDespues = await ev(`(() => document.querySelectorAll('[role="radio"][aria-checked="true"]').length)()`);
check("y la selección se mueve en el borrador, no en el store", activosDespues === 1);

const { data: dataPerfil } = await cdp.send("Page.captureScreenshot", { format: "png" });
writeFileSync(OUT + "pedidos-config-perfil.png", Buffer.from(dataPerfil, "base64"));

// ── Runtime ──────────────────────────────────────────────────────────────
const errs = cdp.events.filter(
  (e) => e.method === "Runtime.exceptionThrown" && !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e))
);
check("ninguna excepción de runtime", errs.length === 0, errs.length ? JSON.stringify(errs.slice(0, 1)).slice(0, 300) : "ninguna");

console.log(`\n${fails === 0 ? "TODO OK" : "FALLOS: " + fails}  (${new Date().toISOString()})`);
cdp.close();
process.exit(fails === 0 ? 0 : 1);
