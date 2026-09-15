import type { EnvVisitor } from '@webiai/sdk.infra/util/stack-env';

/**
 * Environment schema for the AppWeb stack.
 *
 * Variables come from: process.env → app-level SSM → stack-level SSM.
 */
export interface AppWebEnv {
  local: boolean;
  aws: {
    region: string;
  };
}

/**
 * Visitor that transforms raw env vars into the typed schema.
 */
export const appWebEnvVisitor: EnvVisitor<AppWebEnv> = (env) => ({
  local: env.SST_LOCAL?.optional.bool() ?? false,
  aws: {
    region: env.AWS_REGION?.optional.string() ?? 'us-east-1',
  },
});
