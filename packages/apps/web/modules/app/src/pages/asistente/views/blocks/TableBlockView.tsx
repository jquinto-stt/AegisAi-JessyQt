import type { TableBlock } from "@/assistant";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Formatea una celda: números con separador de miles es-CO; strings tal cual. */
const formatCell = (cell: string | number): string =>
  typeof cell === "number" ? cell.toLocaleString("es-CO") : cell;

/** Escapa una celda para CSV: envuelve en comillas dobles y duplica internas. */
const escapeCsvCell = (cell: string | number): string => {
  const s = String(cell).replace(/"/g, '""');
  return `"${s}"`;
};

/**
 * Genera y dispara la descarga de un CSV a partir del bloque de tabla. Es
 * defensivo (try/catch): en entornos sin `Blob`/`URL`/DOM no rompe, solo omite.
 */
const descargarCsv = (block: TableBlock): void => {
  try {
    const lineas: string[] = [];
    lineas.push(block.columns.map(escapeCsvCell).join(","));
    for (const row of block.rows) {
      lineas.push(row.map(escapeCsvCell).join(","));
    }
    const contenido = lineas.join("\r\n");

    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const nombre = `${block.title?.trim() || "tabla"}.csv`;

    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // Entorno sin las APIs necesarias (SSR/tests): no romper.
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// TABLE BLOCK VIEW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * TableBlockView — tabla tipo hoja de cálculo embebida en la respuesta del
 * asistente, con encabezado (título + botón "Descargar CSV" si `exportable`),
 * zebra striping, bordes finos y scroll horizontal si hace falta.
 */
export const TableBlockView = ({ block }: { block: TableBlock }) => {
  const sinDatos = block.rows.length === 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      {(block.title || block.exportable) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {block.title ? (
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {block.title}
            </h4>
          ) : (
            <span />
          )}
          {block.exportable && (
            <button
              type="button"
              onClick={() => descargarCsv(block)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Descargar CSV
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {block.columns.map((col, i) => (
                <th
                  key={`${col}-${i}`}
                  className="border border-gray-200 bg-gray-100 px-3 py-2 text-left font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sinDatos ? (
              <tr>
                <td
                  colSpan={block.columns.length || 1}
                  className="border border-gray-200 px-3 py-4 text-center text-gray-400 dark:border-gray-800 dark:text-gray-500"
                >
                  Sin datos
                </td>
              </tr>
            ) : (
              block.rows.map((row, r) => (
                <tr
                  key={r}
                  className={
                    r % 2 === 1
                      ? "bg-gray-50 dark:bg-gray-800/40"
                      : "bg-white dark:bg-gray-900"
                  }
                >
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className="border border-gray-200 px-3 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-300"
                    >
                      {formatCell(cell)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableBlockView;
