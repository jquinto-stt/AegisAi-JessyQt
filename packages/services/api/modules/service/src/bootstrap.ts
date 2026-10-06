import { createApp, type IAppController } from '@webiai/sdk.http';
import { ServiceManager, type Class } from '@webiai/sdk.ioc';
import { Config } from '@webiai/sdk.core';

Config.set('settings.bodyParser.limit', '50mb');

export type Setup = (sm: ServiceManager) => Promise<void>;

export async function bootstrap(
  AppController: Class<IAppController>,
  setup?: Setup
) {
  Config.set('settings.bodyParser.limit', '50mb');
  const serviceManager = new ServiceManager();
  await setup?.(serviceManager);
  await serviceManager.boot();

  const app = await createApp(AppController, {
    serviceManager,
  });

  return { app, services: serviceManager };
}
