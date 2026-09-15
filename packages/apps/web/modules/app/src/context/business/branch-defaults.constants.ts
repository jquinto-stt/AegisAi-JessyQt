/* ── Branch defaults ───────────────────────────────────────────────────
 * Valores por defecto de una **sucursal** nueva. Viven en el dominio, y no en el
 * wizard, porque los comparten dos superficies: el alta (`/onboarding`) y el
 * modal de Ajustes. Si cada una declarara su propio literal, la misma sucursal
 * recién creada mostraría horarios distintos según dónde se abriera.
 * ──────────────────────────────────────────────────────────────────── */

export const DEFAULT_OPENING_DAYS = "Lunes a sábado";
export const DEFAULT_OPENING_HOURS = "10:00 - 22:00";

/**
 * Código interno sugerido para la enésima sucursal: 1 → `"SUC-01"`.
 * Es sólo una sugerencia editable; el usuario puede escribir el suyo.
 */
export function suggestBranchCode(branchCount: number): string {
  return `SUC-${String(branchCount).padStart(2, "0")}`;
}

/** Mercados que el wizard ofrece al dar de alta la tienda. */
export const STORE_COUNTRIES = [
  "Colombia",
  "México",
  "Argentina",
  "Chile",
  "Perú",
  "Ecuador",
  "Estados Unidos",
  "España",
];
