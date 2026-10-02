// ───────────────────────────────────────────────────────────────────────────
// ¿Hay parpadeo de tema (FOUC) al cargar en oscuro? — versión que sí mide
// ───────────────────────────────────────────────────────────────────────────
//
// La primera versión instrumentaba `window.__arranque` y luego recargaba: el
// reload borra el instrumento, así que no medía nada. Aquí el muestreo se
// instala DENTRO de la página con `Page.addScriptToEvaluateOnNewDocument`, que
// es lo único que corre antes del primer frame de cada carga nueva.
//
// Y la clase se pregunta por frame, no por `sleep`: un `sleep` mide cuándo me
// apetece mirar a mí, no cuándo pintó el navegador.

const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://localhost:6020";

const t = (await (await fetch(CDP_BASE + "/json/list")).json())
  .find((x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0; const p = new Map();
await new Promise((r) => ws.addEventListener("open", r));
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && p.has(m.id)) { const { res, rej } = p.get(m.id); p.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
});
const send = (mm, pa = {}) => new Promise((res, rej) => { const i = ++id; p.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: mm, params: pa })); });
const ev = async (x) => { const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
const sleep = (m) => new Promise((r) => setTimeout(r, m));

await send("Runtime.enable"); await send("Page.enable");
await send("Page.navigate", { url: APP + "/login" });
await sleep(2500);
await ev("localStorage.setItem('webforge-ui-preferences', JSON.stringify({theme:'dark',sidebarExpanded:true})); 1");

// Se registra UNA vez, fuera del bucle, y se retira al final.
//
// ── Dos defectos del instrumento, y el segundo importa ─────────────────────
//
// 1. Registrar esto DENTRO del bucle acumula una copia por iteración.
//
// 2. `document.documentElement` es **null** en el primer `setTimeout(…, 0)`:
//    ese tick corre antes de que el parser cree el `<html>`. Leer
//    `.classList` ahí lanza `Cannot read properties of null` y **aborta el
//    bucle en su primer frame**, así que `__frames` queda vacío y el arnés
//    informaba «sin parpadeo» habiendo medido CERO frames. Es la misma trampa
//    que este archivo pretende documentar, cometida dentro del archivo.
//
// Por eso el muestreo **no asume que `<html>` exista**: si aún no está, se
// anota `sinHtml` y se sigue. Un frame sin `<html>` es, para el tema, un frame
// en claro: no hay clase `dark` posible todavía.
const { identifier } = await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `
    window.__frames = [];
    var t0 = performance.now();
    function muestrear() {
      var html = document.documentElement;
      window.__frames.push({
        t: Math.round(performance.now() - t0),
        oscuro: html ? html.classList.contains('dark') : false,
        sinHtml: !html,
      });
      if (performance.now() - t0 < 3000) requestAnimationFrame(muestrear);
    }
    setTimeout(muestrear, 0);
  `,
});

console.log("── PARPADEO DE TEMA (preferencia = oscuro) ──\n");
let peor = 0;
let arranquesMedidos = 0;
for (let i = 1; i <= 5; i++) {
  await send("Page.navigate", { url: APP + "/inventarios" });
  await sleep(3600);
  const marcas = await ev("window.__frames || null");
  if (!marcas || marcas.length === 0) {
    console.log("  arranque " + i + ": EL INSTRUMENTO NO MIDIÓ NADA (no cuenta como verde)");
    continue;
  }
  arranquesMedidos++;
  // Un frame «en claro» MIENTRAS `<html>` aún no existe no es parpadeo: no hay
  // documento que pintar ni clase que poner, así que ninguna solución —ni un
  // script en línea en el `<head>`— puede evitarlo. Contarlo como defecto haría
  // el arnés imposible de satisfacer, y un arnés que nunca puede pasar verde se
  // acaba ignorando. Se separa: `sinHtml` se informa, no se penaliza.
  const clarosConHtml = marcas.filter((m) => !m.oscuro && !m.sinHtml);
  const ultimoClaro = clarosConHtml.length ? clarosConHtml[clarosConHtml.length - 1].t : null;
  if (ultimoClaro !== null) peor = Math.max(peor, ultimoClaro);
  console.log("  arranque " + i + " · frames=" + marcas.length +
    " · frames previos a <html>=" + marcas.filter((m) => m.sinHtml).length +
    " · frames en claro CON documento=" + clarosConHtml.length +
    " · último a " + (ultimoClaro === null ? "—" : ultimoClaro + " ms") +
    " · acaba oscuro=" + marcas[marcas.length - 1].oscuro);
}
await send("Page.removeScriptToEvaluateOnNewDocument", { identifier });

// Un arranque sin medir NO es un arranque sin parpadeo. Si no se midió nada,
// el veredicto es «no concluyente», no «verde».
if (arranquesMedidos === 0) {
  console.log("\nNO CONCLUYENTE: 0 de 5 arranques medidos. El instrumento no midió.");
  ws.close();
  process.exit(5);
}
console.log("\narranques medidos: " + arranquesMedidos + "/5");
console.log("peor caso: " + (peor === 0 ? "ningún frame en claro: sin parpadeo" : peor + " ms pintando en claro"));
ws.close();
process.exit(peor === 0 ? 0 : 1);
