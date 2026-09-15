import { Path, Method } from '@webiai/sdk.http';

namespace EP {
  //!PATH - Root
  export const Root$ = new Path('/');

  //?ENDPOINT - Health check
  export const $Health = Root$.sub('/health').endpoint(Method.GET);

  //!PATH - WhatsApp Cloud API webhook
  export const WhatsApp$ = Root$.sub('/webhooks/whatsapp');

  //?ENDPOINT - Alta del webhook: Meta manda hub.challenge y espera que se lo devolvamos
  export const $WhatsAppVerify = WhatsApp$.endpoint(Method.GET);

  //?ENDPOINT - Entrega de eventos, firmada con X-Hub-Signature-256
  export const $WhatsAppReceive = WhatsApp$.endpoint(Method.POST);
}

export default EP;
