import React from "react";
import { USAGE_REASONS, type UsageReason } from "../../../auth/profile";
import { USAGE_REASON_ICONS } from "./new-user.constants";
import { OptionCard, StepHeading } from "../onboarding-chrome";

interface StepUsageReasonProps {
  eyebrow: string;
  usageReason: UsageReason | "";
  onUsageReasonChange: (reason: UsageReason) => void;
}

/**
 * Paso 3 — Motivo de uso de `onboarding_new_user`.
 *
 * Conocer la intención permite ordenar la experiencia después (mostrar primero
 * pedidos a quien viene a vender, inventario a quien viene a controlar stock).
 * Es información de la **persona**: no dice nada del tipo de negocio, y por eso
 * no sustituye al paso de tipificación de la tienda.
 */
export const StepUsageReason: React.FC<StepUsageReasonProps> = ({
  eyebrow,
  usageReason,
  onUsageReasonChange,
}) => {
  return (
    <div className="animate-in space-y-8 fade-in slide-in-from-bottom-1 duration-300">
      <StepHeading
        eyebrow={eyebrow}
        description="Elige lo que más se acerque. Con esto decidimos qué mostrarte primero cuando entres."
      >
        ¿Por qué quieres usar Necto?
      </StepHeading>

      <div className="space-y-2.5">
        {USAGE_REASONS.map(reason => {
          const Icon = USAGE_REASON_ICONS[reason.id];
          return (
            <OptionCard
              key={reason.id}
              active={usageReason === reason.id}
              onClick={() => onUsageReasonChange(reason.id)}
              icon={<Icon className="h-5 w-5" />}
              title={reason.label}
              description={reason.desc}
            />
          );
        })}
      </div>
    </div>
  );
};
