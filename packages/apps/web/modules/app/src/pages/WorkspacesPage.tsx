import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness, BusinessInstance } from "../context/BusinessContext";
import { useAuth } from "../auth/AuthContext";
import { BusinessSettingsModal } from "../compositions/workspace/BusinessSettingsModal";
import { UserProfileDropdown } from "../compositions/workspace/UserProfileDropdown";
import { RoleSelectionModal } from "../compositions/workspace/RoleSelectionModal";
import { Shield, ChevronDown } from "lucide-react";

import { NectoLogo } from "../compositions/shared/NectoLogo";
import { ThemeToggle } from "../compositions/shared/ThemeToggle";
import { GlobalSearchButton } from "../compositions/shared/GlobalSearchButton";
import { GlobalFranchiseOverview } from "../compositions/workspace/GlobalFranchiseOverview";

export default function WorkspacesPage() {
  const navigate = useNavigate();
  const { businesses, switchBusiness, activeBusiness, activeRole } = useBusiness();
  const { user, signOut } = useAuth();

  const [selectedBusinessForSettings, setSelectedBusinessForSettings] = useState<BusinessInstance | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#ECECEC] dark:bg-[#212121] text-[#212121] dark:text-[#ECECEC] flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white antialiased">
      {/* Top Clean Minimal Header */}
      <header className="px-4 sm:px-12 py-3.5 sm:py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-[#2C2D31]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <NectoLogo size="xs" inline />
        </div>

        {/* Right Controls: Search, Theme Toggle & Profile Dropdown (same as Store nav) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <GlobalSearchButton />

          {/* Direct Role Switcher Pill in Top Bar */}
          <button
            type="button"
            onClick={() => setIsRoleModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200/90 dark:border-zinc-700/80 bg-zinc-50/90 dark:bg-zinc-800/90 hover:bg-[#EFE6D3] dark:hover:bg-[#37332A] hover:border-[#FF3F1A] dark:hover:border-[#FF3F1A] transition-all cursor-pointer shadow-2xs group"
            title={`Rol activo: ${activeRole?.name || "Dueño"}. Clic para cambiar de perfil.`}
          >
            <Shield className="w-3.5 h-3.5 text-[#FF3F1A]" />
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 group-hover:text-[#FF3F1A] dark:group-hover:text-[#FF3F1A] truncate max-w-[130px]">
              {activeRole?.name || "Dueño"}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-400 group-hover:text-[#FF3F1A] transition-transform" />
          </button>

          <ThemeToggle />
          <UserProfileDropdown />
        </div>
      </header>

      {/* Main Hub Content Area: Direct Unified Franchise & Workspaces Overview */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 py-6 sm:py-8">
        <GlobalFranchiseOverview />
      </main>

      {/* Business Settings Modal */}
      {selectedBusinessForSettings && (
        <BusinessSettingsModal
          business={selectedBusinessForSettings}
          isOpen={Boolean(selectedBusinessForSettings)}
          onClose={() => setSelectedBusinessForSettings(null)}
        />
      )}

      {/* Role Selection Modal */}
      <RoleSelectionModal
        business={activeBusiness}
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
      />
    </div>
  );
}
