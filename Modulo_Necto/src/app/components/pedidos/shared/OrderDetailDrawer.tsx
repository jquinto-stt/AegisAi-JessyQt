import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { OrderStatusBadge, UrgencyBadge, ChannelBadge, AIBadge } from "./Badges";
import {
  X,
  Clock,
  User,
  MapPin,
  Phone,
  ChefHat,
  CheckCircle2,
  Check,
  AlertTriangle,
  Sparkles,
  History,
  Minus,
  Plus,
  ArrowRight,
  Receipt,
  FileText,
  ShieldAlert,
  MessageCircle,
  CheckCircle,
  Truck,
  Printer,
} from "lucide-react";

export const OrderDetailDrawer: React.FC = () => {
  const {
    orders,
    selectedOrderId,
    setSelectedOrderId,
    confirmOrder,
    sendToKitchen,
    markOrderReady,
    deliverOrder,
    adjustEstimate,
    setRejectModalOrder,
    setCancelModalOrder,
    setAiModalOrder,
    setPrintTicketOrder,
    incidencias,
    resolveIncidencia,
  } = usePedidos();

  const [whatsappSent, setWhatsappSent] = useState(false);

  const order = orders.find(o => o.id === selectedOrderId);

  if (!order) return null;

  // Find any active related incident for this order or for delay
  const activeIncident = incidencias.find(
    i => (!i.isResolved && i.orderId === order.id) ||
         (!i.isResolved && order.urgency === "RETRASADO" && i.type === "pedido_retrasado")
  );

  const delayMinutes = Math.max(0, order.elapsedMinutes - order.estimatedMinutes);

  const handleSendWhatsAppNotification = () => {
    setWhatsappSent(true);
    setTimeout(() => setWhatsappSent(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => setSelectedOrderId(null)}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-white dark:bg-[#2C2D31] shadow-2xl border-l border-slate-200 dark:border-[#374151] flex flex-col h-full z-10 animate-slide-left overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-[#374151] flex items-center justify-between bg-slate-50/70 dark:bg-gray-800/70 flex-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-[#FF3F1A] flex items-center justify-center font-black text-sm border border-orange-500/20 font-mono shadow-xs">
              #{order.turnNumber || "—"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg text-gray-900 dark:text-gray-100 font-mono">
                  {order.id}
                </h3>
                <OrderStatusBadge status={order.status} size="sm" />
                <ChannelBadge channel={order.channel} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Creado a las {order.createdAt} · Canal: <span className="capitalize font-bold">{order.channel}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPrintTicketOrder(order)}
              className="p-2 rounded-xl bg-white dark:bg-gray-700 hover:bg-orange-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 hover:text-[#FF3F1A] border border-slate-200 dark:border-gray-600 shadow-xs flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer"
              title="Imprimir comanda térmica POS"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              onClick={() => setSelectedOrderId(null)}
              className="w-8 h-8 rounded-xl hover:bg-slate-200 dark:hover:bg-gray-700 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* BANNER INTELIGENTE DE INCIDENCIA / ALERTA DE RETRASO */}
          {(activeIncident || order.urgency === "RETRASADO") && (
            <div className="bg-red-50/90 dark:bg-red-950/50 border-2 border-red-400 dark:border-red-700 rounded-3xl p-5 space-y-3.5 shadow-sm animate-fade-in">
              <div className="flex items-start justify-between gap-3 border-b border-red-200/80 dark:border-red-900/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200 flex items-center justify-center flex-none">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Incidencia Operativa · Severidad {activeIncident?.severity || "Alta"}
                      </span>
                      <span className="font-mono text-xs font-black text-red-700 dark:text-red-300">
                        +{delayMinutes > 0 ? delayMinutes : 6} min retraso
                      </span>
                    </div>
                    <h4 className="font-black text-sm text-red-900 dark:text-red-100 mt-0.5">
                      {activeIncident?.title || `Retraso en Comanda ${order.id}`}
                    </h4>
                  </div>
                </div>
              </div>

              {/* Diagnóstico Causa Raíz */}
              <div className="bg-white/80 dark:bg-gray-900/80 rounded-2xl p-3.5 border border-red-200 dark:border-red-900/40 space-y-1.5 text-xs">
                <p className="font-bold text-gray-700 dark:text-gray-300">
                  Diagnóstico y Causa del Problema:
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  {activeIncident?.description ||
                    `La comanda superó el tiempo estimado de preparación pactado (${order.estimatedMinutes} min) debido a sobredemanda de horneado en cocina central.`}
                </p>
              </div>

              {/* Acciones de Mitigación Inmediata */}
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-red-800 dark:text-red-300">
                  Acciones Rápidas de Mitigación:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => adjustEstimate(order.id, 10)}
                    className="py-2 px-3 rounded-xl bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 hover:bg-red-50 text-red-700 dark:text-red-200 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Sumar +10 min a Cocina
                  </button>

                  <button
                    onClick={handleSendWhatsAppNotification}
                    disabled={whatsappSent}
                    className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-75"
                  >
                    {whatsappSent ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" /> Notificación Enviada
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-3.5 h-3.5" /> Avisar Demora por WhatsApp
                      </>
                    )}
                  </button>

                  {activeIncident && (
                    <button
                      onClick={() => resolveIncidencia(activeIncident.id)}
                      className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" /> Resolver Incidencia
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Banner if Origin IA */}
          {order.isAIOrigin && (
            <div className="bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-blue-500/10 border border-orange-200 dark:border-orange-900/60 rounded-3xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FF3F1A]" />
                  <span className="font-extrabold text-xs text-orange-900 dark:text-orange-200">
                    Interpretación Necto IA (Confianza {order.aiConfidence})
                  </span>
                </div>
                <button
                  onClick={() => setAiModalOrder(order)}
                  className="text-xs font-extrabold text-[#190088] dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Ver mensaje original →
                </button>
              </div>
              {order.aiRawMessage && (
                <p className="text-xs text-gray-600 dark:text-gray-300 italic bg-white/60 dark:bg-gray-800/60 p-3 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                  "{order.aiRawMessage}"
                </p>
              )}
            </div>
          )}

          {/* Customer & Delivery Context */}
          <div className="bg-slate-50/80 dark:bg-gray-800/60 rounded-3xl p-5 border border-slate-200/90 dark:border-[#374151] space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-500" /> Información del Cliente
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <span className="text-gray-400">Nombre / Razón Social:</span>
                <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{order.customerName}</p>
              </div>
              {order.customerPhone && (
                <div>
                  <span className="text-gray-400">Teléfono / WhatsApp:</span>
                  <p className="font-mono font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1 text-sm">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" /> {order.customerPhone}
                  </p>
                </div>
              )}
              {order.customerAddress && (
                <div className="sm:col-span-2">
                  <span className="text-gray-400">Dirección de entrega:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-orange-500 flex-none" /> {order.customerAddress}
                  </p>
                </div>
              )}
              {order.notes && (
                <div className="sm:col-span-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3 rounded-2xl text-amber-900 dark:text-amber-200">
                  <span className="font-bold text-[11px]">Observación del pedido:</span>
                  <p className="italic text-xs mt-0.5">{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Timing & Production Status */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-slate-200 dark:border-[#374151] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#FF3F1A]" /> Control de Tiempos de Cocina
              </h4>
              <UrgencyBadge
                urgency={order.urgency}
                elapsedMin={order.elapsedMinutes}
                estMin={order.estimatedMinutes}
              />
            </div>

            <div className="flex items-center justify-between bg-slate-50 dark:bg-gray-900/60 rounded-2xl p-4 border border-slate-100 dark:border-[#374151]">
              <div>
                <p className="text-xs text-gray-500 font-semibold">Tiempo transcurrido</p>
                <p className="font-mono font-black text-2xl text-gray-900 dark:text-gray-100">
                  {order.elapsedMinutes} <span className="text-sm font-normal text-gray-400">min</span>
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span className="text-xs text-gray-500 font-semibold">Tiempo estimado pactado:</span>
                <div className="flex items-center gap-2">
                  {!["FINALIZADO", "CANCELADO", "RECHAZADO"].includes(order.status) && (
                    <button
                      onClick={() => adjustEstimate(order.id, -5)}
                      className="w-7 h-7 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 flex items-center justify-center hover:bg-slate-100 text-gray-700 dark:text-gray-200 cursor-pointer shadow-xs active:scale-95"
                      title="Restar 5 min"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="font-mono font-black text-lg text-[#190088] dark:text-blue-400">
                    {order.estimatedMinutes} min
                  </span>
                  {!["FINALIZADO", "CANCELADO", "RECHAZADO"].includes(order.status) && (
                    <button
                      onClick={() => adjustEstimate(order.id, 5)}
                      className="w-7 h-7 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 flex items-center justify-center hover:bg-slate-100 text-gray-700 dark:text-gray-200 cursor-pointer shadow-xs active:scale-95"
                      title="Sumar 5 min"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Products Breakdown Table */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-gray-500" /> Detalle de Productos
            </h4>

            <div className="border border-slate-200 dark:border-[#374151] rounded-3xl overflow-hidden divide-y divide-gray-100 dark:divide-[#374151]">
              {order.items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-4 flex items-center justify-between gap-3 bg-white dark:bg-[#2C2D31]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-[#FF3F1A] dark:text-orange-400 bg-orange-50 dark:bg-orange-950 px-2 py-0.5 rounded-lg font-mono">
                        {it.quantity}×
                      </span>
                      <p className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">
                        {it.name}
                      </p>
                    </div>
                    {it.option && (
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full inline-block mt-1">
                        {it.option}
                      </span>
                    )}
                    {it.notes && (
                      <p className="text-[11px] text-gray-500 italic mt-1">Nota: {it.notes}</p>
                    )}
                  </div>

                  <div className="text-right flex-none font-mono">
                    <p className="font-black text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                      ${(it.unitPrice * it.quantity).toLocaleString("es-CO")}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      ${it.unitPrice.toLocaleString("es-CO")} c/u
                    </p>
                  </div>
                </div>
              ))}

              <div className="p-4 bg-slate-50 dark:bg-gray-800/80 flex items-center justify-between">
                <span className="font-extrabold text-sm text-gray-900 dark:text-gray-100">
                  Total de la Comanda
                </span>
                <span className="font-mono font-black text-xl text-[#FF3F1A] dark:text-orange-400">
                  ${order.total.toLocaleString("es-CO")}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Trail Timeline */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-gray-500" /> Trazabilidad y Auditoría de Eventos
            </h4>

            <div className="border border-slate-200 dark:border-[#374151] rounded-3xl p-4 bg-slate-50/50 dark:bg-gray-800/40 space-y-3">
              {(order.history || []).map((evt, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 flex items-center justify-center font-mono font-bold text-[10px] text-gray-500 flex-none">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider text-[11px]">
                        {evt.toStatus}
                      </span>
                      <span className="font-mono text-[10px] text-gray-400">{evt.timestamp}</span>
                    </div>
                    {evt.user && (
                      <p className="text-[11px] text-gray-500">Por: {evt.user}</p>
                    )}
                    {evt.note && (
                      <p className="text-[11px] text-gray-400 italic">"{evt.note}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-[#374151] bg-slate-50/70 dark:bg-gray-800/70 flex items-center gap-3 flex-none">
          {order.status === "NUEVO" && (
            <>
              <button
                onClick={() => confirmOrder(order.id)}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#190088] hover:bg-[#140070] text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" /> Aceptar y Confirmar Comanda
              </button>
              <button
                onClick={() => setRejectModalOrder(order)}
                className="py-3 px-4 rounded-2xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                Rechazar
              </button>
            </>
          )}

          {order.status === "CONFIRMADO" && (
            <button
              onClick={() => sendToKitchen(order.id)}
              className="flex-1 py-3 px-4 rounded-2xl bg-[#FF3F1A] hover:bg-orange-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <ChefHat className="w-4 h-4" /> Pasar a Cocina (KDS)
            </button>
          )}

          {order.status === "EN_PREPARACION" && (
            <button
              onClick={() => markOrderReady(order.id)}
              className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" /> Marcar Listo para Despacho
            </button>
          )}

          {order.status === "LISTO" && (
            <button
              onClick={() => deliverOrder(order.id)}
              className="flex-1 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-black dark:bg-gray-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Truck className="w-4 h-4 text-emerald-400" /> Marcar Entregado / Despachado
            </button>
          )}

          {!["FINALIZADO", "CANCELADO", "RECHAZADO"].includes(order.status) && (
            <button
              onClick={() => setCancelModalOrder(order)}
              className="py-3 px-3 rounded-2xl border border-slate-300 dark:border-gray-600 text-gray-500 hover:text-rose-600 text-xs font-bold transition-colors cursor-pointer"
              title="Cancelar comanda"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
