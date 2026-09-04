import React, { useState } from "react";
import {
  MapPin,
  Building2,
  ArrowRightLeft,
  Boxes,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  FileText,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { StockLocation, InventoryProduct } from "../types/inventory.types";
import { Badge } from "@/elements";

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
  onOpenTransfer,
  onOpenCount,
  onOpenMovement,
  onSelectProduct,
  onOpenNewLocation,
  onNewProductForLocation,
  onViewProductHistory,
}) => {
  const [selectedLocId, setSelectedLocId] = useState<string>(locations[0]?.id || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"detail" | "table">("detail");

  const totalGlobalUnits = products.reduce((acc, p) => acc + p.stockActual, 0);
  const totalGlobalValue = products.reduce((acc, p) => acc + p.costPrice * p.stockActual, 0);

  const activeLocation = locations.find((l) => l.id === selectedLocId);

  // Filter products by selected warehouse and search query
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

  const activeUnits = (
    selectedLocId === "all"
      ? products
      : products.filter((p) => p.locationId === selectedLocId)
  ).reduce((acc, p) => acc + p.stockActual, 0);

  const activeValue = (
    selectedLocId === "all"
      ? products
      : products.filter((p) => p.locationId === selectedLocId)
  ).reduce((acc, p) => acc + p.costPrice * p.stockActual, 0);

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-fade-in max-w-7xl mx-auto">
      {/* ── 1. Header & Actions Strip (Alegra High Density) ── */}
      <div className="bg-white dark:bg-[#151518] rounded-2xl p-3 sm:px-4 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 sm:gap-6 divide-x divide-zinc-200 dark:divide-zinc-800 text-xs overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-baseline gap-2 flex-none">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Bodegas:</span>
            <span className="font-mono font-black text-sm text-zinc-900 dark:text-white">
              {locations.length} activas
            </span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-baseline gap-2 flex-none">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Unidades Globales:</span>
            <span className="font-mono font-black text-sm text-zinc-900 dark:text-white">
              {totalGlobalUnits.toLocaleString("es-CO")}
            </span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-baseline gap-2 flex-none">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Valorización Stock:</span>
            <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
              ${totalGlobalValue.toLocaleString("es-CO")}
            </span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 flex-none ml-auto">
          {onOpenNewLocation && (
            <button
              type="button"
              onClick={onOpenNewLocation}
              className="px-3.5 py-1.5 rounded-xl bg-[#190088] hover:bg-[#150073] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Bodega</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const defaultProd = products.find((p) => p.locationId === selectedLocId) || products[0];
              if (defaultProd) onOpenMovement(defaultProd, "ENTRADA");
            }}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Entrada a Bodega</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const defaultProd = products.find((p) => p.locationId === selectedLocId) || products[0];
              if (defaultProd) onOpenTransfer(defaultProd);
            }}
            className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Trasladar</span>
          </button>
        </div>
      </div>

      {/* ── 2. Warehouse Selector Pills + Search Bar ── */}
      <div className="bg-white dark:bg-[#151518] rounded-2xl p-2.5 sm:p-3 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setSelectedLocId("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedLocId === "all"
                ? "bg-[#190088] text-white border border-[#190088] shadow-2xs font-bold"
                : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/60 hover:text-[#190088]"
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Todas las Bodegas</span>
            <span
              className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${
                selectedLocId === "all"
                  ? "bg-white/20 text-white"
                  : "bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold"
              }`}
            >
              {locations.length}
            </span>
          </button>

          {locations.map((loc) => {
            const count = products.filter((p) => p.locationId === loc.id).length;
            const isSelected = selectedLocId === loc.id;
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => setSelectedLocId(loc.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#190088] text-white border border-[#190088] shadow-2xs font-bold"
                    : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/60 hover:text-[#190088]"
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-[#FF3F1A]" />
                <span>{loc.name}</span>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & View Toggle */}
        <div className="flex items-center gap-2 flex-none">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar en esta bodega..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:outline-hidden focus:ring-1 focus:ring-[#190088] text-zinc-900 dark:text-white"
            />
          </div>

          <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setViewMode("detail")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === "detail"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Inventario
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Sedes
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. Active Warehouse Card Strip (when a single warehouse is selected) ── */}
      {selectedLocId !== "all" && activeLocation && (
        <div className="bg-gradient-to-r from-blue-50/70 via-white to-zinc-50 dark:from-[#190088]/15 dark:via-[#151518] dark:to-[#151518] rounded-2xl border border-blue-200/70 dark:border-[#190088]/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#190088]/10 dark:bg-[#190088]/30 border border-[#190088]/20 text-[#190088] dark:text-[#97D6DF] flex items-center justify-center flex-none">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-zinc-900 dark:text-white">
                  {activeLocation.name}
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
                  {activeLocation.code}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {activeLocation.description || "Bodega comercial y punto de despacho"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 divide-x divide-zinc-200 dark:divide-zinc-800 text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                Existencias en Depósito:
              </span>
              <strong className="text-sm font-mono font-black text-zinc-900 dark:text-white">
                {activeUnits.toLocaleString("es-CO")} unidades
              </strong>
            </div>

            <div className="pl-4 sm:pl-6">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                Valorización Almacén:
              </span>
              <strong className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
                ${activeValue.toLocaleString("es-CO")}
              </strong>
            </div>

            {onNewProductForLocation && (
              <div className="pl-4 sm:pl-6">
                <button
                  type="button"
                  onClick={() => onNewProductForLocation(activeLocation.id)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 text-[#190088]" />
                  <span>Nuevo Producto Aquí</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Main Content Area (Alegra High Density Table) ── */}
      {viewMode === "detail" ? (
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/75 dark:bg-zinc-900/50 text-[10px] font-mono uppercase font-bold text-zinc-400">
                  <th className="py-2.5 px-4">Producto & SKU</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3">Bodega Asignada</th>
                  <th className="py-2.5 px-3 text-right">Costo Unit.</th>
                  <th className="py-2.5 px-3 text-right">Stock Actual</th>
                  <th className="py-2.5 px-3 text-right">Valor en Bodega</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-4 text-right">Acciones de Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {warehouseProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400">
                      <Boxes className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                      <p className="font-bold text-zinc-700 dark:text-zinc-300">
                        No hay productos registrados en esta bodega
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Utiliza "Entrada a Bodega" o crea un nuevo producto asignado a esta ubicación.
                      </p>
                    </td>
                  </tr>
                ) : (
                  warehouseProducts.map((prod) => {
                    const totalProdValue = prod.costPrice * prod.stockActual;
                    const isLowStock = prod.stockActual <= prod.stockMinimo && prod.stockActual > 0;
                    const isOutStock = prod.stockActual <= 0;

                    return (
                      <tr
                        key={prod.id}
                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors group"
                      >
                        {/* Producto & SKU */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => onSelectProduct(prod)}
                            className="font-bold text-zinc-900 dark:text-white hover:text-[#190088] dark:hover:text-[#97D6DF] text-left transition-colors cursor-pointer block truncate max-w-xs"
                          >
                            {prod.name}
                          </button>
                          <span className="font-mono text-[11px] text-zinc-400">
                            SKU: {prod.sku}
                          </span>
                        </td>

                        {/* Categoría */}
                        <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300 font-medium">
                          {prod.category}
                        </td>

                        {/* Bodega */}
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                            <MapPin className="w-3 h-3 text-[#FF3F1A] flex-none" />
                            <span>{prod.locationName}</span>
                          </span>
                        </td>

                        {/* Costo Unitario */}
                        <td className="py-3 px-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                          ${prod.costPrice.toLocaleString("es-CO")}
                        </td>

                        {/* Stock Actual */}
                        <td className="py-3 px-3 text-right font-mono font-black text-sm text-zinc-900 dark:text-white">
                          {prod.stockActual} {prod.unit}
                        </td>

                        {/* Valor en Bodega */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900 dark:text-white">
                          ${totalProdValue.toLocaleString("es-CO")}
                        </td>

                        {/* Estado */}
                        <td className="py-3 px-3 text-center">
                          {isOutStock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/10 text-rose-600 border border-rose-500/20">
                              Agotado
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              Bajo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              Óptimo
                            </span>
                          )}
                        </td>

                        {/* Acciones Rápidas */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Entrada de Stock */}
                            <button
                              type="button"
                              onClick={() => onOpenMovement(prod, "ENTRADA")}
                              title="Registrar Entrada de Stock"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 transition-colors cursor-pointer"
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            </button>

                            {/* Salida de Stock */}
                            <button
                              type="button"
                              onClick={() => onOpenMovement(prod, "SALIDA")}
                              title="Registrar Salida / Merma"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>

                            {/* Traslado */}
                            <button
                              type="button"
                              onClick={() => onOpenTransfer(prod)}
                              title="Trasladar a otra bodega"
                              className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/20 transition-colors cursor-pointer"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>

                            {/* Conteo Físico */}
                            <button
                              type="button"
                              onClick={() => onOpenCount(prod)}
                              title="Ajuste físico de inventario"
                              className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>

                            {/* Kardex */}
                            {onViewProductHistory && (
                              <button
                                type="button"
                                onClick={() => onViewProductHistory(prod)}
                                title="Ver Movimientos en Kardex"
                                className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/20 transition-colors cursor-pointer"
                              >
                                <Activity className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Vista Resumen de Bodegas / Sedes (Tabla Ejecutiva) */
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/75 dark:bg-zinc-900/50 text-[10px] font-mono uppercase font-bold text-zinc-400">
                  <th className="py-2.5 px-4">Bodega / Sucursal</th>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-4">Dirección / Notas</th>
                  <th className="py-2.5 px-3 text-right">Cant. Productos</th>
                  <th className="py-2.5 px-3 text-right">Stock Físico</th>
                  <th className="py-2.5 px-3 text-right">Valorización Total</th>
                  <th className="py-2.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {locations.map((loc) => {
                  const locProds = products.filter((p) => p.locationId === loc.id);
                  const locUnits = locProds.reduce((acc, p) => acc + p.stockActual, 0);
                  const locVal = locProds.reduce((acc, p) => acc + p.costPrice * p.stockActual, 0);

                  return (
                    <tr
                      key={loc.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] flex items-center justify-center flex-none">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900 dark:text-white block">
                              {loc.name}
                            </span>
                            <span className="text-[11px] text-zinc-400">Sede Principal</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-zinc-600 dark:text-zinc-300">
                        {loc.code}
                      </td>

                      <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400">
                        {loc.description || "Sin dirección registrada"}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-zinc-700 dark:text-zinc-300 font-bold">
                        {locProds.length} ítems
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-black text-sm text-zinc-900 dark:text-white">
                        {locUnits.toLocaleString("es-CO")}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ${locVal.toLocaleString("es-CO")}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLocId(loc.id);
                            setViewMode("detail");
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#190088]/10 hover:bg-[#190088]/20 text-[#190088] dark:text-[#97D6DF] text-xs font-bold transition-colors cursor-pointer"
                        >
                          Ver Inventario
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
