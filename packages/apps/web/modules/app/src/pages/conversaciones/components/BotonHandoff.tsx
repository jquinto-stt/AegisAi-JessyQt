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
        className="shrink-0 inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-theme-xs transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        Devolver al bot
      </button>
    );
  }

  // ── El caso que faltaba: `humano` SIN haber sido tomada ──────────────────
  //
  // Es el estado en el que queda un hilo cuando el BOT hace handoff: pone
  // `modo_atencion='humano'` y el bot queda mudo, pero `estado` sigue en
  // `abierta` (no hay operador asignado). `BotonHandoff` solo miraba `estado`,
  // así que ofrecía «Tomar chat» — la única forma de devolverlo al bot era
  // tomarlo primero y luego devolverlo, dos pasos para deshacer uno, y pasar
  // por un estado intermedio que asigna un operador que no existe.
  //
  // Medido el 22/09: el cliente escribió «Buen día», el bot no lo entendió, hizo
  // handoff, y los seis mensajes siguientes entraron sin respuesta. Desde la
  // bandeja no había forma de reencender el bot.
  if (conv.atencion === "humano") {
    return (
      <button
        type="button"
        onClick={() => conversacionesStore.devolverAlBot(convId)}
        className="shrink-0 inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-theme-xs transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
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
      className="shrink-0 inline-flex h-9 items-center gap-1.5 rounded-lg bg-secondary-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-theme-xs transition-all hover:bg-secondary-700 active:scale-95"
    >
      Tomar chat
    </button>
  );
});

export default BotonHandoff;
