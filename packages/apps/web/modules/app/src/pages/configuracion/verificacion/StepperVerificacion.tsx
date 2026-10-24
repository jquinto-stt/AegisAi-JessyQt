import type { FC } from "react";
import {
  CheckIcon,
  HomeModernIcon,
  IdentificationIcon,
  LockClosedIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";

/**
 * Los cuatro hitos del proceso de verificación, en el orden en que se piden.
 *
 * Es una barra de PROGRESO, no navegación: los pasos no se pueden saltar desde
 * aquí. El concepto original los pintaba con icono y texto; se mantiene porque
 * el usuario necesita saber cuánto falta en un trámite que se siente largo.
 */
export const PASOS_VERIFICACION = [
  { titulo: "Confirmación de identidad", Icono: IdentificationIcon },
  { titulo: "Verificación de seguridad", Icono: LockClosedIcon },
  { titulo: "Documento de identificación", Icono: PhotoIcon },
  { titulo: "Comprobante de dirección", Icono: HomeModernIcon },
] as const;

export interface StepperVerificacionProps {
  /** Índice del paso en curso (0–3). Los anteriores se pintan completados. */
  actual: number;
  /** Pasos a pintar. Por defecto, los de la verificación de identidad. */
  pasos?: ReadonlyArray<{
    titulo: string;
    Icono: React.FC<React.SVGProps<SVGSVGElement>>;
  }>;
}

export const StepperVerificacion: FC<StepperVerificacionProps> = ({ actual, pasos = PASOS_VERIFICACION }) => (
  <ol className="mb-7 flex items-start justify-between gap-2" aria-label="Pasos del proceso">
    {pasos.map(({ titulo, Icono }, i) => {
      const hecho = i < actual;
      const enCurso = i === actual;
      return (
        <li key={titulo} className="relative flex flex-1 flex-col items-center text-center">
          {/* Línea conectora hacia el paso siguiente. */}
          {i < pasos.length - 1 && (
            <span
              aria-hidden="true"
              className={`absolute left-1/2 top-4 h-px w-full ${hecho ? "bg-accent-500" : "bg-gray-200 dark:bg-gray-700"}`}
            />
          )}

          <span
            className={`relative z-1 flex h-8 w-8 items-center justify-center rounded-full border text-[13px] font-bold ${
              hecho
                ? "border-accent-500 bg-accent-500 text-white"
                : enCurso
                  ? "border-brand-500 bg-white text-brand-600 dark:bg-gray-900 dark:text-brand-400"
                  : "border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500"
            }`}
            aria-hidden="true"
          >
            {hecho ? <CheckIcon className="h-4 w-4" /> : <Icono className="h-4 w-4" />}
          </span>

          <span
            className={`mt-2 max-w-[120px] text-[11px] leading-tight ${
              enCurso
                ? "font-bold text-ink-title dark:text-white"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {titulo}
          </span>
          <span className="sr-only">
            {hecho ? "Completado" : enCurso ? "En curso" : "Pendiente"}
          </span>
        </li>
      );
    })}
  </ol>
);

export default StepperVerificacion;
