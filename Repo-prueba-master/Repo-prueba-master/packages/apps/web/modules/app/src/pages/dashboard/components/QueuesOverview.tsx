import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { queuesStore, type Saturation } from "@/stores";
import { cn } from "@/utils";

const satMeta: Record<Saturation, { dot: string; label: string }> = {
  ok: { dot: "bg-success-500", label: "Fluyendo" },
  busy: { dot: "bg-warning-500", label: "Acumulandose" },
  full: { dot: "bg-error-500", label: "Saturada" },
};

/**
 * QueuesOverview — Live per-queue status strip on the dashboard.
 */
export const QueuesOverview = observer(() => {
  const navigate = useNavigate();
  const queues = queuesStore.queues;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-theme-sm dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Estado de colas</h3>
        <button onClick={() => navigate("/colas")} className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          Ver todas
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {queues.map((q) => {
          const sat = queuesStore.saturationOf(q);
          const meta = satMeta[sat];
          return (
            <button
              key={q.id}
              onClick={() => navigate(`/turnos?cola=${q.id}`)}
              className={cn(
                "flex flex-col rounded-xl border p-4 text-left transition-all hover:border-brand-300 hover:shadow-theme-sm dark:border-gray-800",
                q.activa ? "border-gray-200" : "border-gray-200 opacity-60",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", q.color)} />
                  <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{q.nombre}</span>
                </div>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <span className={cn("h-2 w-2 rounded-full", q.activa ? meta.dot : "bg-gray-300")} />
                  {q.activa ? meta.label : "Pausada"}
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white/90">{q.waiting.length}</p>
                  <p className="text-xs text-gray-400">esperando</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-secondary-600 dark:text-secondary-300">
                    {q.serving.length > 0 ? q.serving[0].numero : "—"}
                  </p>
                  <p className="text-xs text-gray-400">atendiendo</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default QueuesOverview;
