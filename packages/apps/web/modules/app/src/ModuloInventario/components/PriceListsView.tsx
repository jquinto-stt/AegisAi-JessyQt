import React, { useState } from "react";
import {
  Tag,
  Plus,
  Percent,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  Star,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  Search,
  HelpCircle,
} from "lucide-react";
import { PriceList, InventoryProduct } from "../types/inventory.types";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  Button,
  Modal,
  Input,
  Label,
} from "../../elements";

interface PriceListsViewProps {
  priceLists: PriceList[];
  products: InventoryProduct[];
  onSavePriceList: (data: Partial<PriceList> & { name: string }) => Promise<PriceList>;
  onDeletePriceList: (id: string) => Promise<boolean>;
  onSetDefaultPriceList: (id: string) => Promise<void>;
  calculateProductPrice: (product: InventoryProduct, listId?: string) => {
    finalPrice: number;
    basePrice: number;
    differencePercent: number;
    appliedList?: PriceList;
  };
}

export const PriceListsView: React.FC<PriceListsViewProps> = ({
  priceLists,
  products,
  onSavePriceList,
  onDeletePriceList,
  onSetDefaultPriceList,
  calculateProductPrice,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<PriceList | null>(null);
  const [selectedPreviewListId, setSelectedPreviewListId] = useState<string>(
    priceLists[0]?.id || "pl-general"
  );
  const [previewSearch, setPreviewSearch] = useState("");

  // Modal Form State
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<"percentage" | "custom">("percentage");
  const [formPercentage, setFormPercentage] = useState("0");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCreate = () => {
    setEditingList(null);
    setFormName("");
    setFormCode("");
    setFormDescription("");
    setFormType("percentage");
    setFormPercentage("0");
    setFormIsDefault(false);
    setFormStatus("active");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (list: PriceList) => {
    setEditingList(list);
    setFormName(list.name);
    setFormCode(list.code);
    setFormDescription(list.description || "");
    setFormType(list.type);
    setFormPercentage(String(list.percentage ?? 0));
    setFormIsDefault(list.isDefault);
    setFormStatus(list.status);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("El nombre de la lista es obligatorio.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      await onSavePriceList({
        id: editingList?.id,
        name: formName.trim(),
        code: formCode.trim() || formName.trim().toUpperCase().replace(/\s+/g, "-").slice(0, 15),
        description: formDescription.trim(),
        type: formType,
        percentage: parseFloat(formPercentage) || 0,
        isDefault: formIsDefault,
        status: formStatus,
      });

      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || "Error al guardar la lista de precios.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (list: PriceList) => {
    if (list.isDefault) {
      alert("No podés eliminar la lista de precios predeterminada.");
      return;
    }
    if (confirm(`¿Seguro que deseás eliminar la lista de precios "${list.name}"?`)) {
      try {
        await onDeletePriceList(list.id);
        if (selectedPreviewListId === list.id) {
          setSelectedPreviewListId(priceLists[0]?.id || "pl-general");
        }
      } catch (err: any) {
        alert(err?.message || "Error al eliminar la lista.");
      }
    }
  };

  const defaultList = priceLists.find((p) => p.isDefault) || priceLists[0];
  const activePreviewList = priceLists.find((p) => p.id === selectedPreviewListId) || defaultList;

  const filteredPreviewProducts = products
    .filter((p) => {
      if (!previewSearch.trim()) return true;
      const q = previewSearch.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    })
    .slice(0, 8);

  return (
    <div className="space-y-6 animate-fade-in text-gray-800 dark:text-gray-100">
      {/* ── 1. Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center">
              <Tag className="size-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Listas de Precios
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Administra diferentes listas de tarifas para ventas por mayor, convenios, canales digitales o clientes VIP.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          startIcon={<Plus className="size-4" />}
          onClick={handleOpenCreate}
        >
          Nueva lista de precios
        </Button>
      </div>

      {/* ── 2. Metric Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-theme-xs">
          <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
            Total Listas
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
              {priceLists.length}
            </span>
            <span className="text-xs text-success-600 dark:text-success-400 font-medium">
              {priceLists.filter((p) => p.status === "active").length} activas
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-theme-xs">
          <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
            Lista Predeterminada
          </span>
          <div className="flex items-center gap-2 mt-1">
            <Star className="size-4 text-warning-500 fill-warning-500" />
            <span className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {defaultList?.name || "Lista General"}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-theme-xs">
          <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
            Regla Comercial Base
          </span>
          <div className="flex items-center gap-2 mt-1">
            <Percent className="size-4 text-brand-500" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Descuentos dinámicos sobre precio de venta base
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. List of Price Lists Table ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-gray-400" />
            <span className="text-xs uppercase font-semibold text-gray-700 dark:text-gray-300 tracking-wider">
              Listas Configuradas
            </span>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            {priceLists.length} tarifas registradas
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader>Nombre / Código</TableCell>
              <TableCell isHeader>Tipo & Ajuste</TableCell>
              <TableCell isHeader>Descripción</TableCell>
              <TableCell isHeader>Estado</TableCell>
              <TableCell isHeader className="text-right">Acciones</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priceLists.map((list) => {
              const isSelectedForPreview = selectedPreviewListId === list.id;
              const percentage = list.percentage ?? 0;
              const isDiscount = percentage < 0;
              const isMarkup = percentage > 0;

              return (
                <TableRow
                  key={list.id}
                  onClick={() => setSelectedPreviewListId(list.id)}
                  className={`hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer ${
                    isSelectedForPreview
                      ? "bg-brand-50/30 dark:bg-brand-500/5 border-l-4 border-l-brand-500"
                      : ""
                  }`}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {list.name}
                        </span>
                        {list.isDefault && (
                          <Badge variant="light" color="warning" size="sm">
                            <Star className="size-2.5 fill-current mr-1 inline" />
                            Predeterminada
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs font-mono text-gray-400">
                        {list.code}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    {list.type === "percentage" ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                        {isDiscount ? (
                          <ArrowDownRight className="size-3.5 text-error-500" />
                        ) : isMarkup ? (
                          <ArrowUpRight className="size-3.5 text-success-500" />
                        ) : (
                          <Percent className="size-3.5 text-gray-400" />
                        )}
                        <span
                          className={
                            isDiscount
                              ? "text-error-600 dark:text-error-400 font-semibold"
                              : isMarkup
                              ? "text-success-600 dark:text-success-400 font-semibold"
                              : "text-gray-600 dark:text-gray-400"
                          }
                        >
                          {percentage > 0 ? `+${percentage}%` : `${percentage}%`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-brand-500">
                        Precios manuales
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-gray-500 dark:text-gray-400 max-w-xs truncate text-xs">
                    {list.description || "Sin descripción"}
                  </TableCell>

                  <TableCell>
                    {list.status === "active" ? (
                      <Badge variant="light" color="success" size="sm">
                        <CheckCircle2 className="size-3 mr-1 inline" />
                        Activa
                      </Badge>
                    ) : (
                      <Badge variant="light" color="light" size="sm">
                        Inactiva
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!list.isDefault && (
                        <button
                          type="button"
                          onClick={() => onSetDefaultPriceList(list.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-500/10 transition-colors cursor-pointer"
                          title="Establecer como predeterminada"
                        >
                          <Star className="size-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(list)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        title="Editar lista"
                      >
                        <Edit3 className="size-3.5" />
                      </button>
                      {!list.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDelete(list)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors cursor-pointer"
                          title="Eliminar lista"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── 4. Interactive Simulation / Live Price Preview ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5 shadow-theme-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-brand-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Simulador de Precios en Vivo: {activePreviewList?.name}
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Visualiza en tiempo real el precio de venta final que verán los clientes bajo esta lista.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar producto a simular..."
              value={previewSearch}
              onChange={(e) => setPreviewSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-white focus:outline-hidden focus:border-brand-500 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredPreviewProducts.map((prod) => {
            const priceInfo = calculateProductPrice(prod, activePreviewList?.id);
            const isDifferent = priceInfo.finalPrice !== priceInfo.basePrice;

            return (
              <div
                key={prod.id}
                className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-mono text-gray-400">{prod.sku}</div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-1 mt-0.5">
                    {prod.name}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {prod.category}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-200 dark:border-gray-800 flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] text-gray-400">Base: </span>
                    <span className="text-xs font-mono line-through text-gray-400">
                      ${prod.salePrice.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-brand-500">
                      ${priceInfo.finalPrice.toLocaleString()}
                    </div>
                    {isDifferent && (
                      <span
                        className={`text-[10px] font-semibold ${
                          priceInfo.differencePercent < 0 ? "text-error-500" : "text-success-500"
                        }`}
                      >
                        {priceInfo.differencePercent > 0 ? `+` : ""}
                        {priceInfo.differencePercent}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 5. Modal Create / Edit Price List ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-md p-6"
      >
        <div className="flex items-center gap-2 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="size-7 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center">
            <Tag className="size-4" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            {editingList ? "Editar lista de precios" : "Nueva lista de precios"}
          </h3>
        </div>

        <form onSubmit={handleSave} className="space-y-4 mt-4">
          {formError && (
            <div className="p-3 rounded-xl bg-error-50 dark:bg-error-500/10 border border-error-200 dark:border-error-500/20 text-error-600 dark:text-error-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="formName">Nombre de la lista *</Label>
            <Input
              id="formName"
              type="text"
              placeholder="Ej: Mayorista (-15%), Club VIP..."
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="formCode">Código identificador</Label>
            <Input
              id="formCode"
              type="text"
              placeholder="Ej: MAYORISTA, VIP, ECOMMERCE"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value.toUpperCase())}
              className="font-mono uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de cálculo</Label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-white focus:outline-hidden focus:border-brand-500"
              >
                <option value="percentage">Porcentaje general</option>
                <option value="custom">Manual por producto</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <span>Ajuste (%)</span>
                <HelpCircle className="size-3 text-gray-400" title="Negativo para descuento (-15), positivo para margen (+20)" />
              </Label>
              <Input
                type="number"
                step="0.1"
                placeholder="Ej: -15 o +10"
                disabled={formType === "custom"}
                value={formPercentage}
                onChange={(e) => setFormPercentage(e.target.value)}
                className="font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="formDescription">Descripción / Regla de aplicación</Label>
            <textarea
              id="formDescription"
              rows={2}
              placeholder="Detalles sobre quién aplica o condiciones mínimas..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-white focus:outline-hidden focus:border-brand-500 resize-none"
            />
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsDefault}
                onChange={(e) => setFormIsDefault(e.target.checked)}
                className="size-4 rounded text-brand-500 focus:ring-brand-500 border-gray-300 dark:border-gray-700 accent-brand-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  Establecer como lista predeterminada
                </span>
                <p className="text-[11px] text-gray-400">
                  Será la lista aplicada en nuevas ventas y consultas estándar.
                </p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formStatus === "active"}
                onChange={(e) => setFormStatus(e.target.checked ? "active" : "inactive")}
                className="size-4 rounded text-brand-500 focus:ring-brand-500 border-gray-300 dark:border-gray-700 accent-brand-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  Lista activa
                </span>
              </div>
            </label>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Guardando..." : editingList ? "Guardar cambios" : "Crear lista"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

