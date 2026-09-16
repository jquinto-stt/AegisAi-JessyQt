import { cn } from "@/utils";
import { useState } from "react";

/**
 * Available sizes for the Avatar component.
 *
 * - `"xsmall"` — `24px` (`h-6 w-6`) — compact lists, dense tables
 * - `"small"` — `32px` (`h-8 w-8`) — inline mentions, chat message headers
 * - `"medium"` — `40px` (`h-10 w-10`) — default, cards, navigation bars *(default)*
 * - `"large"` — `48px` (`h-12 w-12`) — profile sections, team grids
 * - `"xlarge"` — `56px` (`h-14 w-14`) — profile headers, featured users
 * - `"xxlarge"` — `64px` (`h-16 w-16`) — hero profile, user detail page
 * @kgId 9f0366bb2bc4
 */
export type AvatarSize = "xsmall" | "small" | "medium" | "large" | "xlarge" | "xxlarge";

/**
 * Online presence status shown as a colored dot on the avatar.
 *
 * - `"online"` — Green dot (`success-500`) — user is active and available
 * - `"offline"` — Red dot (`error-400`) — user is disconnected or away
 * - `"busy"` — Orange dot (`warning-500`) — user is occupied, do not disturb
 * - `"none"` — No indicator shown *(default)*
 * @kgId f30a018abbc5
 */
export type AvatarStatus = "online" | "offline" | "busy" | "none";

/**
 * Props for the **Avatar** component.
 * @kgId 2c491030b3dc
 */
export interface AvatarProps {
  /**
   * URL of the avatar image.
   */
  src: string;

  /**
   * Alt text for the avatar image, used by screen readers.
   *
   * @default `"User Avatar"`
   */
  alt?: string;

  /**
   * Controls the dimensions of the avatar circle.
   *
   * @default `"medium"`
   */
  size?: AvatarSize;

  /**
   * Online presence indicator displayed as a small colored dot
   * at the bottom-right corner of the avatar.
   *
   * @default `"none"`
   */
  status?: AvatarStatus;

  /**
   * Additional CSS classes merged with `cn()`.
   *
   * Useful for overriding dimensions, borders, or positioning.
   */
  className?: string;

  /**
   * Fallback initials displayed when the image fails to load.
   *
   * Typically 1-2 characters (e.g. "JD" for John Doe).
   * When omitted and image fails, shows a generic gray placeholder.
   */
  initials?: string;

  /**
   * Callback fired when the image fails to load.
   */
  onError?: () => void;
}

const sizeClasses = {
  xsmall: "h-6 w-6 max-w-6",
  small: "h-8 w-8 max-w-8",
  medium: "h-10 w-10 max-w-10",
  large: "h-12 w-12 max-w-12",
  xlarge: "h-14 w-14 max-w-14",
  xxlarge: "h-16 w-16 max-w-16",
};

const statusSizeClasses = {
  xsmall: "h-1.5 w-1.5 max-w-1.5",
  small: "h-2 w-2 max-w-2",
  medium: "h-2.5 w-2.5 max-w-2.5",
  large: "h-3 w-3 max-w-3",
  xlarge: "h-3.5 w-3.5 max-w-3.5",
  xxlarge: "h-4 w-4 max-w-4",
};

const statusColorClasses = {
  online: "bg-success-500",
  offline: "bg-error-400",
  busy: "bg-warning-500",
};

/**
 * Avatar — Circular image representing a user or entity.
 *
 * Displays a profile photo with an optional presence status indicator.
 * Commonly used to identify the logged-in user, show team members in
 * dashboards, or indicate participant status in chat and forum contexts.
 *
 * @remarks
 * **When to use Avatar vs related components:**
 * - Use `Avatar` to visually identify a person — session user, team
 *   member, comment author, chat participant.
 * - Use **Badge** for status labels or counts (text-based indicators).
 * - Use **Tooltip** to show the user's name or role on hover over
 *   the avatar.
 *
 * **Status indicator:**
 * - The colored dot scales proportionally with the avatar `size`.
 * - `"online"` (green), `"offline"` (red), `"busy"` (orange).
 * - Set `status="none"` (default) to hide the indicator entirely.
 *
 * **Limitations:**
 * - Size names use long format (`xsmall`–`xxlarge`) instead of short (`xs`–`2xl`). See `TECH_DEBT.md`.
 *
 * @example Basic usage
 * ```tsx
 * <Avatar src="/images/user-01.jpg" />
 * ```
 *
 * @example With status in a chat context
 * ```tsx
 * <Avatar src="/images/user-01.jpg" size="small" status="online" />
 * ```
 *
 * @example Large profile header
 * ```tsx
 * <Avatar src="/images/user-01.jpg" size="xxlarge" status="busy" />
 * ```
 *
 * @see {@link Badge} — For text-based status labels.
 * @see {@link Tooltip} — To show user name on hover.
 * @kgId a84b233cdc1c
 */
const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "User Avatar",
  size = "medium",
  status = "none",
  className,
  initials,
  onError,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const handleError = () => {
    setImgFailed(true);
    onError?.();
  };

  const initialsFontSize: Record<AvatarSize, string> = {
    xsmall: "text-[8px]",
    small: "text-[10px]",
    medium: "text-xs",
    large: "text-sm",
    xlarge: "text-base",
    xxlarge: "text-lg",
  };

  return (
    <div className={cn("relative rounded-full shrink-0", sizeClasses[size], className)}>
      {!src || imgFailed ? (
        <div className={cn(
          "flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 w-full h-full",
          initials && initialsFontSize[size]
        )}>
          {initials ? (
            <span className="font-medium text-gray-600 dark:text-gray-300 uppercase">
              {initials}
            </span>
          ) : (
            <svg className="w-1/2 h-1/2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover rounded-full aspect-square"
          onError={handleError}
        />
      )}

      {/* Status Indicator */}
      {status !== "none" && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-[1.5px] border-white dark:border-gray-900",
            statusSizeClasses[size],
            statusColorClasses[status]
          )}
        ></span>
      )}
    </div>
  );
};

export default Avatar;
