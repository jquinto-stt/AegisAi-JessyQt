import { useEffect, useRef, useState } from "react";
import { Paperclip, Send } from "lucide-react";

import type { ConversationMessageContent } from "@/contracts/conversation.contract";
import { Button } from "@/elements";
import { cn } from "@/utils";

/* ── Compositor de mensajes ──────────────────────────────────────────────────
 *
 * ── Qué se conserva de la referencia `wacrm-main` ───────────────────────────
 *
 *   · **Enter envía, Shift+Enter salta línea.** Es la convención del chat y no
 *     hay nada que decidir aquí.
 *   · **Textarea que crece con el texto** hasta un tope, y luego hace scroll. Un
 *     campo de una línea obliga a escribir a ciegas un mensaje largo; uno que
 *     crece sin tope se come el hilo.
 *   · **El botón de envío está deshabilitado con el campo vacío**, y el foco
 *     vuelve al campo tras enviar: sin lo segundo hay que volver a hacer clic para
 *     escribir el siguiente mensaje.
 *   · **Barra de acciones a los lados** del campo, no debajo: separar el campo de
 *     sus botones obliga a recorrer la pantalla con la mirada.
 *
 * ── Qué NO se conserva ──────────────────────────────────────────────────────
 *
 *   · La **ventana de 24 h de Meta** y sus estados de bloqueo: son una regla del
 *     proveedor, no del chat (§8). Aquí no hay sesión que caduque.
 *   · El **borrador con IA**, las **plantillas** y el **constructor de mensajes
 *     interactivos**: son de la operación comercial del CRM (§10).
 *   · La **grabación de voz**: no hay nada que grabe sin la API del navegador
 *     montada y sin un archivo donde dejar el audio. Se deja fuera en lugar de
 *     prometer un botón que no haría nada.
 *
 * ⚠️ El adjunto **sí** existe y **envía de verdad** — pero envía un adjunto
 * **descrito** (nombre y tamaño), no un archivo subido: en esta fase no hay
 * backend donde depositarlo (§8). Es una limitación dicha, no una simulada: el
 * mensaje que se ve en el hilo es exactamente el que se guardó.
 * ─────────────────────────────────────────────────────────────────────────── */

const MAX_TEXTAREA_HEIGHT = 132;

/** Adjuntos que la demostración ofrece. Nombres verosímiles, sin archivo detrás. */
const SAMPLE_ATTACHMENTS: { label: string; content: ConversationMessageContent }[] = [
  {
    label: "Lista de precios.pdf",
    content: { kind: "document", fileName: "Lista-precios.pdf", sizeLabel: "284 KB" },
  },
  {
    label: "Foto del producto",
    content: { kind: "image", fileName: "producto.jpg" },
  },
];

export interface MessageComposerProps {
  /** Envía el mensaje. La vista decide a dónde va; el compositor no conoce el hilo. */
  onSend: (content: ConversationMessageContent) => void;
  /** Hilo al que pertenece. Se usa como `key` para vaciar el borrador al cambiar. */
  conversationId: string;
}

export function MessageComposer({ onSend, conversationId }: MessageComposerProps) {
  const [draft, setDraft] = useState("");
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ⚠️ Al cambiar de hilo el borrador se vacía. Sin esto, lo que se estaba
  // escribiendo para Andrea aparecería escrito para Carlos — y el operador podría
  // enviarlo sin darse cuenta. Es la misma razón por la que el `key` importa.
  useEffect(() => {
    setDraft("");
    setAttachmentsOpen(false);
  }, [conversationId]);

  // El campo crece con el texto hasta el tope y luego desplaza.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [draft]);

  const canSend = draft.trim().length > 0;

  const handleSend = () => {
    const body = draft.trim();
    if (!body) return;
    onSend({ kind: "text", body });
    setDraft("");
    // El foco vuelve al campo: el siguiente mensaje se escribe sin tocar el ratón.
    textareaRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-none border-t border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900 sm:px-4">
      {/* Menú de adjuntos. Es un desplegable y no un `input file` porque un archivo
          real no tendría a dónde ir en esta fase (§8): lo que se ofrece es el
          adjunto **descrito**, y eso se elige de una lista corta. */}
      {attachmentsOpen && (
        <div
          data-composer-attachments
          className="mb-2 flex flex-wrap gap-1.5 rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-800/60"
        >
          {SAMPLE_ATTACHMENTS.map(attachment => (
            /* ⚠️ Estos botones SÍ pueden ser del catálogo: no llevan ningún atributo de
               la guarda — el `data-composer-attachments` vive en la tira que los
               contiene. `ghost` porque el relleno blanco lo pone el `className`, y
               `h-auto` para que la altura la gobierne el `py` original y no el `h-9`. */
            <Button
              key={attachment.label}
              variant="ghost"
              size="sm"
              onClick={() => {
                onSend(attachment.content);
                setAttachmentsOpen(false);
              }}
              className="h-auto rounded-full bg-white px-3 py-1.5 text-theme-xs font-medium text-gray-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-700"
              intent="conversations.composer.attach.sample"
            >
              {attachment.label}
            </Button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setAttachmentsOpen(open => !open)}
          aria-expanded={attachmentsOpen}
          aria-label="Adjuntar"
          title="Adjuntar"
          data-composer-attach
          className={cn(
            "flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-lg transition-colors",
            attachmentsOpen
              ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          )}
        >
          <Paperclip className="h-4 w-4" aria-hidden />
        </button>

        <textarea
          ref={textareaRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Escribe un mensaje de respuesta..."
          aria-label="Escribe un mensaje"
          data-composer-input
          className="max-h-[132px] min-h-10 flex-1 resize-none rounded-xl border border-gray-200 bg-[#ECECEC]/30 px-4 py-2.5 text-theme-sm text-gray-800 placeholder:text-gray-400 focus:border-[#FF3F1A] focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-800/60 dark:text-white/90 dark:placeholder:text-gray-500"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Enviar mensaje"
          title="Enviar mensaje"
          data-composer-send
          className={cn(
            "flex h-10 w-10 flex-none items-center justify-center rounded-xl transition-all",
            canSend
              ? "cursor-pointer bg-[#FF3F1A] text-white hover:bg-[#e03310] shadow-sm active:scale-95"
              : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
          )}
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* La pista dice qué hace Enter. Es la única regla del compositor que no se
          ve en pantalla, y sin ella Shift+Enter es un secreto. */}
      <p className="mt-1.5 pl-12 text-theme-xs text-gray-400 dark:text-gray-500">
        <kbd className="font-sans font-medium text-gray-500 dark:text-gray-400">Enter</kbd> envía ·{" "}
        <kbd className="font-sans font-medium text-gray-500 dark:text-gray-400">Shift+Enter</kbd> salta línea
      </p>
    </div>
  );
}

export default MessageComposer;
