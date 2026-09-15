import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { BusinessProvider } from './context/BusinessContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import NewUserOnboardingPage from './pages/NewUserOnboardingPage';
import OnboardingPage from './pages/OnboardingPage';
import HelpPage from './pages/HelpPage';
import SupportPage from './pages/SupportPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import CookiesPage from './pages/CookiesPage';
import WorkspacesPage from './pages/WorkspacesPage';
import FranchiseAnalyticsPage from './pages/FranchiseAnalyticsPage';
import NectoApp from './pages/NectoApp';
import CookieConsentBanner from './legal/CookieConsentBanner';

/**
 * Rutas de Necto.
 *
 * Los tres flujos de alta son **independientes y en este orden**:
 *
 *   1. Cuenta     → `/register` · `/login` (y Google)
 *   2. Usuario    → `/onboarding/nuevo-usuario` (`onboarding_new_user`)
 *   3. Tienda     → hub → `/onboarding` (alta de tienda/sucursal)
 *
 * `/onboarding/nuevo-usuario` completa a la persona; no toca nada del negocio.
 * `/onboarding/perfil` se conserva como alias del anterior para no romper
 * enlaces ni sesiones a medias: era el nombre del flujo del titular antes de
 * separarlo del asistente de tienda.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BusinessProvider>
          <Routes>

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* 2 — Onboarding del usuario nuevo (la persona). */}
            <Route path="/onboarding/nuevo-usuario" element={<NewUserOnboardingPage />} />
            <Route
              path="/onboarding/perfil"
              element={<Navigate to="/onboarding/nuevo-usuario" replace />}
            />

            {/* 3 — Alta de tienda/sucursal (el negocio), desde el hub. */}
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Centro de ayuda: página de acceso libre, legible sin sesión. */}
            <Route path="/ayuda" element={<HelpPage />} />

            {/*
              Soporte: la otra mitad del centro de ayuda, y también de acceso
              libre. Sin sesión es justo cuando más falta hace —un problema para
              entrar no se puede contar desde dentro de la aplicación—, así que
              la ruta vive aquí y no colgando de `/app`.
            */}
            <Route path="/soporte" element={<SupportPage />} />

            {/*
              Páginas legales. Son de **acceso libre** a propósito: los términos se
              aceptan desde `/register`, es decir antes de tener cuenta, así que
              exigir sesión para leerlos vaciaría de sentido el asentimiento. La
              ruta canónica de cada una vive en `legal.constants.ts` y se registra
              aquí; los enlaces la leen de allí para no repetir la URL.
            */}
            <Route path="/terminos" element={<TermsPage />} />
            <Route path="/privacidad" element={<PrivacyPage />} />
            <Route path="/cookies" element={<CookiesPage />} />

            <Route path="/" element={<WorkspacesPage />} />
            <Route path="/workspaces" element={<WorkspacesPage />} />
            <Route path="/analitica" element={<FranchiseAnalyticsPage />} />
            <Route path="/app/*" element={<NectoApp />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/*
            El aviso de cookies va **fuera** de `<Routes>` a propósito: tiene que
            verse tanto en las pantallas públicas (login, registro, ayuda, las
            legales) como dentro de la aplicación. Colgado de una ruta concreta
            sólo aparecería en esa, y para cuando el usuario llega a la app ya
            sería tarde para que la decisión sea previa.
          */}
          <CookieConsentBanner />
        </BusinessProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
