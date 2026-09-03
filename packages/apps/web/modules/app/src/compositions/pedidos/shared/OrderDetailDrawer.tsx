import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { useBusiness } from "@/context/BusinessContext";
import { OrderStatusBadge, UrgencyBadge, ChannelBadge } from "./Badges";
import {
  X,
  Minus,
  Plus,
  ArrowRight,
  Printer,
  ExternalLink,
  CheckSquare,
  Square,
  Check,
  Bike,
  ShoppingBag,
  Clock,
} from "lucide-react";
import { Button, SegmentedControl } from "@/elements";

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
    openWhatsAppConversation,
    sendWhatsAppStatusAlert,
  } = usePedidos();

  const { activeRoleId } = useBusiness();
  const isCookRole = activeRoleId === "role-cook";

  const [drawerViewMode, setDrawerViewMode] = useState<"cocina" | "general">(
    isCookRole ? "cocina" : "general"
  );
  const [kitchenChecked, setKitchenChecked] = useState<Record<number, boolean>>({});
  const [sentAlertToast, setSentAlertToast] = useState<string | null>(null);

  const handleSendQuickAlert = (orderId: string, text: string) => {
    sendWhatsAppStatusAlert(orderId, text);
    setSentAlertToast("Mensaje enviado al WhatsApp del cliente");
    setTimeout(() => setSentAlertToast(null), 3000);
  };
  const [whatsappSent, setWhatsappSent] = useState(false);

  const order =
    orders.find(o => o.id === selectedOrderId) ||
    programados.find(p => p.id === selectedOrderId);

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

  const handleToggleKitchenCheck = (idx: number) => {
    setKitchenChecked(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSendWhatsAppNotification = () => {
    setWhatsappSent(true);
    setTimeout(() => setWhatsappSent(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end font-sans antialiased">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#212121]/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => setSelectedOrderId(null)}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-white dark:bg-[#121215] shadow-2xl border-l border-zinc-200/80 dark:border-zinc-800/90 flex flex-col h-full z-10 animate-slide-left overflow-hidden">
        {/* Drawer Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-[#ECECEC]/30 dark:bg-zinc-900/40 flex items-center justify-between gap-4 flex-none">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#190088]/10 dark:bg-[#190088]/20 text-[#190088] dark:text-[#97D6DF] flex items-center justify-center font-bold text-sm border border-[#190088]/20 font-mono shadow-2xs flex-none">
              #{order.turnNumber || "00"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-[#212121] dark:text-[#ECECEC] font-mono tracking-tight">
                  {order.id}
                </h3>
                <OrderStatusBadge status={order.status} size="sm" />
                <ChannelBadge channel={order.channel} />
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Ingresó a las{" "}
                <span className="font-mono font-medium text-zinc-600 dark:text-zinc-300">
                  {order.createdAt}
                </span>{" "}
                · Turno #{order.turnNumber || "00"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-none">
            <Button
              variant="outline"
              intent="order-detail.print"
              onClick={() => setPrintTicketOrder(order)}
              className="py-2 px-3 bg-white dark:bg-zinc-800 text-xs border-zinc-200 dark:border-zinc-700 text-[#212121] dark:text-[#ECECEC]"
              title="Imprimir ticket de comanda"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ticket</span>
            </Button>

            {/* High-visibility Close Button */}
            <button
              type="button"
              onClick={() => setSelectedOrderId(null)}
              className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[#212121] dark:text-[#ECECEC] hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 shadow-2xs cursor-pointer transition-colors"
              title="Cerrar panel"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="px-5 sm:px-6 py-2.5 bg-zinc-50/70 dark:bg-zinc-900/60 border-b border-zinc-200/60 dark:border-zinc-800/70 flex items-center justify-between gap-3 flex-none">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
            Modo de Vista:
          </span>

          <SegmentedControl
            intent="drawer.mode"
            tone="accent"
            value={drawerViewMode}
            onValueChange={v => setDrawerViewMode(v as "cocina" | "general")}
            options={[
              { value: "cocina", label: "Ficha de Cocina (KDS)" },
              { value: "general", label: "General & Caja" },
            ]}
          />
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 scrollbar-thin">
          {/* ========================================================================= */}
          {/* MODE 1: FICHA TÉCNICA DE COCINA (KDS STAFF)                              */}
          {/* ========================================================================= */}
          {drawerViewMode === "cocina" ? (
            <div className="space-y-5 animate-fade-in">
              {/* Turn & Kitchen Station Card */}
              <div className="p-4 rounded-2xl bg-[#ECECEC]/50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#190088] dark:text-[#97D6DF]">
                    Estación de Cocina & Armado
                  </span>
                  <h4 className="font-extrabold text-sm text-[#212121] dark:text-white mt-0.5">
                    Comanda Turno #{order.turnNumber || "00"}
                  </h4>
                </div>

                <div className="text-right font-mono">
                  <span className="text-[11px] text-zinc-500 block">Tiempo en Horno</span>
                  <span className="font-extrabold text-sm text-[#212121] dark:text-white">
                    {order.elapsedMinutes} / {order.estimatedMinutes} min
                  </span>
                </div>
              </div>

              {/* Critical Kitchen Instructions & Notes */}
              {order.notes ? (
                <div className="p-4 rounded-2xl bg-[#EFE6D3]/60 dark:bg-[#EFE6D3]/10 border border-[#EFE6D3] dark:border-[#EFE6D3]/30 text-[#212121] dark:text-[#ECECEC] space-y-1 shadow-2xs">
                  <span className="font-mono font-bold text-[11px] uppercase tracking-wider text-[#190088] dark:text-[#97D6DF] block">
                    Instrucción Crítica / Alérgenos
                  </span>
                  <p className="text-xs font-bold leading-relaxed">{order.notes}</p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 text-xs text-zinc-500">
                  Sin alérgenos ni notas especiales declaradas.
                </div>
              )}

              {/* Interactive Kitchen Preparation Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-zinc-400">
                    Checklist de Elaboración & Empaque
                  </h4>
                  <span className="text-[11px] text-[#190088] dark:text-[#97D6DF] font-mono font-bold">
                    {Object.values(kitchenChecked).filter(Boolean).length} / {order.items.length} listos
                  </span>
                </div>

                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xs">
                  {order.items.map((it, idx) => {
                    const isDone = !!kitchenChecked[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => handleToggleKitchenCheck(idx)}
                        className={`p-4 flex items-start justify-between gap-3 cursor-pointer transition-colors ${
                          isDone
                            ? "bg-[#97D6DF]/10 text-zinc-400 dark:text-zinc-500"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            className="mt-0.5 text-zinc-400 hover:text-[#190088] dark:hover:text-[#97D6DF] transition-colors cursor-pointer"
                          >
                            {isDone ? (
                              <CheckSquare className="w-5 h-5 text-[#190088] dark:text-[#97D6DF]" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>

                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-mono font-bold px-2 py-0.5 rounded-lg ${
                                  isDone
                                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
                                    : "bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF]"
                                }`}
                              >
                                ×{it.quantity}
                              </span>
                              <p
                                className={`font-bold text-sm truncate ${
                                  isDone
                                    ? "line-through text-zinc-400 dark:text-zinc-500"
                                    : "text-[#212121] dark:text-zinc-50"
                                }`}
                              >
                                {it.name}
                              </p>
                            </div>

                            {it.option && (
                              <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md inline-block">
                                {it.option}
                              </span>
                            )}
                            {it.notes && (
                              <p className="text-xs text-[#190088] dark:text-[#97D6DF] font-medium italic">
                                Nota: {it.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Time Buffer Addition */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                    ¿Se demoró el horneado?
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Suma minutos para actualizar la alerta del KDS.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    intent="kitchen.add.5"
                    onClick={() => adjustEstimate(order.id, 5)}
                    className="py-1.5 px-3 text-xs font-bold bg-white dark:bg-zinc-800 cursor-pointer"
                  >
                    +5 min
                  </Button>
                  <Button
                    variant="outline"
                    intent="kitchen.add.10"
                    onClick={() => adjustEstimate(order.id, 10)}
                    className="py-1.5 px-3 text-xs font-bold bg-white dark:bg-zinc-800 cursor-pointer"
                  >
                    +10 min
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* MODE 2: DETALLE GENERAL & ADMINISTRACIÓN (CAJA / SUPERVISOR)              */
            /* ========================================================================= */
            <div className="space-y-5 animate-fade-in">
              {/* INCIDENT & DELAY ALERT */}
              {(activeIncident || order.urgency === "RETRASADO") && (
                <div className="bg-[#ECECEC]/40 dark:bg-zinc-900/60 border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#190088] dark:text-[#97D6DF]">
                        Incidencia Operativa · Severidad {activeIncident?.severity || "Alta"}
                      </span>
                      <h4 className="font-bold text-xs text-[#212121] dark:text-[#ECECEC] mt-0.5">
                        {activeIncident?.title ||
                          `Retraso en Comanda ${order.id} (+${delayMinutes > 0 ? delayMinutes : 6} min sobre pactado)`}
                      </h4>
                    </div>

                    <span className="font-mono text-xs font-bold text-[#190088] dark:text-[#97D6DF] bg-[#97D6DF]/20 px-2 py-0.5 rounded-lg border border-[#97D6DF]/40">
                      +{delayMinutes > 0 ? delayMinutes : 6}m demora
                    </span>
                  </div>

                  <p className="text-xs text-[#212121] dark:text-zinc-300 leading-relaxed bg-white dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    {activeIncident?.description ||
                      `El pedido superó los ${order.estimatedMinutes} min pactados debido a sobredemanda de preparación en cocina central.`}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      variant="outline"
                      intent="order-detail.add-time"
                      onClick={() => adjustEstimate(order.id, 10)}
                      className="py-2 px-3 bg-white dark:bg-zinc-800 text-xs text-[#212121] dark:text-[#ECECEC] border-zinc-200 dark:border-zinc-700 font-bold cursor-pointer"
                    >
                      <span>+10m a Cocina</span>
                    </Button>

                    <Button
                      variant="ghost"
                      intent="order-detail.notify-whatsapp"
                      onClick={handleSendWhatsAppNotification}
                      disabled={whatsappSent}
                      className="py-2 px-3.5 rounded-xl bg-[#190088] hover:bg-[#14006e] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-75"
                    >
                      <span>{whatsappSent ? "Notificación Enviada" : "Avisar Demora por WhatsApp"}</span>
                    </Button>

                    {activeIncident && (
                      <Button
                        variant="primary"
                        intent="order-detail.resolve"
                        onClick={() => resolveIncidencia(activeIncident.id)}
                        className="py-2 px-3 text-xs ml-auto font-bold bg-[#190088] hover:bg-[#14006e] text-white"
                      >
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Resolver</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* WhatsApp Channel & AI Origin Banner */}
              {order.channel === "whatsapp" && (
                <div className="bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#190088] dark:bg-[#97D6DF]" />
                      <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        Canal WhatsApp Business {order.aiConfidence ? `· Confianza ${order.aiConfidence}` : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openWhatsAppConversation(order.id)}
                      className="text-xs font-bold text-[#190088] dark:text-[#97D6DF] hover:underline cursor-pointer flex items-center gap-1.5 bg-[#190088]/10 dark:bg-[#190088]/20 px-2.5 py-1 rounded-lg border border-[#190088]/20 transition-colors"
                      title="Abrir la conversación en vivo de este cliente en Atención al Cliente"
                    >
                      <span>Ver chat en WhatsApp</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {order.aiRawMessage ? (
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 italic bg-white dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      "{order.aiRawMessage}"
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500 italic">
                      Comanda gestionada por WhatsApp. Podés enviar avisos directos con 1 clic:
                    </p>
                  )}

                  {/* 1-Click WhatsApp Quick Notification Triggers */}
                  <div className="pt-1 border-t border-zinc-200/60 dark:border-zinc-800/80 space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase block">
                      Avisos Rápidos al WhatsApp del Cliente:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          handleSendQuickAlert(
                            order.id,
                            `¡Hola ${order.customerName}! Tu pedido #${order.id} ya va en camino con el repartidor.`
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 hover:bg-[#190088]/10 dark:hover:bg-[#190088]/20 border border-zinc-200 dark:border-zinc-700 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 hover:text-[#190088] dark:hover:text-[#97D6DF] transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                      >
                        <Bike className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF]" />
                        <span>En camino</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleSendQuickAlert(
                            order.id,
                            `¡Hola ${order.customerName}! Tu pedido #${order.id} está listo para que pases a retirarlo.`
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 hover:bg-[#190088]/10 dark:hover:bg-[#190088]/20 border border-zinc-200 dark:border-zinc-700 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 hover:text-[#190088] dark:hover:text-[#97D6DF] transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF]" />
                        <span>Listo para retiro</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleSendQuickAlert(
                            order.id,
                            `Hola ${order.customerName}, debido a alta demanda tu pedido #${order.id} tomará aproximadamente 10 min adicionales. Gracias por tu paciencia.`
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 hover:bg-[#190088]/10 dark:hover:bg-[#190088]/20 border border-zinc-200 dark:border-zinc-700 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 hover:text-[#190088] dark:hover:text-[#97D6DF] transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                      >
                        <Clock className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF]" />
                        <span>Demora (+10m)</span>
                      </button>
                    </div>

                    {sentAlertToast && (
                      <div className="text-[11px] font-bold text-[#190088] dark:text-[#97D6DF] flex items-center gap-1 animate-fade-in pt-1">
                        <Check className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF]" />
                        <span>{sentAlertToast}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer & Delivery Information Card */}
              <div className="bg-zinc-50/50 dark:bg-zinc-900/40 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-3.5">
                <h4 className="font-mono font-bold text-[11px] uppercase tracking-wider text-zinc-400">
                  Cliente & Entrega
                </h4>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">Nombre / Mesa</span>
                    <p className="font-bold text-[#212121] dark:text-zinc-50 text-sm mt-0.5">
                      {order.customerName}
                    </p>
                  </div>

                  {order.paymentMethod && (
                    <div>
                      <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">Pago</span>
                      <p className="font-bold text-[#212121] dark:text-white uppercase font-mono mt-0.5 text-sm">
                        {order.paymentMethod}
                      </p>
                    </div>
                  )}

                  {order.customerPhone && (
                    <div>
                      <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">WhatsApp</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <button
                          type="button"
                          onClick={() => openWhatsAppConversation(order.id)}
                          className="font-mono font-bold text-[#190088] dark:text-[#97D6DF] flex items-center gap-1.5 text-xs hover:underline transition-colors cursor-pointer"
                          title="Abrir chat dentro de Necto"
                        >
                          <span>{order.customerPhone}</span>
                        </button>
                        <a
                          href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-400 hover:text-[#190088] dark:hover:text-[#97D6DF] transition-colors"
                          title="Abrir en WhatsApp Web externo"
                        >
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      </div>
                    </div>
                  )}

                  {order.customerAddress && (
                    <div className="col-span-2">
                      <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">Dirección</span>
                      <p className="font-medium text-zinc-800 dark:text-zinc-200 text-xs mt-0.5">
                        {order.customerAddress}
                      </p>
                    </div>
                  )}
                </div>

                {/* Notes callout */}
                {order.notes && (
                  <div className="bg-[#EFE6D3]/50 dark:bg-[#EFE6D3]/10 border border-[#EFE6D3] dark:border-[#EFE6D3]/30 px-3 py-2 rounded-xl">
                    <p className="text-[11px] text-[#212121] dark:text-[#ECECEC] italic leading-relaxed">
                      "{order.notes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Kitchen Timer — Clean Card */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#190088]/10 dark:bg-[#190088]/20 text-[#190088] dark:text-[#97D6DF] flex items-center justify-center font-mono font-black text-sm">
                    {order.elapsedMinutes}m
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono block">Cocina</span>
                    <p className="text-xs font-bold text-[#212121] dark:text-zinc-50">
                      {order.elapsedMinutes} / {order.estimatedMinutes} min
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <UrgencyBadge
                    urgency={order.urgency}
                    elapsedMin={order.elapsedMinutes}
                    estMin={order.estimatedMinutes}
                  />
                  {!["FINALIZADO", "CANCELADO", "RECHAZADO"].includes(order.status) && (
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
                      <button
                        type="button"
                        onClick={() => adjustEstimate(order.id, -5)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-700 text-[#212121] dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-600 flex items-center justify-center cursor-pointer shadow-xs transition-all active:scale-95"
                        title="Restar 5 min"
                      >
                        <Minus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustEstimate(order.id, 5)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-700 text-[#212121] dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-600 flex items-center justify-center cursor-pointer shadow-xs transition-all active:scale-95"
                        title="Sumar 5 min"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Products Breakdown — Clean list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-[#190088] dark:text-[#97D6DF]">
                    Productos
                  </h4>
                  <span className="text-[11px] font-mono font-bold text-zinc-400">
                    {order.items.reduce((acc, it) => acc + it.quantity, 0)} {order.items.reduce((acc, it) => acc + it.quantity, 0) === 1 ? "ítem" : "ítems"}
                  </span>
                </div>

                <div className="border border-zinc-200/90 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-white dark:bg-[#18181B] shadow-2xs">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 flex items-center gap-2.5">
                        <span className="font-mono font-bold text-xs bg-[#190088]/10 dark:bg-[#190088]/20 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20 w-8 h-8 rounded-xl flex items-center justify-center flex-none shadow-2xs">
                          {it.quantity}×
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-[#212121] dark:text-zinc-50 truncate">
                            {it.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {it.option && (
                              <span className="text-[10px] font-mono font-bold text-[#190088] dark:text-[#97D6DF] bg-[#97D6DF]/15 border border-[#97D6DF]/25 px-1.5 py-px rounded-md">
                                {it.option}
                              </span>
                            )}
                            {it.notes && (
                              <span className="text-[10px] text-[#212121]/60 dark:text-[#ECECEC]/60 italic truncate max-w-[180px]">
                                "{it.notes}"
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-none font-mono">
                        <p className="font-bold text-sm text-[#190088] dark:text-[#97D6DF]">
                          ${(it.unitPrice * it.quantity).toLocaleString("es-CO")}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          ${it.unitPrice.toLocaleString("es-CO")} c/u
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Total footer */}
                  <div className="p-4 bg-[#190088]/5 dark:bg-[#190088]/10 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                    <span className="font-bold text-sm text-[#212121] dark:text-zinc-50">
                      Total
                    </span>
                    <span className="font-mono font-black text-xl text-[#190088] dark:text-[#97D6DF] tracking-tight">
                      ${order.total.toLocaleString("es-CO")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
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
              className="flex-1 py-3 px-4 rounded-2xl text-xs bg-[#190088] hover:bg-[#14006e] text-white font-bold cursor-pointer"
            >
              <span>Enviar a Cocina KDS (Pasar a En Vivo)</span>
            </Button>
          )}

          {!programados.some(p => p.id === order.id) && order.status === "NUEVO" && (
            <>
              <Button
                variant="primary"
                intent="order-detail.confirm"
                onClick={() => confirmOrder(order.id)}
                className="flex-1 py-3 px-4 rounded-2xl text-xs bg-[#190088] hover:bg-[#14006e] text-white font-bold cursor-pointer"
              >
                <span>Aceptar y Confirmar Pedido</span>
              </Button>
              <Button
                variant="outline"
                intent="order-detail.reject"
                onClick={() => setRejectModalOrder(order)}
                className="py-3 px-4 rounded-2xl border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-[#212121] text-xs cursor-pointer"
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
              className="flex-1 py-3 px-4 rounded-2xl text-xs bg-[#190088] hover:bg-[#14006e] text-white font-bold cursor-pointer"
            >
              <span>Pasar a Cocina (KDS)</span>
            </Button>
          )}

          {order.status === "EN_PREPARACION" && (
            <Button
              variant="primary"
              intent="order-detail.mark-ready"
              onClick={() => markOrderReady(order.id)}
              className="flex-1 py-3 px-4 rounded-2xl text-xs bg-[#190088] hover:bg-[#14006e] text-white font-bold cursor-pointer"
            >
              <span>Marcar Listo para Despacho</span>
            </Button>
          )}

          {order.status === "LISTO" && (
            <Button
              variant="primary"
              intent="order-detail.deliver"
              onClick={() => deliverOrder(order.id)}
              className="flex-1 py-3 px-4 rounded-2xl text-xs bg-[#190088] hover:bg-[#14006e] text-white font-bold cursor-pointer"
            >
              <span>Marcar Entregado / Despachado</span>
            </Button>
          )}

          {!["FINALIZADO", "CANCELADO", "RECHAZADO"].includes(order.status) && (
            <Button
              variant="outline"
              intent="order-detail.cancel"
              onClick={() => setCancelModalOrder(order)}
              className="py-3 px-3.5 rounded-2xl border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-[#212121] text-xs cursor-pointer"
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
