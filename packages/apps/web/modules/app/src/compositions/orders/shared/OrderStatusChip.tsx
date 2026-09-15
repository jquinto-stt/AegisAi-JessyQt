/**
 * Pedidos — Chip de estado de una orden.
 *
 * ⚠️ Pieza **única** para todo el módulo (tabla, detalle, programados, widget).
 * Antes de crear otro chip en una pantalla, se usa este: si cada vista pintara su
 * propio estado, dos pantallas podrían mostrar el mismo estado con colores
 * distintos.
 *
 * ⚠️ §27 — el chip lleva **icono además de color**: el estado se distingue sin
 * depender del color.
 *
 * ── Por qué es un `Badge` del catálogo ─────────────────────────────────────
 *
 * Hasta ahora el chip era un `<span>` con un mapa de clases propio
 * (`ORDER_STATUS_CHIP_CLASSES`). El catálogo ya tiene esa pieza: `Badge` es
 * "píldora inline con texto e iconos opcionales", con variantes semánticas de
 * color y `startIcon` — y su propia documentación justifica el icono por la misma
 * razón que §27: "icon communicates meaning alongside color, providing redundancy
 * for colorblind users".
 *
 * Así que el chip **no cambia de aspecto ni de significado**: cambia de dueño.
 * El mapa de tono → clases se sustituye por tono → color de `Badge`, y el icono
 * pasa de hijo suelto a `startIcon`.
 */

import { Badge, type BadgeColor } from "@/elements";
import { cn } from "@/utils";
import type { OrderStatus } from "@/contracts/order.contract";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
} from "../order-status.constants";
import type { OrderStatusTone } from "../order-status.constants";
import {
  ORDER_STATUS_DOT_CLASSES,
  ORDER_STATUS_ICONS,
} from "../order-presentation.utils";

/**
 * El tono semántico del estado, traducido al color del `Badge`.
 *
 * ⚠️ `progress` necesita el ajuste de modo oscuro. El `Badge` del catálogo pinta
 * su variante `warning` con `dark:text-orange-400`, que no pertenece a la paleta
 * semántica del proyecto: aquí "en curso" es `warning-*`, y el mismo tono no
 * puede leerse con dos vocabularios de color según la pantalla. Se corrige en
 * esta única tabla.
 */
const TONE_TO_BADGE: Record<OrderStatusTone, { color: BadgeColor; className?: string }> = {
  neutral: { color: "light" },
  accent: { color: "primary" },
  progress: { color: "warning", className: "dark:text-warning-500" },
  success: { color: "success" },
  danger: { color: "error" },
};

export interface OrderStatusChipProps {
  status: OrderStatus;
  /** `chip` para tablas y detalle; `dot` para el punto del board y de listas. */
  variant?: "chip" | "dot";
  className?: string;
}

export function OrderStatusChip({ status, variant = "chip", className = "" }: OrderStatusChipProps) {
  const tone = ORDER_STATUS_TONES[status];
  const label = ORDER_STATUS_LABELS[status];
  const Icon = ORDER_STATUS_ICONS[status];

  if (variant === "dot") {
    // ⚠️ El punto **no** es un `Badge`: es un cuadrado de 2×2 sin texto, y el
    // catálogo no tiene esa pieza. Se queda nativo, con su `title`/`aria-label`
    // porque es el único vehículo del significado cuando no hay rótulo.
    return (
      <span
        data-order-status={status}
        title={label}
        aria-label={label}
        className={`inline-block h-2 w-2 flex-none rounded-full ${ORDER_STATUS_DOT_CLASSES[tone]} ${className}`}
      />
    );
  }

  const view = TONE_TO_BADGE[tone];

  return (
    // ⚠️ El ancla va en un `<span>` **nativo** que envuelve al `Badge`: los
    // componentes del DS no reenvían props nativas (sólo `intent`), así que un
    // `data-order-status` puesto en el `Badge` desaparecería del DOM en silencio
    // y las guardas no podrían identificar el estado de la fila (§14: las
    // acciones se derivan del estado, así que el estado tiene que ser legible).
    <span data-order-status={status} className="inline-flex">
      <Badge
        color={view.color}
        size="sm"
        // `size="sm"` fija `text-theme-xs` (la tipografía del chip); el relleno se
        // restituye al del chip original para que la columna "Estado" no cambie
        // de alto.
        className={cn("whitespace-nowrap px-2.5 py-1", view.className, className)}
        startIcon={<Icon className="h-3.5 w-3.5 flex-none" aria-hidden />}
      >
        {label}
      </Badge>
    </span>
  );
}

export default OrderStatusChip;
