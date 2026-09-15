/// <reference path="../.sst/platform/config.d.ts" />

import { Env, Config } from '@webiai/sdk.core';
import { Stack } from '@webiai/sdk.infra/util/stack';
import { resources } from '@webiai/sdk.infra/util/resources';
import { DataExport } from '@webiai/sdk.infra/util/data-export';
import { SstContext } from '@webiai/sdk.infra/util/sst-context';
import { cloudCoreEnvVisitor, type CloudCoreEnv } from './env.js';
import { createVpc } from './factories/vpc.js';
import { createCognito } from './factories/cognito.js';

/**
 * CloudCore — Shared Infrastructure Stack
 *
 * Provisions and registers shared resources consumed by all other stacks:
 * - VPC (networking layer)
 * - Cognito User Pool + Client (authentication)
 *
 * Other stacks (srv.api, app.web) restore these resources via SSM.
 */
export class CloudCore extends Stack<CloudCoreEnv> {
  // --- Resource Groups ---
  readonly networking = resources<{ vpc: any }>();
  readonly auth = resources<{ userPool: any; client: any }>();

  constructor() {
    super(() => ({
      app: Env.var('SST_APP').string()!,
      stack: Env.var('SST_STACK').optional.string(),
      retain: Env.var('SST_RETAIN').optional.bool(),
      home: 'aws',
    }), cloudCoreEnvVisitor);
  }

  async run(): Promise<void> {
    await super.run();

    // Phase 1: Create networking resources
    await this.initNetworking();

    // Phase 2: Create authentication resources
    await this.initAuth();

    // Phase 3: Register all resources for cross-stack consumption
    await this.initRegister();
  }

  /**
   * Phase 1 — Networking
   *
   * Creates the project VPC with public/private subnets, NAT, and bastion.
   * All services in the project share this VPC.
   */
  private async initNetworking(): Promise<void> {
    const { name: app, stage } = SstContext.app;

    this.networking.vpc = createVpc({
      env: this.env.schema,
      appName: app,
      stageName: stage,
    });
  }

  /**
   * Phase 2 — Authentication
   *
   * Creates Cognito User Pool with groups (admin, usuario) and an App Client
   * configured for Authorization Code + PKCE (SPA flow).
   */
  private async initAuth(): Promise<void> {
    const cognito = createCognito({
      region: this.env.schema.aws.region,
    });

    this.auth.userPool = cognito.userPool;
    this.auth.client = cognito.client;
  }

  /**
   * Phase 3 — Register
   *
   * Writes all shared resources to SSM so other stacks can restore them.
   * Also creates a DataExport with auth config for the frontend.
   */
  private async initRegister(): Promise<void> {
    // Register VPC for cross-stack consumption
    this.networking.vpc.register(this);

    // Register Cognito User Pool
    this.auth.userPool.register(this);

    // Register Cognito Client
    this.auth.client.register(this);

    // DataExport: Auth config that the frontend needs
    const authConfig = new DataExport<{
      userPoolId: string;
      clientId: string;
      region: string;
    }>('AuthConfig', {
      userPoolId: this.auth.userPool.id,
      clientId: this.auth.client.clientId,
      region: this.env.schema.aws.region,
    }, {
      shared: {
        urnNamespace: ['stt', 'Core'],
        resourceName: 'Config.Auth',
        stack: 'CloudCore',
      },
    });
    authConfig.register(this);
  }
}

/**
 * Factory function — entry point for sst.config.ts
 */
export default () => {
  Config.set('settings.logger.timestamp', false);
  Config.set('settings.logger.colorize', true);
  Config.set('settings.logger.data.style', 'compact');

  return new CloudCore();
};
