import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { organizacionStore } from "@/stores/organizacion.store";
import { BandejaLista } from "@/pages/conversaciones/components/BandejaLista";
import { ChatView, type VistaChat } from "@/pages/conversaciones/components/ChatView";
import { Composer } from "@/pages/conversaciones/components/Composer";
import { PanelContexto } from "@/pages/conversaciones/components/PanelContexto";
import { ConversacionVacia } from "@/pages/conversaciones/components/ConversacionVacia";

const obtenerEstadoCanales = () => {
  const waStore = organizacionStore.tieneConectorActivo("whatsapp");
  try {
    const guardado = localStorage.getItem("pedidos_canales_integraciones");
    if (guardado) {
      const parsed = JSON.parse(guardado);
      const whatsapp = parsed.whatsapp !== undefined ? Boolean(parsed.whatsapp) : waStore;
      const instagram = Boolean(parsed.instagram);
      const facebook = Boolean(parsed.facebook);
      return {
        whatsapp,
        instagram,
        facebook,
        hayActivos: whatsapp || instagram || facebook,
      };
    }
  } catch {}
  return {
    whatsapp: waStore,
    instagram: false,
    facebook: false,
    hayActivos: waStore,
  };
};

export const ConversacionesPage = observer(() => {
  const [bandejaExpandida, setBandejaExpandida] = useState(true);
  const [panelExpandido, setPanelExpandido] = useState(false);
  const [vistaChat, setVistaChat] = useState<VistaChat>("conversacion");
  const [estadoCanales, setEstadoCanales] = useState(obtenerEstadoCanales);
  const seleccionadaId = conversacionesStore.seleccionadaId;

  // Sincronizar estado de canales si cambia en localStorage o al enfocar la pestaña
  useEffect(() => {
    const actualizar = () => setEstadoCanales(obtenerEstadoCanales());
    window.addEventListener("storage", actualizar);
    window.addEventListener("focus", actualizar);
    actualizar();
    return () => {
      window.removeEventListener("storage", actualizar);
      window.removeEventListener("focus", actualizar);
    };
  }, []);

  // Al cambiar de contacto seleccionado, volver a la vista principal de conversación
  useEffect(() => {
    setVistaChat("conversacion");
  }, [seleccionadaId]);

  const handleTogglePanel = () => {
    setPanelExpandido(!panelExpandido);
  };

  const handleToggleBandeja = () => {
    setBandejaExpandida(!bandejaExpandida);
  };

  const [searchParams] = useSearchParams();

  // Si viene un id o chatId en la URL explícitamente, seleccionar esa conversación
  useEffect(() => {
    const focusId = searchParams.get("id") || searchParams.get("chatId");
    if (focusId && conversacionesStore.getConversacion(focusId)) {
      conversacionesStore.seleccionar(focusId);
    }
  }, [searchParams]);

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden font-sans text-gray-900 dark:text-white/90">
      <PageMeta
        title="WhatsApp · Consola de Atención"
        description="Consola de mensajería y atención multicanal — bandeja, chat y contexto de clientes"
      />



      {/* ── Contenedor principal de 2 columnas + panel lateral opcional ── */}
      <div className="flex flex-1 min-h-0 items-stretch gap-4 sm:gap-5 overflow-hidden">
        {/* ── Columna izquierda: Chats Sidebar ── */}
        <aside
          aria-label="Bandeja de chats"
          className={`shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-theme-xs transition-all duration-300 ease-in-out dark:bg-white/[0.03] ${
            bandejaExpandida
              ? "flex w-full sm:w-[320px] xl:w-[350px] border border-gray-200 opacity-100 mr-0 dark:border-gray-800"
              : "flex w-0 max-w-0 border-0 p-0 opacity-0 pointer-events-none -mr-4 sm:-mr-5"
          }`}
        >
          <div className="flex h-full min-w-[320px] xl:min-w-[350px] flex-col overflow-hidden">
            <BandejaLista
              bandejaExpandida={bandejaExpandida}
            />
          </div>
        </aside>

        {/* ── Columna central: Chat View o Estado Vacío Limpio ── */}
        <section className="flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-white/[0.03]">
          {seleccionadaId !== null ? (
            <>
              <ChatView
                key={seleccionadaId}
                convId={seleccionadaId}
                onTogglePanel={handleTogglePanel}
                panelExpandido={panelExpandido}
                onToggleBandeja={handleToggleBandeja}
                bandejaExpandida={bandejaExpandida}
                vista={vistaChat}
                onCambiarVista={setVistaChat}
              />
              <Composer convId={seleccionadaId} />
            </>
          ) : (
            <ConversacionVacia />
          )}
        </section>

        {/* ── Columna derecha: Panel de Información del Pedido (Opcional) ── */}
        <aside
          aria-label="Panel de información del pedido"
          className={`shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-theme-xs transition-all duration-300 ease-in-out dark:bg-white/[0.03] ${
            panelExpandido && seleccionadaId !== null
              ? "flex w-72 border border-gray-200 p-0 opacity-100 2xl:w-80 dark:border-gray-800"
              : "flex w-0 max-w-0 border-0 p-0 opacity-0 pointer-events-none -ml-4 sm:-ml-5"
          }`}
        >
          {seleccionadaId !== null && (
            <div className="flex h-full min-w-[17rem] flex-col overflow-hidden 2xl:min-w-[19rem]">
              <div className="flex items-center gap-2.5 bg-[#F4F5F7] px-4 py-3 border-b border-gray-100 dark:bg-white/[0.04] dark:border-gray-800">
                <button
                  type="button"
                  onClick={handleTogglePanel}
                  className="flex h-6 w-6 items-center justify-center rounded text-gray-600 hover:bg-gray-200/60 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer"
                  title="Cerrar panel"
                  aria-label="Cerrar panel de información"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                <h3 className="text-sm font-medium text-gray-800 dark:text-white/90">
                  Info. del pedido
                </h3>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                <PanelContexto
                  convId={seleccionadaId}
                  onVerHistorialPedidos={() => setVistaChat("pedidos")}
                  onCerrar={handleTogglePanel}
                />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
});

export default ConversacionesPage;
