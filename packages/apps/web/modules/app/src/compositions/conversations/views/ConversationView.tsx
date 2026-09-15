import { useEffect, useMemo, useRef, useState } from "react";
import { 
  ArrowLeft, 
  MessageSquare, 
  PanelRightClose, 
  PanelRightOpen, 
  AlertCircle, 
  Clock3, 
  CheckCircle2,
} from "lucide-react";

import type { 
  AssignedOperator, 
  AttentionStatus, 
  Conversation, 
  ConversationMessage, 
  ConversationMessageContent 
} from "@/contracts/conversation.contract";
import { Avatar, Dropdown, DropdownItem } from "@/elements";
import {
  formatDaySeparator,
  groupMessagesByDay,
  isSameBurst,
} from "../conversation-time.utils";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { ConversationAttentionPanel } from "./ConversationAttentionPanel";
import { cn } from "@/utils";
import { MoreDotIcon } from "@/icons";

export interface ConversationViewProps {
  conversation?: Conversation | null;
  counterpart: { name: string; phone: string; initials: string } | null;
  messages: readonly ConversationMessage[];
  conversationId: string | null;
  onSend: (content: ConversationMessageContent) => void;
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
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
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
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
          <MessageSquare className="h-7 w-7" aria-hidden />
        </span>
        <div>
          <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            Mensajes Necto
          </p>
          <p className="mt-1 text-theme-xs text-gray-400 dark:text-gray-500 max-w-sm">
            Selecciona una conversación de la lista para gestionar la atención y responder en tiempo real con el cliente.
          </p>
        </div>
      </div>
    );
  }

  const attentionStatus: AttentionStatus = conversation?.attentionStatus || "pending";
  const statusBadge = {
    pending: { label: "Por atender", icon: AlertCircle, class: "bg-brand-500/10 text-brand-600 border-brand-500/20 dark:bg-brand-500/20 dark:text-brand-400" },
    in_progress: { label: "En atención", icon: Clock3, class: "bg-brand-500/15 text-brand-700 border-brand-500/30 dark:bg-brand-500/20 dark:text-brand-400" },
    resolved: { label: "Resuelta", icon: CheckCircle2, class: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700" },
  }[attentionStatus];

  return (
    <div data-conversation-thread={conversationId} className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* ── Encabezado estilo Elements ChatBoxHeader ────────────────────────── */}
      <div className="sticky top-0 z-10 flex flex-none items-center justify-between border-b border-gray-200 bg-white px-4 py-3.5 dark:border-gray-800 dark:bg-white/[0.02] sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Volver a la lista de conversaciones"
              title="Volver a la lista"
              className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 lg:hidden"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </button>
          )}

          <Avatar
            size="large"
            status="online"
            src={counterpart.avatar}
            initials={counterpart.initials}
            alt={counterpart.name}
          />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                {counterpart.name}
              </h2>
              <button
                type="button"
                onClick={() => setShowAttentionPanel(true)}
                title="Cambiar estado de atención"
                className={cn(
                  "hidden sm:inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-opacity hover:opacity-80 cursor-pointer",
                  statusBadge.class
                )}
              >
                <statusBadge.icon className="h-3 w-3" />
                {statusBadge.label}
              </button>
            </div>
            <div className="flex items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400">
              <span>{counterpart.phone}</span>
              {conversation?.assignedTo && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-400 font-medium">
                  · <span>👤 {conversation.assignedTo.name}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Acciones de cabecera estilo Elements ──────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* Botón Llamada (Elements ChatBoxHeader) */}
          <button
            type="button"
            className="p-2 text-gray-600 hover:text-brand-500 dark:text-gray-400 dark:hover:text-white/90 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Llamada de voz"
          >
            <svg
              className="stroke-current"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.54488 11.7254L8.80112 10.056C8.94007 9.98476 9.071 9.89524 9.16639 9.77162C9.57731 9.23912 9.66722 8.51628 9.38366 7.89244L7.76239 4.32564C7.23243 3.15974 5.7011 2.88206 4.79552 3.78764L3.72733 4.85577C3.36125 5.22182 3.18191 5.73847 3.27376 6.24794C3.9012 9.72846 5.56003 13.0595 8.25026 15.7497C10.9405 18.44 14.2716 20.0988 17.7521 20.7262C18.2615 20.8181 18.7782 20.6388 19.1442 20.2727L20.2124 19.2045C21.118 18.2989 20.8403 16.7676 19.6744 16.2377L16.1076 14.6164C15.4838 14.3328 14.7609 14.4227 14.2284 14.8336C14.1048 14.929 14.0153 15.06 13.944 15.1989L12.2747 18.4552"
                stroke=""
                strokeWidth="1.5"
              />
            </svg>
          </button>

          {/* Botón Videollamada (Elements ChatBoxHeader) */}
          <button
            type="button"
            className="p-2 text-gray-600 hover:text-brand-500 dark:text-gray-400 dark:hover:text-white/90 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Videollamada"
          >
            <svg
              className="fill-current"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.25 5.25C3.00736 5.25 2 6.25736 2 7.5V16.5C2 17.7426 3.00736 18.75 4.25 18.75H15.25C16.4926 18.75 17.5 17.7426 17.5 16.5V15.3957L20.1118 16.9465C20.9451 17.4412 22 16.8407 22 15.8716V8.12838C22 7.15933 20.9451 6.55882 20.1118 7.05356L17.5 8.60433V7.5C17.5 6.25736 16.4926 5.25 15.25 5.25H4.25ZM17.5 10.3488V13.6512L20.5 15.4325V8.56756L17.5 10.3488ZM3.5 7.5C3.5 7.08579 3.83579 6.75 4.25 6.75H15.25C15.6642 6.75 16 7.08579 16 7.5V16.5C16 16.9142 15.6642 17.25 15.25 17.25H4.25C3.83579 17.25 3.5 16.9142 3.5 16.5V7.5Z"
                fill=""
              />
            </svg>
          </button>

          {/* Dropdown 3-dots (Elements ChatBoxHeader) */}
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => setIsHeaderMenuOpen(prev => !prev)}
              className="p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Más opciones"
            >
              <MoreDotIcon className="size-5" />
            </button>
            <Dropdown isOpen={isHeaderMenuOpen} onClose={() => setIsHeaderMenuOpen(false)} className="w-48 p-1.5">
              <DropdownItem
                onItemClick={() => {
                  setShowAttentionPanel(prev => !prev);
                  setIsHeaderMenuOpen(false);
                }}
                className="rounded-lg text-theme-xs font-medium"
              >
                {showAttentionPanel ? "Ocultar panel de detalles" : "Ver detalles y notas"}
              </DropdownItem>
              {onUpdateStatus && (
                <DropdownItem
                  onItemClick={() => {
                    onUpdateStatus(conversationId, attentionStatus === "resolved" ? "in_progress" : "resolved");
                    setIsHeaderMenuOpen(false);
                  }}
                  className="rounded-lg text-theme-xs font-medium"
                >
                  {attentionStatus === "resolved" ? "Reabrir atención" : "Marcar como resuelta"}
                </DropdownItem>
              )}
            </Dropdown>
          </div>

          {/* Toggle panel lateral */}
          {conversation && (
            <button
              type="button"
              onClick={() => setShowAttentionPanel(prev => !prev)}
              aria-label="Panel de atención del contacto"
              title={showAttentionPanel ? "Ocultar panel lateral" : "Ver información y notas"}
              className={cn(
                "hidden sm:flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-theme-xs font-medium transition-all cursor-pointer",
                showAttentionPanel
                  ? "border-brand-500 bg-brand-500 text-white shadow-theme-xs"
                  : "border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
              )}
            >
              {showAttentionPanel ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
              <span className="hidden xl:inline">
                {showAttentionPanel ? "Cerrar panel" : "Detalles"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── Cuerpo: Hilo central + Panel de atención lateral ───────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto px-4 py-5 space-y-6 sm:px-6 dark:bg-black/10"
          >
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
                  Todavía no hay mensajes
                </p>
                <p className="text-theme-xs text-gray-400 dark:text-gray-500 max-w-xs">
                  Escribe en el campo inferior para iniciar la conversación con el cliente.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {groups.map(group => (
                  <div key={group.dayKey} className="flex flex-col gap-1">
                    <div className="mb-2 flex justify-center">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-white/5 dark:text-gray-400 border border-gray-200/60 dark:border-gray-800">
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
                          authorAvatar={counterpart.avatar}
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
