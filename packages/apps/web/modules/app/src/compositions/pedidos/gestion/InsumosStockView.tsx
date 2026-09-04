import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { StockIngredientItem } from "../types";
import {
  Plus,
  Download,
  CheckCircle2,
  Package,
  FileSpreadsheet,
  Edit3,
  Trash2,
  Calendar,
  DollarSign,
  History,
  ShieldAlert,
  X,
} from "lucide-react";
import { SafeImage } from "../shared/SafeImage";
import { NectoBanner } from "../shared/NectoBanner";
import { Button, Field, Select, Badge, SegmentedControl, SearchInput } from "@/elements";

export const InsumosStockView: React.FC = () => {
  const {
    ingredients,
    stockMovements,
    addIngredient,
    updateIngredient,
    deleteIngredient,
  } = usePedidos();

  const [activeTab, setActiveTab] = useState<"listado" | "movimientos">("listado");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedStatus, setSelectedStatus] = useState<string>("Todos");
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Edit / Create Ingredient Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<StockIngredientItem | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<StockIngredientItem["category"]>("Carnes");
  const [formUnit, setFormUnit] = useState<StockIngredientItem["unit"]>("kg");
  const [formStock, setFormStock] = useState<number>(10);
  const [formMinThreshold, setFormMinThreshold] = useState<number>(5);
  const [formCost, setFormCost] = useState<number>(5000);
  const [formExpiry, setFormExpiry] = useState("");
  const [formLot, setFormLot] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");

  const categories = [
    "Todos",
    "Carnes",
    "Harinas y Masas",
    "Lácteos",
    "Verduras",
    "Packaging",
    "Bebidas",
    "Condimentos",
  ];

  const criticalCount = ingredients.filter(
    i => i.status === "CRITICO" || i.status === "AGOTADO"
  ).length;

  const lowCount = ingredients.filter(i => i.status === "BAJO").length;

  const totalValuation = ingredients.reduce(
    (sum, i) => sum + i.currentStock * i.costPerUnit,
    0
  );

  const filteredIngredients = ingredients.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.lotNumber && item.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategory === "Todos" || item.category === selectedCategory;
    const matchesStatus =
      selectedStatus === "Todos" || item.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleOpenCreateModal = () => {
    setEditingIngredient(null);
    setFormCode(`INS-${Date.now().toString().slice(-4)}`);
    setFormName("");
    setFormCategory("Carnes");
    setFormUnit("kg");
    setFormStock(10);
    setFormMinThreshold(5);
    setFormCost(4500);
    setFormExpiry("");
    setFormLot(`LOT-${Date.now().toString().slice(-3)}`);
    setFormImageUrl("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ing: StockIngredientItem) => {
    setEditingIngredient(ing);
    setFormCode(ing.code);
    setFormName(ing.name);
    setFormCategory(ing.category);
    setFormUnit(ing.unit);
    setFormStock(ing.currentStock);
    setFormMinThreshold(ing.minThreshold);
    setFormCost(ing.costPerUnit);
    setFormExpiry(ing.expiryDate || "");
    setFormLot(ing.lotNumber || "");
    setFormImageUrl(ing.imageUrl || "");
    setIsModalOpen(true);
  };

  const handleSaveIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    let calculatedStatus: StockIngredientItem["status"] = "OPTIMO";
    if (formStock <= 0) calculatedStatus = "AGOTADO";
    else if (formStock <= formMinThreshold * 0.5) calculatedStatus = "CRITICO";
    else if (formStock <= formMinThreshold) calculatedStatus = "BAJO";

    if (editingIngredient) {
      updateIngredient(editingIngredient.id, {
        code: formCode,
        name: formName,
        category: formCategory,
        unit: formUnit,
        currentStock: Number(formStock),
        minThreshold: Number(formMinThreshold),
        costPerUnit: Number(formCost),
        status: calculatedStatus,
        expiryDate: formExpiry,
        lotNumber: formLot,
        imageUrl: formImageUrl || editingIngredient.imageUrl,
      });
    } else {
      addIngredient({
        code: formCode || `INS-${Date.now().toString().slice(-4)}`,
        name: formName,
        category: formCategory,
        unit: formUnit,
        currentStock: Number(formStock),
        minThreshold: Number(formMinThreshold),
        costPerUnit: Number(formCost),
        status: calculatedStatus,
        expiryDate: formExpiry || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        lotNumber: formLot || `LOT-${Date.now().toString().slice(-3)}`,
        imageUrl: formImageUrl || "https://images.unsplash.com/photo-1588347818036-558601350947?auto=format&fit=crop&w=400&q=80",
      });
    }
    setIsModalOpen(false);
  };

  const handleExport = (format: string) => {
    setExportSuccess(`Reporte de Stock (${format}) generado exitosamente`);
    setTimeout(() => setExportSuccess(null), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Official Clean Necto Banner (Sin botones ni opciones dentro) */}
      <NectoBanner
        icon={<Package className="w-6 h-6 text-[#FF3F1A]" />}
        title="Inventario de Insumos & Materias Primas"
        description="Control de stock real, fechas de vencimiento FIFO y costo unitario vinculado automáticamente a pedidos y cocina."
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Insumos */}
        <div className="bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                Total Insumos
              </p>
              <h3 className="text-3xl font-black font-mono text-[#212121] dark:text-[#ECECEC] mt-1">
                {ingredients.length}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-xs">
              {ingredients.filter(i => i.status === "OPTIMO").length} en nivel óptimo
            </span>
          </div>
        </div>

        {/* Card 2: Alertas Críticas / Agotados */}
        <div className="bg-white dark:bg-[#18181B] border border-red-200 dark:border-red-900/50 rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-mono font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                Quiebres & Críticos
              </p>
              <h3 className="text-3xl font-black font-mono text-red-600 dark:text-red-400 mt-1">
                {criticalCount}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
            <span className="text-amber-600 dark:text-amber-400 font-bold font-mono text-xs">
              +{lowCount} en punto de reorden
            </span>
          </div>
        </div>

        {/* Card 3: Valorización Total */}
        <div className="bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                Valorización Stock
              </p>
              <h3 className="text-3xl font-black font-mono text-[#212121] dark:text-[#ECECEC] mt-1">
                ${totalValuation.toLocaleString("es-AR")}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#ECECEC] dark:bg-zinc-800 text-[#212121] dark:text-[#ECECEC] border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-medium">Costo de reposición activo</span>
          </div>
        </div>

        {/* Card 4: Movimientos */}
        <div className="bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                Movimientos Auditados
              </p>
              <h3 className="text-3xl font-black font-mono text-[#212121] dark:text-[#ECECEC] mt-1">
                {stockMovements.length}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-medium">Último: {stockMovements[0]?.timestamp || "Hoy"}</span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Listado vs Movimientos Container */}
      <div className="bg-white dark:bg-[#151518] rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80 p-3 sm:p-4 shadow-none space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <SegmentedControl
            intent="insumos.subtab"
            tone="contrast"
            className="w-fit"
            value={activeTab}
            onValueChange={setActiveTab}
            options={[
              { value: "listado", label: `Listado de Insumos (${filteredIngredients.length})` },
              { value: "movimientos", label: `Trazabilidad & Movimientos (${stockMovements.length})` },
            ]}
          />

          {/* Actions: Create & Export */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="accent"
              intent="insumos.create.open"
              onClick={handleOpenCreateModal}
              className="px-3.5 py-1.5 text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Insumo</span>
            </Button>

            <div className="w-[1px] h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 hidden sm:block" />

            <Button
              variant="outline"
              intent="insumos.export.excel"
              onClick={() => handleExport("Excel")}
              className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs hover:border-zinc-300"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </Button>

            <Button
              variant="outline"
              intent="insumos.export.pdf"
              onClick={() => handleExport("PDF")}
              className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs hover:border-zinc-300"
            >
              <Download className="w-3.5 h-3.5 text-red-600" />
              <span>PDF</span>
            </Button>
          </div>
        </div>

        {exportSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-bold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{exportSuccess}</span>
          </div>
        )}

        {/* Tab 1: Listado de Insumos */}
        {activeTab === "listado" && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <SearchInput
                intent="insumos.search"
                className="flex-1"
                placeholder="Buscar insumo por nombre, código o lote..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery("")}
              />

              {/* Status Filter */}
              <Select
                intent="insumos.filter.status"
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                options={[
                  { value: "Todos", label: "Todos los Estados" },
                  { value: "OPTIMO", label: "Óptimo" },
                  { value: "BAJO", label: "Bajo (Reorden)" },
                  { value: "CRITICO", label: "Crítico" },
                  { value: "AGOTADO", label: "Agotado (0)" },
                ]}
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant="ghost"
                  intent="insumos.category.select"
                  onClick={() => setSelectedCategory(cat)}
                  className={`p-0 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-[#190088] text-white shadow-xs font-bold"
                      : "bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                  }`}
                >
                  {cat}
                </Button>
              ))}
            </div>

            {/* Insumos Table */}
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-900/90 text-zinc-500 dark:text-zinc-400 font-extrabold uppercase text-[10px] font-mono tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3.5">Insumo</th>
                    <th className="p-3.5">Categoría</th>
                    <th className="p-3.5 text-right">Stock Actual</th>
                    <th className="p-3.5 text-right">Punto Reorden</th>
                    <th className="p-3.5 text-right">Costo Unitario</th>
                    <th className="p-3.5">Vencimiento FIFO</th>
                    <th className="p-3.5 text-center">Estado</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                  {filteredIngredients.map(ing => {
                    const isDepleted = ing.currentStock <= 0;
                    const isCritical = ing.status === "CRITICO" || isDepleted;
                    const isLow = ing.status === "BAJO";

                    return (
                      <tr
                        key={ing.id}
                        className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors ${
                          isDepleted ? "bg-red-50/20 dark:bg-red-950/10" : ""
                        }`}
                      >
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <SafeImage
                              src={ing.imageUrl}
                              alt={ing.name}
                              className="w-9 h-9 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700"
                            />
                            <div>
                              <p className="font-bold text-[#212121] dark:text-[#ECECEC]">
                                {ing.name}
                              </p>
                              <p className="text-[10px] font-mono text-zinc-400">
                                {ing.code} {ing.lotNumber ? `• ${ing.lotNumber}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-mono font-bold border border-zinc-200/60 dark:border-zinc-700/60">
                            {ing.category}
                          </span>
                        </td>

                        <td className="p-3.5 text-right font-mono font-black text-sm">
                          <span
                            className={
                              isDepleted
                                ? "text-red-600 dark:text-red-400"
                                : isCritical
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-[#212121] dark:text-[#ECECEC]"
                            }
                          >
                            {ing.currentStock} {ing.unit}
                          </span>
                        </td>

                        <td className="p-3.5 text-right font-mono text-zinc-400">
                          {ing.minThreshold} {ing.unit}
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-[#212121] dark:text-[#ECECEC]">
                          ${ing.costPerUnit.toLocaleString("es-AR")}
                        </td>

                        <td className="p-3.5">
                          {ing.expiryDate ? (
                            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 text-[11px] font-mono">
                              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                              <span>{ing.expiryDate}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-[11px]">No perecedero</span>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          {isDepleted ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                              AGOTADO (0)
                            </span>
                          ) : isCritical ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                              CRÍTICO
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              REORDEN
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              ÓPTIMO
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              intent="insumos.edit"
                              onClick={() => handleOpenEditModal(ing)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-[#FF3F1A] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              title="Editar Insumo"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              intent="insumos.delete"
                              onClick={() => deleteIngredient(ing.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                              title="Eliminar Insumo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Movimientos / Auditoría */}
        {activeTab === "movimientos" && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-900/90 text-zinc-500 dark:text-zinc-400 font-extrabold uppercase text-[10px] font-mono tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3.5">Fecha & Hora</th>
                    <th className="p-3.5">Insumo</th>
                    <th className="p-3.5">Tipo de Movimiento</th>
                    <th className="p-3.5 text-right">Cantidad</th>
                    <th className="p-3.5">Detalle / Motivo</th>
                    <th className="p-3.5">Registrado Por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                  {stockMovements.map(mov => {
                    const isPositive = mov.quantity > 0;
                    return (
                      <tr key={mov.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="p-3.5 text-zinc-500 font-mono text-[11px]">
                          {mov.timestamp}
                        </td>
                        <td className="p-3.5 font-bold text-[#212121] dark:text-[#ECECEC]">
                          {mov.ingredientName}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                              mov.type === "INGRESO_PROVEEDOR"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : mov.type === "VENTA_PEDIDO"
                                ? "bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] border-[#190088]/20"
                                : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                            }`}
                          >
                            {mov.type.replace("_", " ")}
                          </span>
                        </td>
                        <td
                          className={`p-3.5 text-right font-mono font-black ${
                            isPositive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {isPositive ? `+${mov.quantity}` : mov.quantity} {mov.unit}
                        </td>
                        <td className="p-3.5 text-zinc-600 dark:text-zinc-300 text-[11px]">
                          {mov.reason}
                          {mov.orderId && (
                            <span className="ml-1 text-[#FF3F1A] font-mono font-bold">
                              #{mov.orderId}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-zinc-500 font-mono text-[11px]">
                          {mov.registeredBy}
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

      {/* Create / Edit Insumo Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#190088] text-white flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#212121] dark:text-[#ECECEC]">
                  {editingIngredient ? "Editar Insumo" : "Nuevo Insumo / Materia Prima"}
                </h3>
              </div>
              <Button
                variant="ghost"
                intent="insumos.modal.close"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 p-0 rounded-xl text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveIngredient} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Código SKU"
                  labelStyle="bold"
                  mono
                  intent="insumos.form.code"
                  type="text"
                  value={formCode}
                  onChange={e => setFormCode(e.target.value)}
                  required
                />

                <Select
                  label="Categoría"
                  intent="insumos.form.category"
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as any)}
                  options={categories.filter(c => c !== "Todos").map(c => ({ value: c, label: c }))}
                />
              </div>

              <Field
                label="Nombre del Insumo / Materia Prima"
                labelStyle="bold"
                intent="insumos.form.name"
                type="text"
                placeholder="Ej: Carne Vacuna Especial (Nalga/Bola de Lomo)"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                required
              />

              <div className="grid grid-cols-3 gap-3">
                <Select
                  label="Unidad"
                  intent="insumos.form.unit"
                  value={formUnit}
                  onChange={e => setFormUnit(e.target.value as any)}
                  options={[
                    { value: "kg", label: "kg (Kilogramos)" },
                    { value: "gr", label: "gr (Gramos)" },
                    { value: "lt", label: "lt (Litros)" },
                    { value: "ml", label: "ml (Mililitros)" },
                    { value: "unid", label: "unid (Unidades)" },
                    { value: "paquete", label: "paquete" },
                  ]}
                />

                <Field
                  label="Stock Actual"
                  labelStyle="bold"
                  mono
                  intent="insumos.form.stock"
                  type="number"
                  step="0.01"
                  value={formStock}
                  onChange={e => setFormStock(parseFloat(e.target.value) || 0)}
                  required
                />

                <Field
                  label="Punto Reorden"
                  labelStyle="bold"
                  mono
                  intent="insumos.form.threshold"
                  type="number"
                  step="0.01"
                  value={formMinThreshold}
                  onChange={e => setFormMinThreshold(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Costo Unitario ($)"
                  labelStyle="bold"
                  mono
                  intent="insumos.form.cost"
                  type="number"
                  value={formCost}
                  onChange={e => setFormCost(parseFloat(e.target.value) || 0)}
                />

                <Field
                  label="Lote Proveedor"
                  labelStyle="bold"
                  mono
                  intent="insumos.form.lot"
                  type="text"
                  placeholder="LOT-2026-X"
                  value={formLot}
                  onChange={e => setFormLot(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Fecha Vencimiento (FIFO)"
                  labelStyle="bold"
                  intent="insumos.form.expiry"
                  type="date"
                  value={formExpiry}
                  onChange={e => setFormExpiry(e.target.value)}
                />

                <Field
                  label="URL Imagen (Opcional)"
                  labelStyle="bold"
                  intent="insumos.form.image"
                  type="text"
                  placeholder="https://images.unsplash..."
                  value={formImageUrl}
                  onChange={e => setFormImageUrl(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#374151] flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  intent="insumos.modal.cancel"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  intent="insumos.modal.submit"
                  className="px-5 py-2 text-xs"
                >
                  {editingIngredient ? "Guardar Cambios" : "Crear Insumo"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
