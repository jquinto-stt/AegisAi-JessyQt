import { useEffect, useMemo, useRef } from "react";
import { ArrowLeft, MessageSquare } from "lucide-react";

import type { ConversationMessage } from "@/contracts/conversation.contract";
import { Badge } from "@/elements";
import {
  formatDaySeparator,
  groupMessagesByDay,
  isSameBurst,
} from "../conversation-time.utils";
import { CounterpartAvatar } from "../shared/CounterpartAvatar";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { cn } from "@/utils";

/* ── Ventana de conversación (panel central) ─────────────────────────────────
 *
 * ── Qué se conserva de la referencia `wacrm-main` ───────────────────────────
 *
 *   · **Encabezado con avatar, nombre y teléfono**, separado del hilo por un
 *     borde: el operador tiene que saber con quién habla sin subir a buscarlo.
 *   · **Separadores de día** dentro del hilo, centrados y en pastilla. Sin ellos
 *     una conversación de tres días se lee como si hubiera pasado toda hoy.
 *   · **Auto-scroll al último mensaje**, con el contenedor como único dueño del
 *     scroll. Se salta al fondo al abrir el hilo y al enviar.
 *   · **Estado vacío con una invitación**, no un panel en blanco: sin hilo
 *     seleccionado se dice qué hacer, no se deja un hueco.
 *
 * ── Qué NO se conserva ──────────────────────────────────────────────────────
 *
 *   · El **panel de contacto** lateral con etiquetas, empresa, agente asignado y
 *     notas: es el modelo comercial del CRM (§10). Necto no tiene ese dominio, y
 *     el §7 es explícito en no añadir panel derecho "para llenar espacio".
 *   · El **cronómetro de sesión de 24 h**, el **botón de refresco manual**, el
 *     **selector de estado del hilo** y el **banner de IA**: son de Meta y del
 *     flujo comercial, no del chat (§8, §10).
 *
 * Lo que **sí** añade este archivo, y el original no tenía: un **botón de vuelta a
 * la lista** en móvil. Allí la lista y el hilo conviven desde `lg`; por debajo, el
 * hilo ocupa la pantalla y sin ese botón se queda sin salida.
 * ─────────────────────────────────────────────────────────────────────────── */

export interface ConversationViewProps {
  counterpart: { name: string; phone: string; initials: string } | null;
  messages: readonly ConversationMessage[];
  conversationId: string | null;
  /** Envía un mensaje al hilo abierto. */
  onSend: (content: Parameters<typeof MessageComposer>[0]["onSend"] extends (c: infer C) => void ? C : never) => void;
  /** Vuelve a la lista. Sólo se ofrece en pantallas estrechas. */
  onBack?: () => void;
}

export function ConversationView({
  counterpart,
  messages,
  conversationId,
  onSend,
  onBack,
}: ConversationViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => groupMessagesByDay(messages), [messages]);
  const messageCount = messages.length;

  /**
   * Aterrizar en el final del hilo.
   *
   * ⚠️ Se hace sobre el **contenedor con scroll**, no con `scrollIntoView` del
   * centinela: `scrollIntoView` mueve también a los ancestros que puedan
   * desplazarse —el `body` incluido—, así que abrir un hilo largo desplazaba la
   * página entera y dejaba la cabecera de la app fuera de sitio. Asignar
   * `scrollTop` mueve **sólo** este panel, que es lo que se quiere.
   *
   * ⚠️ Se reintenta durante unos fotogramas y **sin animación**. El alto del
   * contenido no es definitivo en el primer render —las burbujas se miden después,
   * y con texto que envuelve el alto cambia—, así que una sola pasada dejaba el
   * hilo a medio camino. Y el salto tiene que ser instantáneo: aterrizar en un
   * hilo no es "hacer scroll", es abrirlo donde está lo último.
   *
   * ⚠️ El desplazamiento suave se reserva para **lo que llega mientras se mira**:
   * un mensaje nuevo enviado. Ahí sí se ve el movimiento, que es lo que confirma
   * que el mensaje salió.
   */
  const stickToBottomRef = useRef(false);

  useEffect(() => {
    if (!conversationId) return;
    stickToBottomRef.current = true;
    return () => {
      stickToBottomRef.current = false;
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || messageCount === 0) return;

    const el = scrollRef.current;
    if (!el) return;

    const smooth = !stickToBottomRef.current;
    let attempts = 0;
    let frame = 0;

    const settle = () => {
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
      // Tres fotogramas bastan para que el navegador haya medido el contenido.
      if (++attempts < 3) frame = requestAnimationFrame(settle);
      else stickToBottomRef.current = false;
    };

    frame = requestAnimationFrame(settle);
    return () => cancelAnimationFrame(frame);
  }, [conversationId, messageCount]);

  /* ── Sin hilo seleccionado ─────────────────────────────────────────────── */
  if (!counterpart || !conversationId) {
    return (
      <div
        data-conversation-empty
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
          <MessageSquare className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <p className="text-theme-sm font-medium text-gray-600 dark:text-gray-300">
            Elige una conversación
          </p>
          <p className="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
            Selecciona un contacto de la lista para ver el hilo y responder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-conversation-thread={conversationId} className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <div className="flex flex-none items-center gap-3 border-b border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900 sm:px-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver a la lista de conversaciones"
            title="Volver a la lista"
            className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
        )}

        <CounterpartAvatar initials={counterpart.initials} size={36} tone="brand" />

        <div className="min-w-0">
          <h2 className="truncate text-theme-sm font-semibold text-secondary-600 dark:text-white">
            {counterpart.name}
          </h2>
          <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
            {counterpart.phone}
          </p>
        </div>

        {/* El canal del que viene el hilo. Es información del contexto de la sede:
            un operador que atiende dos canales necesita saber en cuál está.

            ⚠️ El verde de canal (`whatsapp-*`) se impone por `className`: el catálogo
            no conoce la identidad de canal de Necto. El punto va como `startIcon`. */}
        <Badge
          color="light"
          size="sm"
          className="ml-auto hidden flex-none gap-1.5 bg-whatsapp-50 px-2.5 py-1 font-medium text-whatsapp-800 dark:bg-whatsapp-900 dark:text-whatsapp-100 sm:inline-flex"
          startIcon={<span className="size-1.5 rounded-full bg-whatsapp-500" aria-hidden />}
          intent="conversations.thread.channel"
        >
          WhatsApp
        </Badge>
      </div>

      {/* ── Hilo ───────────────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto bg-gray-50 px-3 py-4 dark:bg-gray-950 sm:px-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-theme-sm font-medium text-gray-500 dark:text-gray-400">
              Todavía no hay mensajes
            </p>
            <p className="text-theme-xs text-gray-400 dark:text-gray-500">
              Escribe el primero para abrir la conversación.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map(group => (
              <div key={group.dayKey} className="flex flex-col gap-1">
                {/* Separador de día: centrado y en pastilla, para que se distinga
                    de las burbujas sin competir con ellas. */}
                <div className="mb-1 flex justify-center">
                  <Badge
                    color="light"
                    size="sm"
                    className="bg-gray-200/70 px-3 py-1 font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    intent="conversations.thread.day"
                  >
                    {formatDaySeparator(group.dayIso)}
                  </Badge>
                </div>

                {group.messages.map((message, index) => {
                  const previous = group.messages[index - 1] as ConversationMessage | undefined;
                  const next = group.messages[index + 1] as ConversationMessage | undefined;

                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isBurstStart={!isSameBurst(previous, message)}
                      isBurstEnd={!next || !isSameBurst(message, next)}
                      authorName={counterpart.name}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Compositor ─────────────────────────────────────────────────────── */}
      <MessageComposer key={conversationId} conversationId={conversationId} onSend={onSend} />
    </div>
  );
}

export default ConversationView;
