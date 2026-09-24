import { Path, Method } from '@webiai/sdk.http';
var EP;
(function (EP) {
    //!PATH - Root
    EP.Root$ = new Path('/');
    //?ENDPOINT - Health check
    EP.$Health = EP.Root$.sub('/health').endpoint(Method.GET);
    // ══════════════════════════════════════════════════════════════════════
    //!PATH - Webhook de Zernio (recepción de WhatsApp)
    // ══════════════════════════════════════════════════════════════════════
    //
    // Ruta PÚBLICA, fuera del autorizador JWT a propósito: Zernio no tiene ese
    // token. La protección es la firma HMAC, verificada en el controlador.
    //
    // Si esta línea desaparece, el receptor devuelve 404 y desde el log de
    // Zernio se lee como «el receptor no existe» — que es indistinguible de un
    // túnel roto. Es lo que pasaba antes de retirarla del build.
    EP.$ZernioWebhook = EP.Root$.sub('/webhooks/zernio').endpoint(Method.POST);
    // ══════════════════════════════════════════════════════════════════════
    //!PATH - Conversaciones (bandeja del operador)
    // ══════════════════════════════════════════════════════════════════════
    //
    // Ruta AUTENTICADA por su propio controlador, no por el gateway.
    //
    // El gateway de este servicio no valida JWT (el webhook de arriba es
    // público a propósito y no hay autorizador global), así que el controlador
    // verifica la sesión y el permiso él mismo. Está escrito en el servicio
    // `EnvioOperador.js`: se pregunta a `necto.tengo('channels.respond')` con el
    // token del operador, que es la MISMA función que usan las políticas RLS.
    //
    // Existe porque el único que escribía hacia WhatsApp era el bot: el composer
    // del asesor guardaba en `localStorage` y el mensaje no salía del navegador.
    EP.Conversaciones$ = EP.Root$.sub('/conversaciones');
    EP.ConversacionById$ = EP.Conversaciones$.sub({ id: 'id' }, (p) => `/:${p.id}`);
    EP.ConversacionMensajes$ = EP.ConversacionById$.sub('/mensajes');
    /** Un asesor responde por WhatsApp dentro de una conversación. */
    EP.$EnviarMensajeOperador = EP.ConversacionMensajes$.endpoint(Method.POST);

    // ══════════════════════════════════════════════════════════════════════
    //!PATH - Queues (colas)
    // ══════════════════════════════════════════════════════════════════════
    EP.Queues$ = EP.Root$.sub('/queues');
    EP.QueueById$ = EP.Queues$.sub({ id: 'id' }, (p) => `/:${p.id}`);
    //?ENDPOINT - Queues CRUD
    EP.$ListQueues = EP.Queues$.endpoint(Method.GET);
    EP.$CreateQueue = EP.Queues$.endpoint(Method.POST);
    EP.$GetQueue = EP.QueueById$.endpoint(Method.GET);
    EP.$UpdateQueue = EP.QueueById$.endpoint(Method.PATCH);
    EP.$DeleteQueue = EP.QueueById$.endpoint(Method.DELETE);
    // ══════════════════════════════════════════════════════════════════════
    //!PATH - Tickets (turnos) — nested under a queue
    // ══════════════════════════════════════════════════════════════════════
    EP.Turnos$ = EP.QueueById$.sub('/turnos');
    EP.TurnoByNum$ = EP.Turnos$.sub({ numero: 'numero' }, (p) => `/:${p.numero}`);
    //?ENDPOINT - Ticket operations
    /** Create a ticket in a queue (called by the WhatsApp bot). */
    EP.$CreateTurno = EP.Turnos$.endpoint(Method.POST);
    /** Manual: call the next waiting ticket. */
    EP.$CallNext = EP.QueueById$.sub('/call-next').endpoint(Method.POST);
    /** Finish current serving (body { advance: boolean }). */
    EP.$Finish = EP.QueueById$.sub('/finish').endpoint(Method.POST);
    /** Move a ticket to another state (body { to: TicketState }). */
    EP.$MoveTurno = EP.TurnoByNum$.endpoint(Method.PATCH);
    /** No-show: remove a ticket. */
    EP.$RemoveTurno = EP.TurnoByNum$.endpoint(Method.DELETE);
})(EP || (EP = {}));
export default EP;
//# sourceMappingURL=endpoints.js.map