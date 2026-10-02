// ═══════════════════════════════════════════════════════════════════════════
// Censo de contraste — Inventarios (el usuario objetivo es mayor)
// ═══════════════════════════════════════════════════════════════════════════
//
// `grep` cuenta CLASES; esto mide el COLOR COMPUTADO sobre el fondo REAL. La
// diferencia importa: `text-gray-400` sobre `bg-white` y `text-gray-400` dentro
// de un panel `bg-gray-50` dan contrastes distintos, y el grep no los distingue.
//
// Contraste con la fórmula WCAG 2.1 (luminancia relativa + (L1+.05)/(L2+.05)).
//
// Umbrales: AA para texto normal 4.5:1, texto grande (>=18.66px bold o >=24px)
// 3:1. Como el usuario objetivo tiene poca vista, se reporta también el 7:1 de
// AAA, pero SOLO el incumplimiento de AA es FAIL: por debajo de AAA hay
// decisiones de diseño legítimas (texto secundario), por debajo de AA no.

const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9333";
const APP = process.env.APP_URL || "http://localhost:6020";
const TEMA = process.env.TEMA || "claro"; // claro | oscuro

const t0 = new Date();
console.log("inicio " + t0.toLocaleTimeString("es-CO") + " · tema=" + TEMA);

// Sonda de vida: un arnés sin servidor mide la página de error de Chrome.
try {
  const r = await fetch(APP + "/", { redirect: "manual" });
  console.log("sonda de vida: " + APP + " → " + r.status);
} catch (e) {
  console.error("ABORTA: " + APP + " no responde (" + e.message + ")");
  process.exit(2);
}

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const t = (await (await fetch(CDP_BASE + "/json/list")).json())
        .find((x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
      if (t) return t;
    } catch {}
    await new Promise((s) => setTimeout(s, 250));
  }
  throw new Error("sin target CDP");
}

const ws = new WebSocket((await target()).webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res) => ws.addEventListener("open", res));
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
});
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => { const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
const sleep = (m) => new Promise((s) => setTimeout(s, m));

await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

// ── Sembrar la sesión (misma forma que los otros arneses) ──────────────────
await send("Page.navigate", { url: APP + "/login" });
await sleep(2500);
await ev(`(() => {
  localStorage.setItem('necto.session', JSON.stringify({ modulos:['pedidos','inventarios'], tipoSesion:'administrador', operadorSimuladoId:null, preSimulacion:null }));
  const c = { whatsapp:false, telegram:false, instagram:false, webchat:false, asistente:false };
  localStorage.setItem('necto.organizacion.v1', JSON.stringify({
    usuario:{nombre:'Vera',email:'demo@necto.io'},
    organizacion:{nombre:'Necto Demo',moneda:'COP',pais:'Colombia',zonaHoraria:'America/Bogota'},
    modulos:{ pedidos:{instalado:true,activo:true,conectores:c}, inventarios:{instalado:true,activo:true,conectores:c} },
  }));
  return true;
})()`);

// ── Forzar el tema antes de medir ─────────────────────────────────────────
//
// Clave REAL del proyecto: `webforge-ui-preferences` (ui.store.ts:20), un objeto
// `{ theme, sidebarExpanded }`. Inventarse `necto.tema` o `theme` —como hizo la
// primera versión— no cambia nada, y el arnés mide «claro» creyendo medir
// «oscuro». La guarda de abajo es lo que lo delató: sin ella habría publicado
// un informe oscuro con colores claros.
const fijarTema = async (tema) => {
  const v = tema === "oscuro" ? "dark" : "light";
  await ev(
    "(() => {" +
    "  let actual = {};" +
    "  try { actual = JSON.parse(localStorage.getItem('webforge-ui-preferences') || '{}'); } catch (e) {}" +
    "  localStorage.setItem('webforge-ui-preferences', JSON.stringify(Object.assign({}, actual, { theme: '" + v + "' })));" +
    "  return true;" +
    "})()"
  );
  await send("Page.reload", { ignoreCache: true });
  await sleep(2600);
  return await ev("document.documentElement.classList.contains('dark')");
};

const esOscuro = await fijarTema(TEMA);
console.log("tema fijado: pedido=" + TEMA + " · <html> tiene dark=" + esOscuro +
  " · clave webforge-ui-preferences=" + (await ev("localStorage.getItem('webforge-ui-preferences')")));
if (esOscuro !== (TEMA === "oscuro")) {
  console.error("ABORTA: se pidió tema=" + TEMA + " pero <html> quedó " +
    (esOscuro ? "oscuro" : "claro") + ". Medir así daría un informe falso.");
  console.error("(el tema se cambia desde la UI; ver el informe)");
  ws.close();
  process.exit(3);
}

// ── El medidor: contraste computado sobre el fondo real ───────────────────
const MEDIR = `(() => {
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  const parse = (s) => {
    const m = (s || '').match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x.trim()));
    return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
  };
  const sobre = (frente, fondo) => {
    if (!frente || !frente.rgb || !fondo) return null;
    const a = frente.a;
    return [0, 1, 2].map((i) => Math.round((frente.rgb[i] || 0) * a + (fondo[i] || 0) * (1 - a)));
  };
  const fondoReal = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.98) return c.rgb;
      n = n.parentElement;
    }
    const c = parse(getComputedStyle(document.body).backgroundColor);
    return (c && c.rgb) ? c.rgb : [255, 255, 255];
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  const out = [];
  const vistos = new Set();
  for (const el of document.querySelectorAll('main *')) {
    if (el.children.length !== 0) continue;
    const txt = (el.textContent || '').trim();
    if (!txt || txt.length < 3) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.6) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    // Fuera del viewport: no está a la vista, pero se mide igual y se marca.
    const frente = parse(cs.color);
    if (!frente) continue;
    const fondo = fondoReal(el) || [255, 255, 255];
    const compuesto = sobre(frente, fondo);
    if (!compuesto) continue;
    const px = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const grande = px >= 24 || (bold && px >= 18.66);
    const c = ratio(compuesto, fondo);
    const clave = cs.color + '|' + fondo.join(',') + '|' + Math.round(px) + '|' + (bold ? 'b' : 'n');
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    out.push({
      texto: txt.slice(0, 34),
      color: cs.color,
      fondo: 'rgb(' + fondo.join(', ') + ')',
      px: Math.round(px * 10) / 10,
      bold, grande,
      contraste: Math.round(c * 100) / 100,
      pasaAA: c >= (grande ? 3 : 4.5),
      pasaAAA: c >= (grande ? 4.5 : 7),
      tag: el.tagName.toLowerCase(),
    });
  }
  out.sort((a, b) => a.contraste - b.contraste);
  return out;
})()`;

const RUTAS = [
  "/inventarios",
  "/inventarios/elementos",
  "/inventarios/ubicaciones",
  "/inventarios/historial",
  "/inventarios/alertas",
  "/inventarios/reportes",
  "/inventarios/config",
  "/inventarios/nuevo",
];

let ok = 0, fail = 0, totalAA = 0, totalAAA = 0;
const incumplen = [];

console.log("\n── CONTRASTE (tema " + TEMA + ") ──");
for (const path of RUTAS) {
  await send("Page.navigate", { url: APP + path });
  await sleep(2800);
  const donde = await ev("location.pathname");
  if (donde !== path) { console.log("  (salta " + path + " → quedó en " + donde + ")"); continue; }
  const filas = await ev(MEDIR);
  const malas = filas.filter((f) => !f.pasaAA);
  totalAA += filas.length;
  totalAAA += filas.filter((f) => f.pasaAAA).length;
  console.log("\n  " + path + "  ·  " + filas.length + " combinaciones texto/fondo");
  if (malas.length === 0) {
    ok++;
    console.log("    OK   todas cumplen AA · peor caso " + (filas[0] ? filas[0].contraste + ":1 («" + filas[0].texto + "» " + filas[0].px + "px)" : "n/a"));
  } else {
    fail++;
    console.log("    FAIL " + malas.length + " combinación(es) por debajo de AA:");
    for (const m of malas) {
      console.log("         " + m.contraste + ":1  " + m.px + "px" + (m.bold ? " bold" : "") +
        "  " + m.tag + "  «" + m.texto + "»  " + m.color + " sobre " + m.fondo);
    }
  }
  // Se listan también los que pasan AA pero no AAA, sin contar como fallo.
  const flojos = filas.filter((f) => f.pasaAA && !f.pasaAAA);
  if (flojos.length) {
    console.log("    (" + flojos.length + " pasan AA pero no AAA, el umbral del usuario con poca vista)");
    for (const f of flojos.slice(0, 4)) {
      console.log("         " + f.contraste + ":1  " + f.px + "px  «" + f.texto + "»");
    }
  }
  incumplen.push(...malas.map((m) => ({ path, ...m })));
}

console.log("\n──────────────────────────────");
console.log("rutas OK:   " + ok);
console.log("rutas FAIL: " + fail);
console.log("combinaciones medidas: " + totalAA + " · cumplen AAA: " + totalAAA +
  " (" + Math.round((totalAAA / Math.max(totalAA, 1)) * 100) + "%)");
console.log("fin " + new Date().toLocaleTimeString("es-CO") +
  " (duración " + Math.round((Date.now() - t0.getTime()) / 1000) + "s)");
ws.close();
process.exit(fail === 0 ? 0 : 1);
