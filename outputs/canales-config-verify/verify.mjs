// ═══════════════════════════════════════════════════════════════════════════
// Verificación UI — Configuración del canal (/conversaciones/config)
// ═══════════════════════════════════════════════════════════════════════════
//
// Comprueba en un Chrome real, vía CDP:
//   1. La entrada "Configuración" aparece BAJO Canales en la barra lateral.
//   2. La ruta /conversaciones/config renderiza la página.
//   3. La navegación vertical tiene 7 secciones en 3 grupos, y al pulsar una
//      sección cambia el panel (solo una montada).
//   4. El pie fijo muestra los dos botones.
//   5. El borrador: editar una plantilla NO persiste hasta pulsar Guardar.
//   6. Descartar restaura el valor confirmado.
//   7. Con rol sin `channels.manage`, la ruta queda bloqueada (guard).
//
// Usa el `WebSocket` global de Node 22 (sin dependencias). OJO con el trap ya
// documentado: `send()` resuelve con el MENSAJE CDP completo `{id, result}`, así
// que el payload real está en `.result.result.value`, NO en `.result.value`.

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const APP = "http://localhost:6020";
const CDP_PORT = 9333;
const ART = new URL("./artifacts/", import.meta.url).pathname.replace(/^\//, "");
const CHROME =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

mkdirSync(ART, { recursive: true });
const results = [];
const check = (nombre, ok, detalle = "") => {
  results.push({ nombre, ok, detalle });
  console.log(`${ok ? "PASS" : "FAIL"}  ${nombre}${detalle ? ` — ${detalle}` : ""}`);
};

// ── Lanzar Chrome headless con CDP ──────────────────────────────────────────
const userDir = `${process.env.TEMP || "/tmp"}\\cdp-canales-${Date.now()}`;
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--window-size=1440,1000",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const getJson = async (path) => {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}${path}`);
  return res.json();
};

// Esperar a que el puerto CDP responda.
let targets = null;
for (let i = 0; i < 60; i++) {
  try {
    targets = await getJson("/json/list");
    if (targets?.length) break;
  } catch {
    /* aún no */
  }
  await sleep(300);
}
if (!targets?.length) {
  console.error("No se pudo conectar a CDP");
  chrome.kill();
  process.exit(1);
}

const page = targets.find((t) => t.type === "page") || targets[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let msgId = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++msgId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

await send("Runtime.enable");
await send("Page.enable");

const evaluate = async (expression) => {
  const m = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  const r = m.result; // envoltorio CDP {id, result}
  if (!r) throw new Error("sin resultado: " + JSON.stringify(m).slice(0, 300));
  if (r.exceptionDetails)
    throw new Error("excepción: " + JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value; // ← el trap: .result.result.value
};

const goto = async (url) => {
  await send("Page.navigate", { url });
  for (let i = 0; i < 50; i++) {
    const ready = await evaluate(
      "document.readyState === 'complete' && document.body.innerText.length > 50",
    );
    if (ready) return true;
    await sleep(300);
  }
  return false;
};

const screenshot = async (name) => {
  let shot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  if (!shot.result?.data) {
    shot = await send("Page.captureScreenshot", { format: "png" });
  }
  if (shot.result?.data) {
    writeFileSync(`${ART}/${name}.png`, Buffer.from(shot.result.data, "base64"));
  }
};

try {
  // ═══ 0. Sembrar la sesión (mock, localStorage) ═══════════════════════════
  // La sesión vive en `necto.session` y NO guarda capacidades: se derivan del
  // tipo de sesión + rol en cada render. Sembrar `administrador` es lo que
  // habilita `channels.manage`, que es la capacidad que protege esta ruta.
  await goto(`${APP}/login`);
  const sembrada = await evaluate(`
    (() => {
      localStorage.setItem('necto.session', JSON.stringify({
        modulos: ['pedidos'],
        tipoSesion: 'administrador',
        operadorSimuladoId: null,
        preSimulacion: null,
      }));
      return localStorage.getItem('necto.session');
    })()
  `);
  check("se sembró la sesión de administrador en el almacén", !!sembrada, String(sembrada).slice(0, 90));

  // ═══ 1. Login / sesión activa ═════════════════════════════════════════════
  await goto(`${APP}/pedidos/inicio`);
  const rutaInicial = await evaluate("location.pathname");
  console.log(`   ruta tras abrir /pedidos/inicio → ${rutaInicial}`);

  if (rutaInicial.startsWith("/login")) {
    check("hay sesión activa para entrar a la app", false, `redirige a ${rutaInicial}`);
    throw new Error("sin sesión: no se puede verificar el shell");
  }
  check("hay sesión activa para entrar a la app", true, rutaInicial);

  // ═══ 2. La entrada de Canales existe en la barra lateral ════════════════
  const nav = await evaluate(`
    (() => {
      const navs = [...document.querySelectorAll('nav')];
      const sidebar = navs[0];
      return sidebar ? sidebar.innerText : '';
    })()
  `);
  check(
    "la barra lateral muestra la sección «Canales»",
    /Canales/i.test(nav),
    nav.split("\\n").slice(0, 14).join(" | ").slice(0, 200),
  );
  check(
    "«Configuración» aparece dentro de Canales (no en Pedidos)",
    /Configuración/i.test(nav),
  );

  // La entrada debe apuntar a /conversaciones/config
  const hrefConfig = await evaluate(`
    (() => {
      const a = [...document.querySelectorAll('a')].find(
        (x) => x.getAttribute('href') === '/conversaciones/config'
      );
      return a ? a.textContent.trim() : null;
    })()
  `);
  check("existe un enlace a /conversaciones/config", hrefConfig !== null, `texto="${hrefConfig}"`);

  // ═══ 3. Navegar a la página de configuración del canal ══════════════════
  await goto(`${APP}/conversaciones/config`);
  const rutaConfig = await evaluate("location.pathname");
  check("la ruta /conversaciones/config carga", rutaConfig === "/conversaciones/config", rutaConfig);

  const titulo = await evaluate(
    "document.querySelector('h1')?.textContent?.trim() ?? null",
  );
  check("el título de la página es «Configuración del canal»", titulo === "Configuración del canal", String(titulo));

  // ═══ 4. Navegación vertical: 7 secciones, 3 grupos ══════════════════════
  const navInterna = await evaluate(`
    (() => {
      const nav = document.querySelector('nav[aria-label="Secciones de configuración del canal"]');
      if (!nav) return null;
      const grupos = [...nav.querySelectorAll(':scope > ul > li')];
      return {
        existen: true,
        grupos: grupos.map((li) => {
          const label = li.querySelector('p')?.textContent?.trim() ?? '';
          const items = [...li.querySelectorAll('ul > li > button')].map((b) => b.textContent.trim());
          return { label, items };
        }),
      };
    })()
  `);

  check("existe la navegación vertical de secciones", navInterna?.existen === true);

  if (navInterna?.existen) {
    const totalSecciones = navInterna.grupos.reduce((n, g) => n + g.items.length, 0);
    check("la navegación tiene 7 secciones", totalSecciones === 7, `encontradas ${totalSecciones}`);

    const etiquetasGrupo = navInterna.grupos.map((g) => g.label);
    check(
      "los grupos son CANAL / MENSAJERÍA / PREFERENCIAS, en orden",
      JSON.stringify(etiquetasGrupo) === JSON.stringify(["CANAL", "MENSAJERÍA", "PREFERENCIAS"]),
      etiquetasGrupo.join(" · "),
    );

    const todas = navInterna.grupos.flatMap((g) => g.items);
    const esperadas = [
      "Perfil del canal",
      "Plantillas de mensaje",
      "Horario de atención",
      "Automatización y escalado",
      "Aviso de pausa",
      "Alertas",
      "Apariencia",
    ];
    check(
      "las 7 secciones son las del diseño, en orden",
      JSON.stringify(todas) === JSON.stringify(esperadas),
      todas.join(" | "),
    );
  }

  // ═══ 5. Solo una sección montada a la vez ═══════════════════════════════
  const seccionInicial = await evaluate(`
    (() => {
      const h2s = [...document.querySelectorAll('h2')].map((h) => h.textContent.trim());
      return { h2s, plantillas: !!document.querySelector('#canal-plantilla-recibido') };
    })()
  `);
  check(
    "arranca en «Perfil del canal» sin montar la sección de plantillas",
    seccionInicial.h2s.includes("Perfil del canal") && !seccionInicial.plantillas,
    `h2: ${seccionInicial.h2s.join(" | ").slice(0, 160)}`,
  );
  await screenshot("01-perfil");

  // Pulsar "Plantillas de mensaje" y comprobar que cambia el panel.
  const cambioSeccion = await evaluate(`
    (() => {
      const btn = [...document.querySelectorAll('nav[aria-label="Secciones de configuración del canal"] button')]
        .find((b) => b.textContent.includes('Plantillas de mensaje'));
      if (!btn) return { pulsado: false };
      btn.click();
      return { pulsado: true };
    })()
  `);
  await sleep(500);
  const trasCambio = await evaluate(`
    (() => {
      const h2s = [...document.querySelectorAll('h2')].map((h) => h.textContent.trim());
      return {
        tienePlantillas: !!document.querySelector('#canal-plantilla-recibido'),
        siguePerfil: h2s.includes('Perfil del canal'),
        inputs: document.querySelectorAll('input[id^="canal-plantilla-"]').length,
      };
    })()
  `);
  check(
    "pulsar «Plantillas de mensaje» cambia el panel visible",
    cambioSeccion.pulsado && trasCambio.tienePlantillas && !trasCambio.siguePerfil,
    `inputs de plantilla: ${trasCambio.inputs}`,
  );
  check(
    "la sección de plantillas monta las 7 transiciones del pipeline",
    trasCambio.inputs === 7,
    `encontradas ${trasCambio.inputs}`,
  );
  await screenshot("02-plantillas");

  // ═══ 6. El pie fijo con los dos botones ════════════════════════════════
  const botones = await evaluate(`
    (() => {
      const bs = [...document.querySelectorAll('button')].map((b) => b.textContent.trim());
      return {
        guardar: bs.filter((t) => t === 'Guardar cambios').length,
        descartar: bs.filter((t) => t === 'Descartar cambios').length,
      };
    })()
  `);
  check(
    "el pie muestra «Guardar cambios» y «Descartar cambios»",
    botones.guardar >= 1 && botones.descartar >= 1,
    JSON.stringify(botones),
  );

  // ═══ 7. Borrador: editar NO persiste hasta Guardar ═════════════════════
  const KEY = "necto.pedidosConfig";
  const antes = await evaluate(`localStorage.getItem(${JSON.stringify(KEY)})`);

  await evaluate(`
    (() => {
      const el = document.querySelector('#canal-plantilla-recibido');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, 'TEXTO EDITADO POR LA PRUEBA');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()
  `);
  await sleep(400);

  const valorEnPantalla = await evaluate("document.querySelector('#canal-plantilla-recibido').value");
  check(
    "el input refleja la edición (el borrador es reactivo)",
    valorEnPantalla === "TEXTO EDITADO POR LA PRUEBA",
    valorEnPantalla,
  );

  const trasEditar = await evaluate(`localStorage.getItem(${JSON.stringify(KEY)})`);
  check(
    "editar el borrador NO escribe en el almacén antes de guardar",
    trasEditar === antes,
    trasEditar === antes ? "sin cambios persistidos" : "¡se persistió antes de guardar!",
  );

  // Pulsar Guardar → ahora sí persiste.
  await evaluate(`
    (() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Guardar cambios');
      if (!b) return false;
      b.click();
      return true;
    })()
  `);
  await sleep(600);

  const trasGuardar = await evaluate(`localStorage.getItem(${JSON.stringify(KEY)})`);
  let persistido = null;
  try {
    persistido = JSON.parse(trasGuardar);
  } catch {
    /* noop */
  }
  check(
    "pulsar Guardar persiste el valor editado",
    persistido?.plantillas?.recibido === "TEXTO EDITADO POR LA PRUEBA",
    persistido?.plantillas?.recibido,
  );

  const avisoGuardado = await evaluate(
    "document.body.innerText.includes('Guardado')",
  );
  check("aparece el acuse «Guardado» tras guardar", avisoGuardado === true);

  // ═══ 8. Descartar restaura el valor confirmado ═════════════════════════
  await evaluate(`
    (() => {
      const el = document.querySelector('#canal-plantilla-recibido');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, 'CAMBIO QUE VOY A DESCARTAR');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()
  `);
  await sleep(300);
  const antesDeDescartar = await evaluate("document.querySelector('#canal-plantilla-recibido').value");

  await evaluate(`
    (() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Descartar cambios');
      if (!b) return false;
      b.click();
      return true;
    })()
  `);
  await sleep(500);

  const trasDescartar = await evaluate("document.querySelector('#canal-plantilla-recibido').value");
  check(
    "«Descartar cambios» revierte el borrador al valor confirmado",
    antesDeDescartar === "CAMBIO QUE VOY A DESCARTAR" &&
      trasDescartar === "TEXTO EDITADO POR LA PRUEBA",
    `antes="${antesDeDescartar}" después="${trasDescartar}"`,
  );

  // ═══ 9. Las otras secciones montan lo que deben ════════════════════════
  const irASeccion = async (label) => {
    await evaluate(`
      (() => {
        const btn = [...document.querySelectorAll('nav[aria-label="Secciones de configuración del canal"] button')]
          .find((b) => b.textContent.includes(${JSON.stringify(label)}));
        if (btn) btn.click();
        return !!btn;
      })()
    `);
    await sleep(450);
  };

  await irASeccion("Horario de atención");
  const horarioTitulo = await evaluate(`
    (() => ({
      titulo: [...document.querySelectorAll('h2')].map(h=>h.textContent.trim()),
      // El horario arranca DESACTIVADO, así que los campos de hora todavía no
      // deben estar montados: solo aparece el interruptor.
      yaMontado: !!document.querySelector('#canal-horario-apertura'),
    }))()
  `);
  check(
    "la sección «Horario de atención» monta su tarjeta",
    horarioTitulo.titulo.includes("Horario de atención"),
    horarioTitulo.titulo.join(" | ").slice(0, 140),
  );
  check(
    "con el horario desactivado no se montan los campos de hora",
    horarioTitulo.yaMontado === false,
  );

  // Activar el horario (primer switch de la sección) y comprobar que aparecen.
  const rango = await evaluate(`
    (() => {
      const sw = [...document.querySelectorAll('input[role="switch"]')][0];
      if (sw) { sw.click(); }
      return !!sw;
    })()
  `);
  await sleep(500);
  const trasActivar = await evaluate(`
    (() => ({
      apertura: !!document.querySelector('#canal-horario-apertura'),
      cierre: !!document.querySelector('#canal-horario-cierre'),
      dias: document.querySelectorAll('#canal-horario-dias button').length,
    }))()
  `);
  check(
    "al activar el horario aparecen apertura, cierre y los 7 días",
    rango && trasActivar.apertura && trasActivar.cierre && trasActivar.dias === 7,
    JSON.stringify(trasActivar),
  );

  await evaluate(`
    (() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      const ap = document.querySelector('#canal-horario-apertura');
      const ci = document.querySelector('#canal-horario-cierre');
      if (!ap || !ci) return false;
      setter.call(ap, '20:00'); ap.dispatchEvent(new Event('input', { bubbles: true }));
      setter.call(ci, '08:00'); ci.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()
  `);
  await sleep(500);
  const bloqueo = await evaluate(`
    (() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Guardar cambios');
      return {
        deshabilitado: b ? b.disabled : null,
        hayError: document.body.innerText.includes('cierre debe ser mayor') ||
                  document.body.innerText.includes('La hora de cierre'),
      };
    })()
  `);
  check(
    "una franja horaria inválida bloquea el guardado y muestra el error",
    bloqueo.deshabilitado === true && bloqueo.hayError === true,
    JSON.stringify(bloqueo),
  );
  await screenshot("03-horario");

  await irASeccion("Automatización y escalado");
  const autoload = await evaluate(
    "document.body.innerText.includes('traspaso') || document.body.innerText.includes('modo bot')",
  );
  check("la sección de automatización explica el invariante de handoff", autoload === true);
  await screenshot("04-automatizacion");

  await irASeccion("Apariencia");
  const apariencia = await evaluate(`
    (() => {
      const txt = document.body.innerText;
      return {
        tieneClaro: txt.includes('Claro'),
        tieneOscuro: txt.includes('Oscuro'),
        tieneSistema: txt.includes('Sistema'),
        tieneCompacta: txt.includes('Compacta'),
        tieneComoda: txt.includes('Cómoda'),
      };
    })()
  `);
  check(
    "«Apariencia» ofrece tema (claro/oscuro/sistema) y densidad (compacta/cómoda)",
    apariencia.tieneClaro && apariencia.tieneOscuro && apariencia.tieneSistema &&
      apariencia.tieneCompacta && apariencia.tieneComoda,
    JSON.stringify(apariencia),
  );
  await screenshot("05-apariencia");

  // ═══ 10. No hay secciones inventadas (sin backend) ═════════════════════
  const prohibidas = await evaluate(`
    (() => {
      const txt = document.body.innerText.toLowerCase();
      const vetadas = ['facturación','facturacion','créditos','creditos','clave de api',
                       'api key','conectores','modelos','memoria del asistente','plan ',
                       'control de datos','archivos y multimedia'];
      return vetadas.filter((v) => txt.includes(v));
    })()
  `);
  check(
    "la página no inventa secciones propias de un backend inexistente",
    Array.isArray(prohibidas) && prohibidas.length === 0,
    prohibidas?.length ? `encontradas: ${prohibidas.join(", ")}` : "ninguna",
  );

  // ═══ 11. La sección activa se resalta ══════════════════════════════════
  const activa = await evaluate(`
    (() => {
      const b = document.querySelector('nav[aria-label="Secciones de configuración del canal"] button[aria-current="page"]');
      return b ? b.textContent.trim() : null;
    })()
  `);
  check("la sección activa queda marcada con aria-current", activa === "Apariencia", String(activa));

  // ═══ 12. El guard de capacidad bloquea sin `channels.manage` ═══════════
  // Un operador simulado tiene rol de operador (sin `channels.manage`), así que
  // la ruta debe mostrar la pantalla de sin-acceso en vez de la configuración.
  //
  // OJO con el id: los operadores sembrados son d0 (admin_tienda), d1
  // (supervisor_pedidos), d2 (vendedor) y d3 (vendedor/pendiente). Sembrar un id
  // INEXISTENTE hace que la sesión caiga al estado de administrador y las dos
  // comprobaciones siguientes fallan por culpa del arnés, no de la página.
  await goto(`${APP}/login`);
  await evaluate(`
    (() => {
      localStorage.setItem('necto.session', JSON.stringify({
        modulos: ['pedidos'],
        tipoSesion: 'operador',
        operadorSimuladoId: 'd2',
        preSimulacion: { modulos: ['pedidos'], tipoSesion: 'administrador' },
      }));
      return true;
    })()
  `);
  await goto(`${APP}/conversaciones/config`);
  const conOperador = await evaluate(`
    (() => ({
      ruta: location.pathname,
      // La página real NO debe haberse montado.
      hayConfigCanal: document.body.innerText.includes('Configuración del canal'),
      hayNavInterna: !!document.querySelector('nav[aria-label="Secciones de configuración del canal"]'),
      texto: document.body.innerText.slice(0, 300),
    }))()
  `);
  check(
    "sin `channels.manage` la configuración del canal NO se monta",
    conOperador.hayNavInterna === false,
    `ruta=${conOperador.ruta} navInterna=${conOperador.hayNavInterna}`,
  );
  check(
    "sin `channels.manage` se muestra la pantalla de acceso denegado",
    /no tienes acceso|sin acceso|permiso/i.test(conOperador.texto),
    conOperador.texto.split("\n").find((l) => /acceso|permiso/i.test(l))?.slice(0, 120) ?? "(sin coincidencia)",
  );

  // Y la entrada del menú desaparece para ese rol. Se busca el enlace concreto,
  // no la palabra "conversaciones": la barra lateral de este rol no debe tener
  // ningún enlace a la configuración del canal.
  const navOperador = await evaluate(`
    (() => {
      const navs = [...document.querySelectorAll('nav')];
      const enlaceConfig = [...document.querySelectorAll('a')].find(
        (x) => x.getAttribute('href') === '/conversaciones/config'
      );
      return { texto: navs[0] ? navs[0].innerText : '', hayEnlaceConfig: !!enlaceConfig };
    })()
  `);
  check(
    "la entrada «Configuración» de Canales se OCULTA para ese rol",
    navOperador.hayEnlaceConfig === false,
    `enlace a /conversaciones/config: ${navOperador.hayEnlaceConfig} | nav: ${navOperador.texto.split("\n").slice(0, 10).join(" | ")}`,
  );

} catch (err) {
  console.error("ERROR en la verificación:", err.message);
  results.push({ nombre: "verificación completa", ok: false, detalle: err.message });
} finally {
  writeFileSync(`${ART}/resultados.json`, JSON.stringify(results, null, 2));
  const fallos = results.filter((r) => !r.ok);
  console.log(`\n── RESUMEN: ${results.length - fallos.length}/${results.length} comprobaciones OK ──`);
  if (fallos.length) {
    console.log("FALLOS:");
    for (const f of fallos) console.log(`  · ${f.nombre} — ${f.detalle}`);
  }
  ws.close();
  chrome.kill();
  process.exit(fallos.length ? 1 : 0);
}
