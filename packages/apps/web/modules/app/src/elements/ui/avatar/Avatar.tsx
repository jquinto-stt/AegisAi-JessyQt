import type React from "react";
import { useState } from "react";
import { cn } from "@/utils";

export type AvatarSize = "xsmall" | "small" | "medium" | "large" | "xlarge" | "xxlarge";
export type AvatarStatus = "online" | "offline" | "busy" | "none";

export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  className?: string;
  initials?: string;
  onError?: () => void;
}

const sizeClasses: Record<AvatarSize, string> = {
  xsmall: "h-6 w-6 max-w-6",
  small: "h-8 w-8 max-w-8",
  medium: "h-10 w-10 max-w-10",
  large: "h-12 w-12 max-w-12",
  xlarge: "h-14 w-14 max-w-14",
  xxlarge: "h-16 w-16 max-w-16",
};

const statusSizeClasses: Record<AvatarSize, string> = {
  xsmall: "h-1.5 w-1.5 max-w-1.5",
  small: "h-2 w-2 max-w-2",
  medium: "h-2.5 w-2.5 max-w-2.5",
  large: "h-3 w-3 max-w-3",
  xlarge: "h-3.5 w-3.5 max-w-3.5",
  xxlarge: "h-4 w-4 max-w-4",
};

const statusColorClasses: Record<AvatarStatus, string> = {
  online: "bg-success-500",
  offline: "bg-error-400",
  busy: "bg-warning-500",
  none: "",
};

export const Avatar: React.FC<AvatarProps> = ({
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

  const showPlaceholder = !src || imgFailed;

  return (
    <div className={cn("relative flex-none rounded-full select-none", sizeClasses[size], className)}>
      {showPlaceholder ? (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 font-semibold uppercase",
            initialsFontSize[size]
          )}
        >
          {initials ? (
            <span>{initials}</span>
          ) : (
            <svg className="h-1/2 w-1/2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover object-center rounded-full"
          onError={handleError}
        />
      )}

      {status !== "none" && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full border-[1.5px] border-white dark:border-gray-900 shadow-xs",
            statusSizeClasses[size],
            statusColorClasses[status]
          )}
        />
      )}
    </div>
  );
};

export default Avatar;
