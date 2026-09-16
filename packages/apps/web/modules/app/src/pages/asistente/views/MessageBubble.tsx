import type { AssistantMessage } from "@/assistant";
import { ResponseBlocks } from "./blocks";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formatea un `createdAt` ISO como hora HH:mm. Devuelve `null` si la fecha no
 * es válida, para no renderizar una hora rota en la burbuja.
 */
const horaDe = (createdAt: string): string | null => {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE BUBBLE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * MessageBubble — una burbuja del hilo del asistente.
 *
 * Alinea a la derecha con fondo brand (verde) los mensajes `role="user"` y a la
 * izquierda con fondo blanco/gris y borde los `role="assistant"`, reutilizando
 * el lenguaje visual de `pages/simulador/SimuladorWhatsApp.tsx`. Usa
 * `whitespace-pre-line` para respetar los saltos de línea del texto (el engine
 * devuelve respuestas con secciones "Hechos:" / "Observaciones:").
 *
 * Además de la evidencia (Hechos/Inferencias) que muestra el FactsPanel, un
 * mensaje del asistente puede traer BLOQUES DE RESPUESTA ENRIQUECIDA en
 * `message.evidence.blocks` (métricas, tabla, comparativa, listado). Cuando los
 * hay, se renderizan INLINE debajo del texto, dentro del mismo segmento del
 * asistente, y este ensancha su ancho (los bloques son anchos y no deben quedar
 * espachurrados en `max-w-[80%]`).
 */
export const MessageBubble = ({ message }: { message: AssistantMessage }) => {
  const esUsuario = message.role === "user";
  const hora = horaDe(message.createdAt);
  const blocks = !esUsuario ? message.evidence?.blocks : undefined;
  const tieneBlocks = !!blocks && blocks.length > 0;

  // Ancho del segmento: el usuario y el asistente sin bloques usan burbuja
  // compacta; el asistente CON bloques se ensancha para que las tarjetas/tablas
  // respiren.
  const anchoSegmento = tieneBlocks ? "w-full max-w-3xl" : "max-w-[80%]";

  return (
    <div className={`flex ${esUsuario ? "justify-end" : "justify-start"}`}>
      <div className={`flex flex-col gap-2 ${anchoSegmento}`}>
        {/* Burbuja de texto (se muestra si hay texto). */}
        {message.text && (
          <div
            className={`rounded-2xl px-3 py-2 shadow-sm ${
              esUsuario
                ? "self-end rounded-br-sm bg-brand-500 text-white"
                : "self-start rounded-bl-sm border border-gray-200 bg-white text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            }`}
          >
            <p className="whitespace-pre-line text-sm leading-relaxed">{message.text}</p>

            {hora && (
              <p
                className={`mt-1 text-right text-[10px] ${
                  esUsuario ? "text-white/60" : "text-gray-400"
                }`}
              >
                {hora}
              </p>
            )}
          </div>
        )}

        {/* Bloques de respuesta enriquecida (solo asistente), debajo del texto. */}
        {tieneBlocks && <ResponseBlocks blocks={blocks} />}
      </div>
    </div>
  );
};

export default MessageBubble;
