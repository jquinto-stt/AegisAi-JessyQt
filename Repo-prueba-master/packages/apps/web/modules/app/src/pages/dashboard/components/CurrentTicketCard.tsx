import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { queuesStore } from "@/stores";

interface CurrentTicketCardProps {
  onAction: (label: string) => void;
}

/**
 * CurrentTicketCard — Tarjeta destacada del turno en atención, con selector de
 * cola. El admin elige de qué cola ver el turno actual (por defecto la primera
 * con alguien en atención, o la primera cola). Lee en vivo del store.
 */
export const CurrentTicketCard = observer(({ onAction }: CurrentTicketCardProps) => {
  const navigate = useNavigate();
  const queues = queuesStore.queues;

  // Cola por defecto: la primera que tenga un turno en atención; si ninguna,
  // la primera cola disponible.
  const defaultColaId =
    queues.find((q) => q.serving.length > 0)?.id ?? queues[0]?.id ?? "";
  const [colaId, setColaId] = useState<string>(defaultColaId);

  const queue = queuesStore.getQueue(colaId) ?? queues[0];
  const ticket = queue?.serving[0] ?? null;

  // Sin colas del todo.
  if (!queue) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-brand-500 p-6 text-center text-white shadow-theme-md">
        <p className="text-sm font-medium uppercase tracking-wide text-white/70">Turno Actual</p>
        <p className="mt-4 text-lg font-medium">No hay filas configuradas</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between rounded-2xl bg-brand-500 p-6 text-white shadow-theme-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-white/70">Turno Actual</p>
          <p className="mt-1 text-xs text-white/60">{ticket ? "Llamando ahora" : "Sin turno en atención"}</p>
        </div>
        {/* Selector de cola: el admin elige de qué cola ver el turno actual. */}
        <select
          value={queue.id}
          onChange={(e) => setColaId(e.target.value)}
          className="max-w-[45%] truncate rounded-lg border border-white/30 bg-white/15 px-3 py-1.5 text-sm font-medium text-white outline-none focus:border-white/60 [&>option]:text-gray-800"
          aria-label="Seleccionar fila"
        >
          {queues.map((q) => (
            <option key={q.id} value={q.id}>{q.nombre}</option>
          ))}
        </select>
      </div>

      {ticket ? (
        <div className="my-4">
          <p className="text-5xl font-bold tracking-tight">{ticket.numero}</p>
          <p className="mt-2 text-lg font-medium">{ticket.cliente}</p>
          <p className="text-sm text-white/75">{queue.nombre}</p>
        </div>
      ) : (
        <div className="my-4">
          <p className="text-lg font-medium">No hay turno en atención</p>
          <p className="mt-1 text-sm text-white/70">
            {queue.waiting.length > 0
              ? `${queue.waiting.length} en espera. Llama el siguiente para empezar.`
              : "Esta fila no tiene a nadie esperando."}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-white/15 pt-4">
        <div className="text-sm text-white/75">
          <span className="text-white/60">Fila:</span>{" "}
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
          disabled={!ticket}
          className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-brand-600 transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Completar
        </button>
        <button
          onClick={() => onAction(`llamar el siguiente turno en ${queue.nombre}`)}
          disabled={queue.waiting.length === 0}
          className="flex-1 rounded-lg border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Llamar siguiente
        </button>
      </div>
    </div>
  );
});

export default CurrentTicketCard;
