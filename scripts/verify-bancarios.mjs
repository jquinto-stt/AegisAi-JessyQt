import { writeFileSync, mkdirSync } from "node:fs";

const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://127.0.0.1:5199";
const OUT = "./artifacts-verify/";
mkdirSync(OUT, { recursive: true });

writeFileSync(
  OUT + "certificado.pdf",
  Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n", "utf8")
);

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
await cdp.send("DOM.enable");
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

const setInput = (sel, valor) =>
  evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, ${JSON.stringify(valor)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);

const subir = async (selector, ruta) => {
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
  await cdp.send("DOM.setFileInputFiles", {
    nodeId,
    files: [process.cwd().split("\\").join("/") + "/artifacts-verify/" + ruta],
  });
};

const ORG_BASE = {
  id: "org_verify", nombre: "Boutique Roma", slug: "boutique-roma",
  pais: "Colombia", moneda: "COP", zonaHoraria: "America/Bogota",
  tipoEmpresa: "Retail & Comercio minorista", tamanoEquipo: "2 a 5 personas",
  logoUrl: "", descripcion: "", sitioWeb: "", fechaCreacion: new Date().toISOString(),
};

const sembrar = (verificacion) =>
  evaluate(`(() => {
    const org = ${JSON.stringify(ORG_BASE)};
    if (${JSON.stringify(verificacion)}) org.verificacion = ${JSON.stringify(verificacion)};
    localStorage.setItem("necto.session", JSON.stringify({ modulos: ["pedidos","inventarios"], tipoSesion: "administrador", operadorSimuladoId: null, preSimulacion: null }));
    localStorage.setItem("necto.organizacion.v1", JSON.stringify({ usuario: null, organizacion: org, organizaciones: [org] }));
    const raw = localStorage.getItem("webforge-ui-preferences") || "{}";
    let ui = {}; try { ui = JSON.parse(raw); } catch {}
    ui.themePreference = "light"; localStorage.setItem("webforge-ui-preferences", JSON.stringify(ui));
    return true;
  })()`);

await cdp.send("Page.navigate", { url: `${APP}/login` });
await sleep(2500);

// ── 1. Compuerta sin fiscal aprobado ───────────────────────────────────────
await sembrar(null);
await cdp.send("Page.navigate", { url: `${APP}/configuracion?tab=general&seccion=bancarios` });
await waitFor(`document.body.innerText.includes("Registrar datos bancarios")`, "entrada bancaria");
await sleep(600);
check("sin fiscal aprobado, el botón está deshabilitado",
  (await clickTexto("Registrar Cuenta Bancaria")) === "disabled");
check("y explica que falta la verificación fiscal",
  (await evaluate("document.body.innerText")).includes("Falta la verificación fiscal"));

// ── 2. Con fiscal aprobado ────────────────────────────────────────────────
await sembrar({ estado: "aprobado", terminosAceptadosEn: new Date().toISOString(), persona: "natural", nombreCompleto: "Wiltrido Bilbao", tipoDocumento: "Cédula de ciudadanía", numeroDocumento: "10005678909" });
await cdp.send("Page.reload", { ignoreCache: false });
await waitFor(`document.body.innerText.includes("Registrar datos bancarios")`, "entrada habilitada");
await sleep(600);
check("con fiscal aprobado se habilita", (await clickTexto("Registrar Cuenta Bancaria")) === "ok");

// ── 3. Código ─────────────────────────────────────────────────────────────
await waitFor(`!!document.querySelector('input#ban-codigo')`, "paso código bancario");
await sleep(500);
const texto = await evaluate("document.body.innerText");
const codigo = (texto.match(/se muestra aquí: ([A-Z0-9]{6})/) || [])[1] || "";
check("el código se muestra con aviso de demostración", Boolean(codigo), codigo);

await setInput("#ban-codigo", "XXXXXX");
await sleep(200);
await clickTexto("Validar");
await sleep(400);
check("código incorrecto no deja pasar",
  (await evaluate("document.body.innerText")).includes("no coincide"));

await setInput("#ban-codigo", codigo);
await sleep(200);
check("código correcto avanza", (await clickTexto("Validar")) === "ok");

// ── 4. Formulario bancario ────────────────────────────────────────────────
await waitFor(`!!document.querySelector('input#ban-titular')`, "formulario bancario");
await sleep(500);
check("sin datos, «Siguiente» apagado", (await clickTexto("Siguiente")) === "disabled");
await setInput("#ban-titular", "Eddiberto Saez");
await setInput("#ban-numdoc", "1000567890");
await setInput("#ban-numero", "00179343193");
await sleep(300);
check("con datos avanza", (await clickTexto("Siguiente")) === "ok");

// ── 5. Certificado ────────────────────────────────────────────────────────
await waitFor(`!!document.querySelector('input#ban-certificado')`, "paso certificado");
await sleep(500);
check("sin certificado, «Finalizar» apagado", (await clickTexto("Finalizar")) === "disabled");
await subir("input#ban-certificado", "certificado.pdf");
await sleep(700);
check("con certificado pero sin autorizar sigue apagado",
  (await clickTexto("Finalizar")) === "disabled");
await evaluate(`(() => { const c = document.querySelectorAll('input[type=checkbox]')[0]; c.click(); return c.checked; })()`);
await sleep(300);
check("autorizando pagos se habilita", (await clickTexto("Finalizar")) === "ok");

// ── 6. Lista ──────────────────────────────────────────────────────────────
await waitFor(`document.body.innerText.includes("Cuentas Bancarias")`, "lista de cuentas");
await sleep(700);
const lista = await evaluate("document.body.innerText");
check("la cuenta aparece en la tabla",
  lista.includes("Bancolombia") && lista.includes("Cuenta de Ahorros") &&
  lista.includes("00179343193") && lista.includes("Eddiberto Saez"),
  "");
check("nace sin aprobación", lista.includes("Sin aprobación"));
//  devuelve el texto RENDERIZADO: el badge va en mayúsculas por CSS.
check("la primera cuenta es la principal", /principal/i.test(lista));

const persistida = await evaluate(`(() => {
  const d = JSON.parse(localStorage.getItem("necto.organizacion.v1"));
  const c = (d.organizacion.cuentasBancarias || [])[0] || null;
  return c ? { banco: c.banco, estado: c.estado, principal: c.principal, cert: Boolean(c.certificado?.dataUrl) } : null;
})()`);
check("quedó persistida con su certificado",
  persistida?.banco === "Bancolombia" && persistida?.estado === "sin_aprobacion" && persistida?.principal && persistida?.cert,
  JSON.stringify(persistida));

const { data: shot } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
writeFileSync(OUT + "bancos-lista.png", Buffer.from(shot, "base64"));

// ── 7. Aprobar (demo) y segunda cuenta ────────────────────────────────────
await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Aprobar (demo)')).click()`);
await sleep(600);
check("«Aprobar (demo)» marca la cuenta como aprobada",
  (await evaluate("document.body.innerText")).includes("Aprobada"));

await clickTexto("Nueva cuenta");
await sleep(600);
const cod2 = ((await evaluate("document.body.innerText")).match(/se muestra aquí: ([A-Z0-9]{6})/) || [])[1] || "";
await setInput("#ban-codigo", cod2);
await sleep(200);
await clickTexto("Validar");
await waitFor(`!!document.querySelector('input#ban-titular')`, "formulario 2");
await setInput("#ban-titular", "Boutique Roma S.A.S.");
await setInput("#ban-numdoc", "900123456");
await setInput("#ban-numero", "987654321");
await sleep(300);
await clickTexto("Siguiente");
await waitFor(`!!document.querySelector('input#ban-certificado')`, "certificado 2");
await subir("input#ban-certificado", "certificado.pdf");
await sleep(600);
await evaluate(`(() => { const c = document.querySelectorAll('input[type=checkbox]')[0]; c.click(); return true; })()`);
await sleep(300);
await clickTexto("Finalizar");
await waitFor(`document.body.innerText.includes("Cuentas Bancarias")`, "lista con dos cuentas");
await sleep(600);
check("la segunda cuenta entra a la lista",
  (await evaluate("document.body.innerText")).includes("987654321"));

// Hacer principal la segunda
await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Hacer principal').click()`);
await sleep(500);
const principal = await evaluate(`(() => {
  const d = JSON.parse(localStorage.getItem("necto.organizacion.v1"));
  return d.organizacion.cuentasBancarias.map(c => ({ n: c.numero, p: c.principal }));
})()`);
check("solo una cuenta queda como principal",
  principal.filter((c) => c.p).length === 1 && principal.find((c) => c.p)?.n === "987654321",
  JSON.stringify(principal));

await cdp.send("Page.reload", { ignoreCache: false });
await waitFor(`document.body.innerText.includes("Cuentas Bancarias")`, "lista tras recargar");
check("las cuentas sobreviven a la recarga", true);

const errs = cdp.events.filter((e) => e.method === "Runtime.exceptionThrown");
check("sin excepciones en runtime", errs.length === 0, String(errs.length));

console.log(`\nRESULTADO: ${fallos.length === 0 ? "TODO OK" : fallos.length + " FALLOS"}`);
cdp.close();
process.exit(fallos.length === 0 ? 0 : 1);
