import React, { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableCell, Button } from "@/elements";
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
    <div className="flex flex-col flex-1 min-h-0 text-gray-800 dark:text-white">
      {/* ── Toolbar ── */}
      <div className="px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 flex-1 flex-wrap sm:flex-nowrap">
          {/* Warehouse Selector */}
          <select
            value={selectedLocId}
            onChange={(e) => setSelectedLocId(e.target.value)}
            aria-label="Seleccionar Bodega"
            className="px-2.5 py-1.5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand-500 cursor-pointer"
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
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en bodega..."
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 focus:border-brand-500 dark:focus:border-brand-500 rounded-lg text-xs text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 self-end md:self-auto flex-none">
          <span className="text-xs text-gray-400 font-mono">
            {warehouseProducts.length} {warehouseProducts.length === 1 ? "ítem" : "ítems"}
          </span>

          {onOpenNewLocation && (
            <Button
              size="sm"
              onClick={onOpenNewLocation}
              startIcon={<Plus className="w-4 h-4" />}
            >
              Nueva Bodega
            </Button>
          )}
        </div>
      </div>

      {/* ── Table using Pure Elements ── */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell header>Producto</TableCell>
              <TableCell header>Categoría</TableCell>
              <TableCell header>Bodega</TableCell>
              <TableCell header className="text-right">Stock</TableCell>
              <TableCell header className="text-right">Costo Unit.</TableCell>
              <TableCell header className="text-right">Valor Total</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouseProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center text-gray-400">
                  <p className="font-semibold text-gray-700 dark:text-gray-300 text-xs">
                    No hay productos en esta bodega
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              warehouseProducts.map((prod) => {
                const totalValue = prod.costPrice * prod.stockActual;
                return (
                  <TableRow
                    key={prod.id}
                    onClick={() => onSelectProduct(prod)}
                    className="hover:bg-gray-50/70 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    <TableCell>
                      <div className="font-medium text-gray-900 dark:text-white group-hover:text-brand-500 transition-colors truncate max-w-xs">
                        {prod.name}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                        {prod.sku}
                      </div>
                    </TableCell>

                    <TableCell className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {prod.category}
                    </TableCell>

                    <TableCell className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {prod.locationName || "Bodega Central"}
                    </TableCell>

                    <TableCell className="text-right whitespace-nowrap font-mono font-semibold text-gray-800 dark:text-gray-200">
                      {prod.stockActual} {prod.unit}
                    </TableCell>

                    <TableCell className="text-right whitespace-nowrap font-mono text-gray-500 dark:text-gray-400">
                      ${prod.costPrice.toLocaleString("es-CO")}
                    </TableCell>

                    <TableCell className="text-right whitespace-nowrap font-mono font-medium text-gray-900 dark:text-white">
                      ${totalValue.toLocaleString("es-CO")}
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
