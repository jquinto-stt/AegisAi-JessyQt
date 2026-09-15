import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Alert } from "@/elements/ui/alert";
import { ButtonsGroup } from "@/elements/ui/buttons-group";
import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { queuesStore, type AttentionMode, type TicketState } from "@/stores";
import { TicketCard, type CardTicket } from "./components/TicketCard";

type ColumnKey = "waiting" | "serving" | "done";

const columnMeta: { key: ColumnKey; title: string; state: TicketState; badgeClass: string; emptyText: string }[] = [
  { key: "waiting", title: "Esperando", state: "waiting", badgeClass: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300", emptyText: "Nadie esperando" },
  { key: "serving", title: "Atendiendo", state: "serving", badgeClass: "bg-secondary-100 text-secondary-700 dark:bg-secondary-500/20 dark:text-secondary-300", emptyText: "Nadie en atencion" },
  { key: "done", title: "Listos hoy", state: "done", badgeClass: "bg-success-50 text-success-600 dark:bg-success-500/15", emptyText: "Aun sin completar" },
];

const allowedTargets: Record<ColumnKey, ColumnKey[]> = {
  waiting: ["serving", "done"],
  serving: ["done"],
  done: [],
};
const SERVING_LIMIT = 1;

export const TurnosPage = observer(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Resolve current queue: from ?cola= param, else first queue
  const colaId = searchParams.get("cola");
  const queue = (colaId && queuesStore.getQueue(colaId)) || queuesStore.queues[0];

  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dragged, setDragged] = useState<{ from: ColumnKey; numero: string } | null>(null);
  const [dragOver, setDragOver] = useState<ColumnKey | null>(null);
  const [rescheduleTicket, setRescheduleTicket] = useState<CardTicket | null>(null);
  const [cancelTicket, setCancelTicket] = useState<{ ticket: CardTicket; reason: "cancel" | "noshow" } | null>(null);

  if (!queue) {
    return (
      <>
        <PageMeta title="Mis Turnos" description="Gestiona tus turnos del dia" />
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">No hay colas</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Crea una cola para gestionar turnos.</p>
          <Link to="/colas" className="mt-5 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">Ir a Colas</Link>
        </div>
      </>
    );
  }

  const mode = queue.mode;
  const isManual = mode === "manual";

  const toCard = (t: { numero: string; cliente: string; waitedMin: number; espera: string }): CardTicket => ({
    numero: t.numero,
    cliente: t.cliente,
    espera: t.espera,
    urgent: queuesStore.isUrgent(t as any),
  });

  const matchFilter = (t: { cliente: string; numero: string }) =>
    !search ||
    t.cliente.toLowerCase().includes(search.toLowerCase()) ||
    t.numero.toLowerCase().includes(search.toLowerCase());

  const waiting = queue.waiting.filter(matchFilter);
  const urgentCount = queue.waiting.filter((t) => queuesStore.isUrgent(t)).length;
  const waitingCount = queue.waiting.length;

  const subtitle = waitingCount > 0
    ? `Tienes ${waitingCount} ${waitingCount === 1 ? "persona esperando" : "personas esperando"}`
    : "No hay nadie esperando ahora";

  const canDrop = (from: ColumnKey, target: ColumnKey) => {
    if (from === target || !allowedTargets[from].includes(target)) return false;
    if (target === "serving" && queue.serving.length >= SERVING_LIMIT) return false;
    return true;
  };

  const handleDrop = (target: ColumnKey) => {
    if (!dragged || !canDrop(dragged.from, target)) { setDragOver(null); return; }
    queuesStore.moveTicket(queue.id, dragged.from, dragged.numero, target);
    setDragged(null);
    setDragOver(null);
  };

  const listFor = (key: ColumnKey) => (key === "waiting" ? waiting : queue[key]);

  return (
    <>
      <PageMeta title="Mis Turnos" description="Gestiona tus turnos del dia" />

      {/* Back to colas + queue context */}
      <div className="mb-4">
        <Link to="/colas" className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Volver a colas
        </Link>
      </div>

      {/* Header with queue name */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <span className={`h-3 w-3 rounded-full ${queue.color}`} />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">{queue.nombre}</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>

      {/* Mode toggle */}
      <div className="mb-5 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Modo:</span>
        <ButtonsGroup
          items={[
            { label: "Automatico", onClick: () => queuesStore.setMode(queue.id, "auto" as AttentionMode) },
            { label: "Manual", onClick: () => queuesStore.setMode(queue.id, "manual" as AttentionMode) },
          ]}
          variant="secondary"
        />
      </div>

      {/* Auto mode banner */}
      {!isManual && (
        <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/30 dark:bg-brand-500/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-500" />
              </span>
              <div>
                <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Modo automatico activo</p>
                <p className="text-xs text-brand-600/80 dark:text-brand-300/70">El sistema llama los turnos en orden de llegada (FIFO).</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl bg-white px-4 py-3 dark:bg-gray-900">
              {queue.serving.length > 0 ? (
                <>
                  <div>
                    <p className="text-xs text-gray-400">Atendiendo ahora{queue.waiting.length > 0 && <span className="ml-1">· siguiente {queue.waiting[0].numero}</span>}</p>
                    <p className="text-xl font-bold text-brand-600 dark:text-brand-400">{queue.serving[0].numero}<span className="ml-2 text-sm font-normal text-gray-500">{queue.serving[0].cliente}</span></p>
                  </div>
                  <button onClick={() => queuesStore.finishAndAdvance(queue.id)} className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">Terminar turno</button>
                </>
              ) : queue.waiting.length > 0 ? (
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Listo para el siguiente</p>
                  <button onClick={() => queuesStore.callNext(queue.id)} className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">Iniciar cola ({queue.waiting[0].numero})</button>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No hay turnos en cola</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual mode banner */}
      {isManual && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {queue.serving.length > 0 ? (
                <>
                  <p className="text-xs text-gray-400">Atendiendo ahora{queue.waiting.length > 0 && <span className="ml-1">· siguiente {queue.waiting[0].numero}</span>}</p>
                  <p className="text-xl font-bold text-secondary-600 dark:text-secondary-300">{queue.serving[0].numero}<span className="ml-2 text-sm font-normal text-gray-500">{queue.serving[0].cliente}</span></p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-400">Sin turno en atencion</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{queue.waiting.length > 0 ? `Siguiente en fila: ${queue.waiting[0].numero}` : "No hay turnos en cola"}</p>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => queuesStore.callNext(queue.id)} disabled={queue.serving.length > 0 || queue.waiting.length === 0} className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40">Llamar siguiente</button>
              <button onClick={() => queuesStore.finishCurrent(queue.id)} disabled={queue.serving.length === 0} className="rounded-lg bg-secondary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-secondary-700 disabled:cursor-not-allowed disabled:opacity-40">Terminar turno</button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o numero de turno..."
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
        />
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {columnMeta.map((col) => {
          const tickets = listFor(col.key);
          const isValidTarget = !!dragged && canDrop(dragged.from, col.key);
          const isInvalidTarget = !!dragged && dragged.from !== col.key && !canDrop(dragged.from, col.key);
          const isDropTarget = isManual && dragOver === col.key && isValidTarget;
          return (
            <div
              key={col.key}
              onDragOver={isManual && isValidTarget ? (e) => { e.preventDefault(); setDragOver(col.key); } : undefined}
              onDragLeave={isManual ? () => setDragOver((c) => (c === col.key ? null : c)) : undefined}
              onDrop={isManual ? () => handleDrop(col.key) : undefined}
              className={"rounded-2xl p-1 transition-colors " + (isDropTarget ? "bg-brand-50 ring-2 ring-dashed ring-brand-300 dark:bg-brand-500/10 " : "") + (isInvalidTarget ? "opacity-50 " : "")}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{col.title}</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${col.badgeClass}`}>{queue[col.key].length}</span>
              </div>

              {col.key === "waiting" && urgentCount > 0 && (
                <div className="mb-3">
                  <Alert variant="warning" title="Atencion" message={`${urgentCount} ${urgentCount === 1 ? "persona lleva" : "personas llevan"} mucho esperando`} />
                </div>
              )}

              <div className="flex flex-col gap-3">
                {tickets.map((t) => {
                  const card = toCard(t);
                  return (
                    <TicketCard
                      key={t.numero}
                      ticket={card}
                      state={col.state}
                      interactive={isManual}
                      selected={isManual && selected === t.numero}
                      primaryDisabled={col.key === "waiting" && queue.serving.length >= SERVING_LIMIT}
                      primaryDisabledHint="Termina el turno actual primero"
                      onSelect={() => setSelected(t.numero)}
                      onPrimary={() => queuesStore.moveTicket(queue.id, col.key, t.numero, col.key === "waiting" ? "serving" : "done")}
                      onReschedule={() => setRescheduleTicket(card)}
                      onNoShow={() => setCancelTicket({ ticket: card, reason: "noshow" })}
                      onCancel={() => setCancelTicket({ ticket: card, reason: "cancel" })}
                      onDragStart={() => setDragged({ from: col.key, numero: t.numero })}
                      onDragEnd={() => { setDragged(null); setDragOver(null); }}
                    />
                  );
                })}
                {tickets.length === 0 && (
                  <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400 dark:border-gray-800">{col.emptyText}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reschedule modal */}
      <Modal isOpen={!!rescheduleTicket} onClose={() => setRescheduleTicket(null)} className="max-w-[440px] p-6">
        <h4 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Reagendar turno</h4>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{rescheduleTicket && `${rescheduleTicket.numero} — ${rescheduleTicket.cliente}`}</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Nueva fecha</label>
            <input type="date" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-brand-400 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Nueva hora</label>
            <input type="time" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-brand-400 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Nota (opcional)</label>
            <textarea rows={2} placeholder="Motivo del cambio..." className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={() => setRescheduleTicket(null)}>Cancelar</Button>
          <Button size="sm" onClick={() => setRescheduleTicket(null)}>Reagendar</Button>
        </div>
      </Modal>

      {/* Cancel / No-show modal */}
      <Modal isOpen={!!cancelTicket} onClose={() => setCancelTicket(null)} showCloseButton={false} className="max-w-[420px] p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-50 text-error-500 dark:bg-error-500/15">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">{cancelTicket?.reason === "noshow" ? "Marcar como no se presento" : "Cancelar turno"}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">{cancelTicket && `${cancelTicket.ticket.numero} — ${cancelTicket.ticket.cliente}`}</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{cancelTicket?.reason === "noshow" ? "El turno se marcara como no presentado y saldra de la cola." : "Esta accion quitara el turno de la cola. No se puede deshacer."}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button size="sm" variant="outline" onClick={() => setCancelTicket(null)}>Volver</Button>
            <Button size="sm" variant="destructive" onClick={() => { if (cancelTicket) queuesStore.removeTicket(queue.id, cancelTicket.ticket.numero); setCancelTicket(null); }}>{cancelTicket?.reason === "noshow" ? "Marcar" : "Cancelar turno"}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
});

export default TurnosPage;
