import { ReactNode } from "react";
import { cn } from "@/utils";

/**
 * Available sizes for the Button component.
 *
 * - `"sm"` — Compact: `h-9` `px-3` `py-2` `text-sm` — toolbars, table rows, tight layouts
 * - `"md"` — Standard: `h-10` `px-5` `py-3.5` `text-sm` — forms, primary actions *(default)*
 * - `"lg"` — Prominent: `h-11` `px-6` `py-3` `text-base` — hero CTAs, landing pages
 * - `"icon"` — Square: `h-10` `w-10` — icon-only buttons (close, menu, toggle)
 * @kgId 9b2e241aa044
 */
export type ButtonSize = "sm" | "md" | "lg" | "icon";

/**
 * Visual style of the Button that communicates the action's importance.
 *
 * - `"primary"` — Solid brand background (`bg-brand-500`) for the **main action** in a context
 * - `"outline"` — Bordered with transparent fill for **secondary** or cancel actions
 * - `"destructive"` — Solid red background (`bg-error-500`) for **dangerous** actions (delete, remove)
 * - `"ghost"` — No background or border, only text — for **tertiary** or inline actions
 * @kgId 5545566324f6
 */
export type ButtonVariant = "primary" | "outline" | "destructive" | "ghost";

/**
 * Props for the **Button** component.
 * @kgId 7a3e2210984c
 */
export interface ButtonProps {
  /**
   * Button text or content rendered inside the `<button>` element.
   *
   * Accepts any `ReactNode` — plain text, icons, or composed elements.
   *
   * @example
   * ```tsx
   * <Button>Save changes</Button>
   * ```
   */
  children: ReactNode;

  /**
   * Controls the height, padding, and font size of the button.
   *
   * @default "md"
   *
   * @example
   * ```tsx
   * <Button size="sm">Compact</Button>
   * <Button size="lg">Prominent CTA</Button>
   * <Button size="icon"><CloseIcon /></Button>
   * ```
   */
  size?: ButtonSize;

  /**
   * Determines the visual style — solid fill, outlined border,
   * destructive red, or transparent ghost.
   *
   * @default "primary"
   *
   * @example
   * ```tsx
   * <Button variant="outline">Cancel</Button>
   * <Button variant="destructive">Delete account</Button>
   * <Button variant="ghost">Skip</Button>
   * ```
   */
  variant?: ButtonVariant;

  /**
   * Icon rendered **before** the button text.
   *
   * Wrapped in a `flex` container for vertical alignment.
   *
   * @example
   * ```tsx
   * <Button startIcon={<PlusIcon />}>Add item</Button>
   * ```
   */
  startIcon?: ReactNode;

  /**
   * Icon rendered **after** the button text.
   *
   * Wrapped in a `flex` container for vertical alignment.
   *
   * @example
   * ```tsx
   * <Button endIcon={<ArrowRightIcon />}>Next</Button>
   * ```
   */
  endIcon?: ReactNode;

  /**
   * Callback fired when the button is clicked.
   *
   * Not fired when `disabled` or `loading` is `true`.
   */
  onClick?: () => void;

  /**
   * When `true`, the button is visually dimmed (`opacity-50`,
   * `cursor-not-allowed`) and does not respond to clicks.
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * When `true`, shows a loading spinner as `startIcon`, disables
   * the button, and applies `opacity-80`. The original `startIcon`
   * is replaced by the spinner during loading.
   *
   * @default false
   *
   * @example
   * ```tsx
   * <Button loading>Saving...</Button>
   * ```
   */
  loading?: boolean;

  /**
   * HTML `type` attribute for the native `<button>` element.
   *
   * - `"button"` — Generic button, no form submission *(default)*
   * - `"submit"` — Submits the enclosing `<form>`
   * - `"reset"` — Resets the enclosing `<form>`
   *
   * @default "button"
   */
  type?: "button" | "submit" | "reset";

  /**
   * Additional CSS classes merged via `cn()` with `tailwind-merge`.
   *
   * Allows overriding padding, colors, width, or adding responsive variants.
   *
   * @example
   * ```tsx
   * <Button className="w-full">Full width</Button>
   * ```
   */
  className?: string;
}

/**
 * **Button** — Primary interactive element for triggering actions.
 *
 * Renders a native `<button>` with brand-consistent styling, optional
 * leading/trailing icons, a `loading` state, and four visual variants
 * that communicate the action's importance in the interface hierarchy.
 *
 * @remarks
 * Button is a **single-action trigger** — it executes an operation or
 * submits a form. It does not navigate (use `Link` for navigation).
 *
 * **When to use Button vs related components:**
 * - Use `Button` for actions that change state or submit data
 *   (e.g. *"Save"*, *"Delete"*, *"Confirm"*).
 * - Use **Link** for navigation to another page or section.
 * - Use **ButtonsGroup** for a set of related actions presented as a
 *   segmented control (e.g. view toggles, grouped filters).
 * - Use **Dropdown** when the action has multiple options that need
 *   a menu to choose from.
 *
 * **Variant guide:**
 * - `"primary"` — Main action per context. One per section max.
 * - `"outline"` — Secondary actions: Cancel, Back, alternative paths.
 * - `"destructive"` — Dangerous actions: Delete, Remove, Revoke.
 * - `"ghost"` — Tertiary/inline: Skip, Close, subtle toggles.
 *
 * **Limitations:**
 * - No `as` / polymorphism — always renders `<button>`. For anchor
 *   buttons, use `Link` with button styling via `className`.
 * - The `loading` spinner is a simple SVG animation — not the
 *   canonical `Spinner` component (to avoid circular dependency).
 *
 * @example Basic usage
 * ```tsx
 * <Button onClick={() => save()}>Save</Button>
 * ```
 *
 * @example All variants
 * ```tsx
 * <Button variant="primary">Confirm</Button>
 * <Button variant="outline">Cancel</Button>
 * <Button variant="destructive">Delete</Button>
 * <Button variant="ghost">Skip</Button>
 * ```
 *
 * @example With icons and loading
 * ```tsx
 * <Button startIcon={<PlusIcon />} size="sm">Add item</Button>
 * <Button loading>Saving...</Button>
 * <Button size="icon" variant="ghost"><CloseIcon /></Button>
 * ```
 *
 * @example Form submit
 * ```tsx
 * <form onSubmit={handleSubmit}>
 *   <Button type="submit">Submit</Button>
 *   <Button type="reset" variant="outline">Reset</Button>
 * </form>
 * ```
 *
 * @see {@link ButtonsGroup} — For grouped/segmented actions.
 * @see {@link Link} — For navigation instead of actions.
 * @see {@link Spinner} — Standalone loading indicator.
 * @kgId c90c4748b5a1
 */
const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className,
  disabled = false,
  loading = false,
  type = "button",
}) => {
  const sizeClasses: Record<ButtonSize, string> = {
    sm: "h-9 px-3 py-2 text-sm",
    md: "h-10 px-5 py-3.5 text-sm",
    lg: "h-11 px-6 py-3 text-base",
    icon: "h-10 w-10",
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
    outline:
      "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300",
    destructive:
      "bg-error-500 text-white shadow-theme-xs hover:bg-error-600 disabled:bg-error-300",
    ghost:
      "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-300",
  };

  const isDisabled = disabled || loading;

  const loadingSpinner = (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
        sizeClasses[size],
        variantClasses[variant],
        isDisabled && "cursor-not-allowed opacity-50",
        loading && !disabled && "opacity-80",
        className,
      )}
      onClick={onClick}
      disabled={isDisabled}
    >
      {loading ? (
        <span className="flex items-center">{loadingSpinner}</span>
      ) : (
        startIcon && <span className="flex items-center">{startIcon}</span>
      )}
      {children}
      {endIcon && !loading && (
        <span className="flex items-center">{endIcon}</span>
      )}
    </button>
  );
};

export default Button;
