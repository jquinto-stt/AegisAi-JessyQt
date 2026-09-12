import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import type { ProductItem } from "@/contracts/catalog.contract";
import { useBusiness } from "@/context/BusinessContext";
import { useAuth } from "@/auth/AuthContext";
import {
  INITIAL_PRODUCTS,
  getMockProductsForBusiness,
} from "../../pedidos/mockData";
import {
  createProduct as apiCreateProduct,
  updateProduct as apiUpdateProduct,
  USE_MOCK as PRODUCTS_USE_MOCK,
} from "../../../api/products";
import { toProductItem, toApiProduct } from "../../pedidos/adapters/productAdapter";
import { eventBus } from "@/infrastructure/eventBus";

interface CatalogContextType {
  products: ProductItem[];
  toggleProductAvailability: (productId: string) => void;
  updateProductPrice: (productId: string, newPrice: number) => void;
  updateProduct: (productId: string, updatedFields: Partial<ProductItem>) => void;
  addProduct: (newProduct: Omit<ProductItem, "id">) => void;
}

const CatalogContext = createContext<CatalogContextType | null>(null);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getIdToken } = useAuth();
  const { activeBusiness } = useBusiness();

  const [products, setProducts] = useState<ProductItem[]>(() =>
    activeBusiness ? getMockProductsForBusiness(activeBusiness.businessType, activeBusiness.name) : INITIAL_PRODUCTS
  );

  // Sync catalog when active business changes
  useEffect(() => {
    if (!activeBusiness) return;
    const newProducts = getMockProductsForBusiness(activeBusiness.businessType, activeBusiness.name);
    setProducts(newProducts);
  }, [activeBusiness?.id]);

  const persistUpdate = async (
    productId: string,
    patch: Partial<{ name: string; sku: string; price: number; stock: number }>
  ) => {
    try {
      const token = await getIdToken().catch(() => "");
      await apiUpdateProduct(productId, patch, token);
    } catch (err) {
      console.error("[CatalogContext] failed to update product", err);
    }
  };

  const toggleProductAvailability = (productId: string) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id !== productId) return p;
        const nextAvail = !p.isAvailable;
        return { ...p, isAvailable: nextAvail };
      })
    );
  };

  const updateProductPrice = (productId: string, newPrice: number) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, price: newPrice } : p))
    );
    void persistUpdate(productId, { price: newPrice });
  };

  const updateProduct = (productId: string, updatedFields: Partial<ProductItem>) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, ...updatedFields } : p))
    );

    const apiPatch: Partial<{ name: string; sku: string; price: number; stock: number }> = {};
    if (updatedFields.name !== undefined) apiPatch.name = updatedFields.name;
    if (updatedFields.code !== undefined) apiPatch.sku = updatedFields.code;
    if (updatedFields.price !== undefined) apiPatch.price = updatedFields.price;
    if (updatedFields.stockEstimated !== undefined) apiPatch.stock = updatedFields.stockEstimated;
    if (Object.keys(apiPatch).length > 0) void persistUpdate(productId, apiPatch);
  };

  const addProduct = (newProduct: Omit<ProductItem, "id">) => {
    const tempId = `tmp-${Date.now()}`;
    const optimistic: ProductItem = { ...newProduct, id: tempId };
    setProducts(prev => [optimistic, ...prev]);

    (async () => {
      try {
        const token = await getIdToken().catch(() => "");
        const created = await apiCreateProduct(
          toApiProduct({
            name: newProduct.name,
            code: newProduct.code,
            price: newProduct.price,
            stockEstimated: newProduct.stockEstimated,
          }),
          token
        );
        setProducts(prev =>
          prev.map(p => (p.id === tempId ? toProductItem(created, { ...optimistic, id: created.id }) : p))
        );
      } catch (err) {
        console.error("[CatalogContext] failed to create product", err);
        if (!PRODUCTS_USE_MOCK) {
          setProducts(prev => prev.filter(p => p.id !== tempId));
        }
      }
    })();
  };

  const value = useMemo(
    () => ({
      products,
      toggleProductAvailability,
      updateProductPrice,
      updateProduct,
      addProduct,
    }),
    [products]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};

export function useCatalog(): CatalogContextType {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error("useCatalog must be used within a CatalogProvider");
  }
  return ctx;
}
