/**
 * Pedidos — Datos de demostración.
 * =================================
 *
 * ⚠️ **Por qué hay datos sembrados y por qué son deliberadamente de rubros
 * distintos.**
 *
 * El núcleo del módulo dice ser universal (§22). Una semilla de restaurante no lo
 * demostraría: haría parecer que el modelo *es* de restaurante y que los demás
 * rubros "también caben". Estas órdenes incluyen a propósito una ferretería, una
 * tienda de ropa, una panadería, una empresa de servicios, una farmacia, una
 * distribuidora y un restaurante — con **el mismo tipo** `Order` y sin un solo
 * campo condicional por rubro.
 *
 * Si el modelo necesitara un campo nuevo para que entrara la ferretería, la
 * semilla no compilaría. Ese es el valor de tenerlas juntas.
 *
 * ⚠️ Sólo se siembran si el almacén de esa sede está **vacío**: una tienda con
 * órdenes reales nunca las ve.
 *
 * ⚠️ Lo que **no** aparece aquí, a propósito: ningún campo `product`, `stock`,
 * `customer`, `channelConfig` ni `assistant`. Sólo `productRef`, `requester` y
 * `source` — las referencias que el contrato declara (§24).
 *
 * ── Por qué la cobertura es la de la suite, no la de una pantalla ───────────
 *
 * ⚠️ La suite tiene cinco pantallas de trabajo y cada una mira un subconjunto de
 * estados distinto (`INBOX_STATUSES`, `PREPARATION_STATUSES`, `DISPATCH_STATUSES`,
 * `HISTORY_STATUSES`). Una semilla con seis órdenes dejaba pantallas enteras
 * vacías, y un estado vacío permanente es indistinguible de una pantalla rota.
 * Por eso la semilla cubre **todos** los estados operativos, las cuatro
 * modalidades de entrega, varios canales, y órdenes programadas en tres
 * situaciones temporales (vencida, por vencer, futura).
 */

import type {
  Order,
  OrderActor,
  OrderFulfillment,
  OrderItem,
  OrderPayment,
  OrderRequester,
  OrderSchedule,
  OrderSource,
  OrderStatus,
  OrderTotals,
} from "@/contracts/order.contract";

/** Marca de tiempo relativa a ahora, para que la semilla no envejezca. */
function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

/** En N horas, para las órdenes programadas. */
function inHours(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

/* ── Constructores ─────────────────────────────────────────────────────────── */

/**
 * Un paso del ciclo de vida: a qué estado se llegó, cuándo y quién.
 *
 * ⚠️ El paso **no** declara su estado de origen. Encadenarlos es lo que garantiza
 * que `from` de cada entrada sea el `to` de la anterior — un historial escrito a
 * mano puede contradecirse (una entrada que sale de `READY` cuando la orden
 * nunca estuvo `READY`) y nada lo detectaría hasta que un operador leyera el
 * detalle y viera un recorrido imposible.
 */
interface ChainStep {
  to: OrderStatus;
  at: string;
  actor: OrderActor;
  reason?: string;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Una orden de ejemplo, con lo que **no** se puede derivar.
 *
 * ⚠️ No hay `status` ni `updatedAt`: ambos se derivan del último paso de la
 * cadena. Escribirlos a mano permitía el error silencioso más caro de una
 * semilla —una orden que dice `READY` con un historial que termina en
 * `IN_PREPARATION`—, y con la cabecera de métricas contando por estado, esa
 * contradicción se traduciría en cifras que no cuadran con las listas.
 */
interface OrderSeed {
  /** Correlativo visible: `#1060`. */
  number: number;
  createdAt: string;
  source: OrderSource;
  requester: OrderRequester;
  fulfillment: OrderFulfillment;
  items: OrderItem[];
  totals: OrderTotals;
  /** El ciclo de vida, del más antiguo al más reciente. Nunca vacío. */
  steps: ChainStep[];
  notes?: string;
  payment?: OrderPayment;
  schedule?: OrderSchedule;
}

/**
 * Materializa una semilla en una `Order` completa.
 *
 * ⚠️ Aquí se cierran las dos invariantes del dominio: el `status` **es** el
 * destino del último paso, y el `updatedAt` **es** el momento de ese paso. Con
 * eso, "cuánto lleva la orden en su estado actual" —que la capa operativa mide
 * sobre la última entrada del historial— coincide siempre con la antigüedad de
 * la orden tal como la ve el operador.
 */
function seedOrder(businessId: string, seed: OrderSeed): Order {
  const steps = seed.steps;
  const last = steps[steps.length - 1];

  return {
    id: `ord_${businessId}_${seed.number}`,
    number: `#${seed.number}`,
    businessId,
    createdAt: seed.createdAt,
    updatedAt: last.at,
    source: seed.source,
    status: last.to,
    requester: seed.requester,
    fulfillment: seed.fulfillment,
    items: seed.items,
    totals: seed.totals,
    notes: seed.notes,
    payment: seed.payment,
    schedule: seed.schedule,
    history: steps.map((step, index) => ({
      id: `hist_${seed.number}_${index + 1}`,
      from: index === 0 ? null : steps[index - 1].to,
      to: step.to,
      at: step.at,
      actor: step.actor,
      reason: step.reason,
      metadata: step.metadata,
    })),
  };
}

/** Actor humano recurrente de la demostración. */
const OPERATOR: OrderActor = { kind: "user", name: "Jessy Quinto" };

/**
 * Construye las órdenes de ejemplo de una sede.
 *
 * ⚠️ Recibe el `businessId` en lugar de tener uno fijo: una orden debe pertenecer
 * a la sede que la está mirando (§2). Con un id fijo, la semilla aparecería en
 * cualquier tienda y el filtro por sede no se ejercitaría.
 *
 * ⚠️ `numberBase` es el número de la orden **más reciente**; el resto descienden
 * desde ahí. Antes era el número del que se sumaba o restaba, y con veinte
 * órdenes eso obligaba a leer cada semilla para saber cuál era la más nueva.
 */
export function buildDemoOrders(businessId: string, numberBase = 1060): Order[] {
  const n = (offset: number) => numberBase - offset;

  const seeds: OrderSeed[] = [
    /* ══════════════════════════════════════════════════════════════════════
     * Bandeja de entrada (Triaje) — PENDING y CONFIRMED
     * ════════════════════════════════════════════════════════════════════ */

    /* ── 1. Ferretería · PENDING · envío · WhatsApp ─────────────────────────
     * Unidades y medidas fraccionarias, sin variantes: el modelo no supone
     * "productos con talla". */
    {
      number: n(0),
      createdAt: ago(2),
      source: { type: "WHATSAPP", reference: "wa_conv_8812" },
      requester: { name: "Obra Los Nogales", phone: "+57 310 555 0114", note: "Entregar en portería" },
      fulfillment: { mode: "delivery", address: "Cra 45 #12-30, Bodega 4", promisedAt: inHours(3) },
      items: [
        {
          id: "itm_h1",
          productRef: "sku_tornillo_38",
          name: 'Tornillo 3/8 x 4"',
          quantity: 10,
          unit: "unidad",
          unitPrice: 1200,
          subtotal: 12_000,
        },
        {
          id: "itm_h2",
          productRef: "sku_cable_12",
          name: "Cable encauchetado 12 AWG",
          description: "Rollo por metro",
          quantity: 4.5,
          unit: "metro",
          unitPrice: 8_900,
          subtotal: 40_050,
          note: "Cortar en tramos de 1,5 m",
        },
      ],
      totals: { subtotal: 52_050, discounts: [], charges: [{ label: "Envío", amount: 8_000 }], total: 60_050 },
      notes: "Cliente pide factura electrónica.",
      payment: { status: "unpaid", method: "Transferencia" },
      steps: [
        {
          to: "PENDING",
          at: ago(2),
          actor: { kind: "channel", name: "WhatsApp", ref: "wa_conv_8812" },
          metadata: { channel: "WHATSAPP" },
        },
      ],
    },

    /* ── 2. Panadería · PENDING · recogida · web ────────────────────────────
     * Sin `promisedAt`: la recogida no tiene ventana comprometida. */
    {
      number: n(1),
      createdAt: ago(9),
      source: { type: "WEB", reference: "cart_9f21" },
      requester: { name: "Marcela Ospina", phone: "+57 300 771 2244" },
      fulfillment: { mode: "pickup", locationRef: "Sede Centro" },
      items: [
        {
          id: "itm_b1",
          productRef: "sku_torta_chocolate",
          name: "Torta de chocolate",
          description: "Para 12 porciones",
          quantity: 1,
          unit: "unidad",
          unitPrice: 78_000,
          subtotal: 78_000,
          note: "Escribir «Feliz cumple» con chocolate blanco",
        },
      ],
      totals: { subtotal: 78_000, discounts: [], charges: [], total: 78_000 },
      payment: { status: "pending", method: "Pago contra entrega" },
      steps: [
        {
          to: "PENDING",
          at: ago(9),
          actor: { kind: "channel", name: "Tienda web", ref: "cart_9f21" },
        },
      ],
    },

    /* ── 3. Restaurante · PENDING · en sitio · mostrador ────────────────────
     * `on_site`: el fulfillment ES la ejecución; no hay despacho. */
    {
      number: n(2),
      createdAt: ago(24),
      source: { type: "COUNTER", label: "Mostrador" },
      requester: { name: "Mesa 7", note: "Sin cebolla" },
      fulfillment: { mode: "on_site", locationRef: "Salón principal" },
      items: [
        {
          id: "itm_r1",
          productRef: "sku_combo_almuerzo",
          name: "Almuerzo corriente",
          quantity: 3,
          unit: "porción",
          options: [{ name: "Proteína", value: "Pollo asado" }],
          unitPrice: 18_000,
          subtotal: 54_000,
        },
        {
          id: "itm_r2",
          productRef: "sku_jugo_natural",
          name: "Jugo natural en agua",
          quantity: 3,
          unit: "vaso",
          unitPrice: 6_500,
          subtotal: 19_500,
        },
      ],
      totals: { subtotal: 73_500, discounts: [], charges: [], total: 73_500 },
      payment: { status: "unpaid", method: "Efectivo" },
      steps: [
        {
          to: "PENDING",
          at: ago(24),
          actor: { kind: "user", name: "Mesero de piso" },
        },
      ],
    },

    /* ── 4. Distribuidora · PENDING · envío · API · programada ──────────────
     * Programada y aún sin validar: la fecha comprometida no sustituye al
     * triaje (§15 — son dos hechos distintos). */
    {
      number: n(3),
      createdAt: ago(38),
      source: { type: "API", reference: "erp_doc_55210" },
      requester: { name: "Distribuidora Andina S.A.S.", phone: "+57 601 555 7788" },
      fulfillment: {
        mode: "delivery",
        address: "Zona Industrial Km 3, Bodega 12",
        promisedAt: inHours(3),
        note: "Requiere cita con jefe de patio.",
      },
      items: [
        {
          id: "itm_d1",
          productRef: "sku_caja_mixta",
          name: "Caja mixta de abarrotes",
          quantity: 24,
          unit: "caja",
          unitPrice: 42_000,
          subtotal: 1_008_000,
        },
      ],
      totals: {
        subtotal: 1_008_000,
        discounts: [{ label: "Volumen", amount: 50_400 }],
        charges: [{ label: "Flete", amount: 45_000 }],
        total: 1_002_600,
      },
      payment: { status: "pending", method: "Crédito 30 días" },
      schedule: { scheduledFor: inHours(3), scheduledUntil: inHours(5), note: "Ventana pedida por el ERP." },
      steps: [
        {
          to: "PENDING",
          at: ago(38),
          actor: { kind: "channel", name: "API", ref: "erp_doc_55210" },
          metadata: { channel: "API" },
        },
      ],
    },

    /* ── 5. Farmacia · CONFIRMED · envío · WhatsApp ─────────────────────────
     * Lleva 36 min confirmada sin empezar: es la orden que alimenta la métrica
     * de "espera larga" del triaje. */
    {
      number: n(4),
      createdAt: ago(41),
      source: { type: "WHATSAPP", reference: "wa_conv_8790" },
      requester: { name: "Carlos Mendoza", phone: "+57 315 909 7744", note: "Timbre 302" },
      fulfillment: {
        mode: "delivery",
        address: "Av. Siempre Viva 742, Apto 302",
        promisedAt: inHours(2),
        note: "Requiere cadena de frío.",
      },
      items: [
        {
          id: "itm_p1",
          productRef: "sku_ibuprofeno_400",
          name: "Ibuprofeno 400 mg x 20 tabletas",
          quantity: 2,
          unit: "caja",
          unitPrice: 14_500,
          subtotal: 29_000,
        },
        {
          id: "itm_p2",
          productRef: "sku_insulina",
          name: "Insulina glargina 100 UI/mL",
          description: "Producto refrigerado",
          quantity: 1,
          unit: "vial",
          unitPrice: 96_000,
          subtotal: 96_000,
        },
      ],
      totals: {
        subtotal: 125_000,
        discounts: [],
        charges: [{ label: "Domicilio", amount: 9_500 }],
        total: 134_500,
      },
      payment: { status: "paid", method: "Transferencia", amount: 134_500, reference: "txn_9931" },
      steps: [
        {
          to: "PENDING",
          at: ago(41),
          actor: { kind: "channel", name: "WhatsApp", ref: "wa_conv_8790" },
        },
        {
          to: "CONFIRMED",
          at: ago(36),
          actor: OPERATOR,
          metadata: { payment: "paid" },
        },
      ],
    },

    /* ── 6. Restaurante · CONFIRMED · en sitio · POS · vencida ──────────────
     * Programada cuya hora comprometida **ya pasó**: es la orden que alimenta
     * la métrica de "vencidas" (§15). Sigue `CONFIRMED`, así que el retraso es
     * de la programación, no del trabajo. */
    {
      number: n(5),
      createdAt: ago(20),
      source: { type: "POS", reference: "ticket_7731" },
      requester: { name: "Reserva Salón Azul", phone: "+57 604 222 1100" },
      fulfillment: { mode: "on_site", locationRef: "Salón Azul" },
      items: [
        {
          id: "itm_e1",
          productRef: "sku_almuerzo_ejecutivo",
          name: "Almuerzo ejecutivo",
          quantity: 14,
          unit: "porción",
          options: [{ name: "Proteína", value: "Mixta" }],
          unitPrice: 24_000,
          subtotal: 336_000,
        },
      ],
      totals: { subtotal: 336_000, discounts: [], charges: [{ label: "Servicio", amount: 33_600 }], total: 369_600 },
      payment: { status: "pending", method: "Factura a la empresa" },
      schedule: { scheduledFor: inHours(-1), scheduledUntil: inHours(-0.5), note: "Reserva con hora fija." },
      steps: [
        {
          to: "PENDING",
          at: ago(20),
          actor: { kind: "channel", name: "POS", ref: "ticket_7731" },
        },
        {
          to: "CONFIRMED",
          at: ago(12),
          actor: { kind: "automation", name: "Confirmación automática" },
          metadata: { rule: "auto_confirm_max_amount" },
        },
      ],
    },

    /* ══════════════════════════════════════════════════════════════════════
     * Mesa de alistamiento — IN_PREPARATION
     * ════════════════════════════════════════════════════════════════════ */

    /* ── 7. Ropa · IN_PREPARATION · recogida · web ──────────────────────────
     * Variantes (talla/color) y descuento por línea. */
    {
      number: n(6),
      createdAt: ago(18),
      source: { type: "WEB", reference: "cart_4410" },
      requester: { name: "Laura Restrepo", phone: "+57 300 222 8890" },
      fulfillment: { mode: "pickup", locationRef: "Sede Centro" },
      items: [
        {
          id: "itm_a1",
          productRef: "sku_camisa_oxford",
          name: "Camisa Oxford manga larga",
          quantity: 1,
          unit: "unidad",
          options: [
            { name: "Talla", value: "M" },
            { name: "Color", value: "Blanco" },
          ],
          unitPrice: 89_900,
          subtotal: 89_900,
        },
        {
          id: "itm_a2",
          productRef: "sku_pantalon_chino",
          name: "Pantalón chino",
          quantity: 1,
          unit: "unidad",
          options: [
            { name: "Talla", value: "32" },
            { name: "Color", value: "Azul noche" },
          ],
          unitPrice: 119_900,
          discount: { label: "Promo 2ª prenda", amount: 12_000 },
          subtotal: 107_900,
        },
      ],
      totals: { subtotal: 197_800, discounts: [], charges: [], total: 197_800 },
      payment: { status: "paid", method: "Tarjeta", amount: 197_800, reference: "txn_5512" },
      steps: [
        { to: "PENDING", at: ago(18), actor: { kind: "channel", name: "Tienda web", ref: "cart_4410" } },
        { to: "CONFIRMED", at: ago(17), actor: OPERATOR },
        { to: "IN_PREPARATION", at: ago(6), actor: OPERATOR },
      ],
    },

    /* ── 8. Panadería · IN_PREPARATION · envío · WhatsApp · demorada ────────
     * 33 min alistando con un umbral de 25: es la orden que dispara la alerta
     * de estancamiento de la Mesa de alistamiento. */
    {
      number: n(7),
      createdAt: ago(48),
      source: { type: "WHATSAPP", reference: "wa_conv_9021" },
      requester: { name: "Panadería La Espiga", phone: "+57 312 404 5511" },
      fulfillment: {
        mode: "delivery",
        address: "Calle 63 #24-18, Local 2",
        promisedAt: inHours(1),
      },
      items: [
        {
          id: "itm_b2",
          productRef: "sku_pan_artesanal",
          name: "Pan artesanal integral",
          quantity: 30,
          unit: "unidad",
          unitPrice: 3_200,
          subtotal: 96_000,
        },
        {
          id: "itm_b3",
          productRef: "sku_croissant",
          name: "Croissant de mantequilla",
          quantity: 24,
          unit: "unidad",
          unitPrice: 4_100,
          subtotal: 98_400,
        },
      ],
      totals: { subtotal: 194_400, discounts: [], charges: [{ label: "Domicilio", amount: 7_000 }], total: 201_400 },
      payment: { status: "paid", method: "Transferencia", amount: 201_400, reference: "txn_7781" },
      steps: [
        { to: "PENDING", at: ago(48), actor: { kind: "channel", name: "WhatsApp", ref: "wa_conv_9021" } },
        { to: "CONFIRMED", at: ago(46), actor: OPERATOR },
        {
          to: "IN_PREPARATION",
          at: ago(33),
          actor: { kind: "user", name: "Turno de hornada" },
          reason: "Pedido grande: se programó en dos tandas.",
        },
      ],
    },

    /* ── 9. Restaurante · IN_PREPARATION · en sitio · mostrador · demorada ──
     * La más atrasada del alistamiento: 52 min. */
    {
      number: n(8),
      createdAt: ago(75),
      source: { type: "COUNTER", label: "Mostrador" },
      requester: { name: "Mesa 12" },
      fulfillment: { mode: "on_site", locationRef: "Terraza" },
      items: [
        {
          id: "itm_r3",
          productRef: "sku_parrilla_personal",
          name: "Parrilla personal",
          quantity: 2,
          unit: "porción",
          options: [{ name: "Término", value: "Tres cuartos" }],
          unitPrice: 46_000,
          subtotal: 92_000,
        },
      ],
      totals: { subtotal: 92_000, discounts: [], charges: [], total: 92_000 },
      payment: { status: "unpaid", method: "Efectivo" },
      steps: [
        { to: "PENDING", at: ago(75), actor: { kind: "user", name: "Mesero de piso" } },
        { to: "CONFIRMED", at: ago(73), actor: { kind: "user", name: "Jefe de salón" } },
        {
          to: "IN_PREPARATION",
          at: ago(52),
          actor: { kind: "user", name: "Cocina" },
          reason: "La parrilla se encendió tarde por mantenimiento.",
        },
      ],
    },

    /* ══════════════════════════════════════════════════════════════════════
     * Despacho y entrega — READY, IN_TRANSIT y DELIVERED
     * ════════════════════════════════════════════════════════════════════ */

    /* ── 10. Farmacia · READY · recogida · mostrador ────────────────────────
     * `pickup` va de READY a DELIVERED **sin** tránsito (§8): por eso aparece
     * en el bloque de "se entregan en el local" y no en el de transporte. */
    {
      number: n(9),
      createdAt: ago(95),
      source: { type: "COUNTER", label: "Mostrador" },
      requester: { name: "Ana Lucía Prada", phone: "+57 318 220 4477" },
      fulfillment: { mode: "pickup", locationRef: "Mostrador 3" },
      items: [
        {
          id: "itm_p3",
          productRef: "sku_antigripal",
          name: "Antigripal en cápsulas x 12",
          quantity: 1,
          unit: "caja",
          unitPrice: 22_400,
          subtotal: 22_400,
        },
      ],
      totals: { subtotal: 22_400, discounts: [], charges: [], total: 22_400 },
      payment: { status: "paid", method: "Efectivo", amount: 25_000 },
      steps: [
        { to: "PENDING", at: ago(95), actor: { kind: "user", name: "Mostrador" } },
        { to: "CONFIRMED", at: ago(92), actor: OPERATOR },
        { to: "IN_PREPARATION", at: ago(70), actor: { kind: "user", name: "Dispensario" } },
        { to: "READY", at: ago(9), actor: { kind: "user", name: "Dispensario" } },
      ],
    },

    /* ── 11. Ferretería · READY · envío · programada por vencer ─────────────
     * READY y con ventana a 1,5 h: "por vencer" en Programados y a la vez
     * "lista para entregar" en Despacho. */
    {
      number: n(10),
      createdAt: ago(120),
      source: { type: "WHATSAPP", reference: "wa_conv_8433" },
      requester: { name: "Conjunto Residencial Aurora", phone: "+57 320 118 9922" },
      fulfillment: {
        mode: "delivery",
        address: "Calle 100 #15-40, Portería",
        promisedAt: inHours(1.5),
      },
      items: [
        {
          id: "itm_h3",
          productRef: "sku_cerradura",
          name: "Cerradura de pomo",
          quantity: 4,
          unit: "unidad",
          unitPrice: 52_000,
          subtotal: 208_000,
        },
        {
          id: "itm_h4",
          productRef: "sku_bisagra",
          name: "Bisagra reforzada 4\"",
          quantity: 12,
          unit: "unidad",
          unitPrice: 6_800,
          subtotal: 81_600,
        },
      ],
      totals: { subtotal: 289_600, discounts: [], charges: [{ label: "Envío", amount: 12_000 }], total: 301_600 },
      payment: { status: "pending", method: "Transferencia" },
      schedule: { scheduledFor: inHours(1.5), scheduledUntil: inHours(3) },
      steps: [
        { to: "PENDING", at: ago(120), actor: { kind: "channel", name: "WhatsApp", ref: "wa_conv_8433" } },
        { to: "CONFIRMED", at: ago(116), actor: OPERATOR },
        { to: "IN_PREPARATION", at: ago(80), actor: { kind: "user", name: "Bodega 4" } },
        { to: "READY", at: ago(14), actor: { kind: "user", name: "Bodega 4" } },
      ],
    },

    /* ── 12. Servicios · READY · servicio en campo ──────────────────────────
     * `service`: el fulfillment ES la ejecución; sin despacho y sin tránsito.
     * La orden más valiosa de la semilla. */
    {
      number: n(11),
      createdAt: ago(300),
      source: { type: "COUNTER", label: "Mostrador" },
      requester: { name: "Clínica San Rafael", phone: "+57 604 444 1120" },
      fulfillment: {
        mode: "service",
        locationRef: "Sede Norte — equipo del cliente",
        promisedAt: inHours(6),
        note: "Requiere acceso a cuarto técnico.",
      },
      items: [
        {
          id: "itm_s1",
          productRef: "svc_instalacion_red",
          name: "Instalación de red estructurada",
          description: "Hasta 12 puntos de datos",
          quantity: 1,
          unit: "servicio",
          unitPrice: 850_000,
          subtotal: 850_000,
        },
        {
          id: "itm_s2",
          productRef: "svc_certificacion",
          name: "Certificación de puntos",
          quantity: 12,
          unit: "punto",
          unitPrice: 22_000,
          subtotal: 264_000,
        },
      ],
      totals: {
        subtotal: 1_114_000,
        discounts: [{ label: "Convenio anual", amount: 111_400 }],
        charges: [],
        total: 1_002_600,
      },
      notes: "Trabajo ejecutado fuera de horario para no interrumpir servicio.",
      payment: { status: "pending", method: "Crédito 30 días" },
      steps: [
        { to: "PENDING", at: ago(300), actor: OPERATOR },
        { to: "CONFIRMED", at: ago(295), actor: OPERATOR },
        { to: "IN_PREPARATION", at: ago(240), actor: { kind: "user", name: "Andrés Técnico" } },
        {
          to: "READY",
          at: ago(40),
          actor: { kind: "user", name: "Andrés Técnico" },
          reason: "Trabajo de campo finalizado y probado.",
        },
      ],
    },

    /* ── 13. Ecommerce · READY · envío ──────────────────────────────────────
     * Segunda orden lista para salir: el Despacho necesita más de una para que
     * el bloque de transporte no parezca un caso aislado. */
    {
      number: n(12),
      createdAt: ago(140),
      source: { type: "WEB", reference: "cart_6620" },
      requester: { name: "Felipe Cárdenas", phone: "+57 311 606 3321" },
      fulfillment: { mode: "delivery", address: "Carrera 7 #45-12, Torre B, Apto 1101", promisedAt: inHours(2) },
      items: [
        {
          id: "itm_w1",
          productRef: "sku_audifonos",
          name: "Audífonos inalámbricos",
          quantity: 1,
          unit: "unidad",
          unitPrice: 259_900,
          subtotal: 259_900,
        },
      ],
      totals: { subtotal: 259_900, discounts: [], charges: [{ label: "Envío", amount: 11_000 }], total: 270_900 },
      payment: { status: "paid", method: "Tarjeta", amount: 270_900, reference: "txn_3390" },
      steps: [
        { to: "PENDING", at: ago(140), actor: { kind: "channel", name: "Tienda web", ref: "cart_6620" } },
        { to: "CONFIRMED", at: ago(138), actor: { kind: "automation", name: "Confirmación automática" } },
        { to: "IN_PREPARATION", at: ago(110), actor: { kind: "user", name: "Bodega 1" } },
        { to: "READY", at: ago(18), actor: { kind: "user", name: "Bodega 1" } },
      ],
    },

    /* ── 14. Ecommerce · IN_TRANSIT · envío ─────────────────────────────────
     * 22 min en tránsito: **por debajo** del umbral de demora, para que la
     * alerta de estancamiento no marque todo lo que está en la calle. */
    {
      number: n(13),
      createdAt: ago(200),
      source: { type: "WEB", reference: "cart_5501" },
      requester: { name: "Valentina Ríos", phone: "+57 319 887 4410" },
      fulfillment: { mode: "delivery", address: "Av. Boyacá 12-45, Casa 8", promisedAt: inHours(1) },
      items: [
        {
          id: "itm_w2",
          productRef: "sku_zapatillas",
          name: "Zapatillas de running",
          quantity: 1,
          unit: "unidad",
          options: [
            { name: "Talla", value: "39" },
            { name: "Color", value: "Gris" },
          ],
          unitPrice: 329_000,
          subtotal: 329_000,
        },
      ],
      totals: { subtotal: 329_000, discounts: [], charges: [], total: 329_000 },
      payment: { status: "paid", method: "Tarjeta", amount: 329_000, reference: "txn_4412" },
      steps: [
        { to: "PENDING", at: ago(200), actor: { kind: "channel", name: "Tienda web", ref: "cart_5501" } },
        { to: "CONFIRMED", at: ago(198), actor: OPERATOR },
        { to: "IN_PREPARATION", at: ago(150), actor: { kind: "user", name: "Bodega 1" } },
        { to: "READY", at: ago(60), actor: { kind: "user", name: "Bodega 1" } },
        { to: "IN_TRANSIT", at: ago(22), actor: { kind: "user", name: "Domiciliario Pipe" } },
      ],
    },

    /* ── 15. Farmacia · IN_TRANSIT · envío · cadena de frío ─────────────────
     * La que exige más cuidado del despacho. */
    {
      number: n(14),
      createdAt: ago(150),
      source: { type: "WHATSAPP", reference: "wa_conv_8790" },
      requester: { name: "Jorge Villamil", phone: "+57 310 442 8890", note: "Recibe en portería" },
      fulfillment: {
        mode: "delivery",
        address: "Calle 127 #19-30, Clínica del Norte",
        promisedAt: inHours(0.5),
        note: "Requiere cadena de frío.",
      },
      items: [
        {
          id: "itm_p4",
          productRef: "sku_vacuna",
          name: "Vacuna antitetánica",
          description: "Producto refrigerado",
          quantity: 1,
          unit: "dosis",
          unitPrice: 142_000,
          subtotal: 142_000,
        },
      ],
      totals: { subtotal: 142_000, discounts: [], charges: [{ label: "Domicilio", amount: 12_000 }], total: 154_000 },
      payment: { status: "paid", method: "Transferencia", amount: 154_000, reference: "txn_8814" },
      steps: [
        { to: "PENDING", at: ago(150), actor: { kind: "channel", name: "WhatsApp", ref: "wa_conv_8790" } },
        { to: "CONFIRMED", at: ago(145), actor: OPERATOR },
        { to: "IN_PREPARATION", at: ago(60), actor: { kind: "user", name: "Marta Dispensario" } },
        { to: "READY", at: ago(20), actor: { kind: "user", name: "Marta Dispensario" } },
        { to: "IN_TRANSIT", at: ago(8), actor: { kind: "user", name: "Domiciliario Pipe" } },
      ],
    },

    /* ── 16. Ropa · DELIVERED · recogida ────────────────────────────────────
     * Entregada y **sin cerrar**: es la métrica "entregadas hoy" del Despacho.
     * El cierre (`COMPLETED`) es un acto distinto y no se hace solo. */
    {
      number: n(15),
      createdAt: ago(210),
      source: { type: "POS", reference: "ticket_8120" },
      requester: { name: "Sara Betancur", phone: "+57 302 555 1190" },
      fulfillment: { mode: "pickup", locationRef: "Sede Centro" },
      items: [
        {
          id: "itm_a3",
          productRef: "sku_blazer",
          name: "Blazer entallado",
          quantity: 1,
          unit: "unidad",
          options: [{ name: "Talla", value: "S" }],
          unitPrice: 249_000,
          subtotal: 249_000,
        },
      ],
      totals: { subtotal: 249_000, discounts: [], charges: [], total: 249_000 },
      payment: { status: "paid", method: "Tarjeta", amount: 249_000, reference: "txn_2201" },
      steps: [
        { to: "PENDING", at: ago(210), actor: { kind: "channel", name: "POS", ref: "ticket_8120" } },
        { to: "CONFIRMED", at: ago(208), actor: OPERATOR },
        { to: "IN_PREPARATION", at: ago(180), actor: { kind: "user", name: "Vitrina 1" } },
        { to: "READY", at: ago(45), actor: { kind: "user", name: "Vitrina 1" } },
        { to: "DELIVERED", at: ago(35), actor: { kind: "user", name: "Vitrina 1" } },
      ],
    },

    /* ── 17. Farmacia · DELIVERED · envío ───────────────────────────────────
     * Llegó a destino y espera cierre. */
    {
      number: n(16),
      createdAt: ago(260),
      source: { type: "WHATSAPP", reference: "wa_conv_8012" },
      requester: { name: "Lucía Fernanda Gómez", phone: "+57 317 220 5544" },
      fulfillment: { mode: "delivery", address: "Transversal 28 #63-11" },
      items: [
        {
          id: "itm_p5",
          productRef: "sku_antibiotico",
          name: "Antibiótico de amplio espectro",
          quantity: 1,
          unit: "caja",
          unitPrice: 68_500,
          subtotal: 68_500,
        },
      ],
      totals: { subtotal: 68_500, discounts: [], charges: [{ label: "Domicilio", amount: 8_000 }], total: 76_500 },
      payment: { status: "paid", method: "Transferencia", amount: 76_500, reference: "txn_6612" },
      steps: [
        { to: "PENDING", at: ago(260), actor: { kind: "channel", name: "WhatsApp", ref: "wa_conv_8012" } },
        { to: "CONFIRMED", at: ago(258), actor: OPERATOR },
        { to: "IN_PREPARATION", at: ago(200), actor: { kind: "user", name: "Dispensario" } },
        { to: "READY", at: ago(70), actor: { kind: "user", name: "Dispensario" } },
        { to: "IN_TRANSIT", at: ago(60), actor: { kind: "user", name: "Domiciliario Pipe" } },
        { to: "DELIVERED", at: ago(50), actor: { kind: "user", name: "Domiciliario Pipe" } },
      ],
    },

    /* ══════════════════════════════════════════════════════════════════════
     * Historial y auditoría — COMPLETED, CANCELLED y RETURNED
     * ════════════════════════════════════════════════════════════════════ */

    /* ── 18. Restaurante · COMPLETED · en sitio ─────────────────────────────
     * Ciclo completo sin transporte: mostrador → entregado → completado. */
    {
      number: n(17),
      createdAt: ago(400),
      source: { type: "POS", reference: "ticket_7731" },
      requester: { name: "Consumidor final" },
      fulfillment: { mode: "on_site", locationRef: "Mostrador 1" },
      items: [
        {
          id: "itm_c1",
          productRef: "sku_combo_almuerzo",
          name: "Almuerzo corriente",
          quantity: 2,
          unit: "porción",
          options: [{ name: "Proteína", value: "Pollo asado" }],
          unitPrice: 18_000,
          subtotal: 36_000,
        },
        {
          id: "itm_c2",
          productRef: "sku_jugo_natural",
          name: "Jugo natural en agua",
          quantity: 2,
          unit: "vaso",
          unitPrice: 6_500,
          subtotal: 13_000,
        },
      ],
      totals: { subtotal: 49_000, discounts: [], charges: [], total: 49_000 },
      payment: { status: "paid", method: "Efectivo", amount: 50_000 },
      steps: [
        { to: "PENDING", at: ago(400), actor: { kind: "channel", name: "POS", ref: "ticket_7731" } },
        {
          to: "CONFIRMED",
          at: ago(399),
          actor: { kind: "automation", name: "Confirmación automática" },
          metadata: { rule: "auto_confirm_max_amount" },
        },
        { to: "IN_PREPARATION", at: ago(380), actor: { kind: "user", name: "Punto de alistamiento" } },
        { to: "READY", at: ago(260), actor: { kind: "user", name: "Punto de alistamiento" } },
        { to: "DELIVERED", at: ago(240), actor: { kind: "user", name: "Operador de piso" } },
        { to: "COMPLETED", at: ago(230), actor: { kind: "system", name: "Sistema" } },
      ],
    },

    /* ── 19. Ropa · COMPLETED · recogida ────────────────────────────────────
     * Un segundo cierre para que el ticket promedio no salga de una sola
     * orden, y de un importe muy distinto. */
    {
      number: n(18),
      createdAt: ago(520),
      source: { type: "WEB", reference: "cart_3312" },
      requester: { name: "Nicolás Herrera", phone: "+57 304 771 8899" },
      fulfillment: { mode: "pickup", locationRef: "Sede Centro" },
      items: [
        {
          id: "itm_a4",
          productRef: "sku_chaqueta_jean",
          name: "Chaqueta de jean",
          quantity: 1,
          unit: "unidad",
          options: [{ name: "Talla", value: "L" }],
          unitPrice: 219_900,
          subtotal: 219_900,
        },
        {
          id: "itm_a5",
          productRef: "sku_cinturon",
          name: "Cinturón de cuero",
          quantity: 2,
          unit: "unidad",
          unitPrice: 79_900,
          subtotal: 159_800,
        },
      ],
      totals: { subtotal: 379_700, discounts: [], charges: [], total: 379_700 },
      payment: { status: "paid", method: "Tarjeta", amount: 379_700, reference: "txn_1180" },
      steps: [
        { to: "PENDING", at: ago(520), actor: { kind: "channel", name: "Tienda web", ref: "cart_3312" } },
        { to: "CONFIRMED", at: ago(518), actor: OPERATOR },
        { to: "IN_PREPARATION", at: ago(500), actor: { kind: "user", name: "Vitrina 1" } },
        { to: "READY", at: ago(480), actor: { kind: "user", name: "Vitrina 1" } },
        { to: "DELIVERED", at: ago(470), actor: { kind: "user", name: "Vitrina 1" } },
        { to: "COMPLETED", at: ago(465), actor: OPERATOR },
      ],
    },

    /* ── 20. Ferretería · CANCELLED · envío · desde PENDING ─────────────────
     * Se cancela **antes** de comprometer trabajo, y el motivo es del cliente:
     * §9 exige conservar quién lo hizo y por qué. */
    {
      number: n(19),
      createdAt: ago(600),
      source: { type: "WEB", reference: "cart_1120" },
      requester: { name: "Diego Salazar", phone: "+57 301 111 2233" },
      fulfillment: { mode: "delivery", address: "Calle 10 #4-22" },
      items: [
        {
          id: "itm_x1",
          productRef: "sku_repuesto_filtro",
          name: "Filtro de aire para motor",
          quantity: 1,
          unit: "unidad",
          unitPrice: 68_000,
          subtotal: 68_000,
        },
      ],
      totals: { subtotal: 68_000, discounts: [], charges: [], total: 68_000 },
      payment: { status: "refunded", method: "Tarjeta", amount: 68_000 },
      steps: [
        { to: "PENDING", at: ago(600), actor: { kind: "channel", name: "Tienda web", ref: "cart_1120" } },
        {
          to: "CANCELLED",
          at: ago(580),
          actor: { kind: "customer", name: "Diego Salazar" },
          reason: "El cliente encontró la pieza localmente.",
        },
      ],
    },

    /* ── 21. Panadería · CANCELLED · recogida · desde CONFIRMED ─────────────
     * Cancelada **después** de confirmar: el motivo es operativo, no del
     * cliente. Las dos cancelaciones no son el mismo caso y el historial las
     * distingue por su actor. */
    {
      number: n(20),
      createdAt: ago(700),
      source: { type: "WHATSAPP", reference: "wa_conv_7788" },
      requester: { name: "Colegio San Mateo", phone: "+57 601 333 2211" },
      fulfillment: { mode: "pickup", locationRef: "Sede Centro" },
      items: [
        {
          id: "itm_b4",
          productRef: "sku_refrigerio",
          name: "Refrigerio escolar",
          quantity: 120,
          unit: "unidad",
          unitPrice: 5_500,
          subtotal: 660_000,
        },
      ],
      totals: { subtotal: 660_000, discounts: [], charges: [], total: 660_000 },
      payment: { status: "refunded", method: "Transferencia", amount: 660_000 },
      steps: [
        { to: "PENDING", at: ago(700), actor: { kind: "channel", name: "WhatsApp", ref: "wa_conv_7788" } },
        { to: "CONFIRMED", at: ago(690), actor: OPERATOR },
        {
          to: "CANCELLED",
          at: ago(660),
          actor: { kind: "user", name: "Jefe de producción" },
          reason: "Faltó materia prima para las 120 porciones del día.",
        },
      ],
    },

    /* ── 22. Ecommerce · RETURNED · envío ───────────────────────────────────
     * El único camino a `RETURNED` es desde `COMPLETED` (§9): la orden se
     * entregó, se cerró y **luego** volvió. Por eso su historial es el más
     * largo de la semilla. */
    {
      number: n(21),
      createdAt: ago(1_100),
      source: { type: "WEB", reference: "cart_2044" },
      requester: { name: "Andrés Felipe Muñoz", phone: "+57 313 909 1122" },
      fulfillment: { mode: "delivery", address: "Calle 45 #23-10, Apto 502" },
      items: [
        {
          id: "itm_w3",
          productRef: "sku_monitor_27",
          name: "Monitor 27\" IPS",
          description: "Producto frágil",
          quantity: 1,
          unit: "unidad",
          unitPrice: 899_000,
          subtotal: 899_000,
        },
      ],
      totals: {
        subtotal: 899_000,
        discounts: [],
        charges: [{ label: "Envío asegurado", amount: 24_000 }],
        total: 923_000,
      },
      payment: { status: "refunded", method: "Tarjeta", amount: 923_000, reference: "txn_0044" },
      steps: [
        { to: "PENDING", at: ago(1_100), actor: { kind: "channel", name: "Tienda web", ref: "cart_2044" } },
        { to: "CONFIRMED", at: ago(1_095), actor: OPERATOR },
        { to: "IN_PREPARATION", at: ago(1_050), actor: { kind: "user", name: "Bodega 1" } },
        { to: "READY", at: ago(1_000), actor: { kind: "user", name: "Bodega 1" } },
        { to: "IN_TRANSIT", at: ago(990), actor: { kind: "user", name: "Domiciliario Pipe" } },
        { to: "DELIVERED", at: ago(960), actor: { kind: "user", name: "Domiciliario Pipe" } },
        { to: "COMPLETED", at: ago(955), actor: { kind: "system", name: "Sistema" } },
        {
          to: "RETURNED",
          at: ago(870),
          actor: { kind: "customer", name: "Andrés Felipe Muñoz" },
          reason: "El panel llegó con dos píxeles muertos; se autorizó la devolución.",
        },
      ],
    },
  ];

  return seeds.map(seed => seedOrder(businessId, seed));
}

/**
 * ¿Hay que sembrar la demostración en esta sede?
 *
 * ⚠️ Sólo si no hay **ninguna** orden de esta tienda. Una sede con órdenes reales
 * no recibe ejemplos encima.
 */
export function shouldSeedDemoOrders(existing: readonly Order[]): boolean {
  return existing.length === 0;
}
