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
        region: app.env.schema.aws.region,
      }),
    });
  };

  export const ApiConfig = (_app: CloudCore, api: sst.aws.ApiGatewayV2) => {
    return new ssm.Parameter('Param@ApiConfig', {
      type: 'String',
      name: $interpolate`/${$app.name}/${$app.stage}/api-config`,
      value: $jsonStringify({
        apiUrl: api.url,
      }),
    });
  };
}
