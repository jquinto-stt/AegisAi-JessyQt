/// <reference path="../.sst/platform/config.d.ts" />

import { Env, Config } from '@webiai/sdk.core';
import { Stack } from '@webiai/sdk.infra/util/stack';
import { resources } from '@webiai/sdk.infra/util/resources';
import { DataExport } from '@webiai/sdk.infra/util/data-export';
import { SstContext } from '@webiai/sdk.infra/util/sst-context';
import { Vpc, type VpcHydrated } from '@webiai/sdk.infra/aws/vpc/Vpc';
import { CognitoUserPool, type CognitoUserPoolHydrated } from '@webiai/sdk.infra/aws/cognito/UserPool';
import { CognitoUserPoolClient, type CognitoUserPoolClientHydrated } from '@webiai/sdk.infra/aws/cognito/UserPoolClient';
import { srvApiEnvVisitor, type SrvApiEnv } from './env.js';
import { createTurnosTable } from './factories/database.js';
import { createApiGateway } from './factories/api-gateway.js';
import { createCluster, createLambdaFunctions } from './factories/compute.js';

/**
 * SrvApi — Backend Service Stack
 *
 * Restores shared resources from cloud.core and creates:
 * - DynamoDB table (turnos + encuestas, single-table)
 * - API Gateway HTTP API (with JWT auth via Cognito)
 * - ECS/Fargate cluster (microservice Express)
 * - Lambda functions (health check, encuestas)
 *
 * Registers the API URL for the frontend to consume.
 */
export class SrvApi extends Stack<SrvApiEnv> {
  // --- Resource Groups ---
  readonly shared = resources<{ vpc: any; userPool: any; client: any }>();
  readonly database = resources<{ table: any }>();
  readonly compute = resources<{ cluster: any; healthFn: any; encuestaFn: any }>();
  readonly api = resources<{ gateway: any; jwtAuth: any }>();

  constructor() {
    super(() => ({
      app: Env.var('SST_APP').string()!,
      stack: Env.var('SST_STACK').optional.string(),
      retain: Env.var('SST_RETAIN').optional.bool(),
      home: 'aws',
    }), srvApiEnvVisitor);
  }

  async run(): Promise<void> {
    await super.run();

    // Phase 1: Restore shared resources from cloud.core
    await this.initRestoreShared();

    // Phase 2: Create database
    await this.initDatabase();

    // Phase 3: Create API Gateway with auth
    await this.initApiGateway();

    // Phase 4: Create compute (ECS cluster + Lambdas)
    await this.initCompute();

    // Phase 5: Configure Fargate service routes
    await this.initRouting();

    // Phase 6: Register API URL for frontend
    await this.initRegister();
  }

  /**
   * Phase 1 — Restore Shared Resources
   *
   * Reads VPC and Cognito from SSM (registered by cloud.core).
   */
  private async initRestoreShared(): Promise<void> {
    this.shared.vpc = await Vpc.restoreFrom(this, {
      urnNamespace: ['stt', 'Core'],
      resourceName: 'Vpc.Main',
      stack: 'CloudCore',
    });

    this.shared.userPool = await CognitoUserPool.restoreFrom(this, {
      urnNamespace: ['stt', 'Core'],
      resourceName: 'Cognito.UserPool',
      stack: 'CloudCore',
    });

    this.shared.client = await CognitoUserPoolClient.restoreFrom(this, {
      urnNamespace: ['stt', 'Core'],
      resourceName: 'Cognito.Client',
      stack: 'CloudCore',
    });
  }

  /**
   * Phase 2 — Database
   *
   * Creates the DynamoDB table for turnos and encuestas.
   */
  private async initDatabase(): Promise<void> {
    this.database.table = createTurnosTable({ onDemand: true });
  }

  /**
   * Phase 3 — API Gateway
   *
   * Creates the HTTP API with VPC Link and JWT authorizer.
   */
  private async initApiGateway(): Promise<void> {
    const { gateway, jwtAuth } = createApiGateway({
      vpc: this.shared.vpc as VpcHydrated,
      userPool: this.shared.userPool as CognitoUserPoolHydrated,
      clientId: (this.shared.client as CognitoUserPoolClientHydrated).clientId,
    });

    this.api.gateway = gateway;
    this.api.jwtAuth = jwtAuth;
  }

  /**
   * Phase 4 — Compute
   *
   * Creates ECS cluster for the microservice and Lambda functions
   * for lightweight operations.
   */
  private async initCompute(): Promise<void> {
    // ECS Cluster for the Fargate microservice
    this.compute.cluster = createCluster(this.shared.vpc as VpcHydrated);

    // Lambda functions (health + encuestas)
    const { healthFn, encuestaFn } = createLambdaFunctions({
      vpc: this.shared.vpc as VpcHydrated,
      gateway: this.api.gateway,
      jwtAuth: this.api.jwtAuth,
      tableArn: this.database.table.arn,
      tableName: this.database.table.name,
    });

    this.compute.healthFn = healthFn;
    this.compute.encuestaFn = encuestaFn;
  }

  /**
   * Phase 5 — Routing
   *
   * Configures the Fargate service and routes turnos endpoints
   * through API Gateway via CloudMap (VPC Link).
   */
  private async initRouting(): Promise<void> {
    const isDev = SstContext.dev;

    // In dev mode the microservice runs locally (Bun) and API Gateway cannot
    // route to localhost. The Fargate/CloudMap routes are only wired in a real
    // deployment where the ECS service is registered in the CloudMap namespace.
    if (isDev) {
      return;
    }

    // Production: ECS Service registered in CloudMap, routes via VPC Link.
    // The microservice exposes /turnos/* and /queues/* endpoints.
    this.api.gateway.route('ANY /turnos/{proxy+}', {
      cloudMap: {
        serviceName: 'turnos-service',
        namespace: 'turnos',
      },
    }, { auth: this.api.jwtAuth });

    this.api.gateway.route('ANY /queues/{proxy+}', {
      cloudMap: {
        serviceName: 'turnos-service',
        namespace: 'turnos',
      },
    }, { auth: this.api.jwtAuth });
  }

  /**
   * Phase 6 — Register
   *
   * Exports the API URL and table name for other stacks to consume.
   */
  private async initRegister(): Promise<void> {
    // Register API Gateway for cross-stack consumption
    this.api.gateway.register(this);

    // DataExport: API config for the frontend
    const apiConfig = new DataExport<{
      apiUrl: string;
      tableName: string;
    }>('ApiConfig', {
      apiUrl: this.api.gateway.url,
      tableName: this.database.table.name,
    }, {
      shared: {
        urnNamespace: ['stt', 'Api'],
        resourceName: 'Config.Api',
        stack: 'SrvApi',
      },
    });
    apiConfig.register(this);
  }
}

/**
 * Factory function — entry point for sst.config.ts
 */
export default () => {
  Config.set('settings.logger.timestamp', false);
  Config.set('settings.logger.colorize', true);
  Config.set('settings.logger.data.style', 'compact');

  return new SrvApi();
};
