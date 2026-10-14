/**
 * PaymentOrder — HTTP controller for PayZen payment orders (payment links).
 *
 * Endpoints (consumed by the web module):
 *  - POST /payment-orders                  — create a link, then persist it.
 *  - GET  /payment-orders                  — list persisted links w/ live status.
 *  - GET  /payment-orders/:paymentOrderId  — status of a single link.
 *
 * Create validates the payload, builds PayZen's `channelOptions` for the chosen
 * delivery channel, delegates to `PayZenClient` (which routes to the right shop),
 * persists the result via `PaymentOrderRepository` (DynamoDB) so it survives
 * reloads, and returns a normalized payment order whose `paymentURL` is the link.
 * List reads from DynamoDB and refreshes each status against PayZen.
 *
 * Delivery channels supported:
 *  - "URL": PayZen returns the link; Necto delivers it (e.g. wa.me from the front).
 *  - "WHATSAPP": PayZen delivers the link natively to the buyer's WhatsApp
 *    (channelOptions.whatsAppOptions.phoneNumber). Requires a WhatsApp-enabled shop.
 * The PayZenClient picks the shop/credentials per channel (see client.ts).
 *
 * Credentials never touch the browser: the client runs here, in the backend.
 *
 * Related files:
 * - endpoints.ts — EP.$CreatePaymentOrder / $ListPaymentOrders / $GetPaymentOrder
 * - services/payzen/client.ts — PayZenClient (Basic Auth + per-channel routing)
 * - services/payzen/types.ts — CreatePaymentOrderRequest/Response
 * - services/PaymentOrderRepository.ts — DynamoDB persistence (save/list)
 */
import { Endpoint, HttpResponseOK, HttpResponseCreated, HttpResponseBadRequest, HttpResponseNotFound, HttpResponseInternalServerError } from '@webiai/sdk.http';
import type { Context } from '@webiai/sdk.http';
import { dependency } from '@webiai/sdk.ioc';
import { Logger } from '@webiai/sdk.core';
import EP from '../endpoints.js';
import { PayZenClient, PayZenApiError } from '../services/payzen/client.js';
import { PaymentOrderRepository, type StoredPaymentOrder } from '../services/PaymentOrderRepository.js';
import type { ChannelOptions, PaymentOrderChannelType } from '../services/payzen/types.js';

/** Delivery channels this endpoint exposes to the frontend. */
const ALLOWED_CHANNELS: PaymentOrderChannelType[] = ['URL', 'WHATSAPP'];

/** Shape of the JSON the frontend sends to create a payment link. */
interface CreatePaymentLinkBody {
  amount?: number;
  currency?: string;
  orderId?: string;
  /** Buyer's WhatsApp/phone number in international format (e.g. "+573026643546"). */
  phoneNumber?: string;
  customerName?: string;
  /** Delivery channel: "URL" (Necto sends it) or "WHATSAPP" (PayZen sends it). */
  channel?: PaymentOrderChannelType;
  locale?: string;
}

class PaymentOrder {
  private readonly payzen = new PayZenClient();
  private readonly logger = new Logger('PaymentOrder');

  /** Injected DynamoDB repository that persists/lists created payment links. */
  @dependency(PaymentOrderRepository)
  private readonly repository!: PaymentOrderRepository;

  @Endpoint(EP.$CreatePaymentOrder)
  async create(ctx: Context) {
    // 1. Read the JSON body sent by the frontend
    const body = (ctx.request.body ?? {}) as CreatePaymentLinkBody;

    // 2. Validate the amount — must be a positive integer (smallest currency unit)
    if (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0) {
      return new HttpResponseBadRequest({
        error: 'amount debe ser un entero positivo en la menor unidad monetaria (ej. 30050 = 300.50).',
        code: 'INVALID_AMOUNT',
      });
    }

    // 3. Validate currency — required ISO 4217 code
    if (typeof body.currency !== 'string' || body.currency.length !== 3) {
      return new HttpResponseBadRequest({
        error: 'currency debe ser un código ISO 4217 de 3 letras (ej. "PEN").',
        code: 'INVALID_CURRENCY',
      });
    }

    // 4. Resolve the delivery channel (default URL)
    const channel: PaymentOrderChannelType = body.channel ?? 'URL';
    if (!ALLOWED_CHANNELS.includes(channel)) {
      return new HttpResponseBadRequest({
        error: `channel inválido. Valores permitidos: ${ALLOWED_CHANNELS.join(', ')}.`,
        code: 'INVALID_CHANNEL',
      });
    }

    // 5. WhatsApp delivery requires the recipient phone number
    const phone = body.phoneNumber?.trim();
    if (channel === 'WHATSAPP' && !phone) {
      return new HttpResponseBadRequest({
        error: 'Para el canal WHATSAPP se requiere phoneNumber en formato internacional (ej. +573026643546).',
        code: 'MISSING_PHONE',
      });
    }

    // 6. Build channelOptions for the chosen channel:
    //    - WHATSAPP: PayZen delivers to whatsAppOptions.phoneNumber.
    //    - URL: PayZen just returns the link (Necto delivers it).
    const channelOptions: ChannelOptions =
      channel === 'WHATSAPP'
        ? { channelType: 'WHATSAPP', whatsAppOptions: { phoneNumber: phone! } }
        : { channelType: 'URL' };

    // 7. Best-effort split of the customer name for billingDetails
    const [firstName, ...rest] = (body.customerName ?? '').trim().split(/\s+/);
    const lastName = rest.join(' ') || undefined;

    // 8. Delegate to PayZen (mock or live). Record the phone on the order too.
    try {
      const result = await this.payzen.createPaymentOrder({
        amount: body.amount,
        currency: body.currency,
        orderId: body.orderId || undefined,
        channelOptions,
        // Offer card methods so the hosted payment form always has a method to
        // display (without this the demo form is rejected as invalid, error-10).
        paymentMethods: ['VISA', 'MASTERCARD'],
        customer: {
          billingDetails: {
            firstName: firstName || undefined,
            lastName,
            cellPhoneNumber: phone || undefined,
          },
        },
        locale: body.locale ?? 'es_ES',
      });
      // 9. Persist the created order so it survives reloads and can be listed.
      //    Best-effort: a storage hiccup must not fail an already-created link.
      try {
        await this.repository.save({
          ...result.answer,
          phoneNumber: phone || undefined,
          customerName: body.customerName?.trim() || undefined,
        });
      } catch (saveErr) {
        this.logger.error('No se pudo persistir la orden en DynamoDB', {
          paymentOrderId: result.answer.paymentOrderId,
          error: saveErr instanceof Error ? saveErr : new Error(String(saveErr)),
        });
      }

      // 10. Return the created payment order (201) — answer.paymentURL is the link
      return new HttpResponseCreated(result.answer);
    } catch (err) {
      // PayZen application-level errors (e.g. feature disabled, currency) → 400
      if (err instanceof PayZenApiError) {
        return new HttpResponseBadRequest({
          error: 'PayZen rechazó la solicitud.',
          code: err.errorCode,
          detail: err.detail ?? err.message,
        });
      }
      // Misconfiguration or transport failure → 500
      const message = err instanceof Error ? err.message : 'Error desconocido';
      return new HttpResponseInternalServerError({
        error: 'No se pudo crear la orden de pago.',
        code: 'PAYZEN_ERROR',
        detail: message,
      });
    }
  }

  /**
   * GET /payment-orders — lists every persisted payment link, newest first.
   *
   * Reads the stored orders from DynamoDB and refreshes each one's status
   * against PayZen (best-effort, in parallel), re-persisting any whose status
   * changed. This powers the "active links" view so the merchant sees the live
   * state (RUNNING / PAID / EXPIRED …) without opening each link.
   */
  @Endpoint(EP.$ListPaymentOrders)
  async list(_ctx: Context) {
    // 1. Load everything we've persisted (newest first).
    let stored: StoredPaymentOrder[];
    try {
      stored = await this.repository.list();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      return new HttpResponseInternalServerError({
        error: 'No se pudieron listar las órdenes de pago.',
        code: 'STORAGE_ERROR',
        detail: message,
      });
    }

    // 2. Refresh each order's status against PayZen, in parallel (best-effort).
    //    A lookup failure keeps the last-known stored status for that order.
    const refreshed = await Promise.all(
      stored.map(async (order) => {
        try {
          const live = await this.payzen.getPaymentOrder(order.paymentOrderId);
          // Only re-persist when the status actually changed (avoid churn).
          if (live.answer.status !== order.status) {
            const updated = await this.repository.save({
              ...order,
              status: live.answer.status,
              paymentURL: live.answer.paymentURL || order.paymentURL,
              expirationDate: live.answer.expirationDate ?? order.expirationDate,
            });
            return updated;
          }
          return order;
        } catch (err) {
          // Guard: keep the stored snapshot if PayZen can't be reached or the
          // order isn't found in any shop — the listing must still render.
          this.logger.warn('No se pudo refrescar el estado de una orden', {
            paymentOrderId: order.paymentOrderId,
            error: err instanceof Error ? err : new Error(String(err)),
          });
          return order;
        }
      }),
    );

    // 3. Return the refreshed list.
    return new HttpResponseOK({ status: 'SUCCESS', answer: refreshed });
  }

  /**
   * GET /payment-orders/:paymentOrderId — returns the current status of an order.
   * Used by the UI to check whether the buyer already paid.
   */
  @Endpoint(EP.$GetPaymentOrder)
  async get(ctx: Context) {
    // 1. Read the path parameter
    const paymentOrderId = String(ctx.request.params?.paymentOrderId ?? '').trim();
    if (!paymentOrderId) {
      return new HttpResponseBadRequest({
        error: 'Falta el paymentOrderId.',
        code: 'MISSING_ID',
      });
    }

    // 2. Look up the order (tries each configured store) and return its status
    try {
      const result = await this.payzen.getPaymentOrder(paymentOrderId);
      return new HttpResponseOK(result.answer);
    } catch (err) {
      if (err instanceof PayZenApiError) {
        return new HttpResponseNotFound({
          error: 'No se encontró la orden de pago.',
          code: err.errorCode,
          detail: err.detail ?? err.message,
        });
      }
      const message = err instanceof Error ? err.message : 'Error desconocido';
      return new HttpResponseInternalServerError({
        error: 'No se pudo consultar la orden de pago.',
        code: 'PAYZEN_ERROR',
        detail: message,
      });
    }
  }
}

export default PaymentOrder;
