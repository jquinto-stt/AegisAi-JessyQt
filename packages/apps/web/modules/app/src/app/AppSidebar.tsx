import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { observer } from "mobx-react-lite";
import {
  BaseAppSidebar,
  MenuSectionHeader,
  MenuItem,
} from "@/shell";
import { useSidebarContext } from "@/shell/sidebar/SidebarContext";
import { sessionStore, organizacionStore, inventarioStore, SECCIONES, modulosOperablesDeSesion } from "@/stores";
import { cerrarSesion } from "@/lib/auth.service";
import type { Modulo, Seccion } from "@/stores";
import { CATALOGO_MODULOS } from "@/stores/plataforma.store";
import { operadorSimuladoNombre, rolSimuladoNombre } from "@/stores/acceso.utils";
// Las cuatro tarjetas del hub de Configuraciones: el flyout de «Organización» en
// modo rail las repite como accesos directos. Se importan del catálogo y no se
// escriben aquí para que renombrar una tarjeta no deje el sidebar diciendo otra cosa.
import { TARJETAS_CONFIG } from "@/pages/configuracion/configuracion.catalogo";
import {
  Cog6ToothIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";
import {
  GridIcon,
  GroupIcon,
  TaskIcon,
  ListIcon,
  PlugInIcon,
  InfoIcon,
  ArrowRightIcon,
  PlusIcon,
  ChatIcon,
  PieChartIcon,
  BoxIconLine,
  BoxCubeIcon,
  BoxIcon,
  TableIcon,
  FolderIcon,
  TimeIcon,
  AlertHexaIcon,
  CheckLineIcon,
  CartIcon,
  TruckDelivery,
  CloseIcon,
} from "@/icons";

// ═══════════════════════════════════════════════════════════════════════════
// LOGO COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ruta del Lanzador / Inicio.
 */
const RUTA_LANZADOR = "/inicio";

/** Tooltip común a los dos logos: dicen lo MISMO porque hacen lo mismo. */
const TOOLTIP_LANZADOR = "NECTO";

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
      Logo oficial horizontal: NECTO en rojo #FF3F1A con «grow together» a la derecha.
      - Modo normal: acento N y «grow together» en azul #190088.
      - Modo oscuro: acento N y «grow together» en blanco #FFFFFF.
    */}
    <img
      src="/images/logo/necto-full.svg"
      alt="NECTO"
      title={TOOLTIP_LANZADOR}
      className="h-7 w-auto dark:hidden"
    />
    <img
      src="/images/logo/necto-full-white.svg"
      alt="NECTO"
      title={TOOLTIP_LANZADOR}
      className="hidden h-7 w-auto dark:block"
    />
  </Link>
);

const LogoCollapsed = () => (
  <Link
    to={RUTA_LANZADOR}
    title={TOOLTIP_LANZADOR}
    aria-label="Inicio NECTO"
    className="group flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-gray-100/70 dark:hover:bg-white/5"
  >
    {/*
      Isotipo geométrico N oficial de NECTO.
      Usa viewBox 24x24 a escala size-5 (20px), alineado con el tamaño de los
      iconos de navegación del rail (h-5 w-5) para no romper la jerarquía visual.
      - Trazo principal N: rojo/naranja corporativo #FF3F1A.
      - Nodo superior: azul índigo #190088 en modo claro, blanco en modo oscuro.
    */}
    <svg
      className="size-5 transition-transform duration-200 group-hover:scale-105 select-none"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.4171 19.1921L19.5245 22.1622C18.9564 22.7461 18.0008 22.7715 17.4068 22.1622L9.16827 14.064C8.23853 13.1501 6.63731 13.7848 6.63731 15.1049V21.0453C6.63731 21.8576 5.96583 22.4923 5.16522 22.4923H1.47209C0.645653 22.4923 0 21.8322 0 21.0453V5.3819C0 5.0011 0.154957 4.62031 0.439044 4.34106L3.43487 1.39625C4.00305 0.837748 4.90696 0.837748 5.50096 1.37086L22.3654 17.1104C22.9594 17.6689 22.9852 18.5828 22.4171 19.1667V19.1921Z"
        fill="#FF3F1A"
      />
      <path
        d="M22.8045 1.92936V4.29029C22.8045 5.12803 22.0555 5.83885 21.1258 5.83885H15.3149C13.8428 5.83885 13.0938 4.21413 14.1269 3.22406L16.6062 0.863135C16.9161 0.558499 17.3551 0.406181 17.7942 0.406181H21.1258C22.0555 0.406181 22.8045 1.09161 22.8045 1.95475V1.92936Z"
        className="fill-[#190088] dark:fill-white"
      />
    </svg>
  </Link>
);

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER — pinned actions (Configuracion, Ayuda, Cerrar sesion)
// ═══════════════════════════════════════════════════════════════════════════

const SidebarFooter = observer(() => {
  const { isExpanded: showExpanded } = useSidebarContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await cerrarSesion();
    navigate("/login");
  };

  const rowClasses = `menu-item group menu-item-inactive ${
    !showExpanded ? "xl:justify-center" : "xl:justify-start"
  }`;

  return (
    <div className={`border-t border-gray-200/70 dark:border-white/5 ${showExpanded ? "pt-4 pb-6" : "pt-2 pb-1"}`}>
      <ul className={`flex flex-col ${showExpanded ? "gap-1" : "gap-1.5 items-center"}`}>
        {/* Aquí vivía un enlace «Configuración» → `/configuracion`, que por entonces
            renderizaba un `PlaceholderPage` vacío. Se retira en vez de apuntarlo a
            la página real, por dos razones: (1) duplicaba «Configuración de Módulos»
            de la sección Organización, y (2) este pie lo ve todo el mundo, mientras
            `/configuracion` exige `team.manage`. Un enlace visible que el rol no
            puede ejecutar es justo lo que el contrato manda **ocultar**. */}
        <li>
          <Link
            to="/ayuda"
            className={
              showExpanded
                ? rowClasses
                : "group flex items-center justify-center w-10 h-10 rounded-full text-gray-400 hover:text-[#190088] dark:text-gray-500 dark:hover:text-[#97D6DF] hover:bg-gray-100/70 dark:hover:bg-white/5 transition-all duration-200 hover:scale-110 active:scale-95"
            }
            title={!showExpanded ? "Ayuda" : undefined}
          >
            <span className={showExpanded ? "menu-item-icon-size menu-item-icon-inactive" : "flex items-center justify-center h-5 w-5 transition-transform duration-200 group-hover:scale-110"}>
              <InfoIcon className="h-5 w-5" />
            </span>
            {showExpanded && <span className="menu-item-text">Ayuda</span>}
          </Link>
        </li>
        <li>
          <button
            onClick={handleLogout}
            className={
              showExpanded
                ? `menu-item group text-error-700 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10 cursor-pointer ${
                    !showExpanded ? "xl:justify-center" : "xl:justify-start"
                  }`
                : "group flex items-center justify-center w-10 h-10 rounded-full text-error-700 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
            }
            title={!showExpanded ? "Cerrar sesión" : undefined}
          >
            <span className={showExpanded ? "menu-item-icon-size text-error-700 dark:text-error-400" : "flex items-center justify-center h-5 w-5 transition-transform duration-200 group-hover:scale-110"}>
              <ArrowRightIcon className="h-5 w-5" />
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
    <div className="mb-4 rounded-lg border border-brand-300 bg-brand-50 p-3 dark:border-brand-500/40 dark:bg-brand-500/10">
      {showExpanded ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Viendo como
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-gray-800 dark:text-white/90">{rol}</p>
          {nombre && (
            <p className="truncate text-xs font-normal text-gray-600 dark:text-gray-400">{nombre}</p>
          )}
          <button
            onClick={salir}
            className="mt-2 text-xs font-medium text-brand-600 underline hover:text-brand-700 dark:text-brand-400"
          >
            Salir de vista
          </button>
        </>
      ) : (
        <button
          onClick={salir}
          aria-label={`Salir de vista (${rol})`}
          className="flex w-full items-center justify-center text-brand-600 dark:text-brand-400"
          title={`Viendo como ${rol} — salir`}
        >
          <ArrowRightIcon />
        </button>
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
    { seccionId: "transportadoras", Icono: TruckDelivery },
    { seccionId: "catalogo", Icono: TableIcon },
    { seccionId: "crear", Icono: PlusIcon },
    { seccionId: "chats", Icono: ChatIcon },
    { seccionId: "analitica", Icono: PieChartIcon },
    { seccionId: "configuracion", Icono: PlugInIcon },
    { seccionId: "operadores", Icono: GroupIcon },
  ],
  inventarios: [
    { seccionId: "dashboard", Icono: GridIcon },
    { seccionId: "articulos", Icono: TableIcon },
    { seccionId: "movimientos", Icono: ArrowRightIcon },
    { seccionId: "ordenes_compra", Icono: CartIcon },
    { seccionId: "reorden", Icono: TaskIcon },
    { seccionId: "conteos", Icono: ListIcon },
    { seccionId: "proveedores", Icono: GroupIcon },
    { seccionId: "admin", Icono: PlugInIcon },
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

/**
 * Cuenta junto a una sección SOLO cuando es una cola que pide acción y su
 * sustantivo se entiende por la etiqueta: «Cola de reorden 11» son artículos
 * por reponer; «Toma de inventario 2», tomas abiertas. Ninguna otra sección
 * lleva número: un contador en todo deja de señalar nada.
 */
function cuentaDeSeccion(modulo: Modulo, seccionId: string): number | undefined {
  if (modulo !== "inventarios") return undefined;
  if (seccionId === "reorden") return inventarioStore.colaReorden.length;
  if (seccionId === "conteos") return inventarioStore.resumen.conteosAbiertos;
  return undefined;
}

const BANNER_MODULO_CONFIG: Record<
  string,
  {
    titulo: string;
    Icono: React.ComponentType<{ className?: string }>;
    marcaAgua: React.ReactNode;
  }
> = {
  pedidos: {
    titulo: "Ventas",
    Icono: CartIcon,
    marcaAgua: (
      <svg viewBox="0 0 100 80" fill="none" className="w-24 h-20 opacity-25 dark:opacity-10 stroke-current text-gray-400 dark:text-white">
        <path d="M10 70 L50 20 L90 50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="50" cy="20" r="8" strokeWidth="2" />
        <circle cx="90" cy="50" r="5" strokeWidth="2" />
      </svg>
    ),
  },
  inventarios: {
    titulo: "Inventario",
    Icono: BoxCubeIcon,
    marcaAgua: (
      <svg viewBox="0 0 100 80" fill="none" className="w-24 h-20 opacity-25 dark:opacity-10 stroke-current text-gray-400 dark:text-white">
        <path d="M50 15 L85 35 L50 55 L15 35 Z" strokeWidth="2" strokeLinejoin="round" />
        <path d="M15 35 L15 65 L50 85 L50 55" strokeWidth="2" strokeLinejoin="round" />
        <path d="M85 35 L85 65 L50 85" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    ),
  },
  organizacion: {
    titulo: "Organización",
    Icono: Cog6ToothIcon,
    marcaAgua: (
      <svg viewBox="0 0 100 80" fill="none" className="w-24 h-20 opacity-25 dark:opacity-10 stroke-current text-gray-400 dark:text-white">
        <circle cx="65" cy="40" r="28" strokeWidth="2" strokeDasharray="4 3" />
        <circle cx="65" cy="40" r="14" strokeWidth="2" />
      </svg>
    ),
  },
};

const SidebarContent = observer(() => {
  const { pathname, search } = useLocation();
  const { isExpanded: showExpanded } = useSidebarContext();
  const isActive = (path: string) => pathname === path;
  const hayTareasPendientes = organizacionStore.modulosActivos.length === 0;

  const puedeVerSeccion = (modulo: Modulo, seccionId: string) =>
    sessionStore.puedeVerSeccion(modulo, seccionId);
  const puedeGestionarEquipo = sessionStore.hasPermission("team.manage");
  const puedeVerCanales = sessionStore.hasPermission("channels.read");
  const puedeGestionarCanales = sessionStore.hasPermission("channels.manage");
  const esRutaCanales = (path: string) => pathname === path || pathname.startsWith(`${path}/`) || pathname.startsWith(`${path}?`);
  const esRutaConHijas = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  /**
   * Cada entrada del grupo «Organización» marca su propia ruta.
   *
   * `esRutaConHijas` y no una igualdad estricta porque las dos gobiernan
   * subrutas reales: `/equipo/:id` es el perfil de una persona y se abre desde
   * la tabla de equipo. Sin cubrirla, el ítem se apagaría justo mientras estás
   * dentro de lo que gobierna, que es la forma más barata de que el sidebar
   * parezca roto.
   */
  const esRutaConfiguracion = (path: string) => esRutaConHijas(path);
  const esRutaEquipo = (path: string) => esRutaConHijas(path);

  /**
   * Pestaña activa del hub de Configuraciones (`?tab=general|modulos|canales|apariencia`).
   *
   * El flyout de «Organización» en modo rail lista las cuatro tarjetas del hub
   * como accesos directos: antes tenía un solo ítem, «Configuraciones», que abría
   * el hub y devolvía al usuario al mismo nombre que acababa de pulsar, con las
   * cuatro opciones un clic más adentro. Ahora cada ítem entra directo a su
   * pestaña y se marca el que está abierto.
   *
   * `null` cuando se está en el hub sin pestaña: ahí no hay ninguna marcada,
   * porque el hub es el índice de las cuatro.
   */
  const tabConfigActual = new URLSearchParams(search).get("tab");



  const [colapsados, setColapsados] = useState<Record<string, boolean>>(() => {
    try {
      const guardado = localStorage.getItem("sidebar_secciones_colapsadas");
      return guardado ? JSON.parse(guardado) : {};
    } catch {
      return {};
    }
  });

  const [flyoutModulo, setFlyoutModulo] = useState<string | null>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  // Cerrar flyout al cambiar de ruta, al expandir la barra, o con Escape
  useEffect(() => {
    setFlyoutModulo(null);
  }, [pathname, showExpanded]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFlyoutModulo(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Cerrar flyout al hacer click en cualquier parte fuera del submenú
  useEffect(() => {
    if (!flyoutModulo) return;

    const handleClickOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        flyoutRef.current &&
        !flyoutRef.current.contains(target) &&
        railRef.current &&
        !railRef.current.contains(target)
      ) {
        setFlyoutModulo(null);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [flyoutModulo]);

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

  const bannerConfig = flyoutModulo ? BANNER_MODULO_CONFIG[flyoutModulo] : null;

  return (
    <nav className={`flex flex-col ${showExpanded ? "flex-1" : "flex-initial"}`}>
      <SimulacionBanner />

      {/* FLYOUT SUBMENU PANEL (Flotante a la derecha del rail contraído) */}
      {!showExpanded && flyoutModulo && (
        <div
          ref={flyoutRef}
          className="fixed left-[72px] xl:left-[76px] top-1/2 -translate-y-1/2 z-50 w-72 rounded-3xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/90 dark:border-gray-800 shadow-2xl p-3 flex flex-col gap-1.5 animate-flyout-lateral"
        >
          {/* Tarjeta Banner representativa del módulo */}
          {bannerConfig && (
            <div className="relative overflow-hidden rounded-2xl bg-[#F6F7F9] dark:bg-gray-800/70 border border-gray-200/60 dark:border-gray-700/60 p-4 mb-1">
              {/* Gráfico decorativo de fondo */}
              <div className="absolute right-0 bottom-0 pointer-events-none translate-x-2 translate-y-1">
                {bannerConfig.marcaAgua}
              </div>

              {/* Botón Cerrar */}
              <button
                type="button"
                onClick={() => setFlyoutModulo(null)}
                className="absolute top-2.5 right-2.5 p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-10 cursor-pointer"
                title="Cerrar submenú"
              >
                <CloseIcon className="h-4 w-4" />
              </button>

              {/* Contenido del banner: Icono y Nombre */}
              <div className="relative z-1 flex flex-col gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 shadow-2xs border border-black/5 dark:border-white/10 flex items-center justify-center text-gray-900 dark:text-white">
                  <bannerConfig.Icono className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
                    {bannerConfig.titulo}
                  </h3>
                </div>
              </div>
            </div>
          )}

          {/* Lista de opciones del flyout */}
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto no-scrollbar py-1 flex flex-col gap-0.5">
            {flyoutModulo === "organizacion" ? (
              TARJETAS_CONFIG.map(({ key, label, icono: Icono }) => {
                const active = esRutaConfiguracion("/configuracion") && tabConfigActual === key;
                return (
                  <Link
                    key={key}
                    to={`/configuracion?tab=${key}`}
                    onClick={() => setFlyoutModulo(null)}
                    className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? "bg-gray-100 dark:bg-white/10 font-bold text-gray-900 dark:text-white"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`text-base transition-transform duration-150 group-hover:scale-110 ${
                        active ? "text-brand-500" : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      <Icono className="size-5" />
                    </span>
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })
            ) : (
              ITEMS_MODULO[flyoutModulo as Modulo]
                ?.flatMap(({ seccionId, Icono }) => {
                  const seccion = seccionDe(flyoutModulo as Modulo, seccionId);
                  if (!seccion || !puedeVerSeccion(flyoutModulo as Modulo, seccionId)) return [];
                  return [{ seccionId, Icono, seccion }];
                })
                .map(({ seccionId, Icono, seccion }) => {
                  const active = isActive(seccion.path);
                  return (
                    <Link
                      key={seccionId}
                      to={seccion.path}
                      onClick={() => setFlyoutModulo(null)}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? "bg-gray-100 dark:bg-white/10 font-bold text-gray-900 dark:text-white"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <span className={`text-base transition-transform duration-150 group-hover:scale-110 ${active ? "text-brand-500" : "text-gray-500 dark:text-gray-400"}`}>
                        <Icono />
                      </span>
                      <span className="truncate">{seccion.label}</span>
                    </Link>
                  );
                })
            )}
          </div>
        </div>
      )}

      {showExpanded ? (
        <div className="flex flex-col gap-5">
          {/* Opción Inicio / Tareas */}
          <div>
            <ul className="flex flex-col gap-1">
              <MenuItem
                icon={
                  <div className="relative flex items-center justify-center">
                    <HomeIcon className="h-5 w-5" />
                    {hayTareasPendientes && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2" title="Tareas pendientes">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF3F1A] shadow-[0_0_8px_#FF3F1A] ring-1.5 ring-white dark:ring-gray-900" />
                      </span>
                    )}
                  </div>
                }
                name="Inicio"
                path="/inicio"
                isActive={isActive}
              />
            </ul>
          </div>

          {/* Módulos de negocio — modo barra expandida */}
          {modulosOperablesDeSesion(organizacionStore.modulosActivos).map((modulo) => {
            const visibles = ITEMS_MODULO[modulo].flatMap(({ seccionId, Icono }) => {
              const seccion = seccionDe(modulo, seccionId);
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
                        cuenta={cuentaDeSeccion(modulo, seccionId)}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}



          {/* Organización — modo barra expandida */}
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
                    icon={<Cog6ToothIcon className="size-5" />}
                    name="Configuraciones"
                    path="/configuracion"
                    isActive={esRutaConfiguracion}
                  />
                </ul>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* RAIL MODE: En barra contraída, solo los iconos principales de cada módulo, centrados verticalmente */
        <div ref={railRef} className="flex flex-col items-center justify-center gap-2.5 w-full py-1">
          {/* Botón Inicio en Rail Mode */}
          <Link
            to="/inicio"
            title={hayTareasPendientes ? "Inicio · Tareas pendientes" : "Inicio"}
            aria-label="Inicio"
            className={`group relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ease-out hover:scale-110 active:scale-95 cursor-pointer ${
              isActive("/inicio")
                ? "text-brand-500 bg-brand-50 dark:bg-brand-500/15 dark:text-brand-400 scale-105"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-white/5"
            }`}
          >
            <span className="h-5 w-5 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
              <HomeIcon className="h-5 w-5" />
            </span>
            {hayTareasPendientes && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF3F1A] shadow-[0_0_8px_#FF3F1A] ring-1.5 ring-white dark:ring-gray-900" />
              </span>
            )}
          </Link>

          {modulosOperablesDeSesion(organizacionStore.modulosActivos).map((modulo) => {
            const info = CATALOGO_MODULOS[modulo];
            const isActivo = pathname.startsWith(`/${modulo}`);
            const isOpen = flyoutModulo === modulo;
            const IconoModulo = modulo === "inventarios" ? BoxCubeIcon : CartIcon;

            return (
              <button
                key={modulo}
                type="button"
                title={info.nombreCorto}
                aria-label={info.nombreCorto}
                onClick={() => setFlyoutModulo(isOpen ? null : modulo)}
                className={`group flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ease-out hover:scale-110 active:scale-95 cursor-pointer ${
                  isActivo || isOpen
                    ? "text-brand-500 bg-brand-50 dark:bg-brand-500/15 dark:text-brand-400 scale-105"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-white/5"
                }`}
              >
                <span className="h-5 w-5 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                  <IconoModulo className="h-5 w-5" />
                </span>
              </button>
            );
          })}

          {puedeGestionarEquipo && (
            <button
              type="button"
              title="Organización"
              aria-label="Organización"
              onClick={() => setFlyoutModulo(flyoutModulo === "organizacion" ? null : "organizacion")}
              className={`group flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ease-out hover:scale-110 active:scale-95 cursor-pointer ${
                (pathname.startsWith("/configuracion") || pathname.startsWith("/equipo")) || flyoutModulo === "organizacion"
                  ? "text-brand-500 bg-brand-50 dark:bg-brand-500/15 dark:text-brand-400 scale-105"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-white/5"
              }`}
            >
              <span className="h-5 w-5 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Cog6ToothIcon className="h-5 w-5" />
              </span>
            </button>
          )}
        </div>
      )}

      <div className={showExpanded ? "mt-auto" : "mt-2"}>
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
