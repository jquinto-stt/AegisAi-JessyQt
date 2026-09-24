var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Endpoint, HttpResponseOK, HttpResponseBadRequest, HttpResponseUnauthorized, HttpResponseInternalServerError, } from '@webiai/sdk.http';
import EP from '../endpoints.js';
import { firmaValida, interpretar, respuestaDeRechazo, } from '../services/ZernioWebhook.js';
import { persistirEntrante } from '../services/ZernioDAO.js';
import { procesarEntrante } from '../services/BotPedidosDAO.js';
import { esMensajePropio } from '../services/BotPedidos.js';
// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK DE ZERNIO — recepción de mensajes de WhatsApp
// ═══════════════════════════════════════════════════════════════════════════
//
// Este endpoint es la pieza que faltaba: sin él, Zernio entrega a un 500 y
// ningún mensaje llega a la bandeja. Está medido — ver Doc 06 §12.
//
// ── Las cuatro reglas que lo hacen correcto, y por qué ────────────────────
//
// 1. **PÚBLICO.** Está fuera del autorizador JWT de Cognito a propósito:
//    Zernio no tiene ese token y todo lo demás del gateway lo exige. La
//    protección aquí NO es un token de usuario, es la firma HMAC.
//
// 2. **Verifica la firma ANTES de tocar la base.** El `secret` estaba vacío en
//    el webhook registrado, así que cualquiera con la URL podía inyectar
//    mensajes falsos en la bandeja del CRM. Se verifica sobre el **cuerpo
//    crudo**, no sobre el JSON reserializado: reserializar cambia bytes (orden
//    de claves, espacios) y la firma deja de cuadrar.
//
// 3. **NUNCA devuelve 5xx por un dato malo.** Zernio reintenta ante un 5xx
//    (`attemptNumber` incrementa en su WebhookLog), y sin idempotencia cada
//    reintento duplica el mensaje. Por eso: firma mala → 401, payload malo →
//    400, evento que no nos interesa → **200** (acuse, sin reintento).
//    El único 5xx es un fallo real de NUESTRA configuración (falta el
//    secreto), y ahí sí queremos que reintente.
//
// 4. **Idempotencia.** Deduplica por `X-Zernio-Event-Id`, que el contrato
//    declara estable entre reintentos. Reintentar es normal, no un error.
//
// ═══════════════════════════════════════════════════════════════════════════
class ZernioWebhook {
    /**
     * Recepción de eventos.
     *
     * Nota: el cuerpo crudo se lee de `ctx.request.rawBody` si el framework lo
     * expone; si no, se reserializa el JSON — y en ese caso la verificación de
     * firma solo funciona si el emisor firma exactamente lo que envía. Se deja
     * dicho en el código en vez de asumirlo en silencio.
     */
    async recibir(ctx) {
        const secreto = process.env.ZERNIO_WEBHOOK_SECRET;
        // ── Lectura del cuerpo CRUDO ───────────────────────────────────────────
        const crudo = leerCrudo(ctx);
        if (crudo === null) {
            return new HttpResponseBadRequest({ error: 'cuerpo vacío o ilegible' });
        }
        // ── Firma ──────────────────────────────────────────────────────────────
        const firma = cabecera(ctx, 'x-zernio-signature');
        const verificacion = firmaValida(crudo, firma, secreto);
        if (!verificacion.ok) {
            const r = respuestaDeRechazo({ ok: false, motivo: verificacion.motivo, status: 401 });
            if (r.status === 401)
                return new HttpResponseUnauthorized(r.cuerpo);
            return new HttpResponseInternalServerError(r.cuerpo);
        }
        // ── Parseo ─────────────────────────────────────────────────────────────
        let payload;
        try {
            payload = JSON.parse(crudo);
        }
        catch {
            return new HttpResponseBadRequest({ error: 'JSON inválido' });
        }
        // ── Interpretación ─────────────────────────────────────────────────────
        const lectura = interpretar(payload, cabecera(ctx, 'x-zernio-event-id'));
        if (!lectura.ok) {
            const r = respuestaDeRechazo(lectura);
            if (r.status === 200) {
                // Evento que no consumimos (message.read, message.delivered, …).
                // Se acusa recibo para que Zernio no lo reintente: son eventos
                // legítimos que simplemente no tienen destinatario todavía.
                return new HttpResponseOK(r.cuerpo);
            }
            if (r.status === 401)
                return new HttpResponseUnauthorized(r.cuerpo);
            if (r.status >= 500)
                return new HttpResponseInternalServerError(r.cuerpo);
            return new HttpResponseBadRequest(r.cuerpo);
        }
        // ── Persistencia ───────────────────────────────────────────────────────
        const res = await persistirEntrante(lectura.mensaje);
        if (!res.ok && !res.duplicado) {
            // Aquí SÍ hay un problema real (organización no enlazada, esquema sin
            // migrar). 422 y no 500: el payload es válido pero no se puede aplicar.
            // Se devuelve el motivo para que aparezca en el log de Zernio, en vez de
            // un `{success:true}` que oculte que el mensaje se perdió.
            return new HttpResponseBadRequest({
                recibido: true,
                persistido: false,
                error: res.error,
            });
        }
        // ── Respuesta del bot ──────────────────────────────────────────────────
        //
        // Se ejecuta TAMBIÉN cuando el mensaje ya estaba guardado (`duplicado`).
        //
        // ── El defecto que esto corrige ────────────────────────────────────────
        //
        // La versión anterior devolvía 200 y cortaba aquí en cuanto veía
        // `duplicado: true`. Zernio reintenta —`attemptNumber` incrementa— y
        // cualquier entrega que llegara como reintento se guardaba y **no pasaba
        // por el bot**: el cliente escribía y nadie le contestaba, sin un solo
        // error en ningún log. El síntoma era indistinguible de «el bot no está
        // implementado».
        //
        // La guarda contra el doble envío NO es el `duplicado`, es el propio bot:
        // si ya contestó, `estado_respuesta` de `necto.conversacion` lo dice y el
        // paso 2 de `procesarEntrante` devuelve `{accion:'silencio'}`. Es decir, el
        // corte de aquí era a la vez insuficiente (dejaba sin responder los
        // reintentos) y redundante (había una guarda mejor más abajo).
        //
        // El resultado NO altera el HTTP: el mensaje del cliente ya está guardado y
        // Zernio debe recibir su 200. Devolver 4xx/5xx aquí haría que Zernio
        // reintentara el ENTRANTE —que ya está bien guardado— y el bot volvería a
        // intentar contestar en cada reintento.
        //
        // `esMensajePropio` es la última red contra el bucle: el receptor ya
        // descarta `direction: outgoing`, pero un bot que se responde a sí mismo
        // gasta saldo real y le escribe al cliente en bucle.
        const esPropio = esMensajePropio('incoming', null);
        let bot = null;
        if (!esPropio) {
            try {
                bot = await procesarEntrante(lectura.mensaje, { mensajeYaGuardado: res.duplicado });
            }
            catch (e) {
                bot = { ok: false, error: `excepción en el bot: ${e.message}` };
            }
        }
        return new HttpResponseOK({
            recibido: true,
            duplicado: res.duplicado,
            contactoId: res.contactoId,
            conversacionId: res.conversacionId,
            mensajeId: res.mensajeId,
            // Bloque informativo. `accion` dice qué hizo el bot: `responder`,
            // `pedirNumero`, `handoff`, `silencio` (ya contestado, o lo tomó un
            // humano). Ausente si no se intentó (mensaje propio).
            bot: bot
                ? bot.ok
                    ? { ok: true, accion: bot.accion, motivo: bot.motivo, mensajeId: bot.mensajeId }
                    : { ok: false, error: bot.error }
                : null,
        });
    }
}
__decorate([
    Endpoint(EP.$ZernioWebhook),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], ZernioWebhook.prototype, "recibir", null);
/** Lee una cabecera sin depender de la forma exacta del `ctx.request`. */
function cabecera(ctx, nombre) {
    const h = ctx.request.headers;
    if (!h)
        return undefined;
    const v = h[nombre] ?? h[nombre.toLowerCase()];
    return typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined;
}
/**
 * Obtiene el cuerpo CRUDO tal como llegó por el cable.
 *
 * La firma HMAC se calcula sobre los bytes exactos que Zernio envió. Si se
 * verifica sobre el resultado de un `JSON.parse` + `JSON.stringify`, cualquier
 * diferencia de formato (espacios, orden de claves, escapes) invalida una firma
 * que era correcta. Por eso se prefiere `rawBody`. Si el framework no lo da, se
 * cae al cuerpo parseado y **se deja constancia**: en ese caso la firma solo
 * valida si el emisor firmó exactamente lo que envió.
 */
function leerCrudo(ctx) {
    const req = ctx.request;
    if (typeof req.rawBody === 'string' && req.rawBody.length > 0)
        return req.rawBody;
    if (Buffer.isBuffer(req.rawBody))
        return req.rawBody.toString('utf8');
    if (req.body !== undefined && req.body !== null) {
        // Ojo: puede haber llegado ya parseado. Se reserializa como último recurso.
        return typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
    return null;
}
export default ZernioWebhook;
//# sourceMappingURL=ZernioWebhook.js.map