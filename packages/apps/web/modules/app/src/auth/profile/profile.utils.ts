import {
  AVAILABILITY_SHIFTS,
  CLIENT_ADMIN_ROLE,
  DEFAULT_ACCENT,
  DEFAULT_AVATAR,
  DEFAULT_COUNTRY,
  DEFAULT_NOTIFICATION_CHANNEL,
  DEFAULT_THEME_PREFERENCE,
  LEGACY_AVATAR_KEY,
  NOTIFICATION_CHANNELS,
  PROFILE_STORAGE_KEY,
  REFERRAL_SOURCES,
  USAGE_REASONS,
  createEmptyProfile,
  generateUserId,
  normalizeEmail,
} from "./profile.constants";
import type {
  AccentId,
  AuthProviderId,
  AvailabilityShift,
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
} from "./profile.types";

/* ── Validación tolerante ──────────────────────────────────────────── */

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * Igual que `oneOf`, pero admite el vacío: los campos de onboarding que aún no
 * se han respondido valen `""`, no un valor por defecto inventado.
 */
function oneOfOptional<T extends string>(value: unknown, allowed: readonly T[]): T | "" {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : "";
}

const THEME_IDS: readonly ProfileThemePreference[] = ["light", "dark", "system"];
const CHANNEL_IDS: readonly NotificationChannel[] = NOTIFICATION_CHANNELS.map(c => c.id);
const SHIFT_IDS: readonly AvailabilityShift[] = AVAILABILITY_SHIFTS.map(s => s.id);
const ACCENT_IDS: readonly AccentId[] = ["brand", "secondary", "accent", "graphite"];
const USAGE_REASON_IDS: readonly UsageReason[] = USAGE_REASONS.map(r => r.id);
const REFERRAL_IDS: readonly ReferralSource[] = REFERRAL_SOURCES.map(s => s.id);

function sanitizeOnboarding(
  raw: unknown,
  /** Respaldo para perfiles anteriores al onboarding del usuario nuevo. */
  legacyCompletedAt: string
): UserOnboardingState {
  // Un perfil guardado antes de que existiera este bloque ya pasó por su alta
  // original: se le da por completado en lugar de reenviarlo al asistente. Solo
  // los perfiles que traen el bloque explícito pueden estar pendientes.
  if (raw === undefined) {
    return {
      newUserCompletedAt: legacyCompletedAt,
      usageReason: "",
      referralSource: "",
      referralDetail: "",
      supportNote: "",
    };
  }
  const source = (raw ?? {}) as Record<string, unknown>;
  return {
    newUserCompletedAt:
      typeof source.newUserCompletedAt === "string" ? source.newUserCompletedAt : null,
    usageReason: oneOfOptional(source.usageReason, USAGE_REASON_IDS),
    referralSource: oneOfOptional(source.referralSource, REFERRAL_IDS),
    referralDetail: asString(source.referralDetail),
    supportNote: asString(source.supportNote),
  };
}

function sanitizeGoogleIdentity(raw: unknown): GoogleIdentity | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const sub = asString(source.sub);
  if (!sub) return null;
  return { sub, linkedAt: asString(source.linkedAt) };
}

function sanitizeAuth(raw: unknown): UserAuthIdentities {
  // Los perfiles anteriores a este bloque se crearon con contraseña: no tener
  // el dato no debe presentarlos como cuentas sólo-Google.
  if (raw === undefined) return { password: true, google: null };
  const source = (raw ?? {}) as Record<string, unknown>;
  const google = sanitizeGoogleIdentity(source.google);
  return {
    password: asBoolean(source.password, google === null),
    google,
  };
}

/**
 * Normaliza un perfil leído de `localStorage`.
 *
 * La forma se repara campo a campo en lugar de descartar el registro entero:
 * un dato corrupto (o un perfil escrito por una versión anterior) no debe
 * costarle al administrador el resto de su información.
 */
export function sanitizeProfile(raw: unknown, fallbackEmail = ""): UserProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;

  const email = normalizeEmail(asString(source.email, fallbackEmail));
  if (!email) return null;

  const base = createEmptyProfile({ email });
  const preferences = (source.preferences ?? {}) as Record<string, unknown>;
  const createdAt = asString(source.createdAt, base.createdAt);

  return {
    // El identificador interno sobrevive a todo. Los perfiles anteriores a este
    // campo usaban `id` (derivado del email); se reutiliza para no fragmentar la
    // identidad de quien ya tenía cuenta.
    userId: asString(source.userId) || asString(source.id) || generateUserId(),
    firstName: asString(source.firstName),
    lastName: asString(source.lastName),
    email,
    contactPhone: asString(source.contactPhone),
    avatarUrl: asString(source.avatarUrl, base.avatarUrl),
    // El rol no se hidrata del almacenamiento: el único rol de alta posible hoy
    // es Admin Cliente, y un valor manipulado no debe escalar privilegios.
    role: CLIENT_ADMIN_ROLE,
    preferences: {
      theme: oneOf(preferences.theme, THEME_IDS, DEFAULT_THEME_PREFERENCE),
      notificationChannel: oneOf(
        preferences.notificationChannel,
        CHANNEL_IDS,
        DEFAULT_NOTIFICATION_CHANNEL
      ),
    },
    accent: oneOf(source.accent, ACCENT_IDS, DEFAULT_ACCENT),
    onboarding: sanitizeOnboarding(source.onboarding, createdAt),
    auth: sanitizeAuth(source.auth),
    documentId: asString(source.documentId),
    position: asString(source.position, base.position),
    city: asString(source.city),
    country: asString(source.country, DEFAULT_COUNTRY),
    bio: asString(source.bio),
    billingEmail: asString(source.billingEmail, email),
    whatsappNumber: asString(source.whatsappNumber),
    availabilityShift: oneOf(source.availabilityShift, SHIFT_IDS, "all_shifts"),
    preferredBusinessId: asString(source.preferredBusinessId),
    quickPin: asString(source.quickPin).replace(/\D/g, "").slice(0, 4),
    twoFactorEnabled: asBoolean(source.twoFactorEnabled),
    createdAt,
    updatedAt: asString(source.updatedAt, createdAt),
    lastSignInAt: typeof source.lastSignInAt === "string" ? source.lastSignInAt : null,
    lastPasswordChangeAt:
      typeof source.lastPasswordChangeAt === "string" ? source.lastPasswordChangeAt : null,
  };
}

/* ── Lectura / escritura del almacén ───────────────────────────────── */

type ProfileStore = Record<string, UserProfile>;

/** Lee el mapa completo de perfiles. Devuelve `{}` si está vacío o corrupto. */
export function readProfileStore(): ProfileStore {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const store: ProfileStore = {};
    for (const value of Object.values(parsed)) {
      const profile = sanitizeProfile(value);
      if (profile) store[profile.email] = profile;
    }
    return store;
  } catch {
    return {};
  }
}

function writeProfileStore(store: ProfileStore): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage puede no estar disponible (modo privado). No es fatal: el
    // perfil sigue vivo en memoria durante la sesión.
  }
}

/**
 * Migra el avatar del dominio retirado `useUserAvatar`.
 *
 * Solo aplica si el perfil aún no tiene uno propio; después borra la clave
 * legada para no reintentar la migración en cada arranque.
 */
function migrateLegacyAvatar(profile: UserProfile): UserProfile {
  try {
    const legacy = localStorage.getItem(LEGACY_AVATAR_KEY);
    if (!legacy) return profile;
    localStorage.removeItem(LEGACY_AVATAR_KEY);
    if (profile.avatarUrl && profile.avatarUrl !== DEFAULT_AVATAR) return profile;
    return { ...profile, avatarUrl: legacy };
  } catch {
    return profile;
  }
}

/**
 * Carga el perfil de un email, o lo crea desde la semilla de registro.
 *
 * Nunca devuelve `null`: el alta ya conoce el email, así que un perfil
 * inexistente es simplemente un perfil recién creado.
 *
 * ⚠️ Es también el punto donde se resuelve la **unificación de vías de acceso**:
 * si la misma persona entra con Google sobre una cuenta que ya existe, se
 * **vincula** la identidad de Google al perfil existente. No se crea un segundo
 * usuario ni se reescribe el `userId`.
 */
export function loadOrCreateProfile(seed: ProfileSeed): UserProfile {
  const email = normalizeEmail(seed.email);
  const store = readProfileStore();
  const existing = store[email];

  let profile: UserProfile;

  if (existing) {
    const current = migrateLegacyAvatar(existing);
    const patch: UserProfilePatch = {
      // El registro es autoridad sobre el nombre mientras el perfil no lo haya
      // editado: evita perder lo tecleado en el alta.
      firstName: current.firstName || seed.firstName?.trim() || "",
      lastName: current.lastName || seed.lastName?.trim() || "",
    };

    if (seed.provider === "google" && seed.googleSub) {
      patch.auth = {
        // Vincular es idempotente: si ya estaba vinculada, se conserva.
        google: current.auth.google ?? { sub: seed.googleSub, linkedAt: new Date().toISOString() },
      };
      // La foto de Google solo rellena un hueco; nunca pisa una elegida en Necto.
      if (!current.avatarUrl && seed.avatarUrl) patch.avatarUrl = seed.avatarUrl;
    }

    profile = mergeProfile(current, patch);
  } else {
    profile = migrateLegacyAvatar(createEmptyProfile(seed));
  }

  store[email] = profile;
  writeProfileStore(store);
  return profile;
}

/**
 * Perfil de un alta a medias: el más reciente cuyo onboarding sigue pendiente.
 *
 * Existe porque el registro navega al onboarding **sin abrir sesión** (en modo
 * cognito la cuenta aún no está confirmada). Si el administrador recarga a
 * mitad del asistente no hay sesión que rehidrate el perfil, pero sí un alta
 * pendiente que debe seguir capturándose en lugar de empezar de cero.
 */
export function loadPendingProfile(): UserProfile | null {
  const candidates = Object.values(readProfileStore()).filter(p => !isNewUserOnboardingComplete(p));
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

/** Persiste el perfil en el mapa. */
export function saveProfile(profile: UserProfile): UserProfile {
  const store = readProfileStore();
  store[profile.email] = profile;
  writeProfileStore(store);
  return profile;
}

/** Elimina el perfil del almacén (usado al descartar una cuenta). */
export function removeStoredProfile(email: string): void {
  const store = readProfileStore();
  delete store[normalizeEmail(email)];
  writeProfileStore(store);
}

/* ── Mutación ──────────────────────────────────────────────────────── */

/**
 * Aplica un parche inmutable sobre el perfil y sella `updatedAt`.
 *
 * Los bloques anidados (`preferences`, `onboarding`, `auth`) se fusionan en
 * lugar de reemplazarse: guardar el motivo de uso no puede borrar la fecha de
 * finalización del onboarding, ni establecer una contraseña puede desvincular
 * Google. La identidad (`userId`, `role`, `createdAt`) nunca se toca.
 */
export function mergeProfile(base: UserProfile, patch: UserProfilePatch): UserProfile {
  return {
    ...base,
    ...patch,
    userId: base.userId,
    role: base.role,
    createdAt: base.createdAt,
    email: patch.email ? normalizeEmail(patch.email) : base.email,
    preferences: {
      ...base.preferences,
      ...(patch.preferences ?? {}),
    },
    onboarding: {
      ...base.onboarding,
      ...(patch.onboarding ?? {}),
    },
    auth: {
      ...base.auth,
      ...(patch.auth ?? {}),
    },
    updatedAt: new Date().toISOString(),
  };
}

/* ── Derivados ─────────────────────────────────────────────────────── */

/**
 * ¿La persona ya completó el onboarding del usuario nuevo?
 *
 * Es **la única guarda de navegación** del alta: gobierna si al iniciar sesión
 * se entra al hub o se retoma `onboarding_new_user`. Antes esto lo decidía la
 * completitud de los datos de contacto, lo que confundía "tengo teléfono" con
 * "terminé mi configuración inicial".
 */
export function isNewUserOnboardingComplete(profile: UserProfile | null): boolean {
  return Boolean(profile?.onboarding.newUserCompletedAt);
}

/** ¿La cuenta ya tiene una contraseña de Necto? */
export function hasPassword(profile: UserProfile | null): boolean {
  return Boolean(profile?.auth.password);
}

/* ── Formato de fechas para la UI ──────────────────────────────────── */

/** "Enero 2025" — usado para la antigüedad de la cuenta. */
export function formatProfileMonthYear(iso: string | null): string {
  if (!iso) return "—";
  try {
    const label = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(
      new Date(iso)
    );
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return "—";
  }
}

/** Fecha y hora legible, o "aún sin registrar" si no hay dato. */
export function formatProfileDateTime(iso: string | null): string {
  if (!iso) return "Aún sin registrar";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "Aún sin registrar";
  }
}

/**
 * "hace unos momentos" para lo reciente, fecha absoluta para lo antiguo.
 * Evita prometer una precisión que el dato no tiene (solo guardamos el instante).
 */
export function formatProfileLastSeen(iso: string | null): string {
  if (!iso) return "Aún sin registrar";
  const elapsedMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(elapsedMs)) return "Aún sin registrar";
  const minutes = elapsedMs / 60000;
  if (minutes < 5) return "hace unos momentos";
  if (minutes < 60) return `hace ${Math.floor(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `hace ${Math.floor(hours)} h`;
  return formatProfileDateTime(iso);
}

/** Etiqueta legible de la vía de acceso, para describir la cuenta. */
export function describeAuthProviders(auth: UserAuthIdentities): string {
  const providers: string[] = [];
  if (auth.password) providers.push("Correo y contraseña");
  if (auth.google) providers.push("Google");
  return providers.join(" · ") || "Sin credenciales vinculadas";
}

/** Vía por la que se creó la cuenta, derivada de sus credenciales. */
export function primaryProvider(auth: UserAuthIdentities): AuthProviderId {
  return auth.google && !auth.password ? "google" : "password";
}
