export type PedidosSection = "operacion" | "gestion";

export type OperacionTab = "en-vivo" | "preparacion" | "programados";

export type GestionTab =
  | "resumen"
  | "historial"
  | "catalogo"
  | "automatizaciones"
  | "turnos"
  | "analitica";

export type OrderStatus =
  | "NUEVO"
  | "CONFIRMADO"
  | "EN_PREPARACION"
  | "LISTO"
  | "FINALIZADO"
  | "RECHAZADO"
  | "CANCELADO";

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
  toStatus: OrderStatus;
  user: string;
  ruleName?: string;
  note?: string;
}

export interface Pedido {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryAddress?: string;
  paymentMethod?: "mercadopago" | "efectivo" | "transferencia" | "pos" | string;
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
  history: OrderEvent[];
}

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  verifiedOrder: boolean;
}

export interface ProductModifierOption {
  id: string;
  name: string;
  priceDelta: number;
  isDefault?: boolean;
}

export interface ProductModifierGroup {
  id: string;
  title: string;
  minSelect: number;
  maxSelect: number;
  options: ProductModifierOption[];
}

export interface ProductItem {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
  isAvailable: boolean;
  stockEstimated: number;
  prepTimeMinutes: number;
  description: string;
  demandTag?: "Alta demanda" | "Demanda media" | "Sugerencia de promo";
  activeOrdersCount?: number;
  salesCount?: number;
  popularityRank?: number;
  rating?: number;
  reviewsCount?: number;
  reviews?: ProductReview[];
  modifiers?: ProductModifierGroup[];
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  triggerType: "order_created" | "delay_threshold" | "stock_critical";
  conditions: {
    checkProductsAvailable: boolean;
    checkBusinessHours: boolean;
    checkKitchenCapacity: boolean;
    channel?: OrderChannel | "todos";
    maxElapsedMinutes?: number;
  };
  actionType: "auto_confirm" | "raise_incidence" | "reassign_staff";
  lastExecuted?: string;
  executionCount: number;
}

export interface RecurrenceConfig {
  id: string;
  customerName: string;
  companyName?: string;
  phone: string;
  frequency: "Diario (Lun-Vie)" | "Todos los lunes" | "Todos los viernes" | "Quincenal";
  scheduledTime: string;
  items: OrderItem[];
  total: number;
  isActive: boolean;
  nextExecution: string;
  lastExecutionStatus?: "Exitoso" | "Capacidad reducida" | "Error";
}

export interface StaffMember {
  id: string;
  name: string;
  role: "Cocinero principal" | "Ayudante de cocina" | "Cajero" | "Repartidor" | "Supervisor";
  status: "Activo" | "Descanso" | "Inactivo";
  station?: "Horno" | "Armado" | "Empaque" | "Caja";
  assignedOrdersCount: number;
}

export interface ShiftInfo {
  name: string;
  currentShift: string;
  capacityStatus: "Optima" | "Moderada" | "Reducida";
  capacityPercent: number;
  activeStaff: StaffMember[];
  currentActiveOrdersCount: number;
  maxRecommendedOrders: number;
  suggestedPrepBufferMinutes: number;
}

export interface Incidencia {
  id: string;
  title: string;
  severity: "Alta" | "Media" | "Baja";
  type: "pedido_retrasado" | "capacidad_insuficiente" | "error_interpretacion" | "producto_desactivado" | "cancelacion";
  orderId?: string;
  timestamp: string;
  description: string;
  isResolved: boolean;
}

export interface ResumenKPIs {
  pedidosHoy: number;
  completados: number;
  enProceso: number;
  cancelados: number;
  rechazados: number;
  ingresosTotales: number;
  ticketPromedio: number;
  tiempoPromedioPrep: number;
  tasaCancelacion: number;
  pedidosConIA: number;
  eficienciaOperativa: number;
}

export type StorePaceMode = "rapida" | "habitual" | "demorada";

