import type { ListBlock } from "@/assistant";

// ═══════════════════════════════════════════════════════════════════════════
// LIST CANVAS VIEW
// ═══════════════════════════════════════════════════════════════════════════

interface ListCanvasViewProps {
  list: ListBlock;
}

export const ListCanvasView = ({ list }: ListCanvasViewProps) => {
  const items = list.items || [];

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3.5 rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition-all hover:bg-white hover:shadow-sm dark:border-gray-800 dark:bg-gray-800/30 dark:hover:bg-gray-800/70"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 font-mono text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {item.primary}
                </h4>
                {item.trailing && (
                  <span className="shrink-0 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
                    {item.trailing}
                  </span>
                )}
              </div>
              {item.secondary && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {item.secondary}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListCanvasView;
