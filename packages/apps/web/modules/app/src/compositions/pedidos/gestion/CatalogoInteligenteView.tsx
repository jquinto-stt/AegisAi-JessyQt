import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { ProductItem, ProductReview, ProductModifierGroup, ProductModifierOption } from "../types";
import {
  Layers,
  Sparkles,
  Plus,
  DollarSign,
  AlertTriangle,
  Star,
  MessageSquare,
  TrendingUp,
  X,
  CheckCircle2,
  SlidersHorizontal,
  Flame,
  Award,
  ThumbsUp,
  ShieldCheck,
  Clock,
  MessageCircle,
  Reply,
  Check,
  Edit3,
  Trash2,
  Settings,
  ChevronRight,
  HelpCircle,
  Tag,
  Package,
} from "lucide-react";
import { NectoBanner } from "../shared/NectoBanner";

export const CatalogoInteligenteView: React.FC<{
  targetProductId?: string | null;
}> = ({ targetProductId }) => {
  const {
    products,
    toggleProductAvailability,
    updateProductPrice,
    updateProduct,
    addProduct,
    orders,
  } = usePedidos();

  const [activeSubTab, setActiveSubTab] = useState<"catalogo" | "resenas">("catalogo");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [starFilter, setStarFilter] = useState<number | "TODOS">("TODOS");
  const [sortBy, setSortBy] = useState<"populares" | "rating" | "precio_asc" | "precio_desc">("populares");

  // Edit / Create Modals
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [reviewModalProduct, setReviewModalProduct] = useState<ProductItem | null>(null);

  React.useEffect(() => {
    if (targetProductId) {
      const p = products.find(prod => prod.id === targetProductId || prod.name.toLowerCase().includes("humita"));
      if (p) setEditingProduct(p);
    }
  }, [targetProductId, products]);

  // New Product Form State
  const [newProdName, setNewProdName] = useState("");
  const [newProdCode, setNewProdCode] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("Empanadas");
  const [newProdPrice, setNewProdPrice] = useState<number>(5000);
  const [newProdPrepTime, setNewProdPrepTime] = useState<number>(10);
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdImage, setNewProdImage] = useState("");
  const [newProdModifiers, setNewProdModifiers] = useState<ProductModifierGroup[]>([]);

  // Response text for reviews
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [submittedReplies, setSubmittedReplies] = useState<{ [key: string]: string }>({});

  const categories = [
    "Todos",
    "Empanadas",
    "Combos",
    "Acompañamientos",
    "Bebidas",
    "Postres",
  ];

  // Aggregate all reviews across all products
  const allReviews = products.flatMap(p =>
    (p.reviews || []).map(r => ({
      ...r,
      productName: p.name,
      productImage: p.imageUrl,
      productId: p.id,
    }))
  );

  const filteredReviews = allReviews.filter(r => {
    if (starFilter !== "TODOS" && r.rating !== starFilter) return false;
    return true;
  });

  // Filter & Sort Products
  let displayProducts = [...products];

  if (selectedCategory !== "Todos") {
    displayProducts = displayProducts.filter(p => p.category === selectedCategory);
  }

  if (sortBy === "populares") {
    displayProducts.sort((a, b) => (a.popularityRank || 99) - (b.popularityRank || 99));
  } else if (sortBy === "rating") {
    displayProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortBy === "precio_asc") {
    displayProducts.sort((a, b) => a.price - b.price);
  } else if (sortBy === "precio_desc") {
    displayProducts.sort((a, b) => b.price - a.price);
  }

  // Group products by category when in "Todos" mode
  const categorizedSections: Record<string, ProductItem[]> = {};
  categories.filter(c => c !== "Todos").forEach(cat => {
    categorizedSections[cat] = products.filter(p => p.category === cat);
  });

  // Handle Edit Product Save
  const handleSaveProductEdit = () => {
    if (!editingProduct) return;
    updateProduct(editingProduct.id, {
      name: editingProduct.name,
      code: editingProduct.code,
      category: editingProduct.category,
      price: editingProduct.price,
      prepTimeMinutes: editingProduct.prepTimeMinutes,
      description: editingProduct.description,
      imageUrl: editingProduct.imageUrl,
      modifiers: editingProduct.modifiers || [],
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
      prepTimeMinutes: Number(newProdPrepTime) || 10,
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
    setNewProdPrice(5000);
    setNewProdDesc("");
    setNewProdImage("");
    setNewProdModifiers([]);
    setIsCreatingProduct(false);
  };

  const handleSendReply = (reviewId: string) => {
    if (replyText[reviewId]?.trim()) {
      setSubmittedReplies(prev => ({ ...prev, [reviewId]: replyText[reviewId] }));
      setReplyText(prev => ({ ...prev, [reviewId]: "" }));
    }
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
      <div
        key={product.id}
        className={`bg-white dark:bg-[#2C2D31] rounded-3xl border-2 shadow-xs flex flex-col justify-between overflow-hidden transition-all hover:shadow-lg ${
          product.isAvailable
            ? "border-slate-200/90 dark:border-[#374151] hover:border-[#190088]"
            : "border-red-300 dark:border-red-900/60 bg-red-50/10"
        }`}
      >
        {/* Photo Header */}
        <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-gray-800">
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
            <span className="absolute top-3 left-3 bg-[#FF3F1A] text-white text-[11px] font-black px-2.5 py-1 rounded-xl shadow-md flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-white" />
              <span>#{product.popularityRank} Más Pedido</span>
            </span>
          )}

          {/* Price Tag */}
          <div className="absolute bottom-3 right-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md text-gray-900 dark:text-white px-3 py-1 rounded-xl text-xs font-mono font-black shadow-xs">
            ${product.price.toLocaleString("es-CO")}
          </div>

          <span className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md text-white text-[10px] font-mono px-2.5 py-0.5 rounded-lg">
            {product.category}
          </span>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-black text-sm sm:text-base text-gray-900 dark:text-gray-100 line-clamp-1">
                {product.name}
              </h4>
              <span className="font-mono font-black text-base text-[#190088] dark:text-indigo-300 flex-none">
                ${product.price.toLocaleString("es-CO")}
              </span>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug line-clamp-2">
              {product.description}
            </p>

            {/* Modifiers Pill Chip (Audio Insight: Personalizaciones) */}
            <div className="pt-1">
              {product.modifiers && product.modifiers.length > 0 ? (
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <Sparkles className="w-3 h-3 text-[#FF3F1A]" />
                  <span>
                    {product.modifiers.length} grupo(s) de personalización ({modifierCount} opciones)
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-gray-400 font-semibold flex items-center gap-1">
                  <span>Sin personalizaciones adicionales</span>
                </div>
              )}
            </div>
          </div>

          {/* Ratings & Orders - High Visibility Smart Bar */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Rating Chip */}
            <button
              type="button"
              onClick={() => setReviewModalProduct(product)}
              className="p-2 rounded-2xl bg-amber-500 text-gray-950 hover:bg-amber-400 font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer hover:scale-102 active:scale-98"
              title="Ver reseñas de este plato"
            >
              <Star className="w-3.5 h-3.5 fill-gray-950 text-gray-950" />
              <span>{product.rating || 4.9}</span>
              <span className="text-[10px] font-extrabold opacity-85">
                ({product.reviewsCount || 0})
              </span>
            </button>

            {/* Sales Volume Chip */}
            <div className="p-2 rounded-2xl bg-orange-50 dark:bg-orange-950/80 border border-orange-200 dark:border-orange-900 text-[#FF3F1A] font-black text-xs flex items-center justify-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#FF3F1A]" />
              <span>{product.salesCount || 120} cmds</span>
            </div>
          </div>

          {/* Live Kitchen Notice */}
          {activeOrdersWithProd > 0 && (
            <div className="bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-900/60 rounded-xl px-3 py-1.5 text-xs text-[#FF3F1A] font-black flex items-center justify-between">
              <span>{activeOrdersWithProd} en preparación en fogón</span>
              <span className="font-mono">{product.prepTimeMinutes}m</span>
            </div>
          )}

          {/* Footer Controls: Edit Product & Stock Switch */}
          <div className="pt-3 border-t border-gray-100 dark:border-[#374151] flex items-center justify-between gap-2">
            <button
              onClick={() => setEditingProduct({ ...product })}
              className="py-2 px-3 rounded-xl border border-slate-200 dark:border-gray-700 text-xs font-black text-gray-700 dark:text-gray-300 hover:border-[#190088] hover:text-[#190088] dark:hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar & Variantes</span>
            </button>

            {/* Availability Switch */}
            <button
              onClick={() => toggleProductAvailability(product.id)}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                product.isAvailable
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
                  : "bg-red-500 text-white hover:bg-red-600"
              }`}
            >
              {product.isAvailable ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Disponible</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Pausado</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <NectoBanner
        icon={<Layers className="w-6 h-6 text-[#FF3F1A]" />}
        title="Catálogo de Productos & Opiniones de Clientes"
        description="Gestión estructurada por categorías, personalizaciones de platos (como en Rappi/Uber), precios y reseñas en vivo."
        actionNode={
          <div className="flex bg-slate-100 dark:bg-gray-800 rounded-2xl p-1 border border-slate-200 dark:border-gray-700 shadow-xs">
            <button
              onClick={() => setActiveSubTab("catalogo")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeSubTab === "catalogo"
                  ? "bg-[#190088] text-white shadow-xs"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
              }`}
            >
              Catálogo de Platos ({products.length})
            </button>
            <button
              onClick={() => setActiveSubTab("resenas")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeSubTab === "resenas"
                  ? "bg-[#190088] text-white shadow-xs"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
              }`}
            >
              Centro de Reseñas ({allReviews.length})
            </button>
          </div>
        }
      />

      {/* Top Intelligence Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Platos */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border-2 border-t-4 border-t-[#190088] border-slate-200/90 dark:border-[#374151] p-5 shadow-xs space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
            Platos en Carta
          </span>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-black font-mono text-gray-900 dark:text-gray-100">
              {products.length}
            </p>
            <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full">
              {products.filter(p => p.isAvailable).length} activos
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            {products.filter(p => !p.isAvailable).length} pausados por falta de insumos
          </p>
        </div>

        {/* Stat 2: Calificación Global */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border-2 border-t-4 border-t-amber-400 border-slate-200/90 dark:border-[#374151] p-5 shadow-xs space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
            Satisfacción Global
          </span>
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-1">
              <p className="text-3xl font-black font-mono text-gray-900 dark:text-gray-100">
                4.9
              </p>
              <span className="text-amber-500 font-bold text-sm">★</span>
            </div>
            <span className="text-xs font-bold text-gray-500">
              {allReviews.length * 15 + 45} opiniones
            </span>
          </div>
          <p className="text-[11px] text-gray-400">98.2% de calificaciones de 5 estrellas</p>
        </div>

        {/* Stat 3: Más Vendido */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border-2 border-t-4 border-t-[#FF3F1A] border-slate-200/90 dark:border-[#374151] p-5 shadow-xs space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
            Plato Estrella #1
          </span>
          <div className="flex items-baseline justify-between">
            <p className="text-base font-black text-gray-900 dark:text-gray-100 truncate">
              Carne a Cuchillo
            </p>
            <span className="text-xs font-black text-[#FF3F1A] font-mono">
              482 cmds
            </span>
          </div>
          <p className="text-[11px] text-gray-400">38% del volumen total de ventas</p>
        </div>

        {/* Stat 4: Categorías */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border-2 border-t-4 border-t-emerald-500 border-slate-200/90 dark:border-[#374151] p-5 shadow-xs space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
            Categorías Activas
          </span>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-black font-mono text-gray-900 dark:text-gray-100">
              {categories.length - 1}
            </p>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full">
              Estructurado
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Empanadas, Combos, Acompañamientos, Bebidas, Postres</p>
        </div>
      </div>

      {/* SUBTAB 1: Catálogo de Platos */}
      {activeSubTab === "catalogo" && (
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="bg-white dark:bg-[#2C2D31] rounded-3xl p-4 border border-slate-200/90 dark:border-[#374151] shadow-xs flex flex-wrap items-center justify-between gap-4">
            {/* Category Filter Pills (Horizontal scroll on mobile, wrap on desktop) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none max-w-full flex-nowrap sm:flex-wrap py-1">
              {categories.map(cat => {
                const count =
                  cat === "Todos"
                    ? products.length
                    : products.filter(p => p.category === cat).length;

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 flex-none ${
                      selectedCategory === cat
                        ? "bg-[#190088] text-white shadow-xs"
                        : "bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-slate-300"
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="text-[10px] opacity-75 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Right Controls: Sort & New Product Button */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="text-gray-400 flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Ordenar por:
                </span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl px-3.5 py-2 text-xs font-black cursor-pointer focus:outline-none"
                >
                  <option value="populares">Más Pedidos (Ranking #1)</option>
                  <option value="rating">Mejor Calificados (Reseñas)</option>
                  <option value="precio_desc">Mayor Precio</option>
                  <option value="precio_asc">Menor Precio</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsCreatingProduct(true)}
                className="py-2.5 px-4 rounded-2xl bg-[#FF3F1A] hover:bg-orange-600 text-white text-xs font-black flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Plato / Producto</span>
              </button>
            </div>
          </div>

          {/* Categorized Product Sections or Single Filtered View */}
          {selectedCategory === "Todos" ? (
            <div className="space-y-8">
              {categories
                .filter(c => c !== "Todos")
                .map(cat => {
                  const catItems = categorizedSections[cat] || [];
                  if (catItems.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-4">
                      {/* Category Header Banner */}
                      <div className="flex items-center justify-between pb-2 border-b-2 border-slate-200 dark:border-gray-800">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-full bg-[#FF3F1A]" />
                          <h3 className="font-black text-lg text-gray-900 dark:text-gray-100">
                            {cat}
                          </h3>
                          <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full text-gray-500">
                            {catItems.length} {catItems.length === 1 ? "plato" : "platos"}
                          </span>
                        </div>
                      </div>

                      {/* Product Grid for this Category */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                        {catItems.map(p => renderProductCard(p))}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {displayProducts.map(p => renderProductCard(p))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: Centro de Reseñas */}
      {activeSubTab === "resenas" && (
        <div className="space-y-5">
          {/* Reviews Filter Toolbar */}
          <div className="bg-white dark:bg-[#2C2D31] rounded-3xl p-4 border border-slate-200/90 dark:border-[#374151] shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none max-w-full flex-nowrap sm:flex-wrap py-1">
              <span className="text-xs font-bold text-gray-500 mr-1 flex-none">Filtrar por estrellas:</span>
              {(["TODOS", 5, 4, 3, 2, 1] as const).map(stars => (
                <button
                  key={String(stars)}
                  onClick={() => setStarFilter(stars)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 flex-none ${
                    starFilter === stars
                      ? "bg-amber-500 text-gray-950 shadow-xs"
                      : "bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-slate-300"
                  }`}
                >
                  <span>{stars === "TODOS" ? "Todas" : `${stars} ★`}</span>
                </button>
              ))}
            </div>

            <span className="text-xs font-mono font-bold text-gray-400">
              {filteredReviews.length} reseñas encontradas
            </span>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {filteredReviews.map(rev => (
              <div
                key={rev.id}
                className="bg-white dark:bg-[#2C2D31] rounded-3xl border border-slate-200/90 dark:border-[#374151] p-5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {rev.productImage && (
                      <img
                        src={rev.productImage}
                        alt={rev.productName}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-gray-700 flex-none"
                      />
                    )}
                    <div>
                      <h4 className="font-black text-sm text-gray-900 dark:text-gray-100">
                        {rev.author}
                      </h4>
                      <p className="text-xs font-bold text-[#190088] dark:text-indigo-300">
                        Plato: {rev.productName}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-500 font-black text-sm justify-end">
                      {"★".repeat(rev.rating)}
                      <span className="text-gray-400 font-mono text-xs ml-1">({rev.rating}/5)</span>
                    </div>
                    <span className="text-[11px] text-gray-400">{rev.date}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-700 dark:text-gray-300 bg-slate-50 dark:bg-gray-800/80 p-3.5 rounded-2xl border border-slate-100 dark:border-gray-700 leading-relaxed">
                  "{rev.comment}"
                </p>

                {/* Submitted Restaurant Response */}
                {submittedReplies[rev.id] && (
                  <div className="ml-6 p-3 bg-indigo-50 dark:bg-indigo-950/60 border-l-4 border-[#190088] rounded-xl text-xs space-y-1">
                    <strong className="text-[#190088] dark:text-indigo-300 font-black">
                      Respuesta del Restaurante:
                    </strong>
                    <p className="text-gray-700 dark:text-gray-300">{submittedReplies[rev.id]}</p>
                  </div>
                )}

                {/* Response Input */}
                {!submittedReplies[rev.id] && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Responder al cliente en WhatsApp / Web..."
                      value={replyText[rev.id] || ""}
                      onChange={e =>
                        setReplyText(prev => ({ ...prev, [rev.id]: e.target.value }))
                      }
                      onKeyDown={e => e.key === "Enter" && handleSendReply(rev.id)}
                      className="flex-1 text-xs border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 rounded-xl px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendReply(rev.id)}
                      className="py-2 px-3 rounded-xl bg-[#190088] hover:bg-[#140070] text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>Responder</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT PRODUCT & MODIFIERS (Audio Insight: Editor de Personalizaciones) */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border-2 border-slate-200 dark:border-[#374151] shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950 text-[#FF3F1A] flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-gray-900 dark:text-gray-100">
                    Editar Plato & Personalizaciones
                  </h3>
                  <p className="text-xs text-gray-400">
                    Configura nombres, precios base y grupos de adicionales/tamaño (como en Rappi / Uber).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* General Info Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                  Nombre del Plato:
                </label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={e =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
                  }
                  className="w-full text-xs font-bold border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                  Categoría:
                </label>
                <select
                  value={editingProduct.category}
                  onChange={e =>
                    setEditingProduct({ ...editingProduct, category: e.target.value })
                  }
                  className="w-full text-xs font-bold border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  {categories
                    .filter(c => c !== "Todos")
                    .map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                  Precio Base ($ COP):
                </label>
                <input
                  type="number"
                  value={editingProduct.price}
                  onChange={e =>
                    setEditingProduct({
                      ...editingProduct,
                      price: Number(e.target.value),
                    })
                  }
                  className="w-full text-xs font-mono font-bold border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                  Tiempo de Cocina (min):
                </label>
                <input
                  type="number"
                  value={editingProduct.prepTimeMinutes}
                  onChange={e =>
                    setEditingProduct({
                      ...editingProduct,
                      prepTimeMinutes: Number(e.target.value),
                    })
                  }
                  className="w-full text-xs font-mono font-bold border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                  Descripción Clara para Clientes & IA:
                </label>
                <textarea
                  rows={2}
                  value={editingProduct.description}
                  onChange={e =>
                    setEditingProduct({
                      ...editingProduct,
                      description: e.target.value,
                    })
                  }
                  className="w-full text-xs border border-slate-200 dark:border-gray-700 rounded-xl p-2.5 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 leading-relaxed"
                />
              </div>
            </div>

            {/* Modifiers & Customizations Builder (Audio Insight) */}
            <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-xs text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF3F1A]" />
                  <span>Personalizaciones y Modificadores:</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const newGroup: ProductModifierGroup = {
                      id: `mod-${Date.now()}`,
                      title: "Elige tu Tamaño / Adicional",
                      minSelect: 0,
                      maxSelect: 1,
                      options: [
                        { id: `opt-${Date.now()}-1`, name: "Porción Regular", priceDelta: 0, isDefault: true },
                        { id: `opt-${Date.now()}-2`, name: "Porción Grande", priceDelta: 2000 },
                      ],
                    };
                    setEditingProduct({
                      ...editingProduct,
                      modifiers: [...(editingProduct.modifiers || []), newGroup],
                    });
                  }}
                  className="text-[11px] font-black text-[#190088] dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Añadir Grupo de Personalización
                </button>
              </div>

              {(editingProduct.modifiers || []).length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-850 border border-dashed border-slate-200 dark:border-gray-700 text-center text-xs text-gray-400">
                  Sin opciones de personalización configuradas aún.
                </div>
              ) : (
                <div className="space-y-3">
                  {editingProduct.modifiers?.map((group, gIdx) => (
                    <div
                      key={group.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-850 border border-slate-200 dark:border-gray-700 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={group.title}
                          onChange={e => {
                            const updated = [...(editingProduct.modifiers || [])];
                            updated[gIdx].title = e.target.value;
                            setEditingProduct({ ...editingProduct, modifiers: updated });
                          }}
                          className="font-black text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-gray-700 w-2/3"
                          placeholder="Nombre del grupo (ej. Elige tu tamaño)"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editingProduct.modifiers?.filter((_, i) => i !== gIdx);
                            setEditingProduct({ ...editingProduct, modifiers: updated });
                          }}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          title="Eliminar grupo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
                              className="flex-1 text-xs border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-2 py-1 text-gray-800 dark:text-gray-200"
                              placeholder="Nombre de la opción (ej. Porción Grande)"
                            />
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-gray-400 font-mono">+</span>
                              <input
                                type="number"
                                value={opt.priceDelta}
                                onChange={e => {
                                  const updated = [...(editingProduct.modifiers || [])];
                                  updated[gIdx].options[oIdx].priceDelta = Number(e.target.value);
                                  setEditingProduct({ ...editingProduct, modifiers: updated });
                                }}
                                className="w-20 text-xs font-mono font-bold border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-2 py-1 text-gray-800 dark:text-gray-200"
                                placeholder="Precio extra"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...(editingProduct.modifiers || [])];
                                updated[gIdx].options = updated[gIdx].options.filter((_, i) => i !== oIdx);
                                setEditingProduct({ ...editingProduct, modifiers: updated });
                              }}
                              className="text-gray-400 hover:text-red-500 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...(editingProduct.modifiers || [])];
                            updated[gIdx].options.push({
                              id: `opt-${Date.now()}`,
                              name: "Nueva Opción",
                              priceDelta: 0,
                            });
                            setEditingProduct({ ...editingProduct, modifiers: updated });
                          }}
                          className="text-[11px] font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 pt-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Añadir Opción a este grupo
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveProductEdit}
                className="py-2.5 px-5 rounded-xl bg-[#190088] hover:bg-[#140070] text-white text-xs font-black flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE NEW PRODUCT (Crear Plato) */}
      {isCreatingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <form
            onSubmit={handleCreateProductSubmit}
            className="bg-white dark:bg-[#2C2D31] rounded-3xl border-2 border-slate-200 dark:border-[#374151] shadow-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950 text-[#FF3F1A] flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-gray-900 dark:text-gray-100">
                    Crear Nuevo Plato / Producto
                  </h3>
                  <p className="text-xs text-gray-400">
                    Añade un plato a la carta física, WhatsApp IA y menú web.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingProduct(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                  Nombre del Plato:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Empanada Fugazzeta con Mozzarella"
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                    Categoría:
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={e => setNewProdCategory(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    {categories
                      .filter(c => c !== "Todos")
                      .map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                    Precio ($ COP):
                  </label>
                  <input
                    type="number"
                    required
                    value={newProdPrice}
                    onChange={e => setNewProdPrice(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                  Descripción:
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe los ingredientes principales para el menú..."
                  value={newProdDesc}
                  onChange={e => setNewProdDesc(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-gray-700 rounded-xl p-2.5 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setIsCreatingProduct(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-[#FF3F1A] hover:bg-orange-600 text-white text-xs font-black flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Plato</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: VIEW PRODUCT REVIEWS */}
      {reviewModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border-2 border-slate-200 dark:border-[#374151] shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="font-black text-sm text-gray-900 dark:text-gray-100">
                  Reseñas: {reviewModalProduct.name}
                </h3>
                <div className="flex items-center gap-1 text-amber-500 font-bold text-xs mt-0.5">
                  {"★".repeat(Math.round(reviewModalProduct.rating || 5))}
                  <span className="text-gray-400 font-mono ml-1">
                    ({reviewModalProduct.rating} / 5) · {reviewModalProduct.reviewsCount || 0} opiniones
                  </span>
                </div>
              </div>
              <button
                onClick={() => setReviewModalProduct(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {(reviewModalProduct.reviews || []).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  Sin reseñas individuales detalladas aún para este plato.
                </p>
              ) : (
                reviewModalProduct.reviews?.map(rev => (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-gray-900 dark:text-gray-100">{rev.author}</strong>
                      <span className="text-[10px] text-gray-400">{rev.date}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 italic">"{rev.comment}"</p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-right">
              <button
                onClick={() => setReviewModalProduct(null)}
                className="py-2 px-4 rounded-xl bg-[#190088] text-white text-xs font-black cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
