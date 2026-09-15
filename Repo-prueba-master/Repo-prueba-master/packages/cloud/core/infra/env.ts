import type { EnvVisitor } from '@webiai/sdk.infra/util/stack-env';

/**
 * Environment schema for the CloudCore stack.
 *
 * Variables come from: process.env → app-level SSM → stack-level SSM.
 */
export interface CloudCoreEnv {
  local: boolean;
  aws: {
    region: string;
  };
}

/**
 * Visitor that transforms raw env vars into the typed schema.
 */
export const cloudCoreEnvVisitor: EnvVisitor<CloudCoreEnv> = (env) => ({
  local: env.SST_LOCAL?.optional.bool() ?? false,
  aws: {
    region: env.AWS_REGION?.optional.string() ?? 'us-east-1',
  },
});
