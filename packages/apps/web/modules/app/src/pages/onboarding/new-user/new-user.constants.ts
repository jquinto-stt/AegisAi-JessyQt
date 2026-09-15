import {
  Compass,
  Globe2,
  Heart,
  Megaphone,
  MessageSquareQuote,
  Package,
  Search,
  ShoppingBag,
  Store,
  Users,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import type { ReferralSource, UsageReason } from "../../../auth/profile";
import type { MessageItem } from "../../onboarding.constants";

/* ── Pasos ─────────────────────────────────────────────────────────── */

/**
 * Clave estable de cada paso de `onboarding_new_user`.
 *
 * Todos los pasos existen siempre (no hay pasos condicionales como en el wizard
 * de sucursal), pero se siguen identificando por **clave** y no por número para
 * que el copy y el estado no dependan de un índice.
 */
export type NewUserStepKey = "personalization" | "country" | "usage" | "referral" | "support";

export interface NewUserStep {
  num: number;
  key: NewUserStepKey;
  label: string;
}

/**
 * `onboarding_new_user` — la puesta a punto de **la persona** que acaba de crear
 * su cuenta.
 *
 * No configura nada del negocio: no pregunta nombre de tienda, tipo de negocio,
 * dirección, catálogo ni canales. Tampoco vuelve a pedir nombre, apellido ni
 * correo, porque el registro ya los capturó. Son cinco pantallas, una pregunta
 * cada una, y la última es una nota libre que se puede dejar en blanco.
 */
export const NEW_USER_STEPS: NewUserStep[] = [
  { num: 1, key: "personalization", label: "Personalización" },
  { num: 2, key: "country", label: "País" },
  { num: 3, key: "usage", label: "Motivo de uso" },
  { num: 4, key: "referral", label: "Cómo nos conociste" },
  { num: 5, key: "support", label: "Soporte" },
];

/* ── Iconografía de las opciones ───────────────────────────────────── */

export const USAGE_REASON_ICONS: Record<UsageReason, LucideIcon> = {
  sell_online: ShoppingBag,
  control_stock: Package,
  manage_branches: Store,
  organize_team: Users,
  exploring: Compass,
};

export const REFERRAL_ICONS: Record<ReferralSource, LucideIcon> = {
  recommendation: MessageSquareQuote,
  social: Heart,
  search: Search,
  ads: Megaphone,
  event: CalendarDays,
  other: Globe2,
};

/* ── Copy del panel de marca ───────────────────────────────────────── */

/**
 * Copy rotativo del panel de marca, indexado por paso.
 *
 * Habla siempre de la **persona** y de su cuenta, nunca de una tienda: es el
 * error que este flujo existe para evitar.
 */
export const NEW_USER_MESSAGES: Record<NewUserStepKey, MessageItem[]> = {
  personalization: [
    {
      title: "Tu cuenta, a tu manera.",
      subtitle: "Elige cómo te verán dentro de Necto. Podrás cambiarlo cuando quieras.",
      badge: "Personalización",
    },
    {
      title: "Una cara, no un expediente.",
      subtitle: "Tu foto y tu acento acompañan cada acción que hagas en la plataforma.",
      badge: "Identidad",
    },
  ],
  country: [
    {
      title: "¿Desde dónde operas?",
      subtitle: "Tu país define tu mercado y la moneda con la que leerás tus cifras.",
      badge: "País",
    },
    {
      title: "Tu contexto, respetado.",
      subtitle: "Ajustamos formatos, moneda y ejemplos a tu región desde el primer día.",
      badge: "Localización",
    },
  ],
  usage: [
    {
      title: "Saber para qué vienes lo cambia todo.",
      subtitle: "Con tu motivo, Necto te muestra primero lo que de verdad vas a usar.",
      badge: "Motivo de uso",
    },
    {
      title: "Sin ruido de más.",
      subtitle: "Personalizamos tu panel según lo que quieres resolver, no según un manual.",
      badge: "Personalización",
    },
  ],
  referral: [
    {
      title: "¿Quién te trajo hasta aquí?",
      subtitle: "Nos ayuda a llegar mejor a otros negocios como el tuyo.",
      badge: "Descubrimiento",
    },
    {
      title: "Tu respuesta, en una sola pregunta.",
      subtitle: "Después de esto queda un último detalle, y ya estás dentro.",
      badge: "Casi listo",
    },
  ],
  support: [
    {
      title: "Cuéntanos qué necesitas.",
      subtitle: "Si tienes una duda o algo particular que resolver, déjanoslo por escrito.",
      badge: "Soporte",
    },
    {
      title: "Nadie empieza solo.",
      subtitle: "Un detalle tuyo nos ayuda a acompañarte mejor en los primeros días.",
      badge: "Acompañamiento",
    },
  ],
};
