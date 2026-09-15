/**
 * Pedidos — Contrato común de las pantallas de trabajo.
 * ======================================================
 *
 * Lo mínimo que **toda** pantalla operativa recibe de su shell, en un solo sitio.
 *
 * ⚠️ Existe para que las cinco vistas no declaren cinco interfaces casi iguales
 * que se van separando con el tiempo: hoy son cuatro props, y el día que haga
 * falta una quinta —un filtro inicial, una orden a resaltar— entra aquí y las
 * cinco la reciben sin tocar cinco archivos.
 *
 * ── Por qué el movimiento lo posee el shell y no cada vista ─────────────────
 *
 * ⚠️ El detalle de la orden es **una sola instancia** y vive en `OrdersModule`
 * (§14). Es ahí donde se ejecuta la transición, así que es ahí donde nace el hecho
 * "esta orden pasó de X a Y". Si cada vista guardara su propio movimiento, el
 * cambio hecho en el detalle no tendría forma de llegar a la pantalla que lo
 * muestra: el drawer no conoce a la vista activa. Con el estado en el shell, el
 * drawer reporta, el shell guarda, y la vista activa pinta — una sola cadena.
 *
 * ⚠️ Ninguna de estas props navega ni abre nada por su cuenta. `onOpenOrder` abre
 * el detalle; y `onSeeMovement` **pide** ir a otra pantalla, sin saber cuál es ni
 * cómo se llega: quién decide es `OrdersModule`, que es quien posee la navegación.
 */

import type { OrderMovement } from "./OrdersMovementBand";

export interface OperationalViewProps {
  /** Abre el detalle de una orden. */
  onOpenOrder: (orderId: string) => void;
  /**
   * Pide ir a la pantalla donde vive ahora una orden recién movida (§27).
   *
   * ⚠️ Sin esto, la confirmación de un movimiento diría "pasó de Lista a
   * Entregada" y dejaría al operador sin camino hacia la orden, que ya no está en
   * la lista que tenía delante.
   */
  onSeeMovement?: (movement: OrderMovement) => void;
  /** El último cambio de estado hecho desde el detalle, o `null`. */
  movement: OrderMovement | null;
  /** Descarta la confirmación del movimiento. */
  onDismissMovement: () => void;
  /**
   * La fase con la que la pantalla debe abrir, si alguien la pidió (§ Panel).
   *
   * ⚠️ Es `string` y no la unión de fases de la vista porque **cada vista tiene la
   * suya** y el prop lo entrega el shell, que no las conoce. La conversión a la
   * unión concreta la hace la vista, que es quien declara sus fases; y el valor no
   * es arbitrario: sale de `attentionItems()`, y la guarda del módulo comprueba
   * que cada valor que emite es una fase que la pantalla destino declara de
   * verdad. Un valor inventado no filtraría nada —en silencio—, que es justo el
   * fallo que esa comprobación existe para impedir.
   *
   * ⚠️ Sólo se lee **al montar**: la vista se remonta al cambiar de sección, así
   * que llegar aquí implica una pantalla nueva. Una vez dentro, manda el control
   * de fases del operador.
   */
  initialPhase?: string;
}
