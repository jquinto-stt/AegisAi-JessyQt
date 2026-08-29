import type { EnvVisitor } from '@webiai/sdk.core';

/**
 * Environment schema for the SrvApi stack.
 */
export interface SrvApiEnv {
  local: boolean;
  aws: {
    region: string;
  };
  service: {
    port: number;
  };
}

export const srvApiEnvVisitor: EnvVisitor<SrvApiEnv> = (env) => ({
  local: env.SST_LOCAL?.optional.bool() ?? false,
  aws: {
    region: env.AWS_REGION?.optional.string() ?? 'us-east-1',
  },
  service: {
    port: env.SERVICE_PORT?.optional.number() ?? 8080,
  },
});
