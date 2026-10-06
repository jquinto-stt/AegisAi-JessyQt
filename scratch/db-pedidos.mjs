/**
 * Lee la tabla `necto.pedido` para ver que dejo el avance accidental.
 *
 * Contexto: `pedidosStore.moverEstado` no es solo memoria — llama a
 * `sincronizarPedidoBase`, que hace un `update` contra Supabase. Al capturar el
 * estado «listo» para auditarlo avance pedidos desde la pantalla, y eso escribio
 * en la base de DESARROLLO. Este script sirve para ver el dano y repararlo.
 */
import fs from "fs";
import { createClient } from "../packages/services/api/node_modules/@supabase/supabase-js/dist/index.mjs";

const env = {};
for (const linea of fs.readFileSync(".env", "utf8").split("\n")) {
  const i = linea.indexOf("=");
  if (i === -1) continue;
  let v = linea.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[linea.slice(0, i).trim()] = v;
}

const sb = createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: "necto" },
});

const { data, error } = await sb
  .from("pedido")
  .select("*")
  .order("numero", { ascending: true });

if (error) {
  console.log("ERROR:", JSON.stringify(error));
  process.exit(1);
}

console.log("filas:", data.length);
console.log("columnas:", Object.keys(data[0] || {}).join(", "));

// Solo las columnas que pueden delatar una escritura.
const interesantes = Object.keys(data[0] || {}).filter((k) =>
  /estado|fecha|creado|actualiz|modific|en$|_en$|_at$/.test(k)
);
console.log("\ncolumnas de tiempo/estado:", interesantes.join(", "));

console.log("\n── por numero ──");
for (const p of data) {
  const t = interesantes
    .filter((k) => k !== "estado")
    .map((k) => `${k}=${p[k]}`)
    .join("  ");
  console.log(`  ${String(p.numero).padEnd(10)} ${String(p.estado).padEnd(16)} ${String(p.cliente || "").slice(0, 18).padEnd(19)} ${t}`);
}

// La fila mas recientemente tocada: es la que escribio mi clic.
const conMarca = data
  .map((p) => ({ p, marca: p.actualizado_en || p.modificado_en || p.updated_at || null }))
  .filter((x) => x.marca)
  .sort((a, b) => String(b.marca).localeCompare(String(a.marca)));

if (conMarca.length) {
  console.log("\n── mas recientes primero ──");
  for (const { p, marca } of conMarca.slice(0, 6)) {
    console.log(`  ${String(p.numero).padEnd(10)} ${String(p.estado).padEnd(16)} ${marca}`);
  }
}
