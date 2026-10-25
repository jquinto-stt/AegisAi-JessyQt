import React from "react";

export interface PanelToggleIconProps {
  filled?: boolean;
  className?: string;
  size?: number | string;
}

/**
 * Icono de Bento/Paneles con estados contorno (oculto) y relleno (visible).
 * Diseñado a partir del asset nativo de 4 cuadrantes asimétricos con esquinas redondeadas.
 */
export const PanelToggleIcon: React.FC<PanelToggleIconProps> = ({
  filled = false,
  className = "",
  size = 20,
}) => {
  if (filled) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <rect x="6" y="6" width="16.5" height="12.5" rx="4.5" />
        <rect x="6" y="22" width="16.5" height="20" rx="4.5" />
        <rect x="25.5" y="6" width="16.5" height="20" rx="4.5" />
        <rect x="25.5" y="29.5" width="16.5" height="12.5" rx="4.5" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="7.8" y="7.8" width="12.9" height="8.9" rx="3.5" />
      <rect x="7.8" y="23.8" width="12.9" height="16.4" rx="3.5" />
      <rect x="27.3" y="7.8" width="12.9" height="16.4" rx="3.5" />
      <rect x="27.3" y="31.3" width="12.9" height="8.9" rx="3.5" />
    </svg>
  );
};

export default PanelToggleIcon;
