/**
 * Pedidos — El movimiento recién ocurrido, en la pantalla que lo provocó.
 * ========================================================================
 *
 * Cada pantalla de trabajo necesita recordar **el último cambio de estado** que se
 * hizo desde ella, para poder confirmarlo con `OrdersMovementBand` (§27). Este
 * hook es esa memoria, escrita una vez.
 *
 * ── Por qué el movimiento vive en la pantalla y no en el contexto ───────────
 *
 * ⚠️ Es un hecho **de la sesión de trabajo**, no del dominio: "acabo de cerrar
 * esta orden desde aquí". Guardarlo junto a las órdenes lo persistiría, y al
 * recargar aparecería una confirmación de algo que ocurrió ayer. La orden ya
 * cambió de estado —eso sí es dominio—; lo que se recuerda aquí es sólo el aviso.
 *
 * ⚠️ Y por eso también es **de una sola pantalla**: si el operador cierra una
 * orden desde Despacho y luego navega a Historial, la franja no debe seguirlo. La
 * confirmación pertenece al sitio donde se hizo el trabajo.
 */

import { useCallback, useState } from "react";

import type { OrderMovement } from "./OrdersMovementBand";

export interface OrderMovementValue {
  /** El último movimiento, o `null` si no hay nada que confirmar. */
  movement: OrderMovement | null;
  /** Registra un movimiento recién ejecutado. */
  report: (movement: OrderMovement) => void;
  /** Descarta la confirmación (la franja lleva su propio botón). */
  dismiss: () => void;
}

export function useOrderMovement(): OrderMovementValue {
  const [movement, setMovement] = useState<OrderMovement | null>(null);

  const report = useCallback((next: OrderMovement) => setMovement(next), []);
  const dismiss = useCallback(() => setMovement(null), []);

  return { movement, report, dismiss };
}
