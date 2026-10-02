// Prueba aislada: ¿el arranque lee las preferencias UNA vez o hay algo que las
// sobreescribe? Se instrumenta localStorage ANTES de que cargue el módulo.
const CDP_BASE = "http://127.0.0.1:9333";
const APP = "http://localhost:6020";
const t = (await (await fetch(CDP_BASE + "/json/list")).json())
  .find((x) => x.type === "page" && x.webSocketDebuggerUrl && !x.url.startsWith("devtools"));
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0; const p = new Map(); const log = [];
await new Promise((r) => ws.addEventListener("open", r));
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.method === "Runtime.consoleAPICalled") {
    log.push(m.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
  }
  if (m.id && p.has(m.id)) { const { res, rej } = p.get(m.id); p.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
});
const send = (mm, pa = {}) => new Promise((res, rej) => { const i = ++id; p.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: mm, params: pa })); });
const ev = async (x) => { const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
const sleep = (m) => new Promise((r) => setTimeout(r, m));

await send("Runtime.enable"); await send("Page.enable");
await send("Page.navigate", { url: APP + "/login" });
await sleep(2500);
await ev("localStorage.setItem('webforge-ui-preferences', JSON.stringify({theme:'dark',sidebarExpanded:true})); 1");

console.log("── 5 arranques seguidos de la MISMA pestaña ──");
for (let i = 1; i <= 5; i++) {
  await send("Page.navigate", { url: APP + "/inventarios" });
  const muestras = [];
  for (const ms of [100, 250, 500, 1000, 2000, 3500, 6000]) {
    await sleep(ms - (muestras.length ? [100,250,500,1000,2000,3500,6000][muestras.length-1] : 0));
    muestras.push(await ev("document.documentElement.classList.contains('dark') ? 'D' : 'c'"));
  }
  console.log("  arranque " + i + " · muestra a 0.1/0.25/0.5/1/2/3.5/6s → " + muestras.join(" "));
}
ws.close();
