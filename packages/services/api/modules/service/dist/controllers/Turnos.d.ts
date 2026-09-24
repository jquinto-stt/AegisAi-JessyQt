import { HttpResponseOK, HttpResponseCreated, HttpResponseNoContent, HttpResponseBadRequest, HttpResponseNotFound, HttpResponseConflict, type Context } from '@webiai/sdk.http';
/**
 * Turnos controller — ticket operations within a queue.
 *
 * POST   /queues/:id/turnos          — create a ticket (called by the WhatsApp bot)
 * POST   /queues/:id/call-next       — manual: call the next waiting ticket
 * POST   /queues/:id/finish          — finish current serving (body { advance })
 * PATCH  /queues/:id/turnos/:numero  — move ticket to another state (body { to })
 * DELETE /queues/:id/turnos/:numero  — no-show: remove ticket
 */
declare class Turnos {
    private dao;
    create(ctx: Context): Promise<HttpResponseBadRequest<{
        error: string;
    }> | HttpResponseNotFound<{
        error: string;
    }> | HttpResponseCreated<{
        ticket: import("../services/TurnosDAO.js").Ticket;
    }>>;
    callNext(ctx: Context): Promise<HttpResponseConflict<{
        error: string;
    }> | HttpResponseOK<{
        ticket: import("../services/TurnosDAO.js").Ticket;
    }>>;
    finish(ctx: Context): Promise<HttpResponseConflict<{
        error: string;
    }> | HttpResponseOK<{
        finished: import("../services/TurnosDAO.js").Ticket | null;
        next: import("../services/TurnosDAO.js").Ticket | null;
    }>>;
    move(ctx: Context): Promise<HttpResponseBadRequest<{
        error: string;
    }> | HttpResponseConflict<{
        error: string;
    }> | HttpResponseOK<{
        ticket: import("../services/TurnosDAO.js").Ticket;
    }>>;
    remove(ctx: Context): Promise<HttpResponseNoContent>;
}
export default Turnos;
//# sourceMappingURL=Turnos.d.ts.map