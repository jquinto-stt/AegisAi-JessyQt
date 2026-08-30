import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { StockIngredientItem } from "../types";
import {
  Layers,
  Search,
  Plus,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle2,
  Package,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingDown,
  FileSpreadsheet,
  Edit3,
  Trash2,
  Calendar,
  DollarSign,
  History,
  ShieldAlert,
  Sparkles,
  Camera,
  ChevronRight,
  X,
} from "lucide-react";
import { SafeImage } from "../shared/SafeImage";
import { NectoBanner } from "../shared/NectoBanner";

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

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de eliminar este insumo del inventario?")) {
      deleteIngredient(id);
    }
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
        <div className="bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] rounded-2xl p-4 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Total Insumos
              </p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                {ingredients.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-[#FF3F1A] border border-orange-200 dark:border-orange-800 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {ingredients.filter(i => i.status === "OPTIMO").length} en nivel óptimo
            </span>
          </div>
        </div>

        {/* Card 2: Alertas Críticas / Agotados */}
        <div className="bg-white dark:bg-[#2C2D31] border-2 border-red-200 dark:border-red-900/60 rounded-2xl p-4 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                Quiebres & Críticos
              </p>
              <h3 className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">
                {criticalCount}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 border border-red-200 dark:border-red-800 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between text-xs">
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              +{lowCount} en punto de reorden
            </span>
          </div>
        </div>

        {/* Card 3: Valorización Total */}
        <div className="bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] rounded-2xl p-4 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Valorización Stock
              </p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                ${totalValuation.toLocaleString("es-AR")}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Costo de reposición activo</span>
          </div>
        </div>

        {/* Card 4: Movimientos */}
        <div className="bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] rounded-2xl p-4 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Movimientos Auditados
              </p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                {stockMovements.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-slate-200 dark:border-gray-700 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Último: {stockMovements[0]?.timestamp || "Hoy"}</span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Listado vs Movimientos */}
      <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-gray-800 pb-3">
          <div className="flex bg-slate-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("listado")}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeTab === "listado"
                  ? "bg-white dark:bg-[#2C2D31] text-[#FF3F1A] shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Listado de Insumos ({filteredIngredients.length})
            </button>
            <button
              onClick={() => setActiveTab("movimientos")}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeTab === "movimientos"
                  ? "bg-white dark:bg-[#2C2D31] text-[#FF3F1A] shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Trazabilidad & Movimientos ({stockMovements.length})
            </button>
          </div>

          {/* Actions: Create & Export */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenCreateModal}
              className="px-3.5 py-1.5 bg-[#FF3F1A] hover:bg-[#e03413] text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Insumo</span>
            </button>

            <div className="w-[1px] h-6 bg-slate-200 dark:bg-gray-700 mx-1 hidden sm:block" />

            <button
              onClick={() => handleExport("Excel")}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>

            <button
              onClick={() => handleExport("PDF")}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-red-600" />
              <span>PDF</span>
            </button>
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
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar insumo por nombre, código o lote..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs font-medium pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1E1F23] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#FF3F1A]"
                />
              </div>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1E1F23] text-gray-700 dark:text-gray-300 focus:outline-none"
              >
                <option value="Todos">Todos los Estados</option>
                <option value="OPTIMO">Óptimo</option>
                <option value="BAJO">Bajo (Reorden)</option>
                <option value="CRITICO">Crítico</option>
                <option value="AGOTADO">Agotado (0)</option>
              </select>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-[#FF3F1A] text-white shadow-xs"
                      : "bg-slate-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Insumos Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-gray-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-gray-700">
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
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700/60 font-medium">
                  {filteredIngredients.map(ing => {
                    const isDepleted = ing.currentStock <= 0;
                    const isCritical = ing.status === "CRITICO" || isDepleted;
                    const isLow = ing.status === "BAJO";

                    return (
                      <tr
                        key={ing.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-gray-800/50 transition-colors ${
                          isDepleted ? "bg-red-50/20 dark:bg-red-950/10" : ""
                        }`}
                      >
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <SafeImage
                              src={ing.imageUrl}
                              alt={ing.name}
                              className="w-9 h-9 rounded-lg object-cover"
                            />
                            <div>
                              <p className="font-extrabold text-gray-900 dark:text-gray-100">
                                {ing.name}
                              </p>
                              <p className="text-[10px] font-mono text-gray-400">
                                {ing.code} {ing.lotNumber ? `• ${ing.lotNumber}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[11px] font-bold">
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
                                : "text-gray-900 dark:text-white"
                            }
                          >
                            {ing.currentStock} {ing.unit}
                          </span>
                        </td>

                        <td className="p-3.5 text-right font-mono text-gray-500">
                          {ing.minThreshold} {ing.unit}
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-gray-900 dark:text-gray-200">
                          ${ing.costPerUnit.toLocaleString("es-AR")}
                        </td>

                        <td className="p-3.5">
                          {ing.expiryDate ? (
                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 text-[11px]">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span>{ing.expiryDate}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-[11px]">No perecedero</span>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          {isDepleted ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
                              AGOTADO (0)
                            </span>
                          ) : isCritical ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
                              CRÍTICO
                            </span>
                          ) : isLow ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              REORDEN
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              ÓPTIMO
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(ing)}
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-800 cursor-pointer"
                              title="Editar Insumo"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteIngredient(ing.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-500 hover:text-red-700 cursor-pointer"
                              title="Eliminar Insumo"
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
          </div>
        )}

        {/* Tab 2: Movimientos / Auditoría */}
        {activeTab === "movimientos" && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-gray-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-gray-700">
                  <tr>
                    <th className="p-3.5">Fecha & Hora</th>
                    <th className="p-3.5">Insumo</th>
                    <th className="p-3.5">Tipo de Movimiento</th>
                    <th className="p-3.5 text-right">Cantidad</th>
                    <th className="p-3.5">Detalle / Motivo</th>
                    <th className="p-3.5">Registrado Por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700/60 font-medium">
                  {stockMovements.map(mov => {
                    const isPositive = mov.quantity > 0;
                    return (
                      <tr key={mov.id} className="hover:bg-slate-50/80 dark:hover:bg-gray-800/50">
                        <td className="p-3.5 text-gray-500 font-mono text-[11px]">
                          {mov.timestamp}
                        </td>
                        <td className="p-3.5 font-bold text-gray-900 dark:text-gray-100">
                          {mov.ingredientName}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              mov.type === "INGRESO_PROVEEDOR"
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300"
                                : mov.type === "VENTA_PEDIDO"
                                ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300"
                                : "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300"
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
                        <td className="p-3.5 text-gray-600 dark:text-gray-300 text-[11px]">
                          {mov.reason}
                          {mov.orderId && (
                            <span className="ml-1 text-[#FF3F1A] font-mono font-bold">
                              #{mov.orderId}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-gray-500 text-[11px]">
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
          <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 dark:border-[#374151] flex items-center justify-between bg-slate-50/70 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FF3F1A] text-white flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white">
                  {editingIngredient ? "Editar Insumo" : "Nuevo Insumo / Materia Prima"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-200 dark:hover:bg-gray-700 text-gray-400 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIngredient} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Código SKU
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={e => setFormCode(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1E1F23] font-mono text-gray-900 dark:text-gray-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Categoría
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1E1F23] text-gray-900 dark:text-gray-100"
                  >
                    {categories.filter(c => c !== "Todos").map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del Insumo / Materia Prima
                </label>
                <input
                  type="text"
                  placeholder="Ej: Carne Vacuna Especial (Nalga/Bola de Lomo)"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1E1F23] text-gray-900 dark:text-gray-100"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Unidad
                  </label>
                  <select
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1E1F23] text-gray-900 dark:text-gray-100"
                  >
                    <option value="kg">kg (Kilogramos)</option>
                    <option value="gr">gr (Gramos)</option>
                    <option value="lt">lt (Litros)</option>
                    <option value="ml">ml (Mililitros)</option>
                    <option value="unid">unid (Unidades)</option>
                    <option value="paquete">paquete</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Stock Actual
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formStock}
                    onChange={e => setFormStock(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1E1F23] text-gray-900 dark:text-gray-100 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Punto Reorden
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formMinThreshold}
                    onChange={e => setFormMinThreshold(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1E1F23] text-gray-900 dark:text-gray-100 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Costo Unitario ($)
                  </label>
                  <input
                    type="number"
                    value={formCost}
                    onChange={e => setFormCost(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1E1F23] text-gray-900 dark:text-gray-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Lote Proveedor
                  </label>
                  <input
                    type="text"
                    placeholder="LOT-2026-X"
                    value={formLot}
                    onChange={e => setFormLot(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1E1F23] text-gray-900 dark:text-gray-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Fecha Vencimiento (FIFO)
                  </label>
                  <input
                    type="date"
                    value={formExpiry}
                    onChange={e => setFormExpiry(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1E1F23] text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    URL Imagen (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash..."
                    value={formImageUrl}
                    onChange={e => setFormImageUrl(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1E1F23] text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#374151] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#FF3F1A] hover:bg-[#e03413] shadow-sm cursor-pointer"
                >
                  {editingIngredient ? "Guardar Cambios" : "Crear Insumo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
