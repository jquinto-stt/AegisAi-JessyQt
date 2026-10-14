/// <reference path="../.sst/platform/config.d.ts" />

import * as pulumi from '@pulumi/pulumi';
import { Env, Config } from '@webiai/sdk.core';
import { Stack } from '@webiai/sdk.infra/util/stack';
import { DynamoTable } from '@webiai/sdk.infra/aws/dynamodb/Table';
import { DevBun } from '@webiai/sdk.infra/dev/DevBun';
import { coreEnvVisitor, type CoreEnv } from './env.js';

/**
 * Core — Bundle Connector
 *
 * Provisions the bundle's own AWS resources and wires the executable modules
 * to them. Currently:
 *  - A DynamoDB table (`PaymentOrders`) that persists the payment links created
 *    through the api module, so they survive navigation/reloads and can be listed.
 *  - A DynamoDB table (`Subscriptions`) that persists the Necto subscriptions
 *    created through the token-with-payment + CreateSubscription flow.
 *  - The `api` microservice runs via DevBun in dev, with the table names injected
 *    as `PAYMENT_ORDERS_TABLE` / `SUBSCRIPTIONS_TABLE` and scoped DynamoDB
 *    permissions on those tables.
 */
export class Core extends Stack<CoreEnv> {
  constructor() {
    super(() => ({
      app: Env.var('SST_APP').string()!,
      stack: Env.var('SST_STACK').optional.string(),
      retain: Env.var('SST_RETAIN').optional.bool(),
      home: 'aws',
    }), coreEnvVisitor);
  }

  async run(): Promise<void> {
    await super.run();

    // 1. Payment-orders table — partition key is the PayZen paymentOrderId.
    const paymentOrders = new DynamoTable('PaymentOrders', {
      fields: { paymentOrderId: 'string' },
      primaryIndex: { hashKey: 'paymentOrderId' },
    });

    // 2. Subscriptions table — partition key is our subscriptionId.
    const subscriptions = new DynamoTable('Subscriptions', {
      fields: { subscriptionId: 'string' },
      primaryIndex: { hashKey: 'subscriptionId' },
    });

    // 3. Run the `api` microservice (dev mode) with the tables wired in:
    //    - PAYMENT_ORDERS_TABLE / SUBSCRIPTIONS_TABLE: physical names read at runtime
    //    - permissions: scoped DynamoDB access on both tables (+ their indexes)
    const dynamoActions = [
      'dynamodb:PutItem',
      'dynamodb:GetItem',
      'dynamodb:UpdateItem',
      'dynamodb:Query',
      'dynamodb:Scan',
      'dynamodb:PartiQLSelect',
    ];
    DevBun.create('Api', () => this.local, () => ({
      cwd: './modules/api',
      entry: './src/main.ts',
      watch: true,
      port: 8080,
      environment: {
        PAYMENT_ORDERS_TABLE: paymentOrders.name,
        SUBSCRIPTIONS_TABLE: subscriptions.name,
        AWS_REGION: this.env.schema.aws.region,
      },
      permissions: [
        {
          actions: dynamoActions,
          resources: [paymentOrders.arn, pulumi.interpolate`${paymentOrders.arn}/index/*`],
        },
        {
          actions: dynamoActions,
          resources: [subscriptions.arn, pulumi.interpolate`${subscriptions.arn}/index/*`],
        },
      ],
    }));
  }
}

/**
 * Factory function — entry point for sst.config.ts
 */
export default () => {
  Config.set('settings.logger.timestamp', false);
  Config.set('settings.logger.colorize', true);
  Config.set('settings.logger.data.style', 'compact');

  return new Core();
};
