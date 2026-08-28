import React from "react";
import { Pedido } from "../types";
import { OrderStatusBadge, UrgencyBadge, ChannelBadge, AIBadge } from "./Badges";
import {
  Check,
  X,
  ChefHat,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Truck,
  User,
  Phone,
  FileText,
  Printer,
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

  // Calculate prep progress percent
  const progressPercent = Math.min(
    100,
    Math.round((order.elapsedMinutes / Math.max(1, order.estimatedMinutes)) * 100)
  );

  return (
    <div
      onClick={() => onSelect(order.id)}
      className={`group relative bg-white dark:bg-[#2C2D31] rounded-3xl border-2 transition-all p-5 shadow-xs hover:shadow-lg cursor-pointer flex flex-col justify-between gap-3.5 ${
        order.urgency === "RETRASADO"
          ? "border-red-400 dark:border-red-700/80 bg-red-50/20"
          : order.status === "NUEVO"
          ? "border-blue-400 dark:border-blue-700/80 bg-blue-50/15"
          : order.status === "EN_PREPARACION"
          ? "border-amber-300 dark:border-amber-700/60"
          : order.status === "LISTO"
          ? "border-emerald-300 dark:border-emerald-700/60"
          : "border-slate-200/90 dark:border-[#374151] hover:border-[#FF3F1A]"
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-[#374151] pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-black text-sm text-gray-900 dark:text-gray-100 group-hover:text-[#FF3F1A] transition-colors">
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

        <div className="flex items-center gap-1.5 flex-none">
          <UrgencyBadge
            urgency={order.urgency}
            elapsedMin={order.elapsedMinutes}
            estMin={order.estimatedMinutes}
          />
        </div>
      </div>

      {/* Customer & Total Row */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 text-gray-400 flex-none" />
            <p className="font-extrabold text-sm text-gray-900 dark:text-gray-100 truncate">
              {order.customerName}
            </p>
          </div>
          <span className="font-mono font-black text-base text-[#190088] dark:text-indigo-400 flex-none">
            ${order.total.toLocaleString("es-CO")}
          </span>
        </div>

        {/* Special Chef Notes */}
        {order.notes && (
          <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl px-2.5 py-1 text-xs text-amber-800 dark:text-amber-300 italic truncate flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-none text-amber-600" />
            <span className="truncate">{order.notes}</span>
          </div>
        )}
      </div>

      {/* Items Summary Container */}
      <div className="bg-slate-50 dark:bg-gray-800/90 rounded-2xl p-3 border border-slate-100 dark:border-[#374151] space-y-2">
        {/* Time Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
            <span>{totalItemCount} producto(s)</span>
            <span className="font-mono font-bold flex items-center gap-1 text-gray-700 dark:text-gray-300">
              <Clock className="w-3 h-3 text-[#FF3F1A]" />
              {order.elapsedMinutes}m de {order.estimatedMinutes}m
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                order.urgency === "RETRASADO"
                  ? "bg-red-500"
                  : order.urgency === "PROXIMO"
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-1 max-h-20 overflow-hidden pt-1">
          {order.items.slice(0, 3).map((item, idx) => (
            <div
              key={idx}
              className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between gap-1 truncate"
            >
              <span className="truncate flex items-center gap-1.5">
                <span className="bg-orange-100 dark:bg-orange-950 text-[#FF3F1A] dark:text-orange-300 px-1.5 py-0.2 rounded font-black text-[11px] font-mono">
                  {item.quantity}×
                </span>
                <span className="truncate">{item.name}</span>
              </span>
              {item.option && (
                <span className="text-[10px] text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.2 rounded flex-none font-bold">
                  {item.option}
                </span>
              )}
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-[10px] text-gray-400 font-bold pt-0.5">
              +{order.items.length - 3} producto(s) adicionales...
            </p>
          )}
        </div>
      </div>

      {/* Action Footer (Contextual per State) */}
      <div
        className="pt-2 flex items-center gap-2 border-t border-gray-100 dark:border-[#374151]"
        onClick={e => e.stopPropagation()}
      >
        {order.status === "NUEVO" && (
          <>
            <button
              onClick={() => confirmOrder(order.id)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#190088] hover:bg-[#140070] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" /> Aceptar
            </button>
            <button
              onClick={() => setRejectModalOrder(order)}
              className="py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-bold transition-all cursor-pointer active:scale-95"
              title="Rechazar pedido"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}

        {order.status === "CONFIRMADO" && (
          <>
            <button
              onClick={() => sendToKitchen(order.id)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#FF3F1A] hover:bg-orange-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <ChefHat className="w-4 h-4" /> Pasar a Cocina
            </button>
            <button
              type="button"
              onClick={() => setPrintTicketOrder(order)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 text-gray-500 hover:text-[#FF3F1A] hover:bg-orange-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title="Imprimir comanda térmica"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {order.status === "EN_PREPARACION" && (
          <>
            <button
              onClick={() => markOrderReady(order.id)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" /> Marcar Listo
            </button>
            <button
              type="button"
              onClick={() => setPrintTicketOrder(order)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 text-gray-500 hover:text-[#FF3F1A] hover:bg-orange-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title="Imprimir comanda térmica"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {order.status === "LISTO" && (
          <>
            <button
              onClick={() => deliverOrder(order.id)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Truck className="w-4 h-4 text-emerald-400" /> Despachar / Entregar
            </button>
            <button
              type="button"
              onClick={() => setPrintTicketOrder(order)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 text-gray-500 hover:text-[#FF3F1A] hover:bg-orange-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title="Imprimir comanda térmica"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {(order.status === "FINALIZADO" ||
          order.status === "CANCELADO" ||
          order.status === "RECHAZADO") && (
          <div className="w-full text-center py-1.5 text-xs font-bold text-gray-400 dark:text-gray-500">
            Comanda {order.status.toLowerCase()}
          </div>
        )}
      </div>
    </div>
  );
};
