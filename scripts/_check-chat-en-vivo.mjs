import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://127.0.0.1:5199";
const OUT = "./artifacts-verify/";
mkdirSync(OUT, { recursive: true });

async function getPageTarget() {
  const res = await fetch(`${CDP_BASE}/json/list`);
  const targets = await res.json();
  return targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl && !t.url.startsWith("devtools"));
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

const target = await getPageTarget();
const cdp = await connect(target.webSocketDebuggerUrl);
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 950, deviceScaleFactor: 1, mobile: false });

async function shot(nombre) {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${OUT}${nombre}.png`, Buffer.from(data, "base64"));
  console.log("captura", nombre);
}

async function evaluate(expr) {
  const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  return r.result?.value;
}

const clickTexto = (texto) => `
  (() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(texto)});
    if (!b) return 'NO-ENCONTRADO';
    b.click();
    return 'ok';
  })()`;

await cdp.send("Page.navigate", { url: `${APP}/login` });
await sleep(2500);

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

await cdp.send("Page.navigate", { url: `${APP}/pedidos` });
for (let i = 0; i < 60; i++) {
  if (await evaluate(`document.body.innerText.includes("Añadir pedido")`)) break;
  await sleep(500);
}
await sleep(1500);

// 1) Vista Inicio: NO debe haber botones de superficie
console.log("inicio -> botones:", await evaluate(`
  (() => {
    const t = [...document.querySelectorAll('button')].map(b => b.textContent.trim());
    return JSON.stringify({ chatEnVivo: t.includes('Chat en vivo'), operacion: t.includes('Operación') });
  })()`));
await shot("chat-01-inicio");

// 2) Vista Tabla
console.log("click Tabla:", await evaluate(clickTexto("Tabla")));
await sleep(1500);
console.log("tabla -> botones:", await evaluate(`
  (() => {
    const t = [...document.querySelectorAll('button')].map(b => b.textContent.trim());
    return JSON.stringify({ chatEnVivo: t.includes('Chat en vivo'), operacion: t.includes('Operación') });
  })()`));
await shot("chat-02-tabla");

// 3) Chat en vivo
console.log("click Chat en vivo:", await evaluate(clickTexto("Chat en vivo")));
await sleep(1500);
console.log("columnas:", await evaluate(`
  (() => JSON.stringify([...document.querySelectorAll('section h2')].map(h => h.textContent.trim())))()`));
await shot("chat-03-en-vivo");

// 4) Filtro por etapa «En Cierre»
console.log("click filtro En Cierre:", await evaluate(`
  (() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('En Cierre'));
    if (!b) return 'NO-ENCONTRADO';
    b.click();
    return b.textContent.trim();
  })()`));
await sleep(1200);
console.log("columnas tras filtro:", await evaluate(`
  (() => JSON.stringify([...document.querySelectorAll('section h2')].map(h => h.textContent.trim())))()`));
await shot("chat-04-filtro");

// 5) Volver a Operación y a Inicio
console.log("click Operación:", await evaluate(clickTexto("Operación")));
await sleep(1000);
console.log("click Finalizadas:", await evaluate(`
  (() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('Finalizadas'));
    if (!b) return 'NO-ENCONTRADO';
    b.click();
    return b.textContent.trim();
  })()`));
await sleep(1200);
await shot("chat-05-finalizadas");
console.log("click Inicio:", await evaluate(clickTexto("Inicio")));
await sleep(1200);
console.log("inicio otra vez -> botones:", await evaluate(`
  (() => {
    const t = [...document.querySelectorAll('button')].map(b => b.textContent.trim());
    return JSON.stringify({ chatEnVivo: t.includes('Chat en vivo'), operacion: t.includes('Operación') });
  })()`));

console.log("errores de consola:", await evaluate(`JSON.stringify(window.__errores ?? [])`));

cdp.close();
process.exit(0);
