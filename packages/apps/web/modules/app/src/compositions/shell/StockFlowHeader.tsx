import React from "react";
import { observer } from "mobx-react-lite";
import { BaseAppHeader, ToggleAppSidebar } from "@/shell";
import { ThemeToggleButton } from "@/shell/header/theme-toggle-button";
import { Breadcrumb, type BreadcrumbItem } from "@/elements/ui/breadcrumb";
import { GlobalSearchButton } from "@/compositions/shared/GlobalSearchButton";
import { SupportButton } from "@/compositions/shared/SupportButton";
import { UserProfileDropdown } from "@/compositions/workspace/UserProfileDropdown";

interface StockFlowHeaderProps {
  breadcrumbItems: BreadcrumbItem[];
  notificationsDropdown: React.ReactNode;
}

/**
 * ⚠️ Aquí vivía una "píldora de rol" con `ChevronDown` que abría el selector de
 * perfil de acceso. Se retiró con el catálogo de roles: hoy hay un único rol
 * (Admin Cliente, §5.3), así que la píldora no tenía nada que ofrecer y el rol
 * ya se muestra en el menú de perfil y en el pie del sidebar.
 */
export const StockFlowHeader = observer(({
  breadcrumbItems,
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

        <SupportButton />

        {notificationsDropdown}

        <ThemeToggleButton />

        <UserProfileDropdown />
      </div>
    </BaseAppHeader>
  );
});

export default StockFlowHeader;
