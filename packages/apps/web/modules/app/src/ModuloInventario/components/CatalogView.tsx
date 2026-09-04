import React, { useState } from "react";
import {
  Boxes,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  ArrowRightLeft,
  Edit3,
  Trash2,
  Filter,
  Layers,
  Package,
  History,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MapPin,
  DollarSign,
  ShieldAlert,
  Search,
  LayoutGrid,
  List,
  Sparkles,
  SlidersHorizontal,
  TrendingUp,
  Percent,
  Building2,
} from "lucide-react";
import {
  InventoryProduct,
  InventoryFilterOptions,
  ProductStatus,
  ProductType,
  StockLocation,
} from "../types/inventory.types";
import { Button, SearchInput, Badge } from "@/elements";

interface CatalogViewProps {
  products: InventoryProduct[];
  filteredProducts: InventoryProduct[];
  dynamicColumns: Array<{ key: string; label: string }>;
  categories: string[];
  locations: StockLocation[];
  filters: InventoryFilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<InventoryFilterOptions>>;
  onNewProduct: () => void;
  onEditProduct: (product: InventoryProduct) => void;
  onDeleteProduct: (id: string) => void;
  onOpenMovement: (product: InventoryProduct, type: "ENTRADA" | "SALIDA") => void;
  onOpenCount: (product: InventoryProduct) => void;
  onOpenTransfer: (product: InventoryProduct) => void;
  onViewProductDetail: (product: InventoryProduct) => void;
  onViewHistory: (product: InventoryProduct) => void;
  onResetDefaults: () => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  products,
  filteredProducts,
  categories,
  locations,
  filters,
  setFilters,
  onNewProduct,
  onEditProduct,
  onDeleteProduct,
  onOpenMovement,
  onOpenCount,
  onOpenTransfer,
  onViewProductDetail,
  onViewHistory,
  onResetDefaults,
}) => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  // Metrics summary
  const totalSKUs = products.length;
  const lowStockCount = products.filter((p) => p.status === "low_stock").length;
  const outOfStockCount = products.filter((p) => p.status === "out_of_stock").length;
  const totalCostValue = products.reduce((acc, p) => acc + p.costPrice * p.stockActual, 0);

  const renderStatusBadge = (status: ProductStatus, stock: number, minStock: number, unit: string) => {
    switch (status) {
      case "out_of_stock":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-[11px] font-mono font-bold bg-[#FF3F1A]/10 text-[#FF3F1A] border border-[#FF3F1A]/20">
            <XCircle className="w-3 h-3" />
            Agotado (0 {unit})
          </span>
        );
      case "low_stock":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-[11px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            Bajo Stock ({stock}/{minStock})
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            {stock} {unit} disponibles
          </span>
        );
    }
  };

  const totalSaleValue = products.reduce((acc, p) => acc + (p.salePrice * p.stockActual), 0);
  const avgMargin = products.length > 0
    ? Math.round(products.reduce((acc, p) => {
        const m = p.salePrice > 0 ? ((p.salePrice - p.costPrice) / p.salePrice) * 100 : 0;
        return acc + m;
      }, 0) / products.length)
    : 0;

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-fade-in">
      {/* ── 1. Minimalist Financial & Stock Overview Strip (Zero Clutter) ── */}
      <div className="bg-white dark:bg-[#151518] rounded-2xl p-3 sm:px-4 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 sm:gap-6 divide-x divide-zinc-200 dark:divide-zinc-800 text-xs overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-baseline gap-2 flex-none">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Valor Inventario:</span>
            <span className="font-mono font-black text-sm text-zinc-900 dark:text-white">
              ${totalCostValue.toLocaleString("es-CO")}
            </span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-baseline gap-2 flex-none">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Venta Proyectada:</span>
            <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
              ${totalSaleValue.toLocaleString("es-CO")}
            </span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-baseline gap-2 flex-none">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Margen Prom:</span>
            <span className="font-mono font-bold text-xs text-[#FF3F1A]">
              +{avgMargin}%
            </span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-center gap-2 flex-none">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Alertas:</span>
            {lowStockCount > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                <AlertTriangle className="w-3 h-3" />
                {lowStockCount} por reabastecer
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> Todo al día
              </span>
            )}
          </div>
        </div>

        <Button
          variant="primary"
          onClick={onNewProduct}
          className="flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-2xs flex-none"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nuevo Ítem</span>
        </Button>
      </div>

      {/* ── 2. Clean Unified Filter Toolbar (Live Search + Warehouse + Category + Stock Status + View Toggle) ── */}
      <div className="bg-white dark:bg-[#151518] rounded-2xl p-2.5 sm:p-3 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1 flex-wrap sm:flex-nowrap">
          {/* Live Search */}
          <div className="flex-1 min-w-[200px] sm:min-w-[260px]">
            <SearchInput
              intent="catalog.search"
              value={filters.searchQuery}
              onChange={(e) => setFilters((p) => ({ ...p, searchQuery: e.target.value }))}
              onClear={() => setFilters((p) => ({ ...p, searchQuery: "" }))}
              placeholder="Buscar ítem o SKU..."
            />
          </div>

          {/* Warehouse Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 text-xs text-zinc-700 dark:text-zinc-200 flex-none">
            <Building2 className="w-3.5 h-3.5 text-zinc-400 flex-none" />
            <select
              value={filters.locationId || "all"}
              onChange={(e) => setFilters((p) => ({ ...p, locationId: e.target.value }))}
              className="bg-transparent border-none text-xs font-semibold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer pr-1"
            >
              <option value="all">Todas las Bodegas</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id} className="dark:bg-[#18181B]">
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 text-xs text-zinc-700 dark:text-zinc-200 flex-none">
            <Layers className="w-3.5 h-3.5 text-zinc-400 flex-none" />
            <select
              value={filters.category || "all"}
              onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}
              className="bg-transparent border-none text-xs font-semibold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer pr-1"
            >
              <option value="all">Todas las Categorías</option>
              {categories.map((cat) => (
                <option key={cat} value={cat} className="dark:bg-[#18181B]">
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-between sm:justify-end flex-wrap sm:flex-nowrap">
          {/* Segmented Stock Status Filter */}
          <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setFilters((p) => ({ ...p, status: "all" }))}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                !filters.status || filters.status === "all"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white font-bold shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilters((p) => ({ ...p, status: "active" }))}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filters.status === "active"
                  ? "bg-emerald-500 text-white font-bold shadow-2xs"
                  : "text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400"
              }`}
            >
              Con stock
            </button>
            <button
              type="button"
              onClick={() => setFilters((p) => ({ ...p, status: "low_stock" }))}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filters.status === "low_stock"
                  ? "bg-amber-500 text-white font-bold shadow-2xs"
                  : "text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400"
              }`}
            >
              Stock bajo
            </button>
            <button
              type="button"
              onClick={() => setFilters((p) => ({ ...p, status: "out_of_stock" }))}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filters.status === "out_of_stock"
                  ? "bg-[#FF3F1A] text-white font-bold shadow-2xs"
                  : "text-zinc-500 hover:text-[#FF3F1A]"
              }`}
            >
              Agotados
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "list" ? "bg-[#190088] text-white shadow-2xs font-bold" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
              title="Vista Tabla"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid" ? "bg-[#190088] text-white shadow-2xs font-bold" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
              title="Vista Tarjetas"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center text-zinc-400 space-y-3">
          <Package className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600" />
          <h4 className="text-base font-bold text-zinc-700 dark:text-zinc-200">
            No se encontraron productos
          </h4>
          <p className="text-xs text-zinc-500">
            Prueba ajustando los filtros o el término de búsqueda.
          </p>
          <button
            onClick={onResetDefaults}
            className="text-xs font-bold text-[#FF3F1A] hover:underline cursor-pointer"
          >
            Restablecer filtros
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* ── Grid View (Modern Visual Catalog with Product Photos like Alegra/Shopify) ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredProducts.map((product) => {
            const location = locations.find((l) => l.id === product.locationId);
            const marginPct = product.salePrice > 0 ? Math.round(((product.salePrice - product.costPrice) / product.salePrice) * 100) : 0;

            return (
              <div
                key={product.id}
                className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xs hover:shadow-lg hover:border-[#190088]/60 dark:hover:border-[#190088]/80 transition-all flex flex-col justify-between group"
              >
                {/* 1. Product Image Cover with Floating Pills */}
                <div
                  className="relative w-full aspect-16/10 bg-zinc-100 dark:bg-zinc-900 overflow-hidden cursor-pointer"
                  onClick={() => onViewProductDetail(product)}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 group-hover:bg-zinc-200/50 transition-colors">
                      <Package className="w-8 h-8 opacity-40 mb-1" />
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider opacity-60">Sin Foto</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                  {/* Category & Status Overlay Chips */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase font-mono tracking-wider bg-black/60 text-white backdrop-blur-md shadow-xs border border-white/10">
                      {product.category}
                    </span>
                    <div>
                      {renderStatusBadge(product.status, product.stockActual, product.stockMinimo, product.unit)}
                    </div>
                  </div>

                  {/* Price Tag & Margin Pills over Image */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    <span className="px-2.5 py-1 rounded-xl bg-white/95 dark:bg-[#18181B]/95 text-zinc-950 dark:text-white font-mono font-black text-xs sm:text-sm shadow-md backdrop-blur-md border border-white/20 dark:border-zinc-700/50">
                      ${product.salePrice.toLocaleString("es-CO")}
                    </span>
                    {marginPct > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/90 text-white font-mono font-bold text-[10px] shadow-sm backdrop-blur-md">
                        +{marginPct}% margen
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Card Body Info */}
                <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
                      <span className="font-bold text-zinc-600 dark:text-zinc-300">{product.sku}</span>
                      {product.ipn && <span>Ref: {product.ipn}</span>}
                    </div>
                    <h4
                      onClick={() => onViewProductDetail(product)}
                      className="font-bold text-sm sm:text-base text-zinc-900 dark:text-[#ECECEC] group-hover:text-[#190088] dark:group-hover:text-[#97D6DF] transition-colors cursor-pointer line-clamp-1 leading-snug"
                    >
                      {product.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#FF3F1A] flex-none" />
                      <span className="truncate">{location?.name || "Bodega Central"}</span>
                    </div>
                  </div>

                  {/* Cost & Stock Numbers */}
                  <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">Costo:</span>
                      <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        ${product.costPrice.toLocaleString("es-CO")}
                      </span>
                    </div>
                    <div className="font-mono text-xs">
                      <span className="text-zinc-400 text-[10px] font-bold mr-1">STOCK:</span>
                      <strong className="text-zinc-900 dark:text-white font-black">{product.stockActual} {product.unit}</strong>
                    </div>
                  </div>

                  {/* 3. Action Buttons */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenMovement(product, "ENTRADA")}
                      className="py-1.5 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Registrar Entrada"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5 flex-none" />
                      <span>Entrada</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenMovement(product, "SALIDA")}
                      className="py-1.5 px-2 rounded-xl bg-[#FF3F1A]/10 hover:bg-[#FF3F1A]/20 text-[#FF3F1A] border border-[#FF3F1A]/20 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Registrar Salida"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 flex-none" />
                      <span>Salida</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onViewProductDetail(product)}
                      className="py-1.5 px-2 rounded-xl bg-[#190088]/10 hover:bg-[#190088]/20 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Ver Ficha y Opciones"
                    >
                      <Eye className="w-3.5 h-3.5 flex-none" />
                      <span>Ficha</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Zero-Clutter High-Density Inventory Table ── */
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 font-mono uppercase text-[10px] tracking-wider select-none">
                  <th className="py-2.5 px-4 font-bold">Ítem / Referencia</th>
                  <th className="py-2.5 px-3 font-bold">Bodega</th>
                  <th className="py-2.5 px-4 font-bold text-right">Precio & Rentabilidad</th>
                  <th className="py-2.5 px-4 font-bold text-right">Stock & Nivel</th>
                  <th className="py-2.5 px-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {filteredProducts.map((product) => {
                  const location = locations.find((l) => l.id === product.locationId);
                  const marginPct =
                    product.salePrice > 0
                      ? Math.round(((product.salePrice - product.costPrice) / product.salePrice) * 100)
                      : 0;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors group"
                    >
                      {/* 1. Item Name, SKU & Thumbnail */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center flex-none shadow-2xs">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <span className="font-mono font-black text-xs text-zinc-400">
                                {product.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => onViewProductDetail(product)}
                              className="font-bold text-xs text-zinc-900 dark:text-zinc-100 hover:text-[#190088] dark:hover:text-[#97D6DF] transition-colors truncate text-left block cursor-pointer"
                              title="Ver ficha completa"
                            >
                              {product.name}
                            </button>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-400 font-mono">
                              <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                                {product.sku}
                              </span>
                              <span>•</span>
                              <span className="text-zinc-500 dark:text-zinc-400">
                                {product.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Warehouse / Location */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300 font-medium text-[11px]">
                          <Building2 className="w-3 h-3 text-zinc-400" />
                          {location?.name || product.locationName || "Bodega Central"}
                        </span>
                      </td>

                      {/* 3. Sale Price, Cost & Margin Grouped */}
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-xs text-zinc-900 dark:text-white">
                          ${product.salePrice.toLocaleString("es-CO")}
                        </div>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5 text-[10px] font-mono text-zinc-400">
                          <span>Costo: ${product.costPrice.toLocaleString("es-CO")}</span>
                          <span>•</span>
                          <span
                            className={`font-bold ${
                              marginPct >= 30
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            +{marginPct}%
                          </span>
                        </div>
                      </td>

                      {/* 4. Stock & State Merged */}
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="font-mono font-black text-xs text-zinc-900 dark:text-white">
                          {product.stockActual} {product.unit}
                        </div>
                        <div className="mt-0.5">
                          {product.status === "out_of_stock" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FF3F1A] font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#FF3F1A]" />
                              Agotado
                            </span>
                          ) : product.status === "low_stock" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Bajo stock (Mín: {product.stockMinimo})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Óptimo (Mín: {product.stockMinimo})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Clean Contextual Actions */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-1 opacity-75 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => onOpenMovement(product, "ENTRADA")}
                            className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Entrada rápida"
                          >
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>Entrada</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenMovement(product, "SALIDA")}
                            className="px-2 py-1 rounded-lg bg-[#FF3F1A]/10 hover:bg-[#FF3F1A]/20 text-[#FF3F1A] border border-[#FF3F1A]/20 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Salida rápida"
                          >
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Salida</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onViewHistory(product)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Ver Kardex"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditProduct(product)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Editar ítem"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProduct(product.id)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Eliminar ítem"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Count (Minimalist) */}
          <div className="py-2 px-4 bg-zinc-50/80 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>
              <strong>{filteredProducts.length}</strong> de <strong>{products.length}</strong> ítems
            </span>
            <div className="flex items-center gap-4">
              <span>
                Costo: <strong>${filteredProducts.reduce((acc, p) => acc + p.costPrice * p.stockActual, 0).toLocaleString("es-CO")}</strong>
              </span>
              <span>
                Venta: <strong>${filteredProducts.reduce((acc, p) => acc + p.salePrice * p.stockActual, 0).toLocaleString("es-CO")}</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
