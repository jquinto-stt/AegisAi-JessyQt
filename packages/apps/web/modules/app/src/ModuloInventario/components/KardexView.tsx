import React, { useState, useMemo } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Activity,
  Plus,
} from "lucide-react";
import { StockMovement, MovementType, InventoryProduct } from "../types/inventory.types";
import { NectoBanner } from "@/compositions/pedidos/shared/NectoBanner";
import { Button, SearchInput } from "@/elements";

interface KardexViewProps {
  movements: StockMovement[];
  products: InventoryProduct[];
  selectedProductFilter?: string | null;
  onClearProductFilter?: () => void;
  onOpenNewMovement: () => void;
}

export const KardexView: React.FC<KardexViewProps> = ({
  movements,
  products,
  selectedProductFilter,
  onClearProductFilter,
  onOpenNewMovement,
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
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const renderActionBadge = (action: string) => {
    switch (action) {
      case "STOCK_ADD":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Entrada de Stock
          </span>
        );
      case "STOCK_REMOVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-[#FF3F1A]/10 text-[#FF3F1A] border border-[#FF3F1A]/20">
            <ArrowUpRight className="w-3.5 h-3.5" />
            Salida de Stock
          </span>
        );
      case "STOCK_COUNT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20">
            <History className="w-3.5 h-3.5" />
            Conteo Físico
          </span>
        );
      case "STOCK_TRANSFER":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Activity className="w-3.5 h-3.5" />
            Transferencia
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Official Clean Necto Banner */}
      <NectoBanner
        icon={<Activity className="w-6 h-6 text-[#FF3F1A]" />}
        title="Historial de Movimientos"
        description="Registro inmutable de entradas, salidas, mermas y traslados con auditoría de operadores."
      />

      {/* Main Ledger Card Container */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 shadow-2xs space-y-5">
        {/* Controls Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex-1 max-w-md">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              placeholder="Buscar por concepto, SKU, producto o documento..."
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-[#190088]"
            >
              <option value="all">Todos los Tipos</option>
              <option value="ENTRADA">Solo Entradas (+)</option>
              <option value="SALIDA">Solo Salidas (-)</option>
            </select>

            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-[#190088] max-w-[220px]"
            >
              <option value="all">Todas las Partes</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>

            {selectedProductFilter && (
              <button
                type="button"
                onClick={onClearProductFilter}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#FF3F1A]/10 text-[#FF3F1A] border border-[#FF3F1A]/20 hover:bg-[#FF3F1A]/20 transition-colors cursor-pointer"
              >
                Limpiar filtro de producto
              </button>
            )}

            <Button
              variant="primary"
              onClick={onOpenNewMovement}
              className="flex items-center gap-2 text-xs font-bold whitespace-nowrap shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Movimiento</span>
            </Button>
          </div>
        </div>

        {/* Spacious Ledger Table */}
        <div className="overflow-x-auto scrollbar-thin border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-extrabold uppercase font-mono tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/90">
                <th className="py-3 px-4">Fecha & Hora</th>
                <th className="py-3 px-4">Parte / Producto</th>
                <th className="py-3 px-4">Operación</th>
                <th className="py-3 px-4 text-center">Variación</th>
                <th className="py-3 px-4 text-center">Saldo</th>
                <th className="py-3 px-4">Concepto / Motivo</th>
                <th className="py-3 px-4">Operador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs sm:text-sm">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-zinc-400 space-y-2">
                    <History className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600" />
                    <p className="font-bold text-sm text-zinc-600 dark:text-zinc-300">
                      No hay movimientos registrados
                    </p>
                    <p className="text-xs text-zinc-400">
                      Prueba seleccionando otro filtro o registrando una nueva entrada/salida.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 font-mono text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {formatDate(m.timestamp)}
                    </td>

                    {/* Product Name */}
                    <td className="py-3.5 px-4">
                      <div>
                        <strong className="text-zinc-900 dark:text-zinc-100 block font-bold">
                          {m.productName}
                        </strong>
                        <span className="font-mono text-[11px] text-zinc-400">SKU: {m.productSku}</span>
                      </div>
                    </td>

                    {/* Action Badge */}
                    <td className="py-3.5 px-4">
                      {renderActionBadge(m.action)}
                    </td>

                    {/* Delta Variation */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-lg font-mono font-black text-xs border ${
                          m.type === "ENTRADA"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-[#FF3F1A]/10 text-[#FF3F1A] border-[#FF3F1A]/20"
                        }`}
                      >
                        {m.type === "ENTRADA" ? `+${m.quantity}` : `-${m.quantity}`} {m.unit}
                      </span>
                    </td>

                    {/* Final Balance */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-800 dark:text-zinc-200">
                      <div className="flex items-center justify-center gap-1.5 text-xs">
                        <span className="text-zinc-400">{m.previousBalance}</span>
                        <span className="text-zinc-300">→</span>
                        <strong className="text-zinc-900 dark:text-white text-sm font-black">{m.finalBalance}</strong>
                        <span className="text-[10px] text-zinc-400 font-mono">{m.unit}</span>
                      </div>
                    </td>

                    {/* Concept */}
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm">
                        {m.concept}
                      </p>
                      {m.referenceDoc && (
                        <span className="font-mono text-[11px] text-zinc-400 block mt-0.5">
                          Doc: {m.referenceDoc}
                        </span>
                      )}
                    </td>

                    {/* Author */}
                    <td className="py-3.5 px-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#190088]/10 dark:bg-[#190088]/20 border border-[#190088]/20 flex items-center justify-center text-[10px] font-mono font-black text-[#190088] dark:text-[#97D6DF]">
                          {m.author.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{m.author}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
