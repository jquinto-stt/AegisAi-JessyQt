import React from "react";
import type { AvatarStatus } from "@/elements/ui/avatar";
import type { CanalId } from "@/stores/conversaciones.types";

export const WhatsAppIcon = ({
  className = "h-3.5 w-3.5",
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
  className = "h-3.5 w-3.5",
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

export const InstagramIcon = ({
  className = "h-3.5 w-3.5",
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

export const MessengerIcon = ({
  className = "h-3.5 w-3.5",
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.512 3.736 7.205V22l3.411-1.872c.907.251 1.868.388 2.853.388 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.066 12.443l-2.73-2.91-5.327 2.91 5.859-6.22 2.795 2.91 5.263-2.91-5.86 6.22z" />
  </svg>
);

export const TikTokIcon = ({
  className = "h-3.5 w-3.5",
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.97v7.54c0 1.85-.54 3.72-1.65 5.2-1.57 2.08-4.14 3.28-6.74 3.21-2.94-.07-5.69-1.66-7.06-4.26-1.38-2.61-1.25-5.84.34-8.32 1.59-2.48 4.41-3.9 7.4-3.71v4.1c-1.39-.24-2.84.18-3.87 1.13-1.04.96-1.52 2.4-1.26 3.79.26 1.39 1.34 2.51 2.75 2.84 1.41.33 2.93-.16 3.84-1.23.63-.74.98-1.69.96-2.66V.02h.65z" />
  </svg>
);

const UserSilhouette = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

interface CanalAvatarProps {
  canal?: CanalId | string;
  nombre?: string;
  avatarUrl?: string;
  size?: "small" | "medium" | "large" | "xlarge";
  status?: AvatarStatus;
  className?: string;
}

export const CanalAvatar: React.FC<CanalAvatarProps> = ({
  canal = "whatsapp",
  nombre = "Contacto",
  avatarUrl,
  size = "medium",
  status = "none",
  className = "",
}) => {
  const sizeClasses = {
    small: "h-8 w-8 text-xs",
    medium: "h-10 w-10 text-sm",
    large: "h-11 w-11 sm:h-12 sm:w-12 text-base",
    xlarge: "h-14 w-14 text-lg",
  }[size];

  const iconSizes = {
    small: "h-4 w-4",
    medium: "h-5 w-5",
    large: "h-6 w-6",
    xlarge: "h-7 w-7",
  }[size];

  // Configuración de la miniatura de la plataforma
  const badgeConfig = {
    whatsapp: {
      bg: "bg-[#25D366] text-white",
      icon: <WhatsAppIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />,
      label: "WhatsApp",
    },
    instagram: {
      bg: "bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white",
      icon: <InstagramIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />,
      label: "Instagram",
    },
    messenger: {
      bg: "bg-[#0084FF] text-white",
      icon: <MessengerIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />,
      label: "Messenger",
    },
    tiktok: {
      bg: "bg-black text-white",
      icon: <TikTokIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />,
      label: "TikTok",
    },
    telegram: {
      bg: "bg-[#229ED9] text-white",
      icon: <TelegramIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />,
      label: "Telegram",
    },
  }[canal as CanalId] || {
    bg: "bg-[#25D366] text-white",
    icon: <WhatsAppIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />,
    label: canal,
  };

  const badgeSizeClasses = {
    small: "h-4 w-4 -bottom-0.5 -right-0.5 ring-1.5",
    medium: "h-4.5 w-4.5 sm:h-5 sm:w-5 -bottom-0.5 -right-0.5 ring-2",
    large: "h-5 w-5 sm:h-5.5 sm:w-5.5 -bottom-0.5 -right-0.5 ring-2",
    xlarge: "h-6 w-6 -bottom-0.5 -right-0.5 ring-2",
  }[size];

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full font-sans ${sizeClasses} ${className}`}
    >
      {/* 1. Avatar principal del usuario (Gris claro #ECECEC y azul NECTO #190088) */}
      <div
        className="flex h-full w-full items-center justify-center rounded-full bg-[#ECECEC] text-[#190088] border border-[#d0d5dd]/50 dark:bg-[#190088]/25 dark:text-[#97D6DF] dark:border-[#190088]/40 overflow-hidden shadow-2xs transition-colors"
        title={`${nombre} (${badgeConfig.label})`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={nombre} className="h-full w-full object-cover" />
        ) : (
          <span className="font-bold tracking-tight select-none">
            {nombre
              ? nombre
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join("")
                  .toUpperCase()
              : "U"}
          </span>
        )}
      </div>

      {/* 2. Miniatura de la plataforma en la esquina inferior derecha */}
      <div
        className={`absolute flex items-center justify-center rounded-full ring-white dark:ring-gray-900 shadow-sm ${badgeSizeClasses} ${badgeConfig.bg}`}
        title={`Origen: ${badgeConfig.label}`}
      >
        {badgeConfig.icon}
      </div>
    </div>
  );
};

export default CanalAvatar;
