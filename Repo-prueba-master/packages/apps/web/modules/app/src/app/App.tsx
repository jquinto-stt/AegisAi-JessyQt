import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router";
import { observer } from "mobx-react-lite";
import { queuesStore, sessionStore } from "@/stores";
import { AppShell } from "@/app/AppShell";
import { DashboardPage, OperadorInicioTurnos } from "@/pages/dashboard";
import { TurnosPage } from "@/pages/turnos";
import { ColasPage } from "@/pages/colas";
import { RecepcionPage } from "@/pages/recepcion";
import { SurveyPage } from "@/pages/survey";
import { EncuestasPage, EncuestaCompartir } from "@/pages/encuestas";
import { DisplayScreen } from "@/pages/display";
import { AgendaPage, ProfesionalesPage, CalendarioPage, CitaDetallePage, CrearCitaPage, AnaliticaPage } from "@/pages/agendamiento";
import { TableroPage, CrearPedidoPage, InicioPage as PedidosInicioPage, HistorialPage as PedidosHistorialPage, ConfigPage as PedidosConfigPage } from "@/pages/pedidos";
import { SeleccionarPage } from "@/pages/seleccionar";
import { SimuladorWhatsApp } from "@/pages/simulador";
import { OperadorRegistroPage, OperadorLoginPage } from "@/pages/operador";
import { OperadoresTurnosPage, OperadoresAgendamientoPage, OperadoresPedidosPage } from "@/pages/operadores";
import { SeccionGuard } from "@/app/SeccionGuard";
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

/**
 * InicioTurnos — decide qué "Inicio" mostrar en /dashboard:
 * - Operador simulado en Turnos → su inicio personal (OperadorInicioTurnos).
 * - Cualquier otro caso (admin) → el panel de control completo (DashboardPage).
 */
const InicioTurnos = observer(() => {
  const op = sessionStore.operadorSimulado;
  if (op && op.modulo === "turnos") return <OperadorInicioTurnos />;
  return <DashboardPage />;
});

/**
 * Encuestas — decide qué vista mostrar en /encuestas:
 * - Operador simulado → solo el apartado para compartir el link (EncuestaCompartir).
 * - Admin → la vista completa con estadísticas y configuración (EncuestasPage).
 */
const Encuestas = observer(() => {
  if (sessionStore.isSimulando) return <EncuestaCompartir />;
  return <EncuestasPage />;
});

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
        {/* Turnos — protegidas por SeccionGuard en modo simulación */}
        <Route path="/dashboard" element={<SeccionGuard seccion="inicio"><InicioTurnos /></SeccionGuard>} />
        <Route path="/turnos" element={<SeccionGuard seccion="turnos"><TurnosPage /></SeccionGuard>} />
        <Route path="/recepcion" element={<SeccionGuard seccion="recepcion"><RecepcionPage /></SeccionGuard>} />
        <Route path="/colas" element={<SeccionGuard seccion="colas"><ColasPage /></SeccionGuard>} />
        <Route path="/encuestas" element={<SeccionGuard seccion="encuestas"><Encuestas /></SeccionGuard>} />
        {/* Agendamiento — protegidas por SeccionGuard en modo simulación */}
        <Route path="/agendamiento" element={<SeccionGuard seccion="agenda"><AgendaPage /></SeccionGuard>} />
        <Route path="/agendamiento/profesionales" element={<SeccionGuard seccion="profesionales"><ProfesionalesPage /></SeccionGuard>} />
        <Route path="/agendamiento/calendario" element={<SeccionGuard seccion="calendario"><CalendarioPage /></SeccionGuard>} />
        <Route path="/agendamiento/detalles" element={<SeccionGuard seccion="agenda"><CitaDetallePage /></SeccionGuard>} />
        <Route path="/agendamiento/crear" element={<SeccionGuard seccion="crear"><CrearCitaPage /></SeccionGuard>} />
        <Route path="/agendamiento/analitica" element={<SeccionGuard seccion="analitica"><AnaliticaPage /></SeccionGuard>} />
        {/* Pedidos — protegidas por SeccionGuard en modo simulación */}
        <Route path="/pedidos/inicio" element={<SeccionGuard seccion="inicio"><PedidosInicioPage /></SeccionGuard>} />
        <Route path="/pedidos" element={<SeccionGuard seccion="tablero"><TableroPage /></SeccionGuard>} />
        <Route path="/pedidos/crear" element={<SeccionGuard seccion="crear"><CrearPedidoPage /></SeccionGuard>} />
        <Route path="/pedidos/historial" element={<SeccionGuard seccion="historial"><PedidosHistorialPage /></SeccionGuard>} />
        <Route path="/pedidos/config" element={<SeccionGuard seccion="configuracion"><PedidosConfigPage /></SeccionGuard>} />
        {/* Solo admin — un operador simulado nunca tiene esta "sección", así que
            SeccionGuard muestra el aviso de sin acceso si intenta entrar por URL */}
        <Route path="/turnos/operadores" element={<SeccionGuard seccion="__solo_admin__"><OperadoresTurnosPage /></SeccionGuard>} />
        <Route path="/agendamiento/operadores" element={<SeccionGuard seccion="__solo_admin__"><OperadoresAgendamientoPage /></SeccionGuard>} />
        <Route path="/pedidos/operadores" element={<SeccionGuard seccion="__solo_admin__"><OperadoresPedidosPage /></SeccionGuard>} />
        <Route path="/configuracion" element={<PlaceholderPage title="Configuracion" />} />
        <Route path="/ayuda" element={<PlaceholderPage title="Ayuda" />} />
      </Route>

      {/* ════════════════════════════════════════════════════════════════════
          RUTAS STANDALONE
          Páginas sin shell - tienen su propio layout completo
          ════════════════════════════════════════════════════════════════════ */}
      <Route path="/seleccionar" element={<SeleccionarPage />} />
      <Route path="/operador/registro" element={<OperadorRegistroPage />} />
      <Route path="/operador/login" element={<OperadorLoginPage />} />
      <Route path="/wa" element={<SimuladorWhatsApp />} />
      <Route path="/display" element={<DisplayScreen />} />
      <Route path="/s/:token" element={<SurveyPage />} />
      <Route path="/login" element={<AuthPageLayout><SignInForm /></AuthPageLayout>} />
      <Route path="/register" element={<AuthPageLayout><SignUpForm /></AuthPageLayout>} />
      <Route path="/forgot-password" element={<AuthPageLayout><ResetPasswordForm /></AuthPageLayout>} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
