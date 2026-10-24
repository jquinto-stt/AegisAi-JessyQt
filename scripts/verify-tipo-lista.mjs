import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://127.0.0.1:5199";
const OUT = "./artifacts-verify/";
mkdirSync(OUT, { recursive: true });

async function getPageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${CDP_BASE}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl && !t.url.startsWith("devtools"));
      if (page) return page;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("No CDP page target");
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
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

const evaluate = async (expression) => {
  const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

const waitFor = async (expression, label, timeoutMs = 45000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { if (await evaluate(expression)) return true; } catch {}
    await sleep(300);
  }
  throw new Error(`Timeout: ${label}`);
};

const fallos = [];
const check = (n, ok, d = "") => { console.log(`${ok ? "OK  " : "FAIL"} ${n}${d ? " · " + d : ""}`); if (!ok) fallos.push(n); };

const sembrar = async (tipoEmpresa) => {
  const org = {
    id: "org_verify",
    nombre: "Boutique Roma",
    slug: "boutique-roma",
    pais: "Colombia",
    moneda: "COP",
    zonaHoraria: "America/Bogota",
    tipoEmpresa,
    tamanoEquipo: "2 a 5 personas",
    logoUrl: "",
    descripcion: "Ropa femenina de autor, hecha en talleres locales.",
    sitioWeb: "https://boutiqueroma.co",
    fechaCreacion: new Date().toISOString(),
  };
  await evaluate(`(() => {
    localStorage.setItem("necto.session", JSON.stringify({ modulos: ["pedidos","inventarios"], tipoSesion: "administrador", operadorSimuladoId: null, preSimulacion: null }));
    localStorage.setItem("necto.organizacion.v1", JSON.stringify({ usuario: null, organizacion: ${JSON.stringify(org)}, organizaciones: [${JSON.stringify(org)}] }));
    const raw = localStorage.getItem("webforge-ui-preferences") || "{}";
    let ui = {}; try { ui = JSON.parse(raw); } catch {}
    ui.themePreference = "light";
    localStorage.setItem("webforge-ui-preferences", JSON.stringify(ui));
    return true;
  })()`);
};

await cdp.send("Page.navigate", { url: `${APP}/login` });
await sleep(2500);

// ── Caso 1: valor del catálogo ─────────────────────────────────────────────
await sembrar("Retail & Comercio minorista");
await cdp.send("Page.navigate", { url: `${APP}/configuracion?tab=general` });
await waitFor(`!!document.querySelector('select#org-tipo, select[aria-label="Tipo de empresa"]')`, "el select de tipo");
await sleep(600);

const info = await evaluate(`(() => {
  const s = document.querySelector('select[aria-label="Tipo de empresa"]');
  return {
    valor: s.value,
    opciones: [...s.options].map(o => ({ v: o.value, disabled: o.disabled })),
  };
})()`);
// El `Select` del catálogo antepone una opción de relleno deshabilitada.
const reales = info.opciones.filter((o) => !o.disabled);
check("el tipo es un desplegable con los 8 rubros del catálogo", reales.length === 8, `${reales.length} rubros`);
check("arranca con el valor guardado", info.valor === "Retail & Comercio minorista", info.valor);

const fichas = await evaluate(`(() => {
  const radios = document.querySelectorAll('[role="radio"]').length;
  const rubroComoFicha = [...document.querySelectorAll('button, [role="radio"]')]
    .some(el => el.textContent.trim() === 'Comercio minorista');
  return { radios, rubroComoFicha };
})()`);
check("las 8 fichas de rubro ya no existen (solo quedan las 4 de tamaño)",
  fichas.radios === 4 && !fichas.rubroComoFicha, JSON.stringify(fichas));

// Elegir otro rubro con el select real
const cambiado = await evaluate(`(() => {
  const s = document.querySelector('select[aria-label="Tipo de empresa"]');
  s.value = "Gastronomía & Alimentos";
  s.dispatchEvent(new Event('change', { bubbles: true }));
  return s.value;
})()`);
await sleep(500);
const rubroEnPrevia = await evaluate(`(() => {
  const p = document.querySelector('section[aria-label="Vista previa de la identidad del negocio"] p');
  return p ? p.textContent.trim() : null;
})()`);
check("elegir en la lista actualiza la vista previa",
  String(rubroEnPrevia).startsWith("Gastronomía & Alimentos"), String(rubroEnPrevia));
check("el select cambió", cambiado === "Gastronomía & Alimentos", cambiado);

const botonActivo = await evaluate(`(() => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Guardar cambios');
  return b ? !b.disabled : null;
})()`);
check("Guardar se habilita con el cambio", botonActivo === true, String(botonActivo));

await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }).then(({ data }) =>
  writeFileSync(OUT + "tipo-lista.png", Buffer.from(data, "base64"))
);

// ── Caso 2: valor del ALTA que no está en el catálogo ──────────────────────
await sembrar("Marca propia & Fabricación");
await cdp.send("Page.reload", { ignoreCache: false });
await waitFor(`!!document.querySelector('select[aria-label="Tipo de empresa"]')`, "el select tras recargar");
await sleep(600);

const fuera = await evaluate(`(() => {
  const s = document.querySelector('select[aria-label="Tipo de empresa"]');
  return { valor: s.value, total: s.options.length };
})()`);
check("un valor del alta fuera del catálogo no deja el campo vacío",
  fuera.valor === "Marca propia & Fabricación", `${fuera.valor} · ${fuera.total} opciones`);

const errs = cdp.events.filter((e) => e.method === "Runtime.exceptionThrown");
check("sin excepciones en runtime", errs.length === 0, String(errs.length));

console.log(`\nRESULTADO: ${fallos.length === 0 ? "TODO OK" : fallos.length + " FALLOS"}`);
cdp.close();
process.exit(fallos.length === 0 ? 0 : 1);
