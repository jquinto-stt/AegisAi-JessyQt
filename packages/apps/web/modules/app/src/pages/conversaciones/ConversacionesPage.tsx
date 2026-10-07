import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";
import { PageMeta } from "@/shell/meta";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { tiempoRealActivo } from "@/lib/tiempo-real";
import { BandejaLista } from "@/pages/conversaciones/components/BandejaLista";
import { ChatView } from "@/pages/conversaciones/components/ChatView";
import { Composer } from "@/pages/conversaciones/components/Composer";
import { PanelContexto } from "@/pages/conversaciones/components/PanelContexto";
import { WhatsAppIcon, TelegramIcon } from "@/pages/conversaciones/components/CanalAvatar";
import {
  claseSegmentoActivo,
  claseSegmentoInactivo,
  claseSegmentoTrack,
} from "@/pages/config-layout";

export const ConversacionesPage = observer(() => {
  const navigate = useNavigate();
  const [bandejaExpandida, setBandejaExpandida] = useState(true);
  const [panelExpandido, setPanelExpandido] = useState(false);
  const seleccionadaId = conversacionesStore.seleccionadaId;
  const bandeja = conversacionesStore.bandeja;

  // El canal de Realtime se enciende en el bootstrap, no aquí: montar la
  // suscripción en un componente la abre y la cierra con cada navegación, y el
  // slot de replicación tarda segundos en estar listo. Aquí solo se LEE si está
  // activo, para poder decirlo en pantalla.
  const [enVivo, setEnVivo] = useState(tiempoRealActivo);

  useEffect(() => {
    setEnVivo(tiempoRealActivo());
  }, []);

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
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden font-sans text-[#212121] dark:text-white/90">
      <PageMeta
        title="Chats · Pedidos"
        description="Consola de mensajería y WhatsApp en Pedidos — bandeja, chat y contexto del contacto"
      />

      {/* ── Cabecera de la página ────────────────────────────────────────── */}
      <div className="shrink-0 mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[24px] sm:text-[36px] font-bold text-[#190088] dark:text-white/90 tracking-tight">Chats</h1>
          {/* Indicador de tiempo real */}
          {conversacionesStore.origenDatos === "real" && enVivo && (
            <span
              className="flex items-center gap-1.5 rounded-full border border-[#ECECEC] bg-white px-2.5 py-1 text-[12px] font-normal text-[#212121]/70 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
              title="La bandeja se actualiza sola cuando llega un mensaje"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#97D6DF] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF3F1A]" />
              </span>
              En vivo
            </span>
          )}

          {/* Botones de acceso directo a los chats en sus respectivas apps */}
          <div className="flex items-center gap-2 pl-2">
            <a
              href="https://wa.me/573145793333"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-1.5 text-[12px] font-bold text-white shadow-theme-xs transition-all hover:bg-[#20ba5a] hover:shadow-md hover:shadow-[#25D366]/20 active:scale-95"
              title="Abrir chat del bot en WhatsApp (+57 314 5793333)"
            >
              <WhatsAppIcon className="h-4 w-4 shrink-0" />
              <span>WhatsApp</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-80 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              >
                <path d="M7 17L17 7M7 7h10v10" />
              </svg>
            </a>

            <a
              href="https://t.me/NectoPedidosBot"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-xl bg-[#229ED9] px-3 py-1.5 text-[12px] font-bold text-white shadow-theme-xs transition-all hover:bg-[#1d8bc0] hover:shadow-md hover:shadow-[#229ED9]/20 active:scale-95"
              title="Abrir chat del bot en Telegram (@NectoPedidosBot)"
            >
              <TelegramIcon className="h-4 w-4 shrink-0" />
              <span>Telegram</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-80 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              >
                <path d="M7 17L17 7M7 7h10v10" />
              </svg>
            </a>
          </div>
        </div>
        <div className={claseSegmentoTrack}>
          <button
            type="button"
            aria-current="page"
            className={`rounded-md px-3.5 py-1.5 text-[12px] font-bold transition-colors ${claseSegmentoActivo}`}
          >
            Chat en vivo
          </button>
          <button
            type="button"
            onClick={() => navigate("/conversaciones/historial")}
            className={`rounded-md px-3.5 py-1.5 text-[12px] font-normal transition-colors ${claseSegmentoInactivo}`}
          >
            Historial de atención
          </button>
          <button
            type="button"
            onClick={() => navigate("/conversaciones/analitica")}
            className={`rounded-md px-3.5 py-1.5 text-[12px] font-normal transition-colors ${claseSegmentoInactivo}`}
          >
            Analítica
          </button>
        </div>
      </div>

      {/* ── Aviso de origen de datos ──────────────────────────────────────── */}
      {/* Existe para que la bandeja no mienta. Sin esto, «hay conversaciones»
          puede significar dos cosas indistinguibles: filas reales de `necto`
          o el seed de ejemplo. Un operador mirando la bandeja no tenía forma
          de saber si estaba viendo a sus clientes o una maqueta — y esa es
          justo la superficie que no se debe entregar.

          Solo aparece cuando NO son datos reales. En `real` no se pinta nada:
          un aviso permanente de «esto es de verdad» es ruido.

          Mientras carga se dice que está cargando, no que está en modo
          maqueta: durante la ida y vuelta a la red aún no se sabe, y afirmar
          `seed` en ese instante sería falso. */}
      {conversacionesStore.origenDatos !== "real" && (
        <div
          role="status"
          className={`shrink-0 mb-3 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs ${
            conversacionesStore.origenDatos === "cargando"
              ? "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
              : "border-brand-300/60 bg-brand-50 text-brand-900 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200/90"
          }`}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-px shrink-0"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <span>
            {conversacionesStore.origenDatos === "cargando" ? (
              "Leyendo conversaciones de la base…"
            ) : (
              <>
                <strong className="font-semibold">Datos de ejemplo.</strong>{" "}
                {conversacionesStore.motivoSeed ||
                  "No se pudo leer de la base y se muestra la maqueta."}
              </>
            )}
          </span>
        </div>
      )}

      {/* ── Cambio de modo que NO llegó a la base ──────────────────────────
          «Tomar chat» y «Devolver al bot» cambian de aspecto al pulsarlos, así
          que si la escritura falla la bandeja mostraría un modo que la base no
          tiene. Aquí se dice, en vez de dejar creer que se aplicó. */}
      {conversacionesStore.ultimoErrorModo && (
        <div
          role="alert"
          className="shrink-0 mb-3 flex items-start gap-2.5 rounded-xl border border-error-300/60 bg-error-50 px-3.5 py-2.5 text-xs text-error-900 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-200/90"
        >
          <span className="mt-px shrink-0" aria-hidden="true">
            ⚠
          </span>
          <span className="flex-1">{conversacionesStore.ultimoErrorModo}</span>
          <button
            type="button"
            onClick={() => {
              conversacionesStore.ultimoErrorModo = null;
            }}
            className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
          >
            Descartar
          </button>
        </div>
      )}

      {/* Contenedor principal de 2 columnas + panel lateral opcional */}
      <div className="flex flex-1 min-h-0 items-stretch gap-4 sm:gap-5 overflow-hidden">
        {/* ── Columna izquierda: ChatSidebar (Bandeja colapsable y retráctil) ── */}
        <aside
          aria-label="Bandeja de chats"
          className={`shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-theme-xs transition-all duration-300 ease-in-out dark:bg-white/[0.03] ${
            bandejaExpandida
              ? "flex w-full sm:w-[290px] xl:w-[310px] 2xl:w-[330px] border border-[#ECECEC] opacity-100 mr-0 dark:border-gray-800"
              : "flex w-0 max-w-0 border-0 p-0 opacity-0 pointer-events-none -mr-4 sm:-mr-5"
          }`}
        >
          <div className="flex h-full min-w-[290px] xl:min-w-[310px] 2xl:min-w-[330px] flex-col overflow-hidden">
            <BandejaLista
              bandejaExpandida={bandejaExpandida}
            />
          </div>
        </aside>

        {/* ── Columna central: ChatBox (Cabecera, Mensajes y Composer) ── */}
        <section className="flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden rounded-2xl border border-[#ECECEC] bg-white shadow-theme-xs transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-white/[0.03]">
          {seleccionadaId !== null ? (
            <>
              <ChatView
                key={seleccionadaId}
                convId={seleccionadaId}
                onTogglePanel={handleTogglePanel}
                panelExpandido={panelExpandido}
                onToggleBandeja={handleToggleBandeja}
                bandejaExpandida={bandejaExpandida}
              />
              <Composer convId={seleccionadaId} />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-[14px] font-normal text-[#212121]/50 dark:text-gray-500">
              Selecciona una conversación para comenzar
            </div>
          )}
        </section>

        {/* ── Columna derecha: Panel de Contexto (Colapsable y retráctil) ── */}
        <aside
          aria-label="Panel de información del contacto"
          className={`shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-theme-xs transition-all duration-300 ease-in-out dark:bg-white/[0.03] ${
            panelExpandido && seleccionadaId !== null
              ? "flex w-72 border border-[#ECECEC] p-4 opacity-100 2xl:w-80 dark:border-gray-800"
              : "flex w-0 max-w-0 border-0 p-0 opacity-0 pointer-events-none -ml-4 sm:-ml-5"
          }`}
        >
          {seleccionadaId !== null && (
            <div className="flex h-full min-w-[17rem] flex-col overflow-hidden 2xl:min-w-[19rem]">
              <div className="flex items-center justify-between border-b border-[#ECECEC] pb-3 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECECEC] text-[#190088] dark:bg-white/5 dark:text-gray-300">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <h3 className="text-[14px] font-bold text-[#190088] dark:text-white/90">
                    Información del contacto
                  </h3>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pt-3 custom-scrollbar">
                <PanelContexto convId={seleccionadaId} />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
});

export default ConversacionesPage;
