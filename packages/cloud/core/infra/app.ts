/// <reference path="../.sst/platform/config.d.ts" />

import { Stack } from '@webiai/sdk.infra';
import type { CloudCoreEnv } from './env.js';
import { Auth, Inventarios, Pedidos, Params } from './factories/index.js';

/**
 * CloudCore — Infrastructure Stack for Necto
 *
 * Deploys infrastructure resources for Necto:
 * - Cognito User Pool + Client (authentication)
 * - Inventarios: DynamoDB table + HTTP API
 * - Pedidos: DynamoDB table + HTTP API
 * - SSM Parameters (cross-stack exports)
 */
export class CloudCore extends Stack<CloudCoreEnv> {
  readonly auth: {
    userPool: sst.aws.CognitoUserPool;
    client: Auth.ClientType;
  } = {} as any;

  readonly inventarios: {
    table: sst.aws.Dynamo;
    api: sst.aws.ApiGatewayV2;
  } = {} as any;

  readonly pedidos: {
    table: sst.aws.Dynamo;
    api: sst.aws.ApiGatewayV2;
  } = {} as any;

  initAuth(): this {
    const userPool = Auth.UserPool(this);
    const client = Auth.Client(this, userPool);
    Object.assign(this.auth, { userPool, client });
    return this;
  }

  initInventarios(): this {
    const table = Inventarios.Table(this);
    const api = Inventarios.Api(this, table, this.auth.userPool, this.auth.client);
    Object.assign(this.inventarios, { table, api });
    return this;
  }

  initPedidos(): this {
    const table = Pedidos.Table(this);
    const api = Pedidos.Api(this, table, this.auth.userPool, this.auth.client);
    Object.assign(this.pedidos, { table, api });
    return this;
  }

  initParameters(): this {
    Params.ProjectInfo(this);
    Params.AuthConfig(this, this.auth.userPool, this.auth.client);
    Params.InventariosConfig(this, this.inventarios.api);
    Params.PedidosConfig(this, this.pedidos.api);
    return this;
  }

  async run() {
    this.initAuth();
    this.initInventarios();
    this.initPedidos();
    this.initParameters();
  }
}

export default () => new CloudCore();

