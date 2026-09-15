import React from "react";
import { cn } from "@/utils";

interface OnboardingStepperProps {
  /**
   * Pasos vigentes. Sólo se necesita saber cómo numerar y etiquetar cada uno.
   *
   * Se tipa estructuralmente (y no con `WizardStep`) para que el wizard de
   * sucursal y `onboarding_new_user` compartan el mismo control: son flujos
   * distintos, pero la barra de progreso no tiene por qué duplicarse.
   */
  steps: Array<{ num: number; label: string }>;
  step: number;
  canProceed: boolean;
  onSelect: (step: number) => void;
}

export const OnboardingStepper: React.FC<OnboardingStepperProps> = ({
  steps,
  step,
  canProceed,
  onSelect,
}) => {
  return (
            <div className="mb-10 flex items-center gap-4">
              <div className="flex flex-1 items-center gap-2">
                {steps.map(s => {
                  const done = s.num < step;
                  const active = s.num === step;
                  const reachable = s.num < step || canProceed;
                  return (
                    <button
                      key={s.num}
                      type="button"
                      disabled={!reachable}
                      aria-label={s.label}
                      aria-current={active ? "step" : undefined}
                      onClick={() => reachable && onSelect(s.num)}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-all duration-300",
                        active
                          ? "bg-brand-500"
                          : done
                          ? "bg-brand-500/40"
                          : "bg-gray-200 dark:bg-gray-800",
                        reachable ? "cursor-pointer" : "cursor-not-allowed"
                      )}
                    />
                  );
                })}
              </div>
              <span className="text-theme-xs font-bold uppercase tracking-wider text-gray-400">
                {step}/{steps.length}
              </span>
            </div>
  );
};
