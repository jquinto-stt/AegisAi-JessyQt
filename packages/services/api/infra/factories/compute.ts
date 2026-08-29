/// <reference path="../../.sst/platform/config.d.ts" />

import { EcsCluster, type EcsClusterArgs } from '@webiai/sdk.infra/aws/services/EcsCluster';
import type { VpcHydrated } from '@webiai/sdk.infra/aws/vpc/Vpc';
import type { ApiGateway } from '@webiai/sdk.infra/aws/services/ApiGateway';
import type { AuthorizerRef } from '@webiai/sdk.infra/aws/services/routing';

/**
 * Compute Factory — Creates ECS Cluster + Lambda for the queue system.
 *
 * Dual compute model:
 * - ECS/Fargate: main microservice (Express) — always warm, handles turnos CRUD
 * - Lambda: lightweight operations (health check, encuestas)
 */
export interface CreateComputeConfig {
  vpc: VpcHydrated;
  gateway: ApiGateway;
  jwtAuth: AuthorizerRef;
  tableArn: any;
  tableName: any;
}

/**
 * Creates the ECS cluster for the Fargate microservice.
 */
export function createCluster(vpc: VpcHydrated) {
  const args: EcsClusterArgs = {
    vpc: {
      id: vpc.id,
      containerSubnets: vpc.privateSubnets,
      loadBalancerSubnets: vpc.publicSubnets,
      securityGroups: vpc.securityGroups,
      cloudmapNamespaceId: vpc.nodes.cloudmapNamespace.id,
      cloudmapNamespaceName: vpc.nodes.cloudmapNamespace.name,
    },
    subnets: 'private',
  };

  return new EcsCluster('TurnosCluster', args);
}

/**
 * Creates Lambda functions for lightweight operations.
 */
export function createLambdaFunctions(config: CreateComputeConfig) {
  // Health check function — simple, no VPC needed
  const healthFn = new sst.aws.Function('HealthCheck', {
    handler: 'infra/functions/health.handler',
    runtime: 'nodejs22.x',
    memory: '128 MB',
    timeout: '10 seconds',
  });

  // Encuesta function — reads/writes DynamoDB
  const encuestaFn = new sst.aws.Function('Encuesta', {
    handler: 'infra/functions/encuesta.handler',
    runtime: 'nodejs22.x',
    memory: '256 MB',
    timeout: '30 seconds',
    permissions: [
      {
        actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:Query'],
        resources: [config.tableArn],
      },
    ],
    environment: {
      TABLE_NAME: config.tableName,
    },
  });

  // Route Lambda functions through API Gateway
  config.gateway.route('GET /health', { lambda: healthFn.arn });
  config.gateway.route('POST /encuestas', { lambda: encuestaFn.arn }, { auth: config.jwtAuth });
  config.gateway.route('GET /encuestas/{turnoId}', { lambda: encuestaFn.arn }, { auth: config.jwtAuth });

  return { healthFn, encuestaFn };
}
