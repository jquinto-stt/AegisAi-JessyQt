import { Link, useNavigate, useLocation } from "react-router";
import { observer } from "mobx-react-lite";
import {
  BaseAppSidebar,
  MenuSectionHeader,
  MenuItem,
} from "@/shell";
import { useSidebarContext } from "@/shell/sidebar/SidebarContext";
import { sessionStore } from "@/stores";
import {
  GridIcon,
  TaskIcon,
  ListIcon,
  PlugInIcon,
  InfoIcon,
  ArrowRightIcon,
  PlusIcon,
  GroupIcon,
} from "@/icons";

// ═══════════════════════════════════════════════════════════════════════════
// LOGO COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const Logo = () => (
  <Link to="/pedidos/inicio" className="flex items-center">
    <img
      src="/images/logo/necto-full.svg"
      alt="NECTO"
      className="h-5 w-auto"
    />
  </Link>
);

const LogoCollapsed = () => (
  <Link
    to="/pedidos/inicio"
    className="flex items-center justify-center h-10 w-10 rounded-xl border-2 border-brand-500"
  >
    <img
      src="/images/logo/necto-icon.svg"
      alt="NECTO"
      className="h-6 w-6"
    />
  </Link>
);

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER — pinned actions (Configuracion, Ayuda, Cerrar sesion)
// ═══════════════════════════════════════════════════════════════════════════

const SidebarFooter = observer(() => {
  const { isExpanded: showExpanded } = useSidebarContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStore.reset();
    navigate("/login");
  };

  const rowClasses = `menu-item group menu-item-inactive ${
    !showExpanded ? "xl:justify-center" : "xl:justify-start"
  }`;

  return (
    <div className="mt-auto border-t border-gray-200 dark:border-gray-800 pt-4 pb-6">
      <ul className="flex flex-col gap-1">
        <li>
          <Link to="/configuracion" className={rowClasses}>
            <span className="menu-item-icon-size menu-item-icon-inactive">
              <PlugInIcon />
            </span>
            {showExpanded && <span className="menu-item-text">Configuración</span>}
          </Link>
        </li>
        <li>
          <Link to="/ayuda" className={rowClasses}>
            <span className="menu-item-icon-size menu-item-icon-inactive">
              <InfoIcon />
            </span>
            {showExpanded && <span className="menu-item-text">Ayuda</span>}
          </Link>
        </li>
        <li>
          <button
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
// SIMULATION BANNER — indicador de "modo simulación" con salida
// ═══════════════════════════════════════════════════════════════════════════

const SimulacionBanner = observer(() => {
  const { isExpanded: showExpanded } = useSidebarContext();
  const navigate = useNavigate();

  if (!sessionStore.isSimulando) return null;

  const nombre = sessionStore.operadorSimulado?.nombre ?? "Operador";

  const salir = () => {
    sessionStore.salirSimulacion();
    navigate(sessionStore.moduloEntryPath);
  };

  return (
    <div className="mb-4 rounded-lg border border-warning-300 bg-warning-50 p-3 dark:border-warning-500/40 dark:bg-warning-500/10">
      {showExpanded ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider text-warning-600 dark:text-orange-400">
            Viendo como
          </p>
          <p className="mt-1 truncate text-sm font-medium text-gray-800 dark:text-white/90">{nombre}</p>
          <button
            onClick={salir}
            className="mt-2 text-xs font-medium text-warning-600 underline hover:text-warning-700 dark:text-orange-400"
          >
            Salir de vista
          </button>
        </>
      ) : (
        <button
          onClick={salir}
          aria-label="Salir de vista"
          className="flex w-full items-center justify-center text-warning-600 dark:text-orange-400"
          title="Viendo como — salir"
        >
          <ArrowRightIcon />
        </button>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR CONTENT — Módulo de Pedidos
// ═══════════════════════════════════════════════════════════════════════════

const SidebarContent = observer(() => {
  const { pathname } = useLocation();
  const isActive = (path: string) => pathname === path;

  const puedePedidos = (seccionId: string) => sessionStore.puedeVerSeccion("pedidos", seccionId);
  const puedeGestionarEquipo = sessionStore.hasPermission("team.manage");
  const esRutaConHijas = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <nav className="flex flex-col flex-1">
      <SimulacionBanner />

      <div className="flex flex-col gap-6">
        <div>
          <MenuSectionHeader title="Pedidos" />
          <ul className="flex flex-col gap-1">
            {puedePedidos("inicio") && <MenuItem icon={<GridIcon />} name="Inicio" path="/pedidos/inicio" isActive={isActive} />}
            {puedePedidos("tablero") && <MenuItem icon={<ListIcon />} name="Tablero" path="/pedidos" isActive={isActive} />}
            {puedePedidos("crear") && <MenuItem icon={<PlusIcon />} name="Crear pedido" path="/pedidos/crear" isActive={isActive} />}
            {puedePedidos("historial") && <MenuItem icon={<TaskIcon />} name="Historial" path="/pedidos/historial" isActive={isActive} />}
            {puedePedidos("configuracion") && <MenuItem icon={<PlugInIcon />} name="Configuración" path="/pedidos/config" isActive={isActive} />}
            {puedeGestionarEquipo && (
              <MenuItem icon={<GroupIcon />} name="Equipo" path="/pedidos/equipo" isActive={esRutaConHijas} />
            )}
          </ul>
        </div>
      </div>

      <SidebarFooter />
    </nav>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const AppSidebar = () => (
  <BaseAppSidebar logo={<Logo />} logoCollapsed={<LogoCollapsed />}>
    <SidebarContent />
  </BaseAppSidebar>
);

export default AppSidebar;
