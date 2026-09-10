import React, { useState } from "react";
import { useInventory } from "./hooks/useInventory";
import { InventoryProduct } from "./types/inventory.types";
import { CatalogView } from "./components/CatalogView";
import { KardexView } from "./components/KardexView";
import { StockLocationsView } from "./components/StockLocationsView";
import { PurchasingView } from "./components/PurchasingView";
import { ProductFormModal } from "./components/ProductFormModal";
import { QuickProductModal } from "./components/QuickProductModal";
import { StockMovementModal, OperationMode } from "./components/StockMovementModal";
import { PartDetailModal } from "./components/PartDetailModal";
import { LocationFormModal } from "./components/LocationFormModal";
import { PurchaseOrderModal } from "./components/PurchaseOrderModal";
import { PriceListsView } from "./components/PriceListsView";
import { InventoryValuationView } from "./components/InventoryValuationView";
import { Boxes, Building2, Truck, Activity, ArrowDownLeft, Tag, Scale, Coins } from "lucide-react";

export type InventoryTab = "catalog" | "valuation" | "locations" | "kardex" | "purchasing" | "pricelists";

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
    registerStockAdjustment,
    registerStockCount,
    registerStockTransfer,
    createStockLocation,
    createSupplier,
    createPurchaseOrder,
    receivePurchaseOrder,
    priceLists,
    selectedPriceListId,
    setSelectedPriceListId,
    savePriceList,
    deletePriceList,
    setDefaultPriceList,
    calculateProductPrice,
    resetToDefaults,
  } = useInventory();

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isQuickProductModalOpen, setIsQuickProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [quickDraftProduct, setQuickDraftProduct] = useState<Partial<InventoryProduct> | null>(null);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementProduct, setMovementProduct] = useState<InventoryProduct | null>(null);
  const [movementMode, setMovementMode] = useState<OperationMode>("ENTRADA");

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<InventoryProduct | null>(null);

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [poInitialProduct, setPoInitialProduct] = useState<InventoryProduct | null>(null);
  const [poInitialQty, setPoInitialQty] = useState<number | undefined>(undefined);

  const [kardexFilterProduct, setKardexFilterProduct] = useState<string | null>(null);

  // Handlers
  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setQuickDraftProduct(null);
    setIsQuickProductModalOpen(true);
  };

  const handleOpenAdvancedNewProduct = () => {
    setEditingProduct(null);
    setQuickDraftProduct(null);
    setIsProductModalOpen(true);
  };

  const handleTransitionToAdvanced = (draft: Partial<InventoryProduct>) => {
    setQuickDraftProduct(draft);
    setEditingProduct(null);
    setIsQuickProductModalOpen(false);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: InventoryProduct) => {
    setQuickDraftProduct(null);
    setEditingProduct(prod);
    setIsProductModalOpen(true);
  };

  const handleOpenMovement = (prod?: InventoryProduct | null, mode: OperationMode = "ENTRADA") => {
    setMovementProduct(prod || (products.length > 0 ? products[0] : null));
    setMovementMode(mode);
    setIsMovementModalOpen(true);
  };

  const handleViewProductDetail = (prod: InventoryProduct) => {
    setDetailProduct(prod);
    setIsDetailModalOpen(true);
  };

  const handleViewProductHistory = (prod: InventoryProduct) => {
    setKardexFilterProduct(prod.id);
    handleTabChange("kardex");
  };

  const navTabs: Array<{ id: InventoryTab; label: string }> = [
    { id: "catalog", label: "Productos" },
    { id: "valuation", label: "Valor de Inventario" },
    { id: "pricelists", label: "Listas de Precios" },
    { id: "locations", label: "Bodegas" },
    { id: "purchasing", label: "Compras" },
    { id: "kardex", label: "Kardex" },
  ];

  return (
    <div className="w-full min-h-full flex flex-col">
      {/* Top Operations Bar — Clean, integrated, no visual clutter */}
      <div className="border-b border-zinc-200 dark:border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between gap-4 flex-none bg-white dark:bg-[#121316]">
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`relative px-3 py-3 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? "text-zinc-900 dark:text-white font-bold"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF3F1A] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Global Quick Movement */}
        <div className="flex items-center gap-2 flex-none py-2">
          <button
            type="button"
            onClick={() => handleOpenMovement(null, "ENTRADA")}
            className="px-3.5 py-1.5 rounded-lg bg-[#FF3F1A] hover:bg-[#E03513] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Movimiento</span>
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
          onNewProductAdvanced={handleOpenAdvancedNewProduct}
          onEditProduct={handleOpenEditProduct}
          onDeleteProduct={deleteProduct}
          onOpenMovement={(prod, mode) => handleOpenMovement(prod, mode || "ENTRADA")}
          onOpenCount={(prod) => handleOpenMovement(prod, "CONTEO")}
          onOpenTransfer={(prod) => handleOpenMovement(prod, "TRASLADO")}
          onViewProductDetail={handleViewProductDetail}
          onViewHistory={handleViewProductHistory}
          onResetDefaults={resetToDefaults}
          priceLists={priceLists}
          selectedPriceListId={selectedPriceListId}
          onSelectPriceList={setSelectedPriceListId}
          calculateProductPrice={calculateProductPrice}
          onSaveBatch={async (batch) => {
            for (const item of batch) {
              await saveProduct(item);
            }
          }}
        />
      )}

      {activeTab === "valuation" && (
        <InventoryValuationView
          products={products}
          locations={locations}
          categories={categories}
          onNavigateToKardex={handleViewProductHistory}
          onOpenProductDetail={handleViewProductDetail}
        />
      )}

      {activeTab === "pricelists" && (
        <PriceListsView
          priceLists={priceLists}
          products={products}
          onSavePriceList={savePriceList}
          onDeletePriceList={deletePriceList}
          onSetDefaultPriceList={setDefaultPriceList}
          calculateProductPrice={calculateProductPrice}
        />
      )}

      {activeTab === "locations" && (
        <StockLocationsView
          locations={locations}
          products={products}
          onOpenTransfer={(prod) => handleOpenMovement(prod, "TRASLADO")}
          onOpenCount={(prod) => handleOpenMovement(prod, "CONTEO")}
          onOpenMovement={(prod, type) => handleOpenMovement(prod, type)}
          onSelectProduct={handleViewProductDetail}
          onOpenNewLocation={() => setIsLocationModalOpen(true)}
          onNewProductForLocation={(_locId) => {
            setEditingProduct(null);
            setIsProductModalOpen(true);
          }}
          onViewProductHistory={handleViewProductHistory}
        />
      )}

      {activeTab === "purchasing" && (
        <PurchasingView
          purchaseOrders={purchaseOrders}
          suppliers={suppliers}
          locations={locations}
          products={products}
          onReceiveOrder={receivePurchaseOrder}
          onOpenNewPurchaseOrder={(initProd, initQty) => {
            setPoInitialProduct(initProd || null);
            setPoInitialQty(initQty);
            setIsPOModalOpen(true);
          }}
          onOpenNewSupplier={() => {
            setPoInitialProduct(null);
            setPoInitialQty(undefined);
            setIsPOModalOpen(true);
          }}
        />
      )}

      {activeTab === "kardex" && (
        <KardexView
          movements={movements}
          products={products}
          selectedProductFilter={kardexFilterProduct}
          onClearProductFilter={() => setKardexFilterProduct(null)}
          onOpenNewMovement={() => handleOpenMovement(null, "ENTRADA")}
          onOpenNewAdjustment={() => handleOpenMovement(null, "AJUSTE")}
        />
      )}

      {/* Operation Modals */}
      <QuickProductModal
        isOpen={isQuickProductModalOpen}
        onClose={() => setIsQuickProductModalOpen(false)}
        locations={locations}
        categories={categories}
        onSave={saveProduct}
        onGoToAdvanced={handleTransitionToAdvanced}
      />

      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setQuickDraftProduct(null);
        }}
        locations={locations}
        products={products}
        productToEdit={editingProduct}
        initialData={quickDraftProduct}
        onSave={saveProduct}
      />

      <StockMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        products={products}
        locations={locations}
        selectedProduct={movementProduct}
        initialMode={movementMode}
        onMovement={registerStockMovement}
        onAdjustment={registerStockAdjustment}
        onTransfer={registerStockTransfer}
        onCount={registerStockCount}
      />

      <PartDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        product={detailProduct}
        movements={movements}
        onOpenMovement={(mode) => {
          setIsDetailModalOpen(false);
          if (detailProduct) handleOpenMovement(detailProduct, mode);
        }}
        onEdit={() => {
          setIsDetailModalOpen(false);
          if (detailProduct) handleOpenEditProduct(detailProduct);
        }}
        onViewHistory={(prodId) => {
          setIsDetailModalOpen(false);
          setKardexFilterProduct(prodId);
          handleTabChange("kardex");
        }}
      />

      {/* New Location Modal */}
      <LocationFormModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSave={createStockLocation}
        existingLocations={locations}
      />

      {/* New Purchase Order / Invoice Modal */}
      <PurchaseOrderModal
        isOpen={isPOModalOpen}
        onClose={() => {
          setIsPOModalOpen(false);
          setPoInitialProduct(null);
          setPoInitialQty(undefined);
        }}
        suppliers={suppliers}
        locations={locations}
        products={products}
        onSubmit={createPurchaseOrder}
        onCreateSupplier={createSupplier}
        initialProduct={poInitialProduct}
        initialSuggestedQty={poInitialQty}
      />
    </div>
  );
};
