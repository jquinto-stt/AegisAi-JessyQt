import { ReactNode } from "react";
import { observer } from 'mobx-react-lite';
import { uiStore } from "@/stores";
import { SidebarProvider } from "@/shell/sidebar/SidebarContext";

interface BaseAppSidebarProps {
  logo?: ReactNode;
  logoCollapsed?: ReactNode;
  children?: ReactNode;
  /** When true, uses relative positioning instead of fixed (for showcases/embedded use) */
  contained?: boolean;
  /** 
   * Override for collapsed state. When defined (true/false), ignores store state.
   * Use only for showcases/documentation - not for runtime control.
   * @agents Override para showcases - no usar en runtime
   */
  collapsed?: boolean;
}

/**
 * @kgId 4d6227f363fa
 */
export const BaseAppSidebar: React.FC<BaseAppSidebarProps> = observer(({
  logo,
  logoCollapsed,
  children,
  contained = false,
  collapsed,
}) => {
  // If collapsed prop is defined, use it as override; otherwise use store
  const showExpanded = collapsed !== undefined 
    ? !collapsed 
    : uiStore.isSidebarVisible;

  const positionClasses = contained
    ? "relative h-full"
    : `fixed top-0 left-0 h-screen z-50 ${uiStore.sidebarMobileOpen ? "translate-x-0" : "-translate-x-full"} xl:translate-x-0`;

  return (
    <SidebarProvider collapsed={collapsed}>
      <aside
        className={`flex flex-col px-5 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 transition-all duration-300 ease-in-out border-r border-gray-200 
          ${positionClasses}
          ${showExpanded ? "w-[290px]" : "w-[90px]"}`}
        onMouseEnter={() => collapsed === undefined && !uiStore.isDesktopSidebarExpanded && uiStore.setSidebarHovered(true)}
        onMouseLeave={() => collapsed === undefined && uiStore.setSidebarHovered(false)}
      >
        {/* Logo section */}
        <div
          className={`py-8 flex ${
            !showExpanded ? "xl:justify-center" : "justify-start"
          }`}
        >
          {showExpanded ? logo : logoCollapsed}
        </div>

        {/* Content section */}
        <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar flex-1">
          {children}
        </div>
      </aside>
    </SidebarProvider>
  );
});

export default BaseAppSidebar;
