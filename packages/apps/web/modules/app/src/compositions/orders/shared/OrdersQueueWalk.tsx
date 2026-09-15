/**
 * Pedidos — Dónde estoy dentro de la cola, y cómo seguir.
 * ========================================================
 *
 * La tira que aparece **sólo mientras hay una orden abierta**, justo encima de la
 * lista. Dice dos cosas: en qué punto de la cola está la orden que se tiene
 * delante, y con qué teclas se pasa a la siguiente.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * ⚠️ El detalle dejó de ser un modal y pasó a ser un panel anclado al lado de la
 * lista (§14). Eso resuelve la mitad del problema —la cola ya no desaparece— pero
 * deja la otra mitad: con la ficha abierta y sin saber desde dónde avanza, el
 * operador sigue volviendo al ratón para cada orden. `useOrderWalk` le da las
 * flechas; esta tira es lo que hace que **se entere de que las tiene**.
 *
 * ⚠️ Un atajo que no se anuncia no existe. Y anunciarlo con un texto fijo en la
 * cabecera de las cinco pantallas sería ruido permanente para una capacidad que
 * sólo está viva cuando hay una ficha abierta. Por eso la tira es **condicional**:
 * aparece con el detalle y se va con él, sin dejar hueco.
 *
 * ⚠️ No cuenta órdenes: dice **dónde está**. `position` sale de la lista ya
 * filtrada y ordenada que la pantalla está pintando —la misma que se ve—, así que
 * "7 de 12" siempre describe lo que hay en pantalla y no el universo de la sede.
 * Un contador con otro criterio que el de la lista que tiene debajo sería una
 * segunda cifra que discutir.
 */

import { ArrowDown, ArrowUp } from "lucide-react";

export interface OrdersQueueWalkProps {
  /** Posición 1-based de la orden abierta dentro de la lista. `0` si no está. */
  position: number;
  /** Cuántas órdenes tiene la lista ahora mismo. */
  total: number;
}

export function OrdersQueueWalk({ position, total }: OrdersQueueWalkProps) {
  /**
   * ⚠️ Con una sola orden no hay nada que recorrer, así que no se pinta: una tira
   * que dijera "1 de 1" y ofreciera unas flechas que no llevan a ninguna parte
   * sería exactamente el ruido que este módulo está quitando (§2).
   */
  if (position === 0 || total < 2) return null;

  return (
    <div
      data-order-walk={position}
      data-order-walk-total={total}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-theme-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400"
    >
      <p>
        <span className="font-medium text-gray-700 tabular-nums dark:text-gray-200">
          {position}
        </span>{" "}
        de <span className="tabular-nums">{total}</span> en esta pantalla
      </p>

      <p className="flex items-center gap-1.5">
        <kbd className="inline-flex h-4 items-center rounded border border-gray-200 bg-white px-1 font-sans text-[10px] leading-none text-gray-500 dark:border-gray-700 dark:bg-white/5 dark:text-gray-400">
          <ArrowUp className="h-2.5 w-2.5" aria-hidden />
        </kbd>
        <kbd className="inline-flex h-4 items-center rounded border border-gray-200 bg-white px-1 font-sans text-[10px] leading-none text-gray-500 dark:border-gray-700 dark:bg-white/5 dark:text-gray-400">
          <ArrowDown className="h-2.5 w-2.5" aria-hidden />
        </kbd>
        para pasar de orden sin cerrar el detalle
      </p>
    </div>
  );
}

export default OrdersQueueWalk;
