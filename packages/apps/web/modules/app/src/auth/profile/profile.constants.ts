import type {
  AccentId,
  AvailabilityShift,
  ClientAdminRole,
  NotificationChannel,
  ProfileSeed,
  ProfileThemePreference,
  ReferralSource,
  UsageReason,
  UserAuthIdentities,
  UserProfile,
} from "./profile.types";

/* ── Persistencia ──────────────────────────────────────────────────── */

/**
 * Perfiles indexados por email normalizado. Guardar un mapa (y no un único
 * perfil) permite que dos cuentas convivan en el mismo navegador sin pisarse.
 *
 * ⚠️ El email es la **clave del índice**, no la identidad de la persona: la
 * identidad es `UserProfile.userId` y sobrevive a un cambio de correo.
 */
export const PROFILE_STORAGE_KEY = "necto_user_profiles";

/**
 * Clave legada del avatar, escrita por `useUserAvatar` (dominio retirado).
 * Solo se lee una vez para migrar el valor al perfil; después se borra.
 */
export const LEGACY_AVATAR_KEY = "necto_user_avatar";

/* ── Rol ───────────────────────────────────────────────────────────── */

export const CLIENT_ADMIN_ROLE: ClientAdminRole = "client_admin";

export const CLIENT_ADMIN_ROLE_LABEL = "Admin Cliente";

export const CLIENT_ADMIN_ROLE_DESCRIPTION =
  "Titular de la cuenta. Da de alta el negocio, vincula los canales, activa los módulos y administra el equipo.";

/* ── Valores por defecto ───────────────────────────────────────────── */

/**
 * Placeholder mientras el administrador no elige su propio avatar. La UI cae a
 * las iniciales si el avatar queda vacío, así que no es un requisito.
 */
export const DEFAULT_AVATAR = "";

export const DEFAULT_COUNTRY = "Colombia";

export const DEFAULT_THEME_PREFERENCE: ProfileThemePreference = "light";

export const DEFAULT_NOTIFICATION_CHANNEL: NotificationChannel = "whatsapp";

export const DEFAULT_ACCENT: AccentId = "brand";

/* ── Identidad del usuario ─────────────────────────────────────────── */

/**
 * Genera el identificador interno de Necto para una cuenta nueva.
 *
 * Se llama **al crear la cuenta**, nunca durante el onboarding: el onboarding
 * completa a un usuario que ya existe, no lo inventa. Se prefiere `randomUUID`
 * (sin colisiones) con un respaldo por tiempo+azar para entornos sin `crypto`.
 */
export function generateUserId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `usr_${uuid}`;
  return `usr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/* ── Catálogos de preferencias ─────────────────────────────────────── */

/**
 * El tipo admite `"system"` por compatibilidad, pero la UI solo ofrece claro y
 * oscuro: `uiStore` es el dueño del tema y siempre resuelve a uno de los dos,
 * así que una preferencia "sistema" no sobreviviría a una recarga.
 */
export const THEME_PREFERENCES: Array<{
  id: ProfileThemePreference;
  label: string;
  desc: string;
}> = [
  { id: "light", label: "Claro", desc: "Interfaz luminosa" },
  { id: "dark", label: "Oscuro", desc: "Interfaz atenuada" },
];

export const NOTIFICATION_CHANNELS: Array<{
  id: NotificationChannel;
  label: string;
  desc: string;
}> = [
  { id: "whatsapp", label: "WhatsApp", desc: "Avisos al teléfono del administrador" },
  { id: "email", label: "Correo", desc: "Resúmenes y alertas por email" },
  { id: "both", label: "Ambos canales", desc: "WhatsApp y correo a la vez" },
  { id: "none", label: "Sin avisos", desc: "Solo dentro de Necto" },
];

export const AVAILABILITY_SHIFTS: Array<{ id: AvailabilityShift; label: string }> = [
  { id: "all_shifts", label: "24/7 — Todos los turnos y aperturas" },
  { id: "day_shift", label: "Turno diurno (08:00 AM a 05:00 PM)" },
  { id: "night_shift", label: "Turno nocturno / cierre (05:00 PM a 02:00 AM)" },
  { id: "emergencies_only", label: "Solo emergencias e incidencias críticas" },
];

/* ── Personalización visual ────────────────────────────────────────── */

/**
 * Acentos ofrecidos en la personalización del onboarding. Todos son tokens de
 * `theme.css`; `onAccent` declara el color legible encima para que la UI no
 * tenga que adivinar el contraste.
 */
export const ACCENTS: Array<{
  id: AccentId;
  label: string;
  desc: string;
  hex: string;
  onAccent: string;
}> = [
  {
    id: "brand",
    label: "Naranja Necto",
    desc: "El acento de la marca",
    hex: "#FF3F1A",
    onAccent: "#FFFFFF",
  },
  {
    id: "secondary",
    label: "Índigo",
    desc: "Institucional y sobrio",
    hex: "#190088",
    onAccent: "#FFFFFF",
  },
  {
    id: "accent",
    label: "Celeste",
    desc: "Fresco y luminoso",
    hex: "#97D6DF",
    onAccent: "#0F2A2E",
  },
  {
    id: "graphite",
    label: "Grafito",
    desc: "Neutro, sin color",
    hex: "#212121",
    onAccent: "#FFFFFF",
  },
];

/** Hex del acento pedido, con el acento de marca como respaldo. */
export function accentHex(id: AccentId | undefined): string {
  return (ACCENTS.find(a => a.id === id) ?? ACCENTS[0]).hex;
}

/** Color legible sobre el acento pedido. */
export function accentOnColor(id: AccentId | undefined): string {
  return (ACCENTS.find(a => a.id === id) ?? ACCENTS[0]).onAccent;
}

/* ── Catálogos del onboarding del usuario nuevo ────────────────────── */

export const USAGE_REASONS: Array<{
  id: UsageReason;
  label: string;
  desc: string;
}> = [
  {
    id: "sell_online",
    label: "Vender por internet y WhatsApp",
    desc: "Pedidos, catálogo y atención conversacional",
  },
  {
    id: "control_stock",
    label: "Controlar inventario y stock",
    desc: "Existencias, reposición y mermas",
  },
  {
    id: "manage_branches",
    label: "Administrar varias sucursales",
    desc: "Una tienda, varias unidades operativas",
  },
  {
    id: "organize_team",
    label: "Organizar equipo y turnos",
    desc: "Horarios, roles y asignaciones",
  },
  {
    id: "exploring",
    label: "Explorar la plataforma",
    desc: "Primeros pasos por la plataforma",
  },
];

export const REFERRAL_SOURCES: Array<{
  id: ReferralSource;
  label: string;
  desc: string;
}> = [
  { id: "recommendation", label: "Recomendación", desc: "Alguien me habló de Necto" },
  { id: "social", label: "Redes sociales", desc: "Instagram, TikTok, LinkedIn…" },
  { id: "search", label: "Buscador", desc: "Lo encontré buscando en internet" },
  { id: "ads", label: "Publicidad", desc: "Anuncio pagado o campaña" },
  { id: "event", label: "Evento / comunidad", desc: "Feria, taller o grupo del sector" },
  { id: "other", label: "Otro", desc: "Prefiero escribirlo" },
];

/* ── Avatares minimalistas ─────────────────────────────────────────── */

/**
 * Avatares geométricos listos para usar, como `data:` URI.
 *
 * Se generan en el cliente en lugar de descargarse: el usuario que acaba de
 * crear la cuenta no debería depender de la red (ni de un tercero) para tener
 * una cara en su perfil. Al ser SVG escalan sin pérdida en cualquier tamaño.
 */
function avatarDataUri(background: string, ink: string, body: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="${ink}">` +
    `<rect width="96" height="96" fill="${background}"/>${body}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const PRESET_AVATARS: Array<{ id: string; label: string; url: string }> = [
  {
    id: "brand-silhouette",
    label: "Silueta naranja",
    url: avatarDataUri(
      "#FF3F1A",
      "#FFFFFF",
      `<circle cx="48" cy="38" r="14"/>` +
        `<path d="M20 96c0-15.5 12.5-26 28-26s28 10.5 28 26z"/>`
    ),
  },
  {
    id: "indigo-arc",
    label: "Arco índigo",
    url: avatarDataUri(
      "#190088",
      "#97D6DF",
      `<path d="M22 70a26 26 0 0152 0z" fill="#97D6DF"/>` +
        `<circle cx="48" cy="32" r="11" fill="#97D6DF"/>`
    ),
  },
  {
    id: "celeste-rings",
    label: "Anillos celestes",
    url: avatarDataUri(
      "#97D6DF",
      "#190088",
      `<circle cx="48" cy="48" r="25" fill="none" stroke="#190088" stroke-width="7"/>` +
        `<circle cx="48" cy="48" r="9" fill="#190088"/>`
    ),
  },
  {
    id: "graphite-grid",
    label: "Retícula grafito",
    url: avatarDataUri(
      "#212121",
      "#FF3F1A",
      `<g fill="#FF3F1A">` +
        `<circle cx="30" cy="30" r="6"/><circle cx="48" cy="30" r="6"/><circle cx="66" cy="30" r="6"/>` +
        `<circle cx="30" cy="48" r="6"/><circle cx="48" cy="48" r="6"/><circle cx="66" cy="48" r="6"/>` +
        `<circle cx="30" cy="66" r="6"/><circle cx="48" cy="66" r="6"/><circle cx="66" cy="66" r="6"/>` +
        `</g>`
    ),
  },
  {
    id: "beige-triangle",
    label: "Triángulo beige",
    url: avatarDataUri(
      "#EFE6D3",
      "#190088",
      `<path d="M48 22l24 44H24z" fill="#190088"/>` + `<circle cx="48" cy="30" r="7" fill="#FF3F1A"/>`
    ),
  },
  {
    id: "brand-wave",
    label: "Onda naranja",
    url: avatarDataUri(
      "#FF3F1A",
      "#190088",
      `<path d="M0 60c16-16 32-16 48 0s32 16 48 0v36H0z" fill="#190088"/>` +
        `<circle cx="34" cy="34" r="9" fill="#FFFFFF"/>`
    ),
  },
];

/* ── Fábricas ──────────────────────────────────────────────────────── */

/** Email normalizado: la clave del mapa de perfiles. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Credenciales iniciales derivadas de cómo se autenticó la persona. */
export function initialAuthIdentities(seed: ProfileSeed, now: string): UserAuthIdentities {
  const viaGoogle = seed.provider === "google";
  return {
    password: !viaGoogle,
    google: viaGoogle ? { sub: seed.googleSub ?? "", linkedAt: now } : null,
  };
}

/**
 * Perfil vacío pero **estructuralmente completo**. Todos los campos existen
 * para que la UI nunca reciba `undefined`; los vacíos se muestran como
 * "por configurar" en lugar de como texto inventado.
 *
 * Nace con `onboarding.newUserCompletedAt: null`, que es exactamente la marca de
 * "usuario nuevo pendiente de su configuración inicial".
 */
export function createEmptyProfile(seed: ProfileSeed): UserProfile {
  const email = normalizeEmail(seed.email);
  const now = new Date().toISOString();

  return {
    userId: generateUserId(),
    firstName: seed.firstName?.trim() ?? "",
    lastName: seed.lastName?.trim() ?? "",
    email,
    contactPhone: "",
    avatarUrl: seed.avatarUrl ?? DEFAULT_AVATAR,
    role: CLIENT_ADMIN_ROLE,
    preferences: {
      theme: DEFAULT_THEME_PREFERENCE,
      notificationChannel: DEFAULT_NOTIFICATION_CHANNEL,
    },
    accent: DEFAULT_ACCENT,
    onboarding: {
      newUserCompletedAt: null,
      usageReason: "",
      referralSource: "",
      referralDetail: "",
      supportNote: "",
    },
    auth: initialAuthIdentities(seed, now),
    documentId: "",
    position: "Administrador del Cliente",
    city: "",
    country: DEFAULT_COUNTRY,
    bio: "",
    billingEmail: email,
    whatsappNumber: "",
    availabilityShift: "all_shifts",
    preferredBusinessId: "",
    quickPin: "",
    twoFactorEnabled: false,
    createdAt: now,
    updatedAt: now,
    lastSignInAt: null,
    lastPasswordChangeAt: null,
  };
}

/** Perfil creado desde el alta: hereda nombre y apellido del formulario. */
export function createProfileFromRegistration(seed: ProfileSeed): UserProfile {
  return createEmptyProfile(seed);
}

/** Nombre completo del administrador, con respaldo en el email. */
export function profileDisplayName(profile: UserProfile | null): string {
  if (!profile) return "Administrador";
  return (
    [profile.firstName, profile.lastName]
      .map(part => part.trim())
      .filter(Boolean)
      .join(" ") || profile.email
  );
}

/** Iniciales para el avatar cuando no hay foto. Máximo dos letras. */
export function profileInitials(profile: UserProfile | null): string {
  if (!profile) return "AC";
  const fromName = [profile.firstName, profile.lastName]
    .map(part => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("");
  if (fromName) return fromName;
  return profile.email.slice(0, 2).toUpperCase() || "AC";
}
