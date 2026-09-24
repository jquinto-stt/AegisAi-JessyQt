import { Path } from '@webiai/sdk.http';
declare namespace EP {
    const Root$: Path<object, object>;
    const $Health: Path.Endpoint<object, object>;
    const Queues$: Path<object, object>;
    const QueueById$: Path<{
        id: string;
    }, object>;
    const $ListQueues: Path.Endpoint<object, object>;
    const $CreateQueue: Path.Endpoint<object, object>;
    const $GetQueue: Path.Endpoint<{
        id: string;
    } & object, object>;
    const $UpdateQueue: Path.Endpoint<{
        id: string;
    } & object, object>;
    const $DeleteQueue: Path.Endpoint<{
        id: string;
    } & object, object>;
    const Turnos$: Path<{
        id: string;
    } & object, {
        id: string;
    }>;
    const TurnoByNum$: Path<{
        id: string;
    } & object & {
        numero: string;
    }, {
        id: string;
    } & object>;
    /** Create a ticket in a queue (called by the WhatsApp bot). */
    const $CreateTurno: Path.Endpoint<{
        id: string;
    } & object, object>;
    /** Manual: call the next waiting ticket. */
    const $CallNext: Path.Endpoint<{
        id: string;
    } & object, object>;
    /** Finish current serving (body { advance: boolean }). */
    const $Finish: Path.Endpoint<{
        id: string;
    } & object, object>;
    /** Move a ticket to another state (body { to: TicketState }). */
    const $MoveTurno: Path.Endpoint<{
        id: string;
    } & object & {
        numero: string;
    }, object>;
    /** No-show: remove a ticket. */
    const $RemoveTurno: Path.Endpoint<{
        id: string;
    } & object & {
        numero: string;
    }, object>;
}
export default EP;
//# sourceMappingURL=endpoints.d.ts.map