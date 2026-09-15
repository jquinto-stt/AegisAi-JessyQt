import { useState } from "react";
import { useNavigate } from "react-router";
import { PageMeta } from "@/shell/meta";
import { CHATS, type Chat, type ChatMensaje } from "./chats.mock";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const inicialesDe = (nombre: string) => {
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
};

/** Último mensaje del chat, recortado para la vista previa de la lista. */
const ultimoTexto = (chat: Chat) => {
  const last = chat.mensajes[chat.mensajes.length - 1];
  return last ? last.texto.replace(/\n/g, " ") : "";
};

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SimuladorWhatsApp — vista oculta (/wa) que simula el WhatsApp del cliente.
 *
 * Solo lectura: muestra 3 conversaciones guionadas (mock) entre clientes y el
 * bot de turnos. Los mensajes del bot pueden traer un link que navega a una
 * vista de la app (ej. la encuesta). No es parte del panel — es una demo del
 * canal externo.
 */
export const SimuladorWhatsApp = () => {
  const [activoId, setActivoId] = useState<string>(CHATS[0]?.id ?? "");
  const activo = CHATS.find((c) => c.id === activoId) ?? CHATS[0];

  return (
    <>
      <PageMeta title="Simulador de WhatsApp" description="Conversaciones de ejemplo cliente ↔ bot (solo lectura)" />

      <div className="flex h-screen bg-gray-100 dark:bg-gray-950">
        {/* ── Columna izquierda: lista de chats ── */}
        <aside className="flex w-full max-w-xs flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-4 dark:border-gray-800">
            <WhatsAppMark />
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Simulador de WhatsApp</p>
              <p className="text-xs text-gray-400">Conversaciones de ejemplo</p>
            </div>
          </div>

          <ul className="flex-1 overflow-y-auto">
            {CHATS.map((chat) => {
              const activoItem = chat.id === activo?.id;
              return (
                <li key={chat.id}>
                  <button
                    onClick={() => setActivoId(chat.id)}
                    className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors ${
                      activoItem
                        ? "border-brand-500 bg-brand-50/60 dark:bg-brand-500/10"
                        : "border-transparent hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                      {inicialesDe(chat.nombre)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">{chat.nombre}</p>
                      <p className="truncate text-xs text-brand-600 dark:text-brand-400">{chat.escenario}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-400">{ultimoTexto(chat)}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* ── Columna derecha: conversación ── */}
        <section className="flex min-w-0 flex-1 flex-col">
          {activo && (
            <>
              {/* Header de la conversación */}
              <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                  {inicialesDe(activo.nombre)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{activo.nombre}</p>
                  <p className="text-xs text-gray-400">{activo.telefono}</p>
                </div>
              </header>

              {/* Hilo de mensajes — fondo tenue tipo chat */}
              <div className="flex-1 overflow-y-auto bg-[#efeae2] px-4 py-6 dark:bg-gray-800/40">
                <div className="mx-auto flex max-w-2xl flex-col gap-2">
                  <p className="mx-auto mb-2 rounded-full bg-white/70 px-3 py-1 text-center text-xs text-gray-500 shadow-sm dark:bg-gray-900/70 dark:text-gray-400">
                    Conversación simulada · {activo.escenario}
                  </p>
                  {activo.mensajes.map((m, i) => <Burbuja key={i} m={m} />)}
                </div>
              </div>

              {/* Barra deshabilitada de solo lectura */}
              <div className="border-t border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2.5 text-sm text-gray-400 dark:bg-gray-800">
                  <LockIcon />
                  Vista de solo lectura (simulación)
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// BURBUJA
// ═══════════════════════════════════════════════════════════════════════════

/** Una burbuja de mensaje: cliente a la derecha (verde), bot a la izquierda (blanco). */
const Burbuja = ({ m }: { m: ChatMensaje }) => {
  const navigate = useNavigate();
  const esCliente = m.autor === "cliente";

  return (
    <div className={`flex ${esCliente ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
          esCliente
            ? "rounded-br-sm bg-[#d9fdd3] text-gray-800 dark:bg-brand-500/30 dark:text-white/90"
            : "rounded-bl-sm bg-white text-gray-800 dark:bg-gray-900 dark:text-white/90"
        }`}
      >
        <p className="whitespace-pre-line text-sm leading-relaxed">{m.texto}</p>

        {/* Link del bot (ej. encuesta) → navega dentro de la app */}
        {m.link && (
          <button
            onClick={() => navigate(m.link!.to)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400"
          >
            <LinkIcon />
            {m.link.label}
          </button>
        )}

        <p className={`mt-1 text-right text-[10px] ${esCliente ? "text-gray-500 dark:text-white/50" : "text-gray-400"}`}>
          {m.hora}
        </p>
      </div>
    </div>
  );
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

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
);

export default SimuladorWhatsApp;
