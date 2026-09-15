import React from "react";
import { Upload } from "lucide-react";
import type { AccentId } from "../../../auth/profile";
import {
  AccentPicker,
  AvatarPresetPicker,
} from "../../../compositions/shared/personalization";
import { Label } from "@/elements";
import { StepHeading } from "../onboarding-chrome";

interface StepPersonalizationProps {
  eyebrow: string;
  avatarUrl: string;
  accent: AccentId;
  /** Iniciales de respaldo cuando no hay foto ni avatar elegido. */
  initials: string;
  onAvatarChange: (url: string) => void;
  onAccentChange: (accent: AccentId) => void;
}

/**
 * Paso 1 — Personalización de `onboarding_new_user`.
 *
 * Sólo dos decisiones: cómo te ven (foto o avatar minimalista) y con qué acento.
 * No se piden datos personales: nombre, apellido y correo ya vienen del registro,
 * y volver a pedirlos aquí convertiría el onboarding en un segundo formulario de
 * alta, que es justo lo que este flujo no debe ser.
 *
 * Los dos selectores son **los mismos componentes** que usa Ajustes de perfil &
 * Cuenta (ver `compositions/shared/personalization`): la personalización no puede
 * tener menos opciones en Ajustes que en el asistente.
 */
export const StepPersonalization: React.FC<StepPersonalizationProps> = ({
  eyebrow,
  avatarUrl,
  accent,
  initials,
  onAvatarChange,
  onAccentChange,
}) => {
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onAvatarChange(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="animate-in space-y-8 fade-in slide-in-from-bottom-1 duration-300">
      <StepHeading
        eyebrow={eyebrow}
        description="Elige cómo te verás dentro de Necto. Nada de esto es obligatorio y todo se puede cambiar después desde tu perfil."
      >
        Hazla tuya antes de empezar.
      </StepHeading>

      {/* Foto de perfil */}
      <div className="space-y-4">
        <Label className="text-theme-sm font-semibold text-gray-900 dark:text-gray-200">
          Tu foto de perfil
        </Label>

        <div className="flex items-center gap-4">
          <span className="size-20 flex-none overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Vista previa del avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xl font-bold text-gray-400">
                {initials}
              </span>
            )}
          </span>

          <div className="space-y-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-theme-xs font-bold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white">
              <Upload className="h-3.5 w-3.5" />
              <span>Subir una foto</span>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
            <p className="text-theme-xs text-gray-400">JPG, PNG o WEBP · Se guarda en este navegador</p>
          </div>
        </div>

        <div className="pt-1">
          <AvatarPresetPicker value={avatarUrl} onChange={onAvatarChange} />
        </div>
      </div>

      {/* Acento */}
      <div className="space-y-3.5">
        <Label className="text-theme-sm font-semibold text-gray-900 dark:text-gray-200">
          Tu color de acento
        </Label>

        <AccentPicker value={accent} onChange={onAccentChange} />

        <p className="text-theme-xs text-gray-400 dark:text-gray-500">
          El acento tiñe tu panel y tus llamadas a la acción. Ya lo estás viendo en la vista previa.
        </p>
      </div>
    </div>
  );
};
