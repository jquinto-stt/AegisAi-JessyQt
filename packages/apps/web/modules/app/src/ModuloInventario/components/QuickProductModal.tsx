import React, { useState, useEffect } from "react";
import { X, ExternalLink, HelpCircle, AlertCircle, Plus, Check } from "lucide-react";
import { Product, StockLocation, UnitOfMeasure } from "../types/inventory.types";
import { Modal, Button } from "@/elements";

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
    if (locations && locations.length > 0 && !locations.some((l) => l.id === locationId)) {
      setLocationId(locations[0].id);
    }
  }, [locations, locationId]);

  // Recalculate totalPrice when basePrice or taxRate changes
  const handleBasePriceChange = (val: string) => {
    setBasePrice(val);
    const num = parseFloat(val) || 0;
    const computedTotal = num * (1 + taxRate / 100);
    setTotalPrice(computedTotal > 0 ? computedTotal.toFixed(2) : "0");
  };

  const handleTaxRateChange = (rate: number) => {
    setTaxRate(rate);
    const num = parseFloat(basePrice) || 0;
    const computedTotal = num * (1 + rate / 100);
    setTotalPrice(computedTotal > 0 ? computedTotal.toFixed(2) : "0");
  };

  const handleTotalPriceChange = (val: string) => {
    setTotalPrice(val);
    const num = parseFloat(val) || 0;
    const computedBase = num / (1 + taxRate / 100);
    setBasePrice(computedBase > 0 ? computedBase.toFixed(2) : "0");
  };

  const buildDraft = (): Partial<Product> => {
    const parsedCost = parseFloat(costPrice) || 0;
    const parsedPrice = parseFloat(totalPrice) || 0;
    const parsedQuantity = parseFloat(initialQuantity) || 0;

    return {
      name: name.trim(),
      type: itemType,
      unitOfMeasure,
      category,
      costPrice: parsedCost,
      salePrice: parsedPrice,
      active: true,
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      stock: [
        {
          locationId,
          quantity: parsedQuantity,
          reorderPoint: 10,
        },
      ],
      tags: [itemType],
      tax: {
        rate: taxRate,
        included: true,
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-lg p-6 sm:p-8"
      showCloseButton={false}
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="border-b border-gray-100 dark:border-gray-800 pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Creación Rápida de Producto
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Ingresa los datos esenciales de tu producto para el catálogo.
            </p>
          </div>
          <Button
            variant="ghost"
            intent="quickproduct.modal.close"
            onClick={onClose}
            className="w-8 h-8 p-0 text-gray-400"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 bg-error-50 dark:bg-error-950/40 border border-error-200 dark:border-error-800/60 rounded-xl flex items-center gap-2 text-error-700 dark:text-error-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-none" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Tipo de ítem (Segmented Control) */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300">
              <span>Tipo de ítem</span>
              <span className="text-brand-500">*</span>
              <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
            </label>

            <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 text-center font-bold text-xs">
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
                      ? "bg-white dark:bg-gray-900 text-brand-500 shadow-theme-xs border border-gray-200/80 dark:border-gray-700 font-bold"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre * */}
          <div className="space-y-1.5">
            <label className="block font-bold text-gray-700 dark:text-gray-300">
              Nombre <span className="text-brand-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Café Molido 500g, Camiseta Polo..."
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-brand-500"
              required
            />
          </div>

          {/* Fila: Categoría con inline creation */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300">
                <span>Categoría</span>
                <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
              </label>
              {!isAddingCategory ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(true);
                    setNewCategoryName("");
                  }}
                  className="text-[11px] font-bold text-brand-500 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
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
                  className="text-[11px] font-medium text-gray-400 hover:text-gray-600 flex items-center gap-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Cancelar</span>
                </button>
              )}
            </div>

            {isAddingCategory ? (
              <div className="flex items-center gap-1.5">
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
                  className="flex-1 px-3.5 py-2 bg-white dark:bg-gray-900 border-2 border-brand-500/50 focus:border-brand-500 rounded-xl text-xs font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden"
                />
                <Button
                  variant="primary"
                  intent="quickproduct.category.save"
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim()}
                  className="px-3.5 py-2 text-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar</span>
                </Button>
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
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-brand-500 cursor-pointer"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__NEW__" className="text-brand-500 font-bold">
                  + Crear nueva categoría...
                </option>
              </select>
            )}
          </div>

          {/* Fila: Bodega & Unidad de medida */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block font-bold text-gray-700 dark:text-gray-300">
                Bodega <span className="text-brand-500">*</span>
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-brand-500 cursor-pointer"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.code ? `(${loc.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300">
                <span>Unidad de medida</span>
                <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-brand-500">*</span>
              </label>
              <select
                value={unitOfMeasure}
                onChange={(e) => setUnitOfMeasure(e.target.value as UnitOfMeasure)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-brand-500 cursor-pointer"
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
                <label className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300">
                  <span>Cantidad inicial</span>
                  <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-brand-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={initialQuantity}
                  onChange={(e) => setInitialQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-mono font-bold text-gray-900 dark:text-white focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300">
                  <span>Costo por unidad</span>
                  <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-brand-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="0.000"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-mono font-bold text-gray-900 dark:text-white focus:outline-hidden focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Fila con Ecuación Visual de Precio: Precio Base + Impuesto = Precio Total */}
          <div className="p-3.5 bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-2.5 pt-3">
            {/* 1. Precio Base */}
            <div className="flex-1 space-y-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                Precio base *
              </span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-gray-400 text-[11px]">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={basePrice}
                  onChange={(e) => handleBasePriceChange(e.target.value)}
                  placeholder="0.000"
                  className="w-full pl-7 pr-2.5 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-mono font-bold text-gray-900 dark:text-white focus:outline-hidden focus:border-brand-500"
                />
              </div>
            </div>

            {/* Signo + */}
            <div className="flex items-center justify-center font-bold text-gray-400 text-base sm:pt-4">
              +
            </div>

            {/* 2. Impuesto */}
            <div className="flex-1 space-y-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                Impuesto
              </span>
              <select
                value={taxRate}
                onChange={(e) => handleTaxRateChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-brand-500 cursor-pointer"
              >
                <option value={0}>Ninguno (0%)</option>
                <option value={19}>IVA (19%)</option>
                <option value={5}>IVA Reducido (5%)</option>
                <option value={8}>Impoconsumo (8%)</option>
              </select>
            </div>

            {/* Signo = */}
            <div className="flex items-center justify-center font-bold text-gray-400 text-base sm:pt-4">
              =
            </div>

            {/* 3. Precio Total */}
            <div className="flex-1 space-y-1">
              <span className="text-[11px] font-bold text-brand-500 dark:text-brand-400">
                Precio Total *
              </span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-brand-500">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={totalPrice}
                  onChange={(e) => handleTotalPriceChange(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-2 bg-white dark:bg-gray-900 border-2 border-brand-500/40 dark:border-brand-500/50 rounded-xl text-xs font-mono font-extrabold text-brand-500 focus:outline-hidden focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
            {/* Ir al formulario avanzado */}
            <button
              type="button"
              onClick={handleAdvanced}
              className="text-xs font-bold text-brand-500 hover:text-brand-600 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ir al formulario avanzado</span>
            </button>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                intent="quickproduct.cancel"
                onClick={onClose}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                variant="primary"
                intent="quickproduct.submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creando..." : "Crear producto"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};
