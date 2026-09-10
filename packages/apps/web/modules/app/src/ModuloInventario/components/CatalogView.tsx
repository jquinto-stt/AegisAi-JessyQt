import React, { useState } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Edit3,
  Trash2,
  History,
  FileSpreadsheet,
  Download,
  LayoutGrid,
  List,
  ArrowDownLeft,
  RotateCcw,
  Package,
} from "lucide-react";
import {
  InventoryProduct,
  InventoryFilterOptions,
  StockLocation,
  PriceList,
} from "../types/inventory.types";
import { CategoriesModal } from "./CategoriesModal";
import { ImportExcelModal } from "./ImportExcelModal";

interface CatalogViewProps {
  products: InventoryProduct[];
  filteredProducts: InventoryProduct[];
  dynamicColumns: Array<{ key: string; label: string }>;
  categories: string[];
  locations: StockLocation[];
  filters: InventoryFilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<InventoryFilterOptions>>;
  onNewProduct: () => void;
  onNewProductAdvanced?: () => void;
  onEditProduct: (product: InventoryProduct) => void;
  onDeleteProduct: (productId: string) => void;
  onOpenMovement: (
    product: InventoryProduct,
    initialMode?: "ENTRADA" | "SALIDA" | "AJUSTE" | "TRASLADO" | "CONTEO"
  ) => void;
  onOpenCount?: (product: InventoryProduct) => void;
  onOpenTransfer?: (product: InventoryProduct) => void;
  onViewProductDetail: (product: InventoryProduct) => void;
  onViewHistory?: (product: InventoryProduct) => void;
  onResetDefaults: () => void;
  priceLists?: PriceList[];
  selectedPriceListId?: string;
  onSelectPriceList?: (listId: string) => void;
  calculateProductPrice?: (
    product: InventoryProduct,
    priceListId?: string
  ) => {
    finalPrice: number;
    differencePercent: number;
    priceListName: string;
  };
  onSaveBatch?: (batch: Partial<InventoryProduct>[]) => Promise<void>;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  products,
  filteredProducts,
  categories,
  filters,
  setFilters,
  onNewProduct,
  onEditProduct,
  onDeleteProduct,
  onOpenMovement,
  onViewProductDetail,
  onViewHistory,
  onResetDefaults,
  priceLists = [],
  selectedPriceListId,
  onSelectPriceList,
  calculateProductPrice,
  onSaveBatch,
}) => {
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSecondaryMenuOpen, setIsSecondaryMenuOpen] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  const handleExportCSV = () => {
    if (products.length === 0) return;
    const header = "Nombre;SKU;Precio Venta;Costo;Stock Actual;Stock Minimo;Categoria;Bodega;Estado\n";
    const rows = products
      .map(
        (p) =>
          `"${p.name.replace(/"/g, '""')}";"${p.sku}";${p.salePrice};${p.costPrice};${p.stockActual};${p.stockMinimo};"${p.category}";"${p.locationName || ""}";"${p.status}"`
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inventario_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 text-zinc-900 dark:text-zinc-100">
      {/* ── Minimalist Integrated Toolbar ── */}
      <div className="px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
        {/* Left: Quick Search & Inline Filters */}
        <div className="flex items-center gap-2 flex-1 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 min-w-[220px] sm:max-w-sm">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters((p) => ({ ...p, searchQuery: e.target.value }))}
              placeholder="Buscar por nombre o SKU..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-100/80 dark:bg-zinc-800/60 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none transition-colors"
            />
          </div>

          <select
            value={filters.category || "all"}
            onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}
            aria-label="Filtrar por Categoría"
            className="px-2.5 py-1.5 bg-zinc-100/80 dark:bg-zinc-800/60 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={filters.status || "all"}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value as any }))}
            aria-label="Filtrar por Estado de Stock"
            className="px-2.5 py-1.5 bg-zinc-100/80 dark:bg-zinc-800/60 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="all">Todo el stock</option>
            <option value="active">En stock normal</option>
            <option value="low_stock">Bajo mínimo</option>
            <option value="out_of_stock">Agotado (0)</option>
          </select>

          {priceLists.length > 0 && onSelectPriceList && (
            <select
              value={selectedPriceListId}
              onChange={(e) => onSelectPriceList(e.target.value)}
              aria-label="Lista de Precios"
              className="px-2.5 py-1.5 bg-zinc-100/80 dark:bg-zinc-800/60 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
            >
              {priceLists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name} {pl.isDefault ? "(Base)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: View Switcher (Table / Cards) + Counter + Actions */}
        <div className="flex items-center gap-3 self-end md:self-auto flex-none">
          {/* Segmented View Mode Toggle */}
          <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg border border-zinc-200/80 dark:border-zinc-700/60">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-bold"
                  : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
              title="Vista de Tarjetas"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-bold"
                  : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
              title="Vista de Tabla"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-xs text-zinc-400 font-mono">
            {filteredProducts.length} {filteredProducts.length === 1 ? "ítem" : "ítems"}
          </span>

          {/* Secondary Actions (Clean menu) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSecondaryMenuOpen(!isSecondaryMenuOpen)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Más opciones"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isSecondaryMenuOpen && (
              <div
                className="absolute right-0 mt-1 w-48 bg-white dark:bg-[#18181B] rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 py-1 z-30 text-xs"
                onMouseLeave={() => setIsSecondaryMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsSecondaryMenuOpen(false);
                    setIsCategoriesModalOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Gestionar Categorías</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSecondaryMenuOpen(false);
                    setIsImportModalOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Importar Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSecondaryMenuOpen(false);
                    handleExportCSV();
                  }}
                  className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Exportar CSV</span>
                </button>

                <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsSecondaryMenuOpen(false);
                    onResetDefaults();
                  }}
                  className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer demo</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary Action */}
          <button
            type="button"
            onClick={onNewProduct}
            className="px-3.5 py-1.5 rounded-lg bg-[#FF3F1A] hover:bg-[#E03513] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* ── Content View: Grid (Cards) OR Table ── */}
      {viewMode === "grid" ? (
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-zinc-400">
              <Package className="w-10 h-10 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
              <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs">
                No se encontraron productos
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Ajustá los filtros o términos de búsqueda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => {
                const priceInfo = calculateProductPrice
                  ? calculateProductPrice(product, selectedPriceListId)
                  : null;

                const cost = product.costPrice || 0;
                const price = priceInfo?.finalPrice ?? (product.salePrice || 0);
                const isOutOfStock = product.stockActual <= 0;
                const isLowStock = !isOutOfStock && product.stockActual <= product.stockMinimo;

                return (
                  <div
                    key={product.id}
                    onClick={() => onViewProductDetail(product)}
                    className="group bg-white dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden hover:border-[#FF3F1A]/50 hover:shadow-md transition-all cursor-pointer flex flex-col"
                  >
                    {/* Image Header with Status Tag */}
                    <div className="relative aspect-4/3 w-full bg-zinc-100 dark:bg-zinc-800/80 overflow-hidden flex items-center justify-center">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <Package className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
                      )}

                      {/* Status Tag */}
                      <div className="absolute top-2.5 left-2.5">
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 text-white shadow-2xs">
                            Agotado
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white shadow-2xs">
                            Bajo mínimo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-2xs">
                            En stock
                          </span>
                        )}
                      </div>

                      {/* Quick Action Button on Hover */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMovement(product, "ENTRADA");
                        }}
                        className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/60 hover:bg-[#FF3F1A] text-white text-[11px] font-semibold backdrop-blur-xs transition-colors flex items-center gap-1 shadow-2xs"
                        title="Registrar Movimiento"
                      >
                        <ArrowDownLeft className="w-3 h-3" />
                        <span>Movimiento</span>
                      </button>
                    </div>

                    {/* Card Body */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                          <span>{product.sku}</span>
                          <span className="truncate max-w-[100px]">{product.category || "General"}</span>
                        </div>

                        <h4 className="font-semibold text-sm text-zinc-900 dark:text-white mt-1 line-clamp-1 group-hover:text-[#FF3F1A] transition-colors">
                          {product.name}
                        </h4>

                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                          {product.locationName || "Bodega Central"}
                        </div>
                      </div>

                      {/* Stock & Prices Footer */}
                      <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-400 uppercase font-mono block">Stock</span>
                          <span className="text-xs font-mono font-bold text-zinc-900 dark:text-white">
                            {product.stockActual} {product.unit}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-zinc-400 uppercase font-mono block">Precio</span>
                          <span className="text-xs font-mono font-bold text-zinc-900 dark:text-white">
                            ${price.toLocaleString("es-CO")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* High-Density Clean Table */
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-zinc-50 dark:bg-[#151518] z-10 border-b border-zinc-200 dark:border-zinc-800">
              <tr className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 select-none">
                <th className="py-2.5 px-4 sm:px-6 font-semibold">Producto</th>
                <th className="py-2.5 px-4 font-semibold">Categoría</th>
                <th className="py-2.5 px-4 font-semibold">Bodega</th>
                <th className="py-2.5 px-4 font-semibold">Stock</th>
                <th className="py-2.5 px-4 font-semibold text-right">Costo (PPP)</th>
                <th className="py-2.5 px-4 font-semibold text-right">Precio</th>
                <th className="py-2.5 px-4 sm:px-6 font-semibold text-right w-16"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-sans">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-zinc-400">
                    <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs">
                      No se encontraron productos
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Ajustá los filtros o términos de búsqueda.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const priceInfo = calculateProductPrice
                    ? calculateProductPrice(product, selectedPriceListId)
                    : null;

                  const cost = product.costPrice || 0;
                  const price = priceInfo?.finalPrice ?? (product.salePrice || 0);
                  const isOutOfStock = product.stockActual <= 0;
                  const isLowStock = !isOutOfStock && product.stockActual <= product.stockMinimo;

                  return (
                    <tr
                      key={product.id}
                      onClick={() => onViewProductDetail(product)}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                    >
                      {/* Producto (Foto + Nombre + SKU) */}
                      <td className="py-2.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 flex items-center justify-center flex-none">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-zinc-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-[#FF3F1A] transition-colors truncate max-w-xs">
                              {product.name}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                              {product.sku}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="py-3 px-4 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                        {product.category || "General"}
                      </td>

                      {/* Bodega */}
                      <td className="py-3 px-4 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                        {product.locationName || "Bodega Central"}
                      </td>

                      {/* Stock Físico */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        <div className="flex items-center gap-2">
                          {isOutOfStock ? (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 flex-none" />
                          ) : isLowStock ? (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 flex-none" />
                          ) : (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-none opacity-60" />
                          )}
                          <span
                            className={`font-semibold ${
                              isOutOfStock
                                ? "text-rose-600 dark:text-rose-400"
                                : isLowStock
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-zinc-800 dark:text-zinc-200"
                            }`}
                          >
                            {product.stockActual} {product.unit}
                          </span>
                          {isLowStock && (
                            <span className="text-[10px] text-amber-500 font-sans">
                              (mín {product.stockMinimo})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Costo */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-zinc-500 dark:text-zinc-400">
                        ${cost.toLocaleString("es-CO")}
                      </td>

                      {/* Precio de Venta */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-medium text-zinc-900 dark:text-zinc-100">
                        ${price.toLocaleString("es-CO")}
                      </td>

                      {/* Acciones */}
                      <td
                        className="py-3 px-4 sm:px-6 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative inline-flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveActionMenuId(
                                activeActionMenuId === product.id ? null : product.id
                              )
                            }
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Opciones"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeActionMenuId === product.id && (
                            <div
                              className="absolute right-0 mt-8 w-44 bg-white dark:bg-[#18181B] rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 py-1 z-30 text-xs font-normal"
                              onMouseLeave={() => setActiveActionMenuId(null)}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  onViewProductDetail(product);
                                }}
                                className="w-full text-left px-3 py-1.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                              >
                                Ver Detalle
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  onOpenMovement(product, "ENTRADA");
                                }}
                                className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                              >
                                <ArrowDownLeft className="w-3.5 h-3.5 text-zinc-400" />
                                <span>Registrar Movimiento</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  onEditProduct(product);
                                }}
                                className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                                <span>Editar</span>
                              </button>

                              {onViewHistory && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    onViewHistory(product);
                                  }}
                                  className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                                >
                                  <History className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>Ver Kardex</span>
                                </button>
                              )}

                              <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  onDeleteProduct(product.id);
                                }}
                                className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Eliminar</span>
                              </button>
                            </div>
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
      )}

      {/* Submodals */}
      <CategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={categories}
        products={products}
      />

      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={async (imported) => {
          if (onSaveBatch) {
            await onSaveBatch(imported);
          }
        }}
      />
    </div>
  );
};
