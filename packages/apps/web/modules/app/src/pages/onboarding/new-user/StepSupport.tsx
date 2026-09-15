import React from "react";
import { LifeBuoy } from "lucide-react";
import { Label, Textarea } from "@/elements";
import { StepHeading } from "../onboarding-chrome";

interface StepSupportProps {
  eyebrow: string;
  supportNote: string;
  onSupportNoteChange: (note: string) => void;
}

/**
 * Paso 5 — Soporte de `onboarding_new_user`.
 *
 * Una nota libre y **opcional**: la persona deja escrita una duda o un
 * requerimiento especial antes de entrar a su hub. Es la única pantalla del
 * asistente que no pregunta nada con opciones, porque no hay nada que
 * clasificar: el texto se guarda entero en el perfil.
 *
 * ⚠️ La copy no promete respuesta ni aviso al equipo. Hoy el dato sólo se
 * almacena; el día que exista un canal para el equipo, esta pantalla no cambia.
 */
export const StepSupport: React.FC<StepSupportProps> = ({
  eyebrow,
  supportNote,
  onSupportNoteChange,
}) => {
  return (
    <div className="animate-in space-y-8 fade-in slide-in-from-bottom-1 duration-300">
      <StepHeading
        eyebrow={eyebrow}
        description="Es opcional. Si tienes una duda o un requerimiento especial, escríbelo aquí y queda guardado en tu cuenta."
      >
        ¿Quieres dejarnos algo por escrito?
      </StepHeading>

      <div className="space-y-2.5">
        <Label
          htmlFor="new-user-support-note"
          className="flex items-center gap-2 text-theme-sm font-semibold text-gray-900 dark:text-gray-200"
        >
          <LifeBuoy className="h-4 w-4 text-gray-400" />
          <span>Tu nota (opcional)</span>
        </Label>
        {/* ⚠️ `Textarea` del DS emite el **valor** (`onChange(value: string)`), no el
            evento: la firma es distinta a la del `<textarea>` nativo. Se adapta aquí
            para que el estado del asistente siga siendo un `string` plano. */}
        <Textarea
          id="new-user-support-note"
          rows={5}
          value={supportNote}
          onChange={onSupportNoteChange}
          placeholder="Ej: voy a necesitar ayuda para cargar mi catálogo inicial."
          className="resize-y font-semibold"
        />
        <p className="text-theme-xs text-gray-400">Puedes continuar sin escribir nada.</p>
      </div>
    </div>
  );
};
