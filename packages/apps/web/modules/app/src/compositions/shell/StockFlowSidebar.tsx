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
import { PanelLeftClose } from "lucide-react";
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
}

const SidebarFooter = observer(({ activeRoleName, onOpenRoleModal }: SidebarFooterProps) => {
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
          <Link to="/workspaces" className={rowClasses} title="Gestión de Sucursales">
            <span className="menu-item-icon-size menu-item-icon-inactive">
              <PlugInIcon />
            </span>
            {showExpanded && <span className="menu-item-text">Configuración</span>}
          </Link>
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
  activeModule: "pedidos" | "inventarios";
  pedidosSection: PedidosSection;
  pedidosOpTab: OperacionTab;
  pedidosGeTab: GestionTab;
  inventarioTab: InventoryTab;
  onNavigatePedidos: (section: PedidosSection, tab?: any) => void;
  onNavigateModule: (module: "pedidos" | "inventarios") => void;
  onNavigateInventario: (tab: InventoryTab) => void;
  onOpenRoleModal: () => void;
  activeRoleName?: string;
}

export const StockFlowSidebar = observer(({
  activeModule,
  pedidosSection,
  pedidosOpTab,
  pedidosGeTab,
  inventarioTab,
  onNavigatePedidos,
  onNavigateInventario,
  onOpenRoleModal,
  activeRoleName = "Dueño",
}: StockFlowSidebarProps) => {
  const { activeBusiness } = useBusiness();
  const hasPedidos = activeBusiness?.activeModules?.includes("pedidos") ?? true;

  // Accordion open section state
  const [openMenuName, setOpenMenuName] = useState<string | null>(() => {
    if (activeModule === "pedidos") {
      if (pedidosSection === "operacion") return "Operación";
      if (pedidosSection === "menu") return "Menú & Insumos";
      if (pedidosSection === "analitica") return "Analítica";
      if (pedidosSection === "configuracion") return "Configuración";
    }
    return null;
  });

  // Keep accordion synced when external navigation occurs
  useEffect(() => {
    if (activeModule === "pedidos") {
      if (pedidosSection === "operacion") setOpenMenuName("Operación");
      else if (pedidosSection === "menu") setOpenMenuName("Menú & Insumos");
      else if (pedidosSection === "analitica") setOpenMenuName("Analítica");
      else if (pedidosSection === "configuracion") setOpenMenuName("Configuración");
    }
  }, [activeModule, pedidosSection]);

  return (
    <BaseAppSidebar logo={<Logo />} logoCollapsed={<LogoCollapsed />}>
      <nav className="flex flex-col flex-1">
        <div className="flex flex-col gap-6">
          {/* SECCIÓN INVENTARIO */}
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

          {/* SECCIÓN PEDIDOS & OPERACIONES (TODAS LAS PANTALLAS CON SUBMENÚS) */}
          {hasPedidos && (
            <div>
              <MenuSectionHeader title="Pedidos & Operaciones" />
              <ul className="flex flex-col gap-1">
                {/* 1. OPERACIÓN */}
                <MenuItem
                  icon={<GridIcon />}
                  name="Operación"
                  openMenuName={openMenuName}
                  onMenuToggle={setOpenMenuName}
                  active={activeModule === "pedidos" && pedidosSection === "operacion"}
                >
                  <MenuSubmenuItem
                    name="Órdenes en Vivo"
                    onClick={() => onNavigatePedidos("operacion", "en-vivo")}
                    active={activeModule === "pedidos" && pedidosSection === "operacion" && pedidosOpTab === "en-vivo"}
                  />
                  <MenuSubmenuItem
                    name="KDS Cocina"
                    onClick={() => onNavigatePedidos("operacion", "preparacion")}
                    active={activeModule === "pedidos" && pedidosSection === "operacion" && pedidosOpTab === "preparacion"}
                  />
                  <MenuSubmenuItem
                    name="Programados"
                    onClick={() => onNavigatePedidos("operacion", "programados")}
                    active={activeModule === "pedidos" && pedidosSection === "operacion" && pedidosOpTab === "programados"}
                  />
                  <MenuSubmenuItem
                    name="WhatsApp & Chat"
                    onClick={() => onNavigatePedidos("operacion", "conversaciones")}
                    active={activeModule === "pedidos" && pedidosSection === "operacion" && pedidosOpTab === "conversaciones"}
                  />
                </MenuItem>

                {/* 2. MENÚ & INSUMOS */}
                <MenuItem
                  icon={<ListIcon />}
                  name="Menú & Insumos"
                  openMenuName={openMenuName}
                  onMenuToggle={setOpenMenuName}
                  active={activeModule === "pedidos" && pedidosSection === "menu"}
                >
                  <MenuSubmenuItem
                    name="Catálogo de Platos"
                    onClick={() => onNavigatePedidos("menu", "catalogo")}
                    active={activeModule === "pedidos" && pedidosSection === "menu" && pedidosGeTab === "catalogo"}
                  />
                  <MenuSubmenuItem
                    name="Insumos & Recetas"
                    onClick={() => onNavigatePedidos("menu", "insumos")}
                    active={activeModule === "pedidos" && pedidosSection === "menu" && pedidosGeTab === "insumos"}
                  />
                </MenuItem>

                {/* 3. ANALÍTICA */}
                <MenuItem
                  icon={<PieChartIcon />}
                  name="Analítica"
                  openMenuName={openMenuName}
                  onMenuToggle={setOpenMenuName}
                  active={activeModule === "pedidos" && pedidosSection === "analitica"}
                >
                  <MenuSubmenuItem
                    name="Dashboard Resumen"
                    onClick={() => onNavigatePedidos("analitica", "resumen")}
                    active={activeModule === "pedidos" && pedidosSection === "analitica" && pedidosGeTab === "resumen"}
                  />
                  <MenuSubmenuItem
                    name="Historial de Pedidos"
                    onClick={() => onNavigatePedidos("analitica", "historial")}
                    active={activeModule === "pedidos" && pedidosSection === "analitica" && pedidosGeTab === "historial"}
                  />
                  <MenuSubmenuItem
                    name="Métricas Rendimiento"
                    onClick={() => onNavigatePedidos("analitica", "analitica")}
                    active={activeModule === "pedidos" && pedidosSection === "analitica" && pedidosGeTab === "analitica"}
                  />
                </MenuItem>

                {/* 4. CONFIGURACIÓN */}
                <MenuItem
                  icon={<PlugInIcon />}
                  name="Configuración"
                  openMenuName={openMenuName}
                  onMenuToggle={setOpenMenuName}
                  active={activeModule === "pedidos" && pedidosSection === "configuracion"}
                >
                  <MenuSubmenuItem
                    name="Roles & Permisos"
                    onClick={() => onNavigatePedidos("configuracion", "roles")}
                    active={activeModule === "pedidos" && pedidosSection === "configuracion" && pedidosGeTab === "roles"}
                  />
                  <MenuSubmenuItem
                    name="Automatizaciones IA"
                    onClick={() => onNavigatePedidos("configuracion", "automatizaciones")}
                    active={activeModule === "pedidos" && pedidosSection === "configuracion" && pedidosGeTab === "automatizaciones"}
                  />
                  <MenuSubmenuItem
                    name="Turnos y Capacidad"
                    onClick={() => onNavigatePedidos("configuracion", "turnos")}
                    active={activeModule === "pedidos" && pedidosSection === "configuracion" && pedidosGeTab === "turnos"}
                  />
                </MenuItem>
              </ul>
            </div>
          )}
        </div>

        <SidebarFooter
          activeRoleName={activeRoleName}
          onOpenRoleModal={onOpenRoleModal}
        />
      </nav>
    </BaseAppSidebar>
  );
});

export default StockFlowSidebar;
