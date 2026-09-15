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
  ShootingStarIcon,
  PlugInIcon,
  InfoIcon,
  ArrowRightIcon,
  CalenderIcon,
  PlusIcon,
  PieChartIcon,
  GroupIcon,
} from "@/icons";

// ═══════════════════════════════════════════════════════════════════════════
// LOGO COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const Logo = () => (
  <Link to="/dashboard" className="flex items-center">
    <img
      src="/images/logo/necto-full.svg"
      alt="NECTO"
      className="h-5 w-auto"
    />
  </Link>
);

const LogoCollapsed = () => (
  <Link
    to="/dashboard"
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
    // TODO: integrate with Cognito sign-out
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
            {showExpanded && <span className="menu-item-text">Configuracion</span>}
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
            {showExpanded && <span className="menu-item-text">Cerrar sesion</span>}
          </button>
        </li>
      </ul>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR CONTENT — Sistema de Turnos
// ═══════════════════════════════════════════════════════════════════════════

const SidebarContent = observer(() => {
  const { pathname } = useLocation();
  const isActive = (path: string) => pathname === path;

  // El menú se adapta a los módulos que el usuario eligió en /seleccionar.
  // Si aún no hay selección (p. ej. entró por una URL directa), mostramos
  // ambas secciones para no dejar el sidebar vacío.
  const sinSeleccion = sessionStore.modulos.length === 0;
  const verTurnos = sinSeleccion || sessionStore.hasModulo("turnos");
  const verAgendamiento = sinSeleccion || sessionStore.hasModulo("agendamiento");

  return (
    <nav className="flex flex-col flex-1">
      <div className="flex flex-col gap-6">
        {/* TURNOS */}
        {verTurnos && (
          <div>
            <MenuSectionHeader title="Turnos" />
            <ul className="flex flex-col gap-1">
              <MenuItem icon={<GridIcon />} name="Inicio" path="/dashboard" isActive={isActive} />
              <MenuItem icon={<TaskIcon />} name="Mis Turnos" path="/turnos" isActive={isActive} />
              <MenuItem icon={<PlusIcon />} name="Crear turno" path="/recepcion" isActive={isActive} />
              <MenuItem icon={<ListIcon />} name="Colas" path="/colas" isActive={isActive} />
              <MenuItem icon={<ShootingStarIcon />} name="Encuestas" path="/encuestas" isActive={isActive} />
              {sessionStore.isAdmin && (
                <MenuItem icon={<GroupIcon />} name="Operadores" path="/turnos/operadores" isActive={isActive} />
              )}
            </ul>
          </div>
        )}

        {/* AGENDAMIENTO */}
        {verAgendamiento && (
          <div>
            <MenuSectionHeader title="Agendamiento" />
            <ul className="flex flex-col gap-1">
              <MenuItem icon={<GroupIcon />} name="Profesionales" path="/agendamiento/profesionales" isActive={isActive} />
              <MenuItem icon={<ListIcon />} name="Agenda" path="/agendamiento" isActive={isActive} />
              <MenuItem icon={<CalenderIcon />} name="Calendario" path="/agendamiento/calendario" isActive={isActive} />
              <MenuItem icon={<PlusIcon />} name="Agendar cita" path="/agendamiento/crear" isActive={isActive} />
              <MenuItem icon={<PieChartIcon />} name="Analítica" path="/agendamiento/analitica" isActive={isActive} />
              {sessionStore.isAdmin && (
                <MenuItem icon={<GroupIcon />} name="Operadores" path="/agendamiento/operadores" isActive={isActive} />
              )}
            </ul>
          </div>
        )}
      </div>

      <SidebarFooter />
    </nav>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AppSidebar — NECTO-branded navigation for the queue management system.
 * @kgId 8025fcb3eb97
 */
export const AppSidebar = () => (
  <BaseAppSidebar logo={<Logo />} logoCollapsed={<LogoCollapsed />}>
    <SidebarContent />
  </BaseAppSidebar>
);

export default AppSidebar;
