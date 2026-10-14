/**
 * subscriptions — Frontend client + plan catalog for Necto subscriptions.
 *
 * Backs the plans/checkout page. Buying a plan calls the backend microservice
 * (module `api`) at `/api/subscriptions` (proxied by Vite to :8080 in dev). The
 * backend runs PayZen's token-with-payment flow: it charges + tokenizes the
 * first month (`Charge/CreatePayment` REGISTER_PAY) and then bills the recurring
 * charge via zero-click (`Charge/CreatePayment` SILENT). Credentials never reach
 * the browser — this client only sees the JSON contract.
 *
 * The plan catalog is a MOCK: 1–4 Necto services with increasing monthly prices.
 */

// ─── Plan catalog (mock) ─────────────────────────────────────────────────────

/** Currency used for the demo subscription shop (PayZen LATAM demo shop). */
export const SUBSCRIPTION_CURRENCY = "BRL";

/** A selectable subscription plan (mock). */
export interface Plan {
  /** Stable id, e.g. "plan-3". */
  id: string;
  /** Display name, e.g. "3 servicios". */
  name: string;
  /** Number of Necto services included (1–4). */
  serviceCount: number;
  /** Monthly price in major units (e.g. 49.9 = R$49.90). */
  monthlyPrice: number;
  /** The specific services included (mock labels). */
  services: string[];
  /** Whether to highlight this plan as recommended. */
  highlighted?: boolean;
}

/** All Necto services offered (mock). A plan includes the first N of these. */
const ALL_SERVICES = [
  "Servicio 1 — Cobros por enlace",
  "Servicio 2 — Suscripciones recurrentes",
  "Servicio 3 — Reportes y conciliación",
  "Servicio 4 — Soporte prioritario",
];

/**
 * The plan catalog: 1 to 4 services, monthly price grows with the count.
 * Prices are a mock (base R$29.90, +R$20 per additional service).
 */
export const PLANS: Plan[] = [1, 2, 3, 4].map((count) => ({
  id: `plan-${count}`,
  name: `${count} servicio${count === 1 ? "" : "s"}`,
  serviceCount: count,
  monthlyPrice: 29.9 + (count - 1) * 20,
  services: ALL_SERVICES.slice(0, count),
  highlighted: count === 3,
}));

// ─── Billing cycles ──────────────────────────────────────────────────────────

/** How often the subscription is billed. */
export type BillingCycle = "monthly" | "yearly" | "daily";

/**
 * Billing-cycle catalog for the plans UI.
 *
 * `months` is how many months the buyer pays per charge (used to compute the
 * amount per charge from the plan's monthly price); `discount` is a mock
 * discount applied to that amount (e.g. yearly is cheaper). `daily` is a demo
 * cycle to watch the recurrence run fast (billed as one month per day).
 */
export interface BillingCycleOption {
  id: BillingCycle;
  label: string;
  /** Months covered by each charge (yearly = 12). Daily uses 1 for the amount. */
  months: number;
  /** Fractional discount on the per-charge amount (0.15 = 15% off). */
  discount: number;
  /** Short suffix for prices, e.g. "/mes" or "/año". */
  suffix: string;
}

export const BILLING_CYCLES: BillingCycleOption[] = [
  { id: "monthly", label: "Mensual", months: 1, discount: 0, suffix: "/mes" },
  { id: "yearly", label: "Anual (2 meses gratis)", months: 12, discount: 2 / 12, suffix: "/año" },
  { id: "daily", label: "Diario (demo)", months: 1, discount: 0, suffix: "/día" },
];

/**
 * Computes the amount charged per cycle for a plan, in major units.
 *
 * monthly/daily → the plan's monthly price; yearly → 12 months minus the mock
 * discount (2 months free).
 *
 * @param monthlyPrice - The plan's monthly price in major units
 * @param cycle - The chosen billing cycle option
 * @returns The amount billed on each charge, in major units
 */
export function amountForCycle(monthlyPrice: number, cycle: BillingCycleOption): number {
  const gross = monthlyPrice * cycle.months;
  return Math.round(gross * (1 - cycle.discount) * 100) / 100;
}

// ─── Request/response types ──────────────────────────────────────────────────

/** Subscription lifecycle status. */
export type SubscriptionStatus = "ACTIVE" | "CANCELLED" | "SUSPENDED";

/** Body sent to the backend to buy a subscription (`POST /api/subscriptions`). */
export interface CreateSubscriptionRequest {
  /** Monthly amount in the smallest currency unit (4990 = 49.90). */
  amount: number;
  /** ISO 4217 currency code (e.g. "BRL"). */
  currency: string;
  /** Human label of the chosen plan (e.g. "3 servicios"). */
  planName?: string;
  /** Number of Necto services in the chosen plan (1–4). */
  serviceCount?: number;
  /** Billing cycle chosen by the buyer. */
  billingCycle?: BillingCycle;
  /** Merchant reference. */
  orderId?: string;
  /** Buyer display name. */
  customerName?: string;
  /** Buyer email (recommended for tokenization). */
  customerEmail?: string;
  /** Locale for the payment pages, e.g. "es_ES". */
  locale?: string;
}

/** A subscription as returned/persisted by the backend. */
export interface Subscription {
  subscriptionId: string;
  paymentMethodToken: string;
  amount: number;
  currency: string;
  rrule: string;
  effectDate: string;
  status: SubscriptionStatus;
  orderId?: string;
  creationDate: string;
  /** Plan/buyer metadata persisted alongside (present on stored records). */
  planName?: string;
  serviceCount?: number;
  billingCycle?: string;
  customerName?: string;
  customerEmail?: string;
  savedAt?: string;
}

/** Envelope returned by `POST /api/subscriptions`. */
export interface CreateSubscriptionResponse {
  status: "SUCCESS" | "ERROR";
  answer: Subscription;
  /** Status of the first (immediate) payment: "PAID" or "RUNNING". */
  firstPaymentStatus: "PAID" | "RUNNING" | "PARTIALLY_PAID" | "EXPIRED" | "CANCELLED";
}

/** Envelope returned by `GET /api/subscriptions`. */
interface ListSubscriptionsResponse {
  status: "SUCCESS" | "ERROR";
  answer: Subscription[];
}

// ─── Backend client ──────────────────────────────────────────────────────────

/** Base path of the subscriptions backend endpoint (proxied by Vite to :8080). */
const SUBSCRIPTIONS_URL = "/api/subscriptions";

/** Shape of the error body the backend returns on 4xx/5xx. */
interface ApiError {
  error: string;
  code?: string;
  detail?: string;
}

/**
 * Buys a subscription plan by calling the backend microservice.
 *
 * POSTs to `/api/subscriptions`. The backend charges + tokenizes the first month
 * and creates the recurring subscription (or mocks it per PAYZEN_MODE), then
 * returns the created subscription plus the first-payment status.
 *
 * @param request - The chosen plan's amount/currency + buyer info
 * @returns The created subscription and the first-payment status
 * @throws Error with the backend's message when the request is rejected (4xx/5xx)
 */
export async function createSubscription(
  request: CreateSubscriptionRequest,
): Promise<CreateSubscriptionResponse> {
  const res = await fetch(SUBSCRIPTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as ApiError | null;
    throw new Error(err?.error ?? `Error ${res.status} al crear la suscripción.`);
  }

  return (await res.json()) as CreateSubscriptionResponse;
}

/**
 * Lists every persisted subscription, newest first.
 *
 * GETs `/api/subscriptions`. The backend reads them from DynamoDB.
 *
 * @returns The stored subscriptions
 * @throws Error with the backend's message when the listing fails (5xx)
 */
export async function listSubscriptions(): Promise<Subscription[]> {
  const res = await fetch(SUBSCRIPTIONS_URL);
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as ApiError | null;
    throw new Error(err?.error ?? `Error ${res.status} al listar las suscripciones.`);
  }
  const body = (await res.json()) as ListSubscriptionsResponse;
  return body.answer ?? [];
}

// ─── Embedded-form (Krypton) LIVE flow ───────────────────────────────────────

/** The formToken + credentials the browser needs to render the card form. */
export interface SubscriptionFormToken {
  formToken: string;
  /** Shop public key (`shopId:test:...`) for the Krypton JS. */
  publicKey: string;
  /** Base URL of PayZen's static JS/CSS assets. */
  jsEndpoint: string;
}

/** Envelope returned by `POST /api/subscriptions/form-token`. */
interface FormTokenResponse {
  status: "SUCCESS" | "ERROR";
  answer: SubscriptionFormToken;
}

/**
 * Requests a formToken to render PayZen's embedded card form (LIVE flow, step 1).
 *
 * POSTs the plan amount/currency to `/api/subscriptions/form-token`. The backend
 * calls `Charge/CreatePayment` REGISTER_PAY and returns the formToken plus the
 * public key and JS endpoint the browser needs to load Krypton.
 *
 * @param request - The chosen plan's amount/currency + buyer info
 * @returns The formToken and the credentials to initialize the embedded form
 * @throws Error with the backend's message when it can't start the payment
 */
export async function requestSubscriptionFormToken(
  request: CreateSubscriptionRequest,
): Promise<SubscriptionFormToken> {
  const res = await fetch(`${SUBSCRIPTIONS_URL}/form-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as ApiError | null;
    throw new Error(err?.error ?? `Error ${res.status} al iniciar el pago.`);
  }
  const body = (await res.json()) as FormTokenResponse;
  return body.answer;
}

/** Payload posted to confirm a subscription after the buyer paid in the form. */
export interface ConfirmSubscriptionRequest extends CreateSubscriptionRequest {
  /** Raw `kr-answer` JSON string returned by the embedded form. */
  krAnswer: string;
  /** `kr-hash` HMAC signature of `krAnswer`. */
  krHash: string;
}

/**
 * Confirms a subscription after the buyer paid in the embedded form (step 2).
 *
 * POSTs the payment result ({ krAnswer, krHash }) + plan info to
 * `/api/subscriptions/confirm`. The backend validates the HMAC signature,
 * extracts the card alias, creates the recurring subscription and persists it.
 *
 * @param request - The payment result + the chosen plan's amount/currency + buyer info
 * @returns The created subscription and the first-payment status
 * @throws Error with the backend's message when confirmation fails
 */
export async function confirmSubscription(
  request: ConfirmSubscriptionRequest,
): Promise<CreateSubscriptionResponse> {
  const res = await fetch(`${SUBSCRIPTIONS_URL}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as ApiError | null;
    throw new Error(err?.error ?? `Error ${res.status} al confirmar la suscripción.`);
  }
  return (await res.json()) as CreateSubscriptionResponse;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a major-unit price (e.g. 49.9) into PayZen's integer smallest-unit
 * amount (e.g. 4990).
 *
 * @param major - Price in major units
 * @returns Integer amount in the smallest currency unit
 */
export function toSmallestUnit(major: number): number {
  return Math.round(major * 100);
}

/**
 * Formats an integer smallest-unit amount to a display string (4990 → "49.90").
 *
 * @param amountSmallestUnit - Amount in the smallest currency unit
 * @param currency - ISO 4217 currency code
 * @returns A human-readable "49.90 BRL" string
 */
export function formatAmount(amountSmallestUnit: number, currency: string): string {
  return `${(amountSmallestUnit / 100).toFixed(2)} ${currency}`;
}
