import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useBusiness } from "../../context/BusinessContext";
import { BusinessIcon } from "./BusinessIcon";
import { AccountSettingsModal } from "./AccountSettingsModal";
import {
  User,
  ChevronDown,
  Building2,
  Layers,
  Settings,
  LogOut,
  Check,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button, Badge } from "@/elements";

export const UserProfileDropdown: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isOnHub = location.pathname === "/workspaces";
  const { user, signOut } = useAuth();
  const {
    businesses,
    activeBusiness,
    switchBusiness,
    userAvatarUrl,
  } = useBusiness();

  const [isOpen, setIsOpen] = useState(false);
  const [showBranches, setShowBranches] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const username = user?.getUsername?.() || "admin@necto.app";
  const displayName = "Administrador Master";

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
        {/* Profile Trigger Button - Circular with Person Photo */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) setShowBranches(false);
          }}
          className="relative flex h-10 w-10 sm:h-11 sm:w-11 aspect-square flex-none items-center justify-center rounded-full border-2 border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-all hover:ring-2 hover:ring-[#FF3F1A]/50 shadow-sm hover:scale-105 active:scale-95 cursor-pointer p-0.5"
          title="Perfil de Usuario y Sucursales"
        >
          <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-zinc-800">
            <img
              src={userAvatarUrl}
              alt={displayName}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#97D6DF] border-2 border-white dark:border-gray-900" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2.5 w-80 sm:w-88 rounded-3xl bg-white dark:bg-[#2C2D31] border border-zinc-200 dark:border-zinc-700 shadow-2xl p-3.5 z-50 animate-scale-up space-y-3 font-sans">
            {/* User Identity Header */}
            <div className="p-3.5 rounded-2xl bg-[#ECECEC]/60 dark:bg-[#212121]/60 border border-zinc-200 dark:border-zinc-700 flex items-center gap-3 shadow-2xs">
              <img
                src={userAvatarUrl}
                alt={displayName}
                className="w-12 h-12 rounded-full object-cover shadow-sm flex-none border-2 border-white dark:border-zinc-700"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-extrabold text-[#212121] dark:text-[#ECECEC] truncate">
                    {displayName}
                  </h4>
                  <span className="text-[9px] py-0.5 px-1.5 font-bold uppercase rounded-md bg-[#190088]/10 text-[#190088] dark:bg-[#190088]/30 dark:text-[#97D6DF] border border-[#190088]/20">
                    Admin
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                  {username}
                </p>
                {!isOnHub && (
                  <p className="text-[10px] font-mono text-[#FF3F1A] font-bold mt-0.5 truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF3F1A] inline-block" />
                    <span>{activeBusiness?.name || "Sucursal Activa"}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Option: Sucursales Activas Card Trigger — only in Store view */}
            {!isOnHub && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowBranches(!showBranches)}
                  className={`w-full p-3 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer group ${
                    showBranches
                      ? "bg-[#190088]/5 dark:bg-[#190088]/20 border-[#190088] text-[#190088] dark:text-[#97D6DF]"
                      : "bg-[#ECECEC]/50 dark:bg-[#212121]/50 hover:bg-[#ECECEC] dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-[#212121] dark:text-[#ECECEC]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#190088] text-white flex items-center justify-center flex-none shadow-2xs">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold leading-tight text-[#212121] dark:text-[#ECECEC]">
                          Sucursales & Locales
                        </span>
                        <span className="text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full bg-[#FF3F1A] text-white">
                          {businesses.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                        {showBranches ? "Ocultar selector" : `Actual: ${activeBusiness?.name || "Sin seleccionar"}`}
                      </p>
                    </div>
                  </div>

                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-transform duration-200 flex-none ${
                      showBranches ? "rotate-180 text-[#190088] dark:text-[#97D6DF]" : ""
                    }`}
                  />
                </button>

                {/* Collapsible Branches List */}
                {showBranches && (
                  <div className="p-2 rounded-2xl bg-[#ECECEC]/60 dark:bg-[#212121]/60 border border-zinc-200 dark:border-zinc-700 space-y-1.5 animate-fade-in">
                    <div className="flex items-center justify-between px-1.5 pt-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                        Sucursales Activas ({businesses.length})
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {businesses.map(biz => {
                        const isSelected = biz.id === activeBusiness?.id;
                        return (
                          <div
                            key={biz.id}
                            onClick={() => {
                              switchBusiness(biz.id);
                              setShowBranches(false);
                            }}
                            className={`p-2 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-white dark:bg-[#2C2D31] text-[#212121] dark:text-[#ECECEC] border-[#FF3F1A] shadow-2xs font-bold"
                                : "bg-white/80 dark:bg-zinc-800/70 hover:bg-white dark:hover:bg-zinc-800 border-zinc-200/60 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-none overflow-hidden ${
                                  isSelected
                                    ? "bg-[#FF3F1A] text-white"
                                    : "bg-[#ECECEC] dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                                }`}
                              >
                                {biz.logoUrl ? (
                                  <img src={biz.logoUrl} alt={biz.name} className="w-full h-full object-cover" />
                                ) : (
                                  <BusinessIcon
                                    iconKey={biz.iconKey}
                                    className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-[#FF3F1A]"}`}
                                  />
                                )}
                              </div>

                              <div className="min-w-0 text-left">
                                <p className="text-xs font-bold truncate leading-tight">
                                  {biz.name}
                                </p>
                                <p className="text-[10px] text-zinc-400 truncate">
                                  {biz.city || "Principal"}
                                </p>
                              </div>
                            </div>

                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-[#97D6DF] text-[#190088] flex items-center justify-center flex-none shadow-2xs font-bold">
                                <Check className="w-3 h-3 stroke-[3]" />
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

            {/* Menu Links */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-700 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setIsAccountModalOpen(true);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-[#212121] dark:text-[#ECECEC] hover:bg-[#ECECEC]/60 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-[#190088] dark:text-[#97D6DF]" />
                  <span>Ajustes de Perfil</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {!isOnHub && (
                <button
                  type="button"
                  onClick={() => {
                    navigate("/workspaces");
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-[#212121] dark:text-[#ECECEC] hover:bg-[#ECECEC]/60 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-[#190088] dark:text-[#97D6DF]" />
                    <span>Dashboard de Franquicias</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  signOut();
                  navigate("/login");
                }}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold text-[#FF3F1A] hover:bg-[#FF3F1A]/10 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-[#FF3F1A]" />
                <span>Cerrar Sesión</span>
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
