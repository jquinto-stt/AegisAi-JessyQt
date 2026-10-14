import { useLayoutEffect, useRef } from "react";
import { animate, stagger } from "animejs";

import { PASO_ESCALONADO_MS, prefiereMenosMovimiento } from "@/utils";
import { CURVA_ANIME } from "@/utils/anime";

// ═══════════════════════════════════════════════════════════════════════════
// ENTRADA ESCALONADA — anime.js, con la guarda del proyecto
// ═══════════════════════════════════════════════════════════════════════════

export interface EntradaEscalonadaOpciones {
  /**
   * Cuánto recorrido vertical hacen los elementos, en px, desde abajo.
   *
   * Es el parámetro que decide si la entrada **se nota**. Los tokens de
   * `css/theme.css` recorren 4–8 px y por eso el movimiento de este producto se
   * percibía como «no hay animación»: a 6 px el ojo no lee desplazamiento, lee
   * un cambio de opacidad. Aquí el defecto es 18 px.
   */
  desde?: number;
  /** Duración de cada elemento, en ms. */
  duracionMs?: number;
  /**
   * Separación entre un elemento y el siguiente. Por defecto el paso
   * compartido (`PASO_ESCALONADO_MS`), para que el escalonado por JS y el
   * escalonado por CSS se sientan igual.
   */
  pasoMs?: number;
  /** Retardo global antes del primer elemento. */
  retardoMs?: number;
  /** Selector relativo al contenedor. Por defecto, sus hijos directos. */
  selector?: string;
}

/**
 * `useEntradaEscalonada` — hace entrar los hijos de un contenedor en cascada.
 *
 * ## Qué aporta que no aporte el CSS
 *
 * El proyecto ya escala entradas por CSS con `animation-delay` y
 * `retardoEscalonado` (ver `KpiCard` y las tarjetas del tablero), y para una
 * lista plana eso es suficiente y más barato. Esto existe para el caso en que
 * **la cascada tiene que ser una sola cosa**: cuando el contenedor es una
 * rejilla cuyo número de hijos cambia con el estado (las columnas del tablero,
 * que son 5 o 3 según el pipeline configurado), el CSS obliga a repartir
 * `animation-delay` por índice desde la vista, y el ritmo se recalcula en cada
 * render. Aquí el reparto lo hace `stagger`, que además permite derivar el
 * retardo del índice real y no de una constante por elemento.
 *
 * ## Las tres trampas que resuelve, y por qué están resueltas así
 *
 * 1. **El destello del primer fotograma.** Una animación de entrada empieza por
 *    un estado que el elemento NO tiene todavía: si el efecto corre después de
 *    pintar, el usuario ve un fotograma con todo en su sitio y de golpe el salto
 *    al estado inicial. Por eso el efecto es `useLayoutEffect` (corre antes de
 *    que el navegador pinte) **y** escribe el estado inicial a mano antes de
 *    crear la animación. Las dos cosas: el `from` de anime.js no garantiza estar
 *    aplicado en el fotograma en que se crea la animación, y fiarse de él es
 *    exactamente cómo se cuela el destello.
 * 2. **`prefers-reduced-motion`.** La guarda va lo PRIMERO, antes de tocar
 *    anime.js. El CSS del proyecto se neutraliza solo (la guarda enumerada de
 *    `css/base.css`), pero una animación por JS no pasa por ahí: sin esta línea,
 *    quien pidió que no se moviera nada vería moverse esto.
 * 3. **La reversión.** El `cleanup` deshace las dos cosas —la animación y los
 *    estilos en línea que se escribieron a mano—. Deshacer solo la animación
 *    dejaría `opacity: 0` pegado en el nodo, y con el doble montaje de
 *    `StrictMode` eso es un elemento invisible en producción.
 *
 * ## Lo que NO hace
 *
 * No anima en cada render ni cuando cambian los hijos: corre **una vez, al
 * montar**. Es deliberado. Reanimar cuando llegan datos de Supabase haría que la
 * columna parpadease cada vez que entra un pedido, y ese es justo el defecto que
 * `VENTANA_ENTRADA_MS` documenta en el tablero.
 *
 * @param opciones Ver `EntradaEscalonadaOpciones`.
 * @returns El `ref` que hay que colgar del contenedor.
 */
export function useEntradaEscalonada<T extends HTMLElement>(
  opciones: EntradaEscalonadaOpciones = {},
): React.MutableRefObject<T | null> {
  const {
    desde = 18,
    duracionMs = 520,
    pasoMs = PASO_ESCALONADO_MS,
    retardoMs = 0,
    selector = ":scope > *",
  } = opciones;

  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const contenedor = ref.current;
    if (!contenedor) return;

    // 1. La guarda, antes de tocar la librería.
    if (prefiereMenosMovimiento()) return;

    const elementos = Array.from(contenedor.querySelectorAll<HTMLElement>(selector));
    if (elementos.length === 0) return;

    // 2. El estado inicial, escrito a mano y antes de pintar. Ver la trampa 1.
    for (const el of elementos) {
      el.style.opacity = "0";
      el.style.transform = `translate3d(0, ${desde}px, 0)`;
    }

    const animacion = animate(elementos, {
      opacity: [0, 1],
      translateY: [desde, 0],
      duration: duracionMs,
      delay: stagger(pasoMs, { start: retardoMs }),
      ease: CURVA_ANIME,
    });

    // 3. La reversión deshace las dos cosas. Ver la trampa 3.
    return () => {
      animacion.revert();
      for (const el of elementos) {
        el.style.opacity = "";
        el.style.transform = "";
      }
    };
  }, [desde, duracionMs, pasoMs, retardoMs, selector]);

  return ref;
}
