import {
  BookOpen,
  Clock,
  FileText,
  Mail,
  MessagesSquare,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import type { SelectOption } from "@/elements";
import type { NumberedStep } from "../shared/NumberedSteps";

/* ── Soporte: contenido estático ─────────────────────────────────────────
 * Los textos viven aquí y no dentro del JSX, igual que en `help.constants.ts`:
 * los componentes quedan de presentación y cambiar una respuesta no obliga a
 * tocar maquetación.
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ Buzón de soporte. Es el **único** sitio donde se declara: los canales y el
 * pie del formulario lo leen de aquí para que no puedan aparecer dos
 * direcciones distintas en la misma página.
 *
 * Sigue siendo un buzón de producto —no hay uno real conectado todavía—, así que
 * el día que exista se cambia esta línea y nada más.
 */
export const SUPPORT_EMAIL = "soporte@necto.app";

export interface SupportSeal {
  id: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Sellos del hero. Describen lo que el equipo hace, en el mismo tono que los
 * términos ("Intentamos responder en un plazo de dos días hábiles") y no lo que
 * sería bonito prometer: no hay atención 24/7 ni teléfono.
 */
export const SUPPORT_SEALS: SupportSeal[] = [
  { id: "human", label: "Te responde una persona", icon: UserRoundCheck },
  { id: "sla", label: "Respuesta en 2 días hábiles", icon: Clock },
  { id: "followup", label: "Seguimiento por escrito", icon: MessagesSquare },
  { id: "kb", label: "Centro de ayuda siempre abierto", icon: BookOpen },
];

export interface SupportChannel {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Rótulo del enlace de la tarjeta. */
  action: string;
  /** Ruta interna. Excluyente con `href`. */
  to?: string;
  /** Destino externo, `mailto:` o ancla de la propia página. Excluyente con `to`. */
  href?: string;
}

/**
 * Canales, ordenados de más a menos inmediato.
 *
 * El primero es el centro de ayuda a propósito: la mayoría de las consultas ya
 * tienen respuesta escrita, y poner el formulario por delante de la respuesta
 * sería pedirle a la persona que espere dos días por algo que puede leer ahora.
 */
export const SUPPORT_CHANNELS: SupportChannel[] = [
  {
    id: "ayuda",
    title: "Centro de ayuda",
    description:
      "Los primeros pasos del alta y las siete dudas que más nos llegan. Suele resolver la consulta sin esperar.",
    icon: BookOpen,
    action: "Abrir el centro de ayuda",
    to: "/ayuda",
  },
  {
    id: "formulario",
    title: "Formulario de soporte",
    description:
      "Cuéntanos el caso con tus palabras. Queda registrado con una referencia que puedes citar después.",
    icon: FileText,
    action: "Ir al formulario",
    // Ancla de la propia página, no ruta: se resuelve con un `<a href="#…">`
    // nativo para que el salto lo haga el navegador. Con el `Link` del router
    // sería un cambio de hash que no desplaza la vista.
    href: "#solicitud",
  },
  {
    id: "correo",
    title: "Correo",
    description:
      "Para casos que necesitan adjuntar capturas, facturas o cualquier archivo que no cabe en un formulario.",
    icon: Mail,
    action: "Escribir al buzón",
    href: `mailto:${SUPPORT_EMAIL}`,
  },
];

/**
 * Motivos del formulario. Son los ámbitos que el producto **tiene** —los mismos
 * que separa el asistente de alta y el centro de ayuda—, no una taxonomía
 * genérica de mesa de ayuda: quien elige "Pedidos, inventario o catálogo" ya
 * sabe que está en el sitio correcto.
 */
export const SUPPORT_TOPICS: SelectOption[] = [
  { value: "acceso", label: "Acceso y contraseña" },
  { value: "perfil", label: "Mi cuenta o mi perfil" },
  { value: "tienda", label: "Organización y módulos" },
  { value: "operacion", label: "Pedidos, inventario o catálogo" },
  { value: "canales", label: "Canales de entrada y WhatsApp" },
  { value: "facturacion", label: "Facturación y planes" },
  { value: "sugerencia", label: "Sugerencia o mejora" },
  { value: "otro", label: "Otro asunto" },
];

/** Rótulo del motivo elegido. Se usa al confirmar, para devolver lo que se envió. */
export function supportTopicLabel(value: string): string {
  return SUPPORT_TOPICS.find(topic => topic.value === value)?.label ?? value;
}

/** Longitudes mínimas del formulario. Viven aquí para que la validación y la
 *  ayuda visible no puedan discrepar. */
export const SUPPORT_SUBJECT_MIN = 5;
export const SUPPORT_MESSAGE_MIN = 20;
export const SUPPORT_MESSAGE_MAX = 1200;

/** Qué pasa después de enviar. Ver `support-requests.ts` antes de creérselo. */
export const SUPPORT_STEPS: NumberedStep[] = [
  {
    num: 1,
    title: "Registramos la solicitud",
    body: "Al enviarla te damos una referencia con la fecha. Guárdala: es lo que nos permite encontrar tu caso sin que tengas que volver a explicarlo.",
  },
  {
    num: 2,
    title: "Revisamos y te escribimos",
    body: "Contestamos al correo que dejes en el formulario. Si nos falta un dato, te lo pedimos en el mismo hilo en lugar de abrir otro.",
  },
  {
    num: 3,
    title: "Cerramos el caso",
    body: "Cuando quede resuelto te lo confirmamos. Si la respuesta le sirve a más gente, la añadimos al centro de ayuda para que la siguiente persona no tenga que preguntar.",
  },
];
