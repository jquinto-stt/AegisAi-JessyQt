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
} from "lucide-react";
import { usePedidos } from "../context/PedidosContext";

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
      className={`group relative bg-white dark:bg-[#27272A] rounded-2xl border transition-all duration-200 p-4 shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between gap-3 ${
        isDelayed
          ? "border-red-400/80 dark:border-red-800/80 ring-1 ring-red-400/20"
          : "border-slate-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-2.5">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-mono font-black text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-[#FF3F1A] transition-colors">
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
        <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex-none">
          <Clock className={`w-3 h-3 ${isDelayed ? "text-red-500 animate-pulse" : "text-zinc-400"}`} />
          <span className={isDelayed ? "text-red-600 dark:text-red-400 font-black" : ""}>
            {order.elapsedMinutes}m / {order.estimatedMinutes}m
          </span>
        </div>
      </div>

      {/* Customer & Total Row */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <User className="w-3.5 h-3.5 text-zinc-400 flex-none" />
            <p className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 truncate">
              {order.customerName}
            </p>
          </div>
          <span className="font-mono font-black text-sm text-zinc-900 dark:text-zinc-100 flex-none">
            ${order.total.toLocaleString("es-CO")}
          </span>
        </div>

        {/* Special Notes */}
        {order.notes && (
          <div className="bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200/60 dark:border-orange-900/40 rounded-xl px-2.5 py-1 text-[11px] text-zinc-700 dark:text-zinc-300 italic truncate flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 flex-none text-[#FF3F1A]" />
            <span className="truncate">{order.notes}</span>
          </div>
        )}
      </div>

      {/* Items Summary */}
      <div className="bg-slate-50/70 dark:bg-zinc-900/60 rounded-xl p-2.5 border border-slate-100 dark:border-zinc-800/80 space-y-1.5">
        {/* Prep Progress Line */}
        <div className="w-full bg-slate-200/80 dark:bg-zinc-800 h-1 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isDelayed ? "bg-red-500" : "bg-[#FF3F1A]"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Items List */}
        <div className="space-y-1 pt-0.5">
          {order.items.slice(0, 3).map((item, idx) => (
            <div
              key={idx}
              className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between gap-1 truncate"
            >
              <span className="truncate flex items-center gap-1.5">
                <span className="bg-orange-100/80 dark:bg-orange-950/60 text-[#FF3F1A] dark:text-orange-300 px-1 py-0.2 rounded font-black text-[10px] font-mono">
                  {item.quantity}×
                </span>
                <span className="truncate">{item.name}</span>
              </span>
              {item.option && (
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 bg-slate-200/60 dark:bg-zinc-800 px-1.5 py-0.2 rounded flex-none font-medium">
                  {item.option}
                </span>
              )}
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-[10px] text-zinc-400 font-medium pt-0.5">
              +{order.items.length - 3} producto(s) más...
            </p>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div
        className="pt-2 flex items-center gap-1.5 border-t border-slate-100 dark:border-zinc-800/80"
        onClick={e => e.stopPropagation()}
      >
        {order.status === "NUEVO" && (
          <>
            <button
              onClick={() => confirmOrder(order.id)}
              className="flex-1 py-2 px-3 rounded-xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" /> Aceptar
            </button>
            <button
              onClick={() => setRejectModalOrder(order)}
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
              title="Rechazar pedido"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {order.status === "CONFIRMADO" && (
          <>
            <button
              onClick={() => sendToKitchen(order.id)}
              className="flex-1 py-2 px-3 rounded-xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
            >
              <ChefHat className="w-3.5 h-3.5" /> A Cocina
            </button>
            <button
              type="button"
              onClick={() => setPrintTicketOrder(order)}
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-zinc-500 hover:text-[#FF3F1A] hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Imprimir ticket térmico"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {order.status === "EN_PREPARACION" && (
          <>
            <button
              onClick={() => markOrderReady(order.id)}
              className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#FF3F1A]" /> Marcar Listo
            </button>
            <button
              type="button"
              onClick={() => setPrintTicketOrder(order)}
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-zinc-500 hover:text-[#FF3F1A] hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Imprimir ticket térmico"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {order.status === "LISTO" && (
          <>
            <button
              onClick={() => deliverOrder(order.id)}
              className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
            >
              <Truck className="w-3.5 h-3.5 text-emerald-400" /> Despachar
            </button>
            <button
              type="button"
              onClick={() => setPrintTicketOrder(order)}
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-zinc-500 hover:text-[#FF3F1A] hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Imprimir ticket térmico"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {(order.status === "FINALIZADO" ||
          order.status === "CANCELADO" ||
          order.status === "RECHAZADO") && (
          <div className="w-full text-center py-1 text-xs font-bold text-zinc-400">
            Pedido {order.status.toLowerCase()}
          </div>
        )}
      </div>
    </div>
  );
};
