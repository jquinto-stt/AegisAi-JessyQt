/// <reference path="../../.sst/platform/config.d.ts" />

import { Vpc, type VpcArgs } from '@webiai/sdk.infra/aws/vpc/Vpc';
import type { WebiAiResourceOptions } from '@webiai/sdk.infra/util/webiai-resource';
import type { CloudCoreEnv } from '../env.js';

/**
 * VPC Factory — Creates the project's shared VPC.
 *
 * Configures:
 * - 2 AZs (us-east-1a, us-east-1b)
 * - Public + private subnets
 * - NAT via ec2x1 (cost-optimized single instance, ~$3/month)
 * - Bastion host for dev tunnel access to private resources
 * - Cloud Map namespace for ECS service discovery
 */
export interface CreateVpcConfig {
  env: CloudCoreEnv;
  appName: string;
  stageName: string;
}

export function createVpc(config: CreateVpcConfig): Vpc {
  const { appName, stageName } = config;

  const args: VpcArgs = {
    networkIdentifier: '10.0',
    az: 2,
    nat: 'ec2x1',
    bastion: true,
    appName,
    stageName,
    cloudmapNamespace: 'turnos',
  };

  const opts: WebiAiResourceOptions = {
    shared: {
      urnNamespace: ['stt', 'Core'],
      resourceName: 'Vpc.Main',
      stack: 'CloudCore',
    },
  };

  return new Vpc('Main', args, opts);
}
