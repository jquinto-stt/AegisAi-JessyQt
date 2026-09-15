import React, { useState } from "react";
import { Check, Plus, ArrowRight, Settings2 } from "lucide-react";
import { Badge, Button } from "@/elements";
import { useBusiness, NectoModuleKey, BusinessInstance, BUSINESS_ARCHETYPES } from "../../context/BusinessContext";
import { ModuleActivationModal } from "./ModuleActivationModal";
import { AVAILABLE_MODULES, OFFER_MODEL_LABELS, type ModuleDefinition } from "./empty-modules.constants";

interface EmptyModulesHubViewProps {
  /** `null` cuando la cuenta aún no tiene ninguna sede (mismo contrato que `BusinessSettingsModal`). */
  business?: BusinessInstance | null;
  onNavigateToModule?: (moduleKey: "pedidos" | "inventarios") => void;
  onOpenSettings?: (tab?: any) => void;
}

export const EmptyModulesHubView: React.FC<EmptyModulesHubViewProps> = ({
  business,
  onNavigateToModule,
  onOpenSettings,
}) => {
  const { activeBusiness, toggleModule } = useBusiness();
  const currentBiz = business || activeBusiness;
  const activeModules = currentBiz?.activeModules || [];
  const [activatingModule, setActivatingModule] = useState<NectoModuleKey | null>(null);

  /**
   * Módulos que **tienen pantalla propia** dentro de `/app`.
   *
   * ⚠️ Es un espejo de `NectoApp.MODULES_WITH_VIEWS` y de
   * `StockFlowSidebar.MODULE_NAV_ENTRIES`: un módulo sin vista no ofrece
   * "Abrir módulo" —el enlace llevaría a una pantalla que no existe—, y uno
   * nuevo se declara en los tres sitios. `onNavigateToModule` sólo acepta estos
   * dos por su firma, así que la lista tiene que decir lo mismo que el tipo.
   */
  const MODULES_WITH_VIEW = new Set<NectoModuleKey>(["pedidos"]);

  /**
   * ¿Este módulo puede abrirse ahora mismo?
   *
   * ⚠️ Se ofrece **sólo con el módulo acoplado**: sin él, el shell redirige al
   * Dashboard a propósito (una sede no opera lo que no tiene activo), así que
   * ofrecer el enlace sería prometer una pantalla que se va a negar.
   */
  const canOpenModule = (mod: ModuleDefinition, isActive: boolean) =>
    isActive && MODULES_WITH_VIEW.has(mod.id) && onNavigateToModule !== undefined;

  const currentArchetype = BUSINESS_ARCHETYPES.find(
    a => a.id === currentBiz?.businessType
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Subheader — business identity + module counter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-secondary-600 sm:text-3xl dark:text-white">
              {currentBiz?.name || "Mi Negocio"}
            </h2>
            <Badge color="primary" size="sm" className="px-2.5 font-bold">
              {currentBiz?.specialty || currentArchetype?.label || "Comercio"}
            </Badge>
            {currentBiz?.offerModel && (
              <Badge
                color="light"
                size="sm"
                className="px-2.5 font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              >
                {OFFER_MODEL_LABELS[currentBiz.offerModel] || "Modelo híbrido"}
              </Badge>
            )}
          </div>
          <p className="max-w-xl text-theme-sm leading-relaxed text-gray-500 dark:text-gray-400">
            Activa o desactiva las capacidades operativas según las necesidades de este negocio.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onOpenSettings?.("general")}
          startIcon={<Settings2 className="h-3.5 w-3.5" />}
          className="h-auto flex-none gap-2 self-start rounded-full bg-gray-100 px-3.5 py-1.5 text-theme-xs font-bold text-gray-600 hover:bg-gray-200 hover:text-brand-500 sm:self-auto dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-brand-400"
        >
          {activeModules.length} de {AVAILABLE_MODULES.length} módulos activos
        </Button>
      </div>

      {/* Module catalogue */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {AVAILABLE_MODULES.map(mod => {
          const isActive = activeModules.includes(mod.id);
          /**
           * ⚠️ `toggleModule` muta el catálogo de sedes fuera de este render, así
           * que en el instante en que el modal confirma la activación la fila
           * todavía se pinta con `isActive === false`. Mirar también el módulo que
           * se acaba de activar (`activatingModule`) hace que "Abrir módulo"
           * aparezca en el mismo gesto, sin tener que desactivar y reactivar.
           */
          const canOpen = canOpenModule(mod, isActive);
          const Icon = mod.icon;

          return (
            <div
              key={mod.id}
              data-module-card={mod.id}
              data-module-active={isActive ? "true" : "false"}
              className={`flex flex-col justify-between rounded-3xl p-6 transition-colors ${
                isActive
                  ? "bg-brand-50 dark:bg-brand-500/10"
                  : "bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800"
              }`}
            >
              <div>
                {/* Icon + status */}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                      isActive
                        ? "bg-brand-500 text-white"
                        : "bg-white text-brand-500 dark:bg-gray-800 dark:text-brand-400"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  {isActive && (
                    <Badge variant="solid" color="primary" size="sm" className="px-2.5 py-1 font-bold">
                      Activo
                    </Badge>
                  )}
                </div>

                {/* Title & description */}
                <h3 className="mb-2 text-base font-bold leading-snug tracking-tight text-secondary-600 dark:text-white">
                  {mod.title}
                </h3>
                <p className="mb-4 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  {mod.description}
                </p>

                {/* Features */}
                <ul className="mb-6 space-y-2">
                  {mod.features.map((feat, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-theme-xs text-gray-500 dark:text-gray-400"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-brand-500" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant={isActive ? "outline" : "primary"}
                  onClick={() => {
                    if (!currentBiz) return;
                    if (isActive) {
                      toggleModule(currentBiz.id, mod.id);
                    } else {
                      setActivatingModule(mod.id);
                    }
                  }}
                  startIcon={
                    isActive ? (
                      <Check className="h-4 w-4 text-brand-500" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )
                  }
                  className={`h-auto w-full gap-2 rounded-full py-2.5 text-theme-sm font-bold ${
                    isActive
                      ? "bg-white text-gray-600 ring-0 hover:bg-white hover:text-brand-500 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-brand-400"
                      : "bg-brand-500 text-white hover:bg-brand-600 active:scale-[0.98]"
                  }`}
                >
                  {isActive ? "Desactivar" : "Activar módulo"}
                </Button>

                {/* ⚠️ "Abrir módulo" sólo se ofrece si el módulo **tiene pantalla**
                    dentro de `/app`. Ofrecerlo para los otros cinco (turnos,
                    reservas, agendamiento, referidos, inventarios) llevaba a una
                    pantalla que no existe: el usuario acoplaba el módulo, pulsaba
                    abrir y aterrizaba en el Dashboard — exactamente el síntoma de
                    "selecciono pedidos y no me sale el módulo". */}
                {canOpen && (
                  <button
                    type="button"
                    data-open-module={mod.id}
                    onClick={() => onNavigateToModule!(mod.id as "pedidos" | "inventarios")}
                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full py-2 text-theme-xs font-bold text-brand-500 transition-colors hover:bg-white dark:hover:bg-gray-800"
                  >
                    <span>Abrir módulo</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Contextual Module Activation Onboarding Modal */}
      {currentBiz && (
        <ModuleActivationModal
          isOpen={activatingModule !== null}
          onClose={() => setActivatingModule(null)}
          moduleKey={activatingModule}
          business={currentBiz}
          onConfirm={() => {
            if (currentBiz && activatingModule) {
              toggleModule(currentBiz.id, activatingModule);
            }
          }}
        />
      )}
    </div>
  );
};
