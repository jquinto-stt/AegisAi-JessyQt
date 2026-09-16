import { useState, type KeyboardEvent } from "react";
import { observer } from "mobx-react-lite";

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Composer — entrada del Asistente con aspecto de TARJETA (concepto "AI
 * Assistant").
 *
 * A diferencia de una barra fina, este composer es un contenedor redondeado con
 * sombra suave: arriba un `textarea` que crece con el contenido y abajo una fila
 * con una etiqueta discreta "Asistente IA" (con ícono sparkle) a la izquierda y
 * un BOTÓN CIRCULAR de enviar (flecha hacia arriba) a la derecha.
 *
 * Comportamiento (sin cambios respecto de la versión previa):
 *   - `onEnviar(texto)` se dispara con el texto ya normalizado (`trim`).
 *   - Enter (sin Shift) envía; Shift+Enter inserta un salto de línea.
 *   - Solo envía si el texto no queda vacío; al enviar se limpia el input.
 *   - Mientras `pensando` es `true`, el textarea y el botón se deshabilitan y el
 *     botón muestra un spinner en lugar de la flecha.
 */
export const Composer = observer(
  ({ onEnviar, pensando }: { onEnviar: (texto: string) => void; pensando?: boolean }) => {
    const [texto, setTexto] = useState("");

    const enviar = () => {
      if (pensando) return;
      const limpio = texto.trim();
      if (!limpio) return;
      onEnviar(limpio);
      setTexto("");
    };

    /** Enter (sin Shift) envía; Shift+Enter deja el salto de línea natural. */
    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        enviar();
      }
    };

    const deshabilitado = Boolean(pensando) || texto.trim().length === 0;

    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {/* ── Textarea (sin borde propio, fondo transparente) ── */}
        <textarea
          rows={2}
          value={texto}
          disabled={pensando}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="¿Cómo puedo ayudarte?"
          className="max-h-48 min-h-[3.5rem] w-full resize-none bg-transparent px-1 py-1.5 text-base text-gray-800 placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:text-white/90"
        />

        {/* ── Fila inferior: etiqueta (izq) + botón circular (der) ── */}
        <div className="mt-1 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            <SparkleIcon />
            AI Assistant
          </span>

          <button
            type="button"
            onClick={enviar}
            disabled={deshabilitado}
            aria-label="Enviar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-30 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-100"
          >
            {pensando ? (
              <span className="h-3 w-3 rounded-xs bg-current" />
            ) : (
              <ArrowUpIcon />
            )}
          </button>
        </div>
      </div>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════

/** Chispa/estrella decorativa junto a la etiqueta "Asistente IA". */
const SparkleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
  </svg>
);

/** Flecha hacia arriba del botón circular de enviar. */
const ArrowUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
  </svg>
);

/** Spinner mientras el motor procesa la pregunta. */
const SpinnerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2} className="opacity-25" />
    <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
  </svg>
);

export default Composer;
