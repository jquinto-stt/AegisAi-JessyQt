import { useEffect, useMemo, useRef, useState } from "react";
import { 
  ArrowLeft, 
  MessageSquare, 
  PanelRightClose, 
  PanelRightOpen, 
  AlertCircle, 
  Clock3, 
  CheckCircle2, 
  UserCheck 
} from "lucide-react";

import type { 
  AssignedOperator, 
  AttentionStatus, 
  Conversation, 
  ConversationMessage, 
  ConversationMessageContent 
} from "@/contracts/conversation.contract";
import { Badge } from "@/elements";
import {
  formatDaySeparator,
  groupMessagesByDay,
  isSameBurst,
} from "../conversation-time.utils";
import { CounterpartAvatar } from "../shared/CounterpartAvatar";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { ConversationAttentionPanel } from "./ConversationAttentionPanel";
import { cn } from "@/utils";

export interface ConversationViewProps {
  conversation?: Conversation | null;
  counterpart: { name: string; phone: string; initials: string } | null;
  messages: readonly ConversationMessage[];
  conversationId: string | null;
  /** Envía un mensaje al hilo abierto. */
  onSend: (content: ConversationMessageContent) => void;
  /** Vuelve a la lista. Sólo se ofrece en pantallas estrechas. */
  onBack?: () => void;
  onUpdateStatus?: (conversationId: string, status: AttentionStatus) => void;
  onAssignOperator?: (conversationId: string, operator: AssignedOperator | null) => void;
  onUpdateNotes?: (conversationId: string, notes: string) => void;
}

export function ConversationView({
  conversation,
  counterpart,
  messages,
  conversationId,
  onSend,
  onBack,
  onUpdateStatus,
  onAssignOperator,
  onUpdateNotes,
}: ConversationViewProps) {
  const [showAttentionPanel, setShowAttentionPanel] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => groupMessagesByDay(messages), [messages]);
  const messageCount = messages.length;

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
          <p className="text-theme-sm font-semibold text-gray-700 dark:text-gray-200">
            Bandeja de atención de WhatsApp
          </p>
          <p className="mt-1 text-theme-xs text-gray-400 dark:text-gray-500 max-w-sm">
            Selecciona una conversación de la lista para gestionar la atención, revisar el historial y responder en tiempo real.
          </p>
        </div>
      </div>
    );
  }

  const attentionStatus: AttentionStatus = conversation?.attentionStatus || "pending";
  const statusBadge = {
    pending: { label: "Por atender", icon: AlertCircle, class: "bg-[#FF3F1A]/10 text-[#FF3F1A] border-[#FF3F1A]/30 dark:bg-[#FF3F1A]/20 dark:text-[#FF3F1A]" },
    in_progress: { label: "En atención", icon: Clock3, class: "bg-[#190088]/10 text-[#190088] border-[#190088]/20 dark:bg-[#97D6DF]/15 dark:text-[#97D6DF] dark:border-[#97D6DF]/30" },
    resolved: { label: "Resuelta", icon: CheckCircle2, class: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700" },
  }[attentionStatus];

  return (
    <div data-conversation-thread={conversationId} className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* ── Encabezado Operativo ─────────────────────────────────────────────── */}
      <div className="flex flex-none items-center justify-between border-b border-gray-200 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
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

          <div className="relative flex-none">
            <CounterpartAvatar initials={counterpart.initials} size={40} tone="brand" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#97D6DF] dark:border-gray-900 shadow-xs" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-theme-sm font-bold text-gray-900 dark:text-white">
                {counterpart.name}
              </h2>
              {/* Badge de estado en header */}
              <button
                type="button"
                onClick={() => setShowAttentionPanel(true)}
                title="Cambiar estado de atención"
                className={cn(
                  "hidden sm:inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-opacity hover:opacity-80 cursor-pointer",
                  statusBadge.class
                )}
              >
                <statusBadge.icon className="h-3 w-3" />
                {statusBadge.label}
              </button>
            </div>
            <div className="flex items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400">
              <span>{counterpart.phone}</span>
              {conversation?.assignedTo ? (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#190088] dark:text-[#97D6DF] font-medium">
                  · <span>👤 {conversation.assignedTo.name}</span>
                </span>
              ) : (
                <span className="hidden sm:inline-flex text-[11px] text-[#FF3F1A] font-medium">
                  · Sin asignar
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Acciones de la barra superior */}
        <div className="flex items-center gap-2">
          <Badge
            color="light"
            size="sm"
            className="hidden flex-none gap-1.5 bg-[#190088]/10 text-[#190088] dark:bg-white/10 dark:text-[#97D6DF] border border-[#190088]/20 dark:border-transparent px-2.5 py-1 font-semibold md:inline-flex"
            startIcon={<span className="size-1.5 rounded-full bg-[#FF3F1A]" aria-hidden />}
            intent="conversations.thread.channel"
          >
            WhatsApp
          </Badge>

          {/* Botón para alternar panel de información de atención */}
          {conversation && (
            <button
              type="button"
              onClick={() => setShowAttentionPanel(prev => !prev)}
              aria-label="Panel de atención del contacto"
              title={showAttentionPanel ? "Ocultar panel de atención" : "Ver información y atención"}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-xl border px-3 text-theme-xs font-semibold transition-all cursor-pointer",
                showAttentionPanel
                  ? "border-[#190088] bg-[#190088] text-white shadow-xs dark:bg-white dark:text-[#190088] dark:border-white"
                  : "border-gray-200 text-gray-700 hover:border-[#FF3F1A]/50 hover:text-[#FF3F1A] dark:border-gray-800 dark:text-gray-300 dark:hover:border-white/40 dark:hover:text-white"
              )}
            >
              {showAttentionPanel ? (
                <>
                  <PanelRightClose className="h-4 w-4" />
                  <span className="hidden xl:inline">Ocultar panel</span>
                </>
              ) : (
                <>
                  <PanelRightOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Panel atención</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Cuerpo: Hilo central + Panel de atención lateral ───────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Columna de Mensajes + Compositor */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto bg-[#ECECEC]/30 px-3 py-4 dark:bg-[#030712] sm:px-4"
          >
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="text-theme-sm font-medium text-gray-500 dark:text-gray-400">
                  Todavía no hay mensajes
                </p>
                <p className="text-theme-xs text-gray-400 dark:text-gray-500">
                  Escribe el primero para iniciar la atención con el cliente.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {groups.map(group => (
                  <div key={group.dayKey} className="flex flex-col gap-1">
                    <div className="mb-1 flex justify-center">
                      <span className="inline-flex items-center rounded-full bg-[#EFE6D3]/70 px-3 py-0.5 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-[#EFE6D3] dark:border-gray-700 shadow-2xs">
                        {formatDaySeparator(group.dayIso)}
                      </span>
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

          <MessageComposer key={conversationId} conversationId={conversationId} onSend={onSend} />
        </div>

        {/* Panel lateral contextual de atención */}
        {showAttentionPanel && conversation && (
          <div className="flex-none">
            <ConversationAttentionPanel
              conversation={conversation}
              onUpdateStatus={onUpdateStatus ?? (() => {})}
              onAssignOperator={onAssignOperator ?? (() => {})}
              onUpdateNotes={onUpdateNotes ?? (() => {})}
              onClose={() => setShowAttentionPanel(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ConversationView;

