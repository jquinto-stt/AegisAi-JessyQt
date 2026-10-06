/**
 * Repara la escritura accidental sobre `necto.pedido`.
 *
 * ── Qué pasó ────────────────────────────────────────────────────────────────
 *
 * Para auditar la mitad «listo» del Modo Enfoque —la banda naranja, que el seed
 * no trae— avancé un pedido desde la propia pantalla. Lo que no tuve en cuenta
 * es que `pedidosStore.moverEstado` NO es solo memoria: llama a
 * `sincronizarPedidoBase`, que hace un `update` contra Supabase. Así que el clic
 * escribió en la base de DESARROLLO.
 *
 * ── Cómo sé cuál era el valor anterior ─────────────────────────────────────
 *
 * La captura previa al clic (`01-display-1920.png`) trae la prueba: en la cola,
 * la fila de WEB-0012 mostraba la etiqueta real de estado, «CONFIRMADO», que
 * sale de `estadoLabel(p.estado)`. El rótulo del protagonista decía «En
 * preparación», pero ese texto es fijo para cualquier estado que no sea `listo`,
 * así que no informa. La etiqueta de la cola sí.
 *
 * Para `estado_desde` no hay historial (`necto.auditoria` está vacía y no existe
 * tabla de eventos de pedido), así que se usa el `creado_en` de la propia fila:
 * seis de las once filas de la tabla tienen `estado_desde == creado_en`, y la
 * captura marcaba «50 min» de permanencia cuando el pedido llevaba ~50 min desde
 * su `creado_en`. Es un valor real de la fila, no uno inventado.
 */
import fs from "fs";
import { createClient } from "../packages/services/api/node_modules/@supabase/supabase-js/dist/index.mjs";

const env = {};
for (const l of fs.readFileSync(".env", "utf8").split("\n")) {
  const i = l.indexOf("=");
  if (i < 0) continue;
  let v = l.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[l.slice(0, i).trim()] = v;
}

const sb = createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: "necto" },
});

const NUMERO = "WEB-0012";

const { data: antes, error: e1 } = await sb
  .from("pedido")
  .select("numero, cliente, estado, estado_desde, creado_en, finished_at")
  .eq("numero", NUMERO)
  .single();
if (e1) {
  console.log("ERROR leyendo:", e1.code, e1.message);
  process.exit(1);
}
console.log("ANTES:", JSON.stringify(antes));

if (antes.estado !== "listo") {
  console.log(`El pedido ya no está en 'listo' (está en '${antes.estado}'). No toco nada.`);
  process.exit(0);
}

const { data: despues, error: e2 } = await sb
  .from("pedido")
  .update({ estado: "confirmado", estado_desde: antes.creado_en, finished_at: null })
  .eq("numero", NUMERO)
  .select("numero, estado, estado_desde, creado_en, finished_at")
  .single();
if (e2) {
  console.log("ERROR escribiendo:", e2.code, e2.message);
  process.exit(1);
}
console.log("DESPUÉS:", JSON.stringify(despues));

// Comprobación: ninguna otra fila debe haber cambiado.
const { data: todas } = await sb.from("pedido").select("numero, estado").order("numero");
console.log("\n── estados tras la reparación ──");
for (const p of todas) console.log(`  ${String(p.numero).padEnd(10)} ${p.estado}`);
console.log("\nlistos en la tabla:", todas.filter((p) => p.estado === "listo").length);
