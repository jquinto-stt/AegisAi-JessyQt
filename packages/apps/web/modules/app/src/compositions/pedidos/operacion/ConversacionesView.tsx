import React, { useEffect, useMemo, useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { Conversation, ConversationStatus } from "../types";
import { ConversationThread } from "../shared/ConversationThread";
import { ConversationControlBar } from "../shared/ConversationControlBar";
import {
  MessageSquare,
  Search,
  CheckCheck,
  MoreVertical,
  Inbox,
  Lock,
  User,
  CreditCard,
  AlertTriangle,
  Shield,
  Bot,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Phone,
  Tag,
} from "lucide-react";

type StatusFilter = "todas" | "intervencion" | "humano" | "ia" | "resueltas";

const FILTER_TO_STATUS: Record<Exclude<StatusFilter, "todas">, ConversationStatus> = {
  intervencion: "REQUIERE_INTERVENCION",
  humano: "HUMANO_ATENDIENDO",
  ia: "IA_ATENDIENDO",
  resueltas: "RESUELTO",
};

export const ConversacionesView: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded }) => {
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
    <div
      className={`flex h-[calc(100vh-140px)] min-h-[580px] w-full ${
        isEmbedded
          ? "rounded-none border-0 shadow-none"
          : "rounded-3xl shadow-xl border border-zinc-200/90 dark:border-zinc-800"
      } bg-[#F0F2F5] dark:bg-[#111B21] animate-fade-in overflow-hidden`}
    >
      {/* Left Panel: WhatsApp Business Chats Sidebar */}
      <div className="flex flex-col w-full sm:w-[340px] md:w-[380px] lg:w-[410px] flex-none min-h-0 h-full bg-white dark:bg-[#111B21] border-r border-zinc-200 dark:border-[#222E35] overflow-hidden">
        {/* WhatsApp Business Top Header */}
        <div className="flex-none px-4 py-3 bg-[#F0F2F5] dark:bg-[#202C33] flex items-center justify-between border-b border-zinc-200 dark:border-[#222E35]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#008069] text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-extrabold text-sm text-[#111B21] dark:text-[#E9EDEF] leading-none">
                  WhatsApp Business
                </h2>
                <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
              </div>
              <span className="text-[10px] text-[#008069] dark:text-[#00A884] font-bold leading-none mt-1 block">
                Bandeja Oficial Conectada
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[#54656F] dark:text-[#AEBAC1]">
            <button
              type="button"
              onClick={() => window.open("https://web.whatsapp.com", "_blank", "noopener,noreferrer")}
              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#111B21] text-[#008069] dark:text-[#00A884] hover:bg-[#008069] hover:text-white dark:hover:bg-[#008069] dark:hover:text-white border border-zinc-200 dark:border-zinc-700 font-bold text-[11px] flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              title="Abrir WhatsApp Web en pestaña nueva"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp Web</span>
            </button>

            <button
              type="button"
              className="p-1.5 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer"
              title="Opciones del canal"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3 space-y-2.5 bg-white dark:bg-[#111B21] border-b border-zinc-100 dark:border-[#222E35]">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#54656F] dark:text-[#AEBAC1] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por cliente o teléfono..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-[#F0F2F5] dark:bg-[#202C33] text-[#111B21] dark:text-[#E9EDEF] placeholder-[#54656F] dark:placeholder-[#8696A0] focus:outline-none focus:ring-1 focus:ring-[#00A884] transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: "todas" as StatusFilter, label: "Todos" },
              { id: "intervencion" as StatusFilter, label: "Intervención", count: pendingCount },
              { id: "ia" as StatusFilter, label: "Bot IA" },
              { id: "humano" as StatusFilter, label: "Admin en Vivo" },
              { id: "resueltas" as StatusFilter, label: "Resueltos" },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex-none flex items-center gap-1.5 select-none ${
                  filter === tab.id
                    ? "bg-[#008069] text-white font-bold shadow-xs"
                    : "bg-[#F0F2F5] dark:bg-[#202C33] text-[#54656F] dark:text-[#8696A0] hover:bg-zinc-200 dark:hover:bg-[#2A3942]"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#FF3F1A] text-white text-[9px] font-black flex items-center justify-center">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chats List with native vertical scrollbar */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-zinc-100 dark:divide-[#222E35] scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-[#54656F] dark:text-[#8696A0] space-y-2">
              <Inbox className="w-8 h-8 opacity-40" />
              <p className="text-xs font-medium">No hay conversaciones en esta pestaña.</p>
            </div>
          ) : (
            filtered.map(conv => {
              const isSelected = conv.id === selectedConversationId;
              const lastMsg = conv.messages[conv.messages.length - 1];
              const needsIntervention = conv.status === "REQUIERE_INTERVENCION";
              const isHuman = conv.status === "HUMANO_ATENDIENDO";
              const isPayment = conv.requiresHandoffReason === "VERIFICAR_PAGO_TRANSFERENCIA";

              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelect(conv)}
                  className={`px-4 py-3.5 transition-colors cursor-pointer flex items-center gap-3 relative select-none ${
                    isSelected
                      ? "bg-[#F0F2F5] dark:bg-[#2A3942] border-l-4 border-[#008069]"
                      : "hover:bg-[#F5F6F6] dark:hover:bg-[#202C33]"
                  }`}
                >
                  {/* Left Avatar with Photo & Badge */}
                  <div className="relative flex-none">
                    {conv.avatarUrl ? (
                      <img
                        src={conv.avatarUrl}
                        alt={conv.customerName}
                        className="w-12 h-12 rounded-full object-cover shadow-2xs border border-white dark:border-zinc-700"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#008069] text-white flex items-center justify-center shadow-xs">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                    {/* Role / Alert Badge Ring */}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-[#111B21] ${
                        isPayment
                          ? "bg-purple-600 text-white animate-pulse"
                          : needsIntervention
                          ? "bg-rose-500 text-white animate-pulse"
                          : isHuman
                          ? "bg-rose-600 text-white"
                          : "bg-emerald-500 text-white"
                      }`}
                      title={
                        isPayment
                          ? "Comprobante de Pago por Verificar"
                          : needsIntervention
                          ? "Requiere Intervención"
                          : isHuman
                          ? "Atendido por Administrador"
                          : "Atendido por Bot IA"
                      }
                    >
                      {isPayment ? (
                        <CreditCard className="w-2.5 h-2.5" />
                      ) : needsIntervention ? (
                        <AlertTriangle className="w-2.5 h-2.5" />
                      ) : isHuman ? (
                        <Shield className="w-2.5 h-2.5" />
                      ) : (
                        <Bot className="w-2.5 h-2.5" />
                      )}
                    </span>
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1">
                      <h4
                        className={`text-sm truncate ${
                          needsIntervention || conv.unreadForOperator
                            ? "font-extrabold text-[#111B21] dark:text-[#E9EDEF]"
                            : "font-semibold text-[#111B21] dark:text-[#D1D7DB]"
                        }`}
                      >
                        {conv.customerName}
                      </h4>
                      <span
                        className={`text-[11px] font-mono flex-none ${
                          needsIntervention
                            ? "text-[#FF3F1A] font-bold"
                            : "text-[#667781] dark:text-[#8696A0]"
                        }`}
                      >
                        {conv.lastMessageAt}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-1">
                      <p
                        className={`text-xs truncate flex items-center gap-1 ${
                          conv.unreadForOperator
                            ? "font-semibold text-[#111B21] dark:text-[#E9EDEF]"
                            : "text-[#667781] dark:text-[#8696A0]"
                        }`}
                      >
                        {lastMsg && lastMsg.sender !== "cliente" && (
                          <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB] flex-none" />
                        )}
                        <span className="truncate">
                          {lastMsg ? lastMsg.text : "Sin mensajes"}
                        </span>
                      </p>

                      {conv.unreadForOperator && (
                        <span className="w-4 h-4 rounded-full bg-[#25D366] text-white text-[10px] font-bold flex items-center justify-center flex-none shadow-2xs">
                          1
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel: WhatsApp Active Chat Thread + Control Header */}
      <div className="flex-1 min-w-0 min-h-0 h-full bg-[#EAE6DF] dark:bg-[#0B141A] flex flex-col relative overflow-hidden">
        {selected ? (
          <>
            <ConversationControlBar conversation={selected} />
            <ConversationThread conversation={selected} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#F0F2F5] dark:bg-[#222E35] text-[#54656F] dark:text-[#8696A0] space-y-4">
            <div className="w-20 h-20 rounded-full bg-[#008069]/10 text-[#008069] flex items-center justify-center shadow-sm">
              <MessageSquare className="w-10 h-10" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-xl font-black text-[#111B21] dark:text-[#E9EDEF]">
                WhatsApp Business Web
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Selecciona una conversación de la lista para gestionar pedidos en vivo, certificar pagos y atender a tus clientes con asistencia IA.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#008069] dark:text-[#00A884] font-bold bg-[#008069]/10 px-3 py-1.5 rounded-full">
              <Lock className="w-3.5 h-3.5" />
              <span>Cifrado de extremo a extremo · Cloud API</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
