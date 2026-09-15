import { Download, FileText, Mic } from "lucide-react";

import type { ConversationMessage } from "@/contracts/conversation.contract";
import { formatTime } from "../conversation-time.utils";
import { MessageStatusIcon } from "../shared/MessageStatusIcon";
import { cn } from "@/utils";

/* ── Burbuja de mensaje ──────────────────────────────────────────────────────
 *
 * ── Qué se conserva de la referencia `wacrm-main` ───────────────────────────
 *
 *   · **Lado por autor**: entrante a la izquierda, saliente a la derecha. Es la
 *     convención que el operador ya tiene aprendida y no se toca.
 *   · **Cola en la esquina del emisor** (`rounded-bl-md` / `rounded-br-md`): la
 *     esquina que apunta a quien habla va menos redondeada que las otras tres. Es
 *     el detalle que hace que la burbuja se lea como "dicha por alguien" y no como
 *     un rectángulo suelto.
 *   · **Pie dentro de la burbuja** con la hora y el estado alineados al borde del
 *     emisor. Antes estaba fuera y cada autor tenía que inventar dónde ponerlo.
 *   · **Agrupación por ráfaga**: en un bloque seguido del mismo lado sólo la
 *     primera y la última burbuja llevan la cola; las de en medio van redondeadas
 *     del todo. Sin esto, cinco mensajes seguidos se leen como cinco conversaciones.
 *   · **`break-words` + tope de ancho** (`max-w-[80%]`): un mensaje con una URL
 *     larga sin espacios no puede estirar el hilo; fue un fallo real del original
 *     (`min-w-0` en la raíz por el mismo motivo).
 *
 * ── Qué NO se conserva ──────────────────────────────────────────────────────
 *
 *   · La insignia **IA**, las **reacciones**, el **citar/respuesta** y las
 *     **plantillas**: son capacidades de la operación comercial del CRM (§10) y
 *     de la mensajería de Meta (§8), no de la experiencia del chat. Añadirlas hoy
 *     sería pintar controles sin comportamiento detrás.
 *   · El estado `failed` con `error_title` / `error_details` de Meta: aquí el
 *     fallo se explica con un mensaje propio, sin fingir un error del proveedor.
 *
 * ⚠️ El color de la burbuja saliente es el **verde de canal** de Necto
 * (`whatsapp-*`), no el `primary` de marca del original: en Necto el naranja de
 * marca es el acento de la vista y el verde es la identidad del canal. Pintar los
 * mensajes salientes en naranja competiría con cada CTA de la app.
 * ─────────────────────────────────────────────────────────────────────────── */

export interface MessageBubbleProps {
  message: ConversationMessage;
  /** Primer mensaje de una ráfaga del mismo autor. */
  isBurstStart?: boolean;
  /** Último mensaje de una ráfaga del mismo autor. */
  isBurstEnd?: boolean;
  /** Nombre de quien escribe, sólo para el `title` accesible del entrante. */
  authorName?: string;
}

export function MessageBubble({
  message,
  isBurstStart = true,
  isBurstEnd = true,
  authorName,
}: MessageBubbleProps) {
  const isOutgoing = message.direction === "outgoing";

  return (
    <div
      className={cn("flex w-full", isOutgoing ? "justify-end" : "justify-start")}
      data-message-direction={message.direction}
    >
      <div
        data-message-id={message.id}
        className={cn(
          "relative max-w-[85%] px-3 py-2 text-theme-sm shadow-theme-xs sm:max-w-[75%]",
          // Radio base: esquina del emisor menos redondeada; el resto al máximo.
          // En medio de una ráfaga las dos esquinas de abajo se redondean, que es
          // lo que une visualmente el bloque.
          "rounded-2xl",
          isOutgoing
            ? cn("bg-whatsapp-100 text-gray-900 dark:bg-whatsapp-900 dark:text-white", 
                 isBurstEnd ? "rounded-br-md" : "rounded-br-2xl",
                 isBurstStart ? "rounded-tr-2xl" : "rounded-tr-md")
            : cn("bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90",
                 isBurstEnd ? "rounded-bl-md" : "rounded-bl-2xl",
                 isBurstStart ? "rounded-tl-2xl" : "rounded-tl-md")
        )}
      >
        <MessageContent message={message} isOutgoing={isOutgoing} authorName={authorName} />

        {/* Pie: hora + estado. Dentro de la burbuja, alineado al emisor. */}
        <div
          className={cn(
            "mt-1 flex items-center gap-1",
            isOutgoing ? "justify-end" : "justify-start"
          )}
        >
          <span
            className={cn(
              "text-[11px] tabular-nums",
              isOutgoing ? "text-whatsapp-800/70 dark:text-white/60" : "text-gray-500 dark:text-gray-400"
            )}
          >
            {formatTime(message.sentAt)}
          </span>
          {/* ⚠️ Sólo el saliente lleva estado. Un entrante ya está entregado por
              definición y pintarle un check afirmaría algo que nadie confirmó. */}
          {isOutgoing && (
            <MessageStatusIcon status={message.status} onDark={false} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Contenido según el tipo ───────────────────────────────────────────────── */

function MessageContent({
  message,
  isOutgoing,
  authorName,
}: {
  message: ConversationMessage;
  isOutgoing: boolean;
  authorName?: string;
}) {
  const { content } = message;

  switch (content.kind) {
    case "text":
      return (
        <p className="whitespace-pre-wrap break-words">
          {authorName && !isOutgoing && <span className="sr-only">{authorName}: </span>}
          {content.body}
        </p>
      );

    case "image":
      /**
       * ⚠️ El hueco de la imagen es **una forma**, no una foto de relleno. Se
       * dibuja la proporción del adjunto con su nombre de archivo debajo: así el
       * hueco explica qué es sin necesidad de cargar una imagen que en esta fase
       * no existe (§8), y sin fingir que se ve su contenido.
       */
      return (
        <div>
          <div
            data-message-attachment="image"
            className="flex aspect-[4/3] w-full max-w-[280px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-white/60 text-gray-400 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-500"
          >
            <ImageGlyph />
            <span className="text-[11px]">Imagen adjunta</span>
          </div>
          {content.caption && (
            <p className="mt-1.5 whitespace-pre-wrap break-words">{content.caption}</p>
          )}
        </div>
      );

    case "document":
      return (
        <div
          data-message-attachment="document"
          className="flex w-full max-w-[280px] items-center gap-2.5 rounded-lg bg-white/70 px-2.5 py-2 dark:bg-gray-900/40"
        >
          <span className="flex size-8 flex-none items-center justify-center rounded-md bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <FileText className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-theme-xs font-medium">{content.fileName}</span>
            <span className="block text-[11px] text-gray-500 dark:text-gray-400">
              {content.sizeLabel}
            </span>
          </span>
          <Download className="h-4 w-4 flex-none text-gray-400" aria-hidden />
        </div>
      );

    case "audio":
      return (
        <div
          data-message-attachment="audio"
          className="flex w-[220px] items-center gap-2.5 py-1"
        >
          <span className="flex size-8 flex-none items-center justify-center rounded-full bg-white/70 text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
            <Mic className="h-4 w-4" aria-hidden />
          </span>
          {/* Onda dibujada: comunica "esto es audio" sin un reproductor que no
              existe. Es decorativa y va oculta a lectores de pantalla. */}
          <span aria-hidden className="flex flex-1 items-center gap-[2px]">
            {[6, 12, 8, 16, 10, 14, 7, 11, 9, 15, 8, 12, 6].map((h, i) => (
              <span
                key={i}
                style={{ height: h }}
                className="w-[2px] rounded-full bg-gray-400/70 dark:bg-gray-500"
              />
            ))}
          </span>
          <span className="flex-none text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
            {content.durationLabel}
          </span>
        </div>
      );
  }
}

/** Glifo de imagen. SVG propio y no un icono de la librería: no hay `ImageIcon` en el set en uso. */
function ImageGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M4 17l4.5-4.5 3 3L15 12l5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default MessageBubble;
