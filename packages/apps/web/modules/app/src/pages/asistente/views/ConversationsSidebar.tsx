import { useState } from "react";
import { observer } from "mobx-react-lite";
import { assistantStore } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATIONS SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ConversationsSidebar — barra lateral minimalista en blanco/negro/gris,
 * pixel-fiel al diseño de referencia (marca "Skymetrics").
 *
 * De arriba a abajo:
 *   - Header: ícono con borde fino + "Skymetrics" a la izquierda; botón de
 *     colapsar (chevron ‹) a la derecha → `onClose`.
 *   - Acciones: "Back" (→ onClose), "New chat" (→ store.nuevaConversacion),
 *     "Update Model" (deshabilitado, próximamente).
 *   - Historial agrupado ("Today" / "Yesterday" / "Last 7 days") con TEXTOS
 *     DE EJEMPLO estáticos del diseño. El item activo se maneja localmente
 *     (solo efecto visual); NO toca el store.
 *
 * Se mantiene como `observer` porque "New chat" muta el `assistantStore`.
 */

// Historial de ejemplo (estático, tal cual la imagen de referencia).
const GRUPOS_HISTORIAL: { label: string; items: string[] }[] = [
  { label: "Today", items: ["My store's performance", "Products Expected to"] },
  { label: "Yesterday", items: ["Peak Revenue Times", "Analysis for my future"] },
  { label: "Last 7 days", items: ["Consult sobre pedidos", "Checking in on today's"] },
];

export const ConversationsSidebar = observer(({ onClose }: { onClose: () => void }) => {
  // Item activo (solo visual): por defecto el primero — "grupo:item".
  const [activo, setActivo] = useState("0:0");

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* ── Header: marca + colapsar ── */}
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
            <DesignIcon />
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            Skymetrics
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Colapsar barra"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500 dark:hover:bg-gray-800"
        >
          <ChevronLeftIcon />
        </button>
      </div>

      {/* ── Bloque de acciones ── */}
      <nav className="flex flex-col gap-0.5 px-2 pb-2">
        <ActionRow icon={<UndoIcon />} label="Back" onClick={onClose} />
        <ActionRow
          icon={<EditSquareIcon />}
          label="New chat"
          onClick={() => assistantStore.nuevaConversacion()}
        />
        <ActionRow
          icon={<ShuffleIcon />}
          label="Update Model"
          disabled
          title="Próximamente"
        />
      </nav>

      {/* ── Historial agrupado (datos de ejemplo), scrollable ── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {GRUPOS_HISTORIAL.map((grupo, gi) => (
          <div key={grupo.label} className="mt-6 first:mt-4">
            <p className="px-3 pb-2 text-xs text-gray-400 dark:text-gray-500">
              {grupo.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {grupo.items.map((titulo, ii) => {
                const id = `${gi}:${ii}`;
                const activa = id === activo;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActivo(id)}
                    className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      activa
                        ? "bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white"
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                    }`}
                  >
                    {titulo}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ActionRow — fila del bloque de acciones (ícono + label), neutra.
 * Cuando `disabled`, opacidad reducida y `cursor-not-allowed`.
 */
const ActionRow = ({
  icon,
  label,
  onClick,
  disabled,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-white/5"
  >
    <span className="text-gray-500 dark:text-gray-400">{icon}</span>
    {label}
  </button>
);

// ═══════════════════════════════════════════════════════════════════════════
// ÍCONOS (SVG inline — stroke currentColor, línea fina, ~18px)
// ═══════════════════════════════════════════════════════════════════════════

/** Glifo de "diseño/pluma": cuadro con una pluma diagonal. */
const DesignIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20h4L20 8a2 2 0 0 0-2.83-2.83L5 17v3z" />
    <path d="M14 6l4 4" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

/** Flecha curva de "responder/undo" (↰). */
const UndoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 14 4 9 9 4" />
    <path d="M4 9h11a5 5 0 0 1 5 5v1a5 5 0 0 1-5 5H8" />
  </svg>
);

/** Cuadro con una pluma en la esquina (edit-square). */
const EditSquareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

/** Dos flechas cruzadas / shuffle. */
const ShuffleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="16 3 21 3 21 8" />
    <line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="21 16 21 21 16 21" />
    <line x1="15" y1="15" x2="21" y2="21" />
    <line x1="4" y1="4" x2="9" y2="9" />
  </svg>
);

export default ConversationsSidebar;
