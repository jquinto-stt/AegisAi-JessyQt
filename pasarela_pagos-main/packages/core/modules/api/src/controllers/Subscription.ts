/**
 * Subscription — HTTP controller for Necto subscriptions (token with payment).
 *
 * Endpoints (consumed by the web module's plans/checkout page):
 *  - POST /subscriptions  — buy a plan: charge + tokenize the first month, then
 *    create the recurring subscription, then persist it.
 *  - GET  /subscriptions  — list persisted subscriptions.
 *
 * Two flows are supported:
 *  A) MOCK (POST /subscriptions): fabricates the token-with-payment + subscription
 *     server-side (no real card). Used when PAYZEN_SUBSCRIPTIONS_MODE=mock.
 *  B) LIVE embedded form (Krypton), two calls from the browser:
 *     1. POST /subscriptions/form-token → `Charge/CreatePayment` REGISTER_PAY
 *        returns a `formToken`; the browser renders PayZen's card form with it.
 *     2. POST /subscriptions/confirm → after the buyer pays, the browser posts
 *        back { krAnswer, krHash }. The backend validates the HMAC signature,
 *        extracts the card alias, creates the recurring subscription (zero-click)
 *        and persists it.
 * The result is persisted via `SubscriptionRepository` (DynamoDB).
 *
 * Credentials never touch the browser: the PayZen client runs here, in the backend.
 *
 * Related files:
 * - endpoints.ts — $CreateSubscription / $ListSubscriptions / $SubscriptionFormToken / $ConfirmSubscription
 * - services/payzen/client.ts — createTokenWithPayment + createSubscription + form-token/verify/extract
 * - services/payzen/types.ts — request/response types
 * - services/SubscriptionRepository.ts — DynamoDB persistence (save/list)
 */
import { Endpoint, HttpResponseOK, HttpResponseCreated, HttpResponseBadRequest, HttpResponseInternalServerError } from '@webiai/sdk.http';
import type { Context } from '@webiai/sdk.http';
import { dependency } from '@webiai/sdk.ioc';
import { Logger } from '@webiai/sdk.core';
import EP from '../endpoints.js';
import { PayZenClient, PayZenApiError } from '../services/payzen/client.js';
import { SubscriptionRepository, type StoredSubscription } from '../services/SubscriptionRepository.js';

/** Shape of the JSON the frontend sends to buy a subscription plan. */
interface CreateSubscriptionBody {
  /** Monthly amount in the smallest currency unit (30050 = 300.50). */
  amount?: number;
  /** ISO 4217 currency code (e.g. "BRL"). */
  currency?: string;
  /** Human label of the chosen plan (e.g. "Plan 3 servicios"). */
  planName?: string;
  /** Number of Necto services in the chosen plan (1–4). */
  serviceCount?: number;
  /** Merchant reference. */
  orderId?: string;
  /** Buyer display name. */
  customerName?: string;
  /** Buyer email (recommended for tokenization). */
  customerEmail?: string;
  /** Billing cycle chosen on the frontend: "monthly" | "yearly" | "daily". */
  billingCycle?: BillingCycle;
  /** Locale for the payment pages, e.g. "es_ES". */
  locale?: string;
}

/**
 * Builds the subscription's first-charge date for PayZen `Charge/CreateSubscription`.
 *
 * Returns an ISO-8601 timestamp `daysFromNow` days in the future (default today),
 * with an explicit "+00:00" offset — PayZen's CreateSubscription rejects the "Z"
 * suffix (INT_069) but accepts the numeric offset. PayZen schedules the recurring
 * charges from this effectDate per the rrule.
 */
function effectDateIso(daysFromNow = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  d.setUTCHours(0, 0, 0, 0);
  // Replace the trailing "Z" with "+00:00" (PayZen requires the numeric offset).
  return d.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

/** Billing cycle chosen by the buyer on the frontend. */
type BillingCycle = 'monthly' | 'yearly' | 'daily';

/**
 * Maps the buyer's chosen billing cycle to a PayZen recurrence rule (rrule).
 *
 * The cycle is a product decision made on the frontend and sent in the request:
 *  - "monthly" → RRULE:FREQ=MONTHLY;COUNT=12 (12 monthly charges)
 *  - "yearly"  → RRULE:FREQ=YEARLY;COUNT=5   (yearly charge)
 *  - "daily"   → RRULE:FREQ=DAILY;COUNT=12   (demo: watch recurrence run fast)
 * Unknown values fall back to monthly.
 */
function rruleForCycle(cycle?: string): string {
  switch ((cycle ?? 'monthly').toLowerCase()) {
    case 'yearly':
      return 'RRULE:FREQ=YEARLY;COUNT=5';
    case 'daily':
      return 'RRULE:FREQ=DAILY;COUNT=12';
    case 'monthly':
    default:
      return 'RRULE:FREQ=MONTHLY;COUNT=12';
  }
}

class Subscription {
  private readonly payzen = new PayZenClient();
  private readonly logger = new Logger('Subscription');

  /** Injected DynamoDB repository that persists/lists created subscriptions. */
  @dependency(SubscriptionRepository)
  private readonly repository!: SubscriptionRepository;

  @Endpoint(EP.$CreateSubscription)
  async create(ctx: Context) {
    // 1. Read the JSON body sent by the frontend
    const body = (ctx.request.body ?? {}) as CreateSubscriptionBody;

    // 2. Validate the monthly amount — positive integer (smallest currency unit)
    if (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0) {
      return new HttpResponseBadRequest({
        error: 'amount debe ser un entero positivo en la menor unidad monetaria (ej. 4990 = 49.90).',
        code: 'INVALID_AMOUNT',
      });
    }

    // 3. Validate currency — required ISO 4217 code
    if (typeof body.currency !== 'string' || body.currency.length !== 3) {
      return new HttpResponseBadRequest({
        error: 'currency debe ser un código ISO 4217 de 3 letras (ej. "BRL").',
        code: 'INVALID_CURRENCY',
      });
    }

    const currency = body.currency;
    const locale = body.locale ?? 'es_ES';

    try {
      // 4. Step one: charge the first month AND tokenize the card (REGISTER_PAY).
      const token = await this.payzen.createTokenWithPayment({
        amount: body.amount,
        currency,
        orderId: body.orderId || undefined,
        customer: body.customerEmail ? { email: body.customerEmail } : undefined,
        locale,
      });

      // 5. Step two: create the monthly recurring subscription from the alias.
      //    Starts today (effectDate) and bills every month for 12 months.
      const subscription = await this.payzen.createSubscription({
        paymentMethodToken: token.paymentMethodToken,
        amount: body.amount,
        currency,
        effectDate: effectDateIso(),
        rrule: rruleForCycle(body.billingCycle),
        orderId: body.orderId || undefined,
      });

      // 6. Persist the subscription (best-effort; a storage hiccup must not fail
      //    an already-created subscription).
      let stored: StoredSubscription | undefined;
      try {
        stored = await this.repository.save(subscription, {
          planName: body.planName,
          serviceCount: body.serviceCount,
          billingCycle: body.billingCycle,
          customerName: body.customerName?.trim() || undefined,
          customerEmail: body.customerEmail?.trim() || undefined,
        });
      } catch (saveErr) {
        this.logger.error('No se pudo persistir la suscripción en DynamoDB', {
          subscriptionId: subscription.subscriptionId,
          error: saveErr instanceof Error ? saveErr : new Error(String(saveErr)),
        });
      }

      // 7. Return the created subscription (201) with the first-payment status.
      return new HttpResponseCreated({
        status: 'SUCCESS',
        answer: stored ?? subscription,
        firstPaymentStatus: token.firstPaymentStatus,
      });
    } catch (err) {
      // PayZen application-level errors (e.g. feature disabled, currency) → 400
      if (err instanceof PayZenApiError) {
        return new HttpResponseBadRequest({
          error: 'PayZen rechazó la solicitud de suscripción.',
          code: err.errorCode,
          detail: err.detail ?? err.message,
        });
      }
      // Misconfiguration or transport failure → 500
      const message = err instanceof Error ? err.message : 'Error desconocido';
      return new HttpResponseInternalServerError({
        error: 'No se pudo crear la suscripción.',
        code: 'PAYZEN_ERROR',
        detail: message,
      });
    }
  }

  /**
   * POST /subscriptions/form-token — creates a formToken for the embedded card
   * form (LIVE flow, step 1). Returns { formToken, publicKey, jsEndpoint } so the
   * browser can render PayZen's Krypton form and charge + tokenize the 1st month.
   */
  @Endpoint(EP.$SubscriptionFormToken)
  async formToken(ctx: Context) {
    const body = (ctx.request.body ?? {}) as CreateSubscriptionBody;

    // Validate amount + currency (same rules as create).
    if (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0) {
      return new HttpResponseBadRequest({
        error: 'amount debe ser un entero positivo en la menor unidad monetaria (ej. 4990 = 49.90).',
        code: 'INVALID_AMOUNT',
      });
    }
    if (typeof body.currency !== 'string' || body.currency.length !== 3) {
      return new HttpResponseBadRequest({
        error: 'currency debe ser un código ISO 4217 de 3 letras (ej. "BRL").',
        code: 'INVALID_CURRENCY',
      });
    }

    try {
      // Ask PayZen for a REGISTER_PAY form token (charge 1st month + tokenize).
      const form = await this.payzen.createSubscriptionFormToken({
        amount: body.amount,
        currency: body.currency,
        orderId: body.orderId || undefined,
        customer: body.customerEmail ? { email: body.customerEmail } : undefined,
        locale: body.locale ?? 'es_ES',
      });
      return new HttpResponseOK({ status: 'SUCCESS', answer: form });
    } catch (err) {
      if (err instanceof PayZenApiError) {
        return new HttpResponseBadRequest({
          error: 'PayZen rechazó la solicitud de formToken.',
          code: err.errorCode,
          detail: err.detail ?? err.message,
        });
      }
      const message = err instanceof Error ? err.message : 'Error desconocido';
      return new HttpResponseInternalServerError({
        error: 'No se pudo iniciar el pago de la suscripción.',
        code: 'PAYZEN_ERROR',
        detail: message,
      });
    }
  }

  /**
   * POST /subscriptions/confirm — confirms a subscription after the buyer paid
   * in the embedded form (LIVE flow, step 2).
   *
   * Validates the HMAC signature of the posted payment result, extracts the card
   * alias, creates the recurring subscription (zero-click) and persists it.
   */
  @Endpoint(EP.$ConfirmSubscription)
  async confirm(ctx: Context) {
    const body = (ctx.request.body ?? {}) as {
      krAnswer?: string;
      krHash?: string;
      amount?: number;
      currency?: string;
      planName?: string;
      serviceCount?: number;
      orderId?: string;
      customerName?: string;
      customerEmail?: string;
      billingCycle?: BillingCycle;
    };

    // 1. Require the payment result posted back by the embedded form.
    if (!body.krAnswer || !body.krHash) {
      return new HttpResponseBadRequest({
        error: 'Faltan krAnswer/krHash del formulario de pago.',
        code: 'MISSING_PAYMENT_RESULT',
      });
    }
    if (typeof body.amount !== 'number' || body.amount <= 0 || typeof body.currency !== 'string') {
      return new HttpResponseBadRequest({
        error: 'amount/currency inválidos.',
        code: 'INVALID_AMOUNT',
      });
    }

    try {
      // 2. Validate the HMAC signature when a key is configured — reject a
      //    forged/tampered result. In the demo shop the HMAC key may not be
      //    available; then we skip verification (TEST mode, no real money) and
      //    log it so it's not silently trusted in a real deployment.
      if (this.payzen.hasHmacKey) {
        if (!this.payzen.verifyPaymentSignature(body.krAnswer, body.krHash)) {
          return new HttpResponseBadRequest({
            error: 'La firma del pago no es válida.',
            code: 'INVALID_SIGNATURE',
          });
        }
      } else {
        this.logger.warn('PAYZEN_HMAC_KEY no configurada: se omite la validación de firma (solo TEST).');
      }

      // 3. Extract the card alias (and first-payment status) from the answer.
      const { paymentMethodToken, firstPaymentStatus } = this.payzen.extractAliasFromKrAnswer(body.krAnswer);

      // 4. Create the REAL recurring subscription from the alias — PayZen
      //    schedules and charges each monthly installment automatically.
      const subscription = await this.payzen.createSubscription({
        paymentMethodToken,
        amount: body.amount,
        currency: body.currency,
        effectDate: effectDateIso(),
        rrule: rruleForCycle(body.billingCycle),
        orderId: body.orderId || undefined,
      });

      // 5. Persist (best-effort).
      let stored: StoredSubscription | undefined;
      try {
        stored = await this.repository.save(subscription, {
          planName: body.planName,
          serviceCount: body.serviceCount,
          billingCycle: body.billingCycle,
          customerName: body.customerName?.trim() || undefined,
          customerEmail: body.customerEmail?.trim() || undefined,
        });
      } catch (saveErr) {
        this.logger.error('No se pudo persistir la suscripción en DynamoDB', {
          subscriptionId: subscription.subscriptionId,
          error: saveErr instanceof Error ? saveErr : new Error(String(saveErr)),
        });
      }

      return new HttpResponseCreated({
        status: 'SUCCESS',
        answer: stored ?? subscription,
        firstPaymentStatus,
      });
    } catch (err) {
      if (err instanceof PayZenApiError) {
        return new HttpResponseBadRequest({
          error: 'PayZen rechazó la confirmación de la suscripción.',
          code: err.errorCode,
          detail: err.detail ?? err.message,
        });
      }
      const message = err instanceof Error ? err.message : 'Error desconocido';
      return new HttpResponseInternalServerError({
        error: 'No se pudo confirmar la suscripción.',
        code: 'PAYZEN_ERROR',
        detail: message,
      });
    }
  }

  /**
   * GET /subscriptions/:subscriptionId/details — fetches the subscription's
   * scheduled recurrence from PayZen (to verify the monthly charges are set up).
   *
   * Looks up the persisted record to get the alias, then queries PayZen's
   * `Charge/GetSubscriptionDetails`.
   */
  @Endpoint(EP.$SubscriptionDetails)
  async details(ctx: Context) {
    const subscriptionId = String(ctx.request.params?.subscriptionId ?? '').trim();
    if (!subscriptionId) {
      return new HttpResponseBadRequest({ error: 'Falta el subscriptionId.', code: 'MISSING_ID' });
    }

    try {
      // 1. Find the persisted subscription to recover its payment alias.
      const all = await this.repository.list();
      const found = all.find((s) => s.subscriptionId === subscriptionId);
      if (!found) {
        return new HttpResponseBadRequest({ error: 'Suscripción no encontrada.', code: 'NOT_FOUND' });
      }

      // 2. Query PayZen for the scheduled recurrence details.
      const details = await this.payzen.getSubscriptionDetails(subscriptionId, found.paymentMethodToken);
      return new HttpResponseOK({ status: 'SUCCESS', answer: details });
    } catch (err) {
      if (err instanceof PayZenApiError) {
        return new HttpResponseBadRequest({
          error: 'PayZen no devolvió los detalles de la suscripción.',
          code: err.errorCode,
          detail: err.detail ?? err.message,
        });
      }
      const message = err instanceof Error ? err.message : 'Error desconocido';
      return new HttpResponseInternalServerError({
        error: 'No se pudieron obtener los detalles de la suscripción.',
        code: 'PAYZEN_ERROR',
        detail: message,
      });
    }
  }

  /**
   * GET /subscriptions — lists every persisted subscription, newest first.
   */
  @Endpoint(EP.$ListSubscriptions)
  async list(_ctx: Context) {
    try {
      const subscriptions = await this.repository.list();
      return new HttpResponseOK({ status: 'SUCCESS', answer: subscriptions });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      return new HttpResponseInternalServerError({
        error: 'No se pudieron listar las suscripciones.',
        code: 'STORAGE_ERROR',
        detail: message,
      });
    }
  }
}

export default Subscription;
