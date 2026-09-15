import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { Button } from "@/elements/ui/button";
import { sessionStore } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// SECCION GUARD
// ═══════════════════════════════════════════════════════════════════════════

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-8 w-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

interface SeccionGuardProps {
  /** Id de la sección (ver SECCIONES en operadores.store). */
  seccion: string;
  children: ReactNode;
}

/**
 * SeccionGuard — protege una ruta de sección en modo simulación de operador.
 *
 * Si se está simulando un operador y esa sección NO está en sus permisos,
 * muestra un aviso de "sin acceso" en vez del contenido. Para el administrador
 * (sin simulación) `puedeVer` siempre es true, así que pasa transparente.
 */
export const SeccionGuard = observer(({ seccion, children }: SeccionGuardProps) => {
  const navigate = useNavigate();

  if (sessionStore.puedeVer(seccion)) {
    return <>{children}</>;
  }

  // Sin permiso: aviso claro (el operador no tiene acceso a esta sección).
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-orange-400">
        <LockIcon />
      </span>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">No tienes acceso a esta sección</h2>
      <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        No eres administrador. Tu perfil de operador no tiene permiso para ver esta parte de la aplicación.
        Pídele acceso al administrador si lo necesitas.
      </p>
      <Button size="sm" className="mt-6" onClick={() => navigate(sessionStore.homePathActual)}>
        Volver al inicio
      </Button>
    </div>
  );
});

export default SeccionGuard;
