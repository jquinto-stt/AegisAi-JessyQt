/**
 * Order Domain Contract (OMS)
 * Pure domain types for orders, line items, status transitions, and order events.
 */

export type OrderStatus =
  | "NUEVO"
  | "CONFIRMADO"
  | "EN_PREPARACION"
  | "LISTO"
  | "ENTREGADO"
  | "FINALIZADO"
  | "RECHAZADO"
  | "CANCELADO";

export type PaymentStatus =
  | "PENDIENTE"
  | "PAGADO"
  | "PAGO_CONTRA_ENTREGA"
  | "ANULADO"
  | "REEMBOLSADO";

export type ReturnStatus =
  | "NO_APLICA"
  | "SOLICITADA"
  | "APROBADA"
  | "RECIBIDA"
  | "RECHAZADA";

export type UrgencyLevel = "A_TIEMPO" | "PROXIMO" | "RETRASADO";

export type OrderChannel = "whatsapp" | "web" | "presencial" | "telefono";

export type OrderType = "inmediato" | "programado" | "recurrente";

export type AIConfidence = "Alta" | "Media" | "Baja";

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  option?: string;
  category?: string;
}

export interface OrderEvent {
  timestamp: string;
  fromStatus?: OrderStatus;
  toStatus?: OrderStatus;
  fromPaymentStatus?: PaymentStatus;
  toPaymentStatus?: PaymentStatus;
  fromReturnStatus?: ReturnStatus;
  toReturnStatus?: ReturnStatus;
  user: string;
  ruleName?: string;
  note?: string;
  inventoryOperationId?: string;
}

export interface Pedido {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryAddress?: string;
  paymentMethod?: "mercadopago" | "efectivo" | "transferencia" | "pos" | string;
  paymentStatus?: PaymentStatus;
  returnStatus?: ReturnStatus;
  returnReason?: string;
  channel: OrderChannel;
  type: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  createdAt: string;
  estimatedMinutes: number;
  elapsedMinutes: number;
  scheduledDate?: string;
  scheduledTime?: string;
  recurringFrequency?: string;
  urgency: UrgencyLevel;
  isAIOrigin?: boolean;
  aiRawMessage?: string;
  aiConfidence?: AIConfidence;
  rejectionReason?: string;
  cancellationReason?: string;
  turnNumber?: number;
  notes?: string;
  isStockConsumed?: boolean;
  isStockReverted?: boolean;
  isInLiveQueue?: boolean;
  history: OrderEvent[];
}

export type OrderDomainEvent =
  | { type: "OrderConfirmed"; order: Pedido }
  | { type: "OrderReady"; order: Pedido }
  | { type: "OrderCancelled"; order: Pedido; reason: string }
  | { type: "OrderReturned"; order: Pedido; reason: string; returnStock: boolean };

export interface DraftOrder {
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryType?: "domicilio" | "pickup";
  deliveryAddress?: string;
  paymentMethod?: "nequi" | "bancolombia" | "daviplata" | "efectivo" | "datafono";
  notes?: string;
}
