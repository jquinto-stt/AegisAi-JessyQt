/**
 * Pedidos — Recorrer la cola con el teclado.
 * ==========================================
 *
 * ⚠️ Existe porque el detalle **dejó de ser un modal**. Mientras fue un diálogo que
 * tapaba la lista, abrir y cerrar era el único camino, y trabajar doce órdenes
 * eran doce aperturas con su cierre: el operador no "trabajaba una cola", abría
 * fichas. Con el detalle anclado al lado de la lista, lo que falta es poder
 * **avanzar sin soltar el teclado**, que es lo que convierte la lista en una cola.
 *
 * ⚠️ No secuestra el teclado. Si el foco está en un campo de texto —el buscador de
 * la barra de filtros— o hay modificadores pulsados, no hace nada: una flecha
 * abajo dentro del buscador tiene que mover el cursor, no cambiar de orden. Es la
 * diferencia entre un atajo y un estorbo.
 *
 * ⚠️ No da la vuelta en los bordes. Al llegar a la última orden, flecha abajo no
 * vuelve a la primera: saltar de punta a punta de una cola de cuarenta sin querer
 * es peor que no poder hacerlo, porque el operador pierde el sitio y no se entera.
 *
 * ⚠️ Y sólo actúa con el detalle **abierto** (`openId !== null`). Sin esto, las
 * flechas moverían una selección invisible mientras el operador cree que está
 * desplazando la página.
 */

import { useEffect, useMemo, useRef } from "react";

/** Dónde está la orden abierta dentro de la lista. */
export interface OrderWalk {
  /** Posición 1-based de la orden abierta, o `0` si no está en la lista. */
  position: number;
  /** Cuántas órdenes tiene la lista ahora mismo. */
  total: number;
}

export function useOrderWalk(
  ids: readonly string[],
  openId: string | null,
  onOpen: (orderId: string) => void
): OrderWalk {
  /**
   * ⚠️ Los ids se leen por referencia y **no** como dependencia del efecto: el
   * array se reconstruye en cada render (viene de un `useMemo` sobre los filtros),
   * así que ponerlo como dependencia desengancharía y reengancharía el listener
   * constantemente. Lo que cambia de verdad entre pulsaciones es la orden abierta.
   */
  const idsRef = useRef(ids);
  idsRef.current = ids;

  useEffect(() => {
    if (openId === null) return;

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) {
        return;
      }

      const step =
        e.key === "ArrowDown" || e.key === "j"
          ? 1
          : e.key === "ArrowUp" || e.key === "k"
            ? -1
            : 0;
      if (step === 0) return;

      const list = idsRef.current;
      const at = list.indexOf(openId);
      if (at === -1) return;
      const next = list[at + step];
      if (!next) return;

      e.preventDefault();
      onOpen(next);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openId, onOpen]);

  return useMemo(() => {
    const at = openId === null ? -1 : ids.indexOf(openId);
    return { position: at === -1 ? 0 : at + 1, total: ids.length };
  }, [ids, openId]);
}

export default useOrderWalk;
