import { useState } from "react";
import type { TableBlock } from "@/assistant";

// ═══════════════════════════════════════════════════════════════════════════
// SPREADSHEET CANVAS VIEW (EXCEL / SHEETS PATTERN)
// ═══════════════════════════════════════════════════════════════════════════

interface SpreadsheetCanvasViewProps {
  table: TableBlock;
  isLoading?: boolean;
}

/** Genera letras de columna al estilo Excel: 0 -> A, 1 -> B, ..., 25 -> Z, 26 -> AA */
const getColumnLetter = (index: number): string => {
  let letter = "";
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

/** Formatea una celda para presentación */
const formatCell = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === "") return "";
  if (typeof val === "number") return val.toLocaleString("es-CO");
  return String(val);
};

/**
 * Anchos (en % de la celda) de las barras del esqueleto de carga, en ciclo por
 * columna.
 *
 * Que varíen es deliberado: una rejilla de barras todas del mismo largo se lee
 * como una tabla de guiones y compite con el contenido real. Un ancho distinto
 * por columna sugiere texto de longitud irregular, que es lo que el ojo espera
 * encontrar cuando los datos lleguen. Los valores son fijos —y no aleatorios—
 * para que el esqueleto sea determinista y no parpadee entre renders.
 */
const ANCHOS_ESQUELETO = [72, 88, 58, 80, 66];

export const SpreadsheetCanvasView = ({ table, isLoading }: SpreadsheetCanvasViewProps) => {
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);

  // Columnas base y relleno para que siempre haya al menos 5 columnas (A, B, C, D, E)
  const baseColumns = table.columns || [];
  const minColumnsCount = Math.max(5, baseColumns.length);
  const columnLetters = Array.from({ length: minColumnsCount }, (_, i) => getColumnLetter(i));

  // Filas de datos
  const dataRows = table.rows || [];

  // Garantizamos al menos 14 filas para dar la sensación exacta de hoja de cálculo limpia de las capturas
  const totalRowsCount = Math.max(14, dataRows.length + 1); // +1 por la fila 1 de encabezados de datos

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-100">
      {/* Barra de estado o info sutil */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <span className="font-mono">
          {selectedCell
            ? `${getColumnLetter(selectedCell.c)}${selectedCell.r}`
            : `${baseColumns.length} columnas × ${dataRows.length} registros`}
        </span>
        {isLoading && (
          <span className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400">
            <span className="inline-block h-2 w-2 animate-ping rounded-full bg-brand-500" />
            Cargando datos...
          </span>
        )}
      </div>

      {/* Grilla scrollable */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse border-spacing-0 font-sans text-xs sm:text-sm">
          {/* Cabecera de letras de columnas (A, B, C, D, E...) */}
          <thead className="sticky top-0 z-20 bg-gray-50 text-gray-500 shadow-theme-xs dark:bg-gray-800/80 dark:text-gray-400">
            <tr>
              {/* Celda de esquina (esquina superior izquierda de números de fila) */}
              <th className="sticky left-0 z-30 w-10 min-w-[2.5rem] border-b border-r border-gray-200 bg-gray-100 p-0 text-center font-normal dark:border-gray-750 dark:bg-gray-800" />

              {columnLetters.map((colLetter, cIndex) => (
                <th
                  key={colLetter}
                  className="min-w-[120px] border-b border-r border-gray-200 px-3 py-1.5 text-center font-medium uppercase tracking-wider dark:border-gray-750"
                >
                  {colLetter}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: totalRowsCount }, (_, rowIdx) => {
              const rowNumber = rowIdx + 1; // 1-indexed

              // Fila 1: Nombres de columnas de datos (como en la captura: Name, Category, Quantity...)
              const isHeaderRow = rowNumber === 1;
              const dataRowIndex = rowIdx - 1;
              const rowData = !isHeaderRow && dataRows[dataRowIndex] ? dataRows[dataRowIndex] : null;

              return (
                <tr key={rowNumber} className="h-8 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  {/* Número de fila en la izquierda (1, 2, 3...) */}
                  <td className="sticky left-0 z-10 w-10 min-w-[2.5rem] select-none border-b border-r border-gray-200 bg-gray-50 text-center font-mono text-xs text-gray-400 dark:border-gray-750 dark:bg-gray-800/90 dark:text-gray-500">
                    {rowNumber}
                  </td>

                  {/* Celdas de cada columna */}
                  {columnLetters.map((_, colIdx) => {
                    let cellValue = "";
                    let isBold = false;

                    if (isHeaderRow) {
                      // Fila 1: Encabezados del set de datos
                      cellValue = baseColumns[colIdx] || "";
                      isBold = true;
                    } else if (rowData && colIdx < rowData.length) {
                      cellValue = formatCell(rowData[colIdx]);
                    }

                    // Esqueleto de carga: mientras `isLoading` está activo las
                    // celdas de datos no muestran valor, muestran una barra
                    // pulsante. Antes se pintaba un placeholder casi invisible
                    // (`"Name"` en cursiva gris claro, solo en la primera
                    // columna), que no comunicaba nada: la hoja parecía vacía y
                    // rota en vez de en carga.
                    const esEsqueletoDato = isLoading && !isHeaderRow;
                    const esEsqueletoCabecera =
                      isLoading && isHeaderRow && !baseColumns[colIdx];

                    const isSelected =
                      selectedCell?.r === rowNumber && selectedCell?.c === colIdx;

                    return (
                      <td
                        key={colIdx}
                        onClick={() => setSelectedCell({ r: rowNumber, c: colIdx })}
                        className={`min-w-[120px] border-b border-r border-gray-200 px-3 py-1.5 transition-colors dark:border-gray-750 ${
                          isSelected
                            ? "bg-brand-50 ring-2 ring-inset ring-brand-500 dark:bg-brand-900/20"
                            : ""
                        } ${
                          isBold
                            ? "font-semibold text-gray-900 dark:text-white"
                            : "text-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {esEsqueletoDato || esEsqueletoCabecera ? (
                          <div
                            aria-hidden="true"
                            className="h-2.5 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"
                            style={{
                              width: `${ANCHOS_ESQUELETO[colIdx % ANCHOS_ESQUELETO.length]}%`,
                            }}
                          />
                        ) : (
                          <div className="truncate" title={cellValue}>
                            {cellValue}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SpreadsheetCanvasView;
