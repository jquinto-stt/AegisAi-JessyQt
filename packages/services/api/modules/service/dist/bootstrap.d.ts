import { type IAppController } from '@webiai/sdk.http';
import { ServiceManager, type Class } from '@webiai/sdk.ioc';
export type Setup = (sm: ServiceManager) => Promise<void>;
export declare function bootstrap(AppController: Class<IAppController>, setup?: Setup): Promise<{
    app: Express;
    services: ServiceManager;
}>;
//# sourceMappingURL=bootstrap.d.ts.map