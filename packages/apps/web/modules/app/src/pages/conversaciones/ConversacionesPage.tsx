import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";
import { PageMeta } from "@/shell/meta";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { BandejaLista } from "@/pages/conversaciones/components/BandejaLista";
import { ChatView } from "@/pages/conversaciones/components/ChatView";
import { Composer } from "@/pages/conversaciones/components/Composer";
import { PanelContexto } from "@/pages/conversaciones/components/PanelContexto";

export const ConversacionesPage = observer(() => {
  const navigate = useNavigate();
  const [bandejaExpandida, setBandejaExpandida] = useState(true);
  const [panelExpandido, setPanelExpandido] = useState(false);
  const seleccionadaId = conversacionesStore.seleccionadaId;
  const bandeja = conversacionesStore.bandeja;

  // Interacción lógica de enfoque:
  // Al abrir la ficha de info del contacto, colapsamos la bandeja de contactos para
  // que el chat tenga el espacio principal. Al cerrarla, restauramos los contactos.
  const handleTogglePanel = () => {
    if (!panelExpandido) {
      setPanelExpandido(true);
      setBandejaExpandida(false);
    } else {
      setPanelExpandido(false);
      setBandejaExpandida(true);
    }
  };

  const handleCerrarPanel = () => {
    setPanelExpandido(false);
    setBandejaExpandida(true);
  };

  const handleToggleBandeja = () => {
    setBandejaExpandida(!bandejaExpandida);
  };

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

      {/* Conmutador Chat en vivo / Historial de atención */}
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
          <button
            type="button"
            aria-current="page"
            className="rounded-md bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
          >
            Chat en vivo
          </button>
          <button
            type="button"
            onClick={() => navigate("/conversaciones/historial")}
            className="rounded-md px-3.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Historial de atención
          </button>
        </div>
      </div>

      {/* Contenedor principal de 2 columnas + panel lateral opcional */}
      <div className="flex h-[calc(100vh-8.5rem)] min-h-[620px] items-stretch gap-4 sm:gap-5">
        {/* ── Columna izquierda: ChatSidebar (Bandeja colapsable y retráctil) ── */}
        <aside
          aria-label="Bandeja de chats"
          className={`shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xs transition-all duration-300 ease-in-out dark:bg-white/[0.03] ${
            bandejaExpandida
              ? "flex w-full sm:w-[310px] xl:w-[330px] 2xl:w-[360px] border border-gray-200 opacity-100 mr-0 dark:border-gray-800"
              : "flex w-0 max-w-0 border-0 p-0 opacity-0 pointer-events-none -mr-4 sm:-mr-5"
          }`}
        >
          <div className="flex h-full min-w-[310px] xl:min-w-[330px] 2xl:min-w-[360px] flex-col overflow-hidden">
            <BandejaLista
              onToggle={() => setBandejaExpandida(false)}
              bandejaExpandida={bandejaExpandida}
            />
          </div>
        </aside>

        {/* ── Columna central: ChatBox (Cabecera, Mensajes y Composer) ── */}
        <section className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-white/[0.03]">
          {seleccionadaId !== null ? (
            <>
              <ChatView
                convId={seleccionadaId}
                onTogglePanel={handleTogglePanel}
                panelExpandido={panelExpandido}
                onToggleBandeja={handleToggleBandeja}
                bandejaExpandida={bandejaExpandida}
              />
              <Composer convId={seleccionadaId} />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
              Selecciona una conversación para comenzar
            </div>
          )}
        </section>

        {/* ── Columna derecha: Panel de Contexto (Colapsable y retráctil) ── */}
        <aside
          aria-label="Panel de información del contacto"
          className={`shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xs transition-all duration-300 ease-in-out dark:bg-white/[0.03] ${
            panelExpandido && seleccionadaId !== null
              ? "flex w-80 border border-gray-200 p-4 opacity-100 2xl:w-96 dark:border-gray-800"
              : "flex w-0 max-w-0 border-0 p-0 opacity-0 pointer-events-none -ml-4 sm:-ml-5"
          }`}
        >
          {seleccionadaId !== null && (
            <div className="flex h-full min-w-[18rem] flex-col overflow-hidden 2xl:min-w-[22rem]">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Información del contacto
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCerrarPanel}
                  aria-label="Colapsar información del contacto"
                  title="Colapsar panel"
                  className="group flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200/80 bg-gray-50/60 text-gray-400 transition-all hover:border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700/60 dark:bg-white/5 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform group-hover:translate-x-0.5"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pt-3 custom-scrollbar">
                <PanelContexto convId={seleccionadaId} />
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
});

export default ConversacionesPage;
