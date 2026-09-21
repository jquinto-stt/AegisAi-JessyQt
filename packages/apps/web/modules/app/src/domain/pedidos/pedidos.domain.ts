/**
 * Domain: Pedidos (Order Core)
 * Contratos puros e independientes de UI, persistencia o rubro de negocio.
 * Sigue principios de Domain-Driven Design (DDD): snapshot comercial inmutable
 * y separación de máquinas de estado ortogonales (Lifecycle, Payment, Fulfillment).
 */

// ── Cliente ──────────────────────────────────────────────────────────────────

export interface OrderCustomer {
  id?: string;
  name: string;
  /** Teléfono en formato E.164 (ej. "+573001112233"). Clave de cruce omnicanal. */
  phone: string;
  email?: string;
}

// ── Ítems (Snapshot Comercial Inmutable) ──────────────────────────────────────

export interface VariantSnapshot {
  sku?: string;
  label?: string;
  attributes: Record<string, string>; // Ej: { talla: "M", color: "Negro" }
}

export interface ModifierSnapshot {
  name: string;
  priceDelta?: number; // Ej: +1500 (extra queso) o 0 (sin cebolla)
}

export interface ServiceSnapshot {
  durationMinutes?: number;
  scheduledAt?: string; // ISO
  professionalName?: string;
}

export interface OrderItem {
  id: string;
  /**
   * Referencia OPCIONAL y OPACA a un identificador externo (el catálogo simple
   * de `pedidos.store`, un ERP, un e-commerce).
   *
   * **No es una clave foránea a `Articulo`.** Pedidos e Inventario son
   * independientes por decisión de arquitectura (D1/D2): si este campo apuntara
   * a un artículo del kárdex, el pedido tendría que consultar el stock para
   * poder pintarse y las dos mitades dejarían de poder evolucionar por separado.
   * El nombre y el precio del ítem ya viajan CONGELADOS en `nameSnapshot` y
   * `unitPrice`, así que un pedido se lee entero sin abrir ningún otro módulo.
   */
  productId?: string;
  /** Nombre congelado al momento de la venta */
  nameSnapshot: string;
  /** Precio unitario base congelado */
  unitPrice: number;
  /** Cantidad solicitada */
  quantity: number;
  notes?: string;

  /** Extensiones tipadas de especialización comercial */
  variantSnapshot?: VariantSnapshot;
  modifiersSnapshot?: ModifierSnapshot[];
  serviceSnapshot?: ServiceSnapshot;
}

// ── Ciclo Financiero (Payment) ───────────────────────────────────────────────

export type PaymentStatus =
  | "pending"     // Pendiente de pago
  | "authorized"  // Pago retenido/autorizado pero no capturado
  | "paid"        // Pagado exitosamente
  | "failed"      // Intento de pago fallido
  | "refunded";   // Pago devuelto total o parcialmente

export type PaymentMethod =
  | "cash"              // Efectivo
  | "card"              // Tarjeta de crédito/débito
  | "transfer"          // Transferencia bancaria
  | "cash_on_delivery"; // Contra entrega

export interface OrderPayment {
  status: PaymentStatus;
  method?: PaymentMethod;
  amountPaid?: number;
  currency?: string;
  paidAt?: string; // ISO
  /** Monto con el que paga el cliente para calcular vuelto/cambio */
  changeFromAmount?: number;
}

// ── Ciclo Logístico (Fulfillment) ────────────────────────────────────────────

export type FulfillmentType =
  | "pickup"          // Retiro en tienda/local
  | "local_delivery"   // Reparto local propio (mensajero/moto)
  | "shipment"        // Envío nacional/courier con guía
  | "service"         // Atención o prestación de servicio in situ
  | "none";           // Bienes digitales o consumo inmediato

export type FulfillmentStatus =
  | "unfulfilled"     // No iniciado / en cola
  | "in_preparation"  // En preparación / empacado / cocina
  | "ready"           // Listo para entrega o despacho
  | "dispatched"      // En camino / despachado con courier
  | "delivered"       // Entregado al cliente
  | "failed";         // Intento de entrega fallido

export interface FulfillmentAddress {
  street: string;
  neighborhood?: string;
  city?: string;
  reference?: string;
  instructions?: string;
}

export interface OrderFulfillment {
  type: FulfillmentType;
  status: FulfillmentStatus;
  destination?: FulfillmentAddress;
  shippingCost?: number;
  /** Mensajero local o empresa de encomienda */
  courier?: string;
  /** Número de guía o tracking de mensajería externa */
  trackingNumber?: string;
  dispatchedAt?: string; // ISO
  deliveredAt?: string;  // ISO
}

// ── Ciclo de Vida General (Order Lifecycle) ──────────────────────────────────

export type OrderLifecycle =
  | "draft"       // Borrador en creación
  | "open"        // Pedido activo en proceso
  | "completed"   // Pedido concluido con éxito (entregado y cerrado)
  | "cancelled";  // Pedido cancelado (terminal)

export type OrderOrigin = "whatsapp" | "pos" | "web" | "manual";

// ── Agregado Principal: OrderCore ────────────────────────────────────────────

export interface OrderCore {
  id: string;
  number: string; // Ej: "P-001"
  customer: OrderCustomer;
  items: OrderItem[];
  payment: OrderPayment;
  fulfillment: OrderFulfillment;
  lifecycle: OrderLifecycle;
  origin: OrderOrigin;
  notes?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  scheduledFor?: string; // ISO opcional para pedidos programados
  closedAt?: string;     // ISO al finalizar o cancelar
}

// ── Funciones Puras de Dominio ───────────────────────────────────────────────

/** Calcula el precio total de una línea de pedido (incluyendo modificadores). */
export function calculateItemTotal(item: OrderItem): number {
  const modifiersDelta = (item.modifiersSnapshot ?? []).reduce(
    (acc, m) => acc + (m.priceDelta ?? 0),
    0
  );
  const effectiveUnitPrice = Math.max(0, item.unitPrice + modifiersDelta);
  return effectiveUnitPrice * item.quantity;
}

/** Calcula el subtotal del pedido sumando todas las líneas. */
export function calculateOrderSubtotal(order: Pick<OrderCore, "items">): number {
  return order.items.reduce((acc, item) => acc + calculateItemTotal(item), 0);
}

/** Calcula el total general incluyendo costos de envío/logística. */
export function calculateOrderTotal(
  order: Pick<OrderCore, "items" | "fulfillment">
): number {
  const subtotal = calculateOrderSubtotal(order);
  const shipping = order.fulfillment?.shippingCost ?? 0;
  return subtotal + shipping;
}
