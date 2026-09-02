import React from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness, BusinessInstance, RolePermission } from "../../context/BusinessContext";
import { BusinessIcon } from "./BusinessIcon";
import {
  Shield,
  ShieldCheck,
  Flame,
  ShoppingBag,
  Package,
  Users,
  ArrowRight,
  X,
  Check,
  Crown,
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
    if (roleId === "role-owner") return <Crown className="w-5 h-5" />;
    if (roleId === "role-admin") return <Shield className="w-5 h-5" />;
    if (roleId === "role-cook") return <Flame className="w-5 h-5" />;
    if (roleId === "role-waiter") return <ShoppingBag className="w-5 h-5" />;
    if (roleId === "role-inventory") return <Package className="w-5 h-5" />;
    return <Users className="w-5 h-5" />;
  };

  const getRoleAccent = (roleId: string) => {
    if (roleId === "role-owner")
      return {
        bg: "bg-gradient-to-br from-rose-500 to-orange-500",
        ring: "ring-rose-500/30",
        text: "text-rose-600 dark:text-rose-400",
        lightBg: "bg-rose-50 dark:bg-rose-950/30",
        border: "border-rose-200 dark:border-rose-800/50",
        hoverBorder: "hover:border-rose-400 dark:hover:border-rose-600",
        activeBg: "bg-rose-50 dark:bg-rose-950/20",
      };
    if (roleId === "role-admin")
      return {
        bg: "bg-gradient-to-br from-sky-500 to-blue-600",
        ring: "ring-sky-500/30",
        text: "text-sky-600 dark:text-sky-400",
        lightBg: "bg-sky-50 dark:bg-sky-950/30",
        border: "border-sky-200 dark:border-sky-800/50",
        hoverBorder: "hover:border-sky-400 dark:hover:border-sky-600",
        activeBg: "bg-sky-50 dark:bg-sky-950/20",
      };
    if (roleId === "role-cook")
      return {
        bg: "bg-gradient-to-br from-amber-400 to-orange-500",
        ring: "ring-amber-500/30",
        text: "text-amber-600 dark:text-amber-400",
        lightBg: "bg-amber-50 dark:bg-amber-950/30",
        border: "border-amber-200 dark:border-amber-800/50",
        hoverBorder: "hover:border-amber-400 dark:hover:border-amber-600",
        activeBg: "bg-amber-50 dark:bg-amber-950/20",
      };
    if (roleId === "role-waiter")
      return {
        bg: "bg-gradient-to-br from-emerald-400 to-teal-500",
        ring: "ring-emerald-500/30",
        text: "text-emerald-600 dark:text-emerald-400",
        lightBg: "bg-emerald-50 dark:bg-emerald-950/30",
        border: "border-emerald-200 dark:border-emerald-800/50",
        hoverBorder: "hover:border-emerald-400 dark:hover:border-emerald-600",
        activeBg: "bg-emerald-50 dark:bg-emerald-950/20",
      };
    if (roleId === "role-inventory")
      return {
        bg: "bg-gradient-to-br from-purple-400 to-violet-500",
        ring: "ring-purple-500/30",
        text: "text-purple-600 dark:text-purple-400",
        lightBg: "bg-purple-50 dark:bg-purple-950/30",
        border: "border-purple-200 dark:border-purple-800/50",
        hoverBorder: "hover:border-purple-400 dark:hover:border-purple-600",
        activeBg: "bg-purple-50 dark:bg-purple-950/20",
      };
    return {
      bg: "bg-gradient-to-br from-zinc-400 to-zinc-500",
      ring: "ring-zinc-500/30",
      text: "text-zinc-600 dark:text-zinc-400",
      lightBg: "bg-zinc-50 dark:bg-zinc-900",
      border: "border-zinc-200 dark:border-zinc-700",
      hoverBorder: "hover:border-zinc-400 dark:hover:border-zinc-600",
      activeBg: "bg-zinc-50 dark:bg-zinc-900/50",
    };
  };

  const getPermissionsList = (role: RolePermission) => {
    const perms: string[] = [];
    if (role.permissions.canViewBandeja) perms.push("Órdenes");
    if (role.permissions.canViewKDS) perms.push("KDS Cocina");
    if (role.permissions.canViewCatalogo) perms.push("Catálogo");
    if (role.permissions.canViewInsumos) perms.push("Insumos");
    if (role.permissions.canViewAnalitica) perms.push("Analítica");
    if (role.permissions.canManageRoles) perms.push("Roles");
    return perms;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ animation: "fadeIn 150ms ease-out" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#1C1C1F] rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh]"
        style={{ animation: "slideUp 200ms ease-out" }}
      >
        {/* Compact Header */}
        <div className="px-6 pt-5 pb-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-none shadow-xs overflow-hidden">
            {business.logoUrl ? (
              <img src={business.logoUrl} alt={business.name} className="w-full h-full object-cover" />
            ) : (
              <BusinessIcon iconKey={business.iconKey} className="w-5 h-5 text-[#FF3F1A]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 truncate">
              {business.name}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {business.city} &middot; Select access profile
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Roles Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-5 space-y-2">
          {roles.map((role) => {
            const accent = getRoleAccent(role.id);
            const isOwner = role.id === "role-owner";
            const isActive = role.id === activeRoleId;
            const perms = getPermissionsList(role);

            return (
              <button
                key={role.id}
                type="button"
                onClick={() => handleSelectRole(role)}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer group relative ${
                  isActive
                    ? `${accent.activeBg} ${accent.border} ring-2 ${accent.ring}`
                    : `bg-white dark:bg-zinc-900/50 border-zinc-200/80 dark:border-zinc-800 ${accent.hoverBorder} hover:shadow-md`
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Icon Circle */}
                  <div
                    className={`w-10 h-10 rounded-xl ${accent.bg} text-white flex items-center justify-center flex-none shadow-sm group-hover:scale-105 transition-transform`}
                  >
                    {getRoleIcon(role.id)}
                  </div>

                  {/* Role Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                        {role.name}
                      </span>
                      {isOwner && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gradient-to-r from-rose-500 to-orange-500 text-white">
                          Full Access
                        </span>
                      )}
                      {isActive && (
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${accent.lightBg} ${accent.text}`}>
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                      {role.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-none transition-all ${
                    isActive
                      ? `${accent.bg} text-white`
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                  }`}>
                    {isActive ? <Check className="w-4 h-4" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* Permissions Row */}
                {perms.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2.5 pl-[52px] flex-wrap">
                    {perms.map((perm) => (
                      <span
                        key={perm}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50">
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center">
            You can switch profiles anytime from the top bar
          </p>
        </div>
      </div>

      {/* Inline Keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
