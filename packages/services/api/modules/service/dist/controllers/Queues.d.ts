import { HttpResponseOK, HttpResponseCreated, HttpResponseNoContent, HttpResponseBadRequest, HttpResponseNotFound, type Context } from '@webiai/sdk.http';
/**
 * Queues controller — CRUD for colas.
 *
 * GET    /queues        — list all queues with their tickets
 * POST   /queues        — create a queue
 * GET    /queues/:id    — get one queue with its tickets
 * PATCH  /queues/:id    — update (nombre, servicio, mode, tiempoProm, activa)
 * DELETE /queues/:id    — delete a queue and its tickets
 */
declare class Queues {
    private dao;
    list(ctx: Context): Promise<HttpResponseOK<{
        queues: import("../services/TurnosDAO.js").QueueWithTickets[];
    }>>;
    create(ctx: Context): Promise<HttpResponseBadRequest<{
        error: string;
    }> | HttpResponseCreated<{
        queue: import("../services/TurnosDAO.js").Queue;
    }>>;
    get(ctx: Context): Promise<HttpResponseNotFound<{
        error: string;
    }> | HttpResponseOK<{
        queue: import("../services/TurnosDAO.js").QueueWithTickets;
    }>>;
    update(ctx: Context): Promise<HttpResponseBadRequest<{
        error: string;
    }> | HttpResponseNotFound<{
        error: string;
    }> | HttpResponseOK<{
        queue: import("../services/TurnosDAO.js").Queue;
    }>>;
    remove(ctx: Context): Promise<HttpResponseNoContent>;
}
export default Queues;
//# sourceMappingURL=Queues.d.ts.map