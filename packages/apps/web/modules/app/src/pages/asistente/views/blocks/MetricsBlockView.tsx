import type { MetricsBlock } from "@/assistant";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formatea un valor: si es número, con separador de miles es-CO; si es string,
 * lo devuelve tal cual.
 */
const formatValue = (value: number | string): string =>
  typeof value === "number" ? value.toLocaleString("es-CO") : value;

// ═══════════════════════════════════════════════════════════════════════════
// METRICS BLOCK VIEW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * MetricsBlockView — tarjeta de KPIs embebida en la respuesta del asistente.
 * Muestra un `title` opcional y una grilla responsive de mini-tarjetas, cada
 * una con el valor grande, la unidad pequeña al lado, el label en gris y un
 * hint opcional.
 */
export const MetricsBlockView = ({ block }: { block: MetricsBlock }) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      {block.title && (
        <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
          {block.title}
        </h4>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {block.items.map((item, i) => (
          <div
            key={`${item.label}-${i}`}
            className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
          >
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {formatValue(item.value)}
              </span>
              {item.unit && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{item.unit}</span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
            {item.hint && (
              <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">{item.hint}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MetricsBlockView;
