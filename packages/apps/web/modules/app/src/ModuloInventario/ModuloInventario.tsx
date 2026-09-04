import React, { useState } from "react";
import { useInventory } from "./hooks/useInventory";
import { InventoryProduct } from "./types/inventory.types";
import { CatalogView } from "./components/CatalogView";
import { KardexView } from "./components/KardexView";
import { StockLocationsView } from "./components/StockLocationsView";
import { PurchasingView } from "./components/PurchasingView";
import { ManufacturingView } from "./components/ManufacturingView";
import { ProductFormModal } from "./components/ProductFormModal";
import { StockMovementModal } from "./components/StockMovementModal";
import { StockCountModal } from "./components/StockCountModal";
import { StockTransferModal } from "./components/StockTransferModal";
import { PartDetailModal } from "./components/PartDetailModal";
import { Boxes, Building2, Truck, Hammer, Activity, ArrowDownLeft } from "lucide-react";

export type InventoryTab = "catalog" | "locations" | "kardex" | "purchasing" | "manufacturing";

export interface ModuloInventarioProps {
  initialTab?: InventoryTab;
  activeTab?: InventoryTab;
  onNavigateTab?: (tab: InventoryTab) => void;
}

export const ModuloInventario: React.FC<ModuloInventarioProps> = ({
  initialTab = "catalog",
  activeTab: controlledTab,
  onNavigateTab,
}) => {
  const [internalTab, setInternalTab] = useState<InventoryTab>(initialTab);
  const activeTab = controlledTab ?? internalTab;

  const handleTabChange = (tab: InventoryTab) => {
    setInternalTab(tab);
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  const {
    products,
    filteredProducts,
    movements,
    locations,
    suppliers,
    purchaseOrders,
    buildOrders,
    dynamicColumns,
    categories,
    metrics,
    loading,
    error,
    filters,
    setFilters,
    saveProduct,
    deleteProduct,
    registerStockMovement,
    registerStockCount,
    registerStockTransfer,
    receivePurchaseOrder,
    executeBuildOrder,
    resetToDefaults,
  } = useInventory();

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementProduct, setMovementProduct] = useState<InventoryProduct | null>(null);
  const [movementType, setMovementType] = useState<"ENTRADA" | "SALIDA">("ENTRADA");

  const [isCountModalOpen, setIsCountModalOpen] = useState(false);
  const [countProduct, setCountProduct] = useState<InventoryProduct | null>(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferProduct, setTransferProduct] = useState<InventoryProduct | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<InventoryProduct | null>(null);

  const [kardexFilterProduct, setKardexFilterProduct] = useState<string | null>(null);

  // Handlers
  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: InventoryProduct) => {
    setEditingProduct(prod);
    setIsProductModalOpen(true);
  };

  const handleOpenMovement = (prod: InventoryProduct, type: "ENTRADA" | "SALIDA") => {
    setMovementProduct(prod);
    setMovementType(type);
    setIsMovementModalOpen(true);
  };

  const handleOpenGenericMovement = () => {
    setMovementProduct(products.length > 0 ? products[0] : null);
    setMovementType("ENTRADA");
    setIsMovementModalOpen(true);
  };

  const handleOpenCount = (prod: InventoryProduct) => {
    setCountProduct(prod);
    setIsCountModalOpen(true);
  };

  const handleOpenTransfer = (prod: InventoryProduct) => {
    setTransferProduct(prod);
    setIsTransferModalOpen(true);
  };

  const handleViewProductDetail = (prod: InventoryProduct) => {
    setDetailProduct(prod);
    setIsDetailModalOpen(true);
  };

  const handleViewProductHistory = (prod: InventoryProduct) => {
    setKardexFilterProduct(prod.id);
    handleTabChange("kardex");
  };

  const navTabs: Array<{ id: InventoryTab; label: string; icon: React.ReactNode; count?: number }> = [
    { id: "catalog", label: "Catálogo de Partes", icon: <Boxes className="w-3.5 h-3.5 flex-none" />, count: products.length },
    { id: "locations", label: "Almacenes & Ubicaciones", icon: <Building2 className="w-3.5 h-3.5 flex-none" />, count: locations.length },
    { id: "purchasing", label: "Compras & Proveedores", icon: <Truck className="w-3.5 h-3.5 flex-none" />, count: purchaseOrders.filter(po => po.status === "pending").length },
    { id: "manufacturing", label: "Producción & BOM", icon: <Hammer className="w-3.5 h-3.5 flex-none" />, count: buildOrders.filter(bo => bo.status === "pending").length },
    { id: "kardex", label: "Historial de Movimientos", icon: <Activity className="w-3.5 h-3.5 flex-none" />, count: movements.length },
  ];

  return (
    <div className="w-full min-h-full flex flex-col">
      {/* Top Operations Subtabs Bar (Matching Pedidos Operaciones) */}
      <div className="bg-white dark:bg-[#151518] rounded-2xl p-2.5 sm:p-3 mx-4 sm:mx-6 mt-4 sm:mt-6 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap animate-fade-in">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none scroll-smooth max-w-full flex-nowrap sm:flex-wrap py-0.5">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`px-3.5 py-1.5 min-h-[40px] sm:min-h-0 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer flex-none text-xs whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-[#190088] text-white border border-[#190088] shadow-2xs font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-[#190088] dark:hover:text-[#97D6DF] hover:bg-blue-50/70 dark:hover:bg-[#190088]/20 border border-transparent"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${
                    activeTab === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Quick action: Registrar Movimiento */}
        <div className="flex items-center gap-2 flex-none ml-auto">
          <button
            type="button"
            onClick={handleOpenGenericMovement}
            className="px-3.5 py-1.5 rounded-xl bg-[#FF3F1A] hover:bg-[#E03513] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Movimiento Rápido</span>
          </button>
        </div>
      </div>

      {/* Active Dedicated Page */}
      {activeTab === "catalog" && (
        <CatalogView
          products={products}
          filteredProducts={filteredProducts}
          dynamicColumns={dynamicColumns}
          categories={categories}
          locations={locations}
          filters={filters}
          setFilters={setFilters}
          onNewProduct={handleOpenNewProduct}
          onEditProduct={handleOpenEditProduct}
          onDeleteProduct={deleteProduct}
          onOpenMovement={handleOpenMovement}
          onOpenCount={handleOpenCount}
          onOpenTransfer={handleOpenTransfer}
          onViewProductDetail={handleViewProductDetail}
          onViewHistory={handleViewProductHistory}
          onResetDefaults={resetToDefaults}
        />
      )}

      {activeTab === "locations" && (
        <StockLocationsView
          locations={locations}
          products={products}
          onOpenTransfer={handleOpenTransfer}
          onOpenCount={handleOpenCount}
          onOpenMovement={handleOpenMovement}
          onSelectProduct={handleViewProductDetail}
        />
      )}

      {activeTab === "purchasing" && (
        <PurchasingView
          purchaseOrders={purchaseOrders}
          suppliers={suppliers}
          locations={locations}
          products={products}
          onReceiveOrder={receivePurchaseOrder}
        />
      )}

      {activeTab === "manufacturing" && (
        <ManufacturingView
          buildOrders={buildOrders}
          products={products}
          locations={locations}
          onExecuteBuild={executeBuildOrder}
        />
      )}

      {activeTab === "kardex" && (
        <KardexView
          movements={movements}
          products={products}
          selectedProductFilter={kardexFilterProduct}
          onClearProductFilter={() => setKardexFilterProduct(null)}
          onOpenNewMovement={handleOpenGenericMovement}
        />
      )}

      {/* Operation Modals */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        locations={locations}
        productToEdit={editingProduct}
        onSave={saveProduct}
      />

      <StockMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        products={products}
        selectedProduct={movementProduct}
        initialType={movementType}
        onSubmit={registerStockMovement}
      />

      <StockCountModal
        isOpen={isCountModalOpen}
        onClose={() => setIsCountModalOpen(false)}
        product={countProduct}
        onSubmit={registerStockCount}
      />

      <StockTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        product={transferProduct}
        locations={locations}
        onSubmit={registerStockTransfer}
      />

      <PartDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        product={detailProduct}
        movements={movements}
        onOpenMovement={(type) => {
          setIsDetailModalOpen(false);
          if (detailProduct) handleOpenMovement(detailProduct, type);
        }}
        onOpenCount={() => {
          setIsDetailModalOpen(false);
          if (detailProduct) handleOpenCount(detailProduct);
        }}
        onOpenTransfer={() => {
          setIsDetailModalOpen(false);
          if (detailProduct) handleOpenTransfer(detailProduct);
        }}
        onEdit={() => {
          setIsDetailModalOpen(false);
          if (detailProduct) handleOpenEditProduct(detailProduct);
        }}
      />
    </div>
  );
};
