import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { queuesStore } from "@/stores";

interface CurrentTicketCardProps {
  onAction: (label: string) => void;
}

/**
 * CurrentTicketCard — Prominent card for the ticket currently being served,
 * reading live from the queues store.
 */
export const CurrentTicketCard = observer(({ onAction }: CurrentTicketCardProps) => {
  const navigate = useNavigate();
  const current = queuesStore.currentTicket;

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-brand-500 p-6 text-center text-white shadow-theme-md">
        <p className="text-sm font-medium uppercase tracking-wide text-white/70">Turno Actual</p>
        <p className="mt-4 text-lg font-medium">No hay turnos en atencion</p>
        <p className="mt-1 text-sm text-white/70">Cuando llames un turno aparecera aqui.</p>
      </div>
    );
  }

  const { ticket, queue } = current;

  return (
    <div className="flex flex-col justify-between rounded-2xl bg-brand-500 p-6 text-white shadow-theme-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-white/70">Turno Actual</p>
          <p className="mt-1 text-xs text-white/60">Llamando ahora</p>
        </div>
        <span className="rounded-lg bg-white/15 px-3 py-1 text-sm font-medium">{queue.nombre}</span>
      </div>

      <div className="my-4">
        <p className="text-5xl font-bold tracking-tight">{ticket.numero}</p>
        <p className="mt-2 text-lg font-medium">{ticket.cliente}</p>
        <p className="text-sm text-white/75">{queue.nombre}</p>
      </div>

      <div className="flex items-center justify-between border-t border-white/15 pt-4">
        <div className="text-sm text-white/75">
          <span className="text-white/60">En atencion en:</span>{" "}
          <span className="font-semibold text-white">{queue.nombre}</span>
        </div>
        <button
          onClick={() => navigate(`/turnos?cola=${queue.id}`)}
          className="text-sm font-medium text-white underline-offset-2 hover:underline"
        >
          Ver detalles
        </button>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={() => queuesStore.finishAndAdvance(queue.id)}
          className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-brand-600 transition-colors hover:bg-white/90"
        >
          Completar
        </button>
        <button
          onClick={() => onAction(`llamar el siguiente turno en ${queue.nombre}`)}
          className="flex-1 rounded-lg border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          Llamar siguiente
        </button>
      </div>
    </div>
  );
});

export default CurrentTicketCard;
