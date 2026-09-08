import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Upload,
  ScanBarcode,
  Info,
  Crown,
  QrCode,
  ChevronDown,
  X,
  MessageCircle,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  InventoryProduct,
  UnitOfMeasure,
  StockLocation,
} from "../types/inventory.types";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: StockLocation[];
  productToEdit?: InventoryProduct | null;
  onSave: (product: Partial<InventoryProduct> & { name: string; sku: string }) => Promise<void>;
}

export type ProductFormTab = "basic" | "variants" | "measurements";

interface VariantOption {
  id: string;
  name: string;
  values: string[];
}

interface VariantItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  locations,
  productToEdit,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<ProductFormTab>("basic");

  // Common Form states
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [stockActual, setStockActual] = useState<string>("0");
  const [stockMinimo, setStockMinimo] = useState<string>("5");
  const [salePrice, setSalePrice] = useState<string>("0");
  const [costPrice, setCostPrice] = useState<string>("0");

  // Additional info
  const [category, setCategory] = useState("General");
  const [showInCatalog, setShowInCatalog] = useState(true);
  const [description, setDescription] = useState("");
  const [taxRate, setTaxRate] = useState("none");
  const [locationId, setLocationId] = useState("");

  // Images state (up to 3)
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Variants state (for "Producto con variantes")
  const [variantsList, setVariantsList] = useState<VariantOption[]>([]);
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionValue, setNewOptionValue] = useState("");
  const [generatedVariants, setGeneratedVariants] = useState<VariantItem[]>([]);
  const [isAddingOption, setIsAddingOption] = useState(false);

  // Measurements state (for "Producto con medidas")
  const [purchaseUnit, setPurchaseUnit] = useState("Unidad (Und)");
  const [saleUnit, setSaleUnit] = useState("Unidad (Und)");
  const [conversionFactor, setConversionFactor] = useState("1");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setSku(productToEdit.sku || "");
      setName(productToEdit.name || "");
      setStockActual(String(productToEdit.stockActual || 0));
      setStockMinimo(String(productToEdit.stockMinimo || 5));
      setSalePrice(String(productToEdit.salePrice || 0));
      setCostPrice(String(productToEdit.costPrice || 0));
      setCategory(productToEdit.category || "General");
      setDescription(productToEdit.notes || "");
      setShowInCatalog(true);
      setLocationId(productToEdit.locationId || locations[0]?.id || "loc-001");
      setImages(productToEdit.imageUrl ? [productToEdit.imageUrl] : []);
      if (productToEdit.metadata?.productMode) {
        setActiveTab(productToEdit.metadata.productMode as ProductFormTab);
      }
      if (productToEdit.metadata?.purchaseUnit) {
        setPurchaseUnit(productToEdit.metadata.purchaseUnit);
      }
      if (productToEdit.metadata?.saleUnit) {
        setSaleUnit(productToEdit.metadata.saleUnit);
      }
      if (productToEdit.metadata?.variants) {
        setVariantsList(productToEdit.metadata.variants);
      }
    } else {
      setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
      setName("");
      setStockActual("0");
      setStockMinimo("5");
      setSalePrice("0");
      setCostPrice("0");
      setCategory("General");
      setDescription("");
      setShowInCatalog(true);
      setTaxRate("none");
      setLocationId(locations[0]?.id || "loc-001");
      setImages([]);
      setPurchaseUnit("Unidad (Und)");
      setSaleUnit("Unidad (Und)");
      setVariantsList([]);
      setGeneratedVariants([]);
      setActiveTab("basic");
    }
    setErrorMessage(null);
  }, [productToEdit, locations, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).slice(0, 3 - images.length).forEach((f) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages((prev) => [...prev, event.target!.result as string].slice(0, 3));
        }
      };
      reader.readAsDataURL(f);
    });
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddVariantOption = () => {
    if (!newOptionName.trim()) return;
    const values = newOptionValue.split(",").map((v) => v.trim()).filter(Boolean);
    const newOpt: VariantOption = {
      id: `opt-${Date.now()}`,
      name: newOptionName.trim(),
      values: values.length > 0 ? values : ["Opción 1"],
    };
    const updated = [...variantsList, newOpt];
    setVariantsList(updated);
    setNewOptionName("");
    setNewOptionValue("");
    setIsAddingOption(false);
    generateVariantCombinations(updated);
  };

  const generateVariantCombinations = (options: VariantOption[]) => {
    if (options.length === 0) {
      setGeneratedVariants([]);
      return;
    }
    const allValues = options.map((o) => o.values);
    const combinations = allValues.reduce<string[][]>(
      (acc, curr) => acc.flatMap((a) => curr.map((b) => [...a, b])),
      [[]]
    );

    const items: VariantItem[] = combinations.map((comb, i) => ({
      id: `var-${Date.now()}-${i}`,
      name: `${name || "Producto"} - ${comb.join(" / ")}`,
      sku: `${sku || "SKU"}-${comb.map((c) => c.slice(0, 3).toUpperCase()).join("-")}`,
      price: parseFloat(salePrice) || 0,
      cost: parseFloat(costPrice) || 0,
      stock: 10,
    }));

    setGeneratedVariants(items);
  };

  // Helper unit label extractor
  const getUnitAbbr = (unitStr: string) => {
    if (unitStr.includes("(") && unitStr.includes(")")) {
      return unitStr.split("(")[1].replace(")", "");
    }
    return unitStr.slice(0, 3);
  };

  const getUnitNameOnly = (unitStr: string) => {
    if (unitStr.includes("(")) {
      return unitStr.split("(")[0].trim();
    }
    return unitStr;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Por favor ingresa el nombre del producto.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      await onSave({
        id: productToEdit?.id,
        name: name.trim(),
        sku: (sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`).trim().toUpperCase(),
        category,
        salePrice: parseFloat(salePrice) || 0,
        costPrice: parseFloat(costPrice) || 0,
        stockActual: parseInt(stockActual, 10) || 0,
        stockMinimo: parseInt(stockMinimo, 10) || 5,
        unit: (activeTab === "measurements" ? getUnitAbbr(purchaseUnit) : "UND") as UnitOfMeasure,
        locationId: locationId || locations[0]?.id || "loc-001",
        notes: description,
        imageUrl: images[0] || "",
        metadata: {
          showInCatalog,
          taxRate,
          images,
          productMode: activeTab,
          purchaseUnit,
          saleUnit,
          conversionFactor,
          variants: variantsList,
          generatedVariants,
        },
      });

      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Error al guardar el producto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50 dark:bg-[#09090b] text-slate-800 dark:text-slate-100 flex flex-col animate-fade-in">
      {/* ── Top App Bar ── */}
      <div className="bg-white dark:bg-[#121215] border-b border-slate-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base sm:text-lg font-bold text-[#0f172a] dark:text-white">
            {productToEdit
              ? "Editar producto"
              : activeTab === "variants"
              ? "Producto con variantes"
              : activeTab === "measurements"
              ? "Producto con medidas"
              : "Producto básico"}
          </h1>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Main Container ── */}
      <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 flex-1 flex flex-col space-y-5">
        {/* ── Subtabs Bar (Segmented selector) ── */}
        <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-xl p-1 grid grid-cols-3 gap-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
              activeTab === "basic"
                ? "bg-[#0f172a] dark:bg-white text-white dark:text-[#0f172a] shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
            }`}
          >
            Producto básico
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("variants")}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
              activeTab === "variants"
                ? "bg-[#0f172a] dark:bg-white text-white dark:text-[#0f172a] shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
            }`}
          >
            Producto con variantes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("measurements")}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
              activeTab === "measurements"
                ? "bg-[#0f172a] dark:bg-white text-white dark:text-[#0f172a] shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
            }`}
          >
            Producto con medidas
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-none" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── Form Body: 2 Columns ── */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1">
          {/* ════════ LEFT COLUMN ════════ */}
          <div className="space-y-5">
            {/* Card: Datos del producto */}
            <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
              <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Datos del producto
              </h2>

              {/* 1. Image Upload Box (Blue Dash Box) */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#EFF6FF] dark:bg-blue-950/20 border-2 border-dashed border-blue-300 dark:border-blue-800/80 rounded-2xl p-6 text-center cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-950/40 transition-all flex flex-col items-center justify-center space-y-1.5"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    Carga hasta 3 imágenes
                  </p>
                  <p className="text-[11px] text-blue-500/80 dark:text-blue-400/70">
                    Recomendamos: Tamaño de 500 x 500 px, formato PNG y peso máximo 2MB.
                  </p>
                </div>

                {images.length > 0 && (
                  <div className="flex items-center gap-2.5 mt-3">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-zinc-700 overflow-hidden bg-slate-100 shadow-2xs group"
                      >
                        <img src={img} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(idx);
                          }}
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Código (In Basic & Measurements) */}
              {activeTab !== "variants" && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Código
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <ScanBarcode className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="Escanea o escribe el código del producto"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Nombre del producto (Always in Left Column) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nombre del producto<span className="text-rose-500 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Camiseta, perfume, aretes..."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  required
                />
              </div>

              {/* ── IF MEASUREMENTS MODE: Exact Fields from Screenshot ── */}
              {activeTab === "measurements" && (
                <>
                  {/* Unidad de compra */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Unidad de compra<span className="text-rose-500 ml-0.5">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={purchaseUnit}
                        onChange={(e) => setPurchaseUnit(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 cursor-pointer"
                      >
                        <option value="Unidad (Und)">Unidad (Und)</option>
                        <option value="Kilogramo (Kg)">Kilogramo (Kg)</option>
                        <option value="Gramo (g)">Gramo (g)</option>
                        <option value="Metro (m)">Metro (m)</option>
                        <option value="Centímetro (cm)">Centímetro (cm)</option>
                        <option value="Litro (L)">Litro (L)</option>
                        <option value="Mililitro (ml)">Mililitro (ml)</option>
                        <option value="Caja (Cja)">Caja (Cja)</option>
                        <option value="Paquete (Pqte)">Paquete (Pqte)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Cantidad disponible ({purchaseUnit}) & Cantidad mínima ({purchaseUnit}) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                        Cantidad disponible ({getUnitAbbr(purchaseUnit)})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={stockActual}
                        onChange={(e) => setStockActual(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                        <span>Cantidad mínima ({getUnitAbbr(purchaseUnit)})</span>
                        <Info className="w-3.5 h-3.5 text-slate-400 flex-none" />
                        <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-none" />
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={stockMinimo}
                        onChange={(e) => setStockMinimo(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Costo de compra por {purchaseUnit} */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Costo de compra por {getUnitNameOnly(purchaseUnit)}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={costPrice}
                        onChange={(e) => setCostPrice(e.target.value)}
                        placeholder="0"
                        className="w-full pl-8 pr-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Unidad de venta */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Unidad de venta<span className="text-rose-500 ml-0.5">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={saleUnit}
                        onChange={(e) => setSaleUnit(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 cursor-pointer"
                      >
                        <option value="Unidad (Und)">Unidad (Und)</option>
                        <option value="Kilogramo (Kg)">Kilogramo (Kg)</option>
                        <option value="Gramo (g)">Gramo (g)</option>
                        <option value="Metro (m)">Metro (m)</option>
                        <option value="Centímetro (cm)">Centímetro (cm)</option>
                        <option value="Litro (L)">Litro (L)</option>
                        <option value="Mililitro (ml)">Mililitro (ml)</option>
                        <option value="Porción (Porc)">Porción (Porc)</option>
                        <option value="Docena (Doc)">Docena (Doc)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </>
              )}

              {/* ── IF BASIC MODE: Standard Quantity & Pricing ── */}
              {activeTab === "basic" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Cantidad disponible
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={stockActual}
                        onChange={(e) => setStockActual(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>Cantidad mínima</span>
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                        <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={stockMinimo}
                        onChange={(e) => setStockMinimo(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Precio de venta<span className="text-rose-500 ml-0.5">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                        placeholder="0"
                        className="w-full pl-8 pr-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Costo de compra
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={costPrice}
                        onChange={(e) => setCostPrice(e.target.value)}
                        placeholder="0"
                        className="w-full pl-8 pr-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* In Variants Mode: Información adicional and Impuestos placed below Datos del producto */}
            {activeTab === "variants" && (
              <>
                <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
                  <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Información adicional
                  </h2>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Categoría
                    </label>
                    <div className="relative">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 cursor-pointer"
                      >
                        <option value="General">General</option>
                        <option value="Ropa & Calzado">Ropa & Calzado</option>
                        <option value="Alimentos & Bebidas">Alimentos & Bebidas</option>
                        <option value="Electrónica & Tecnología">Electrónica & Tecnología</option>
                        <option value="Accesorios">Accesorios</option>
                        <option value="Repuestos">Repuestos</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-200/80 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-slate-300 flex-none">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                          Mostrar producto en catálogo virtual
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Este producto será visible para tus clientes si compartes tu catálogo
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowInCatalog(!showInCatalog)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer flex-none ${
                        showInCatalog ? "bg-emerald-600" : "bg-slate-300 dark:bg-zinc-700"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          showInCatalog ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Descripción
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Añadir una descripción ayudará a tus clientes a elegir más fácil"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>

                <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                  <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Impuestos del producto
                  </h2>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Impuesto base
                    </label>
                    <div className="relative">
                      <select
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 cursor-pointer"
                      >
                        <option value="none">Selecciona una opción</option>
                        <option value="0">Exento (0%)</option>
                        <option value="19">IVA General (19%)</option>
                        <option value="5">IVA Reducido (5%)</option>
                        <option value="8">Impuesto al Consumo (8%)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ════════ RIGHT COLUMN ════════ */}
          <div className="space-y-5">
            {activeTab === "variants" ? (
              /* Variants Card */
              <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      Variantes
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20">
                      <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                      Funcionalidad premium
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Puedes agregar variantes de talla, tamaño, color, entre otros.
                </p>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsAddingOption(true)}
                    className="px-4 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Agregar variante
                  </button>

                  <button
                    type="button"
                    onClick={() => window.open("https://wa.me/", "_blank")}
                    className="px-4 py-2.5 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-700 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>Necesito ayuda con variantes</span>
                  </button>
                </div>

                {isAddingOption && (
                  <div className="p-4 bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-700 rounded-2xl space-y-3 animate-fade-in">
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      Nueva opción de variante
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">
                          Nombre de la opción (Ej. Talla, Color)
                        </label>
                        <input
                          type="text"
                          value={newOptionName}
                          onChange={(e) => setNewOptionName(e.target.value)}
                          placeholder="Talla"
                          className="w-full p-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">
                          Valores separados por coma (Ej. S, M, L)
                        </label>
                        <input
                          type="text"
                          value={newOptionValue}
                          onChange={(e) => setNewOptionValue(e.target.value)}
                          placeholder="S, M, L, XL"
                          className="w-full p-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingOption(false)}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddVariantOption}
                        className="px-3.5 py-1.5 bg-[#0f172a] text-white rounded-xl text-xs font-bold"
                      >
                        Guardar opción
                      </button>
                    </div>
                  </div>
                )}

                {variantsList.length > 0 && (
                  <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-zinc-800">
                    <div className="flex flex-wrap gap-2">
                      {variantsList.map((opt) => (
                        <div
                          key={opt.id}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs flex items-center gap-2"
                        >
                          <span className="font-bold text-slate-800 dark:text-slate-200">{opt.name}:</span>
                          <span className="text-slate-500">{opt.values.join(", ")}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const filtered = variantsList.filter((o) => o.id !== opt.id);
                              setVariantsList(filtered);
                              generateVariantCombinations(filtered);
                            }}
                            className="text-slate-400 hover:text-rose-500 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {generatedVariants.length > 0 && (
                      <div className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase">
                            <tr>
                              <th className="p-2.5">Variante</th>
                              <th className="p-2.5">SKU</th>
                              <th className="p-2.5 text-right">Precio</th>
                              <th className="p-2.5 text-right">Stock</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                            {generatedVariants.map((item) => (
                              <tr key={item.id}>
                                <td className="p-2.5 font-medium">{item.name}</td>
                                <td className="p-2.5 font-mono text-[11px] text-slate-500">{item.sku}</td>
                                <td className="p-2.5 text-right font-mono">
                                  ${item.price.toLocaleString("es-CO")}
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold">{item.stock}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* In Basic & Measurements Modes: Right Column is Información adicional & Impuestos */
              <>
                <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
                  <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Información adicional
                  </h2>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Categoría
                    </label>
                    <div className="relative">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 cursor-pointer"
                      >
                        <option value="General">General</option>
                        <option value="Ropa & Calzado">Ropa & Calzado</option>
                        <option value="Alimentos & Bebidas">Alimentos & Bebidas</option>
                        <option value="Electrónica & Tecnología">Electrónica & Tecnología</option>
                        <option value="Accesorios">Accesorios</option>
                        <option value="Repuestos">Repuestos</option>
                        <option value="Velas & Hogar">Velas & Hogar</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-200/80 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-slate-300 flex-none">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                          Mostrar producto en catálogo virtual
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Este producto será visible para tus clientes si compartes tu catálogo
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowInCatalog(!showInCatalog)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer flex-none ${
                        showInCatalog ? "bg-emerald-600" : "bg-slate-300 dark:bg-zinc-700"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          showInCatalog ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Descripción
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Añadir una descripción ayudará a tus clientes a elegir más fácil"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>

                <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                  <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Impuestos del producto
                  </h2>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Impuesto base
                    </label>
                    <div className="relative">
                      <select
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 cursor-pointer"
                      >
                        <option value="none">Selecciona una opción</option>
                        <option value="0">Exento (0%)</option>
                        <option value="19">IVA General (19%)</option>
                        <option value="5">IVA Reducido (5%)</option>
                        <option value="8">Impuesto al Consumo (8%)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </form>
      </div>

      {/* ── Fixed Bottom Actions Bar ── */}
      <div className="bg-white dark:bg-[#121215] border-t border-slate-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-end sticky bottom-0 z-20 shadow-lg">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-[#0f172a] hover:bg-[#1e293b] dark:bg-white dark:hover:bg-slate-200 text-white dark:text-[#0f172a] text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
        >
          {isSubmitting ? "Guardando..." : productToEdit ? "Guardar cambios" : "Crear producto"}
        </button>
      </div>
    </div>
  );
};
