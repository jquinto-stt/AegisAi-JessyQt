/**
 * Pedidos — Máquina de estados del ciclo de vida de una orden.
 * ===========================================================
 *
 * Este archivo es la **única fuente de verdad** de:
 *
 *   1. qué transiciones son válidas desde cada estado (§4, §8, §9);
 *   2. qué acciones de UI se ofrecen en cada estado (§14);
 *   3. cómo se rotula cada estado y cada acción (§7 — vocabulario genérico).
 *
 * ⚠️ Un solo mapa gobierna la tabla, el board, el detalle y las acciones. Antes
 * de añadir un botón "Confirmar" en cualquier pantalla, se pregunta aquí. Si la
 * acción no está en `orderActionsFor`, no existe: eso es lo que impide los
 * "botones estáticos sin lógica" que el pedido prohíbe en §14.
 *
 * ⚠️ La modalidad de entrega **restringe** transiciones: `IN_TRANSIT` sólo es
 * alcanzable desde `READY` cuando la modalidad usa transporte (`delivery`). Una
 * recogida va `READY → DELIVERED` directamente (§8).
 */

import type {
  Order,
  OrderActor,
  OrderFulfillmentMode,
  OrderStatus,
} from "@/contracts/order.contract";
import { modeUsesTransit } from "@/contracts/order.contract";

/* ── Transiciones válidas (§4, §8, §9) ─────────────────────────────────────── */

/**
 * A dónde puede ir una orden desde cada estado.
 *
 * ── Flujo conceptual (§4) ───────────────────────────────────────────────────
 *
 *   PENDING → CONFIRMED → IN_PREPARATION → READY → [IN_TRANSIT] → DELIVERED → COMPLETED
 *
 *   `IN_TRANSIT` es opcional y depende de la modalidad (§8).
 *   `CANCELLED` es alcanzable mientras la orden siga abierta (§9).
 *   `RETURNED` es alcanzable **sólo** desde un estado entregado (§9: representa
 *   que una orden previamente entregada fue devuelta — no puede devolverse algo
 *   que nunca se entregó).
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PREPARATION", "CANCELLED"],
  IN_PREPARATION: ["READY", "CANCELLED"],
  READY: ["IN_TRANSIT", "DELIVERED", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "RETURNED"],
  COMPLETED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

/**
 * ¿Es válida esta transición **para esta orden concreta**?
 *
 * ⚠️ No basta con mirar el mapa: la modalidad filtra. `READY → IN_TRANSIT` está
 * en el mapa, pero una recogida (`pickup`) no tiene transporte y por tanto esa
 * arista **no aplica a esa orden**. Preguntar siempre por aquí, nunca contra el
 * mapa directamente.
 */
export function canTransition(order: Order, to: OrderStatus): boolean {
  if (!ORDER_TRANSITIONS[order.status].includes(to)) return false;

  // §8 — `IN_TRANSIT` sólo existe cuando la modalidad implica transporte.
  if (to === "IN_TRANSIT" && !modeUsesTransit(order.fulfillment.mode)) return false;

  // §9 — No se devuelve una orden que nunca se entregó.
  if (to === "RETURNED" && order.status !== "DELIVERED" && order.status !== "COMPLETED") {
    return false;
  }

  return true;
}

/** Las transiciones realmente disponibles para una orden (ya filtradas). */
export function availableTransitions(order: Order): OrderStatus[] {
  return ORDER_TRANSITIONS[order.status].filter(to => canTransition(order, to));
}

/* ── Requisitos de cada transición ─────────────────────────────────────────── */

/**
 * Qué exige una transición al ejecutarse.
 *
 * ⚠️ Pedidos **no implementa** las validaciones externas (§6): disponibilidad,
 * capacidad o pago pertenecen a otras capacidades. Lo único que Pedidos exige es
 * lo que pertenece a su propio dominio: un motivo para cancelar (§9, §10) o para
 * devolver, porque sin él el historial no puede responder *por qué* ocurrió.
 */
export interface OrderTransitionRequirement {
  /** ¿Exige un motivo escrito por quien la ejecuta? */
  requiresReason: boolean;
  /** Rótulo del campo de motivo cuando se pide. */
  reasonLabel?: string;
  /** ¿Se ofrece al operador como acción explícita en el detalle? (§14) */
  isOperatorAction: boolean;
  /**
   * Tono de la acción. `destructive` para las que cierran la orden sin cumplirla.
   * ⚠️ No es un color decorativo: separa "avanzar el trabajo" de "abortarlo".
   */
  tone: "primary" | "neutral" | "destructive";
  /** Acción válida sólo si la orden está programada (§15). */
  scheduledOnly?: boolean;
}

export const ORDER_TRANSITION_REQUIREMENTS: Partial<
  Record<OrderStatus, OrderTransitionRequirement>
> = {
  CONFIRMED: { requiresReason: false, isOperatorAction: true, tone: "primary" },
  IN_PREPARATION: { requiresReason: false, isOperatorAction: true, tone: "primary" },
  READY: { requiresReason: false, isOperatorAction: true, tone: "primary" },
  IN_TRANSIT: { requiresReason: false, isOperatorAction: true, tone: "primary" },
  DELIVERED: { requiresReason: false, isOperatorAction: true, tone: "primary" },
  COMPLETED: { requiresReason: false, isOperatorAction: true, tone: "primary" },
  CANCELLED: {
    requiresReason: true,
    reasonLabel: "Motivo de la cancelación",
    isOperatorAction: true,
    tone: "destructive",
  },
  RETURNED: {
    requiresReason: true,
    reasonLabel: "Motivo de la devolución",
    isOperatorAction: true,
    tone: "destructive",
  },
};

/* ── Rótulos (§7 — vocabulario genérico, §27) ──────────────────────────────── */

/**
 * Rótulo humano de cada estado.
 *
 * ⚠️ **Vocabulario universal a propósito** (§7, §22): "En alistamiento", no "En
 * cocina"; "Listo", no "Listo para servir". El núcleo no conoce el rubro. La
 * tienda puede matizar el rótulo en presentación con su `BusinessSemanticConfig`
 * —propiedad suya—, pero el **estado** se llama igual para todos.
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Por validar",
  CONFIRMED: "Confirmada",
  IN_PREPARATION: "En alistamiento",
  READY: "Lista",
  IN_TRANSIT: "En tránsito",
  DELIVERED: "Entregada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  RETURNED: "Devuelta",
};

/**
 * Descripción breve del estado, para el detalle.
 * Explica *qué significa* el estado, que es lo que un operador nuevo necesita.
 */
export const ORDER_STATUS_HINTS: Record<OrderStatus, string> = {
  PENDING: "Recibida, sin compromiso operativo todavía.",
  CONFIRMED: "Aceptada: la tienda se comprometió a ejecutarla.",
  IN_PREPARATION: "Se está alistando o ejecutando el trabajo de la orden.",
  READY: "Terminada y a la espera de entrega o despacho.",
  IN_TRANSIT: "Salió hacia el punto de entrega.",
  DELIVERED: "Puesta en manos del cliente. Falta cerrarla.",
  COMPLETED: "Ciclo cerrado satisfactoriamente.",
  CANCELLED: "Abortada antes de completarse.",
  RETURNED: "Entregada y posteriormente devuelta.",
};

/**
 * Tono visual del estado.
 *
 * ⚠️ §27: los estados deben identificarse **sin depender sólo del color**. Este
 * tono alimenta color *y* icono (ver `ORDER_STATUS_ICON` en el vocabulario de
 * presentación); nunca se usa el color como único vehículo de significado.
 *
 * ⚠️ La regla de marca del proyecto ("un acento por vista", verde = estado) se
 * respeta: sólo `READY` y `COMPLETED` usan verde (estados logrados); el acento
 * naranja queda para el CTA, no para pintar estados.
 */
export type OrderStatusTone = "neutral" | "accent" | "progress" | "success" | "danger";

export const ORDER_STATUS_TONES: Record<OrderStatus, OrderStatusTone> = {
  PENDING: "neutral",
  CONFIRMED: "accent",
  IN_PREPARATION: "progress",
  READY: "success",
  IN_TRANSIT: "progress",
  DELIVERED: "success",
  COMPLETED: "success",
  CANCELLED: "danger",
  RETURNED: "danger",
};

/**
 * Orden de lectura del flujo. El board (§13) usa esto para decidir qué columnas
 * pinta y en qué orden, **sin** declarar cinco columnas fijas: las columnas son
 * los estados que de hecho tienen órdenes, más los operativos que siempre se
 * muestran.
 */
export const ORDER_STATUS_FLOW: readonly OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "IN_PREPARATION",
  "READY",
  "IN_TRANSIT",
  "DELIVERED",
  "COMPLETED",
];

/**
 * Estados que el board muestra siempre, aunque no tengan órdenes.
 *
 * ⚠️ §13 prohíbe "forzar visualmente todos los estados posibles como columnas
 * permanentes". Estos cinco son la columna vertebral operativa; `IN_TRANSIT`
 * aparece **sólo si hay órdenes en él** (es condicional a la modalidad), y
 * `DELIVERED`/`COMPLETED` no se pintan como columnas porque ya no se opera sobre
 * ellas: viven en la tabla y el historial.
 */
export const ORDER_BOARD_ALWAYS_VISIBLE: readonly OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "IN_PREPARATION",
  "READY",
];

/* ── Acciones del operador (§14) ───────────────────────────────────────────── */

/**
 * Una acción ofrecida en el detalle de la orden.
 *
 * ⚠️ §14: "Las acciones deben depender del estado real y no ser botones estáticos
 * sin lógica." Por eso esto se **deriva** del estado y la modalidad; nunca se
 * declara a mano en una pantalla.
 */
export interface OrderAction {
  /** Estado destino de la transición. */
  to: OrderStatus;
  label: string;
  /**
   * Frase corta que dice **qué significa** la acción para esta orden concreta.
   *
   * ⚠️ Existe porque un rótulo de dos palabras no responde la pregunta que el
   * operador se hace delante de una orden lista: *"si la marco entregada, ¿la
   * estoy enviando o ya llegó?"*. `Despachar` (sale hacia el cliente) y
   * `Marcar como entregada` (llegó) son destinos distintos y ambos están
   * disponibles desde `READY`, así que la diferencia tiene que estar escrita, no
   * deducida del nombre del botón.
   */
  consequence: string;
  /** Exige motivo antes de ejecutarse (§9). */
  requiresReason: boolean;
  reasonLabel?: string;
  tone: "primary" | "neutral" | "destructive";
}

/**
 * Rótulos de acción por estado destino.
 *
 * ⚠️ Cada rótulo nombra **lo que se hace**, no el estado al que se llega, salvo
 * cuando el propio estado es la acción ("Marcar como listo"). Verbo primero.
 */
const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "Confirmar orden",
  IN_PREPARATION: "Iniciar alistamiento",
  READY: "Marcar como lista",
  IN_TRANSIT: "Despachar",
  DELIVERED: "Marcar como entregada",
  COMPLETED: "Completar orden",
  CANCELLED: "Cancelar orden",
  RETURNED: "Registrar devolución",
};

/**
 * Qué ocurre al ejecutar cada acción, en una frase.
 *
 * ⚠️ §27 — Esto es lo que hace legible el **paso a envío**. Las dos acciones que
 * salen de `READY` cuando la modalidad usa transporte llevan al operador a sitios
 * distintos: `Despachar` deja la orden **en tránsito** (salió, aún no llegó) y
 * `Marcar como entregada` la declara **recibida**. Sin esta frase, la única forma
 * de saberlo era memorizar la máquina de estados.
 *
 * ⚠️ `IN_TRANSIT` se redacta como "sale hacia el punto de entrega" y no "sale a
 * envío": la modalidad puede ser un servicio a domicilio, un mensajero o una
 * instalación; "envío" es sólo una de ellas.
 */
const ACTION_CONSEQUENCES: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "La tienda asume el compromiso de ejecutarla.",
  IN_PREPARATION: "Empieza el alistamiento o la ejecución del trabajo.",
  READY: "Terminada; queda a la espera de entrega o despacho.",
  IN_TRANSIT: "Sale hacia el punto de entrega. Todavía no ha llegado.",
  DELIVERED: "Llegó al cliente. Sólo falta cerrarla.",
  COMPLETED: "Cierra la orden. No admite más cambios.",
  CANCELLED: "Aborta la orden y conserva el motivo en el historial.",
  RETURNED: "Registra que una entrega anterior volvió.",
};

/**
 * Las acciones válidas **ahora mismo** para esta orden (§14).
 *
 * Es la única puerta por la que una pantalla puede ofrecer una acción. El ejemplo
 * conceptual de §14 (`PENDIENTE → Confirmar / Cancelar`) sale exactamente de aquí.
 */
export function orderActionsFor(order: Order): OrderAction[] {
  return availableTransitions(order)
    .filter(to => ORDER_TRANSITION_REQUIREMENTS[to]?.isOperatorAction)
    .map(to => {
      const req = ORDER_TRANSITION_REQUIREMENTS[to]!;
      return {
        to,
        label: ACTION_LABELS[to] ?? ORDER_STATUS_LABELS[to],
        consequence: ACTION_CONSEQUENCES[to] ?? "",
        requiresReason: req.requiresReason,
        reasonLabel: req.reasonLabel,
        tone: req.tone,
      };
    });
}

/* ── Helpers de presentación ───────────────────────────────────────────────── */

/** Rótulo humano de una modalidad de entrega. */
export const FULFILLMENT_MODE_LABELS: Record<OrderFulfillmentMode, string> = {
  pickup: "Recogida",
  delivery: "Envío",
  on_site: "En sitio",
  service: "Servicio",
};

/** Actor del sistema, para transiciones automáticas o sin actor identificado. */
export const SYSTEM_ACTOR: OrderActor = { kind: "system", name: "Sistema" };
