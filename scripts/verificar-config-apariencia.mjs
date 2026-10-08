// ═══════════════════════════════════════════════════════════════════════════
// verificar-config-apariencia.mjs
// ═══════════════════════════════════════════════════════════════════════════
//
// Verifica la pestaña «Apariencia» de `/configuracion`, que es la
// ADMINISTRACIÓN de las preferencias de interfaz desde el 07/10.
//
// Por qué tiene guarda propia: la guarda del hub
// (`verificar-config-hub.mjs`) recorre las cuatro pantallas de MÓDULO. La
// configuración de la organización no entra ahí —no tiene guarda de módulo—,
// así que esta pestaña nueva se habría quedado sin ninguna comprobación de
// comportamiento. Compilar no dice si una pestaña se pinta.
//
// Qué se mide, y por qué cada cosa:
//
//   1. Que la ruta MONTE y que el hub tenga TRES tarjetas, una de ellas
//      «Apariencia». Sin esto, todas las lecturas devuelven null y las
//      aserciones negativas pasan por vacío.
//   2. Que pulsar la tarjeta navegue a `?tab=apariencia` (no despliegue debajo).
//   3. Que las TRES filas estén: tema, densidad de la lista y densidad del hilo.
//      El defecto que esto frena es el que había antes: controles que existían y
//      no los leía nadie.
//   4. Que cada fila marque como activa la opción GUARDADA. Un control que
//      enseña una opción distinta de la que rige es un control que miente.
//   5. Que pulsar una opción ESCRIBA la preferencia en `localStorage` — la
//      prueba de que el control persiste y no es un `useState` decorativo.
//   6. Que elegir «Oscuro» aplique la clase `dark` al `<html>`.
//   7. Que ninguna excepción de runtime.
//
// Uso:  CDP_BASE=http://127.0.0.1:9444 APP_URL=http://localhost:6020 \
//         node scripts/verificar-config-apariencia.mjs

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
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });

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

// ── Sonda de vida ─────────────────────────────────────────────────────────
try {
  const r = await fetch(APP + "/", { cache: "no-store" });
  if (r.status !== 200) throw new Error("" + r.status);
  console.log(`Sonda de vida: ${APP} -> 200`);
} catch (e) {
  console.error(`ABORTADO: servidor caído (${e.message})`);
  process.exit(2);
}

// ── Sesión sembrada ANTES de navegar ──────────────────────────────────────
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
  // Preferencias de partida conocidas, para poder afirmar qué está marcado.
  localStorage.setItem("webforge-ui-preferences", JSON.stringify({
    theme:"light", themePreference:"light", sidebarExpanded:true,
    densidadBandeja:"comoda", densidadAsistente:"comoda",
  }));
  return true;
})()`);

// ── 1 · el hub tiene TRES tarjetas, una de ellas «Apariencia» ─────────────
await cdp.send("Page.navigate", { url: APP + "/configuracion" });
await sleep(4200);

const hub = await ev(`(() => {
  const t = [...document.querySelectorAll('button')].filter(b => /Entrar a configurar/i.test(b.textContent||''));
  const apariencia = t.find(b => /Apariencia/.test(b.textContent||''));
  return {
    tarjetas: t.length,
    etiquetas: t.map(b => (b.textContent||'').trim().split('\\n')[0]),
    hayApariencia: !!apariencia,
    // El enlace de la tarjeta NO puede ser un verde fuera de la paleta.
    verde: t.some(b => /17b363/i.test(b.outerHTML)),
  };
})()`);

check("el hub de /configuracion pinta 3 tarjetas", hub.tarjetas === 3, `${hub.tarjetas} tarjetas`);
check("una de ellas es «Apariencia»", hub.hayApariencia === true);
check("el realce no usa el verde #17b363", hub.verde === false);
console.log(`  tarjetas: ${JSON.stringify(hub.etiquetas)}`);

// ── 2 · pulsar la tarjeta entra a la pestaña ──────────────────────────────
await ev(`(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Entrar a configurar/i.test(x.textContent||'') && /Apariencia/.test(x.textContent||''));
  b && b.click();
  return true;
})()`);
await sleep(1400);

const dentro = await ev(`(() => ({
  url: location.pathname + location.search,
  volver: [...document.querySelectorAll('button')].some(b => /Volver a Configuración/i.test(b.textContent||'')),
  tarjetasHub: [...document.querySelectorAll('button')].filter(b => /Entrar a configurar/i.test(b.textContent||'')).length,
}))()`);

check("la URL pasa a `?tab=apariencia`", /[?&]tab=apariencia/.test(dentro.url), dentro.url);
check("entra a pantalla completa (el hub desaparece)", dentro.tarjetasHub === 0, `${dentro.tarjetasHub} tarjetas`);
check("aparece «Volver a Configuración»", dentro.volver === true);

// ── 3 y 4 · las tres filas, con la opción GUARDADA marcada ────────────────
const filas = await ev(`(() => {
  const grupos = [...document.querySelectorAll('[role="group"]')];
  const leer = (aria) => {
    const g = grupos.find(x => (x.getAttribute('aria-label')||'') === aria);
    if (!g) return null;
    const botones = [...g.querySelectorAll('button')];
    const activo = botones.find(b => b.getAttribute('aria-pressed') === 'true');
    return { n: botones.length, activo: activo ? activo.textContent.trim() : null,
             opciones: botones.map(b => b.textContent.trim()) };
  };
  return {
    tema: leer("Tema de la aplicación"),
    bandeja: leer("Densidad de la lista de conversaciones"),
    hilo: leer("Densidad del hilo del asistente"),
  };
})()`);

check("existe la fila «Tema» con 3 opciones", filas.tema?.n === 3, JSON.stringify(filas.tema));
check("existe la fila «Densidad de la lista» con 2 opciones", filas.bandeja?.n === 2, JSON.stringify(filas.bandeja));
check("existe la fila «Densidad del hilo» con 2 opciones", filas.hilo?.n === 2, JSON.stringify(filas.hilo));
check("el tema marca la preferencia guardada («Claro»)", filas.tema?.activo === "Claro", String(filas.tema?.activo));
check("la bandeja marca la preferencia guardada («Cómoda»)", filas.bandeja?.activo === "Cómoda", String(filas.bandeja?.activo));
check("el hilo marca la preferencia guardada («Cómoda»)", filas.hilo?.activo === "Cómoda", String(filas.hilo?.activo));

// ── 5 · pulsar escribe la preferencia en localStorage ────────────────────
const pulsar = async (aria, label) => {
  await ev(`(() => {
    const g = [...document.querySelectorAll('[role="group"]')].find(x => (x.getAttribute('aria-label')||'') === ${JSON.stringify(aria)});
    const b = g ? [...g.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(label)}) : null;
    b && b.click();
    return true;
  })()`);
  await sleep(600);
  return ev(`JSON.parse(localStorage.getItem('webforge-ui-preferences') || '{}')`);
};

const trasBandeja = await pulsar("Densidad de la lista de conversaciones", "Compacta");
check("«Compacta» en la bandeja se PERSISTE", trasBandeja.densidadBandeja === "compacta", String(trasBandeja.densidadBandeja));

const trasHilo = await pulsar("Densidad del hilo del asistente", "Compacta");
check("«Compacta» en el hilo se PERSISTE", trasHilo.densidadAsistente === "compacta", String(trasHilo.densidadAsistente));

// Las dos densidades son independientes: cambiar una no debe mover la otra.
check("las dos densidades no se pisan", trasHilo.densidadBandeja === "compacta", `bandeja=${trasHilo.densidadBandeja}`);

// ── 6 · «Oscuro» aplica la clase al <html> ───────────────────────────────
const trasTema = await pulsar("Tema de la aplicación", "Oscuro");
const esOscuro = await ev(`document.documentElement.classList.contains('dark')`);
check("«Oscuro» se PERSISTE como preferencia", trasTema.themePreference === "dark", String(trasTema.themePreference));
check("«Oscuro» aplica la clase `dark` al <html>", esOscuro === true, String(esOscuro));

// ── 7 · «Sistema» resuelve un tema concreto, no se escribe literal ───────
const trasSistema = await pulsar("Tema de la aplicación", "Sistema");
check("«Sistema» se guarda como preferencia", trasSistema.themePreference === "system", String(trasSistema.themePreference));
check("«Sistema» NO se escribe como tema literal",
  trasSistema.theme === "light" || trasSistema.theme === "dark", String(trasSistema.theme));

const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
writeFileSync(OUT + "configuracion-apariencia.png", Buffer.from(data, "base64"));

// ── 8 · runtime ─────────────────────────────────────────────────────────
const errs = cdp.events.filter(
  (e) => e.method === "Runtime.exceptionThrown" && !/favicon|\[vite\]|DevTools|ResizeObserver/.test(JSON.stringify(e))
);
check("ninguna excepción de runtime", errs.length === 0, errs.length ? JSON.stringify(errs.slice(0, 1)).slice(0, 300) : "ninguna");

console.log(`\n${fails === 0 ? "TODO OK" : "FALLOS: " + fails}  (${new Date().toISOString()})`);
cdp.close();
process.exit(fails === 0 ? 0 : 1);
