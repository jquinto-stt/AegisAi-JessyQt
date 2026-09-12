import React, { createContext, useContext, useState } from "react";
import { StockIngredientItem, StockMovement } from "@/compositions/pedidos/types";
import { INITIAL_INGREDIENTS, INITIAL_MOVEMENTS } from "@/compositions/pedidos/mockData";
import { Pedido, CatalogItem } from "@/contracts";

export interface InventoryContextType {
  ingredients: StockIngredientItem[];
  stockMovements: StockMovement[];
  addIngredient: (newIng: Omit<StockIngredientItem, "id">) => void;
  updateIngredient: (id: string, patch: Partial<StockIngredientItem>) => void;
  deleteIngredient: (id: string) => void;
  registerStockMovement: (mov: Omit<StockMovement, "id" | "timestamp">) => void;
  consumeRecipeStockForOrder: (order: Pedido, catalog: CatalogItem[]) => void;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ingredients, setIngredients] = useState<StockIngredientItem[]>(INITIAL_INGREDIENTS);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(INITIAL_MOVEMENTS);

  const addIngredient = (newIng: Omit<StockIngredientItem, "id">) => {
    const nextId = `ing-${Date.now().toString().slice(-4)}`;
    const created: StockIngredientItem = { ...newIng, id: nextId };
    setIngredients(prev => [created, ...prev]);
  };

  const updateIngredient = (id: string, patch: Partial<StockIngredientItem>) => {
    setIngredients(prev =>
      prev.map(ing => {
        if (ing.id !== id) return ing;
        const updated = { ...ing, ...patch };
        if (patch.currentStock !== undefined || patch.minThreshold !== undefined) {
          const stock = patch.currentStock !== undefined ? patch.currentStock : ing.currentStock;
          const min = patch.minThreshold !== undefined ? patch.minThreshold : ing.minThreshold;
          if (stock <= 0) updated.status = "AGOTADO";
          else if (stock <= min * 0.5) updated.status = "CRITICO";
          else if (stock <= min) updated.status = "BAJO";
          else updated.status = "OPTIMO";
        }
        return updated;
      })
    );
  };

  const deleteIngredient = (id: string) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
  };

  const registerStockMovement = (mov: Omit<StockMovement, "id" | "timestamp">) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const nextId = `mov-${Date.now().toString().slice(-4)}`;
    const newMovement: StockMovement = {
      ...mov,
      id: nextId,
      timestamp: `Hoy ${timeStr}`,
    };

    setStockMovements(prev => [newMovement, ...prev]);

    setIngredients(prev =>
      prev.map(ing => {
        if (ing.id !== mov.ingredientId) return ing;
        const newStock = Math.max(0, Number((ing.currentStock + mov.quantity).toFixed(2)));
        let newStatus: StockIngredientItem["status"] = "OPTIMO";
        if (newStock <= 0) newStatus = "AGOTADO";
        else if (newStock <= ing.minThreshold * 0.5) newStatus = "CRITICO";
        else if (newStock <= ing.minThreshold) newStatus = "BAJO";

        return {
          ...ing,
          currentStock: newStock,
          status: newStatus,
          lastRestockedAt: mov.type === "INGRESO_PROVEEDOR" ? `Hoy ${timeStr}` : ing.lastRestockedAt,
        };
      })
    );
  };

  const consumeRecipeStockForOrder = (order: Pedido, catalog: CatalogItem[]) => {
    order.items.forEach(orderItem => {
      const product = catalog.find(p => p.id === orderItem.productId || p.name === orderItem.name);
      if (product && product.recipe && product.recipe.length > 0) {
        product.recipe.forEach(rec => {
          const totalQty = rec.quantityRequired * orderItem.quantity;
          registerStockMovement({
            ingredientId: rec.ingredientId,
            ingredientName: rec.ingredientName,
            type: "VENTA_PEDIDO",
            quantity: -Number(totalQty.toFixed(2)),
            unit: rec.unit,
            orderId: order.id,
            reason: `Consumo automático por ${orderItem.quantity}x ${product.name} (Comanda ${order.id})`,
            registeredBy: "Motor de Pedidos",
          });
        });
      } else if (ingredients.length > 0) {
        const nameLower = orderItem.name.toLowerCase();
        const matchedIng =
          ingredients.find(
            ing =>
              nameLower.includes(ing.name.toLowerCase()) ||
              ing.name.toLowerCase().includes(nameLower.split(" ")[0])
          ) || ingredients[0];

        if (matchedIng) {
          const qty = matchedIng.unit === "kg" ? 0.12 * orderItem.quantity : orderItem.quantity;
          registerStockMovement({
            ingredientId: matchedIng.id,
            ingredientName: matchedIng.name,
            type: "VENTA_PEDIDO",
            quantity: -Number(qty.toFixed(2)),
            unit: matchedIng.unit,
            orderId: order.id,
            reason: `Consumo proporcional por ${orderItem.quantity}x ${orderItem.name} (Comanda ${order.id})`,
            registeredBy: "Motor de Pedidos",
          });
        }
      }
    });
  };

  return (
    <InventoryContext.Provider
      value={{
        ingredients,
        stockMovements,
        addIngredient,
        updateIngredient,
        deleteIngredient,
        registerStockMovement,
        consumeRecipeStockForOrder,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventoryContext = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventoryContext must be used within an InventoryProvider");
  }
  return context;
};
