import React from "react";

/**
 * Icono de Robot / Bot con antena, cabeza geométrica, ojos y expresión amigable.
 * Diseño limpio 24x24 stroke-based, perfectamente escalable.
 */
export const BotIcon = ({
  className = "size-4",
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Antena del robot */}
    <path d="M12 2v4" />
    <circle cx="12" cy="2" r="1" fill="currentColor" />

    {/* Cabeza del robot */}
    <rect x="4" y="6" width="16" height="14" rx="3" />

    {/* Ojos redondos */}
    <circle cx="8.5" cy="11.5" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="11.5" r="1.5" fill="currentColor" stroke="none" />

    {/* Boca / visor */}
    <path d="M9 16h6" strokeLinecap="round" />

    {/* Orejas o pernos laterales */}
    <path d="M2 12h2" />
    <path d="M20 12h2" />
  </svg>
);

/**
 * Icono de Usuario / Persona clásico.
 */
export const UserIconSvg = ({
  className = "size-4",
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

/**
 * Icono de Asignar Usuario (+).
 */
export const UserPlusIconSvg = ({
  className = "size-4",
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </svg>
);

/**
 * Icono de Asesor / Agente con headset de soporte.
 */
export const AgenteHeadsetIcon = ({
  className = "size-4",
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
    {/* Auriculares de agente */}
    <path d="M8 8v2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a7 7 0 0 1 14 0v2a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V8" />
  </svg>
);

/**
 * Icono de Comunicación / Burbuja de diálogo con líneas de texto.
 */
export const ComunicacionChatIcon = ({
  className = "size-4",
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <line x1="8" y1="9" x2="16" y2="9" strokeWidth="2" strokeLinecap="round" />
    <line x1="8" y1="13" x2="13" y2="13" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
