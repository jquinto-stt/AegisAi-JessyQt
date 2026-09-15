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
 * - `"info"` — Blue (`blue-light-500`) — informational, neutral update, FYI
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
  const baseStyles =
    "inline-flex items-center justify-center gap-1 rounded-full font-medium";

  // Define size styles (font-size + padding progresivos)
  const sizeStyles = {
    xs: "text-[10px] px-1.5 py-0.5",
    sm: "text-theme-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3.5 py-1.5",
  };

  // Define color styles for variants
  const variants = {
    light: {
      primary:
        "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400",
      success:
        "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
      error:
        "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500",
      warning:
        "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400",
      info: "bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-500",
      light: "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80",
      dark: "bg-gray-500 text-white dark:bg-white/5 dark:text-white",
    },
    solid: {
      primary: "bg-brand-500 text-white dark:text-white",
      success: "bg-success-500 text-white dark:text-white",
      error: "bg-error-500 text-white dark:text-white",
      warning: "bg-warning-500 text-white dark:text-white",
      info: "bg-blue-light-500 text-white dark:text-white",
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
