import type { ComparisonBlock } from "@/assistant";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formatea un valor según la unidad del bloque: si `unit === "COP"` como monto
 * en pesos con separador de miles ("$1.234"); si hay otra unidad, número + unit;
 * si no hay unidad, número puro (es-CO).
 */
const formatValue = (value: number, unit?: string): string => {
  const num = value.toLocaleString("es-CO");
  if (unit === "COP") return `$${num}`;
  if (unit) return `${num} ${unit}`;
  return num;
};

/** Variación relativa (valueB respecto a valueA) como fracción, o null si A=0. */
const variacion = (valueA: number, valueB: number): number | null => {
  if (valueA === 0) return null;
  return (valueB - valueA) / valueA;
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPARISON BLOCK VIEW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ComparisonBlockView — comparativa de pares de valores (A vs B) con variación
 * porcentual (verde sube / rojo baja / gris igual o base 0) y dos barras
 * horizontales proporcionales en CSS puro (sin librería de gráficos).
 */
export const ComparisonBlockView = ({ block }: { block: ComparisonBlock }) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      {block.title && (
        <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
          {block.title}
        </h4>
      )}

      <div className="flex flex-col gap-4">
        {block.items.map((item, i) => {
          const vari = variacion(item.valueA, item.valueB);

          const pctTexto =
            vari === null
              ? "—"
              : `${vari > 0 ? "+" : ""}${(vari * 100).toLocaleString("es-CO", {
                  maximumFractionDigits: 1,
                })}%`;

          const pctColor =
            vari === null || vari === 0
              ? "text-gray-400 dark:text-gray-500"
              : vari > 0
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400";

          const max = Math.max(Math.abs(item.valueA), Math.abs(item.valueB), 1);
          const anchoA = `${(Math.abs(item.valueA) / max) * 100}%`;
          const anchoB = `${(Math.abs(item.valueB) / max) * 100}%`;

          return (
            <div key={`${item.label}-${i}`}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {item.label}
                </span>
                <span className={`text-xs font-semibold ${pctColor}`}>{pctTexto}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-gray-400 dark:bg-gray-500"
                      style={{ width: anchoA }}
                    />
                  </div>
                  <span className="min-w-[90px] text-right text-xs text-gray-500 dark:text-gray-400">
                    {item.labelA ? `${item.labelA}: ` : ""}
                    {formatValue(item.valueA, block.unit)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: anchoB }}
                    />
                  </div>
                  <span className="min-w-[90px] text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                    {item.labelB ? `${item.labelB}: ` : ""}
                    {formatValue(item.valueB, block.unit)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ComparisonBlockView;
