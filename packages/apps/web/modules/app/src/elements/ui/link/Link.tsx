import { Link as RouterLink } from "react-router";
import { cn } from "@/utils";

/**
 * Color variant of the Link that communicates its purpose or context.
 *
 * - `"primary"` — Muted gray (`text-gray-500`) — general-purpose, default navigation
 * - `"secondary"` — Brand color (`text-brand-500`) — highlighted or promoted links
 * - `"success"` — Green (`text-success-500`) — positive context, completed actions
 * - `"danger"` — Red (`text-error-500`) — destructive or warning navigation
 * - `"warning"` — Orange (`text-warning-500`) — caution, attention-needed links
 * - `"gray"` — Gray (`text-gray-500`) — neutral, secondary navigation *(default)*
 * - `"accent"` — Celeste (`text-accent-500`) — informational links
 * - `"dark"` — Dark gray (`text-gray-800`) — high-contrast, prominent links
 * @kgId 765733ff037f
 */
export type LinkVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "gray"
  | "accent"
  | "dark";

/**
 * Opacity level applied to the link text.
 *
 * Controls the visual weight of the link — lower values make it
 * more subtle, higher values make it more prominent. Useful for
 * creating visual hierarchy among multiple links.
 *
 * - `10` — Nearly invisible, very subtle
 * - `25` — Light, background-level
 * - `50` — Medium, balanced
 * - `75` — Strong, noticeable
 * - `100` — Full opacity, maximum prominence
 * @kgId d755b7c23c7f
 */
export type LinkOpacity = 10 | 25 | 50 | 75 | 100;

/**
 * Props for the **Link** component.
 * @kgId ceaed73abcd1
 */
export interface LinkProps {
  /**
   * Navigation target — passed to React Router's `<Link to={...}>`.
   *
   * @example
   * ```tsx
   * <Link to="/dashboard" text="Go to Dashboard" />
   * ```
   */
  to: string;

  /**
   * Text content displayed as the link label.
   *
   * @example
   * ```tsx
   * <Link to="#" text="Click here" variant="secondary" />
   * ```
   */
  text: string;

  /**
   * Color variant that communicates the link's purpose.
   * Each color can convey additional meaning to the user
   * depending on the context.
   *
   * @default `"gray"`
   *
   * @example
   * ```tsx
   * <Link to="#" text="Learn more" variant="secondary" />
   * <Link to="#" text="Delete" variant="danger" />
   * ```
   */
  variant?: LinkVariant;

  /**
   * When `true`, renders an underline below the link text to
   * visually emphasize it.
   *
   * @default `false`
   *
   * @example
   * ```tsx
   * <Link to="#" text="Terms of Service" underline />
   * ```
   */
  underline?: boolean;

  /**
   * Sets a fixed opacity level on the link text. Useful for
   * creating visual hierarchy — lower values are more subtle,
   * higher values are more prominent.
   *
   * When set, overrides the `variant` color with a gray at
   * the specified opacity.
   *
   * @example
   * ```tsx
   * <Link to="#" text="Subtle link" opacity={25} />
   * <Link to="#" text="Strong link" opacity={75} />
   * ```
   */
  opacity?: LinkOpacity;

  /**
   * When `true`, the link transitions to a different opacity
   * on hover. The hover target opacity defaults to `50` unless
   * a specific `opacity` value is provided.
   *
   * Combine with `opacity` to create hover-reveal effects
   * (e.g. start at full opacity, fade on hover).
   *
   * @default `false`
   *
   * @example
   * ```tsx
   * <Link to="#" text="Hover me" hoverEffect opacity={75} />
   * ```
   */
  hoverEffect?: boolean;

  /**
   * Additional CSS classes applied to the `<a>` element.
   */
  className?: string;
}

/**
 * Link — Navigational text element for routing between pages.
 *
 * Renders a React Router `<Link>` with semantic color variants,
 * optional underline, and opacity controls for visual hierarchy.
 * Use links for navigation — moving the user to a different page
 * or section.
 *
 * @remarks
 * **When to use Link vs related components:**
 * - Use `Link` for navigation to another page or section.
 * - Use **Button** for actions that change state or submit data
 *   (e.g. *"Save"*, *"Delete"*). Buttons do things, links go places.
 * - Use **Breadcrumb** for hierarchical navigation trails.
 *
 * **Color variants:**
 * - Each color can convey meaning depending on context — `"danger"`
 *   for destructive navigation, `"success"` for positive outcomes,
 *   `"secondary"` (brand color) for promoted links.
 *
 * **Opacity:**
 * - Use `opacity` to create visual hierarchy among multiple links.
 * - Combine `hoverEffect` with `opacity` for interactive fade effects.
 * - Opacity classes use explicit mappings for TailwindCSS v4
 *   compatibility. See `TECH_DEBT.md` for details.
 *
 * **Limitations:**
 * - Opacity only works with gray tones — does not apply to colored
 *   variants. See `TECH_DEBT.md` (Link - Clases dinámicas de opacidad).
 * - Coupled to `react-router` — cannot use with other routers.
 *   See `TECH_DEBT.md` (A2.5 DIP violation).
 * - `text` prop is string-only — no `ReactNode` support.
 *
 * @example Basic usage
 * ```tsx
 * <Link to="/about" text="About us" />
 * ```
 *
 * @example Colored variants
 * ```tsx
 * <Link to="#" text="Primary" variant="primary" />
 * <Link to="#" text="Danger" variant="danger" />
 * <Link to="#" text="Brand link" variant="secondary" />
 * ```
 *
 * @example With underline
 * ```tsx
 * <Link to="#" text="Terms of Service" variant="secondary" underline />
 * ```
 *
 * @example Opacity and hover effect
 * ```tsx
 * <Link to="#" text="Subtle" opacity={25} />
 * <Link to="#" text="Hover fade" hoverEffect opacity={75} />
 * ```
 *
 * @see {@link Button} — For actions instead of navigation.
 * @see {@link Breadcrumb} — For hierarchical navigation trails.
 * @kgId 9e333efc9128
 */
const Link: React.FC<LinkProps> = ({
  to,
  text,
  variant = "gray",
  underline = false,
  opacity,
  hoverEffect = false,
  className,
}) => {
  // Base styles
  const baseStyles = "text-sm font-normal transition-colors";

  // Variant colors (used when no opacity is set)
  const variants: Record<string, string> = {
    primary: "text-gray-500 dark:text-gray-400",
    secondary: "text-brand-500 dark:text-brand-500",
    success: "text-success-500",
    danger: "text-error-500",
    warning: "text-warning-500",
    "accent": "text-accent-500",
    gray: "text-gray-500 dark:text-gray-400",
    dark: "text-gray-800 dark:text-white/90",
  };

  // Opacity classes - must be explicit for Tailwind v4 to generate them
  const opacityClasses: Record<number, string> = {
    10: "text-gray-500/10 dark:text-gray-400/10",
    25: "text-gray-500/25 dark:text-gray-400/25",
    50: "text-gray-500/50 dark:text-gray-400/50",
    75: "text-gray-500/75 dark:text-gray-400/75",
    100: "text-gray-500 dark:text-gray-400",
  };

  // Hover opacity classes - when hoverEffect is true, hover changes to the opacity value
  const hoverOpacityClasses: Record<number, string> = {
    10: "hover:text-gray-500/10 dark:hover:text-gray-400/10",
    25: "hover:text-gray-500/25 dark:hover:text-gray-400/25",
    50: "hover:text-gray-500/50 dark:hover:text-gray-400/50",
    75: "hover:text-gray-500/75 dark:hover:text-gray-400/75",
    100: "hover:text-gray-500 dark:hover:text-gray-400",
  };

  // Determine color class based on opacity, hoverEffect, or variant
  // When hoverEffect is true, use solid color (variant) as base, hover will change opacity
  const colorClass = hoverEffect 
    ? variants[variant] 
    : (opacity ? opacityClasses[opacity] : variants[variant]);

  // Hover effects - when enabled, hover changes to the specified opacity
  const hoverClass = hoverEffect ? hoverOpacityClasses[opacity || 50] : "";

  // Underline handling
  const underlineClass = underline ? "underline" : "";

  return (
    <RouterLink
      to={to}
      className={cn(baseStyles, colorClass, hoverClass, underlineClass, className)}
    >
      {text}
    </RouterLink>
  );
};

export default Link;
