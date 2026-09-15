/**
 * Pedidos — Contrato de dominio (Núcleo del OMS universal de Necto)
 * ================================================================
 *
 * Este archivo es la **frontera** del módulo Pedidos. Todo lo que aquí se declara
 * es propiedad del módulo; todo lo que no está aquí es propiedad de otro dominio y
 * se consume por **referencia**, nunca por copia.
 *
 * ── El principio arquitectónico (§1 del pedido) ─────────────────────────────
 *
 *   El módulo que posee una capacidad es responsable de esa capacidad.
 *   Los demás módulos la consumen mediante contratos claramente definidos.
 *
 * ── Pedidos ES dueño de (§24) ───────────────────────────────────────────────
 *
 *   Order · OrderItem · OrderStatus · OrderStatusHistory · datos de entrega
 *   propios de la orden · pago asociado a la orden · programación de la orden ·
 *   origen de la orden · metadata del ciclo de vida.
 *
 * ── Pedidos NO es dueño de (§24) ────────────────────────────────────────────
 *
 *   Product · Inventory · Store · User · Customer (como dominio global) ·
 *   Channel · WhatsApp · AI Assistant.
 *
 *   ⚠️ Por eso este archivo **no** declara `Product`, `Stock`, `Customer`,
 *   `ChannelConfig` ni `AssistantConfig`. Ver `OrderItemRef`: guarda la
 *   *referencia* al artículo más el **precio vigente al momento de la orden**,
 *   que sí es de la orden (es un hecho histórico suyo, no del catálogo).
 *
 * ── Agnosticismo (§22) ──────────────────────────────────────────────────────
 *
 *   El núcleo piensa en: orden · ítem · cantidad · precio · estado · ejecución ·
 *   entrega · cierre. **Nunca** en: comida · mesas · recetas · tallas · tornillos.
 *
 *   ⚠️ El vocabulario específico de rubro (`stationName`, `itemModifiers`,
 *   `requiresKitchenDisplay`…) vive en `BusinessSemanticConfig` — propiedad de la
 *   **tienda**— y se resuelve en la capa de presentación. El contrato de Pedidos
 *   no puede depender de él: una orden de tornillos y una de hamburguesas caben
 *   en el mismo tipo sin un solo campo condicional.
 */

/* ── Estados (§4) ──────────────────────────────────────────────────────────── */

/**
 * Estados del ciclo de vida de una orden.
 *
 * Nombres de código estables (se persisten). El rótulo visible lo resuelve
 * `order-status.constants.ts`, de modo que renombrar copy no toca el modelo.
 *
 * ⚠️ No todos los estados aplican a todos los casos (§4): una recogida pasa de
 * `READY` a `DELIVERED` sin `IN_TRANSIT`; una orden de servicio usa
 * `IN_PROGRESS` como ejecución. El modelo **permite** las variantes; quien las
 * restringe es `orderFulfillmentMode`, no el estado.
 */
export type OrderStatus =
  /* Flujo principal */
  | "PENDING"            // Pendiente / Por validar — estado inicial de TODA orden
  | "CONFIRMED"          // Compromiso operativo asumido
  | "IN_PREPARATION"     // En alistamiento / En proceso (fulfillment universal)
  | "READY"              // Listo
  | "IN_TRANSIT"         // En tránsito — solo cuando hay transporte
  | "DELIVERED"          // Entregado
  | "COMPLETED"          // Completado (cierre)
  /* Excepcionales (§9) */
  | "CANCELLED"          // Cancelado — conserva motivo, fecha y actor
  | "RETURNED";          // Devuelto — estado explícito, no un booleano

/** Estados terminales: una orden cerrada no vuelve a moverse. */
export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = [
  "COMPLETED",
  "CANCELLED",
  "RETURNED",
];

/** Estados que representan una orden viva en operación (no cerrada). */
export const OPEN_ORDER_STATUSES: readonly OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "IN_PREPARATION",
  "READY",
  "IN_TRANSIT",
  "DELIVERED",
];

/* ── Modalidad de entrega (§8) ─────────────────────────────────────────────── */

/**
 * Cómo se entrega la orden. **No es un estado**: es una propiedad que decide qué
 * transiciones tienen sentido.
 *
 * - `pickup`  — recogida en tienda: `READY → DELIVERED`, sin `IN_TRANSIT`.
 * - `delivery`— envío: `READY → IN_TRANSIT → DELIVERED`.
 * - `on_site` — consumo/ejecución en el local (servicio en mesa, atención en box).
 * - `service` — el fulfillment **es** la ejecución (instalación, reparación): la
 *   orden no se "despacha", se realiza.
 */
export type OrderFulfillmentMode = "pickup" | "delivery" | "on_site" | "service";

/** ¿Esta modalidad usa el estado `IN_TRANSIT`? (§8) */
export function modeUsesTransit(mode: OrderFulfillmentMode): boolean {
  return mode === "delivery";
}

/* ── Origen / canal (§5, §18) ──────────────────────────────────────────────── */

/**
 * Canal por el que entró la orden. **CANAL ≠ PEDIDO** (§18): el canal transporta;
 * Pedidos gestiona.
 *
 * ⚠️ Es un vocabulario de **origen normalizado**, no una implementación. Aquí no
 * hay webhooks, tokens ni lógica de Meta: cuando WhatsApp llegue (§20) entregará
 * `{ type: "WHATSAPP", reference: "<hilo>" }` exactamente como lo haría el POS.
 *
 * ⚠️ `type` es un `string` abierto a propósito: un canal futuro no debe romper el
 * núcleo. `reference` es una **referencia opaca** del canal (nº de conversación,
 * id de ticket POS, sesión web) que Pedidos guarda sin interpretar.
 */
export type OrderSourceType = "COUNTER" | "WEB" | "POS" | "WHATSAPP" | "API" | (string & {});

export interface OrderSource {
  type: OrderSourceType;
  /** Referencia opaca del canal. Pedidos la conserva, no la interpreta (§18). */
  reference?: string;
  /** Etiqueta para mostrar cuando el canal no tiene nombre propio en el catálogo. */
  label?: string;
}

/* ── Requester (§5, §14) ───────────────────────────────────────────────────── */

/**
 * Quién solicita la orden — **datos asociados a esta orden**, no un CRM (§14).
 *
 * ⚠️ Frontera deliberada: aquí sólo viven los datos de contacto necesarios para
 * ejecutar y entregar esta orden. No hay historial de compras, ni segmentación,
 * ni notas de relación: eso pertenecería a un dominio de Clientes que **no
 * existe** y que Pedidos no debe crear (§29).
 *
 * `customerRef` es la referencia opcional al cliente global **cuando exista**;
 * hoy siempre es `undefined`, y por eso la orden funciona igual.
 */
export interface OrderRequester {
  /** Nombre para dirigirse a la persona. */
  name: string;
  /** Teléfono de contacto de esta orden (no el del titular de la tienda). */
  phone?: string;
  email?: string;
  /** Referencia opaca al cliente global, si algún día existe. No es un id local. */
  customerRef?: string;
  /** Nota libre de la orden (punto de entrega, referencia, indicación de acceso). */
  note?: string;
}

/* ── Ítems (§5, §14) ───────────────────────────────────────────────────────── */

/**
 * Una variante elegida al momento de la orden (talla, color, acabado, sabor…).
 *
 * ⚠️ Par genérico `name`/`value`: el núcleo no sabe que "Talla M" es ropa ni que
 * "Sin cebolla" es comida. Ambos son opciones elegidas.
 */
export interface OrderItemOption {
  name: string;
  value: string;
}

/**
 * Una línea de la orden.
 *
 * ── Frontera de datos ───────────────────────────────────────────────────────
 *
 * `productRef` es la **referencia** al artículo del catálogo (propiedad de la
 * tienda / del módulo que lo gestione). `name` y `unitPrice` son **copias
 * históricas**: el precio "vigente al momento de la orden" (§5) es un hecho de la
 * orden y debe sobrevivir a cualquier cambio posterior del catálogo. Si se
 * leyera el precio en vivo, reimprimir una orden vieja mostraría otro importe.
 *
 * ⚠️ **No** hay `stock`, `available`, `warehouse` ni `reserved`: el inventario no
 * es de Pedidos (§19). Cuando una capacidad de inventario exista, reaccionará al
 * evento `pedidos.order.confirmed` (§19) — Pedidos sólo emite el hecho.
 */
export interface OrderItem {
  /** Identificador de la línea dentro de la orden. */
  id: string;
  /** Referencia al artículo del catálogo. Opaca para Pedidos. */
  productRef?: string;
  /** Nombre congelado al momento de la orden (histórico, no catálogo). */
  name: string;
  /** Descripción breve opcional de la línea. */
  description?: string;
  /** Cantidad pedida. `number` porque hay rubros con fracciones (4.5 m de cable). */
  quantity: number;
  /** Unidad declarada por la tienda: "unidad", "kg", "m", "hora", "sesión"… */
  unit?: string;
  /** Variantes/opciones elegidas (genéricas). */
  options?: OrderItemOption[];
  /** Precio unitario **vigente al momento de la orden** (histórico). */
  unitPrice: number;
  /** Descuento aplicado a la línea, si lo hay. `amount` en moneda de la orden. */
  discount?: OrderMoneyAmount;
  /** Subtotal de la línea, ya con su descuento aplicado. */
  subtotal: number;
  /** Nota de la línea ("sin hielo", "corte a medida", "entregar en portería"). */
  note?: string;
}

/* ── Dinero (§5) ───────────────────────────────────────────────────────────── */

/**
 * Importe en la moneda de la orden.
 *
 * ⚠️ La moneda **no se guarda aquí**: pertenece a la tienda
 * (`StoreIdentity.currency`) y se resuelve en presentación. Duplicarla por orden
 * permitiría que una orden contradijera a su tienda.
 */
export interface OrderMoneyAmount {
  /** Motivo del cargo o descuento ("envío", "cupón BIENVENIDA", "recargo nocturno"). */
  label: string;
  amount: number;
}

/** Resumen de importes de la orden. Todos los totales viven aquí (§5). */
export interface OrderTotals {
  /** Suma de subtotales de líneas, antes de descuentos y cargos. */
  subtotal: number;
  /** Descuentos aplicados a la orden completa (los de línea viven en el ítem). */
  discounts: OrderMoneyAmount[];
  /** Cargos aplicados (envío, servicio, recargo). */
  charges: OrderMoneyAmount[];
  /** Total a pagar. */
  total: number;
}

/* ── Pago (§14) ────────────────────────────────────────────────────────────── */

/**
 * Estado del pago **asociado a la orden**.
 *
 * ⚠️ Frontera: Pedidos registra *el hecho* de si esta orden está pagada y con qué
 * medio. No es un sistema financiero (§14): no hay conciliación, ni pasarela, ni
 * movimientos de caja. Un módulo de pagos futuro consumiría estos datos.
 */
export type OrderPaymentStatus = "unpaid" | "pending" | "paid" | "refunded";

export interface OrderPayment {
  status: OrderPaymentStatus;
  /** Medio declarado: "efectivo", "transferencia", "tarjeta", "contra entrega". */
  method?: string;
  /** Importe recibido/abonado, cuando aplica. */
  amount?: number;
  /** Referencia externa del cobro (id de transacción). Opaca para Pedidos. */
  reference?: string;
}

/* ── Entrega (§8, §14) ─────────────────────────────────────────────────────── */

/**
 * Información necesaria para **ejecutar/entregar** esta orden.
 *
 * ⚠️ Es información *de la orden*, no un dominio de logística (§1). Guarda dónde
 * y a quién se entrega; no calcula rutas ni gestiona transportistas.
 */
export interface OrderFulfillment {
  mode: OrderFulfillmentMode;
  /** Dirección de entrega. Sólo aplica a `delivery`. */
  address?: string;
  /** Referencia del punto de entrega (sede, box, mesa, punto de recogida). */
  locationRef?: string;
  /** Ventana comprometida para entregar (ISO). Informativa. */
  promisedAt?: string;
  /** Notas de entrega. */
  note?: string;
}

/* ── Programación (§15) ────────────────────────────────────────────────────── */

/**
 * Programación de la orden.
 *
 * ⚠️ **No es un sistema de calendario** (§15): la programación pertenece al
 * contexto de la orden. `scheduledFor` es *cuándo debe ejecutarse*; `createdAt`
 * es *cuándo se pidió*. Son hechos distintos y no se mezclan (§15).
 */
export interface OrderSchedule {
  /** Cuándo debe ejecutarse/entregarse (ISO). Presente ⇔ la orden es programada. */
  scheduledFor: string;
  /** Fin de la ventana, si la tienda declara franjas. */
  scheduledUntil?: string;
  /** Nota de programación ("entregar antes de las 9", "recurrente semanal"). */
  note?: string;
}

/* ── Historial / trazabilidad (§10) ───────────────────────────────────────── */

/**
 * Actor que originó un cambio. Responde "¿quién o qué lo hizo?" (§10).
 *
 * ⚠️ Vocabulario de **trazabilidad**, no un dominio de usuarios: Pedidos guarda
 * quién actuó, pero no administra usuarios ni permisos (§24). `userId` es una
 * referencia; el nombre es copia para poder mostrar el historial sin resolver el
 * usuario (que puede haber cambiado de nombre o desaparecido).
 */
export interface OrderActor {
  kind: "user" | "customer" | "channel" | "automation" | "system";
  /** Referencia al usuario/sistema cuando exista. */
  ref?: string;
  /** Nombre para mostrar en el timeline. */
  name?: string;
}

/**
 * Una entrada del historial de la orden.
 *
 * ⚠️ El historial es **parte del dominio**, no un log técnico (§10): permite que
 * la orden responda *qué ocurrió*, no sólo *cuál es su estado actual*.
 */
export interface OrderStatusHistoryEntry {
  id: string;
  /** Estado anterior. `null` en la entrada de creación. */
  from: OrderStatus | null;
  /** Estado nuevo. */
  to: OrderStatus;
  /** Momento del cambio (ISO). */
  at: string;
  /** Quién o qué lo originó (§9: la cancelación debe conservar su actor). */
  actor: OrderActor;
  /** Motivo, obligatorio en transiciones que lo exigen (cancelación, devolución). */
  reason?: string;
  /** Metadata relevante del cambio (importes, referencias externas, ids de canal). */
  metadata?: Record<string, string | number | boolean>;
}

/* ── La orden (§5) ─────────────────────────────────────────────────────────── */

/**
 * Una orden. Es la **raíz del agregado** del dominio Pedidos.
 *
 * Contiene exclusivamente información propia de la orden más las referencias
 * externas necesarias. No habrá aquí un `Product`, un `Customer`, un `Channel`
 * embebido ni un `Store` copiado: sólo `businessId` como referencia (§2, §24).
 */
export interface Order {
  /** Identificador interno e inmutable. */
  id: string;
  /**
   * Número visible para operación (#1042). Distinto del id: es lo que se dicta
   * por teléfono y se imprime en el ticket.
   */
  number: string;
  /**
   * Tienda (sede) a la que pertenece la orden (§2).
   *
   * ⚠️ Pedidos **pertenece a** una tienda: no crea una segunda identidad para el
   * negocio ni vuelve a preguntar su configuración (§2). El nombre, el tipo, la
   * moneda y la marca se leen de la tienda activa en presentación.
   */
  businessId: string;
  /** Momento en que la orden entró al sistema (ISO). */
  createdAt: string;
  /** Última modificación (ISO). */
  updatedAt: string;
  /** Origen/canal normalizado (§18). */
  source: OrderSource;
  /** Estado actual. Toda orden nueva nace en `PENDING` (§5). */
  status: OrderStatus;
  /** Quién la solicita (datos de esta orden, no un CRM) (§14). */
  requester: OrderRequester;
  /** Cómo se entrega. Decide qué transiciones aplican (§8). */
  fulfillment: OrderFulfillment;
  /** Ítems (§5). */
  items: OrderItem[];
  /** Resumen de importes (§5). */
  totals: OrderTotals;
  /** Observaciones libres de la orden. */
  notes?: string;
  /** Pago asociado (§14). */
  payment?: OrderPayment;
  /** Programación (§15). Ausente ⇔ orden inmediata. */
  schedule?: OrderSchedule;
  /** Historial de estados. Siempre tiene al menos la entrada de creación (§10). */
  history: OrderStatusHistoryEntry[];
}

/* ── Contratos derivados (§7, §15, §16) ───────────────────────────────────── */

/** ¿La orden está programada para el futuro? (§15) */
export function isScheduledOrder(order: Order): boolean {
  return order.schedule !== undefined;
}

/** ¿La orden requiere acciones de alistamiento/ejecución? (§16) */
export function isInPreparation(order: Order): boolean {
  return order.status === "IN_PREPARATION";
}

/** ¿La orden admite todavía cambios de estado? (§9) */
export function isOrderOpen(order: Order): boolean {
  return !TERMINAL_ORDER_STATUSES.includes(order.status);
}

/* ── Contratos de integración futura (§19, §20, §21, §23) ─────────────────── */

/**
 * Hecho de dominio publicado por Pedidos.
 *
 * ⚠️ Pedidos **emite hechos**; no ejecuta efectos de otros módulos (§6, §23).
 * Cuando la orden se confirma, Pedidos publica `confirmed` y sigue: que un
 * inventario futuro reserve stock es decisión **suya**, no de Pedidos.
 *
 * ⚠️ `OrderEvent` **no contiene lógica de otros módulos** (§23): no hay
 * `reserveStock`, ni `sendWhatsApp`, ni `notifyCustomer`. Sólo nombres de hechos
 * y los datos mínimos del hecho.
 */
export type OrderEventName =
  | "order.created"
  | "order.confirmed"
  | "order.preparation_started"
  | "order.ready"
  | "order.shipped"
  | "order.delivered"
  | "order.completed"
  | "order.status_changed"
  | "order.cancelled"
  | "order.returned";

export interface OrderEventPayload {
  name: OrderEventName;
  /** Id de la orden a la que se refiere el hecho. */
  orderId: string;
  /** Número visible, para que un consumidor no tenga que resolver la orden. */
  orderNumber: string;
  /** Tienda propietaria. */
  businessId: string;
  /** Estado resultante del hecho. */
  status: OrderStatus;
  /** Estado previo, cuando el hecho es una transición. */
  previousStatus?: OrderStatus;
  /** Momento del hecho (ISO). */
  at: string;
  /** Motivo, cuando el hecho lo exige (cancelación, devolución). */
  reason?: string;
  /** Metadata del hecho. Deliberadamente sin acoplamientos. */
  metadata?: Record<string, string | number | boolean>;
}
