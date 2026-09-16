import { Routes, Route, Navigate } from "react-router";
import { AppShell } from "@/app/AppShell";
import {
  InicioPage,
  TableroPage,
  CrearPedidoPage,
  HistorialPage,
  ConfigPage,
} from "@/pages/pedidos";
import { OperadoresPedidosPage } from "@/pages/operadores";
import { SeleccionarPage } from "@/pages/seleccionar";
import { OperadorRegistroPage, OperadorLoginPage } from "@/pages/operador";
import { SimuladorWhatsApp } from "@/pages/simulador/SimuladorWhatsApp";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import SignInForm from "@/pages/auth/sign-in";
import SignUpForm from "@/pages/auth/sign-up";
import ResetPasswordForm from "@/pages/auth/reset-password";
import { AuthPageLayout } from "@/layouts/auth";

export default function App() {
  return (
    <Routes>
      {/* Rutas con Shell (Sidebar + Header) */}
      <Route element={<AppShell />}>
        <Route path="/pedidos/inicio" element={<InicioPage />} />
        <Route path="/pedidos" element={<TableroPage />} />
        <Route path="/pedidos/crear" element={<CrearPedidoPage />} />
        <Route path="/pedidos/historial" element={<HistorialPage />} />
        <Route path="/pedidos/config" element={<ConfigPage />} />
        <Route path="/pedidos/operadores" element={<OperadoresPedidosPage />} />
        <Route path="/dashboard" element={<Navigate to="/pedidos/inicio" replace />} />
        <Route path="/configuracion" element={<PlaceholderPage title="Configuración" />} />
        <Route path="/ayuda" element={<PlaceholderPage title="Ayuda" />} />
      </Route>

      {/* Rutas Standalone */}
      <Route path="/seleccionar" element={<SeleccionarPage />} />
      <Route path="/operador/registro" element={<OperadorRegistroPage />} />
      <Route path="/operador/login" element={<OperadorLoginPage />} />
      <Route path="/wa" element={<SimuladorWhatsApp />} />
      <Route path="/login" element={<AuthPageLayout><SignInForm /></AuthPageLayout>} />
      <Route path="/register" element={<AuthPageLayout><SignUpForm /></AuthPageLayout>} />
      <Route path="/forgot-password" element={<AuthPageLayout><ResetPasswordForm /></AuthPageLayout>} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
