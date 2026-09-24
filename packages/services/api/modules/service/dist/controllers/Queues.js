var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Endpoint, HttpResponseOK, HttpResponseCreated, HttpResponseNoContent, HttpResponseBadRequest, HttpResponseNotFound, } from '@webiai/sdk.http';
import EP from '../endpoints.js';
import { TurnosDAO } from '../services/TurnosDAO.js';
const VALID_MODES = ['auto', 'manual'];
/**
 * Queues controller — CRUD for colas.
 *
 * GET    /queues        — list all queues with their tickets
 * POST   /queues        — create a queue
 * GET    /queues/:id    — get one queue with its tickets
 * PATCH  /queues/:id    — update (nombre, servicio, mode, tiempoProm, activa)
 * DELETE /queues/:id    — delete a queue and its tickets
 */
class Queues {
    dao(ctx) {
        return ctx.sm.get(TurnosDAO);
    }
    async list(ctx) {
        const queues = await this.dao(ctx).listQueuesWithTickets();
        return new HttpResponseOK({ queues });
    }
    async create(ctx) {
        const { nombre, servicio, mode, tiempoProm, color, campos } = ctx.request.body ?? {};
        if (!nombre || typeof nombre !== 'string') {
            return new HttpResponseBadRequest({ error: 'nombre is required' });
        }
        if (mode && !VALID_MODES.includes(mode)) {
            return new HttpResponseBadRequest({ error: 'mode must be auto | manual' });
        }
        const queue = await this.dao(ctx).createQueue({
            nombre,
            servicio: servicio ?? 'general',
            mode: mode ?? 'auto',
            tiempoProm: Number(tiempoProm) || 10,
            color,
            campos: Array.isArray(campos) ? campos : undefined,
        });
        return new HttpResponseCreated({ queue });
    }
    async get(ctx) {
        const { id } = ctx.request.params;
        const queue = await this.dao(ctx).getQueueWithTickets(id);
        if (!queue)
            return new HttpResponseNotFound({ error: 'Queue not found' });
        return new HttpResponseOK({ queue });
    }
    async update(ctx) {
        const { id } = ctx.request.params;
        const { nombre, servicio, mode, tiempoProm, activa, campos } = ctx.request.body ?? {};
        if (mode && !VALID_MODES.includes(mode)) {
            return new HttpResponseBadRequest({ error: 'mode must be auto | manual' });
        }
        const queue = await this.dao(ctx).updateQueue(id, {
            nombre,
            servicio,
            mode,
            tiempoProm: tiempoProm !== undefined ? Number(tiempoProm) : undefined,
            activa,
            campos: Array.isArray(campos) ? campos : undefined,
        });
        if (!queue)
            return new HttpResponseNotFound({ error: 'Queue not found' });
        return new HttpResponseOK({ queue });
    }
    async remove(ctx) {
        const { id } = ctx.request.params;
        await this.dao(ctx).deleteQueue(id);
        return new HttpResponseNoContent();
    }
}
__decorate([
    Endpoint(EP.$ListQueues),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], Queues.prototype, "list", null);
__decorate([
    Endpoint(EP.$CreateQueue),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], Queues.prototype, "create", null);
__decorate([
    Endpoint(EP.$GetQueue),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], Queues.prototype, "get", null);
__decorate([
    Endpoint(EP.$UpdateQueue),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], Queues.prototype, "update", null);
__decorate([
    Endpoint(EP.$DeleteQueue),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], Queues.prototype, "remove", null);
export default Queues;
//# sourceMappingURL=Queues.js.map