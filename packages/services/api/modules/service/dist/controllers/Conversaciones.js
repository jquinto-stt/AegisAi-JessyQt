var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Endpoint, HttpResponseOK, HttpResponseBadRequest, HttpResponseUnauthorized, HttpResponseForbidden, HttpResponseNotFound, HttpResponseInternalServerError, } from '@webiai/sdk.http';
import EP from '../endpoints.js';
import { enviarComoOperador, extraerToken } from '../services/EnvioOperador.js';
// ═══════════════════════════════════════════════════════════════════════════
// CONVERSACIONES — el asesor humano responde
// ═══════════════════════════════════════════════════════════════════════════
//
// POST /conversaciones/:id/mensajes
//
// ── El defecto que esto cierra ─────────────────────────────────────────────
//
// El composer de `/conversaciones` llamaba a `enviarComoNegocio`, que escribía
// el mensaje en `localStorage` y lo pintaba en el hilo. La pantalla decía
// «enviado», el hilo lo mostraba, y **el cliente no recibía nada**. Un control
// que miente, que es lo que este proyecto no acepta entregar.
//
// ── El reparto de responsabilidades ────────────────────────────────────────
//
// Aquí NO se decide nada de negocio: se traduce HTTP → servicio. La
// autorización (sesión + `channels.respond`), la resolución del `accountId` y
// el envío viven en `EnvioOperador.js`, que es donde se pueden probar sin
// levantar un servidor.
//
// El código de estado se elige según el motivo REAL, no un 400 genérico:
//   sin_sesion / sin_permiso  → 401 / 403   (no es culpa del cuerpo)
//   sin_acceso                → 404         (no existe para él; RLS ya filtró)
//   sin_canal                 → 409         (la conversación no tiene hilo)
//   no_enviado                → 502         (Zernio no lo aceptó)
//   enviado_no_guardado       → 500         (el cliente lo tiene, la bandeja no)
// Un 500 para todo habría hecho indistinguibles cuatro problemas distintos.
class Conversaciones {
    /**
     * Un asesor responde por WhatsApp.
     *
     * Cabecera `Authorization: Bearer <jwt de Supabase>`. No se acepta la
     * `service_role` aquí: este endpoint escribe en nombre de una PERSONA y
     * tiene que poder decir quién habló.
     */
    async enviar(ctx) {
        const { id } = ctx.request.params;
        const cuerpo = ctx.request.body ?? {};
        const texto = typeof cuerpo.texto === 'string' ? cuerpo.texto : '';
        const replyTo = typeof cuerpo.replyTo === 'string' ? cuerpo.replyTo : undefined;
        const jwt = extraerToken(cabecera(ctx, 'authorization'));
        if (!jwt) {
            return new HttpResponseUnauthorized({
                error: 'Falta la cabecera Authorization con el token de sesión.',
            });
        }
        const res = await enviarComoOperador({ conversacionId: id, texto, jwt, replyTo });
        if (res.ok) {
            return new HttpResponseOK({
                enviado: true,
                messageId: res.messageId,
                mensajeId: res.mensajeId,
                enviadoEn: res.enviadoEn,
            });
        }
        const cuerpoError = { enviado: false, motivo: res.estado, error: res.error };
        switch (res.estado) {
            case 'sin_sesion':
                return new HttpResponseUnauthorized(cuerpoError);
            case 'sin_permiso':
                // El servicio distingue «tu sesión no vale» (401) de «tu rol no
                // alcanza» (403) en `res.status`. Devolver 403 siempre mandaría al
                // operador a revisar permisos cuando lo que pasa es que caducó la
                // sesión — un diagnóstico falso que cuesta una llamada a soporte.
                return res.status === 403
                    ? new HttpResponseForbidden(cuerpoError)
                    : new HttpResponseUnauthorized(cuerpoError);
            case 'sin_acceso':
                return new HttpResponseNotFound(cuerpoError);
            case 'texto_vacio':
            case 'texto_largo':
            case 'sin_conversacion':
            case 'sin_canal':
            case 'canal_desconectado':
                // No es un error de programación: la petición está bien formada y
                // lo que falta es una precondición del negocio.
                return new HttpResponseBadRequest(cuerpoError);
            case 'no_enviado':
            case 'enviado_no_guardado':
            case 'sin_configuracion':
            case 'error':
            default:
                return new HttpResponseInternalServerError(cuerpoError);
        }
    }
}
__decorate([
    Endpoint(EP.$EnviarMensajeOperador),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], Conversaciones.prototype, "enviar", null);
/** Lee una cabecera sin depender de la forma exacta del `ctx.request`. */
function cabecera(ctx, nombre) {
    const h = ctx.request.headers;
    if (!h)
        return undefined;
    const v = h[nombre] ?? h[nombre.toLowerCase()];
    return typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined;
}
export default Conversaciones;
