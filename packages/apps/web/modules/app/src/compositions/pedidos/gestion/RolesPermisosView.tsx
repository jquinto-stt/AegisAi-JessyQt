import React, { useState } from "react";
import { useBusiness, RolePermission, RolePermissions } from "@/context/BusinessContext";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  Flame,
  Layers,
  BarChart3,
  Settings,
  X,
  ChevronRight,
  Sparkles,
  Lock,
  Copy,
  Check,
  ChefHat,
  Receipt,
  PackageCheck,
  Truck,
  FileSpreadsheet,
} from "lucide-react";
import { Button, Field, Select, SearchInput } from "@/elements";
import { NectoBanner } from "../shared/NectoBanner";

interface RoleTemplateArchetype {
  id: string;
  name: string;
  roleKey: "admin" | "cook" | "waiter" | "inventory" | "delivery" | "auditor";
  badgeColor: "rose" | "blue" | "amber" | "emerald" | "purple" | "zinc";
  description: string;
  icon: React.ReactNode;
  category: "Dirección" | "Operación Cocina" | "Atención Salón" | "Logística & Stock" | "Auditoría";
  recommendedFor: string;
  privilegeLevel: "Total" | "Operativo Alto" | "Operativo Medio" | "Especializado" | "Lectura";
  permissions: RolePermissions;
}

const ROLE_TEMPLATES: RoleTemplateArchetype[] = [
  {
    id: "tpl-admin",
    name: "Administrador / Gerente General",
    roleKey: "admin",
    badgeColor: "rose",
    icon: <ShieldAlert className="w-4 h-4 text-rose-500" />,
    category: "Dirección",
    recommendedFor: "Propietarios, Socios, Gerentes de Sucursal",
    privilegeLevel: "Total",
    description: "Control absoluto de configuración, facturación, auditoría de personal, recetas y métricas clave.",
    permissions: {
      canViewBandeja: true,
      canCreateOrders: true,
      canViewKDS: true,
      canDispatchKDS: true,
      canViewCatalogo: true,
      canEditCatalogo: true,
      canViewInsumos: true,
      canEditInsumos: true,
      canViewAnalitica: true,
      canViewHistorial: true,
      canViewAutomatizaciones: true,
      canViewTurnos: true,
      canManageRoles: true,
    },
  },
  {
    id: "tpl-cook",
    name: "Jefe de Cocina / KDS Lead",
    roleKey: "cook",
    badgeColor: "amber",
    icon: <ChefHat className="w-4 h-4 text-amber-500" />,
    category: "Operación Cocina",
    recommendedFor: "Cocineros, Jefes de Partida, Encargados de Comanda",
    privilegeLevel: "Operativo Alto",
    description: "Operación directa de tickets KDS, despacho de tiempos, recetas de platos y alertas de insumos.",
    permissions: {
      canViewBandeja: false,
      canCreateOrders: false,
      canViewKDS: true,
      canDispatchKDS: true,
      canViewCatalogo: true,
      canEditCatalogo: false,
      canViewInsumos: true,
      canEditInsumos: false,
      canViewAnalitica: false,
      canViewHistorial: false,
      canViewAutomatizaciones: false,
      canViewTurnos: true,
      canManageRoles: false,
    },
  },
  {
    id: "tpl-waiter",
    name: "Mesero / Cajero de Mostrador",
    roleKey: "waiter",
    badgeColor: "emerald",
    icon: <Receipt className="w-4 h-4 text-emerald-500" />,
    category: "Atención Salón",
    recommendedFor: "Meseros, Cajeros, Operadores de WhatsApp",
    privilegeLevel: "Operativo Medio",
    description: "Toma ágil de comandas en salón, bandeja de pedidos omnicanal, catálogo de precios e historial.",
    permissions: {
      canViewBandeja: true,
      canCreateOrders: true,
      canViewKDS: false,
      canDispatchKDS: false,
      canViewCatalogo: true,
      canEditCatalogo: false,
      canViewInsumos: false,
      canEditInsumos: false,
      canViewAnalitica: false,
      canViewHistorial: true,
      canViewAutomatizaciones: false,
      canViewTurnos: false,
      canManageRoles: false,
    },
  },
  {
    id: "tpl-inventory",
    name: "Auditor de Insumos & Escandallos",
    roleKey: "inventory",
    badgeColor: "purple",
    icon: <PackageCheck className="w-4 h-4 text-purple-500" />,
    category: "Logística & Stock",
    recommendedFor: "Almacenistas, Encargados de Compras, Bodegueros",
    privilegeLevel: "Especializado",
    description: "Gestión de inventario físico, registro de entradas de materia prima, recetas y mermas.",
    permissions: {
      canViewBandeja: false,
      canCreateOrders: false,
      canViewKDS: false,
      canDispatchKDS: false,
      canViewCatalogo: true,
      canEditCatalogo: true,
      canViewInsumos: true,
      canEditInsumos: true,
      canViewAnalitica: false,
      canViewHistorial: false,
      canViewAutomatizaciones: false,
      canViewTurnos: false,
      canManageRoles: false,
    },
  },
  {
    id: "tpl-delivery",
    name: "Coordinador de Despacho / Delivery",
    roleKey: "delivery",
    badgeColor: "blue",
    icon: <Truck className="w-4 h-4 text-sky-500" />,
    category: "Logística & Stock",
    recommendedFor: "Empacadores, Coordinadores de Reparto",
    privilegeLevel: "Operativo Medio",
    description: "Monitoreo de bandeja de salida, estado de pedidos finalizados y trazabilidad de entrega.",
    permissions: {
      canViewBandeja: true,
      canCreateOrders: false,
      canViewKDS: false,
      canDispatchKDS: true,
      canViewCatalogo: false,
      canEditCatalogo: false,
      canViewInsumos: false,
      canEditInsumos: false,
      canViewAnalitica: false,
      canViewHistorial: true,
      canViewAutomatizaciones: false,
      canViewTurnos: false,
      canManageRoles: false,
    },
  },
  {
    id: "tpl-auditor",
    name: "Auditor Contable / Analista Externo",
    roleKey: "auditor",
    badgeColor: "zinc",
    icon: <FileSpreadsheet className="w-4 h-4 text-zinc-400" />,
    category: "Auditoría",
    recommendedFor: "Contadores, Asesores de Franquicia, Analistas",
    privilegeLevel: "Lectura",
    description: "Acceso exclusivo de consulta a métricas de facturación, histórico de tickets y balance de turnos.",
    permissions: {
      canViewBandeja: false,
      canCreateOrders: false,
      canViewKDS: false,
      canDispatchKDS: false,
      canViewCatalogo: true,
      canEditCatalogo: false,
      canViewInsumos: true,
      canEditInsumos: false,
      canViewAnalitica: true,
      canViewHistorial: true,
      canViewAutomatizaciones: false,
      canViewTurnos: true,
      canManageRoles: false,
    },
  },
];

export const RolesPermisosView: React.FC = () => {
  const {
    roles,
    activeRoleId,
    setActiveRoleId,
    createRole,
    updateRole,
    deleteRole,
  } = useBusiness();

  const [selectedRoleId, setSelectedRoleId] = useState<string>(activeRoleId || (roles[0]?.id ?? ""));
  const [searchRoleQuery, setSearchRoleQuery] = useState("");
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState<RolePermission["badgeColor"]>("blue");

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0] || {
    id: "fallback",
    name: "Sin Rol",
    description: "",
    badgeColor: "zinc" as const,
    permissions: {
      canViewBandeja: true,
      canCreateOrders: true,
      canViewKDS: false,
      canDispatchKDS: false,
      canViewCatalogo: true,
      canEditCatalogo: false,
      canViewInsumos: false,
      canEditInsumos: false,
      canViewAnalitica: false,
      canViewHistorial: true,
      canViewAutomatizaciones: false,
      canViewTurnos: false,
      canManageRoles: false,
    },
  };

  // Direct In-Place Permission Toggle
  const handleToggleDirect = (permKey: keyof RolePermissions) => {
    if (!selectedRole || selectedRole.id === "fallback") return;

    const nextPermissions = {
      ...selectedRole.permissions,
      [permKey]: !selectedRole.permissions[permKey],
    };

    updateRole(selectedRole.id, {
      permissions: nextPermissions,
    });
  };

  // Direct In-Place Bulk Set
  const handleBulkSetPermissions = (value: boolean) => {
    if (!selectedRole || selectedRole.id === "fallback") return;

    const nextPermissions: RolePermissions = {
      canViewBandeja: value,
      canCreateOrders: value,
      canViewKDS: value,
      canDispatchKDS: value,
      canViewCatalogo: value,
      canEditCatalogo: value,
      canViewInsumos: value,
      canEditInsumos: value,
      canViewAnalitica: value,
      canViewHistorial: value,
      canViewAutomatizaciones: value,
      canViewTurnos: value,
      canManageRoles: value,
    };

    updateRole(selectedRole.id, {
      permissions: nextPermissions,
    });
  };

  // Direct In-Place Apply Template Archetype
  const handleApplyTemplateDirect = (tpl: RoleTemplateArchetype) => {
    if (!selectedRole || selectedRole.id === "fallback") return;

    updateRole(selectedRole.id, {
      permissions: { ...tpl.permissions },
      badgeColor: tpl.badgeColor,
    });
  };

  const handleDuplicateRole = (role: RolePermission) => {
    const created = createRole({
      name: `${role.name} (Copia)`,
      description: role.description,
      badgeColor: role.badgeColor,
      permissions: { ...role.permissions },
    });
    setSelectedRoleId(created.id);
  };

  const handleCreateNewRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    const created = createRole({
      name: newRoleName.trim(),
      description: "Rol operativo configurado en tiempo real",
      badgeColor: newRoleColor,
      permissions: {
        canViewBandeja: true,
        canCreateOrders: true,
        canViewKDS: false,
        canDispatchKDS: false,
        canViewCatalogo: true,
        canEditCatalogo: false,
        canViewInsumos: false,
        canEditInsumos: false,
        canViewAnalitica: false,
        canViewHistorial: true,
        canViewAutomatizaciones: false,
        canViewTurnos: false,
        canManageRoles: false,
      },
    });

    setSelectedRoleId(created.id);
    setNewRoleName("");
    setIsCreatingInline(false);
  };

  const getBadgeClasses = (color: RolePermission["badgeColor"]) => {
    switch (color) {
      case "rose":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "blue":
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
      case "amber":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "emerald":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "purple":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";
    }
  };

  const getColorDot = (color: RolePermission["badgeColor"]) => {
    switch (color) {
      case "rose":
        return "bg-rose-500 shadow-xs shadow-rose-500/50";
      case "blue":
        return "bg-sky-500 shadow-xs shadow-sky-500/50";
      case "amber":
        return "bg-amber-500 shadow-xs shadow-amber-500/50";
      case "emerald":
        return "bg-emerald-500 shadow-xs shadow-emerald-500/50";
      case "purple":
        return "bg-purple-500 shadow-xs shadow-purple-500/50";
      default:
        return "bg-zinc-400 shadow-xs shadow-zinc-400/50";
    }
  };

  const permissionGroups = [
    {
      group: "1. Operación en Vivo & Cocina",
      code: "OPS",
      icon: <Flame className="w-4 h-4 text-orange-500" />,
      items: [
        {
          key: "canViewBandeja" as keyof RolePermissions,
          label: "Monitor de Órdenes",
          desc: "Acceso omnicanal a comandas por WhatsApp, Web y Mostrador.",
        },
        {
          key: "canCreateOrders" as keyof RolePermissions,
          label: "Creación Manual de Pedidos (POS)",
          desc: "Emisión directa de comandas en salón, mostrador o telefónicas.",
        },
        {
          key: "canViewKDS" as keyof RolePermissions,
          label: "Pantalla KDS Cocina & Cronómetros",
          desc: "Visualización en tiempo real de turnos y colas de cocción.",
        },
        {
          key: "canDispatchKDS" as keyof RolePermissions,
          label: "Despacho & Salida de Cocina",
          desc: "Marcar platos como preparados y enviarlos a la zona de entrega.",
        },
      ],
    },
    {
      group: "2. Menú, Recetas & Insumos",
      code: "CAT",
      icon: <Layers className="w-4 h-4 text-amber-500" />,
      items: [
        {
          key: "canViewCatalogo" as keyof RolePermissions,
          label: "Ver Catálogo de Productos",
          desc: "Consulta de precios de venta, modificadores y fotos de platos.",
        },
        {
          key: "canEditCatalogo" as keyof RolePermissions,
          label: "Edición de Menú & Precios",
          desc: "Creación de productos, actualización de cartas y modificadores.",
        },
        {
          key: "canViewInsumos" as keyof RolePermissions,
          label: "Ver Insumos & Escandallos",
          desc: "Consulta de stock de materias primas, mermas y balance.",
        },
        {
          key: "canEditInsumos" as keyof RolePermissions,
          label: "Ajuste de Stock & Compras",
          desc: "Registro de facturas de proveedores e ingresos de almacén.",
        },
      ],
    },
    {
      group: "3. Finanzas & Auditoría",
      code: "FIN",
      icon: <BarChart3 className="w-4 h-4 text-violet-500" />,
      items: [
        {
          key: "canViewAnalitica" as keyof RolePermissions,
          label: "Métricas Financieras & KPI",
          desc: "Dashboard ejecutivo, ventas totales, ticket medio y margen.",
        },
        {
          key: "canViewHistorial" as keyof RolePermissions,
          label: "Historial de Ventas & Facturación",
          desc: "Trazabilidad de pagos, reimpresión de tickets y auditoría de turnos.",
        },
      ],
    },
    {
      group: "4. Configuración & Seguridad",
      code: "SYS",
      icon: <Settings className="w-4 h-4 text-zinc-400" />,
      items: [
        {
          key: "canViewAutomatizaciones" as keyof RolePermissions,
          label: "IA & Automatizaciones de WhatsApp",
          desc: "Reglas automáticas de respuesta, IA conversacional y plantillas.",
        },
        {
          key: "canViewTurnos" as keyof RolePermissions,
          label: "Gestión de Turnos & Capacidad",
          desc: "Programación de horarios del personal y cuellos de botella.",
        },
        {
          key: "canManageRoles" as keyof RolePermissions,
          label: "Administración de Roles & Permisos",
          desc: "Crear, modificar y asignar jerarquías de seguridad al equipo.",
        },
      ],
    },
  ];

  const filteredRoles = roles.filter(
    r =>
      r.name.toLowerCase().includes(searchRoleQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchRoleQuery.toLowerCase())
  );

  const activeCountSelected = selectedRole ? Object.values(selectedRole.permissions).filter(Boolean).length : 0;
  const privilegePercent = Math.round((activeCountSelected / 13) * 100);

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-7xl mx-auto">
      {/* Top Header Banner */}
      <NectoBanner
        icon={<ShieldCheck className="w-6 h-6 text-[#FF3F1A]" />}
        title="Control de Roles & Permisos Directos"
        description="Seleccioná un rol y ajustá los permisos directamente en vivo sin intermediarios ni ventanas modales extra."
      />

      {/* Simulator & Action Toolbar */}
      <div className="bg-white dark:bg-[#151518] rounded-2xl p-2.5 sm:p-3.5 border border-zinc-200/70 dark:border-zinc-800/80 shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono font-bold uppercase flex-none pr-1">
            <Eye className="w-3.5 h-3.5 text-[#FF3F1A]" />
            <span className="hidden md:inline">Simular:</span>
          </div>
          {roles.map(role => {
            const isActive = activeRoleId === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setActiveRoleId(role.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 flex-none border select-none ${
                  isActive
                    ? "bg-[#190088] text-white border-[#190088] shadow-xs font-bold"
                    : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${getColorDot(role.badgeColor)}`} />
                <span>{role.name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-none">
          {!isCreatingInline ? (
            <Button
              variant="accent"
              intent="roles.create.open"
              onClick={() => setIsCreatingInline(true)}
              className="px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Rol</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              intent="roles.create.cancel"
              onClick={() => setIsCreatingInline(false)}
              className="px-3 py-1.5 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Inline Create Role Form */}
      {isCreatingInline && (
        <form
          onSubmit={handleCreateNewRole}
          className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-fade-in"
        >
          <div className="flex-1">
            <input
              type="text"
              required
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
              placeholder="Nombre del nuevo rol (ej. Jefe de Barra, Delivery Lead)..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#190088]"
            />
          </div>
          <select
            value={newRoleColor}
            onChange={e => setNewRoleColor(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
          >
            <option value="rose">Rosa / Dirección</option>
            <option value="blue">Azul / Logística</option>
            <option value="amber">Ámbar / Cocina</option>
            <option value="emerald">Esmeralda / Salón</option>
            <option value="purple">Púrpura / Stock</option>
            <option value="zinc">Gris / Auditoría</option>
          </select>
          <Button
            type="submit"
            variant="accent"
            intent="roles.create.submit"
            className="py-2 px-4 text-xs font-bold"
          >
            Guardar y Configurar
          </Button>
        </form>
      )}

      {/* Main Unified 1-View Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Roles Selector list */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
              Roles ({roles.length})
            </span>
          </div>

          <SearchInput
            intent="roles.search"
            placeholder="Buscar rol..."
            value={searchRoleQuery}
            onValueChange={setSearchRoleQuery}
            className="w-full text-xs"
          />

          <div className="space-y-2.5">
            {filteredRoles.map(role => {
              const isSelected = selectedRole.id === role.id;
              const activeCount = Object.values(role.permissions).filter(Boolean).length;
              const percent = Math.round((activeCount / 13) * 100);

              // Color based on privilege depth
              const progressColor =
                percent >= 100
                  ? "bg-rose-500"
                  : percent >= 60
                  ? "bg-amber-500"
                  : percent >= 30
                  ? "bg-emerald-500"
                  : "bg-sky-500";

              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs select-none space-y-2.5 ${
                    isSelected
                      ? "bg-white dark:bg-[#18181B] border-[#190088] dark:border-[#190088]/80 ring-1 ring-[#190088]/30 shadow-xs"
                      : "bg-white dark:bg-[#18181B] border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-3 h-3 rounded-full flex-none ${getColorDot(role.badgeColor)}`} />
                      <h4 className="font-bold text-xs sm:text-sm text-[#212121] dark:text-[#ECECEC] truncate">
                        {role.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 flex-none" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleDuplicateRole(role)}
                        className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                        title="Duplicar"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {!role.isSystem && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Eliminar el rol "${role.name}"?`)) {
                              deleteRole(role.id);
                            }
                          }}
                          className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-400 hover:text-rose-600 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* High Visibility Permission Counter Badge & Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-black text-[#212121] dark:text-[#ECECEC] flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20 text-[11px] font-mono font-bold">
                          {activeCount} / 13
                        </span>
                        <span className="text-[11px] text-zinc-500 font-medium">Permisos</span>
                      </span>
                      <span className="font-mono font-bold text-[11px] text-zinc-600 dark:text-zinc-400">
                        {percent}% activo
                      </span>
                    </div>

                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Direct Live Editing Panel */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-6">
            {/* Header with Quick Inline Renaming & Metrics */}
            <div className="space-y-4 pb-5 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1">
                  <span className={`w-3.5 h-3.5 rounded-full flex-none ${getColorDot(selectedRole.badgeColor)}`} />
                  <input
                    type="text"
                    value={selectedRole.name}
                    onChange={e => updateRole(selectedRole.id, { name: e.target.value })}
                    className="text-base sm:text-lg font-bold text-[#212121] dark:text-[#ECECEC] bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-[#190088] dark:focus:border-[#97D6DF] focus:outline-none transition-colors px-1"
                    title="Clic para renombrar"
                  />
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClasses(
                      selectedRole.badgeColor
                    )}`}
                  >
                    {selectedRole.isSystem ? "Rol del Sistema" : "Personalizado"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBulkSetPermissions(true)}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-1 cursor-pointer"
                  >
                    Conceder Todos
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">·</span>
                  <button
                    type="button"
                    onClick={() => handleBulkSetPermissions(false)}
                    className="text-xs font-bold text-rose-500 hover:underline px-2 py-1 cursor-pointer"
                  >
                    Denegar Todos
                  </button>
                </div>
              </div>

              {/* Prominent Permission Summary Banner */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 rounded-xl bg-[#190088] text-white font-mono font-black text-sm flex items-center gap-1.5 shadow-2xs">
                      <span>{activeCountSelected}</span>
                      <span className="text-white/60">/</span>
                      <span className="text-white/60">13</span>
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-[#212121] dark:text-[#ECECEC]">
                        Permisos Concedidos en este Perfil ({privilegePercent}% de Acceso)
                      </h5>
                      <p className="text-[11px] text-zinc-500">
                        {privilegePercent >= 100
                          ? "Este rol tiene control irrestricto sobre todas las áreas."
                          : privilegePercent >= 60
                          ? "Rol con acceso operativo amplio y funciones de despacho/edición."
                          : "Rol restringido con acceso acotado a sus tareas directas."}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex-none self-start sm:self-auto">
                    {privilegePercent >= 100 ? "Nivel: Control Total" : privilegePercent >= 60 ? "Nivel: Operativo Alto" : "Nivel: Acceso Parcial"}
                  </span>
                </div>

                {/* Progress Bar in Details */}
                <div className="w-full bg-zinc-200/80 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#FF3F1A] h-full rounded-full transition-all duration-300"
                    style={{ width: `${privilegePercent}%` }}
                  />
                </div>

                {/* Categorized Count Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50 text-[11px]">
                  {permissionGroups.map(grp => {
                    const groupActive = grp.items.filter(it => !!selectedRole.permissions[it.key]).length;
                    const groupTotal = grp.items.length;
                    const isAll = groupActive === groupTotal;
                    const isNone = groupActive === 0;

                    return (
                      <div
                        key={grp.code}
                        className="p-2 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between"
                      >
                        <span className="text-zinc-500 font-medium truncate">{grp.code}:</span>
                        <span
                          className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] ${
                            isAll
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : isNone
                              ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {groupActive}/{groupTotal}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Template Apply Strip */}
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span className="font-bold flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Cargar Plantilla Prediseñada con 1 Clic:
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                  {ROLE_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyTemplateDirect(tpl)}
                      className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 transition-all flex items-center gap-1.5 flex-none cursor-pointer shadow-2xs"
                    >
                      {tpl.icon}
                      <span>{tpl.name.split("/")[0].trim()}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Granular Permissions Direct Interactive Toggles */}
            <div className="space-y-6">
              {permissionGroups.map((grp, gIdx) => (
                <div key={gIdx} className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800/40">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#212121] dark:text-[#ECECEC]">
                      {grp.icon}
                      <span>{grp.group}</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {grp.code}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {grp.items.map(item => {
                      const isGranted = !!selectedRole.permissions[item.key];

                      return (
                        <div
                          key={item.key}
                          onClick={() => handleToggleDirect(item.key)}
                          className={`p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer flex items-start justify-between gap-3 select-none ${
                            isGranted
                              ? "bg-[#190088]/5 dark:bg-[#190088]/15 border-[#190088]/30 text-[#212121] dark:text-[#ECECEC] shadow-2xs"
                              : "bg-zinc-50/40 dark:bg-zinc-900/20 border-zinc-200/60 dark:border-zinc-800/60 text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <h5 className="font-bold text-xs flex items-center gap-1.5 text-[#212121] dark:text-[#ECECEC]">
                              {item.label}
                            </h5>
                            <p className="text-[11px] text-zinc-400 leading-snug">
                              {item.desc}
                            </p>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center flex-none transition-all mt-0.5 ${
                              isGranted
                                ? "bg-[#190088] border-[#190088] text-white shadow-2xs scale-105"
                                : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                            }`}
                          >
                            {isGranted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
