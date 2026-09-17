import { observer } from "mobx-react-lite";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { sessionStore } from "@/stores/session.store";
import { puedeResponderConversacion } from "@/stores/acceso.utils";

export const BotonHandoff = observer(({ convId }: { convId: string }) => {
  const conv = conversacionesStore.getConversacion(convId);

  // Gating: sin `channels.respond` no se ofrece la acción
  if (!puedeResponderConversacion()) return null;
  if (!conv || conv.estado === "cerrada") return null;

  // Si la conversación ya la atiende un humano: opción para devolver al bot
  if (conv.estado === "atendida") {
    return (
      <button
        type="button"
        onClick={() => conversacionesStore.devolver(convId)}
        className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        Devolver al bot
      </button>
    );
  }

  // Si está en espera o abierta: botón para tomarla
  const operadorId =
    sessionStore.accessContext.operadorId ??
    sessionStore.accessContext.rolId ??
    "desconocido";

  return (
    <button
      type="button"
      onClick={() => conversacionesStore.tomar(convId, operadorId)}
      className="shrink-0 rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-brand-600"
    >
      Tomar chat
    </button>
  );
});

export default BotonHandoff;
