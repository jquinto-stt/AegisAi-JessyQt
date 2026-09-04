import React, { useState, useMemo } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Activity,
  Plus,
  X,
  Filter,
} from "lucide-react";
import { StockMovement, MovementType, InventoryProduct } from "../types/inventory.types";
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ArrowDownLeft className="w-3 h-3" />
            Entrada
          </span>
        );
      case "STOCK_REMOVE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[#FF3F1A]/10 text-[#FF3F1A] border border-[#FF3F1A]/20">
            <ArrowUpRight className="w-3 h-3" />
            Salida
          </span>
        );
      case "STOCK_COUNT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20">
            <History className="w-3 h-3" />
            Conteo
          </span>
        );
      case "STOCK_TRANSFER":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Activity className="w-3 h-3" />
            Traslado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {action}
          </span>
        );
    }
  };

  const totalEntries = movements.filter((m) => m.type === "ENTRADA").length;
  const totalExits = movements.filter((m) => m.type === "SALIDA").length;
  const totalCounts = movements.filter((m) => m.action === "STOCK_COUNT").length;

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-fade-in max-w-7xl mx-auto">
      {/* ── 1. Minimalist Top Metrics Strip (Zero Clutter) ── */}
      <div className="bg-white dark:bg-[#151518] rounded-2xl p-3 sm:px-4 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 sm:gap-6 divide-x divide-zinc-200 dark:divide-zinc-800 text-xs overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-baseline gap-2 flex-none">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Total Movimientos:</span>
            <span className="font-mono font-black text-sm text-zinc-900 dark:text-white">
              {movements.length}
            </span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-baseline gap-2 flex-none">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Entradas:</span>
            <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
              +{totalEntries}
            </span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-baseline gap-2 flex-none">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Salidas:</span>
            <span className="font-mono font-black text-sm text-[#FF3F1A]">
              -{totalExits}
            </span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-baseline gap-2 flex-none">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Ajustes / Conteos:</span>
            <span className="font-mono font-bold text-xs text-zinc-600 dark:text-zinc-300">
              {totalCounts}
            </span>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={onOpenNewMovement}
          className="flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-2xs flex-none"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Registrar Movimiento</span>
        </Button>
      </div>

      {/* ── 2. Unified Single-Row Filter Toolbar ── */}
      <div className="bg-white dark:bg-[#151518] rounded-2xl p-2.5 sm:p-3 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1 flex-wrap sm:flex-nowrap">
          {/* Live Search */}
          <div className="flex-1 min-w-[200px] sm:min-w-[280px]">
            <SearchInput
              intent="kardex.search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              placeholder="Buscar por concepto, SKU, producto o documento..."
            />
          </div>

          {/* Type Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 text-xs text-zinc-700 dark:text-zinc-200 flex-none">
            <Filter className="w-3.5 h-3.5 text-zinc-400 flex-none" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-transparent border-none text-xs font-semibold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer pr-1"
            >
              <option value="all">Todos los Tipos</option>
              <option value="ENTRADA">Solo Entradas (+)</option>
              <option value="SALIDA">Solo Salidas (-)</option>
            </select>
          </div>

          {/* Product Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 text-xs text-zinc-700 dark:text-zinc-200 flex-none">
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer pr-1 max-w-[200px] truncate"
            >
              <option value="all">Todos los Productos</option>
              {products.map((p) => (
                <option key={p.id} value={p.id} className="dark:bg-[#18181B]">
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {selectedProductFilter && onClearProductFilter && (
            <button
              type="button"
              onClick={onClearProductFilter}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#FF3F1A]/10 text-[#FF3F1A] border border-[#FF3F1A]/20 hover:bg-[#FF3F1A]/20 transition-colors cursor-pointer flex items-center gap-1 flex-none"
            >
              <X className="w-3 h-3" />
              <span>Limpiar filtro de ítem</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3. High-Density Ledger Table ── */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-50/80 dark:bg-zinc-900/60 select-none">
                <th className="py-2.5 px-4 font-bold">Fecha & Hora</th>
                <th className="py-2.5 px-4 font-bold">Ítem / Referencia</th>
                <th className="py-2.5 px-4 font-bold">Concepto & Motivo</th>
                <th className="py-2.5 px-4 font-bold text-center">Variación</th>
                <th className="py-2.5 px-4 font-bold text-center">Saldo</th>
                <th className="py-2.5 px-4 font-bold">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-zinc-400 space-y-2">
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
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    {/* 1. Timestamp */}
                    <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {formatDate(m.timestamp)}
                    </td>

                    {/* 2. Product Name & SKU */}
                    <td className="py-2.5 px-4">
                      <div>
                        <strong className="text-zinc-900 dark:text-zinc-100 block font-bold text-xs">
                          {m.productName}
                        </strong>
                        <span className="font-mono text-[11px] text-zinc-400">SKU: {m.productSku}</span>
                      </div>
                    </td>

                    {/* 3. Concept & Type Tag */}
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {renderActionBadge(m.action)}
                        <span className="font-medium text-zinc-800 dark:text-zinc-200 text-xs">
                          {m.concept}
                        </span>
                      </div>
                      {m.referenceDoc && (
                        <span className="font-mono text-[10px] text-zinc-400 block mt-0.5">
                          Doc: {m.referenceDoc}
                        </span>
                      )}
                    </td>

                    {/* 4. Delta Variation */}
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-lg font-mono font-bold text-xs border ${
                          m.type === "ENTRADA"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-[#FF3F1A]/10 text-[#FF3F1A] border-[#FF3F1A]/20"
                        }`}
                      >
                        {m.type === "ENTRADA" ? `+${m.quantity}` : `-${m.quantity}`} {m.unit}
                      </span>
                    </td>

                    {/* 5. Final Balance */}
                    <td className="py-2.5 px-4 text-center whitespace-nowrap font-mono">
                      <strong className="text-xs font-black text-zinc-900 dark:text-white">
                        {m.finalBalance} {m.unit}
                      </strong>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">
                        Antes: {m.previousBalance}
                      </span>
                    </td>

                    {/* 6. Author */}
                    <td className="py-2.5 px-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#190088]/10 dark:bg-[#190088]/20 border border-[#190088]/20 flex items-center justify-center text-[9px] font-mono font-black text-[#190088] dark:text-[#97D6DF]">
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

        {/* Minimalist Summary Footer */}
        <div className="py-2 px-4 bg-zinc-50/80 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>
            Mostrando <strong>{filteredMovements.length}</strong> de <strong>{movements.length}</strong> movimientos
          </span>
        </div>
      </div>
    </div>
  );
};
