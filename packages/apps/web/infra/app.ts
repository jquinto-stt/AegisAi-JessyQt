/// <reference path="../.sst/platform/config.d.ts" />

import { Env, Config } from '@webiai/sdk.core';
import { Stack } from '@webiai/sdk.infra/util/stack';
import { appWebEnvVisitor, type AppWebEnv } from './env.js';

/**
 * AppWeb — Bundle Connector
 *
 * Connects executable modules with project infrastructure.
 * Restores shared resources from infrastructure artifacts and
 * deploys module-specific resources.
 */
export class AppWeb extends Stack<AppWebEnv> {
  constructor() {
    super(() => ({
      app: Env.var('SST_APP').string()!,
      stack: Env.var('SST_STACK').optional.string(),
      retain: Env.var('SST_RETAIN').optional.bool(),
      home: 'aws',
    }), appWebEnvVisitor);
  }

  async run(): Promise<void> {
    await super.run();

    // Restauración de recursos desde artifacts de infrastructure
    // (ej: importar API Gateway, VPC, clusters desplegados por cloud.core)

    // Inicialización de recursos propios del bundle
    // (ej: colas de mensajes, buckets específicos del dominio)

    // Integración con modules hijos
    // (ej: crear servicios ECS, configurar rutas de API Gateway)
  }
}

/**
 * Factory function — entry point for sst.config.ts
 */
export default () => {
  Config.set('settings.logger.timestamp', false);
  Config.set('settings.logger.colorize', true);
  Config.set('settings.logger.data.style', 'compact');

  return new AppWeb();
};
