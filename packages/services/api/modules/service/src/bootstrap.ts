import { createApp, type CreateAppOptions, type IAppController } from '@webiai/sdk.http';
import { ServiceManager, type Class } from '@webiai/sdk.ioc';

export type Setup = (sm: ServiceManager) => Promise<void>;

/**
 * Arranca la aplicación.
 *
 * `options` se reenvía a `createApp` tal cual salvo el `serviceManager`, que lo pone
 * este módulo. Existe para poder registrar `preMiddlewares`: son los únicos que
 * corren **antes** del parser JSON de `createApp`, y hay uno que tiene que ir ahí
 * obligatoriamente — el que conserva el cuerpo crudo del webhook de WhatsApp, sin el
 * cual no se puede verificar la firma de Meta (ver `whatsapp/raw-body.ts`).
 */
export async function bootstrap(
  AppController: Class<IAppController>,
  setup?: Setup,
  options?: Omit<CreateAppOptions, 'serviceManager'>
) {
  const serviceManager = new ServiceManager();
  await setup?.(serviceManager);
  await serviceManager.boot();

  const app = await createApp(AppController, {
    ...options,
    serviceManager,
  });

  return { app, services: serviceManager };
}
