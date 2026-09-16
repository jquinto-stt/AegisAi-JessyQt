import type { ResponseBlock } from "@/assistant";
import { MetricsBlockView } from "./MetricsBlockView";
import { TableBlockView } from "./TableBlockView";
import { ComparisonBlockView } from "./ComparisonBlockView";
import { ListBlockView } from "./ListBlockView";

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE BLOCK VIEW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ResponseBlockView — despachador por `kind` de la unión discriminada
 * `ResponseBlock`. Delega en la vista concreta correspondiente. Devuelve `null`
 * para `kind` futuros aún no soportados (la unión está ABIERTA a extensión).
 */
export const ResponseBlockView = ({ block }: { block: ResponseBlock }) => {
  switch (block.kind) {
    case "metrics":
      return <MetricsBlockView block={block} />;
    case "table":
      return <TableBlockView block={block} />;
    case "comparison":
      return <ComparisonBlockView block={block} />;
    case "list":
      return <ListBlockView block={block} />;
    default:
      return null;
  }
};

/**
 * ResponseBlocks — mapea una lista de bloques a `ResponseBlockView` apilados con
 * separación vertical. Si la lista está vacía o es `undefined`, no renderiza
 * nada (`null`).
 */
export const ResponseBlocks = ({ blocks }: { blocks?: ResponseBlock[] }) => {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, i) => (
        <ResponseBlockView key={i} block={block} />
      ))}
    </div>
  );
};

export default ResponseBlockView;
