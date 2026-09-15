import { useState } from "react";
import {
  AlertHexaIcon,
  CheckCircleIcon,
  CloseIcon,
  ErrorHexaIcon,
  InfoIcon,
} from "@/icons";
import { cn } from "@/utils";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Layout style that determines the notification's structure and behavior.
 *
 * - `"toast"` — Compact card with icon, title, optional description, and
 *   close button. Auto-hides after `hideDuration`. *(default)*
 * - `"banner"` — Wider panel with icon, title, message, and action buttons
 *   side by side. For announcements or updates that need user action.
 * - `"consent"` — Full-width panel with message, secondary text action,
 *   and stacked action buttons. For cookie consent, terms acceptance, etc.
 * @kgId 3d74ea7826a2
 */
export type NotificationLayout = "toast" | "banner" | "consent";

/**
 * Semantic variant that determines the toast icon and border color.
 *
 * Only applies to `layout="toast"`.
 *
 * - `"success"` — Green border + check icon — operation completed
 * - `"info"` — Blue border + info icon — informational message
 * - `"warning"` — Orange border + alert icon — caution, attention needed
 * - `"error"` — Red border + error icon — something went wrong
 * @kgId 1f5de28a7f09
 */
export type NotificationVariant = "success" | "info" | "warning" | "error";

/**
 * Action button definition used in `"banner"` and `"consent"` layouts.
 * @kgId 4e0f6018db6c
 */
export interface NotificationAction {
  /** Button label text */
  label: string;
  /** Visual style — `"primary"` for solid brand, `"outline"` for bordered */
  variant: "primary" | "outline";
  /** Callback fired when the button is clicked */
  onClick?: () => void;
}

/**
 * Base props shared by all notification layouts.
 */
interface NotificationBaseProps {
  /** Layout style of the notification */
  layout?: NotificationLayout;
  /**
   * Additional CSS classes applied to the outer container.
   */
  className?: string;
}

/**
 * Props for `layout="toast"` — compact notification card.
 */
interface NotificationToastProps extends NotificationBaseProps {
  layout?: "toast";
  /** Semantic variant that sets icon and border color */
  variant: NotificationVariant;
  /** Notification title — always visible */
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Time in ms before the toast reappears after dismissal. @default `3000` */
  hideDuration?: number;
  // Toast doesn't use these
  icon?: never;
  message?: never;
  actions?: never;
  secondaryAction?: never;
  onClose?: never;
}

/**
 * Props for `layout="banner"` — announcement panel with actions.
 */
interface NotificationBannerProps extends NotificationBaseProps {
  layout: "banner";
  /** Icon displayed at the start of the banner */
  icon?: React.ReactNode;
  /** Banner title */
  title: string;
  /** Banner message text */
  message: string;
  /** Action buttons rendered at the end */
  actions?: NotificationAction[];
  // Banner doesn't use these
  variant?: never;
  description?: never;
  hideDuration?: never;
  secondaryAction?: never;
  onClose?: never;
}

/**
 * Props for `layout="consent"` — consent/acceptance panel.
 */
interface NotificationConsentProps extends NotificationBaseProps {
  layout: "consent";
  /** Main message text */
  message: string;
  /** Secondary text button (e.g. "Cookie Settings") */
  secondaryAction?: { label: string; onClick?: () => void };
  /** Action buttons rendered at the bottom */
  actions?: NotificationAction[];
  /** Close button callback */
  onClose?: () => void;
  // Consent doesn't use these
  variant?: never;
  title?: never;
  description?: never;
  hideDuration?: never;
  icon?: never;
}

/**
 * Discriminated union of all notification layout props.
 *
 * The `layout` field determines which props are available:
 * - `"toast"` → `variant`, `title`, `description`, `hideDuration`
 * - `"banner"` → `icon`, `title`, `message`, `actions`
 * - `"consent"` → `message`, `secondaryAction`, `actions`, `onClose`
 * @kgId d3f322511d90
 */
export type NotificationProps =
  | NotificationToastProps
  | NotificationBannerProps
  | NotificationConsentProps;

// ═══════════════════════════════════════════════════════════════════════════
// TOAST LAYOUT (original Notification)
// ═══════════════════════════════════════════════════════════════════════════

const variantStyles = {
  success: {
    borderColor: "border-success-500",
    iconBg: "bg-success-50 text-success-500",
    icon: <CheckCircleIcon />,
  },
  info: {
    borderColor: "border-blue-light-500",
    iconBg: "bg-blue-light-50 text-blue-light-500",
    icon: <InfoIcon />,
  },
  warning: {
    borderColor: "border-warning-500",
    iconBg: "bg-warning-50 text-warning-500",
    icon: <AlertHexaIcon />,
  },
  error: {
    borderColor: "border-error-500",
    iconBg: "bg-error-50 text-error-500",
    icon: <ErrorHexaIcon className="size-5" />,
  },
};

const ToastNotification: React.FC<NotificationToastProps> = ({
  variant,
  title,
  description,
  hideDuration = 3000,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const { borderColor, iconBg, icon } = variantStyles[variant];

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsVisible(true);
    }, hideDuration);
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn("flex items-center justify-between gap-3 w-full sm:max-w-[340px] rounded-md border-b-4 p-3 shadow-theme-sm dark:bg-[#1E2634]", borderColor, className)}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn("flex items-center justify-center w-10 h-10 rounded-lg", iconBg)}
        >
          {icon}
        </div>
        <div>
          <h4 className="text-sm text-gray-800 sm:text-base dark:text-white/90">
            {title}
          </h4>
          {description && (
            <p className="mt-1 text-xs text-gray-600 sm:text-sm dark:text-white/70">
              {description}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={handleClose}
        className="text-gray-400 hover:text-gray-800 dark:hover:text-white/90"
      >
        <CloseIcon />
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// BANNER LAYOUT (replaces UpdateNotification)
// ═══════════════════════════════════════════════════════════════════════════

const BannerNotification: React.FC<NotificationBannerProps> = ({
  icon,
  title,
  message,
  actions = [],
  className,
}) => {
  return (
    <div className={cn("w-full max-w-[607px] rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#1E2634]", className)}>
      <div className="flex items-start gap-3">
        {icon && <div className="text-brand-500">{icon}</div>}
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div>
            <h5 className="mb-1 text-base font-medium text-gray-800 dark:text-white/90">
              {title}
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {message}
            </p>
          </div>
          {actions.length > 0 && (
            <div className="flex items-center w-full gap-3 sm:max-w-fit">
              {actions.map((action, i) => (
                <button
                  key={i}
                  type="button"
                  className={
                    action.variant === "primary"
                      ? "flex justify-center px-4 py-3 text-sm font-medium text-white rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600"
                      : "flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                  }
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CONSENT LAYOUT (replaces CookieConsent)
// ═══════════════════════════════════════════════════════════════════════════

const ConsentNotification: React.FC<NotificationConsentProps> = ({
  message,
  secondaryAction,
  actions = [],
  onClose,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <div className={cn("relative w-full max-w-[577px] rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-[#1E2634]", className)}>
      <button
        className="absolute text-gray-400 right-3 top-3 hover:text-gray-800 dark:hover:text-white/90"
        onClick={handleClose}
        aria-label="Close"
      >
        <CloseIcon className="size-5" />
      </button>
      <p className="pr-4 mb-6 text-sm text-gray-700 dark:text-gray-400">
        {message}
      </p>
      <div className="flex flex-col justify-end gap-6 sm:flex-row sm:items-center sm:gap-4">
        {secondaryAction && (
          <button
            type="button"
            className="text-sm font-medium text-left text-gray-700 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </button>
        )}
        {actions.length > 0 && (
          <div className="flex items-center w-full gap-3 sm:w-auto">
            {actions.map((action, i) => (
              <button
                key={i}
                type="button"
                className={
                  action.variant === "primary"
                    ? "flex justify-center w-full px-4 py-3 text-sm font-medium text-white rounded-lg sm:w-auto bg-brand-500 shadow-theme-xs hover:bg-brand-600"
                    : "flex w-full sm:w-auto justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                }
                onClick={() => {
                  action.onClick?.();
                  handleClose();
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Notification — Contextual message for informing the user about events.
 *
 * A unified component with three layout modes that cover different
 * notification patterns: compact toasts for transient feedback,
 * banners for announcements with actions, and consent panels for
 * user acceptance flows.
 *
 * @remarks
 * **When to use Notification vs related components:**
 * - Use `Notification` with `layout="toast"` for transient feedback
 *   after an action (e.g. *"Saved successfully"*, *"Error occurred"*).
 *   Includes an icon based on `variant`, a title, optional description,
 *   and a close button.
 * - Use `Notification` with `layout="banner"` for announcements or
 *   updates that need user action — shows icon, title, message, and
 *   action buttons side by side.
 * - Use `Notification` with `layout="consent"` for acceptance flows
 *   (cookie consent, terms) — shows message, secondary text action,
 *   and stacked action buttons with a close button.
 * - Use **Alert** for inline, always-visible messages within the page
 *   content (not floating/overlay).
 * - Use **Modal** when the notification requires full user attention
 *   and blocks the page.
 *
 * **Layout guide:**
 * - `"toast"` — Compact, auto-dismissible. Best for success/error/info
 *   feedback after user actions.
 * - `"banner"` — Wider, persistent. Best for feature announcements,
 *   update prompts, or system messages with CTA buttons.
 * - `"consent"` — Full panel with close. Best for cookie consent,
 *   privacy notices, or any acceptance flow.
 *
 * **Limitations:**
 * - Toast uses internal `useState` for visibility — no controlled mode.
 * - Banner has no dismiss mechanism — always visible.
 * - Action buttons use inline styles, not the `Button` component.
 *
 * @example Toast notification
 * ```tsx
 * <Notification variant="success" title="Changes saved" />
 * ```
 *
 * @example Toast with description
 * ```tsx
 * <Notification
 *   variant="error"
 *   title="Upload failed"
 *   description="The file exceeds the maximum size."
 * />
 * ```
 *
 * @example Banner with actions
 * ```tsx
 * <Notification
 *   layout="banner"
 *   icon={<BoltIcon />}
 *   title="New version available"
 *   message="Version 2.0 includes performance improvements."
 *   actions={[
 *     { label: "Update now", variant: "primary" },
 *     { label: "Later", variant: "outline" },
 *   ]}
 * />
 * ```
 *
 * @example Consent panel
 * ```tsx
 * <Notification
 *   layout="consent"
 *   message="We use cookies to improve your experience."
 *   secondaryAction={{ label: "Cookie Settings" }}
 *   actions={[
 *     { label: "Accept All", variant: "primary" },
 *     { label: "Decline", variant: "outline" },
 *   ]}
 * />
 * ```
 *
 * @see {@link Alert} — For inline, always-visible messages.
 * @see {@link Modal} — For full-attention blocking dialogs.
 * @see {@link Badge} — For static status labels.
 * @kgId 3700d2a8b4eb
 */

const Notification: React.FC<NotificationProps> = (props) => {
  const layout = props.layout ?? "toast";

  switch (layout) {
    case "banner":
      return <BannerNotification {...(props as NotificationBannerProps)} />;
    case "consent":
      return <ConsentNotification {...(props as NotificationConsentProps)} />;
    case "toast":
    default:
      return <ToastNotification {...(props as NotificationToastProps)} />;
  }
};

export default Notification;
