/**
 * Service registration — wires the DynamoDB data layer into the ServiceManager.
 *
 * The `services` Setup builds the AWS data-access stack the payment-link feature
 * needs and registers it for dependency injection:
 *  - Region / AutoCredentials — resolved from the environment (the assumed dev
 *    role provides credentials; AWS_REGION is injected by infra/app.ts).
 *  - Document — the SDK's extended DynamoDBDocument (put + scan).
 *  - PaymentOrderRepository — persists/lists payment links in the PaymentOrders
 *    table (name from PAYMENT_ORDERS_TABLE, also injected by infra/app.ts).
 *  - SubscriptionRepository — persists/lists subscriptions in the Subscriptions
 *    table (name from SUBSCRIPTIONS_TABLE, also injected by infra/app.ts).
 *
 * Controllers pull each repository via `@dependency(RepositoryClass)`.
 *
 * Related files:
 * - PaymentOrderRepository.ts / SubscriptionRepository.ts — repos registered here
 * - controllers/PaymentOrder.ts / controllers/Subscription.ts — inject and use them
 * - infra/app.ts — injects PAYMENT_ORDERS_TABLE / SUBSCRIPTIONS_TABLE + AWS_REGION
 */
import { Env } from '@webiai/sdk.core';
import {
  Region,
  Credentials,
  AutoCredentials,
  DynamoDBClientFactory,
  Document,
  Marshaller,
} from '@webiai/sdk.aws';
import type { Setup } from '../bootstrap.js';
import { PaymentOrderRepository } from './PaymentOrderRepository.js';
import { SubscriptionRepository } from './SubscriptionRepository.js';

/**
 * Register business services (data layer, repositories) in the ServiceManager.
 */
export const services: Setup = async (sm) => {
  // 1. AWS region — from AWS_REGION (injected by infra), default us-east-1.
  const region = Env.var(['AWS_REGION', 'AWS_DEFAULT_REGION']).optional.string() ?? 'us-east-1';
  sm.set(Region, new Region(region));

  // 2. Credentials — auto-detected (assumed dev role in local, task role in prod).
  sm.set(Credentials, new AutoCredentials());

  // 3. Build the extended DynamoDB Document from the client factory + marshaller.
  const [, dynamoClient] = DynamoDBClientFactory.FACTORY.create(sm);
  const document = new Document(dynamoClient, new Marshaller());
  sm.set(Document, document);

  // 4. Payment-orders repository over the injected table name.
  const paymentOrdersTable = Env.var('PAYMENT_ORDERS_TABLE').string()!;
  sm.set(PaymentOrderRepository, new PaymentOrderRepository(document, paymentOrdersTable));

  // 5. Subscriptions repository over the injected table name.
  const subscriptionsTable = Env.var('SUBSCRIPTIONS_TABLE').string()!;
  sm.set(SubscriptionRepository, new SubscriptionRepository(document, subscriptionsTable));
};

/**
 * Register HTTP controllers in the ServiceManager.
 */
export const controllers: Setup = async (_sm) => {
  // Controllers are auto-registered by createApp if not already present.
  // Explicit registration here is only needed for controllers with
  // custom ServiceFactory or special DI configuration.
};
