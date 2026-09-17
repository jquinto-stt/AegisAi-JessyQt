import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Avatar } from "@/elements/ui/avatar";
import { Dropdown, DropdownItem } from "@/elements/ui/dropdown";
import { CallIcon, VideoIcon, MoreDotIcon } from "@/icons";
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
}

export const ChatView = observer(({ convId, onTogglePanel, panelExpandido }: ChatViewProps) => {
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
  const estadoLabel =
    conv.estado === "abierta"
      ? "En línea"
      : conv.estado === "en_espera"
        ? "Esperando asesor"
        : conv.estado === "atendida"
          ? "En atención"
          : "Cerrada";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Cabecera del Chat (ChatBoxHeader) */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3.5 dark:border-gray-800 dark:bg-transparent xl:px-6">
        <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <span>{estadoLabel}</span>
              <span>•</span>
              <span>{conv.contacto.telefono}</span>
            </div>
          </div>
        </div>

        {/* Acciones de la cabecera */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Botón Tomar / Devolver Handoff */}
          <BotonHandoff convId={conv.id} />

          {/* Llamada */}
          <button
            type="button"
            title="Llamada"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <CallIcon className="h-5 w-5 stroke-current" />
          </button>

          {/* Video */}
          <button
            type="button"
            title="Videollamada"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <VideoIcon className="h-5 w-5 fill-current" />
          </button>

          {/* Alternar panel de contexto */}
          {onTogglePanel && (
            <button
              type="button"
              onClick={onTogglePanel}
              title={panelExpandido ? "Cerrar panel de contexto" : "Ver información de contacto"}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                panelExpandido
                  ? "border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400"
                  : "border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
              }`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </button>
          )}

          {/* Dropdown 3 dots */}
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

      {/* Cuerpo del Chat (ChatBoxBody) */}
      <div className="flex-1 space-y-6 overflow-y-auto p-5 custom-scrollbar xl:space-y-7 xl:p-6">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="rounded-full bg-gray-100 px-4 py-2 text-center text-xs text-gray-400 dark:bg-white/5 dark:text-gray-500">
              Esta conversación aún no tiene mensajes.
            </p>
          </div>
        ) : (
          items.map((item) => {
            if (item.clase === "evento") {
              return (
                <div key={item.data.id} className="flex justify-center my-3">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-center text-[11px] text-gray-500 dark:bg-white/5 dark:text-gray-400">
                    • {item.data.texto}
                  </span>
                </div>
              );
            }

            const m = item.data;
            const esCliente = m.autor === "cliente";
            const esBot = m.autor === "bot";

            // Mensajes del Asesor / Negocio (operador) -> Alineados a la DERECHA con color azul/brand
            if (!esCliente && !esBot) {
              return (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%] sm:max-w-md text-right">
                    <div className="rounded-2xl rounded-tr-xs bg-brand-500 px-4 py-2.5 text-left text-sm text-white shadow-2xs dark:bg-brand-500">
                      <p className="whitespace-pre-line leading-relaxed">{m.contenido.texto}</p>
                    </div>
                    <p className="mt-1 text-right text-[11px] text-gray-400 dark:text-gray-500">
                      {horaDe(m.timestamp)}
                    </p>
                  </div>
                </div>
              );
            }

            // Mensajes del Cliente o del Bot -> Alineados a la IZQUIERDA con Avatar
            return (
              <div key={m.id} className="flex items-start gap-3">
                <Avatar
                  src={esBot ? "" : avatarSrc}
                  initials={esBot ? "AI" : inicialesDe(conv.contacto.nombre)}
                  size="small"
                  className="mt-0.5 shrink-0"
                />
                <div className="max-w-[80%] sm:max-w-md">
                  <div
                    className={`rounded-2xl rounded-tl-xs px-4 py-2.5 text-sm ${
                      esBot
                        ? "border border-blue-100 bg-blue-50/80 text-blue-950 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200"
                        : "bg-gray-100 text-gray-800 dark:bg-white/5 dark:text-white/90"
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed">{m.contenido.texto}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                    {esBot ? "Asistente Bot" : conv.contacto.nombre}, {horaDe(m.timestamp)}
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
