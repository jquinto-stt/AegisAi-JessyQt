import {
  Endpoint,
  HttpResponseBadRequest,
  HttpResponseForbidden,
  HttpResponseOK,
  HttpResponseInternalServerError,
  HttpResponseServiceUnavailable,
  type Context,
} from '@webiai/sdk.http';
import EP from '../endpoints.js';
import { whatsAppSecrets } from '../whatsapp/config.js';
import { parseInboundMessages } from '../whatsapp/events.js';
import { rawBodyOf } from '../whatsapp/raw-body.js';
import { safeEquals, SIGNATURE_HEADER, verifyMetaSignature } from '../whatsapp/signature.js';
import { whatsAppStore } from '../whatsapp/store.js';
import type { WhatsAppWebhookPayload } from '../whatsapp/types.js';

/**
 * Webhook de WhatsApp Cloud API.
 *
 * Es la **entrega** del canal: por aquí entran los mensajes de los clientes. El
 * canal no interpreta nada ni es dueño de ningún pedido — normaliza lo que Meta
 * manda, lo atribuye a una tienda y lo deja guardado. Quién lo atiende después
 * (el asistente, Pedidos, Clientes) es de otro dominio.
 *
 * ⚠️ La URL del webhook es **pública por necesidad** (Meta tiene que poder
 * llamarla), así que la firma no es opcional: es lo único que distingue una entrega
 * real de la de cualquiera que conozca la URL.
 */
class Webhooks {
  /**
   * Alta del webhook.
   *
   * Meta llama **una vez** al configurarlo con `hub.mode=subscribe`,
   * `hub.verify_token` y `hub.challenge`, y espera que le devolvamos el challenge
   * **en crudo** para dar el webhook por bueno. Sin token configurado no hay forma
   * de distinguir a Meta de un tercero, así que se falla en lugar de aceptar a
   * ciegas.
   */
  @Endpoint(EP.$WhatsAppVerify)
  async verifyWhatsApp(ctx: Context) {
    const { verifyToken } = whatsAppSecrets();

    const mode = String(ctx.request.query?.['hub.mode'] ?? '');
    const token = String(ctx.request.query?.['hub.verify_token'] ?? '');
    const challenge = String(ctx.request.query?.['hub.challenge'] ?? '');

    if (!verifyToken) {
      return new HttpResponseInternalServerError({ error: 'WHATSAPP_VERIFY_TOKEN no configurado' });
    }
    if (mode !== 'subscribe' || !safeEquals(token, verifyToken)) {
      return new HttpResponseForbidden({ error: 'verificación rechazada' });
    }
    return new HttpResponseOK(challenge);
  }

  /**
   * Entrega de eventos.
   *
   * El orden es deliberado: **primero la firma**, y sólo después el contenido. Al
   * sobre no se le toca nada hasta que está verificado.
   */
  @Endpoint(EP.$WhatsAppReceive)
  async receiveWhatsApp(ctx: Context) {
    const { appSecret } = whatsAppSecrets();
    const rawBody = rawBodyOf(ctx.request);

    // El cuerpo crudo no es opcional: sin él no hay nada sobre lo que calcular la
    // firma. Que falte significa que el middleware que lo captura no está montado
    // (`captureWhatsAppRawBody` en `preMiddlewares`) — un fallo de despliegue, no
    // una petición mala. Se responde 500 para que Meta reintente.
    if (!rawBody) {
      return new HttpResponseInternalServerError({ error: 'cuerpo crudo no disponible' });
    }

    if (!verifyMetaSignature(rawBody, ctx.request.get(SIGNATURE_HEADER), appSecret)) {
      return new HttpResponseForbidden({ error: 'firma inválida' });
    }

    if (ctx.request.body === undefined) {
      return new HttpResponseBadRequest({ error: 'JSON inválido' });
    }

    const incoming = parseInboundMessages(ctx.request.body as WhatsAppWebhookPayload);

    const store = whatsAppStore();
    if (!store) {
      // Sin almacén los mensajes se perderían en silencio. Se responde 503 para que
      // Meta **reintente** en lugar de dar la entrega por buena: es preferible un
      // webhook que confiesa que no guarda a uno que traga y pierde.
      return new HttpResponseServiceUnavailable({ error: 'almacén de mensajes no configurado' });
    }

    let saved = 0;
    let duplicated = 0;
    let unattributed = 0;

    for (const message of incoming) {
      // El índice `phoneNumberId → tienda` es lo que convierte un webhook anónimo en
      // un mensaje atribuible. Si el número no está vinculado no se inventa la
      // tienda: el mensaje se cuenta aparte y se descarta.
      const link = await store.findChannelLink(message.phoneNumberId);
      if (!link) {
        unattributed++;
        continue;
      }

      const stored = await store.saveInboundMessage({ ...message, businessId: link.businessId });
      if (stored) saved++;
      else duplicated++;
    }

    // 200 aunque no se haya guardado nada: Meta reintenta ante un 5xx, y un mensaje
    // que no se puede atribuir no se arregla reintentándolo.
    return new HttpResponseOK({ received: incoming.length, saved, duplicated, unattributed });
  }
}

export default Webhooks;
