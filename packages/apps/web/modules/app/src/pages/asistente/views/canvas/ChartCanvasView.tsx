import type { MetricsBlock } from "@/assistant";

// ═══════════════════════════════════════════════════════════════════════════
// CHART CANVAS VIEW
// ═══════════════════════════════════════════════════════════════════════════

interface ChartCanvasViewProps {
  metrics?: MetricsBlock;
  title?: string;
}

export const ChartCanvasView = ({ metrics, title }: ChartCanvasViewProps) => {
  const items = metrics?.items || [];

  // Encuentra valor máximo para calcular barras proporcionales si son números
  const numericValues = items
    .map((item) => (typeof item.value === "number" ? item.value : parseFloat(String(item.value).replace(/[^0-9.-]+/g, ""))))
    .filter((v) => !isNaN(v) && v > 0);

  const maxValue = numericValues.length > 0 ? Math.max(...numericValues) : 100;

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      {/* Tarjetas resumen en grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {items.map((it, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40"
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              {it.label}
            </p>
            <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
              {typeof it.value === "number" ? it.value.toLocaleString("es-CO") : it.value}
              {it.unit ? ` ${it.unit}` : ""}
            </p>
            {it.hint && (
              <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 truncate">
                {it.hint}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Visualización de barras comparativas / gráfica limpia */}
      <div className="flex-1 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/50">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
          Distribución y Proporciones
        </h4>

        <div className="space-y-4">
          {items.map((it, idx) => {
            const rawNum =
              typeof it.value === "number"
                ? it.value
                : parseFloat(String(it.value).replace(/[^0-9.-]+/g, ""));
            const validNum = !isNaN(rawNum) ? rawNum : 0;
            const percentage = maxValue > 0 ? Math.min(100, Math.max(8, Math.round((validNum / maxValue) * 100))) : 20;

            const barColors = [
              "bg-brand-500",
              "bg-accent-500",
              "bg-secondary-500",
              "bg-warning-500",
              "bg-success-500",
              "bg-secondary-300",
            ];
            const colorClass = barColors[idx % barColors.length];

            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                    {it.label}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {typeof it.value === "number" ? it.value.toLocaleString("es-CO") : it.value}
                    {it.unit ? ` ${it.unit}` : ""}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChartCanvasView;
