import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { assistantStore } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATIONS SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ConversationsSidebar — historial de conversaciones del asistente NECTO AI.
 *
 * De arriba a abajo:
 *   - Header: marca + botón de colapsar (chevron ‹) → `onClose`.
 *   - Acciones: "Volver" (→ `onClose`), "Nueva conversación"
 *     (→ `nuevaConversacion`), "Eliminar conversación" (→ `eliminarConversacion`,
 *     con confirmación en dos pasos).
 *   - Historial REAL, agrupado por antigüedad por el propio store.
 *
 * ── Qué cambió, y por qué ─────────────────────────────────────────────────
 *
 * 1) Datos y controles muertos (primera pasada). Esta barra tenía un array
 *    `GRUPOS_HISTORIAL` escrito a mano con seis títulos de ejemplo en inglés
 *    ("My store's performance", "Products Expected to"), agrupados como
 *    "Today" / "Yesterday" / "Last 7 days", y con la marca "Skymetrics" de la
 *    maqueta de referencia. El item activo era un `useState` local: **pulsar
 *    una conversación no abría nada**, solo movía el resaltado. Eran dos
 *    defectos a la vez —datos falsos y controles muertos— y el store ya tenía
 *    todo lo necesario (`conversacionesAgrupadas`, `conversacionActivaId`,
 *    `seleccionarConversacion`). Ahora el historial se lee del store y cada
 *    item hace lo que aparenta.
 *
 * 2) Idioma y un control imposible (esta pasada). El bloque de acciones seguía
 *    en inglés —"Back", "New chat", "Update Model"— en una interfaz
 *    enteramente en español. Y "Update Model" no era una función pendiente:
 *    era una función IMPOSIBLE. NECTO AI corre sobre un motor de reglas local
 *    (`LocalRuleEngine`), sin backend, sin API key y sin modelo; no hay nada
 *    que actualizar. Un control permanentemente deshabilitado que promete algo
 *    que no puede existir no es "próximamente", es ruido.
 *
 *    En su lugar va "Eliminar conversación", que es una capacidad REAL que ya
 *    existía y estaba probada (`AssistantStore.eliminarConversacion`, cubierta
 *    en `assistant.store.multiconv.test.ts`) pero **no era alcanzable desde
 *    ninguna pantalla**. Mismo patrón que el historial: el store ya lo tenía.
 *
 *    Se pide confirmación en dos pasos porque borrar es destructivo y la barra
 *    no tiene modal propio; el armado se desarma solo al cambiar de
 *    conversación, para que no quede un "¿seguro?" colgando apuntando a otro
 *    hilo.
 *
 * Nota sobre el borrado de la última conversación: `eliminarConversacion` no
 * deja la pantalla sin hilo, crea una vacía. Por eso el botón se deshabilita
 * cuando no hay nada que borrar (una sola conversación ya vacía): así el clic
 * nunca es un no-op silencioso.
 */
export const ConversationsSidebar = observer(({ onClose }: { onClose: () => void }) => {
  const grupos = assistantStore.conversacionesAgrupadas;
  const activaId = assistantStore.conversacionActivaId;
  const activa = assistantStore.conversacionActiva;
  const total = assistantStore.conversaciones.length;
  const hayMensajes = assistantStore.mensajes.length > 0;

  // Confirmación en dos pasos del borrado.
  const [confirmando, setConfirmando] = useState(false);

  // Cambiar de conversación desarma la confirmación pendiente.
  useEffect(() => {
    setConfirmando(false);
  }, [activaId]);

  // Solo hay algo que borrar si queda más de una conversación o la activa tiene
  // contenido. Si no, el clic no haría nada y el botón mentiría.
  const puedeEliminar = activa !== null && (total > 1 || hayMensajes);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* ── Header: marca + colapsar ── */}
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
            <DesignIcon />
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            NECTO AI
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
      {confirmando && activa ? (
        <div
          data-confirmar-eliminar="si"
          className="mx-2 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/50 dark:bg-red-950/30"
        >
          <p className="text-xs text-red-700 dark:text-red-300">
            ¿Eliminar «{activa.titulo}»? No se puede deshacer.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              data-accion="confirmar-eliminar"
              onClick={() => {
                assistantStore.eliminarConversacion(activa.id);
                setConfirmando(false);
              }}
              className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700"
            >
              Eliminar
            </button>
            <button
              type="button"
              data-accion="cancelar-eliminar"
              onClick={() => setConfirmando(false)}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <nav className="flex flex-col gap-0.5 px-2 pb-2">
          <ActionRow
            accion="volver"
            icon={<UndoIcon />}
            label="Volver"
            onClick={onClose}
          />
          <ActionRow
            accion="nueva"
            icon={<EditSquareIcon />}
            label="Nueva conversación"
            onClick={() => assistantStore.nuevaConversacion()}
          />
          <ActionRow
            accion="eliminar"
            icon={<TrashIcon />}
            label="Eliminar conversación"
            disabled={!puedeEliminar}
            title={
              puedeEliminar
                ? `Eliminar «${activa?.titulo ?? ""}»`
                : "No hay nada que eliminar"
            }
            onClick={() => setConfirmando(true)}
          />
        </nav>
      )}

      {/* ── Historial real, agrupado por antigüedad ── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {grupos.length === 0 ? (
          <p className="mt-6 px-3 text-xs text-gray-400 dark:text-gray-500">
            Todavía no hay conversaciones.
          </p>
        ) : (
          grupos.map((grupo) => (
            <div key={grupo.label} className="mt-6 first:mt-4">
              <p className="px-3 pb-2 text-xs text-gray-400 dark:text-gray-500">
                {grupo.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {grupo.items.map((conv) => {
                  const activaItem = conv.id === activaId;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      data-conv={conv.id}
                      data-activa={activaItem ? "si" : "no"}
                      onClick={() => assistantStore.seleccionarConversacion(conv.id)}
                      title={conv.titulo}
                      className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        activaItem
                          ? "bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white"
                          : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                      }`}
                    >
                      {conv.titulo}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
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
  accion,
  icon,
  label,
  onClick,
  disabled,
  title,
}: {
  accion: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) => (
  <button
    type="button"
    data-accion={accion}
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

/** Flecha curva de "responder/volver" (↰). */
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

/** Papelera. */
const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

export default ConversationsSidebar;
