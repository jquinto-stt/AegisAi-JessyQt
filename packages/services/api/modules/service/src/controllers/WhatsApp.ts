import {
  Endpoint,
  HttpResponseOK,
  HttpResponseInternalServerError,
} from '@webiai/sdk.http';
import EP from '../endpoints.js';
import { WhatsAppBaileysService } from '../services/WhatsAppBaileysService.js';

export default class WhatsAppController {
  @Endpoint(EP.$WhatsAppStatus)
  async getStatus() {
    try {
      const service = WhatsAppBaileysService.getInstance();
      const info = service.getEstadoActual();
      return new HttpResponseOK({
        ok: true,
        ...info,
      });
    } catch (err: any) {
      return new HttpResponseInternalServerError({
        ok: false,
        error: err.message,
      });
    }
  }

  @Endpoint(EP.$WhatsAppDisconnect)
  async disconnect() {
    try {
      const service = WhatsAppBaileysService.getInstance();
      await service.desconectar();
      return new HttpResponseOK({
        ok: true,
        mensaje: "WhatsApp desconectado.",
      });
    } catch (err: any) {
      return new HttpResponseInternalServerError({
        ok: false,
        error: err.message,
      });
    }
  }
}
