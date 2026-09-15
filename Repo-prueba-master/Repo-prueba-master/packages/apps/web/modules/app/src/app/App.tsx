import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router";
import { queuesStore } from "@/stores";
import { AppShell } from "@/app/AppShell";
import { DashboardPage } from "@/pages/dashboard";
import { TurnosPage } from "@/pages/turnos";
import { ColasPage } from "@/pages/colas";
import { RecepcionPage } from "@/pages/recepcion";
import { SurveyPage } from "@/pages/survey";
import { EncuestasPage } from "@/pages/encuestas";
import { DisplayScreen } from "@/pages/display";
import { AgendaPage, ProfesionalesPage, CalendarioPage, CitaDetallePage, CrearCitaPage, AnaliticaPage } from "@/pages/agendamiento";
import { SeleccionarPage } from "@/pages/seleccionar";
import { OperadorRegistroPage } from "@/pages/operador";
import { OperadoresTurnosPage, OperadoresAgendamientoPage } from "@/pages/operadores";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import SignInForm from "@/pages/auth/sign-in";
import SignUpForm from "@/pages/auth/sign-up";
import ResetPasswordForm from "@/pages/auth/reset-password";
import { AuthPageLayout } from "@/layouts/auth";

/**
 * App - Clean starter application with minimal shell
 * 
 * This is the clean version for starting new applications.
 * Run with: npm run dev
 * 
 * For the full-featured demo, run: npm run demo
 * 
 * @agents Arquitectura de Rutas
 * 
 * Este archivo define todas las rutas de la aplicación. Las rutas se organizan
 * en dos categorías:
 * 
 * ## 1. Rutas con Shell
 * 
 * Las rutas que comparten el layout común (sidebar + header) van dentro de
 * `<Route element={<AppShell />}>`. El shell renderiza las rutas hijas usando
 * `<Outlet />`.
 * 
 * ```tsx
 * <Route element={<AppShell />}>
 *   <Route path="/" element={<Dashboard />} />
 *   <Route path="/users" element={<Users />} />
 *   <Route path="/settings" element={<Settings />} />
 * </Route>
 * ```
 * 
 * Para agregar una nueva página con shell:
 * 1. Crear el componente en `src/pages/`
 * 2. Importarlo aquí
 * 3. Agregar `<Route path="/ruta" element={<Componente />} />` dentro del shell
 * 4. Actualizar el menú en `AppSidebar.tsx`
 * 
 * ## 2. Rutas Standalone
 * 
 * Las rutas que NO usan el shell van fuera. Útil para:
 * - Login/Registro
 * - Landing pages
 * - Páginas de error
 * - Cualquier página con layout diferente
 * 
 * ```tsx
 * <Route path="/login" element={<LoginPage />} />
 * ```
 * 
 * ## Múltiples Shells (Micrositios)
 * 
 * Si necesitas diferentes layouts para diferentes secciones:
 * 
 * ```tsx
 * <Routes>
 *   <Route element={<AdminShell />}>
 *     <Route path="/admin/*" element={...} />
 *   </Route>
 *   <Route element={<PublicShell />}>
 *     <Route path="/public/*" element={...} />
 *   </Route>
 * </Routes>
 * ```
 * 
 * Ver `demo/DemoApp.tsx` para un ejemplo completo con documentación extendida.
 * 
 * ## Archivos Relacionados
 * 
 * - `AppShell.tsx` - Layout wrapper (sidebar + header + Outlet)
 * - `AppSidebar.tsx` - Menú de navegación (personalizar aquí)
 * - `../pages/` - Componentes de página
 * @kgId d91162d0d213
 */
export default function App() {
  // Load queues from the backend once on startup (falls back to local data).
  useEffect(() => {
    queuesStore.loadQueues();
  }, []);

  return (
    <Routes>
      {/* ════════════════════════════════════════════════════════════════════
          RUTAS CON SHELL
          Páginas que comparten el layout AppShell (sidebar + header)
          ════════════════════════════════════════════════════════════════════ */}
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/turnos" element={<TurnosPage />} />
        <Route path="/recepcion" element={<RecepcionPage />} />
        <Route path="/colas" element={<ColasPage />} />
        <Route path="/encuestas" element={<EncuestasPage />} />
        <Route path="/turnos/operadores" element={<OperadoresTurnosPage />} />
        <Route path="/agendamiento" element={<AgendaPage />} />
        <Route path="/agendamiento/profesionales" element={<ProfesionalesPage />} />
        <Route path="/agendamiento/calendario" element={<CalendarioPage />} />
        <Route path="/agendamiento/detalles" element={<CitaDetallePage />} />
        <Route path="/agendamiento/crear" element={<CrearCitaPage />} />
        <Route path="/agendamiento/analitica" element={<AnaliticaPage />} />
        <Route path="/agendamiento/operadores" element={<OperadoresAgendamientoPage />} />
        <Route path="/configuracion" element={<PlaceholderPage title="Configuracion" />} />
        <Route path="/ayuda" element={<PlaceholderPage title="Ayuda" />} />
      </Route>

      {/* ════════════════════════════════════════════════════════════════════
          RUTAS STANDALONE
          Páginas sin shell - tienen su propio layout completo
          ════════════════════════════════════════════════════════════════════ */}
      <Route path="/seleccionar" element={<SeleccionarPage />} />
      <Route path="/operador/registro" element={<OperadorRegistroPage />} />
      <Route path="/display" element={<DisplayScreen />} />
      <Route path="/s/:token" element={<SurveyPage />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/register" element={<AuthPageLayout><SignUpForm /></AuthPageLayout>} />
      <Route path="/forgot-password" element={<AuthPageLayout><ResetPasswordForm /></AuthPageLayout>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
