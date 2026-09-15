import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/utils";
import { PRESET_AVATARS } from "@/auth/profile";

interface AvatarPresetPickerProps {
  /** Avatar actual (`avatarUrl` del perfil). Vacío = se usan las iniciales. */
  value: string;
  onChange: (url: string) => void;
  /** Etiqueta sobre la rejilla. `null` la oculta. */
  label?: string | null;
}

/**
 * Rejilla de avatares minimalistas.
 *
 * Vive en `compositions/shared` porque la usan dos superficies que deben ofrecer
 * exactamente lo mismo: el paso de personalización del onboarding y Ajustes de
 * Perfil & Cuenta. Duplicarla habría permitido que divergieran —un catálogo más
 * corto en un sitio que en otro—, que es el defecto clásico de las listas
 * repetidas.
 *
 * Los avatares son `data:` URI generados en el cliente (ver `profile.constants`),
 * así que no dependen de la red.
 */
export const AvatarPresetPicker: React.FC<AvatarPresetPickerProps> = ({
  value,
  onChange,
  label = "O elige un avatar minimalista",
}) => (
  <div className="space-y-2.5">
    {label && (
      <p className="text-theme-xs font-medium text-gray-400 dark:text-gray-500">{label}</p>
    )}

    <div className="grid grid-cols-6 gap-2.5">
      {PRESET_AVATARS.map(preset => {
        const isActive = value === preset.url;
        return (
          <button
            key={preset.id}
            type="button"
            aria-pressed={isActive}
            title={preset.label}
            onClick={() => onChange(preset.url)}
            className={cn(
              "relative aspect-square cursor-pointer overflow-hidden rounded-xl transition-all",
              isActive ? "shadow-theme-lg" : "opacity-75 hover:opacity-100"
            )}
            style={
              isActive
                ? { outline: "2px solid var(--necto-accent, #FF3F1A)", outlineOffset: "2px" }
                : undefined
            }
          >
            <img src={preset.url} alt={preset.label} className="h-full w-full object-cover" />
            {isActive && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                <Check className="h-4 w-4 text-white" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);
