/* ── Public surface (barrel) ───────────────────────────────────────────
 * El perfil del usuario de Necto es un dominio autocontenido:
 * los tipos en ./profile.types, los catálogos y fábricas en
 * ./profile.constants, la persistencia en ./profile.utils y el estado en
 * ./hooks/useUserProfile. `AuthContext` es el único consumidor que lo
 * monta; la UI lo lee a través de `useAuth()`.
 *
 * ⚠️ Modela a la **persona**, no a la tienda: la cuenta/autenticación, el
 * usuario y el negocio son tres conceptos separados (ver ./profile.types).
 * ──────────────────────────────────────────────────────────────────── */

export type {
  AccentId,
  AuthProviderId,
  AvailabilityShift,
  ClientAdminRole,
  GoogleIdentity,
  NotificationChannel,
  ProfileSeed,
  ProfileThemePreference,
  ReferralSource,
  UsageReason,
  UserAuthIdentities,
  UserOnboardingState,
  UserProfile,
  UserProfilePatch,
  UserProfilePreferences,
} from "./profile.types";
export { composeFullName } from "./profile.types";

export {
  ACCENTS,
  AVAILABILITY_SHIFTS,
  CLIENT_ADMIN_ROLE,
  CLIENT_ADMIN_ROLE_DESCRIPTION,
  CLIENT_ADMIN_ROLE_LABEL,
  DEFAULT_ACCENT,
  DEFAULT_AVATAR,
  DEFAULT_COUNTRY,
  DEFAULT_NOTIFICATION_CHANNEL,
  DEFAULT_THEME_PREFERENCE,
  NOTIFICATION_CHANNELS,
  PRESET_AVATARS,
  PROFILE_STORAGE_KEY,
  REFERRAL_SOURCES,
  THEME_PREFERENCES,
  USAGE_REASONS,
  accentHex,
  accentOnColor,
  createEmptyProfile,
  createProfileFromRegistration,
  generateUserId,
  initialAuthIdentities,
  normalizeEmail,
  profileDisplayName,
  profileInitials,
} from "./profile.constants";

export {
  describeAuthProviders,
  formatProfileDateTime,
  formatProfileLastSeen,
  formatProfileMonthYear,
  hasPassword,
  isNewUserOnboardingComplete,
  loadOrCreateProfile,
  loadPendingProfile,
  mergeProfile,
  primaryProvider,
  readProfileStore,
  removeStoredProfile,
  sanitizeProfile,
  saveProfile,
} from "./profile.utils";

export { useUserProfile } from "./hooks/useUserProfile";
export type { UserProfileState } from "./hooks/useUserProfile";
