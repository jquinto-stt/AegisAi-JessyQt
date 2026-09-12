import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import {
  BaseAppSidebar,
  MenuSectionHeader,
  MenuItem,
  MenuSubmenuItem,
  useShellConfig,
} from "@/shell";
import { useSidebarContext } from "@/shell/sidebar/SidebarContext";
import { useAuth } from "@/auth/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { InventoryTab } from "@/ModuloInventario";
import { PedidosSection, OperacionTab, GestionTab } from "@/compositions/pedidos/types";
import { eventBus } from "@/infrastructure/eventBus";
import {
  GridIcon,
  TaskIcon,
  ListIcon,
  PieChartIcon,
  DollarLineIcon,
  BoxIcon,
  PlugInIcon,
  InfoIcon,
  ArrowRightIcon,
  UserCircleIcon,
  ChatIcon,
  CalenderIcon,
  TimeIcon,
  GroupIcon,
  BoltIcon,
} from "@/icons";
import { PanelLeftClose, Globe, Store, SlidersHorizontal, Share2, ChevronDown, ChevronRight } from "lucide-react";
import { NectoSidebarWordmark } from "@/compositions/shared/NectoLogo";
import { uiStore } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// COLLAPSIBLE SECTION HEADER
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = "necto_sidebar_open_sections";

type SectionKey = "inventario" | "pedidos" | "conversacional" | "sede";

interface SectionState {
  inventario: boolean;
  pedidos: boolean;
  conversacional: boolean;
  sede: boolean;
}

const DEFAULT_SECTIONS: SectionState = {
  inventario: true,
  pedidos: true,
  conversacional: true,
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
  onOpenRoleModal: () => void;
  onOpenSettingsModal?: (tab?: string) => void;
}

const SidebarFooter = observer(({ activeRoleName, onOpenRoleModal, onOpenSettingsModal }: SidebarFooterProps) => {
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
            onClick={onOpenRoleModal}
            className={rowClasses}
            title={`Rol activo: ${activeRoleName}. Clic para cambiar.`}
          >
            <span className="menu-item-icon-size menu-item-icon-inactive text-brand-500">
              <UserCircleIcon />
            </span>
            {showExpanded && (
              <span className="menu-item-text truncate">
                Rol: <span className="font-semibold text-brand-500">{activeRoleName}</span>
              </span>
            )}
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={onOpenSettingsModal || (() => navigate("/workspaces"))}
            className={rowClasses}
            title="Configuración de Sede"
          >
            <span className="menu-item-icon-size menu-item-icon-inactive">
              <SlidersHorizontal className="w-5 h-5" />
            </span>
            {showExpanded && <span className="menu-item-text">Configuración</span>}
          </button>
        </li>
        <li>
          <a
            href="https://necto.app/help"
            target="_blank"
            rel="noopener noreferrer"
            className={rowClasses}
          >
            <span className="menu-item-icon-size menu-item-icon-inactive">
              <InfoIcon />
            </span>
            {showExpanded && <span className="menu-item-text">Ayuda</span>}
          </a>
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

export interface StockFlowSidebarProps {
  activeModule: "pedidos" | "inventarios" | "modules-hub";
  pedidosSection: PedidosSection;
  pedidosOpTab: OperacionTab;
  pedidosGeTab: GestionTab;
  inventarioTab: InventoryTab;
  onNavigatePedidos: (section: PedidosSection, tab?: any) => void;
  onNavigateModule: (module: "pedidos" | "inventarios" | "modules-hub") => void;
  onNavigateInventario: (tab: InventoryTab) => void;
  onOpenRoleModal: () => void;
  onOpenSettingsModal?: (tab?: string) => void;
  activeRoleName?: string;
}

export const StockFlowSidebar = observer(({
  activeModule,
  pedidosSection,
  pedidosOpTab,
  pedidosGeTab,
  inventarioTab,
  onNavigatePedidos,
  onNavigateModule,
  onNavigateInventario,
  onOpenRoleModal,
  onOpenSettingsModal,
  activeRoleName = "Dueño",
}: StockFlowSidebarProps) => {
  const { activeBusiness, semantics } = useBusiness();
  const activeModules = activeBusiness?.activeModules || [];
  const hasPedidos = activeModules.includes("pedidos");
  const hasInventarios = activeModules.includes("inventarios");
  const isFood = activeBusiness?.businessType === "restaurant_virtual";
  const catalogMenuTitle = isFood ? "Menú & Insumos" : "Catálogo & Listas";

  // ── Collapsible sections state ──
  const [openSections, setOpenSections] = useState<SectionState>(loadSectionState);

  const toggleSection = useCallback((key: SectionKey) => {
    setOpenSections(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveSectionState(next);
      return next;
    });
  }, []);

  // Reactive preparation capability toggle
  const [isPreparacionEnabled, setIsPreparacionEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("necto_pedidos_preparacion_enabled");
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });

  // Reactive WhatsApp capability and connection state
  const [isWhatsAppEnabled, setIsWhatsAppEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("necto_whatsapp_channel_enabled");
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });

  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState<boolean>(() => {
    try {
      return localStorage.getItem("necto_whatsapp_connected") === "true";
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    const handleToggle = () => {
      try {
        const saved = localStorage.getItem("necto_pedidos_preparacion_enabled");
        if (saved !== null) setIsPreparacionEnabled(JSON.parse(saved));
      } catch (e) {}
    };
    const handleWhatsAppToggle = () => {
      try {
        const saved = localStorage.getItem("necto_whatsapp_channel_enabled");
        if (saved !== null) setIsWhatsAppEnabled(JSON.parse(saved));
        const savedConnected = localStorage.getItem("necto_whatsapp_connected") === "true";
        setIsWhatsAppConnected(savedConnected);
      } catch (e) {}
    };
    const unsubPrep = eventBus.subscribe("necto_preparacion_toggle", () => handleToggle());
    const unsubWa = eventBus.subscribe("necto_whatsapp_config_changed", () => handleWhatsAppToggle());
    window.addEventListener("storage", handleToggle);
    window.addEventListener("storage", handleWhatsAppToggle);
    return () => {
      unsubPrep();
      unsubWa();
      window.removeEventListener("storage", handleToggle);
      window.removeEventListener("storage", handleWhatsAppToggle);
    };
  }, []);

  return (
    <BaseAppSidebar logo={<Logo />} logoCollapsed={<LogoCollapsed />}>
      <nav className="flex flex-col flex-1">
        <div className="flex flex-col gap-6">
          {/* SECCIÓN INVENTARIO (SÓLO SI EL MÓDULO ESTÁ ACTIVO) */}
          {hasInventarios && (
            <div>
              <CollapsibleSectionHeader
                title="Inventario"
                sectionKey="inventario"
                isOpen={openSections.inventario}
                onToggle={toggleSection}
              />
              {openSections.inventario && (
                <ul className="flex flex-col gap-1">
                  <MenuItem
                    icon={<BoxIcon />}
                    name="Productos & Servicios"
                    active={activeModule === "inventarios" && inventarioTab === "products"}
                    onClick={() => onNavigateInventario("products")}
                  />
                  <MenuItem
                    icon={<TaskIcon />}
                    name="Compras & Facturas"
                    active={activeModule === "inventarios" && inventarioTab === "purchasing"}
                    onClick={() => onNavigateInventario("purchasing")}
                  />
                  <MenuItem
                    icon={<ListIcon />}
                    name="Movimientos (Kardex)"
                    active={activeModule === "inventarios" && inventarioTab === "kardex"}
                    onClick={() => onNavigateInventario("kardex")}
                  />
                  <MenuItem
                    icon={<DollarLineIcon />}
                    name="Listas de Precios"
                    active={activeModule === "inventarios" && inventarioTab === "pricelists"}
                    onClick={() => onNavigateInventario("pricelists")}
                  />
                  <MenuItem
                    icon={<GridIcon />}
                    name="Bodegas & Sucursales"
                    active={activeModule === "inventarios" && inventarioTab === "locations"}
                    onClick={() => onNavigateInventario("locations")}
                  />
                  <MenuItem
                    icon={<PieChartIcon />}
                    name="Valor de Inventario"
                    active={activeModule === "inventarios" && inventarioTab === "valuation"}
                    onClick={() => onNavigateInventario("valuation")}
                  />
                </ul>
              )}
            </div>
          )}

          {/* SECCIÓN MÓDULO PEDIDOS (OMS) */}
          {hasPedidos && (
            <div>
              <CollapsibleSectionHeader
                title="Pedidos"
                sectionKey="pedidos"
                isOpen={openSections.pedidos}
                onToggle={toggleSection}
              />
              {openSections.pedidos && (
                <ul className="flex flex-col gap-1">
                  <MenuItem
                    icon={<GridIcon />}
                    name="Órdenes"
                    active={activeModule === "pedidos" && (pedidosSection === "ordenes" || pedidosSection === "operacion")}
                    onClick={() => onNavigatePedidos("ordenes")}
                  />
                  <MenuItem
                    icon={<CalenderIcon />}
                    name="Programados"
                    active={activeModule === "pedidos" && pedidosSection === "programados"}
                    onClick={() => onNavigatePedidos("programados")}
                  />
                  {isFood && isPreparacionEnabled && (
                    <MenuItem
                      icon={<BoxIcon />}
                      name={semantics?.stationShortName || "Preparación"}
                      active={activeModule === "pedidos" && pedidosSection === "preparacion"}
                      onClick={() => onNavigatePedidos("preparacion")}
                    />
                  )}
                </ul>
              )}
            </div>
          )}

          {/* SECCIÓN CANAL CONVERSACIONAL (INDEPENDIENTE Y DESACOPLADO) */}
          {isWhatsAppEnabled && (
            <div>
              <CollapsibleSectionHeader
                title="Canal Conversacional"
                sectionKey="conversacional"
                isOpen={openSections.conversacional}
                onToggle={toggleSection}
              />
              {openSections.conversacional && (
                <ul className="flex flex-col gap-1">
                  {isWhatsAppConnected && (
                    <MenuItem
                      icon={<ChatIcon />}
                      name="Conversaciones"
                      badge={
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10">
                          WhatsApp
                        </span>
                      }
                      active={activeModule === "pedidos" && (pedidosSection === "conversaciones" || pedidosSection === "whatsapp")}
                      onClick={() => onNavigatePedidos("conversaciones")}
                    />
                  )}
                  <MenuItem
                    icon={<Share2 className="w-4 h-4" />}
                    name="Canales de Entrada"
                    active={activeModule === "pedidos" && pedidosSection === "canales"}
                    onClick={() => onNavigatePedidos("canales")}
                  />
                </ul>
              )}
            </div>
          )}

          {/* SECCIÓN SEDE & TIENDA */}
          <div>
            <CollapsibleSectionHeader
              title="Sede & Tienda"
              sectionKey="sede"
              isOpen={openSections.sede}
              onToggle={toggleSection}
            />
            {openSections.sede && (
              <ul className="flex flex-col gap-1">
                <MenuItem
                  icon={<PlugInIcon />}
                  name="Módulos de Tienda"
                  active={activeModule === "modules-hub"}
                  onClick={() => onNavigateModule("modules-hub")}
                />
              </ul>
            )}
          </div>
        </div>

        <SidebarFooter
          activeRoleName={activeRoleName}
          onOpenRoleModal={onOpenRoleModal}
          onOpenSettingsModal={onOpenSettingsModal}
        />
      </nav>
    </BaseAppSidebar>
  );
});

export default StockFlowSidebar;
