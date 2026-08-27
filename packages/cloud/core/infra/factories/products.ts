/// <reference path="../../.sst/platform/config.d.ts" />

import type { CloudCore } from '../app.js';

/**
 * Products slice — infrastructure factory.
 *
 * Provisions:
 * - DynamoDB table (per-owner partitioned: pk=ownerId, sk=productId)
 * - HTTP API (API Gateway v2) protected by a Cognito JWT authorizer
 * - GET/POST /products routes backed by Lambda handlers
 *
 * IAM least-privilege is achieved via SST resource linking (`link: [table]`):
 * each function receives only the DynamoDB actions it needs on this table.
 */
export namespace Products {
  export const Table = (_app: CloudCore) => {
    return new sst.aws.Dynamo('Products@Table', {
      fields: {
        pk: 'string', // ownerId (Cognito sub)
        sk: 'string', // productId (uuid)
      },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
    });
  };

  export const Api = (
    app: CloudCore,
    table: sst.aws.Dynamo,
    userPool: sst.aws.CognitoUserPool,
    client: sst.aws.CognitoUserPoolClient,
  ) => {
    const region = app.env.schema.aws.region;

    const api = new sst.aws.ApiGatewayV2('Products@Api', {
      cors: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Cognito JWT authorizer — validates the id token against the user pool.
    const jwt = api.addAuthorizer({
      name: 'cognito',
      jwt: {
        issuer: $interpolate`https://cognito-idp.${region}.amazonaws.com/${userPool.id}`,
        audiences: [client.id],
      },
    });

    const auth = { auth: { jwt: { authorizer: jwt.id } } };

    // Routes will be active once IAM permissions are granted by DevOps
    // api.route(
    //   'GET /products',
    //   { handler: 'infra/handlers/products.list', link: [table] },
    //   auth,
    // );
    // api.route(
    //   'POST /products',
    //   { handler: 'infra/handlers/products.create', link: [table] },
    //   auth,
    // );

    return api;
  };
}
