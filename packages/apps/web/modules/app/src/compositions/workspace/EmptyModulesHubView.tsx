import React from "react";
import {
  ShoppingBag,
  Package,
  Clock,
  Users,
  Calendar,
  Sparkles,
  CheckCircle2,
  Plus,
  ArrowRight,
  ShieldCheck,
  Building2,
  MapPin,
  Coins,
  Store,
} from "lucide-react";
import { useBusiness, NectoModuleKey, BusinessInstance } from "../../context/BusinessContext";
import { BusinessIcon } from "./BusinessIcon";

interface EmptyModulesHubViewProps {
  business?: BusinessInstance;
  onNavigateToModule?: (moduleKey: "pedidos" | "inventarios") => void;
}

interface ModuleDefinition {
  id: NectoModuleKey;
  title: string;
  category: string;
  badge: string;
  badgeColor: string;
  description: string;
  features: string[];
  icon: React.ComponentType<{ className?: string }>;
  isReady: boolean;
}

const AVAILABLE_MODULES: ModuleDefinition[] = [
  {
    id: "pedidos",
    title: "Sistema de Pedidos Omnicanal & Despacho",
    category: "Ventas & Operación",
    badge: "Canal WhatsApp & POS",
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    description:
      "Recepción y gestión de pedidos vía WhatsApp Bot IA, Web y POS. Incluye tablero Kanban en vivo, estación de preparación/picking, catálogo inteligente y analítica de ventas.",
    features: [
      "Bot de WhatsApp interactivo con catálogo",
      "Kanban de órdenes en vivo y despacho",
      "Estación de preparación y picking",
      "Historial, analítica y comisiones de venta",
    ],
    icon: ShoppingBag,
    isReady: true,
  },
  {
    id: "inventarios",
    title: "Control de Inventarios & Kardex",
    category: "Logística & Stock",
    badge: "Kardex & Compras",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    description:
      "Control integral de existencias, órdenes de compra a proveedores, movimientos Kardex valorizados, múltiples bodegas y cálculo de valor patrimonial.",
    features: [
      "Catálogo de productos y materias primas",
      "Compras y facturación a proveedores",
      "Kardex de entradas, salidas y mermas",
      "Múltiples bodegas y valoración",
    ],
    icon: Package,
    isReady: true,
  },
  {
    id: "turnos",
    title: "Control de Turnos & Arqueo de Caja",
    category: "Finanzas & Cuadrantes",
    badge: "Caja & Auditoría",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
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
    badge: "Mesas & Aforo",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
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
    badge: "Citas & Calendario",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
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
    badge: "Growth & Lealtad",
    badgeColor: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800",
    description:
      "Sistema de recompensas por recurrencia, cupones dinámicos de descuento enviados tras cada compra por WhatsApp y programa de referidos.",
    features: [
      "Puntos y cashback acumulables",
      "Cupones automáticos por WhatsApp",
      "Campañas de reactivación de clientes inactivos",
    ],
    icon: Sparkles,
    isReady: true,
  },
];

export const EmptyModulesHubView: React.FC<EmptyModulesHubViewProps> = ({
  business,
  onNavigateToModule,
}) => {
  const { activeBusiness, toggleModule } = useBusiness();
  const currentBiz = business || activeBusiness;
  const activeModules = currentBiz?.activeModules || [];

  const archetypeLabels: Record<string, string> = {
    retail_store: "Retail, Ferretería & Comercio",
    restaurant_virtual: "Gastronomía & Dark Kitchen",
    services: "Servicios Profesionales & Citas",
    ecommerce_direct: "E-Commerce & Venta Directa",
    wholesale_distributor: "Distribución Mayorista B2B",
  };

  const currentArchetypeLabel =
    archetypeLabels[currentBiz?.businessType || ""] || "Negocio General";

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header de Identidad de Tienda (Contenedor Aislado) */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white via-gray-50/50 to-gray-100/30 dark:from-gray-900 dark:via-gray-900/80 dark:to-gray-950 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 shadow-inner">
              <BusinessIcon iconKey={currentBiz?.iconKey || "store"} className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {currentBiz?.name || "Mi Tienda"}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  <Building2 className="w-3 h-3" />
                  {currentArchetypeLabel}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {currentBiz?.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {currentBiz.city}
                  </span>
                )}
                {currentBiz?.currency && (
                  <span className="inline-flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" />
                    Moneda: <strong className="text-gray-700 dark:text-gray-300">{currentBiz.currency}</strong>
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Contenedor Aislado & Agnostico
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Módulos Instalados</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {activeModules.length}{" "}
                <span className="text-xs font-normal text-gray-400">de {AVAILABLE_MODULES.length}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Banner de Estado del Contenedor */}
      {activeModules.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 rounded-xl bg-brand-500/10 p-3 text-brand-600 dark:text-brand-400 flex-none">
              <Store className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Tu tienda está lista
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
                Esta tienda es un contenedor limpio e independiente. Agrega las capacidades que necesita tu negocio
                desde el catálogo de módulos a continuación para habilitar flujos de trabajo operativos.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-none" />
              <p className="text-sm text-emerald-900 dark:text-emerald-200">
                Tienes <strong>{activeModules.length} módulo(s)</strong> activos en este espacio. Puedes activar o
                desactivar módulos en cualquier momento según la evolución de tu negocio.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Catálogo de Módulos Plug-and-Play */}
      <div>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Catálogo de Módulos Plug & Play
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Activa o desactiva módulos de forma independiente para este negocio.
            </p>
          </div>
        </div>

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
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${mod.badgeColor}`}
                    >
                      {mod.badge}
                    </span>
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
                    onClick={() => currentBiz && toggleModule(currentBiz.id, mod.id)}
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
      </div>
    </div>
  );
};
