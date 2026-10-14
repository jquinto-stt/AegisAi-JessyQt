/**
 * PaymentOrderRepository — DynamoDB persistence for PayZen payment links.
 *
 * Payment links created via PayZen are ephemeral in the UI: navigating away or
 * reloading loses them. This repository persists each created order in the
 * `PaymentOrders` DynamoDB table so links survive reloads and can be listed with
 * their latest status. The physical table name is injected at runtime as the
 * `PAYMENT_ORDERS_TABLE` env var (wired in infra/app.ts via DevBun).
 *
 * It stores the normalized `PaymentOrder` shape (paymentOrderId is the partition
 * key) plus a `savedAt` timestamp used to order the listing newest-first.
 *
 * Persistence goes through the SDK data layer (`@webiai/sdk.aws`):
 *  - `Document` — an extended DynamoDBDocument (put + scan).
 * The AWS credentials come from the assumed dev role (see infra permissions).
 *
 * Related files:
 * - services/index.ts — builds the Document + registers this repo in the ServiceManager
 * - services/payzen/types.ts — the PaymentOrder shape persisted here
 * - controllers/PaymentOrder.ts — saves on create and lists via this repo
 * - infra/app.ts — creates the table and injects PAYMENT_ORDERS_TABLE + IAM perms
 */
import type { Document } from '@webiai/sdk.aws';
import type { PaymentOrder } from './payzen/types.js';

/**
 * A persisted payment order — the normalized PaymentOrder plus bookkeeping
 * fields used only for storage/listing (not returned verbatim by PayZen).
 */
export interface StoredPaymentOrder extends PaymentOrder {
  /** Buyer phone captured at creation (WhatsApp channel), for the listing UI. */
  phoneNumber?: string;
  /** Human label for the buyer, if provided at creation. */
  customerName?: string;
  /** ISO-8601 timestamp of when Necto saved/updated this record. */
  savedAt: string;
}

/**
 * Repository over the `PaymentOrders` DynamoDB table.
 *
 * Uses `paymentOrderId` as the partition key. `save()` is an upsert (DynamoDB
 * `put` overwrites by key), which doubles as a status refresh when re-saving an
 * order fetched from PayZen.
 */
export class PaymentOrderRepository {
  constructor(
    private readonly doc: Document,
    private readonly tableName: string,
  ) {}

  /**
   * Upserts a payment order into DynamoDB.
   *
   * Stamps `savedAt` with the current time so the listing can sort newest-first.
   * Because DynamoDB `put` replaces the whole item by key, calling this again
   * for the same `paymentOrderId` also serves to refresh a persisted status.
   *
   * @param order - The normalized payment order (+ optional buyer metadata)
   * @returns The stored record (with `savedAt` applied)
   */
  async save(order: PaymentOrder & { phoneNumber?: string; customerName?: string }): Promise<StoredPaymentOrder> {
    // Build the item to persist: the normalized order + storage bookkeeping.
    const item: StoredPaymentOrder = {
      ...order,
      savedAt: new Date().toISOString(),
    };

    await this.doc.put({ TableName: this.tableName, Item: item });
    return item;
  }

  /**
   * Lists every persisted payment order, newest first.
   *
   * Uses a DynamoDB `scan` (the dataset is small — a demo gateway). We prefer
   * `scan` over PartiQL here because the document client marshals the returned
   * items reliably, whereas the PartiQL `iterable()` path proved brittle with
   * this item shape. Pages are followed via `LastEvaluatedKey`; results are
   * sorted in memory by `savedAt` descending.
   *
   * @returns All stored orders ordered by save time (newest first)
   */
  async list(): Promise<StoredPaymentOrder[]> {
    const items: StoredPaymentOrder[] = [];

    // 1. Page through the whole table with scan (small dataset).
    let lastKey: Record<string, unknown> | undefined;
    do {
      const page = await this.doc.scan({
        TableName: this.tableName,
        ExclusiveStartKey: lastKey,
      });
      items.push(...((page.Items ?? []) as StoredPaymentOrder[]));
      lastKey = page.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);

    // 2. Sort newest-first for the UI.
    return items.sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? ''));
  }
}
