import { inventoryService } from "../../../ModuloInventario/services/inventoryService";
import { OrderDomainEvent } from "../types";

export interface StockItemParam {
  productId?: string;
  name: string;
  quantity: number;
}

export interface InventoryPort {
  /** Indica si el módulo de inventarios está activo y conectado en el negocio */
  readonly isEnabled: boolean;

  /**
   * Manejador reactivo de eventos de dominio de la orden (EDA).
   * Pedidos no le dicta a Inventario qué método ejecutar; solo notifica que un
   * evento de negocio ocurrió en la orden.
   */
  handleOrderEvent: (event: OrderDomainEvent) => Promise<string | undefined>;

  /** Valida disponibilidad comercial considerando stock reservado */
  validateAvailableStock: (items: StockItemParam[]) => {
    hasStock: boolean;
    missingItems: Array<{ name: string; requested: number; available: number }>;
  };

  /** Consulta información de stock actual, reservado y disponible */
  getProductStock: (
    productId?: string,
    name?: string
  ) => { stockActual: number; reservedStock: number; availableStock: number } | null;
}

/**
 * Fabrica el adaptador desacoplado de Inventario según los módulos activos de la tienda.
 * - hasInventarios = false: No-Op Adapter (Pedidos corre 100% autónomo como OMS puro).
 * - hasInventarios = true: Enchufa reactivamente al Kardex del ModuloInventario.
 */
export function createInventoryAdapter(hasInventarios: boolean): InventoryPort {
  if (!hasInventarios) {
    return {
      isEnabled: false,
      handleOrderEvent: async () => undefined,
      validateAvailableStock: () => ({ hasStock: true, missingItems: [] }),
      getProductStock: () => null,
    };
  }

  return {
    isEnabled: true,
    handleOrderEvent: async (event: OrderDomainEvent): Promise<string | undefined> => {
      const items = event.order.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
      }));

      switch (event.type) {
        case "OrderConfirmed": {
          inventoryService.reserveStock({
            orderId: event.order.id,
            items,
            channel: event.order.channel || "WhatsApp",
          });
          return undefined;
        }

        case "OrderReady": {
          const res = await inventoryService.consumeSaleOrder({
            orderId: event.order.id,
            items,
            channel: event.order.channel || "Comanda Digital",
            author: "Motor de Pedidos",
          });
          return res.length > 0 ? res[0].movement.id : undefined;
        }

        case "OrderCancelled": {
          if (event.order.status === "LISTO" && event.order.isStockConsumed && !event.order.isStockReverted) {
            const res = await inventoryService.revertSaleOrder({
              orderId: event.order.id,
              items,
              reason: event.reason,
              author: "Cancelación Operativa",
            });
            return res.length > 0 ? res[0].movement.id : undefined;
          } else {
            inventoryService.releaseStock(event.order.id);
            return undefined;
          }
        }

        case "OrderReturned": {
          if (event.returnStock && !event.order.isStockReverted) {
            const res = await inventoryService.returnDeliveredOrder({
              orderId: event.order.id,
              items,
              reason: event.reason,
              author: "Supervisor de Devoluciones",
            });
            return res.length > 0 ? res[0].movement.id : undefined;
          }
          return undefined;
        }
      }
    },
    validateAvailableStock: (items) => inventoryService.validateAvailableStock(items),
    getProductStock: (productId, name) => inventoryService.getProductStock(productId, name),
  };
}
