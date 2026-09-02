import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness, BusinessInstance } from "../context/BusinessContext";
import { useAuth } from "../auth/AuthContext";
import { BusinessSettingsModal } from "../compositions/workspace/BusinessSettingsModal";
import { AccountSettingsModal } from "../compositions/workspace/AccountSettingsModal";
import { RoleSelectionModal } from "../compositions/workspace/RoleSelectionModal";
import {
  User,
  Settings,
  LogOut,
  ShieldCheck,
  Building2,
  ChevronDown,
} from "lucide-react";

import { NectoLogo } from "../compositions/shared/NectoLogo";
import { ThemeToggle } from "../compositions/shared/ThemeToggle";
import { GlobalSearchButton } from "../compositions/shared/GlobalSearchButton";
import { GlobalFranchiseOverview } from "../compositions/workspace/GlobalFranchiseOverview";
import { Button } from "@/elements";

export default function WorkspacesPage() {
  const navigate = useNavigate();
  const { businesses, switchBusiness } = useBusiness();
  const { user, signOut } = useAuth();

  const [selectedBusinessForSettings, setSelectedBusinessForSettings] = useState<BusinessInstance | null>(null);
  const [roleSelectBiz, setRoleSelectBiz] = useState<BusinessInstance | null>(null);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const username = user?.getUsername?.() || "admin@necto.app";

  return (
    <div className="min-h-screen bg-[#ECECEC] dark:bg-[#212121] text-[#212121] dark:text-[#ECECEC] flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white antialiased">
      {/* Top Clean Minimal Header */}
      <header className="px-4 sm:px-12 py-3.5 sm:py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-[#2C2D31]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <NectoLogo size="xs" inline />
          <span className="hidden sm:inline-block h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF3F1A]/10 text-[#FF3F1A] border border-[#FF3F1A]/20">
            Hub de Franquicias & Sucursales
          </span>
        </div>

        {/* Right Controls: Search, Theme Toggle & Account Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          <GlobalSearchButton />
          <ThemeToggle />

          {/* User Account Avatar & Dropdown Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              intent="workspaces.account.menu"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="p-1 sm:px-2.5 sm:py-1.5 rounded-2xl bg-zinc-100 hover:bg-[#EFE6D3] dark:bg-zinc-800 dark:hover:bg-[#37332A] text-zinc-800 dark:text-zinc-200 hover:text-[#FF3F1A] dark:hover:text-[#FF3F1A] flex items-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-2xs border border-zinc-200/80 dark:border-zinc-700"
            >
              <div className="w-7 h-7 rounded-xl bg-[#190088] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                AD
              </div>
              <span className="hidden md:inline font-bold">Administrador</span>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isUserMenuOpen ? "rotate-180 text-[#FF3F1A]" : ""}`} />
            </Button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-3xl bg-white dark:bg-[#18181B] border border-zinc-200/90 dark:border-zinc-800 shadow-2xl p-3 z-50 animate-fade-in space-y-2">
                {/* User Info Header */}
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-zinc-950 dark:text-white truncate">
                      Administrador Master
                    </p>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5" /> Dueño
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate">{username}</p>
                </div>

                {/* Menu Items */}
                <div className="space-y-1 pt-1">
                  <Button
                    variant="ghost"
                    intent="account.open.settings"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsAccountSettingsOpen(true);
                    }}
                    className="w-full justify-start p-2.5 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-[#EFE6D3] dark:hover:bg-[#37332A] hover:text-[#FF3F1A] dark:hover:text-[#FF3F1A] flex items-center gap-2.5 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-[#FF3F1A]" />
                    <span>Ajustes de Perfil & Cuenta</span>
                  </Button>

                  <Button
                    variant="ghost"
                    intent="account.logout"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      signOut();
                    }}
                    className="w-full justify-start p-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Cerrar Sesión</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Hub Content Area: Direct Unified Franchise & Workspaces Overview */}
      <div className="flex-1 max-w-6xl w-full mx-auto">
        <GlobalFranchiseOverview />
      </div>

      {/* Account Settings Modal */}
      <AccountSettingsModal
        isOpen={isAccountSettingsOpen}
        onClose={() => setIsAccountSettingsOpen(false)}
      />

      {/* Business Settings Modal */}
      {selectedBusinessForSettings && (
        <BusinessSettingsModal
          business={selectedBusinessForSettings}
          isOpen={Boolean(selectedBusinessForSettings)}
          onClose={() => setSelectedBusinessForSettings(null)}
        />
      )}
    </div>
  );
}
