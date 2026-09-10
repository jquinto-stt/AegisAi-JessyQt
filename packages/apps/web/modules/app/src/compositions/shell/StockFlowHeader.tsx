import React from "react";
import { observer } from "mobx-react-lite";
import { BaseAppHeader, ToggleAppSidebar } from "@/shell";
import { ThemeToggleButton } from "@/shell/header/theme-toggle-button";
import { Breadcrumb, type BreadcrumbItem } from "@/elements/ui/breadcrumb";
import { GlobalSearchButton } from "@/compositions/shared/GlobalSearchButton";
import { UserProfileDropdown } from "@/compositions/workspace/UserProfileDropdown";
import { Shield, ChevronDown } from "lucide-react";

interface StockFlowHeaderProps {
  breadcrumbItems: BreadcrumbItem[];
  activeRoleName: string;
  onOpenRoleModal: () => void;
  notificationsDropdown: React.ReactNode;
}

export const StockFlowHeader = observer(({
  breadcrumbItems,
  activeRoleName,
  onOpenRoleModal,
  notificationsDropdown,
}: StockFlowHeaderProps) => {
  return (
    <BaseAppHeader
      leftContent={
        <div className="flex items-center gap-3">
          <div className="xl:hidden">
            <ToggleAppSidebar />
          </div>
          <div className="hidden sm:block">
            <Breadcrumb items={breadcrumbItems} separator="chevron" />
          </div>
        </div>
      }
      mobileLogo={
        <img
          src="/images/logo/necto-icon.svg"
          alt="NECTO"
          className="h-7 w-7"
        />
      }
    >
      <div className="flex items-center gap-2 sm:gap-2.5">
        <div className="hidden md:block">
          <GlobalSearchButton />
        </div>

        {/* Role Switcher Pill */}
        <button
          type="button"
          onClick={onOpenRoleModal}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:border-gray-300 dark:hover:border-gray-700 transition-all cursor-pointer shadow-theme-xs group"
          title={`Rol activo: ${activeRoleName}. Clic para cambiar de perfil.`}
        >
          <Shield className="w-3.5 h-3.5 text-brand-500" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white truncate max-w-[130px]">
            {activeRoleName}
          </span>
          <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-transform" />
        </button>

        {notificationsDropdown}

        <ThemeToggleButton />

        <UserProfileDropdown />
      </div>
    </BaseAppHeader>
  );
});

export default StockFlowHeader;
