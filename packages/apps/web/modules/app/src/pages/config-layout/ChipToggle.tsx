import { cn } from "@/utils";

// ═══════════════════════════════════════════════════════════════════════════
// CHIP SELECCIONABLE — conjunto múltiple visible
// ═══════════════════════════════════════════════════════════════════════════
//
// Ni `MultiSelect` (esconde las opciones tras un desplegable: nueve clics para
// marcar siete días) ni `Checkbox` (no admite un grupo horizontal compacto)
// expresan "conjunto múltiple visible sin desplegable". Por eso se compone.
//
// Antes había DOS implementaciones divergentes del mismo control, una en
// `/pedidos/config` (cuadrado `w-9 rounded-lg` sin marca) y otra en
// `/conversaciones/config` (píldora `rounded-full` con marca). El MISMO dato
// —los días de atención— se veía distinto según por dónde entraras. Ahora hay
// una sola pieza y las dos pantallas pintan lo mismo.

export interface ChipToggleProps {
  /** Si el chip está seleccionado. */
  activo: boolean;
  /** Texto visible (p. ej. «Lun»). */
  label: string;
  /** Texto emergente, normalmente la forma larga («Lunes»). */
  titulo?: string;
  /** Alterna la selección. */
  onClick: () => void;
  /** Deshabilita el chip (el control sigue visible, solo no reacciona). */
  disabled?: boolean;
  /** Ancho mínimo; los días usan 46px, los chips de texto se ajustan solos. */
  minAncho?: boolean;
}

/**
 * ChipDia — chip de día de la semana con marca de verificación al activarse.
 *
 * Muestra la marca solo cuando está activo: así el estado no depende únicamente
 * del color, que es el patrón accesible que ya usaba la configuración del canal.
 */
export function ChipDia({
  activo,
  label,
  titulo,
  onClick,
  disabled,
  minAncho = true,
}: ChipToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={activo}
      title={titulo}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1 rounded-full border px-3 text-sm font-medium transition-colors cursor-pointer",
        minAncho && "min-w-[46px]",
        activo
          ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
          : "border-gray-300 text-gray-500 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {activo && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          className="h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
      {label}
    </button>
  );
}

/** Alias genérico: el mismo chip sirve para cualquier conjunto de opciones. */
export const ChipToggle = ChipDia;
