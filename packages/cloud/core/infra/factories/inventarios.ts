/// <reference path="../../.sst/platform/config.d.ts" />

import type { CloudCore } from '../app.js';
import type { Auth } from './auth.js';

/**
 * Necto Inventarios Slice — Infrastructure Factory
 *
 * Provisions:
 * - DynamoDB Table: Single-table design for inventory items and templates
 *   pk: string (TENANT#<id> or OWNER#<id>)
 *   sk: string (ITEM#<id> or TEMPLATE#<id>)
 * - HTTP API (API Gateway v2) protected by Cognito JWT Authorizer
 */
export namespace Inventarios {
  export const Table = (_app: CloudCore) => {
    return new sst.aws.Dynamo('Inventarios@Table', {
      fields: {
        pk: 'string',
        sk: 'string',
      },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
    });
  };

  export const Api = (
    app: CloudCore,
    _table: sst.aws.Dynamo,
    userPool: sst.aws.CognitoUserPool,
    client: Auth.ClientType,
  ) => {
    const region = (app.env as any)?.schema?.aws?.region ?? 'us-east-1';

    const api = new sst.aws.ApiGatewayV2('Inventarios@Api', {
      cors: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    const jwt = api.addAuthorizer({
      name: 'cognito',
      jwt: {
        issuer: $interpolate`https://cognito-idp.${region}.amazonaws.com/${userPool.id}`,
        audiences: [client.id],
      },
    });

    const _auth = { auth: { jwt: { authorizer: jwt.id } } };

    // Routes (linked to DynamoDB table)
    // api.route('GET /inventarios', { handler: 'infra/handlers/inventarios.list', link: [_table] }, _auth);
    // api.route('POST /inventarios', { handler: 'infra/handlers/inventarios.create', link: [_table] }, _auth);
    // api.route('PATCH /inventarios/{id}/status', { handler: 'infra/handlers/inventarios.updateStatus', link: [_table] }, _auth);

    return api;
  };
}
