import { useNavigate } from "react-router";
import { Button } from "@/elements/ui/button";
import { sessionStore } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// SIN ACCESO — aviso compartido de "no tienes permiso"
// ═══════════════════════════════════════════════════════════════════════════

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-8 w-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

interface SinAccesoProps {
  titulo: string;
  mensaje: string;
}

/**
 * SinAcceso — aviso de "no tienes acceso a esta parte" con botón para volver al
 * inicio permitido.
 *
 * Se extrajo para que `CapabilityGuard` lo reutilice sin tocar `SeccionGuard`
 * (que está congelado: contrato §5). Cuando `SeccionGuard` se retire, migrará a
 * este mismo componente y dejará de duplicar el markup.
 */
export const SinAcceso = ({ titulo, mensaje }: SinAccesoProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-orange-400">
        <LockIcon />
      </span>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">{titulo}</h2>
      <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">{mensaje}</p>
      <Button size="sm" className="mt-6" onClick={() => navigate(sessionStore.homePathActual)}>
        Volver al inicio
      </Button>
    </div>
  );
};

export default SinAcceso;
