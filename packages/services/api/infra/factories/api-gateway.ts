/// <reference path="../../.sst/platform/config.d.ts" />

import { ApiGateway, type ApiGatewayArgs, type JwtAuthorizerArgs } from '@webiai/sdk.infra/aws/services/ApiGateway';
import type { WebiAiResourceOptions } from '@webiai/sdk.infra/util/webiai-resource';
import type { VpcHydrated } from '@webiai/sdk.infra/aws/vpc/Vpc';
import type { CognitoUserPoolHydrated } from '@webiai/sdk.infra/aws/cognito/UserPool';
import type { Input } from '@pulumi/pulumi';

/**
 * API Gateway Factory — Creates HTTP API for the queue system.
 *
 * Features:
 * - VPC Link for private ECS integration (CloudMap routes)
 * - JWT authorizer via Cognito User Pool
 * - CORS configured for frontend origins
 * - Routes to Lambda and Fargate
 */
export interface CreateApiGatewayConfig {
  vpc: VpcHydrated;
  userPool: CognitoUserPoolHydrated;
  clientId: string;
}

export function createApiGateway(config: CreateApiGatewayConfig) {
  const { vpc, userPool } = config;

  const args: ApiGatewayArgs = {
    vpc: {
      securityGroups: vpc.securityGroups,
      subnets: vpc.privateSubnets,
    },
    cors: {
      allowOrigins: ['http://localhost:5173'] as Input<string>[],
      allowHeaders: ['Content-Type', 'Authorization'] as Input<string>[],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] as Input<string>[],
      allowCredentials: true,
    },
  };

  const opts: WebiAiResourceOptions = {
    shared: {
      urnNamespace: ['stt', 'Api'],
      resourceName: 'ApiGateway.Main',
      stack: 'SrvApi',
    },
  };

  const gateway = new ApiGateway('TurnosApi', args, opts);

  // JWT Authorizer backed by Cognito
  const authorizerArgs: JwtAuthorizerArgs = {
    type: 'JWT',
    jwt: {
      audiences: [config.clientId],
      issuer: `https://cognito-idp.${userPool.region}.amazonaws.com/${userPool.id}`,
    },
  };

  const jwtAuth = gateway.authorizer('CognitoAuth', authorizerArgs);

  return { gateway, jwtAuth };
}
