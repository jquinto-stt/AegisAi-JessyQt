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
} from "lucide-react";
import {
  InventoryProduct,
  InventoryFilterOptions,
  ProductStatus,
  ProductType,
  StockLocation,
} from "../types/inventory.types";
import { NectoBanner } from "@/compositions/pedidos/shared/NectoBanner";
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Official Clean Necto Banner */}
      <NectoBanner
        icon={<Boxes className="w-6 h-6 text-[#FF3F1A]" />}
        title="Catálogo de Partes & Productos"
        description="Control de existencias, parámetros dinámicos, costos unitarios y ubicaciones físicas de inventario."
      />

      {/* Clean Category Filter Pills & Search Bar */}
      <div className="bg-white dark:bg-[#151518] rounded-2xl p-2.5 sm:p-3 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            type="button"
            onClick={() => setFilters((p) => ({ ...p, category: "all" }))}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex-none ${
              filters.category === "all"
                ? "bg-[#190088] text-white border border-[#190088] shadow-2xs font-bold"
                : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/60 hover:text-[#190088] dark:hover:text-[#97D6DF] hover:bg-blue-50/70 dark:hover:bg-[#190088]/20"
            }`}
          >
            Todos ({products.length})
          </button>

          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat).length;
            const isSelected = filters.category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilters((p) => ({ ...p, category: cat }))}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex-none ${
                  isSelected
                    ? "bg-[#190088] text-white border border-[#190088] shadow-2xs font-bold"
                    : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/60 hover:text-[#190088] dark:hover:text-[#97D6DF] hover:bg-blue-50/70 dark:hover:bg-[#190088]/20"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Right Search and Actions */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="w-full sm:w-64">
            <SearchInput
              value={filters.searchQuery}
              onChange={(e) => setFilters((p) => ({ ...p, searchQuery: e.target.value }))}
              onClear={() => setFilters((p) => ({ ...p, searchQuery: "" }))}
              placeholder="Buscar producto o SKU..."
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid" ? "bg-[#190088] text-white shadow-2xs font-bold" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
              title="Vista en Cuadrícula"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "list" ? "bg-[#190088] text-white shadow-2xs font-bold" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
              title="Vista en Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant="primary"
            onClick={onNewProduct}
            className="flex items-center gap-2 text-xs font-bold whitespace-nowrap shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </Button>
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

                  {/* Price Tag Pill over Image */}
                  <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
                    <span className="px-2.5 py-1 rounded-xl bg-white/95 dark:bg-[#18181B]/95 text-zinc-950 dark:text-white font-mono font-black text-xs sm:text-sm shadow-md backdrop-blur-md border border-white/20 dark:border-zinc-700/50">
                      ${product.salePrice.toLocaleString("es-CO")}
                    </span>
                  </div>
                </div>

                {/* 2. Card Body Info */}
                <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
                      <span className="font-bold text-zinc-600 dark:text-zinc-300">{product.sku}</span>
                      {product.ipn && <span>IPN: {product.ipn}</span>}
                    </div>
                    <h4
                      onClick={() => onViewProductDetail(product)}
                      className="font-bold text-sm sm:text-base text-zinc-900 dark:text-[#ECECEC] group-hover:text-[#190088] dark:group-hover:text-[#97D6DF] transition-colors cursor-pointer line-clamp-1 leading-snug"
                    >
                      {product.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#FF3F1A] flex-none" />
                      <span className="truncate">{location?.name || "Sin ubicación"}</span>
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
        /* ── List View (Clean Rows with Product Photo Thumbnail) ── */
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 sm:p-4 shadow-2xs">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredProducts.map((product) => {
              const location = locations.find((l) => l.id === product.locationId);

              return (
                <div
                  key={product.id}
                  className="py-3 px-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 flex items-center justify-center flex-none shadow-2xs">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="font-mono font-black text-sm text-zinc-400">
                          {product.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4
                        onClick={() => onViewProductDetail(product)}
                        className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white hover:text-[#190088] dark:hover:text-[#97D6DF] transition-colors cursor-pointer truncate"
                      >
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                        <span className="font-mono font-bold text-zinc-600 dark:text-zinc-300">
                          {product.sku}
                        </span>
                        <span>•</span>
                        <span>{product.category}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#FF3F1A]" />
                          {location?.name || "Sin ubicación"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center flex-wrap sm:flex-nowrap">
                    <div>
                      {renderStatusBadge(product.status, product.stockActual, product.stockMinimo, product.unit)}
                    </div>

                    <div className="text-right font-mono text-sm">
                      <span className="text-[10px] text-zinc-400 block font-mono uppercase">Precio Venta</span>
                      <strong className="font-black text-zinc-900 dark:text-white">
                        ${product.salePrice.toLocaleString("es-CO")}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenMovement(product, "ENTRADA")}
                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-colors cursor-pointer"
                        title="Entrada de Stock"
                      >
                        <ArrowDownLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenMovement(product, "SALIDA")}
                        className="p-2 rounded-xl bg-[#FF3F1A]/10 hover:bg-[#FF3F1A]/20 text-[#FF3F1A] border border-[#FF3F1A]/20 text-xs font-bold transition-colors cursor-pointer"
                        title="Salida de Stock"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onViewProductDetail(product)}
                        className="p-2 rounded-xl bg-[#190088]/10 hover:bg-[#190088]/20 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20 text-xs font-bold transition-colors cursor-pointer"
                        title="Ver Ficha"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
