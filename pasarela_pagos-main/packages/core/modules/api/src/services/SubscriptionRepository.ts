/**
 * SubscriptionRepository — DynamoDB persistence for Necto subscriptions.
 *
 * Subscriptions are created through the token-with-payment flow (PayZen
 * `Charge/CreatePayment` REGISTER_PAY → `Charge/CreateSubscription`). This
 * repository persists each created subscription in the `Subscriptions` DynamoDB
 * table so they survive reloads and can be listed. The physical table name is
 * injected at runtime as the `SUBSCRIPTIONS_TABLE` env var (wired in
 * infra/app.ts via DevBun).
 *
 * It stores the normalized `Subscription` shape (subscriptionId is the partition
 * key) plus the chosen plan metadata and a `savedAt` timestamp used to order the
 * listing newest-first.
 *
 * Persistence goes through the SDK data layer (`@webiai/sdk.aws`):
 *  - `Document` — an extended DynamoDBDocument (put + scan).
 * The AWS credentials come from the assumed dev role (see infra permissions).
 *
 * Related files:
 * - services/index.ts — builds the Document + registers this repo in the ServiceManager
 * - services/payzen/types.ts — the Subscription shape persisted here
 * - controllers/Subscription.ts — saves on create and lists via this repo
 * - infra/app.ts — creates the table and injects SUBSCRIPTIONS_TABLE + IAM perms
 */
import type { Document } from '@webiai/sdk.aws';
import type { Subscription } from './payzen/types.js';

/**
 * A persisted subscription — the normalized Subscription plus the chosen plan's
 * metadata and a save timestamp (bookkeeping used only for storage/listing).
 */
export interface StoredSubscription extends Subscription {
  /** Human label for the chosen plan (e.g. "Plan 3 servicios"). */
  planName?: string;
  /** Number of Necto services included in the chosen plan (1–4). */
  serviceCount?: number;
  /** Billing cycle chosen at checkout: "monthly" | "yearly" | "daily". */
  billingCycle?: string;
  /** Buyer display name, if provided at checkout. */
  customerName?: string;
  /** Buyer email captured for tokenization, if provided. */
  customerEmail?: string;
  /** ISO-8601 timestamp of when Necto saved/updated this record. */
  savedAt: string;
}

/** Extra plan/buyer metadata attached when saving a subscription. */
export interface SubscriptionMeta {
  planName?: string;
  serviceCount?: number;
  billingCycle?: string;
  customerName?: string;
  customerEmail?: string;
}

/**
 * Repository over the `Subscriptions` DynamoDB table.
 *
 * Uses `subscriptionId` as the partition key. `save()` is an upsert (DynamoDB
 * `put` overwrites by key).
 */
export class SubscriptionRepository {
  constructor(
    private readonly doc: Document,
    private readonly tableName: string,
  ) {}

  /**
   * Upserts a subscription into DynamoDB.
   *
   * Stamps `savedAt` with the current time so the listing can sort newest-first.
   *
   * @param subscription - The normalized subscription
   * @param meta - The chosen plan + buyer metadata to persist alongside
   * @returns The stored record (with `savedAt` applied)
   */
  async save(subscription: Subscription, meta: SubscriptionMeta = {}): Promise<StoredSubscription> {
    // Build the item to persist: the normalized subscription + plan/buyer meta.
    const item: StoredSubscription = {
      ...subscription,
      ...meta,
      savedAt: new Date().toISOString(),
    };

    await this.doc.put({ TableName: this.tableName, Item: item });
    return item;
  }

  /**
   * Lists every persisted subscription, newest first.
   *
   * Uses a DynamoDB `scan` (the dataset is small — a demo gateway), paging via
   * `LastEvaluatedKey`, then sorts in memory by `savedAt` descending.
   *
   * @returns All stored subscriptions ordered by save time (newest first)
   */
  async list(): Promise<StoredSubscription[]> {
    const items: StoredSubscription[] = [];

    // 1. Page through the whole table with scan (small dataset).
    let lastKey: Record<string, unknown> | undefined;
    do {
      const page = await this.doc.scan({
        TableName: this.tableName,
        ExclusiveStartKey: lastKey,
      });
      items.push(...((page.Items ?? []) as StoredSubscription[]));
      lastKey = page.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);

    // 2. Sort newest-first for the UI.
    return items.sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? ''));
  }
}
