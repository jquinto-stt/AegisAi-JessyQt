import React from "react";
import { Check } from "lucide-react";
import type { NectoModuleKey } from "../../context/BusinessContext";
import { cn } from "@/utils";
import { MODULE_DEFINITIONS } from "../onboarding.constants";

interface ModulePickerProps {
  selectedModules: NectoModuleKey[];
  onToggleModule: (key: NectoModuleKey) => void;
}

/**
 * Rejilla de módulos activables. Se extrajo del antiguo paso "Capacidades"
 * porque ahora es una sección del paso de **operación** de la sucursal: los
 * módulos se encienden sobre una unidad operativa concreta, no sobre la tienda.
 *
 * ⚠️ Cada celda es un `<button aria-pressed>` y no un `Card` con `onClick`: son
 * multi-selección, así que la superficie entera tiene que ser un único tab stop y
 * el estado tiene que ser legible por accesibilidad. `Toggle` no sirve aquí —
 * describe un interruptor on/off, no una celda seleccionable con descripción.
 */
export const ModulePicker: React.FC<ModulePickerProps> = ({ selectedModules, onToggleModule }) => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {MODULE_DEFINITIONS.map(mod => {
        const isSelected = selectedModules.includes(mod.id);
        const ModIcon = mod.icon;
        return (
          <button
            key={mod.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onToggleModule(mod.id)}
            className={cn(
              "flex cursor-pointer select-none items-start gap-3.5 rounded-xl border p-4 text-left transition-all",
              isSelected
                ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20 dark:border-brand-500/50 dark:bg-brand-500/10"
                : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-gray-700"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-[10.5px] transition-colors",
                isSelected
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
              )}
            >
              <ModIcon className="h-4.5 w-4.5" />
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-theme-xs font-bold text-gray-900 dark:text-white">
                  {mod.title}
                </span>
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border transition-colors",
                    isSelected
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-gray-300 dark:border-gray-700"
                  )}
                >
                  {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                </span>
              </div>
              <p className="mt-1 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
                {mod.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
