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
        className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 shadow-2xs transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        Devolver al bot
      </button>
    );
  }

  // Si está en espera o abierta: botón para tomarla (color índigo suave de Elements, no rojo)
  const operadorId =
    sessionStore.accessContext.operadorId ??
    sessionStore.accessContext.rolId ??
    "desconocido";

  return (
    <button
      type="button"
      onClick={() => conversacionesStore.tomar(convId, operadorId)}
      className="shrink-0 rounded-lg bg-[#465fff] px-2.5 py-1 text-xs font-medium text-white shadow-2xs transition-colors hover:bg-[#3b51e6]"
    >
      Tomar chat
    </button>
  );
});

export default BotonHandoff;
