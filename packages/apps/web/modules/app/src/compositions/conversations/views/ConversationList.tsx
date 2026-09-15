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

/** Los filtros del canal: todo o sólo lo que espera respuesta. */
const FILTERS = [
  { key: "all", label: "Todas" },
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
    const searched = filterConversations(conversations, query);
    return filter === "unread" ? searched.filter(c => c.unreadCount > 0) : searched;
  }, [conversations, query, filter]);

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations]
  );

  return (
    <div
      data-conversation-list
      className="flex h-full min-h-0 flex-col border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:w-[320px] lg:flex-none lg:border-r"
    >
      {/* ── Búsqueda y filtros ─────────────────────────────────────────────── */}
      <div className="flex-none space-y-2.5 border-b border-gray-200 p-3 dark:border-gray-800">
        {/* ⚠️ `SearchInput` es la extensión local del proyecto, y se elige por una
            razón dura: reenvía `{...rest}` al `<input>` REAL, que es lo único que
            satisface a la guarda — le escribe el valor con el setter nativo de
            `HTMLInputElement.prototype` y dispara `input`. El `Input` del catálogo no
            reenvía `data-*` y no admite icono a la izquierda: no sirve aquí. */}
        <SearchInput
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar conversación"
          aria-label="Buscar conversación"
          data-conversation-search
          intent="conversations.list.search"
        />

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar conversaciones">
          {FILTERS.map(option => {
            const isActive = filter === option.key;
            const count = option.key === "unread" ? unreadTotal : conversations.length;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setFilter(option.key)}
                aria-pressed={isActive}
                data-conversation-filter={option.key}
                data-conversation-filter-count={count}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-theme-xs font-medium transition-colors",
                  isActive
                    ? "bg-secondary-600 text-white dark:bg-white dark:text-secondary-900"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
                )}
              >
                {option.label}
                <span className={cn("tabular-nums", isActive ? "opacity-80" : "opacity-60")}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filas ──────────────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12" role="status">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500" />
            <span className="sr-only">Cargando conversaciones</span>
          </div>
        ) : visible.length === 0 ? (
          <ConversationListEmpty hasQuery={query.trim().length > 0} hasFilter={filter === "unread"} />
        ) : (
          <ul className="flex flex-col" data-conversation-rows>
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

/* ── Fila ──────────────────────────────────────────────────────────────────── */

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (conversationId: string) => void;
}

function ConversationItem({ conversation, isActive, onSelect }: ConversationItemProps) {
  const { counterpart, lastMessagePreview, lastMessageAt, unreadCount } = conversation;
  const hasUnread = unreadCount > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      aria-current={isActive ? "true" : undefined}
      data-conversation-row={conversation.id}
      data-conversation-row-unread={hasUnread ? "true" : "false"}
      className={cn(
        "flex w-full cursor-pointer items-start gap-3 px-3 py-3 text-left transition-colors",
        isActive
          ? "bg-gray-100 dark:bg-white/[0.06]"
          : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
      )}
    >
      <CounterpartAvatar initials={counterpart.initials} size={40} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-theme-sm text-gray-800 dark:text-white/90",
              hasUnread ? "font-semibold" : "font-medium"
            )}
          >
            {counterpart.name}
          </span>
          <span
            className={cn(
              "flex-none text-theme-xs tabular-nums",
              hasUnread ? "font-medium text-brand-500" : "text-gray-400 dark:text-gray-500"
            )}
          >
            {formatListTimestamp(lastMessageAt)}
          </span>
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-theme-xs",
              hasUnread ? "text-gray-700 dark:text-gray-300" : "text-gray-500 dark:text-gray-400"
            )}
          >
            {lastMessagePreview}
          </p>
          {hasUnread && (
            /* ⚠️ El `Badge` del catálogo no reenvía `data-*` (lista de props fija, sólo
               emite `data-intent`): el atributo cuyo valor cuenta la guarda vive en el
               `<span>` que lo envuelve. */
            <span data-conversation-unread-badge={unreadCount} className="inline-flex flex-none">
              <Badge
                color="primary"
                variant="solid"
                size="sm"
                className="h-[18px] min-w-[18px] justify-center px-1 text-[11px] font-semibold leading-none"
                intent="conversations.list.unread"
              >
                {unreadCount}
              </Badge>
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
