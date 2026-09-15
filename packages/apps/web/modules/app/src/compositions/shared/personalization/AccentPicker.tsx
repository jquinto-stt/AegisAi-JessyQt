import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/utils";
import { ACCENTS, type AccentId } from "@/auth/profile";

interface AccentPickerProps {
  value: AccentId;
  onChange: (accent: AccentId) => void;
  /** Muestra la fila de vista previa con el acento activo. */
  showPreview?: boolean;
}

/**
 * Selector del acento visual.
 *
 * Compartido por el onboarding y por Ajustes de perfil & Cuenta para que la
 * personalización tenga el **mismo nivel** en los dos sitios. Todos los acentos
 * son tokens de la marca (ver `ACCENTS`), no colores libres: se elige dentro de
 * la paleta, no contra ella.
 *
 * Los colores se pintan desde el propio catálogo y no desde variables CSS, de
 * modo que el control se ve correcto aunque se monte fuera de una superficie
 * tematizada (por ejemplo, dentro de un modal).
 */
export const AccentPicker: React.FC<AccentPickerProps> = ({
  value,
  onChange,
  showPreview = true,
}) => {
  const active = ACCENTS.find(a => a.id === value) ?? ACCENTS[0];

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {ACCENTS.map(option => {
          const isActive = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isActive}
              title={option.desc}
              onClick={() => onChange(option.id)}
              className={cn(
                "flex cursor-pointer flex-col items-start gap-2 rounded-xl p-3.5 text-left transition-all",
                isActive
                  ? "text-gray-900 shadow-theme-lg dark:text-gray-100"
                  : "bg-gray-50 text-gray-900 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              )}
              style={
                isActive
                  ? { backgroundColor: `${option.hex}1F`, outline: `1px solid ${option.hex}` }
                  : undefined
              }
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: option.hex,
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
                }}
              >
                {isActive && (
                  <Check className="h-4 w-4" style={{ color: option.onAccent }} />
                )}
              </span>
              <span className="text-theme-sm font-bold leading-tight">{option.label}</span>
              <span className="text-theme-xs leading-snug text-gray-400 dark:text-gray-500">
                {option.desc}
              </span>
            </button>
          );
        })}
      </div>

      {showPreview && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 p-3.5 dark:bg-gray-900">
          <span
            className="h-8 w-8 flex-none rounded-xl"
            style={{ backgroundColor: active.hex }}
            aria-hidden
          />
          <span className="text-theme-xs font-semibold text-gray-500 dark:text-gray-400">
            Vista previa · <span className="text-gray-900 dark:text-gray-100">{active.label}</span>
          </span>
          <span
            className="ml-auto rounded-full px-4 py-1.5 text-theme-xs font-bold"
            style={{ backgroundColor: active.hex, color: active.onAccent }}
          >
            Botón de ejemplo
          </span>
        </div>
      )}
    </div>
  );
};
