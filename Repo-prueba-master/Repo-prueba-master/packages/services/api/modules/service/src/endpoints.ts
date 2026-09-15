import { Path, Method } from '@webiai/sdk.http';

namespace EP {
  //!PATH - Root
  export const Root$ = new Path('/');

  //?ENDPOINT - Health check
  export const $Health = Root$.sub('/health').endpoint(Method.GET);

  // ══════════════════════════════════════════════════════════════════════
  //!PATH - Queues (colas)
  // ══════════════════════════════════════════════════════════════════════
  export const Queues$ = Root$.sub('/queues');
  export const QueueById$ = Queues$.sub({ id: 'id' }, (p) => `/:${p.id}`);

  //?ENDPOINT - Queues CRUD
  export const $ListQueues = Queues$.endpoint(Method.GET);
  export const $CreateQueue = Queues$.endpoint(Method.POST);
  export const $GetQueue = QueueById$.endpoint(Method.GET);
  export const $UpdateQueue = QueueById$.endpoint(Method.PATCH);
  export const $DeleteQueue = QueueById$.endpoint(Method.DELETE);

  // ══════════════════════════════════════════════════════════════════════
  //!PATH - Tickets (turnos) — nested under a queue
  // ══════════════════════════════════════════════════════════════════════
  export const Turnos$ = QueueById$.sub('/turnos');
  export const TurnoByNum$ = Turnos$.sub({ numero: 'numero' }, (p) => `/:${p.numero}`);

  //?ENDPOINT - Ticket operations
  /** Create a ticket in a queue (called by the WhatsApp bot). */
  export const $CreateTurno = Turnos$.endpoint(Method.POST);
  /** Manual: call the next waiting ticket. */
  export const $CallNext = QueueById$.sub('/call-next').endpoint(Method.POST);
  /** Finish current serving (body { advance: boolean }). */
  export const $Finish = QueueById$.sub('/finish').endpoint(Method.POST);
  /** Move a ticket to another state (body { to: TicketState }). */
  export const $MoveTurno = TurnoByNum$.endpoint(Method.PATCH);
  /** No-show: remove a ticket. */
  export const $RemoveTurno = TurnoByNum$.endpoint(Method.DELETE);
}

export default EP;
