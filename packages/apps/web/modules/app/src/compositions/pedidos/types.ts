export type PedidosSection =
  | "operacion"
  | "menu"
  | "analitica"
  | "configuracion"
  | "gestion"; // Retro-compatibilidad

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

export interface RecipeIngredient {
  ingredientId: string;
  ingredientName: string;
  quantityRequired: number; // Cantidad consumida por unidad de producto
  unit: string;
}

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
  recipe?: RecipeIngredient[];
  autoPauseOnStockOut?: boolean;
  costEstimated?: number;
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


// ============================================================================
// Human-in-the-Loop (HITL) — Conversaciones de WhatsApp / IA
// ----------------------------------------------------------------------------
// Modela el hilo de chat entre el cliente y el negocio. El ciclo de vida de la
// CONVERSACIÓN es distinto al del PEDIDO (OrderStatus): la conversación es el
// canal; el pedido es el resultado. Cuando se genera un pedido, la conversación
// lo referencia por `orderId` y reutiliza las acciones existentes del contexto.
// ============================================================================

/** Estados del control de una conversación (máquina de estados HITL). */
export type ConversationStatus =
  | "IA_ATENDIENDO"          // La IA lleva la conversación
  | "REQUIERE_INTERVENCION"  // La IA pidió ayuda; nadie la tomó aún (en cola)
  | "HUMANO_ATENDIENDO"      // Un operador tomó el control (IA en pausa)
  | "RESUELTO";              // El humano cerró el caso

/** Motivo por el que la IA (o el cliente) solicita intervención humana. */
export type HandoffReason =
  | "AMBIGUO"                     // El pedido/mensaje es ambiguo
  | "FUERA_DE_ALCANCE"            // La IA no puede resolver la solicitud
  | "MODIFICACION_ESPECIAL"       // El cliente pide una modificación especial
  | "CONFIRMAR_DATO"              // Hay que confirmar un dato antes de procesar
  | "CLIENTE_PIDE_HUMANO"         // El cliente pidió explícitamente hablar con alguien
  | "BAJA_CONFIANZA"              // La interpretación de la IA tiene confianza baja
  | "VERIFICAR_PAGO_TRANSFERENCIA"; // Cliente envió comprobante Nequi/Bancolombia/QR

/** Quién emitió un mensaje del hilo. */
export type MessageSender = "cliente" | "ia" | "humano";

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  /** Nombre del operador cuando sender = "humano". */
  authorName?: string;
  text: string;
  timestamp: string;
  attachmentUrl?: string;
  attachmentType?: "image" | "comprobante" | "audio";
  attachmentMeta?: {
    bank?: "Nequi" | "Bancolombia" | "Daviplata" | "QR Interbancario" | "Transferencia";
    amount?: number;
    reference?: string;
    status?: "PENDIENTE_VERIFICACION" | "VERIFICADO_OK" | "RECHAZADO";
  };
}

/** Evento de auditoría de una transición de control (análogo a OrderEvent). */
export interface ConversationEvent {
  timestamp: string;
  fromStatus?: ConversationStatus;
  toStatus: ConversationStatus;
  user: string;
  note?: string;
}

export interface Conversation {
  id: string;
  customerName: string;
  customerPhone: string;
  avatarUrl?: string;
  channel: OrderChannel;
  status: ConversationStatus;
  /** Operador que tiene el control ahora (fuente de verdad de exclusión mutua). */
  controlledBy: string | null;
  /** Motivo del handoff cuando el estado es REQUIERE_INTERVENCION. */
  requiresHandoffReason?: HandoffReason;
  aiConfidence?: AIConfidence;
  /** Pedido asociado (si ya se generó); enlaza con Pedido.id. */
  orderId?: string;
  messages: ChatMessage[];
  handoffHistory: ConversationEvent[];
  lastMessageAt: string;
  /** Marca visual de "no leído" para el operador (badge en la lista). */
  unreadForOperator: boolean;
}

