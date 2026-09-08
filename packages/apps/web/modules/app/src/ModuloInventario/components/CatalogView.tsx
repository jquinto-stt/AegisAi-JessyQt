import React, { useState } from "react";
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Edit3,
  Trash2,
  Package,
  History,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MapPin,
  Search,
  LayoutGrid,
  List,
  Sparkles,
  ChevronDown,
  Download,
  Store,
  CreditCard,
  FileSpreadsheet,
  ArrowUpDown,
  Building2,
} from "lucide-react";
import {
  InventoryProduct,
  InventoryFilterOptions,
  ProductStatus,
  StockLocation,
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
  onEditProduct: (product: InventoryProduct) => void;
  onDeleteProduct: (id: string) => void;
  onOpenMovement: (product: InventoryProduct, type: "ENTRADA" | "SALIDA") => void;
  onOpenCount: (product: InventoryProduct) => void;
  onOpenTransfer: (product: InventoryProduct) => void;
  onViewProductDetail: (product: InventoryProduct) => void;
  onViewHistory: (product: InventoryProduct) => void;
  onResetDefaults: () => void;
  onSaveBatch?: (products: Array<Partial<InventoryProduct> & { name: string; sku: string }>) => Promise<void>;
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
  onSaveBatch,
}) => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);

  // Metrics summary
  const totalSKUs = products.length;
  const totalCostValue = products.reduce((acc, p) => acc + p.costPrice * p.stockActual, 0);

  const renderStatusBadge = (status: ProductStatus, stock: number, minStock: number, unit: string) => {
    switch (status) {
      case "out_of_stock":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-[#FF3F1A]/10 text-[#FF3F1A] border border-[#FF3F1A]/20">
            <XCircle className="w-2.5 h-2.5" />
            Agotado
          </span>
        );
      case "low_stock":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-2.5 h-2.5" />
            Bajo stock
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-2.5 h-2.5" />
            {stock} disponibles
          </span>
        );
    }
  };

  const handleExportCSV = () => {
    if (products.length === 0) return;
    const header = "Nombre,SKU,Precio Venta,Costo,Stock Actual,Stock Minimo,Categoria,Ubicacion,Estado\n";
    const rows = products
      .map(
        (p) =>
          `"${p.name}","${p.sku}",${p.salePrice},${p.costPrice},${p.stockActual},${p.stockMinimo},"${p.category}","${p.locationName || ""}","${p.status}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_inventario_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* ── 1. Top Header ── */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0f172a] dark:text-white">
          Inventario
        </h1>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCategoriesModalOpen(true)}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-zinc-700 shadow-2xs transition-colors cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
            <span>Categorías</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCreateDropdownOpen(!isCreateDropdownOpen)}
              className="px-4 py-2 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] dark:bg-white dark:hover:bg-slate-200 text-white dark:text-[#0f172a] font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <span>Agregar productos</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isCreateDropdownOpen && (
              <div
                className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-[#18181B] rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 py-1.5 z-40 animate-fade-in text-xs font-semibold"
                onMouseLeave={() => setIsCreateDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateDropdownOpen(false);
                    onNewProduct();
                  }}
                  className="w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-slate-200"
                >
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Crear individual</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateDropdownOpen(false);
                    setIsImportModalOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-slate-200"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Subir desde Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateDropdownOpen(false);
                    onResetDefaults();
                  }}
                  className="w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-slate-200 border-t border-slate-100 dark:border-zinc-800"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Restablecer datos demo</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Filter & Report Bar (Search + Categories + Descargar Reporte) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left: Search input + Categories select */}
        <div className="flex items-center gap-3 flex-1 flex-wrap sm:flex-nowrap">
          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters((p) => ({ ...p, searchQuery: e.target.value }))}
              placeholder="Buscar producto..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-2xs transition-all"
            />
          </div>

          {/* Categories Dropdown */}
          <div className="relative min-w-[200px]">
            <select
              value={filters.category || "all"}
              onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}
              className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="all">Ver todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Right: Descargar reporte & View switcher */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Descargar reporte</span>
          </button>

          {products.length > 0 && (
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-zinc-800/80 rounded-xl border border-slate-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs font-bold"
                    : "text-slate-400 hover:text-slate-700"
                }`}
                title="Vista Cuadrícula"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs font-bold"
                    : "text-slate-400 hover:text-slate-700"
                }`}
                title="Vista Tabla"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Two Wide Stat Cards (Total de referencias & Costo total de inventario) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Total de referencias */}
        <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 flex items-center justify-center text-slate-700 dark:text-slate-200 flex-none shadow-2xs">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="font-mono font-black text-lg sm:text-xl text-slate-900 dark:text-white">
              {totalSKUs}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Total de referencias
            </p>
          </div>
        </div>

        {/* Card 2: Costo total de inventario */}
        <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 flex items-center justify-center text-slate-700 dark:text-slate-200 flex-none shadow-2xs">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="font-mono font-black text-lg sm:text-xl text-slate-900 dark:text-white">
              $ {totalCostValue.toLocaleString("es-CO")}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Costo total de inventario
            </p>
          </div>
        </div>
      </div>

      {/* ── 4. Main Products Area ── */}
      {products.length === 0 ? (
        /* Empty State */
        <div className="py-16 sm:py-20 flex flex-col items-center justify-center text-center animate-fade-in">
          <div className="relative mb-5 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center shadow-inner">
              <span className="text-4xl select-none transform hover:scale-110 transition-transform duration-300">
                🖐️
              </span>
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md font-bold text-sm border-2 border-white dark:border-[#18181B]">
              ✕
            </div>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Aún no tienes productos creados
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 w-full max-w-xl">
            <div
              onClick={onNewProduct}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 shadow-2xs hover:shadow-lg hover:border-blue-500/60 dark:hover:border-blue-500/60 transition-all cursor-pointer flex items-center gap-3.5 group text-left"
            >
              <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center text-xl flex-none group-hover:scale-105 transition-transform">
                ✨
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Crear manualmente
                </h3>
                <p className="text-xs text-slate-400 dark:text-zinc-400 mt-0.5">
                  Créalos uno por uno
                </p>
              </div>
            </div>

            <div
              onClick={() => setIsImportModalOpen(true)}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 shadow-2xs hover:shadow-lg hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition-all cursor-pointer flex items-center gap-3.5 group text-left"
            >
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-xl flex-none group-hover:scale-105 transition-transform">
                📊
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Subir productos desde excel
                </h3>
                <p className="text-xs text-slate-400 dark:text-zinc-400 mt-0.5">
                  Crea varios productos a la vez
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        /* Empty Filter */
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-zinc-800 p-12 text-center text-slate-400 space-y-3">
          <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-zinc-600" />
          <h4 className="text-base font-bold text-slate-700 dark:text-zinc-200">
            No se encontraron productos con ese filtro
          </h4>
          <p className="text-xs text-slate-500">
            Prueba ajustando los términos de búsqueda o seleccionando otra categoría.
          </p>
          <button
            onClick={onResetDefaults}
            className="text-xs font-bold text-[#FF3F1A] hover:underline cursor-pointer"
          >
            Restablecer filtros
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* ── 6-Column E-commerce / ERP Grid (Alegra Style) ── */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.stockActual <= 0;

            return (
              <div
                key={product.id}
                onClick={() => onViewProductDetail(product)}
                className="bg-white dark:bg-[#121215] rounded-2xl border border-slate-200/90 dark:border-zinc-800/90 p-3 shadow-2xs hover:shadow-lg hover:border-slate-400 dark:hover:border-zinc-600 transition-all cursor-pointer flex flex-col justify-between group"
              >
                {/* Product Photo */}
                <div className="relative w-full aspect-square rounded-xl bg-slate-100 dark:bg-zinc-800/80 overflow-hidden flex items-center justify-center">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                      loading="lazy"
                      onError={(e) => {
                        // Fallback image if network fails
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&auto=format&fit=crop&q=80";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <Package className="w-7 h-7 opacity-40 mb-0.5" />
                      <span className="text-[9px] font-mono font-bold uppercase opacity-60">
                        {product.name.slice(0, 3)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Info (Price, Name, Stock) */}
                <div className="pt-2.5 text-center flex flex-col items-center space-y-0.5">
                  <div className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    ${product.salePrice.toLocaleString("es-CO")}
                  </div>
                  <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate w-full group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {product.name}
                  </h4>
                  <div
                    className={`text-[11px] font-medium ${
                      isOutOfStock
                        ? "text-rose-500 font-bold"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {product.stockActual} disponibles
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── High-Density Table View (Fallback Switchable) ── */
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/60 text-slate-500 dark:text-zinc-400 font-mono uppercase text-[10px] tracking-wider select-none">
                  <th className="py-3 px-4 font-bold">Ítem / Referencia</th>
                  <th className="py-3 px-3 font-bold">Categoría</th>
                  <th className="py-3 px-4 font-bold text-right">Precio de Venta</th>
                  <th className="py-3 px-4 font-bold text-right">Stock</th>
                  <th className="py-3 px-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors group"
                  >
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/80 flex items-center justify-center flex-none shadow-2xs">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="font-mono font-black text-xs text-slate-400">
                              {product.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onViewProductDetail(product)}
                            className="font-bold text-xs text-slate-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate text-left block cursor-pointer"
                          >
                            {product.name}
                          </button>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {product.sku}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 dark:text-zinc-300 text-[11px]">
                      {product.category}
                    </td>

                    <td className="py-2.5 px-4 text-right whitespace-nowrap font-mono font-bold text-xs text-slate-900 dark:text-white">
                      ${product.salePrice.toLocaleString("es-CO")}
                    </td>

                    <td className="py-2.5 px-4 text-right whitespace-nowrap font-mono text-xs">
                      <strong className={product.stockActual <= 0 ? "text-rose-500 font-bold" : "text-slate-900 dark:text-white"}>
                        {product.stockActual} {product.unit}
                      </strong>
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
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
                          onClick={() => onEditProduct(product)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Editar ítem"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProduct(product.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Eliminar ítem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categories Modal */}
      <CategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={categories}
        selectedCategory={filters.category || "all"}
        onSelectCategory={(cat) => setFilters((p) => ({ ...p, category: cat }))}
      />

      {/* Import Excel Modal */}
      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={async (importedProducts) => {
          if (onSaveBatch) {
            await onSaveBatch(importedProducts);
          }
        }}
      />
    </div>
  );
};
