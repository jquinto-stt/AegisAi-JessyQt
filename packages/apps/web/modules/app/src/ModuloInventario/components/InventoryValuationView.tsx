import React, { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  Building2,
  Boxes,
  Layers,
  Search,
  Download,
  Percent,
  AlertCircle,
  BarChart3,
  ArrowUpDown,
  History,
} from "lucide-react";
import { InventoryProduct, StockLocation } from "../types/inventory.types";

interface InventoryValuationViewProps {
  products: InventoryProduct[];
  locations: StockLocation[];
  categories: string[];
  onNavigateToKardex?: (productId: string) => void;
  onOpenProductDetail?: (product: InventoryProduct) => void;
}

type SortField = "costValue" | "saleValue" | "stock" | "margin" | "name";
type SortOrder = "asc" | "desc";

export const InventoryValuationView: React.FC<InventoryValuationViewProps> = ({
  products,
  locations,
  categories,
  onNavigateToKardex,
  onOpenProductDetail,
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "out_of_stock">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("costValue");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Tangible products (excluding pure services which don't carry physical inventory valuation)
  const physicalProducts = useMemo(() => {
    return products.filter((p) => p.productType !== "service");
  }, [products]);

  // Global KPIs (computed over all tangible products)
  const globalKPIs = useMemo(() => {
    let totalCost = 0;
    let totalSale = 0;
    let totalUnits = 0;
    let activeSkusWithStock = 0;

    physicalProducts.forEach((p) => {
      const stock = Math.max(0, p.stockActual || 0);
      const cost = p.costPrice || 0;
      const sale = p.salePrice || 0;

      totalCost += stock * cost;
      totalSale += stock * sale;
      totalUnits += stock;
      if (stock > 0) activeSkusWithStock++;
    });

    const totalMarginAmount = totalSale - totalCost;
    const grossMarginPercent = totalSale > 0 ? (totalMarginAmount / totalSale) * 100 : 0;

    return {
      totalCost,
      totalSale,
      totalMarginAmount,
      grossMarginPercent,
      totalUnits,
      activeSkusWithStock,
      totalSkus: physicalProducts.length,
    };
  }, [physicalProducts]);

  // Breakdown by Warehouse
  const warehouseBreakdown = useMemo(() => {
    const locMap: Record<
      string,
      { name: string; costValue: number; units: number; count: number }
    > = {};

    locations.forEach((loc) => {
      locMap[loc.id] = { name: loc.name, costValue: 0, units: 0, count: 0 };
    });

    physicalProducts.forEach((p) => {
      const locId = p.locationId || "loc-001";
      if (!locMap[locId]) {
        locMap[locId] = {
          name: p.locationName || "Almacén Central",
          costValue: 0,
          units: 0,
          count: 0,
        };
      }
      const stock = Math.max(0, p.stockActual || 0);
      locMap[locId].costValue += stock * (p.costPrice || 0);
      locMap[locId].units += stock;
      if (stock > 0) locMap[locId].count++;
    });

    return Object.entries(locMap).map(([id, data]) => ({
      id,
      name: data.name,
      costValue: data.costValue,
      units: data.units,
      count: data.count,
      percent: globalKPIs.totalCost > 0 ? (data.costValue / globalKPIs.totalCost) * 100 : 0,
    }));
  }, [locations, physicalProducts, globalKPIs.totalCost]);

  // Breakdown by Category
  const categoryBreakdown = useMemo(() => {
    const catMap: Record<string, { costValue: number; units: number }> = {};

    physicalProducts.forEach((p) => {
      const cat = p.category || "General";
      if (!catMap[cat]) {
        catMap[cat] = { costValue: 0, units: 0 };
      }
      const stock = Math.max(0, p.stockActual || 0);
      catMap[cat].costValue += stock * (p.costPrice || 0);
      catMap[cat].units += stock;
    });

    return Object.entries(catMap)
      .map(([name, data]) => ({
        name,
        costValue: data.costValue,
        units: data.units,
        percent: globalKPIs.totalCost > 0 ? (data.costValue / globalKPIs.totalCost) * 100 : 0,
      }))
      .sort((a, b) => b.costValue - a.costValue);
  }, [physicalProducts, globalKPIs.totalCost]);

  // Filtered and sorted products for audit table
  const filteredProducts = useMemo(() => {
    return physicalProducts
      .filter((p) => {
        if (selectedLocationId !== "all" && p.locationId !== selectedLocationId) return false;
        if (selectedCategory !== "all" && p.category !== selectedCategory) return false;

        const stock = p.stockActual || 0;
        if (stockFilter === "in_stock" && stock <= 0) return false;
        if (stockFilter === "out_of_stock" && stock > 0) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchSku = p.sku.toLowerCase().includes(q);
          const matchCat = (p.category || "").toLowerCase().includes(q);
          return matchName || matchSku || matchCat;
        }

        return true;
      })
      .map((p) => {
        const stock = Math.max(0, p.stockActual || 0);
        const costPrice = p.costPrice || 0;
        const salePrice = p.salePrice || 0;
        const totalCostValue = stock * costPrice;
        const totalSaleValue = stock * salePrice;
        const marginAmount = totalSaleValue - totalCostValue;
        const marginPercent = salePrice > 0 ? ((salePrice - costPrice) / salePrice) * 100 : 0;
        const sharePercent =
          globalKPIs.totalCost > 0 ? (totalCostValue / globalKPIs.totalCost) * 100 : 0;

        return {
          ...p,
          stock,
          costPrice,
          salePrice,
          totalCostValue,
          totalSaleValue,
          marginAmount,
          marginPercent,
          sharePercent,
        };
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === "costValue") diff = a.totalCostValue - b.totalCostValue;
        else if (sortField === "saleValue") diff = a.totalSaleValue - b.totalSaleValue;
        else if (sortField === "stock") diff = a.stock - b.stock;
        else if (sortField === "margin") diff = a.marginPercent - b.marginPercent;
        else if (sortField === "name") diff = a.name.localeCompare(b.name);

        return sortOrder === "desc" ? -diff : diff;
      });
  }, [
    physicalProducts,
    selectedLocationId,
    selectedCategory,
    stockFilter,
    searchQuery,
    sortField,
    sortOrder,
    globalKPIs.totalCost,
  ]);

  // Subtotals of currently filtered table
  const filteredSubtotals = useMemo(() => {
    let costVal = 0;
    let saleVal = 0;
    let units = 0;

    filteredProducts.forEach((p) => {
      costVal += p.totalCostValue;
      saleVal += p.totalSaleValue;
      units += p.stock;
    });

    const marginVal = saleVal - costVal;
    const marginPct = saleVal > 0 ? (marginVal / saleVal) * 100 : 0;

    return {
      costVal,
      saleVal,
      units,
      marginVal,
      marginPct,
    };
  }, [filteredProducts]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Export CSV for Accounting Closing / Audit
  const handleExportCSV = () => {
    const headers = [
      "SKU",
      "Producto",
      "Categoría",
      "Tipo",
      "Bodega",
      "Stock Físico",
      "Unidad",
      "Costo Unitario ($)",
      "Valor Total Costo ($)",
      "Precio Venta ($)",
      "Valor Total Venta ($)",
      "Margen Estimado (%)",
      "Participación en Inventario (%)",
    ];

    const rows = filteredProducts.map((p) => [
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category || "General"}"`,
      `"${p.productType}"`,
      `"${p.locationName || ""}"`,
      p.stock,
      `"${p.unit}"`,
      p.costPrice,
      p.totalCostValue,
      p.salePrice,
      p.totalSaleValue,
      p.marginPercent.toFixed(2),
      p.sharePercent.toFixed(2),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Valorizacion_Inventario_Necto_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in max-w-7xl mx-auto">
      {/* ── 1. Header & Quick Export Strip ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#FF3F1A]" />
            <span>Valor de Inventario & Auditoría Financiera</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Valorización contable en costo promedio ponderado, proyección de venta y rentabilidad del activo circulante.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
          title="Exportar archivo CSV con el balance de inventario para contabilidad"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar Balance CSV</span>
        </button>
      </div>

      {/* ── 2. Primary Accounting KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Cost Value (Capital Invertido) */}
        <div className="bg-white dark:bg-[#151518] rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF3F1A]/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider">
              Capital en Costo
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FF3F1A]/10 text-[#FF3F1A] flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-zinc-900 dark:text-white">
            ${globalKPIs.totalCost.toLocaleString("es-CO")}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1 font-medium">
            <span>En {globalKPIs.totalUnits.toLocaleString("es-CO")} unidades físicas</span>
          </div>
        </div>

        {/* Total Sale Value (Proyección Venta) */}
        <div className="bg-white dark:bg-[#151518] rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider">
              Valor en Venta (PVP)
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-zinc-900 dark:text-white">
            ${globalKPIs.totalSale.toLocaleString("es-CO")}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1 font-medium">
            <span>Precio estándar de mostrador</span>
          </div>
        </div>

        {/* Projected Margin */}
        <div className="bg-white dark:bg-[#151518] rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider">
              Utilidad Bruta Proyectada
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-zinc-900 dark:text-white">
            ${globalKPIs.totalMarginAmount.toLocaleString("es-CO")}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-bold font-mono">
            <Percent className="w-3 h-3" />
            <span>Margen Bruto: {globalKPIs.grossMarginPercent.toFixed(1)}%</span>
          </div>
        </div>

        {/* Active SKUs / Diversification */}
        <div className="bg-white dark:bg-[#151518] rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider">
              Referencias con Stock
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-zinc-900 dark:text-white">
            {globalKPIs.activeSkusWithStock}{" "}
            <span className="text-sm font-normal text-zinc-400 font-sans">
              / {globalKPIs.totalSkus} SKUs
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1 font-medium">
            <span>
              {((globalKPIs.activeSkusWithStock / (globalKPIs.totalSkus || 1)) * 100).toFixed(0)}% del catálogo con disponibilidad
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Distribution Strips (Bodegas & Categorías) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Bodega Distribution */}
        <div className="bg-white dark:bg-[#151518] rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono uppercase font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#FF3F1A]" />
              <span>Capital por Bodega / Sucursal</span>
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              {warehouseBreakdown.length} ubicaciones
            </span>
          </div>

          <div className="space-y-2.5">
            {warehouseBreakdown.map((wh) => (
              <div key={wh.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[200px]">
                    {wh.name}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-zinc-900 dark:text-white">
                      ${wh.costValue.toLocaleString("es-CO")}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      ({wh.percent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-[#FF3F1A] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(3, wh.percent))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white dark:bg-[#151518] rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono uppercase font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-[#FF3F1A]" />
              <span>Capital por Categoría</span>
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              {categoryBreakdown.length} familias
            </span>
          </div>

          <div className="space-y-2.5">
            {categoryBreakdown.slice(0, 4).map((cat) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[200px]">
                    {cat.name}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-zinc-900 dark:text-white">
                      ${cat.costValue.toLocaleString("es-CO")}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      ({cat.percent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-zinc-700 dark:bg-zinc-300 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(3, cat.percent))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. Filters & Controls Strip ── */}
      <div className="bg-white dark:bg-[#151518] rounded-2xl p-3 sm:px-4 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-1 min-w-[220px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por SKU, producto o categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800/70 border border-transparent focus:border-[#FF3F1A] focus:outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400 font-sans"
            />
          </div>

          {/* Bodega filter */}
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            aria-label="Filtrar por Bodega"
            className="px-2.5 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-[#FF3F1A] focus:outline-none text-zinc-800 dark:text-zinc-200 cursor-pointer font-medium"
          >
            <option value="all">Todas las Bodegas</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filtrar por Categoría"
            className="px-2.5 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-[#FF3F1A] focus:outline-none text-zinc-800 dark:text-zinc-200 cursor-pointer font-medium hidden sm:inline"
          >
            <option value="all">Todas las Categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Stock filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            aria-label="Filtrar por Disponibilidad de Stock"
            className="px-2.5 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-[#FF3F1A] focus:outline-none text-zinc-800 dark:text-zinc-200 cursor-pointer font-medium"
          >
            <option value="all">Todo el Stock</option>
            <option value="in_stock">Solo con Stock (&gt; 0)</option>
            <option value="out_of_stock">Agotados (= 0)</option>
          </select>
        </div>

        {/* Count Indicator */}
        <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2 ml-auto">
          <span>{filteredProducts.length} ítems filtrados</span>
        </div>
      </div>

      {/* ── 5. Detailed Valuation Table ── */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/75 dark:bg-zinc-900/50 text-[10px] font-mono uppercase font-bold text-zinc-400 select-none">
                <th
                  className="py-2.5 px-4 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-200"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    <span>Producto & SKU</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Bodega</th>
                <th
                  className="py-2.5 px-3 text-center cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-200"
                  onClick={() => handleSort("stock")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Stock Físico</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right">Costo Promedio</th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-[#FF3F1A]"
                  onClick={() => handleSort("costValue")}
                >
                  <div className="flex items-center justify-end gap-1 text-[#FF3F1A]">
                    <span>Total Costo ($)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right">PVP Unitario</th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-200"
                  onClick={() => handleSort("saleValue")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total PVP ($)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-center cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-200"
                  onClick={() => handleSort("margin")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Margen Bruto</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-4 text-right">Part. Activo</th>
                <th className="py-2.5 px-3 text-center">Kardex</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-sans">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-40 text-amber-500" />
                    <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                      No se encontraron referencias con los filtros seleccionados
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Probá cambiando la bodega o el término de búsqueda.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors group"
                    >
                      {/* Producto & SKU */}
                      <td className="py-3 px-4">
                        <div>
                          <span
                            onClick={() => onOpenProductDetail && onOpenProductDetail(p)}
                            className="font-bold text-zinc-900 dark:text-white hover:text-[#FF3F1A] transition-colors cursor-pointer block truncate max-w-[240px]"
                          >
                            {p.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[11px] text-zinc-400">
                              {p.sku}
                            </span>
                            <span className="text-zinc-300 dark:text-zinc-700">•</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                              {p.category || "General"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Bodega */}
                      <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-zinc-400 flex-none" />
                          <span className="truncate max-w-[130px]">
                            {p.locationName || "Sede Principal"}
                          </span>
                        </div>
                      </td>

                      {/* Stock Físico */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span
                          className={`font-black text-xs ${
                            p.stock <= 0
                              ? "text-rose-600 dark:text-rose-400"
                              : p.stock <= p.stockMinimo
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-zinc-900 dark:text-white"
                          }`}
                        >
                          {p.stock} {p.unit}
                        </span>
                      </td>

                      {/* Costo Unitario */}
                      <td className="py-3 px-3 text-right font-mono text-zinc-600 dark:text-zinc-300">
                        ${p.costPrice.toLocaleString("es-CO")}
                      </td>

                      {/* Total Costo ($) - Key Accounting Value */}
                      <td className="py-3 px-3 text-right font-mono font-black text-sm text-[#FF3F1A]">
                        ${p.totalCostValue.toLocaleString("es-CO")}
                      </td>

                      {/* PVP Unitario */}
                      <td className="py-3 px-3 text-right font-mono text-zinc-600 dark:text-zinc-300">
                        ${p.salePrice.toLocaleString("es-CO")}
                      </td>

                      {/* Total PVP ($) */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900 dark:text-white">
                        ${p.totalSaleValue.toLocaleString("es-CO")}
                      </td>

                      {/* Margen Bruto */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            p.marginPercent >= 40
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : p.marginPercent >= 20
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {p.marginPercent.toFixed(1)}%
                        </span>
                      </td>

                      {/* % Participación en Inventario */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-xs text-zinc-500">
                        {p.sharePercent.toFixed(2)}%
                      </td>

                      {/* Kardex Drill-Down */}
                      <td className="py-3 px-3 text-center">
                        {onNavigateToKardex && (
                          <button
                            type="button"
                            onClick={() => onNavigateToKardex(p.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-[#FF3F1A] hover:bg-[#FF3F1A]/10 transition-colors cursor-pointer"
                            title={`Ver movimientos de ${p.name} en Kardex`}
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Subtotals Footer Strip */}
            {filteredProducts.length > 0 && (
              <tfoot className="border-t-2 border-zinc-300 dark:border-zinc-700 bg-zinc-50/90 dark:bg-zinc-900/80 font-mono font-bold text-xs">
                <tr>
                  <td className="py-3 px-4 uppercase text-[11px] text-zinc-500">
                    Total Balance Filtrado:
                  </td>
                  <td className="py-3 px-3 text-zinc-400">—</td>
                  <td className="py-3 px-3 text-center text-zinc-900 dark:text-white">
                    {filteredSubtotals.units.toLocaleString("es-CO")} u.
                  </td>
                  <td className="py-3 px-3 text-zinc-400 text-right">—</td>
                  <td className="py-3 px-3 text-right text-base text-[#FF3F1A] font-black">
                    ${filteredSubtotals.costVal.toLocaleString("es-CO")}
                  </td>
                  <td className="py-3 px-3 text-zinc-400 text-right">—</td>
                  <td className="py-3 px-3 text-right text-sm text-zinc-900 dark:text-white font-black">
                    ${filteredSubtotals.saleVal.toLocaleString("es-CO")}
                  </td>
                  <td className="py-3 px-3 text-center text-emerald-600 dark:text-emerald-400 font-black">
                    {filteredSubtotals.marginPct.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-400">100%</td>
                  <td className="py-3 px-3 text-center text-zinc-400">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
