import { useState } from "react";
import { ShellDropdown, ShellDropdownItem } from "@/shell/header/ShellDropdown";
import { cn } from "@/utils";

export type TicketState = "waiting" | "serving" | "done";

export interface CardTicket {
  numero: string;
  cliente: string;
  servicio?: string;
  espera: string;
  urgent?: boolean;
}

interface TicketCardProps {
  ticket: CardTicket;
  state: TicketState;
  /** Manual mode: card is interactive (draggable + has primary action) */
  interactive?: boolean;
  selected?: boolean;
  /** Disable the primary action (e.g. someone is already being served) */
  primaryDisabled?: boolean;
  primaryDisabledHint?: string;
  onSelect?: () => void;
  onPrimary?: () => void;
  onNoShow?: () => void;
  onReschedule?: () => void;
  onCancel?: () => void;
  /** Drag handlers (manual mode) */
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const WhatsAppBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.7.9-.1.1-.3.2-.5 0-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.4.2-.4v-.4c0-.1-.5-1.3-.7-1.7-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.5 3.9 3.5.5.2 1 .4 1.3.5.6.2 1.1.1 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.4-.3z" />
    </svg>
    WhatsApp
  </span>
);

const OverflowMenu = ({ onNoShow, onReschedule, onCancel }: { onNoShow?: () => void; onReschedule?: () => void; onCancel?: () => void }) => {
  const [open, setOpen] = useState(false);
  const item = "block w-full rounded-md px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5";
  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="dropdown-toggle flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M12 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      <ShellDropdown
        isOpen={open}
        onClose={() => setOpen(false)}
        className="absolute right-0 z-40 mt-1 w-40 rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
      >
        <ShellDropdownItem className={item} onItemClick={() => setOpen(false)} onClick={onReschedule}>Reagendar</ShellDropdownItem>
        <ShellDropdownItem className={item} onItemClick={() => setOpen(false)} onClick={onNoShow}>No se presento</ShellDropdownItem>
        <ShellDropdownItem className={`${item} text-error-500`} onItemClick={() => setOpen(false)} onClick={onCancel}>Cancelar turno</ShellDropdownItem>
      </ShellDropdown>
    </div>
  );
};

/**
 * TicketCard — Large, touch-friendly ticket card for the queue board.
 */
export const TicketCard = ({
  ticket,
  state,
  interactive,
  selected,
  primaryDisabled,
  primaryDisabledHint,
  onSelect,
  onPrimary,
  onNoShow,
  onReschedule,
  onCancel,
  onDragStart,
  onDragEnd,
}: TicketCardProps) => {
  const isDone = state === "done";
  const isServing = state === "serving";
  const canDrag = !!interactive && !isDone;

  // Card background/border by state and urgency
  const cardTone = cn(
    "rounded-2xl border p-4 transition-all",
    isDone && "border-gray-200 bg-gray-50 opacity-80 dark:border-gray-800 dark:bg-white/[0.02]",
    isServing && "border-secondary-200 bg-secondary-50 dark:border-secondary-500/30 dark:bg-secondary-500/10",
    !isDone && !isServing && ticket.urgent && "border-error-300 bg-error-50 dark:border-error-500/40 dark:bg-error-500/10",
    !isDone && !isServing && !ticket.urgent && "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900",
    canDrag && "cursor-grab hover:border-brand-400 hover:shadow-theme-md active:cursor-grabbing",
    selected && "ring-2 ring-brand-500 border-brand-500",
  );

  return (
    <div
      className={cardTone}
      draggable={canDrag}
      onDragStart={canDrag ? onDragStart : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onClick={interactive && !isDone ? onSelect : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {canDrag && (
            <span className="text-gray-300 dark:text-gray-600" aria-hidden>
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M9 6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0 6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm-1.5 7.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18 6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm-1.5 7.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm1.5 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              </svg>
            </span>
          )}
          <span className={cn(
            "text-2xl font-bold",
            isServing ? "text-secondary-600 dark:text-secondary-300" : ticket.urgent && !isDone ? "text-error-600" : "text-brand-600 dark:text-brand-400",
          )}>
            {ticket.numero}
          </span>
        </div>
        {!isDone && <OverflowMenu onNoShow={onNoShow} onReschedule={onReschedule} onCancel={onCancel} />}
      </div>

      <div className="mt-1">
        <p className="text-base font-medium text-gray-800 dark:text-white/90">{ticket.cliente}</p>
        {ticket.servicio && <p className="text-sm text-gray-500 dark:text-gray-400">{ticket.servicio}</p>}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <WhatsAppBadge />
        <span className={cn(
          "text-xs font-medium",
          ticket.urgent && !isDone ? "text-error-600" : "text-gray-400",
        )}>
          {isDone ? "Atendido" : `${ticket.espera} esperando`}
        </span>
      </div>

      {/* Primary action — only in interactive (manual) mode */}
      {interactive && state === "waiting" && (
        <>
          <button
            disabled={primaryDisabled}
            onClick={(e) => { e.stopPropagation(); if (!primaryDisabled) onPrimary?.(); }}
            className="mt-4 w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Atender
          </button>
          {primaryDisabled && primaryDisabledHint && (
            <p className="mt-1.5 text-center text-xs text-gray-400">{primaryDisabledHint}</p>
          )}
        </>
      )}
      {interactive && state === "serving" && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrimary?.(); }}
          className="mt-4 w-full rounded-lg bg-secondary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-secondary-700"
        >
          Completar
        </button>
      )}
    </div>
  );
};

export default TicketCard;
