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
    sendToKitchen,
    markOrderReady,
    deliverOrder,
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
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#111B21] border border-zinc-200 dark:border-zinc-700 hover:border-[#190088] dark:hover:border-[#97D6DF] text-xs shadow-2xs transition-all cursor-pointer group"
              title="Abrir comanda de esta conversación"
            >
              <Receipt className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF]" />
              <span className="font-mono font-bold text-zinc-900 dark:text-white group-hover:text-[#190088] dark:group-hover:text-[#97D6DF]">
                #{order.id}
              </span>
              <span className="text-zinc-400">·</span>
              <span className="font-extrabold text-[#190088] dark:text-[#97D6DF]">
                ${order.total.toLocaleString("es-CO")}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreateOrderModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#190088] hover:bg-[#14006e] text-white font-bold text-xs shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
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
              className="px-3 py-1.5 rounded-lg bg-[#190088] hover:bg-[#14006e] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Tomar Control (Operador)</span>
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
      </div>

      {/* Associated Order Live Kanban Strip */}
      {order && (
        <div className="px-4 py-2 bg-[#ECECEC]/60 dark:bg-[#182229] border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-[#190088]/10 dark:bg-[#190088]/20 text-[#190088] dark:text-[#97D6DF] flex items-center justify-center font-bold text-xs font-mono flex-none">
              #{order.turnNumber || "00"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  #{order.id}
                </span>
                <span className="text-zinc-400">·</span>
                <span className="font-bold text-[#190088] dark:text-[#97D6DF] font-mono">
                  ${order.total.toLocaleString("es-CO")}
                </span>
                <span className="text-zinc-400">·</span>
                <span className="text-zinc-500 dark:text-zinc-400 truncate max-w-[200px]">
                  {order.items.map(i => `${i.quantity}× ${i.name}`).join(", ")}
                </span>
              </div>
            </div>
          </div>

          {/* Kanban Stage Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Stage pill */}
            <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] ${
              order.status === "NUEVO"
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                : order.status === "CONFIRMADO" || order.status === "EN_PREPARACION"
                ? "bg-[#190088]/15 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20"
                : order.status === "LISTO"
                ? "bg-[#97D6DF]/25 text-[#190088] dark:text-[#97D6DF] border border-[#97D6DF]/40"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
            }`}>
              Etapa: {order.status === "NUEVO" ? "1. En Cola" : order.status === "CONFIRMADO" ? "2. Confirmado" : order.status === "EN_PREPARACION" ? "3. En Horno" : order.status === "LISTO" ? "4. Listo" : "5. Entregado"}
            </span>

            {order.status === "NUEVO" && (
              <button
                type="button"
                onClick={() => confirmOrder(order.id)}
                className="px-2.5 py-1 rounded-lg bg-[#190088] hover:bg-[#14006e] text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
                title="Confirmar comanda al Kanban"
              >
                Aceptar Pedido
              </button>
            )}

            {order.status === "CONFIRMADO" && (
              <button
                type="button"
                onClick={() => sendToKitchen(order.id)}
                className="px-2.5 py-1 rounded-lg bg-[#190088] hover:bg-[#14006e] text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
                title="Enviar comanda a cocina KDS"
              >
                Pasar a Cocina (KDS)
              </button>
            )}

            {order.status === "EN_PREPARACION" && (
              <button
                type="button"
                onClick={() => markOrderReady(order.id)}
                className="px-2.5 py-1 rounded-lg bg-[#190088] hover:bg-[#14006e] text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
                title="Marcar orden lista para despacho"
              >
                Marcar Listo
              </button>
            )}

            {order.status === "LISTO" && (
              <button
                type="button"
                onClick={() => deliverOrder(order.id)}
                className="px-2.5 py-1 rounded-lg bg-[#190088] hover:bg-[#14006e] text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
                title="Marcar pedido entregado"
              >
                Marcar Entregado
              </button>
            )}

            {/* Direct jump to Kanban board button */}
            <button
              type="button"
              onClick={() => {
                setSelectedOrderId(order.id);
                window.dispatchEvent(
                  new CustomEvent("necto_navigate_pedidos", {
                    detail: { section: "operacion", opTab: "en-vivo" },
                  })
                );
              }}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#111B21] border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:text-[#190088] dark:hover:text-[#97D6DF] font-bold text-[11px] shadow-2xs transition-all cursor-pointer flex items-center gap-1"
              title="Abrir comanda en el Tablero Kanban"
            >
              <span>Ver en Tablero</span>
              <Receipt className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

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
