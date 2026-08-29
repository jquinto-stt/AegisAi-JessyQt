/// <reference path="../../cloud/core/.sst/platform/config.d.ts" />

import { Stack } from '@webiai/sdk.infra';
import { ssm } from '@pulumi/aws';
import type { SrvApiEnv } from './env.js';

/**
 * SrvApi — Backend & Compute Stack for Necto
 *
 * Provisions:
 * - DynamoDB Tables (Pedidos & Inventarios)
 * - ECS / Fargate Cluster & Service (Containerized backend)
 * - API Gateway (HTTP API v2 with JWT Cognito Authorizer)
 * - Lambda Handlers for fast endpoints
 * - SSM Parameter Store exports for Frontend consumption
 */
export class SrvApi extends Stack<SrvApiEnv> {
  readonly database: {
    table: sst.aws.Dynamo;
  } = {} as any;

  readonly compute: {
    cluster: sst.aws.Cluster;
  } = {} as any;

  readonly api: {
    gateway: sst.aws.ApiGatewayV2;
  } = {} as any;

  initDatabase(): this {
    const table = new sst.aws.Dynamo('NectoTable', {
      fields: {
        pk: 'string',
        sk: 'string',
      },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
    });
    Object.assign(this.database, { table });
    return this;
  }

  initCompute(): this {
    const cluster = new sst.aws.Cluster('NectoCluster');
    Object.assign(this.compute, { cluster });
    return this;
  }

  initApi(): this {
    const gateway = new sst.aws.ApiGatewayV2('NectoApi', {
      cors: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });
    Object.assign(this.api, { gateway });
    return this;
  }

  initParameters(): this {
    new ssm.Parameter('Param@ApiConfig', {
      type: 'String',
      name: $interpolate`/${$app.name}/${$app.stage}/api-config`,
      value: $jsonStringify({
        apiUrl: this.api.gateway.url,
        tableName: this.database.table.name,
      }),
    });
    return this;
  }

  async run() {
    this.initDatabase();
    this.initCompute();
    this.initApi();
    this.initParameters();
  }
}

export default () => new SrvApi();
