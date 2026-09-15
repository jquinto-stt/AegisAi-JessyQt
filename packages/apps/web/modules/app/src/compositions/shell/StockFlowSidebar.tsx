import { Fragment, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { BaseAppSidebar, MenuItem, useShellConfig } from "@/shell";
import { useSidebarContext } from "@/shell/sidebar/SidebarContext";
import { useAuth } from "@/auth/AuthContext";
import { CLIENT_ADMIN_ROLE_LABEL } from "@/auth/profile";
import { useBusiness } from "@/context/BusinessContext";
import type { NectoModuleKey } from "@/context/BusinessContext";
import { PlugInIcon, InfoIcon, ArrowRightIcon, UserCircleIcon } from "@/icons";
import { PanelLeftClose, SlidersHorizontal, ChevronRight, MessageSquare, Bot, Layers, LifeBuoy, LayoutDashboard, ShoppingBag } from "lucide-react";
import { NectoSidebarWordmark } from "@/compositions/shared/NectoLogo";
import { ORDERS_SECTION_META } from "@/compositions/orders";
import type { OrdersSectionKey } from "@/compositions/orders";
import { uiStore } from "@/stores";


// ═══════════════════════════════════════════════════════════════════════════
// COLLAPSIBLE SECTION HEADER
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = "necto_sidebar_open_sections";

type SectionKey = "conversacional" | "modulos" | "sede";

interface SectionState {
  conversacional: boolean;
  modulos: boolean;
  sede: boolean;
}

const DEFAULT_SECTIONS: SectionState = {
  conversacional: true,
  modulos: true,
  sede: true,
};

function loadSectionState(): SectionState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_SECTIONS, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_SECTIONS };
}

function saveSectionState(state: SectionState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

interface CollapsibleSectionHeaderProps {
  title: string;
  sectionKey: SectionKey;
  isOpen: boolean;
  onToggle: (key: SectionKey) => void;
}

const CollapsibleSectionHeader: React.FC<CollapsibleSectionHeaderProps> = observer(
  ({ title, sectionKey, isOpen, onToggle }) => {
    const { isExpanded: showExpanded } = useSidebarContext();
    const { icons: shellIcons } = useShellConfig();

    if (!showExpanded) {
      return (
        <h2 className="mb-4 text-xs uppercase flex leading-[20px] text-gray-400 xl:justify-center">
          {shellIcons.sectionCollapsed}
        </h2>
      );
    }

    return (
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        className="mb-2 w-full flex items-center justify-between text-xs uppercase leading-[20px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer group px-1 rounded"
        title={isOpen ? `Colapsar ${title}` : `Expandir ${title}`}
      >
        <span className="select-none">{title}</span>
        <ChevronRight
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? "rotate-90" : "rotate-0"
          } opacity-0 group-hover:opacity-100 transition-opacity`}
        />
      </button>
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// LOGO COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const Logo = () => (
  <div className="flex items-center justify-between w-full">
    <button
      type="button"
      onClick={() => uiStore.toggleSidebar()}
      className="flex items-center cursor-pointer group focus:outline-none"
      title="Colapsar barra lateral"
    >
      <NectoSidebarWordmark className="transition-opacity group-hover:opacity-75" />
    </button>
    <button
      type="button"
      onClick={() => uiStore.toggleSidebar()}
      className="hidden xl:flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      title="Colapsar barra lateral"
    >
      <PanelLeftClose className="w-4 h-4" />
    </button>
  </div>
);

const LogoCollapsed = () => (
  <button
    type="button"
    onClick={() => uiStore.toggleSidebar()}
    className="flex items-center justify-center h-10 w-10 rounded-xl border-2 border-brand-500 cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors group focus:outline-none"
    title="Expandir barra lateral"
  >
    <img
      src="/images/logo/necto-icon.svg"
      alt="NECTO"
      className="h-6 w-6 group-hover:scale-105 transition-transform"
    />
  </button>
);

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER — pinned actions (Rol, Sucursales, Ayuda, Cerrar sesión)
// ═══════════════════════════════════════════════════════════════════════════

interface SidebarFooterProps {
  activeRoleName: string;
  onOpenSettingsModal?: (tab?: string) => void;
}

/**
 * Acciones fijas del pie: rol (informativo), Dashboard, Configuración, Ayuda y
 * salir. El rol dejó de ser un botón que abría el selector de perfil de acceso:
 * con un único rol (Admin Cliente, §5.3) no hay nada que elegir.
 */
const SidebarFooter = observer(({ activeRoleName, onOpenSettingsModal }: SidebarFooterProps) => {
  const { isExpanded: showExpanded } = useSidebarContext();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = () => {
    signOut();
    navigate("/login");
  };

  const rowClasses = `menu-item group menu-item-inactive ${
    !showExpanded ? "xl:justify-center" : "xl:justify-start"
  }`;

  return (
    <div className="mt-auto border-t border-gray-200 dark:border-gray-800 pt-4 pb-6">
      <ul className="flex flex-col gap-1">
        <li>
          <button
            type="button"
            onClick={() => navigate("/workspaces")}
            className={rowClasses}
            title="Ir al Dashboard de franquicias y sucursales"
          >
            <span className="menu-item-icon-size menu-item-icon-inactive text-brand-500">
              <Layers className="w-5 h-5" />
            </span>
            {showExpanded && (
              <span className="menu-item-text truncate">
                Dashboard de franquicias
              </span>
            )}
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => (onOpenSettingsModal ? onOpenSettingsModal() : navigate("/workspaces"))}
            className={rowClasses}
            title="Configuración de sede"
          >
            <span className="menu-item-icon-size menu-item-icon-inactive">
              <SlidersHorizontal className="w-5 h-5" />
            </span>
            {showExpanded && <span className="menu-item-text">Configuración</span>}
          </button>
        </li>
        <li>
          {/* Antes salía a `https://necto.app/help`; ahora es la página interna
              `/ayuda`, que se puede leer incluso sin sesión. */}
          <button
            type="button"
            onClick={() => navigate("/ayuda")}
            className={rowClasses}
            title="Centro de ayuda y preguntas frecuentes"
          >
            <span className="menu-item-icon-size menu-item-icon-inactive">
              <InfoIcon />
            </span>
            {showExpanded && <span className="menu-item-text">Ayuda</span>}
          </button>
        </li>
        <li>
          {/* Antes era un `div` sin acción, por la misma razón que la fila de rol:
              no existía canal de soporte al que llevar, y la afordancia de clic
              habría sido una promesa vacía. Ahora sí hay página (`/soporte`), así
              que la fila pasa a `button` —igual que su vecina, que va a `/ayuda`. */}
          <button
            type="button"
            onClick={() => navigate("/soporte")}
            className={rowClasses}
            title="Soporte: canales de contacto y formulario"
          >
            <span className="menu-item-icon-size menu-item-icon-inactive">
              <LifeBuoy className="w-5 h-5" />
            </span>
            {showExpanded && <span className="menu-item-text">Soporte</span>}
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={handleLogout}
            className={`menu-item group text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 cursor-pointer ${
              !showExpanded ? "xl:justify-center" : "xl:justify-start"
            }`}
          >
            <span className="menu-item-icon-size text-error-500">
              <ArrowRightIcon />
            </span>
            {showExpanded && <span className="menu-item-text">Cerrar sesión</span>}
          </button>
        </li>
      </ul>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR CONTENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Los destinos de la sede: lo que la barra lateral puede pedir que se muestre.
 *
 * ⚠️ `dashboard` es la pantalla de la sede y el destino **por defecto**: la
 * tienda existe primero y el Dashboard es su casa. `modules-hub` es el catálogo
 * de módulos, una pantalla **secundaria** que sólo se abre pidiéndola —antes era
 * la única, así que la sede no tenía pantalla propia—. `pedidos` **ya tiene vista**
 * (se registra en `MODULES_WITH_VIEWS`, en `NectoApp`) e `inventarios` sigue sin
 * ella: se conserva como destino para cuando aterrice.
 *
 * El vocabulario es un array `as const` para que el tipo se **derive** de él: el
 * que valida lo que llega por enlace y el que describe el estado no pueden
 * divergir, y un destino nuevo es alcanzable sin tocar el tipo.
 */
export const APP_DESTINATIONS = ["dashboard", "whatsapp", "pedidos", "inventarios", "modules-hub"] as const;

export type AppDestination = (typeof APP_DESTINATIONS)[number];

/**
 * Los módulos acoplados que **tienen pantalla propia** y por tanto se listan en la
 * barra. Es un espejo de `NectoApp.MODULES_WITH_VIEWS`, del lado de la navegación:
 * un módulo sin vista no aparece —un enlace a una pantalla que no existe es peor
 * que su ausencia— y uno nuevo se añade en los dos sitios.
 */
const MODULE_NAV_ENTRIES: {
  key: AppDestination;
  moduleKey: NectoModuleKey;
  label: string;
  icon: React.ReactNode;
}[] = [{ key: "pedidos", moduleKey: "pedidos", label: "Pedidos", icon: <ShoppingBag className="w-4 h-4" /> }];

export interface StockFlowSidebarProps {
  activeModule: AppDestination;
  onNavigateModule: (module: AppDestination) => void;
  onOpenSettingsModal?: (tab?: string) => void;
  activeRoleName?: string;
  /**
   * La sección de Pedidos en la que está el operador.
   *
   * ⚠️ La barra lateral **no conoce el módulo**: no importa su estado ni su
   * vocabulario de secciones, sólo pinta los enlaces que el shell le pasa. Por eso
   * la sección activa entra como dato y los rótulos salen de `ORDERS_SECTION_META`
   * —que es la misma fuente que usa la barra del módulo, así que no pueden
   * discrepar.
   */
  activeOrdersSection?: OrdersSectionKey;
  /** Navega a una sección de Pedidos. */
  onNavigateOrdersSection?: (section: OrdersSectionKey) => void;
}

export const StockFlowSidebar = observer(({
  activeModule,
  onNavigateModule,
  onOpenSettingsModal,
  activeRoleName = CLIENT_ADMIN_ROLE_LABEL,
  activeOrdersSection,
  onNavigateOrdersSection,
}: StockFlowSidebarProps) => {

  // ── Collapsible sections state ──
  const [openSections, setOpenSections] = useState<SectionState>(loadSectionState);

  // ⚠️ Los módulos que la barra lista se **derivan** de `activeModules` de la
  // sede, no de un estado propio: si el módulo se desacopla desde el catálogo, su
  // enlace desaparece sin que nada haya que sincronizar. Y sólo se ofrecen los que
  // tienen vista (`MODULE_NAV_ENTRIES`), porque un enlace a una pantalla
  // inexistente es peor que su ausencia.
  const { activeBusiness } = useBusiness();
  const activeModules = activeBusiness?.activeModules ?? [];
  const moduleEntries = MODULE_NAV_ENTRIES.filter(entry =>
    activeModules.includes(entry.moduleKey)
  );

  /**
   * ⚠️ Con la barra colapsada, un grupo cuyos hijos no se pintan deja su
   * destino inalcanzable (no hay icono que lo represente). Los módulos se
   * listan igualmente en ese estado: es la única vía al módulo que tiene el
   * usuario cuando la barra está estrecha.
   */
  const { isExpanded: sidebarExpanded } = useSidebarContext();

  const toggleSection = useCallback((key: SectionKey) => {
    setOpenSections(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveSectionState(next);
      return next;
    });
  }, []);

  return (
    <BaseAppSidebar logo={<Logo />} logoCollapsed={<LogoCollapsed />}>
      <nav className="flex flex-col flex-1">
        <div className="flex flex-col gap-6">
          {/* SECCIÓN CANAL CONVERSACIONAL — capacidad de la SEDE, no de un módulo */}
          <div>
            <CollapsibleSectionHeader
              title="Canal conversacional"
              sectionKey="conversacional"
              isOpen={openSections.conversacional}
              onToggle={toggleSection}
            />
            {openSections.conversacional && (
              <ul className="flex flex-col gap-1">
                {/* ⚠️ WhatsApp es un **destino de la sede**, no un puente a
                    Ajustes: su chat es una superficie propia del canal. Antes
                    esta sección sólo tenía dos atajos al modal de configuración
                    —Canales de entrada y Asistente— y ningún sitio donde
                    atender las conversaciones. */}
                <MenuItem
                  icon={<MessageSquare className="w-4 h-4" />}
                  name="WhatsApp"
                  active={activeModule === "whatsapp"}
                  onClick={() => onNavigateModule("whatsapp")}
                />
                <MenuItem
                  icon={<PlugInIcon />}
                  name="Canales de entrada"
                  onClick={() => onOpenSettingsModal?.("channels")}
                />
                <MenuItem
                  icon={<Bot className="w-4 h-4" />}
                  name="Asistente de WhatsApp IA"
                  onClick={() => onOpenSettingsModal?.("assistant")}
                />
              </ul>
            )}
          </div>

          {/* SECCIÓN MÓDULOS — sólo los acoplados con pantalla propia.
              ⚠️ Con la barra **colapsada** el grupo no puede quedarse en un
              encabezado mudo: los hijos no se pintan y el módulo quedaría
              inalcanzable. En ese estado se listan los módulos directamente,
              que es la única forma de que sigan siendo accesibles. */}
          {moduleEntries.length > 0 && (
            <div>
              <CollapsibleSectionHeader
                title="Módulos"
                sectionKey="modulos"
                isOpen={openSections.modulos}
                onToggle={toggleSection}
              />
              {(openSections.modulos || !sidebarExpanded) && (
                <ul className="flex flex-col gap-1">
                  {moduleEntries.map(entry => (
                    <Fragment key={entry.key}>
                      <MenuItem
                        icon={entry.icon}
                        name={entry.label}
                        active={activeModule === entry.key}
                        onClick={() => onNavigateModule(entry.key)}
                      />

                      {/* ── Sub-destinos de Pedidos ────────────────────────────
                       *
                       * ⚠️ Sólo con la barra **expandida** y Pedidos abierto. Con
                       * la barra colapsada (78 px) los hijos no se pintan y el
                       * grupo quedaría en un encabezado mudo; además, el acceso
                       * directo al módulo ya está garantizado por el `MenuItem`
                       * padre, que es la vía que el operador conserva siempre.
                       *
                       * ⚠️ Se pintan como hermanos indentados y **no** anidados
                       * dentro del `<li>` de Pedidos: anidarlos haría que el
                       * nombre accesible del elemento padre incluyera los siete
                       * hijos ("Pedidos Bandeja de entrada Mesa de alistamiento…")
                       * y dejaría de ser localizable por su nombre.
                       */}
                      {entry.key === "pedidos" && sidebarExpanded && onNavigateOrdersSection && (
                        <li data-orders-subnav className="flex flex-col gap-0.5 py-0.5 pl-4">
                          {ORDERS_SECTION_META.map(meta => {
                            const isActive =
                              activeModule === "pedidos" && activeOrdersSection === meta.key;
                            return (
                              <button
                                key={meta.key}
                                type="button"
                                onClick={() => onNavigateOrdersSection(meta.key)}
                                aria-current={isActive ? "page" : undefined}
                                data-orders-sidebar-section={meta.key}
                                className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-theme-xs font-medium transition-colors ${
                                  isActive
                                    ? "bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-white"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 flex-none rounded-full ${
                                    isActive ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
                                  }`}
                                  aria-hidden
                                />
                                <span className="truncate">{meta.shortLabel}</span>
                              </button>
                            );
                          })}
                        </li>
                      )}
                    </Fragment>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* SECCIÓN SEDE & TIENDA */}
          <div>
            <CollapsibleSectionHeader
              title="Sede y tienda"
              sectionKey="sede"
              isOpen={openSections.sede}
              onToggle={toggleSection}
            />
            {openSections.sede && (
              <ul className="flex flex-col gap-1">
                <MenuItem
                  icon={<LayoutDashboard className="w-4 h-4" />}
                  name="Dashboard"
                  active={activeModule === "dashboard"}
                  onClick={() => onNavigateModule("dashboard")}
                />
                <MenuItem
                  icon={<PlugInIcon />}
                  name="Módulos de tienda"
                  active={activeModule === "modules-hub"}
                  onClick={() => onNavigateModule("modules-hub")}
                />
              </ul>
            )}
          </div>
        </div>

        <SidebarFooter
          activeRoleName={activeRoleName}
          onOpenSettingsModal={onOpenSettingsModal}
        />
      </nav>
    </BaseAppSidebar>
  );
});

export default StockFlowSidebar;
