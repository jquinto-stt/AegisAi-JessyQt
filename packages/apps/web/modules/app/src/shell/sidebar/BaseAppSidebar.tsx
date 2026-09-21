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
        className={`flex flex-col px-5 bg-white dark:bg-gray-900 text-gray-900 transition-all duration-300 ease-in-out rounded-3xl shadow-theme-lg ring-1 ring-gray-200/80 dark:ring-white/10 
          ${positionClasses}
          ${showExpanded ? "w-[274px]" : "w-[78px]"}`}
        onMouseEnter={() => collapsed === undefined && !uiStore.isDesktopSidebarExpanded && uiStore.setSidebarHovered(true)}
        onMouseLeave={() => collapsed === undefined && uiStore.setSidebarHovered(false)}
      >
        {/* Logo section.
            El `key` es lo que dispara el fundido: al cambiar `showExpanded`,
            React desmonta el bloque y monta uno nuevo, y el nuevo reproduce
            `animate-aparecer`. Sin el `key` reutilizaría el mismo nodo, la clase
            no cambiaría y el logo se sustituiría de golpe — que es justo el
            defecto que se corrige.

            Es un fundido de ENTRADA, no un crossfade, y la diferencia es
            deliberada: un crossfade de verdad exige tener los dos logos montados
            a la vez, y no miden lo mismo (`logo` es un wordmark de `h-5`, 
            `logoCollapsed` un cuadrado de `h-10` con borde). Superponerlos haría
            que el bloque midiera lo que el más grande y la barra daría un salto
            vertical justo cuando se está contrayendo. Con el `key`, la estructura
            del DOM es idéntica a la de antes: un solo hijo, el alto lo sigue
            marcando el logo que toca, y el que llega aparece fundido. */}
        <div
          className={`py-8 flex ${
            !showExpanded ? "xl:justify-center" : "justify-start"
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
