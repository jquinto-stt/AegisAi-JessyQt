/// <reference path="../../.sst/platform/config.d.ts" />

import { ssm } from '@pulumi/aws';
import type { CloudCore } from '../app.js';
import type { Auth } from './auth.js';

export namespace Params {
  export const ProjectInfo = (_app: CloudCore) => {
    return new ssm.Parameter('Param@ProjectInfo', {
      type: 'String',
      name: $interpolate`/${$app.name}/${$app.stage}/project-info`,
      value: JSON.stringify({
        name: 'necto',
        version: '1.0.0',
        platform: 'Enterprise Inventory & Orders Management',
      }),
    });
  };

  export const AuthConfig = (
    app: CloudCore,
    userPool: sst.aws.CognitoUserPool,
    client: Auth.ClientType,
  ) => {
    return new ssm.Parameter('Param@AuthConfig', {
      type: 'String',
      name: $interpolate`/${$app.name}/${$app.stage}/auth-config`,
      value: $jsonStringify({
        userPoolId: userPool.id,
        clientId: client.id,
        region: (app.env as any)?.schema?.aws?.region ?? 'us-east-1',
      }),
    });
  };

  export const InventariosConfig = (_app: CloudCore, api: sst.aws.ApiGatewayV2) => {
    return new ssm.Parameter('Param@InventariosConfig', {
      type: 'String',
      name: $interpolate`/${$app.name}/${$app.stage}/inventarios-config`,
      value: $jsonStringify({
        apiUrl: api.url,
      }),
    });
  };

  export const PedidosConfig = (_app: CloudCore, api: sst.aws.ApiGatewayV2) => {
    return new ssm.Parameter('Param@PedidosConfig', {
      type: 'String',
      name: $interpolate`/${$app.name}/${$app.stage}/pedidos-config`,
      value: $jsonStringify({
        apiUrl: api.url,
      }),
    });
  };
}
