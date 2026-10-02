// ═══════════════════════════════════════════════════════════════════════════
// CSV — utilidades compartidas
// ═══════════════════════════════════════════════════════════════════════════
//
// Vive en `lib/` y no dentro de un módulo porque ya lo necesitan dos
// (Pedidos —que las tenía propias— e Inventarios). Copiarlas por segunda vez
// habría creado dos definiciones de «campo escapado» que pueden divergir: basta
// que una trate el `\r` y la otra no para que el mismo nombre se exporte bien
// en un módulo y roto en el otro.
//
// **Nada de negocio aquí.** Estas funciones no saben qué es una línea ni un
// pedido; reciben filas ya construidas. El encabezado y el nombre de archivo
// los decide cada módulo.

/**
 * Escapa un campo para CSV.
 *
 * Regla: si el valor contiene separador, comilla doble o salto de línea, se
 * envuelve en comillas dobles y las comillas internas se duplican. Así un
 * nombre como `Pérez, "el jefe"` no rompe la estructura de columnas.
 *
 * Se usa separador `,` y fin de línea CRLF, que es lo que Excel espera.
 */
export function escaparCampoCsv(valor: string | number | null | undefined): string {
  const s = String(valor ?? "");
  const necesitaComillas = /[",\r\n]/.test(s);
  if (!necesitaComillas) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Une filas ya construidas en un CSV completo (encabezado incluido). */
export function construirCsv(
  encabezados: readonly string[],
  filas: readonly (readonly (string | number | null | undefined)[])[],
): string {
  const lineas = [encabezados, ...filas].map((fila) => fila.map(escaparCampoCsv).join(","));
  return lineas.join("\r\n");
}

/**
 * Marca de orden de bytes UTF-8.
 *
 * Va al principio del archivo porque Excel en Windows abre un CSV UTF-8 sin BOM
 * como ANSI, y cualquier tilde o `ñ` sale como `Ã©`. Es el motivo de que este
 * módulo tenga «Elementos», «Ubicación» y «dañado» en sus encabezados y celdas.
 */
export const BOM_UTF8 = "\uFEFF";

/**
 * Lanza la descarga de un CSV en el navegador.
 *
 * Aísla el efecto de DOM para que el resto del módulo siga siendo puro. No hace
 * nada si no hay `document` (entorno de pruebas en node), en vez de reventar:
 * una función de exportación no debería ser la que rompe una suite.
 */
export function descargarCsv(contenido: string, nombreArchivo: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([BOM_UTF8 + contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Fechas para CSV ───────────────────────────────────────────────────────

/** "YYYY-MM-DD" en hora **local**. Nunca `toISOString().slice(0,10)`. */
export function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Fecha ISO → `"YYYY-MM-DD HH:mm"` local, para el CSV.
 *
 * Local y no UTC por la misma razón que en todo el repo: en GMT-5 un conteo de
 * las 20:00 pertenece al día que el operador cree, no al siguiente. Con UTC, la
 * mitad del trabajo de la tarde aparecería fechada al día siguiente.
 *
 * Sin fecha válida devuelve `""` y no `"Invalid Date"`: una celda vacía dice
 * «no hay dato», y `"Invalid Date"` es un texto que viaja hasta el reporte del
 * cliente.
 */
export function fechaLegibleCsv(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Convierte un texto libre en un fragmento apto para nombre de archivo.
 *
 * Quita tildes (un nombre de archivo con `ñ` se corrompe en algunas
 * descargas), sustituye espacios por guiones y elimina lo que el sistema
 * operativo prohíbe. Devuelve `"export"` si no queda nada, para no generar
 * `.csv` a secas.
 */
export function slugArchivo(texto: string, reemplazo = "-"): string {
  const limpio = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, reemplazo)
    .replace(new RegExp(`^${reemplazo}+|${reemplazo}+$`, "g"), "");
  return limpio || "export";
}

/** Nombre de archivo con la fecha de hoy delante: `2026-09-30_inventarios.csv`. */
export function nombreArchivoCsv(prefijo: string, ref: Date = new Date()): string {
  return `${ymdLocal(ref)}_${slugArchivo(prefijo)}.csv`;
}
