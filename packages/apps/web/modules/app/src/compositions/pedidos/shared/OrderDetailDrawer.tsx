import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { useBusiness } from "@/context/BusinessContext";
import { OrderStatusBadge, UrgencyBadge, ChannelBadge, ReturnStatusBadge, PaymentStatusBadge } from "./Badges";
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
  Timer,
  RotateCcw,
  Package,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MapPin,
  Phone,
  CreditCard,
} from "lucide-react";
import { Button } from "@/elements";

export const OrderDetailDrawer: React.FC = () => {
  const { openWhatsAppConversation, sendWhatsAppStatusAlert } = useChannels();
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
    updatePaymentStatus,
    processReturnOrder,
    incidencias,
    resolveIncidencia,
    hasInventarios,
    inventoryAdapter,
  } = usePedidos();

  const { activeRoleId, semantics } = useBusiness();
  const isCookRole = activeRoleId === "role-cook";

  const [kitchenChecked, setKitchenChecked] = useState<Record<number, boolean>>({});
  const [sentAlertToast, setSentAlertToast] = useState<string | null>(null);

  const handleSendQuickAlert = (orderId: string, text: string) => {
    sendWhatsAppStatusAlert(orderId, text);
    setSentAlertToast("Notificación enviada al cliente");
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

  const isTicketReady =
    order.status === "CONFIRMADO" ||
    order.status === "EN_PREPARACION" ||
    order.status === "LISTO" ||
    order.status === "FINALIZADO";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end font-sans antialiased">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => setSelectedOrderId(null)}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col h-full z-10 animate-slide-left overflow-hidden">
        {/* Drawer Header */}
        <div className="p-5 sm:p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/80 flex items-center justify-between gap-4 flex-none">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm border border-brand-100 dark:border-brand-500/20 font-mono shadow-theme-xs flex-none">
              #{order.turnNumber || "00"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white font-mono tracking-tight">
                  {order.id}
                </h3>
                <OrderStatusBadge status={order.status} size="sm" />
                {order.returnStatus && order.returnStatus !== "NO_APLICA" && (
                  <ReturnStatusBadge returnStatus={order.returnStatus} size="sm" />
                )}
                <PaymentStatusBadge paymentStatus={order.paymentStatus} size="sm" />
                <ChannelBadge channel={order.channel} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Ingresó a las{" "}
                <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                  {order.createdAt}
                </span>{" "}
                · Turno #{order.turnNumber || "00"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => isTicketReady && setPrintTicketOrder(order)}
              disabled={!isTicketReady}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isTicketReady
                  ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  : "border-gray-200/60 bg-gray-100/50 text-gray-300 dark:border-gray-800 dark:bg-gray-800/30 dark:text-gray-600 cursor-not-allowed"
              }`}
              title={isTicketReady ? "Imprimir ticket térmico" : "Ticket no disponible"}
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Ticket</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedOrderId(null)}
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content — Unified, High-Scannability SaaS Layout */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Section 1: Cliente & Entrega */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-gray-900 dark:text-white">
                {order.customerName}
              </h4>
              <span className="text-xs text-gray-400 font-mono">
                Turno #{order.turnNumber || "00"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {order.channel === "whatsapp" ? "WhatsApp" : order.channel === "web" ? "Tienda Web" : "Mostrador / Presencial"}
              </span>
              <span>·</span>
              <span>{order.customerAddress ? "Domicilio" : "Retiro en mostrador"}</span>
            </div>

            {order.customerAddress && (
              <p className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-1.5 pt-0.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-none mt-0.5" />
                <span>{order.customerAddress}</span>
              </p>
            )}

            {order.customerPhone && (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400 flex-none" />
                <a
                  href={`tel:${order.customerPhone}`}
                  className="text-gray-700 dark:text-gray-300 hover:underline"
                >
                  {order.customerPhone}
                </a>
                {order.channel === "whatsapp" && (
                  <button
                    type="button"
                    onClick={() => openWhatsAppConversation(order.id)}
                    className="text-brand-600 dark:text-brand-400 hover:underline cursor-pointer text-[11px] ml-1"
                  >
                    (Ver chat de origen)
                  </button>
                )}
              </p>
            )}

            {order.notes && (
              <div className="bg-amber-50/80 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 italic">
                "{order.notes}"
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* Section 2: Productos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Productos
              </h4>
              <span className="text-xs text-gray-400 font-medium">
                {order.items.reduce((acc, it) => acc + it.quantity, 0)} ítems
              </span>
            </div>

            <div className="space-y-2">
              {order.items.map((it, idx) => {
                const isDone = !!kitchenChecked[idx];
                const invStock = hasInventarios ? inventoryAdapter.getProductStock(it.productId, it.name) : null;

                return (
                  <div
                    key={idx}
                    onClick={() => handleToggleKitchenCheck(idx)}
                    className={`p-2.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                      isDone
                        ? "bg-gray-50/60 border-gray-200/50 text-gray-400 dark:bg-gray-800/30 dark:border-gray-800 dark:text-gray-500"
                        : "bg-white border-gray-200/70 hover:border-gray-300 dark:bg-gray-850 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                        isDone ? "bg-gray-200 text-gray-400 dark:bg-gray-800" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                      }`}>
                        {it.quantity}×
                      </span>
                      <div className="min-w-0">
                        <p className={`text-xs font-medium truncate ${isDone ? "line-through text-gray-400" : ""}`}>
                          {it.name}
                        </p>
                        {invStock && (
                          <span className="text-[10px] text-gray-400">
                            Stock: {invStock.availableStock} disp.
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="font-mono text-xs font-medium text-gray-800 dark:text-gray-200 flex-none">
                      ${(it.unitPrice * it.quantity).toLocaleString("es-CO")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* Section 3: Resumen Financiero & Tiempos */}
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                Total
              </span>
              <span className="font-mono font-bold text-base text-gray-900 dark:text-white">
                ${order.total.toLocaleString("es-CO")} COP
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-t border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Pago</span>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${
                  order.paymentStatus === "PAGADO"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : order.paymentStatus === "PAGO_CONTRA_ENTREGA"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}>
                  {order.paymentStatus === "PAGADO"
                    ? "Pagado"
                    : order.paymentStatus === "PAGO_CONTRA_ENTREGA"
                    ? "Contra entrega"
                    : "Pendiente de pago"}
                </span>
                {order.paymentStatus !== "PAGADO" && (
                  <button
                    type="button"
                    onClick={() => updatePaymentStatus(order.id, "PAGADO", "Confirmado")}
                    className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer ml-1"
                  >
                    Marcar Pagado
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between py-1.5 border-t border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Orden recibida</span>
              <span className="text-gray-700 dark:text-gray-300 font-mono">
                {order.createdAt} · hace {order.elapsedMinutes} min
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-t border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Tiempo de preparación</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-gray-800 dark:text-gray-200">
                  {order.elapsedMinutes} / {order.estimatedMinutes} min
                </span>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-md">
                  <button
                    type="button"
                    onClick={() => adjustEstimate(order.id, -5)}
                    disabled={order.estimatedMinutes <= 5}
                    className="w-5 h-5 rounded flex items-center justify-center text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-30 cursor-pointer"
                    title="Restar 5 min"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustEstimate(order.id, 5)}
                    className="w-5 h-5 rounded flex items-center justify-center text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer"
                    title="Sumar 5 min"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Retraso Alert (solo si existe demora) */}
            {order.urgency === "RETRASADO" && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                <span className="font-medium">⚠ {delayMinutes > 0 ? delayMinutes : 6} min de demora</span>
                <button
                  type="button"
                  onClick={handleSendWhatsAppNotification}
                  disabled={whatsappSent}
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                >
                  {whatsappSent ? "Aviso enviado ✓" : "Notificar al cliente"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer Actions — Primary Contextual Action on Top, Secondary Discrete Cancel Below */}
        <div className="p-5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col items-center gap-2 flex-none">
          {programados.some(p => p.id === order.id) && (
            <button
              type="button"
              onClick={() => {
                injectScheduledOrderToLive(order.id, true);
                setSelectedOrderId(order.id);
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white font-semibold cursor-pointer transition-colors shadow-theme-xs"
            >
              Pasar a preparación
            </button>
          )}

          {!programados.some(p => p.id === order.id) && order.status === "NUEVO" && (
            <button
              type="button"
              onClick={() => confirmOrder(order.id)}
              className="w-full py-2.5 px-4 rounded-xl text-xs bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white font-semibold cursor-pointer transition-colors shadow-theme-xs"
            >
              Confirmar orden
            </button>
          )}

          {!programados.some(p => p.id === order.id) && order.status === "CONFIRMADO" && (
            <button
              type="button"
              onClick={() => sendToKitchen(order.id)}
              className="w-full py-2.5 px-4 rounded-xl text-xs bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white font-semibold cursor-pointer transition-colors shadow-theme-xs"
            >
              Pasar a preparación
            </button>
          )}

          {order.status === "EN_PREPARACION" && (
            <button
              type="button"
              onClick={() => markOrderReady(order.id)}
              className="w-full py-2.5 px-4 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer transition-colors shadow-theme-xs"
            >
              Listo para entrega
            </button>
          )}

          {order.status === "LISTO" && (
            <button
              type="button"
              onClick={() => deliverOrder(order.id)}
              className="w-full py-2.5 px-4 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer transition-colors shadow-theme-xs"
            >
              Entregar orden
            </button>
          )}

          {/* Secondary Actions (Discrete Text Buttons Below) */}
          <div className="flex items-center justify-center gap-4 pt-1">
            {order.status === "NUEVO" && (
              <button
                type="button"
                onClick={() => setRejectModalOrder(order)}
                className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 cursor-pointer transition-colors"
              >
                Rechazar orden
              </button>
            )}

            {!["ENTREGADO", "FINALIZADO", "CANCELADO", "RECHAZADO"].includes(order.status) && (
              <button
                type="button"
                onClick={() => setCancelModalOrder(order)}
                className="text-xs text-gray-400 hover:text-red-600 dark:text-gray-500 cursor-pointer transition-colors"
              >
                Cancelar pedido
              </button>
            )}

            {["ENTREGADO", "FINALIZADO"].includes(order.status) && order.returnStatus !== "RECIBIDA" && (
              <button
                type="button"
                onClick={() => setCancelModalOrder(order)}
                className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 cursor-pointer transition-colors"
              >
                Registrar Devolución / Anular
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
