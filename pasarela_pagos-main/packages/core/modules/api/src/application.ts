import { Controller, DetectGateway, type IAppController } from '@webiai/sdk.http';
import type { Class } from '@webiai/sdk.ioc';

export function AppController(controllers: Class[]): Class<IAppController> {
  @DetectGateway()
  @Controller('/')
  class App implements IAppController {
    readonly subControllers: Class[] = controllers;
  }
  return App;
}
