import type { ReactNode } from "react";

import type { RedNegocio } from "./personalizacion";

/**
 * Ficha de una red social: glifo blanco sobre el color de la red.
 * Dibujos propios y simplificados (lucide no trae TikTok ni WhatsApp), pensados
 * para leerse a 16–20 px.
 */

const RED: Record<RedNegocio, { nombre: string; fondo: string; glifo: ReactNode }> = {
  instagram: {
    nombre: "Instagram",
    fondo: "linear-gradient(45deg, #F58529 0%, #DD2A7B 50%, #8134AF 80%, #515BD4 100%)",
    glifo: (
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.6" />
        <circle cx="17" cy="7" r="0.6" fill="currentColor" />
      </g>
    ),
  },
  facebook: {
    nombre: "Facebook",
    fondo: "#1877F2",
    glifo: (
      <path
        fill="currentColor"
        d="M13.5 21v-7h2.4l.4-2.9h-2.8V9.3c0-.8.3-1.4 1.4-1.4h1.5V5.3c-.3 0-1.2-.1-2.2-.1-2.2 0-3.6 1.3-3.6 3.7v2.2H8.2V14h2.4v7h2.9Z"
      />
    ),
  },
  tiktok: {
    nombre: "TikTok",
    fondo: "#000000",
    glifo: (
      <path
        fill="currentColor"
        d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-1.8-2.5V9.7a5.7 5.7 0 1 0 4.9 5.7V9.1a7.3 7.3 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6Z"
      />
    ),
  },
  whatsapp: {
    nombre: "WhatsApp",
    fondo: "#25D366",
    glifo: (
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M4.5 19.5l1.1-3.6A8 8 0 1 1 8.4 18.6Z" />
        <path
          fill="currentColor"
          stroke="none"
          d="M9.3 8.2c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.1-.2.3 0 .5.5.9 1.3 1.6 2.2 2.1.2.1.4.1.5-.1l.6-.7c.2-.2.3-.2.6-.1l1.5.7c.2.1.4.2.4.4 0 .5-.2 1.2-.7 1.5-.5.4-1.2.5-2 .3-1.2-.4-2.4-1.1-3.4-2.1-.9-.9-1.6-2-2-3.2-.2-.7 0-1.6.6-2.1Z"
        />
      </g>
    ),
  },
};

export const nombreDeRed = (red: RedNegocio) => RED[red].nombre;

export function IconoRed({ red, className = "size-9 rounded-xl" }: { red: RedNegocio; className?: string }) {
  const { fondo, glifo } = RED[red];
  return (
    <span
      className={`flex shrink-0 items-center justify-center text-white shadow-xs ${className}`}
      style={{ background: fondo }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-[60%]">
        {glifo}
      </svg>
    </span>
  );
}
