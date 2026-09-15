/**
 * Pedidos → Detalle de la orden (§14)
 * ====================================
 *
 * "Uno de los componentes más importantes del módulo."
 *
 * ── Reglas que este componente respeta ──────────────────────────────────────
 *
 * ⚠️ §14 — "Las acciones deben depender del estado real y no ser botones estáticos
 * sin lógica." Las acciones **no se declaran aquí**: se piden a
 * `orderActionsFor(order)`, que las deriva de la máquina de estados y de la
 * modalidad de entrega. Si el estado no ofrece una transición, el botón no existe.
 *
 * ⚠️ §14 — "Información del requester/cliente: **solo información relacionada con
 * esa orden**. No crear aquí un CRM." Por eso se muestran los campos del
 * `OrderRequester` de esta orden, y **ningún** historial de compras ni ficha de
 * cliente.
 *
 * ⚠️ §14 — "Pago: información asociada a la orden. No crear aquí un sistema
 * financiero independiente." Se muestra el estado del pago de la orden; no hay
 * conciliación, ni movimientos, ni métodos guardados.
 *
 * ⚠️ §15 — "La programación pertenece al contexto de la orden." Cuando la orden
 * está programada, la programación se muestra **dentro del detalle**, no en un
 * calendario aparte.
 *
 * ⚠️ §19 — No hay ni un campo de inventario. Cuando exista, reaccionará al evento,
 * no a esta pantalla.
 */

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  MapPin,
  MessageSquare,
  PackageCheck,
  Phone,
  RotateCcw,
  ShieldCheck,
  Store,
  Truck,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge, Button, Textarea, type BadgeColor } from "@/elements";
import type { Order, OrderStatus } from "@/contracts/order.contract";
import { useBusiness } from "@/context/BusinessContext";
import {
  FULFILLMENT_MODE_LABELS,
  ORDER_STATUS_LABELS,
  orderActionsFor,
} from "../order-status.constants";
import type { OrderAction } from "../order-status.constants";
import {
  FULFILLMENT_ICONS,
  PAYMENT_STATUS_LABELS,
  formatCountdown,
  formatMoney,
  formatOrderDate,
  formatQuantity,
  formatRelative,
} from "../order-presentation.utils";

/**
 * El estado del pago, traducido al color del `Badge` del catálogo.
 *
 * ⚠️ Dos de los cuatro estados —sin pagar y reembolsado— son igual de neutros: ni
 * uno ni otro es un éxito ni un error, y por eso ambos caen en `light`. Pintar
 * "reembolsado" de verde diría que el pago salió bien cuando de hecho se deshizo.
 */
const PAYMENT_STATUS_TO_BADGE: Record<string, BadgeColor> = {
  unpaid: "light",
  pending: "warning",
  paid: "success",
  refunded: "light",
};
import { useOrders } from "../context/OrdersContext";
import { useFlowSettings } from "../operational/flow-settings";
import { OrderOriginPanel } from "../shared/OrderSource";
import { OrderStatusChip } from "../shared/OrderStatusChip";
import { OrderTimeline } from "../shared/OrderTimeline";
import type { OrderMovement } from "../shared/OrdersMovementBand";

/* ── Drawer ────────────────────────────────────────────────────────────────── */

/**
 * Icono de la acción, por destino.
 *
 * ⚠️ No es adorno: `Despachar` (sale) y `Marcar como entregada` (llegó) son los
 * dos caminos que se abren desde `READY`, y el icono —camión frente a visto— es lo
 * que los separa de un vistazo cuando el rótulo se lee de prisa.
 */
const ACTION_ICONS: Partial<Record<OrderStatus, LucideIcon>> = {
  CONFIRMED: ShieldCheck,
  IN_PREPARATION: Wrench,
  READY: PackageCheck,
  IN_TRANSIT: Truck,
  DELIVERED: CheckCircle2,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
  RETURNED: RotateCcw,
};

export interface OrderDetailDrawerProps {
  order: Order | null;
  onClose: () => void;
  /**
   * Vuelve a la conversación de la que salió la orden.
   *
   * ⚠️ Lo **recibe** el drawer: Pedidos no sabe abrir una conversación (es del
   * canal, §18). Mientras el shell no lo ofrezca, el panel de origen explica por
   * qué la acción no está disponible en vez de esconderla sin más.
   */
  onReplyToSource?: () => void;
  /** Explicación mostrada cuando el puente a la conversación no está disponible. */
  replyUnavailableHint?: string;
  /**
   * Avisa de que la orden **cambió de estado** desde aquí.
   *
   * ⚠️ El drawer ejecuta la transición —es quien conoce la acción elegida—, pero
   * no puede saber qué hacer con el hecho: al cerrar una orden, la fila
   * desaparece de la pantalla que la mostraba y el movimiento queda invisible. La
   * pantalla que monta el drawer es quien sabe qué hacer con eso (§27), así que el
   * drawer **reporta** y la pantalla decide.
   */
  onTransition?: (movement: OrderMovement) => void;
}

export function OrderDetailDrawer({
  order,
  onClose,
  onReplyToSource,
  replyUnavailableHint,
  onTransition,
}: OrderDetailDrawerProps) {
  const { activeBusiness } = useBusiness();
  const { transitionOrder } = useOrders();
  // ⚠️ El umbral entra aquí para que el historial del detalle pueda decir qué
  // tramo se salió del ritmo, igual que el visor de auditoría del Historial. Es el
  // **mismo** ajuste (§17) y por eso sale del contexto compartido y no de una
  // constante: si se cambiara el ritmo, las dos superficies tienen que moverse
  // juntas.
  const { settings } = useFlowSettings();

  // Acción pendiente de motivo (§9): cancelar y devolver exigen explicación, así
  // que en vez de un `window.prompt` se abre un paso explícito en el propio
  // drawer — el motivo queda asociado a la orden y no se pierde.
  const [pendingReasonAction, setPendingReasonAction] = useState<OrderAction | null>(null);
  const [reason, setReason] = useState("");

  // Al cambiar de orden se descarta cualquier motivo a medio escribir: pertenecía
  // a la orden anterior.
  useEffect(() => {
    setPendingReasonAction(null);
    setReason("");
  }, [order?.id]);

  // Cerrar con Escape es lo que espera cualquiera que use un drawer.
  useEffect(() => {
    if (!order) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [order, onClose]);

  if (!order) return null;

  const currency = activeBusiness?.currency ?? "COP";
  const actions = orderActionsFor(order);
  const ModeIcon = FULFILLMENT_ICONS[order.fulfillment.mode] ?? Store;

  function runAction(action: OrderAction) {
    if (action.requiresReason) {
      setPendingReasonAction(action);
      setReason("");
      return;
    }
    applyTransition(action.to);
  }

  function confirmReason() {
    if (!pendingReasonAction) return;
    const trimmed = reason.trim();
    // ⚠️ El motivo es obligatorio: el historial debe poder responder *por qué*
    // (§10), y una cancelación sin motivo deja esa pregunta sin respuesta. Por eso
    // el botón queda deshabilitado en vez de guardar una cadena vacía.
    if (!trimmed) return;
    applyTransition(pendingReasonAction.to, trimmed);
    setPendingReasonAction(null);
    setReason("");
  }

  /**
   * Ejecuta la transición y **reporta** el movimiento a la pantalla.
   *
   * ⚠️ Se lee el estado de origen **antes** de transicionar, no después: al
   * volver, `order` ya viene con el estado nuevo y `from` se habría perdido. Y
   * sólo se reporta si `transitionOrder` devolvió `true` — el contexto valida
   * contra la máquina de estados y puede rechazar la transición, así que anunciar
   * un movimiento que no ocurrió sería peor que no anunciar nada.
   */
  function applyTransition(to: OrderStatus, transitionReason?: string) {
    if (!order) return;
    const from = order.status;
    const didTransition = transitionOrder(
      order.id,
      to,
      transitionReason ? { reason: transitionReason } : undefined
    );
    if (didTransition) {
      onTransition?.({ orderId: order.id, orderNumber: order.number, from, to });
    }
  }

  const avgUnitTone =
    order.totals.discounts.length > 0 || order.totals.charges.length > 0;

  return (
    /*
     * ⚠️ El detalle **dejó de ser un modal**, y ése es el cambio de fondo de esta
     * superficie. Antes era un diálogo a pantalla completa sobre un velo
     * (`fixed inset-0 … backdrop-blur`), y eso imponía el bucle de trabajo: abrir
     * ficha → leer → actuar → cerrar, una vez por orden. Trabajar doce órdenes eran
     * doce aperturas con su cierre, y la lista —lo único que dice qué queda por
     * hacer— desaparecía detrás del velo justo cuando hacía falta. Ahora es un panel
     * **anclado al lado de la lista**: la cola sigue a la vista mientras se resuelve
     * la orden que se tiene delante, y se puede pasar a la siguiente sin volver a
     * buscar dónde se estaba.
     *
     * ⚠️ Se van `role="dialog"` y `aria-modal` porque describían el **velo**, no el
     * panel: sin velo no hay nada que aislar, y anunciar un diálogo modal sobre una
     * superficie que no bloquea el fondo le mentiría a quien usa lector de pantalla.
     * El nombre accesible se queda (`aria-label`), que es lo que hacía falta de verdad.
     *
     * ⚠️ La **altura no se decide aquí**: este archivo no sabe si está en una columna
     * al lado de la lista o apilado encima en una pantalla estrecha. Quien la acota
     * es el marco de `OrdersModule`. Aquí sólo se declara que el **cuerpo** es lo que
     * desplaza (`flex-1 overflow-y-auto`), para que la cabecera y el pie de acciones
     * no se marchen al fondo de una orden con veinte ítems.
     *
     * ⚠️ `min-h-0` en las dos capas no es decorativo: sin él, un flex item tiene
     * `min-height: auto` y **se niega a encogerse** por debajo de su contenido, así
     * que el `overflow-y-auto` del cuerpo nunca llegaría a activarse y el panel
     * crecería hasta salirse del marco.
     */
    <div className="flex min-h-0 flex-col">
      {/* Panel */}
      <aside
        aria-label={`Detalle de la orden ${order.number}`}
        data-order-detail={order.number}
        className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-secondary-950"
      >
        {/* ── Cabecera: resumen (§14) ──────────────────────────────────────── */}
        <header className="flex-none border-b border-gray-100 px-6 pb-5 pt-6 dark:border-gray-800">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-theme-xl font-bold tracking-tight text-secondary-600 dark:text-white">
                  {order.number}
                </h2>
                <OrderStatusChip status={order.status} />
              </div>
              <p className="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
                Creada {formatRelative(order.createdAt)} · {formatOrderDate(order.createdAt)}
              </p>
            </div>

            {/* ⚠️ `Button` del DS no reenvía props nativas (sólo `title`), así que un
                control de sólo icono con `aria-label` es un `<button>` nativo. */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar detalle"
              className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Franja de contexto: modalidad · total.
              ⚠️ El **origen** ya no está aquí: pasó a su propia sección del
              cuerpo, con la referencia del hilo y la acción de respuesta. Un
              rótulo de tres palabras en la cabecera no podía responder "¿cómo
              llegó esta orden?" (§18). */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <SummaryCell
              label="Entrega"
              value={FULFILLMENT_MODE_LABELS[order.fulfillment.mode]}
              icon={<ModeIcon className="h-3.5 w-3.5" aria-hidden />}
            />
            <SummaryCell
              label="Total"
              value={formatMoney(order.totals.total, currency)}
              emphasis
            />
          </div>
        </header>
        {/* ── Cuerpo desplazable ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-7">
            {/* Origen (§18) — de dónde salió esta orden.
                ⚠️ Va **antes** que los ítems a propósito: la primera pregunta del
                operador ante una orden que no creó es "¿de dónde salió esto?", y
                antes esa respuesta era un `Badge` gris en la cabecera que no decía
                ni el hilo ni si había que contestar. */}
            <Section title="Origen" anchor="origin">
              <OrderOriginPanel
                source={order.source}
                onReply={onReplyToSource}
                replyUnavailableHint={replyUnavailableHint}
              />
            </Section>

            {/* Programación (§15) — sólo si la orden está programada. */}
            {order.schedule && (
              <Section title="Programación" anchor="schedule" icon={<CalendarClock className="h-4 w-4" />}>
                <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-theme-sm font-semibold text-brand-700 dark:text-brand-300">
                        {formatOrderDate(order.schedule.scheduledFor)}
                      </p>
                      <p className="mt-0.5 text-theme-xs text-brand-600/80 dark:text-brand-400/80">
                        {formatCountdown(order.schedule.scheduledFor)}
                        {order.schedule.scheduledUntil ? ` · hasta ${formatOrderDate(order.schedule.scheduledUntil)}` : ""}
                      </p>
                    </div>
                  </div>
                  {order.schedule.note && (
                    <p className="mt-3 border-t border-brand-200/70 pt-3 text-theme-xs text-brand-700/90 dark:border-brand-500/20 dark:text-brand-300/90">
                      {order.schedule.note}
                    </p>
                  )}
                  {/* ⚠️ Se distingue "cuándo se creó" de "para cuándo es" (§15). */}
                  <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
                    Creada {formatRelative(order.createdAt)}
                  </p>
                </div>
              </Section>
            )}

            {/* Ítems (§14) */}
            <Section title="Ítems" anchor="items">
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                {order.items.map((item, i) => (
                  <div
                    key={item.id}
                    data-order-item={item.id}
                    className={`flex items-start justify-between gap-4 p-4 ${
                      i > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        {item.name}
                      </p>
                      {item.description && (
                        <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
                          {item.description}
                        </p>
                      )}
                      {/* Variantes elegidas: pares genéricos nombre/valor (§22). */}
                      {item.options && item.options.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {item.options.map(option => (
                            <Badge
                              key={`${option.name}-${option.value}`}
                              color="light"
                              size="sm"
                              className="px-2 py-0.5"
                            >
                              {option.name}: {option.value}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {item.note && (
                        <p className="mt-1.5 inline-flex items-start gap-1 text-theme-xs text-gray-500 dark:text-gray-400">
                          <MessageSquare className="mt-0.5 h-3 w-3 flex-none" aria-hidden />
                          {item.note}
                        </p>
                      )}
                    </div>

                    <div className="flex-none text-right">
                      <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        {formatMoney(item.subtotal, currency)}
                      </p>
                      <p className="mt-0.5 text-theme-xs text-gray-400 dark:text-gray-500">
                        {formatQuantity(item.quantity)} {item.unit ?? "u"} ×{" "}
                        {formatMoney(item.unitPrice, currency)}
                      </p>
                      {item.discount && (
                        <p className="mt-0.5 text-theme-xs text-success-600 dark:text-success-500">
                          −{formatMoney(item.discount.amount, currency)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totales */}
              <div className={`mt-4 flex flex-col gap-1.5 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.02] ${avgUnitTone ? "" : "pt-3"}`}>
                <TotalRow label="Subtotal" value={formatMoney(order.totals.subtotal, currency)} />
                {order.totals.discounts.map(discount => (
                  <TotalRow
                    key={discount.label}
                    label={discount.label}
                    value={`−${formatMoney(discount.amount, currency)}`}
                    tone="success"
                  />
                ))}
                {order.totals.charges.map(charge => (
                  <TotalRow
                    key={charge.label}
                    label={charge.label}
                    value={formatMoney(charge.amount, currency)}
                  />
                ))}
                <div className="mt-1.5 flex items-center justify-between border-t border-gray-200 pt-2.5 dark:border-gray-700">
                  <span className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">Total</span>
                  <span className="text-theme-sm font-bold text-secondary-600 dark:text-white">
                    {formatMoney(order.totals.total, currency)}
                  </span>
                </div>
              </div>
            </Section>

            {/* Requester (§14) — sólo esta orden, sin CRM. */}
            <Section title="Solicitante" anchor="requester">
              <div className="flex flex-col gap-2.5">
                <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {order.requester.name}
                </p>
                {order.requester.phone && (
                  <InfoLine icon={<Phone className="h-3.5 w-3.5" />} value={order.requester.phone} />
                )}
                {order.requester.email && (
                  <InfoLine icon={<MessageSquare className="h-3.5 w-3.5" />} value={order.requester.email} />
                )}
                {order.requester.note && (
                  <InfoLine icon={<MapPin className="h-3.5 w-3.5" />} value={order.requester.note} />
                )}
                {!order.requester.phone && !order.requester.email && !order.requester.note && (
                  <p className="text-theme-xs text-gray-400 dark:text-gray-500">
                    Sin datos de contacto adicionales en esta orden.
                  </p>
                )}
              </div>
            </Section>

            {/* Entrega (§14) */}
            <Section title="Entrega" anchor="fulfillment">
              <div className="flex flex-col gap-2.5">
                <InfoLine
                  icon={<ModeIcon className="h-3.5 w-3.5" />}
                  value={FULFILLMENT_MODE_LABELS[order.fulfillment.mode]}
                />
                {order.fulfillment.address && (
                  <InfoLine icon={<MapPin className="h-3.5 w-3.5" />} value={order.fulfillment.address} />
                )}
                {order.fulfillment.locationRef && (
                  <InfoLine icon={<Store className="h-3.5 w-3.5" />} value={order.fulfillment.locationRef} />
                )}
                {order.fulfillment.promisedAt && (
                  <InfoLine
                    icon={<CalendarClock className="h-3.5 w-3.5" />}
                    value={`Comprometida para ${formatOrderDate(order.fulfillment.promisedAt)}`}
                  />
                )}
                {order.fulfillment.note && (
                  <p className="rounded-lg bg-gray-50 p-3 text-theme-xs text-gray-600 dark:bg-white/[0.02] dark:text-gray-300">
                    {order.fulfillment.note}
                  </p>
                )}
              </div>
            </Section>

            {/* Pago (§14) — estado de la orden, no sistema financiero. */}
            {order.payment && (
              <Section title="Pago" anchor="payment" icon={<CreditCard className="h-4 w-4" />}>
                <div className="flex flex-wrap items-center gap-3">
                  {/* ⚠️ El ancla va en un `<span>` nativo que envuelve al `Badge`
                      —el catálogo no reenvía props nativas—, para que el estado del
                      pago siga siendo legible por `data-payment-status`. */}
                  <span data-payment-status={order.payment.status} className="inline-flex">
                    <Badge
                      color={PAYMENT_STATUS_TO_BADGE[order.payment.status] ?? "light"}
                      size="sm"
                      className="px-2.5 py-1"
                    >
                      {PAYMENT_STATUS_LABELS[order.payment.status] ?? order.payment.status}
                    </Badge>
                  </span>
                  {order.payment.method && (
                    <span className="text-theme-sm text-gray-600 dark:text-gray-300">
                      {order.payment.method}
                    </span>
                  )}
                  {order.payment.amount !== undefined && (
                    <span className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {formatMoney(order.payment.amount, currency)}
                    </span>
                  )}
                </div>
                {order.payment.reference && (
                  <p className="mt-2 text-theme-xs text-gray-400 dark:text-gray-500">
                    Referencia {order.payment.reference}
                  </p>
                )}
              </Section>
            )}

            {/* Observaciones de la orden */}
            {order.notes && (
              <Section title="Observaciones" anchor="notes">
                <p className="rounded-lg bg-gray-50 p-3 text-theme-sm text-gray-600 dark:bg-white/[0.02] dark:text-gray-300">
                  {order.notes}
                </p>
              </Section>
            )}

            {/* Historial (§10) */}
            <Section title="Historial" anchor="history">
              <OrderTimeline order={order} thresholdMinutes={settings.stagnationMinutes} />
            </Section>
          </div>
        </div>

        {/* ── Pie: acciones derivadas del estado (§14) ─────────────────────── */}
        <footer className="flex-none border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          {pendingReasonAction ? (
            /* Paso de motivo: cancelar y devolver exigen explicación (§9). */
            <div data-order-reason-form className="flex flex-col gap-3">
              <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-200">
                {pendingReasonAction.reasonLabel}
              </p>
              <Textarea
                value={reason}
                // ⚠️ `Textarea` del DS recibe `onChange(value: string)`, NO el
                // evento (al revés que `Input`): `(e) => setReason(e.target.value)`
                // guardaría `undefined` en silencio y compilaría.
                onChange={value => setReason(value)}
                placeholder="Explica el motivo para que quede en el historial"
                rows={3}
              />
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPendingReasonAction(null)}>
                  Volver
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={confirmReason}
                  title={reason.trim() ? undefined : "El motivo es obligatorio"}
                >
                  Confirmar {pendingReasonAction.label.toLowerCase()}
                </Button>
              </div>
            </div>
          ) : actions.length > 0 ? (
            /* ⚠️ **Un botón por acción, con su consecuencia escrita debajo.**
               Antes eran botones en fila que sólo decían el verbo, y el operador
               no podía saber si "Marcar como entregada" enviaba la orden o la
               daba por recibida (§27). Ahora cada acción lleva su frase, y las que
               usan transporte se distinguen además por el icono. */
            <div className="flex flex-col gap-2.5">
              <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                ¿Qué hago con esta orden?
              </p>
              <div className="flex flex-col gap-2">
                {actions.map(action => {
                  const isDestructive = action.tone === "destructive";
                  const ActionIcon = ACTION_ICONS[action.to] ?? ArrowRight;
                  return (
                    // ⚠️ El ancla va en un `<span>` **nativo**, no en el `Button`:
                    // los componentes del DS no reenvían props nativas (sólo
                    // `title`), así que un `data-order-action` en el `Button`
                    // desaparecería del DOM en silencio y la guarda no podría
                    // comprobar qué acciones se ofrecen (§14: se derivan del estado,
                    // no se declaran a mano).
                    <span
                      key={action.to}
                      data-order-action={action.to}
                      className="contents"
                    >
                      <button
                        type="button"
                        onClick={() => runAction(action)}
                        data-order-action-button={action.to}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                          isDestructive
                            ? "border-gray-200 hover:border-error-300 hover:bg-error-50/50 dark:border-gray-700 dark:hover:border-error-500/40 dark:hover:bg-error-500/5"
                            : "border-gray-200 hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/5"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${
                            isDestructive
                              ? "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
                              : "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
                          }`}
                        >
                          <ActionIcon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-theme-sm font-semibold ${
                              isDestructive
                                ? "text-error-600 dark:text-error-500"
                                : "text-gray-800 dark:text-white/90"
                            }`}
                          >
                            {action.label}
                          </span>
                          {action.consequence && (
                            <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
                              {action.consequence}
                            </span>
                          )}
                        </span>
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div data-order-closed-note className="flex flex-col items-center gap-1">
              <p className="text-theme-sm font-medium text-gray-600 dark:text-gray-300">
                {ORDER_STATUS_LABELS[order.status]}
              </p>
              <p className="text-center text-theme-xs text-gray-400 dark:text-gray-500">
                Esta orden está cerrada. No admite más cambios de estado.
              </p>
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}

/* ── Piezas internas ───────────────────────────────────────────────────────── */

function SummaryCell({
  label,
  value,
  icon,
  emphasis,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-white/[0.02]">
      <p className="text-theme-xs font-medium text-gray-400 dark:text-gray-500">{label}</p>
      <p
        className={`mt-0.5 flex items-center gap-1 truncate text-theme-sm font-medium ${
          emphasis ? "font-semibold text-secondary-600 dark:text-white" : "text-gray-800 dark:text-white/90"
        }`}
      >
        {icon}
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  icon,
  anchor,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  /** Identificador estable de la sección, para las guardas. */
  anchor: string;
  children: React.ReactNode;
}) {
  return (
    <section data-detail-section={anchor} className="flex flex-col gap-3">
      {/* Tipografía acordada del proyecto: título de grupo `text-theme-sm
          font-semibold`; nada de `uppercase tracking-wider`. */}
      <h3 className="flex items-center gap-1.5 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <p className="flex items-center gap-2 text-theme-sm text-gray-600 dark:text-gray-300">
      <span className="text-gray-400 dark:text-gray-500">{icon}</span>
      {value}
    </p>
  );
}

function TotalRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className={`text-theme-xs font-medium ${
          tone === "success"
            ? "text-success-600 dark:text-success-500"
            : "text-gray-700 dark:text-gray-200"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default OrderDetailDrawer;
