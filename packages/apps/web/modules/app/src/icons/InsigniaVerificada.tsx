import React from "react";

export interface InsigniaVerificadaProps {
  className?: string;
  size?: number | string;
  color?: string;
}

/**
 * Insignia oficial de verificación (roseta anaranjada festoneada de 12 puntas con tilde blanca).
 */
export const InsigniaVerificada: React.FC<InsigniaVerificadaProps> = ({
  className = "size-5",
  size,
  color = "#F97316",
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
        fill={color}
      />
      <path
        d="M10.54 16.2 6.8 12.46l1.41-1.42 2.33 2.33 4.99-4.99 1.42 1.42-6.41 6.4z"
        fill="#FFFFFF"
      />
    </svg>
  );
};

export default InsigniaVerificada;
