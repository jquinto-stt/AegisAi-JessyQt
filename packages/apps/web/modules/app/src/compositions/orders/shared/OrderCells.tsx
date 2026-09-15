/**
 * Pedidos — Celdas compartidas de las tablas operativas.
 * =======================================================
 *
 * Las columnas que **más de una** pantalla necesita, escritas una sola vez:
 * modalidad, importe, tiempo en el estado, programación, carga de ítems, cierre y
 * motivo.
 *
 * ── Por qué celdas y no un `renderCell` por vista ───────────────────────────
 *
 * ⚠️ "Tiempo en el estado" aparece en la Bandeja, en Alistamiento y en Despacho, y
 * es la columna que decide si una orden se marca demorada. Si cada pantalla la
 * pintara por su cuenta, la de Alistamiento podría redondear distinto que la de
 * Despacho y el mismo operador vería "34 min" y "33 min" para la misma orden. La
 * cifra y su umbral viven en `order-operations`; aquí sólo se **pinta**.
 *
 * ⚠️ Cada celda emite su ancla `data-order-*`. Es la única forma de que una
 * guarda pueda comprobar que la columna existe y qué contiene: los componentes
 * del catálogo no reenvían props nativas, así que el ancla va en un `<span>`
 * propio.
 */

import { CalendarClock, Clock3, Hash, Package } from "lucide-react";

import { Badge } from "@/elements";
import type { Order } from "@/contracts/order.contract";
import { FULFILLMENT_MODE_LABELS } from "../order-status.constants";
import {
  FULFILLMENT_ICONS,
  formatDayLabel,
  formatDuration,
  formatRelative,
  formatScheduleWindow,
  formatQuantity,
} from "../order-presentation.utils";
import {
  SCHEDULE_STATE_LABELS,
  SCHEDULE_STATE_TO_BADGE,
  URGENCY_LABELS,
  URGENCY_TO_BADGE,
  minutesInCurrentState,
  scheduleStateOf,
  urgencyOf,
} from "../operational/order-operations";

/* ── Modalidad de entrega (§8) ─────────────────────────────────────────────── */

/**
 * La modalidad, con su icono.
 *
 * ⚠️ El icono es de modalidad, no de estado: en Despacho conviven "en tránsito"
 * (estado) y "envío con transporte" (modalidad) en la misma fila, y el mismo
 * camión para las dos cosas las volvería indistinguibles.
 */
export function OrderModeCell({ order }: { order: Order }) {
  const mode = order.fulfillment.mode;
  const Icon = FULFILLMENT_ICONS[mode] ?? Package;
  const label = FULFILLMENT_MODE_LABELS[mode] ?? mode;

  return (
    <span data-order-mode={mode} className="inline-flex items-center gap-2 whitespace-nowrap">
      <Icon className="h-3.5 w-3.5 flex-none text-gray-400 dark:text-gray-500" aria-hidden />
      <span className="text-theme-sm text-gray-700 dark:text-gray-200">{label}</span>
    </span>
  );
}

/* ── Importe de la orden ───────────────────────────────────────────────────── */

/** El total de la orden, en la moneda de la tienda. */
export function OrderTotalCell({
  order,
  formatMoney,
}: {
  order: Order;
  formatMoney: (amount: number) => string;
}) {
  return (
    <span
      data-order-total={order.totals.total}
      className="text-theme-sm font-semibold tabular-nums text-gray-800 dark:text-white/90"
    >
      {formatMoney(order.totals.total)}
    </span>
  );
}

/* ── Tiempo en el estado actual (§12, §16) ─────────────────────────────────── */

/**
 * Cuánto lleva la orden en su estado, con su nivel de urgencia.
 *
 * ⚠️ El umbral entra por parámetro y sale de los ajustes del flujo (§17): si
 * estuviera escrito aquí, cambiar el ritmo de trabajo de la tienda no cambiaría
 * lo que la tabla marca en rojo.
 */
export function OrderElapsedCell({
  order,
  thresholdMinutes,
}: {
  order: Order;
  thresholdMinutes: number;
}) {
  const minutes = minutesInCurrentState(order);
  const urgency = urgencyOf(minutes, thresholdMinutes);
  const badge = URGENCY_TO_BADGE[urgency];

  return (
    <span
      data-order-elapsed={minutes}
      data-order-urgency={urgency}
      className="inline-flex items-center gap-2 whitespace-nowrap"
    >
      <Clock3 className="h-3.5 w-3.5 flex-none text-gray-400 dark:text-gray-500" aria-hidden />
      <span className="text-theme-sm tabular-nums text-gray-700 dark:text-gray-200">
        {formatDuration(minutes)}
      </span>
      <Badge color={badge.color} size="xs" className={badge.className}>
        {URGENCY_LABELS[urgency]}
      </Badge>
    </span>
  );
}

/* ── Carga de ítems (§5) ───────────────────────────────────────────────────── */

/**
 * Qué lleva la orden: líneas y unidades.
 *
 * ⚠️ Cuenta sobre `order.items` —los ítems **de esta orden**—, nunca sobre
 * catálogo: Pedidos no lo tiene (§24). Es lo que el operador necesita para saber
 * cuánto trabajo hay en la orden, no qué producto es.
 */
export function OrderItemsCell({ order }: { order: Order }) {
  const lines = order.items.length;
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <span
      data-order-items={`${lines}/${units}`}
      className="inline-flex items-center gap-2 whitespace-nowrap"
    >
      <Hash className="h-3.5 w-3.5 flex-none text-gray-400 dark:text-gray-500" aria-hidden />
      <span className="text-theme-sm text-gray-700 dark:text-gray-200">
        {lines} {lines === 1 ? "línea" : "líneas"}
      </span>
      <span className="text-theme-xs text-gray-400 dark:text-gray-500">
        · {formatQuantity(units)} und
      </span>
    </span>
  );
}

/* ── Programación (§15) ────────────────────────────────────────────────────── */

/**
 * Cuándo debe ejecutarse la orden, y si esa hora ya se pasó.
 *
 * ⚠️ Muestra **dos** hechos que no son el mismo: la ventana comprometida (un
 * dato de la orden) y el estado de la programación respecto a ahora (un juicio
 * sobre el tiempo). Una orden puede estar `CONFIRMED` —bien— y `Vencida` —mal— a
 * la vez, y la columna tiene que poder decir las dos cosas.
 */
export function OrderScheduleCell({ order }: { order: Order }) {
  const schedule = order.schedule;
  if (!schedule) {
    return <span className="text-theme-sm text-gray-400 dark:text-gray-500">Sin programar</span>;
  }

  const state = scheduleStateOf(order);
  const badge = SCHEDULE_STATE_TO_BADGE[state];

  return (
    <span
      data-order-schedule={schedule.scheduledFor}
      data-order-schedule-state={state}
      className="inline-flex flex-col gap-1 whitespace-nowrap"
    >
      <span className="inline-flex items-center gap-2">
        <CalendarClock className="h-3.5 w-3.5 flex-none text-gray-400 dark:text-gray-500" aria-hidden />
        <span className="text-theme-sm font-medium text-gray-700 dark:text-gray-200">
          {formatDayLabel(schedule.scheduledFor)}
        </span>
        <span className="text-theme-xs tabular-nums text-gray-500 dark:text-gray-400">
          {formatScheduleWindow(schedule.scheduledFor, schedule.scheduledUntil)}
        </span>
      </span>
      <Badge color={badge.color} size="xs" className={`self-start ${badge.className ?? ""}`}>
        {SCHEDULE_STATE_LABELS[state]}
      </Badge>
    </span>
  );
}

/* ── Cierre y motivo (§10, §14) ────────────────────────────────────────────── */

/**
 * Cuándo se cerró la orden y quién lo hizo.
 *
 * ⚠️ Se lee del **historial**, no de `updatedAt`: `updatedAt` es la última
 * modificación de cualquier campo, y una nota añadida después del cierre haría
 * parecer que la orden se cerró más tarde de lo que se cerró.
 */
export function OrderClosedCell({ order }: { order: Order }) {
  const last = order.history[order.history.length - 1];
  if (!last) return null;

  return (
    <span data-order-closed={last.at} className="inline-flex flex-col whitespace-nowrap">
      <span className="text-theme-sm text-gray-700 dark:text-gray-200">{formatRelative(last.at)}</span>
      <span className="text-theme-xs text-gray-400 dark:text-gray-500">{last.actor.name}</span>
    </span>
  );
}

/**
 * El motivo del cierre, cuando existe.
 *
 * ⚠️ §9 — una cancelación o una devolución **deben** poder explicarse. El motivo
 * se captura en el detalle y se conserva en el historial; esta celda lo saca a la
 * superficie para que auditar no obligue a abrir cada orden una por una.
 */
export function OrderReasonCell({ order }: { order: Order }) {
  const last = order.history[order.history.length - 1];
  const reason = last?.reason;

  if (!reason) {
    return (
      <span className="text-theme-xs text-gray-400 dark:text-gray-500">
        Sin motivo registrado
      </span>
    );
  }

  return (
    <span
      data-order-reason
      className="line-clamp-2 max-w-[22rem] text-theme-xs leading-relaxed text-gray-600 dark:text-gray-300"
    >
      {reason}
    </span>
  );
}

/* ── Línea secundaria del número ───────────────────────────────────────────── */

/** Bajo el número de la orden: quién la pidió y por dónde entró. */
export function orderIdentityLine(order: Order): string {
  const requester = order.requester.name;
  const reference = order.source.reference;
  return reference ? `${requester} · ${reference}` : requester;
}
