/**
 * PayZenClient — Server-side client for the PayZen/Lyra REST API V4.0.
 *
 * Wraps `Charge/CreatePaymentOrder` (payment links) and the subscription flow
 * (`Charge/CreatePayment` REGISTER_PAY = token with payment, then
 * `Charge/CreateSubscription`). Lives ONLY in the backend (module `api`) because
 * PayZen authenticates with HTTP Basic Auth (API user + password), which must
 * never reach the browser.
 *
 * MULTI-STORE routing: different delivery channels are served by different demo
 * shops (they live on separate PayZen platforms with their own credentials):
 *  - URL       → default store (Lyra demo, shopId 69876357, api.lyra.com).
 *  - WHATSAPP  → the WhatsApp-enabled store (PayZen LATAM demo, shopId 28478261,
 *    api.payzen.lat, currency BRL). Native WhatsApp delivery verified in TEST.
 * Each channel resolves to its own {username,password,endpoint}; if a channel has
 * no dedicated store configured, it falls back to the default store.
 *
 * Mode is selected by `PAYZEN_MODE` ("live" | "mock"). Auth follows the PayZen
 * "Authentication phase" doc (HTTP Basic).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  CreatePaymentOrderRequest,
  CreatePaymentOrderResponse,
  GetPaymentOrderResponse,
  PaymentOrder,
  PaymentOrderAnswer,
  PaymentOrderChannelType,
  PayZenEnvelope,
  PayZenError,
  TokenWithPaymentRequest,
  TokenWithPayment,
  CreateSubscriptionRequest,
  Subscription,
  SubscriptionFormToken,
} from "./types.js";

/** Client operating mode, from `PAYZEN_MODE` (defaults to "mock"). */
export type PayZenMode = "mock" | "live";

/** Credentials + endpoint for a single PayZen shop. */
export interface PayZenStore {
  username?: string;
  password?: string;
  /** Base REST endpoint, e.g. "https://api.lyra.com/api-payment/V4". */
  endpoint?: string;
}

/** Resolved PayZen configuration: mode + default store + per-channel overrides. */
export interface PayZenConfig {
  /** Mode for payment links (Charge/CreatePaymentOrder). */
  mode: PayZenMode;
  /**
   * Mode for subscriptions (token with payment + zero-click). Defaults to "mock":
   * the demo shop returns a `formToken` for REGISTER_PAY (embedded-form flow)
   * rather than a server-to-server alias, so the live subscription flow can't be
   * completed without the browser JS form. Set PAYZEN_SUBSCRIPTIONS_MODE=live
   * only against a shop that supports server-to-server tokenization.
   */
  subscriptionsMode: PayZenMode;
  /** Default store used for any channel without a dedicated override. */
  default: PayZenStore;
  /** Optional per-channel store overrides (e.g. WHATSAPP). */
  channels: Partial<Record<PaymentOrderChannelType, PayZenStore>>;
  /**
   * Embedded-form (Krypton) credentials for the LIVE subscription flow. The
   * browser needs `publicKey` + `jsEndpoint` to render the card form from a
   * `formToken`; the backend needs `hmacKey` to validate the payment response
   * signature. All live in the shop's Back Office (REST API keys), NOT in the
   * public docs. Injected via PAYZEN_PUBLIC_KEY / PAYZEN_JS_ENDPOINT /
   * PAYZEN_HMAC_KEY.
   */
  form: {
    publicKey?: string;
    jsEndpoint?: string;
    hmacKey?: string;
  };
  /**
   * Dedicated store for subscriptions. The embedded-form demo shop (33970753)
   * differs from the payment-links shop, and its public key + password must be a
   * matched pair. Falls back to `default` when not configured.
   */
  subscriptionStore: PayZenStore;
}

/** Error thrown when PayZen returns an application-level error. */
export class PayZenApiError extends Error {
  constructor(
    message: string,
    readonly errorCode: string,
    readonly detail?: string | null,
  ) {
    super(message);
    this.name = "PayZenApiError";
  }
}

/**
 * Reads and normalizes PayZen configuration from process.env.
 *
 * - Default store: PAYZEN_USERNAME / PAYZEN_PASSWORD / PAYZEN_ENDPOINT.
 * - WhatsApp store (optional): PAYZEN_WA_USERNAME / PAYZEN_WA_PASSWORD /
 *   PAYZEN_WA_ENDPOINT. When present, WHATSAPP-channel orders route here.
 */
export function readPayZenConfig(): PayZenConfig {
  const mode = (process.env.PAYZEN_MODE ?? "mock").toLowerCase() === "live" ? "live" : "mock";
  // Subscriptions default to mock (the demo shop can't complete server-to-server
  // tokenization); opt in explicitly with PAYZEN_SUBSCRIPTIONS_MODE=live.
  const subscriptionsMode =
    (process.env.PAYZEN_SUBSCRIPTIONS_MODE ?? "mock").toLowerCase() === "live" ? "live" : "mock";

  const channels: PayZenConfig["channels"] = {};
  // WhatsApp-specific store (native WhatsApp delivery), if configured.
  if (process.env.PAYZEN_WA_USERNAME || process.env.PAYZEN_WA_ENDPOINT) {
    channels.WHATSAPP = {
      username: process.env.PAYZEN_WA_USERNAME,
      password: process.env.PAYZEN_WA_PASSWORD,
      endpoint: process.env.PAYZEN_WA_ENDPOINT,
    };
  }

  return {
    mode,
    subscriptionsMode,
    default: {
      username: process.env.PAYZEN_USERNAME,
      password: process.env.PAYZEN_PASSWORD,
      endpoint: process.env.PAYZEN_ENDPOINT,
    },
    channels,
    form: {
      publicKey: process.env.PAYZEN_PUBLIC_KEY,
      jsEndpoint: process.env.PAYZEN_JS_ENDPOINT,
      hmacKey: process.env.PAYZEN_HMAC_KEY,
    },
    // Subscription store: dedicated PAYZEN_SUB_* creds, else fall back to default.
    subscriptionStore: {
      username: process.env.PAYZEN_SUB_USERNAME ?? process.env.PAYZEN_USERNAME,
      password: process.env.PAYZEN_SUB_PASSWORD ?? process.env.PAYZEN_PASSWORD,
      endpoint: process.env.PAYZEN_SUB_ENDPOINT ?? process.env.PAYZEN_ENDPOINT,
    },
  };
}

/** Generates a mock payment order id (stand-in for PayZen's real id). */
function generatePaymentOrderId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `po_${Date.now().toString(36)}_${rand}`;
}

/** Default expiry: 7 days from now, ISO-8601. */
function defaultExpiration(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString();
}

/**
 * PayZenClient — creates payment orders against PayZen (or mocks them).
 */
export class PayZenClient {
  private readonly config: PayZenConfig;

  constructor(config: PayZenConfig = readPayZenConfig()) {
    this.config = config;
  }

  /** Whether the client will make real authenticated calls for payment links. */
  get isLive(): boolean {
    return this.config.mode === "live";
  }

  /** Whether the subscription flow makes real calls (vs. mock). */
  get isSubscriptionsLive(): boolean {
    return this.config.subscriptionsMode === "live";
  }

  /** Whether an HMAC key is configured to validate the payment signature. */
  get hasHmacKey(): boolean {
    return !!this.config.form.hmacKey;
  }

  /** Resolves the store for a channel: its dedicated override, else the default. */
  private resolveStore(channelType: PaymentOrderChannelType): PayZenStore {
    return this.config.channels[channelType] ?? this.config.default;
  }

  /**
   * Creates a payment order (payment link) and returns a normalized result.
   *
   * Routes to the store that serves the requested channel. In "live" mode POSTs
   * to `{endpoint}/Charge/CreatePaymentOrder` with HTTP Basic Auth and maps
   * PayZen's verbose answer into our stable `PaymentOrder`. In "mock" mode returns
   * a fabricated one.
   *
   * @param request - The payment order parameters (amount, currency, channel, ...)
   * @returns The normalized payment order whose `answer.paymentURL` is the link
   * @throws PayZenApiError when PayZen rejects the request (e.g. feature disabled)
   * @throws Error when live mode is misconfigured or the transport fails
   */
  async createPaymentOrder(
    request: CreatePaymentOrderRequest,
  ): Promise<CreatePaymentOrderResponse> {
    if (!this.isLive) {
      return this.mockCreatePaymentOrder(request);
    }

    // 1. Resolve the store for this channel and validate its configuration
    const store = this.resolveStore(request.channelOptions.channelType);
    const { username, password, endpoint } = store;
    if (!username || !password || !endpoint) {
      throw new Error(
        `PayZen live mode: missing credentials/endpoint for channel ${request.channelOptions.channelType}.`,
      );
    }

    // 2. HTTP Basic Auth header: base64("username:password")
    const basic = Buffer.from(`${username}:${password}`).toString("base64");

    // 3. POST the request to the CreatePaymentOrder web service
    const res = await fetch(`${endpoint.replace(/\/$/, "")}/Charge/CreatePaymentOrder`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    // 4. Surface transport-level failures (401 auth, 5xx, etc.)
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`PayZen HTTP ${res.status}: ${text || res.statusText}`);
    }

    // 5. Parse the envelope. PayZen returns HTTP 200 even for app-level errors,
    //    signalled by envelope.status === "ERROR".
    const envelope = (await res.json()) as PayZenEnvelope;
    if (envelope.status !== "SUCCESS") {
      const err = envelope.answer as PayZenError;
      throw new PayZenApiError(
        err?.errorMessage ?? "PayZen error",
        err?.errorCode ?? "UNKNOWN",
        err?.detailedErrorMessage,
      );
    }

    // 6. Map PayZen's verbose answer into our stable PaymentOrder
    const answer = envelope.answer as PaymentOrderAnswer;
    const order: PaymentOrder = {
      paymentOrderId: answer.paymentOrderId,
      paymentURL: answer.paymentURL,
      status: answer.paymentOrderStatus,
      amount: answer.amount,
      currency: answer.currency,
      orderId: answer.orderId ?? undefined,
      channelType: request.channelOptions.channelType,
      expirationDate: answer.expirationDate,
      creationDate: answer.creationDate,
    };
    return { status: "SUCCESS", answer: order };
  }

  /**
   * Gets the current status of a payment order by its id.
   *
   * Since a paymentOrderId may belong to any configured store, this tries each
   * distinct store (default + per-channel) until one returns the order. In "mock"
   * mode it returns a fabricated RUNNING order.
   *
   * @param paymentOrderId - The PayZen payment order id to look up
   * @returns The normalized payment order with its current status
   * @throws PayZenApiError when no store recognizes the id (e.g. not found)
   */
  async getPaymentOrder(paymentOrderId: string): Promise<GetPaymentOrderResponse> {
    if (!this.isLive) {
      return this.mockGetPaymentOrder(paymentOrderId);
    }

    // Try each distinct store; the order lives in exactly one of them.
    const stores = this.distinctStores();
    let lastError: PayZenApiError | Error | undefined;
    for (const store of stores) {
      try {
        const envelope = await this.postJson(store, "Charge/PaymentOrder/Get", { paymentOrderId });
        if (envelope.status !== "SUCCESS") {
          const err = envelope.answer as PayZenError;
          lastError = new PayZenApiError(
            err?.errorMessage ?? "PayZen error",
            err?.errorCode ?? "UNKNOWN",
            err?.detailedErrorMessage,
          );
          continue; // maybe it belongs to another store
        }
        const answer = envelope.answer as PaymentOrderAnswer;
        // channelType is carried in channelDetails; default to URL when absent.
        const cd = answer.channelDetails as { channelType?: PaymentOrderChannelType } | undefined;
        return { status: "SUCCESS", answer: this.toPaymentOrder(answer, cd?.channelType) };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
    throw lastError ?? new PayZenApiError("Orden no encontrada", "NOT_FOUND");
  }

  /** POSTs a JSON body to a PayZen web service on the given store, returns the envelope. */
  private async postJson(
    store: PayZenStore,
    path: string,
    body: unknown,
  ): Promise<PayZenEnvelope> {
    const { username, password, endpoint } = store;
    if (!username || !password || !endpoint) {
      throw new Error(`PayZen live mode: missing credentials/endpoint for ${path}.`);
    }
    const basic = Buffer.from(`${username}:${password}`).toString("base64");
    const res = await fetch(`${endpoint.replace(/\/$/, "")}/${path}`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`PayZen HTTP ${res.status}: ${text || res.statusText}`);
    }
    return (await res.json()) as PayZenEnvelope;
  }

  /** The set of distinct stores to probe (default first, then channel overrides). */
  private distinctStores(): PayZenStore[] {
    const stores: PayZenStore[] = [this.config.default];
    for (const store of Object.values(this.config.channels)) {
      if (store && store.endpoint !== this.config.default.endpoint) {
        stores.push(store);
      }
    }
    return stores;
  }

  /** Maps a raw PayZen answer into our stable PaymentOrder. */
  private toPaymentOrder(answer: PaymentOrderAnswer, channelType?: PaymentOrderChannelType): PaymentOrder {
    return {
      paymentOrderId: answer.paymentOrderId,
      paymentURL: answer.paymentURL,
      status: answer.paymentOrderStatus,
      amount: answer.amount,
      currency: answer.currency,
      orderId: answer.orderId ?? undefined,
      channelType: channelType ?? "URL",
      expirationDate: answer.expirationDate,
      creationDate: answer.creationDate,
    };
  }

  /** Fabricated status lookup used in mock mode. */
  private async mockGetPaymentOrder(paymentOrderId: string): Promise<GetPaymentOrderResponse> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      status: "SUCCESS",
      answer: {
        paymentOrderId,
        paymentURL: `https://demo.pay.necto.co/pay/${paymentOrderId}`,
        status: "RUNNING",
        amount: 0,
        currency: "USD",
        channelType: "URL",
        creationDate: new Date().toISOString(),
      },
    };
  }

  /** Produces a fabricated, correctly-shaped payment order without calling PayZen. */
  private async mockCreatePaymentOrder(
    request: CreatePaymentOrderRequest,
  ): Promise<CreatePaymentOrderResponse> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const paymentOrderId = generatePaymentOrderId();
    const order: PaymentOrder = {
      paymentOrderId,
      paymentURL: `https://demo.pay.necto.co/pay/${paymentOrderId}`,
      status: "RUNNING",
      amount: request.amount,
      currency: request.currency,
      orderId: request.orderId,
      channelType: request.channelOptions.channelType,
      expirationDate: request.expirationDate ?? defaultExpiration(),
      creationDate: new Date().toISOString(),
    };
    return { status: "SUCCESS", answer: order };
  }

  // ─── Subscriptions — embedded-form (Krypton) LIVE flow ───────────────────

  /**
   * Creates a `formToken` to render PayZen's embedded card form for a
   * subscription's first payment (charge + tokenize).
   *
   * Calls `Charge/CreatePayment` with `formAction: "REGISTER_PAY"`. The demo
   * shop returns a `formToken` (not a server-to-server alias): the browser then
   * loads Krypton with `publicKey` + `jsEndpoint`, renders the card form from
   * this token, and the buyer pays. The resulting alias comes back to the
   * browser and is confirmed via `verifyPaymentSignature` + `extractAlias`.
   *
   * @param request - First-payment amount/currency + buyer info
   * @returns The formToken plus the public key and JS endpoint the browser needs
   * @throws Error when the embedded-form credentials are not configured
   * @throws PayZenApiError when PayZen rejects the request
   */
  async createSubscriptionFormToken(request: TokenWithPaymentRequest): Promise<SubscriptionFormToken> {
    const { publicKey, jsEndpoint } = this.config.form;
    // Guard: the browser cannot render the form without these — fail early with
    // a clear message instead of returning a token the front can't use.
    if (!publicKey || !jsEndpoint) {
      throw new Error(
        "Faltan credenciales del formulario embebido (PAYZEN_PUBLIC_KEY / PAYZEN_JS_ENDPOINT).",
      );
    }

    // 1. Ask PayZen for a REGISTER_PAY form token (charge first month + tokenize).
    const store = this.config.subscriptionStore;
    const envelope = await this.postJson(store, "Charge/CreatePayment", {
      amount: request.amount,
      currency: request.currency,
      orderId: request.orderId,
      formAction: "REGISTER_PAY",
      paymentMethods: ["VISA", "MASTERCARD"],
      customer: request.customer,
      locale: request.locale ?? "es_ES",
    });

    // 2. Surface PayZen application-level errors.
    if (envelope.status !== "SUCCESS") {
      const err = envelope.answer as PayZenError;
      throw new PayZenApiError(
        err?.errorMessage ?? "PayZen error",
        err?.errorCode ?? "UNKNOWN",
        err?.detailedErrorMessage,
      );
    }

    // 3. Extract the formToken from the PaymentForm answer.
    const answer = envelope.answer as { formToken?: string };
    if (!answer.formToken) {
      throw new PayZenApiError("PayZen no devolvió un formToken.", "NO_FORM_TOKEN");
    }
    return { formToken: answer.formToken, publicKey, jsEndpoint };
  }

  /**
   * Validates the HMAC-SHA256 signature of a payment result posted back by the
   * embedded form (the `kr-hash` over `kr-answer`).
   *
   * Uses the shop's HMAC key (PAYZEN_HMAC_KEY) and a constant-time comparison to
   * prevent trusting a forged payment answer.
   *
   * @param krAnswer - The raw `kr-answer` JSON string returned to the form
   * @param krHash - The `kr-hash` signature to verify
   * @returns true when the signature matches
   */
  verifyPaymentSignature(krAnswer: string, krHash: string): boolean {
    const key = this.config.form.hmacKey;
    if (!key) {
      throw new Error("Falta PAYZEN_HMAC_KEY para validar la firma del pago.");
    }
    const expected = createHmac("sha256", key).update(krAnswer).digest("hex");
    // Constant-time compare (guard against length mismatch first).
    const a = Buffer.from(expected);
    const b = Buffer.from(krHash);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /**
   * Extracts the card alias (`paymentMethodToken`) and first-payment status from
   * a validated `kr-answer` payload.
   *
   * @param krAnswer - The validated `kr-answer` JSON string
   * @returns The alias + whether the first payment is PAID
   * @throws PayZenApiError when the answer carries no alias (payment not completed)
   */
  extractAliasFromKrAnswer(krAnswer: string): { paymentMethodToken: string; firstPaymentStatus: "PAID" | "RUNNING" } {
    const parsed = JSON.parse(krAnswer) as {
      orderStatus?: string;
      transactions?: Array<{ paymentMethodToken?: string }>;
    };
    const token = parsed.transactions?.[0]?.paymentMethodToken;
    if (!token) {
      throw new PayZenApiError("El pago no generó un token de tarjeta.", "NO_TOKEN");
    }
    return {
      paymentMethodToken: token,
      firstPaymentStatus: parsed.orderStatus === "PAID" ? "PAID" : "RUNNING",
    };
  }

  // ─── Subscriptions (token with payment) ──────────────────────────────────

  /**
   * Creates a payment token together with an initial payment.
   *
   * Models PayZen `Charge/CreatePayment` with `formAction: "REGISTER_PAY"`: it
   * charges the first installment AND tokenizes the buyer's card in a single
   * operation, returning a reusable `paymentMethodToken` (alias) that
   * `createSubscription()` then bills against.
   *
   * Uses the default store (BRL LATAM demo shop). In "mock" mode it fabricates a
   * paid token; in "live" mode it POSTs to `{endpoint}/Charge/CreatePayment`.
   *
   * @param request - First-payment amount/currency + buyer info
   * @returns The normalized token-with-payment result (alias + first-payment status)
   * @throws PayZenApiError when PayZen rejects the request
   * @throws Error when live mode is misconfigured or the transport fails
   */
  async createTokenWithPayment(request: TokenWithPaymentRequest): Promise<TokenWithPayment> {
    if (!this.isSubscriptionsLive) {
      return this.mockCreateTokenWithPayment(request);
    }

    // 1. Build the CreatePayment request in REGISTER_PAY mode (charge + tokenize).
    const store = this.config.subscriptionStore;
    const envelope = await this.postJson(store, "Charge/CreatePayment", {
      amount: request.amount,
      currency: request.currency,
      orderId: request.orderId,
      formAction: "REGISTER_PAY",
      paymentMethods: ["VISA", "MASTERCARD"],
      customer: request.customer,
      locale: request.locale ?? "es_ES",
    });

    // 2. Surface PayZen application-level errors.
    if (envelope.status !== "SUCCESS") {
      const err = envelope.answer as PayZenError;
      throw new PayZenApiError(
        err?.errorMessage ?? "PayZen error",
        err?.errorCode ?? "UNKNOWN",
        err?.detailedErrorMessage,
      );
    }

    // 3. Extract the created alias + first-payment status from the Payment answer.
    //    PayZen returns the alias under transactions[].paymentMethodToken.
    const answer = envelope.answer as {
      orderStatus?: string;
      transactions?: Array<{ paymentMethodToken?: string; status?: string }>;
    };
    const tx = answer.transactions?.[0];
    const token = tx?.paymentMethodToken;
    if (!token) {
      throw new PayZenApiError("PayZen no devolvió un token de pago.", "NO_TOKEN");
    }
    return {
      paymentMethodToken: token,
      firstPaymentStatus: answer.orderStatus === "PAID" ? "PAID" : "RUNNING",
      amount: request.amount,
      currency: request.currency,
      orderId: request.orderId,
    };
  }

  /**
   * Creates a REAL recurring subscription from an existing valid card alias.
   *
   * Uses PayZen's `Charge/CreateSubscription`: PayZen registers the subscription
   * and schedules the recurring charges itself (it bills the alias on each
   * `rrule` occurrence starting at `effectDate`). Unlike a one-off zero-click
   * charge, this is what makes the monthly billing happen automatically.
   * Reference: https://payzen.io/lat/rest/V4.0/api/playground/Charge/CreateSubscription
   *
   * @param request - Alias + recurring amount/currency + effectDate + rrule
   * @returns The normalized subscription (real PayZen subscriptionId + recurrence)
   * @throws PayZenApiError when PayZen rejects the request
   * @throws Error when live mode is misconfigured or the transport fails
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    if (!this.isSubscriptionsLive) {
      return this.mockCreateSubscription(request);
    }

    // 1. Register the recurring subscription on PayZen. PayZen schedules and
    //    charges each installment automatically per the rrule/effectDate.
    const store = this.config.subscriptionStore;
    const envelope = await this.postJson(store, "Charge/CreateSubscription", {
      amount: request.amount,
      currency: request.currency,
      effectDate: request.effectDate,
      rrule: request.rrule,
      orderId: request.orderId,
      paymentMethodToken: request.paymentMethodToken,
    });

    // 2. Surface PayZen application-level errors.
    if (envelope.status !== "SUCCESS") {
      const err = envelope.answer as PayZenError;
      throw new PayZenApiError(
        err?.errorMessage ?? "PayZen error",
        err?.errorCode ?? "UNKNOWN",
        err?.detailedErrorMessage,
      );
    }

    // 3. Map the answer. Charge/CreateSubscription returns a subscriptionId that
    //    PayZen uses to run the scheduled recurring charges.
    const answer = envelope.answer as { subscriptionId?: string };
    if (!answer.subscriptionId) {
      throw new PayZenApiError("PayZen no devolvió un subscriptionId.", "NO_SUBSCRIPTION");
    }
    return {
      subscriptionId: answer.subscriptionId,
      paymentMethodToken: request.paymentMethodToken,
      amount: request.amount,
      currency: request.currency,
      rrule: request.rrule,
      effectDate: request.effectDate,
      status: "ACTIVE",
      orderId: request.orderId,
      creationDate: new Date().toISOString(),
    };
  }

  /**
   * Fetches the details of a subscription from PayZen to verify it was scheduled.
   *
   * Uses the `Subscription/Get` web service (verified against the LATAM shop —
   * `Charge/GetSubscriptionDetails` does NOT exist there). Returns the recurrence
   * definition (rrule, effectDate, amount, initialAmountNumber, cancelDate, the
   * payment-method details, etc.). Note: it does NOT return a per-installment
   * "paid/overdue/pending" history — that comes from the IPN notifications PayZen
   * sends on each recurring charge.
   *
   * @param subscriptionId - The PayZen subscription id
   * @param paymentMethodToken - The alias the subscription bills against
   * @returns The raw PayZen answer (rrule, effectDate, amount, cancelDate, ...)
   * @throws PayZenApiError when PayZen rejects the request
   */
  async getSubscriptionDetails(subscriptionId: string, paymentMethodToken: string): Promise<Record<string, unknown>> {
    const store = this.config.subscriptionStore;
    const envelope = await this.postJson(store, "Subscription/Get", {
      subscriptionId,
      paymentMethodToken,
    });
    if (envelope.status !== "SUCCESS") {
      const err = envelope.answer as PayZenError;
      throw new PayZenApiError(
        err?.errorMessage ?? "PayZen error",
        err?.errorCode ?? "UNKNOWN",
        err?.detailedErrorMessage,
      );
    }
    return envelope.answer as unknown as Record<string, unknown>;
  }

  /** Fabricated token-with-payment used in mock mode. */
  private async mockCreateTokenWithPayment(request: TokenWithPaymentRequest): Promise<TokenWithPayment> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      paymentMethodToken: `tok_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
      firstPaymentStatus: "PAID",
      amount: request.amount,
      currency: request.currency,
      orderId: request.orderId,
    };
  }

  /** Fabricated subscription used in mock mode. */
  private async mockCreateSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      subscriptionId: `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
      paymentMethodToken: request.paymentMethodToken,
      amount: request.amount,
      currency: request.currency,
      rrule: request.rrule,
      effectDate: request.effectDate,
      status: "ACTIVE",
      orderId: request.orderId,
      creationDate: new Date().toISOString(),
    };
  }
}
