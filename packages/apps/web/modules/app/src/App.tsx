import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { BusinessProvider } from './context/BusinessContext';
import Login from './pages/Login';
import Register from './pages/Register';
import OnboardingPage from './pages/OnboardingPage';
import WorkspacesPage from './pages/WorkspacesPage';
import NectoApp from './pages/NectoApp';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/workspaces" element={<WorkspacesPage />} />
            <Route path="/*" element={<NectoApp />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
