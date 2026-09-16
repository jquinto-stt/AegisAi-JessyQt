import type { ListBlock } from "@/assistant";

// ═══════════════════════════════════════════════════════════════════════════
// LIST BLOCK VIEW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ListBlockView — lista compacta embebida en la respuesta del asistente. Cada
 * fila muestra `primary` (negrita) + `secondary` (gris pequeño debajo) a la
 * izquierda y `trailing` alineado a la derecha, con divisores finos entre filas.
 */
export const ListBlockView = ({ block }: { block: ListBlock }) => {
  const sinItems = block.items.length === 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      {block.title && (
        <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
          {block.title}
        </h4>
      )}

      {sinItems ? (
        <p className="py-2 text-center text-sm text-gray-400 dark:text-gray-500">Sin elementos</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {block.items.map((item, i) => (
            <li
              key={`${item.primary}-${i}`}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                  {item.primary}
                </p>
                {item.secondary && (
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {item.secondary}
                  </p>
                )}
              </div>
              {item.trailing && (
                <span className="shrink-0 text-right text-sm text-gray-700 dark:text-gray-300">
                  {item.trailing}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ListBlockView;
