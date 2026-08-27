/// <reference path="../.sst/platform/config.d.ts" />

import { Env, Config } from '@webiai/sdk.core';
import { Stack } from '@webiai/sdk.infra/util/stack';
import { ssm } from '@pulumi/aws';
import { cloudCoreEnvVisitor, type CloudCoreEnv } from './env.js';
import { Auth, Params, Products } from './factories/index.js';

/**
 * CloudCore — Infrastructure Stack
 *
 * Deploys shared infrastructure resources for StockFlow:
 * - Cognito User Pool + Client (authentication)
 * - Products: DynamoDB table + HTTP API (Lambda GET/POST)
 * - SSM Parameters (cross-stack exports)
 */
export class CloudCore extends Stack<CloudCoreEnv> {
  readonly auth: {
    userPool: sst.aws.CognitoUserPool;
    client: Auth.ClientType;
  } = {} as any;

  readonly products: {
    table: sst.aws.Dynamo;
    api: sst.aws.ApiGatewayV2;
  } = {} as any;

  readonly params: {
    projectInfo: ssm.Parameter;
    authConfig: ssm.Parameter;
    apiConfig: ssm.Parameter;
  } = {} as any;

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
    await this.initAuth();
    await this.initProducts();
    await this.initParameters();
  }

  private async initAuth(): Promise<void> {
    this.auth.userPool = Auth.UserPool(this);
    this.auth.client = Auth.Client(this, this.auth.userPool);
  }

  private async initProducts(): Promise<void> {
    this.products.table = Products.Table(this);
    this.products.api = Products.Api(
      this,
      this.products.table,
      this.auth.userPool,
      this.auth.client,
    );
  }

  private async initParameters(): Promise<void> {
    this.params.projectInfo = Params.ProjectInfo(this);
    this.params.authConfig = Params.AuthConfig(this, this.auth.userPool, this.auth.client);
    this.params.apiConfig = Params.ApiConfig(this, this.products.api);
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
