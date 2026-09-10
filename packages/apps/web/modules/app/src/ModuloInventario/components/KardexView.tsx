import React, { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableCell, Badge, Button } from "@/elements";
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
    <div className="flex flex-col flex-1 min-h-0 text-gray-800 dark:text-white">
      {/* ── Minimalist Filter Toolbar ── */}
      <div className="px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 flex-1 flex-wrap sm:flex-nowrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] sm:max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por concepto, SKU o documento..."
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 focus:border-brand-500 dark:focus:border-brand-500 rounded-lg text-xs text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none transition-colors"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            aria-label="Filtrar por Tipo"
            className="px-2.5 py-1.5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand-500 cursor-pointer"
          >
            <option value="all">Todos los tipos</option>
            <option value="ENTRADA">Entradas (+)</option>
            <option value="SALIDA">Salidas (-)</option>
            <option value="AJUSTE">Ajustes / Conteos</option>
          </select>

          {/* Product Filter */}
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            aria-label="Filtrar por Producto"
            className="px-2.5 py-1.5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand-500 cursor-pointer max-w-xs truncate"
          >
            <option value="all">Todos los productos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>

          {selectedProductFilter && onClearProductFilter && (
            <Button
              size="sm"
              variant="outline"
              onClick={onClearProductFilter}
              startIcon={<X className="w-3.5 h-3.5" />}
            >
              Quitar filtro
            </Button>
          )}
        </div>

        {/* Counter */}
        <div className="text-xs text-gray-400 font-mono self-end md:self-auto flex-none">
          {filteredMovements.length} {filteredMovements.length === 1 ? "movimiento" : "movimientos"}
        </div>
      </div>

      {/* ── Ledger Table using Pure Elements ── */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell header>Fecha</TableCell>
              <TableCell header>Producto</TableCell>
              <TableCell header>Tipo</TableCell>
              <TableCell header>Concepto</TableCell>
              <TableCell header className="text-right">Cantidad</TableCell>
              <TableCell header className="text-right">Saldo</TableCell>
              <TableCell header className="text-right">Responsable</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMovements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center text-gray-400">
                  <p className="font-semibold text-gray-700 dark:text-gray-300 text-xs">
                    No hay movimientos para los filtros seleccionados
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredMovements.map((m) => {
                const isPositive = m.type === "ENTRADA" || (m.type === "AJUSTE" && m.toLocation);
                return (
                  <TableRow
                    key={m.id}
                    className="hover:bg-gray-50/70 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    {/* Fecha */}
                    <TableCell className="font-mono text-[11px] text-gray-400 whitespace-nowrap">
                      {formatDate(m.timestamp)}
                    </TableCell>

                    {/* Producto */}
                    <TableCell>
                      <div className="font-medium text-gray-900 dark:text-white truncate max-w-xs">
                        {m.productName}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                        {m.productSku}
                      </div>
                    </TableCell>

                    {/* Tipo */}
                    <TableCell className="whitespace-nowrap">
                      <Badge
                        variant="light"
                        color={isPositive ? "success" : m.type === "SALIDA" ? "error" : "light"}
                        size="sm"
                      >
                        {getTypeName(m.type, m.action)}
                      </Badge>
                    </TableCell>

                    {/* Concepto / Ref */}
                    <TableCell className="text-gray-600 dark:text-gray-300">
                      <div>{m.concept}</div>
                      {m.referenceDoc && (
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          Ref: {m.referenceDoc}
                        </div>
                      )}
                    </TableCell>

                    {/* Variación */}
                    <TableCell className="text-right whitespace-nowrap font-mono">
                      <span
                        className={`font-semibold ${
                          isPositive
                            ? "text-success-600 dark:text-success-400"
                            : "text-error-600 dark:text-error-400"
                        }`}
                      >
                        {isPositive ? `+${m.quantity}` : `-${m.quantity}`}
                      </span>
                    </TableCell>

                    {/* Saldo Resultante */}
                    <TableCell className="text-right whitespace-nowrap font-mono font-medium text-gray-800 dark:text-gray-200">
                      {m.newStock ?? (m as any).finalBalance}
                    </TableCell>

                    {/* Responsable */}
                    <TableCell className="text-right whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {m.author}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
