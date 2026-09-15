import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useBusiness } from "../../context/BusinessContext";
import { profileDisplayName, profileInitials } from "../../auth/profile";
import { BusinessIcon } from "./BusinessIcon";
import { AccountSettingsModal } from "./AccountSettingsModal";
import {
  User,
  ChevronDown,
  Building2,
  Layers,
  LogOut,
  Check,
  ChevronRight,
} from "lucide-react";

/** Menu rows share one shape so the list reads as a single system. */
const MENU_ROW =
  "group flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-theme-sm font-semibold text-secondary-600 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800";

export const UserProfileDropdown: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isOnHub = location.pathname === "/workspaces";
  const { user, signOut, profile, roleLabel } = useAuth();
  const {
    businesses,
    activeBusiness,
    switchBusiness,
  } = useBusiness();

  const [isOpen, setIsOpen] = useState(false);
  const [showBranches, setShowBranches] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const username = profile?.email || user?.email || "";
  const displayName = profileDisplayName(profile);
  const avatarUrl = profile?.avatarUrl ?? "";
  const initials = profileInitials(profile);

  /** Avatar con respaldo en iniciales cuando el administrador no tiene foto. */
  const avatar = (sizeClass: string) =>
    avatarUrl ? (
      <img src={avatarUrl} alt={displayName} className={`${sizeClass} object-cover`} />
    ) : (
      <span
        className={`${sizeClass} flex items-center justify-center bg-secondary-600 font-bold text-white`}
      >
        {initials}
      </span>
    );

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowBranches(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Trigger — avatar with the brand's isotype dot */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) setShowBranches(false);
          }}
          aria-label="Perfil de usuario y sucursales"
          aria-expanded={isOpen}
          title="Perfil de usuario y sucursales"
          className="relative flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white p-0.5 shadow-sm transition-transform hover:scale-105 active:scale-95 sm:h-11 sm:w-11 dark:border-gray-800 dark:bg-gray-900"
        >
          <span className="h-full w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            {avatar("h-full w-full rounded-full")}
          </span>
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-accent-300 dark:border-gray-900" />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute right-0 top-full z-50 mt-2.5 w-80 space-y-3 rounded-3xl border border-gray-100 bg-white p-3.5 font-sans shadow-theme-xl animate-in fade-in slide-in-from-top-2 duration-150 sm:w-88 dark:border-gray-800 dark:bg-gray-900">
            {/* Identity */}
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3.5 dark:bg-gray-900">
              <span className="h-12 w-12 flex-none overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                {avatar("h-full w-full rounded-full")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="truncate text-theme-sm font-bold tracking-tight text-secondary-600 dark:text-white">
                    {displayName}
                  </h4>
                  <span
                    className="max-w-[130px] flex-none truncate rounded-full bg-brand-500 px-2 py-0.5 text-theme-xs font-bold text-white"
                    title={`Rol de la cuenta: ${roleLabel}`}
                  >
                    {roleLabel}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-theme-xs text-gray-500 dark:text-gray-400">
                  {username || "Sin correo registrado"}
                </p>
                {!isOnHub && (
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-theme-xs font-bold text-brand-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
                    <span className="truncate">{activeBusiness?.name || "Sucursal Activa"}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Branch switcher — only inside a store view */}
            {!isOnHub && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowBranches(!showBranches)}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-xl p-3 text-left transition-colors ${
                    showBranches
                      ? "bg-brand-50 dark:bg-brand-500/10"
                      : "bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-xl transition-colors ${
                        showBranches
                          ? "bg-brand-500 text-white"
                          : "bg-white text-brand-500 dark:bg-gray-800 dark:text-brand-400"
                      }`}
                    >
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-theme-sm font-bold leading-tight text-secondary-600 dark:text-white">
                          Sucursales y locales
                        </span>
                        <span className="rounded-full bg-brand-500 px-1.5 text-theme-xs font-bold text-white">
                          {businesses.length}
                        </span>
                      </div>
                      <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
                        {showBranches
                          ? "Ocultar selector"
                          : `Actual: ${activeBusiness?.name || "Sin seleccionar"}`}
                      </p>
                    </div>
                  </div>

                  <ChevronDown
                    className={`h-4 w-4 flex-none text-gray-400 transition-transform duration-200 ${
                      showBranches ? "rotate-180 text-brand-500" : ""
                    }`}
                  />
                </button>

                {/* Branch list */}
                {showBranches && (
                  <div className="space-y-1.5 rounded-xl bg-gray-50 p-2 animate-in fade-in slide-in-from-top-1 duration-150 dark:bg-gray-900">
                    <span className="block px-1.5 pt-1 text-theme-xs font-bold text-gray-400 dark:text-gray-500">
                      Sucursales activas ({businesses.length})
                    </span>

                    <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                      {businesses.map(biz => {
                        const isSelected = biz.id === activeBusiness?.id;
                        return (
                          <div
                            key={biz.id}
                            onClick={() => {
                              switchBusiness(biz.id);
                              setShowBranches(false);
                            }}
                            className={`flex cursor-pointer items-center justify-between gap-2.5 rounded-xl p-2 transition-colors ${
                              isSelected
                                ? "bg-brand-50 dark:bg-brand-500/10"
                                : "hover:bg-white dark:hover:bg-gray-800"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div
                                className={`flex h-7 w-7 flex-none items-center justify-center overflow-hidden rounded-lg ${
                                  isSelected
                                    ? "bg-brand-500 text-white"
                                    : "bg-white text-brand-500 dark:bg-gray-800 dark:text-brand-400"
                                }`}
                              >
                                {biz.logoUrl ? (
                                  <img
                                    src={biz.logoUrl}
                                    alt={biz.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <BusinessIcon iconKey={biz.iconKey} className="h-3.5 w-3.5" />
                                )}
                              </div>

                              <div className="min-w-0 text-left">
                                <p
                                  className={`truncate text-theme-xs leading-tight ${
                                    isSelected
                                      ? "font-bold text-secondary-600 dark:text-white"
                                      : "font-medium text-gray-600 dark:text-gray-300"
                                  }`}
                                >
                                  {biz.name}
                                </p>
                                <p className="truncate text-theme-xs text-gray-400 dark:text-gray-500">
                                  {biz.city || "Principal"}
                                </p>
                              </div>
                            </div>

                            {isSelected && (
                              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-500 text-white">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Links */}
            <div className="space-y-0.5 border-t border-gray-100 pt-2 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setIsAccountModalOpen(true);
                  setIsOpen(false);
                }}
                className={MENU_ROW}
              >
                <span className="flex items-center gap-2.5">
                  <User className="h-4 w-4 text-gray-400 transition-colors group-hover:text-brand-500" />
                  <span>Ajustes de perfil</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
              </button>

              {!isOnHub && (
                <button
                  type="button"
                  onClick={() => {
                    navigate("/workspaces");
                    setIsOpen(false);
                  }}
                  className={MENU_ROW}
                >
                  <span className="flex items-center gap-2.5">
                    <Layers className="h-4 w-4 text-gray-400 transition-colors group-hover:text-brand-500" />
                    <span>Dashboard de franquicias</span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  signOut();
                  navigate("/login");
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-theme-sm font-bold text-brand-500 transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Account Settings Modal */}
      <AccountSettingsModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </>
  );
};
