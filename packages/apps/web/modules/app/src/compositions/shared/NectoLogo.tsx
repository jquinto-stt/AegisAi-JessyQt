import React from "react";

/**
 * Marca NECTO — **un solo artwork** para toda la aplicación.
 *
 * Antes había dos, y eran dos verdades del mismo hecho: este archivo dibujaba
 * el lockup *inline* con los paths de `@/imports/BannerYFooter/svg-mzezy80iwx`
 * (32 KB de trazado) mientras la barra lateral servía
 * `public/images/logo/necto-full.svg`. Al corregir el lockup —el manual lo tiene
 * **apilado**, «grow together» debajo del wordmark, y el archivo lo tenía al
 * lado— había que acordarse de los dos sitios, y el inline se habría quedado con
 * el trazado viejo sin que nada fallara.
 *
 * Ahora todo sale de `public/images/logo/`, que es la única fuente:
 *
 *   - `necto-full.svg`        naranja `#FF3C10` + «grow together» índigo `#15008B`
 *   - `necto-full-white.svg`  blanco pleno, para bandas de color y modo oscuro
 *   - `necto-icon.svg`        isotipo suelto (la N + el cuadrado índigo)
 *
 * El cambio de variante en modo oscuro se hace con `dark:hidden` / `dark:block`
 * porque CSS no puede repintar el interior de un `<img>`; los dos archivos
 * comparten viewBox, así que la caja no se mueve al cambiar de tema.
 */

const ALTURAS = {
  xs: "h-6",
  sm: "h-8",
  md: "h-11",
  lg: "h-14",
} as const;

const CAJAS_ISOTIPO = {
  xs: "w-5 h-5",
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
  xl: "w-12 h-12",
} as const;

export interface NectoLogoProps {
  size?: keyof typeof ALTURAS;
  className?: string;
  style?: React.CSSProperties;
  /** Fuerza la variante blanca aunque el tema sea claro (bandas de color). */
  blanco?: boolean;
  iconOnly?: boolean;
}

export interface NectoIsotypeProps {
  size?: keyof typeof CAJAS_ISOTIPO;
  className?: string;
  style?: React.CSSProperties;
}

export function NectoIsotype({
  size = "md",
  className = "",
  style,
}: NectoIsotypeProps) {
  return (
    <img
      src="/images/logo/necto-icon.svg"
      alt="NECTO"
      className={`${CAJAS_ISOTIPO[size]} block select-none flex-none ${className}`}
      style={style}
    />
  );
}

export function NectoLogo({
  size = "md",
  className = "",
  style,
  blanco = false,
  iconOnly = false,
}: NectoLogoProps) {
  if (iconOnly) {
    return <NectoIsotype size={size} className={className} style={style} />;
  }

  if (blanco) {
    return (
      <img
        src="/images/logo/necto-full-white.svg"
        alt="NECTO"
        className={`${ALTURAS[size]} w-auto select-none ${className}`}
        style={style}
      />
    );
  }

  return (
    <>
      <img
        src="/images/logo/necto-full.svg"
        alt="NECTO"
        className={`${ALTURAS[size]} w-auto select-none dark:hidden ${className}`}
        style={style}
      />
      <img
        src="/images/logo/necto-full-white.svg"
        alt="NECTO"
        className={`hidden ${ALTURAS[size]} w-auto select-none dark:block ${className}`}
        style={style}
      />
    </>
  );
}

export default NectoLogo;
