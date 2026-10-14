/**
 * SubscriptionPlansPage — "Suscripciones": choose a plan and subscribe.
 *
 * Rendered inside the AppShell (see `src/app/App.tsx`, route
 * "/app/suscripciones"). Shows a mock catalog of plans (1–4 Necto services with
 * increasing monthly prices). Picking a plan opens a short checkout (name +
 * email) that calls the backend (`POST /api/subscriptions`), which runs PayZen's
 * token-with-payment flow: it charges + tokenizes the first month and then bills
 * the recurring charge via zero-click. On success it shows a confirmation with
 * the first-payment status and the created subscription id.
 *
 * Composed from Webi.AI Elements: Card, Badge, Button, Form, Label, Input — plus
 * Tailwind for the plan grid.
 *
 * Related files:
 * - services/subscriptions.ts — PLANS catalog + createSubscription()
 * - app/App.tsx — route registration; app/AppSidebar.tsx — nav entry
 */
import { useState } from "react";
import { Link } from "react-router";
import BasePageLayout from "@/layouts/base-page/BasePageLayout";
import BasePageHeader from "@/layouts/base-page/BasePageHeader";
import { PageMeta } from "@/shell/meta";
import { Form } from "@/elements/form/form";
import { Label } from "@/elements/form/label";
import { Input } from "@/elements/form/input";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { CheckLineIcon, CheckCircleIcon, DollarLineIcon, ListIcon } from "@/icons";
import {
  PLANS,
  BILLING_CYCLES,
  SUBSCRIPTION_CURRENCY,
  createSubscription,
  requestSubscriptionFormToken,
  confirmSubscription,
  amountForCycle,
  toSmallestUnit,
  formatAmount,
  type Plan,
  type Subscription,
  type SubscriptionFormToken,
  type CreateSubscriptionRequest,
  type BillingCycleOption,
} from "@/services/subscriptions";
import { KryptonForm, type KryptonPaymentResult } from "@/components/KryptonForm";

/** Formats a per-cycle amount + suffix, e.g. "R$49.90/mes" or "R$499.00/año". */
function formatCyclePrice(major: number, suffix: string): string {
  return `R$${major.toFixed(2)}${suffix}`;
}

export const SubscriptionPlansPage = () => {
  // ─── Selection + checkout state ───────────────────────────────────────────
  const [selected, setSelected] = useState<Plan | null>(null);
  const [cycle, setCycle] = useState<BillingCycleOption>(BILLING_CYCLES[0]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // ─── Flow state ───────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<{ subscription: Subscription; firstPaymentPaid: boolean } | null>(null);
  // When set, the embedded PayZen card form is shown (LIVE flow).
  const [formToken, setFormToken] = useState<SubscriptionFormToken | null>(null);

  /** Builds the request payload from the selected plan, cycle and buyer fields. */
  function buildRequest(plan: Plan): CreateSubscriptionRequest {
    return {
      // Amount charged per cycle (monthly price × cycle, minus any discount).
      amount: toSmallestUnit(amountForCycle(plan.monthlyPrice, cycle)),
      currency: SUBSCRIPTION_CURRENCY,
      planName: plan.name,
      serviceCount: plan.serviceCount,
      billingCycle: cycle.id,
      orderId: `necto-sub-${plan.id}-${cycle.id}-${Date.now()}`,
      customerName: customerName || undefined,
      customerEmail: customerEmail || undefined,
      locale: "es_ES",
    };
  }

  /** Selects a plan and opens its checkout (clears any prior result/error/form). */
  function handleSelect(plan: Plan) {
    setSelected(plan);
    setResult(null);
    setError(undefined);
    setFormToken(null);
  }

  /**
   * Starts the checkout for the selected plan.
   *
   * Tries the LIVE embedded-form flow first (request a formToken). If the backend
   * has no embedded-form credentials configured, it falls back to the MOCK flow
   * (createSubscription) so the demo still works end-to-end.
   */
  async function handleSubscribe() {
    if (!selected) return;
    setError(undefined);
    setSubmitting(true);
    try {
      // Try LIVE: ask the backend for an embedded-form token.
      const token = await requestSubscriptionFormToken(buildRequest(selected));
      setFormToken(token);
    } catch (liveErr) {
      // Fallback to MOCK when the live form can't start (e.g. no credentials).
      try {
        const res = await createSubscription(buildRequest(selected));
        setResult({
          subscription: res.answer,
          firstPaymentPaid: res.firstPaymentStatus === "PAID",
        });
      } catch (mockErr) {
        const message =
          mockErr instanceof Error ? mockErr.message
          : liveErr instanceof Error ? liveErr.message
          : "No se pudo crear la suscripción.";
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Called by the embedded form when the buyer pays: confirms the subscription
   * on the backend (validates the signature, creates + persists the recurrence).
   */
  async function handlePaid(payment: KryptonPaymentResult) {
    if (!selected) return;
    setError(undefined);
    setSubmitting(true);
    try {
      const res = await confirmSubscription({
        ...buildRequest(selected),
        krAnswer: payment.krAnswer,
        krHash: payment.krHash,
      });
      setFormToken(null);
      setResult({
        subscription: res.answer,
        firstPaymentPaid: res.firstPaymentStatus === "PAID",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo confirmar la suscripción.");
    } finally {
      setSubmitting(false);
    }
  }

  /** Resets the flow to pick another plan. */
  function handleReset() {
    setResult(null);
    setSelected(null);
    setCustomerName("");
    setCustomerEmail("");
    setFormToken(null);
  }

  return (
    <>
      <PageMeta title="Suscripciones" description="Elige un plan y suscríbete a Necto" />
      <BasePageLayout
        header={
          <BasePageHeader
            title="Planes de suscripción"
            breadcrumbItems={[{ label: "Inicio", href: "/" }, { label: "Suscripciones" }]}
          />
        }
      >
        {/* ── Success confirmation ─────────────────────────────────────────── */}
        {result ? (
          <Card className="mx-auto max-w-xl">
            <div className="flex flex-col items-center text-center">
              <span className="grid size-14 place-items-center rounded-full bg-success-50 text-success-500">
                <CheckCircleIcon />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-gray-800">¡Suscripción activada!</h3>
              <p className="mt-1 text-sm text-gray-500">
                {result.firstPaymentPaid
                  ? "El primer cobro se realizó correctamente."
                  : "El primer cobro quedó en proceso."}
              </p>
            </div>

            <dl className="mt-6 space-y-2 text-sm">
              {result.subscription.planName && (
                <Row label="Plan" value={result.subscription.planName} />
              )}
              <Row
                label="Cuota por cobro"
                value={formatAmount(result.subscription.amount, result.subscription.currency)}
              />
              {result.subscription.billingCycle && (
                <Row label="Ciclo" value={result.subscription.billingCycle} />
              )}
              <Row label="Estado" value={result.subscription.status} />
              <Row label="ID de suscripción" value={result.subscription.subscriptionId} mono />
              <Row label="Recurrencia" value={result.subscription.rrule} mono />
            </dl>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link to="/app/suscripciones/listado" className="flex-1">
                <Button variant="outline" className="w-full" startIcon={<ListIcon />}>
                  Ver mis suscripciones
                </Button>
              </Link>
              <Button className="flex-1" onClick={handleReset}>
                Elegir otro plan
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Toolbar: billing-cycle switch + quick link to the list */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              {/* Billing-cycle switch — a product choice sent per request */}
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                {BILLING_CYCLES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCycle(c)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      cycle.id === c.id
                        ? "bg-white text-brand-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <Link to="/app/suscripciones/listado">
                <Button variant="outline" startIcon={<ListIcon />}>
                  Ver mis suscripciones
                </Button>
              </Link>
            </div>

            {/* ── Plan grid ──────────────────────────────────────────────── */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {PLANS.map((plan) => {
                const isSelected = selected?.id === plan.id;
                return (
                  <Card
                    key={plan.id}
                    className={`flex flex-col ${
                      isSelected ? "ring-2 ring-brand-500" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid size-10 place-items-center rounded-lg bg-brand-50 text-brand-500">
                        <DollarLineIcon />
                      </span>
                      {plan.highlighted && <Badge color="info">Recomendado</Badge>}
                    </div>

                    <h3 className="mt-4 font-semibold text-gray-800">{plan.name}</h3>
                    <p className="mt-1 text-2xl font-extrabold text-gray-900">
                      {formatCyclePrice(amountForCycle(plan.monthlyPrice, cycle), cycle.suffix)}
                    </p>
                    {cycle.discount > 0 && (
                      <p className="text-xs text-success-600">
                        {Math.round(cycle.discount * 12)} meses gratis vs. mensual
                      </p>
                    )}

                    <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-600">
                      {plan.services.map((service) => (
                        <li key={service} className="flex items-start gap-2">
                          <span className="mt-0.5 text-success-500">
                            <CheckLineIcon />
                          </span>
                          <span>{service}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      variant={isSelected ? "primary" : "outline"}
                      className="mt-5 w-full"
                      onClick={() => handleSelect(plan)}
                    >
                      {isSelected ? "Seleccionado" : "Elegir plan"}
                    </Button>
                  </Card>
                );
              })}
            </div>

            {/* ── Checkout for the selected plan ─────────────────────────── */}
            {selected && (
              <Card className="mt-6 mx-auto max-w-xl">
                <div className="mb-5 flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-lg bg-brand-50 text-brand-500">
                    <DollarLineIcon />
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Suscribirse a {selected.name} · {cycle.label}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatCyclePrice(amountForCycle(selected.monthlyPrice, cycle), cycle.suffix)} · se cobra al confirmar y se renueva {cycle.suffix.replace("/", "cada ")}.
                    </p>
                  </div>
                </div>

                {formToken ? (
                  // LIVE: the embedded PayZen card form. The buyer pays here and
                  // handlePaid confirms the subscription on the backend.
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Ingresa los datos de tu tarjeta para pagar el primer mes y activar la suscripción.
                    </p>
                    <KryptonForm
                      formToken={formToken.formToken}
                      publicKey={formToken.publicKey}
                      jsEndpoint={formToken.jsEndpoint}
                      onPaid={handlePaid}
                      onError={(m) => setError(m)}
                    />
                    {error && <p className="text-sm text-error-600">{error}</p>}
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setFormToken(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Form onSubmit={handleSubscribe} className="space-y-4">
                    <div>
                      <Label htmlFor="customerName">Nombre (opcional)</Label>
                      <Input
                        id="customerName"
                        placeholder="Ej. Ana Torres"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerEmail">Correo (opcional)</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        placeholder="ana@example.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                      />
                    </div>

                    {error && <p className="text-sm text-error-600">{error}</p>}

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="submit" size="lg" loading={submitting} className="flex-1">
                        {submitting
                          ? "Procesando..."
                          : `Pagar y suscribirme (${formatCyclePrice(amountForCycle(selected.monthlyPrice, cycle), cycle.suffix)})`}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="sm:w-auto"
                        onClick={() => setSelected(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </Form>
                )}
              </Card>
            )}
          </>
        )}
      </BasePageLayout>
    </>
  );
};

/** A label/value row in the confirmation summary. */
function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`text-right font-medium text-gray-800 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

export default SubscriptionPlansPage;
