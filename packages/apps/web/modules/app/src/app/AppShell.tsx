import { Outlet, useLocation } from "react-router";
import { observer } from "mobx-react-lite";
import { 
  BaseAppShell, 
  BaseAppHeader, 
  ToggleAppSidebar,
} from "@/shell";
import { ThemeToggleButton } from "@/shell";
import ModuleSwitcher from "@/shell/header/ModuleSwitcher";
import NotificationDropdown from "@/shell/header/NotificationDropdown";
import UserDropdown from "@/shell/header/UserDropdown";
import { AppSidebar } from "@/app/AppSidebar";
import { AppFooter } from "@/shell/footer";
import { sessionStore } from "@/stores";
import { operadorSimuladoNombre, rolSimuladoNombre } from "@/stores/acceso.utils";
import { inicialesDe } from "@/utils";

// ═══════════════════════════════════════════════════════════════════════════
// HEADER ICONS
// ═══════════════════════════════════════════════════════════════════════════

const NotificationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

const UserIconOutline = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// APP HEADER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Chip de identidad de "Viendo como". Se muestra en el header en TODAS las
 * vistas mientras se simula un operador.
 *
 * ── Qué grita el chip ────────────────────────────────────────────────────
 *
 * El **nombre del rol asignado** es la línea destacada, no el nombre de la
 * persona. El motivo es que el chip responde a una sola pregunta —«¿bajo qué
 * autoridad estoy viendo la app?»— y el nombre de un operador no la contesta:
 * «Mateo Vargas» no predice qué botones vas a poder pulsar, «Operador» sí
 * (0 capacidades de las 18 son de equipo). Y en modo simulación **toda** la
 * diferencia entre lo que ves ahora y lo que veías hace un segundo es el rol.
 *
 * El nombre del operador no se pierde: queda como línea secundaria, porque
 * identifica la sesión ante un tercero y desambigua dos operadores que
 * compartan rol. Antes era la única línea —informaba de quién, no de qué.
 *
 * El nombre del rol se resuelve en la capa de presentación
 * (`acceso.utils.rolSimuladoNombre`): el `AccessContext` es solo autorización
 * y no lleva datos de presentación (contrato §1.8; C6).
 *
 * ── Por qué no usa `op.avatarUrl` ────────────────────────────────────────
 *
 * El chip usaba iniciales derivadas del nombre. El modelo SÍ tiene
 * `avatarUrl` (Seed d0–d3), así que el `Avatar` de la casa iría aquí — pero
 * el chip es una píldora de 7×7 con `rounded-full` y el `Avatar` se
 * autoenvuelve en otro `relative rounded-full shrink-0`, de modo que el
 * `bg-brand-500` que identificaba la superficie dejaría de verse. Es una
 * mejora real, no un cambio de una línea: va anotada como deuda abierta en
 * `informe-dashboard-inicio-por-rol.md` §8, no metida a escondidas aquí.
 */
const OperadorChip = observer(() => {
  const op = sessionStore.operadorSimulado;
  if (!op) return null;

  // Derivadas del nombre; con «(Tú)» el helper del repo devuelve «TT».
  const iniciales = inicialesDe(op.nombre);
  const rol = rolSimuladoNombre() ?? "Sin rol";

  return (
    <div className="flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 py-1 pl-1 pr-3 dark:border-brand-500/30 dark:bg-brand-500/10">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
        {iniciales}
      </span>
      {/* Contenedor estrecho: en el header de 68 px caben dos líneas de 10 y
          12 px, pero una tercera no. Por eso la etiqueta, el rol y el
          operador entran en un `title` en vez de en un tercer renglón. */}
      <div
        className="hidden leading-tight sm:block"
        title={`Viendo como ${rol} — ${operadorSimuladoNombre()}`}
      >
        <p className="text-[10px] font-medium uppercase tracking-wide text-brand-500 dark:text-brand-400">Viendo como</p>
        <p className="text-xs font-semibold text-gray-800 dark:text-white/90">
          {rol}
          <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">
            · {operadorSimuladoNombre()}
          </span>
        </p>
      </div>
    </div>
  );
});

const AppHeader = observer(() => (
  <BaseAppHeader
    leftContent={
      <div className="flex items-center gap-4">
        <ToggleAppSidebar />
        {/* Selector rápido de módulo, alineado a la izquierda. Se monta AQUÍ y
            no dentro de `BaseAppHeader`: ese componente también lo usa
            `ModulosPage`, la pantalla que ES el lanzador, donde "cambiar de
            módulo" no significaría nada. */}
        <ModuleSwitcher />
        <OperadorChip />
      </div>
    }
  >
    <div className="flex items-center gap-2.5 sm:gap-3">
      <ThemeToggleButton />
      <NotificationDropdown />
      <UserDropdown />
    </div>
  </BaseAppHeader>
));

// ═══════════════════════════════════════════════════════════════════════════
// APP SHELL - Clean layout wrapper for new applications
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AppShell is a minimal layout wrapper for new applications.
 * It provides a clean sidebar and header, ready to be customized.
 * 
 * For a full-featured demo with TailAdmin-style menu, see `demo/DemoShell`.
 * 
 * Usage in App.tsx:
 * ```tsx
 * <Routes>
 *   <Route element={<AppShell />}>
 *     <Route path="/" element={<Dashboard />} />
 *     <Route path="/users" element={<Users />} />
 *   </Route>
 * </Routes>
 * ```
 * @kgId 6886ae306c98
 */
export const AppShell = () => {
  const location = useLocation();

  // ── ¿Cuándo el contenido va a sangre? ─────────────────────────────────────
  //
  // `/asistente` es el chat: una superficie de conversación que ocupa el panel
  // entero y trae su propio scroll, así que NO se envuelve en `.necto-panel`.
  //
  // `/asistente/config` sí. Con `startsWith("/asistente")` a secas, TODA la rama
  // del asistente —incluida su pantalla de configuración— se quedaba sin panel:
  // sin fondo, sin anillo, sin `animate-aparecer` y, sobre todo, sin el `p-6`.
  // Medido con CDP: su cabecera caía en (314, 124) donde `/configuracion`,
  // `/pedidos/config` y `/conversaciones/config` la tienen en (338, 148) — 24 px
  // arriba y 24 px a la izquierda, exactamente el padding que faltaba. Era la
  // única de las cuatro que no encajaba.
  const esChatAsistente =
    location.pathname.startsWith("/asistente") &&
    !location.pathname.startsWith("/asistente/config");

  const esChatConversaciones =
    location.pathname === "/conversaciones" ||
    location.pathname === "/conversaciones/";

  const esPantallaChat = esChatAsistente || esChatConversaciones;

  return (
    <BaseAppShell
      sidebar={<AppSidebar />}
      header={<AppHeader />}
      footer={esPantallaChat ? undefined : <AppFooter />}
      noCard={esChatAsistente}
      pantallaFija={esChatConversaciones}
    >
      <Outlet />
    </BaseAppShell>
  );
};

export default AppShell;
