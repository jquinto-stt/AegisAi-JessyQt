import React from "react";
import type { AvatarStatus } from "@/elements/ui/avatar";

export const WhatsAppIcon = ({
  className = "h-5 w-5",
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 20.16C10.57 20.16 9.12 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.05 20.16ZM16.56 14.39C16.31 14.27 15.1 13.67 14.88 13.59C14.65 13.5 14.49 13.46 14.32 13.71C14.16 13.95 13.69 14.51 13.54 14.67C13.4 14.83 13.25 14.85 13 14.73C12.75 14.6 11.71 14.26 10.48 13.17C9.52 12.31 8.87 11.26 8.75 11.05C8.63 10.84 8.74 10.73 8.86 10.61C8.97 10.5 9.11 10.32 9.23 10.18C9.35 10.04 9.4 9.94 9.48 9.77C9.56 9.61 9.52 9.46 9.46 9.34C9.4 9.22 8.91 8.01 8.7 7.52C8.5 7.04 8.3 7.11 8.15 7.1C8.01 7.1 7.84 7.1 7.68 7.1C7.52 7.1 7.25 7.16 7.03 7.4C6.8 7.65 6.18 8.23 6.18 9.41C6.18 10.59 7.04 11.73 7.16 11.89C7.29 12.05 8.86 14.47 11.26 15.51C11.83 15.76 12.28 15.91 12.62 16.02C13.19 16.2 13.72 16.17 14.13 16.11C14.59 16.04 15.55 15.53 15.75 14.96C15.96 14.39 15.96 13.9 15.9 13.8C15.83 13.69 15.68 13.63 15.43 13.51L16.56 14.39Z" />
  </svg>
);

export const TelegramIcon = ({
  className = "h-5 w-5",
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
  </svg>
);

interface CanalAvatarProps {
  canal?: "telegram" | "whatsapp" | string;
  nombre?: string;
  size?: "small" | "medium" | "large" | "xlarge";
  status?: AvatarStatus;
  className?: string;
}

export const CanalAvatar: React.FC<CanalAvatarProps> = ({
  canal = "whatsapp",
  nombre = "Contacto",
  size = "medium",
  status = "none",
  className = "",
}) => {
  const esTelegram = canal === "telegram";

  const sizeClasses = {
    small: "h-8 w-8 text-xs",
    medium: "h-10 w-10 text-sm",
    large: "h-12 w-12 text-base",
    xlarge: "h-14 w-14 text-lg",
  }[size];

  const iconSizes = {
    small: "h-4 w-4",
    medium: "h-5 w-5",
    large: "h-6 w-6",
    xlarge: "h-7 w-7",
  }[size];

  const statusDotSizes = {
    small: "h-2 w-2 ring-1.5",
    medium: "h-2.5 w-2.5 ring-2",
    large: "h-3 w-3 ring-2",
    xlarge: "h-3.5 w-3.5 ring-2",
  }[size];

  const statusColors: Record<AvatarStatus, string> = {
    online: "bg-emerald-500",
    busy: "bg-amber-500",
    offline: "bg-red-400",
    none: "",
  };

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full ${sizeClasses} ${className}`}
    >
      {/* Círculo con el logo de Telegram o WhatsApp */}
      <div
        className={`flex h-full w-full items-center justify-center rounded-full transition-transform ${
          esTelegram
            ? "bg-[#229ED9] text-white shadow-sm shadow-[#229ED9]/30"
            : "bg-[#25D366] text-white shadow-sm shadow-[#25D366]/30"
        }`}
        title={`${nombre} (${esTelegram ? "Telegram" : "WhatsApp"})`}
      >
        {esTelegram ? (
          <TelegramIcon className={iconSizes} />
        ) : (
          <WhatsAppIcon className={iconSizes} />
        )}
      </div>

      {/* Indicador de presencia en la esquina inferior */}
      {status !== "none" && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-gray-900 ${statusDotSizes} ${statusColors[status]}`}
        />
      )}
    </div>
  );
};
