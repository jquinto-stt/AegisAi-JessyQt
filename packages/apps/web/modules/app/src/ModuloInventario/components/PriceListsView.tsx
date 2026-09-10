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
  X,
  HelpCircle,
  Search,
} from "lucide-react";
import { PriceList, InventoryProduct } from "../types/inventory.types";

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
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* ── 1. Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF3F1A]/10 text-[#FF3F1A] flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0f172a] dark:text-white">
              Listas de Precios
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Administra diferentes listas de tarifas para ventas por mayor, convenios, canales digitales o clientes VIP.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl bg-[#FF3F1A] hover:bg-[#E03513] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva lista de precios</span>
        </button>
      </div>

      {/* ── 2. Metric Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
            Total Listas
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {priceLists.length}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">
              {priceLists.filter((p) => p.status === "active").length} activas
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
            Lista Predeterminada
          </span>
          <div className="flex items-center gap-2 mt-1">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-base font-black text-slate-900 dark:text-white truncate">
              {defaultList?.name || "Lista General"}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
            Regla Comercial Base
          </span>
          <div className="flex items-center gap-2 mt-1">
            <Percent className="w-4 h-4 text-[#FF3F1A]" />
            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Descuentos dinámicos sobre precio de venta base
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. List of Price Lists Table ── */}
      <div className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Listas Configuradas
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {priceLists.length} tarifas registradas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-zinc-800/80 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase bg-slate-50/50 dark:bg-zinc-900/50">
                <th className="py-3 px-4">Nombre / Código</th>
                <th className="py-3 px-4">Tipo & Ajuste</th>
                <th className="py-3 px-4">Descripción</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-medium">
              {priceLists.map((list) => {
                const isSelectedForPreview = selectedPreviewListId === list.id;
                const percentage = list.percentage ?? 0;
                const isDiscount = percentage < 0;
                const isMarkup = percentage > 0;

                return (
                  <tr
                    key={list.id}
                    onClick={() => setSelectedPreviewListId(list.id)}
                    className={`hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer ${
                      isSelectedForPreview
                        ? "bg-orange-50/40 dark:bg-[#FF3F1A]/5 border-l-4 border-l-[#FF3F1A]"
                        : ""
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {list.name}
                            </span>
                            {list.isDefault && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                Predeterminada
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {list.code}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {list.type === "percentage" ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                          {isDiscount ? (
                            <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                          ) : isMarkup ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Percent className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span
                            className={
                              isDiscount
                                ? "text-rose-600 dark:text-rose-400"
                                : isMarkup
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-slate-600 dark:text-zinc-400"
                            }
                          >
                            {percentage > 0 ? `+${percentage}%` : `${percentage}%`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                          Precios manuales
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 dark:text-zinc-400 max-w-xs truncate">
                      {list.description || "Sin descripción"}
                    </td>

                    <td className="py-3.5 px-4">
                      {list.status === "active" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500">
                          Inactiva
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!list.isDefault && (
                          <button
                            type="button"
                            onClick={() => onSetDefaultPriceList(list.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                            title="Establecer como predeterminada"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(list)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Editar lista"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {!list.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleDelete(list)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Eliminar lista"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. Interactive Simulation / Live Price Preview ── */}
      <div className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#FF3F1A]" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Simulador de Precios en Vivo: {activePreviewList?.name}
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Visualiza en tiempo real el precio de venta final que verán los clientes bajo esta lista.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar producto a simular..."
              value={previewSearch}
              onChange={(e) => setPreviewSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A]"
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
                className="p-3.5 rounded-xl border border-slate-200/70 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 flex flex-col justify-between"
              >
                <div>
                  <div className="text-[10px] font-mono text-slate-400">{prod.sku}</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 mt-0.5">
                    {prod.name}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                    {prod.category}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-zinc-800/60 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400">Base: </span>
                    <span className="text-xs font-mono font-semibold line-through text-slate-400">
                      ${prod.salePrice.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-mono font-black text-[#FF3F1A]">
                      ${priceInfo.finalPrice.toLocaleString()}
                    </div>
                    {isDifferent && (
                      <span
                        className={`text-[9px] font-bold ${
                          priceInfo.differencePercent < 0 ? "text-rose-500" : "text-emerald-500"
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#18181B] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#FF3F1A]" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {editingList ? "Editar lista de precios" : "Nueva lista de precios"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Nombre de la lista *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Mayorista (-15%), Club VIP..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A]"
                  required
                />
              </div>

              {/* Code */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Código identificador
                </label>
                <input
                  type="text"
                  placeholder="Ej: MAYORISTA, VIP, ECOMMERCE"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-xl text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A]"
                />
              </div>

              {/* Type and Percentage */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Tipo de cálculo
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A]"
                  >
                    <option value="percentage">Porcentaje general</option>
                    <option value="custom">Manual por producto</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                    <span>Ajuste (%)</span>
                    <HelpCircle className="w-3 h-3 text-slate-400" title="Negativo para descuento (-15), positivo para margen (+20)" />
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej: -15 o +10"
                    disabled={formType === "custom"}
                    value={formPercentage}
                    onChange={(e) => setFormPercentage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A] disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Descripción / Regla de aplicación
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre quién aplica o condiciones mínimas..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A] resize-none"
                />
              </div>

              {/* Options */}
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-[#FF3F1A] focus:ring-[#FF3F1A] border-slate-300 dark:border-zinc-700 accent-[#FF3F1A]"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 dark:text-zinc-200">
                      Establecer como lista predeterminada
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Será la lista aplicada en nuevas ventas y consultas estándar.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formStatus === "active"}
                    onChange={(e) => setFormStatus(e.target.checked ? "active" : "inactive")}
                    className="w-4 h-4 rounded text-[#FF3F1A] focus:ring-[#FF3F1A] border-slate-300 dark:border-zinc-700 accent-[#FF3F1A]"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 dark:text-zinc-200">
                      Lista activa
                    </span>
                  </div>
                </label>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2 px-5 rounded-xl bg-[#FF3F1A] hover:bg-[#E03513] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Guardando..." : editingList ? "Guardar cambios" : "Crear lista"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
