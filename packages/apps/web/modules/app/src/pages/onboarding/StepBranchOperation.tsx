import React from "react";
import { Input, Label, Toggle } from "@/elements";
import type { BusinessChannelConfig } from "../../context/BusinessContext";
import { StepHeading } from "./onboarding-chrome";

interface StepBranchOperationProps {
  eyebrow: string;
  openingDays: string;
  openingHours: string;
  channels: BusinessChannelConfig;
  onOpeningDaysChange: (value: string) => void;
  onOpeningHoursChange: (value: string) => void;
  onToggleChannel: (key: keyof BusinessChannelConfig, next: boolean) => void;
}

const CHANNEL_COPY: { key: keyof BusinessChannelConfig; label: string; hint: string }[] = [
  { key: "whatsapp", label: "WhatsApp", hint: "Pedidos y conversaciones por WhatsApp." },
  { key: "web", label: "Tienda web", hint: "Catálogo público y pedidos en línea." },
  { key: "pos", label: "Mostrador (POS)", hint: "Venta presencial en esta sede." },
];

/**
 * Ámbito **sucursal**: cómo opera esta sede.
 *
 * Los horarios y los canales son de la sede: una sucursal puede abrir de mañana y
 * otra de noche.
 *
 * ⚠️ La selección de **módulos** ya **no** vive aquí: tiene su propio paso
 * (`StepBranchModules`). Cuando compartían paso, el alta obligaba a decidir la
 * operación y el acoplamiento de módulos en el mismo momento, y el paso quedaba
 * sobrecargado. No la reintroduzcas aquí.
 */
export const StepBranchOperation: React.FC<StepBranchOperationProps> = ({
  eyebrow,
  openingDays,
  openingHours,
  channels,
  onOpeningDaysChange,
  onOpeningHoursChange,
  onToggleChannel,
}) => {
  return (
    <div className="animate-in space-y-10 fade-in slide-in-from-bottom-1 duration-300">
      <StepHeading
        eyebrow={eyebrow}
        description="Horarios y canales con los que esta sucursal empieza a operar."
      >
        Operación de la sede
      </StepHeading>

      {/* Horario de atención */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2.5">
          <Label
            htmlFor="branch-opening-days"
            className="mb-0 text-theme-sm font-semibold text-gray-900 dark:text-gray-200"
          >
            Días de operación
          </Label>
          <Input
            id="branch-opening-days"
            type="text"
            placeholder="Lunes a sábado"
            value={openingDays}
            onChange={e => onOpeningDaysChange(e.target.value)}
          />
        </div>

        <div className="space-y-2.5">
          <Label
            htmlFor="branch-opening-hours"
            className="mb-0 text-theme-sm font-semibold text-gray-900 dark:text-gray-200"
          >
            Horario habitual
          </Label>
          <Input
            id="branch-opening-hours"
            type="text"
            placeholder="10:00 - 22:00"
            value={openingHours}
            onChange={e => onOpeningHoursChange(e.target.value)}
          />
        </div>
      </div>

      {/* Canales */}
      <div className="space-y-3">
        <div>
          <h2 className="text-theme-sm font-semibold text-gray-900 dark:text-gray-200">
            Canales de atención
          </h2>
          <p className="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
            Por dónde atiende esta sucursal. Podrás cambiarlo cuando quieras.
          </p>
        </div>
        <div className="space-y-2">
          {CHANNEL_COPY.map(ch => (
            <div
              key={ch.key}
              className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
            >
              <div>
                <p className="text-theme-sm font-bold text-gray-900 dark:text-white">{ch.label}</p>
                <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">{ch.hint}</p>
              </div>
              <Toggle
                intent={`onboarding.channel.${ch.key}`}
                checked={channels[ch.key]}
                onChange={next => onToggleChannel(ch.key, next)}
                ariaLabel={ch.label}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
