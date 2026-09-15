import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

// ═══════════════════════════════════════════════════════════════════════════
// DOMAIN TYPES  (mirror the frontend store contract — see frontend-handoff doc)
// ═══════════════════════════════════════════════════════════════════════════

export type TicketState = 'waiting' | 'serving' | 'done';
export type AttentionMode = 'auto' | 'manual';
export type FieldType = 'text' | 'textarea' | 'number' | 'select';

/** A custom field the operator/bot must fill when creating a ticket in this queue. */
export interface CustomField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // only for type 'select'
}

export interface Queue {
  id: string;
  nombre: string;
  color: string;
  servicio: string;
  mode: AttentionMode;
  tiempoProm: number;
  activa: boolean;
  campos: CustomField[]; // per-queue custom fields for ticket creation
}

export interface Ticket {
  numero: string;
  cliente: string;
  telefono?: string;      // used by the WhatsApp bot to notify the client
  estado: TicketState;
  createdAt: string;
  calledAt?: string;
  finishedAt?: string;
  datos?: Record<string, string>; // values for the queue's custom fields
}

/** A queue with its tickets grouped by state (shape the frontend consumes). */
export interface QueueWithTickets extends Queue {
  waiting: Ticket[];
  serving: Ticket[];
  done: Ticket[];
}

// ═══════════════════════════════════════════════════════════════════════════
// KEY HELPERS  (single-table design on TurnosTable)
// ═══════════════════════════════════════════════════════════════════════════

const COLOR_OPTIONS = [
  'bg-brand-500',
  'bg-secondary-500',
  'bg-accent-500',
  'bg-warning-500',
  'bg-success-500',
];

const queuePk = (queueId: string) => `QUEUE#${queueId}`;
const queueMetaSk = 'META';
const ticketSk = (numero: string) => `TURNO#${numero}`;
const isTicketSk = (sk: string) => sk.startsWith('TURNO#');

interface QueueItem {
  pk: string;
  sk: string;
  type: 'QUEUE';
  id: string;
  nombre: string;
  color: string;
  servicio: string;
  mode: AttentionMode;
  tiempoProm: number;
  activa: boolean;
  seq: number; // monotonic counter for ticket numbering
  campos?: CustomField[];
}

interface TicketItem {
  pk: string;
  sk: string;
  type: 'TICKET';
  numero: string;
  cliente: string;
  telefono?: string;
  estado: TicketState;
  createdAt: string;
  calledAt?: string;
  finishedAt?: string;
  datos?: Record<string, string>;
  gsi1pk: string; // QUEUE#{id}
  gsi1sk: string; // STATE#{estado}#{createdAt}
}

// ═══════════════════════════════════════════════════════════════════════════
// DAO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * TurnosDAO — single-table DynamoDB access for queues (colas) and tickets (turnos).
 *
 * Item shapes on TurnosTable:
 *   Queue metadata: pk=QUEUE#{id}  sk=META
 *   Ticket:         pk=QUEUE#{id}  sk=TURNO#{numero}   gsi1pk=QUEUE#{id} gsi1sk=STATE#{estado}#{createdAt}
 */
export class TurnosDAO {
  private readonly doc: DynamoDBDocumentClient;
  private readonly table: string;

  constructor() {
    const client = new DynamoDBClient({});
    this.doc = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
    const table = process.env.TABLE_NAME;
    if (!table) throw new Error('TABLE_NAME env var is required');
    this.table = table;
  }

  // ── Mapping ──
  private toQueue(item: QueueItem): Queue {
    return {
      id: item.id,
      nombre: item.nombre,
      color: item.color,
      servicio: item.servicio,
      mode: item.mode,
      tiempoProm: item.tiempoProm,
      activa: item.activa,
      campos: item.campos ?? [],
    };
  }

  private toTicket(item: TicketItem): Ticket {
    return {
      numero: item.numero,
      cliente: item.cliente,
      telefono: item.telefono,
      estado: item.estado,
      createdAt: item.createdAt,
      calledAt: item.calledAt,
      finishedAt: item.finishedAt,
      datos: item.datos,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // QUEUES
  // ═══════════════════════════════════════════════════════════════════════

  async listQueues(): Promise<Queue[]> {
    // Scan-free listing via a marker item would need a GSI; for a small-business
    // scale we query each queue by its known partition. We keep a registry item.
    const res = await this.doc.send(new QueryCommand({
      TableName: this.table,
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: { ':pk': 'REGISTRY#QUEUES' },
    }));
    const ids = (res.Items ?? []).map((i) => i.id as string);
    const queues = await Promise.all(ids.map((id) => this.getQueueMeta(id)));
    return queues.filter((q): q is Queue => q !== null);
  }

  private async getQueueMeta(queueId: string): Promise<Queue | null> {
    const res = await this.doc.send(new GetCommand({
      TableName: this.table,
      Key: { pk: queuePk(queueId), sk: queueMetaSk },
    }));
    return res.Item ? this.toQueue(res.Item as QueueItem) : null;
  }

  async getQueueWithTickets(queueId: string): Promise<QueueWithTickets | null> {
    const res = await this.doc.send(new QueryCommand({
      TableName: this.table,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': queuePk(queueId) },
    }));
    const items = res.Items ?? [];
    const metaItem = items.find((i) => i.sk === queueMetaSk) as QueueItem | undefined;
    if (!metaItem) return null;

    const tickets = items
      .filter((i) => isTicketSk(i.sk as string))
      .map((i) => this.toTicket(i as TicketItem))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return {
      ...this.toQueue(metaItem),
      waiting: tickets.filter((t) => t.estado === 'waiting'),
      serving: tickets.filter((t) => t.estado === 'serving'),
      done: tickets.filter((t) => t.estado === 'done'),
    };
  }

  async listQueuesWithTickets(): Promise<QueueWithTickets[]> {
    const queues = await this.listQueues();
    const full = await Promise.all(queues.map((q) => this.getQueueWithTickets(q.id)));
    return full.filter((q): q is QueueWithTickets => q !== null);
  }

  async createQueue(data: {
    nombre: string;
    servicio: string;
    mode: AttentionMode;
    tiempoProm: number;
    color?: string;
    campos?: CustomField[];
  }): Promise<Queue> {
    const id = randomUUID();
    const existing = await this.listQueues();
    const color = data.color ?? COLOR_OPTIONS[existing.length % COLOR_OPTIONS.length];

    const item: QueueItem = {
      pk: queuePk(id),
      sk: queueMetaSk,
      type: 'QUEUE',
      id,
      nombre: data.nombre,
      color,
      servicio: data.servicio,
      mode: data.mode,
      tiempoProm: data.tiempoProm,
      activa: true,
      seq: 0,
      campos: data.campos ?? [],
    };

    await this.doc.send(new PutCommand({ TableName: this.table, Item: item }));

    // Registry entry so listQueues can find it via gsi1
    await this.doc.send(new PutCommand({
      TableName: this.table,
      Item: {
        pk: `REGISTRY#QUEUES`,
        sk: queuePk(id),
        id,
        gsi1pk: 'REGISTRY#QUEUES',
        gsi1sk: `QUEUE#${data.nombre}`,
      },
    }));

    return this.toQueue(item);
  }

  async updateQueue(queueId: string, data: {
    nombre?: string;
    servicio?: string;
    mode?: AttentionMode;
    tiempoProm?: number;
    activa?: boolean;
    campos?: CustomField[];
  }): Promise<Queue | null> {
    const sets: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val === undefined) continue;
      sets.push(`#${key} = :${key}`);
      names[`#${key}`] = key;
      values[`:${key}`] = val;
    }
    if (sets.length === 0) return this.getQueueMeta(queueId);

    const res = await this.doc.send(new UpdateCommand({
      TableName: this.table,
      Key: { pk: queuePk(queueId), sk: queueMetaSk },
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(pk)',
      ReturnValues: 'ALL_NEW',
    }));
    return res.Attributes ? this.toQueue(res.Attributes as QueueItem) : null;
  }

  async deleteQueue(queueId: string): Promise<void> {
    // Delete all items in the partition + registry entry
    const res = await this.doc.send(new QueryCommand({
      TableName: this.table,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': queuePk(queueId) },
    }));
    await Promise.all((res.Items ?? []).map((i) =>
      this.doc.send(new DeleteCommand({
        TableName: this.table,
        Key: { pk: i.pk, sk: i.sk },
      })),
    ));
    await this.doc.send(new DeleteCommand({
      TableName: this.table,
      Key: { pk: 'REGISTRY#QUEUES', sk: queuePk(queueId) },
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TICKETS (turnos)
  // ═══════════════════════════════════════════════════════════════════════

  /** Create a ticket in `waiting` — called by the WhatsApp bot OR the operator view. */
  async createTicket(
    queueId: string,
    data: { cliente: string; telefono?: string; datos?: Record<string, string> },
  ): Promise<Ticket | null> {
    const meta = await this.getQueueMeta(queueId);
    if (!meta) return null;

    // Increment the queue seq counter for ticket numbering (e.g. A-043)
    const bumped = await this.doc.send(new UpdateCommand({
      TableName: this.table,
      Key: { pk: queuePk(queueId), sk: queueMetaSk },
      UpdateExpression: 'SET seq = if_not_exists(seq, :zero) + :one',
      ExpressionAttributeValues: { ':zero': 0, ':one': 1 },
      ReturnValues: 'UPDATED_NEW',
    }));
    const seq = (bumped.Attributes?.seq as number) ?? 1;
    const prefix = meta.nombre.charAt(0).toUpperCase();
    const numero = `${prefix}-${String(seq).padStart(3, '0')}`;
    const createdAt = new Date().toISOString();

    const item: TicketItem = {
      pk: queuePk(queueId),
      sk: ticketSk(numero),
      type: 'TICKET',
      numero,
      cliente: data.cliente,
      telefono: data.telefono,
      estado: 'waiting',
      createdAt,
      datos: data.datos,
      gsi1pk: queuePk(queueId),
      gsi1sk: `STATE#waiting#${createdAt}`,
    };
    await this.doc.send(new PutCommand({ TableName: this.table, Item: item }));
    return this.toTicket(item);
  }

  private async setTicketState(
    queueId: string,
    numero: string,
    estado: TicketState,
    extra: Partial<Pick<TicketItem, 'calledAt' | 'finishedAt'>> = {},
  ): Promise<Ticket | null> {
    const get = await this.doc.send(new GetCommand({
      TableName: this.table,
      Key: { pk: queuePk(queueId), sk: ticketSk(numero) },
    }));
    if (!get.Item) return null;
    const createdAt = (get.Item as TicketItem).createdAt;

    const names: Record<string, string> = { '#estado': 'estado', '#g': 'gsi1sk' };
    const values: Record<string, unknown> = {
      ':estado': estado,
      ':g': `STATE#${estado}#${createdAt}`,
    };
    const sets = ['#estado = :estado', '#g = :g'];
    if (extra.calledAt) { sets.push('calledAt = :calledAt'); values[':calledAt'] = extra.calledAt; }
    if (extra.finishedAt) { sets.push('finishedAt = :finishedAt'); values[':finishedAt'] = extra.finishedAt; }

    const res = await this.doc.send(new UpdateCommand({
      TableName: this.table,
      Key: { pk: queuePk(queueId), sk: ticketSk(numero) },
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));
    return res.Attributes ? this.toTicket(res.Attributes as TicketItem) : null;
  }

  /** Move a ticket between states, enforcing single serving ticket. */
  async moveTicket(queueId: string, numero: string, to: TicketState): Promise<Ticket | null> {
    if (to === 'serving') {
      const q = await this.getQueueWithTickets(queueId);
      if (q && q.serving.length >= 1) return null; // already serving one
    }
    const extra: Partial<Pick<TicketItem, 'calledAt' | 'finishedAt'>> = {};
    if (to === 'serving') extra.calledAt = new Date().toISOString();
    if (to === 'done') extra.finishedAt = new Date().toISOString();
    return this.setTicketState(queueId, numero, to, extra);
  }

  /** Manual: start serving the first waiting ticket if none is being served. */
  async callNext(queueId: string): Promise<Ticket | null> {
    const q = await this.getQueueWithTickets(queueId);
    if (!q || q.serving.length > 0 || q.waiting.length === 0) return null;
    const next = q.waiting[0];
    return this.setTicketState(queueId, next.numero, 'serving', { calledAt: new Date().toISOString() });
  }

  /** Finish current serving. With advance=true (auto mode) also calls next. */
  async finish(queueId: string, advance: boolean): Promise<{ finished: Ticket | null; next: Ticket | null }> {
    const q = await this.getQueueWithTickets(queueId);
    if (!q || q.serving.length === 0) return { finished: null, next: null };
    const finished = await this.setTicketState(queueId, q.serving[0].numero, 'done', {
      finishedAt: new Date().toISOString(),
    });
    let next: Ticket | null = null;
    if (advance && q.waiting.length > 0) {
      next = await this.setTicketState(queueId, q.waiting[0].numero, 'serving', {
        calledAt: new Date().toISOString(),
      });
    }
    return { finished, next };
  }

  /** No-show: remove a waiting/serving ticket entirely. */
  async removeTicket(queueId: string, numero: string): Promise<void> {
    await this.doc.send(new DeleteCommand({
      TableName: this.table,
      Key: { pk: queuePk(queueId), sk: ticketSk(numero) },
    }));
  }
}

export default TurnosDAO;
