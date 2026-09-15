/**
 * Pedidos — Estado vacío de una etapa.
 * ======================================
 *
 * Qué se ve cuando una fase **no tiene órdenes**.
 *
 * ── Por qué no es un hueco con un cero ──────────────────────────────────────
 *
 * Un vacío sin explicación deja al operador sin saber si el sistema está roto, si
 * el filtro es demasiado estrecho o si de verdad no hay trabajo. Por eso cada
 * vacío dice tres cosas: **qué** falta, **por qué** puede faltar y **qué hacer**
 * al respecto. Y por eso el rótulo es distinto en cada pantalla —"Nada en
 * alistamiento" y "Sin órdenes por validar" son situaciones diferentes aunque
 * ambas sean listas vacías—.
 *
 * ── Sobre el catálogo ──────────────────────────────────────────────────────
 *
 * ⚠️ El catálogo de Elements **no tiene** un componente de estado vacío (se
 * verificó tres veces en el flujo de `ui_refine`). Lo más cercano es `Alert`, que
 * es un mensaje de severidad y no un vacío de lista: usarlo aquí diría que algo
 * fue mal cuando en realidad la cola está simplemente limpia. Así que se compone
 * con `Card` —que sí existe y es la superficie correcta— más una pieza de icono y
 * un `Button` opcional. Es composición de átomos del catálogo, no una
 * reimplementación de uno existente.
 */

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/elements";

export interface OrdersEmptyStateProps {
  icon: LucideIcon;
  /** Qué no hay. Frase corta, en positivo cuando se pueda. */
  title: string;
  /**
   * Por qué puede estar vacío, y qué lo llenaría.
   *
   * ⚠️ Es **opcional**, y omitirla es la respuesta correcta cuando el vacío lo
   * causó un filtro: ahí el título ya dice que nada coincide y el botón ya dice
   * qué hacer, así que una frase más sólo repite el botón con otras palabras.
   * Se pinta únicamente cuando aporta el *porqué* que ni el título ni la acción
   * dan —"todo lo que entró ya tiene un compromiso asumido"—, que es
   * información, no relleno (§15).
   */
  description?: string;
  /** Salida opcional: limpiar filtros, ir a otra fase… */
  action?: ReactNode;
  /** Gancho estable para las guardas, por pantalla (`data-orders-empty="…"`). */
  anchor?: string;
}

export function OrdersEmptyState({
  icon: Icon,
  title,
  description,
  action,
  anchor,
}: OrdersEmptyStateProps) {
  return (
    <Card
      // ⚠️ `Card` reenvía props nativas (`CardProps extends HTMLAttributes<HTMLDivElement>`),
      // así que el ancla viaja con el componente. Cuando `anchor` es `undefined`,
      // React omite el atributo en vez de pintar un valor vacío.
      data-orders-empty={anchor}
      className="flex flex-col items-center justify-center gap-3 border-dashed bg-transparent py-16 text-center dark:bg-transparent"
    >
      {/* Tile de icono: el mismo lenguaje que usan las tarjetas de canal y el
          widget del Dashboard, para que un vacío no parezca otra aplicación. */}
      <span className="flex size-12 items-center justify-center rounded-[10.5px] bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
        <Icon className="size-6" aria-hidden />
      </span>

      <div className="max-w-md">
        <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{title}</p>
        {description ? (
          <p className="mt-1 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {description}
          </p>
        ) : null}
      </div>

      {action}
    </Card>
  );
}

export default OrdersEmptyState;
