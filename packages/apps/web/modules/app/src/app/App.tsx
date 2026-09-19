import { Routes, Route, Navigate, useParams } from "react-router";
import { observer } from "mobx-react-lite";
import { sessionStore, plataformaStore } from "@/stores";
import { AppShell } from "@/app/AppShell";
import {
  TableroPage,
  CrearPedidoPage,
  InicioPage as PedidosInicioPage,
  HistorialPage as PedidosHistorialPage,
  AnaliticaPage as PedidosAnaliticaPage,
  ConfigPage as PedidosConfigPage,
} from "@/pages/pedidos";
import { EquipoPage, PerfilOperadorPage, ConfiguracionModulosPage } from "@/pages/equipo";
import { SeleccionarPage } from "@/pages/seleccionar";
import { AsistentePage, AsistenteConfigPage } from "@/pages/asistente";
import { ConversacionesPage, HistorialAtencionPage, ConversacionesConfigPage } from "@/pages/conversaciones";
import { SimuladorWhatsApp } from "@/pages/simulador";
import { OperadorRegistroPage } from "@/pages/operador";
import { RequireSession } from "@/app/RequireSession";
import { CapabilityGuard } from "@/app/CapabilityGuard";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import SupportPage from "@/pages/SupportPage";
import HelpPage from "@/pages/HelpPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import CookiesPage from "@/pages/CookiesPage";
import WorkspacesPage from "@/pages/WorkspacesPage";
import {
  PerfilOnboardingPage,
  OrganizacionOnboardingPage,
  OnboardingModulosPage,
  PedidosOnboardingPage,
  EncuestaOnboardingPage,
} from "@/pages/onboarding";
import ProfilePage from "@/pages/ProfilePage";
import { bootstrapAssistant } from "@/assistant/bootstrap";

// Cablea el asistente ("Necto Intelligence") una sola vez al cargar el módulo de
// rutas, antes de la primera pregunta. `bootstrapAssistant` es idempotente.
bootstrapAssistant();

const RedireccionViendoComo = () => (
  <Navigate
    to={sessionStore.hasPermission("team.manage") ? "/equipo" : "/seleccionar"}
    replace
  />
);

const LegacyEquipoIdRedirect = () => {
  const { id } = useParams();
  return <Navigate to={id ? `/equipo/${id}` : "/equipo"} replace />;
};

/** Guarda de plataforma: si la organización tiene el módulo o plugin apagado, redirige a configuración. */
const ModuloGuard = observer(({ modulo, children }: { modulo: string; children: React.ReactNode }) => {
  if (!plataformaStore.estaActivo(modulo)) {
    return <Navigate to="/organizacion/configuracion" replace />;
  }
  return <>{children}</>;
});

export default function App() {
  return (
    <Routes>
      {/* Rutas con Shell */}
      <Route element={<RequireSession><AppShell /></RequireSession>}>
        {/* Módulo Pedidos (condicionado a que esté activo en plataforma) */}
        <Route path="/pedidos/inicio" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="orders.read"><PedidosInicioPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/pedidos" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="orders.read"><TableroPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/pedidos/crear" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="orders.create"><CrearPedidoPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/pedidos/historial" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="orders.read"><PedidosHistorialPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/pedidos/analitica" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="orders.read"><PedidosAnaliticaPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/pedidos/config" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="settings.read"><PedidosConfigPage /></CapabilityGuard></ModuloGuard>} />

        {/* Organización / Equipo y Roles / Centro de Módulos (Transversal) */}
        <Route path="/equipo" element={<CapabilityGuard capacidad="team.manage"><EquipoPage /></CapabilityGuard>} />
        <Route path="/equipo/:id" element={<CapabilityGuard capacidad="team.manage"><PerfilOperadorPage /></CapabilityGuard>} />
        <Route path="/organizacion/configuracion" element={<CapabilityGuard capacidad="team.manage"><ConfiguracionModulosPage /></CapabilityGuard>} />
        <Route path="/organizacion/modulos" element={<Navigate to="/organizacion/configuracion" replace />} />

        {/* Redirecciones legacy para compatibilidad */}
        <Route path="/pedidos/equipo" element={<Navigate to="/equipo" replace />} />
        <Route path="/pedidos/equipo/:id" element={<LegacyEquipoIdRedirect />} />
        <Route path="/pedidos/operadores" element={<Navigate to="/equipo" replace />} />

        {/* Plugin Necto IA */}
        <Route path="/asistente" element={<ModuloGuard modulo="asistente"><CapabilityGuard capacidad="assistant.use"><AsistentePage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/asistente/config" element={<ModuloGuard modulo="asistente"><CapabilityGuard capacidad="assistant.use"><AsistenteConfigPage /></CapabilityGuard></ModuloGuard>} />

        {/* Plugin Canales WhatsApp */}
        <Route path="/conversaciones" element={<ModuloGuard modulo="conversaciones"><CapabilityGuard capacidad="channels.read"><ConversacionesPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/conversaciones/historial" element={<ModuloGuard modulo="conversaciones"><CapabilityGuard capacidad="channels.read"><HistorialAtencionPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/conversaciones/config" element={<ModuloGuard modulo="conversaciones"><CapabilityGuard capacidad="channels.manage"><ConversacionesConfigPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/dashboard" element={<Navigate to="/pedidos/inicio" replace />} />
        <Route path="/configuracion" element={<PlaceholderPage title="Configuración" />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/perfil" element={<ProfilePage />} />
      </Route>

      {/* Onboarding: Perfil -> Organización -> Módulos -> Encuesta final */}
      <Route path="/onboarding/perfil" element={<PerfilOnboardingPage />} />
      <Route path="/onboarding/organizacion" element={<OrganizacionOnboardingPage />} />
      <Route path="/onboarding/modulos" element={<OnboardingModulosPage />} />
      <Route path="/onboarding/pedidos" element={<PedidosOnboardingPage />} />
      <Route path="/onboarding/encuesta" element={<EncuestaOnboardingPage />} />
      <Route path="/workspaces" element={<WorkspacesPage />} />
      <Route path="/modulos" element={<WorkspacesPage />} />
      <Route path="/workspace/modulos" element={<WorkspacesPage />} />

      {/* Autenticación & Acceso */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Soporte, Ayuda y Páginas Legales (Acceso Libre) */}
      <Route path="/ayuda" element={<HelpPage />} />
      <Route path="/soporte" element={<SupportPage />} />
      <Route path="/terminos" element={<TermsPage />} />
      <Route path="/privacidad" element={<PrivacyPage />} />
      <Route path="/cookies" element={<CookiesPage />} />

      <Route path="/seleccionar" element={<SeleccionarPage />} />
      <Route path="/operador/registro" element={<OperadorRegistroPage />} />
      <Route path="/operador/login" element={<RedireccionViendoComo />} />
      <Route path="/wa" element={<SimuladorWhatsApp />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
