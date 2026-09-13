import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness, BusinessInstance } from "../context/BusinessContext";
import { useAuth } from "../auth/AuthContext";
import { BusinessSettingsModal } from "../compositions/workspace/BusinessSettingsModal";
import { UserProfileDropdown } from "../compositions/workspace/UserProfileDropdown";

import { NectoLogo } from "../compositions/shared/NectoLogo";
import { ThemeToggle } from "../compositions/shared/ThemeToggle";
import { GlobalSearchButton } from "../compositions/shared/GlobalSearchButton";
import { GlobalFranchiseOverview } from "../compositions/workspace/GlobalFranchiseOverview";
import { PageMeta } from "@/shell/meta";

export default function WorkspacesPage() {
  const navigate = useNavigate();
  const { businesses, switchBusiness } = useBusiness();
  const { user, signOut } = useAuth();

  const [selectedBusinessForSettings, setSelectedBusinessForSettings] = useState<BusinessInstance | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white antialiased">
      <PageMeta title="Hub de Franquicias & Sucursales — NECTO" description="Gestión global de sucursales y franquicias" />

      {/* Top Header Navigation — TailAdmin / Repo-prueba-master clean navbar */}
      <header className="px-4 sm:px-8 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <NectoLogo size="xs" inline />
        </div>

        {/* Right Controls: Search, Theme Toggle & Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          <GlobalSearchButton />
          <ThemeToggle />
          <UserProfileDropdown />
        </div>
      </header>

      {/* Main Hub Content Area: Unified Franchise & Workspaces Overview */}
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
    </div>
  );
}
