import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Avatar } from "@/elements/ui/avatar";
import { Dropdown, DropdownItem } from "@/elements/ui/dropdown";
import { MoreDotIcon } from "@/icons";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { BotonHandoff } from "./BotonHandoff";
import {
  AVATAR_MAP,
  inicialesDe,
  statusDe,
  horaDe,
} from "../conversaciones.utils";

interface ChatViewProps {
  convId: string;
  onTogglePanel?: () => void;
  panelExpandido?: boolean;
  onToggleBandeja?: () => void;
  bandejaExpandida?: boolean;
  /**
   * Oculta la cabecera propia del chat.
   *
   * Es una opción de PRESENTACIÓN, no un cambio de contrato: la consola completa
   * la necesita (es la única cabecera de la superficie), pero dentro del
   * `ChatDrawer` ya existe una cabecera con la identidad del cliente y el nº de
   * pedido. Sin esta prop el drawer mostraría DOS avatares y DOS nombres para el
   * mismo contacto — una identidad duplicada, que es justo el defecto de
   * arquitectura de información que hay que evitar.
   */
  sinCabecera?: boolean;
}

export const ChatView = observer(({
  convId,
  onTogglePanel,
  panelExpandido,
  onToggleBandeja,
  bandejaExpandida = true,
  sinCabecera = false,
}: ChatViewProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const conv = conversacionesStore.getConversacion(convId);
  const items = conversacionesStore.lineaDeTiempo(convId);

  if (!conv) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-gray-400">
        <p className="text-sm">Selecciona una conversación para comenzar</p>
      </div>
    );
  }

  const avatarSrc = AVATAR_MAP[conv.id] || "";

  return (
    <div className="animate-aparecer flex flex-1 flex-col overflow-hidden">
      {/* ── Cabecera del Chat (Estilo Webi.AI Elements / TailAdmin) ──
          Se omite cuando el chat se embebe en el drawer, que ya aporta su propia
          cabecera con la identidad del cliente y el nº de pedido. */}
      {!sinCabecera && (
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-transparent xl:px-6">
        <div className="flex items-center gap-3">
          {onToggleBandeja && (
            <button
              type="button"
              onClick={onToggleBandeja}
              title={bandejaExpandida ? "Colapsar chats" : "Mostrar lista de chats"}
              aria-label={bandejaExpandida ? "Colapsar chats" : "Mostrar lista de chats"}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                !bandejaExpandida
                  ? "border-brand-500/30 bg-brand-50 text-brand-600 shadow-2xs dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
              }`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
                {bandejaExpandida ? (
                  <path d="M14 9l-3 3 3 3" />
                ) : (
                  <path d="M12 9l3 3-3 3" />
                )}
              </svg>
            </button>
          )}

          <Avatar
            src={avatarSrc}
            alt={conv.contacto.nombre}
            initials={inicialesDe(conv.contacto.nombre)}
            size="large"
            status={statusDe(conv.estado)}
          />
          <div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {conv.contacto.nombre}
            </h4>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {conv.contacto.telefono}
            </span>
          </div>
        </div>

        {/* Acciones superiores: Handoff, Alternar información y Menú */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Botón Tomar / Devolver en estilo índigo / sutil (no rojo) */}
          <BotonHandoff convId={conv.id} />

          {/* Alternar panel de información del usuario */}
          {onTogglePanel && (
            <button
              type="button"
              onClick={onTogglePanel}
              title={panelExpandido ? "Ocultar información del contacto" : "Ver información del contacto"}
              aria-label={panelExpandido ? "Ocultar información del contacto" : "Ver información del contacto"}
              className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all ${
                panelExpandido
                  ? "border-brand-500/30 bg-brand-50 text-brand-600 shadow-2xs dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
              }`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M15 3v18" />
                {panelExpandido ? (
                  <path d="M10 9l-3 3 3 3" />
                ) : (
                  <path d="M8 9l3 3-3 3" />
                )}
              </svg>
              <span className="hidden sm:inline">Info</span>
            </button>
          )}

          {/* Menú de opciones */}
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-white"
              aria-label="Más opciones"
            >
              <MoreDotIcon className="h-5 w-5" />
            </button>
            <Dropdown
              isOpen={menuOpen}
              onClose={() => setMenuOpen(false)}
              className="w-48 p-1.5"
            >
              {conv.estado !== "cerrada" ? (
                <DropdownItem
                  onItemClick={() => {
                    conversacionesStore.cerrar(conv.id);
                    setMenuOpen(false);
                  }}
                  className="text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  Cerrar conversación
                </DropdownItem>
              ) : (
                <div className="px-3 py-1.5 text-xs text-gray-400">
                  Conversación cerrada
                </div>
              )}
            </Dropdown>
          </div>
        </div>
      </div>
      )}

      {/* ── Interior del Chat (Diálogo de 2 vías: Cliente a la izquierda, Respuestas a la derecha) ── */}
      <div className="flex-1 space-y-6 overflow-y-auto p-5 custom-scrollbar xl:space-y-7 xl:p-6">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="rounded-full bg-gray-100 px-4 py-2 text-center text-xs text-gray-400 dark:bg-white/5 dark:text-gray-500">
              Esta conversación aún no tiene mensajes.
            </p>
          </div>
        ) : (
          items.map((item) => {
            // Cada ítem entra con `animate-entrada-lista` (fundido + 6 px de subida).
            // Sin escalonado a propósito: en un chat los mensajes no llegan juntos, y
            // retrasarlos por índice haría que el último en llegar esperase medio segundo
            // solo por tener un índice alto. El escalonado es para listas que se pintan
            // de golpe (tablas, grids), no para un hilo cronológico.
            // Eventos del sistema: sutiles y centrados
            if (item.clase === "evento") {
              return (
                <div
                  key={item.data.id}
                  className="animate-entrada-lista my-3 flex justify-center"
                >
                  <span className="rounded-full bg-gray-100/90 px-3.5 py-1 text-center text-[11px] text-gray-500 dark:bg-white/[0.05] dark:text-gray-400">
                    • {item.data.texto}
                  </span>
                </div>
              );
            }

            const m = item.data;
            const esCliente = m.autor === "cliente";
            const esBot = m.autor === "bot";

            // ── 1. CLIENTE: SIEMPRE a la IZQUIERDA con Avatar y burbuja gris suave ──
            if (esCliente) {
              return (
                <div key={m.id} className="animate-entrada-lista flex items-start gap-3 sm:gap-4">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                    <Avatar
                      src={avatarSrc}
                      initials={inicialesDe(conv.contacto.nombre)}
                      size="large"
                    />
                  </div>
                  <div className="max-w-[80%] sm:max-w-md">
                    <div className="rounded-2xl rounded-tl-sm bg-[#f4f5f7] px-4 py-3 text-sm text-gray-800 shadow-2xs dark:bg-white/[0.07] dark:text-white/90">
                      <p className="whitespace-pre-line leading-relaxed">{m.contenido.texto}</p>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                      {conv.contacto.nombre}, {horaDe(m.timestamp)}
                    </p>
                  </div>
                </div>
              );
            }

            // ── 2. BOT DE NUESTRA TIENDA: A la DERECHA con distintivo Bot / IA ──
            if (esBot) {
              return (
                <div key={m.id} className="animate-entrada-lista flex justify-end">
                  <div className="max-w-[80%] sm:max-w-md text-right">
                    <div className="rounded-2xl rounded-tr-sm bg-[#3a44c7] px-4 py-3 text-left text-sm text-white shadow-xs dark:bg-[#343cae]">
                      {/* Distintivo claro de Bot para diferenciarlo del asesor */}
                      <div className="mb-1 flex items-center justify-end gap-1.5 text-[11px] font-semibold text-indigo-200">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-300" />
                        <span>Bot Necto (IA)</span>
                      </div>
                      <p className="whitespace-pre-line leading-relaxed">{m.contenido.texto}</p>
                    </div>
                    <p className="mt-1.5 text-right text-xs text-gray-400 dark:text-gray-500">
                      Bot Necto, {horaDe(m.timestamp)}
                    </p>
                  </div>
                </div>
              );
            }

            // ── 3. ASESOR HUMANO (Equipo): A la DERECHA con Índigo vibrante #465fff ──
            return (
              <div key={m.id} className="animate-entrada-lista flex justify-end">
                <div className="max-w-[80%] sm:max-w-md text-right">
                  <div className="rounded-2xl rounded-tr-sm bg-[#465fff] px-4 py-3 text-left text-sm text-white shadow-xs">
                    {/* Distintivo claro de Asesor Humano */}
                    <div className="mb-1 flex items-center justify-end gap-1.5 text-[11px] font-semibold text-white/90">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      <span>Asesor Humano</span>
                    </div>
                    <p className="whitespace-pre-line leading-relaxed">{m.contenido.texto}</p>
                  </div>
                  <p className="mt-1.5 text-right text-xs text-gray-400 dark:text-gray-500">
                    {horaDe(m.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

export default ChatView;
