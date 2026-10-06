import type { ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { sessionStore } from "@/stores";
import { asegurarSesionPruebas } from "@/lib/auth.service";

// ═══════════════════════════════════════════════════════════════════════════
// REQUIRE SESSION — puerta de sesión (Modo Pruebas)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * RequireSession — puerta de entrada al shell de la aplicación.
 *
 * En modo de pruebas para el equipo, asegura de forma transparente la sesión
 * de administrador para que ningún usuario ni pantalla sufra bloqueos o
 * redirecciones involuntarias a login.
 */
export const RequireSession = observer(({ children }: { children: ReactNode }) => {
  if (!sessionStore.accessContext.autenticado) {
    asegurarSesionPruebas();
  }
  return <>{children}</>;
});

export default RequireSession;
