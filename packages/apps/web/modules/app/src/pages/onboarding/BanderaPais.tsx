import React from "react";

/**
 * Banderas de los países del onboarding, dibujadas en SVG.
 *
 * No se usan emojis: Windows no tiene glifos de banderas y muestra las dos
 * letras del código («CO»). Son versiones simplificadas —sin escudos de
 * detalle— pensadas para leerse a 16–24 px.
 */

const ROJO_US = "#B22234";

const FRANJAS_US = Array.from({ length: 13 }, (_, i) => i).filter((i) => i % 2 === 1);

const DIBUJOS: Record<string, React.ReactNode> = {
  CO: (
    <>
      <rect width="30" height="10" fill="#FCD116" />
      <rect y="10" width="30" height="5" fill="#003893" />
      <rect y="15" width="30" height="5" fill="#CE1126" />
    </>
  ),
  PE: (
    <>
      <rect width="10" height="20" fill="#D91023" />
      <rect x="10" width="10" height="20" fill="#FFFFFF" />
      <rect x="20" width="10" height="20" fill="#D91023" />
    </>
  ),
  EC: (
    <>
      <rect width="30" height="10" fill="#FFDD00" />
      <rect y="10" width="30" height="5" fill="#034EA2" />
      <rect y="15" width="30" height="5" fill="#ED1C24" />
      <circle cx="15" cy="10" r="2.6" fill="#034EA2" stroke="#FFDD00" strokeWidth="0.6" />
    </>
  ),
  MX: (
    <>
      <rect width="10" height="20" fill="#006847" />
      <rect x="10" width="10" height="20" fill="#FFFFFF" />
      <rect x="20" width="10" height="20" fill="#CE1126" />
      <circle cx="15" cy="10" r="2.4" fill="#8C5A2B" />
    </>
  ),
  CL: (
    <>
      <rect width="30" height="10" fill="#FFFFFF" />
      <rect y="10" width="30" height="10" fill="#D52B1E" />
      <rect width="10" height="10" fill="#0039A6" />
      <polygon
        points="5,2.4 5.59,4.19 7.47,4.2 5.95,5.31 6.53,7.1 5,6 3.47,7.1 4.05,5.31 2.53,4.2 4.41,4.19"
        fill="#FFFFFF"
      />
    </>
  ),
  AR: (
    <>
      <rect width="30" height="20" fill="#74ACDF" />
      <rect y="6.667" width="30" height="6.667" fill="#FFFFFF" />
      <circle cx="15" cy="10" r="2.2" fill="#F6B40E" />
    </>
  ),
  ES: (
    <>
      <rect width="30" height="20" fill="#AA151B" />
      <rect y="5" width="30" height="10" fill="#F1BF00" />
    </>
  ),
  US: (
    <>
      <rect width="30" height="20" fill={ROJO_US} />
      {FRANJAS_US.map((i) => (
        <rect key={i} y={(i * 20) / 13} width="30" height={20 / 13} fill="#FFFFFF" />
      ))}
      <rect width="12" height={(7 * 20) / 13} fill="#3C3B6E" />
    </>
  ),
};

export function BanderaPais({
  codigo,
  className = "h-4 w-6",
}: {
  codigo: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 30 20"
      className={`shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10 dark:ring-white/15 ${className}`}
      aria-hidden="true"
    >
      {DIBUJOS[codigo]}
    </svg>
  );
}
