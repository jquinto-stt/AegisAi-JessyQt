/**
 * Pedidos — Ordenación de las tablas operativas.
 * ===============================================
 *
 * Las cuatro tablas de trabajo (Bandeja, Despacho, Programados e Historial) se
 * ordenan, y la comparación de cada columna es la misma en todas: "espera" es
 * siempre `minutesInCurrentState`, "total" es siempre `totals.total`.
 *
 * ⚠️ Escribir el comparador dentro de cada vista habría permitido que la Bandeja
 * ordenara por tiempo en el estado y Despacho por `updatedAt` —parecidos, no
 * iguales— y que la misma columna "Espera" ordenara distinto según la pantalla.
 * Los comparadores viven aquí, se declaran una vez y son **estables** (por eso
 * `useOrderSort` los recibe como mapa de módulo y no como arrow en el `render`).
 */

import { useCallback, useMemo, useState } from "react";

import type { Order } from "@/contracts/order.contract";
import type { OrdersTableSort } from "./OrdersTable";
import { minutesInCurrentState } from "../operational/order-operations";

/** Cuántas unidades lleva la orden, sumando cantidades. */
function unitsOf(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

/** El momento del último cambio de estado (la última entrada del historial). */
function lastMovementAt(order: Order): string {
  return order.history[order.history.length - 1]?.at ?? order.createdAt;
}

/**
 * Los comparadores compartidos, por clave de columna.
 *
 * ⚠️ El número de orden se compara con `numeric: true`: sin eso, `#1000` iría
 * antes que `#999` porque la comparación sería alfabética.
 */
export const ORDER_COMPARATORS: Record<string, (a: Order, b: Order) => number> = {
  number: (a, b) => a.number.localeCompare(b.number, "es", { numeric: true }),
  createdAt: (a, b) => a.createdAt.localeCompare(b.createdAt),
  elapsed: (a, b) => minutesInCurrentState(a) - minutesInCurrentState(b),
  total: (a, b) => a.totals.total - b.totals.total,
  items: (a, b) => unitsOf(a) - unitsOf(b),
  schedule: (a, b) =>
    (a.schedule?.scheduledFor ?? "").localeCompare(b.schedule?.scheduledFor ?? ""),
  closed: (a, b) => lastMovementAt(a).localeCompare(lastMovementAt(b)),
};

export interface OrderSortValue {
  /** El estado de ordenación, tal cual lo consume `OrdersTable`. */
  sort: OrdersTableSort;
  /** Alterna la dirección si la clave ya está activa; si no, ordena por ella. */
  toggle: (key: string) => void;
  /** La lista ordenada. Devuelve un array nuevo: nunca muta el de entrada. */
  apply: (orders: readonly Order[]) => Order[];
}

export function useOrderSort(
  initialKey: string,
  comparators: Record<string, (a: Order, b: Order) => number> = ORDER_COMPARATORS
): OrderSortValue {
  const [sort, setSort] = useState<OrdersTableSort>({ key: initialKey, direction: "desc" });

  const toggle = useCallback((key: string) => {
    setSort(prev =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : // Al cambiar de columna se entra en descendente: lo más reciente, lo más
          // caro o lo más atrasado primero es lo que el operador quiere ver al
          // pulsar una columna nueva.
          { key, direction: "desc" }
    );
  }, []);

  const apply = useCallback(
    (orders: readonly Order[]) => {
      const comparator = comparators[sort.key];
      if (!comparator) return [...orders];
      const factor = sort.direction === "asc" ? 1 : -1;
      return [...orders].sort((a, b) => comparator(a, b) * factor);
    },
    [comparators, sort.key, sort.direction]
  );

  return useMemo(() => ({ sort, toggle, apply }), [sort, toggle, apply]);
}
