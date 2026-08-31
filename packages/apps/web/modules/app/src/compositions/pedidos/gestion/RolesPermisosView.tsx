import React, { useState } from "react";
import { useBusiness, RolePermission, RolePermissions } from "@/context/BusinessContext";
import {
  Shield,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  Lock,
  Flame,
  ShoppingBag,
  Layers,
  Package,
  BarChart3,
  History,
  Zap,
  Users,
  Settings,
  X,
  Sparkles,
  ChevronRight,
  Info,
} from "lucide-react";
import { Button, Field, Select, Badge } from "@/elements";

export const RolesPermisosView: React.FC = () => {
  const {
    roles,
    activeRoleId,
    setActiveRoleId,
    createRole,
    updateRole,
    deleteRole,
  } = useBusiness();

  const [selectedRoleForDetail, setSelectedRoleForDetail] = useState<string>(activeRoleId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RolePermission | null>(null);

  // Form State for modal
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formColor, setFormColor] = useState<"rose" | "blue" | "amber" | "emerald" | "purple" | "zinc">("blue");
  const [formPermissions, setFormPermissions] = useState<RolePermissions>({
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
  });

  const selectedRole = roles.find(r => r.id === selectedRoleForDetail) || roles[0];

  const handleOpenCreate = () => {
    setEditingRole(null);
    setFormName("");
    setFormDesc("");
    setFormColor("blue");
    setFormPermissions({
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
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: RolePermission) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDesc(role.description);
    setFormColor(role.badgeColor);
    setFormPermissions({ ...role.permissions });
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingRole) {
      updateRole(editingRole.id, {
        name: formName.trim(),
        description: formDesc.trim(),
        badgeColor: formColor,
        permissions: formPermissions,
      });
    } else {
      const created = createRole({
        name: formName.trim(),
        description: formDesc.trim() || "Rol personalizado de la tienda",
        badgeColor: formColor,
        permissions: formPermissions,
      });
      setSelectedRoleForDetail(created.id);
    }
    setIsModalOpen(false);
  };

  const togglePermission = (key: keyof RolePermissions) => {
    setFormPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const applyPreset = (presetKey: "cook" | "waiter" | "admin" | "inventory") => {
    if (presetKey === "cook") {
      setFormPermissions({
        canViewBandeja: false,
        canCreateOrders: false,
        canViewKDS: true,
        canDispatchKDS: true,
        canViewCatalogo: false,
        canEditCatalogo: false,
        canViewInsumos: false,
        canEditInsumos: false,
        canViewAnalitica: false,
        canViewHistorial: false,
        canViewAutomatizaciones: false,
        canViewTurnos: false,
        canManageRoles: false,
      });
    } else if (presetKey === "waiter") {
      setFormPermissions({
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
      });
    } else if (presetKey === "admin") {
      setFormPermissions({
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
      });

    } else if (presetKey === "inventory") {
      setFormPermissions({
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
      });
    }
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

  const permissionGroups = [
    {
      group: "1. Operación en Vivo & Cocina",
      icon: <Flame className="w-4 h-4 text-orange-500" />,
      items: [
        {
          key: "canViewBandeja" as keyof RolePermissions,
          label: "Bandeja Unificada de Pedidos",
          desc: "Ver tablero omnicanal de comandas por WhatsApp, Web y POS.",
        },
        {
          key: "canCreateOrders" as keyof RolePermissions,
          label: "Crear Pedidos Manuales / POS",
          desc: "Ingresar nuevas comandas de salón o mostrador directamente.",
        },
        {
          key: "canViewKDS" as keyof RolePermissions,
          label: "Pantalla KDS Cocina & Tiempos",
          desc: "Visualizar tickets de cocina con cronómetros y turnos.",
        },
        {
          key: "canDispatchKDS" as keyof RolePermissions,
          label: "Despachar y Marcar Preparado en KDS",
          desc: "Completar la preparación y enviar la orden a entrega.",
        },
      ],
    },
    {
      group: "2. Menú & Abastecimiento",
      icon: <Layers className="w-4 h-4 text-amber-500" />,
      items: [
        {
          key: "canViewCatalogo" as keyof RolePermissions,
          label: "Ver Catálogo de Platos",
          desc: "Consultar cartas, fotos, precios y modificadores.",
        },
        {
          key: "canEditCatalogo" as keyof RolePermissions,
          label: "Editar Platos & Precios",
          desc: "Modificar recetas, crear ítems y ajustar valores de venta.",
        },
        {
          key: "canViewInsumos" as keyof RolePermissions,
          label: "Ver Insumos & Stock (Escandallos)",
          desc: "Revisar materias primas, unidades y mermas.",
        },
        {
          key: "canEditInsumos" as keyof RolePermissions,
          label: "Modificar Stock y Registrar Compras",
          desc: "Actualizar inventario físico y costes de insumos.",
        },
      ],
    },
    {
      group: "3. Finanzas & Analítica",
      icon: <BarChart3 className="w-4 h-4 text-violet-500" />,
      items: [
        {
          key: "canViewAnalitica" as keyof RolePermissions,
          label: "Dashboard Ejecutivo & Métricas Financieras",
          desc: "Facturación total, ticket promedio, margen y horas pico.",
        },
        {
          key: "canViewHistorial" as keyof RolePermissions,
          label: "Historial de Ventas & Facturas",
          desc: "Auditoría de tickets cerrados y trazabilidad de pagos.",
        },
      ],
    },
    {
      group: "4. Configuración & Seguridad",
      icon: <Settings className="w-4 h-4 text-zinc-500" />,
      items: [
        {
          key: "canViewAutomatizaciones" as keyof RolePermissions,
          label: "Automatizaciones & WhatsApp IA",
          desc: "Reglas de auto-confirmación e inteligencia artificial.",
        },
        {
          key: "canViewTurnos" as keyof RolePermissions,
          label: "Turnos y Capacidad de Cocina",
          desc: "Planificación de turnos de personal y buffers de tiempo.",
        },
        {
          key: "canManageRoles" as keyof RolePermissions,
          label: "Gestión y Creación de Roles",
          desc: "Crear, editar y asignar niveles de acceso del equipo.",
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-[#FF3F1A]/10 text-[#FF3F1A] border border-[#FF3F1A]/20">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-zinc-50 tracking-tight">
                Control de Roles & Permisos
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl">
              Define qué puede ver y editar cada integrante del equipo (Cocineros, Meseros, Administradores o perfiles personalizados). Los cambios se aplican en tiempo real en toda la tienda.
            </p>
          </div>

          <Button
            variant="primary"
            intent="roles.create.open"
            onClick={handleOpenCreate}
            className="py-2.5 px-4 rounded-2xl text-xs flex-none self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nuevo Rol</span>
          </Button>
        </div>

        {/* Role Simulator Bar */}
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60">
            <div className="flex items-center gap-2 text-xs">
              <Eye className="w-4 h-4 text-[#FF3F1A]" />
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                Simulador de Vista Activa:
              </span>
              <span className="text-zinc-500 hidden md:inline">
                (Elige un rol para navegar la app exactamente como lo vería ese usuario)
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {roles.map(role => (
                <Button
                  key={role.id}
                  variant="ghost"
                  intent="roles.sim.select"
                  onClick={() => setActiveRoleId(role.id)}
                  className={`p-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 flex-none border ${
                    activeRoleId === role.id
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-2xs scale-102"
                      : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${role.badgeColor === "rose" ? "bg-rose-500" : role.badgeColor === "amber" ? "bg-amber-500" : role.badgeColor === "emerald" ? "bg-emerald-500" : "bg-sky-500"}`} />
                  <span>{role.name}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Roles List (Left) & Permissions Detail (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Roles Cards */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
              Roles Configurados ({roles.length})
            </span>
          </div>

          <div className="space-y-3">
            {roles.map(role => {
              const isSelected = selectedRole.id === role.id;
              const isActiveSim = activeRoleId === role.id;
              const activeCount = Object.values(role.permissions).filter(Boolean).length;

              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRoleForDetail(role.id)}
                  className={`p-4 rounded-3xl border transition-all duration-200 cursor-pointer shadow-2xs space-y-3 ${
                    isSelected
                      ? "bg-white dark:bg-[#18181B] border-zinc-400 dark:border-zinc-600 ring-2 ring-[#FF3F1A]/20"
                      : "bg-white/70 dark:bg-[#18181B]/70 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-zinc-950 dark:text-zinc-50">
                          {role.name}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClasses(
                            role.badgeColor
                          )}`}
                        >
                          {role.isSystem ? "Estándar" : "Personalizado"}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {role.description}
                      </p>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 text-zinc-400 transition-transform flex-none ${
                        isSelected ? "rotate-90 text-[#FF3F1A]" : ""
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                    <span className="font-mono text-[11px] text-zinc-400">
                      {activeCount} de 13 permisos
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isActiveSim && (
                        <Badge variant="success" intent="roles.active-sim" className="rounded-md normal-case">
                          Activo en Pantalla
                        </Badge>
                      )}

                      <Button
                        variant="ghost"
                        intent="roles.card.edit"
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenEdit(role);
                        }}
                        className="p-0 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        title="Editar permisos"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>

                      {!role.isSystem && (
                        <Button
                          variant="ghost"
                          intent="roles.card.delete"
                          onClick={e => {
                            e.stopPropagation();
                            if (confirm(`¿Eliminar el rol "${role.name}"?`)) {
                              deleteRole(role.id);
                            }
                          }}
                          className="p-0 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-500 transition-colors"
                          title="Eliminar rol"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Role Permissions Matrix View */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                    Matriz de Permisos: {selectedRole.name}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClasses(
                      selectedRole.badgeColor
                    )}`}
                  >
                    {selectedRole.badgeColor.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  {selectedRole.description}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-none">
                <Button
                  variant="outline"
                  intent="roles.edit.open"
                  onClick={() => handleOpenEdit(selectedRole)}
                  className="py-2 px-3 bg-zinc-50 dark:bg-zinc-800 text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Modificar Permisos</span>
                </Button>
              </div>
            </div>

            {/* Permissions list grouped by category */}
            <div className="space-y-5">
              {permissionGroups.map((grp, gIdx) => (
                <div key={gIdx} className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {grp.icon}
                    <span>{grp.group}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {grp.items.map(item => {
                      const hasAccess = !!selectedRole.permissions[item.key];

                      return (
                        <div
                          key={item.key}
                          className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-2 ${
                            hasAccess
                              ? "bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05] border-emerald-500/20 text-zinc-900 dark:text-zinc-100"
                              : "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200/50 dark:border-zinc-800/50 text-zinc-400 opacity-60"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <h5 className="font-bold text-xs">
                              {item.label}
                            </h5>
                            <p className="text-[11px] text-zinc-500 leading-snug">
                              {item.desc}
                            </p>
                          </div>

                          <span className="flex-none pt-0.5">
                            {hasAccess ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                            )}
                          </span>
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

      {/* Modal: Create / Edit Role */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-[#18181B] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#FF3F1A]/10 text-[#FF3F1A] flex items-center justify-center border border-[#FF3F1A]/20">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-950 dark:text-zinc-50">
                    {editingRole ? `Editar Rol: ${editingRole.name}` : "Crear Nuevo Rol de Tienda"}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Configura el nombre y activa o desactiva accesos granulares.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                intent="roles.form.close"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 p-0 rounded-xl text-zinc-400"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModal} className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Presets Bar */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Plantillas Rápidas (Cargar permisos predeterminados):
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    intent="roles.preset.admin"
                    onClick={() => applyPreset("admin")}
                    className="p-0 py-1 px-2.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-bold hover:bg-sky-500/20 cursor-pointer"
                  >
                    Plantilla Administrador
                  </Button>
                  <Button
                    variant="ghost"
                    intent="roles.preset.cook"
                    onClick={() => applyPreset("cook")}
                    className="p-0 py-1 px-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/20 cursor-pointer"
                  >
                    Plantilla Cocinero KDS
                  </Button>
                  <Button
                    variant="ghost"
                    intent="roles.preset.waiter"
                    onClick={() => applyPreset("waiter")}
                    className="p-0 py-1 px-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 cursor-pointer"
                  >
                    Plantilla Mesero / Cajero
                  </Button>
                  <Button
                    variant="ghost"
                    intent="roles.preset.inventory"
                    onClick={() => applyPreset("inventory")}
                    className="p-0 py-1 px-2.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold hover:bg-purple-500/20 cursor-pointer"
                  >
                    Plantilla Insumos & Stock
                  </Button>
                </div>
              </div>



              {/* Name & Color */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field
                  label="Nombre del Rol"
                  labelStyle="bold"
                  intent="roles.form.name"
                  className="sm:col-span-2"
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ej. Repartidor / Delivery, Auditor, Jefe de Barra"
                />

                <Select
                  label="Color de Distintivo"
                  intent="roles.form.color"
                  value={formColor}
                  onChange={e => setFormColor(e.target.value as any)}
                  options={[
                    { value: "rose", label: "Rosa / Flame" },
                    { value: "blue", label: "Azul / Sky" },
                    { value: "amber", label: "Ámbar / Cocina" },
                    { value: "emerald", label: "Esmeralda / Caja" },
                    { value: "purple", label: "Púrpura / Stock" },
                    { value: "zinc", label: "Gris / Estándar" },
                  ]}
                />
              </div>

              {/* Description */}
              <Field
                label="Descripción del Puesto"
                labelStyle="bold"
                intent="roles.form.description"
                type="text"
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                placeholder="Ej. Personal encargado del empaque y despacho de pedidos rápidos"
              />

              {/* Granular Permission Toggles */}
              <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                  Permisos de Acceso al Sistema:
                </span>

                {permissionGroups.map((grp, gIdx) => (
                  <div key={gIdx} className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {grp.icon}
                      <span>{grp.group}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {grp.items.map(item => {
                        const isChecked = !!formPermissions[item.key];
                        return (
                          <div
                            key={item.key}
                            onClick={() => togglePermission(item.key)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-2 select-none ${
                              isChecked
                                ? "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] border-emerald-500/30 text-zinc-950 dark:text-zinc-50"
                                : "bg-zinc-50/70 dark:bg-zinc-900/50 border-zinc-200/60 dark:border-zinc-800/60 text-zinc-500 hover:border-zinc-300"
                            }`}
                          >
                            <div className="space-y-0.5">
                              <h5 className="font-bold text-xs flex items-center gap-1.5">
                                {item.label}
                              </h5>
                              <p className="text-[11px] text-zinc-400 leading-snug">
                                {item.desc}
                              </p>
                            </div>

                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center flex-none transition-all ${
                                isChecked
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                              }`}
                            >
                              {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
                <Button
                  variant="outline"
                  intent="roles.form.cancel"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 px-4 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  intent="roles.form.submit"
                  className="py-2.5 px-5 text-xs"
                >
                  {editingRole ? "Guardar Cambios" : "Crear Rol"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
