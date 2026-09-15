/**
 * UserProfile — modelo de datos de la **persona** titular de la cuenta.
 *
 * Necto separa tres conceptos que NO deben mezclarse:
 *
 *   Cuenta / Autenticación  →  Usuario  →  Tienda
 *
 * Este archivo modela el del medio: la persona. La cuenta (email + contraseña,
 * o la identidad externa de Google) vive en `auth`, y el negocio vive en
 * `BusinessInstance`. El usuario **no depende de una tienda para existir**: puede
 * ser propietario de una o de varias, o de ninguna.
 *
 * Este archivo es la única fuente de verdad del perfil. `AuthContext` lo
 * administra y `AccountSettingsModal` lo edita.
 */

/* ── Rol ───────────────────────────────────────────────────────────── */

/**
 * Rol del titular de la cuenta. Hoy el único rol de alta es `client_admin`
 * ("Admin Cliente"); se declara como unión para que sumar roles de equipo
 * (manager / staff) sea un cambio de tipo y no un refactor.
 */
export type ClientAdminRole = "client_admin";

/* ── Personalización ───────────────────────────────────────────────── */

/**
 * Acento visual preferido por la persona. Todos los valores son tokens de la
 * marca Necto (`src/css/theme.css`), no colores libres: el acento se elige
 * dentro de la paleta, no contra ella.
 */
export type AccentId = "brand" | "secondary" | "accent" | "graphite";

/* ── Preferencias ──────────────────────────────────────────────────── */

/**
 * Tema declarado por el usuario en su cuenta.
 *
 * ⚠️ El dueño en tiempo de ejecución del tema sigue siendo `uiStore` (es quien
 * escribe la clase `dark` en `<html>` y `webforge-ui-preferences`). El perfil
 * guarda la preferencia declarada a nivel de cuenta y `uiStore.setTheme()` es
 * el único camino de escritura: ver `useUserProfile`.
 */
export type ProfileThemePreference = "light" | "dark" | "system";

/** Canal por el que el administrador quiere recibir avisos operativos. */
export type NotificationChannel = "whatsapp" | "email" | "both" | "none";

/** Franja en la que acepta alertas. */
export type AvailabilityShift =
  | "all_shifts"
  | "day_shift"
  | "night_shift"
  | "emergencies_only";

export interface UserProfilePreferences {
  theme: ProfileThemePreference;
  notificationChannel: NotificationChannel;
}

/* ── Onboarding del usuario nuevo ──────────────────────────────────── */

/** Por qué la persona quiere usar Necto. Personaliza su experiencia. */
export type UsageReason =
  | "sell_online"
  | "control_stock"
  | "manage_branches"
  | "organize_team"
  | "exploring";

/** Cómo conoció Necto. Es un dato de adquisición, no de negocio. */
export type ReferralSource =
  | "recommendation"
  | "social"
  | "search"
  | "ads"
  | "event"
  | "other";

/**
 * Estado del onboarding **del usuario nuevo** (`onboarding_new_user`).
 *
 * `newUserCompletedAt === null` ES la marca de "usuario nuevo pendiente de
 * completar su configuración inicial": no hay un segundo booleano que pueda
 * contradecirla. Un perfil recién creado nace con `null`, así que el flujo se
 * activa solo, sin bandera que alguien deba acordarse de encender.
 */
export interface UserOnboardingState {
  /** `null` mientras el onboarding del usuario no se haya completado. */
  newUserCompletedAt: string | null;
  usageReason: UsageReason | "";
  referralSource: ReferralSource | "";
  /** Texto libre, sólo cuando `referralSource === "other"`. */
  referralDetail: string;
  /**
   * Nota libre del paso de soporte: una duda o un requerimiento especial que la
   * persona deja por escrito antes de entrar a su hub.
   *
   * Se guarda **tal cual**. No se clasifica, no se enruta a ningún destino y no
   * promete respuesta: hoy sólo queda almacenada con el resto del onboarding.
   */
  supportNote: string;
}

/* ── Autenticación ─────────────────────────────────────────────────── */

/** Vía por la que se creó o vinculó la cuenta. */
export type AuthProviderId = "password" | "google";

/** Identidad externa de Google vinculada a la cuenta de Necto. */
export interface GoogleIdentity {
  /** `sub` de Google: identifica la identidad externa, no al usuario de Necto. */
  sub: string;
  linkedAt: string;
}

/**
 * Credenciales vinculadas a la cuenta.
 *
 * Una cuenta creada sólo con Google **no tiene contraseña de Necto**
 * (`password: false`) y eso no la hace incompleta: simplemente aún no tiene esa
 * credencial. Establecerla después **añade** una vía de acceso sobre el mismo
 * `userId`; nunca crea un segundo usuario ni cambia el identificador.
 */
export interface UserAuthIdentities {
  /** ¿Existe ya una contraseña de Necto para esta cuenta? */
  password: boolean;
  google: GoogleIdentity | null;
}

/* ── Perfil ────────────────────────────────────────────────────────── */

export interface UserProfile {
  /**
   * Identificador interno y **estable** del usuario de Necto.
   *
   * Se genera cuando se crea la cuenta y no vuelve a cambiar: ni al completar el
   * onboarding, ni al vincular Google, ni al cambiar el correo de acceso. El
   * email es la clave del índice de perfiles (una dirección, una cuenta), no la
   * identidad de la persona.
   */
  userId: string;

  /* — Identidad de la persona — */
  firstName: string;
  lastName: string;
  email: string;
  /** Teléfono / WhatsApp de contacto directo del administrador. */
  contactPhone: string;
  avatarUrl: string;

  /* — Rol — */
  role: ClientAdminRole;

  /* — Preferencias — */
  preferences: UserProfilePreferences;
  /** Acento visual elegido en la personalización del onboarding. */
  accent: AccentId;

  /* — Configuración inicial (onboarding del usuario nuevo) — */
  onboarding: UserOnboardingState;

  /* — Credenciales — */
  auth: UserAuthIdentities;

  /* — Datos operativos de la cuenta — */
  documentId: string;
  /** Cargo dentro de la empresa ("Gerente General / Propietario"). */
  position: string;
  city: string;
  country: string;
  bio: string;
  billingEmail: string;
  /** Número dedicado a alertas operativas (puede diferir del contacto). */
  whatsappNumber: string;
  availabilityShift: AvailabilityShift;
  /**
   * Sede en la que el administrador opera por defecto. Es una preferencia de la
   * persona, no de la sede: por eso vive en el perfil y no en `BusinessInstance`.
   */
  preferredBusinessId: string;
  /** PIN de desbloqueo rápido en comandera / TPV (4 dígitos). */
  quickPin: string;
  twoFactorEnabled: boolean;

  /* — Auditoría — */
  createdAt: string;
  updatedAt: string;
  /** Último inicio de sesión registrado en este navegador. */
  lastSignInAt: string | null;
  /** `null` mientras no se haya establecido/cambiado la contraseña desde la app. */
  lastPasswordChangeAt: string | null;
}

/**
 * Campos editables del perfil.
 *
 * `userId`, `role` y `createdAt` quedan fuera a propósito: son identidad del
 * registro, no datos de formulario. Los bloques anidados se declaran parciales
 * porque un parche puede tocar un solo campo sin reescribir el resto.
 */
export type UserProfilePatch = Partial<
  Omit<
    UserProfile,
    "userId" | "role" | "createdAt" | "updatedAt" | "preferences" | "onboarding" | "auth"
  >
> & {
  preferences?: Partial<UserProfilePreferences>;
  onboarding?: Partial<UserOnboardingState>;
  auth?: Partial<Omit<UserAuthIdentities, "google">> & {
    google?: UserAuthIdentities["google"];
  };
};

/* ── Semilla de registro ───────────────────────────────────────────── */

/**
 * Datos que el alta conoce antes de que exista un perfil.
 *
 * `provider` describe **cómo se autenticó** la persona en ese primer contacto,
 * no quién es: el formulario tradicional trae contraseña, Google trae un `sub`.
 * Es lo que permite que la misma dirección de correo iniciada por Google se
 * vincule a la cuenta existente en lugar de crear una segunda.
 */
export interface ProfileSeed {
  email: string;
  firstName?: string;
  lastName?: string;
  provider?: AuthProviderId;
  /** `sub` de Google, sólo cuando `provider === "google"`. */
  googleSub?: string;
  /** Foto de perfil que ya conoce el proveedor (Google la entrega). */
  avatarUrl?: string;
}

/** Nombre completo de pila, sin espacios sobrantes. */
export function composeFullName(firstName: string, lastName: string): string {
  return [firstName, lastName].map(part => part.trim()).filter(Boolean).join(" ");
}
