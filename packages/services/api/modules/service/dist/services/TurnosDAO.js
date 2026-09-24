import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';
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
const queuePk = (queueId) => `QUEUE#${queueId}`;
const queueMetaSk = 'META';
const ticketSk = (numero) => `TURNO#${numero}`;
const isTicketSk = (sk) => sk.startsWith('TURNO#');
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
    doc;
    table;
    constructor() {
        const client = new DynamoDBClient({});
        this.doc = DynamoDBDocumentClient.from(client, {
            marshallOptions: { removeUndefinedValues: true },
        });
        const table = process.env.TABLE_NAME;
        if (!table)
            throw new Error('TABLE_NAME env var is required');
        this.table = table;
    }
    // ── Mapping ──
    toQueue(item) {
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
    toTicket(item) {
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
    async listQueues() {
        // Scan-free listing via a marker item would need a GSI; for a small-business
        // scale we query each queue by its known partition. We keep a registry item.
        const res = await this.doc.send(new QueryCommand({
            TableName: this.table,
            IndexName: 'gsi1',
            KeyConditionExpression: 'gsi1pk = :pk',
            ExpressionAttributeValues: { ':pk': 'REGISTRY#QUEUES' },
        }));
        const ids = (res.Items ?? []).map((i) => i.id);
        const queues = await Promise.all(ids.map((id) => this.getQueueMeta(id)));
        return queues.filter((q) => q !== null);
    }
    async getQueueMeta(queueId) {
        const res = await this.doc.send(new GetCommand({
            TableName: this.table,
            Key: { pk: queuePk(queueId), sk: queueMetaSk },
        }));
        return res.Item ? this.toQueue(res.Item) : null;
    }
    async getQueueWithTickets(queueId) {
        const res = await this.doc.send(new QueryCommand({
            TableName: this.table,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: { ':pk': queuePk(queueId) },
        }));
        const items = res.Items ?? [];
        const metaItem = items.find((i) => i.sk === queueMetaSk);
        if (!metaItem)
            return null;
        const tickets = items
            .filter((i) => isTicketSk(i.sk))
            .map((i) => this.toTicket(i))
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        return {
            ...this.toQueue(metaItem),
            waiting: tickets.filter((t) => t.estado === 'waiting'),
            serving: tickets.filter((t) => t.estado === 'serving'),
            done: tickets.filter((t) => t.estado === 'done'),
        };
    }
    async listQueuesWithTickets() {
        const queues = await this.listQueues();
        const full = await Promise.all(queues.map((q) => this.getQueueWithTickets(q.id)));
        return full.filter((q) => q !== null);
    }
    async createQueue(data) {
        const id = randomUUID();
        const existing = await this.listQueues();
        const color = data.color ?? COLOR_OPTIONS[existing.length % COLOR_OPTIONS.length];
        const item = {
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
    async updateQueue(queueId, data) {
        const sets = [];
        const names = {};
        const values = {};
        for (const [key, val] of Object.entries(data)) {
            if (val === undefined)
                continue;
            sets.push(`#${key} = :${key}`);
            names[`#${key}`] = key;
            values[`:${key}`] = val;
        }
        if (sets.length === 0)
            return this.getQueueMeta(queueId);
        const res = await this.doc.send(new UpdateCommand({
            TableName: this.table,
            Key: { pk: queuePk(queueId), sk: queueMetaSk },
            UpdateExpression: `SET ${sets.join(', ')}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
            ConditionExpression: 'attribute_exists(pk)',
            ReturnValues: 'ALL_NEW',
        }));
        return res.Attributes ? this.toQueue(res.Attributes) : null;
    }
    async deleteQueue(queueId) {
        // Delete all items in the partition + registry entry
        const res = await this.doc.send(new QueryCommand({
            TableName: this.table,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: { ':pk': queuePk(queueId) },
        }));
        await Promise.all((res.Items ?? []).map((i) => this.doc.send(new DeleteCommand({
            TableName: this.table,
            Key: { pk: i.pk, sk: i.sk },
        }))));
        await this.doc.send(new DeleteCommand({
            TableName: this.table,
            Key: { pk: 'REGISTRY#QUEUES', sk: queuePk(queueId) },
        }));
    }
    // ═══════════════════════════════════════════════════════════════════════
    // TICKETS (turnos)
    // ═══════════════════════════════════════════════════════════════════════
    /** Create a ticket in `waiting` — called by the WhatsApp bot OR the operator view. */
    async createTicket(queueId, data) {
        const meta = await this.getQueueMeta(queueId);
        if (!meta)
            return null;
        // Increment the queue seq counter for ticket numbering (e.g. A-043)
        const bumped = await this.doc.send(new UpdateCommand({
            TableName: this.table,
            Key: { pk: queuePk(queueId), sk: queueMetaSk },
            UpdateExpression: 'SET seq = if_not_exists(seq, :zero) + :one',
            ExpressionAttributeValues: { ':zero': 0, ':one': 1 },
            ReturnValues: 'UPDATED_NEW',
        }));
        const seq = bumped.Attributes?.seq ?? 1;
        const prefix = meta.nombre.charAt(0).toUpperCase();
        const numero = `${prefix}-${String(seq).padStart(3, '0')}`;
        const createdAt = new Date().toISOString();
        const item = {
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
    async setTicketState(queueId, numero, estado, extra = {}) {
        const get = await this.doc.send(new GetCommand({
            TableName: this.table,
            Key: { pk: queuePk(queueId), sk: ticketSk(numero) },
        }));
        if (!get.Item)
            return null;
        const createdAt = get.Item.createdAt;
        const names = { '#estado': 'estado', '#g': 'gsi1sk' };
        const values = {
            ':estado': estado,
            ':g': `STATE#${estado}#${createdAt}`,
        };
        const sets = ['#estado = :estado', '#g = :g'];
        if (extra.calledAt) {
            sets.push('calledAt = :calledAt');
            values[':calledAt'] = extra.calledAt;
        }
        if (extra.finishedAt) {
            sets.push('finishedAt = :finishedAt');
            values[':finishedAt'] = extra.finishedAt;
        }
        const res = await this.doc.send(new UpdateCommand({
            TableName: this.table,
            Key: { pk: queuePk(queueId), sk: ticketSk(numero) },
            UpdateExpression: `SET ${sets.join(', ')}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
            ReturnValues: 'ALL_NEW',
        }));
        return res.Attributes ? this.toTicket(res.Attributes) : null;
    }
    /** Move a ticket between states, enforcing single serving ticket. */
    async moveTicket(queueId, numero, to) {
        if (to === 'serving') {
            const q = await this.getQueueWithTickets(queueId);
            if (q && q.serving.length >= 1)
                return null; // already serving one
        }
        const extra = {};
        if (to === 'serving')
            extra.calledAt = new Date().toISOString();
        if (to === 'done')
            extra.finishedAt = new Date().toISOString();
        return this.setTicketState(queueId, numero, to, extra);
    }
    /** Manual: start serving the first waiting ticket if none is being served. */
    async callNext(queueId) {
        const q = await this.getQueueWithTickets(queueId);
        if (!q || q.serving.length > 0 || q.waiting.length === 0)
            return null;
        const next = q.waiting[0];
        return this.setTicketState(queueId, next.numero, 'serving', { calledAt: new Date().toISOString() });
    }
    /** Finish current serving. With advance=true (auto mode) also calls next. */
    async finish(queueId, advance) {
        const q = await this.getQueueWithTickets(queueId);
        if (!q || q.serving.length === 0)
            return { finished: null, next: null };
        const finished = await this.setTicketState(queueId, q.serving[0].numero, 'done', {
            finishedAt: new Date().toISOString(),
        });
        let next = null;
        if (advance && q.waiting.length > 0) {
            next = await this.setTicketState(queueId, q.waiting[0].numero, 'serving', {
                calledAt: new Date().toISOString(),
            });
        }
        return { finished, next };
    }
    /** No-show: remove a waiting/serving ticket entirely. */
    async removeTicket(queueId, numero) {
        await this.doc.send(new DeleteCommand({
            TableName: this.table,
            Key: { pk: queuePk(queueId), sk: ticketSk(numero) },
        }));
    }
}
export default TurnosDAO;
//# sourceMappingURL=TurnosDAO.js.map