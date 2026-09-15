import type React from "react";
import { accentHex, accentOnColor, type AccentId } from "@/auth/profile";

/* ── Variables CSS del acento ──────────────────────────────────────────
 * El acento elegido por el usuario se publica como variables CSS en la raíz de
 * la superficie que lo aplica. Así cualquier descendiente puede teñirse sin que
 * el componente tenga que recibir el color por props, y el nombre de la variable
 * vive en un único sitio en lugar de repetirse como literal en cada archivo.
 * ──────────────────────────────────────────────────────────────────── */

/** Color de acento activo. */
export const ACCENT_VAR = "--necto-accent";
/** Color legible sobre el acento (lo declara el catálogo, no se adivina). */
export const ACCENT_ON_VAR = "--necto-on-accent";
/** Acento translúcido, para fondos suaves de elemento seleccionado. */
export const ACCENT_SOFT_VAR = "--necto-accent-soft";

/**
 * Variables del acento listas para pasar a `style`.
 *
 * `soft` se deriva del hex con alfa de 8 dígitos en lugar de `color-mix`: es
 * soportado en todos los navegadores objetivo y no depende del motor de color.
 */
export function accentCssVars(accent: AccentId): React.CSSProperties {
  const hex = accentHex(accent);
  return {
    [ACCENT_VAR]: hex,
    [ACCENT_ON_VAR]: accentOnColor(accent),
    [ACCENT_SOFT_VAR]: `${hex}1F`,
  } as React.CSSProperties;
}
