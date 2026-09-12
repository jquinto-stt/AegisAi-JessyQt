import React, { useState } from "react";
import {
  ShoppingBag,
  Package,
  Clock,
  Users,
  Calendar,
  Award,
  Check,
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

const OFFER_MODEL_LABELS: Record<string, string> = {
  physical_products: "Productos físicos (SKU)",
  prepared_products: "Productos preparados (Recetas)",
  services_appointments: "Servicios & citas",
};

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
    <div className="space-y-8 pb-16">
      {/* Subheader — business identity + module counter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[22px] font-black tracking-tight text-secondary-600 sm:text-[26px] dark:text-white">
              {currentBiz?.name || "Mi Negocio"}
            </h2>
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
              {currentBiz?.specialty || currentArchetype?.label || "Comercio"}
            </span>
            {currentBiz?.offerModel && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {OFFER_MODEL_LABELS[currentBiz.offerModel] || "Modelo híbrido"}
              </span>
            )}
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            Activa o desactiva las capacidades operativas según las necesidades de este negocio.
          </p>
        </div>

        <span className="inline-flex flex-none items-center gap-2 self-start rounded-full bg-gray-100 px-3.5 py-1.5 text-xs font-bold text-gray-600 sm:self-auto dark:bg-gray-800 dark:text-gray-300">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          {activeModules.length} de {AVAILABLE_MODULES.length} módulos activos
        </span>
      </div>

      {/* Module catalogue */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {AVAILABLE_MODULES.map(mod => {
          const isActive = activeModules.includes(mod.id);
          const Icon = mod.icon;

          return (
            <div
              key={mod.id}
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
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
                      isActive
                        ? "bg-brand-500 text-white"
                        : "bg-white text-brand-500 dark:bg-gray-800 dark:text-brand-400"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  {isActive && (
                    <span className="rounded-full bg-brand-500 px-2.5 py-1 text-[11px] font-bold text-white">
                      Activo
                    </span>
                  )}
                </div>

                {/* Title & description */}
                <h3 className="mb-2 text-[15px] font-black leading-snug tracking-tight text-secondary-600 dark:text-white">
                  {mod.title}
                </h3>
                <p className="mb-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  {mod.description}
                </p>

                {/* Features */}
                <ul className="mb-6 space-y-2">
                  {mod.features.map((feat, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-brand-500" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
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
                  className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-full py-2.5 text-[13px] font-bold transition-colors ${
                    isActive
                      ? "bg-white text-gray-600 hover:text-brand-500 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-brand-400"
                      : "bg-brand-500 text-white hover:bg-brand-600 active:scale-[0.98]"
                  }`}
                >
                  {isActive ? (
                    <>
                      <Check className="h-4 w-4 text-brand-500" />
                      <span>Desactivar</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Activar módulo</span>
                    </>
                  )}
                </button>

                {isActive && (mod.id === "pedidos" || mod.id === "inventarios") && onNavigateToModule && (
                  <button
                    type="button"
                    onClick={() => onNavigateToModule(mod.id as "pedidos" | "inventarios")}
                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-bold text-brand-500 transition-colors hover:bg-white dark:hover:bg-gray-800"
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
