import { Routes, Route, Navigate } from "react-router";
import { sessionStore } from "@/stores";
import { AppShell } from "@/app/AppShell";
import {
  TableroPage,
  CrearPedidoPage,
  InicioPage as PedidosInicioPage,
  HistorialPage as PedidosHistorialPage,
  AnaliticaPage as PedidosAnaliticaPage,
  ConfigPage as PedidosConfigPage,
  EquipoPage,
  PerfilOperadorPage,
} from "@/pages/pedidos";
import { SeleccionarPage } from "@/pages/seleccionar";
import { AsistentePage } from "@/pages/asistente";
import { ConversacionesPage } from "@/pages/conversaciones";
import { SimuladorWhatsApp } from "@/pages/simulador";
import { OperadorRegistroPage } from "@/pages/operador";
import { RequireSession } from "@/app/RequireSession";
import { CapabilityGuard } from "@/app/CapabilityGuard";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import SignInForm from "@/pages/auth/sign-in";
import SignUpForm from "@/pages/auth/sign-up";
import ResetPasswordForm from "@/pages/auth/reset-password";
import { AuthPageLayout } from "@/layouts/auth";
import { bootstrapAssistant } from "@/assistant/bootstrap";

// Cablea el asistente ("Necto Intelligence") una sola vez al cargar el módulo de
// rutas, antes de la primera pregunta. `bootstrapAssistant` es idempotente.
bootstrapAssistant();

const RedireccionViendoComo = () => (
  <Navigate
    to={sessionStore.hasPermission("team.manage") ? "/pedidos/equipo" : "/seleccionar"}
    replace
  />
);

export default function App() {
  return (
    <Routes>
      {/* Rutas con Shell */}
      <Route element={<RequireSession><AppShell /></RequireSession>}>
        <Route path="/pedidos/inicio" element={<CapabilityGuard capacidad="orders.read"><PedidosInicioPage /></CapabilityGuard>} />
        <Route path="/pedidos" element={<CapabilityGuard capacidad="orders.read"><TableroPage /></CapabilityGuard>} />
        <Route path="/pedidos/crear" element={<CapabilityGuard capacidad="orders.create"><CrearPedidoPage /></CapabilityGuard>} />
        <Route path="/pedidos/historial" element={<CapabilityGuard capacidad="orders.read"><PedidosHistorialPage /></CapabilityGuard>} />
        <Route path="/pedidos/analitica" element={<CapabilityGuard capacidad="orders.read"><PedidosAnaliticaPage /></CapabilityGuard>} />
        <Route path="/pedidos/config" element={<CapabilityGuard capacidad="settings.read"><PedidosConfigPage /></CapabilityGuard>} />
        <Route path="/pedidos/equipo" element={<CapabilityGuard capacidad="team.manage"><EquipoPage /></CapabilityGuard>} />
        <Route path="/pedidos/equipo/:id" element={<CapabilityGuard capacidad="team.manage"><PerfilOperadorPage /></CapabilityGuard>} />
        <Route path="/pedidos/operadores" element={<Navigate to="/pedidos/equipo" replace />} />
        <Route path="/asistente" element={<CapabilityGuard capacidad="assistant.use"><AsistentePage /></CapabilityGuard>} />
        <Route path="/conversaciones" element={<CapabilityGuard capacidad="channels.read"><ConversacionesPage /></CapabilityGuard>} />
        <Route path="/dashboard" element={<Navigate to="/pedidos/inicio" replace />} />
        <Route path="/configuracion" element={<PlaceholderPage title="Configuración" />} />
        <Route path="/ayuda" element={<PlaceholderPage title="Ayuda" />} />
      </Route>

      {/* Rutas Standalone */}
      <Route path="/seleccionar" element={<SeleccionarPage />} />
      <Route path="/operador/registro" element={<OperadorRegistroPage />} />
      <Route path="/operador/login" element={<RedireccionViendoComo />} />
      <Route path="/wa" element={<SimuladorWhatsApp />} />
      <Route path="/login" element={<AuthPageLayout><SignInForm /></AuthPageLayout>} />
      <Route path="/register" element={<AuthPageLayout><SignUpForm /></AuthPageLayout>} />
      <Route path="/forgot-password" element={<AuthPageLayout><ResetPasswordForm /></AuthPageLayout>} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
