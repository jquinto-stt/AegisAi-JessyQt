import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { observer } from "mobx-react-lite";
import {
  BaseAppSidebar,
  MenuSectionHeader,
  MenuItem,
} from "@/shell";
import { useSidebarContext } from "@/shell/sidebar/SidebarContext";
import { sessionStore, organizacionStore } from "@/stores";
import {
  GridIcon,
  TaskIcon,
  ListIcon,
  PlugInIcon,
  InfoIcon,
  ArrowRightIcon,
  PlusIcon,
  GroupIcon,
  AiIcon,
  ChatIcon,
  PieChartIcon,
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
    <div className="border-t border-gray-200/70 dark:border-white/5 pt-4 pb-6">
      <ul className="flex flex-col gap-1">
        {/* Aquí vivía un enlace «Configuración» → `/configuracion`, que por entonces
            renderizaba un `PlaceholderPage` vacío. Se retira en vez de apuntarlo a
            la página real, por dos razones: (1) duplicaba «Configuración de Módulos»
            de la sección Organización, y (2) este pie lo ve todo el mundo, mientras
            `/configuracion` exige `team.manage`. Un enlace visible que el rol no
            puede ejecutar es justo lo que el contrato manda **ocultar**. */}
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
// SECCIÓN TRANSVERSAL SIN CONECTAR — el motivo, no el silencio
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fila que explica por qué una sección transversal está vacía.
 *
 * Antes, con el conector apagado, la sección **desaparecía entera**: se instalaba
 * Pedidos desde el catálogo, el sidebar perdía «Canales» e «Inteligencia», y nada
 * decía por qué. `instalarModulo()` no enciende conectores a propósito —la app no
 * fabrica una decisión de integración que el usuario no tomó—, pero el efecto
 * visible era un deshabilitado en silencio.
 *
 * Ocultar lo que el rol **no puede ejecutar** sigue siendo correcto, y ese gate
 * está fuera, en las condiciones de cada sección. Lo que no se puede es hacer
 * desaparecer algo que el rol sí puede ejecutar porque falte configuración.
 */
const SeccionSinConectar = observer(({ titulo, motivo }: { titulo: string; motivo: string }) => {
  const { isExpanded: showExpanded } = useSidebarContext();

  return (
    <div>
      <MenuSectionHeader title={titulo} />
      {showExpanded && (
        <p className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs leading-relaxed text-gray-500 dark:border-white/10 dark:text-gray-400">
          {motivo}{" "}
          <Link
            to="/configuracion"
            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Activarlo
          </Link>
        </p>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR CONTENT — Módulo de Pedidos
// ═══════════════════════════════════════════════════════════════════════════

const SidebarContent = observer(() => {
  const { pathname } = useLocation();
  const { isExpanded: showExpanded } = useSidebarContext();
  const isActive = (path: string) => pathname === path;

  const puedePedidos = (seccionId: string) => sessionStore.puedeVerSeccion("pedidos", seccionId);
  const puedeGestionarEquipo = sessionStore.hasPermission("team.manage");
  const esRutaConHijas = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  // Las dos preguntas que decide cada sección transversal, separadas a propósito:
  // «¿el rol puede?» (permiso) y «¿la organización lo tiene encendido?» (config).
  const puedeVerCanales = sessionStore.hasPermission("channels.read");
  const puedeVerAsistente = sessionStore.hasPermission("assistant.use");
  const canalesConectados = organizacionStore.tieneConectorActivo("whatsapp");
  const asistenteConectado = organizacionStore.tieneConectorActivo("necto_ia");
  // Sin ningún módulo activo no hay nada que conectar, así que el motivo sobra:
  // decir «el canal está desconectado» cuando el problema es que no hay módulo
  // sería cambiar un silencio por una explicación falsa.
  const hayModuloActivo = organizacionStore.modulosActivos.length > 0;

  const [colapsados, setColapsados] = useState<Record<string, boolean>>(() => {
    try {
      const guardado = localStorage.getItem("sidebar_secciones_colapsadas");
      return guardado ? JSON.parse(guardado) : {};
    } catch {
      return {};
    }
  });

  const toggleSeccion = (id: string) => {
    setColapsados((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem("sidebar_secciones_colapsadas", JSON.stringify(next));
      } catch {
        // no-op
      }
      return next;
    });
  };

  const estaColapsado = (id: string) => showExpanded && Boolean(colapsados[id]);

  return (
    <nav className="flex flex-col flex-1">
      <SimulacionBanner />

      <div className="flex flex-col gap-5">
        {/* Canales (Conversaciones e Historial) — capa transversal de comunicaciones.
            Tres estados, y ninguno es «desaparecer sin decir nada»:
              · el rol no puede leer canales        → se oculta (contrato §4);
              · puede y el conector está encendido  → la sección normal;
              · puede y el conector está apagado    → la sección con el motivo. */}
        {puedeVerCanales && canalesConectados && (
          <div>
            <MenuSectionHeader
              title="Canales"
              collapsible
              isCollapsed={estaColapsado("canales")}
              onToggle={() => toggleSeccion("canales")}
            />
            <div
              className={`transition-all duration-200 ease-in-out overflow-hidden ${
                estaColapsado("canales") ? "max-h-0 opacity-0" : "max-h-96 opacity-100"
              }`}
            >
              <ul className="flex flex-col gap-1">
                <MenuItem icon={<ChatIcon />} name="Conversaciones" path="/conversaciones" isActive={isActive} />
                <MenuItem icon={<TaskIcon />} name="Historial de atención" path="/conversaciones/historial" isActive={isActive} />
                {sessionStore.hasPermission("channels.manage") && (
                  <MenuItem icon={<PlugInIcon />} name="Configuración del canal" path="/conversaciones/config" isActive={isActive} />
                )}
              </ul>
            </div>
          </div>
        )}
        {puedeVerCanales && !canalesConectados && hayModuloActivo && (
          <SeccionSinConectar
            titulo="Canales"
            motivo="El canal de WhatsApp está desconectado, así que Conversaciones e Historial de atención todavía no aparecen."
          />
        )}

        {/* Inteligencia (Necto Intelligence) — justo debajo de Canales, mismo criterio. */}
        {puedeVerAsistente && asistenteConectado && (
          <div>
            <MenuSectionHeader
              title="Inteligencia"
              collapsible
              isCollapsed={estaColapsado("inteligencia")}
              onToggle={() => toggleSeccion("inteligencia")}
            />
            <div
              className={`transition-all duration-200 ease-in-out overflow-hidden ${
                estaColapsado("inteligencia") ? "max-h-0 opacity-0" : "max-h-96 opacity-100"
              }`}
            >
              <ul className="flex flex-col gap-1">
                <MenuItem icon={<AiIcon />} name="NECTO AI" path="/asistente" isActive={isActive} />
                <MenuItem icon={<PlugInIcon />} name="Configuración de la IA" path="/asistente/config" isActive={isActive} />
              </ul>
            </div>
          </div>
        )}
        {puedeVerAsistente && !asistenteConectado && hayModuloActivo && (
          <SeccionSinConectar
            titulo="Inteligencia"
            motivo="Necto Intelligence está desconectado, así que NECTO AI todavía no aparece."
          />
        )}

        {/* Módulos de negocio (Pedidos y, más adelante, Inventario, etc.). */}
        {organizacionStore.esModuloActivo("pedidos") && (
          <div>
            <MenuSectionHeader
              title="Pedidos"
              collapsible
              isCollapsed={estaColapsado("pedidos")}
              onToggle={() => toggleSeccion("pedidos")}
            />
            <div
              className={`transition-all duration-200 ease-in-out overflow-hidden ${
                estaColapsado("pedidos") ? "max-h-0 opacity-0" : "max-h-96 opacity-100"
              }`}
            >
              <ul className="flex flex-col gap-1">
                {puedePedidos("inicio") && <MenuItem icon={<GridIcon />} name="Inicio" path="/pedidos/inicio" isActive={isActive} />}
                {puedePedidos("tablero") && <MenuItem icon={<ListIcon />} name="Tablero" path="/pedidos" isActive={isActive} />}
                {puedePedidos("crear") && <MenuItem icon={<PlusIcon />} name="Crear pedido" path="/pedidos/crear" isActive={isActive} />}
                {puedePedidos("historial") && <MenuItem icon={<TaskIcon />} name="Historial" path="/pedidos/historial" isActive={isActive} />}
                {puedePedidos("analitica") && <MenuItem icon={<PieChartIcon />} name="Analítica" path="/pedidos/analitica" isActive={isActive} />}
                {puedePedidos("configuracion") && <MenuItem icon={<PlugInIcon />} name="Configuración" path="/pedidos/config" isActive={isActive} />}
              </ul>
            </div>
          </div>
        )}

        {/* Organización — gestión de equipo, roles y módulos transversales.
            «Configuración de Módulos» apunta a la ruta canónica `/configuracion`
            (antes `/organizacion/configuracion`, que hoy redirige). Es el único
            enlace del sidebar a esa pantalla: el del pie se retiró porque lo veía
            todo el mundo y la ruta exige `team.manage`. */}
        {puedeGestionarEquipo && (
          <div>
            <MenuSectionHeader
              title="Organización"
              collapsible
              isCollapsed={estaColapsado("organizacion")}
              onToggle={() => toggleSeccion("organizacion")}
            />
            <div
              className={`transition-all duration-200 ease-in-out overflow-hidden ${
                estaColapsado("organizacion") ? "max-h-0 opacity-0" : "max-h-96 opacity-100"
              }`}
            >
              <ul className="flex flex-col gap-1">
                <MenuItem icon={<GroupIcon />} name="Equipo" path="/equipo" isActive={esRutaConHijas} />
                <MenuItem icon={<PlugInIcon />} name="Configuración de Módulos" path="/configuracion" isActive={esRutaConHijas} />
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto">
        <SidebarFooter />
      </div>
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
