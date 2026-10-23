import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
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

/** Ancho de la píldora contraída. El radio es la mitad: así queda redonda sin usar 9999px. */
const ANCHO_CONTRAIDA = 54;

/**
 * @kgId 4d6227f363fa
 *
 * ── Cómo se anima el cambio entre expandida y contraída ─────────────────────
 *
 * Expandida es una tarjeta de alto completo pegada arriba; contraída es una
 * píldora centrada en vertical con el alto de su contenido. Antes el alto era
 * `auto` (no se puede interpolar) y la píldora se centraba con
 * `top-1/2 -translate-y-1/2`: al cambiar, alto y posición saltaban de golpe
 * mientras solo el ancho se animaba, y el menú nuevo aparecía entero dentro de
 * una barra de 54 px, desbordándola.
 *
 * Ahora la geometría es explícita en ambos estados —alto medido de la píldora,
 * `top` calculado para centrarla— y ancho, alto, posición y radio viajan juntos
 * con la misma curva. Mientras dura el viaje la barra recorta lo que sobra, y
 * el contenido nuevo entra con un fundido que espera a que haya espacio.
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

  // Alto natural de la píldora contraída: logo + iconos + su relleno.
  const medidor = useRef<HTMLDivElement>(null);
  const [altoContraida, setAltoContraida] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (showExpanded || !medidor.current) return;
    const medir = () => {
      // 24 de `py-3` + 2 del borde.
      if (medidor.current) setAltoContraida(medidor.current.offsetHeight + 26);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(medidor.current);
    return () => ro.disconnect();
  }, [showExpanded]);

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
  const expandida: React.CSSProperties = { top: 16, height: "calc(100vh - 2rem)", borderRadius: 24 };
  // Si aún no se conoce el alto de la píldora, el primer cuadro conserva la
  // geometría expandida; al medir, la transición parte desde ahí.
  const geometria: React.CSSProperties = contained
    ? {}
    : showExpanded || !altoContraida
      ? { ...expandida, ...(showExpanded ? {} : { borderRadius: ANCHO_CONTRAIDA / 2 }) }
      : { top: `calc(50vh - ${altoContraida / 2}px)`, height: altoContraida, borderRadius: ANCHO_CONTRAIDA / 2 };

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
          ${animable ? "transition-[width,height,top,border-radius,padding,translate] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none" : ""}
          ${positionClasses}
          ${viajando ? "overflow-hidden" : ""}
          ${showExpanded ? "w-[274px] px-5" : "w-[54px] px-1.5 py-3"}`}
      >
        <div ref={medidor} className={showExpanded ? "contents" : "flex flex-col"}>
          {/* Logo section */}
          <div
            className={`flex shrink-0 ${
              showExpanded ? "py-8 justify-start" : "pb-2 pt-1 justify-center"
            }`}
          >
            <div key={showExpanded ? "expandido" : "colapsado"} className="barra-lateral__entrada">
              {showExpanded ? logo : logoCollapsed}
            </div>
          </div>

          {/* Content section */}
          <div
            key={showExpanded ? "expandido" : "colapsado"}
            className={`barra-lateral__entrada flex flex-col no-scrollbar ${
              showExpanded ? "flex-1 overflow-y-auto" : "flex-initial"
            }`}
          >
            {children}
          </div>
        </div>
      </aside>
    </SidebarProvider>
  );
});

export default BaseAppSidebar;
