import { useState, useEffect, useMemo, useCallback } from "react";
import {
  InventoryProduct,
  StockMovement,
  InventoryFilterOptions,
  StockLocation,
  Supplier,
  PurchaseOrder,
  BuildOrder,
} from "../types/inventory.types";
import { inventoryService } from "../services/inventoryService";

export function useInventory() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [buildOrders, setBuildOrders] = useState<BuildOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<InventoryFilterOptions>({
    searchQuery: "",
    productType: "all",
    status: "all",
    category: "all",
    locationId: "all",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [prods, movs, locs, sups, pos, bos] = await Promise.all([
        inventoryService.getProducts(),
        inventoryService.getMovements(),
        inventoryService.getStockLocations(),
        inventoryService.getSuppliers(),
        inventoryService.getPurchaseOrders(),
        inventoryService.getBuildOrders(),
      ]);
      setProducts(prods);
      setMovements(movs);
      setLocations(locs);
      setSuppliers(sups);
      setPurchaseOrders(pos);
      setBuildOrders(bos);
    } catch (err: any) {
      setError(err?.message || "Error al cargar datos del inventario");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const unsubscribe = inventoryService.subscribe(() => {
      fetchData();
    });
    return () => unsubscribe();
  }, [fetchData]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase().trim();
        const matchSku = p.sku.toLowerCase().includes(query);
        const matchIpn = p.ipn?.toLowerCase().includes(query);
        const matchName = p.name.toLowerCase().includes(query);
        const matchCategory = p.category.toLowerCase().includes(query);
        const matchLocation = p.locationName?.toLowerCase().includes(query);
        const matchMetadata = Object.values(p.metadata || {}).some((val) =>
          String(val).toLowerCase().includes(query)
        );

        if (!matchSku && !matchIpn && !matchName && !matchCategory && !matchLocation && !matchMetadata) {
          return false;
        }
      }

      if (filters.productType && filters.productType !== "all") {
        if (p.productType !== filters.productType) return false;
      }

      if (filters.status && filters.status !== "all") {
        if (p.status !== filters.status) return false;
      }

      if (filters.category && filters.category !== "all") {
        if (p.category !== filters.category) return false;
      }

      if (filters.locationId && filters.locationId !== "all") {
        if (p.locationId !== filters.locationId) return false;
      }

      return true;
    });
  }, [products, filters]);

  const dynamicColumns = useMemo(() => {
    return inventoryService.extractDynamicColumns(filteredProducts);
  }, [filteredProducts]);

  const metrics = useMemo(() => {
    const totalSKUs = products.length;
    const totalUnits = products.reduce((acc, p) => acc + p.stockActual, 0);
    const totalCostValue = products.reduce((acc, p) => acc + p.costPrice * p.stockActual, 0);
    const totalRetailValue = products.reduce((acc, p) => acc + p.salePrice * p.stockActual, 0);
    const lowStockCount = products.filter((p) => p.status === "low_stock").length;
    const outOfStockCount = products.filter((p) => p.status === "out_of_stock").length;
    const totalLocations = locations.length;

    return {
      totalSKUs,
      totalUnits,
      totalCostValue,
      totalRetailValue,
      lowStockCount,
      outOfStockCount,
      totalLocations,
    };
  }, [products, locations]);

  const saveProduct = async (
    productData: Partial<InventoryProduct> & { name: string; sku: string }
  ) => {
    try {
      setError(null);
      return await inventoryService.saveProduct(productData);
    } catch (err: any) {
      setError(err?.message || "Error al guardar el producto");
      throw err;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      setError(null);
      return await inventoryService.deleteProduct(id);
    } catch (err: any) {
      setError(err?.message || "Error al eliminar el producto");
      throw err;
    }
  };

  const registerStockMovement = async (params: {
    productId: string;
    type: "ENTRADA" | "SALIDA";
    quantity: number;
    concept: string;
    referenceDoc?: string;
    author?: string;
    notes?: string;
    batchCode?: string;
  }) => {
    try {
      setError(null);
      return await inventoryService.registerMovement(params);
    } catch (err: any) {
      setError(err?.message || "Error al registrar movimiento");
      throw err;
    }
  };

  const registerStockCount = async (params: {
    productId: string;
    countedStock: number;
    author?: string;
    notes?: string;
  }) => {
    try {
      setError(null);
      return await inventoryService.registerStockCount(params);
    } catch (err: any) {
      setError(err?.message || "Error al registrar conteo");
      throw err;
    }
  };

  const registerStockTransfer = async (params: {
    productId: string;
    toLocationId: string;
    quantity: number;
    author?: string;
    notes?: string;
  }) => {
    try {
      setError(null);
      return await inventoryService.registerStockTransfer(params);
    } catch (err: any) {
      setError(err?.message || "Error al registrar traslado");
      throw err;
    }
  };

  const createPurchaseOrder = async (
    poData: Omit<PurchaseOrder, "id" | "orderNumber" | "status" | "issueDate">
  ) => {
    try {
      setError(null);
      return await inventoryService.createPurchaseOrder(poData);
    } catch (err: any) {
      setError(err?.message || "Error al crear orden de compra");
      throw err;
    }
  };

  const receivePurchaseOrder = async (poId: string) => {
    try {
      setError(null);
      return await inventoryService.receivePurchaseOrder(poId);
    } catch (err: any) {
      setError(err?.message || "Error al recibir orden de compra");
      throw err;
    }
  };

  const createBuildOrder = async (
    boData: Omit<BuildOrder, "id" | "buildNumber" | "status" | "createdAt">
  ) => {
    try {
      setError(null);
      return await inventoryService.createBuildOrder(boData);
    } catch (err: any) {
      setError(err?.message || "Error al crear orden de ensamble");
      throw err;
    }
  };

  const executeBuildOrder = async (boId: string) => {
    try {
      setError(null);
      return await inventoryService.executeBuildOrder(boId);
    } catch (err: any) {
      setError(err?.message || "Error al ejecutar ensamble");
      throw err;
    }
  };

  const resetToDefaults = () => {
    inventoryService.resetToDefaults();
  };

  return {
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
    createPurchaseOrder,
    receivePurchaseOrder,
    createBuildOrder,
    executeBuildOrder,
    resetToDefaults,
    refresh: fetchData,
  };
}

