import React, { useEffect, useMemo, useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { Conversation, ConversationStatus } from "../types";
import { ConversationThread } from "../shared/ConversationThread";
import { ConversationControlBar } from "../shared/ConversationControlBar";
import { ConversationStatusDot } from "../shared/Badges";
import { MessagesSquare, Inbox } from "lucide-react";
import { SearchInput, SegmentedControl } from "@/elements";

type StatusFilter = "todas" | "intervencion" | "humano" | "ia" | "resueltas";

const FILTER_TO_STATUS: Record<Exclude<StatusFilter, "todas">, ConversationStatus> = {
  intervencion: "REQUIERE_INTERVENCION",
  humano: "HUMANO_ATENDIENDO",
  ia: "IA_ATENDIENDO",
  resueltas: "RESUELTO",
};

/**
 * Bandeja de Conversaciones (Human-in-the-Loop) — inbox de dos paneles.
 *
 * Panel izquierdo: lista filtrable/buscable de conversaciones WhatsApp/IA.
 * Panel derecho: control (ConversationControlBar) + hilo (ConversationThread).
 *
 * Todo el estado vive en PedidosContext (mock en memoria); esta vista sólo
 * orquesta selección, filtro y búsqueda.
 */
export const ConversacionesView: React.FC = () => {
  const {
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    markConversationRead,
  } = usePedidos();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("todas");

  const pendingCount = conversations.filter(c => c.status === "REQUIERE_INTERVENCION").length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter(c => {
      const matchesStatus =
        filter === "todas" ? true : c.status === FILTER_TO_STATUS[filter];
      const matchesQuery =
        q === "" ||
        c.customerName.toLowerCase().includes(q) ||
        c.customerPhone.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [conversations, filter, query]);

  const selected = conversations.find(c => c.id === selectedConversationId) || null;

  // Selección por defecto: la primera conversación que requiere intervención.
  useEffect(() => {
    if (selectedConversationId) return;
    const firstPending = conversations.find(c => c.status === "REQUIERE_INTERVENCION");
    setSelectedConversationId((firstPending || conversations[0])?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (conv: Conversation) => {
    setSelectedConversationId(conv.id);
    if (conv.unreadForOperator) markConversationRead(conv.id);
  };

  return (
    <div className="flex h-full min-h-0 gap-3 animate-fade-in">
      {/* Panel izquierdo: lista */}
      <div className="flex flex-col w-full sm:w-[340px] lg:w-[380px] flex-none min-h-0 bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] shadow-xs overflow-hidden">
        <div className="flex-none p-3.5 border-b border-slate-200 dark:border-[#374151] space-y-3">
          <div className="flex items-center gap-2">
            <MessagesSquare className="w-4 h-4 text-[#FF3F1A]" />
            <h2 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">Conversaciones</h2>
            {pendingCount > 0 && (
              <span className="ml-auto text-[10px] bg-[#FF3F1A] text-white px-1.5 py-0.5 rounded-full font-black animate-pulse">
                {pendingCount} requieren atención
              </span>
            )}
          </div>

          <SearchInput
            intent="conversaciones.search"
            placeholder="Buscar por cliente o teléfono…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onClear={() => setQuery("")}
          />

          <div className="overflow-x-auto no-scrollbar">
            <SegmentedControl
              intent="conversaciones.filter"
              tone="panel"
              value={filter}
              onValueChange={setFilter}
              options={[
                { value: "todas", label: "Todas" },
                { value: "intervencion", label: "Intervención", badge: pendingCount > 0 ? (
                  <span className="text-[10px] bg-[#FF3F1A] text-white px-1.5 rounded-full font-black">{pendingCount}</span>
                ) : undefined },
                { value: "humano", label: "Humano" },
                { value: "ia", label: "IA" },
                { value: "resueltas", label: "Resueltas" },
              ]}
            />
          </div>
        </div>

        {/* Lista scrolleable */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-gray-800">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 p-6 text-center">
              <Inbox className="w-8 h-8" />
              <p className="text-xs font-medium">No hay conversaciones para este filtro.</p>
            </div>
          ) : (
            filtered.map(conv => {
              const isActive = conv.id === selectedConversationId;
              const lastMsg = conv.messages[conv.messages.length - 1];
              const needsAttention = conv.status === "REQUIERE_INTERVENCION";
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelect(conv)}
                  className={`w-full text-left px-4 py-3.5 transition-colors cursor-pointer border-l-2 ${
                    isActive
                      ? "bg-orange-50/70 dark:bg-orange-950/30 border-[#FF3F1A]"
                      : needsAttention
                        ? "border-[#FF3F1A]/70 hover:bg-slate-50 dark:hover:bg-gray-800/60"
                        : "border-transparent hover:bg-slate-50 dark:hover:bg-gray-800/60"
                  }`}
                >
                  {/* Fila 1: cliente + hora */}
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-sm ${needsAttention || conv.unreadForOperator ? "font-extrabold text-gray-900 dark:text-gray-50" : "font-semibold text-gray-700 dark:text-gray-200"}`}>
                      {conv.customerName}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono flex-none">{conv.lastMessageAt}</span>
                  </div>

                  {/* Fila 2: preview del último mensaje */}
                  {lastMsg && (
                    <p className={`text-[11px] truncate mt-0.5 ${conv.unreadForOperator ? "text-gray-600 dark:text-gray-300 font-medium" : "text-gray-400"}`}>
                      {lastMsg.sender === "ia" ? "IA: " : lastMsg.sender === "humano" ? "Tú: " : ""}
                      {lastMsg.text}
                    </p>
                  )}

                  {/* Fila 3: único indicador de estado/control */}
                  <div className="mt-2">
                    <ConversationStatusDot status={conv.status} />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Panel derecho: hilo + control */}
      <div className="flex-1 min-w-0 min-h-0 bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] shadow-xs overflow-hidden flex flex-col">
        {selected ? (
          <>
            <ConversationControlBar conversation={selected} />
            <ConversationThread conversation={selected} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 p-6 text-center">
            <MessagesSquare className="w-10 h-10" />
            <p className="text-sm font-bold">Selecciona una conversación</p>
            <p className="text-xs max-w-xs">
              Elige una conversación de la lista para ver el hilo y, si lo necesitas, tomar el control para atender al cliente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
