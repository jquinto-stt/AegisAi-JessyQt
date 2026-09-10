import React, { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { StockMovement, MovementType, InventoryProduct } from "../types/inventory.types";

interface KardexViewProps {
  movements: StockMovement[];
  products: InventoryProduct[];
  selectedProductFilter?: string | null;
  onClearProductFilter?: () => void;
  onOpenNewMovement: () => void;
  onOpenNewAdjustment?: () => void;
}

export const KardexView: React.FC<KardexViewProps> = ({
  movements,
  products,
  selectedProductFilter,
  onClearProductFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MovementType | "all">("all");
  const [productFilter, setProductFilter] = useState<string>(selectedProductFilter || "all");

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchProduct = m.productName.toLowerCase().includes(q);
        const matchSku = m.productSku.toLowerCase().includes(q);
        const matchConcept = m.concept.toLowerCase().includes(q);
        const matchDoc = m.referenceDoc?.toLowerCase().includes(q);
        const matchAuthor = m.author.toLowerCase().includes(q);

        if (!matchProduct && !matchSku && !matchConcept && !matchDoc && !matchAuthor) {
          return false;
        }
      }

      if (typeFilter !== "all" && m.type !== typeFilter) {
        return false;
      }

      if (productFilter !== "all" && m.productId !== productFilter) {
        return false;
      }

      return true;
    });
  }, [movements, searchQuery, typeFilter, productFilter]);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("es-CO", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const getTypeName = (type: string, action?: string) => {
    if (action === "STOCK_COUNT") return "Conteo";
    if (action === "STOCK_TRANSFER") return "Traslado";
    if (type === "ENTRADA") return "Entrada";
    if (type === "SALIDA") return "Salida";
    if (type === "AJUSTE") return "Ajuste";
    return type;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 text-zinc-900 dark:text-zinc-100">
      {/* ── Minimalist Filter Toolbar ── */}
      <div className="px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center gap-2 flex-1 flex-wrap sm:flex-nowrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] sm:max-w-sm">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por concepto, SKU o documento..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-100/80 dark:bg-zinc-800/60 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none transition-colors"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            aria-label="Filtrar por Tipo"
            className="px-2.5 py-1.5 bg-zinc-100/80 dark:bg-zinc-800/60 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="all">Todos los tipos</option>
            <option value="ENTRADA">Entradas (+)</option>
            <option value="SALIDA">Salidas (-)</option>
            <option value="AJUSTE">Ajustes</option>
            <option value="TRASLADO">Traslados</option>
            <option value="CONTEO">Conteos</option>
          </select>

          {/* Product Filter */}
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            aria-label="Filtrar por Producto"
            className="px-2.5 py-1.5 bg-zinc-100/80 dark:bg-zinc-800/60 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer max-w-[220px] truncate"
          >
            <option value="all">Todos los productos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {selectedProductFilter && onClearProductFilter && (
            <button
              type="button"
              onClick={onClearProductFilter}
              className="px-2 py-1 rounded-lg text-xs font-medium text-[#FF3F1A] hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors cursor-pointer flex items-center gap-1 flex-none"
            >
              <X className="w-3.5 h-3.5" />
              <span>Quitar filtro</span>
            </button>
          )}
        </div>

        {/* Counter */}
        <div className="text-xs text-zinc-400 font-mono self-end md:self-auto flex-none">
          {filteredMovements.length} {filteredMovements.length === 1 ? "movimiento" : "movimientos"}
        </div>
      </div>

      {/* ── Ledger Table ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-zinc-50 dark:bg-[#151518] z-10 border-b border-zinc-200 dark:border-zinc-800">
            <tr className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 select-none">
              <th className="py-2.5 px-4 sm:px-6 font-semibold">Fecha</th>
              <th className="py-2.5 px-4 font-semibold">Producto</th>
              <th className="py-2.5 px-4 font-semibold">Tipo</th>
              <th className="py-2.5 px-4 font-semibold">Concepto</th>
              <th className="py-2.5 px-4 font-semibold text-right">Cantidad</th>
              <th className="py-2.5 px-4 font-semibold text-right">Saldo</th>
              <th className="py-2.5 px-4 sm:px-6 font-semibold text-right">Responsable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-sans">
            {filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-zinc-400">
                  <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs">
                    No hay movimientos para los filtros seleccionados
                  </p>
                </td>
              </tr>
            ) : (
              filteredMovements.map((m) => {
                const isPositive = m.type === "ENTRADA" || (m.type === "AJUSTE" && m.toLocation);
                return (
                  <tr
                    key={m.id}
                    className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    {/* Fecha */}
                    <td className="py-3 px-4 sm:px-6 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                      {formatDate(m.timestamp)}
                    </td>

                    {/* Producto */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-xs">
                        {m.productName}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        {m.productSku}
                      </div>
                    </td>

                    {/* Tipo */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`font-medium ${
                          isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : m.type === "SALIDA"
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {getTypeName(m.type, m.action)}
                      </span>
                    </td>

                    {/* Concepto / Ref */}
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300">
                      <div>{m.concept}</div>
                      {m.referenceDoc && (
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                          Ref: {m.referenceDoc}
                        </div>
                      )}
                    </td>

                    {/* Variación */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono">
                      <span
                        className={`font-semibold ${
                          isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isPositive ? `+${m.quantity}` : `-${m.quantity}`}
                      </span>
                    </td>

                    {/* Saldo Resultante */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-medium text-zinc-800 dark:text-zinc-200">
                      {m.newStock ?? (m as any).finalBalance}
                    </td>

                    {/* Responsable */}
                    <td className="py-3 px-4 sm:px-6 text-right whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                      {m.author}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
