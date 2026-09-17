// ═══════════════════════════════════════════════════════════════════════════
// ESTADO VACÍO DE UN GRÁFICO
// ═══════════════════════════════════════════════════════════════════════════
//
// Cuando una ventana no tiene datos, la tentación es dibujar una curva de
// ejemplo para que el gráfico "se vea". Eso es mentir: en un panel de negocio el
// dueño no puede distinguir de un vistazo una serie inventada de una real, y
// toma decisiones con ella.
//
// Este componente existe para que la alternativa honesta sea también la más
// cómoda de usar: en vez de un lienzo vacío o de una onda de relleno, un marco
// punteado que dice qué falta.
//
// Es compartido a propósito: Analítica e Inicio necesitan exactamente lo mismo,
// y tener dos copias era la forma más fácil de que una de las dos volviera a
// rellenarse con datos falsos.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @param que Qué falta, en singular y en minúscula ("pedidos", "actividad").
 * @param alto Alto en píxeles. Conviene que coincida con el del gráfico que
 *             sustituye, para que la tarjeta no dé un salto al cambiar de estado.
 */
export const SinDatos = ({ que, alto = 220 }: { que: string; alto?: number }) => (
  <div
    style={{ height: alto }}
    className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-500"
  >
    Sin {que} en el periodo seleccionado.
  </div>
);

export default SinDatos;
