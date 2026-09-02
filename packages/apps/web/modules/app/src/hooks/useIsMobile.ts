import { useEffect, useState } from "react";

/**
 * useIsMobile — detecta viewports de móvil.
 *
 * Necto define el corte de "shell móvil" en el breakpoint `lg` de Tailwind
 * (1024px): por debajo de ese ancho se usa la navegación de tipo bottom nav.
 *
 * La detección combina tres fuentes para ser robusta incluso dentro de iframes
 * o del emulador de dispositivos (donde `matchMedia` a veces reporta el ancho
 * del contenedor externo, no el visible):
 *   1. `matchMedia((max-width: N))`
 *   2. `window.innerWidth` (respaldo directo)
 *   3. `ResizeObserver` sobre `documentElement` (ancho real del documento)
 *
 * @param maxWidth Ancho máximo (px) considerado "móvil". Por defecto 1023
 *                 (justo por debajo del breakpoint `lg`).
 */
export function useIsMobile(maxWidth: number = 1023): boolean {
  const compute = () => {
    if (typeof window === "undefined") return false;
    // Toma el menor ancho disponible entre las distintas fuentes: si alguna
    // reporta un ancho angosto (el visible), gana.
    const widths: number[] = [];
    if (typeof window.innerWidth === "number") widths.push(window.innerWidth);
    if (document?.documentElement?.clientWidth)
      widths.push(document.documentElement.clientWidth);

    const mmMatches = window.matchMedia
      ? window.matchMedia(`(max-width: ${maxWidth}px)`).matches
      : false;

    const minWidth = widths.length ? Math.min(...widths) : Infinity;
    return mmMatches || minWidth <= maxWidth;
  };

  const [isMobile, setIsMobile] = useState<boolean>(compute);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => setIsMobile(compute());
    update();

    const mql = window.matchMedia
      ? window.matchMedia(`(max-width: ${maxWidth}px)`)
      : null;
    if (mql) {
      if (mql.addEventListener) mql.addEventListener("change", update);
      else mql.addListener(update); // Safari < 14
    }

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && document?.documentElement) {
      ro = new ResizeObserver(() => update());
      ro.observe(document.documentElement);
    }

    return () => {
      if (mql) {
        if (mql.removeEventListener) mql.removeEventListener("change", update);
        else mql.removeListener(update);
      }
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      if (ro) ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxWidth]);

  return isMobile;
}
