import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";

/**
 * Cifra que cuenta desde cero hasta su valor al montarse.
 *
 * El conteo escribe directo en el nodo (`textContent`) en vez de pasar por el
 * estado de React: así no hay un render por fotograma en un dashboard que ya
 * tiene gráficas pintándose al mismo tiempo.
 *
 * El valor real vive siempre en el texto accesible; lo que cuenta es solo la
 * capa visible, para que un lector de pantalla no lea cifras intermedias.
 */
export function CifraAnimada({
  valor,
  formato,
  animar,
  retardo = 0,
  className = "",
}: {
  valor: number;
  formato: (n: number) => string;
  animar: boolean;
  /** Segundos. Para que la cifra arranque cuando su tarjeta ya aterrizó. */
  retardo?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const reduce = useReducedMotion() === true;
  const final = formato(valor);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;
    if (!animar || reduce) {
      nodo.textContent = final;
      return;
    }
    nodo.textContent = formato(0);
    const control = animate(0, valor, {
      duration: 0.9,
      delay: retardo,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (n) => {
        nodo.textContent = formato(n);
      },
    });
    return () => control.stop();
    // `formato` suele ser una función en línea: si entrara en las dependencias,
    // cada render del padre reiniciaría el conteo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, animar, reduce, retardo]);

  return (
    <span className={`tabular-nums ${className}`}>
      <span ref={ref} aria-hidden="true">
        {final}
      </span>
      <span className="sr-only">{final}</span>
    </span>
  );
}

const ENTEROS = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const PESOS = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatoEntero = (n: number) => ENTEROS.format(Math.round(n));
export const formatoPesos = (n: number) => `$ ${PESOS.format(n)}`;
