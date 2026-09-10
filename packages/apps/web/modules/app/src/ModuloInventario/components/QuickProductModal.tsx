import React, { useState, useEffect } from "react";
import { X, ExternalLink, HelpCircle, AlertCircle, Plus, Check } from "lucide-react";
import { Product, StockLocation, UnitOfMeasure } from "../types/inventory.types";

export type ItemType = "producto" | "combo";

interface QuickProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: StockLocation[];
  categories?: string[];
  onSave: (product: Partial<Product>) => Promise<void>;
  onGoToAdvanced: (draft: Partial<Product>) => void;
}

export const QuickProductModal: React.FC<QuickProductModalProps> = ({
  isOpen,
  onClose,
  locations,
  categories,
  onSave,
  onGoToAdvanced,
}) => {
  const [itemType, setItemType] = useState<ItemType>("producto");
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState(locations[0]?.id || "loc-001");
  const [unitOfMeasure, setUnitOfMeasure] = useState<UnitOfMeasure>("UND");
  const [category, setCategory] = useState("General");
  const [initialQuantity, setInitialQuantity] = useState("0");
  const [costPrice, setCostPrice] = useState("0");

  // Category creation & dynamic management
  const [availableCategories, setAvailableCategories] = useState<string[]>([
    "General",
    "Alimentos",
    "Bebidas",
    "Ropa & Calzado",
    "Electrónica",
    "Ferretería",
    "Combos y Promociones",
    "Hogar & Decoración",
    "Accesorios",
  ]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleCreateCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (!availableCategories.includes(trimmed)) {
      setAvailableCategories((prev) => [...prev, trimmed].sort());
    }
    setCategory(trimmed);
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  // Visual Pricing Formula state
  const [basePrice, setBasePrice] = useState("0");
  const [taxRate, setTaxRate] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState("0");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (categories && categories.length > 0) {
      setAvailableCategories((prev) => {
        const set = new Set<string>([...prev, ...categories]);
        return Array.from(set).sort();
      });
    }
  }, [categories]);

  useEffect(() => {
    if (isOpen) {
      setItemType("producto");
      setName("");
      setLocationId(locations[0]?.id || "loc-001");
      setUnitOfMeasure("UND");
      setCategory("General");
      setIsAddingCategory(false);
      setNewCategoryName("");
      setInitialQuantity("0");
      setCostPrice("0");
      setBasePrice("0");
      setTaxRate(0);
      setTotalPrice("0");
      setErrorMessage(null);
    }
  }, [isOpen, locations]);

  if (!isOpen) return null;

  // Formula Calculations
  const handleBasePriceChange = (val: string) => {
    setBasePrice(val);
    const base = parseFloat(val) || 0;
    const total = base * (1 + taxRate / 100);
    setTotalPrice(total.toFixed(2));
  };

  const handleTaxRateChange = (rate: number) => {
    setTaxRate(rate);
    const base = parseFloat(basePrice) || 0;
    const total = base * (1 + rate / 100);
    setTotalPrice(total.toFixed(2));
  };

  const handleTotalPriceChange = (val: string) => {
    setTotalPrice(val);
    const total = parseFloat(val) || 0;
    const base = total / (1 + taxRate / 100);
    setBasePrice(base.toFixed(2));
  };

  const buildDraft = (): Partial<Product> => {
    const finalSalePrice = parseFloat(totalPrice) || parseFloat(basePrice) || 0;
    const finalCostPrice = parseFloat(costPrice) || 0;
    const computedStock = itemType === "producto" ? parseInt(initialQuantity, 10) || 0 : 0;

    return {
      name: name.trim(),
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      category: category || (itemType === "combo" ? "Combos" : "General"),
      salePrice: finalSalePrice,
      costPrice: finalCostPrice,
      stockActual: computedStock,
      stockMinimo: 5,
      unit: unitOfMeasure,
      locationId: locationId || locations[0]?.id || "loc-001",
      metadata: {
        itemType,
        isInventariable: itemType === "producto",
        allowNegativeSale: false,
        basePrice: parseFloat(basePrice) || 0,
        taxRate,
        totalPrice: finalSalePrice,
      },
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("El nombre del producto es obligatorio.");
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await onSave(buildDraft());
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Error al crear el producto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvanced = () => {
    onGoToAdvanced(buildDraft());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Creación Rápida de Producto
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Ingresa los datos esenciales de tu producto para el catálogo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-none" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Tipo de ítem (Segmented Control) */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
              <span>Tipo de ítem</span>
              <span className="text-[#FF3F1A]">*</span>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            </label>

            <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800 text-center font-bold text-xs">
              {(["producto", "combo"] as ItemType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setItemType(t);
                    setUnitOfMeasure("UND");
                  }}
                  className={`py-2 rounded-lg capitalize transition-all cursor-pointer ${
                    itemType === t
                      ? "bg-white dark:bg-[#18181B] text-[#FF3F1A] shadow-xs border border-slate-200/80 dark:border-zinc-700 font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre * */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300">
              Nombre <span className="text-[#FF3F1A]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Café Molido 500g, Camiseta Polo..."
              className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A]"
              required
            />
          </div>

          {/* Fila: Categoría con inline creation */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                <span>Categoría</span>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              </label>
              {!isAddingCategory ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(true);
                    setNewCategoryName("");
                  }}
                  className="text-[11px] font-bold text-[#FF3F1A] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Nueva categoría</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(false);
                    setNewCategoryName("");
                  }}
                  className="text-[11px] font-medium text-slate-400 hover:text-slate-600 flex items-center gap-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Cancelar</span>
                </button>
              )}
            </div>

            {isAddingCategory ? (
              <div className="flex items-center gap-1.5 animate-fade-in">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nombre de la nueva categoría..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateCategory();
                    } else if (e.key === "Escape") {
                      setIsAddingCategory(false);
                      setNewCategoryName("");
                    }
                  }}
                  className="flex-1 px-3.5 py-2 bg-white dark:bg-zinc-900 border-2 border-[#FF3F1A]/50 focus:border-[#FF3F1A] rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/20"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim()}
                  className="px-3.5 py-2 bg-[#FF3F1A] hover:bg-[#E03513] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar</span>
                </button>
              </div>
            ) : (
              <select
                value={category}
                onChange={(e) => {
                  if (e.target.value === "__NEW__") {
                    setIsAddingCategory(true);
                    setNewCategoryName("");
                  } else {
                    setCategory(e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A] cursor-pointer"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__NEW__" className="text-[#FF3F1A] font-bold">
                  + Crear nueva categoría...
                </option>
              </select>
            )}
          </div>

          {/* Fila: Bodega & Unidad de medida */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Bodega <span className="text-[#FF3F1A]">*</span>
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A] cursor-pointer"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.code ? `(${loc.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                <span>Unidad de medida</span>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[#FF3F1A]">*</span>
              </label>
              <select
                value={unitOfMeasure}
                onChange={(e) => setUnitOfMeasure(e.target.value as UnitOfMeasure)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A] cursor-pointer"
              >
                <option value="UND">Unidad (Und)</option>
                <option value="KG">Kilogramo (Kg)</option>
                <option value="GR">Gramo (g)</option>
                <option value="LT">Litro (L)</option>
                <option value="CAJA">Caja</option>
                <option value="PAQUETE">Paquete</option>
              </select>
            </div>
          </div>

          {/* Fila: Cantidad inicial & Costo por unidad */}
          {itemType === "producto" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                  <span>Cantidad inicial</span>
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[#FF3F1A]">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={initialQuantity}
                  onChange={(e) => setInitialQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                  <span>Costo por unidad</span>
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[#FF3F1A]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="0.000"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Fila con Ecuación Visual de Precio: Precio Base + Impuesto = Precio Total */}
          <div className="p-3.5 bg-slate-50/80 dark:bg-zinc-900/60 border border-slate-200/90 dark:border-zinc-800 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-2.5 pt-3">
            {/* 1. Precio Base */}
            <div className="flex-1 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                Precio base *
              </span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-[11px]">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={basePrice}
                  onChange={(e) => handleBasePriceChange(e.target.value)}
                  placeholder="0.000 - Total 0.000"
                  className="w-full pl-7 pr-2.5 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A]"
                />
              </div>
            </div>

            {/* Signo + */}
            <div className="flex items-center justify-center font-bold text-slate-400 text-base sm:pt-4">
              +
            </div>

            {/* 2. Impuesto */}
            <div className="flex-1 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                Impuesto
              </span>
              <select
                value={taxRate}
                onChange={(e) => handleTaxRateChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A] cursor-pointer"
              >
                <option value={0}>Ninguno (0%)</option>
                <option value={19}>IVA (19%)</option>
                <option value={5}>IVA Reducido (5%)</option>
                <option value={8}>Impoconsumo (8%)</option>
              </select>
            </div>

            {/* Signo = */}
            <div className="flex items-center justify-center font-bold text-slate-400 text-base sm:pt-4">
              =
            </div>

            {/* 3. Precio Total */}
            <div className="flex-1 space-y-1">
              <span className="text-[11px] font-bold text-[#FF3F1A] dark:text-orange-400">
                Precio Total *
              </span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-[#FF3F1A]">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={totalPrice}
                  onChange={(e) => handleTotalPriceChange(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-2 bg-white dark:bg-zinc-900 border-2 border-[#FF3F1A]/40 dark:border-[#FF3F1A]/50 rounded-xl text-xs font-mono font-extrabold text-[#FF3F1A] focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A]"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-zinc-800/80">
            {/* Ir al formulario avanzado */}
            <button
              type="button"
              onClick={handleAdvanced}
              className="text-xs font-bold text-[#FF3F1A] hover:text-[#E03513] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ir al formulario avanzado</span>
            </button>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2 px-5 rounded-xl bg-[#FF3F1A] hover:bg-[#E03513] text-white text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? "Creando..." : "Crear producto"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
