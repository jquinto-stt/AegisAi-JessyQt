import type { EnvVisitor } from '@webiai/sdk.infra/util/stack-env';

/**
 * Environment schema for the CloudCore stack.
 */
export interface CloudCoreEnv {
  local: boolean;
  aws: {
    region: string;
  };
}

/**
 * Visitor that transforms raw env vars into typed schema.
 *
 * Receives merged variables from: process.env → app-level SSM → stack-level SSM.
 */
export const cloudCoreEnvVisitor: EnvVisitor<CloudCoreEnv> = (env) => ({
  local: env.SST_LOCAL?.optional.bool() ?? false,
  aws: {
    region: env.AWS_REGION?.optional.string() ?? 'us-east-1',
  },
});
