import type { ReactNode } from "react";

import { cn } from "@/utils";

export interface SkeletonProps {
  /**
   * La FORMA del hueco: alto, ancho y radio. El componente no impone ninguna.
   *
   * Es deliberado: un esqueleto que decide su propia forma sirve para un sitio
   * y miente en todos los demás. La forma la sabe quien conoce el contenido que
   * va a llegar, y ese es el consumidor.
   */
  className?: string;
}

/**
 * Element: Skeleton — el hueco de un contenido que todavía no ha llegado.
 *
 * ## Por qué existe, y qué sustituye
 *
 * Hasta ahora el proyecto resolvía una carga con **texto**: «Cargando
 * catálogo…» en el centro de un hueco de 16 rem. Eso tiene tres defectos
 * medibles y ninguno es de gusto:
 *
 *   1. **No dice cuánto falta.** Un texto centrado es igual de probable con 1
 *      fila por llegar que con 200.
 *   2. **No dice qué llega.** El usuario no sabe si va a ver una tabla, una
 *      rejilla de tarjetas o un formulario.
 *   3. **Mueve la página.** Cuando el contenido entra, todo salta de sitio
 *      porque el hueco reservado no tenía la forma del contenido.
 *
 * Un esqueleto resuelve las tres: reserva el alto exacto —el salto desaparece—,
 * muestra la forma de lo que viene, y el barrido dice que sigue en marcha.
 *
 * ## El barrido va en CSS, no en anime.js
 *
 * Es un bucle infinito y no depende de ningún estado: el motor CSS lo hace sin
 * coste de JS y sin mantener un objeto de animación vivo por cada bloque —una
 * rejilla de esqueletos son doce. anime.js se queda para lo que el CSS no sabe
 * hacer: secuencias, escalonados calculados y entradas medidas.
 *
 * Y la guarda de accesibilidad se hereda sola: `--animate-brillo` está en la
 * lista enumerada de `css/base.css`, así que con `prefers-reduced-motion` queda
 * el bloque gris —que es la información— y desaparece el brillo.
 *
 * @example
 * ```tsx
 * <Skeleton className="h-4 w-32 rounded-md" />
 * <Skeleton className="h-40 w-full rounded-2xl" />
 * ```
 *
 * @see {@link SkeletonGrupo} — Para un conjunto de esqueletos que anuncian una
 *   sola carga a un lector de pantalla.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <span
    // Decorativo: quien anuncia la carga es `SkeletonGrupo`, una sola vez. Un
    // lector de pantalla que leyera cada bloque diría «cargando» doce veces.
    aria-hidden="true"
    className={cn(
      // Color base del hueco. Es `background-color`; el barrido es
      // `background-image` encima, así que los dos conviven.
      "block bg-gray-200 dark:bg-gray-800",
      // El brillo que barre. `background-size: 200%` es lo que permite que entre
      // y salga entero en lugar de aparecer cortado en el borde.
      "bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.75),transparent)]",
      "dark:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)]",
      "bg-[length:200%_100%]",
      "animate-brillo",
      className,
    )}
  />
);

export interface SkeletonGrupoProps {
  /**
   * Qué se está cargando, en palabras. Se anuncia una vez y no se pinta: el
   * esqueleto visual ya lo dice a quien ve la pantalla.
   */
  etiqueta?: string;
  className?: string;
  children: ReactNode;
}

/**
 * `SkeletonGrupo` — envuelve varios esqueletos y anuncia UNA carga.
 *
 * `role="status"` con `aria-live="polite"` es lo que hace que el anuncio llegue
 * sin interrumpir: una carga no es una urgencia, y `assertive` cortaría lo que
 * el usuario estuviera oyendo. El texto vive en un `sr-only` porque repetirlo
 * en pantalla sería volver al «Cargando…» que este componente retira.
 */
export const SkeletonGrupo: React.FC<SkeletonGrupoProps> = ({
  etiqueta = "Cargando…",
  className,
  children,
}) => (
  <div role="status" aria-live="polite" className={className}>
    <span className="sr-only">{etiqueta}</span>
    {children}
  </div>
);

export default Skeleton;
