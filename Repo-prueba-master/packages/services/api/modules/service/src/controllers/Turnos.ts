import {
  Endpoint,
  HttpResponseOK,
  HttpResponseCreated,
  HttpResponseNoContent,
  HttpResponseBadRequest,
  HttpResponseNotFound,
  HttpResponseConflict,
  type Context,
} from '@webiai/sdk.http';
import EP from '../endpoints.js';
import { TurnosDAO, type TicketState } from '../services/TurnosDAO.js';

const VALID_STATES: TicketState[] = ['waiting', 'serving', 'done'];

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
  private dao(ctx: Context): TurnosDAO {
    return ctx.sm.get(TurnosDAO);
  }

  @Endpoint(EP.$CreateTurno)
  async create(ctx: Context) {
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
    if (!queue) return new HttpResponseNotFound({ error: 'Queue not found' });
    const datosObj: Record<string, string> = (datos && typeof datos === 'object') ? datos : {};
    for (const field of queue.campos) {
      if (field.required && !String(datosObj[field.id] ?? '').trim()) {
        return new HttpResponseBadRequest({ error: `El campo "${field.label}" es obligatorio` });
      }
    }

    const ticket = await this.dao(ctx).createTicket(id, { cliente, telefono, datos: datosObj });
    if (!ticket) return new HttpResponseNotFound({ error: 'Queue not found' });
    return new HttpResponseCreated({ ticket });
  }

  @Endpoint(EP.$CallNext)
  async callNext(ctx: Context) {
    const { id } = ctx.request.params;
    const ticket = await this.dao(ctx).callNext(id);
    if (!ticket) {
      return new HttpResponseConflict({
        error: 'No hay turno para llamar (ya se atiende uno o no hay en espera)',
      });
    }
    return new HttpResponseOK({ ticket });
  }

  @Endpoint(EP.$Finish)
  async finish(ctx: Context) {
    const { id } = ctx.request.params;
    const advance = Boolean(ctx.request.body?.advance);
    const result = await this.dao(ctx).finish(id, advance);
    if (!result.finished) {
      return new HttpResponseConflict({ error: 'No hay turno en atencion' });
    }
    return new HttpResponseOK(result);
  }

  @Endpoint(EP.$MoveTurno)
  async move(ctx: Context) {
    const { id, numero } = ctx.request.params;
    const to = ctx.request.body?.to as TicketState | undefined;
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

  @Endpoint(EP.$RemoveTurno)
  async remove(ctx: Context) {
    const { id, numero } = ctx.request.params;
    await this.dao(ctx).removeTicket(id, numero);
    return new HttpResponseNoContent();
  }
}

export default Turnos;
