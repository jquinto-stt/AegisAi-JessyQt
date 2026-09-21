import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { observer } from "mobx-react-lite";
import {
  BaseAppSidebar,
  MenuSectionHeader,
  MenuItem,
} from "@/shell";
import { useSidebarContext } from "@/shell/sidebar/SidebarContext";
import { sessionStore, organizacionStore, SECCIONES, modulosOperablesDeSesion } from "@/stores";
import type { Modulo, Seccion } from "@/stores";
import { CATALOGO_MODULOS } from "@/stores/plataforma.store";
import { operadorSimuladoNombre, rolSimuladoNombre } from "@/stores/acceso.utils";
import { Settings } from "lucide-react";
import {
  GridIcon,
  TaskIcon,
  ListIcon,
  PlugInIcon,
  InfoIcon,
  ArrowRightIcon,
  PlusIcon,
  AiIcon,
  ChatIcon,
  PieChartIcon,
  BoxIconLine,
  TableIcon,
} from "@/icons";

// ═══════════════════════════════════════════════════════════════════════════
// LOGO COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ruta del Lanzador de Módulos. Es la pantalla que responde «¿qué tiene
 * contratado esta organización?» y desde la que se entra a cada módulo.
 *
 * Estaba solo en `App.tsx`; los dos accesos de retorno que se añaden abajo la
 * necesitan, y escribir `/modulos` dos veces más es cómo se acaba con tres rutas
 * para la misma pantalla —que es exactamente lo que pasó con `/workspaces` y
 * `/workspace/modulos`, hoy reducidas a redirecciones—.
 */
const RUTA_LANZADOR = "/modulos";

/** Tooltip común a los dos logos: dicen lo MISMO porque hacen lo mismo. */
const TOOLTIP_LANZADOR = "Volver al selector de módulos";

/**
 * Los logos llevan de vuelta al Lanzador de Módulos (`/modulos`).
 *
 * Antes iban a `/pedidos/inicio`: el logo de una app es el atajo universal al
 * «inicio», y aquí el inicio de la aplicación es el Lanzador, no la primera
 * pantalla del único módulo. Con Pedidos como módulo único la diferencia era
 * invisible; con dos módulos, el logo de la barra lateral de Pedidos habría sido
 * el camino más corto a… Pedidos.
 *
 * Se añade `title` porque el destino dejó de ser obvio: un wordmark que salta a
 * otra pantalla necesita decir a dónde. Va en la `<img>` y no en el `<Link>`: el
 * `title` de un `<Link>` lo hereda el `<a>`, y un `<a>` sin área propia de hover
 * deja el tooltip a merced de que el puntero caiga sobre la imagen —que es lo que
 * ya pasa—, así que se pone donde el puntero realmente está.
 */
const Logo = () => (
  <Link to={RUTA_LANZADOR} className="flex items-center">
    {/*
      Dos archivos, no uno: el lockup lleva «grow together» en índigo (#15008B),
      que sobre el panel oscuro (`gray-900`, #212121) es prácticamente invisible.
      El hex estaba mal escrito (`#1A1A1A` era el paso 950, el lienzo, no el
      panel): el sidebar es `dark:bg-gray-900`, así que el fondo real es #212121.
      CSS no puede repintar el interior de un `<img>`, así que el cambio se hace
      con `dark:hidden` / `dark:block` y la caja queda idéntica en los dos temas.

      `h-8` y no `h-5`: el lockup del manual es APILADO —wordmark arriba,
      «grow together» debajo—, así que la altura del archivo se reparte entre
      los dos bloques. A `h-5` el wordmark quedaba en ~10 px y no se leía.
    */}
    <img
      src="/images/logo/necto-full.svg"
      alt="NECTO"
      title={TOOLTIP_LANZADOR}
      className="h-8 w-auto dark:hidden"
    />
    <img
      src="/images/logo/necto-full-white.svg"
      alt="NECTO"
      title={TOOLTIP_LANZADOR}
      className="hidden h-8 w-auto dark:block"
    />
  </Link>
);

const LogoCollapsed = () => (
  <Link
    to={RUTA_LANZADOR}
    className="flex items-center justify-center h-10 w-10 rounded-xl border-2 border-brand-500"
  >
    <img
      src="/images/logo/necto-icon.svg"
      alt="NECTO"
      title={TOOLTIP_LANZADOR}
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

  // El rol asignado es el titular del banner; el operador va debajo. Ver el
  // docblock de `OperadorChip` en AppShell.tsx para el porqué completo.
  //
  // La resolución del nombre del rol NO se hace aquí: `acceso.utils` ya traduce
  // `rolId` a texto y declara «Sin rol» cuando no existe, que es el caso real
  // de un operador creado sin rol (`operadores.store.crear` lo deja en
  // `personalizado` solo si se aprobó por la puerta de aprobación; una
  // simulación sobre un `rolId` ausente pinta la cadena vacía si se improvisa).
  const rol = rolSimuladoNombre() ?? "Sin rol";
  const nombre = operadorSimuladoNombre();

  const salir = () => {
    sessionStore.salirSimulacion();
    navigate(sessionStore.moduloEntryPath);
  };

  return (
    <div className="mb-4 rounded-lg border border-warning-300 bg-warning-50 p-3 dark:border-warning-500/40 dark:bg-warning-500/10">
      {showExpanded ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider text-warning-600 dark:text-warning-400">
            Viendo como
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-gray-800 dark:text-white/90">{rol}</p>
          {nombre && (
            <p className="truncate text-xs font-normal text-gray-600 dark:text-gray-400">{nombre}</p>
          )}
          <button
            onClick={salir}
            className="mt-2 text-xs font-medium text-warning-600 underline hover:text-warning-700 dark:text-warning-400"
          >
            Salir de vista
          </button>
        </>
      ) : (
        <button
          onClick={salir}
          aria-label={`Salir de vista (${rol})`}
          className="flex w-full items-center justify-center text-warning-600 dark:text-warning-400"
          title={`Viendo como ${rol} — salir`}
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

  /**
   * El motivo se pinta SIEMPRE; el enlace solo si el rol puede ejecutarlo.
   *
   * El enlace apunta a `/configuracion?tab=modulos`, que exige `team.manage`.
   * Antes se pintaba para todo el mundo, así que un rol con `channels.read` y sin
   * `team.manage` veía «Activarlo», lo pulsaba y aterrizaba en «No tienes acceso
   * a esta sección» — un control visible que el rol no puede ejecutar, que es
   * justo lo que el contrato manda **ocultar**. Es el mismo defecto que se retiró
   * del pie del sidebar, en otra ubicación. Medido con un operador simulado en
   * `outputs/flujos-config-verify/`.
   *
   * La pestaña va explícita porque el destino por defecto de `/configuracion` es
   * «General»: «Activarlo» significa encender un módulo, y eso vive en la pestaña
   * de módulos.
   *
   * Ocultar el motivo entero sería peor: la sección está vacía y quien la busca
   * tiene derecho a saber por qué. Se dice la verdad, y se nombra a quien puede
   * cambiarla en vez de ofrecer un enlace que termina en una negación.
   */
  const puedeActivarlo = sessionStore.hasPermission("team.manage");

  return (
    <div>
      <MenuSectionHeader title={titulo} />
      {showExpanded && (
        <p className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs leading-relaxed text-gray-500 dark:border-white/10 dark:text-gray-400">
          {motivo}{" "}
          {puedeActivarlo ? (
            <Link
              to="/configuracion?tab=modulos"
              className="font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Activarlo
            </Link>
          ) : (
            <span>Pídele a un administrador que lo active.</span>
          )}
        </p>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR CONTENT — Módulos de negocio
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Qué secciones de cada módulo pinta el sidebar, en qué orden y con qué icono.
 *
 * **Solo el orden y el glifo.** La ETIQUETA y la RUTA se leen de `SECCIONES`
 * (`operadores.store.ts`), que es el catálogo de destinos del módulo. Duplicarlas
 * aquí es cómo se acaba con `/inventario/config` escrito en dos archivos y una
 * sección renombrada en uno solo.
 *
 * **No es `SECCIONES[modulo]` entero, y no puede serlo.** El catálogo incluye las
 * secciones TRANSVERSALES —`asistente` y `conversaciones` en Pedidos— que este
 * archivo NO pinta aquí: viven en los bloques «Inteligencia» y «Canales», que
 * preguntan por el conector de la organización y no por el módulo. Recorrer el
 * catálogo completo pintaría Conversaciones dos veces.
 *
 * La compuerta NO se declara aquí: cada ítem pasa por
 * `sessionStore.puedeVerSeccion(modulo, id)`, que resuelve la capacidad en
 * `SECCIONES`. Nunca una comprobación de rol ni `esAdmin` (invariante C9).
 */
const ITEMS_MODULO: Record<Modulo, { seccionId: string; Icono: React.FC<React.SVGProps<SVGSVGElement>> }[]> = {
  pedidos: [
    { seccionId: "inicio", Icono: GridIcon },
    { seccionId: "tablero", Icono: ListIcon },
    { seccionId: "crear", Icono: PlusIcon },
    { seccionId: "historial", Icono: TaskIcon },
    { seccionId: "analitica", Icono: PieChartIcon },
    { seccionId: "configuracion", Icono: PlugInIcon },
  ],
  inventario: [
    { seccionId: "inicio", Icono: GridIcon },
    { seccionId: "existencias", Icono: BoxIconLine },
    { seccionId: "movimientos", Icono: TableIcon },
    { seccionId: "configuracion", Icono: PlugInIcon },
  ],
};

/**
 * Sección del catálogo, o `null` si el id no existe.
 *
 * El `null` no debería ocurrir nunca —los ids de `ITEMS_MODULO` salen del mismo
 * catálogo— y por eso mismo no se calla: devolver el id como etiqueta o `"#"` como
 * ruta sería pintar un enlace que no lleva a ninguna parte. Se omite el ítem y
 * `AppSidebar.secciones.test.ts` fija que la omisión nunca se activa.
 */
function seccionDe(modulo: Modulo, seccionId: string): Seccion | null {
  return SECCIONES[modulo]?.find((s) => s.id === seccionId) ?? null;
}

const SidebarContent = observer(() => {
  const { pathname } = useLocation();
  const { isExpanded: showExpanded } = useSidebarContext();
  const isActive = (path: string) => pathname === path;

  const puedeVerSeccion = (modulo: Modulo, seccionId: string) =>
    sessionStore.puedeVerSeccion(modulo, seccionId);
  const puedeGestionarEquipo = sessionStore.hasPermission("team.manage");
  const esRutaConHijas = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  /**
   * La entrada «Configuración» cubre DOS rutas, no una.
   *
   * `/configuracion` —con cualquier `?tab=`, que no cambia el `pathname`— y
   * `/equipo/:id`, el perfil de una persona, que se abre desde la pestaña de
   * equipo. Sin lo segundo, el ítem se apagaría justo mientras estás dentro de lo
   * que gobierna, que es la forma más barata de que el sidebar parezca roto.
   *
   * `/equipo` a secas no hace falta nombrarla: es un `<Navigate>` a
   * `/configuracion?tab=equipo` y nunca llega a pintarse.
   */
  const esRutaOrganizacion = (path: string) =>
    esRutaConHijas(path) || esRutaConHijas("/equipo");

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

        {/* Módulos de negocio — UNA rama por módulo, y ninguna escrita a mano.
            Antes era una rama literal de Pedidos con el título `"Pedidos"` y seis
            `puedePedidos(...)` cableados, y el comentario decía «y, más adelante,
            Inventario». Eso dejó de ser una promesa: el módulo existe.

            Dos decisiones, y las dos son sobre no mentir:
              · La lista sale de `modulosOperablesDeSesion(modulosActivos)` —el
                mismo vocabulario que usa el `ModuleSwitcher`—, no de un array
                literal. Un módulo que la app no sabe nombrar no tiene rama, y uno
                que la organización no tiene encendido no se pinta.
              · El título es `CATALOGO_MODULOS[modulo].nombreCorto`. Con Pedidos
                como módulo único, `"Pedidos"` literal era invisible; con dos,
                habría titulado «Pedidos» una sección de Inventario.
              · La sección entera se omite si no queda NINGÚN ítem visible. Sin
                esto, un rol sin `inventory.read` ni `settings.read` —el rol
                «Operador», por ejemplo— vería un encabezado «Inventario» plegable
                con nada debajo: una sección que promete un destino y no lleva a
                ninguno. Los ítems ya se filtraban por capacidad; el título no. */}
        {modulosOperablesDeSesion(organizacionStore.modulosActivos).map((modulo) => {
          const visibles = ITEMS_MODULO[modulo].flatMap(({ seccionId, Icono }) => {
            const seccion = seccionDe(modulo, seccionId);
            // Sección inexistente en el catálogo: se omite en vez de pintar un
            // enlace sin destino. Ver `seccionDe`.
            if (!seccion) return [];
            if (!puedeVerSeccion(modulo, seccionId)) return [];
            return [{ seccionId, Icono, seccion }];
          });

          if (visibles.length === 0) return null;

          return (
            <div key={modulo}>
              <MenuSectionHeader
                title={CATALOGO_MODULOS[modulo].nombreCorto}
                collapsible
                isCollapsed={estaColapsado(modulo)}
                onToggle={() => toggleSeccion(modulo)}
              />
              <div
                className={`transition-all duration-200 ease-in-out overflow-hidden ${
                  estaColapsado(modulo) ? "max-h-0 opacity-0" : "max-h-96 opacity-100"
                }`}
              >
                <ul className="flex flex-col gap-1">
                  {visibles.map(({ seccionId, Icono, seccion }) => (
                    <MenuItem
                      key={seccionId}
                      icon={<Icono />}
                      name={seccion.label}
                      path={seccion.path}
                      isActive={isActive}
                    />
                  ))}
                </ul>
              </div>
            </div>
          );
        })}

        {/* Organización — UNA sola entrada para UNA sola pantalla.
            Antes eran dos («Equipo» y «Configuración de Módulos») porque eran dos
            pantallas distintas; ahora son dos pestañas de `/configuracion`, así que
            dos enlaces al mismo sitio serían dos caminos sin ninguna razón para
            elegir uno. El icono es el mismo que usa el menú de usuario para este
            destino (`UserDropdown`), que es lo que hace que dos accesos al mismo
            sitio se lean como el mismo sitio.

            Sigue siendo el ÚNICO enlace del sidebar a `/configuracion`: el del pie
            se retiró porque lo veía todo el mundo y la ruta exige `team.manage`. */}
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
                <MenuItem
                  icon={<Settings className="size-5" />}
                  name="Configuración"
                  path="/configuracion"
                  isActive={esRutaOrganizacion}
                />
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
