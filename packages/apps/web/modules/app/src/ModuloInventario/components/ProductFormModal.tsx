import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  ScanBarcode,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Trash2,
  AlertCircle,
  Package,
  Boxes,
  Tag,
  DollarSign,
  Layers,
  Settings,
  MoreVertical,
  Check,
  Sparkles,
  FileText,
  Building2,
  HelpCircle,
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
  products?: InventoryProduct[];
  productToEdit?: InventoryProduct | null;
  initialData?: Partial<InventoryProduct> | null;
  onSave: (product: Partial<InventoryProduct> & { name: string; sku: string }) => Promise<void>;
}

export type ItemType = "producto" | "combo";

export interface ComboItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
}

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

interface LocationAllocation {
  id: string;
  locationId: string;
  locationName: string;
  quantity: number;
}

interface PriceListItem {
  id: string;
  name: string;
  value: number;
}

interface CustomFieldItem {
  id: string;
  name: string;
  value: string;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  locations,
  products = [],
  productToEdit,
  initialData,
  onSave,
}) => {
  // Collapsible Accordion Sections
  const [expandedSections, setExpandedSections] = useState<{
    general: boolean;
    pricing: boolean;
    advanced: boolean;
    customFields: boolean;
    accounting: boolean;
  }>({
    general: true,
    pricing: true,
    advanced: false,
    customFields: false,
    accounting: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // 1. Información General states
  const [itemType, setItemType] = useState<ItemType>("producto");
  const [hasVariants, setHasVariants] = useState(false);
  const [name, setName] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [category, setCategory] = useState("General");
  const [unitOfMeasure, setUnitOfMeasure] = useState<UnitOfMeasure>("UND");
  const [reference, setReference] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");

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

  const renderCategoryField = () => (
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
            placeholder="Nombre de la categoría..."
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
  );

  // 2. Inventario y Precio states
  const [initialQuantity, setInitialQuantity] = useState<string>("0");
  const [costPrice, setCostPrice] = useState<string>("0");
  const [basePrice, setBasePrice] = useState<string>("0");
  const [taxRate, setTaxRate] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<string>("0");

  // 3. Opciones Avanzadas: Multi-Bodega, Listas de Precios & Combos
  const [locationAllocations, setLocationAllocations] = useState<LocationAllocation[]>([]);
  const [priceLists, setPriceLists] = useState<PriceListItem[]>([]);
  const [comboItems, setComboItems] = useState<ComboItem[]>([
    { id: "ci-1", productId: "", productName: "", quantity: 1, costPrice: 0 },
    { id: "ci-2", productId: "", productName: "", quantity: 1, costPrice: 0 },
    { id: "ci-3", productId: "", productName: "", quantity: 1, costPrice: 0 },
  ]);

  // 4. Campos Adicionales
  const [customFields, setCustomFields] = useState<CustomFieldItem[]>([]);
  const [newCustomFieldName, setNewCustomFieldName] = useState("");
  const [newCustomFieldValue, setNewCustomFieldValue] = useState("");

  // 5. Configuración Contable
  const [accountingAccount, setAccountingAccount] = useState("Ventas");
  const [inventoryAccount, setInventoryAccount] = useState("Inventarios");
  const [costAccount, setCostAccount] = useState("Costos del inventario");

  // Right Sidebar Switches & Image
  const [isInventariable, setIsInventariable] = useState(true);
  const [allowNegativeSale, setAllowNegativeSale] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Variants management
  const [variantsList, setVariantsList] = useState<VariantOption[]>([]);
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionValue, setNewOptionValue] = useState("");
  const [generatedVariants, setGeneratedVariants] = useState<VariantItem[]>([]);
  const [isAddingOption, setIsAddingOption] = useState(false);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Auto-calculate Total Price when Base Price or Tax Rate changes
  const handleBasePriceChange = (val: string) => {
    setBasePrice(val);
    const num = parseFloat(val) || 0;
    const calc = num * (1 + taxRate / 100);
    setTotalPrice(calc > 0 ? calc.toFixed(2) : "0");
  };

  const handleTaxRateChange = (rate: number) => {
    setTaxRate(rate);
    const num = parseFloat(basePrice) || 0;
    const calc = num * (1 + rate / 100);
    setTotalPrice(calc > 0 ? calc.toFixed(2) : "0");
  };

  const handleTotalPriceChange = (val: string) => {
    setTotalPrice(val);
    const num = parseFloat(val) || 0;
    const calc = num / (1 + taxRate / 100);
    setBasePrice(calc > 0 ? calc.toFixed(2) : "0");
  };

  // Combo calculations & handlers
  const totalComboCost = comboItems.reduce(
    (sum, item) => sum + (item.costPrice || 0) * (item.quantity || 1),
    0
  );

  const handleAddComboItem = () => {
    setComboItems((prev) => [
      ...prev,
      {
        id: `ci-${Date.now()}`,
        productId: "",
        productName: "",
        quantity: 1,
        costPrice: 0,
      },
    ]);
  };

  const handleUpdateComboProduct = (id: string, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    setComboItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              productId: prodId,
              productName: prod?.name || "",
              costPrice: prod?.costPrice || 0,
            }
          : item
      )
    );
  };

  const handleUpdateComboQuantity = (id: string, qty: number) => {
    setComboItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, qty) } : item))
    );
  };

  const handleRemoveComboItem = (id: string) => {
    if (comboItems.length <= 1) {
      setComboItems([{ id: `ci-${Date.now()}`, productId: "", productName: "", quantity: 1, costPrice: 0 }]);
      return;
    }
    setComboItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Reset form to clean state
  const resetForm = () => {
    setItemType("producto");
    setHasVariants(false);
    setName("");
    setSelectedLocationId(locations[0]?.id || "loc-001");
    setCategory("General");
    setUnitOfMeasure("UND");
    setReference("");
    setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setDescription("");
    setInitialQuantity("0");
    setCostPrice("0");
    setBasePrice("0");
    setTaxRate(0);
    setTotalPrice("0");
    setLocationAllocations(
      locations.length > 0
        ? [{ id: `loc-alloc-1`, locationId: locations[0].id, locationName: locations[0].name, quantity: 0 }]
        : []
    );
    setPriceLists([
      { id: "pl-1", name: "General / POS", value: 0 },
      { id: "pl-2", name: "Mayorista", value: 0 },
    ]);
    setComboItems([
      { id: "ci-1", productId: "", productName: "", quantity: 1, costPrice: 0 },
      { id: "ci-2", productId: "", productName: "", quantity: 1, costPrice: 0 },
      { id: "ci-3", productId: "", productName: "", quantity: 1, costPrice: 0 },
    ]);
    setCustomFields([]);
    setIsInventariable(true);
    setAllowNegativeSale(false);
    setImages([]);
    setVariantsList([]);
    setGeneratedVariants([]);
    setErrorMessage(null);
  };

  // Initialize or populate form
  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || "");
      setSku(productToEdit.sku || "");
      setCostPrice(String(productToEdit.costPrice || 0));
      setBasePrice(String(productToEdit.salePrice || 0));
      setTotalPrice(String(productToEdit.salePrice || 0));
      setInitialQuantity(String(productToEdit.stockActual || 0));
      setCategory(productToEdit.category || "General");
      setUnitOfMeasure(productToEdit.unit || "UND");
      setDescription(productToEdit.notes || "");
      setSelectedLocationId(productToEdit.locationId || locations[0]?.id || "loc-001");
      setImages(productToEdit.imageUrl ? [productToEdit.imageUrl] : []);

      const meta = productToEdit.metadata || {};
      setItemType((meta.itemType as ItemType) || "producto");
      setIsInventariable(meta.isInventariable !== undefined ? Boolean(meta.isInventariable) : true);
      setAllowNegativeSale(Boolean(meta.allowNegativeSale));
      setReference(String(meta.reference || ""));
      setTaxRate(Number(meta.taxRate || 0));
      if (meta.hasVariants) {
        setHasVariants(true);
        setVariantsList((meta.variants as VariantOption[]) || []);
        setGeneratedVariants((meta.generatedVariants as VariantItem[]) || []);
      }
      if (Array.isArray(meta.locationAllocations)) {
        setLocationAllocations(meta.locationAllocations as LocationAllocation[]);
      } else {
        setLocationAllocations([
          {
            id: `loc-alloc-1`,
            locationId: productToEdit.locationId || locations[0]?.id || "loc-001",
            locationName: productToEdit.locationName || locations[0]?.name || "Principal",
            quantity: productToEdit.stockActual || 0,
          },
        ]);
      }
      if (Array.isArray(meta.priceLists)) {
        setPriceLists(meta.priceLists as PriceListItem[]);
      }
      if (Array.isArray(meta.comboItems)) {
        setComboItems(meta.comboItems as ComboItem[]);
      }
    } else if (initialData) {
      resetForm();
      if (initialData.name) setName(initialData.name);
      if (initialData.costPrice !== undefined) setCostPrice(String(initialData.costPrice));
      if (initialData.salePrice !== undefined) {
        setBasePrice(String(initialData.salePrice));
        setTotalPrice(String(initialData.salePrice));
      }
      if (initialData.stockActual !== undefined) setInitialQuantity(String(initialData.stockActual));
      if (initialData.category) setCategory(initialData.category);
      if (initialData.unit) setUnitOfMeasure(initialData.unit);
      if (initialData.locationId) setSelectedLocationId(initialData.locationId);

      const meta = initialData.metadata || {};
      if (meta.itemType) setItemType(meta.itemType as ItemType);
      if (meta.basePrice !== undefined) setBasePrice(String(meta.basePrice));
      if (meta.taxRate !== undefined) setTaxRate(Number(meta.taxRate));
      if (meta.totalPrice !== undefined) setTotalPrice(String(meta.totalPrice));
    } else {
      resetForm();
    }
  }, [productToEdit, initialData, locations, isOpen]);

  useEffect(() => {
    if (products && products.length > 0) {
      setAvailableCategories((prev) => {
        const set = new Set<string>(prev);
        products.forEach((p) => {
          if (p.category?.trim()) set.add(p.category.trim());
        });
        return Array.from(set).sort();
      });
    }
    if (productToEdit?.category?.trim()) {
      setAvailableCategories((prev) => {
        const set = new Set<string>(prev);
        set.add(productToEdit.category!.trim());
        return Array.from(set).sort();
      });
    }
  }, [products, productToEdit]);

  if (!isOpen) return null;

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).slice(0, 1).forEach((f) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages([event.target.result as string]);
        }
      };
      reader.readAsDataURL(f);
    });
  };

  // Add Variant Option & Matrix Generator
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
      (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
      [[]]
    );

    const items: VariantItem[] = combinations.map((comb, i) => ({
      id: `var-${Date.now()}-${i}`,
      name: comb.join(" / "),
      sku: `${sku || "VAR"}-${comb.map((c) => c.slice(0, 3).toUpperCase()).join("-")}-${i + 1}`,
      price: parseFloat(totalPrice || basePrice) || 0,
      cost: parseFloat(costPrice) || 0,
      stock: parseInt(initialQuantity, 10) || 0,
    }));

    setGeneratedVariants(items);
  };

  // Multi-location additions
  const handleAddLocationAllocation = () => {
    const unusedLoc = locations.find(
      (l) => !locationAllocations.some((la) => la.locationId === l.id)
    ) || locations[0];

    if (!unusedLoc) return;

    setLocationAllocations((prev) => [
      ...prev,
      {
        id: `alloc-${Date.now()}`,
        locationId: unusedLoc.id,
        locationName: unusedLoc.name,
        quantity: 0,
      },
    ]);
  };

  const handleUpdateLocationQty = (id: string, qty: number) => {
    setLocationAllocations((prev) =>
      prev.map((la) => (la.id === id ? { ...la, quantity: qty } : la))
    );
  };

  const handleRemoveLocationAllocation = (id: string) => {
    if (locationAllocations.length <= 1) return;
    setLocationAllocations((prev) => prev.filter((la) => la.id !== id));
  };

  // Price lists additions
  const handleAddPriceList = () => {
    setPriceLists((prev) => [
      ...prev,
      {
        id: `pl-${Date.now()}`,
        name: `Tarifa ${prev.length + 1}`,
        value: parseFloat(totalPrice || basePrice) || 0,
      },
    ]);
  };

  // Custom fields
  const handleAddCustomField = () => {
    if (!newCustomFieldName.trim()) return;
    setCustomFields((prev) => [
      ...prev,
      {
        id: `cf-${Date.now()}`,
        name: newCustomFieldName.trim(),
        value: newCustomFieldValue.trim(),
      },
    ]);
    setNewCustomFieldName("");
    setNewCustomFieldValue("");
  };

  // Submit Handler
  const handleSaveInternal = async (andCreateAnother = false) => {
    if (!name.trim()) {
      setErrorMessage("Por favor ingresa el nombre del producto.");
      setExpandedSections((prev) => ({ ...prev, general: true }));
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const computedStock = (isInventariable && itemType === "producto") ? (parseInt(initialQuantity, 10) || 0) : 0;
      const finalSalePrice = parseFloat(totalPrice) || parseFloat(basePrice) || 0;
      const finalCostPrice = itemType === "combo" ? totalComboCost : (parseFloat(costPrice) || 0);

      await onSave({
        id: productToEdit?.id,
        name: name.trim(),
        sku: (sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`).trim().toUpperCase(),
        category,
        salePrice: finalSalePrice,
        costPrice: finalCostPrice,
        stockActual: computedStock,
        stockMinimo: 5,
        unit: unitOfMeasure,
        locationId: selectedLocationId || locations[0]?.id || "loc-001",
        notes: description,
        imageUrl: images[0] || "",
        metadata: {
          itemType,
          isInventariable: itemType === "producto" ? isInventariable : false,
          allowNegativeSale: itemType === "producto" ? allowNegativeSale : false,
          reference,
          basePrice: parseFloat(basePrice) || 0,
          taxRate,
          totalPrice: finalSalePrice,
          hasVariants: itemType === "producto" ? hasVariants : false,
          variants: variantsList,
          generatedVariants,
          locationAllocations,
          priceLists,
          comboItems: itemType === "combo" ? comboItems : undefined,
          totalComboCost: itemType === "combo" ? totalComboCost : undefined,
          customFields,
          accountingAccount,
          inventoryAccount,
          costAccount,
        },
      });

      if (andCreateAnother) {
        setSuccessToast(`¡"${name}" guardado exitosamente! Preparado para el siguiente.`);
        setTimeout(() => setSuccessToast(null), 3000);
        resetForm();
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Error al guardar el producto");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/60 backdrop-blur-xs font-sans"
      style={{ animation: "fadeIn 150ms ease-out" }}
    >
      <div
        className="relative w-full max-w-6xl bg-[#F8FAFC] dark:bg-[#111215] rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh]"
        style={{ animation: "slideUp 200ms ease-out" }}
      >
        {/* ── Modal Header ── */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-[#18181B] flex-none">
          <div className="space-y-0.5">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Boxes className="w-5 h-5 text-[#FF3F1A]" />
              <span>{productToEdit ? "Editar producto de venta" : "Nuevo producto de venta"}</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Crea tus productos inventariables o combos para registrar en tus ventas.{" "}
              <a href="#info" className="text-[#FF3F1A] font-semibold hover:underline">
                Ver más
              </a>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback messages */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-none" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successToast && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs flex items-center gap-2 animate-fade-in font-medium">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successToast}</span>
          </div>
        )}

        {/* ── Main 2-Column Body (Scrollable) ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ════════════ LEFT COLUMN: ACCORDION SECTIONS (8 COLS) ════════════ */}
            <div className="lg:col-span-8 space-y-4">
              {/* ─────────────────────────────────────────────────────────────
                  ACORDEÓN 1: Información General
              ───────────────────────────────────────────────────────────── */}
              <div className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-2xs overflow-hidden transition-all">
                {/* Header */}
                <button
                  type="button"
                  onClick={() => toggleSection("general")}
                  className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-sm text-slate-900 dark:text-white bg-slate-50/50 dark:bg-zinc-900/40 border-b border-slate-100 dark:border-zinc-800/80 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#FF3F1A]" />
                    <span>Información general</span>
                  </div>
                  {expandedSections.general ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {expandedSections.general && (
                  <div className="p-5 space-y-5 animate-fade-in text-xs">
                    {/* Tipo de ítem (Segmented Control) */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                        <span>Tipo de ítem</span>
                        <span className="text-rose-500">*</span>
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      </label>

                      <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800 text-center font-bold text-xs">
                        {(["producto", "combo"] as ItemType[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setItemType(t);
                              if (t === "producto") {
                                setIsInventariable(true);
                                setUnitOfMeasure("UND");
                              } else {
                                setIsInventariable(false);
                                setHasVariants(false);
                              }
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

                      <div className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400 pt-0.5">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400 flex-none mt-0.5" />
                        <p>
                          Ten en cuenta que, una vez creado, no podrás cambiar el tipo de ítem.
                        </p>
                      </div>
                    </div>

                    {/* Checkbox: Producto con variantes (Solo para Productos físicos) */}
                    {itemType === "producto" && (
                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/50 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={hasVariants}
                          onChange={(e) => setHasVariants(e.target.checked)}
                          className="w-4 h-4 rounded text-[#FF3F1A] focus:ring-[#FF3F1A] border-slate-300 cursor-pointer"
                        />
                        <span className="font-bold text-slate-800 dark:text-zinc-200">
                          Producto con variantes (Tallas, Colores, Presentaciones)
                        </span>
                      </label>
                    )}

                    {/* Nombre del producto */}
                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">
                        Nombre <span className="text-rose-500">*</span>
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

                    {/* ── Distribución de Campos según Tipo de Ítem ── */}
                    {itemType === "combo" ? (
                      /* COMBO: Bodega + Categoría, Unidad de medida + Referencia, Código del combo */
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block font-bold text-slate-700 dark:text-slate-300">
                              Bodega <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={selectedLocationId}
                              onChange={(e) => setSelectedLocationId(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A] cursor-pointer"
                            >
                              {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                  {loc.name} {loc.code ? `(${loc.code})` : ""}
                                </option>
                              ))}
                            </select>
                          </div>

                          {renderCategoryField()}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                              <span>Unidad de medida</span>
                              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={unitOfMeasure}
                              onChange={(e) => setUnitOfMeasure(e.target.value as UnitOfMeasure)}
                              className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A] cursor-pointer"
                            >
                              <option value="UND">Unidad</option>
                              <option value="PAQUETE">Paquete</option>
                              <option value="CAJA">Caja</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                              <span>Referencia</span>
                              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                            </label>
                            <input
                              type="text"
                              value={reference}
                              onChange={(e) => setReference(e.target.value)}
                              placeholder=""
                              className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A]"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                            <span>Código / SKU del combo</span>
                            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={sku}
                              onChange={(e) => setSku(e.target.value)}
                              placeholder="Buscar..."
                              className="w-full pl-3.5 pr-8 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A]"
                            />
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* PRODUCTO FÍSICO: Bodega, Categoría, Unidad de Medida, Referencia, SKU */
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block font-bold text-slate-700 dark:text-slate-300">
                              Bodega <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={selectedLocationId}
                              onChange={(e) => setSelectedLocationId(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A] cursor-pointer"
                            >
                              {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                  {loc.name} {loc.code ? `(${loc.code})` : ""}
                                </option>
                              ))}
                            </select>
                          </div>

                          {renderCategoryField()}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                              <span>Unidad de medida</span>
                              <span className="text-rose-500">*</span>
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
                              <option value="ML">Mililitro (ml)</option>
                              <option value="METRO">Metro (m)</option>
                              <option value="CAJA">Caja (Cja)</option>
                              <option value="PAQUETE">Paquete (Pq)</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                              <span>Referencia</span>
                              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                            </label>
                            <input
                              type="text"
                              value={reference}
                              onChange={(e) => setReference(e.target.value)}
                              placeholder="Ref. fabricante o interna"
                              className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A]"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                              <span>Código / SKU</span>
                              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={sku}
                                onChange={(e) => setSku(e.target.value)}
                                placeholder="SKU o código de barras"
                                className="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A]"
                              />
                              <ScanBarcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Descripción */}
                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">
                        Descripción
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        placeholder={
                          itemType === "combo"
                            ? "Detalles del paquete o combo, artículos incluidos o condiciones..."
                            : "Detalles sobre el producto, presentación, ingredientes o notas..."
                        }
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A] resize-none"
                      />
                    </div>

                    {/* ── Subsección condicional de Variantes (Solo Productos) ── */}
                    {itemType === "producto" && hasVariants && (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-200 text-xs">
                            <Layers className="w-4 h-4 text-[#FF3F1A]" />
                            <span>Atributos de Variantes (Talla, Color, Presentación)</span>
                          </div>
                          {!isAddingOption && (
                            <button
                              type="button"
                              onClick={() => setIsAddingOption(true)}
                              className="px-3 py-1.5 rounded-lg bg-[#FF3F1A]/10 text-[#FF3F1A] font-bold text-xs hover:bg-[#FF3F1A]/20 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Agregar atributo</span>
                            </button>
                          )}
                        </div>

                        {isAddingOption && (
                          <div className="p-3 bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-zinc-700 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={newOptionName}
                                onChange={(e) => setNewOptionName(e.target.value)}
                                placeholder="Nombre (ej. Talla, Color)"
                                className="px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg text-xs"
                              />
                              <input
                                type="text"
                                value={newOptionValue}
                                onChange={(e) => setNewOptionValue(e.target.value)}
                                placeholder="Opciones separadas por coma (S, M, L, XL)"
                                className="px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg text-xs"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setIsAddingOption(false)}
                                className="px-3 py-1.5 text-xs text-slate-500 font-semibold"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={handleAddVariantOption}
                                className="px-3 py-1.5 text-xs bg-[#FF3F1A] hover:bg-[#E03513] text-white rounded-lg font-bold"
                              >
                                Generar combinaciones
                              </button>
                            </div>
                          </div>
                        )}

                        {generatedVariants.length > 0 && (
                          <div className="overflow-x-auto border border-slate-200 dark:border-zinc-800 rounded-xl">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100 dark:bg-zinc-800 font-bold text-slate-700 dark:text-slate-300">
                                <tr>
                                  <th className="p-2.5">Variante</th>
                                  <th className="p-2.5">SKU</th>
                                  <th className="p-2.5">Precio ($)</th>
                                  <th className="p-2.5">Stock</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                                {generatedVariants.map((v) => (
                                  <tr key={v.id}>
                                    <td className="p-2.5 font-bold text-slate-800 dark:text-zinc-200">
                                      {v.name}
                                    </td>
                                    <td className="p-2.5 font-mono text-[11px] text-slate-500">
                                      {v.sku}
                                    </td>
                                    <td className="p-2.5 font-mono font-bold text-[#FF3F1A]">
                                      $ {v.price}
                                    </td>
                                    <td className="p-2.5 font-mono">{v.stock}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  ACORDEÓN 2: Inventario y Precio (Fórmula Visual Alegra)
              ───────────────────────────────────────────────────────────── */}
              <div className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-2xs overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => toggleSection("pricing")}
                  className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-sm text-slate-900 dark:text-white bg-slate-50/50 dark:bg-zinc-900/40 border-b border-slate-100 dark:border-zinc-800/80 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#FF3F1A]" />
                    <span>Inventario y precio</span>
                  </div>
                  {expandedSections.pricing ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {expandedSections.pricing && (
                  <div className="p-5 space-y-5 animate-fade-in text-xs">
                    {/* Cantidad inicial & Costo por unidad (SOLO para productos físicos inventariables) */}
                    {itemType === "producto" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                            <span>Cantidad inicial</span>
                            <span className="text-rose-500">*</span>
                            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                          </label>
                          <input
                            type="number"
                            min="0"
                            disabled={!isInventariable}
                            value={initialQuantity}
                            onChange={(e) => setInitialQuantity(e.target.value)}
                            className={`w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A] ${
                              !isInventariable ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                            <span>Costo por unidad</span>
                            <span className="text-rose-500">*</span>
                            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
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
                              placeholder="0.00"
                              className="w-full pl-8 pr-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 focus:border-[#FF3F1A]"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fila con Ecuación Visual de Precio: Precio Base + Impuesto = Precio Total */}
                    <div className="space-y-1.5 pt-1">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">
                        {itemType === "combo"
                          ? "Precio de venta y configuración tributaria"
                          : "Estructura fiscal y precio de venta"}
                      </label>

                      <div className="p-4 bg-slate-50/80 dark:bg-zinc-900/60 border border-slate-200/90 dark:border-zinc-800 rounded-2xl flex flex-col md:flex-row md:items-center gap-3">
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
                        <div className="flex items-center justify-center font-bold text-slate-400 text-base md:pt-4">
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
                        <div className="flex items-center justify-center font-bold text-slate-400 text-base md:pt-4">
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
                    </div>
                  </div>
                )}
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  ACORDEÓN 3: Opciones Avanzadas
              ───────────────────────────────────────────────────────────── */}
              <div className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-2xs overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => toggleSection("advanced")}
                  className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-sm text-slate-900 dark:text-white bg-slate-50/50 dark:bg-zinc-900/40 border-b border-slate-100 dark:border-zinc-800/80 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-[#FF3F1A]" />
                    <span>Opciones avanzadas</span>
                  </div>
                  {expandedSections.advanced ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {expandedSections.advanced && (
                  <div className="p-5 space-y-6 animate-fade-in text-xs">
                    {/* Detalle de Inventario: SOLO para productos inventariables (oculto en combos) */}
                    {itemType === "producto" && (
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white">
                            Detalle de inventario
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                            Distribuye y controla las cantidades de tus productos en diferentes bodegas o sucursales.{" "}
                            <a href="#info" className="text-[#FF3F1A] font-semibold hover:underline">
                              Ver más.
                            </a>
                          </p>
                        </div>

                        <div className="space-y-2">
                          {locationAllocations.map((alloc) => (
                            <div
                              key={alloc.id}
                              className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-slate-200/70 dark:bg-zinc-800 flex items-center justify-center flex-none">
                                  <Building2 className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-800 dark:text-zinc-200 truncate">
                                    {alloc.locationName} <span className="text-rose-500">*</span>
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    Cantidad inicial en esta sede
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={alloc.quantity}
                                  onChange={(e) =>
                                    handleUpdateLocationQty(alloc.id, parseInt(e.target.value, 10) || 0)
                                  }
                                  className="w-24 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold text-right"
                                />
                                {locationAllocations.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLocationAllocation(alloc.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handleAddLocationAllocation}
                          className="text-xs font-bold text-[#FF3F1A] hover:underline flex items-center gap-1.5 cursor-pointer pt-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Agregar bodega</span>
                        </button>
                      </div>
                    )}

                    {/* Listas de Precios */}
                    <div className={`space-y-3 ${itemType === "producto" ? "pt-4 border-t border-slate-100 dark:border-zinc-800" : ""}`}>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">Listas de precios</h4>
                      </div>

                      <div className="space-y-2">
                        {priceLists.map((pl) => (
                          <div key={pl.id} className="grid grid-cols-12 gap-2.5 items-center">
                            <div className="col-span-6">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                Lista de precios
                              </label>
                              <div className="relative">
                                <select
                                  value={pl.name}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setPriceLists((prev) =>
                                      prev.map((item) => (item.id === pl.id ? { ...item, name: val } : item))
                                    );
                                  }}
                                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-semibold"
                                >
                                  <option value={pl.name}>{pl.name}</option>
                                  <option value="General / POS">General / POS</option>
                                  <option value="Mayorista">Mayorista</option>
                                  <option value="Distribuidor">Distribuidor</option>
                                  <option value="E-commerce">E-commerce</option>
                                </select>
                              </div>
                            </div>

                            <div className="col-span-5">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                Valor
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={pl.value}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setPriceLists((prev) =>
                                      prev.map((item) =>
                                        item.id === pl.id ? { ...item, value: val } : item
                                      )
                                    );
                                  }}
                                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold"
                                />
                              </div>
                            </div>

                            <div className="col-span-1 pt-4 flex justify-center">
                              <button
                                type="button"
                                onClick={() => setPriceLists((prev) => prev.filter((item) => item.id !== pl.id))}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                                title="Opciones"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleAddPriceList}
                        className="text-xs font-bold text-[#FF3F1A] hover:underline flex items-center gap-1.5 cursor-pointer pt-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar lista de precio</span>
                      </button>
                    </div>

                    {/* Subsección Combo (Solo para tipo Combo) */}
                    {itemType === "combo" && (
                      <div className="space-y-3 pt-5 border-t border-slate-100 dark:border-zinc-800">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white">Combo</h4>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                            Selecciona los productos y sus cantidades para armar un combo
                          </p>
                        </div>

                        <div className="space-y-2.5">
                          {comboItems.map((item) => (
                            <div
                              key={item.id}
                              className="p-3.5 bg-slate-50/70 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/80 flex items-center justify-center flex-none text-slate-400">
                                  <Package className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <select
                                    value={item.productId}
                                    onChange={(e) => handleUpdateComboProduct(item.id, e.target.value)}
                                    className="w-full bg-transparent font-bold text-xs text-slate-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
                                  >
                                    <option value="">Seleccionar</option>
                                    {products.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} {p.sku ? `(${p.sku})` : ""} - Costo: ${p.costPrice || 0}
                                      </option>
                                    ))}
                                  </select>
                                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                    {item.productName
                                      ? `Costo unitario: $${item.costPrice.toLocaleString("es-CO")}`
                                      : "Agrega aquí uno de los productos de tu combo"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateComboQuantity(item.id, parseInt(e.target.value, 10) || 1)
                                  }
                                  className="w-16 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-center"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveComboItem(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                                  title="Eliminar"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={handleAddComboItem}
                            className="text-xs font-bold text-[#FF3F1A] hover:underline flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Agregar producto</span>
                          </button>

                          <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                            Costo total:{" "}
                            <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                              ${totalComboCost.toLocaleString("es-CO")}
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  ACORDEÓN 4: Campos Adicionales
              ───────────────────────────────────────────────────────────── */}
              <div className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-2xs overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => toggleSection("customFields")}
                  className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-sm text-slate-900 dark:text-white bg-slate-50/50 dark:bg-zinc-900/40 border-b border-slate-100 dark:border-zinc-800/80 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#FF3F1A]" />
                    <span>Campos adicionales</span>
                  </div>
                  {expandedSections.customFields ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {expandedSections.customFields && (
                  <div className="p-5 space-y-4 animate-fade-in text-xs">
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Conoce cómo crear campos personalizables aquí.
                    </p>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Buscar
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={newCustomFieldName}
                            onChange={(e) => setNewCustomFieldName(e.target.value)}
                            placeholder="Buscar o crear campo personalizado..."
                            className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs"
                          />
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddCustomField}
                          className="px-5 py-2 bg-[#FF3F1A] hover:bg-[#E03513] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>

                    {customFields.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {customFields.map((cf) => (
                          <span
                            key={cf.id}
                            className="px-3 py-1 bg-slate-100 dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-semibold flex items-center gap-2"
                          >
                            <span className="text-slate-500">{cf.name}:</span>
                            <span className="text-slate-900 dark:text-white font-bold">{cf.value || "Activo"}</span>
                            <button
                              type="button"
                              onClick={() => setCustomFields((prev) => prev.filter((item) => item.id !== cf.id))}
                              className="text-slate-400 hover:text-rose-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  ACORDEÓN 5: Configuración Contable
              ───────────────────────────────────────────────────────────── */}
              <div className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-2xs overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => toggleSection("accounting")}
                  className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-sm text-slate-900 dark:text-white bg-slate-50/50 dark:bg-zinc-900/40 border-b border-slate-100 dark:border-zinc-800/80 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#FF3F1A]" />
                    <span>Configuración contable</span>
                  </div>
                  {expandedSections.accounting ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {expandedSections.accounting && (
                  <div className="p-5 space-y-4 animate-fade-in text-xs">
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      {itemType === "combo"
                        ? "Configura la cuenta contable en la que se registrarán las ventas del combo."
                        : "Configura las cuentas contables en las que se registrarán los movimientos contables y de costos."}
                    </p>

                    {itemType === "combo" ? (
                      /* COMBO: Solo Cuenta Contable de Ventas */
                      <div className="space-y-1.5 max-w-md">
                        <label className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                          <span>Cuenta Contable</span>
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        </label>
                        <select
                          value={accountingAccount}
                          onChange={(e) => setAccountingAccount(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs"
                        >
                          <option value="Ventas">Ventas</option>
                          <option value="4135 - Comercio">4135 - Comercio al por mayor y menor</option>
                        </select>
                      </div>
                    ) : (
                      /* PRODUCTO: Cuenta Contable, Cuenta de inventario, Cuenta de costo de venta */
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                              <span>Cuenta Contable</span>
                              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                            </label>
                            <select
                              value={accountingAccount}
                              onChange={(e) => setAccountingAccount(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs"
                            >
                              <option value="Ventas">4135 - Comercio al por mayor y menor (Ventas)</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                              <span>Cuenta de inventario</span>
                              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                            </label>
                            <select
                              value={inventoryAccount}
                              onChange={(e) => setInventoryAccount(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs"
                            >
                              <option value="Inventarios">1435 - Mercancías no fabricadas por la empresa</option>
                              <option value="MateriaPrima">1405 - Materias primas y suministros</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                            <span>Cuenta de costo de venta</span>
                            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                          </label>
                          <select
                            value={costAccount}
                            onChange={(e) => setCostAccount(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs"
                          >
                            <option value="Costos del inventario">6135 - Costo de venta de comercio</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ════════════ RIGHT COLUMN: STICKY PREVIEW & ACTIONS (4 COLS) ════════════ */}
            <div className="lg:col-span-4 lg:sticky lg:top-0 space-y-4">
              <div className="bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-5">
                {/* 1. Subir Imagen Box */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  {images.length > 0 ? (
                    <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-700 group bg-slate-50">
                      <img src={images[0]} alt="Producto" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImages([])}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition-colors cursor-pointer"
                        title="Eliminar imagen"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="h-44 w-full rounded-2xl border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-[#FF3F1A] dark:hover:border-[#FF3F1A] bg-slate-50/70 dark:bg-zinc-900/50 flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all hover:bg-slate-100/60 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 shadow-2xs border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-400 group-hover:text-[#FF3F1A] group-hover:scale-105 transition-all mb-2">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                        Subir imagen
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        PNG, JPG o WebP hasta 5MB
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Resumen en Tiempo Real */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold capitalize text-slate-500 dark:text-zinc-400">
                      {itemType === "combo" ? "Combo" : "Producto"}
                    </span>
                    {itemType === "producto" && (
                      <span className="px-2 py-0.5 rounded-md bg-[#FF3F1A]/10 text-[#FF3F1A] font-bold text-[10px] uppercase">
                        {unitOfMeasure}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-black text-slate-900 dark:text-white line-clamp-2 leading-tight">
                    {name.trim() || "—"}
                  </h3>

                  <div className="space-y-1.5 pt-1">
                    {itemType === "producto" && (
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                        <span>Costo por unidad</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                          $ {parseFloat(costPrice || "0").toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-zinc-300">Precio de venta</span>
                      <span className="text-lg font-black font-mono text-[#FF3F1A]">
                        $ {parseFloat(totalPrice || basePrice || "0").toLocaleString("es-CO", { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Toggles Operativos (SOLO para productos físicos inventariables) */}
                {itemType === "producto" && (
                  <div className="space-y-3.5 pt-4 border-t border-slate-100 dark:border-zinc-800">
                    {/* Toggle: Inventariable */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                            Inventariable
                          </span>
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Mantén activada esta opción para llevar el control de costos y cantidades
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsInventariable(!isInventariable)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors flex-none cursor-pointer ${
                          isInventariable ? "bg-[#FF3F1A]" : "bg-slate-300 dark:bg-zinc-700"
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            isInventariable ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle: Venta en negativo */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                          Venta en negativo
                        </span>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Vende sin unidades disponibles
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setAllowNegativeSale(!allowNegativeSale)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors flex-none cursor-pointer ${
                          allowNegativeSale ? "bg-[#FF3F1A]" : "bg-slate-300 dark:bg-zinc-700"
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            allowNegativeSale ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Botones de Acción */}
                <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-zinc-800">
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={onClose}
                      className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-2xs text-center"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSaveInternal(false)}
                      className="py-2.5 px-4 rounded-xl bg-[#FF3F1A] hover:bg-[#E03513] text-white text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 text-center flex items-center justify-center gap-1.5"
                    >
                      {isSubmitting ? "Guardando..." : "Guardar"}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSaveInternal(true)}
                    className="w-full py-2.5 px-4 rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#18181B] text-slate-800 dark:text-zinc-100 hover:border-[#FF3F1A] hover:text-[#FF3F1A] text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#FF3F1A]" />
                    <span>Guardar y crear otro</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
