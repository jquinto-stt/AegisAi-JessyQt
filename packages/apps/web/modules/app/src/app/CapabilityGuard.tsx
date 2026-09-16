import type { ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { sessionStore, type Capacidad } from "@/stores";
import { SinAcceso } from "@/app/SinAcceso";

// ═══════════════════════════════════════════════════════════════════════════
// CAPABILITY GUARD — protege una ruta por capacidad
// ═══════════════════════════════════════════════════════════════════════════

interface CapabilityGuardProps {
  /** Capacidad necesaria para entrar (ver `roles.store.ts`). */
  capacidad: Capacidad;
  children: ReactNode;
}

/**
 * CapabilityGuard — protege una ruta por **capacidad** en vez de por sección.
 *
 * Es el reemplazo del centinela `seccion="__solo_admin__"` que usaban las rutas
 * de Operadores: ese era un string mágico que no existía en ningún catálogo. Con
 * esto, "solo admin" pasa a ser `capacidad="team.manage"`, que es una capacidad
 * real y asignable a cualquier rol (contrato §1.4 y §6).
 *
 * A diferencia de `SeccionGuard`, que solo miraba si se estaba simulando, este
 * guard consulta `hasPermission()`, que es la API canónica de autorización y
 * funciona igual para el admin (por su rol) y para un operador simulado.
 */
export const CapabilityGuard = observer(({ capacidad, children }: CapabilityGuardProps) => {
  if (sessionStore.hasPermission(capacidad)) {
    return <>{children}</>;
  }

  return (
    <SinAcceso
      titulo="No tienes acceso a esta sección"
      mensaje="Tu perfil no tiene el permiso necesario para ver esta parte de la aplicación. Pídele acceso al administrador si lo necesitas."
    />
  );
});

export default CapabilityGuard;
