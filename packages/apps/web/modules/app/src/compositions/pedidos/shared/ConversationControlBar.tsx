import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { Conversation } from "../types";
import {
  Hand,
  ShoppingBag,
  CheckCircle,
  Phone,
  Video,
  Search,
  MoreVertical,
  Receipt,
  ShieldCheck,
  CheckCheck,
  User,
  Plus,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/elements";
import { CreateOrderFromConversationModal } from "./CreateOrderFromConversationModal";

export const ConversationControlBar: React.FC<{ conversation: Conversation }> = ({ conversation }) => {
  const {
    orders,
    takeControl,
    releaseToAI,
    resolveConversation,
    confirmOrder,
    setAiModalOrder,
    setSelectedOrderId,
    currentOperatorName,
  } = usePedidos();

  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);

  const order = conversation.orderId
    ? orders.find(o => o.id === conversation.orderId)
    : undefined;

  const isMine =
    conversation.status === "HUMANO_ATENDIENDO" &&
    conversation.controlledBy === currentOperatorName;
  const canTakeControl =
    conversation.status === "REQUIERE_INTERVENCION" ||
    conversation.status === "IA_ATENDIENDO";

  const orderActionable =
    order && ["NUEVO", "CONFIRMADO"].includes(order.status);

  return (
    <div className="flex-none bg-[#F0F2F5] dark:bg-[#202C33] border-b border-zinc-200 dark:border-[#222E35]">
      {/* WhatsApp Chat Main Header */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-none">
            {conversation.avatarUrl ? (
              <img
                src={conversation.avatarUrl}
                alt={conversation.customerName}
                className="w-10 h-10 rounded-full object-cover shadow-2xs border border-white dark:border-zinc-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#008069] text-white flex items-center justify-center shadow-xs font-bold text-sm">
                {conversation.customerName.charAt(0)}
              </div>
            )}
            <span className="w-2.5 h-2.5 rounded-full bg-[#25D366] border-2 border-white dark:border-[#202C33] absolute bottom-0 right-0" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-sm text-[#111B21] dark:text-[#E9EDEF] truncate">
                {conversation.customerName}
              </h3>
              <CheckCircle className="w-3.5 h-3.5 text-[#00A884] flex-none" title="Empresa Verificada por Meta" />
              <span className="text-[10px] bg-emerald-500/15 text-[#008069] dark:text-[#00A884] px-2 py-0.5 rounded-full font-bold font-mono">
                WhatsApp Business
              </span>
            </div>
            <p className="text-[11px] text-[#54656F] dark:text-[#8696A0] truncate">
              {conversation.customerPhone} · <span className="text-[#00A884] font-medium">en línea</span>
            </p>
          </div>
        </div>

        {/* WhatsApp Action Icons & Linked Order Chip */}
        <div className="flex items-center gap-2">
          {order ? (
            <button
              type="button"
              onClick={() => setSelectedOrderId(order.id)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#111B21] border border-orange-500/30 hover:border-[#FF3F1A] text-xs shadow-2xs transition-all cursor-pointer group"
              title="Abrir comanda de esta conversación"
            >
              <Receipt className="w-3.5 h-3.5 text-[#FF3F1A]" />
              <span className="font-mono font-bold text-zinc-900 dark:text-white group-hover:text-[#FF3F1A]">
                #{order.id}
              </span>
              <span className="text-zinc-400">·</span>
              <span className="font-extrabold text-[#008069] dark:text-[#00A884]">
                ${order.total.toLocaleString("es-CO")}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreateOrderModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF3F1A] hover:bg-[#e03412] text-white font-bold text-xs shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Generar comanda a partir de esta conversación de WhatsApp"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Crear Pedido</span>
            </button>
          )}

          <div className="flex items-center gap-0.5 text-[#54656F] dark:text-[#AEBAC1]">
            <button
              type="button"
              onClick={() => window.open(`https://wa.me/${conversation.customerPhone.replace(/\D/g, '')}`, "_blank")}
              className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer"
              title="Abrir chat directo en WhatsApp"
            >
              <Phone className="w-4 h-4 text-[#008069] dark:text-[#00A884]" />
            </button>
            <button
              type="button"
              className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer"
              title="Videollamada"
            >
              <Video className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer"
              title="Buscar en el chat"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer"
              title="Más opciones"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Human-in-the-Loop Management Strip */}
      <div className="px-4 py-2 bg-white/70 dark:bg-[#111B21]/60 border-t border-zinc-200/80 dark:border-[#222E35] flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {canTakeControl && (
            <button
              type="button"
              onClick={() => takeControl(conversation.id)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Tomar Control (Administrador)</span>
            </button>
          )}

          {conversation.status === "HUMANO_ATENDIENDO" && (
            <>
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 text-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Control Activo: {conversation.controlledBy || currentOperatorName}</span>
              </div>

              <button
                type="button"
                onClick={() => releaseToAI(conversation.id)}
                className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Reanudar Auto-Respuesta</span>
              </button>

              <button
                type="button"
                onClick={() => resolveConversation(conversation.id)}
                className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Marcar Resuelto</span>
              </button>
            </>
          )}

          {conversation.status === "IA_ATENDIENDO" && (
            <span className="flex items-center gap-1.5 text-[#008069] dark:text-[#00A884] font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 text-[11px]">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Canal en Auto-Respuesta WhatsApp</span>
            </span>
          )}
        </div>

        {/* Associated Order Quick Chip */}
        {order && (
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-[#202C33] px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
            <Receipt className="w-3.5 h-3.5 text-zinc-500" />
            <span className="font-bold text-zinc-800 dark:text-zinc-200">
              #{order.id} (${order.total.toLocaleString("es-CO")} COP)
            </span>
            {orderActionable && (
              <div className="flex items-center gap-1 ml-1 border-l border-zinc-300 dark:border-zinc-600 pl-2">
                <button
                  type="button"
                  onClick={() => confirmOrder(order.id)}
                  className="text-emerald-600 hover:underline font-bold text-[11px] cursor-pointer"
                  title="Confirmar comanda a cocina"
                >
                  Confirmar
                </button>
                <span className="text-zinc-400">·</span>
                <button
                  type="button"
                  onClick={() => setAiModalOrder(order)}
                  className="text-sky-600 hover:underline font-bold text-[11px] cursor-pointer"
                  title="Modificar comanda"
                >
                  Modificar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal to create order pre-filled from this WhatsApp conversation */}
      {isCreateOrderModalOpen && (
        <CreateOrderFromConversationModal
          conversation={conversation}
          isOpen={isCreateOrderModalOpen}
          onClose={() => setIsCreateOrderModalOpen(false)}
        />
      )}
    </div>
  );
};
