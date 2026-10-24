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
const url = () => evaluate("location.pathname + location.search");

const ORG = {
  id: "org_verify", nombre: "Boutique Roma", slug: "boutique-roma",
  pais: "Colombia", moneda: "COP", zonaHoraria: "America/Bogota",
  tipoEmpresa: "Retail & Comercio minorista", tamanoEquipo: "2 a 5 personas",
  logoUrl: "", descripcion: "Ropa femenina de autor.", sitioWeb: "",
  fechaCreacion: new Date().toISOString(),
};

await cdp.send("Page.navigate", { url: `${APP}/login` });
await sleep(2500);
await evaluate(`(() => {
  localStorage.setItem("necto.session", JSON.stringify({ modulos: ["pedidos","inventarios"], tipoSesion: "administrador", operadorSimuladoId: null, preSimulacion: null }));
  localStorage.setItem("necto.organizacion.v1", JSON.stringify({ usuario: null, organizacion: ${JSON.stringify(ORG)}, organizaciones: [${JSON.stringify(ORG)}] }));
  const raw = localStorage.getItem("webforge-ui-preferences") || "{}";
  let ui = {}; try { ui = JSON.parse(raw); } catch {}
  ui.themePreference = "light"; localStorage.setItem("webforge-ui-preferences", JSON.stringify(ui));
  return true;
})()`);

// ── 1. El submenú ──────────────────────────────────────────────────────────
await cdp.send("Page.navigate", { url: `${APP}/configuracion?tab=general` });
await waitFor(`document.body.innerText.includes("Datos bancarios")`, "el submenú");
await sleep(700);

const tarjetas = await evaluate(`[...document.querySelectorAll('button[aria-label^="Configurar:"]')].map(b => b.getAttribute('aria-label'))`);
check("el submenú tiene las 3 tarjetas", tarjetas.length === 3, JSON.stringify(tarjetas));
check("están los 3 nombres pedidos",
  ["Datos generales de la organización", "Datos fiscales", "Datos bancarios"].every((n) => tarjetas.some((t) => t.endsWith(n))),
  JSON.stringify(tarjetas));
check("las dos nuevas avisan que están sin completar",
  (await evaluate("document.body.innerText")).includes("Sin completar") &&
  (await evaluate("document.body.innerText")).includes("Sin cuenta registrada"));

const { data: shot1 } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
writeFileSync(OUT + "submenu-negocio.png", Buffer.from(shot1, "base64"));

// ── 2. Datos fiscales ──────────────────────────────────────────────────────
await evaluate(`[...document.querySelectorAll('button[aria-label^="Configurar:"]')].find(b => b.getAttribute('aria-label').endsWith('Datos fiscales')).click()`);
await waitFor(`location.search.includes("seccion=fiscales")`, "navegación a fiscales");
await sleep(700);
check("fiscales tiene su propia URL", (await url()) === "/configuracion?tab=general&seccion=fiscales", await url());
check("el formulario fiscal está", (await evaluate(`!!document.querySelector('input#fis-nit')`)) === true);

await evaluate(`(() => {
  const setVal = (sel, v) => { const el = document.querySelector(sel); const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  setVal('input#fis-razon', 'Boutique Roma S.A.S.');
  setVal('input#fis-nit', '900.123.456-7');
  setVal('input#fis-correo', 'facturacion@boutiqueroma.co');
  return true;
})()`);
await sleep(400);
const guardarFiscal = await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Guardar cambios'); if (!b || b.disabled) return false; b.click(); return true; })()`);
check("guarda los datos fiscales", guardarFiscal === true);
await sleep(800);
const persistido = await evaluate(`(() => { const d = JSON.parse(localStorage.getItem("necto.organizacion.v1")); return d.organizacion.datosFiscales || null; })()`);
check("quedaron en el store", persistido?.nit === "900.123.456-7" && persistido?.razonSocial === "Boutique Roma S.A.S.", JSON.stringify(persistido));

// ── 3. Volver al submenú: el estado se refleja ─────────────────────────────
await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Volver a Configuración del negocio')).click()`);
await waitFor(`location.search === "?tab=general"`, "volver al submenú");
await sleep(600);
const estadoFiscal = await evaluate(`(() => { const b = [...document.querySelectorAll('button[aria-label^="Configurar:"]')].find(x => x.getAttribute('aria-label').endsWith('Datos fiscales')); return b ? b.textContent : null; })()`);
check("la tarjeta fiscal muestra el NIT guardado", String(estadoFiscal).includes("NIT 900.123.456-7"), String(estadoFiscal).slice(0, 120));

// ── 4. Datos bancarios ─────────────────────────────────────────────────────
await evaluate(`[...document.querySelectorAll('button[aria-label^="Configurar:"]')].find(b => b.getAttribute('aria-label').endsWith('Datos bancarios')).click()`);
await waitFor(`location.search.includes("seccion=bancarios")`, "navegación a bancarios");
await sleep(700);

const sinNumero = await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Guardar cambios'); return b ? b.disabled : null; })()`);
check("sin número de cuenta no deja guardar", sinNumero === true, `disabled=${sinNumero}`);

await evaluate(`(() => {
  const el = document.querySelector('input#ban-numero');
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  s.call(el, '123-456789-01'); el.dispatchEvent(new Event('input', { bubbles: true }));
  const t = document.querySelector('input#ban-titular');
  s.call(t, 'Boutique Roma S.A.S.'); t.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);
await sleep(400);
const guardarBanco = await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Guardar cambios'); if (!b || b.disabled) return false; b.click(); return true; })()`);
check("guarda los datos bancarios", guardarBanco === true);
await sleep(800);
const banco = await evaluate(`(() => { const d = JSON.parse(localStorage.getItem("necto.organizacion.v1")); return d.organizacion.datosBancarios || null; })()`);
check("la cuenta quedó en el store", banco?.numero === "123-456789-01" && banco?.banco === "Bancolombia", JSON.stringify(banco));

await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Volver a Configuración del negocio')).click()`);
await waitFor(`location.search === "?tab=general"`, "volver al submenú 2");
await sleep(600);
const estadoBanco = await evaluate(`(() => { const b = [...document.querySelectorAll('button[aria-label^="Configurar:"]')].find(x => x.getAttribute('aria-label').endsWith('Datos bancarios')); return b ? b.textContent : null; })()`);
check("la tarjeta bancaria muestra banco y tipo", String(estadoBanco).includes("Bancolombia · Ahorros"), String(estadoBanco).slice(0, 120));

const { data: shot2 } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
writeFileSync(OUT + "submenu-negocio-completo.png", Buffer.from(shot2, "base64"));

// ── 5. El detalle general sigue intacto ────────────────────────────────────
await evaluate(`[...document.querySelectorAll('button[aria-label^="Configurar:"]')].find(b => b.getAttribute('aria-label').endsWith('Datos generales de la organización')).click()`);
await waitFor(`location.search.includes("seccion=organizacion")`, "navegación a organizacion");
await sleep(800);
check("la vista previa sigue en datos generales",
  (await evaluate(`!!document.querySelector('section[aria-label="Vista previa de la identidad del negocio"]')`)) === true);

const errs = cdp.events.filter((e) => e.method === "Runtime.exceptionThrown");
check("sin excepciones en runtime", errs.length === 0, String(errs.length));

console.log(`\nRESULTADO: ${fallos.length === 0 ? "TODO OK" : fallos.length + " FALLOS"}`);
cdp.close();
process.exit(fallos.length === 0 ? 0 : 1);
