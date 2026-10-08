// ═══════════════════════════════════════════════════════════════════════════
// verificar-config-tarjetas.mjs
// ═══════════════════════════════════════════════════════════════════════════
//
// Comprueba que `/configuracion` (pestaña General) pinta las tarjetas con icono
// representativo tras migrar `GeneralOrgTab` a `ConfigCard`.
//
// Qué mide, y por qué cada cosa:
//
//   1. Que la ruta MONTE. Sin esto, todas las lecturas devuelven null y las
//      aserciones negativas pasan por vacío (regla 41 de la skill).
//   2. Que cada tarjeta tenga su cuadro de icono con un `<svg>` DENTRO. Un
//      contenedor vacío pasaría una aserción de "existe el cuadro".
//   3. Que el icono NO sea el mismo en las tres. Tres copias del mismo icono
//      cumplen "hay icono" y no cumplen "es representativo".
//   4. Que las filas etiqueta/control sigan ahí con su contenido. Un rediseño
//      que borre los controles es un rediseño roto.
//   5. Que no haya excepciones de runtime.
//
// Uso:  CDP_BASE=http://127.0.0.1:9333 node scripts/verificar-config-tarjetas.mjs
//
// ═══════════════════════════════════════════════════════════════════════════

import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://localhost:6020";
const OUT = "./artifacts-inv/";
mkdirSync(OUT, { recursive: true });

async function getPageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${CDP_BASE}/json/list`);
      const targets = await res.json();
      const page = targets.find(
        (t) => t.type === "page" && t.webSocketDebuggerUrl && !t.url.startsWith("devtools")
      );
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
    ws.addEventListener("open", () =>
      resolve({
        events,
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const msgId = ++id;
            pending.set(msgId, { res, rej });
            ws.send(JSON.stringify({ id: msgId, method, params }));
          });
        },
        close: () => ws.close(),
      })
    );
    ws.addEventListener("error", reject);
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method) events.push(msg);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
      }
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cdp = await connect((await getPageTarget()).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
await cdp.send("Page.enable");
await cdp.send("DOM.enable");
await cdp.send("Network.enable");
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
});

const evaluate = async (expression) => {
  const r = await cdp.send("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

const waitFor = async (expression, label, timeoutMs = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { if (await evaluate(expression)) return true; } catch {}
    await sleep(350);
  }
  throw new Error("Timeout waiting for: " + label);
};

const shot = async (name) => {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(OUT + name, Buffer.from(data, "base64"));
};

let fails = 0;
const check = (label, ok, detail) => {
  const marca = ok ? "OK  " : "FAIL";
  if (!ok) fails++;
  console.log(`  ${marca}  ${label}${detail !== undefined ? "  -> " + detail : ""}`);
};

// ── Sonda de vida: el servidor tiene que responder AHORA ──────────────────
try {
  const res = await fetch(APP + "/", { cache: "no-store" });
  if (res.status !== 200) throw new Error("status " + res.status);
  console.log(`Sonda de vida: ${APP} -> 200`);
} catch (e) {
  console.error(`ABORTADO: el servidor no responde en ${APP} (${e.message})`);
  process.exit(2);
}

// ── Sembrar sesión + organización ANTES de navegar ────────────────────────
// El orden importa: escribir en localStorage exige un origen, y `/login`
// redirige a los autenticados. Se obtiene origen en `about:blank` no sirve —
// se navega a la raíz (que puede redirigir) y se escribe DESPUÉS, luego se
// recarga la ruta destino.
await cdp.send("Page.navigate", { url: APP + "/" });
await sleep(1500);

await evaluate(`(() => {
  localStorage.setItem("necto.session", JSON.stringify({
    modulos: ["pedidos", "conversaciones"],
    tipoSesion: "administrador",
    operadorSimuladoId: "op-1",
    preSimulacion: null,
  }));
  localStorage.setItem("necto.organizacion.v1", JSON.stringify({
    usuario: { nombre: "Vera", perfilCompletado: true },
    organizacion: {
      id: "org-1",
      nombre: "Boutique Roma",
      slug: "boutique-roma",
      pais: "Colombia",
      moneda: "COP",
      zonaHoraria: "America/Bogota",
      tipoEmpresa: "Restaurante",
      tamanoEquipo: "2 a 5 personas",
      logoUrl: "",
      fechaCreacion: new Date().toISOString(),
    },
    modulos: { pedidos: { instalado: true, activo: true }, conversaciones: { instalado: true, activo: true } },
  }));
  return true;
})()`);

await cdp.send("Page.navigate", { url: APP + "/configuracion" });
await sleep(500);

const MONTADO = `(() => {
  const raiz = document.getElementById('root');
  if (!raiz || raiz.children.length === 0) return false;
  return !!document.querySelector('h1');
})()`;

let monto = false;
try {
  monto = await waitFor(MONTADO, "montaje de /configuracion", 30000);
} catch {
  monto = false;
}
if (!monto) await sleep(2500);

console.log("\n── Fase 1 · la página monta ───────────────────────────────");
const ruta = await evaluate(`location.pathname + location.search`);
const h1 = await evaluate(
  `(() => { const h = [...document.querySelectorAll('h1')].find(x => x.offsetParent !== null); return h ? h.textContent.trim() : null; })()`
);
check("la ruta es /configuracion", String(ruta).startsWith("/configuracion"), ruta);
check("se midió algo (hay un h1 visible)", h1 !== null, h1);

// ── Fase 2 · las tarjetas tienen icono ────────────────────────────────────
console.log("\n── Fase 2 · tarjetas con icono representativo ─────────────");

const TARJETAS = `(() => {
  const h1 = [...document.querySelectorAll('h1')].find(x => x.offsetParent !== null);
  if (!h1) return null;
  // Raíz = el panel de la página, no un ancestro arbitrario. Anclarse en
  // «el primer div.flex-col hacia arriba» cogía el shell y no encontraba nada:
  // la tarjeta existe y el selector estaba mal (regla 1 de la skill).
  const raiz = h1.closest('.necto-panel') || document.querySelector('main') || document.body;
  const titulos = ['¿Cómo se llama tu negocio?', '¿Dónde operas y con qué moneda?', '¿Qué tipo de negocio es?'];
  return titulos.map((t) => {
    const h2 = [...raiz.querySelectorAll('h2')].find(x => x.textContent.trim() === t);
    if (!h2) return { titulo: t, existe: false };
    const card = h2.closest('.rounded-2xl');
    if (!card) return { titulo: t, existe: true, card: false };
    const cuadro = card.querySelector('span[aria-hidden="true"]');
    const svg = cuadro ? cuadro.querySelector('svg') : null;
    const desc = h2.parentElement ? h2.parentElement.querySelector('p') : null;
    const r = svg ? svg.getBoundingClientRect() : null;
    return {
      titulo: t,
      existe: true,
      card: true,
      tieneCuadro: !!cuadro,
      tieneSvg: !!svg,
      svgAncho: r ? Math.round(r.width) : 0,
      cuadroCls: cuadro ? cuadro.className : null,
      svgPath: svg ? (svg.querySelector('path') ? svg.querySelector('path').getAttribute('d') : null) : null,
      desc: desc ? desc.textContent.trim().slice(0, 60) : null,
      filas: card.querySelectorAll('div.border-b').length,
    };
  });
})()`;

const tarjetas = await evaluate(TARJETAS);
if (!tarjetas) {
  check("la raíz de la página se localiza", false, "TARJETAS devolvió null");
} else {
  check("se encontraron las 3 tarjetas", tarjetas.length === 3, String(tarjetas.length));
  for (const t of tarjetas) {
    check(`«${t.titulo}» existe`, t.existe === true);
    if (!t.existe) continue;
    check(`«${t.titulo}» es una tarjeta`, t.card === true);
    check(`«${t.titulo}» tiene cuadro de icono`, t.tieneCuadro === true);
    check(`«${t.titulo}» el cuadro contiene un svg`, t.tieneSvg === true);
    check(`«${t.titulo}» el svg mide 20px`, t.svgAncho === 20, t.svgAncho + "px");
    check(`«${t.titulo}» tiene descripción`, !!t.desc && t.desc.length > 10, t.desc);
    check(`«${t.titulo}» conserva filas`, t.filas >= 2, t.filas + " filas");
  }

  const paths = tarjetas.filter((t) => t.svgPath).map((t) => t.svgPath);
  check(
    "los 3 iconos son DISTINTOS entre sí",
    new Set(paths).size === 3,
    paths.length + " paths, " + new Set(paths).size + " únicos"
  );
  const conCuadro = tarjetas.filter((t) => t.cuadroCls);
  console.log("\n  clases del cuadro:");
  for (const t of conCuadro) console.log(`    ${t.titulo} -> ${t.cuadroCls}`);
}

// ── Fase 3 · los controles siguen vivos ───────────────────────────────────
console.log("\n── Fase 3 · los controles siguen ahí ──────────────────────");

const CONTROLES = `(() => {
  const inputs = [...document.querySelectorAll('input:not([type=hidden])')].filter(e => e.offsetParent !== null);
  const selects = [...document.querySelectorAll('select')].filter(e => e.offsetParent !== null);
  const botones = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
  const nombre = document.getElementById('org-nombre');
  return {
    inputs: inputs.length,
    selects: selects.length,
    botones: botones.map(b => b.textContent.trim()).filter(Boolean),
    hayNombre: !!nombre,
    valorNombre: nombre ? nombre.value : null,
    guardarDeshabilitado: (() => {
      const b = [...document.querySelectorAll('button')].find(x => /Guardar cambios/.test(x.textContent));
      return b ? b.disabled : null;
    })(),
  };
})()`;

const c = await evaluate(CONTROLES);
check("existe el input del nombre", c.hayNombre === true);
check("el nombre viene sembrado del store", c.valorNombre === "Boutique Roma", c.valorNombre);
check("hay selects (>0)", c.selects > 0, c.selects);
check("hay botones (>0)", c.botones.length > 0, c.botones.length);
check(
  "«Guardar cambios» arranca deshabilitado (no hay cambios)",
  c.guardarDeshabilitado === true,
  String(c.guardarDeshabilitado)
);
console.log("  botones: " + JSON.stringify(c.botones));

await shot("config-general-tarjetas.png");

// ── Fase 4 · sin excepciones ──────────────────────────────────────────────
console.log("\n── Fase 4 · runtime ───────────────────────────────────────");
const errs = cdp.events.filter(
  (e) =>
    e.method === "Runtime.exceptionThrown" &&
    !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e))
);
check("ninguna excepción de runtime", errs.length === 0, errs.length ? JSON.stringify(errs.slice(0, 2)).slice(0, 400) : "ninguna");

const warnings = cdp.events.filter(
  (e) =>
    e.method === "Runtime.consoleAPICalled" &&
    (e.params.type === "error" || e.params.type === "warning") &&
    !/favicon|\[vite\]|DevTools|Download the React/.test(JSON.stringify(e))
);
if (warnings.length) {
  console.log("  avisos de consola (no fallo):");
  for (const w of warnings.slice(0, 8)) {
    const txt = (w.params.args || []).map((a) => a.value || a.description || "").join(" ");
    console.log("    · " + txt.slice(0, 180));
  }
}

console.log(`\n${fails === 0 ? "TODO OK" : "FALLOS: " + fails}  (${new Date().toISOString()})`);
cdp.close();
process.exit(fails === 0 ? 0 : 1);
