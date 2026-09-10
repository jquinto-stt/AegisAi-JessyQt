import React, { useState } from "react";
import {
  Plus,
  Search,
} from "lucide-react";
import { StockLocation, InventoryProduct } from "../types/inventory.types";

interface StockLocationsViewProps {
  locations: StockLocation[];
  products: InventoryProduct[];
  onOpenTransfer: (product: InventoryProduct) => void;
  onOpenCount: (product: InventoryProduct) => void;
  onOpenMovement: (product: InventoryProduct, type: "ENTRADA" | "SALIDA") => void;
  onSelectProduct: (product: InventoryProduct) => void;
  onOpenNewLocation?: () => void;
  onNewProductForLocation?: (locationId: string) => void;
  onViewProductHistory?: (product: InventoryProduct) => void;
}

export const StockLocationsView: React.FC<StockLocationsViewProps> = ({
  locations,
  products,
  onSelectProduct,
  onOpenNewLocation,
}) => {
  const [selectedLocId, setSelectedLocId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const warehouseProducts = products.filter((p) => {
    if (selectedLocId !== "all" && p.locationId !== selectedLocId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col flex-1 min-h-0 text-zinc-900 dark:text-zinc-100">
      {/* ── Toolbar ── */}
      <div className="px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center gap-2 flex-1 flex-wrap sm:flex-nowrap">
          {/* Warehouse Selector */}
          <select
            value={selectedLocId}
            onChange={(e) => setSelectedLocId(e.target.value)}
            aria-label="Seleccionar Bodega"
            className="px-2.5 py-1.5 bg-zinc-100/80 dark:bg-zinc-800/60 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="all">Todas las bodegas ({locations.length})</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.code})
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en bodega..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-100/80 dark:bg-zinc-800/60 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 self-end md:self-auto flex-none">
          <span className="text-xs text-zinc-400 font-mono">
            {warehouseProducts.length} {warehouseProducts.length === 1 ? "ítem" : "ítems"}
          </span>

          {onOpenNewLocation && (
            <button
              type="button"
              onClick={onOpenNewLocation}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Bodega</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-zinc-50 dark:bg-[#151518] z-10 border-b border-zinc-200 dark:border-zinc-800">
            <tr className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 select-none">
              <th className="py-2.5 px-4 sm:px-6 font-semibold">Producto</th>
              <th className="py-2.5 px-4 font-semibold">Categoría</th>
              <th className="py-2.5 px-4 font-semibold">Bodega</th>
              <th className="py-2.5 px-4 font-semibold text-right">Stock</th>
              <th className="py-2.5 px-4 font-semibold text-right">Costo Unit.</th>
              <th className="py-2.5 px-4 sm:px-6 font-semibold text-right">Valor Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-sans">
            {warehouseProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-zinc-400">
                  <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs">
                    No hay productos en esta bodega
                  </p>
                </td>
              </tr>
            ) : (
              warehouseProducts.map((prod) => {
                const totalValue = prod.costPrice * prod.stockActual;
                return (
                  <tr
                    key={prod.id}
                    onClick={() => onSelectProduct(prod)}
                    className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 sm:px-6">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-[#FF3F1A] transition-colors truncate max-w-xs">
                        {prod.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        {prod.sku}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {prod.category}
                    </td>

                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {prod.locationName || "Bodega Central"}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {prod.stockActual} {prod.unit}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-zinc-500 dark:text-zinc-400">
                      ${prod.costPrice.toLocaleString("es-CO")}
                    </td>

                    <td className="py-3 px-4 sm:px-6 text-right whitespace-nowrap font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      ${totalValue.toLocaleString("es-CO")}
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
