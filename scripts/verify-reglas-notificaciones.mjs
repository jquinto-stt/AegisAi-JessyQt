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

const clickTexto = (t) =>
  evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(t)}); if (!b) return 'no-existe'; if (b.disabled) return 'disabled'; b.click(); return 'ok'; })()`);

const ORG = {
  id: "org_verify", nombre: "Boutique Roma", slug: "boutique-roma",
  pais: "Colombia", moneda: "COP", zonaHoraria: "America/Bogota",
  tipoEmpresa: "Retail & Comercio minorista", tamanoEquipo: "2 a 5 personas",
  logoUrl: "", descripcion: "", sitioWeb: "", fechaCreacion: new Date().toISOString(),
};

await cdp.send("Page.navigate", { url: `${APP}/login` });
await sleep(2500);
await evaluate(`(() => {
  localStorage.setItem("necto.session", JSON.stringify({ modulos: ["pedidos","inventarios"], tipoSesion: "administrador", operadorSimuladoId: null, preSimulacion: null }));
  localStorage.setItem("necto.organizacion.v1", JSON.stringify({ usuario: null, organizacion: ${JSON.stringify(ORG)}, organizaciones: [${JSON.stringify(ORG)}] }));
  localStorage.removeItem("necto.reglas_notificaciones");
  const raw = localStorage.getItem("webforge-ui-preferences") || "{}";
  let ui = {}; try { ui = JSON.parse(raw); } catch {}
  ui.themePreference = "light"; localStorage.setItem("webforge-ui-preferences", JSON.stringify(ui));
  return true;
})()`);

await cdp.send("Page.navigate", { url: `${APP}/configuracion?tab=canales` });
await waitFor(`document.body.innerText.includes("Reglas de notificaciones")`, "la sección de reglas");
await sleep(800);

// ── 1. Estructura ─────────────────────────────────────────────────────────
const texto = await evaluate("document.body.innerText");
check("la sección se llama «Reglas de notificaciones»", texto.includes("Reglas de notificaciones"));
check("tiene el bloque de WhatsApp de servicio al cliente",
  texto.includes("WhatsApp de Servicio al Cliente") &&
  (await evaluate("document.querySelector('#num-servicio').value")) === "3774474574");
const filas = await evaluate(`document.querySelectorAll('ul li button[aria-pressed]').length`);
check("hay 7 reglas × 2 canales", filas === 14, `${filas} botones de canal`);
check("las 7 notificaciones del concepto están",
  ["Guía generada", "Tu pedido está en tránsito", "Retrasos en carretera", "Tu pedido llegará hoy",
   "Tu pedido fue entregado", "Cliente Ausente/Desconocido", "Dirección Incorrecta/Incompleta"]
    .every((t) => texto.includes(t)));

const { data: shot1 } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
writeFileSync(OUT + "reglas-1.png", Buffer.from(shot1, "base64"));

// ── 2. Interruptor maestro ────────────────────────────────────────────────
const antes = await evaluate(`document.querySelector('input[aria-label="Activar Guía generada"]').checked`);
await evaluate(`document.querySelector('input[aria-label="Activar Guía generada"]').click()`);
await sleep(500);
const despues = await evaluate(`(() => { const s = JSON.parse(localStorage.getItem("necto.reglas_notificaciones")); return s.reglas[0].activa; })()`);
check("el interruptor maestro cambia y persiste", antes === true && despues === false, `${antes} → ${despues}`);

// ── 3. Activar WhatsApp pide confirmación ─────────────────────────────────
await evaluate(`document.querySelector('button[aria-label="Activar whatsapp para Tu pedido está en tránsito"]').click()`);
await waitFor(`document.body.innerText.includes("¿Quieres activar las notificaciones por WhatsApp?")`, "modal de costo");
await sleep(400);
check("el modal avisa del costo por mensaje",
  (await evaluate("document.body.innerText")).includes("$197 COP"));
check("y aclara que en esta versión no hay cobro",
  (await evaluate("document.body.innerText")).includes("no genera cobros"));

const { data: shot2 } = await cdp.send("Page.captureScreenshot", { format: "png" });
writeFileSync(OUT + "reglas-2-modal.png", Buffer.from(shot2, "base64"));

check("«Sí, Activar Notificaciones» confirma", (await clickTexto("Sí, Activar Notificaciones")) === "ok");
await sleep(600);
const tras = await evaluate(`(() => { const s = JSON.parse(localStorage.getItem("necto.reglas_notificaciones")); return { flag: s.whatsappActivado, regla: s.reglas[1].whatsapp }; })()`);
check("queda activado el canal y la regla", tras.flag === true && tras.regla === true, JSON.stringify(tras));

// Segunda regla: ya no debe pedir confirmación
await evaluate(`document.querySelector('button[aria-label="Activar whatsapp para Tu pedido llegará hoy"]').click()`);
await sleep(500);
check("la segunda activación no vuelve a preguntar",
  (await evaluate(`!document.body.innerText.includes("¿Quieres activar las notificaciones por WhatsApp?")`)) === true);
const segunda = await evaluate(`(() => { const s = JSON.parse(localStorage.getItem("necto.reglas_notificaciones")); return s.reglas[3].whatsapp; })()`);
check("la segunda regla quedó con WhatsApp activo", segunda === true);

// ── 4. Previsualización ───────────────────────────────────────────────────
await evaluate(`document.querySelector('button[aria-label^="Previsualizar la notificación"]').click()`);
await waitFor(`document.body.innerText.includes("Previsualiza las Notificaciones")`, "modal de previa");
await sleep(400);
check("la previa abre en Correo", /asunto/i.test(await evaluate("document.body.innerText")));
await clickTexto("WhatsApp");
await sleep(400);
const previaWa = await evaluate("document.body.innerText");
check("la pestaña WhatsApp muestra la plantilla con el número de servicio",
  previaWa.includes("3774474574") && previaWa.includes("Guía generada"));

const { data: shot3 } = await cdp.send("Page.captureScreenshot", { format: "png" });
writeFileSync(OUT + "reglas-3-previa.png", Buffer.from(shot3, "base64"));
await clickTexto("Cerrar");
await sleep(300);

// ── 5. Editar el número ───────────────────────────────────────────────────
await clickTexto("Editar");
await sleep(300);
await evaluate(`(() => {
  const el = document.querySelector('#num-servicio');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, "3001234567");
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);
await clickTexto("Guardar");
await sleep(500);
const numero = await evaluate(`(() => { const s = JSON.parse(localStorage.getItem("necto.reglas_notificaciones")); return s.numeroServicio; })()`);
check("el número editado persiste", numero === "3001234567", String(numero));

// ── 6. Recarga ────────────────────────────────────────────────────────────
await cdp.send("Page.reload", { ignoreCache: false });
await waitFor(`document.body.innerText.includes("Reglas de notificaciones")`, "tras recargar");
await sleep(700);
const trasRecarga = await evaluate(`(() => {
  const s = JSON.parse(localStorage.getItem("necto.reglas_notificaciones"));
  return { n: s.numeroServicio, flag: s.whatsappActivado, r1: s.reglas[1].whatsapp };
})()`);
check("todo sobrevive a la recarga",
  trasRecarga.n === "3001234567" && trasRecarga.flag && trasRecarga.r1, JSON.stringify(trasRecarga));

const errs = cdp.events.filter((e) => e.method === "Runtime.exceptionThrown");
check("sin excepciones en runtime", errs.length === 0, String(errs.length));

console.log(`\nRESULTADO: ${fallos.length === 0 ? "TODO OK" : fallos.length + " FALLOS"}`);
cdp.close();
process.exit(fallos.length === 0 ? 0 : 1);
