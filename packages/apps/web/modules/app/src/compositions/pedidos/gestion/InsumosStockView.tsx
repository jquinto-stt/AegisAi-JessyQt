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
import {
  Button,
  Field,
  Select,
  Badge,
  SegmentedControl,
  SearchInput,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  Card,
  Modal,
} from "@/elements";

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
    if (!formName.trim() || !formCode.trim()) return;

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
        expiryDate: formExpiry || undefined,
        lotNumber: formLot || undefined,
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

  const handleExport = (type: "Excel" | "PDF") => {
    setExportSuccess(`Reporte de Stock (${type}) generado correctamente`);
    setTimeout(() => setExportSuccess(null), 3500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <NectoBanner
        icon={<Package className="w-6 h-6 text-brand-500" />}
        title="Inventario de Insumos & Materias Primas"
        description="Control de stock real, fechas de vencimiento FIFO y costo unitario vinculado automáticamente a pedidos y cocina."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-theme-xs space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Total Insumos
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold font-mono text-gray-900 dark:text-white mt-1">
                {ingredients.length}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-secondary-600/10 text-secondary-600 dark:text-secondary-400 border border-secondary-600/20 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
              {ingredients.filter(i => i.status === "OPTIMO").length} en nivel óptimo
            </span>
          </div>
        </Card>

        <Card className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/50 rounded-2xl p-5 shadow-theme-xs space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                Quiebres & Críticos
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">
                {criticalCount}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
            <span className="text-amber-600 dark:text-amber-400 font-semibold text-xs">
              +{lowCount} en punto de reorden
            </span>
          </div>
        </Card>

        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-theme-xs space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Valorización Stock
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold font-mono text-gray-900 dark:text-white mt-1">
                ${totalValuation.toLocaleString("es-AR")}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Costo de reposición activo</span>
          </div>
        </Card>

        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-theme-xs space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Movimientos Auditados
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold font-mono text-gray-900 dark:text-white mt-1">
                {stockMovements.length}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Último: {stockMovements[0]?.timestamp || "Hoy"}</span>
          </div>
        </Card>
      </div>

      <Card className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-theme-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
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

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              intent="insumos.create.open"
              onClick={handleOpenCreateModal}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Insumo</span>
            </Button>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-800 mx-1 hidden sm:block" />

            <Button
              variant="outline"
              size="sm"
              intent="insumos.export.excel"
              onClick={() => handleExport("Excel")}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              intent="insumos.export.pdf"
              onClick={() => handleExport("PDF")}
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

        {activeTab === "listado" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <SearchInput
                intent="insumos.search"
                className="flex-1"
                placeholder="Buscar insumo por nombre, código o lote..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery("")}
              />
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

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-secondary-600 text-white shadow-theme-xs font-bold"
                      : "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800">
                  <TableRow>
                    <TableCell isHeader className="p-3.5">Insumo</TableCell>
                    <TableCell isHeader className="p-3.5">Categoría</TableCell>
                    <TableCell isHeader className="p-3.5 text-right">Stock Actual</TableCell>
                    <TableCell isHeader className="p-3.5 text-right">Punto Reorden</TableCell>
                    <TableCell isHeader className="p-3.5 text-right">Costo Unitario</TableCell>
                    <TableCell isHeader className="p-3.5">Vencimiento FIFO</TableCell>
                    <TableCell isHeader className="p-3.5 text-center">Estado</TableCell>
                    <TableCell isHeader className="p-3.5 text-right">Acciones</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                  {filteredIngredients.map(ing => {
                    const isDepleted = ing.currentStock <= 0;
                    const isCritical = ing.status === "CRITICO" || isDepleted;
                    const isLow = ing.status === "BAJO";

                    return (
                      <TableRow
                        key={ing.id}
                        className={`hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors ${
                          isDepleted ? "bg-red-50/20 dark:bg-red-950/10" : ""
                        }`}
                      >
                        <TableCell className="p-3.5">
                          <div className="flex items-center gap-3">
                            <SafeImage
                              src={ing.imageUrl}
                              alt={ing.name}
                              className="w-9 h-9 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                            />
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {ing.name}
                              </p>
                              <p className="text-[10px] font-mono text-gray-400">
                                {ing.code} {ing.lotNumber ? `• ${ing.lotNumber}` : ""}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="p-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[11px] font-mono font-medium border border-gray-200/60 dark:border-gray-700/60">
                            {ing.category}
                          </span>
                        </TableCell>

                        <TableCell className="p-3.5 text-right font-mono font-bold text-sm">
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
                        </TableCell>

                        <TableCell className="p-3.5 text-right font-mono text-gray-400">
                          {ing.minThreshold} {ing.unit}
                        </TableCell>

                        <TableCell className="p-3.5 text-right font-mono font-bold text-gray-900 dark:text-white">
                          ${ing.costPerUnit.toLocaleString("es-AR")}
                        </TableCell>

                        <TableCell className="p-3.5">
                          {ing.expiryDate ? (
                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 text-[11px] font-mono">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span>{ing.expiryDate}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-[11px]">No perecedero</span>
                          )}
                        </TableCell>

                        <TableCell className="p-3.5 text-center">
                          {isDepleted ? (
                            <Badge variant="light" color="error" size="sm">Agotado</Badge>
                          ) : isCritical ? (
                            <Badge variant="light" color="error" size="sm">Crítico</Badge>
                          ) : isLow ? (
                            <Badge variant="light" color="warning" size="sm">Reorden</Badge>
                          ) : (
                            <Badge variant="light" color="success" size="sm">Óptimo</Badge>
                          )}
                        </TableCell>

                        <TableCell className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              intent="insumos.edit"
                              onClick={() => handleOpenEditModal(ing)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-white"
                              title="Editar Insumo"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              intent="insumos.delete"
                              onClick={() => deleteIngredient(ing.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                              title="Eliminar Insumo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === "movimientos" && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800">
                  <TableRow>
                    <TableCell isHeader className="p-3.5">Fecha & Hora</TableCell>
                    <TableCell isHeader className="p-3.5">Insumo</TableCell>
                    <TableCell isHeader className="p-3.5">Tipo de Movimiento</TableCell>
                    <TableCell isHeader className="p-3.5 text-right">Cantidad</TableCell>
                    <TableCell isHeader className="p-3.5">Detalle / Motivo</TableCell>
                    <TableCell isHeader className="p-3.5">Registrado Por</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                  {stockMovements.map(mov => {
                    const isPositive = mov.quantity > 0;
                    return (
                      <TableRow key={mov.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                        <TableCell className="p-3.5 text-gray-500 font-mono text-[11px]">
                          {mov.timestamp}
                        </TableCell>
                        <TableCell className="p-3.5 font-bold text-gray-900 dark:text-white">
                          {mov.ingredientName}
                        </TableCell>
                        <TableCell className="p-3.5">
                          <Badge
                            variant="light"
                            color={
                              mov.type === "INGRESO_PROVEEDOR"
                                ? "success"
                                : mov.type === "VENTA_PEDIDO"
                                ? "brand"
                                : "error"
                            }
                            size="sm"
                          >
                            {mov.type.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`p-3.5 text-right font-mono font-bold ${
                            isPositive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {isPositive ? `+${mov.quantity}` : mov.quantity} {mov.unit}
                        </TableCell>
                        <TableCell className="p-3.5 text-gray-600 dark:text-gray-300 text-[11px]">
                          {mov.reason}
                          {mov.orderId && (
                            <span className="ml-1 text-brand-500 font-mono font-bold">
                              #{mov.orderId}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="p-3.5 text-gray-500 font-mono text-[11px]">
                          {mov.registeredBy}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-lg p-6 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xl"
      >
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-secondary-600 text-white flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {editingIngredient ? "Editar Insumo" : "Nuevo Insumo / Materia Prima"}
            </h3>
          </div>
        </div>

        <form onSubmit={handleSaveIngredient} className="mt-4 space-y-4">
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

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              intent="insumos.modal.cancel"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              intent="insumos.modal.submit"
            >
              {editingIngredient ? "Guardar Cambios" : "Crear Insumo"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
