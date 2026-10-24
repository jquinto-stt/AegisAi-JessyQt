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

const waitFor = async (expression, label, timeoutMs = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { if (await evaluate(expression)) return true; } catch {}
    await sleep(300);
  }
  throw new Error(`Timeout: ${label}`);
};

const fallos = [];
const check = (n, ok, d = "") => { console.log(`${ok ? "OK  " : "FAIL"} ${n}${d ? " · " + d : ""}`); if (!ok) fallos.push(n); };

const MODULOS = {
  pedidos: { instalado: true, activo: true, conectores: { necto_ia: false, whatsapp: true } },
  inventarios: { instalado: true, activo: true, conectores: { necto_ia: false, whatsapp: false } },
};
const ORG = {
  id: "org_verify", nombre: "Boutique Roma", slug: "boutique-roma",
  pais: "Colombia", moneda: "COP", zonaHoraria: "America/Bogota",
  tipoEmpresa: "Retail & Comercio minorista", tamanoEquipo: "2 a 5 personas",
  logoUrl: "", descripcion: "", sitioWeb: "", fechaCreacion: new Date().toISOString(),
};

await cdp.send("Page.navigate", { url: `${APP}/login` });
await sleep(2500);
await evaluate(`(() => {
  const org = { ...${JSON.stringify(ORG)}, modulos: ${JSON.stringify(MODULOS)} };
  localStorage.setItem("necto.session", JSON.stringify({ modulos: ["pedidos","inventarios"], tipoSesion: "administrador", operadorSimuladoId: null, preSimulacion: null }));
  localStorage.setItem("necto.organizacion.v1", JSON.stringify({ usuario: null, organizacion: org, organizaciones: [org], modulos: ${JSON.stringify(MODULOS)} }));
  localStorage.removeItem("necto.pedidosVista");
  const raw = localStorage.getItem("webforge-ui-preferences") || "{}";
  let ui = {}; try { ui = JSON.parse(raw); } catch {}
  ui.themePreference = "light"; localStorage.setItem("webforge-ui-preferences", JSON.stringify(ui));
  return true;
})()`);

// ── 1. /pedidos/inicio sigue siendo el de antes ───────────────────────────
await cdp.send("Page.navigate", { url: `${APP}/pedidos/inicio` });
await waitFor(`document.body.innerText.length > 200`, "el inicio clásico");
await sleep(1200);
const textoInicio = await evaluate("document.body.innerText");
check("/pedidos/inicio conserva el panel de siempre",
  textoInicio.includes("Chat & Conversaciones") || textoInicio.includes("Pedidos en curso"),
  textoInicio.slice(0, 80).replace(/\n/g, " · "));
check("el inicio clásico NO tiene la tabla de etapas",
  !textoInicio.includes("Mostrando") || !textoInicio.includes("En tránsito"));

// ── 2. /pedidos abre con la vista Inicio ─────────────────────────────────
await cdp.send("Page.navigate", { url: `${APP}/pedidos` });
await waitFor(`document.body.innerText.includes("Añadir pedido")`, "el tablero");
await sleep(1200);

const toggle = await evaluate(`(() => {
  const btns = [...document.querySelectorAll('button[aria-pressed]')].filter(b => ['Inicio','Tabla','Lista'].includes(b.textContent.trim()));
  return btns.map(b => ({ t: b.textContent.trim(), p: b.getAttribute('aria-pressed') }));
})()`);
check("el conmutador tiene Inicio · Tabla · Lista",
  toggle.map((t) => t.t).join("|") === "Inicio|Tabla|Lista", JSON.stringify(toggle));
check("arranca seleccionada «Inicio»", toggle[0]?.p === "true", JSON.stringify(toggle[0]));

const textoPedidos = await evaluate("document.body.innerText");
check("la vista Inicio muestra etapas y tabla",
  textoPedidos.includes("Por preparar") && textoPedidos.includes("N. ORDEN"));
check("y NO duplica el título grande de la página",
  !textoPedidos.includes("Consulta y gestiona tus pedidos de acuerdo a la etapa"));

const { data: shot1 } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
writeFileSync(OUT + "pedidos-vista-inicio.png", Buffer.from(shot1, "base64"));

// ── 3. Cambiar a Tabla y volver ──────────────────────────────────────────
await evaluate(`[...document.querySelectorAll('button[aria-pressed]')].find(b => b.textContent.trim() === 'Tabla').click()`);
await sleep(900);
check("«Tabla» sigue mostrando el kanban",
  (await evaluate("document.body.innerText")).length > 200 &&
  !(await evaluate("document.body.innerText")).includes("N. ORDEN"));

const guardadaTabla = await evaluate(`localStorage.getItem("necto.pedidosVista")`);
check("la vista elegida se guarda", guardadaTabla === "kanban", String(guardadaTabla));

await evaluate(`[...document.querySelectorAll('button[aria-pressed]')].find(b => b.textContent.trim() === 'Inicio').click()`);
await sleep(800);
check("se puede volver a Inicio",
  (await evaluate("document.body.innerText")).includes("N. ORDEN"));

// ── 4. Recarga: mantiene la vista elegida ────────────────────────────────
await cdp.send("Page.reload", { ignoreCache: false });
await waitFor(`document.body.innerText.includes("N. ORDEN")`, "Inicio tras recargar");
check("la vista sobrevive a la recarga", true);

const errs = cdp.events.filter((e) => e.method === "Runtime.exceptionThrown");
check("sin excepciones en runtime", errs.length === 0, String(errs.length));

console.log(`\nRESULTADO: ${fallos.length === 0 ? "TODO OK" : fallos.length + " FALLOS"}`);
cdp.close();
process.exit(fallos.length === 0 ? 0 : 1);
