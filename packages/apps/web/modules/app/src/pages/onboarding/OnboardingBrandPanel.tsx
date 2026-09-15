import React from "react";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";
import { cn } from "@/utils";
import { STEP_MESSAGES, type WizardStepKey } from "../onboarding.constants";
import { AnimatedStepMessages } from "./onboarding-chrome";

export interface OnboardingSummary {
  eyebrow: string;
  title: string;
  lines: string[];
}

interface OnboardingBrandPanelProps {
  stepKey: WizardStepKey;
  /** Sólo el primer paso ocupa el panel en móvil; el resto lo cede al formulario. */
  isFirstStep: boolean;
  summary: OnboardingSummary;
}

/**
 * Panel de marca del alta de sucursal. Además del copy rotativo, muestra el
 * resumen en vivo de lo que se está creando, con su **ámbito** explícito
 * ("Tu tienda" / "Tu sucursal") para que nunca se confundan los dos niveles.
 *
 * ⚠️ El fondo **no** sigue al acento del usuario: es `bg-brand-500` (e índigo en
 * oscuro) por diseño, porque este panel es la voz de Necto, no la vista previa
 * de una personalización. El asistente de la persona sí se tiñe; este no.
 */
export const OnboardingBrandPanel: React.FC<OnboardingBrandPanelProps> = ({
  stepKey,
  isFirstStep,
  summary,
}) => {
  return (
    <div
      className={cn(
        "relative min-h-[420px] flex-col justify-between overflow-hidden border-l border-transparent bg-brand-500 p-8 text-white transition-colors duration-300 sm:p-12 lg:col-span-5 lg:min-h-[560px] dark:border-secondary-900/50 dark:bg-secondary-600",
        isFirstStep ? "flex" : "hidden lg:flex"
      )}
    >
      <InteractiveDotGrid dotGap={26} baseRadius={1.5} activeRadius={3.0} glowDistance={150} />

      <div className="relative z-10 flex h-full animate-in flex-col justify-between fade-in duration-300">
        <div className="flex items-center justify-between">
          <img src="/images/logo/necto-full-white.svg" alt="Necto" className="h-6 w-auto" />
          <span className="text-theme-xs font-bold uppercase tracking-[0.2em] text-white/70">
            {stepKey === "store" ? "Tu tienda" : "Tu sucursal"}
          </span>
        </div>

        <div className="my-auto space-y-6">
          <AnimatedStepMessages messages={STEP_MESSAGES[stepKey]} />

          <div className="space-y-2 border-t border-white/25 pt-6">
            <span className="text-theme-xs font-bold uppercase tracking-[0.2em] text-white/60">
              {summary.eyebrow}
            </span>
            <p className="truncate text-2xl font-bold leading-tight tracking-tight">
              {summary.title}
            </p>
            {summary.lines
              .filter(Boolean)
              .map(line => (
                <p key={line} className="text-theme-sm font-medium text-white/85">
                  {line}
                </p>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
