import { useState } from "react";
import type { AssistantMessage } from "@/assistant";
import { assistantStore } from "@/stores";
import { ResponseBlocks } from "./blocks";

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE BUBBLE
// ═══════════════════════════════════════════════════════════════════════════

export const MessageBubble = ({ message }: { message: AssistantMessage }) => {
  const esUsuario = message.role === "user";
  const blocks = !esUsuario ? message.evidence?.blocks : undefined;
  const tieneBlocks = !!blocks && blocks.length > 0;
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerar = () => {
    const mensajes = assistantStore.mensajes;
    const idx = mensajes.findIndex((m) => m.id === message.id);
    const sub = idx >= 0 ? mensajes.slice(0, idx) : mensajes;
    const previoUsuario = [...sub].reverse().find((m) => m.role === "user");
    if (previoUsuario?.text) {
      assistantStore.enviar(previoUsuario.text);
    }
  };

  return (
    // La entrada vive en la burbuja y NO en el hilo: así cada mensaje anima al
    // montarse, tanto al cargar un hilo entero como al aparecer uno nuevo. Si se
    // aplicara al contenedor del hilo, el hilo ya estaría montado y el mensaje
    // recién llegado entraría de golpe.
    //
    // Sin retardo escalonado a propósito: en un chat los mensajes llegan en
    // momentos distintos, así que una cascada por índice no describe nada — el
    // orden de llegada ya es la secuencia.
    <div className={`animate-entrada-lista flex ${esUsuario ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`flex flex-col gap-1.5 ${tieneBlocks ? "w-full" : esUsuario ? "max-w-[85%]" : "w-full"}`}>
        {message.text &&
          (esUsuario ? (
            /* Burbuja de usuario */
            <div className="self-end rounded-2xl bg-gray-100 px-4 py-2.5 text-sm leading-relaxed text-gray-800 dark:bg-gray-800 dark:text-gray-100">
              <p className="whitespace-pre-line">{message.text}</p>
            </div>
          ) : (
            /* Mensaje de asistente limpio sobre la tarjeta con toolbar de acciones */
            <div className="self-start py-1 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
              <p className="whitespace-pre-line">{message.text}</p>

              {/* Toolbar inferior de acciones (Copiar, Feedback, Regenerar) */}
              <div className="mt-2 flex items-center gap-1 text-gray-400 dark:text-gray-500">
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copiar texto"
                  className="rounded p-1 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  {copied ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success-500">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFeedback(feedback === "up" ? null : "up")}
                  title="Me gusta"
                  className={`rounded p-1 transition-colors ${
                    feedback === "up"
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
                      : "hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setFeedback(feedback === "down" ? null : "down")}
                  title="No me gusta"
                  className={`rounded p-1 transition-colors ${
                    feedback === "down"
                      ? "bg-error-50 text-error-600 dark:bg-error-900/30 dark:text-error-400"
                      : "hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleRegenerar}
                  title="Regenerar"
                  className="rounded p-1 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default MessageBubble;
