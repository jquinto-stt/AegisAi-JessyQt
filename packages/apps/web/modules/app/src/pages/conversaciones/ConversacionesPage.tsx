import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { BandejaLista } from "@/pages/conversaciones/components/BandejaLista";
import { ChatView } from "@/pages/conversaciones/components/ChatView";
import { Composer } from "@/pages/conversaciones/components/Composer";
import { PanelContexto } from "@/pages/conversaciones/components/PanelContexto";

export const ConversacionesPage = observer(() => {
  const [panelExpandido, setPanelExpandido] = useState(false);
  const seleccionadaId = conversacionesStore.seleccionadaId;
  const bandeja = conversacionesStore.bandeja;

  // Si no hay conversación seleccionada pero hay disponibles en la bandeja, auto-seleccionar la primera
  useEffect(() => {
    if (seleccionadaId === null && bandeja.length > 0) {
      conversacionesStore.seleccionar(bandeja[0].id);
    }
  }, [seleccionadaId, bandeja]);

  return (
    <>
      <PageMeta
        title="Chat"
        description="Consola de mensajería y WhatsApp — bandeja, chat y contexto del contacto"
      />

      {/* Migas de pan y Título estilo TailAdmin / Webi.AI Elements */}
      <div className="mb-4 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white/90 sm:text-2xl">
          Chat
        </h1>
        <nav aria-label="breadcrumb">
          <ol className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <li>Home</li>
            <li className="text-gray-400 dark:text-gray-600">&gt;</li>
            <li className="font-medium text-gray-800 dark:text-white/90">Chat</li>
          </ol>
        </nav>
      </div>

      {/* Contenedor principal de 2 columnas + panel lateral opcional */}
      <div className="flex h-[calc(100vh-13rem)] min-h-[620px] items-stretch gap-4 sm:gap-5">
        {/* ── Columna izquierda: ChatSidebar (Bandeja) ── */}
        <aside className="flex w-full xl:w-1/3 xl:max-w-[340px] 2xl:max-w-[380px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs dark:border-gray-800 dark:bg-white/[0.03]">
          <BandejaLista />
        </aside>

        {/* ── Columna central: ChatBox (Cabecera, Mensajes y Composer) ── */}
        <section className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs dark:border-gray-800 dark:bg-white/[0.03]">
          {seleccionadaId !== null ? (
            <>
              <ChatView
                convId={seleccionadaId}
                onTogglePanel={() => setPanelExpandido(!panelExpandido)}
                panelExpandido={panelExpandido}
              />
              <Composer convId={seleccionadaId} />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
              Selecciona una conversación para comenzar
            </div>
          )}
        </section>

        {/* ── Columna derecha: Panel de Contexto (Colapsable) ── */}
        {panelExpandido && seleccionadaId !== null && (
          <aside className="hidden w-80 2xl:w-96 shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs lg:flex dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Información del contacto
              </h3>
              <button
                type="button"
                onClick={() => setPanelExpandido(false)}
                aria-label="Cerrar panel de contexto"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pt-3 custom-scrollbar">
              <PanelContexto convId={seleccionadaId} />
            </div>
          </aside>
        )}
      </div>
    </>
  );
});

export default ConversacionesPage;
