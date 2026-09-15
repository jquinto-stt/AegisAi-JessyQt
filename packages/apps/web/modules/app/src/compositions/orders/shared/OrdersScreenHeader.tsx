/**
 * Pedidos — Cabecera operativa de pantalla.
 * ===========================================
 *
 * El bloque que abre **cada** pantalla de trabajo: qué se está mirando, con qué
 * se acota, y —si toca— la alerta de lo que se está pasando de tiempo.
 *
 * ── Por qué una pieza y no una cabecera por vista ───────────────────────────
 *
 * Las cinco pantallas operativas necesitan exactamente lo mismo —título, una fila
 * de filtros y, cuando procede, una alerta—, y escribirlo cinco veces garantizaba
 * que la tercera tuviera otro espaciado y la quinta olvidara el estado vacío. Aquí
 * vive una sola definición de la cabecera; lo que cambia entre pantallas son **los
 * datos**, no la estructura.
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
 * ── Por qué la descripción es opcional, y normalmente no está ───────────────
 *
 * ⚠️ Todas las pantallas llevaban una o dos frases explicando **qué es la
 * pantalla** —"Todo lo que ha entrado y aún no se ha empezado a trabajar. Aquí se
 * valida el pedido y se asume —o no— el compromiso operativo."—. Eso no es
 * información: es una explicación de la propia interfaz, y la interfaz ya se
 * explica con su estructura. El título dice el nombre, la barra de fases dice qué
 * se puede acotar, la tabla dice qué hay y la alerta dice qué va tarde.
 *
 * ⚠️ Una descripción que compite con el título empuja hacia abajo lo único que
 * aquí se viene a hacer, que es leer y mover órdenes. Por eso el prop es
 * **opcional** y ninguna de las pantallas de trabajo lo pasa: sobrevive para el
 * caso en que una pantalla necesite decir algo que **no** se pueda deducir de lo
 * que tiene delante. Si dudas, no lo pongas.
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
  /**
   * Contexto que **no** se puede deducir de la interfaz.
   *
   * ⚠️ Opcional a propósito, y ausente en todas las pantallas de trabajo: ver el
   * porqué en la cabecera del archivo. No es un hueco que rellenar — es la puerta
   * para el caso raro.
   */
  description?: string;
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
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 className="text-theme-xl font-bold tracking-tight text-secondary-600 dark:text-white">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-3xl text-theme-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          ) : null}
        </div>

        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>

      {/*
       * ⚠️ El hueco de avisos es **una fila**, no una pila. En Programados conviven
       * dos —el de programadas vencidas y el de demora—, y apilados a todo lo
       * ancho empujaban la tabla más de cien píxeles hacia abajo antes de que el
       * operador viera una sola orden. En fila, cada uno ocupa la mitad; y con un
       * único aviso —Bandeja, Alistamiento y Despacho— ocupa el ancho entero, que
       * es lo que se quiere.
       *
       * ⚠️ `empty:hidden` no es cosmético: Programados monta el fragmento de avisos
       * siempre, y con los dos interruptores apagados el contenedor quedaría vacío
       * pero seguiría contando como un hijo del `flex` de la cabecera, metiendo su
       * `gap` y un hueco fantasma. Con `:empty` desaparece cuando no hay nada.
       */}
      {alert ? (
        <div className="flex flex-col gap-3 empty:hidden lg:flex-row lg:items-start">
          {alert}
        </div>
      ) : null}
      {filters}
    </header>
  );
}

export default OrdersScreenHeader;
