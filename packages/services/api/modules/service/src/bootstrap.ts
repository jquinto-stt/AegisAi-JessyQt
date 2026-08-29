import { createApp, type IAppController } from '@webiai/sdk.http';
import { ServiceManager, type Class } from '@webiai/sdk.ioc';

export type Setup = (sm: ServiceManager) => Promise<void>;

export async function bootstrap(
  AppController: Class<IAppController>,
  setup?: Setup
) {
  const serviceManager = new ServiceManager();
  await setup?.(serviceManager);
  await serviceManager.boot();

  const app = await createApp(AppController, {
    serviceManager,
  });

  return { app, services: serviceManager };
}
