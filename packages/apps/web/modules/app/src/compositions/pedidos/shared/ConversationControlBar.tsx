import React from "react";
import { usePedidos } from "../context/PedidosContext";
import { Conversation } from "../types";
import { ConversationStatusBadge, HandoffReasonBadge, ChannelBadge } from "./Badges";
import { OrderStatusBadge } from "./Badges";
import { Hand, Bot, CheckCircle, Check, Edit2, XCircle, Receipt } from "lucide-react";
import { Button } from "@/elements";

/**
 * Cabecera + barra de acciones de una conversación (Human-in-the-Loop).
 *
 * Acciones de CONTROL (mutuamente excluyentes según estado):
 *  - Tomar control   → HUMANO_ATENDIENDO (IA en pausa)
 *  - Devolver a IA    → IA_ATENDIENDO
 *  - Marcar resuelto  → RESUELTO
 *
 * Acciones sobre el PEDIDO asociado (si existe orderId) — REUTILIZAN las
 * acciones/modales existentes del contexto, no se crea lógica nueva:
 *  - Confirmar  → confirmOrder()
 *  - Modificar  → abre AIInterpretationModal (setAiModalOrder)
 *  - Rechazar   → abre RejectCancelModal (setRejectModalOrder)
 */
export const ConversationControlBar: React.FC<{ conversation: Conversation }> = ({ conversation }) => {
  const {
    orders,
    takeControl,
    releaseToAI,
    resolveConversation,
    confirmOrder,
    setAiModalOrder,
    setRejectModalOrder,
    setPrintTicketOrder,
    currentOperatorName,
  } = usePedidos();

  const order = conversation.orderId
    ? orders.find(o => o.id === conversation.orderId)
    : undefined;

  const isMine =
    conversation.status === "HUMANO_ATENDIENDO" &&
    conversation.controlledBy === currentOperatorName;
  const canTakeControl =
    conversation.status === "REQUIERE_INTERVENCION" ||
    conversation.status === "IA_ATENDIENDO";

  // Un pedido sólo se puede confirmar/modificar/rechazar mientras siga abierto.
  const orderActionable =
    order && ["NUEVO", "CONFIRMADO"].includes(order.status);

  return (
    <div className="flex-none border-b border-slate-200 dark:border-[#374151] bg-white dark:bg-[#2C2D31] p-4 space-y-3">
      {/* Identidad + estado */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 truncate">
            {conversation.customerName}
          </h3>
          <p className="text-[11px] text-gray-400 font-mono">{conversation.customerPhone}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-none">
          <ConversationStatusBadge status={conversation.status} size="sm" />
          <div className="flex items-center gap-1.5">
            <ChannelBadge channel={conversation.channel} />
            {conversation.requiresHandoffReason && (
              <HandoffReasonBadge reason={conversation.requiresHandoffReason} />
            )}
          </div>
        </div>
      </div>

      {conversation.status === "HUMANO_ATENDIENDO" && conversation.controlledBy && (
        <p className="text-[11px] font-medium text-gray-500">
          Control: <span className="font-bold text-gray-800 dark:text-gray-200">{conversation.controlledBy}</span>
          {isMine && <span className="text-emerald-500"> (tú)</span>}
        </p>
      )}

      {/* Acciones de control */}
      <div className="flex flex-wrap items-center gap-2">
        {canTakeControl && (
          <Button
            variant="accent"
            intent="conversation.take-control"
            onClick={() => takeControl(conversation.id)}
            className="py-2 px-3.5 text-xs"
          >
            <Hand className="w-4 h-4" /> Tomar control
          </Button>
        )}
        {conversation.status === "HUMANO_ATENDIENDO" && (
          <>
            <Button
              variant="outline"
              intent="conversation.release-to-ai"
              onClick={() => releaseToAI(conversation.id)}
              className="py-2 px-3.5 text-xs"
            >
              <Bot className="w-4 h-4" /> Devolver a IA
            </Button>
            <Button
              variant="outline"
              intent="conversation.resolve"
              onClick={() => resolveConversation(conversation.id)}
              className="py-2 px-3.5 text-xs"
            >
              <CheckCircle className="w-4 h-4" /> Marcar resuelto
            </Button>
          </>
        )}
        {conversation.status === "RESUELTO" && (
          <Button
            variant="outline"
            intent="conversation.reopen"
            onClick={() => releaseToAI(conversation.id)}
            className="py-2 px-3.5 text-xs"
          >
            <Bot className="w-4 h-4" /> Reabrir con IA
          </Button>
        )}
      </div>

      {/* Bloque de pedido asociado (reutiliza acciones existentes del contexto) */}
      {order && (
        <div className="rounded-2xl border border-slate-200 dark:border-[#374151] bg-slate-50/70 dark:bg-gray-900/40 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Receipt className="w-4 h-4 text-gray-400 flex-none" />
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                Pedido #{order.id}
              </span>
              <OrderStatusBadge status={order.status} size="sm" />
            </div>
            <span className="font-mono font-extrabold text-sm text-[#FF3F1A] flex-none">
              ${order.total.toLocaleString("es-CO")}
            </span>
          </div>

          {isMine ? (
            orderActionable ? (
              <div className="flex flex-wrap items-center gap-2">
                {order.status === "NUEVO" && (
                  <Button
                    variant="accent"
                    intent="conversation.order.confirm"
                    onClick={() => confirmOrder(order.id)}
                    className="py-1.5 px-3 text-xs"
                  >
                    <Check className="w-3.5 h-3.5" /> Confirmar
                  </Button>
                )}
                <Button
                  variant="outline"
                  intent="conversation.order.modify"
                  onClick={() => setAiModalOrder(order)}
                  className="py-1.5 px-3 text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Modificar
                </Button>
                <Button
                  variant="outline"
                  intent="conversation.order.reject"
                  onClick={() => setRejectModalOrder(order)}
                  className="py-1.5 px-3 text-xs text-red-500 border-red-200 dark:border-red-900/50"
                >
                  <XCircle className="w-3.5 h-3.5" /> Rechazar
                </Button>
                <Button
                  variant="ghost"
                  intent="conversation.order.ticket"
                  onClick={() => setPrintTicketOrder(order)}
                  className="py-1.5 px-3 text-xs text-gray-400"
                >
                  <Receipt className="w-3.5 h-3.5" /> Ticket
                </Button>
              </div>
            ) : (
              <p className="text-[11px] font-medium text-gray-400">
                El pedido ya no admite cambios en este estado.
              </p>
            )
          ) : (
            <p className="text-[11px] font-medium text-gray-400">
              Toma el control para confirmar, modificar o rechazar el pedido.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
