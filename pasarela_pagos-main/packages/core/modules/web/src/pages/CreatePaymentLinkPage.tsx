/**
 * CreatePaymentLinkPage — Create a PayZen payment order (payment link).
 *
 * Rendered inside the AppShell (see `src/app/App.tsx`). The merchant fills in the
 * amount, currency, reference and buyer details, picks a delivery channel, and
 * generates a real PayZen payment order via the backend (`/api/payment-orders`).
 *
 * Two delivery channels:
 *  - "URL": PayZen returns the link; Necto delivers it via a wa.me deep link
 *    (the "Enviar por WhatsApp" button opens WhatsApp with the message prefilled).
 *  - "WHATSAPP": PayZen delivers the link natively to the buyer's WhatsApp. This
 *    is served by a WhatsApp-enabled demo shop that operates in BRL, so the
 *    currency is fixed to BRL when this channel is selected.
 *
 * Composed from Webi.AI Elements: Form, Label, Input, Select, PhoneInput, Button,
 * Card, Badge.
 */
import { useState } from "react";
import { Link } from "react-router";
import BasePageLayout from "@/layouts/base-page/BasePageLayout";
import BasePageHeader from "@/layouts/base-page/BasePageHeader";
import { PageMeta } from "@/shell/meta";
import { Form } from "@/elements/form/form";
import { Label } from "@/elements/form/label";
import { Input } from "@/elements/form/input";
import { Select } from "@/elements/form/select";
import { PhoneInput } from "@/elements/form/phone-input";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { CopyIcon, CheckLineIcon, PaperPlaneIcon, DollarLineIcon, ListIcon } from "@/icons";
import {
  createPaymentOrder,
  getPaymentOrder,
  toSmallestUnit,
  buildWhatsAppLink,
  type PaymentOrder,
  type PaymentOrderChannelType,
  type PaymentOrderStatus,
} from "@/services/payment-order";

/** Maps a payment-order status to a badge color + human label. */
const STATUS_META: Record<PaymentOrderStatus, { color: "success" | "warning" | "error" | "info"; label: string }> = {
  RUNNING: { color: "warning", label: "Pendiente de pago" },
  PAID: { color: "success", label: "Pagado" },
  PARTIALLY_PAID: { color: "info", label: "Pago parcial" },
  EXPIRED: { color: "error", label: "Expirado" },
  CANCELLED: { color: "error", label: "Cancelado" },
};

/** Delivery-channel options offered to the merchant. */
const CHANNEL_OPTIONS = [
  { value: "URL", label: "URL — yo envío el enlace (WhatsApp/otros)" },
  { value: "WHATSAPP", label: "WhatsApp — lo envía PayZen" },
];

// The PayZen LATAM demo shop (used for both channels) operates in BRL only.
const CURRENCY_OPTIONS = [{ value: "BRL", label: "BRL — Real brasileño" }];

/** Country dial codes for the WhatsApp phone selector. */
const COUNTRY_CODES = [
  { code: "CO", label: "+57" },
  { code: "PE", label: "+51" },
  { code: "CL", label: "+56" },
  { code: "MX", label: "+52" },
  { code: "BR", label: "+55" },
  { code: "US", label: "+1" },
  { code: "ES", label: "+34" },
];

/** Formats an integer smallest-unit amount back to a display string (e.g. 30050 → "300.50"). */
function formatAmount(amountSmallestUnit: number, currency: string): string {
  return `${(amountSmallestUnit / 100).toFixed(2)} ${currency}`;
}

export const CreatePaymentLinkPage = () => {
  // ─── Form state ─────────────────────────────────────────────────────────
  const [channel, setChannel] = useState<PaymentOrderChannelType>("URL");
  const [amount, setAmount] = useState("");
  // Demo shop only supports BRL (both channels use the same PayZen LATAM shop).
  const currency = "BRL";
  const [orderId, setOrderId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("+57");

  // ─── Flow state ─────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [amountError, setAmountError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [copied, setCopied] = useState(false);

  // ─── Status-check state ───────────────────────────────────────────────────
  const [lookupId, setLookupId] = useState("");
  const [checking, setChecking] = useState(false);
  const [lookupError, setLookupError] = useState<string | undefined>();
  const [lookupOrder, setLookupOrder] = useState<PaymentOrder | null>(null);

  // Whether the order was delivered by PayZen natively (WhatsApp channel).
  const isWhatsappChannel = channel === "WHATSAPP";

  /** Switches the delivery channel. */
  function handleChannelChange(next: string) {
    setChannel(next as PaymentOrderChannelType);
  }

  /** Validates and submits the form, calling the backend payment-order service. */
  async function handleSubmit() {
    setSubmitError(undefined);

    // 1. Validate the amount — must be a positive number
    const smallest = toSmallestUnit(amount);
    if (Number.isNaN(smallest) || smallest <= 0) {
      setAmountError("Ingresa un monto válido mayor a 0.");
      return;
    }
    setAmountError(undefined);

    // 2. Call the backend with the chosen channel. For WHATSAPP, PayZen delivers
    //    the link natively; for URL, Necto delivers it via wa.me.
    setSubmitting(true);
    try {
      const res = await createPaymentOrder({
        amount: smallest,
        currency,
        orderId: orderId || undefined,
        phoneNumber: phone,
        customerName: customerName || undefined,
        channel,
        locale: "es_ES",
      });
      // 3. Store the generated payment order to render the result panel
      setOrder(res.answer);
      setCopied(false);
    } catch (err) {
      // Surface backend/PayZen errors (e.g. unsupported currency, feature off)
      setSubmitError(err instanceof Error ? err.message : "No se pudo crear el enlace.");
    } finally {
      setSubmitting(false);
    }
  }

  /** Copies the payment link to the clipboard. */
  async function handleCopy() {
    if (!order) return;
    await navigator.clipboard.writeText(order.paymentURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /** Opens WhatsApp with a prefilled message containing the payment link. */
  function handleSendWhatsApp() {
    if (!order) return;
    const amountText = formatAmount(order.amount, order.currency);
    const message =
      `Hola${customerName ? ` ${customerName}` : ""}, aquí está tu enlace de pago Necto ` +
      `por ${amountText}${order.orderId ? ` (ref. ${order.orderId})` : ""}: ${order.paymentURL}`;
    window.open(buildWhatsAppLink(phone, message), "_blank", "noopener,noreferrer");
  }

  /** Resets the flow to create another link. */
  function handleReset() {
    setOrder(null);
    setAmount("");
    setOrderId("");
    setCustomerName("");
  }

  /** Looks up the current status of a payment order by its id. */
  async function handleCheckStatus() {
    const id = lookupId.trim();
    if (!id) {
      setLookupError("Ingresa el ID de la orden.");
      return;
    }
    setLookupError(undefined);
    setChecking(true);
    try {
      const result = await getPaymentOrder(id);
      setLookupOrder(result);
    } catch (err) {
      setLookupOrder(null);
      setLookupError(err instanceof Error ? err.message : "No se pudo consultar la orden.");
    } finally {
      setChecking(false);
    }
  }

  /** Pre-fills the status lookup with a just-created order id and checks it. */
  function handleCheckThisOrder() {
    if (!order) return;
    setLookupId(order.paymentOrderId);
    setLookupError(undefined);
    setChecking(true);
    getPaymentOrder(order.paymentOrderId)
      .then((r) => setLookupOrder(r))
      .catch((err) => {
        setLookupOrder(null);
        setLookupError(err instanceof Error ? err.message : "No se pudo consultar la orden.");
      })
      .finally(() => setChecking(false));
  }

  return (
    <>
      <PageMeta title="Crear enlace de pago" description="Genera un enlace de pago y envíalo por WhatsApp" />
      <BasePageLayout
        header={
          <BasePageHeader
            title="Crear enlace de pago"
            breadcrumbItems={[{ label: "Inicio", href: "/" }, { label: "Enlaces de pago" }]}
          />
        }
      >
        {/* Quick link to the list of active payment links */}
        <div className="mb-4 flex justify-end">
          <Link to="/app/enlaces/listado">
            <Button variant="outline" startIcon={<ListIcon />}>
              Ver enlaces activos
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* ── Form column ─────────────────────────────────────────────── */}
          <div className="lg:col-span-3">
            <Card>
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-brand-50 text-brand-500">
                  <DollarLineIcon />
                </span>
                <div>
                  <h3 className="font-semibold text-gray-800">Datos del cobro</h3>
                  <p className="text-sm text-gray-500">Completa los datos para generar el enlace.</p>
                </div>
              </div>

              <Form onSubmit={handleSubmit} className="space-y-4">
                {/* Delivery channel */}
                <div>
                  <Label htmlFor="channel">Canal de envío</Label>
                  <Select
                    options={CHANNEL_OPTIONS}
                    defaultValue={channel}
                    onChange={handleChannelChange}
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    {isWhatsappChannel
                      ? "PayZen enviará el enlace directamente al WhatsApp del cliente."
                      : "PayZen genera el enlace y tú lo compartes (WhatsApp u otros canales)."}
                  </p>
                </div>

                {/* Amount + currency */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="amount">Monto</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step={0.01}
                      placeholder="0.00"
                      value={amount}
                      error={!!amountError}
                      hint={amountError}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Moneda</Label>
                    <Select
                      options={CURRENCY_OPTIONS}
                      defaultValue={currency}
                      disabled
                      onChange={() => {}}
                    />
                  </div>
                </div>

                {/* Order reference */}
                <div>
                  <Label htmlFor="orderId">Referencia (opcional)</Label>
                  <Input
                    id="orderId"
                    placeholder="Ej. FACT-2025-0042"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                  />
                </div>

                {/* Customer name */}
                <div>
                  <Label htmlFor="customerName">Nombre del cliente (opcional)</Label>
                  <Input
                    id="customerName"
                    placeholder="Ej. Ana Torres"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                {/* WhatsApp phone */}
                <div>
                  <Label>Número de WhatsApp{isWhatsappChannel ? "" : " (opcional)"}</Label>
                  <PhoneInput
                    countries={COUNTRY_CODES}
                    onChange={setPhone}
                    placeholder="302 664 3546"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    {isWhatsappChannel
                      ? "PayZen enviará el enlace a este número."
                      : "Se usará para compartir el enlace por WhatsApp desde aquí."}
                  </p>
                </div>

                {submitError && (
                  <p className="text-sm text-error-600">{submitError}</p>
                )}

                <Button type="submit" size="lg" loading={submitting} className="w-full sm:w-auto">
                  {submitting ? "Generando..." : "Generar enlace de pago"}
                </Button>
              </Form>
            </Card>
          </div>

          {/* ── Result column ───────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            {order ? (
              <Card>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Enlace generado</h3>
                  <Badge color="success" startIcon={<CheckLineIcon />}>{order.status}</Badge>
                </div>

                {/* Summary */}
                <dl className="mt-4 space-y-2 text-sm">
                  <Row label="Monto" value={formatAmount(order.amount, order.currency)} />
                  {order.orderId && <Row label="Referencia" value={order.orderId} />}
                  <Row label="ID de orden" value={order.paymentOrderId} mono />
                  <Row label="Vence" value={new Date(order.expirationDate ?? "").toLocaleString()} />
                </dl>

                {/* Payment link */}
                <div className="mt-4">
                  <Label>Enlace de pago</Label>
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                    <span className="flex-1 truncate text-sm text-brand-600">{order.paymentURL}</span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="shrink-0 text-gray-500 hover:text-brand-500"
                      aria-label="Copiar enlace"
                    >
                      {copied ? <CheckLineIcon /> : <CopyIcon />}
                    </button>
                  </div>
                  {copied && <p className="mt-1.5 text-xs text-success-600">¡Enlace copiado!</p>}
                </div>

                {/* Actions */}
                <div className="mt-5 space-y-2">
                  {order.channelType === "WHATSAPP" ? (
                    // PayZen already delivered the link to the buyer's WhatsApp.
                    <div className="flex items-start gap-2 rounded-lg bg-success-50 px-3 py-2.5 text-sm text-success-700">
                      <CheckLineIcon />
                      <span>PayZen envió el enlace por WhatsApp al {phone}.</span>
                    </div>
                  ) : (
                    // URL channel: Necto delivers the link via a wa.me deep link.
                    <Button
                      size="lg"
                      startIcon={<PaperPlaneIcon />}
                      className="w-full bg-success-500 hover:bg-success-600"
                      onClick={handleSendWhatsApp}
                    >
                      Enviar por WhatsApp
                    </Button>
                  )}
                  <Button variant="outline" className="w-full" onClick={handleCheckThisOrder} loading={checking}>
                    Ver estado del pago
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={handleReset}>
                    Crear otro enlace
                  </Button>
                </div>
              </Card>
            ) : (
              // Empty state before a link is generated
              <Card className="flex h-full flex-col items-center justify-center text-center">
                <span className="grid size-14 place-items-center rounded-full bg-gray-100 text-gray-400">
                  <PaperPlaneIcon />
                </span>
                <h3 className="mt-4 font-semibold text-gray-800">Aún no hay enlace</h3>
                <p className="mt-1 max-w-xs text-sm text-gray-500">
                  Completa el formulario y genera un enlace de pago para enviarlo por WhatsApp a tu cliente.
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* ── Status lookup ────────────────────────────────────────────── */}
        <div className="mt-6">
          <Card>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-brand-50 text-brand-500">
                <CheckLineIcon />
              </span>
              <div>
                <h3 className="font-semibold text-gray-800">Consultar estado de un pago</h3>
                <p className="text-sm text-gray-500">Pega el ID de la orden para ver si ya pagaron.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex-1">
                <Input
                  id="lookupId"
                  placeholder="ID de orden (ej. cd605143719944a6b587465529eb2138)"
                  value={lookupId}
                  error={!!lookupError}
                  hint={lookupError}
                  onChange={(e) => setLookupId(e.target.value)}
                />
              </div>
              <Button size="lg" onClick={handleCheckStatus} loading={checking} className="sm:w-auto">
                Consultar
              </Button>
            </div>

            {lookupOrder && (
              <div className="mt-5 rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">Estado de la orden</span>
                  <Badge color={STATUS_META[lookupOrder.status].color}>
                    {STATUS_META[lookupOrder.status].label}
                  </Badge>
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  <Row label="Monto" value={formatAmount(lookupOrder.amount, lookupOrder.currency)} />
                  {lookupOrder.orderId && <Row label="Referencia" value={lookupOrder.orderId} />}
                  <Row label="ID de orden" value={lookupOrder.paymentOrderId} mono />
                  <Row label="Vence" value={new Date(lookupOrder.expirationDate ?? "").toLocaleString()} />
                </dl>
              </div>
            )}
          </Card>
        </div>
      </BasePageLayout>
    </>
  );
};

/** A label/value row in the generated-order summary. */
function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`text-right font-medium text-gray-800 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

export default CreatePaymentLinkPage;
