import React from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness, BusinessInstance, RolePermission } from "../../context/BusinessContext";
import { BusinessIcon } from "./BusinessIcon";
import {
  Shield,
  Flame,
  ShoppingBag,
  Package,
  Users,
  ArrowRight,
  X,
  Check,
  Crown,
  Calendar,
} from "lucide-react";

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

  const isFood = business.businessType === "restaurant_virtual";

  const handleSelectRole = (role: RolePermission) => {
    switchBusiness(business.id);
    setActiveRoleId(role.id);
    onClose();

    // Smart routing directly to the role's primary operational workspace
    if (role.id === "role-cook" || role.id === "role-fulfillment" || (!role.permissions.canViewBandeja && role.permissions.canViewKDS)) {
      navigate("/app?section=operacion&tab=preparacion");
    } else if (role.id === "role-inventory" || (!role.permissions.canViewBandeja && role.permissions.canViewInsumos)) {
      navigate("/app?section=menu&tab=insumos");
    } else {
      navigate("/app?section=operacion&tab=en-vivo");
    }
  };

  const getRoleIcon = (roleId: string) => {
    if (roleId === "role-owner") return <Crown className="w-5 h-5" />;
    if (roleId === "role-admin") return <Shield className="w-5 h-5" />;
    if (roleId === "role-sales" || roleId === "role-waiter") return <ShoppingBag className="w-5 h-5" />;
    if (roleId === "role-fulfillment" || roleId === "role-inventory") return <Package className="w-5 h-5" />;
    if (roleId === "role-cook") return <Flame className="w-5 h-5" />;
    if (roleId === "role-receptionist") return <Calendar className="w-5 h-5" />;
    return <Users className="w-5 h-5" />;
  };

  const getPermissionsList = (role: RolePermission) => {
    const perms: string[] = [];
    if (role.permissions.canViewBandeja) perms.push("Órdenes / Chat");
    if (role.permissions.canViewKDS) perms.push(isFood ? "KDS Cocina" : "Despacho & Picking");
    if (role.permissions.canViewCatalogo) perms.push(isFood ? "Platos" : "Catálogo");
    if (role.permissions.canViewInsumos) perms.push(isFood ? "Recetas" : "Kardex & Stock");
    if (role.permissions.canViewAnalitica) perms.push("Finanzas");
    if (role.permissions.canManageRoles) perms.push("Roles");
    return perms;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
        role="presentation"
      />

      {/* Modal */}
      <div className="relative flex max-h-[86vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:bg-[#1C1C1F]">
        {/* Header */}
        <div className="flex items-center gap-3.5 px-6 pb-4 pt-6">
          <div className="flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-2xl bg-brand-50 dark:bg-brand-500/15">
            {business.logoUrl ? (
              <img src={business.logoUrl} alt={business.name} className="h-full w-full object-cover" />
            ) : (
              <BusinessIcon iconKey={business.iconKey} className="h-5 w-5 text-brand-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              id="role-modal-title"
              className="truncate text-[17px] font-black tracking-tight text-secondary-600 dark:text-white"
            >
              {business.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {business.city} · Selecciona tu perfil de acceso
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Roles */}
        <div className="flex-1 space-y-2 overflow-y-auto px-6 pb-5">
          {roles.map((role) => {
            const isOwner = role.id === "role-owner";
            const isActive = role.id === activeRoleId;
            const perms = getPermissionsList(role);

            return (
              <button
                key={role.id}
                type="button"
                onClick={() => handleSelectRole(role)}
                aria-pressed={isActive}
                className={`group w-full cursor-pointer rounded-2xl p-4 text-left transition-colors ${
                  isActive
                    ? "bg-brand-500"
                    : "bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Icon chip */}
                  <div
                    className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl transition-colors ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-white text-brand-500 shadow-xs dark:bg-gray-800 dark:text-brand-400"
                    }`}
                  >
                    {getRoleIcon(role.id)}
                  </div>

                  {/* Role info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-bold ${
                          isActive ? "text-white" : "text-secondary-600 dark:text-white"
                        }`}
                      >
                        {role.name}
                      </span>
                      {isOwner && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isActive ? "bg-white/20 text-white" : "bg-brand-500 text-white"
                          }`}
                        >
                          Acceso total
                        </span>
                      )}
                      {isActive && (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                          Activo
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-0.5 line-clamp-1 text-xs ${
                        isActive ? "text-white/80" : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {role.description}
                    </p>
                  </div>

                  {/* Arrow / check */}
                  <div
                    className={`flex h-8 w-8 flex-none items-center justify-center rounded-full transition-colors ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-gray-200/70 text-gray-500 group-hover:bg-gray-300/70 group-hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:group-hover:bg-gray-700"
                    }`}
                  >
                    {isActive ? <Check className="h-4 w-4" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  </div>
                </div>

                {/* Permissions */}
                {perms.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-[52px]">
                    {perms.slice(0, 3).map((perm) => (
                      <span
                        key={perm}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          isActive
                            ? "bg-white/15 text-white"
                            : "bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {perm}
                      </span>
                    ))}
                    {perms.length > 3 && (
                      <span
                        className={`text-[10px] font-medium ${
                          isActive ? "text-white/70" : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        +{perms.length - 3} más
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-1">
          <p className="text-center text-[11px] text-gray-400 dark:text-gray-500">
            Puedes cambiar de perfil en cualquier momento desde la barra superior
          </p>
        </div>
      </div>
    </div>
  );
};
