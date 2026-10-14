/**
 * PayZen/Lyra REST API V4.0 — payment order types.
 *
 * Type definitions for the `Charge/CreatePaymentOrder` web service, which
 * generates a payment order (a hosted payment link + optional delivery message).
 * Reference: https://payzen.io/lat/rest/V4.0/api/payment_order-management.html
 *
 * These shapes were confirmed empirically against the public demo shop
 * (shopId 69876357, mode TEST) at https://api.lyra.com/api-payment/V4. Notably:
 * - `channelType` lives INSIDE `channelOptions` (not at the request top level).
 * - The WhatsApp field is `channelOptions.whatsAppOptions.phoneNumber`.
 * - The response status field is `paymentOrderStatus` (not `status`, which is the
 *   envelope-level SUCCESS/ERROR flag).
 */

/** Delivery channel PayZen uses for the payment order. */
export type PaymentOrderChannelType = "URL" | "MAIL" | "SMS" | "WHATSAPP" | "IVR";

/** WhatsApp delivery options (requires the WHATSAPP feature enabled on the shop). */
export interface WhatsAppOptions {
  /** Recipient WhatsApp number in international format (e.g. "+51987654321"). */
  phoneNumber: string;
}

/** SMS delivery options (requires an SMS account configured on the shop). */
export interface SmsOptions {
  phoneNumber: string;
}

/** Email delivery options. */
export interface MailOptions {
  recipient: string;
}

/**
 * Channel configuration for the payment order.
 *
 * `channelType` selects how PayZen delivers the order; the matching `*Options`
 * object carries the recipient. `URL` needs no options — it just returns the link.
 */
export interface ChannelOptions {
  channelType: PaymentOrderChannelType;
  whatsAppOptions?: WhatsAppOptions;
  smsOptions?: SmsOptions;
  mailOptions?: MailOptions;
}

/** Buyer billing details (subset of PayZen's customer.billingDetails). */
export interface BillingDetails {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  cellPhoneNumber?: string;
  language?: string;
}

/** Customer information attached to the payment order. */
export interface Customer {
  email?: string;
  reference?: string;
  billingDetails?: BillingDetails;
}

/** Request body for `Charge/CreatePaymentOrder`. */
export interface CreatePaymentOrderRequest {
  /** Amount in the smallest currency unit (30050 = 300.50). */
  amount: number;
  /** ISO 4217 currency code (e.g. "USD", "PEN", "EUR"). */
  currency: string;
  /** Merchant order reference. */
  orderId?: string;
  /** Channel + recipient configuration. */
  channelOptions: ChannelOptions;
  /** Buyer information. */
  customer?: Customer;
  /**
   * Payment methods offered on the hosted form (e.g. ["VISA","MASTERCARD"]).
   * Required so the hosted payment page has at least one method to display;
   * without it the demo form is rejected as invalid ("error-10").
   */
  paymentMethods?: string[];
  /** ISO-8601 expiry date. Not in the past, max 90 days out. */
  expirationDate?: string;
  /** Locale for the payment pages, e.g. "es_ES". */
  locale?: string;
}

// ─── Response ─────────────────────────────────────────────────────────────

/** Lifecycle status of a payment order (PayZen `paymentOrderStatus`). */
export type PaymentOrderStatus =
  | "RUNNING"
  | "PAID"
  | "PARTIALLY_PAID"
  | "EXPIRED"
  | "CANCELLED";

/**
 * The `answer` payload PayZen returns for a payment order. PayZen returns many
 * more fields; we type the ones we consume and keep the rest open.
 */
export interface PaymentOrderAnswer {
  paymentOrderId: string;
  /** The hosted payment link the buyer opens to pay. */
  paymentURL: string;
  paymentOrderStatus: PaymentOrderStatus;
  amount: number;
  currency: string;
  orderId?: string | null;
  expirationDate?: string;
  creationDate: string;
  channelDetails?: unknown;
  customer?: Customer | null;
  [key: string]: unknown;
}

/** PayZen REST envelope: `{ status, answer, ... }`. */
export interface PayZenEnvelope {
  /** Envelope-level flag: "SUCCESS" or "ERROR". */
  status: "SUCCESS" | "ERROR";
  answer: PaymentOrderAnswer | PayZenError;
  webService?: string;
  mode?: "TEST" | "PRODUCTION";
  ticket?: string;
  serverDate?: string;
}

/** PayZen error payload (present in `answer` when status === "ERROR"). */
export interface PayZenError {
  errorCode: string;
  errorMessage: string;
  detailedErrorCode?: string | null;
  detailedErrorMessage?: string | null;
  ticket?: string;
  shopId?: string;
}

/**
 * Normalized payment order returned by our client/backend to the frontend.
 * Stable, minimal shape decoupled from PayZen's verbose answer.
 */
export interface PaymentOrder {
  paymentOrderId: string;
  paymentURL: string;
  status: PaymentOrderStatus;
  amount: number;
  currency: string;
  orderId?: string;
  channelType: PaymentOrderChannelType;
  expirationDate?: string;
  creationDate: string;
}

/** Response our controller returns to the frontend when creating an order. */
export interface CreatePaymentOrderResponse {
  status: "SUCCESS";
  answer: PaymentOrder;
}

/** Response our client returns when fetching an order's status. */
export interface GetPaymentOrderResponse {
  status: "SUCCESS";
  answer: PaymentOrder;
}

// ─── Subscriptions (token with payment) ────────────────────────────────────

/**
 * Request to create a payment token together with an initial payment, modelling
 * PayZen `Charge/CreatePayment` with `formAction: "REGISTER_PAY"`.
 *
 * This charges the first installment AND tokenizes the buyer's card in one call,
 * returning a reusable `paymentMethodToken` (alias) later consumed by
 * `Charge/CreateSubscription`. Reference:
 * https://payzen.io/lat/rest/V4.0/api/kb/token_with_payment.html
 */
export interface TokenWithPaymentRequest {
  /** First-installment amount in the smallest currency unit (30050 = 300.50). */
  amount: number;
  /** ISO 4217 currency code (e.g. "BRL"). */
  currency: string;
  /** Merchant order reference for the first payment. */
  orderId?: string;
  /** Buyer information (email is recommended for tokenization). */
  customer?: Customer;
  /** Locale for the payment pages, e.g. "es_ES". */
  locale?: string;
}

/** Normalized result of a token-with-payment operation. */
export interface TokenWithPayment {
  /** Reusable card alias to create subscriptions from (PayZen `paymentMethodToken`). */
  paymentMethodToken: string;
  /** Status of the first payment (PAID = charged, RUNNING = pending). */
  firstPaymentStatus: PaymentOrderStatus;
  /** The charged amount (smallest unit) and its currency. */
  amount: number;
  currency: string;
  orderId?: string;
}

/**
 * Request to create a recurring subscription from an existing valid alias,
 * modelling PayZen `Charge/CreateSubscription`.
 */
export interface CreateSubscriptionRequest {
  /** Card alias produced by the token-with-payment step. */
  paymentMethodToken: string;
  /** Recurring amount per installment (smallest currency unit). */
  amount: number;
  /** ISO 4217 currency code (e.g. "BRL"). */
  currency: string;
  /** Subscription first-charge date, ISO-8601 UTC (e.g. "2026-10-01T00:00:00.000Z"). */
  effectDate: string;
  /**
   * iCal recurrence rule, e.g. "RRULE:FREQ=MONTHLY;COUNT=12".
   * See: https://payzen.io/lat/rest/V4.0/api/kb/rrules.html
   */
  rrule: string;
  /** Merchant reference for the subscription. */
  orderId?: string;
}

/**
 * Normalized subscription returned by our client/backend to the frontend.
 * Stable, minimal shape decoupled from PayZen's verbose answer.
 */
export interface Subscription {
  /** PayZen subscription identifier. */
  subscriptionId: string;
  /** Card alias the subscription bills against. */
  paymentMethodToken: string;
  /** Recurring amount per installment (smallest currency unit). */
  amount: number;
  currency: string;
  /** Recurrence rule (iCal RRULE). */
  rrule: string;
  /** Start date in UTC, "YYYYMMDD". */
  effectDate: string;
  /** Subscription lifecycle status. */
  status: "ACTIVE" | "CANCELLED" | "SUSPENDED";
  orderId?: string;
  creationDate: string;
}

// ─── Embedded-form subscription flow (Krypton, LIVE) ────────────────────────

/**
 * Result of requesting a `formToken` for the embedded card form.
 *
 * The browser uses `formToken` + `publicKey` (loaded from `jsEndpoint`) to
 * render PayZen's Krypton card form. Produced by `Charge/CreatePayment` with
 * `formAction: "REGISTER_PAY"` — charges the first installment AND tokenizes.
 */
export interface SubscriptionFormToken {
  /** Short-lived token (15 min) that parameterizes the embedded form. */
  formToken: string;
  /** Shop public key (`shopId:test:...`) the browser JS needs to initialize. */
  publicKey: string;
  /** Base URL of PayZen's static JS/CSS assets (Krypton). */
  jsEndpoint: string;
}

/**
 * The payment result the browser posts back after the buyer pays in the
 * embedded form. `krAnswer` is the JSON string PayZen returned to the form and
 * `krHash` its HMAC-SHA256 signature — the backend validates the signature
 * before trusting the contained alias.
 */
export interface SubscriptionPaymentResult {
  /** Raw `kr-answer` JSON string from the embedded form. */
  krAnswer: string;
  /** `kr-hash` HMAC-SHA256 signature of `krAnswer`. */
  krHash: string;
}
