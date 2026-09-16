import {
  Endpoint,
  HttpResponseOK,
  HttpResponseCreated,
  HttpResponseNoContent,
  HttpResponseBadRequest,
  HttpResponseNotFound,
  type Context,
} from '@webiai/sdk.http';
import EP from '../endpoints.js';
import { TurnosDAO, type AttentionMode } from '../services/TurnosDAO.js';

const VALID_MODES: AttentionMode[] = ['auto', 'manual'];

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
  private dao(ctx: Context): TurnosDAO {
    return ctx.sm.get(TurnosDAO);
  }

  @Endpoint(EP.$ListQueues)
  async list(ctx: Context) {
    const queues = await this.dao(ctx).listQueuesWithTickets();
    return new HttpResponseOK({ queues });
  }

  @Endpoint(EP.$CreateQueue)
  async create(ctx: Context) {
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

  @Endpoint(EP.$GetQueue)
  async get(ctx: Context) {
    const { id } = ctx.request.params;
    const queue = await this.dao(ctx).getQueueWithTickets(id);
    if (!queue) return new HttpResponseNotFound({ error: 'Queue not found' });
    return new HttpResponseOK({ queue });
  }

  @Endpoint(EP.$UpdateQueue)
  async update(ctx: Context) {
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
    if (!queue) return new HttpResponseNotFound({ error: 'Queue not found' });
    return new HttpResponseOK({ queue });
  }

  @Endpoint(EP.$DeleteQueue)
  async remove(ctx: Context) {
    const { id } = ctx.request.params;
    await this.dao(ctx).deleteQueue(id);
    return new HttpResponseNoContent();
  }
}

export default Queues;
