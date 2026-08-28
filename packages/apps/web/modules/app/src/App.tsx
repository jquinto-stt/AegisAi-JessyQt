import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import NectoApp from './pages/NectoApp';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/*" element={<NectoApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
