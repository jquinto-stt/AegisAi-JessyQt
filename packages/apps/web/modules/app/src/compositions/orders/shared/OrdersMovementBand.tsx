/**
 * Pedidos — Confirmación de movimiento.
 * ======================================
 *
 * La franja que aparece cuando una orden **cambia de estado desde una pantalla de
 * trabajo**, y que dice de dónde a dónde fue, ofreciendo ir a verla.
 *
 * ── El defecto que esto corrige ─────────────────────────────────────────────
 *
 * Cuando el operador marcaba una orden como completada, la fila **desaparecía** de
 * la pantalla sin confirmación ni rastro: la orden se había movido a otra fase y
 * el único indicio era que ya no estaba. Eso se lee como "se perdió", no como
 * "avanzó". Esta franja convierte el movimiento en un hecho visible: dice el
 * número, el estado de origen y el de destino, y ofrece el camino para volver a
 * encontrarla.
 *
 * ── Por qué no es un `Notification` ni un `Alert` ───────────────────────────
 *
 * ⚠️ `Notification` es un *toast* superpuesto y auto-descartable: en una pantalla
 * de trabajo desaparecería antes de que el operador termine de leer la frase, y
 * taparía la lista. `Alert` vive en el flujo, pero **no admite** `role="status"`
 * ni dos acciones en línea (limitación medida del catálogo). Así que la franja se
 * compone con `Card` —que reenvía props nativas y por tanto puede llevar
 * `role="status"`— más dos controles nativos.
 *
 * ⚠️ `role="status"` con `aria-live="polite"` es lo que hace que un lector de
 * pantalla anuncie el movimiento sin interrumpir lo que el operador esté
 * haciendo. Es información, no una emergencia.
 */

import { ArrowRight, CheckCircle2, X } from "lucide-react";

import { Card } from "@/elements";
import type { OrderStatus } from "@/contracts/order.contract";
import { ORDER_STATUS_LABELS } from "../order-status.constants";
import { OPERATIONAL_SCREEN_LABELS, screenForStatus } from "../operational/order-operations";

/** Un movimiento de estado ya ejecutado, tal como lo reporta la pantalla. */
export interface OrderMovement {
  orderId: string;
  orderNumber: string;
  from: OrderStatus;
  to: OrderStatus;
}

export interface OrdersMovementBandProps {
  movement: OrderMovement | null;
  onDismiss: () => void;
  /**
   * Lleva a donde vive ahora la orden.
   *
   * ⚠️ Lo **recibe** la franja: no sabe a qué pantalla pertenece la orden en su
   * nuevo estado. Quien la pinta —que sí conoce su propia navegación— decide a
   * dónde lleva. Si no se pasa, la franja sólo informa.
   */
  onSee?: () => void;
  /** Rótulo del destino: "Ver en Historial", "Ver en despacho"… */
  seeLabel?: string;
}

export function OrdersMovementBand({
  movement,
  onDismiss,
  onSee,
  seeLabel = "Ver la orden",
}: OrdersMovementBandProps) {
  if (!movement) return null;

  return (
    <Card
      role="status"
      aria-live="polite"
      data-order-movement={movement.to}
      className="flex flex-wrap items-center justify-between gap-3 border-success-200 bg-success-50/60 p-3.5 dark:border-success-500/25 dark:bg-success-500/10"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-500">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
        </span>
        <p className="min-w-0 text-theme-sm text-gray-700 dark:text-gray-200">
          La orden{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {movement.orderNumber}
          </span>{" "}
          pasó de{" "}
          <span className="font-medium">{ORDER_STATUS_LABELS[movement.from]}</span>{" "}
          <ArrowRight className="mx-0.5 inline h-3.5 w-3.5 text-gray-400" aria-hidden />{" "}
          <span className="font-semibold text-success-700 dark:text-success-500">
            {ORDER_STATUS_LABELS[movement.to]}
          </span>
          .
        </p>
      </div>

      <div className="flex flex-none items-center gap-1.5">
        {onSee && (
          <button
            type="button"
            onClick={onSee}
            data-intent="orders.movement.see"
            className="cursor-pointer rounded-full bg-white px-3.5 py-1.5 text-theme-xs font-semibold text-secondary-600 shadow-theme-xs transition-colors hover:text-brand-500 dark:bg-white/5 dark:text-white dark:hover:text-brand-400"
          >
            {seeLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Descartar confirmación"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </Card>
  );
}

export default OrdersMovementBand;

/* ── La franja ya cableada a la pantalla (§27) ─────────────────────────────── */

export interface OrdersMovementNoticeProps {
  movement: OrderMovement | null;
  onDismiss: () => void;
  /** Pide ir a la pantalla donde vive ahora la orden. */
  onSee?: (movement: OrderMovement) => void;
}

/**
 * La confirmación de movimiento, con su destino ya resuelto.
 *
 * ⚠️ El rótulo del botón lo calcula **aquí** y no cada vista: "Ver en despacho y
 * Entrega" depende del estado de destino (`screenForStatus`), y si cada pantalla
 * lo escribiera a mano, la Bandeja diría "Ver en Historial" para una orden que en
 * realidad está en Despacho. Escribirlo una vez hace imposible esa mentira.
 */
export function OrdersMovementNotice({
  movement,
  onDismiss,
  onSee,
}: OrdersMovementNoticeProps) {
  if (!movement) return null;

  return (
    <OrdersMovementBand
      movement={movement}
      onDismiss={onDismiss}
      onSee={onSee ? () => onSee(movement) : undefined}
      seeLabel={`Ver en ${OPERATIONAL_SCREEN_LABELS[screenForStatus(movement.to)]}`}
    />
  );
}

