import React from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness, BusinessInstance, RolePermission } from "../../context/BusinessContext";
import { BusinessIcon } from "./BusinessIcon";
import {
  Shield,
  ShieldCheck,
  Flame,
  ShoppingBag,
  Layers,
  Package,
  BarChart3,
  Users,
  CheckCircle2,
  ArrowRight,
  X,
  Lock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/elements";

interface RoleSelectionModalProps {
  business: BusinessInstance | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  business,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const { roles, switchBusiness, setActiveRoleId, activeRoleId } = useBusiness();

  if (!isOpen || !business) return null;

  const handleSelectRole = (role: RolePermission) => {
    switchBusiness(business.id);
    setActiveRoleId(role.id);
    onClose();

    // Smart routing directly to the role's primary operational workspace
    if (role.id === "role-cook" || (!role.permissions.canViewBandeja && role.permissions.canViewKDS)) {
      navigate("/?section=operacion&tab=preparacion");
    } else if (role.id === "role-inventory" || (!role.permissions.canViewBandeja && role.permissions.canViewInsumos)) {
      navigate("/?section=menu&tab=insumos");
    } else {
      navigate("/?section=operacion&tab=en-vivo");
    }
  };

  const getRoleIcon = (roleId: string) => {
    if (roleId === "role-owner") return <ShieldCheck className="w-4 h-4 text-rose-500" />;
    if (roleId === "role-admin") return <Shield className="w-4 h-4 text-sky-500" />;
    if (roleId === "role-cook") return <Flame className="w-4 h-4 text-amber-500" />;
    if (roleId === "role-waiter") return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
    if (roleId === "role-inventory") return <Package className="w-4 h-4 text-purple-500" />;
    return <Users className="w-4 h-4 text-zinc-500" />;
  };

  const getBadgeStyle = (color: RolePermission["badgeColor"]) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-[#18181B] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-none shadow-2xs overflow-hidden">
              {business.logoUrl ? (
                <img src={business.logoUrl} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <BusinessIcon iconKey={business.iconKey} className="w-6 h-6 text-[#FF3F1A]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Ingreso a Sucursal
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="text-xs font-mono text-zinc-500">{business.city}</span>
              </div>
              <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                {business.name}
              </h3>
            </div>
          </div>

          <Button
            variant="ghost"
            intent="role-select.close"
            onClick={onClose}
            className="w-8 h-8 p-0 rounded-xl text-zinc-400"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Modal Body: Instructions & Role Options */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF3F1A]" />
              Selecciona tu Perfil / Estación de Acceso
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Elige el rol con el que vas a operar. La barra de navegación y las pantallas se adaptarán automáticamente según los permisos de cada estación.
            </p>
          </div>

          {/* Roles Selection Cards */}
          <div className="grid grid-cols-1 gap-3 pt-2">
            {roles.map(role => {
              const isOwner = role.id === "role-owner";
              const isCurrentlyActive = role.id === activeRoleId;
              const permissionsCount = Object.values(role.permissions).filter(Boolean).length;

              return (
                <div
                  key={role.id}
                  onClick={() => handleSelectRole(role)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group hover:shadow-md ${
                    isOwner
                      ? "bg-rose-500/[0.02] dark:bg-rose-500/[0.04] border-rose-500/30 hover:border-rose-500"
                      : "bg-white dark:bg-zinc-900/70 border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center flex-none group-hover:scale-105 transition-transform">
                      {getRoleIcon(role.id)}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="font-bold text-sm text-zinc-950 dark:text-zinc-50 group-hover:text-[#FF3F1A] transition-colors">
                          {role.name}
                        </h5>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeStyle(role.badgeColor)}`}>
                          {isOwner ? "Sin Restricciones" : `${permissionsCount} permisos`}
                        </span>
                        {isCurrentlyActive && (
                          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                            (Sesión anterior)
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {role.description}
                      </p>

                      {/* Permissions Tags */}
                      <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                        {role.permissions.canViewBandeja && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            Bandeja Pedidos
                          </span>
                        )}
                        {role.permissions.canViewKDS && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-100/70 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                            KDS Cocina
                          </span>
                        )}
                        {role.permissions.canViewCatalogo && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            Catálogo
                          </span>
                        )}
                        {role.permissions.canViewInsumos && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            Insumos
                          </span>
                        )}
                        {role.permissions.canViewAnalitica && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-100/70 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300">
                            Finanzas & Métricas
                          </span>
                        )}
                        {role.permissions.canManageRoles && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-100/70 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300">
                            Gestión Roles
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant={isOwner ? "primary" : "outline"}
                    intent="role-select.enter"
                    onClick={e => {
                      e.stopPropagation();
                      handleSelectRole(role);
                    }}
                    className="py-2 px-3.5 text-xs flex-none self-end sm:self-center"
                  >
                    <span>Entrar como {role.name.split("/")[0].trim()}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-xs text-zinc-400">
          <span>Podrás cambiar de rol o simular otra vista en cualquier momento desde la barra superior.</span>
          <Button
            variant="ghost"
            intent="role-select.cancel"
            onClick={onClose}
            className="p-0 font-bold text-zinc-600 dark:text-zinc-300 hover:underline hover:bg-transparent cursor-pointer"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};
