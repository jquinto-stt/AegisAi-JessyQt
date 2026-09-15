/**
 * Pedidos — Cabecera operativa de pantalla.
 * ===========================================
 *
 * El bloque que abre **cada** pantalla de trabajo: qué se está mirando, con qué
 * se acota, y —si toca— la alerta de lo que se está pasando de tiempo.
 *
 * ── Por qué una pieza y no una cabecera por vista ───────────────────────────
 *
 * Las cinco pantallas operativas necesitan exactamente lo mismo —título,
 * descripción, una fila de filtros y, cuando procede, una alerta—, y escribirlo
 * cinco veces garantizaba que la tercera tuviera otro espaciado y la quinta
 * olvidara el estado vacío. Aquí vive una sola definición de la cabecera; lo que
 * cambia entre pantallas son **los datos**, no la estructura.
 *
 * ── Por qué aquí NO hay cifras ──────────────────────────────────────────────
 *
 * ⚠️ Esta cabecera llegó a pintar cuatro tarjetas de métricas, y era un error de
 * diseño, no un exceso de contenido. Las cuatro cifras eran **las mismas en las
 * cinco pantallas** —"Por validar / Confirmadas / Espera larga / En bandeja"
 * aparecía tal cual encima de Alistamiento y de Despacho—, así que no respondían
 * a la pregunta de ninguna fase: eran un Dashboard metido a la fuerza en cada
 * pestaña, ocupando la franja más valiosa de la pantalla y empujando hacia abajo
 * lo único que allí se opera, que es la lista.
 *
 * ⚠️ Una cifra que no se puede accionar donde se muestra es ruido. El sitio de
 * las métricas es el **Panel de Pedidos**, una pantalla propia (§ panel), donde
 * cada número lleva a la lista que lo resuelve. Aquí queda lo que sí es de esta
 * pantalla: su identidad, su alerta de demora y sus filtros.
 *
 * ── Qué NO hace ────────────────────────────────────────────────────────────
 *
 * ⚠️ No decide qué estados mira cada pantalla: eso viene de fuera, de
 * `order-operations`. La cabecera es presentación pura.
 */

import type { ReactNode } from "react";

export interface OrdersScreenHeaderProps {
  /** Nombre de la fase: "Bandeja de entrada", "Mesa de alistamiento"… */
  title: string;
  /** Qué se opera aquí, en una frase. */
  description: string;
  /**
   * Control que se alinea a la derecha del título.
   *
   * ⚠️ Existe para el **conmutador de vista** de la Bandeja (lista ⇄ tablero). Es
   * un ajuste de *cómo* se mira esta pantalla —no de qué se filtra—, así que su
   * sitio es la cabecera y no la barra de filtros: mezclarlo con los filtros haría
   * pensar que cambia el conjunto de órdenes.
   */
  aside?: ReactNode;
  /** Fila de filtros de la pantalla. */
  filters?: ReactNode;
  /** Alerta semántica (órdenes estancadas, programadas vencidas…). */
  alert?: ReactNode;
}

export function OrdersScreenHeader({
  title,
  description,
  aside,
  filters,
  alert,
}: OrdersScreenHeaderProps) {
  return (
    <header data-orders-screen-header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 className="text-theme-xl font-bold tracking-tight text-secondary-600 dark:text-white">
            {title}
          </h2>
          <p className="mt-1 max-w-3xl text-theme-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>

        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>

      {alert}
      {filters}
    </header>
  );
}

export default OrdersScreenHeader;
