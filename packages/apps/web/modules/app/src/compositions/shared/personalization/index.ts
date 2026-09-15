/* ── Public surface (barrel) ───────────────────────────────────────────
 * Personalización visual del perfil: avatar y acento.
 *
 * Vive en `compositions/shared` porque la ofrecen **dos** superficies con el
 * mismo nivel de detalle: el paso de personalización de `onboarding_new_user` y
 * Ajustes de perfil & Cuenta. Una sola implementación, un solo catálogo.
 * ──────────────────────────────────────────────────────────────────── */

export {
  ACCENT_ON_VAR,
  ACCENT_SOFT_VAR,
  ACCENT_VAR,
  accentCssVars,
} from "./accent-css";

export { AvatarPresetPicker } from "./AvatarPresetPicker";
export { AccentPicker } from "./AccentPicker";
