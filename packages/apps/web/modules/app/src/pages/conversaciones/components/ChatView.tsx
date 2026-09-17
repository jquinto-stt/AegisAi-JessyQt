import { observer } from "mobx-react-lite";

import { conversacionesStore } from "@/stores/conversaciones.store";
import type { EventoSistema, Mensaje } from "@/stores/conversaciones.types";

// ═══════════════════════════════════════════════════════════════════════════
// CHAT VIEW — línea de tiempo unificada (consola del operador)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * `ChatView` — columna central de `/conversaciones` (tarea 6.3).
 *
 * Consume `conversacionesStore.lineaDeTiempo(convId)` y la renderiza como un
 * hilo de chat desde la perspectiva del OPERADOR:
 *
 * - Mensajes y eventos ya vienen intercalados por timestamp ascendente desde el
 *   store (getter derivado), preservando el orden de inserción ante timestamps
 *   idénticos (Req 2.1).
 * - Mensajes con autor `cliente` → alineados a la DERECHA con etiqueta de
 *   autoría visible (Req 2.2).
 * - Mensajes con autor `negocio` o `bot` → alineados a la IZQUIERDA con etiqueta
 *   de autoría visible que DISTINGUE `negocio` (asesor) de `bot` (asistente)
 *   (Req 2.3).
 * - Eventos de sistema → anotación centrada, visualmente diferenciada de las
 *   burbujas de cliente/negocio/bot (Req 2.4).
 * - Conversación sin mensajes ni eventos → indicador de conversación vacía
 *   (Req 2.5).
 *
 * Reutiliza el patrón visual del simulador (`Burbuja` / `LineaSistema`) para
 * consistencia, adaptado a la vista del operador (aquí el `cliente` va a la
 * derecha y el propio negocio/bot a la izquierda).
 *
 * Es `observer` para reaccionar en vivo a mensajes nuevos (cliente/negocio/bot)
 * y a los eventos de handoff por reactividad MobX.
 *
 * Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5.
 */
export const ChatView = observer(({ convId }: { convId: string }) => {
  const items = conversacionesStore.lineaDeTiempo(convId);

  // Indicador de conversación vacía (Req 2.5): ni mensajes ni eventos.
  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="rounded-full bg-gray-50 px-4 py-2 text-center text-sm text-gray-400 dark:bg-white/[0.03] dark:text-gray-500">
          Esta conversación aún no tiene mensajes.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-2">
      {items.map((item) =>
        item.clase === "mensaje" ? (
          <Burbuja key={item.data.id} m={item.data} />
        ) : (
          <LineaSistema key={item.data.id} e={item.data} />
        ),
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// BURBUJA / LÍNEA DE SISTEMA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Una burbuja de mensaje desde la vista del OPERADOR:
 * - `cliente` → derecha, con etiqueta "Cliente" (Req 2.2).
 * - `negocio`/`bot` → izquierda, con etiqueta que distingue "Asesor" (negocio,
 *   el propio equipo) de "Asistente" (bot) (Req 2.3).
 */
const Burbuja = ({ m }: { m: Mensaje }) => {
  const esCliente = m.autor === "cliente";
  const etiqueta =
    m.autor === "cliente"
      ? "👤 Cliente"
      : m.autor === "bot"
        ? "🤖 Asistente"
        : "🧑‍💼 Asesor";

  return (
    <div className={`flex ${esCliente ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
          esCliente
            ? "rounded-br-sm bg-brand-500 text-white dark:bg-brand-500/80"
            : m.autor === "bot"
              ? "rounded-bl-sm bg-blue-50 text-gray-800 dark:bg-blue-500/10 dark:text-white/90"
              : "rounded-bl-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90"
        }`}
      >
        <p
          className={`mb-0.5 text-[11px] font-semibold ${
            esCliente
              ? "text-white/80"
              : m.autor === "bot"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {etiqueta}
        </p>
        <p className="whitespace-pre-line text-sm leading-relaxed">{m.contenido.texto}</p>
        <p
          className={`mt-1 text-right text-[10px] ${
            esCliente ? "text-white/60" : "text-gray-400"
          }`}
        >
          {horaDe(m.timestamp)}
        </p>
      </div>
    </div>
  );
};

/**
 * Evento de sistema: anotación centrada, visualmente diferenciada de las
 * burbujas de cliente/negocio/bot (Req 2.4).
 */
const LineaSistema = ({ e }: { e: EventoSistema }) => (
  <p className="mx-auto my-1 max-w-[90%] rounded-full border border-gray-200/70 bg-gray-50 px-3 py-1 text-center text-xs text-gray-500 dark:border-gray-700/70 dark:bg-white/[0.03] dark:text-gray-400">
    <span aria-hidden className="mr-1">•</span>
    {e.texto}
  </p>
);

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Hora HH:MM a partir de un timestamp ISO, para la burbuja estilo chat. */
const horaDe = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default ChatView;
