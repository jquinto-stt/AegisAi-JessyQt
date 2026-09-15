/**
 * Pedidos — Vocabulario de presentación.
 * ======================================
 *
 * Traduce el contrato de dominio a las piezas visuales del design system.
 *
 * ⚠️ **Este archivo es la frontera entre "dominio" y "pinta".** El dominio
 * (`order.contract.ts`, `order-status.constants.ts`) no conoce colores ni clases
 * de Tailwind: declara un `OrderStatusTone` semántico. Aquí ese tono se convierte
 * en clases concretas, en un solo sitio.
 *
 * ⚠️ §27 — **los estados deben identificarse sin depender sólo del color.** Por
 * eso cada estado tiene tono **e** icono: dos órdenes con tonos parecidos siguen
 * siendo distinguibles por su icono, y quien no distingue color lee la forma.
 *
 * ⚠️ §27 — **un acento por vista** (regla de marca del proyecto). Los estados no
 * se pintan de naranja: el acento de marca está reservado para la acción
 * principal. El color de estado es verde (logrado), ámbar (en curso) y rojo
 * (abortado), más gris para lo que aún no compromete.
 */

import {
  CheckCircle2,
  CircleDashed,
  Clock3,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Truck,
  Wrench,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { OrderStatus } from "@/contracts/order.contract";
import type { OrderStatusTone } from "./order-status.constants";

/* ── Estado: chip de color (§11, §12, §13) ─────────────────────────────────── */

/**
 * El chip de estado ya **no** vive aquí: es un `Badge` del catálogo.
 *
 * ⚠️ Hubo un `ORDER_STATUS_CHIP_CLASSES` con el par claro/oscuro de cada tono, y
 * se retiró al adoptar `Badge` en `shared/OrderStatusChip.tsx`. Mantener el mapa
 * habría dejado dos definiciones del mismo color de estado —una usada y otra
 * muerta— y la primera en divergir. La traducción de tono a color es ahora una
 * sola tabla (`TONE_TO_BADGE`) junto al componente que la usa.
 *
 * ⚠️ Lo que **sí** sigue aquí es el punto de color: el `dot` no es un `Badge`
 * (es un cuadrado de 2×2 sin texto, y el catálogo no tiene esa pieza).
 */

/** Punto de color del estado, para tablas y listas. */
export const ORDER_STATUS_DOT_CLASSES: Record<OrderStatusTone, string> = {
  neutral: "bg-gray-400",
  accent: "bg-brand-500",
  progress: "bg-warning-500",
  success: "bg-success-500",
  danger: "bg-error-500",
};

/** Color del texto del contador de columna del board. */
export const ORDER_STATUS_TEXT_CLASSES: Record<OrderStatusTone, string> = {
  neutral: "text-gray-500 dark:text-gray-400",
  accent: "text-brand-600 dark:text-brand-400",
  progress: "text-warning-700 dark:text-warning-500",
  success: "text-success-700 dark:text-success-500",
  danger: "text-error-600 dark:text-error-500",
};

/* ── Estado: icono (§27 — no depender sólo del color) ──────────────────────── */

export const ORDER_STATUS_ICONS: Record<OrderStatus, LucideIcon> = {
  PENDING: CircleDashed,
  CONFIRMED: ShieldCheck,
  IN_PREPARATION: Wrench,
  READY: PackageCheck,
  IN_TRANSIT: Truck,
  DELIVERED: CheckCircle2,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
  RETURNED: RotateCcw,
};

/**
 * Icono de la **modalidad de entrega**.
 *
 * ⚠️ Se distingue del icono de estado: en la tabla conviven ambos y reutilizar el
 * mismo glifo para "en tránsito" (estado) y "envío" (modalidad) los haría
 * indistinguibles en la misma fila.
 */
export const FULFILLMENT_ICONS: Record<string, LucideIcon> = {
  pickup: PackageCheck,
  delivery: Truck,
  on_site: Clock3,
  service: Wrench,
};

/* ── Estado del pago ───────────────────────────────────────────────────────── */

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Sin pagar",
  pending: "Pago pendiente",
  paid: "Pagado",
  refunded: "Reembolsado",
};

/**
 * El chip del estado del pago también es un `Badge` del catálogo.
 *
 * ⚠️ Aquí vivía `PAYMENT_STATUS_CHIP_CLASSES`, retirado al adoptar `Badge` en
 * `OrderDetailDrawer.tsx`. La traducción de estado a color es ahora
 * `PAYMENT_STATUS_TO_BADGE`, junto al componente que la usa: un mapa de clases
 * sin consumidor es una segunda fuente de verdad esperando a divergir.
 */

/* ── Utilidades de formato ─────────────────────────────────────────────────── */

/**
 * Formatea un importe en la moneda de la **tienda**.
 *
 * ⚠️ La moneda se recibe como parámetro: no vive en la orden (§5). Duplicarla por
 * orden permitiría que una orden contradijera la moneda de su tienda.
 */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("es-CO")}`;
  }
}

/** Formatea cantidades: `4.5` → "4,5"; `10` → "10". */
export function formatQuantity(quantity: number): string {
  return Number.isInteger(quantity)
    ? String(quantity)
    : quantity.toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

/** Fecha corta para tabla: "hoy 14:32" / "12 sep 09:04". */
export function formatOrderDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const time = date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `hoy ${time}`;

  return `${date.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} ${time}`;
}

/**
 * "hace 2 min" / "hace 3 h" / "hace 2 d".
 * Para la actividad reciente del widget (§25) y los lapsos del board.
 */
export function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60_000));

  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

/**
 * Tiempo restante hasta una fecha futura: "en 45 min" / "en 3 h" / "vencida".
 * Es lo que hace útil la vista de Programados (§15).
 */
export function formatCountdown(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "vencida";

  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) return `en ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `en ${hours} h`;

  return `en ${Math.round(hours / 24)} d`;
}

/** Etiqueta del origen/canal (§18) — el canal se nombra, no se implementa. */
export function formatSourceLabel(source: { type: string; label?: string }): string {
  if (source.label) return source.label;
  const known: Record<string, string> = {
    COUNTER: "Mostrador",
    WEB: "Tienda web",
    POS: "POS",
    WHATSAPP: "WhatsApp",
    API: "API",
  };
  // Un canal no catalogado se muestra tal cual: es un vocabulario abierto (§18).
  return known[source.type] ?? source.type;
}

/** Nombre corto para el board: "#1042". */
export function orderShortNumber(number: string): string {
  return number;
}

/* ── Tiempo operativo (§12, §15, §16, §17) ─────────────────────────────────── */

/**
 * Minutos transcurridos desde un instante ISO. Nunca negativo.
 *
 * ⚠️ Es la **única** forma de medir "cuánto lleva así" una orden. Un `Date.now()`
 * restado a mano en cada pantalla daría tres definiciones de "demorada" —una por
 * vista— y el operador vería umbrales distintos según dónde mirara.
 */
export function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
}

/**
 * Minutos entre dos instantes ISO. Nunca negativo.
 *
 * ⚠️ Es **distinto** de `minutesSince`, y confundirlos es un error con
 * consecuencias: aquél mide contra *ahora* y responde "¿cuánto lleva así?";
 * éste mide un tramo **ya cerrado** del historial y responde "¿cuánto estuvo
 * aquí?". Un tramo histórico medido con `minutesSince` crecería solo con el reloj
 * —una orden que estuvo 40 min en alistamiento aparecería con 3 días de
 * alistamiento—, y la auditoría diría lo contrario de lo que pasó.
 */
export function minutesBetween(fromIso: string, toIso: string): number {
  return Math.max(0, Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 60_000));
}

/** "14:32" — hora del día, para las franjas de programación (§15). */
export function formatTimeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Encabezado de grupo por día: "Hoy" / "Mañana" / "Ayer" / "12 sep".
 *
 * ⚠️ §15 — Programados se agrupa por **cuándo debe ejecutarse** la orden, no por
 * cuándo se pidió. Por eso la etiqueta se calcula sobre `scheduledFor` y no sobre
 * `createdAt`: son hechos distintos y mezclarlos mostraría el día equivocado.
 */
export function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(date) - startOfDay(new Date())) / 86_400_000);

  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days === -1) return "Ayer";
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

/** Clave estable de día local (`2026-09-14`), para agrupar sin depender del copy. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "14:32 – 16:00", o sólo "14:32" cuando la tienda no declara fin de franja (§15). */
export function formatScheduleWindow(fromIso: string, untilIso?: string): string {
  const from = formatTimeOfDay(fromIso);
  return untilIso ? `${from} – ${formatTimeOfDay(untilIso)}` : from;
}

/**
 * Duración en minutos → "18 min" / "1 h 05 min" / "3 h".
 *
 * ⚠️ Se formatea como **duración transcurrida**, no como hora: "1 h 05 min" dice
 * cuánto lleva la orden esperando, que es la pregunta del operador. Un "01:05"
 * se confundiría con una hora del reloj.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")} min`;
}
