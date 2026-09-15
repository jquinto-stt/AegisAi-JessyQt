#!/usr/bin/env node
/**
 * Ejecuta los arneses de verificación **en serie, cada uno en su propia
 * pestaña**, y resume el resultado.
 *
 * ⚠️ Por qué existe este runner
 *
 * Todos los arneses de `scripts/verify-*.mjs` obtienen su objetivo CDP con
 * `GET /json/list` y toman **el primer `page`**. Al correr varios seguidos sobre
 * el mismo Chrome comparten pestaña: el `localStorage`, la ruta y el historial
 * que deja el anterior contaminan al siguiente. En la práctica eso producía
 * FALLOS fantasma que desaparecían al ejecutar el arnés solo
 * (`verify-app-url` daba "1 FALLOS" en barrido y "OK" aislado).
 *
 * Un barrido que reporta fallos inexistentes es peor que no barrer: entrena a
 * ignorar el rojo. Aquí se le da a cada arnés una pestaña nueva y se cierra al
 * terminar, de modo que el resultado en serie coincide con el aislado.
 *
 * Uso:  node scripts/verify-all.mjs [--chrome http://127.0.0.1:9222]
 */

import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

const chromeArg = process.argv.indexOf("--chrome");
const CDP = chromeArg !== -1 ? process.argv[chromeArg + 1] : "http://127.0.0.1:9222";

// Orden deliberado: primero las guardas estructurales/lógicas, luego las de
// presentación. `verify-all` no fija el orden de la verdad, solo agrupa.
const ORDER = [
  "verify-app-url",
  "verify-store-dashboard",
  "verify-orders-module",
  "verify-store-scope",
  "verify-whatsapp-signature",
  "verify-hub-card",
  "verify-hub-visual",
  "verify-profile",
  "verify-help-page",
  "verify-support-page",
  "verify-notifications",
];

const discovered = readdirSync(HERE)
  .filter((f) => /^verify-.*\.mjs$/.test(f) && f !== "verify-all.mjs")
  .map((f) => f.replace(/\.mjs$/, ""));
const harnesses = [
  ...ORDER.filter((h) => discovered.includes(h)),
  ...discovered.filter((h) => !ORDER.includes(h)).sort(),
];

const createTab = async () => {
  const r = await fetch(`${CDP}/json/new?about:blank`, { method: "PUT" });
  if (!r.ok) throw new Error(`no se pudo crear pestaña: HTTP ${r.status}`);
  return r.json();
};
const closeTab = async (id) => {
  try { await fetch(`${CDP}/json/close/${id}`); } catch {}
};

/**
 * Limpia el `localStorage` del origen de la app usando la pestaña recién creada.
 * Cada arnés ya siembra lo suyo; esto sólo garantiza que parte de cero.
 */
const seedClean = async (tabId) => {
  if (!tabId) return;
  const list = await (await fetch(`${CDP}/json/list`)).json();
  const t = list.find((x) => x.id === tabId);
  if (!t?.webSocketDebuggerUrl) return;
  const appUrl = process.env.NECTO_APP_URL || "http://localhost:5173";
  await new Promise((resolve) => {
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    let n = 0;
    const waiters = new Map();
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && waiters.has(m.id)) { waiters.get(m.id)(m); waiters.delete(m.id); }
    });
    const send = (method, params = {}) =>
      new Promise((res) => { const i = ++n; waiters.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    ws.addEventListener("open", async () => {
      // Navegar primero: en `about:blank` el origen es opaco y localStorage lanza.
      await send("Page.navigate", { url: appUrl });
      await new Promise((r) => setTimeout(r, 1200));
      await send("Runtime.evaluate", { expression: "localStorage.clear()" });
      ws.close();
      resolve();
    });
    ws.addEventListener("error", () => resolve());
    setTimeout(resolve, 5000);
  });
};

const run = (name, timeoutMs = 240000) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(HERE, `${name}.mjs`)], {
      cwd: ROOT,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks = [];
    let done = false;
    let stdoutEnded = false;
    let stderrEnded = false;
    let exitCode = null;
    // ⚠️ Sin timeout, un arnés colgado bloquea el barrido entero: los que vienen
    // después heredan una pestaña a medio usar y reportan FALLOS que no existen
    // (o el pipeline mata el runner por SIGTERM). Se acota y se mata el hijo.
    const timer = setTimeout(() => {
      if (done) return;
      child.kill("SIGKILL");
      chunks.push(Buffer.from(`\n[runner] TIMEOUT tras ${timeoutMs}ms: ${name}\n`));
      done = true;
      resolve({ code: 124, out: Buffer.concat(chunks).toString("utf8") });
    }, timeoutMs);
    const maybeResolve = () => {
      if (done) return;
      if (exitCode !== null && stdoutEnded && stderrEnded) {
        done = true;
        clearTimeout(timer);
        resolve({ code: exitCode, out: Buffer.concat(chunks).toString("utf8") });
      }
    };
    child.stdout.on("data", (d) => chunks.push(d));
    child.stdout.on("end", () => { stdoutEnded = true; maybeResolve(); });
    child.stderr.on("data", (d) => chunks.push(d));
    child.stderr.on("end", () => { stderrEnded = true; maybeResolve(); });
    child.on("close", (code) => {
      exitCode = code;
      maybeResolve();
    });
  });

const RESULT_RE = /(RESULTADO[^\n]*|===== RESULTADO[^\n]*=====|RESULTADO:\s*[\d/]+\s*[^\n]*)/;

const NO_CDP = new Set(["verify-whatsapp-signature"]);

const results = [];
for (const h of harnesses) {
  process.stdout.write(`\n▶ ${h}\n`);
  let tab = null;
  try {
    // Los arneses puros (sin Chrome) no necesitan pestaña ni limpieza.
    if (!NO_CDP.has(h)) {
      tab = await createTab();
      process.env.NECTO_TAB_ID = tab.id;
      // ⚠️ Una pestaña nueva NO aísla el estado: `localStorage` es por ORIGEN, así
      // que todos los arneses lo comparten. Se limpia antes de cada uno para que
      // ninguno herede las sedes/perfiles que dejó el anterior.
      await seedClean(tab.id);
    } else {
      delete process.env.NECTO_TAB_ID;
    }
    const { code, out } = await run(h);
    const line = out
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => RESULT_RE.test(l))
      .pop();
    results.push({ h, code, summary: line || "(sin línea de resultado)" });
    process.stdout.write(`  ${line || "(sin línea de resultado)"}\n`);
  } catch (err) {
    results.push({ h, code: 1, summary: `ERROR: ${err.message}` });
    process.stdout.write(`  ERROR: ${err.message}\n`);
  } finally {
    if (tab) await closeTab(tab.id);
  }
}

console.log("\n================ RESUMEN DEL BARRIDO ================");
let bad = 0;
for (const r of results) {
  // ⚠️ El veredicto se decide por el **exit code**, no por adivinar con regex
  // sobre el texto: cada arnés ya sale con 0/1, y algunos imprimen su resumen en
  // formatos distintos ("===== RESULTADO X: OK =====", "RESULTADO: 111/111 ✅").
  // Un regex estrecho marcaba como rojo a `verify-whatsapp-signature` (0 fallos)
  // porque su línea de resumen no casaba con el patrón.
  const ok = r.code === 0;
  if (!ok) bad++;
  console.log(`${ok ? "OK  " : "ROJO"}  ${r.h.padEnd(26)} ${r.summary}`);
}
console.log(`\n${bad === 0 ? "TODOS LOS ARNESES EN VERDE" : `${bad} ARNÉS(ES) EN ROJO`}`);
process.exit(bad === 0 ? 0 : 1);
