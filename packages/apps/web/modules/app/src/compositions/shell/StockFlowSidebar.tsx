import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import {
  BaseAppSidebar,
  MenuSectionHeader,
  MenuItem,
  MenuSubmenuItem,
} from "@/shell";
import { useSidebarContext } from "@/shell/sidebar/SidebarContext";
import { useAuth } from "@/auth/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { InventoryTab } from "@/ModuloInventario";
import { PedidosSection, OperacionTab, GestionTab } from "@/compositions/pedidos/types";
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
import { PanelLeftClose, Globe, Store, SlidersHorizontal } from "lucide-react";
import { uiStore } from "@/stores";

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
      <img
        src="/images/logo/necto-full.svg"
        alt="NECTO"
        className="h-6 w-auto transition-opacity group-hover:opacity-75"
      />
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
              <PlugInIcon />
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

  // Reactive preparation capability toggle
  const [isPreparacionEnabled, setIsPreparacionEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("necto_pedidos_preparacion_enabled");
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });

  // Reactive WhatsApp capability toggle
  const [isWhatsAppEnabled, setIsWhatsAppEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("necto_whatsapp_channel_enabled");
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
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
      } catch (e) {}
    };
    window.addEventListener("necto_preparacion_toggle", handleToggle);
    window.addEventListener("necto_whatsapp_config_changed", handleWhatsAppToggle);
    window.addEventListener("storage", handleToggle);
    window.addEventListener("storage", handleWhatsAppToggle);
    return () => {
      window.removeEventListener("necto_preparacion_toggle", handleToggle);
      window.removeEventListener("necto_whatsapp_config_changed", handleWhatsAppToggle);
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
              <MenuSectionHeader title="Inventario" />
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
          </div>
          )}

          {/* SECCIÓN MÓDULO PEDIDOS (OMS) */}
          {hasPedidos && (
            <div>
              <MenuSectionHeader title="Pedidos" />
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
            </div>
          )}

          {/* SECCIÓN CANALES DE ENTRADA (DESACOPLADOS) */}
          <div>
            <div className="flex items-center justify-between px-3 py-1">
              <MenuSectionHeader title="Canales de Entrada" />
              <button
                type="button"
                onClick={() => onOpenSettingsModal?.("channels")}
                className="text-[10px] font-mono font-bold text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer transition-colors"
                title="Configurar canales en la Sede"
              >
                Ajustes →
              </button>
            </div>
            <ul className="flex flex-col gap-1">
              {/* WhatsApp Business */}
              <MenuItem
                icon={<ChatIcon />}
                name="WhatsApp Business"
                badge={
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      isWhatsAppEnabled
                        ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
                        : "text-zinc-500 bg-zinc-200 dark:bg-zinc-800"
                    }`}
                  >
                    {isWhatsAppEnabled ? "En Línea" : "Inactivo"}
                  </span>
                }
                active={activeModule === "pedidos" && (pedidosSection === "conversaciones" || pedidosSection === "whatsapp")}
                onClick={() => {
                  if (isWhatsAppEnabled) {
                    onNavigatePedidos("conversaciones");
                  } else {
                    onOpenSettingsModal?.("channels");
                  }
                }}
              />

              {/* Tienda Web */}
              <MenuItem
                icon={<Globe className="w-4 h-4" />}
                name="Tienda Web"
                badge={
                  <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-bold">
                    Web
                  </span>
                }
                active={false}
                onClick={() => onOpenSettingsModal?.("channels")}
              />

              {/* POS / Mostrador */}
              <MenuItem
                icon={<Store className="w-4 h-4" />}
                name="POS / Mostrador"
                badge={
                  <span className="text-[9px] font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-bold">
                    Local
                  </span>
                }
                active={false}
                onClick={() => onOpenSettingsModal?.("channels")}
              />
            </ul>
          </div>

          {/* SECCIÓN SEDE & TIENDA */}
          <div>
            <MenuSectionHeader title="Sede & Tienda" />
            <ul className="flex flex-col gap-1">
              <MenuItem
                icon={<PlugInIcon />}
                name="Módulos de Tienda"
                active={activeModule === "modules-hub"}
                onClick={() => onNavigateModule("modules-hub")}
              />
              <MenuItem
                icon={<SlidersHorizontal className="w-4 h-4" />}
                name="Configuración de Sede"
                active={false}
                onClick={() => onOpenSettingsModal?.("general")}
              />
            </ul>
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
