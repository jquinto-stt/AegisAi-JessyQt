import { Outlet } from "react-router";
import { observer } from "mobx-react-lite";
import { 
  BaseAppShell, 
  BaseAppHeader, 
  ToggleAppSidebar,
} from "@/shell";
import { ThemeToggleButton } from "@/shell";
import { AppSidebar } from "@/app/AppSidebar";
import { AppFooter } from "@/shell/footer";
import { sessionStore } from "@/stores";

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
 * vistas mientras se simula un operador, para dejar claro bajo qué perfil se
 * está viendo la app.
 *
 * El nombre se lee del store de operadores por `operadorSimuladoId`: el
 * `AccessContext` es solo autorización y no lleva datos de presentación
 * (contrato §1.8).
 */
const OperadorChip = observer(() => {
  const op = sessionStore.operadorSimulado;
  if (!op) return null;

  const iniciales = op.nombre
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 py-1 pl-1 pr-3 dark:border-brand-500/30 dark:bg-brand-500/10">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
        {iniciales}
      </span>
      <div className="hidden leading-tight sm:block">
        <p className="text-[10px] font-medium uppercase tracking-wide text-brand-500 dark:text-brand-400">Viendo como</p>
        <p className="text-xs font-semibold text-gray-800 dark:text-white/90">{op.nombre}</p>
      </div>
    </div>
  );
});

const AppHeader = observer(() => (
  <BaseAppHeader
    leftContent={
      <div className="flex items-center gap-4">
        <ToggleAppSidebar />
        <OperadorChip />
      </div>
    }
  >
    <div className="flex items-center gap-2">
      <button className="flex h-10 w-10 items-center justify-center rounded-full text-secondary-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
        <NotificationIcon />
      </button>
      <button className="flex h-10 w-10 items-center justify-center rounded-full text-secondary-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
        <UserIconOutline />
      </button>
      <ThemeToggleButton />
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
  return (
    <BaseAppShell
      sidebar={<AppSidebar />}
      header={<AppHeader />}
      footer={<AppFooter />}
    >
      <Outlet />
    </BaseAppShell>
  );
};

export default AppShell;
