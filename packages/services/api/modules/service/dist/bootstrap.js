import { createApp } from '@webiai/sdk.http';
import { ServiceManager } from '@webiai/sdk.ioc';
export async function bootstrap(AppController, setup) {
    const serviceManager = new ServiceManager();
    await setup?.(serviceManager);
    await serviceManager.boot();
    const app = await createApp(AppController, {
        serviceManager,
    });
    return { app, services: serviceManager };
}
//# sourceMappingURL=bootstrap.js.map