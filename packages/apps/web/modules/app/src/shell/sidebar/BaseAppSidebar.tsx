import { ReactNode, useEffect, useRef, useState } from "react";
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

/** Duración del cambio de tamaño. Al contraer es más corta: cerrar no se espera. */
const MS_EXPANDIR = 340;
const MS_CONTRAER = 280;

/**
 * BaseAppSidebar — Barra lateral unificada con altura completa en ambos modos (expandida y contraída).
 *
 * Permanece anclada en la parte superior con altura completa (calc(100vh - 2rem))
 * y bordes redondeados (rounded-3xl / 24px) tanto expandida como encogida,
 * asegurando una estructura estilizada y homogénea en todo momento.
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

  // Mientras viaja, la barra recorta su contenido; al llegar lo suelta para que
  // los menús flotantes de la píldora puedan salir de ella.
  const [viajando, setViajando] = useState(false);
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    setViajando(true);
    const t = setTimeout(() => setViajando(false), showExpanded ? MS_EXPANDIR : MS_CONTRAER);
    return () => clearTimeout(t);
  }, [showExpanded]);

  // Sin transición en la carga: la página no debe animarse al abrir.
  const [animable, setAnimable] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setAnimable(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const duracion = showExpanded ? MS_EXPANDIR : MS_CONTRAER;
  const geometria: React.CSSProperties = contained
    ? {}
    : { top: 16, height: "calc(100vh - 2rem)", borderRadius: 24 };

  const positionClasses = contained
    ? "relative h-full"
    : `fixed left-4 z-50 max-h-[calc(100vh-2rem)] ${uiStore.sidebarMobileOpen ? "translate-x-0" : "-translate-x-[120%]"} xl:translate-x-0`;

  return (
    <SidebarProvider collapsed={collapsed}>
      <aside
        style={{
          ...geometria,
          transitionDuration: `${duracion}ms`,
        }}
        className={`barra-lateral flex flex-col border border-gray-200/80 bg-white dark:border-white/10 dark:bg-gray-900 text-gray-900
          ${animable ? "transition-[width,padding,translate] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none" : ""}
          ${positionClasses}
          ${viajando ? "overflow-hidden" : ""}
          ${showExpanded ? "w-[274px] px-5 py-0" : "w-[54px] px-1.5 py-3"}`}
      >
        <div className="flex flex-col h-full flex-1 justify-between min-h-0">
          {/* Logo section */}
          <div
            className={`flex shrink-0 ${
              showExpanded ? "py-8 justify-start" : "pb-3 pt-1 justify-center"
            }`}
          >
            <div key={showExpanded ? "expandido" : "colapsado"} className="barra-lateral__entrada">
              {showExpanded ? logo : logoCollapsed}
            </div>
          </div>

          {/* Content section */}
          <div
            key={showExpanded ? "expandido" : "colapsado"}
            className="barra-lateral__entrada flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar"
          >
            {children}
          </div>
        </div>
      </aside>
    </SidebarProvider>
  );
});

export default BaseAppSidebar;
