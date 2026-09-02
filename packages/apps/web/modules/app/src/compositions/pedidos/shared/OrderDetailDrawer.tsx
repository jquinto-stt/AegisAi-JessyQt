import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { OrderStatusBadge, UrgencyBadge, ChannelBadge } from "./Badges";
import {
  X,
  Clock,
  User,
  MapPin,
  Phone,
  ChefHat,
  CheckCircle2,
  Check,
  MessageSquareText,
  History,
  Minus,
  Plus,
  ArrowRight,
  Receipt,
  MessageCircle,
  CheckCircle,
  Truck,
  Printer,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/elements";

export const OrderDetailDrawer: React.FC = () => {
  const {
    orders,
    programados,
    selectedOrderId,
    setSelectedOrderId,
    confirmOrder,
    sendToKitchen,
    markOrderReady,
    deliverOrder,
    adjustEstimate,
    injectScheduledOrderToLive,
    setRejectModalOrder,
    setCancelModalOrder,
    setAiModalOrder,
    setPrintTicketOrder,
    incidencias,
    resolveIncidencia,
  } = usePedidos();

  const [whatsappSent, setWhatsappSent] = useState(false);

  const order = orders.find(o => o.id === selectedOrderId) || programados.find(p => p.id === selectedOrderId);

  if (!order) return null;

  // Find any active related incident for this order or for delay
  const activeIncident = incidencias.find(
    i =>
      (!i.isResolved && i.orderId === order.id) ||
      (!i.isResolved && order.urgency === "RETRASADO" && i.type === "pedido_retrasado")
  );

  const delayMinutes = Math.max(0, order.elapsedMinutes - order.estimatedMinutes);
  const progressPercent = Math.min(
    100,
    Math.round((order.elapsedMinutes / Math.max(1, order.estimatedMinutes)) * 100)
  );

  const handleSendWhatsAppNotification = () => {
    setWhatsappSent(true);
    setTimeout(() => setWhatsappSent(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end font-sans antialiased">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => setSelectedOrderId(null)}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-white dark:bg-[#121215] shadow-2xl border-l border-zinc-200/80 dark:border-zinc-800/90 flex flex-col h-full z-10 animate-slide-left overflow-hidden">
        {/* Drawer Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between gap-4 flex-none">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white flex items-center justify-center font-bold text-xs border border-zinc-200/80 dark:border-zinc-700/80 font-mono shadow-2xs flex-none">
              #{order.turnNumber || "—"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-zinc-950 dark:text-zinc-50 font-mono tracking-tight">
                  {order.id}
                </h3>
                <OrderStatusBadge status={order.status} size="sm" />
                <ChannelBadge channel={order.channel} />
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Ingresó a las <span className="font-mono font-medium text-zinc-600 dark:text-zinc-300">{order.createdAt}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-none">
            <Button
              variant="outline"
              intent="order-detail.print"
              onClick={() => setPrintTicketOrder(order)}
              className="py-2 px-3 bg-white dark:bg-zinc-800 text-xs"
              title="Imprimir ticket de comanda"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </Button>

            <Button
              variant="ghost"
              intent="order-detail.close"
              onClick={() => setSelectedOrderId(null)}
              className="w-8 h-8 p-0 rounded-xl text-zinc-400"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* MINIMAL EXECUTIVE INCIDENT & DELAY ALERT */}
          {(activeIncident || order.urgency === "RETRASADO") && (
            <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-3xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse flex-none" />
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-rose-600 dark:text-rose-400">
                      Incidencia Operativa · Severidad {activeIncident?.severity || "Alta"}
                    </span>
                    <h4 className="font-bold text-xs text-zinc-950 dark:text-zinc-50 mt-0.5">
                      {activeIncident?.title || `Retraso en Comanda ${order.id} (+${delayMinutes > 0 ? delayMinutes : 6}m sobre pactado)`}
                    </h4>
                  </div>
                </div>

                <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-200/60 dark:border-rose-900/40">
                  +{delayMinutes > 0 ? delayMinutes : 6}m demora
                </span>
              </div>

              {/* Diagnosis */}
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed bg-white/70 dark:bg-zinc-900/70 p-3.5 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                {activeIncident?.description ||
                  `El pedido superó los ${order.estimatedMinutes} min pactados debido a sobredemanda de preparación en cocina central.`}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  intent="order-detail.add-time"
                  onClick={() => adjustEstimate(order.id, 10)}
                  className="py-2 px-3 bg-white dark:bg-zinc-800 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-[#FF3F1A]" />
                  <span>Sumar +10m a Cocina</span>
                </Button>

                <Button
                  variant="ghost"
                  intent="order-detail.notify-whatsapp"
                  onClick={handleSendWhatsAppNotification}
                  disabled={whatsappSent}
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-75"
                >
                  {whatsappSent ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Notificación Enviada</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Avisar Demora por WhatsApp</span>
                    </>
                  )}
                </Button>

                {activeIncident && (
                  <Button
                    variant="primary"
                    intent="order-detail.resolve"
                    onClick={() => resolveIncidencia(activeIncident.id)}
                    className="py-2 px-3 text-xs ml-auto"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Resolver</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Origin Banner */}
          {order.isAIOrigin && (
            <div className="bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="w-3.5 h-3.5 text-[#FF3F1A]" />
                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    Recepción WhatsApp Cloud · Confianza {order.aiConfidence}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  intent="order-detail.ai.view-original"
                  onClick={() => setAiModalOrder(order)}
                  className="text-xs font-bold text-[#FF3F1A] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Mensaje original</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
              {order.aiRawMessage && (
                <p className="text-xs text-zinc-600 dark:text-zinc-300 italic bg-white dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80">
                  "{order.aiRawMessage}"
                </p>
              )}
            </div>
          )}

          {/* Customer & Delivery Information Card */}
          <div className="bg-zinc-50/70 dark:bg-zinc-900/60 rounded-3xl p-5 border border-zinc-200/80 dark:border-zinc-800 space-y-3.5">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Información del Cliente
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-400 block text-[11px]">Cliente / Mesa</span>
                <p className="font-bold text-zinc-950 dark:text-zinc-50 text-sm mt-0.5">
                  {order.customerName}
                </p>
              </div>

              {order.customerPhone && (
                <div>
                  <span className="text-zinc-400 block text-[11px]">Teléfono / WhatsApp</span>
                  <a
                    href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-1.5 text-xs hover:text-[#FF3F1A] transition-colors mt-0.5"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#FF3F1A]" />
                    <span>{order.customerPhone}</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                </div>
              )}

              {order.customerAddress && (
                <div className="sm:col-span-2">
                  <span className="text-zinc-400 block text-[11px]">Dirección de Entrega</span>
                  <p className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 text-xs mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-none" />
                    <span>{order.customerAddress}</span>
                  </p>
                </div>
              )}

              {order.notes && (
                <div className="sm:col-span-2 bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 p-3 rounded-2xl">
                  <span className="font-bold text-[11px] text-zinc-700 dark:text-zinc-300 block">
                    Observaciones Especiales:
                  </span>
                  <p className="italic text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    {order.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Time & Kitchen Gauge Card */}
          <div className="bg-white dark:bg-[#1E1F23] rounded-3xl p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[11px] uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#FF3F1A]" /> Tiempos de Cocina & KDS
              </h4>
              <UrgencyBadge
                urgency={order.urgency}
                elapsedMin={order.elapsedMinutes}
                estMin={order.estimatedMinutes}
              />
            </div>

            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl p-4 border border-zinc-200/70 dark:border-zinc-800">
              <div>
                <span className="text-xs text-zinc-400 font-medium">Tiempo Transcurrido</span>
                <p className="font-mono font-black text-2xl text-zinc-950 dark:text-zinc-50 mt-0.5">
                  {order.elapsedMinutes}{" "}
                  <span className="text-xs font-normal text-zinc-400">min</span>
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span className="text-xs text-zinc-400 font-medium">Tiempo Estimado</span>
                <div className="flex items-center gap-2">
                  {!["FINALIZADO", "CANCELADO", "RECHAZADO"].includes(order.status) && (
                    <Button
                      variant="ghost"
                      intent="order-detail.estimate.decrement"
                      onClick={() => adjustEstimate(order.id, -5)}
                      className="p-0 w-7 h-7 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 cursor-pointer shadow-2xs active:scale-95"
                      title="Restar 5 min"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                  )}
                  <span className="font-mono font-bold text-base text-zinc-950 dark:text-zinc-50">
                    {order.estimatedMinutes} min
                  </span>
                  {!["FINALIZADO", "CANCELADO", "RECHAZADO"].includes(order.status) && (
                    <Button
                      variant="ghost"
                      intent="order-detail.estimate.increment"
                      onClick={() => adjustEstimate(order.id, 5)}
                      className="p-0 w-7 h-7 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 cursor-pointer shadow-2xs active:scale-95"
                      title="Sumar 5 min"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  order.urgency === "RETRASADO"
                    ? "bg-rose-500"
                    : progressPercent > 80
                    ? "bg-amber-500"
                    : "bg-[#FF3F1A]"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Products Breakdown Bill */}
          <div className="space-y-3">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> Detalle de Productos & Extras
            </h4>

            <div className="border border-zinc-200/80 dark:border-zinc-800 rounded-3xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-white dark:bg-[#1E1F23]">
              {order.items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-zinc-950 dark:text-white bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg font-mono">
                        {it.quantity}×
                      </span>
                      <p className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-zinc-50 truncate">
                        {it.name}
                      </p>
                    </div>
                    {it.option && (
                      <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md inline-block">
                        {it.option}
                      </span>
                    )}
                    {it.notes && (
                      <p className="text-[11px] text-zinc-500 italic">Nota: {it.notes}</p>
                    )}
                  </div>

                  <div className="text-right flex-none font-mono">
                    <p className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-zinc-50">
                      ${(it.unitPrice * it.quantity).toLocaleString("es-CO")}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      ${it.unitPrice.toLocaleString("es-CO")} c/u
                    </p>
                  </div>
                </div>
              ))}

              <div className="p-4 bg-zinc-50/80 dark:bg-zinc-900/60 flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-950 dark:text-zinc-50">
                  Total del Pedido
                </span>
                <span className="font-mono font-black text-lg text-zinc-950 dark:text-white">
                  ${order.total.toLocaleString("es-CO")}
                </span>
              </div>
            </div>
          </div>

          {/* Minimal Audit Trail Stepper */}
          <div className="space-y-3">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Trazabilidad & Auditoría
            </h4>

            <div className="border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-5 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-4">
              {(order.history || []).map((evt, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs relative">
                  {idx < (order.history || []).length - 1 && (
                    <div className="absolute left-2.5 top-5 w-px h-6 bg-zinc-200 dark:bg-zinc-800" />
                  )}
                  <div className="w-5 h-5 rounded-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center font-mono font-bold text-[10px] text-zinc-600 dark:text-zinc-400 flex-none z-10">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-950 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                        {evt.toStatus}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400">{evt.timestamp}</span>
                    </div>
                    {evt.user && (
                      <p className="text-[11px] text-zinc-500 mt-0.5">Por: {evt.user}</p>
                    )}
                    {evt.note && (
                      <p className="text-[11px] text-zinc-400 italic">"{evt.note}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-5 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 flex items-center gap-3 flex-none">
          {programados.some(p => p.id === order.id) && (
            <Button
              variant="primary"
              intent="order-detail.inject"
              onClick={() => {
                injectScheduledOrderToLive(order.id, true);
                setSelectedOrderId(order.id);
              }}
              className="flex-1 py-3 px-4 rounded-2xl text-xs bg-[#FF3F1A] hover:bg-[#e03715] text-white font-bold"
            >
              <ChefHat className="w-4 h-4" />
              <span>Enviar a Cocina KDS (Pasar a En Vivo)</span>
            </Button>
          )}

          {!programados.some(p => p.id === order.id) && order.status === "NUEVO" && (
            <>
              <Button
                variant="primary"
                intent="order-detail.confirm"
                onClick={() => confirmOrder(order.id)}
                className="flex-1 py-3 px-4 rounded-2xl text-xs"
              >
                <Check className="w-4 h-4 text-[#FF3F1A]" />
                <span>Aceptar y Confirmar Pedido</span>
              </Button>
              <Button
                variant="outline"
                intent="order-detail.reject"
                onClick={() => setRejectModalOrder(order)}
                className="py-3 px-4 rounded-2xl border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 hover:bg-rose-50 text-xs"
              >
                Rechazar
              </Button>
            </>
          )}

          {!programados.some(p => p.id === order.id) && order.status === "CONFIRMADO" && (
            <Button
              variant="accent"
              intent="order-detail.send-kitchen"
              onClick={() => sendToKitchen(order.id)}
              className="flex-1 py-3 px-4 rounded-2xl text-xs"
            >
              <ChefHat className="w-4 h-4" />
              <span>Pasar a Cocina (KDS)</span>
            </Button>
          )}

          {order.status === "EN_PREPARACION" && (
            <Button
              variant="accent"
              intent="order-detail.mark-ready"
              onClick={() => markOrderReady(order.id)}
              className="flex-1 py-3 px-4 rounded-2xl text-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Marcar Listo para Despacho</span>
            </Button>
          )}

          {order.status === "LISTO" && (
            <Button
              variant="primary"
              intent="order-detail.deliver"
              onClick={() => deliverOrder(order.id)}
              className="flex-1 py-3 px-4 rounded-2xl text-xs"
            >
              <Truck className="w-4 h-4 text-[#FF3F1A]" />
              <span>Marcar Entregado / Despachado</span>
            </Button>
          )}

          {!["FINALIZADO", "CANCELADO", "RECHAZADO"].includes(order.status) && (
            <Button
              variant="outline"
              intent="order-detail.cancel"
              onClick={() => setCancelModalOrder(order)}
              className="py-3 px-3.5 rounded-2xl text-zinc-400 hover:text-rose-600 text-xs"
              title="Cancelar pedido"
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
