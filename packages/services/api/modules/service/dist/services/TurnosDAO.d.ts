export type TicketState = 'waiting' | 'serving' | 'done';
export type AttentionMode = 'auto' | 'manual';
export type FieldType = 'text' | 'textarea' | 'number' | 'select';
/** A custom field the operator/bot must fill when creating a ticket in this queue. */
export interface CustomField {
    id: string;
    label: string;
    type: FieldType;
    required: boolean;
    options?: string[];
}
export interface Queue {
    id: string;
    nombre: string;
    color: string;
    servicio: string;
    mode: AttentionMode;
    tiempoProm: number;
    activa: boolean;
    campos: CustomField[];
}
export interface Ticket {
    numero: string;
    cliente: string;
    telefono?: string;
    estado: TicketState;
    createdAt: string;
    calledAt?: string;
    finishedAt?: string;
    datos?: Record<string, string>;
}
/** A queue with its tickets grouped by state (shape the frontend consumes). */
export interface QueueWithTickets extends Queue {
    waiting: Ticket[];
    serving: Ticket[];
    done: Ticket[];
}
/**
 * TurnosDAO — single-table DynamoDB access for queues (colas) and tickets (turnos).
 *
 * Item shapes on TurnosTable:
 *   Queue metadata: pk=QUEUE#{id}  sk=META
 *   Ticket:         pk=QUEUE#{id}  sk=TURNO#{numero}   gsi1pk=QUEUE#{id} gsi1sk=STATE#{estado}#{createdAt}
 */
export declare class TurnosDAO {
    private readonly doc;
    private readonly table;
    constructor();
    private toQueue;
    private toTicket;
    listQueues(): Promise<Queue[]>;
    private getQueueMeta;
    getQueueWithTickets(queueId: string): Promise<QueueWithTickets | null>;
    listQueuesWithTickets(): Promise<QueueWithTickets[]>;
    createQueue(data: {
        nombre: string;
        servicio: string;
        mode: AttentionMode;
        tiempoProm: number;
        color?: string;
        campos?: CustomField[];
    }): Promise<Queue>;
    updateQueue(queueId: string, data: {
        nombre?: string;
        servicio?: string;
        mode?: AttentionMode;
        tiempoProm?: number;
        activa?: boolean;
        campos?: CustomField[];
    }): Promise<Queue | null>;
    deleteQueue(queueId: string): Promise<void>;
    /** Create a ticket in `waiting` — called by the WhatsApp bot OR the operator view. */
    createTicket(queueId: string, data: {
        cliente: string;
        telefono?: string;
        datos?: Record<string, string>;
    }): Promise<Ticket | null>;
    private setTicketState;
    /** Move a ticket between states, enforcing single serving ticket. */
    moveTicket(queueId: string, numero: string, to: TicketState): Promise<Ticket | null>;
    /** Manual: start serving the first waiting ticket if none is being served. */
    callNext(queueId: string): Promise<Ticket | null>;
    /** Finish current serving. With advance=true (auto mode) also calls next. */
    finish(queueId: string, advance: boolean): Promise<{
        finished: Ticket | null;
        next: Ticket | null;
    }>;
    /** No-show: remove a waiting/serving ticket entirely. */
    removeTicket(queueId: string, numero: string): Promise<void>;
}
export default TurnosDAO;
//# sourceMappingURL=TurnosDAO.d.ts.map