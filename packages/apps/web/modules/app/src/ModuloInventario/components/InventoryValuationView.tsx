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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  Button,
} from "../../elements";

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
    <div className="space-y-5 animate-fade-in">
      {/* ── 1. Header & Quick Export Strip ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="size-5 text-brand-500" />
            <span>Valor de Inventario & Auditoría Financiera</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Valorización contable en costo promedio ponderado, proyección de venta y rentabilidad del activo circulante.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          startIcon={<Download className="size-3.5" />}
          onClick={handleExportCSV}
          title="Exportar archivo CSV con el balance de inventario para contabilidad"
        >
          Exportar Balance CSV
        </Button>
      </div>

      {/* ── 2. Primary Accounting KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Cost Value (Capital Invertido) */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-theme-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-1.5">
            <span className="text-xs uppercase font-semibold tracking-wider">
              Capital en Costo
            </span>
            <div className="size-7 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center">
              <Boxes className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
            ${globalKPIs.totalCost.toLocaleString("es-CO")}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1 font-medium">
            <span>En {globalKPIs.totalUnits.toLocaleString("es-CO")} unidades físicas</span>
          </div>
        </div>

        {/* Total Sale Value (Proyección Venta) */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-theme-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-1.5">
            <span className="text-xs uppercase font-semibold tracking-wider">
              Valor en Venta (PVP)
            </span>
            <div className="size-7 rounded-lg bg-success-50 dark:bg-success-500/10 text-success-600 flex items-center justify-center">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
            ${globalKPIs.totalSale.toLocaleString("es-CO")}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1 font-medium">
            <span>Precio estándar de mostrador</span>
          </div>
        </div>

        {/* Projected Margin */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-theme-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-1.5">
            <span className="text-xs uppercase font-semibold tracking-wider">
              Utilidad Bruta Proyectada
            </span>
            <div className="size-7 rounded-lg bg-warning-50 dark:bg-warning-500/10 text-warning-600 flex items-center justify-center">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
            ${globalKPIs.totalMarginAmount.toLocaleString("es-CO")}
          </div>
          <div className="text-xs text-success-600 dark:text-success-400 mt-1 flex items-center gap-1 font-semibold font-mono">
            <Percent className="size-3" />
            <span>Margen Bruto: {globalKPIs.grossMarginPercent.toFixed(1)}%</span>
          </div>
        </div>

        {/* Active SKUs / Diversification */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-theme-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-1.5">
            <span className="text-xs uppercase font-semibold tracking-wider">
              Referencias con Stock
            </span>
            <div className="size-7 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center">
              <Layers className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
            {globalKPIs.activeSkusWithStock}{" "}
            <span className="text-sm font-normal text-gray-400 font-sans">
              / {globalKPIs.totalSkus} SKUs
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1 font-medium">
            <span>
              {((globalKPIs.activeSkusWithStock / (globalKPIs.totalSkus || 1)) * 100).toFixed(0)}% del catálogo con disponibilidad
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Distribution Strips (Bodegas & Categorías) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Bodega Distribution */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-theme-xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="uppercase font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 tracking-wider">
              <Building2 className="size-3.5 text-brand-500" />
              <span>Capital por Bodega / Sucursal</span>
            </span>
            <span className="text-xs font-mono text-gray-400">
              {warehouseBreakdown.length} ubicaciones
            </span>
          </div>

          <div className="space-y-2.5">
            {warehouseBreakdown.map((wh) => (
              <div key={wh.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]">
                    {wh.name}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ${wh.costValue.toLocaleString("es-CO")}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({wh.percent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(3, wh.percent))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-theme-xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="uppercase font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 tracking-wider">
              <BarChart3 className="size-3.5 text-brand-500" />
              <span>Capital por Categoría</span>
            </span>
            <span className="text-xs font-mono text-gray-400">
              {categoryBreakdown.length} familias
            </span>
          </div>

          <div className="space-y-2.5">
            {categoryBreakdown.slice(0, 4).map((cat) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]">
                    {cat.name}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ${cat.costValue.toLocaleString("es-CO")}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({cat.percent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full bg-gray-600 dark:bg-gray-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(3, cat.percent))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. Filters & Controls Strip ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 border border-gray-200 dark:border-gray-800 shadow-theme-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-1 min-w-[220px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por SKU, producto o categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white focus:outline-hidden focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Bodega filter */}
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            aria-label="Filtrar por Bodega"
            className="px-2.5 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-hidden focus:border-brand-500 cursor-pointer"
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
            className="px-2.5 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-hidden focus:border-brand-500 cursor-pointer hidden sm:inline"
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
            className="px-2.5 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-hidden focus:border-brand-500 cursor-pointer"
          >
            <option value="all">Todo el Stock</option>
            <option value="in_stock">Solo con Stock (&gt; 0)</option>
            <option value="out_of_stock">Agotados (= 0)</option>
          </select>
        </div>

        {/* Count Indicator */}
        <div className="text-xs font-mono text-gray-400 flex items-center gap-2 ml-auto">
          <span>{filteredProducts.length} ítems filtrados</span>
        </div>
      </div>

      {/* ── 5. Detailed Valuation Table ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell
                isHeader
                className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1">
                  <span>Producto & SKU</span>
                  <ArrowUpDown className="size-3" />
                </div>
              </TableCell>
              <TableCell isHeader>Bodega</TableCell>
              <TableCell
                isHeader
                className="text-center cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                onClick={() => handleSort("stock")}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Stock Físico</span>
                  <ArrowUpDown className="size-3" />
                </div>
              </TableCell>
              <TableCell isHeader className="text-right">Costo Promedio</TableCell>
              <TableCell
                isHeader
                className="text-right cursor-pointer hover:text-brand-500 text-brand-500"
                onClick={() => handleSort("costValue")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total Costo ($)</span>
                  <ArrowUpDown className="size-3" />
                </div>
              </TableCell>
              <TableCell isHeader className="text-right">PVP Unitario</TableCell>
              <TableCell
                isHeader
                className="text-right cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                onClick={() => handleSort("saleValue")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total PVP ($)</span>
                  <ArrowUpDown className="size-3" />
                </div>
              </TableCell>
              <TableCell
                isHeader
                className="text-center cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                onClick={() => handleSort("margin")}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Margen Bruto</span>
                  <ArrowUpDown className="size-3" />
                </div>
              </TableCell>
              <TableCell isHeader className="text-right">Part. Activo</TableCell>
              <TableCell isHeader className="text-center">Kardex</TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-12 text-center text-gray-400">
                  <AlertCircle className="size-6 mx-auto mb-2 text-warning-500 opacity-60" />
                  <p className="font-semibold text-gray-700 dark:text-gray-300">
                    No se encontraron referencias con los filtros seleccionados
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Probá cambiando la bodega o el término de búsqueda.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((p) => {
                return (
                  <TableRow
                    key={p.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02] group"
                  >
                    {/* Producto & SKU */}
                    <TableCell>
                      <div>
                        <span
                          onClick={() => onOpenProductDetail && onOpenProductDetail(p)}
                          className="font-semibold text-gray-900 dark:text-white hover:text-brand-500 transition-colors cursor-pointer block truncate max-w-[240px]"
                        >
                          {p.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-xs text-gray-400">
                            {p.sku}
                          </span>
                          <span className="text-gray-300 dark:text-gray-700">•</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                            {p.category || "General"}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Bodega */}
                    <TableCell className="text-gray-600 dark:text-gray-300 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="size-3 text-gray-400 flex-none" />
                        <span className="truncate max-w-[130px]">
                          {p.locationName || "Sede Principal"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Stock Físico */}
                    <TableCell className="text-center font-mono">
                      <Badge
                        variant="light"
                        color={
                          p.stock <= 0
                            ? "error"
                            : p.stock <= p.stockMinimo
                            ? "warning"
                            : "light"
                        }
                        size="sm"
                      >
                        {p.stock} {p.unit}
                      </Badge>
                    </TableCell>

                    {/* Costo Unitario */}
                    <TableCell className="text-right font-mono text-gray-600 dark:text-gray-400 text-xs">
                      ${p.costPrice.toLocaleString("es-CO")}
                    </TableCell>

                    {/* Total Costo ($) */}
                    <TableCell className="text-right font-mono font-bold text-sm text-brand-500">
                      ${p.totalCostValue.toLocaleString("es-CO")}
                    </TableCell>

                    {/* PVP Unitario */}
                    <TableCell className="text-right font-mono text-gray-600 dark:text-gray-400 text-xs">
                      ${p.salePrice.toLocaleString("es-CO")}
                    </TableCell>

                    {/* Total PVP ($) */}
                    <TableCell className="text-right font-mono font-semibold text-gray-900 dark:text-white">
                      ${p.totalSaleValue.toLocaleString("es-CO")}
                    </TableCell>

                    {/* Margen Bruto */}
                    <TableCell className="text-center font-mono">
                      <Badge
                        variant="light"
                        color={
                          p.marginPercent >= 40
                            ? "success"
                            : p.marginPercent >= 20
                            ? "warning"
                            : "error"
                        }
                        size="sm"
                      >
                        {p.marginPercent.toFixed(1)}%
                      </Badge>
                    </TableCell>

                    {/* % Participación en Inventario */}
                    <TableCell className="text-right font-mono font-medium text-xs text-gray-500">
                      {p.sharePercent.toFixed(2)}%
                    </TableCell>

                    {/* Kardex Drill-Down */}
                    <TableCell className="text-center">
                      {onNavigateToKardex && (
                        <button
                          type="button"
                          onClick={() => onNavigateToKardex(p.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors cursor-pointer"
                          title={`Ver movimientos de ${p.name} en Kardex`}
                        >
                          <History className="size-3.5" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Subtotals Footer Strip */}
        {filteredProducts.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-3 px-4 font-mono text-xs flex items-center justify-between flex-wrap gap-3">
            <span className="uppercase text-xs font-semibold text-gray-500">
              Total Balance Filtrado: {filteredSubtotals.units.toLocaleString("es-CO")} unidades
            </span>
            <div className="flex items-center gap-6">
              <div>
                <span className="text-gray-400 text-xs">Total Costo: </span>
                <span className="text-base text-brand-500 font-bold">
                  ${filteredSubtotals.costVal.toLocaleString("es-CO")}
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Total PVP: </span>
                <span className="text-sm text-gray-900 dark:text-white font-bold">
                  ${filteredSubtotals.saleVal.toLocaleString("es-CO")}
                </span>
              </div>
              <Badge variant="light" color="success" size="sm">
                Margen Promedio: {filteredSubtotals.marginPct.toFixed(1)}%
              </Badge>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

