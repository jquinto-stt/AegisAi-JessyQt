import { Link } from "react-router";

/**
 * Visual style of the alert that communicates the nature of the message.
 *
 * - `"default"` — Neutral, general-purpose information
 * - `"success"` — Confirms a completed action or positive outcome
 * - `"error"` — Signals a failure, problem, or blocking issue
 * - `"warning"` — Draws attention to a potential risk or required caution
 * - `"info"` — Highlights supplementary information the user should be aware of
 * @kgId 969dc6596a92
 */
export type AlertVariant = "default" | "success" | "error" | "warning" | "info";

/**
 * Props for the Alert component.
 * @kgId 5872af809cc4
 */
export interface AlertProps {
  /**
   * Defines the visual state of the alert to communicate the nature of the
   * message — whether it confirms a completed action, signals a problem,
   * warns about a risk, or highlights information.
   *
   * Each variant applies a distinct border color, background tint, and icon
   * so the user can identify the severity at a glance.
   *
   * @default "default"
   *
   * @example
   * ```tsx
   * <Alert variant="success" title="Saved" message="Your changes were saved." />
   * <Alert variant="error" title="Failed" message="Could not connect to server." />
   * ```
   */
  variant?: AlertVariant;

  /**
   * Short, prominent heading of the alert.
   *
   * Should summarize the situation in a few words so the user understands
   * the alert's purpose before reading the full message.
   *
   * @example "Payment received" | "Connection lost" | "Update available"
   */
  title: string;

  /**
   * Descriptive body text that gives the user context about what happened,
   * what they should know, or what action to take next.
   *
   * Keep it concise — one or two sentences that complement the title
   * without repeating it.
   *
   * @example "Your order has been confirmed and will ship within 2 business days."
   */
  message: string;

  /**
   * Whether to display an action link below the message.
   *
   * Enable this when the user may need additional detail or a path to
   * resolve the situation — for example, linking to documentation,
   * a settings page, or a detailed error report.
   *
   * @default false
   */
  showLink?: boolean;

  /**
   * URL the action link navigates to (uses react-router `<Link to>`).
   *
   * Only relevant when `showLink` is `true`.
   *
   * @default "#"
   */
  linkHref?: string;

  /**
   * Visible text of the action link.
   *
   * Choose text that describes the destination or action — e.g.
   * "View details", "Go to settings", "Learn more".
   *
   * Only relevant when `showLink` is `true`.
   *
   * @default "Learn more"
   */
  linkText?: string;

  /**
   * Callback fired when the user clicks the close button.
   *
   * When provided, a dismiss button (×) appears in the top-right corner
   * of the alert. The component does not manage its own visibility —
   * the consumer is responsible for removing or hiding the alert in
   * response to this callback.
   *
   * When omitted, no close button is rendered and the alert stays
   * visible until the parent unmounts it.
   *
   * @example
   * ```tsx
   * const [visible, setVisible] = useState(true);
   * {visible && (
   *   <Alert
   *     variant="info"
   *     title="Tip"
   *     message="You can customize your dashboard."
   *     onClose={() => setVisible(false)}
   *   />
   * )}
   * ```
   */
  onClose?: () => void;
}

/**
 * Alert — Contextual feedback banner for user-facing messages.
 *
 * Communicates the state of a process, the result of an action, or draws
 * the user's attention to something they need to know. Each `variant`
 * applies a color-coded border, background, and icon so the severity is
 * recognizable at a glance.
 *
 * Optionally includes an action link when the user may need more detail
 * or a path to resolve the situation.
 *
 * @remarks
 * Alert is a **static, inline** feedback element — it stays visible in the
 * page flow until the content changes. It does not auto-dismiss, cannot be
 * closed by the user, and does not overlay other content.
 *
 * **When to use Alert vs related components:**
 * - Use `Alert` for persistent, contextual messages embedded in the page
 *   (e.g. form validation summary, status of a section, important notices).
 * - Use `Notification` (layout="toast") for temporary, auto-dismissing
 *   feedback after an action (e.g. "Item saved", "Email sent").
 * - Use `Notification` (layout="banner") for persistent announcements that
 *   include action buttons (e.g. "New version available — Update now").
 * - Use `Modal` for messages that require the user to acknowledge or decide
 *   before continuing (e.g. destructive action confirmation).
 *
 * **Limitations:**
 * - No entry/exit animation — appears and disappears with the render cycle.
 * - The action link uses react-router `<Link>` — not suitable for external
 *   URLs or non-router navigation without wrapping.
 * - Icons are fixed per variant and cannot be customized.
 *
 * @example Basic usage
 * ```tsx
 * <Alert
 *   variant="success"
 *   title="Changes saved"
 *   message="Your profile has been updated successfully."
 * />
 * ```
 *
 * @example With action link
 * ```tsx
 * <Alert
 *   variant="error"
 *   title="Upload failed"
 *   message="The file exceeds the 5 MB limit."
 *   showLink
 *   linkHref="/help/uploads"
 *   linkText="View upload guidelines"
 * />
 * ```
 *
 * @see {@link Notification} — For temporary toast feedback or banners with action buttons.
 * @see {@link Modal} — For messages that block interaction until acknowledged.
 * @kgId af0c0021b640
 */
const Alert: React.FC<AlertProps> = ({
  variant = "default",
  title,
  message,
  showLink = false,
  linkHref = "#",
  linkText = "Learn more",
  onClose,
}) => {
  // Tailwind classes for each variant
  const variantClasses = {
    default: {
      container:
        "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800",
      icon: "text-gray-500 dark:text-gray-400",
    },
    success: {
      container:
        "border-success-500 bg-success-50 dark:border-success-500/30 dark:bg-success-500/15",
      icon: "text-success-500",
    },
    error: {
      container:
        "border-error-500 bg-error-50 dark:border-error-500/30 dark:bg-error-500/15",
      icon: "text-error-500",
    },
    warning: {
      container:
        "border-warning-500 bg-warning-50 dark:border-warning-500/30 dark:bg-warning-500/15",
      icon: "text-warning-500",
    },
    info: {
      container:
        "border-blue-light-500 bg-blue-light-50 dark:border-blue-light-500/30 dark:bg-blue-light-500/15",
      icon: "text-blue-light-500",
    },
  };

  // Icon for each variant
  const icons = {
    default: (
      <svg
        className="fill-current"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M3.6501 11.9996C3.6501 7.38803 7.38852 3.64961 12.0001 3.64961C16.6117 3.64961 20.3501 7.38803 20.3501 11.9996C20.3501 16.6112 16.6117 20.3496 12.0001 20.3496C7.38852 20.3496 3.6501 16.6112 3.6501 11.9996ZM12.0001 1.84961C6.39441 1.84961 1.8501 6.39392 1.8501 11.9996C1.8501 17.6053 6.39441 22.1496 12.0001 22.1496C17.6058 22.1496 22.1501 17.6053 22.1501 11.9996C22.1501 6.39392 17.6058 1.84961 12.0001 1.84961ZM10.9992 7.52468C10.9992 8.07697 11.4469 8.52468 11.9992 8.52468H12.0002C12.5525 8.52468 13.0002 8.07697 13.0002 7.52468C13.0002 6.9724 12.5525 6.52468 12.0002 6.52468H11.9992C11.4469 6.52468 10.9992 6.9724 10.9992 7.52468ZM12.0002 17.371C11.586 17.371 11.2502 17.0352 11.2502 16.621V10.9445C11.2502 10.5303 11.586 10.1945 12.0002 10.1945C12.4144 10.1945 12.7502 10.5303 12.7502 10.9445V16.621C12.7502 17.0352 12.4144 17.371 12.0002 17.371Z"
        />
      </svg>
    ),
    success: (
      <svg
        className="fill-current"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M3.70186 12.0001C3.70186 7.41711 7.41711 3.70186 12.0001 3.70186C16.5831 3.70186 20.2984 7.41711 20.2984 12.0001C20.2984 16.5831 16.5831 20.2984 12.0001 20.2984C7.41711 20.2984 3.70186 16.5831 3.70186 12.0001ZM12.0001 1.90186C6.423 1.90186 1.90186 6.423 1.90186 12.0001C1.90186 17.5772 6.423 22.0984 12.0001 22.0984C17.5772 22.0984 22.0984 17.5772 22.0984 12.0001C22.0984 6.423 17.5772 1.90186 12.0001 1.90186ZM15.6197 10.7395C15.9712 10.388 15.9712 9.81819 15.6197 9.46672C15.2683 9.11525 14.6984 9.11525 14.347 9.46672L11.1894 12.6243L9.6533 11.0883C9.30183 10.7368 8.73198 10.7368 8.38051 11.0883C8.02904 11.4397 8.02904 12.0096 8.38051 12.3611L10.553 14.5335C10.7217 14.7023 10.9507 14.7971 11.1894 14.7971C11.428 14.7971 11.657 14.7023 11.8257 14.5335L15.6197 10.7395Z"
        />
      </svg>
    ),
    error: (
      <svg
        className="fill-current"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M20.3499 12.0004C20.3499 16.612 16.6115 20.3504 11.9999 20.3504C7.38832 20.3504 3.6499 16.612 3.6499 12.0004C3.6499 7.38881 7.38833 3.65039 11.9999 3.65039C16.6115 3.65039 20.3499 7.38881 20.3499 12.0004ZM11.9999 22.1504C17.6056 22.1504 22.1499 17.6061 22.1499 12.0004C22.1499 6.3947 17.6056 1.85039 11.9999 1.85039C6.39421 1.85039 1.8499 6.3947 1.8499 12.0004C1.8499 17.6061 6.39421 22.1504 11.9999 22.1504ZM13.0008 16.4753C13.0008 15.923 12.5531 15.4753 12.0008 15.4753L11.9998 15.4753C11.4475 15.4753 10.9998 15.923 10.9998 16.4753C10.9998 17.0276 11.4475 17.4753 11.9998 17.4753L12.0008 17.4753C12.5531 17.4753 13.0008 17.0276 13.0008 16.4753ZM11.9998 6.62898C12.414 6.62898 12.7498 6.96476 12.7498 7.37898L12.7498 13.0555C12.7498 13.4697 12.414 13.8055 11.9998 13.8055C11.5856 13.8055 11.2498 13.4697 11.2498 13.0555L11.2498 7.37898C11.2498 6.96476 11.5856 6.62898 11.9998 6.62898Z"
          fill="#F04438"
        />
      </svg>
    ),
    warning: (
      <svg
        className="fill-current"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M3.6501 12.0001C3.6501 7.38852 7.38852 3.6501 12.0001 3.6501C16.6117 3.6501 20.3501 7.38852 20.3501 12.0001C20.3501 16.6117 16.6117 20.3501 12.0001 20.3501C7.38852 20.3501 3.6501 16.6117 3.6501 12.0001ZM12.0001 1.8501C6.39441 1.8501 1.8501 6.39441 1.8501 12.0001C1.8501 17.6058 6.39441 22.1501 12.0001 22.1501C17.6058 22.1501 22.1501 17.6058 22.1501 12.0001C22.1501 6.39441 17.6058 1.8501 12.0001 1.8501ZM10.9992 7.52517C10.9992 8.07746 11.4469 8.52517 11.9992 8.52517H12.0002C12.5525 8.52517 13.0002 8.07746 13.0002 7.52517C13.0002 6.97289 12.5525 6.52517 12.0002 6.52517H11.9992C11.4469 6.52517 10.9992 6.97289 10.9992 7.52517ZM12.0002 17.3715C11.586 17.3715 11.2502 17.0357 11.2502 16.6215V10.945C11.2502 10.5308 11.586 10.195 12.0002 10.195C12.4144 10.195 12.7502 10.5308 12.7502 10.945V16.6215C12.7502 17.0357 12.4144 17.3715 12.0002 17.3715Z"
          fill=""
        />
      </svg>
    ),
    info: (
      <svg
        className="fill-current"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M3.6501 11.9996C3.6501 7.38803 7.38852 3.64961 12.0001 3.64961C16.6117 3.64961 20.3501 7.38803 20.3501 11.9996C20.3501 16.6112 16.6117 20.3496 12.0001 20.3496C7.38852 20.3496 3.6501 16.6112 3.6501 11.9996ZM12.0001 1.84961C6.39441 1.84961 1.8501 6.39392 1.8501 11.9996C1.8501 17.6053 6.39441 22.1496 12.0001 22.1496C17.6058 22.1496 22.1501 17.6053 22.1501 11.9996C22.1501 6.39392 17.6058 1.84961 12.0001 1.84961ZM10.9992 7.52468C10.9992 8.07697 11.4469 8.52468 11.9992 8.52468H12.0002C12.5525 8.52468 13.0002 8.07697 13.0002 7.52468C13.0002 6.9724 12.5525 6.52468 12.0002 6.52468H11.9992C11.4469 6.52468 10.9992 6.9724 10.9992 7.52468ZM12.0002 17.371C11.586 17.371 11.2502 17.0352 11.2502 16.621V10.9445C11.2502 10.5303 11.586 10.1945 12.0002 10.1945C12.4144 10.1945 12.7502 10.5303 12.7502 10.9445V16.621C12.7502 17.0352 12.4144 17.371 12.0002 17.371Z"
          fill=""
        />
      </svg>
    ),
  };

  return (
    <div
      className={`rounded-xl border p-4 ${variantClasses[variant].container}`}
    >
      <div className="flex items-start gap-3">
        <div className={`-mt-0.5 ${variantClasses[variant].icon}`}>
          {icons[variant]}
        </div>

        <div className="flex-1">
          <h4 className="mb-1 text-sm font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h4>

          <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>

          {showLink && (
            <Link
              to={linkHref}
              className="inline-block mt-3 text-sm font-medium text-gray-500 underline dark:text-gray-400"
            >
              {linkText}
            </Link>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close alert"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L10 8.58579L13.2929 5.29289C13.6834 4.90237 14.3166 4.90237 14.7071 5.29289C15.0976 5.68342 15.0976 6.31658 14.7071 6.70711L11.4142 10L14.7071 13.2929C15.0976 13.6834 15.0976 14.3166 14.7071 14.7071C14.3166 15.0976 13.6834 15.0976 13.2929 14.7071L10 11.4142L6.70711 14.7071C6.31658 15.0976 5.68342 15.0976 5.29289 14.7071C4.90237 14.3166 4.90237 13.6834 5.29289 13.2929L8.58579 10L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;
