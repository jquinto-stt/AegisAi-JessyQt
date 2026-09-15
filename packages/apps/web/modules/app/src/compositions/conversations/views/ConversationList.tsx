import { useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";

import type { Conversation } from "@/contracts/conversation.contract";
import { Badge, SearchInput } from "@/elements";
import { filterConversations } from "../context/ConversationsContext";
import { formatListTimestamp } from "../conversation-time.utils";
import { CounterpartAvatar } from "../shared/CounterpartAvatar";
import { cn } from "@/utils";

/* ── Lista de conversaciones (panel izquierdo) ───────────────────────────────
 *
 * ── Qué se conserva de la referencia `wacrm-main` ───────────────────────────
 *
 *   · La fila tiene **dos líneas**: arriba nombre + hora, abajo vista previa +
 *     contador de no leídos. Es la densidad correcta: cabe lo justo para decidir
 *     a cuál entrar sin convertir la lista en una tabla.
 *   · La **hora** va arriba, junto al nombre, y no como una tercera línea: es
 *     metadato de la fila, no del mensaje.
 *   · El **no leído** es una píldora rellena, no un punto: el número importa.
 *   · El hilo **activo** se marca con fondo, no con un borde de color suelto.
 *   · `min-height: 0` en el contenedor con scroll: sin él, un hijo flex crece para
 *     caber todo y la lista se desborda sin barra (fue un fallo real del original).
 *
 * ── Qué NO se conserva, a propósito ─────────────────────────────────────────
 *
 *   · Los filtros `open / pending / closed`: son **estados de un CRM** (§10). Un
 *     canal conversacional no tiene embudo; tiene mensajes sin leer, y eso es lo
 *     único que se filtra.
 *   · Los filtros por **etiqueta** y por **empresa**: pertenecen al modelo de
 *     contactos del CRM, que aquí no existe.
 *   · El **punto de estado** por fila: era el estado del pipeline pintado como un
 *     punto de color sin leyenda. Aquí el único indicador es el de no leídos, que
 *     se explica solo.
 *
 * La búsqueda **sí** se conserva tal cual: busca en nombre, teléfono y último
 * mensaje, que es exactamente lo que se ve en cada fila.
 * ─────────────────────────────────────────────────────────────────────────── */

/** Los filtros de la bandeja operativa de atención. */
const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Por atender" },
  { key: "in_progress", label: "En atención" },
  { key: "unread", label: "Sin leer" },
] as const;

type ConversationFilter = (typeof FILTERS)[number]["key"];

export interface ConversationListProps {
  conversations: readonly Conversation[];
  activeConversationId: string | null;
  onSelect: (conversationId: string) => void;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  isLoading = false,
}: ConversationListProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searched = q
      ? conversations.filter(c => {
          const name = c.counterpart.name.toLowerCase();
          const phone = c.counterpart.phone.toLowerCase();
          const preview = c.lastMessagePreview.toLowerCase();
          const op = c.assignedTo?.name.toLowerCase() || "";
          return name.includes(q) || phone.includes(q) || preview.includes(q) || op.includes(q);
        })
      : [...conversations];

    switch (filter) {
      case "unread":
        return searched.filter(c => c.unreadCount > 0);
      case "pending":
        return searched.filter(c => c.attentionStatus === "pending");
      case "in_progress":
        return searched.filter(c => c.attentionStatus === "in_progress");
      case "all":
      default:
        return searched;
    }
  }, [conversations, query, filter]);

  const counts = useMemo(() => ({
    all: conversations.length,
    pending: conversations.filter(c => c.attentionStatus === "pending").length,
    in_progress: conversations.filter(c => c.attentionStatus === "in_progress").length,
    unread: conversations.reduce((sum, c) => sum + (c.unreadCount > 0 ? 1 : 0), 0),
  }), [conversations]);

  return (
    <div
      data-conversation-list
      className="flex h-full w-full min-h-0 flex-col border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:w-[350px] lg:flex-none lg:border-r"
    >
      {/* ── Búsqueda y filtros ─────────────────────────────────────────────── */}
      <div className="flex-none space-y-2.5 border-b border-gray-200 p-3.5 dark:border-gray-800">
        <SearchInput
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar chat, teléfono o asesor..."
          aria-label="Buscar conversación"
          data-conversation-search
          intent="conversations.list.search"
        />

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar conversaciones">
          {FILTERS.map(option => {
            const isActive = filter === option.key;
            const count = counts[option.key];
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setFilter(option.key)}
                aria-pressed={isActive}
                data-conversation-filter={option.key}
                data-conversation-filter-count={count}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-theme-xs font-semibold transition-all",
                  isActive
                    ? "bg-[#190088] text-white shadow-xs dark:bg-white dark:text-[#190088]"
                    : "text-gray-600 hover:bg-[#EFE6D3]/40 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5"
                )}
              >
                {option.label}
                <span className={cn("tabular-nums text-[11px]", isActive ? "opacity-95 font-bold" : "opacity-60")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filas de conversación ───────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12" role="status">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-[#FF3F1A]" />
            <span className="sr-only">Cargando conversaciones</span>
          </div>
        ) : visible.length === 0 ? (
          <ConversationListEmpty hasQuery={query.trim().length > 0} hasFilter={filter !== "all"} />
        ) : (
          <ul className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800/60" data-conversation-rows>
            {visible.map(conversation => (
              <li key={conversation.id}>
                <ConversationItem
                  conversation={conversation}
                  isActive={conversation.id === activeConversationId}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── Fila de Conversación Necto Style ──────────────────────────────────────── */

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (conversationId: string) => void;
}

function ConversationItem({ conversation, isActive, onSelect }: ConversationItemProps) {
  const { counterpart, lastMessagePreview, lastMessageAt, unreadCount, attentionStatus = "pending", assignedTo } = conversation;
  const hasUnread = unreadCount > 0;

  const statusConfig = {
    pending: {
      label: "Por atender",
      badgeClass: "bg-[#FF3F1A]/10 text-[#FF3F1A] border-[#FF3F1A]/30 dark:bg-[#FF3F1A]/20 dark:text-[#FF3F1A]",
      dotClass: "bg-[#FF3F1A]",
    },
    in_progress: {
      label: "En atención",
      badgeClass: "bg-[#190088]/10 text-[#190088] border-[#190088]/20 dark:bg-[#97D6DF]/15 dark:text-[#97D6DF] dark:border-[#97D6DF]/30",
      dotClass: "bg-[#190088] dark:bg-[#97D6DF]",
    },
    resolved: {
      label: "Resuelta",
      badgeClass: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
      dotClass: "bg-gray-400",
    },
  }[attentionStatus];

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      aria-current={isActive ? "true" : undefined}
      data-conversation-row={conversation.id}
      data-conversation-row-unread={hasUnread ? "true" : "false"}
      className={cn(
        "flex w-full cursor-pointer items-start gap-3 px-3.5 py-3 text-left transition-all border-l-3",
        isActive
          ? "border-[#FF3F1A] bg-[#EFE6D3]/25 dark:border-[#FF3F1A] dark:bg-white/[0.05]"
          : "border-transparent hover:bg-[#EFE6D3]/15 dark:hover:bg-white/[0.02]"
      )}
    >
      {/* Avatar con presencia online */}
      <div className="relative flex-none">
        <CounterpartAvatar initials={counterpart.initials} size={42} tone="brand" />
        <span
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-[1.5px] border-white bg-[#97D6DF] dark:border-gray-900 shadow-xs"
          aria-hidden="true"
        />
      </div>

      <div className="min-w-0 flex-1">
        {/* Fila 1: Nombre + Hora */}
        <div className="flex items-baseline justify-between gap-1.5">
          <span
            className={cn(
              "truncate text-theme-sm text-gray-900 dark:text-white",
              hasUnread ? "font-bold" : "font-semibold"
            )}
          >
            {counterpart.name}
          </span>
          <span
            className={cn(
              "flex-none text-[11px] tabular-nums",
              hasUnread ? "font-bold text-[#FF3F1A]" : "text-gray-400 dark:text-gray-500"
            )}
          >
            {formatListTimestamp(lastMessageAt)}
          </span>
        </div>

        {/* Fila 2: Snippet + Badge No Leídos */}
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-theme-xs",
              hasUnread ? "font-semibold text-gray-800 dark:text-gray-200" : "text-gray-500 dark:text-gray-400"
            )}
          >
            {lastMessagePreview}
          </p>
          {hasUnread && (
            <span data-conversation-unread-badge={unreadCount} className="inline-flex flex-none">
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FF3F1A] px-1 text-[11px] font-bold text-white shadow-xs">
                {unreadCount}
              </span>
            </span>
          )}
        </div>

        {/* Fila 3: Metadatos operativos (Estado de atención + Agente asignado) */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-medium leading-none",
              statusConfig.badgeClass
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dotClass)} />
            {statusConfig.label}
          </span>

          {assignedTo ? (
            <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <span className="truncate max-w-[90px]">👤 {assignedTo.name}</span>
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 italic">
              Sin asignar
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ── Estados vacíos ────────────────────────────────────────────────────────── */

/**
 * ⚠️ El vacío **dice por qué** está vacío. "No hay conversaciones" cuando el
 * operador acaba de buscar algo es una respuesta equivocada a la pregunta que
 * hizo: buscó y no encontró, que no es lo mismo que no tener ninguna.
 */
function ConversationListEmpty({ hasQuery, hasFilter }: { hasQuery: boolean; hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
        <MessageSquare className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-theme-sm font-medium text-gray-600 dark:text-gray-300">
        {hasQuery ? "Sin resultados" : hasFilter ? "Nada sin leer" : "Sin conversaciones"}
      </p>
      <p className="text-theme-xs text-gray-400 dark:text-gray-500">
        {hasQuery
          ? "Ninguna conversación coincide con la búsqueda."
          : hasFilter
          ? "Todas las conversaciones están al día."
          : "Aquí aparecerán las conversaciones de WhatsApp de esta sede."}
      </p>
    </div>
  );
}

export default ConversationList;
