// ═══════════════════════════════════════════════════════════════════════════
// Verificación UI — Configuración de NECTO AI (/asistente/config)
// ═══════════════════════════════════════════════════════════════════════════
//
// Comprueba en un Chrome real, vía CDP:
//   1. La entrada "Configuración" aparece BAJO la sección Inteligencia.
//   2. La ruta /asistente/config renderiza la página.
//   3. La navegación vertical tiene 6 secciones en 3 grupos y solo una montada.
//   4. La página se declara explícitamente DISTINTA del bot de WhatsApp.
//   5. El recuento de herramientas es "N de M" y sale del registry real.
//   6. El motor mostrado es el que declara el store (local-rule).
//   7. No hay ninguna sección inventada de backend (API key, modelo, tokens…).
//   8. Con un rol sin `assistant.use`, la ruta NO se monta y el menú se oculta.
//
// Trap ya documentado: `send()` resuelve con el MENSAJE CDP completo
// `{id, result}`, así que el payload real está en `.result.result.value`.

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const APP = "http://localhost:6021";
const CDP_PORT = 9334;
const ART = new URL("./artifacts/", import.meta.url).pathname.replace(/^\//, "");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

mkdirSync(ART, { recursive: true });
const results = [];
const check = (nombre, ok, detalle = "") => {
  results.push({ nombre, ok, detalle });
  console.log(`${ok ? "PASS" : "FAIL"}  ${nombre}${detalle ? ` — ${detalle}` : ""}`);
};

const userDir = `${process.env.TEMP || "/tmp"}\\cdp-asistente-${Date.now()}`;
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
  const r = m.result;
  if (!r) throw new Error("sin resultado: " + JSON.stringify(m).slice(0, 300));
  if (r.exceptionDetails)
    throw new Error("excepción: " + JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
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

const NAV = 'nav[aria-label="Secciones de configuración de NECTO AI"]';

try {
  // ═══ 0. Sembrar sesión de administrador (mock, localStorage) ════════════
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
  check("se sembró la sesión de administrador", !!sembrada, String(sembrada).slice(0, 80));

  await goto(`${APP}/pedidos/inicio`);
  const rutaInicial = await evaluate("location.pathname");
  if (rutaInicial.startsWith("/login")) {
    check("hay sesión activa", false, `redirige a ${rutaInicial}`);
    throw new Error("sin sesión");
  }
  check("hay sesión activa", true, rutaInicial);

  // ═══ 1. La entrada de NECTO AI y su Configuración en la barra lateral ═══
  const hrefConfig = await evaluate(`
    (() => {
      const a = [...document.querySelectorAll('a')].find(
        (x) => x.getAttribute('href') === '/asistente/config'
      );
      return a ? a.textContent.trim() : null;
    })()
  `);
  check("existe un enlace a /asistente/config", hrefConfig !== null, `texto="${hrefConfig}"`);
  check("el enlace se llama «Configuración»", hrefConfig === "Configuración", String(hrefConfig));

  const nav = await evaluate(`
    (() => {
      const navs = [...document.querySelectorAll('nav')];
      return navs[0] ? navs[0].innerText : '';
    })()
  `);
  check("la barra lateral muestra la sección «Inteligencia»", /Inteligencia/i.test(nav));
  check("la barra lateral muestra «NECTO AI»", /NECTO AI/i.test(nav));

  // ═══ 2. La ruta carga ══════════════════════════════════════════════════
  await goto(`${APP}/asistente/config`);
  const rutaConfig = await evaluate("location.pathname");
  check("la ruta /asistente/config carga", rutaConfig === "/asistente/config", rutaConfig);

  const titulo = await evaluate(
    "document.querySelector('h1')?.textContent?.trim() ?? null",
  );
  check(
    "el título de la página es «Configuración de NECTO AI»",
    titulo === "Configuración de NECTO AI",
    String(titulo),
  );

  // ═══ 3. Advertencia: NO es el bot de WhatsApp ══════════════════════════
  const distincion = await evaluate(`
    (() => {
      const txt = document.body.innerText;
      return {
        aviso: txt.includes('Este no es el bot de WhatsApp'),
        apuntaACanales: txt.includes('/conversaciones/config') || txt.includes('Canales'),
        propietarioCliente: /clientes?\\b/i.test(txt),
        equipo: /equipo/i.test(txt),
      };
    })()
  `);
  check(
    "la página declara explícitamente que NO es el bot de WhatsApp",
    distincion.aviso === true,
    JSON.stringify(distincion),
  );
  check(
    "el aviso remite a la configuración del canal en Canales",
    distincion.apuntaACanales === true,
  );

  // ═══ 4. Navegación vertical: 6 secciones, 3 grupos ═════════════════════
  const navInterna = await evaluate(`
    (() => {
      const nav = document.querySelector(${JSON.stringify(NAV)});
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
    const total = navInterna.grupos.reduce((n, g) => n + g.items.length, 0);
    check("la navegación tiene 6 secciones", total === 6, `encontradas ${total}`);

    const etiquetas = navInterna.grupos.map((g) => g.label);
    check(
      "los grupos son ASISTENTE / CAPACIDADES / PREFERENCIAS, en orden",
      JSON.stringify(etiquetas) === JSON.stringify(["ASISTENTE", "CAPACIDADES", "PREFERENCIAS"]),
      etiquetas.join(" · "),
    );

    const todas = navInterna.grupos.flatMap((g) => g.items);
    const esperadas = [
      "Perfil del asistente",
      "Motor de razonamiento",
      "Herramientas",
      "Conversaciones",
      "Alcance y límites",
      "Apariencia",
    ];
    check(
      "las 6 secciones son las del catálogo, en orden",
      JSON.stringify(todas) === JSON.stringify(esperadas),
      todas.join(" | "),
    );
  }

  // ═══ 5. Solo una sección montada ═══════════════════════════════════════
  // OJO: los encabezados de grupo de la barra lateral (Canales, Inteligencia…)
  // TAMBIÉN son h2, y las cabeceras de tarjeta son h3. Por eso se busca el
  // título de sección entre los h2 y la tarjeta «Identidad…» entre los h3.
  const inicial = await evaluate(`
    (() => ({
      h2s: [...document.querySelectorAll('h2')].map((h) => h.textContent.trim()),
      h3s: [...document.querySelectorAll('h3')].map((h) => h.textContent.trim()),
      tieneHerramientas: document.body.innerText.includes('Tu alcance sobre las herramientas'),
    }))()
  `);
  check(
    "arranca en «Perfil del asistente» sin montar Herramientas",
    inicial.h2s.includes("Perfil del asistente") &&
      inicial.h3s.includes("Identidad del asistente") &&
      !inicial.tieneHerramientas,
    `h2: ${inicial.h2s.join(" | ").slice(0, 140)}`,
  );
  await screenshot("01-perfil");

  const irASeccion = async (label) => {
    await evaluate(`
      (() => {
        const btn = [...document.querySelectorAll(${JSON.stringify(NAV)} + ' button')]
          .find((b) => b.textContent.includes(${JSON.stringify(label)}));
        if (btn) btn.click();
        return !!btn;
      })()
    `);
    await sleep(450);
  };

  await irASeccion("Motor de razonamiento");
  const motorTxt = await evaluate("document.body.innerText");
  check(
    "«Motor de razonamiento» monta su tarjeta",
    /Motor activo/i.test(motorTxt),
  );

  // ═══ 6. El motor mostrado es el del store (local-rule), no un literal ══
  const motorDeclarado = await evaluate(`
    (() => {
      const t = document.body.innerText;
      return {
        local: /Motor de reglas local|Reglas locales|local-rule/i.test(t),
        // El catálogo dice literalmente «No está implementado en esta versión»,
        // así que hay que admitir el verbo «está» entre medio.
        remotoStub: /no est[aá] implementado|sin implementar|no implementado/i.test(t),
      };
    })()
  `);
  check(
    "la página muestra el motor local activo",
    motorDeclarado.local === true,
    JSON.stringify(motorDeclarado),
  );
  check(
    "la página declara que el motor remoto no está implementado",
    motorDeclarado.remotoStub === true,
  );

  // ═══ 7. Herramientas: recuento "N de M" real ═══════════════════════════
  await irASeccion("Herramientas");
  const herramientas = await evaluate(`
    (() => {
      const t = document.body.innerText;
      const m = t.match(/(\\d+)\\s+de\\s+(\\d+)\\s+herramientas/i) ||
                t.match(/(\\d+)\\s+de\\s+(\\d+)/);
      return {
        hayAlcance: t.includes('Tu alcance sobre las herramientas'),
        recuento: m ? { disponibles: Number(m[1]), totales: Number(m[2]) } : null,
        niveles: t.includes('Niveles de herramienta'),
      };
    })()
  `);
  check(
    "«Herramientas» monta la tarjeta de alcance",
    herramientas.hayAlcance === true,
  );
  check(
    "la página muestra un recuento «N de M herramientas»",
    herramientas.recuento !== null,
    JSON.stringify(herramientas.recuento),
  );
  check(
    "con admin, disponibles === totales (el admin tiene todas las capacidades)",
    herramientas.recuento !== null &&
      herramientas.recuento.disponibles === herramientas.recuento.totales &&
      herramientas.recuento.totales > 0,
    JSON.stringify(herramientas.recuento),
  );
  check(
    "«Herramientas» explica los niveles de herramienta",
    herramientas.niveles === true,
  );
  await screenshot("02-herramientas");

  // ═══ 8. Sin secciones inventadas de backend ════════════════════════════
  // Recorremos TODAS las secciones acumulando el texto visible, porque una
  // sección suelta podría no contener la palabra prohibida.
  const secciones = [
    "Perfil del asistente",
    "Motor de razonamiento",
    "Herramientas",
    "Conversaciones",
    "Alcance y límites",
    "Apariencia",
  ];
  // Matiz importante: la página menciona «clave de API» y «temperatura», pero
  // lo hace para NEGARLAS ("No hay servidor, ni clave de API…"). Un escaneo por
  // subcadena las marcaría como controles inventados, así que se exige contexto
  // negado. Y se recorre el DOM, no el texto plano: una fila como
  //   «Clave de API / Credencial para… / No existe»
  // queda separada por líneas en `innerText`, y partir por saltos de línea
  // aislaría el título de su propia negación.
  const vetadas = [
    "clave de api", "api key", "modelo gpt", "temperatura", "tokens",
    "conectores", "facturación", "plan pro", "control de datos",
  ];
  const NEGACION = /(no hay|no existe|no existen|no ver[aá]s|no est[aá]|ning[uú]n|ninguna|sin |no tiene)/i;

  const escanearVetadas = () =>
    evaluate(`
    (() => {
      const vetadas = ${JSON.stringify(vetadas)};
      const NEG = ${`/${NEGACION.source}/i`};
      const fuera = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = (n.textContent || '').toLowerCase();
        for (const v of vetadas) {
          if (!t.includes(v)) continue;
          let el = n.parentElement, negado = false;
          for (let i = 0; i < 3 && el; i++) {
            if (NEG.test((el.innerText || '').toLowerCase())) { negado = true; break; }
            el = el.parentElement;
          }
          if (!negado) {
            fuera.push({
              termino: v,
              texto: (n.textContent || '').trim().slice(0, 60),
              contexto: (n.parentElement?.innerText || '').slice(0, 80),
            });
          }
        }
      }
      return fuera;
    })()
  `);

  // Solo una sección está montada a la vez: hay que escanear en cada una,
  // porque revisar el DOM al final solo cubriría la última visitada.
  let hallazgos = [];
  for (const s of secciones) {
    await irASeccion(s);
    const deEsta = await escanearVetadas();
    hallazgos = hallazgos.concat((deEsta ?? []).map((h) => ({ ...h, seccion: s })));
  }

  check(
    "ninguna sección ofrece un control de backend inventado (los términos solo aparecen negados)",
    Array.isArray(hallazgos) && hallazgos.length === 0,
    hallazgos?.length
      ? `sin negar: ${hallazgos.map((h) => `${h.termino} → "${h.texto}"`).join(" · ")}`
      : "solo apariciones negadas",
  );

  // Comprobación complementaria: esos términos NO son campos editables.
  const campos = await evaluate(`
    (() => {
      const ids = [...document.querySelectorAll('input,select,textarea')].map((e) => (e.id || '').toLowerCase());
      const prohibidos = ['api','key','modelo','temperatura','token','conector'];
      return ids.filter((i) => prohibidos.some((p) => i.includes(p)));
    })()
  `);
  check(
    "no existe ningún campo editable de API/modelo/temperatura/tokens",
    campos.length === 0,
    campos.length ? `campos: ${campos.join(", ")}` : "ninguno",
  );

  // Y al revés: la sección «Alcance y límites» SÍ debe declarar límites reales.
  // Se navega a ella: el b anterior dejó la página en «Apariencia».
  await irASeccion("Alcance y límites");
  const limites = await evaluate(`
    (() => {
      const t = document.body.innerText.toLowerCase();
      return {
        seccionPresente: document.body.innerText.includes('Lo que NECTO AI no hace'),
        servidor: t.includes('servidor') || t.includes('navegador'),
        causas: t.includes('causa'),
        soloLectura: t.includes('solo lectura') || t.includes('solo lee'),
      };
    })()
  `);
  check(
    "«Alcance y límites» monta su tarjeta y declara límites reales (servidor y causas)",
    limites.seccionPresente && limites.servidor && limites.causas,
    JSON.stringify(limites),
  );
  await screenshot("05-alcance");

  await irASeccion("Conversaciones");
  await screenshot("03-conversaciones");

  await irASeccion("Apariencia");
  const apariencia = await evaluate(`
    (() => {
      const t = document.body.innerText;
      return {
        comoda: t.includes('Cómoda'),
        compacta: t.includes('Compacta'),
        completa: t.includes('Completa'),
        resumida: t.includes('Resumida'),
      };
    })()
  `);
  check(
    "«Apariencia» ofrece densidad (cómoda/compacta) y longitud (completa/resumida)",
    apariencia.comoda && apariencia.compacta && apariencia.completa && apariencia.resumida,
    JSON.stringify(apariencia),
  );
  await screenshot("04-apariencia");

  // ═══ 9. No hay botón «Guardar» decorativo ══════════════════════════════
  const guardar = await evaluate(`
    (() => {
      const bs = [...document.querySelectorAll('button')].map((b) => b.textContent.trim());
      return {
        guardar: bs.filter((t) => /^guardar/i.test(t)).length,
        descartar: bs.filter((t) => /^descartar/i.test(t)).length,
      };
    })()
  `);
  check(
    "la página NO tiene un pie «Guardar/Descartar» decorativo",
    guardar.guardar === 0 && guardar.descartar === 0,
    JSON.stringify(guardar),
  );

  // La sección activa se marca.
  const activa = await evaluate(`
    (() => {
      const b = document.querySelector(${JSON.stringify(NAV)} + ' button[aria-current="page"]');
      return b ? b.textContent.trim() : null;
    })()
  `);
  check("la sección activa queda marcada con aria-current", activa === "Apariencia", String(activa));

  // ═══ 10. El guard bloquea sin `assistant.use` ══════════════════════════
  // d1 = supervisor_pedidos: tiene orders.read pero NO assistant.use. Es el
  // caso exacto de fuga de alcance que la guarda debe impedir.
  await goto(`${APP}/login`);
  await evaluate(`
    (() => {
      localStorage.setItem('necto.session', JSON.stringify({
        modulos: ['pedidos'],
        tipoSesion: 'operador',
        operadorSimuladoId: 'd1',
        preSimulacion: { modulos: ['pedidos'], tipoSesion: 'administrador' },
      }));
      return true;
    })()
  `);
  await goto(`${APP}/asistente/config`);
  const conSupervisor = await evaluate(`
    (() => ({
      ruta: location.pathname,
      hayNav: !!document.querySelector(${JSON.stringify(NAV)}),
      texto: document.body.innerText.slice(0, 300),
    }))()
  `);
  check(
    "sin `assistant.use` la configuración NO se monta",
    conSupervisor.hayNav === false,
    `ruta=${conSupervisor.ruta} hayNav=${conSupervisor.hayNav}`,
  );
  check(
    "sin `assistant.use` se muestra la pantalla de acceso denegado",
    /no tienes acceso|sin acceso|permiso/i.test(conSupervisor.texto),
    conSupervisor.texto.split("\n").find((l) => /acceso|permiso/i.test(l))?.slice(0, 110) ?? "(sin coincidencia)",
  );

  const navSupervisor = await evaluate(`
    (() => {
      const a = [...document.querySelectorAll('a')].find(
        (x) => x.getAttribute('href') === '/asistente/config'
      );
      const navs = [...document.querySelectorAll('nav')];
      return {
        hayEnlaceConfig: !!a,
        hayEnlaceAsistente: !![...document.querySelectorAll('a')].find(
          (x) => x.getAttribute('href') === '/asistente'
        ),
        nav: navs[0] ? navs[0].innerText.split("\\n").slice(0, 12).join(" | ") : "",
      };
    })()
  `);
  check(
    "la entrada «Configuración» de NECTO AI se OCULTA para ese rol",
    navSupervisor.hayEnlaceConfig === false,
    navSupervisor.nav.slice(0, 180),
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
