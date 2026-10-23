import { useState, useEffect, type ReactNode } from "react";
import { Navigate } from "react-router";
import { observer } from "mobx-react-lite";
import { sessionStore, organizacionStore } from "@/stores";
import { esperarHidratacion, estaSesionInicializada } from "@/lib/auth.service";

/**
 * RequireSession — puerta de entrada al shell de la aplicación.
 *
 * Protege las rutas privadas: espera la hidratación de Supabase Auth
 * y redirige a /login si no existe una sesión autenticada válida.
 */
export const RequireSession = observer(({ children }: { children: ReactNode }) => {
  const [cargando, setCargando] = useState(!estaSesionInicializada());

  useEffect(() => {
    if (!estaSesionInicializada()) {
      void esperarHidratacion().finally(() => {
        setCargando(false);
      });
    }
  }, []);

  if (cargando) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!sessionStore.accessContext.autenticado) {
    return <Navigate to="/login" replace />;
  }

  // Si está autenticado pero aún no completó el onboarding
  if (!organizacionStore.usuario?.perfilCompletado && !organizacionStore.tieneOrganizacion) {
    return <Navigate to="/onboarding/bienvenida" replace />;
  }

  return <>{children}</>;
});

export default RequireSession;
