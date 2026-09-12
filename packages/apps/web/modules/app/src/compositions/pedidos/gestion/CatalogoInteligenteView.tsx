import React, { useState, useMemo } from "react";
import { usePedidos } from "../context/PedidosContext";
import { useBusiness } from "@/context/BusinessContext";
import { playOrderAlert } from "@/utils/audioAlerts";
import { ProductItem, ProductModifierGroup } from "../types";
import { Button, Card, Field, Select, Textarea, Badge, SegmentedControl, Modal } from "@/elements";
import {
  Layers,
  Sparkles,
  Plus,
  AlertTriangle,
  Star,
  TrendingUp,
  X,
  CheckCircle2,
  SlidersHorizontal,
  Flame,
  ShieldCheck,
  Check,
  Edit3,
  Trash2,
  Eye,
  UtensilsCrossed,
  LayoutGrid,
  Package,
} from "lucide-react";
import { NectoBanner } from "../shared/NectoBanner";

export const CatalogoInteligenteView: React.FC<{
  targetProductId?: string | null;
}> = ({ targetProductId }) => {
  const {
    products,
    ingredients,
    toggleProductAvailability,
    updateProduct,
    addProduct,
    orders,
    createManualOrder,
    hasInventarios,
    inventoryAdapter,
  } = usePedidos();

  const { activeBusiness } = useBusiness();

  const [activeSubTab, setActiveSubTab] = useState<"catalogo" | "resenas">("catalogo");
  const [viewLayout, setViewLayout] = useState<"grouped" | "grid">("grouped");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [starFilter, setStarFilter] = useState<number | "TODOS">("TODOS");
  const [sortBy, setSortBy] = useState<"populares" | "rating" | "precio_asc" | "precio_desc">("populares");

  // Modals
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [, setReviewModalProduct] = useState<ProductItem | null>(null);
  const [customerPreviewProduct, setCustomerPreviewProduct] = useState<ProductItem | null>(null);

  // Category creation modal
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCategoriesList, setCustomCategoriesList] = useState<string[]>([
    "Empanadas",
    "Hamburguesas & Combos",
    "Pizzas",
    "Acompañamientos",
    "Bebidas",
    "Postres",
  ]);

  // Customer Customization State (Interactive simulation)
  const [previewSelectedOptions, setPreviewSelectedOptions] = useState<{ [groupId: string]: string[] }>({});
  const [previewQuantity, setPreviewQuantity] = useState(1);
  const [previewCustomerNotes, setPreviewCustomerNotes] = useState("");
  const [orderAddedToast, setOrderAddedToast] = useState<string | null>(null);

  React.useEffect(() => {
    if (targetProductId) {
      const p = products.find(prod => prod.id === targetProductId || prod.name.toLowerCase().includes("humita"));
      if (p) setEditingProduct(p);
    }
  }, [targetProductId, products]);

  // Extract all categories dynamically from products + custom list
  const allAvailableCategories = useMemo(() => {
    const fromProducts = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const combined = Array.from(new Set(["Todos", ...customCategoriesList, ...fromProducts]));
    return combined;
  }, [products, customCategoriesList]);

  // New Product Form State
  const [newProdName, setNewProdName] = useState("");
  const [newProdCode, setNewProdCode] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("Empanadas");
  const [newProdPrice, setNewProdPrice] = useState<number>(5500);
  const [newProdPrepTime] = useState<number>(12);
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdImage, setNewProdImage] = useState("");
  const [newProdModifiers, setNewProdModifiers] = useState<ProductModifierGroup[]>([]);

  // Response text for reviews
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [submittedReplies, setSubmittedReplies] = useState<{ [key: string]: string }>({});

  // Aggregate all reviews across all products
  const allReviews = useMemo(() => {
    return products.flatMap(p =>
      (p.reviews || []).map(r => ({
        ...r,
        productName: p.name,
        productImage: p.imageUrl,
        productId: p.id,
      }))
    );
  }, [products]);

  const filteredReviews = allReviews.filter(r => {
    if (starFilter !== "TODOS" && r.rating !== starFilter) return false;
    return true;
  });

  // Open Customer Customization Preview
  const handleOpenCustomerPreview = (product: ProductItem) => {
    setCustomerPreviewProduct(product);
    setPreviewQuantity(1);
    setPreviewCustomerNotes("");

    // Initialize defaults for modifiers
    const initialSelections: { [groupId: string]: string[] } = {};
    (product.modifiers || []).forEach(group => {
      if (group.minSelect > 0 && group.options.length > 0) {
        const defaultOpt = group.options.find(o => o.isDefault) || group.options[0];
        initialSelections[group.id] = [defaultOpt.id];
      } else {
        initialSelections[group.id] = [];
      }
    });
    setPreviewSelectedOptions(initialSelections);
  };

  // Toggle modifier option in preview
  const handleTogglePreviewOption = (group: ProductModifierGroup, optionId: string) => {
    const current = previewSelectedOptions[group.id] || [];

    if (group.maxSelect === 1) {
      // Single selection (Radio behavior)
      setPreviewSelectedOptions(prev => ({
        ...prev,
        [group.id]: [optionId],
      }));
    } else {
      // Multiple selection (Checkbox behavior)
      if (current.includes(optionId)) {
        setPreviewSelectedOptions(prev => ({
          ...prev,
          [group.id]: current.filter(id => id !== optionId),
        }));
      } else {
        if (current.length < group.maxSelect) {
          setPreviewSelectedOptions(prev => ({
            ...prev,
            [group.id]: [...current, optionId],
          }));
        }
      }
    }
  };

  // Calculate live preview total
  const computedPreviewTotal = useMemo(() => {
    if (!customerPreviewProduct) return 0;
    let totalPerUnit = customerPreviewProduct.price;

    (customerPreviewProduct.modifiers || []).forEach(group => {
      const selectedIds = previewSelectedOptions[group.id] || [];
      selectedIds.forEach(optId => {
        const opt = group.options.find(o => o.id === optId);
        if (opt) totalPerUnit += opt.priceDelta;
      });
    });

    return totalPerUnit * previewQuantity;
  }, [customerPreviewProduct, previewSelectedOptions, previewQuantity]);

  // Submit test order from customer preview
  const handleTestOrderSubmit = () => {
    if (!customerPreviewProduct) return;

    // Collect modifier descriptions
    const chosenModifierDescriptions: string[] = [];
    (customerPreviewProduct.modifiers || []).forEach(group => {
      const selectedIds = previewSelectedOptions[group.id] || [];
      selectedIds.forEach(optId => {
        const opt = group.options.find(o => o.id === optId);
        if (opt) {
          chosenModifierDescriptions.push(
            `${opt.name}${opt.priceDelta > 0 ? ` (+$${opt.priceDelta.toLocaleString("es-CO")})` : ""}`
          );
        }
      });
    });

    const fullNotes = [
      chosenModifierDescriptions.length > 0 ? `Extras: ${chosenModifierDescriptions.join(", ")}` : "",
      previewCustomerNotes.trim() ? `Nota cliente: ${previewCustomerNotes.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    createManualOrder({
      customerName: "Cliente Web QR (Mesa 3)",
      customerPhone: "+57 310 998 8776",
      channel: "web",
      notes: fullNotes,
      items: [
        {
          productId: customerPreviewProduct.id,
          name: customerPreviewProduct.name,
          quantity: previewQuantity,
          unitPrice: customerPreviewProduct.price,
          notes: fullNotes,
          category: customerPreviewProduct.category,
        },
      ],
      total: computedPreviewTotal,
    });

    playOrderAlert(activeBusiness?.soundAlert || "bell");

    setOrderAddedToast(`Comanda de "${customerPreviewProduct.name}" inyectada en vivo.`);
    setTimeout(() => setOrderAddedToast(null), 3500);
    setCustomerPreviewProduct(null);
  };

  // Modifier Group Quick Templates
  const handleAddModifierTemplate = (
    templateType: "extras" | "cooking" | "sauces" | "drink"
  ) => {
    if (!editingProduct) return;

    let newGroup: ProductModifierGroup;

    switch (templateType) {
      case "extras":
        newGroup = {
          id: `mod-extras-${Date.now()}`,
          title: "Adicionales & Extras Especiales",
          minSelect: 0,
          maxSelect: 4,
          options: [
            { id: `opt-ex-1-${Date.now()}`, name: "Doble Queso Mozzarella", priceDelta: 3000 },
            { id: `opt-ex-2-${Date.now()}`, name: "Tocineta Crujiente Ahumada", priceDelta: 4000 },
            { id: `opt-ex-3-${Date.now()}`, name: "Huevo Frito a la Plancha", priceDelta: 2000 },
            { id: `opt-ex-4-${Date.now()}`, name: "Porción de Papas Rústicas", priceDelta: 5500 },
          ],
        };
        break;
      case "cooking":
        newGroup = {
          id: `mod-cook-${Date.now()}`,
          title: "Tipo de Cocción / Término",
          minSelect: 1,
          maxSelect: 1,
          options: [
            { id: `opt-ck-1-${Date.now()}`, name: "Al Horno de Piedra (Recomendado)", priceDelta: 0, isDefault: true },
            { id: `opt-ck-2-${Date.now()}`, name: "Frita Crocante", priceDelta: 500 },
          ],
        };
        break;
      case "sauces":
        newGroup = {
          id: `mod-sauces-${Date.now()}`,
          title: "Salsas & Dips de la Casa",
          minSelect: 0,
          maxSelect: 2,
          options: [
            { id: `opt-sc-1-${Date.now()}`, name: "Salsa Tártara Artesanal 50ml", priceDelta: 1500 },
            { id: `opt-sc-2-${Date.now()}`, name: "Chimichurri Casero 50ml", priceDelta: 1500 },
            { id: `opt-sc-3-${Date.now()}`, name: "Salsa Criolla con Ají", priceDelta: 1500 },
          ],
        };
        break;
      case "drink":
        newGroup = {
          id: `mod-drink-${Date.now()}`,
          title: "Bebida de Acompañamiento",
          minSelect: 0,
          maxSelect: 1,
          options: [
            { id: `opt-dr-1-${Date.now()}`, name: "Gaseosa Personal 400ml", priceDelta: 4500 },
            { id: `opt-dr-2-${Date.now()}`, name: "Jugo Natural en Agua 16oz", priceDelta: 6000 },
            { id: `opt-dr-3-${Date.now()}`, name: "Cerveza Artesanal 330ml", priceDelta: 8500 },
          ],
        };
        break;
    }

    setEditingProduct({
      ...editingProduct,
      modifiers: [...(editingProduct.modifiers || []), newGroup],
    });
  };

  // Handle Edit Product Save
  const handleSaveProductEdit = () => {
    if (!editingProduct) return;
    const computedCost = (editingProduct.recipe || []).reduce((sum, r) => {
      const ing = ingredients.find(i => i.id === r.ingredientId);
      return sum + (ing ? ing.costPerUnit * r.quantityRequired : 0);
    }, 0);

    updateProduct(editingProduct.id, {
      name: editingProduct.name,
      code: editingProduct.code,
      category: editingProduct.category,
      price: editingProduct.price,
      prepTimeMinutes: editingProduct.prepTimeMinutes,
      description: editingProduct.description,
      imageUrl: editingProduct.imageUrl,
      modifiers: editingProduct.modifiers || [],
      recipe: editingProduct.recipe || [],
      autoPauseOnStockOut: editingProduct.autoPauseOnStockOut,
      costEstimated: computedCost > 0 ? computedCost : editingProduct.costEstimated,
    });
    setEditingProduct(null);
  };

  // Handle Create Product Save
  const handleCreateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || newProdPrice <= 0) return;

    addProduct({
      name: newProdName,
      code: newProdCode || `PRD-${Math.floor(Math.random() * 900 + 100)}`,
      category: newProdCategory,
      price: Number(newProdPrice),
      prepTimeMinutes: Number(newProdPrepTime) || 12,
      description: newProdDesc || "Plato artesanal preparado con ingredientes frescos.",
      imageUrl:
        newProdImage ||
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
      isActive: true,
      isAvailable: true,
      stockEstimated: 30,
      salesCount: 0,
      rating: 5.0,
      reviewsCount: 0,
      reviews: [],
      modifiers: newProdModifiers,
    });

    // Reset Form
    setNewProdName("");
    setNewProdCode("");
    setNewProdPrice(5500);
    setNewProdDesc("");
    setNewProdImage("");
    setNewProdModifiers([]);
    setIsCreatingProduct(false);
  };

  // Add new category
  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const cat = newCategoryName.trim();
    if (!customCategoriesList.includes(cat)) {
      setCustomCategoriesList(prev => [...prev, cat]);
      setSelectedCategory(cat);
    }
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  // Sort and filter helper
  const sortProducts = (list: ProductItem[]) => {
    return [...list].sort((a, b) => {
      if (sortBy === "populares") return (a.popularityRank || 99) - (b.popularityRank || 99);
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "precio_asc") return a.price - b.price;
      if (sortBy === "precio_desc") return b.price - a.price;
      return 0;
    });
  };

  // Render a Single Product Card
  const renderProductCard = (product: ProductItem) => {
    const activeOrdersWithProd = orders.filter(
      o =>
        ["NUEVO", "CONFIRMADO", "EN_PREPARACION"].includes(o.status) &&
        o.items.some(i => i.productId === product.id)
    ).length;

    const modifierCount = (product.modifiers || []).reduce(
      (acc, g) => acc + g.options.length,
      0
    );

    return (
      <Card
        key={product.id}
        className={`bg-white dark:bg-gray-900 rounded-2xl border flex flex-col justify-between overflow-hidden transition-all hover:shadow-theme-md ${
          product.isAvailable
            ? "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
            : "border-gray-200/60 dark:border-gray-800/60 opacity-75"
        }`}
      >
        {/* Photo Header */}
        <div className="relative h-48 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
          <img
            src={
              product.imageUrl ||
              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"
            }
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-500 hover:scale-105 ${
              !product.isAvailable ? "grayscale opacity-60" : ""
            }`}
          />

          {/* Popularity Badge */}
          {product.popularityRank && product.popularityRank <= 3 && (
            <span className="absolute top-3 left-3 bg-brand-500 text-white text-[10px] font-bold font-mono px-2.5 py-1 rounded-xl shadow-theme-xs flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-white" />
              <span>#{product.popularityRank} Más Pedido</span>
            </span>
          )}

          {/* Price Tag */}
          <div className="absolute bottom-3 right-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md text-gray-900 dark:text-white px-3 py-1 rounded-xl text-xs font-mono font-bold shadow-theme-xs border border-gray-200/50 dark:border-gray-800">
            ${product.price.toLocaleString("es-CO")}
          </div>

          <span className="absolute bottom-3 left-3 bg-secondary-600/90 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg border border-white/20">
            {product.category}
          </span>
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-1">
                {product.name}
              </h4>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug line-clamp-2">
              {product.description}
            </p>

            {/* Live Inventory Availability from ModuloInventario */}
            {hasInventarios && (() => {
              const invStock = inventoryAdapter.getProductStock(product.id, product.name);
              if (!invStock) return null;
              return (
                <div className="flex items-center justify-between text-[11px] bg-gray-50 dark:bg-gray-800/60 px-2.5 py-1.5 rounded-xl border border-gray-200/70 dark:border-gray-700">
                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                    <Package className="w-3.5 h-3.5 text-brand-500" />
                    <span className="font-medium">Stock Inventario:</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono font-bold">
                    <span className={invStock.availableStock <= 0 ? "text-error-500" : "text-gray-900 dark:text-white"}>
                      {invStock.availableStock} disp.
                    </span>
                    {invStock.reservedStock > 0 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                        ({invStock.reservedStock} res.)
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Modifiers & Extras Chip */}
            <div className="pt-1">
              {product.modifiers && product.modifiers.length > 0 ? (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-xl border border-gray-200/80 dark:border-gray-700">
                  <Sparkles className="w-3 h-3 text-brand-500" />
                  <span>
                    {product.modifiers.length} grupo(s) · {modifierCount} extras/opciones
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                  <span>Sin adicionales configurados</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Customizer Preview Button */}
          <Button
            variant="ghost"
            size="sm"
            intent="catalog.product.preview.open"
            onClick={() => handleOpenCustomerPreview(product)}
            className="w-full py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800/80 dark:hover:bg-gray-800 border border-gray-200/80 dark:border-gray-700 text-gray-900 dark:text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-theme-xs group"
          >
            <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-brand-500" />
            <span>Personalizar (Vista Cliente)</span>
          </Button>

          {/* Ratings & Orders */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              intent="catalog.product.reviews.open"
              onClick={() => setReviewModalProduct(product)}
              className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white border border-gray-200/70 dark:border-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-theme-xs transition-all cursor-pointer"
              title="Ver opiniones"
            >
              <Star className="w-3.5 h-3.5 fill-brand-500 text-brand-500" />
              <span>{product.rating || 4.9}</span>
              <span className="text-[10px] font-normal opacity-70">
                ({product.reviewsCount || 0})
              </span>
            </Button>

            <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700 text-gray-900 dark:text-white font-bold text-xs flex items-center justify-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-brand-500" />
              <span className="font-mono">{product.salesCount || 120} cmds</span>
            </div>
          </div>

          {/* Live Kitchen Notice */}
          {activeOrdersWithProd > 0 && (
            <div className="bg-secondary-600/10 dark:bg-secondary-600/20 border border-secondary-600/20 rounded-xl px-3 py-1.5 text-xs text-secondary-600 dark:text-secondary-400 font-bold flex items-center justify-between">
              <span>{activeOrdersWithProd} en cocina ahora</span>
              <span className="font-mono">{product.prepTimeMinutes}m</span>
            </div>
          )}

          {/* Footer Controls: Edit Product & Stock Switch */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              intent="catalog.product.edit.open"
              onClick={() => setEditingProduct({ ...product })}
              className="py-1.5 px-3 text-xs rounded-xl border-gray-200 dark:border-gray-700 hover:border-brand-500 hover:text-brand-500"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1" />
              <span>Editar Extras</span>
            </Button>

            {/* Availability Switch */}
            <Button
              variant="ghost"
              size="sm"
              intent="catalog.product.availability.toggle"
              onClick={() => toggleProductAvailability(product.id)}
              className={`p-0 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-theme-xs ${
                product.isAvailable
                  ? "bg-secondary-600/10 text-secondary-600 dark:text-secondary-400 border border-secondary-600/20 hover:bg-secondary-600/15"
                  : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
            >
              {product.isAvailable ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-secondary-600 dark:text-secondary-400" />
                  <span>Disponible</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                  <span>Pausado</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header Banner */}
      <NectoBanner
        icon={<Layers className="w-6 h-6 text-brand-500" />}
        title="Catálogo & Menú por Categorías"
        description="Organización agrupada por categorías, personalizaciones de platos de cara al cliente (extras, salsas y términos) y recetas de stock."
      />

      {/* Subtab Switcher Toolbar */}
      <SegmentedControl
        intent="catalog.subtab"
        tone="accent"
        className="w-fit rounded-2xl"
        value={activeSubTab}
        onValueChange={setActiveSubTab}
        options={[
          { value: "catalogo", label: `Catálogo & Platos (${products.length})` },
          { value: "resenas", label: `Opiniones de Clientes (${allReviews.length})` },
        ]}
      />

      {/* Top Intelligence Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Platos */}
        <Card className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs p-5 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Platos en Carta
          </span>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl sm:text-3xl font-bold font-mono text-gray-900 dark:text-white">
              {products.length}
            </p>
            <Badge variant="light" color="success" size="sm">
              {products.filter(p => p.isAvailable).length} activos
            </Badge>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {products.filter(p => !p.isAvailable).length} pausados por falta de insumos
          </p>
        </Card>

        {/* Stat 2: Calificación Global */}
        <Card className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs p-5 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Satisfacción de Clientes
          </span>
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-1.5">
              <p className="text-2xl sm:text-3xl font-bold font-mono text-gray-900 dark:text-white">
                4.9
              </p>
              <Star className="w-5 h-5 fill-brand-500 text-brand-500" />
            </div>
            <span className="text-xs font-semibold text-gray-500">
              {allReviews.length * 15 + 45} reseñas
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">98.2% de calificaciones positivas</p>
        </Card>

        {/* Stat 3: Más Vendido */}
        <Card className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs p-5 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Plato Estrella #1
          </span>
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[140px]">
              Carne a Cuchillo
            </p>
            <span className="text-xs font-bold text-brand-500 font-mono">
              482 cmds
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">38% del volumen de ventas</p>
        </Card>

        {/* Stat 4: Categorías */}
        <Card className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs p-5 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Categorías Activas
          </span>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl sm:text-3xl font-bold font-mono text-gray-900 dark:text-white">
              {allAvailableCategories.length - 1}
            </p>
            <Badge variant="light" color="brand" size="sm">
              Estructurado
            </Badge>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Agrupado por secciones de menú</p>
        </Card>
      </div>

      {/* SUBTAB 1: Catálogo de Platos */}
      {activeSubTab === "catalogo" && (
        <div className="space-y-6">
          {/* Category Bar & Controls */}
          <div className="bg-white dark:bg-[#151518] rounded-2xl p-2.5 sm:p-3.5 border border-zinc-200/70 dark:border-zinc-800/80 shadow-none flex flex-wrap items-center justify-between gap-3">
            {/* Category Filter Pills + New Category Button */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none max-w-full flex-nowrap py-1">
              {allAvailableCategories.map(cat => {
                const count =
                  cat === "Todos"
                    ? products.length
                    : products.filter(p => p.category === cat).length;

                return (
                  <Button
                    key={cat}
                    variant="ghost"
                    intent="catalog.category.select"
                    onClick={() => setSelectedCategory(cat)}
                    className={`p-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 flex-none ${
                      selectedCategory === cat
                        ? "bg-[#190088] text-white shadow-xs font-bold"
                        : "bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[10px] font-mono ${selectedCategory === cat ? "text-white/80" : "text-zinc-400"}`}>({count})</span>
                  </Button>
                );
              })}

              <Button
                variant="outline"
                intent="catalog.category.new"
                onClick={() => setIsAddingCategory(true)}
                className="flex-none border-dashed rounded-2xl"
                title="Añadir nueva categoría"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Categoría</span>
              </Button>
            </div>

            {/* Right Controls: View Layout, Sort & New Product Button */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Grouped View vs Grid Switch */}
              <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <Button
                  variant="ghost"
                  intent="catalog.view.layout.grouped"
                  onClick={() => setViewLayout("grouped")}
                  className={`p-0 p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    viewLayout === "grouped"
                      ? "bg-white dark:bg-zinc-750 text-[#FF3F1A] shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                  title="Vista Agrupada por Secciones"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Por Secciones</span>
                </Button>
                <Button
                  variant="ghost"
                  intent="catalog.view.layout.grid"
                  onClick={() => setViewLayout("grid")}
                  className={`p-0 p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    viewLayout === "grid"
                      ? "bg-white dark:bg-zinc-750 text-[#FF3F1A] shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                  title="Vista de Cuadrícula Plana"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cuadrícula</span>
                </Button>
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="text-zinc-400 hidden sm:flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Ordenar:
                </span>
                <Select
                  intent="catalog.sort"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  options={[
                    { value: "populares", label: "Más Pedidos (#1)" },
                    { value: "rating", label: "Mejor Calificados" },
                    { value: "precio_desc", label: "Mayor Precio" },
                    { value: "precio_asc", label: "Menor Precio" },
                  ]}
                />
              </div>

              <Button
                variant="primary"
                intent="catalog.product.new"
                onClick={() => setIsCreatingProduct(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Plato</span>
              </Button>
            </div>
          </div>

          {/* MAIN PRODUCT LISTING: Grouped Sections or Flat Grid */}
          {viewLayout === "grouped" && selectedCategory === "Todos" ? (
            /* GROUPED BY CATEGORY SECTIONS */
            <div className="space-y-8">
              {allAvailableCategories
                .filter(cat => cat !== "Todos")
                .map(cat => {
                  const catProducts = sortProducts(products.filter(p => p.category === cat));
                  if (catProducts.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-4">
                      {/* Category Section Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-secondary-600/10 text-secondary-600 dark:text-secondary-400 border border-secondary-600/20 flex items-center justify-center font-bold">
                            <UtensilsCrossed className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight">
                              {cat}
                            </h3>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              {catProducts.length} producto(s) disponibles en esta sección
                            </p>
                          </div>
                        </div>

                        <Badge variant="light" color="light" size="sm">
                          {catProducts.length} Platos
                        </Badge>
                      </div>

                      {/* Category Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {catProducts.map(renderProductCard)}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            /* FLAT FILTERED GRID */
            <div>
              {(() => {
                const filtered = sortProducts(
                  products.filter(p => selectedCategory === "Todos" || p.category === selectedCategory)
                );

                if (filtered.length === 0) {
                  return (
                    <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3 shadow-theme-xs">
                      <UtensilsCrossed className="w-8 h-8 text-gray-400 mx-auto" />
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        No hay platos en la categoría "{selectedCategory}"
                      </h4>
                      <Button
                        variant="accent"
                        intent="catalog.product.new.empty"
                        onClick={() => {
                          setNewProdCategory(selectedCategory === "Todos" ? "Empanadas" : selectedCategory);
                          setIsCreatingProduct(true);
                        }}
                        className="mx-auto"
                      >
                        Crear primer plato en {selectedCategory}
                      </Button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(renderProductCard)}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: Centro de Reseñas */}
      {activeSubTab === "resenas" && (
        <div className="space-y-6">
          {/* Rating Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {["TODOS", 5, 4, 3, 2, 1].map(r => (
              <Button
                key={r}
                variant="ghost"
                intent="review.star.filter"
                onClick={() => setStarFilter(r as any)}
                className={`p-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  starFilter === r
                    ? "bg-brand-500 text-white shadow-theme-xs"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                }`}
              >
                {r === "TODOS" ? (
                  "Todas las opiniones"
                ) : (
                  <span className="flex items-center gap-1">
                    <span>{r}</span>
                    <Star className="w-3 h-3 fill-current inline" />
                  </span>
                )}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReviews.map(rev => (
              <div
                key={rev.id}
                className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={rev.productImage}
                      alt={rev.productName}
                      className="w-11 h-11 rounded-xl object-cover border border-gray-200 dark:border-gray-700"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                        {rev.productName}
                      </h4>
                      <div className="flex items-center gap-0.5 text-brand-500 text-xs font-bold mt-0.5">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-brand-500 text-brand-500" />
                        ))}
                        <span className="text-gray-400 text-[10px] ml-1.5 font-normal">
                          por {rev.author} · {rev.date}
                        </span>
                      </div>
                    </div>
                  </div>

                  {rev.verifiedOrder && (
                    <Badge variant="light" color="success" size="sm">
                      <ShieldCheck className="w-3 h-3" /> Verificado
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-300 italic leading-relaxed">
                  "{rev.comment}"
                </p>

                {/* Reply section */}
                {submittedReplies[rev.id] ? (
                  <div className="p-3 rounded-xl bg-brand-50/70 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900/40 text-xs text-gray-800 dark:text-gray-200">
                    <span className="font-bold text-brand-500 text-[11px] block">Respuesta del Local:</span>
                    <p className="mt-0.5">{submittedReplies[rev.id]}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <input
                      type="text"
                      placeholder="Responder al cliente como local..."
                      value={replyText[rev.id] || ""}
                      onChange={e => setReplyText({ ...replyText, [rev.id]: e.target.value })}
                      className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white"
                    />
                    <Button
                      variant="primary"
                      intent="catalog.review.reply.send"
                      onClick={() => {
                        if (replyText[rev.id]?.trim()) {
                          setSubmittedReplies({ ...submittedReplies, [rev.id]: replyText[rev.id] });
                          setReplyText({ ...replyText, [rev.id]: "" });
                        }
                      }}
                      className="px-3 py-1.5"
                    >
                      Enviar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CUSTOMER CUSTOMIZATION & LIVE PREVIEW (Vista de cara al cliente) */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL 1: CUSTOMER CUSTOMIZATION & LIVE PREVIEW (Vista de cara al cliente) */}
      {/* ========================================================================= */}
      {customerPreviewProduct && (
        <Modal
          isOpen={!!customerPreviewProduct}
          onClose={() => setCustomerPreviewProduct(null)}
          className="max-w-xl overflow-hidden p-0"
          showCloseButton={false}
        >
          <div className="flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header with Photo & Close */}
            <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex-none">
              <img
                src={customerPreviewProduct.imageUrl}
                alt={customerPreviewProduct.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              <Button
                variant="ghost"
                intent="catalog.preview.close"
                onClick={() => setCustomerPreviewProduct(null)}
                className="p-0 absolute top-4 right-4 w-9 h-9 rounded-2xl bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </Button>

              <div className="absolute bottom-4 left-5 right-5 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-black leading-tight">
                    {customerPreviewProduct.name}
                  </h3>
                  <span className="font-mono text-base font-black px-3 py-1 rounded-xl bg-brand-500 text-white">
                    ${customerPreviewProduct.price.toLocaleString("es-CO")}
                  </span>
                </div>
                <p className="text-xs text-gray-200 mt-1 line-clamp-2">
                  {customerPreviewProduct.description}
                </p>
              </div>
            </div>

            {/* Customization Options Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {(customerPreviewProduct.modifiers || []).length === 0 ? (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 text-center text-xs text-gray-500">
                  Este plato se sirve en su receta estándar sin modificadores adicionales.
                </div>
              ) : (
                customerPreviewProduct.modifiers?.map(group => {
                  const isSingleSelect = group.maxSelect === 1;
                  const selectedInGroup = previewSelectedOptions[group.id] || [];

                  return (
                    <div
                      key={group.id}
                      className="p-4 sm:p-5 rounded-3xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                            {group.title}
                          </h4>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {isSingleSelect
                              ? "Selecciona 1 opción obligatoria"
                              : `Selecciona hasta ${group.maxSelect} adicionales`}
                          </p>
                        </div>
                        <Badge variant="light" color={group.minSelect > 0 ? "warning" : "light"} size="sm">
                          {group.minSelect > 0 ? "Obligatorio" : "Opcional"}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {group.options.map(opt => {
                          const isSelected = selectedInGroup.includes(opt.id);

                          return (
                            <div
                              key={opt.id}
                              onClick={() => handleTogglePreviewOption(group, opt.id)}
                              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                isSelected
                                  ? "bg-white dark:bg-gray-800 border-gray-900 dark:border-gray-100 shadow-theme-xs font-bold"
                                  : "bg-white/70 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/60 text-gray-700 dark:text-gray-300 hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-5 h-5 rounded-${isSingleSelect ? "full" : "lg"} flex items-center justify-center flex-none transition-colors ${
                                    isSelected
                                      ? "bg-brand-500 text-white"
                                      : "border border-gray-300 dark:border-gray-600"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className="text-xs font-semibold truncate">{opt.name}</span>
                              </div>

                              <span className="text-xs font-mono font-bold text-gray-900 dark:text-gray-100 flex-none">
                                {opt.priceDelta > 0
                                  ? `+$${opt.priceDelta.toLocaleString("es-CO")}`
                                  : "Sin costo"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Special Instructions Textarea */}
              <Textarea
                label="Instrucciones especiales para Cocina"
                intent="preview.customer.notes"
                rows={2}
                value={previewCustomerNotes}
                onChange={e => setPreviewCustomerNotes(e.target.value)}
                placeholder="Ej. Sin cebolla, salsa aparte, servilletas extra..."
              />
            </div>

            {/* Bottom Floating Bar with Quantity & Total */}
            <div className="p-5 sm:p-6 bg-gray-50/90 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-4 flex-none">
              {/* Quantity Controls */}
              <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-1 shadow-theme-xs">
                <Button
                  variant="ghost"
                  intent="preview.qty.decrease"
                  onClick={() => setPreviewQuantity(Math.max(1, previewQuantity - 1))}
                  className="p-0 w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-gray-200 font-bold flex items-center justify-center cursor-pointer transition-colors"
                >
                  -
                </Button>
                <span className="font-mono text-sm font-bold w-6 text-center text-gray-900 dark:text-white">
                  {previewQuantity}
                </span>
                <Button
                  variant="ghost"
                  intent="preview.qty.increase"
                  onClick={() => setPreviewQuantity(previewQuantity + 1)}
                  className="p-0 w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-gray-200 font-bold flex items-center justify-center cursor-pointer transition-colors"
                >
                  +
                </Button>
              </div>

              {/* Add to order button */}
              <Button
                variant="accent"
                intent="preview.order.submit"
                onClick={handleTestOrderSubmit}
                className="flex-1 py-3 px-5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all flex items-center justify-between shadow-theme-xs cursor-pointer active:scale-98"
              >
                <span>Probar Comanda en Vivo</span>
                <span className="font-mono font-black text-sm">
                  ${computedPreviewTotal.toLocaleString("es-CO")}
                </span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT PRODUCT & MODIFIERS STUDIO                                 */}
      {/* ========================================================================= */}
      {editingProduct && (
        <Modal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8"
          showCloseButton={false}
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-500 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                    Editar Plato & Personalizaciones
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Configura precios, recetas y opciones de adicionales de cara al cliente.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                intent="catalog.product.edit.close"
                onClick={() => setEditingProduct(null)}
                className="w-9 h-9 p-0 rounded-2xl text-gray-400"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* General Info Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Nombre del Plato:"
                labelStyle="bold"
                intent="catalog.product.edit.name"
                type="text"
                value={editingProduct.name}
                onChange={e =>
                  setEditingProduct({ ...editingProduct, name: e.target.value })
                }
              />

              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="Precio ($ COP):"
                  labelStyle="bold"
                  mono
                  intent="catalog.product.edit.price"
                  type="number"
                  value={editingProduct.price}
                  onChange={e =>
                    setEditingProduct({
                      ...editingProduct,
                      price: Number(e.target.value),
                    })
                  }
                />
                <Select
                  label="Categoría:"
                  intent="catalog.product.edit.category"
                  value={editingProduct.category}
                  onChange={e =>
                    setEditingProduct({
                      ...editingProduct,
                      category: e.target.value,
                    })
                  }
                  options={allAvailableCategories
                    .filter(c => c !== "Todos")
                    .map(c => ({ value: c, label: c }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="URL Foto del Plato:"
                labelStyle="bold"
                intent="catalog.product.edit.image"
                type="text"
                value={editingProduct.imageUrl}
                onChange={e =>
                  setEditingProduct({
                    ...editingProduct,
                    imageUrl: e.target.value,
                  })
                }
              />
              <Field
                label="Tiempo estimado (min):"
                labelStyle="bold"
                mono
                intent="catalog.product.edit.cooktime"
                type="number"
                value={editingProduct.estimatedCookTimeMinutes || 15}
                onChange={e =>
                  setEditingProduct({
                    ...editingProduct,
                    estimatedCookTimeMinutes: Number(e.target.value),
                  })
                }
              />
            </div>

            <div>
              <Textarea
                label="Descripción comercial:"
                intent="catalog.product.edit.description"
                rows={2}
                value={editingProduct.description}
                onChange={e =>
                  setEditingProduct({
                    ...editingProduct,
                    description: e.target.value,
                  })
                }
              />
            </div>

            {/* Modifiers & Extras Studio Section */}
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                    <span>Personalizaciones, Extras & Modificadores</span>
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Opciones que el cliente podrá elegir y pagar adicionalmente.
                  </p>
                </div>

                {/* Fast Template Inserters */}
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    variant="ghost"
                    intent="catalog.modifier.preset.extras"
                    onClick={() => handleAddModifierTemplate("extras")}
                    className="p-0 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 text-brand-500 border border-brand-200 dark:border-brand-900/60 cursor-pointer"
                  >
                    + Preset Extras
                  </Button>
                  <Button
                    variant="ghost"
                    intent="catalog.modifier.preset.cooking"
                    onClick={() => handleAddModifierTemplate("cooking")}
                    className="p-0 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 cursor-pointer"
                  >
                    + Preset Cocción
                  </Button>
                  <Button
                    variant="ghost"
                    intent="catalog.modifier.preset.sauces"
                    onClick={() => handleAddModifierTemplate("sauces")}
                    className="p-0 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 cursor-pointer"
                  >
                    + Preset Salsas
                  </Button>
                </div>
              </div>

              {(editingProduct.modifiers || []).length === 0 ? (
                <div className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-800/40 border border-dashed border-gray-300 dark:border-gray-700 text-center space-y-2">
                  <p className="text-xs text-gray-400">
                    Sin grupos de personalización para este plato.
                  </p>
                  <Button
                    variant="ghost"
                    intent="catalog.modifier.group.add.first"
                    onClick={() => handleAddModifierTemplate("extras")}
                    className="p-0 py-1.5 px-3 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-bold cursor-pointer"
                  >
                    Añadir Primer Grupo de Extras
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {editingProduct.modifiers?.map((group, gIdx) => (
                    <div
                      key={group.id}
                      className="p-4 sm:p-5 rounded-3xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <input
                          type="text"
                          value={group.title}
                          onChange={e => {
                            const updated = [...(editingProduct.modifiers || [])];
                            updated[gIdx].title = e.target.value;
                            setEditingProduct({ ...editingProduct, modifiers: updated });
                          }}
                          className="font-bold text-xs text-gray-900 dark:text-white bg-white dark:bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 flex-1"
                          placeholder="Nombre del grupo (ej. Elige tus Extras)"
                        />

                        <div className="flex items-center gap-2">
                          <select
                            value={group.maxSelect === 1 ? "single" : "multi"}
                            onChange={e => {
                              const isSingle = e.target.value === "single";
                              const updated = [...(editingProduct.modifiers || [])];
                              updated[gIdx].minSelect = isSingle ? 1 : 0;
                              updated[gIdx].maxSelect = isSingle ? 1 : 4;
                              setEditingProduct({ ...editingProduct, modifiers: updated });
                            }}
                            className="text-xs font-bold border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                          >
                            <option value="single">Selección Única (1)</option>
                            <option value="multi">Múltiples Extras</option>
                          </select>

                          <Button
                            variant="ghost"
                            intent="catalog.modifier.group.remove"
                            onClick={() => {
                              const updated = editingProduct.modifiers?.filter((_, i) => i !== gIdx);
                              setEditingProduct({ ...editingProduct, modifiers: updated });
                            }}
                            className="p-0 w-8 h-8 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950 flex items-center justify-center cursor-pointer transition-colors"
                            title="Eliminar grupo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Options in this Group */}
                      <div className="space-y-2">
                        {group.options.map((opt, oIdx) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={opt.name}
                              onChange={e => {
                                const updated = [...(editingProduct.modifiers || [])];
                                updated[gIdx].options[oIdx].name = e.target.value;
                                setEditingProduct({ ...editingProduct, modifiers: updated });
                              }}
                              className="flex-1 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-1.5 text-gray-800 dark:text-gray-200"
                              placeholder="Nombre de la opción (ej. Queso Extra)"
                            />

                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-gray-400 font-mono">+$</span>
                              <input
                                type="number"
                                value={opt.priceDelta}
                                onChange={e => {
                                  const updated = [...(editingProduct.modifiers || [])];
                                  updated[gIdx].options[oIdx].priceDelta = Number(e.target.value);
                                  setEditingProduct({ ...editingProduct, modifiers: updated });
                                }}
                                className="w-24 text-xs font-mono font-bold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-2.5 py-1.5 text-gray-800 dark:text-gray-200"
                                placeholder="Precio"
                              />
                            </div>

                            <Button
                              variant="ghost"
                              intent="catalog.modifier.option.remove"
                              onClick={() => {
                                const updated = [...(editingProduct.modifiers || [])];
                                updated[gIdx].options = updated[gIdx].options.filter((_, i) => i !== oIdx);
                                setEditingProduct({ ...editingProduct, modifiers: updated });
                              }}
                              className="p-0 w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 flex items-center justify-center cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}

                        <Button
                          variant="ghost"
                          intent="catalog.modifier.option.add"
                          onClick={() => {
                            const updated = [...(editingProduct.modifiers || [])];
                            updated[gIdx].options.push({
                              id: `opt-${Date.now()}`,
                              name: "Nueva Opción",
                              priceDelta: 0,
                            });
                            setEditingProduct({ ...editingProduct, modifiers: updated });
                          }}
                          className="p-0 text-[11px] font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1 pt-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Añadir Opción a este grupo
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
              <Button
                variant="ghost"
                intent="catalog.product.edit.cancel"
                onClick={() => setEditingProduct(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="accent"
                intent="catalog.product.edit.save"
                onClick={handleSaveProductEdit}
                className="px-6"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE NEW CATEGORY                                             */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddingCategory}
        onClose={() => setIsAddingCategory(false)}
        className="max-w-sm p-6"
        showCloseButton={false}
      >
        <form onSubmit={handleAddNewCategory} className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Nueva Categoría de Menú
            </h3>
            <Button
              variant="ghost"
              intent="catalog.category.create.close"
              onClick={() => setIsAddingCategory(false)}
              className="w-7 h-7 p-0 text-gray-400"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Field
            label="Nombre de la Categoría:"
            labelStyle="bold"
            intent="catalog.category.create.name"
            type="text"
            required
            autoFocus
            placeholder="Ej. Pizzas Artesanales, Postres..."
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              intent="catalog.category.create.cancel"
              onClick={() => setIsAddingCategory(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="accent"
              intent="catalog.category.create.submit"
            >
              Crear Categoría
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: CREATE NEW PRODUCT                                              */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreatingProduct}
        onClose={() => setIsCreatingProduct(false)}
        className="max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8"
        showCloseButton={false}
      >
        <form onSubmit={handleCreateProductSubmit} className="space-y-5">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-500 flex items-center justify-center font-bold">
                <Plus className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Crear Nuevo Plato
              </h3>
            </div>
            <Button
              variant="ghost"
              intent="catalog.product.create.close"
              onClick={() => setIsCreatingProduct(false)}
              className="w-8 h-8 p-0 text-gray-400"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-3">
            <Field
              label="Nombre del Plato:"
              labelStyle="bold"
              intent="catalog.product.create.name"
              type="text"
              required
              placeholder="Ej. Hamburguesa Doble Cheddar con Bacon"
              value={newProdName}
              onChange={e => setNewProdName(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Categoría:"
                intent="catalog.product.create.category"
                value={newProdCategory}
                onChange={e => setNewProdCategory(e.target.value)}
                options={allAvailableCategories
                  .filter(c => c !== "Todos")
                  .map(c => ({ value: c, label: c }))}
              />

              <Field
                label="Precio ($ COP):"
                labelStyle="bold"
                mono
                intent="catalog.product.create.price"
                type="number"
                required
                value={newProdPrice}
                onChange={e => setNewProdPrice(Number(e.target.value))}
              />
            </div>

            <Textarea
              label="Descripción:"
              intent="catalog.product.create.description"
              rows={2}
              placeholder="Describe los ingredientes principales para el menú digital..."
              value={newProdDesc}
              onChange={e => setNewProdDesc(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
            <Button
              variant="ghost"
              intent="catalog.product.create.cancel"
              onClick={() => setIsCreatingProduct(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="accent"
              intent="catalog.product.create.submit"
              className="px-6"
            >
              Crear Plato
            </Button>
          </div>
        </form>
      </Modal>

      {/* Floating Order Injected Toast */}
      {orderAddedToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-zinc-950 text-white border border-zinc-800 shadow-2xl flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{orderAddedToast}</span>
        </div>
      )}
    </div>
  );
};
