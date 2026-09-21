import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { inicialesDe } from "@/utils";
import { conversacionesStore } from "@/stores/conversaciones.store";
import type {
  Conversacion,
  ItemLineaTiempo,
  Mensaje,
  EventoSistema,
} from "@/stores/conversaciones.types";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Límite de caracteres del mensaje del cliente en `/wa` (Req 6.2/6.3). Coincide
 * con el límite que aplica `conversacionesStore.enviarComoCliente`; se replica
 * aquí solo para dar feedback previo al envío (contador + mensaje de error).
 */
const LIMITE_TEXTO = 2000;

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Hora HH:MM a partir de un timestamp ISO, para la burbuja estilo WhatsApp. */
const horaDe = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

/** Texto del último mensaje del hilo, recortado para la vista previa de la lista. */
const ultimoTexto = (items: ItemLineaTiempo[]) => {
  const last = items[items.length - 1];
  if (!last) return "";
  const t = last.clase === "mensaje" ? last.data.contenido.texto : last.data.texto;
  return t.replace(/\n/g, " ");
};

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SimuladorWhatsApp — vista del cliente (/wa) del canal WhatsApp.
 *
 * Refactor (tarea 8.1): representa al CLIENTE y consume el mismo
 * `conversacionesStore` que la consola `/conversaciones` (Req 6.1, 9.5). Es
 * bidireccional en vivo por reactividad MobX (`observer`): lo que el cliente
 * escribe aquí aparece en la consola y viceversa.
 *
 * - Input LIBRE editable en todo momento, sin candado de solo lectura
 *   (Req 6.4/6.5). Envía con `enviarComoCliente` validando 1–2000 caracteres:
 *   si el texto es vacío o excede el límite, se rechaza el envío, se conserva el
 *   texto y se muestra una indicación al usuario (Req 6.2/6.3).
 * - Muestra los mensajes de `negocio` y de `bot` en cuanto aparecen (Req 6.3/6.4);
 *   al enviar en modo bot, el store dispara `simularRespuestaBot` y la respuesta
 *   aparece sola.
 * - Ruta standalone fuera del `AppShell` (Req 6.8): este refactor solo cambia el
 *   componente, no el registro de rutas.
 *
 * El comando rápido "Hablar con un asesor" (Req 6.6/6.7, tarea 8.2) vive en la
 * subvista `ConversacionActiva`, junto al composer: ejecuta `solicitarHumano`
 * sobre la conversación activa y, defensivamente, avisa si no la hay.
 */
export const SimuladorWhatsApp = observer(() => {
  // Conversación "activa" = la vista del cliente. Para mantener la demo simple y
  // sincronizada con la consola, se usa `seleccionadaId` del store si ya hay una
  // selección; si no, la primera conversación NO cerrada; y como último recurso
  // la primera del store (Req 6.1).
  const conversaciones = conversacionesStore.conversaciones;

  const defaultId = useMemo(() => {
    const abierta = conversaciones.find((c) => c.estado !== "cerrada");
    return (abierta ?? conversaciones[0])?.id ?? "";
  }, [conversaciones]);

  // Selección local del simulador (permite elegir contacto sin afectar la
  // selección de la consola). Arranca en la selección del store si existe.
  const [localId, setLocalId] = useState<string>(
    conversacionesStore.seleccionadaId ?? defaultId,
  );

  const activoId = conversacionesStore.getConversacion(localId)
    ? localId
    : defaultId;
  const activo = conversacionesStore.getConversacion(activoId);

  return (
    <>
      <PageMeta
        title="Simulador de WhatsApp"
        description="Vista del cliente del canal WhatsApp (bidireccional con la consola)"
      />

      <div className="flex h-screen bg-gray-100 dark:bg-gray-950">
        {/* ── Columna izquierda: lista de conversaciones ── */}
        <aside className="flex w-full max-w-xs flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-4 dark:border-gray-800">
            <WhatsAppMark />
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Simulador de WhatsApp</p>
              <p className="text-xs text-gray-400">Vista del cliente</p>
            </div>
          </div>

          <ul className="flex-1 overflow-y-auto">
            {conversaciones.map((conv) => {
              const activoItem = conv.id === activoId;
              const items = conversacionesStore.lineaDeTiempo(conv.id);
              return (
                <li key={conv.id}>
                  <button
                    onClick={() => setLocalId(conv.id)}
                    className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors ${
                      activoItem
                        ? "border-brand-500 bg-brand-50/60 dark:bg-brand-500/10"
                        : "border-transparent hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                      {inicialesDe(conv.contacto.nombre)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                        {conv.contacto.nombre}
                      </p>
                      <p className="truncate text-xs text-brand-600 dark:text-brand-400">
                        {etiquetaEstado(conv)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-400">{ultimoTexto(items)}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* ── Columna derecha: conversación activa ── */}
        <section className="flex min-w-0 flex-1 flex-col">
          {activo ? (
            <ConversacionActiva conv={activo} />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
              No hay conversaciones disponibles.
            </div>
          )}
        </section>
      </div>
    </>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSACIÓN ACTIVA (hilo + input libre)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Vista de la conversación activa: header, hilo (línea de tiempo unificada) e
 * input libre del cliente. Es `observer` para reaccionar a mensajes nuevos
 * (negocio/bot) que aparezcan por reactividad del store (Req 6.4).
 */
const ConversacionActiva = observer(({ conv }: { conv: Conversacion }) => {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Aviso del comando rápido "Hablar con un asesor" (Req 6.6/6.7): al ejecutar
  // sin una conversación activa se muestra la indicación en vez de actuar.
  const [avisoAsesor, setAvisoAsesor] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const items = conversacionesStore.lineaDeTiempo(conv.id);

  const enviar = () => {
    const limpio = texto.trim();
    // Validación 1–2000 caracteres (Req 6.2/6.3): si es inválido, se rechaza el
    // envío, se CONSERVA el texto introducido y se muestra la indicación.
    if (limpio === "") {
      setError("Escribe un mensaje antes de enviar.");
      return;
    }
    if (texto.length > LIMITE_TEXTO) {
      setError(`El mensaje supera el máximo de ${LIMITE_TEXTO} caracteres.`);
      return;
    }

    conversacionesStore.enviarComoCliente(conv.id, texto);
    setTexto("");
    setError(null);

    // Auto-scroll al final tras enviar (mejor demo del look & feel de chat).
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  /**
   * Comando rápido "Hablar con un asesor" (tarea 8.2).
   * - Con conversación activa: `solicitarHumano` deja el hilo en_espera/atención
   *   humano y registra el evento, que aparece en la línea de tiempo por
   *   reactividad (Req 6.6).
   * - Sin conversación activa (defensivo: `conv` inexistente en el store):
   *   se muestra la indicación en vez de ejecutar la acción (Req 6.7).
   */
  const solicitarAsesor = () => {
    if (!conv || !conversacionesStore.getConversacion(conv.id)) {
      setAvisoAsesor("No hay una conversación activa para pedir un asesor.");
      return;
    }
    conversacionesStore.solicitarHumano(conv.id);
    setAvisoAsesor(null);
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  const excedido = texto.length > LIMITE_TEXTO;

  return (
    <>
      {/* Header de la conversación */}
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
          {inicialesDe(conv.contacto.nombre)}
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{conv.contacto.nombre}</p>
          <p className="text-xs text-gray-400">{conv.contacto.telefono}</p>
        </div>
      </header>

      {/* Hilo de mensajes — fondo tenue tipo chat */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#efeae2] px-4 py-6 dark:bg-gray-800/40">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {items.length === 0 ? (
            <p className="mx-auto rounded-full bg-white/70 px-3 py-1 text-center text-xs text-gray-500 shadow-theme-xs dark:bg-gray-900/70 dark:text-gray-400">
              Aún no hay mensajes. Escribe para empezar la conversación.
            </p>
          ) : (
            items.map((item) =>
              item.clase === "mensaje" ? (
                <Burbuja key={item.data.id} m={item.data} />
              ) : (
                <LineaSistema key={item.data.id} e={item.data} />
              ),
            )
          )}
        </div>
      </div>

      {/* Barra de composición — input LIBRE editable siempre (Req 6.4/6.5) */}
      <div className="border-t border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
        {/* Acción rápida "Hablar con un asesor" (Req 6.6/6.7) */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={solicitarAsesor}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
          >
            <span aria-hidden>🙋</span>
            Hablar con un asesor
          </button>
          {avisoAsesor && (
            <span className="text-xs font-medium text-warning-600 dark:text-warning-400" role="status">
              {avisoAsesor}
            </span>
          )}
        </div>

        {error && (
          <p className="mb-2 text-xs font-medium text-error-500" role="alert">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Escribe un mensaje"
            className={`max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border bg-gray-100 px-4 py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-400 dark:bg-gray-800 dark:text-white/90 ${
              excedido
                ? "border-error-400 focus:border-error-400"
                : "border-transparent"
            }`}
          />
          <button
            onClick={enviar}
            aria-label="Enviar mensaje"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-success-500 text-white transition-colors hover:bg-success-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SendIcon />
          </button>
        </div>
        <div className="mt-1 flex justify-end">
          <span className={`text-[10px] ${excedido ? "text-error-500" : "text-gray-400"}`}>
            {texto.length}/{LIMITE_TEXTO}
          </span>
        </div>
      </div>
    </>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// BURBUJA / LÍNEA DE SISTEMA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Una burbuja de mensaje. Desde la vista del cliente: el propio cliente a la
 * derecha (verde), negocio/bot a la izquierda (blanco), con etiqueta de autoría
 * que distingue al asesor (negocio) del bot (Req 6.4 / analogía Req 2.2/2.3).
 */
const Burbuja = ({ m }: { m: Mensaje }) => {
  const esCliente = m.autor === "cliente";
  const etiqueta =
    m.autor === "bot" ? "🤖 Asistente" : m.autor === "negocio" ? "👤 Asesor" : null;

  return (
    <div className={`flex ${esCliente ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-theme-xs ${
          esCliente
            ? "rounded-br-sm bg-[#d9fdd3] text-gray-800 dark:bg-brand-500/30 dark:text-white/90"
            : "rounded-bl-sm bg-white text-gray-800 dark:bg-gray-900 dark:text-white/90"
        }`}
      >
        {etiqueta && (
          <p className="mb-0.5 text-[11px] font-semibold text-brand-600 dark:text-brand-400">
            {etiqueta}
          </p>
        )}
        <p className="whitespace-pre-line text-sm leading-relaxed">{m.contenido.texto}</p>
        <p className={`mt-1 text-right text-[10px] ${esCliente ? "text-gray-500 dark:text-white/50" : "text-gray-400"}`}>
          {horaDe(m.timestamp)}
        </p>
      </div>
    </div>
  );
};

/** Evento de sistema: anotación centrada, diferenciada de las burbujas (Req 2.4). */
const LineaSistema = ({ e }: { e: EventoSistema }) => (
  <p className="mx-auto my-1 rounded-full bg-white/70 px-3 py-1 text-center text-xs text-gray-500 shadow-theme-xs dark:bg-gray-900/70 dark:text-gray-400">
    {e.texto}
  </p>
);

/** Etiqueta corta de estado del hilo para la vista previa de la lista. */
const etiquetaEstado = (conv: Conversacion) => {
  switch (conv.estado) {
    case "abierta":
      return conv.atencion === "bot" ? "🤖 Atendido por el bot" : "En conversación";
    case "en_espera":
      return "⏳ Esperando un asesor";
    case "atendida":
      return "👤 Con un asesor";
    case "cerrada":
      return "✓ Conversación cerrada";
    default:
      return "";
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════

const WhatsAppMark = () => (
  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-500 text-white">
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20z" />
    </svg>
  </span>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);

export default SimuladorWhatsApp;
