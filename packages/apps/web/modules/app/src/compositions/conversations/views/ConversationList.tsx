import { useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";

import type { Conversation } from "@/contracts/conversation.contract";
import { Avatar, Dropdown, DropdownItem } from "@/elements";
import { formatListTimestamp } from "../conversation-time.utils";
import { cn } from "@/utils";
import { MoreDotIcon } from "@/icons";

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
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

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
      className="flex h-full w-full min-h-0 flex-col border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02] lg:w-[360px] lg:flex-none lg:border-r"
    >
      {/* ── Encabezado estilo Elements ChatHeaderTitle ──────────────────────── */}
      <div className="flex-none p-4 pb-3 sm:px-5 sm:pt-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl flex items-center gap-2">
              Chats
              <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                ({conversations.length})
              </span>
            </h3>
          </div>
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => setIsHeaderMenuOpen(prev => !prev)}
              aria-label="Opciones de chat"
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <MoreDotIcon className="size-5" />
            </button>
            <Dropdown isOpen={isHeaderMenuOpen} onClose={() => setIsHeaderMenuOpen(false)} className="w-44 p-1.5">
              <DropdownItem
                onItemClick={() => {
                  setFilter("all");
                  setIsHeaderMenuOpen(false);
                }}
                className="rounded-lg text-theme-xs font-medium"
              >
                Ver todas las conversaciones
              </DropdownItem>
              <DropdownItem
                onItemClick={() => {
                  setFilter("unread");
                  setIsHeaderMenuOpen(false);
                }}
                className="rounded-lg text-theme-xs font-medium"
              >
                Filtrar no leídas
              </DropdownItem>
            </Dropdown>
          </div>
        </div>

        {/* ── Buscador estilo Elements ─────────────────────────────────────── */}
        <div className="relative mt-3.5 w-full">
          <span className="absolute -translate-y-1/2 left-3.5 top-1/2 text-gray-400 pointer-events-none">
            <svg
              className="fill-gray-400 dark:fill-gray-500"
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3.04199 9.37381C3.04199 5.87712 5.87735 3.04218 9.37533 3.04218C12.8733 3.04218 15.7087 5.87712 15.7087 9.37381C15.7087 12.8705 12.8733 15.7055 9.37533 15.7055C5.87735 15.7055 3.04199 12.8705 3.04199 9.37381ZM9.37533 1.54218C5.04926 1.54218 1.54199 5.04835 1.54199 9.37381C1.54199 13.6993 5.04926 17.2055 9.37533 17.2055C11.2676 17.2055 13.0032 16.5346 14.3572 15.4178L17.1773 18.2381C17.4702 18.531 17.945 18.5311 18.2379 18.2382C18.5308 17.9453 18.5309 17.4704 18.238 17.1775L15.4182 14.3575C16.5367 13.0035 17.2087 11.2671 17.2087 9.37381C17.2087 5.04835 13.7014 1.54218 9.37533 1.54218Z"
                fill=""
              />
            </svg>
          </span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search..."
            aria-label="Buscar conversación"
            data-conversation-search
            className="h-10 w-full rounded-lg border border-gray-300 bg-transparent py-2 pl-10 pr-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900/80 dark:text-white/90 dark:placeholder:text-gray-500 dark:focus:border-brand-500"
          />
        </div>

        {/* ── Filtros rápidos de atención ─────────────────────────────────── */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar conversaciones">
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
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all",
                  isActive
                    ? "bg-brand-500 text-white shadow-theme-xs"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                )}
              >
                {option.label}
                <span className={cn("tabular-nums text-[10px]", isActive ? "opacity-95 font-bold" : "opacity-60")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filas de conversación (Elements ChatList) ───────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 sm:px-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12" role="status">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500" />
            <span className="sr-only">Cargando conversaciones</span>
          </div>
        ) : visible.length === 0 ? (
          <ConversationListEmpty hasQuery={query.trim().length > 0} hasFilter={filter !== "all"} />
        ) : (
          <ul className="flex flex-col gap-1 py-1" data-conversation-rows>
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

/* ── Fila de Conversación Elements Style ───────────────────────────────────── */

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (conversationId: string) => void;
}

function ConversationItem({ conversation, isActive, onSelect }: ConversationItemProps) {
  const { counterpart, lastMessagePreview, lastMessageAt, unreadCount, attentionStatus = "pending", assignedTo } = conversation;
  const hasUnread = unreadCount > 0;

  const statusVariant = attentionStatus === "resolved" 
    ? "offline" 
    : attentionStatus === "in_progress" 
    ? "busy" 
    : "online";

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      aria-current={isActive ? "true" : undefined}
      data-conversation-row={conversation.id}
      data-conversation-row-unread={hasUnread ? "true" : "false"}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left transition-all",
        isActive
          ? "bg-brand-500/[0.08] dark:bg-white/[0.08] ring-1 ring-brand-500/20 shadow-theme-xs"
          : "hover:bg-gray-100 dark:hover:bg-white/[0.03]"
      )}
    >
      {/* Avatar oficial de Elements con indicador de presencia */}
      <Avatar
        size="large"
        src={counterpart.avatar}
        initials={counterpart.initials}
        status={statusVariant}
        alt={counterpart.name}
      />

      <div className="min-w-0 flex-1">
        {/* Línea 1: Nombre + Hora relativa */}
        <div className="flex items-center justify-between gap-1.5">
          <span
            className={cn(
              "truncate text-theme-sm text-gray-800 dark:text-white/90",
              hasUnread ? "font-bold" : "font-semibold"
            )}
          >
            {counterpart.name}
          </span>
          <span
            className={cn(
              "flex-none text-theme-xs tabular-nums",
              hasUnread ? "font-bold text-brand-500" : "text-gray-400 dark:text-gray-500"
            )}
          >
            {formatListTimestamp(lastMessageAt)}
          </span>
        </div>

        {/* Línea 2: Role o Snippet + Badge No Leídos */}
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-theme-xs",
              hasUnread ? "font-medium text-gray-800 dark:text-white/90" : "text-gray-500 dark:text-gray-400"
            )}
          >
            {counterpart.role || lastMessagePreview}
          </p>
          {hasUnread && (
            <span data-conversation-unread-badge={unreadCount} className="inline-flex flex-none">
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white shadow-theme-xs">
                {unreadCount}
              </span>
            </span>
          )}
        </div>

        {/* Línea 3: Rol / Operador asignado */}
        <div className="mt-1 flex items-center justify-between gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
          <span className="truncate">{counterpart.phone}</span>
          {assignedTo && (
            <span className="truncate text-brand-600 dark:text-brand-400 font-medium">
              {assignedTo.name}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ── Estados vacíos ────────────────────────────────────────────────────────── */

function ConversationListEmpty({ hasQuery, hasFilter }: { hasQuery: boolean; hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-400">
        <MessageSquare className="h-6 w-6" aria-hidden />
      </span>
      <p className="text-theme-sm font-semibold text-gray-700 dark:text-gray-200">
        {hasQuery ? "Sin resultados" : hasFilter ? "Nada sin leer" : "Sin conversaciones"}
      </p>
      <p className="text-theme-xs text-gray-400 dark:text-gray-500 max-w-xs">
        {hasQuery
          ? "Ninguna conversación coincide con la búsqueda."
          : hasFilter
          ? "Todas las conversaciones están al día."
          : "Aquí aparecerán los mensajes y chats entrantes de esta sede."}
      </p>
    </div>
  );
}

export default ConversationList;
