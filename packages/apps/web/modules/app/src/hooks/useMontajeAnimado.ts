import { useLayoutEffect, useRef, useState } from "react";
import { prefiereMenosMovimiento } from "@/utils";

/**
 * Duración de la salida del menú, en ms.
 *
 * **Debe coincidir con `--animate-salida-menu` en `css/theme.css`.** El hook
 * mantiene el nodo montado exactamente este tiempo mientras la animación corre;
 * si divergen, o el panel desaparece antes de terminar de desvanecerse, o se
 * queda invisible en el DOM ocupando sitio.
 */
export const DURACION_SALIDA_MS = 120;

/**
 * @kgId 7f1c9a4e2b83
 */
export interface MontajeAnimado {
  /**
   * Si el nodo debe estar en el DOM.
   *
   * `false` solo cuando está cerrado **y** ya terminó de salir. Es el valor que
   * debe gobernar el `return null` temprano.
   */
  montado: boolean;

  /**
   * Si el nodo está en su **ventana de salida**.
   *
   * `true` significa que ya se cerró pero sigue montado para que se vea la
   * animación de salida. Es lo que elige la clase: `saliendo` → clase de salida;
   * `false` → clase de entrada.
   */
  saliendo: boolean;
}

/**
 * `useMontajeAnimado` — mantiene un nodo montado el tiempo justo para que su
 * animación de salida se vea.
 *
 * ## El problema que resuelve
 *
 * Un overlay que hace `if (!abierto) return null` no puede animar su salida:
 * cuando el padre cambia el estado, React lo arranca del árbol en el mismo
 * commit y no queda nodo que animar. La única forma es que el nodo **sobreviva**
 * al cambio de estado durante la animación, y eso es un estado local que va por
 * detrás de la prop.
 *
 * Ese estado local es lo que `ChatDrawer.tsx` resolvía a mano. Este hook es esa
 * misma idea, pero además:
 *
 * - **La entrada no necesita `requestAnimationFrame`.** Una animación por
 *   `@keyframes` se dispara en cuanto la clase se aplica al nodo, y el estado
 *   inicial lo garantiza `animation-fill-mode: backwards`. El
 *   `requestAnimationFrame` de `ChatDrawer` existe porque allí se usa una
 *   **transición** (`translate-x-full → translate-x-0`), y una transición sí
 *   necesita un estado previo ya pintado desde el que interpolar. Al animar con
 *   `@keyframes` esa ceremonia sobra. Es el mismo motivo por el que
 *   `.paneo-entrada` se aplica directamente, sin fotograma de espera.
 * - **La ventana de salida se abre antes de pintar** (`useLayoutEffect`), no
 *   después. Ver la nota dentro del efecto.
 *
 * ## Uso
 *
 * ```tsx
 * const { montado, saliendo } = useMontajeAnimado(isOpen);
 * if (!montado) return null;
 *
 * return (
 *   <div className={saliendo ? "animate-salida-menu" : "animate-entrada-menu"}>
 *     {children}
 *   </div>
 * );
 * ```
 *
 * Si el consumidor **no** tiene animación de salida, no use este hook: basta con
 * `if (!abierto) return null` y aplicar la clase de entrada. Pedir aquí una
 * ventana de salida que no se va a animar solo retrasa el desmontaje.
 *
 * @param abierto Estado que gobierna la visibilidad, normalmente una prop.
 * @param duracionSalidaMs Cuánto sobrevive el nodo tras cerrarse. Por defecto
 *   `DURACION_SALIDA_MS`, que es la salida del menú.
 *
 * @see {@link prefiereMenosMovimiento} — Por qué el retardo se anula.
 * @see `pages/conversaciones/components/ChatDrawer.tsx` — El original, escrito
 *   a mano antes de que existiera este hook.
 * @kgId 3d0b5c81af47
 */
export function useMontajeAnimado(
  abierto: boolean,
  duracionSalidaMs: number = DURACION_SALIDA_MS,
): MontajeAnimado {
  const [saliendo, setSaliendo] = useState(false);

  // ¿Llegó a estar abierto alguna vez? Sin esto, montar el hook ya cerrado
  // abriría una ventana de salida para un nodo que nadie vio nunca: el panel
  // aparecería solo para desvanecerse.
  const haEstadoAbierto = useRef(abierto);

  // `useLayoutEffect` y NO `useEffect`, y esto es lo que hace que la salida se
  // vea. Con `useEffect` el render en que `abierto` pasa a `false` ya se habría
  // pintado: `montado` vale `false` en ese render, el consumidor devuelve `null`
  // y el nodo desaparece. El efecto correría después, reabriría la ventana y el
  // panel volvería como un nodo **nuevo** —nunca visto— para desvanecerse, con
  // un parpadeo por medio. Con `useLayoutEffect` la ventana se abre antes de
  // pintar y el nodo original nunca llega a quitarse.
  useLayoutEffect(() => {
    if (abierto) {
      haEstadoAbierto.current = true;
      setSaliendo(false);
      return;
    }

    // Cerrado y nunca se abrió: no hay nada que sacar.
    if (!haEstadoAbierto.current) return;

    // Con `prefers-reduced-motion` la animación de salida no corre (la
    // neutraliza `css/base.css`), pero el nodo seguiría montado y **visible**
    // durante el retardo: el panel se quedaría quieto y entero 120 ms y luego
    // desaparecería de golpe. Es peor que no animar. Si no hay movimiento que
    // esperar, no se espera nada.
    const espera = prefiereMenosMovimiento() ? 0 : duracionSalidaMs;
    if (espera === 0) {
      setSaliendo(false);
      return;
    }

    setSaliendo(true);
    const t = setTimeout(() => setSaliendo(false), espera);
    return () => clearTimeout(t);
  }, [abierto, duracionSalidaMs]);

  return { montado: abierto || saliendo, saliendo };
}
