/**
 * Pedidos — Tabla operativa compartida.
 * ======================================
 *
 * La superficie de listado que comparten Bandeja, Despacho, Programados e
 * Historial. Es una tabla **de sólo lectura y de un solo acceso**: la fila abre el
 * detalle, y nada más.
 *
 * ── La regla que esta tabla defiende (§13) ──────────────────────────────────
 *
 * ⚠️ **Ni un botón de acción dentro de la fila.** Las acciones dependen del estado
 * real de la orden (§14) y viven en un solo sitio —el detalle, que las deriva de
 * `orderActionsFor`—. Si cada fila ofreciera su propio "Confirmar", habría tantas
 * copias de la máquina de estados como pantallas, y dos filas de la misma orden
 * podrían ofrecer acciones distintas. Por eso aquí **no se importa `Button`**: la
 * ausencia es la garantía, y la guarda del módulo la comprueba.
 *
 * ── Sobre la ordenación accesible ───────────────────────────────────────────
 *
 * ⚠️ `aria-sort` pertenece al `<th>`, y el `TableCell` del catálogo no reenvía
 * props nativas, así que no hay dónde ponerlo. En vez de abandonar el componente
 * del catálogo, la dirección viaja en el **nombre accesible** del propio botón
 * ("Ordenar por Total, descendente"): el patrón es válido y quien usa lector de
 * pantalla obtiene la misma información. Además se emite `data-order-sort` con la
 * dirección, que es lo que las guardas leen.
 */

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/elements";
import type { Order } from "@/contracts/order.contract";

/** Una columna de la tabla. La de identidad la pinta la propia tabla. */
export interface OrdersTableColumn {
  key: string;
  label: string;
  /** ¿Se puede ordenar por esta columna? */
  sortable?: boolean;
  /** Alineación. Los importes y los conteos van a la derecha. */
  align?: "left" | "right";
  className?: string;
}

export interface OrdersTableSort {
  key: string;
  direction: "asc" | "desc";
}

export interface OrdersTableProps {
  orders: readonly Order[];
  /** Columnas propias de la pantalla, **sin** la de identidad. */
  columns: OrdersTableColumn[];
  /** Cómo se pinta cada celda. Recibe la orden y la clave de columna. */
  renderCell: (order: Order, columnKey: string) => ReactNode;
  /** Abre el detalle. Es el **único** acceso que ofrece una fila. */
  onOpenOrder: (orderId: string) => void;
  /** Valor de `data-orders-table`, para distinguir la superficie en las guardas. */
  anchor?: string;
  /** Línea secundaria bajo el número (por defecto, el solicitante). */
  secondaryLine?: (order: Order) => ReactNode;
  /** Selección múltiple, cuando la pantalla la ofrece. */
  selectable?: boolean;
  selectedIds?: readonly string[];
  onToggleRow?: (orderId: string) => void;
  onToggleAll?: () => void;
  sort?: OrdersTableSort;
  onSortChange?: (key: string) => void;
  /** Pie de tabla (paginación, resumen…). */
  footer?: ReactNode;
  /** Clases del contenedor, para pantallas que necesitan la tabla más alta. */
  className?: string;
}

const HEAD_CLASS =
  "px-4 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400";

export function OrdersTable({
  orders,
  columns,
  renderCell,
  onOpenOrder,
  anchor,
  secondaryLine,
  selectable = false,
  selectedIds = [],
  onToggleRow,
  onToggleAll,
  sort,
  onSortChange,
  footer,
  className = "",
}: OrdersTableProps) {
  const allSelected = selectable && orders.length > 0 && selectedIds.length === orders.length;

  return (
    <div
      data-orders-table={anchor}
      className={`overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] ${className}`}
    >
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow className="border-b-0">
              {selectable && (
                <TableCell header className={`${HEAD_CLASS} w-10`}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => onToggleAll?.()}
                    aria-label="Seleccionar todas las órdenes"
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-brand-500 dark:border-gray-600"
                  />
                </TableCell>
              )}

              {/* Identidad: número visible + línea secundaria. Es la celda que
                  abre el detalle, y por eso lleva el ancla `data-order-row`. */}
              <TableCell header className={HEAD_CLASS}>
                Orden
              </TableCell>

              {columns.map(column => (
                <TableCell
                  key={column.key}
                  header
                  className={`${HEAD_CLASS} ${column.align === "right" ? "text-right" : "text-left"} ${column.className ?? ""}`}
                >
                  {column.sortable && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(column.key)}
                      data-order-sort={column.key}
                      data-order-sort-direction={sort?.key === column.key ? sort.direction : "none"}
                      aria-label={
                        sort?.key === column.key
                          ? `Ordenar por ${column.label}, ${sort.direction === "asc" ? "ascendente" : "descendente"}. Presiona para invertir.`
                          : `Ordenar por ${column.label}`
                      }
                      className={`inline-flex cursor-pointer items-center gap-1 font-medium transition-colors hover:text-gray-800 dark:hover:text-white ${
                        column.align === "right" ? "flex-row-reverse" : ""
                      }`}
                    >
                      {column.label}
                      {sort?.key === column.key ? (
                        sort.direction === "asc" ? (
                          <ArrowUp className="h-3 w-3" aria-hidden />
                        ) : (
                          <ArrowDown className="h-3 w-3" aria-hidden />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-40" aria-hidden />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {orders.map(order => (
              <TableRow key={order.id} className="border-b-0 hover:bg-gray-50/70 dark:hover:bg-white/[0.02]">
                {selectable && (
                  <TableCell className="w-10 px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(order.id)}
                      onChange={() => onToggleRow?.(order.id)}
                      aria-label={`Seleccionar la orden ${order.number}`}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-brand-500 dark:border-gray-600"
                    />
                  </TableCell>
                )}

                <TableCell className="px-4 py-4">
                  {/* ⚠️ `<button>` **nativo**, no `Button` del catálogo: §13
                      prohíbe acciones en la fila y este control no es una acción
                      sobre la orden —es el acceso al detalle—, pero además el
                      `Button` del catálogo no reenviaría el `data-order-row` que
                      las guardas necesitan para localizar la fila. */}
                  <button
                    type="button"
                    onClick={() => onOpenOrder(order.id)}
                    data-order-row={order.number}
                    data-intent="orders.table.open"
                    className="cursor-pointer text-left"
                  >
                    <span className="block text-theme-sm font-semibold text-secondary-600 hover:text-brand-500 dark:text-white dark:hover:text-brand-400">
                      {order.number}
                    </span>
                    <span className="mt-0.5 block truncate text-theme-xs text-gray-500 dark:text-gray-400">
                      {secondaryLine ? secondaryLine(order) : order.requester.name}
                    </span>
                  </button>
                </TableCell>

                {columns.map(column => (
                  <TableCell
                    key={column.key}
                    className={`px-4 py-4 ${column.align === "right" ? "text-right" : "text-left"} ${column.className ?? ""}`}
                  >
                    {renderCell(order, column.key)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {footer && (
        <div className="border-t border-gray-100 px-4 py-3 dark:border-white/[0.05]">{footer}</div>
      )}
    </div>
  );
}

export default OrdersTable;
