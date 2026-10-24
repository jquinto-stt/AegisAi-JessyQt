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
    ws.addEventListener("open", () =>
      resolve({
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
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 950, deviceScaleFactor: 1, mobile: false });

const evaluate = async (expr) => {
  const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

const shot = async (nombre) => {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${OUT}${nombre}.png`, Buffer.from(data, "base64"));
  console.log("captura", nombre);
};

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
  localStorage.setItem("necto.pedidosVista", "kanban");
  const raw = localStorage.getItem("webforge-ui-preferences") || "{}";
  let ui = {}; try { ui = JSON.parse(raw); } catch {}
  ui.themePreference = "light"; localStorage.setItem("webforge-ui-preferences", JSON.stringify(ui));
  return true;
})()`);

await cdp.send("Page.navigate", { url: `${APP}/pedidos` });
await sleep(2500);
for (let i = 0; i < 60; i++) {
  if (await evaluate(`(document.body?.innerText ?? "").includes("Añadir pedido")`)) break;
  await sleep(500);
}
await sleep(1500);

// Abre el detalle de la primera tarjeta
const abierto = await evaluate(`
  (() => {
    const el = [...document.querySelectorAll('p,span,h3')].find(e => e.textContent.trim() === 'Ana Silva');
    if (!el) return 'NO-CARD';
    el.click();
    return 'ok';
  })()`);
console.log("abrir detalle:", abierto);
await sleep(1200);
console.log("pestañas:", await evaluate(`
  (() => JSON.stringify([...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => ['Resumen','Detalle','Historial de Estados','Automatizaciones','Novedades','Devoluciones'].includes(t))))()`));
await shot("detalle-01-resumen");

for (const [tab, nombre] of [
  ["Detalle", "detalle-02-detalle"],
  ["Historial de Estados", "detalle-03-historial"],
  ["Automatizaciones", "detalle-04-automatizaciones"],
  ["Novedades", "detalle-05-novedades"],
  ["Devoluciones", "detalle-06-devoluciones"],
]) {
  const ok = await evaluate(`
    (() => {
      const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(tab)});
      if (!b) return 'NO-TAB';
      b.click();
      return 'ok';
    })()`);
  await sleep(900);
  console.log(tab, "→", ok);
  await shot(nombre);
}

// Abre el historial de envío dentro de la pestaña Historial
await evaluate(`
  (() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Historial de Estados');
    b && b.click();
    return 'ok';
  })()`);
await sleep(600);
await evaluate(`
  (() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Historial de envío'));
    b && b.click();
    return 'ok';
  })()`);
await sleep(700);
await shot("detalle-07-historial-abierto");

console.log("fin");
cdp.close();
process.exit(0);
