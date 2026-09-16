import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { observer } from "mobx-react-lite";
import { sessionStore } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// REQUIRE SESSION — puerta de sesión
// ═══════════════════════════════════════════════════════════════════════════

/**
 * RequireSession — puerta de entrada al shell de la aplicación.
 *
 * Contrato §2: sin una sesión utilizable (`accessContext.autenticado === false`)
 * se redirige a `/login`. Esto corrige el bug H2 del análisis, donde una sesión
 * sin configurar se comportaba como administrador y `/pedidos/config` se abría
 * escribiendo la URL con el almacenamiento vacío.
 *
 * Las rutas standalone (`/login`, `/seleccionar`, `/operador/*`) quedan FUERA de
 * esta puerta, así que el flujo `/login → /seleccionar → configurar()` no se
 * rompe: `configurar()` deja la sesión autenticada.
 */
export const RequireSession = observer(({ children }: { children: ReactNode }) => {
  if (!sessionStore.accessContext.autenticado) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
});

export default RequireSession;
