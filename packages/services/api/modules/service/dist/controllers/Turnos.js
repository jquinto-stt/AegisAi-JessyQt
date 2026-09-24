var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Endpoint, HttpResponseOK, HttpResponseCreated, HttpResponseNoContent, HttpResponseBadRequest, HttpResponseNotFound, HttpResponseConflict, } from '@webiai/sdk.http';
import EP from '../endpoints.js';
import { TurnosDAO } from '../services/TurnosDAO.js';
const VALID_STATES = ['waiting', 'serving', 'done'];
/**
 * Turnos controller — ticket operations within a queue.
 *
 * POST   /queues/:id/turnos          — create a ticket (called by the WhatsApp bot)
 * POST   /queues/:id/call-next       — manual: call the next waiting ticket
 * POST   /queues/:id/finish          — finish current serving (body { advance })
 * PATCH  /queues/:id/turnos/:numero  — move ticket to another state (body { to })
 * DELETE /queues/:id/turnos/:numero  — no-show: remove ticket
 */
class Turnos {
    dao(ctx) {
        return ctx.sm.get(TurnosDAO);
    }
    async create(ctx) {
        const { id } = ctx.request.params;
        const { cliente, telefono, datos } = ctx.request.body ?? {};
        if (!cliente || typeof cliente !== 'string') {
            return new HttpResponseBadRequest({ error: 'cliente is required' });
        }
        if (!telefono || typeof telefono !== 'string' || telefono.trim().length < 7) {
            return new HttpResponseBadRequest({ error: 'telefono es obligatorio' });
        }
        // Validate the queue's required custom fields are present.
        const queue = await this.dao(ctx).getQueueWithTickets(id);
        if (!queue)
            return new HttpResponseNotFound({ error: 'Queue not found' });
        const datosObj = (datos && typeof datos === 'object') ? datos : {};
        for (const field of queue.campos) {
            if (field.required && !String(datosObj[field.id] ?? '').trim()) {
                return new HttpResponseBadRequest({ error: `El campo "${field.label}" es obligatorio` });
            }
        }
        const ticket = await this.dao(ctx).createTicket(id, { cliente, telefono, datos: datosObj });
        if (!ticket)
            return new HttpResponseNotFound({ error: 'Queue not found' });
        return new HttpResponseCreated({ ticket });
    }
    async callNext(ctx) {
        const { id } = ctx.request.params;
        const ticket = await this.dao(ctx).callNext(id);
        if (!ticket) {
            return new HttpResponseConflict({
                error: 'No hay turno para llamar (ya se atiende uno o no hay en espera)',
            });
        }
        return new HttpResponseOK({ ticket });
    }
    async finish(ctx) {
        const { id } = ctx.request.params;
        const advance = Boolean(ctx.request.body?.advance);
        const result = await this.dao(ctx).finish(id, advance);
        if (!result.finished) {
            return new HttpResponseConflict({ error: 'No hay turno en atencion' });
        }
        return new HttpResponseOK(result);
    }
    async move(ctx) {
        const { id, numero } = ctx.request.params;
        const to = ctx.request.body?.to;
        if (!to || !VALID_STATES.includes(to)) {
            return new HttpResponseBadRequest({ error: 'to must be waiting | serving | done' });
        }
        const ticket = await this.dao(ctx).moveTicket(id, numero, to);
        if (!ticket) {
            return new HttpResponseConflict({
                error: 'No se pudo mover (turno inexistente o ya hay uno en atencion)',
            });
        }
        return new HttpResponseOK({ ticket });
    }
    async remove(ctx) {
        const { id, numero } = ctx.request.params;
        await this.dao(ctx).removeTicket(id, numero);
        return new HttpResponseNoContent();
    }
}
__decorate([
    Endpoint(EP.$CreateTurno),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], Turnos.prototype, "create", null);
__decorate([
    Endpoint(EP.$CallNext),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], Turnos.prototype, "callNext", null);
__decorate([
    Endpoint(EP.$Finish),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], Turnos.prototype, "finish", null);
__decorate([
    Endpoint(EP.$MoveTurno),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], Turnos.prototype, "move", null);
__decorate([
    Endpoint(EP.$RemoveTurno),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], Turnos.prototype, "remove", null);
export default Turnos;
//# sourceMappingURL=Turnos.js.map