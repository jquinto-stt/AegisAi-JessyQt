/**
 * Pedidos — Tablero (kanban) de órdenes.
 * ======================================
 *
 * La superficie de listado alternativa a `OrdersTable`: los mismos datos, en
 * carriles. Existe porque una tabla responde bien a "¿qué hay?" y mal a "¿cómo
 * está repartido?" — para ver el reparto hay que contar filas a ojo, y con veinte
 * órdenes eso ya no se hace.
 *
 * ── Las dos reglas que un tablero tiene que cumplir ─────────────────────────
 *
 * ⚠️ **Los carriles son excluyentes y cubren el universo.** Es la diferencia entre
 * un tablero y una lista con adornos: si una orden cayera en dos carriles se
 * contaría dos veces y los totales mentirían; si no cayera en ninguno,
 * **desaparecería** de la pantalla sin que nada lo dijera. Por eso el tablero
 * comprueba lo segundo en vez de confiar en ello: si alguna orden no encaja en
 * ningún carril, aparece un carril de sobra que lo denuncia, en tono de error.
 * Un tablero que se come filas en silencio es peor que no tener tablero.
 *
 * ⚠️ **La tarjeta no ofrece acciones.** Igual que la fila de la tabla (§13): la
 * tarjeta abre el detalle, y nada más. Las acciones dependen del estado real de la
 * orden y viven en un solo sitio —el detalle, que las deriva de `orderActionsFor`—
 * y por eso aquí tampoco se importa `Button`.
 *
 * ── Por qué el tablero no decide los carriles ───────────────────────────────
 *
 * ⚠️ Los carriles entran por parámetro. El tablero no sabe qué es un estado ni qué
 * es una fase: sabe apilar órdenes en columnas. Eso lo hace reutilizable por
 * cualquier pantalla —hoy sólo lo usa la Bandeja— sin que exista una segunda
 * definición de qué es cada columna.
 */

import { useMemo } from "react";
import type { ReactNode } from "react";

import type { Order } from "@/contracts/order.contract";

/** Un carril del tablero. */
export interface OrdersBoardLane<Lane extends string> {
  key: Lane;
  label: string;
  /** Qué órdenes caen aquí. Debe ser **excluyente** con los demás carriles. */
  match: (order: Order) => boolean;
  /** Clase del punto de color del carril (viene del tono del estado). */
  dotClass?: string;
}

export interface OrdersBoardProps<Lane extends string> {
  /** Valor de `data-orders-board`, para que las guardas distingan la superficie. */
  anchor: string;
  orders: readonly Order[];
  lanes: readonly OrdersBoardLane<Lane>[];
  /** Abre el detalle. Es el **único** acceso que ofrece una tarjeta. */
  onOpenOrder: (orderId: string) => void;
  /**
   * El cuerpo de la tarjeta.
   *
   * ⚠️ El tablero pone el botón, el ancla y el estilo; la pantalla pone el
   * contenido. Así cada pantalla decide qué merece estar en su tarjeta sin que
   * existan tantos tableros como pantallas.
   */
  renderCardBody: (order: Order) => ReactNode;
  /** Orden dentro de cada carril. Por defecto, el orden recibido. */
  sortWithinLane?: (a: Order, b: Order) => number;
  /** Qué decir en un carril vacío. */
  emptyLaneLabel: string;
}

export function OrdersBoard<Lane extends string>({
  anchor,
  orders,
  lanes,
  onOpenOrder,
  renderCardBody,
  sortWithinLane,
  emptyLaneLabel,
}: OrdersBoardProps<Lane>) {
  const { byLane, orphans } = useMemo(() => {
    const map = new Map<Lane, Order[]>();
    for (const lane of lanes) map.set(lane.key, []);

    const unassigned: Order[] = [];
    for (const order of orders) {
      const lane = lanes.find(candidate => candidate.match(order));
      if (lane) map.get(lane.key)!.push(order);
      else unassigned.push(order);
    }

    if (sortWithinLane) {
      for (const list of map.values()) list.sort(sortWithinLane);
    }

    return { byLane: map, orphans: unassigned };
  }, [orders, lanes, sortWithinLane]);

  return (
    <div data-orders-board={anchor} className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {lanes.map(lane => {
        const list = byLane.get(lane.key) ?? [];
        return (
          <section
            key={lane.key}
            data-orders-lane={lane.key}
            data-orders-lane-count={list.length}
            className="flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-gray-50/50 p-1.5 shadow-sm transition-all dark:border-gray-800/80 dark:bg-gray-900/40"
          >
            <header className="flex items-center justify-between gap-2 px-3.5 py-3">
              <span className="flex min-w-0 items-center gap-2.5">
                {lane.dotClass ? (
                  <span
                    className={`h-2.5 w-2.5 flex-none rounded-full ring-2 ring-white dark:ring-gray-900 ${lane.dotClass}`}
                    aria-hidden
                  />
                ) : null}
                <span className="truncate text-theme-sm font-bold text-gray-800 dark:text-white/90">
                  {lane.label}
                </span>
              </span>
              {/* ⚠️ El conteo del carril va en un nodo con ancla propia: es la
                  cifra que una guarda tiene que poder leer para comprobar que los
                  carriles suman el universo, y leerla del texto del encabezado
                  sería adivinar dónde acaba el rótulo. */}
              <span
                data-orders-lane-badge={lane.key}
                className="flex-none rounded-full bg-white px-2.5 py-0.5 text-theme-xs font-semibold tabular-nums text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-300"
              >
                {list.length}
              </span>
            </header>

            <div className="flex flex-1 flex-col gap-3 p-2">
              {list.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200/90 py-10 text-center dark:border-gray-800">
                  <p className="text-theme-xs font-medium text-gray-400 dark:text-gray-500">
                    {emptyLaneLabel}
                  </p>
                </div>
              ) : (
                list.map(order => (
                  <div
                    key={order.id}
                    onClick={() => onOpenOrder(order.id)}
                    data-order-row={order.number}
                    data-orders-board-card={order.number}
                    data-intent="orders.board.open"
                    className="group relative flex w-full cursor-pointer flex-col gap-3 rounded-2xl border border-gray-200/90 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-theme-md active:translate-y-0 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-500/50"
                  >
                    {renderCardBody(order)}
                  </div>
                ))
              )}
            </div>
          </section>
        );
      })}

      {/* ⚠️ El carril que no debería existir. Si aparece, los carriles no cubren
          el universo y hay órdenes que se estaban perdiendo entre las columnas:
          se pintan aquí, en tono de error, en vez de desaparecer. */}
      {orphans.length > 0 ? (
        <section
          data-orders-lane-orphans
          data-orders-lane-count={orphans.length}
          className="flex flex-col overflow-hidden rounded-xl border border-error-200 bg-error-50/40 dark:border-error-500/30 dark:bg-error-500/5"
        >
          <header className="flex items-center justify-between gap-2 border-b border-error-200 px-3.5 py-2.5 dark:border-error-500/30">
            <span className="text-theme-sm font-semibold text-error-600 dark:text-error-500">
              Sin carril
            </span>
            <span className="flex-none rounded-full bg-error-100 px-2 py-0.5 text-theme-xs font-bold tabular-nums text-error-600 dark:bg-error-500/20 dark:text-error-500">
              {orphans.length}
            </span>
          </header>
          <div className="flex flex-col gap-2 p-2.5">
            {orphans.map(order => (
              <button
                key={order.id}
                type="button"
                onClick={() => onOpenOrder(order.id)}
                data-order-row={order.number}
                className="flex w-full cursor-pointer flex-col gap-2.5 rounded-lg border border-error-200 bg-white p-3.5 text-left dark:border-error-500/30 dark:bg-gray-900"
              >
                {renderCardBody(order)}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default OrdersBoard;
