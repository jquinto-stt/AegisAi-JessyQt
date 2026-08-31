import React from "react";
import { Pedido } from "../types";
import { ChannelBadge, AIBadge } from "./Badges";
import {
  Check,
  X,
  ChefHat,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  User,
  Printer,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { usePedidos } from "../context/PedidosContext";
import { Button } from "@/elements";

export const OrderCard: React.FC<{
  order: Pedido;
  onSelect: (orderId: string) => void;
}> = ({ order, onSelect }) => {
  const {
    confirmOrder,
    sendToKitchen,
    markOrderReady,
    deliverOrder,
    setRejectModalOrder,
    setAiModalOrder,
    setPrintTicketOrder,
  } = usePedidos();

  const totalItemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  const progressPercent = Math.min(
    100,
    Math.round((order.elapsedMinutes / Math.max(1, order.estimatedMinutes)) * 100)
  );

  const isDelayed = order.urgency === "RETRASADO";

  return (
    <div
      onClick={() => onSelect(order.id)}
      className={`group relative bg-white dark:bg-[#121214] rounded-2xl border transition-all duration-200 p-4 shadow-2xs hover:shadow-xs cursor-pointer flex flex-col justify-between gap-3 ${
        isDelayed
          ? "border-red-400/80 dark:border-red-800/80 ring-1 ring-red-400/20"
          : "border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-400 dark:hover:border-zinc-600"
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-mono font-bold text-xs text-zinc-950 dark:text-zinc-50 group-hover:text-[#FF3F1A] transition-colors">
            {order.id}
          </span>
          <ChannelBadge channel={order.channel} />
          {order.isAIOrigin && (
            <AIBadge
              confidence={order.aiConfidence}
              onClick={(e: any) => {
                e.stopPropagation();
                setAiModalOrder(order);
              }}
            />
          )}
        </div>

        {/* Time Badge */}
        <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-400 flex-none">
          <Clock className={`w-3 h-3 ${isDelayed ? "text-red-500" : "text-zinc-400"}`} />
          <span className={isDelayed ? "text-red-600 dark:text-red-400 font-bold" : ""}>
            {order.elapsedMinutes}m / {order.estimatedMinutes}m
          </span>
        </div>
      </div>

      {/* Customer & Total Row */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
            {order.customerName}
          </p>
          <span className="font-mono font-bold text-xs text-zinc-950 dark:text-zinc-50 flex-none">
            ${order.total.toLocaleString("es-CO")}
          </span>
        </div>

        {/* Special Notes */}
        {order.notes && (
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-[11px] text-zinc-600 dark:text-zinc-400 italic truncate flex items-center gap-1.5 font-mono">
            <AlertCircle className="w-3 h-3 flex-none text-[#FF3F1A]" />
            <span className="truncate">{order.notes}</span>
          </div>
        )}
      </div>

      {/* Items Summary */}
      <div className="space-y-1 py-1 border-t border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
          <span>{totalItemCount} ÍTEMS</span>
          <Button
            variant="ghost"
            intent="order-card.print"
            onClick={e => {
              e.stopPropagation();
              setPrintTicketOrder(order);
            }}
            className="p-0 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 cursor-pointer transition-colors"
            title="Imprimir comanda térmica"
          >
            <Printer className="w-3 h-3" />
            <span>Ticket</span>
          </Button>
        </div>

        <div className="space-y-0.5 max-h-20 overflow-hidden">
          {order.items.slice(0, 3).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300">
              <span className="truncate">
                <span className="font-mono font-bold text-zinc-950 dark:text-zinc-50 mr-1.5">{item.quantity}x</span>
                {item.name}
              </span>
              <span className="font-mono text-[11px] text-zinc-400 flex-none ml-2">
                ${(item.unitPrice * item.quantity).toLocaleString("es-CO")}
              </span>
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-[10px] font-mono text-zinc-400">
              +{order.items.length - 3} ítems adicionales...
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar (if in prep) */}
      {order.status === "EN_PREPARACION" && (
        <div className="space-y-1">
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isDelayed ? "bg-red-500" : "bg-[#FF3F1A]"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
        {order.status === "NUEVO" && (
          <div className="flex items-center gap-1.5 w-full">
            <Button
              variant="outline"
              intent="order-card.reject"
              onClick={e => {
                e.stopPropagation();
                setRejectModalOrder(order);
              }}
              className="py-1.5 px-2.5 rounded-lg hover:border-red-300 dark:hover:border-red-900 text-zinc-400 hover:text-red-600 text-xs font-mono"
            >
              Rechazar
            </Button>
            <Button
              variant="primary"
              intent="order-card.confirm"
              onClick={e => {
                e.stopPropagation();
                confirmOrder(order.id);
              }}
              className="flex-1 py-1.5 px-3 rounded-lg text-xs"
            >
              <span>Confirmar</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        )}

        {order.status === "CONFIRMADO" && (
          <Button
            variant="accent"
            intent="order-card.send-kitchen"
            onClick={e => {
              e.stopPropagation();
              sendToKitchen(order.id);
            }}
            className="w-full py-1.5 px-3 rounded-lg text-xs"
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>Mandar a Cocina</span>
          </Button>
        )}

        {order.status === "EN_PREPARACION" && (
          <Button
            variant="primary"
            intent="order-card.mark-ready"
            onClick={e => {
              e.stopPropagation();
              markOrderReady(order.id);
            }}
            className="w-full py-1.5 px-3 rounded-lg text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Marcar Listo</span>
          </Button>
        )}

        {order.status === "LISTO" && (
          <Button
            variant="primary"
            intent="order-card.deliver"
            onClick={e => {
              e.stopPropagation();
              deliverOrder(order.id);
            }}
            className="w-full py-1.5 px-3 rounded-lg text-xs hover:bg-emerald-600 dark:hover:bg-emerald-600 dark:hover:text-white"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Entregar Pedido</span>
          </Button>
        )}

        {order.status === "FINALIZADO" && (
          <div className="w-full text-center text-[10px] font-mono text-zinc-400 py-1">
            ENTREGADO • {order.elapsedMinutes}m TOTAL
          </div>
        )}
      </div>
    </div>
  );
};
