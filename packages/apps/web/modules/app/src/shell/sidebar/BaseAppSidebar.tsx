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
    : `fixed top-4 left-4 h-[calc(100vh-2rem)] z-50 ${uiStore.sidebarMobileOpen ? "translate-x-0" : "-translate-x-[120%]"} xl:translate-x-0`;

  return (
    <SidebarProvider collapsed={collapsed}>
      <aside
        className={`flex flex-col bg-white dark:bg-gray-900 text-gray-900 transition-all duration-300 ease-in-out shadow-theme-lg ring-1 ring-gray-200/80 dark:ring-white/10 
          ${positionClasses}
          ${showExpanded ? "w-[274px] px-5 rounded-3xl" : "w-[54px] px-1.5 rounded-full"}`}
      >
        {/* Logo section */}
        <div
          className={`flex shrink-0 ${
            showExpanded ? "py-8 justify-start" : "py-4 justify-center"
          }`}
        >
          <div key={showExpanded ? "expandido" : "colapsado"} className="animate-aparecer">
            {showExpanded ? logo : logoCollapsed}
          </div>
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
