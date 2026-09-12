import React, { useState } from "react";
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
  Activity,
  Check,
  Layers,
  Smartphone,
  AlertCircle,
  Globe,
} from "lucide-react";
import { useBusiness, NectoModuleKey, BusinessInstance } from "../../context/BusinessContext";
import { BusinessIcon } from "./BusinessIcon";
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
    title: "Pedidos",
    category: "Operación & Despacho",
    badge: "Módulo Operativo",
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
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
    badge: "Stock & Kardex",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
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
    badge: "Arqueo & Caja",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
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
  onOpenSettings,
}) => {
  const { activeBusiness, toggleModule } = useBusiness();
  const currentBiz = business || activeBusiness;
  const activeModules = currentBiz?.activeModules || [];
  const [activatingModule, setActivatingModule] = useState<NectoModuleKey | null>(null);

  const isWhatsAppConnected = currentBiz?.channels?.whatsapp ?? true;
  const isWebActive = currentBiz?.channels?.web ?? true;
  const isPosActive = currentBiz?.channels?.pos ?? true;
  const configuredChannelsCount = (isWhatsAppConnected ? 1 : 0) + (isWebActive ? 1 : 0) + (isPosActive ? 1 : 0);
  const totalChannelsCount = 3;

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
                  Contenedor Universal Agnóstico
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

      {/* 2. Diagnóstico de Salud & Preparación de la Tienda (2 Dimensiones Separadas) */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
            <Activity className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>Diagnóstico de Preparación de la Tienda</span>
          </div>
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            Arquitectura Necto · Desacoplamiento de Módulos y Canales
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Capa 1: Contenedor Base */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Capa 1 · Contenedor Base</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                100% Configurado
              </span>
            </div>
            <ul className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
              <li className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>Identidad: {currentBiz?.name || "Tienda"} ({currentBiz?.currency || "COP"})</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>Horarios y zona configurados</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>Roles y permisos activos</span>
              </li>
            </ul>
          </div>

          {/* Capa 2: Módulos / Capacidades (Dimensión Módulos) */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-orange-500" />
                <span>Capa 2 · Módulos</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                {activeModules.length} de {AVAILABLE_MODULES.length} activos
              </span>
            </div>
            {activeModules.length === 0 ? (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                Sin módulos activos. Activa capacidades de negocio según tus requerimientos operativos.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {activeModules.map((m) => (
                  <span
                    key={m}
                    className="px-2 py-0.5 rounded-md bg-orange-500/10 text-[#FF3F1A] text-[10px] font-bold border border-orange-500/20 uppercase font-mono"
                  >
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Capa 3: Canales de Entrada (Dimensión Canales) */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                <span>Capa 3 · Canales</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20">
                {configuredChannelsCount} de {totalChannelsCount} configurados
              </span>
            </div>
            <ul className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
              <li className="flex items-center justify-between gap-1">
                <span>Tienda Web:</span>
                <span className={`font-semibold ${isWebActive ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                  {isWebActive ? "Activa" : "Desactivada"}
                </span>
              </li>
              <li className="flex items-center justify-between gap-1">
                <span>POS / Mostrador:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Habilitado</span>
              </li>
              <li className="flex items-center justify-between gap-1">
                <span>WhatsApp Business:</span>
                <span className={`font-semibold ${isWhatsAppConnected ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                  {isWhatsAppConnected ? "Conectado" : "Desconectado"}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Comunicación Neutral: Pedidos y Canales Desacoplados */}
        {activeModules.includes("pedidos") && (
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-none" />
              <span>
                <strong>Pedidos está activo.</strong> Configura los canales que utilizará este negocio para recibir órdenes (el OMS opera independientemente de los canales externos).
              </span>
            </div>
            <div className="flex items-center gap-2 flex-none">
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                {configuredChannelsCount} de {totalChannelsCount} canales
              </span>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => onOpenSettings("channels")}
                  className="py-1 px-2.5 rounded-lg text-xs font-semibold bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-100 cursor-pointer transition-colors"
                >
                  Configurar en Sede →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

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
      </div>

      {/* 4. Sección Independiente: Canales de Entrada & Puntos de Captura */}
      <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Canales de Entrada
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Puntos de captura agnósticos y desacoplados. Conecta o desconecta canales sin alterar la operación de tus módulos.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-mono font-medium px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {configuredChannelsCount} de {totalChannelsCount} configurados
            </span>
            {onOpenSettings && (
              <button
                type="button"
                onClick={() => onOpenSettings("channels")}
                className="py-1 px-3 rounded-lg text-xs font-semibold bg-brand-50 hover:bg-brand-100 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 border border-brand-200 dark:border-brand-800 cursor-pointer transition-colors"
              >
                Ajustes de Canales en Sede →
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Canal: WhatsApp Business */}
          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      WhatsApp Business
                    </h3>
                    <p className="text-[11px] text-zinc-500">Canal Conversacional</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    isWhatsAppConnected
                      ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                      : "text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  {isWhatsAppConnected ? "Conectado" : "Desconectado"}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Conecta WhatsApp para recibir órdenes y permitir interacción automatizada con clientes.
              </p>
            </div>
            {onOpenSettings && (
              <div className="pt-4 mt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => onOpenSettings("channels")}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isWhatsAppConnected
                      ? "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{isWhatsAppConnected ? "Gestionar Canal →" : "Conectar WhatsApp Business →"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Canal: Tienda Web */}
          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      Tienda Web
                    </h3>
                    <p className="text-[11px] text-zinc-500">Catálogo Digital</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    isWebActive
                      ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                      : "text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  {isWebActive ? "Activa" : "Desactivada"}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Recibe órdenes provenientes del catálogo web y checkout en línea directo.
              </p>
            </div>
            {onOpenSettings && (
              <div className="pt-4 mt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => onOpenSettings("channels")}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Gestionar Canal →</span>
                </button>
              </div>
            )}
          </div>

          {/* Canal: POS / Mostrador */}
          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      POS / Mostrador
                    </h3>
                    <p className="text-[11px] text-zinc-500">Operación Presencial</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    isPosActive
                      ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                      : "text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  {isPosActive ? "Habilitado" : "Deshabilitado"}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Permite registrar órdenes manualmente desde la operación o punto de venta físico en el salón.
              </p>
            </div>
            {onOpenSettings && (
              <div className="pt-4 mt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => onOpenSettings("channels")}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Gestionar Canal →</span>
                </button>
              </div>
            )}
          </div>
        </div>
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
