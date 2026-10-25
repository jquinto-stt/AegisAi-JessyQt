import { useState, useRef, useEffect } from "react";
import {
  AlertHexaIcon,
  BoltIcon,
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
  /** Time in ms the toast stays on screen before auto-dismissing. @default `4000` */
  duration?: number;
  /** Alias for duration in ms */
  hideDuration?: number;
  /** Callback fired when the toast is closed or times out */
  onClose?: () => void;
  // Toast doesn't use these
  icon?: never;
  message?: never;
  actions?: never;
  secondaryAction?: never;
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

// Mapeo semántico idéntico a la referencia de diseño:
// Fondo de tarjeta oscura `#1F2633`, badge translúcido con tinte de estado,
// tipografía blanca y barra inferior de carga inversa (temporizador de permanencia).
const variantStyles = {
  success: {
    barColor: "bg-[#3CBB6D]",
    iconBg: "bg-[#3CBB6D]/15 text-[#3CBB6D]",
    icon: <CheckCircleIcon className="size-5 stroke-[2.2]" />,
  },
  info: {
    barColor: "bg-[#38BDF8]",
    iconBg: "bg-[#38BDF8]/15 text-[#38BDF8]",
    icon: <InfoIcon className="size-5 stroke-[2.2]" />,
  },
  warning: {
    barColor: "bg-[#F97316]",
    iconBg: "bg-[#F97316]/15 text-[#F97316]",
    icon: <AlertHexaIcon className="size-5 stroke-[2.2]" />,
  },
  error: {
    barColor: "bg-[#EF4444]",
    iconBg: "bg-[#EF4444]/15 text-[#EF4444]",
    icon: <ErrorHexaIcon className="size-5 stroke-[2.2]" />,
  },
};

const ToastNotification: React.FC<NotificationToastProps> = ({
  variant,
  title,
  description,
  duration,
  hideDuration,
  onClose,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const totalDuration = duration ?? hideDuration ?? 4000;
  const [isPaused, setIsPaused] = useState(false);
  const tiempoRestanteRef = useRef(totalDuration);
  const inicioRef = useRef(Date.now());
  const timerRef = useRef<number | undefined>(undefined);

  const { barColor, iconBg, icon } = variantStyles[variant];

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  useEffect(() => {
    if (!isVisible) return;

    if (!isPaused) {
      inicioRef.current = Date.now();
      timerRef.current = window.setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, tiempoRestanteRef.current);
    } else {
      window.clearTimeout(timerRef.current);
      const transcurrido = Date.now() - inicioRef.current;
      tiempoRestanteRef.current = Math.max(0, tiempoRestanteRef.current - transcurrido);
    }

    return () => {
      window.clearTimeout(timerRef.current);
    };
  }, [isPaused, isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={cn(
        "relative flex items-center justify-between gap-4 w-full sm:max-w-[380px] rounded-2xl bg-[#1F2633] border border-white/5 p-3.5 pb-4 shadow-xl transition-all duration-200 overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-transform",
            iconBg,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h4 className="text-[14px] sm:text-[15px] font-semibold text-white tracking-tight leading-snug truncate">
            {title}
          </h4>
          {description && (
            <p className="mt-0.5 text-xs text-gray-400 leading-normal line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleClose}
        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"
        aria-label="Cerrar notificación"
      >
        <CloseIcon className="size-4 stroke-[2.2]" />
      </button>

      {/* ── Barra de carga inversa: tiempo de permanencia en pantalla ── */}
      <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/5 overflow-hidden">
        <div
          className={cn("h-full w-full origin-left", barColor)}
          style={{
            animation: `notif-barra-carga-inversa ${totalDuration}ms linear forwards`,
            animationPlayState: isPaused ? "paused" : "running",
          }}
        />
      </div>

      <style>{`
        @keyframes notif-barra-carga-inversa {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
      `}</style>
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
    <div
      className={cn(
        "w-full max-w-[620px] rounded-2xl border border-white/5 bg-[#1F2633] p-5 shadow-xl transition-all duration-200",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="text-[#818CF8] shrink-0 mt-0.5">
            {icon ?? <BoltIcon className="size-5 stroke-[2]" />}
          </div>
          <div>
            <h5 className="text-[15px] font-bold text-white tracking-tight">
              {title}
            </h5>
            <p className="mt-0.5 text-[13px] text-gray-400">
              {message}
            </p>
          </div>
        </div>
        {actions.length > 0 && (
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
            {actions.map((action, i) => (
              <button
                key={i}
                type="button"
                className={
                  action.variant === "primary"
                    ? "px-4 py-2 text-sm font-semibold text-white rounded-xl bg-[#4F5CF9] hover:bg-[#434FE0] shadow-md transition-all active:scale-95 cursor-pointer"
                    : "px-4 py-2 text-sm font-medium text-gray-300 rounded-xl bg-[#263042] hover:bg-[#2F3C52] border border-white/10 transition-all active:scale-95 cursor-pointer"
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
    <div
      className={cn(
        "relative w-full max-w-[580px] rounded-2xl border border-white/5 bg-[#1F2633] p-6 shadow-2xl transition-all duration-200",
        className,
      )}
    >
      <button
        type="button"
        className="absolute text-gray-400 right-4 top-4 p-1 rounded-lg hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        onClick={handleClose}
        aria-label="Cerrar notificación"
      >
        <CloseIcon className="size-4 stroke-[2.2]" />
      </button>
      <p className="pr-6 mb-6 text-[13.5px] leading-relaxed text-gray-300 font-normal">
        {message}
      </p>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {secondaryAction ? (
          <button
            type="button"
            className="text-sm font-medium text-left text-gray-400 hover:text-white transition-colors cursor-pointer"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </button>
        ) : (
          <div />
        )}
        {actions.length > 0 && (
          <div className="flex items-center gap-2.5">
            {actions.map((action, i) => (
              <button
                key={i}
                type="button"
                className={
                  action.variant === "primary"
                    ? "px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-[#4F5CF9] hover:bg-[#434FE0] shadow-md transition-all active:scale-95 cursor-pointer"
                    : "px-4 py-2.5 text-sm font-medium text-gray-300 rounded-xl bg-[#263042] hover:bg-[#2F3C52] border border-white/10 transition-all active:scale-95 cursor-pointer"
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
