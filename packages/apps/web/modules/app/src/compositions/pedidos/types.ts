// Re-export domain contracts for backward compatibility
export type {
  OrderStatus,
  PaymentStatus,
  ReturnStatus,
  OrderDomainEvent,
  UrgencyLevel,
  OrderChannel,
  OrderType,
  AIConfidence,
  OrderItem,
  OrderEvent,
  Pedido,
  DraftOrder,
  ProductReview,
  ProductModifierOption,
  ProductModifierGroup,
  RecipeIngredient,
  ProductItem,
  ConversationStatus,
  HandoffReason,
  MessageSender,
  ChatMessage,
  ConversationEvent,
  Conversation,
} from "../../contracts";

export type PedidosSection =
  | "ordenes"
  | "programados"
  | "preparacion"
  | "canales"
  | "configuracion"
  | "operacion"
  | "menu"
  | "analitica"
  | "gestion"
  | "conversaciones"
  | "whatsapp";

export type OperacionTab = "en-vivo" | "preparacion" | "programados" | "conversaciones";
export type MenuTab = "catalogo" | "insumos";
export type AnaliticaTab = "resumen" | "historial" | "analitica" | "rendimiento";
export type ConfigTab = "roles" | "automatizaciones" | "turnos";

export type GestionTab =
  | "resumen"
  | "historial"
  | "catalogo"
  | "insumos"
  | "roles"
  | "automatizaciones"
  | "turnos"
  | "analitica";

export interface StockIngredientItem {
  id: string;
  code: string;
  name: string;
  category: "Carnes" | "Harinas y Masas" | "Lácteos" | "Verduras" | "Bebidas" | "Packaging" | "Condimentos" | "General";
  unit: "kg" | "gr" | "lt" | "ml" | "unid" | "paquete";
  currentStock: number;
  minThreshold: number; // Punto de reorden / alerta crítica
  costPerUnit: number;
  expiryDate?: string;
  lotNumber?: string;
  lastRestockedAt?: string;
  imageUrl?: string;
  status: "OPTIMO" | "BAJO" | "CRITICO" | "AGOTADO";
}

export interface StockMovement {
  id: string;
  ingredientId: string;
  ingredientName: string;
  type: "INGRESO_PROVEEDOR" | "VENTA_PEDIDO" | "MERMA_COCINA" | "AJUSTE_AUDITORIA";
  quantity: number; // Positivo para ingreso, negativo para consumo/merma
  unit: string;
  orderId?: string;
  reason?: string;
  evidenceUrl?: string;
  evidenceType?: "foto" | "audio" | "texto";
  registeredBy: string;
  timestamp: string;
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
    channel?: import("../../contracts").OrderChannel | "todos";
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
  items: import("../../contracts").OrderItem[];
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
