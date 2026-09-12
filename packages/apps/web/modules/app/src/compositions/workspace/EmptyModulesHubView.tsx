import React, { useState } from "react";
import {
  ShoppingBag,
  Package,
  Clock,
  Users,
  Calendar,
  Award,
  CheckCircle2,
  Plus,
  ArrowRight,
} from "lucide-react";
import { useBusiness, NectoModuleKey, BusinessInstance, BUSINESS_ARCHETYPES } from "../../context/BusinessContext";
import { ModuleActivationModal } from "./ModuleActivationModal";

interface EmptyModulesHubViewProps {
  business?: BusinessInstance;
  onNavigateToModule?: (moduleKey: "pedidos" | "inventarios") => void;
  onOpenSettings?: (tab?: any) => void;
}

interface ModuleDefinition {
  id: NectoModuleKey;
  title: string;
  category: string;
  description: string;
  features: string[];
  icon: React.ComponentType<{ className?: string }>;
  isReady: boolean;
}

const AVAILABLE_MODULES: ModuleDefinition[] = [
  {
    id: "pedidos",
    title: "Pedidos",
    category: "Operación & Despacho",
    description:
      "Gestión y operación del ciclo de vida de las órdenes independientemente del canal de origen.",
    features: [
      "Órdenes en vivo",
      "Estados y flujo operativo",
      "Preparación y despacho",
      "Historial y trazabilidad",
      "Cancelaciones y devoluciones",
    ],
    icon: ShoppingBag,
    isReady: true,
  },
  {
    id: "inventarios",
    title: "Control de Inventarios, Kardex & Stock",
    category: "Logística & Almacén",
    description:
      "Control de existencias físicas, movimientos de entrada/salida (Kardex), gestión de bodegas, compras a proveedores y alertas de reposición de stock.",
    features: [
      "Movimientos de entrada, salida y ajustes",
      "Alertas automáticas de stock mínimo",
      "Valoración y costo promedio de inventario",
    ],
    icon: Package,
    isReady: true,
  },
  {
    id: "turnos",
    title: "Control de Turnos & Cierres de Caja",
    category: "Caja & Operaciones",
    description:
      "Apertura y cierre de turnos con arqueo ciego de caja, registro de ingresos/egresos en efectivo y trazabilidad de cajeros.",
    features: [
      "Apertura y cierre ciego de turno",
      "Control de diferencias de efectivo",
      "Reportes de recaudación por medio de pago",
    ],
    icon: Clock,
    isReady: true,
  },
  {
    id: "reservas",
    title: "Reservas & Gestión de Mesas o Espacios",
    category: "Atención & Salón",
    description:
      "Gestión de reservaciones presenciales y confirmación automática por WhatsApp con control de capacidad máxima y franjas horarias.",
    features: [
      "Mapa visual de mesas o cabinas",
      "Confirmación de reservas por WhatsApp",
      "Control de tiempos de estadía y rotación",
    ],
    icon: Users,
    isReady: true,
  },
  {
    id: "agendamiento",
    title: "Agendamiento & Citas de Servicio",
    category: "Servicios & Profesionales",
    description:
      "Calendario sincronizado para agendamiento de turnos, citas técnicas, consultas médicas o servicios profesionales con recordatorios al cliente.",
    features: [
      "Agenda por profesional o estación",
      "Recordatorios preventivos por WhatsApp",
      "Bloqueos de horarios y disponibilidad",
    ],
    icon: Calendar,
    isReady: true,
  },
  {
    id: "referidos",
    title: "Fidelización, Cupones & Cashback",
    category: "Crecimiento & Lealtad",
    description:
      "Sistema de recompensas por recurrencia, cupones dinámicos de descuento enviados tras cada compra por WhatsApp y programa de referidos.",
    features: [
      "Puntos y cashback acumulables",
      "Cupones automáticos por WhatsApp",
      "Campañas de reactivación de clientes inactivos",
    ],
    icon: Award,
    isReady: true,
  },
];

export const EmptyModulesHubView: React.FC<EmptyModulesHubViewProps> = ({
  business,
  onNavigateToModule,
  onOpenSettings,
}) => {
  const { activeBusiness, toggleModule } = useBusiness();
  const currentBiz = business || activeBusiness;
  const activeModules = currentBiz?.activeModules || [];
  const [activatingModule, setActivatingModule] = useState<NectoModuleKey | null>(null);

  const currentArchetype = BUSINESS_ARCHETYPES.find(
    a => a.id === currentBiz?.businessType
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Subheader con contador, arquetipo y descripción */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {currentBiz?.name || "Mi Negocio"}
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/40">
              {currentBiz?.specialty || currentArchetype?.label || "Comercio"}
            </span>
            {currentBiz?.offerModel && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {currentBiz.offerModel === "physical_products"
                  ? "Productos Físicos (SKU)"
                  : currentBiz.offerModel === "prepared_products"
                  ? "Productos Preparados (Recetas)"
                  : currentBiz.offerModel === "services_appointments"
                  ? "Servicios & Citas"
                  : "Modelo Híbrido"}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Activa o desactiva las capacidades operativas según las necesidades de este negocio.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 flex-none self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-brand-500" />
          {activeModules.length} de {AVAILABLE_MODULES.length} módulos activos
        </span>
      </div>

      {/* Catálogo de Módulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AVAILABLE_MODULES.map(mod => {
            const isActive = activeModules.includes(mod.id);
            const Icon = mod.icon;

            return (
              <div
                key={mod.id}
                className={`relative flex flex-col justify-between rounded-2xl border transition-all duration-200 p-6 ${
                  isActive
                    ? "border-brand-500/40 bg-white dark:bg-gray-900 shadow-md ring-1 ring-brand-500/20"
                    : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm"
                }`}
              >
                <div>
                  {/* Top Bar Card */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    {isActive && (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Activo
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                    {mod.description}
                  </p>

                  {/* Feature Bullets */}
                  <ul className="space-y-1.5 mb-6 border-t border-gray-100 dark:border-gray-800/80 pt-3">
                    {mod.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentBiz) return;
                      if (isActive) {
                        toggleModule(currentBiz.id, mod.id);
                      } else {
                        setActivatingModule(mod.id);
                      }
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isActive
                        ? "bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-200 dark:bg-gray-800 dark:hover:bg-red-950/30 dark:text-gray-200 dark:hover:text-red-400 dark:border-gray-700"
                        : "bg-brand-500 hover:bg-brand-600 text-white shadow-sm shadow-brand-500/20 active:scale-[0.98]"
                    }`}
                  >
                    {isActive ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Módulo Instalado (Clic para Desactivar)</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Activar Módulo</span>
                      </>
                    )}
                  </button>

                  {isActive && (mod.id === "pedidos" || mod.id === "inventarios") && onNavigateToModule && (
                    <button
                      type="button"
                      onClick={() => onNavigateToModule(mod.id as "pedidos" | "inventarios")}
                      className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Abrir módulo</span>
                      <ArrowRight className="w-3.5 h-3.5" />
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
