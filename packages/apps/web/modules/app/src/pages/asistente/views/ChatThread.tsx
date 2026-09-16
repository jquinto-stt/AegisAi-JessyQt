import { observer } from "mobx-react-lite";
import type { AssistantMessage } from "@/assistant";
import { MessageBubble } from "./MessageBubble";

// ═══════════════════════════════════════════════════════════════════════════
// CHAT THREAD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ChatThread — hilo scrollable de la conversación del asistente.
 *
 * Recibe por props los `mensajes` y el flag `pensando` (la página le pasa
 * `assistantStore.mensajes` / `assistantStore.pensando`), de modo que el
 * componente queda desacoplado del store concreto. Es un `observer` para
 * re-renderizar cuando el arreglo observable de mensajes cambie.
 *
 * Renderiza cada mensaje en un `MessageBubble` (usuario a la derecha, asistente
 * a la izquierda) y, mientras `pensando`, un `IndicadorPensando`.
 *
 * El ESTADO VACÍO ya no vive aquí: en el concepto "AI Assistant" lo maneja la
 * página (`AsistentePage`) con las tarjetas de sugerencia. Por eso, si no hay
 * mensajes y tampoco se está pensando, `ChatThread` no renderiza contenido.
 */
export const ChatThread = observer(
  ({ mensajes, pensando }: { mensajes: AssistantMessage[]; pensando?: boolean }) => {
    // Sin mensajes y sin actividad: la página muestra el estado vacío con tarjetas.
    if (mensajes.length === 0 && !pensando) return null;

    return (
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {mensajes.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {pensando && <IndicadorPensando />}
        </div>
      </div>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

/** Burbuja de asistente con un indicador de "Pensando…" mientras el engine responde. */
const IndicadorPensando = () => (
  <div className="flex justify-start">
    <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
      <span className="inline-flex items-center gap-1">
        Pensando
        <span className="inline-flex gap-0.5">
          <span className="h-1 w-1 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
          <span className="h-1 w-1 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
          <span className="h-1 w-1 animate-bounce rounded-full bg-gray-400" />
        </span>
      </span>
    </div>
  </div>
);

export default ChatThread;
