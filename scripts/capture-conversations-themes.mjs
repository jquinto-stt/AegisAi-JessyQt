/**
 * Captura la pantalla del **canal conversacional** en claro y oscuro.
 *
 * Uso: con el dev server y Chrome headless --remote-debugging-port=9222 vivos,
 *   NECTO_APP_URL=http://localhost:5174 node scripts/capture-conversations-themes.mjs
 *
 * Deja las imágenes en `artifacts/`.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUT = path.join(ROOT, "artifacts");

const CDP = "http://127.0.0.1:9222";
const APP = process.env.NECTO_APP_URL || "http://localhost:5174";

mkdirSync(OUT, { recursive: true });

const page = await (async () => {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${CDP}/json/list`);
      const all = await r.json();
      const t = all.find(x => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
      if (t) return t;
    } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error("no page target");
})();

const ws = new WebSocket(page.webSocketDebuggerUrl);
let msgId = 0;
const pending = new Map();
await new Promise((res, rej) => {
  ws.addEventListener("open", res);
  ws.addEventListener("error", rej);
  ws.addEventListener("message", ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res: r, rej: j } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result);
    }
  });
});

const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = ++msgId;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
  });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const evaluate = async expr => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval failed");
  return r.result.value;
};

await send("Runtime.enable");
await send("Page.enable");

async function shoot(name, { theme, width, height, mobile = false, before } = {}) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  });
  await send("Page.navigate", { url: `${APP}/app?module=whatsapp` });
  await sleep(2600);

  // ⚠️ El tema lo posee `uiStore` bajo su propia clave. Escribir la clase `dark` a
  // mano no sirve: el store la reescribe en el siguiente render y la captura
  // oscura salía idéntica a la clara. Se le pasa por donde el store lo lee.
  const THEME_KEY = "webforge-ui-preferences";

  await evaluate(`(() => {
    const now = Date.now();
    const id = 'capture_store';
    localStorage.setItem('necto_businesses', JSON.stringify([{
      id, name: 'Naturaleza Viva', code: 'NV-01', address: 'Cra 7 #12-30', city: 'Bogotá',
      country: 'Colombia', businessType: 'retail', offerModel: 'products', iconKey: 'store',
      currency: 'COP', activeModules: [], channelConnections: [], openingHours: {}, openingDays: [],
      createdAt: new Date(now).toISOString(),
    }]));
    localStorage.setItem('necto_active_business_id', id);
    localStorage.setItem(${JSON.stringify(THEME_KEY)}, JSON.stringify({ theme: ${JSON.stringify(theme)} }));
    localStorage.removeItem('necto_conversations_v1');
    localStorage.removeItem('necto_messages_v1');
    return true;
  })()`);

  await send("Page.navigate", { url: `${APP}/app?module=whatsapp` });
  await sleep(2800);

  // Se abre el primer hilo: la captura tiene que enseñar la conversación, no el vacío.
  await evaluate(`document.querySelector('[data-conversation-row]')?.click()`);
  await sleep(900);

  if (before) await evaluate(before);

  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(shot.data, "base64"));
  console.log(`guardado artifacts/${name}.png`);
}

await shoot("conversaciones-claro", { theme: "light", width: 1440, height: 900 });
await shoot("conversaciones-oscuro", { theme: "dark", width: 1440, height: 900 });
await shoot("conversaciones-movil", { theme: "light", width: 414, height: 860, mobile: true });

ws.close();
console.log("listo");
