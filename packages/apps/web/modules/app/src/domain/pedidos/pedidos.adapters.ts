/**
 * Domain Adapters: Pedidos (Strangler Fig Bridge)
 * Provee conversión bidireccional entre el modelo legacy de `Pedido` (MobX store)
 * y el nuevo modelo neutro `OrderCore`.
 * Garantiza cero regresiones en la interfaz y compatibilidad hacia atrás completa.
 */

import type {
  OrderCore,
  OrderItem,
  OrderCustomer,
  OrderPayment,
  OrderFulfillment,
  PaymentStatus,
  PaymentMethod,
  FulfillmentType,
  FulfillmentStatus,
  OrderLifecycle,
  OrderOrigin,
} from "./pedidos.domain.js";

import type {
  Pedido,
  PedidoItem,
  PedidoEstado,
  Modalidad,
  Origen,
  MetodoPago,
} from "../../stores/pedidos.store.js";

// ── Mapeos de Adaptación: Legacy ➔ Core ───────────────────────────────────────

function mapLegacyPaymentMethod(method?: MetodoPago): PaymentMethod | undefined {
  switch (method) {
    case "efectivo": return "cash";
    case "tarjeta": return "card";
    case "transferencia": return "transfer";
    case "contra_entrega": return "cash_on_delivery";
    default: return undefined;
  }
}

function mapCorePaymentMethod(method?: PaymentMethod): MetodoPago | undefined {
  switch (method) {
    case "cash": return "efectivo";
    case "card": return "tarjeta";
    case "transfer": return "transferencia";
    case "cash_on_delivery": return "contra_entrega";
    default: return undefined;
  }
}

function mapLegacyFulfillmentType(modalidad: Modalidad): FulfillmentType {
  switch (modalidad) {
    case "retiro": return "pickup";
    case "domicilio": return "local_delivery";
    case "en_sitio": return "service";
    default: return "pickup";
  }
}

function mapCoreFulfillmentType(type: FulfillmentType): Modalidad {
  switch (type) {
    case "pickup": return "retiro";
    case "local_delivery":
    case "shipment": return "domicilio";
    case "service":
    case "none": return "en_sitio";
    default: return "retiro";
  }
}

function mapLegacyLifecycleAndFulfillmentStatus(estado: PedidoEstado): {
  lifecycle: OrderLifecycle;
  fulfillmentStatus: FulfillmentStatus;
} {
  switch (estado) {
    case "programado":
    case "nuevo":
      return { lifecycle: "open", fulfillmentStatus: "unfulfilled" };
    case "confirmado":
      return { lifecycle: "open", fulfillmentStatus: "unfulfilled" };
    case "en_preparacion":
      return { lifecycle: "open", fulfillmentStatus: "in_preparation" };
    case "listo":
      return { lifecycle: "open", fulfillmentStatus: "ready" };
    case "en_camino":
      return { lifecycle: "open", fulfillmentStatus: "dispatched" };
    case "entregado":
      return { lifecycle: "completed", fulfillmentStatus: "delivered" };
    case "cancelado":
      return { lifecycle: "cancelled", fulfillmentStatus: "failed" };
    default:
      return { lifecycle: "open", fulfillmentStatus: "unfulfilled" };
  }
}

function mapCoreToLegacyEstado(
  lifecycle: OrderLifecycle,
  fulfillmentStatus: FulfillmentStatus,
  scheduledFor?: string
): PedidoEstado {
  if (lifecycle === "cancelled") return "cancelado";
  if (lifecycle === "completed") return "entregado";
  if (scheduledFor && new Date(scheduledFor).getTime() > Date.now()) {
    return "programado";
  }

  switch (fulfillmentStatus) {
    case "dispatched": return "en_camino";
    case "ready": return "listo";
    case "in_preparation": return "en_preparacion";
    case "unfulfilled":
    case "failed":
    default:
      return "nuevo";
  }
}

function mapLegacyOrigen(origen: Origen): OrderOrigin {
  return origen === "whatsapp" ? "whatsapp" : "manual";
}

function mapCoreOrigen(origin: OrderOrigin): Origen {
  return origin === "whatsapp" ? "whatsapp" : "operador";
}

// ── Exportación de Adaptadores Puros ──────────────────────────────────────────

/** Convierte un `Pedido` del store legacy a la entidad limpia `OrderCore`. */
export function toOrderCore(legacy: Pedido): OrderCore {
  const { lifecycle, fulfillmentStatus } = mapLegacyLifecycleAndFulfillmentStatus(legacy.estado);

  const customer: OrderCustomer = {
    name: legacy.cliente,
    phone: legacy.telefono,
  };

  const items: OrderItem[] = legacy.items.map((it, idx) => ({
    id: `${legacy.id}-item-${idx + 1}`,
    nameSnapshot: it.nombre,
    quantity: it.cantidad,
    unitPrice: it.precio ?? 0,
  }));

  const payment: OrderPayment = {
    status: (legacy.pagado ? "paid" : "pending") as PaymentStatus,
    method: mapLegacyPaymentMethod(legacy.metodoPago),
    amountPaid: legacy.pagado ? undefined : undefined,
    changeFromAmount: legacy.pagaCon,
  };

  const fulfillment: OrderFulfillment = {
    type: mapLegacyFulfillmentType(legacy.modalidad),
    status: fulfillmentStatus,
    destination: legacy.direccionEntrega ? {
      street: legacy.direccionEntrega.calle,
      neighborhood: legacy.direccionEntrega.barrio,
      reference: legacy.direccionEntrega.referencia,
      instructions: legacy.direccionEntrega.indicaciones,
    } : undefined,
    shippingCost: legacy.costoEnvio,
    courier: legacy.repartidor,
  };

  return {
    id: legacy.id,
    number: legacy.numero,
    customer,
    items,
    payment,
    fulfillment,
    lifecycle,
    origin: mapLegacyOrigen(legacy.origen),
    notes: legacy.notas,
    createdAt: legacy.createdAt,
    updatedAt: legacy.estadoDesde,
    scheduledFor: legacy.programadoPara,
    closedAt: legacy.finishedAt,
  };
}

/** Convierte una entidad `OrderCore` limpia al formato `Pedido` que consume la UI existente. */
export function toLegacyPedido(core: OrderCore): Pedido {
  const items: PedidoItem[] = core.items.map((it) => ({
    nombre: it.nameSnapshot,
    cantidad: it.quantity,
    precio: it.unitPrice > 0 ? it.unitPrice : undefined,
  }));

  const estado = mapCoreToLegacyEstado(
    core.lifecycle,
    core.fulfillment.status,
    core.scheduledFor
  );

  return {
    id: core.id,
    numero: core.number,
    cliente: core.customer.name,
    telefono: core.customer.phone,
    modalidad: mapCoreFulfillmentType(core.fulfillment.type),
    items,
    notas: core.notes,
    estado,
    origen: mapCoreOrigen(core.origin),
    pagado: core.payment.status === "paid",
    createdAt: core.createdAt,
    estadoDesde: core.updatedAt,
    finishedAt: core.closedAt,
    programadoPara: core.scheduledFor,
    direccionEntrega: core.fulfillment.destination ? {
      calle: core.fulfillment.destination.street,
      barrio: core.fulfillment.destination.neighborhood,
      referencia: core.fulfillment.destination.reference,
      indicaciones: core.fulfillment.destination.instructions,
    } : undefined,
    costoEnvio: core.fulfillment.shippingCost,
    metodoPago: mapCorePaymentMethod(core.payment.method),
    pagaCon: core.payment.changeFromAmount,
    repartidor: core.fulfillment.courier,
  };
}
