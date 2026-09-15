import { useState } from "react";
import { Switch } from "@/elements/form/switch";
import { ShellDropdown, ShellDropdownItem } from "@/shell/header/ShellDropdown";
import type { Queue, Saturation } from "@/stores";
import { cn } from "@/utils";

interface QueueCardProps {
  queue: Queue;
  saturation: Saturation;
  onToggle: (active: boolean) => void;
  onManage: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const saturationMeta: Record<Saturation, { dot: string; label: string; text: string }> = {
  ok: { dot: "bg-success-500", label: "Fluyendo bien", text: "text-success-600" },
  busy: { dot: "bg-warning-500", label: "Acumulandose", text: "text-warning-600" },
  full: { dot: "bg-error-500", label: "Saturada", text: "text-error-600" },
};

/**
 * QueueCard — Visual overview card for a single queue.
 */
export const QueueCard = ({ queue, saturation, onToggle, onManage, onShare, onEdit, onDelete }: QueueCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = saturationMeta[saturation];
  const item = "block w-full rounded-md px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5";

  const esperando = queue.waiting.length;
  const atendiendo = queue.serving.length > 0 ? queue.serving[0].numero : null;

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border bg-white p-5 shadow-theme-sm transition-all dark:bg-gray-900",
        queue.activa ? "border-gray-200 dark:border-gray-800" : "border-gray-200 opacity-60 dark:border-gray-800",
      )}
    >
      {/* Header: name + overflow */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className={cn("h-3 w-3 rounded-full", queue.color)} />
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{queue.nombre}</h3>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="dropdown-toggle flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M12 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          <ShellDropdown
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
            className="absolute right-0 z-40 mt-1 w-36 rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
          >
            <ShellDropdownItem className={item} onItemClick={() => setMenuOpen(false)} onClick={onEdit}>Editar</ShellDropdownItem>
            <ShellDropdownItem className={`${item} text-error-500`} onItemClick={() => setMenuOpen(false)} onClick={onDelete}>Eliminar</ShellDropdownItem>
          </ShellDropdown>
        </div>
      </div>

      {/* Saturation status */}
      <div className="mt-3 flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", queue.activa ? meta.dot : "bg-gray-300")} />
        <span className={cn("text-sm font-medium", queue.activa ? meta.text : "text-gray-400")}>
          {queue.activa ? meta.label : "Pausada"}
        </span>
      </div>

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-400">Esperando</p>
          <p className="text-xl font-bold text-gray-800 dark:text-white/90">{esperando}</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-400">Tiempo prom.</p>
          <p className="text-xl font-bold text-gray-800 dark:text-white/90">
            {esperando > 0 ? `~${queue.tiempoProm}m` : "--"}
          </p>
        </div>
      </div>

      {/* Current ticket */}
      <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-gray-200 px-3 py-2 dark:border-gray-800">
        <span className="text-xs text-gray-400">Atendiendo</span>
        <span className={cn("text-sm font-semibold", atendiendo ? "text-secondary-600 dark:text-secondary-300" : "text-gray-400")}>
          {atendiendo ?? "—"}
        </span>
      </div>

      {/* Pause/resume */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
        <span className="text-sm text-gray-500 dark:text-gray-400">{queue.activa ? "Activa" : "Pausada"}</span>
        <Switch checked={queue.activa} onChange={onToggle} />
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={onManage}
          className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Gestionar
        </button>
        <button
          onClick={onShare}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-success-500">
            <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20z" />
          </svg>
          Compartir
        </button>
      </div>
    </div>
  );
};

export default QueueCard;
