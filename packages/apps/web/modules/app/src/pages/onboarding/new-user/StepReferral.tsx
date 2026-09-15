import React from "react";
import { REFERRAL_SOURCES, type ReferralSource } from "../../../auth/profile";
import { REFERRAL_ICONS } from "./new-user.constants";
import { Input, Label } from "@/elements";
import { OptionCard, StepHeading } from "../onboarding-chrome";

interface StepReferralProps {
  eyebrow: string;
  referralSource: ReferralSource | "";
  referralDetail: string;
  onReferralSourceChange: (source: ReferralSource) => void;
  onReferralDetailChange: (detail: string) => void;
}

/**
 * Paso 4 — Descubrimiento de `onboarding_new_user`.
 *
 * "¿Cómo conociste Necto?" es un dato de **adquisición**, no de negocio: se
 * guarda en el bloque de onboarding del perfil y sirve para saber qué canales
 * traen usuarios reales. La opción "Otro" abre un campo libre para no forzar a
 * nadie dentro de una categoría que no le corresponde.
 */
export const StepReferral: React.FC<StepReferralProps> = ({
  eyebrow,
  referralSource,
  referralDetail,
  onReferralSourceChange,
  onReferralDetailChange,
}) => {
  return (
    <div className="animate-in space-y-8 fade-in slide-in-from-bottom-1 duration-300">
      <StepHeading
        eyebrow={eyebrow}
        description="Después de esto queda un último detalle opcional antes de tu hub."
      >
        ¿Cómo conociste Necto?
      </StepHeading>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {REFERRAL_SOURCES.map(source => {
          const Icon = REFERRAL_ICONS[source.id];
          return (
            <OptionCard
              key={source.id}
              active={referralSource === source.id}
              onClick={() => onReferralSourceChange(source.id)}
              icon={<Icon className="h-4 w-4" />}
              title={source.label}
              description={source.desc}
              layout="row"
            />
          );
        })}
      </div>

      {referralSource === "other" && (
        <div className="animate-in space-y-2.5 fade-in duration-200">
          <Label
            htmlFor="new-user-referral-detail"
            className="text-theme-sm font-semibold text-gray-900 dark:text-gray-200"
          >
            Cuéntanos brevemente
          </Label>
          <Input
            id="new-user-referral-detail"
            type="text"
            value={referralDetail}
            onChange={e => onReferralDetailChange(e.target.value)}
            placeholder="Un podcast, un proveedor, una feria…"
            className="font-semibold"
          />
        </div>
      )}
    </div>
  );
};
