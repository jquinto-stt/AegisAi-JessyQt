import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Sliders,
  Sparkles,
  Layers,
  Box,
  Clock,
  Shirt,
  Cpu,
  Activity,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Truck,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import {
  InventoryProduct,
  ProductType,
  UnitOfMeasure,
  DynamicFieldDefinition,
  StockLocation,
} from "../types/inventory.types";
import { PRODUCT_TYPE_TEMPLATES } from "../mock/inventoryMockData";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: StockLocation[];
  productToEdit?: InventoryProduct | null;
  onSave: (product: Partial<InventoryProduct> & { name: string; sku: string }) => Promise<void>;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  locations,
  productToEdit,
  onSave,
}) => {
  // Fixed Core Fields
  const [sku, setSku] = useState("");
  const [ipn, setIpn] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [costPrice, setCostPrice] = useState<string>("0");
  const [salePrice, setSalePrice] = useState<string>("0");
  const [unit, setUnit] = useState<UnitOfMeasure>("UND");
  const [stockActual, setStockActual] = useState<string>("0");
  const [stockMinimo, setStockMinimo] = useState<string>("5");
  const [locationId, setLocationId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [barcode, setBarcode] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Dynamic Type & Dynamic Metadata
  const [productType, setProductType] = useState<ProductType>("standard");
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [customKey, setCustomKey] = useState("");
  const [customVal, setCustomVal] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setSku(productToEdit.sku || "");
      setIpn(productToEdit.ipn || "");
      setName(productToEdit.name || "");
      setCategory(productToEdit.category || "General");
      setCostPrice(String(productToEdit.costPrice || 0));
      setSalePrice(String(productToEdit.salePrice || 0));
      setUnit(productToEdit.unit || "UND");
      setStockActual(String(productToEdit.stockActual || 0));
      setStockMinimo(String(productToEdit.stockMinimo || 5));
      setLocationId(productToEdit.locationId || locations[0]?.id || "loc-001");
      setSupplier(productToEdit.supplier || "");
      setBarcode(productToEdit.barcode || "");
      setNotes(productToEdit.notes || "");
      setImageUrl(productToEdit.imageUrl || "");
      setProductType(productToEdit.productType || "standard");
      setMetadata(productToEdit.metadata ? { ...productToEdit.metadata } : {});
    } else {
      setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
      setIpn(`IPN-${Math.floor(10000 + Math.random() * 90000)}`);
      setName("");
      setCategory("General");
      setCostPrice("0");
      setSalePrice("0");
      setUnit("UND");
      setStockActual("0");
      setStockMinimo("5");
      setLocationId(locations[0]?.id || "loc-001");
      setSupplier("");
      setBarcode("");
      setNotes("");
      setImageUrl("");
      setProductType("standard");
      setMetadata({});
    }
    setErrorMessage(null);
  }, [productToEdit, locations, isOpen]);

  if (!isOpen) return null;

  const currentTemplate = PRODUCT_TYPE_TEMPLATES.find((t) => t.id === productType);

  const handleMetadataChange = (key: string, value: any) => {
    setMetadata((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleRemoveMetadataField = (key: string) => {
    setMetadata((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleAddCustomMetadata = () => {
    if (!customKey.trim()) return;
    handleMetadataChange(customKey.trim(), customVal.trim());
    setCustomKey("");
    setCustomVal("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!sku.trim()) {
      setErrorMessage("El código SKU es obligatorio.");
      return;
    }
    if (!name.trim()) {
      setErrorMessage("El nombre de la parte/producto es obligatorio.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        id: productToEdit ? productToEdit.id : undefined,
        sku: sku.trim().toUpperCase(),
        ipn: ipn.trim().toUpperCase() || undefined,
        name: name.trim(),
        category: category.trim(),
        productType,
        costPrice: parseFloat(costPrice) || 0,
        salePrice: parseFloat(salePrice) || 0,
        unit,
        stockActual: parseFloat(stockActual) || 0,
        stockMinimo: parseFloat(stockMinimo) || 0,
        locationId,
        supplier: supplier.trim(),
        barcode: barcode.trim(),
        notes: notes.trim(),
        imageUrl: imageUrl.trim() || undefined,
        metadata,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Error al guardar el producto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTypeIcon = (type: ProductType) => {
    switch (type) {
      case "perishable":
        return <Clock className="w-4 h-4 text-amber-500" />;
      case "apparel":
        return <Shirt className="w-4 h-4 text-purple-500" />;
      case "electronics":
        return <Cpu className="w-4 h-4 text-cyan-500" />;
      case "pharma":
        return <Activity className="w-4 h-4 text-emerald-500" />;
      default:
        return <Box className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[94vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-zinc-900 dark:text-white">
                {productToEdit ? "Editar Parte / Producto" : "Nueva Parte / Producto"}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Parámetros tipados + Foto + Ubicación + Atributos Dinámicos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-none" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Categoría y Template */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-[#FF3F1A]" />
              1. Tipo de Parte & Plantilla Paramétrica
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PRODUCT_TYPE_TEMPLATES.map((tpl) => {
                const isSelected = productType === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setProductType(tpl.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#190088] bg-[#190088]/10 dark:bg-[#190088]/20 text-[#190088] dark:text-[#97D6DF] shadow-xs scale-[1.02] font-bold"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/40"
                    }`}
                  >
                    <div className="mb-1.5">{renderTypeIcon(tpl.id)}</div>
                    <span className="text-xs font-bold leading-tight">{tpl.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Fotografía del Producto (Estilo Alegra / Shopify) */}
          <div className="space-y-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 font-mono">
                <Camera className="w-3.5 h-3.5 text-[#FF3F1A]" />
                2. Fotografía del Producto
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="text-[11px] text-rose-500 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Quitar imagen
                </button>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 items-center">
              {/* Image Preview Box */}
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-zinc-200/80 dark:bg-zinc-800 border border-zinc-300/80 dark:border-zinc-700 flex items-center justify-center flex-none shadow-2xs relative">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => setErrorMessage("No se pudo cargar la imagen desde la URL provista.")}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-400 text-center p-2">
                    <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                    <span className="text-[9px] font-mono leading-tight font-bold">Sin Foto</span>
                  </div>
                )}
              </div>

              {/* URL Input & Quick Presets */}
              <div className="flex-1 space-y-2 w-full">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    URL de la Imagen (Web o CDN)
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... o pega enlace directo"
                    className="w-full text-xs font-medium rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-zinc-900 dark:text-white focus:outline-hidden focus:border-[#190088]"
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase font-mono">Fotos Rápidas:</span>
                  <button
                    type="button"
                    onClick={() => setImageUrl("https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80")}
                    className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                  >
                    🍔 Hamburguesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl("https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80")}
                    className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                  >
                    👕 Ropa
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl("https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=600&auto=format&fit=crop&q=80")}
                    className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                  >
                    📠 POS
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl("https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80")}
                    className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                  >
                    📦 Empaque
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Información Principal */}
          <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 font-mono">
              <Box className="w-3.5 h-3.5 text-[#190088]" />
              3. Datos Principales & Ubicación
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nombre de la Parte / Ítem *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Smash Burger Doble / Impresora Térmica POS"
                  className="w-full text-xs sm:text-sm font-medium rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-zinc-900 dark:text-white focus:outline-hidden focus:border-[#190088] focus:ring-1 focus:ring-[#190088]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Código SKU *
                </label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="SKU-1001"
                  className="w-full text-xs sm:text-sm font-mono font-bold rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-zinc-900 dark:text-white focus:outline-hidden focus:border-[#190088] focus:ring-1 focus:ring-[#190088]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  IPN (Internal Part Number)
                </label>
                <input
                  type="text"
                  value={ipn}
                  onChange={(e) => setIpn(e.target.value.toUpperCase())}
                  placeholder="IPN-00101"
                  className="w-full text-xs sm:text-sm font-mono rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white focus:outline-hidden focus:border-[#190088] focus:ring-1 focus:ring-[#190088]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Ubicación Inicial *
                </label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full text-xs sm:text-sm font-medium rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white focus:outline-hidden focus:border-[#190088] focus:ring-1 focus:ring-[#190088]"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Precio Costo ($)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full text-xs sm:text-sm font-mono font-bold rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white focus:outline-hidden focus:border-[#190088] focus:ring-1 focus:ring-[#190088]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Precio Venta ($)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full text-xs sm:text-sm font-mono font-bold rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white focus:outline-hidden focus:border-[#190088] focus:ring-1 focus:ring-[#190088]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  {productToEdit ? "Stock Actual" : "Stock Inicial"} ({unit})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={stockActual}
                  onChange={(e) => setStockActual(e.target.value)}
                  className="w-full text-xs sm:text-sm font-mono font-black rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-zinc-900 dark:text-white focus:outline-hidden focus:border-[#190088] focus:ring-1 focus:ring-[#190088]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Stock Mínimo (Alerta)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={stockMinimo}
                  onChange={(e) => setStockMinimo(e.target.value)}
                  className="w-full text-xs sm:text-sm font-mono rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-zinc-900 dark:text-white focus:outline-hidden focus:border-[#190088] focus:ring-1 focus:ring-[#190088]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Proveedor Habitual
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Ej. Distribuidora Central"
                  className="w-full text-xs sm:text-sm font-medium rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-zinc-900 dark:text-white focus:outline-hidden focus:border-[#190088] focus:ring-1 focus:ring-[#190088]"
                />
              </div>
            </div>
          </div>

          {/* 3. Parámetros Dinámicos */}
          <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 font-mono">
              <Sliders className="w-3.5 h-3.5 text-emerald-500" />
              3. Parámetros de la Plantilla ({currentTemplate?.label})
            </label>

            {currentTemplate && currentTemplate.fields.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800">
                {currentTemplate.fields.map((field: DynamicFieldDefinition) => {
                  const val = metadata[field.key] ?? "";
                  return (
                    <div key={field.key}>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                      </label>

                      {field.type === "select" ? (
                        <select
                          value={val}
                          onChange={(e) => handleMetadataChange(field.key, e.target.value)}
                          className="w-full text-xs sm:text-sm font-medium rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white focus:outline-hidden focus:border-[#190088] focus:ring-1 focus:ring-[#190088]"
                        >
                          <option value="">-- Seleccionar --</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "date" ? (
                        <input
                          type="date"
                          value={val}
                          onChange={(e) => handleMetadataChange(field.key, e.target.value)}
                          className="w-full text-xs sm:text-sm font-medium rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white focus:outline-hidden focus:border-[#190088] focus:ring-1 focus:ring-[#190088]"
                        />
                      ) : field.type === "number" ? (
                        <input
                          type="number"
                          step="any"
                          value={val}
                          onChange={(e) => handleMetadataChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full text-xs sm:text-sm font-mono font-bold rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white focus:outline-hidden focus:border-[#190088] focus:ring-1 focus:ring-[#190088]"
                        />
                      ) : (
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => handleMetadataChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full text-xs sm:text-sm font-medium rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white focus:outline-hidden focus:border-[#190088] focus:ring-1 focus:ring-[#190088]"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Custom Extra Parameters */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1.5">
                Parámetros Adicionales Libres (Clave - Valor)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Parámetro (ej. Grado, Calibre)"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="flex-1 text-xs rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-zinc-900 dark:text-white focus:outline-hidden focus:border-[#190088]"
                />
                <input
                  type="text"
                  placeholder="Valor"
                  value={customVal}
                  onChange={(e) => setCustomVal(e.target.value)}
                  className="flex-1 text-xs rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-zinc-900 dark:text-white focus:outline-hidden focus:border-[#190088]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomMetadata}
                  className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>

              {Object.keys(metadata).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(metadata).map(([k, v]) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      <span className="font-bold text-zinc-500 font-mono">{k}:</span> {String(v)}
                      <button
                        type="button"
                        onClick={() => handleRemoveMetadataField(k)}
                        className="text-zinc-400 hover:text-rose-500 cursor-pointer ml-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-zinc-200/80 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#FF3F1A] hover:bg-[#E03513] text-xs font-black text-white transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                "Guardando..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {productToEdit ? "Guardar Cambios" : "Crear Parte / Ítem"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
