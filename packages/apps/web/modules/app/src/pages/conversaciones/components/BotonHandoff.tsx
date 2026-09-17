import { observer } from "mobx-react-lite";

import { conversacionesStore } from "@/stores/conversaciones.store";
import { sessionStore } from "@/stores/session.store";
import { puedeResponderConversacion } from "@/stores/acceso.utils";

// ═══════════════════════════════════════════════════════════════════════════
// BOTÓN PRINCIPAL — Tomar / Devolver (handoff bot ↔ humano)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * `BotonHandoff` — botón principal de la cabecera del chat en `/conversaciones`
 * (tarea 6.5). Alterna entre **[Tomar conversación]** y **[Devolver al bot]**
 * según el estado/atención de la conversación seleccionada.
 *
 * Reglas de presentación:
 *   - `estado ∈ {en_espera, abierta}` → **[Tomar conversación]**, que llama
 *     `conversacionesStore.tomar(convId, operadorId)` (Req 4.2).
 *   - `estado === "atendida"` (atención humano) → **[Devolver al bot]**, que
 *     llama `conversacionesStore.devolver(convId)` (Req 4.4).
 *   - `estado === "cerrada"` → no se muestra acción de tomar/devolver.
 *
 * Gating por capacidad (Req 4.3): el botón se renderiza / habilita **solo** si
 * la sesión tiene `channels.respond` (`puedeResponderConversacion()`). Sin el
 * permiso no se muestra ninguna acción (se oculta), coherente con que el
 * handoff está reservado a quien puede responder.
 *
 * Solo se cablea cuando hay una conversación seleccionada (la Page pasa el
 * `convId` de `seleccionadaId`); además comprobamos que la cabecera exista.
 *
 * Operador de la sesión (para `tomar`): se toma de
 * `sessionStore.accessContext.operadorId` — el id del operador **efectivo** de
 * la sesión (cuando se está simulando "Viendo como", es el del operador
 * simulado). En una sesión directa de administrador ese campo es `null`, por lo
 * que se usa el `rolId` efectivo como identificador estable del actor, con un
 * último recurso `"desconocido"` para no pasar cadena vacía al store.
 *
 * Es `observer` para reaccionar a cambios de estado/atención y de capacidad por
 * reactividad MobX.
 *
 * Requisitos: 4.2, 4.3, 4.4.
 */
export const BotonHandoff = observer(({ convId }: { convId: string }) => {
  const conv = conversacionesStore.getConversacion(convId);

  // Gating (Req 4.3): sin `channels.respond` no se ofrece la acción.
  if (!puedeResponderConversacion()) return null;

  // Sin cabecera de conversación no hay nada que operar.
  if (!conv) return null;

  const { estado } = conv;

  // Cerrada: no se muestra acción de tomar/devolver.
  if (estado === "cerrada") return null;

  // ── Devolver al bot: la conversación la atiende un humano (atendida) ──
  if (estado === "atendida") {
    return (
      <button
        type="button"
        onClick={() => conversacionesStore.devolver(convId)}
        className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        Devolver al bot
      </button>
    );
  }

  // ── Tomar conversación: estado en_espera o abierta ──
  // (estado ∈ {"en_espera", "abierta"} en este punto)
  const operadorId =
    sessionStore.accessContext.operadorId ??
    sessionStore.accessContext.rolId ??
    "desconocido";

  return (
    <button
      type="button"
      onClick={() => conversacionesStore.tomar(convId, operadorId)}
      className="shrink-0 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
    >
      Tomar conversación
    </button>
  );
});

export default BotonHandoff;
