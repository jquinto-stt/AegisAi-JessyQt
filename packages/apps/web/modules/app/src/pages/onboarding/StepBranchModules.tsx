import React from "react";
import type { NectoModuleKey } from "../../context/BusinessContext";
import { StepHeading } from "./onboarding-chrome";
import { ModulePicker } from "./ModulePicker";
import { MODULE_DEFINITIONS } from "../onboarding.constants";

interface StepBranchModulesProps {
  eyebrow: string;
  selectedModules: NectoModuleKey[];
  onToggleModule: (key: NectoModuleKey) => void;
}

/**
 * Paso dedicado **exclusivamente** a los módulos del alta.
 *
 * Antes esta rejilla vivía dentro de "Operación", compartiendo paso con horarios
 * y canales: el alta obligaba a decidir tres cosas distintas de golpe. Separarla
 * da al acoplamiento de módulos el peso que tiene (determina qué puede hacer la
 * sede desde el primer día) sin tocar el contenido de los pasos anteriores.
 *
 * El paso es **opcional en la práctica**: los módulos llegan preseleccionados con
 * los recomendados del arquetipo, así que se puede avanzar sin tocar nada.
 */
export const StepBranchModules: React.FC<StepBranchModulesProps> = ({
  eyebrow,
  selectedModules,
  onToggleModule,
}) => {
  const activeCount = selectedModules.length;
  const total = MODULE_DEFINITIONS.length;

  return (
    <div className="animate-in space-y-10 fade-in slide-in-from-bottom-1 duration-300">
      <StepHeading
        eyebrow={eyebrow}
        description="Activa los módulos con los que operará esta sucursal. Cada sede enciende los suyos, y puedes cambiarlos cuando quieras."
      >
        Módulos de tienda
      </StepHeading>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-theme-sm font-semibold text-gray-900 dark:text-gray-200">
            Capacidades de esta sucursal
          </h2>
          <span className="text-theme-xs font-bold tabular-nums text-gray-400 dark:text-gray-500">
            {activeCount} de {total} activos
          </span>
        </div>
        <p className="text-theme-xs text-gray-400 dark:text-gray-500">
          Vienen marcados los recomendados para tu tipo de negocio. Podrás cambiarlos cuando
          quieras.
        </p>
        <ModulePicker selectedModules={selectedModules} onToggleModule={onToggleModule} />
      </div>

      {activeCount === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 p-4 text-theme-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Sin módulos activos, la sede se crea igual pero no tendrá ninguna capacidad operativa
          hasta que actives al menos una.
        </p>
      )}
    </div>
  );
};
