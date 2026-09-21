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

/** Indicador de Thinking... con icono enmarcado y texto minimalista como en la captura */
const IndicadorPensando = () => (
  <div className="flex justify-start my-2">
    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
      <span className="flex h-5 w-5 items-center justify-center rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-theme-xs">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse text-gray-600 dark:text-gray-300">
          <circle cx="12" cy="12" r="3" />
        </svg>
      </span>
      <span>Pensando...</span>
    </div>
  </div>
);

export default ChatThread;
