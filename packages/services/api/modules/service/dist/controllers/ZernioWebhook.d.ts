import { HttpResponseOK, HttpResponseBadRequest, HttpResponseUnauthorized, HttpResponseInternalServerError, type Context } from '@webiai/sdk.http';
declare class ZernioWebhook {
    /**
     * Recepción de eventos.
     *
     * Nota: el cuerpo crudo se lee de `ctx.request.rawBody` si el framework lo
     * expone; si no, se reserializa el JSON — y en ese caso la verificación de
     * firma solo funciona si el emisor firma exactamente lo que envía. Se deja
     * dicho en el código en vez de asumirlo en silencio.
     */
    recibir(ctx: Context): Promise<HttpResponseUnauthorized<unknown> | HttpResponseInternalServerError<unknown> | HttpResponseOK<unknown> | HttpResponseBadRequest<unknown>>;
}
export default ZernioWebhook;
//# sourceMappingURL=ZernioWebhook.d.ts.map