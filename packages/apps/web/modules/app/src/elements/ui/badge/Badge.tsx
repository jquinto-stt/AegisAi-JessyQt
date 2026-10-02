import { cn } from "@/utils";

/**
 * Visual style of the Badge — controls background intensity.
 *
 * - `"light"` — Soft tinted background with colored text — subtle, non-intrusive *(default)*
 * - `"solid"` — Full-color background with white text — high contrast, attention-grabbing
 * @kgId 755fd044b136
 */
export type BadgeVariant = "light" | "solid";

/**
 * Available sizes for the Badge component.
 *
 * - `"xs"` — Tiny: `text-[10px]` `px-1.5` `py-0.5` — compact indicators, table cells
 * - `"sm"` — Small: `text-theme-xs` `px-2` `py-0.5` — inline labels, tags
 * - `"md"` — Standard: `text-sm` `px-2.5` `py-1` — default for most contexts *(default)*
 * - `"lg"` — Large: `text-base` `px-3.5` `py-1.5` — prominent status, hero sections
 * @kgId 316444bbd12b
 */
export type BadgeSize = "xs" | "sm" | "md" | "lg";

/**
 * Semantic color of the Badge that communicates meaning at a glance.
 *
 * - `"primary"` — Brand color (`brand-500`) — general-purpose highlight, default category
 * - `"success"` — Green (`success-500`) — completed, active, approved, positive outcome
 * - `"error"` — Red (`error-500`) — failed, rejected, critical issue in the view
 * - `"warning"` — Orange (`warning-500`) — caution, pending review, needs attention
 * - `"info"` — Celeste (`accent-500`) — informational, neutral update, FYI
 * - `"light"` — Gray (`gray-100`/`gray-400`) — neutral, disabled, archived
 * - `"dark"` — Dark gray (`gray-500`/`gray-700`) — strong neutral, inverted context
 * @kgId 646ae04780fb
 */
export type BadgeColor =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

/**
 * Props for the **Badge** component.
 * @kgId 24ca87932ad1
 */
export interface BadgeProps {
  /**
   * Visual style — `"light"` for subtle tinted backgrounds,
   * `"solid"` for full-color high-contrast backgrounds.
   *
   * @default `"light"`
   */
  variant?: BadgeVariant;

  /**
   * Controls height, padding, and font size of the badge.
   *
   * @default `"md"`
   */
  size?: BadgeSize;

  /**
   * Semantic color that communicates the badge's meaning.
   *
   * @default `"primary"`
   */
  color?: BadgeColor;

  /**
   * Icon rendered **before** the badge text.
   */
  startIcon?: React.ReactNode;

  /**
   * Icon rendered **after** the badge text.
   */
  endIcon?: React.ReactNode;

  /**
   * Badge content — typically short text like a status label,
   * count, or category name.
   */
  children: React.ReactNode;

  /**
   * Additional CSS classes merged with `cn()`.
   *
   * Useful for overriding padding, colors, or width in specific contexts.
   */
  className?: string;
}

/**
 * Badge — Compact label for highlighting status, category, or metadata.
 *
 * Renders an inline `<span>` with rounded-full styling, semantic color,
 * and optional leading/trailing icons. Badges are **read-only indicators**
 * — they display information but are not interactive.
 *
 * @remarks
 * **When to use Badge vs related components:**
 * - Use `Badge` for static labels that classify or tag content
 *   (e.g. *"Active"*, *"Pro"*, *"New"*, *"3 items"*).
 * - Use **Alert** for messages that require user attention with
 *   more detail and optional actions.
 * - Use **Notification** for transient feedback (toasts, banners).
 * - Use **Tooltip** to show contextual info on hover — Badge is
 *   always visible.
 *
 * **Variant guide:**
 * - `"light"` — Default. Subtle background tint, colored text.
 *   Best for inline use within tables, cards, lists.
 * - `"solid"` — Full-color background, white text. Use when the
 *   badge needs to stand out (e.g. status in a dashboard header).
 *
 * **Limitations:**
 * - Not interactive — no `onClick`, no dismiss/remove action.
 *
 * @example Basic usage
 * ```tsx
 * <Badge color="success">Active</Badge>
 * ```
 *
 * @example Solid variant with icon
 * ```tsx
 * <Badge variant="solid" color="error" startIcon={<XIcon />}>
 *   Rejected
 * </Badge>
 * ```
 *
 * @example All sizes
 * ```tsx
 * <Badge size="xs">Tiny</Badge>
 * <Badge size="sm">Small</Badge>
 * <Badge size="md">Medium</Badge>
 * <Badge size="lg">Large</Badge>
 * ```
 *
 * @see {@link Alert} — For detailed messages with actions.
 * @see {@link Notification} — For transient toast/banner feedback.
 * @see {@link Tooltip} — For hover-triggered contextual info.
 * @kgId b83bbcdcc3d9
 */
const Badge: React.FC<BadgeProps> = ({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  children,
  className,
}) => {
  // `whitespace-nowrap` es deliberado: un badge es una ETIQUETA, y una etiqueta
  // partida en dos líneas deja de leerse de un vistazo. Sin él, «De baja» se
  // partía como «De / baja» dentro de una columna estrecha, y el público
  // objetivo (operadores con poca vista) lee el estado justo en ese badge.
  const baseStyles =
    "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full font-medium";

  // Define size styles (font-size + padding progresivos)
  const sizeStyles = {
    xs: "text-[10px] px-1.5 py-0.5",
    sm: "text-theme-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3.5 py-1.5",
  };

  // Define color styles for variants
  //
  // ── Tinta del badge en modo claro: paso 700, no 500/600 ───────────────────
  //
  // Medido con la fórmula de contraste de WCAG 2.1 sobre el fondo real de cada
  // variante, el paso 500/600 no llegaba a AA en un badge de 10–12 px:
  //
  //   accent-500 sobre accent-50    2.38:1   (el peor de todo el módulo)
  //   success-600 sobre success-50  3.54:1
  //   warning-600 sobre warning-50  3.34:1
  //   error-600 sobre error-50      4.44:1
  //
  // El paso 700 de la MISMA rampa sí cumple, sin salirse de la paleta de marca:
  // accent-700 5.25:1 · success-700 5.13:1 · warning-700 5.20:1 · error-700 6.05:1.
  //
  // Importa porque el público objetivo son operadores con poca vista: un badge
  // de estado que no se lee no informa, y el badge es justo donde el módulo dice
  // si algo está bien o mal. `brand` no se toca en claro: 500 sobre 50 da
  // 4.33:1 y es el color de la casa.
  const variants = {
    light: {
      primary:
        "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400",
      success:
        "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500",
      error:
        "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-500",
      warning:
        "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
      info: "bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-500",
      light: "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80",
      // En claro, `dark` era `bg-gray-500` + `text-white`: blanco sobre #667085 da
      // 4.97:1, que pasa AA raspando pero se cae a 3.10:1 en cuanto el texto lleva
      // la opacidad de la variante. En un badge de 10 px eso no se lee, y un badge
      // de estado que no se lee no informa. Se alinea con `light`: fondo de tinta
      // suave y texto de paso 700, que es lo que mide 6.98:1.
      dark: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white",
    },
    solid: {
      primary: "bg-brand-500 text-white dark:text-white",
      success: "bg-success-500 text-white dark:text-white",
      error: "bg-error-500 text-white dark:text-white",
      warning: "bg-warning-500 text-white dark:text-white",
      info: "bg-accent-500 text-white dark:text-white",
      light: "bg-gray-400 dark:bg-white/5 text-white dark:text-white/80",
      dark: "bg-gray-700 text-white dark:text-white",
    },
  };

  // Get styles based on size and color variant
  const sizeClass = sizeStyles[size];
  const colorStyles = variants[variant][color];

  return (
    <span className={cn(baseStyles, sizeClass, colorStyles, className)}>
      {startIcon && <span className="mr-1">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-1">{endIcon}</span>}
    </span>
  );
};

export default Badge;
