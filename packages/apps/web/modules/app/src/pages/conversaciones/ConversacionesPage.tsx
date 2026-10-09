import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { organizacionStore } from "@/stores/organizacion.store";
import { tiempoRealActivo } from "@/lib/tiempo-real";
import { BandejaLista } from "@/pages/conversaciones/components/BandejaLista";
import { ChatView, type VistaChat } from "@/pages/conversaciones/components/ChatView";
import { Composer } from "@/pages/conversaciones/components/Composer";
import { PanelContexto } from "@/pages/conversaciones/components/PanelContexto";
import { WhatsAppIcon } from "@/pages/conversaciones/components/CanalAvatar";

const obtenerEstadoCanales = () => {
  const waStore = organizacionStore.esConectorActivo("pedidos", "whatsapp");
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
  const bandeja = conversacionesStore.bandeja;

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

  const [searchParams] = useSearchParams();

  // Si viene un id o chatId en la URL, seleccionar esa conversación
  useEffect(() => {
    const focusId = searchParams.get("id") || searchParams.get("chatId");
    if (focusId && conversacionesStore.getConversacion(focusId)) {
      conversacionesStore.seleccionar(focusId);
    }
  }, [searchParams]);

  // Si no hay conversación seleccionada pero hay disponibles en la bandeja, auto-seleccionar la primera
  useEffect(() => {
    const focusId = searchParams.get("id") || searchParams.get("chatId");
    if (!focusId && seleccionadaId === null && bandeja.length > 0) {
      conversacionesStore.seleccionar(bandeja[0].id);
    }
  }, [seleccionadaId, bandeja, searchParams]);

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden font-sans text-[#212121] dark:text-white/90">
      <PageMeta
        title="Chats · Pedidos"
        description="Consola de mensajería y WhatsApp en Pedidos — bandeja, chat y contexto del contacto"
      />

      {/* ── Cabecera de la página ────────────────────────────────────────── */}
      <div className="shrink-0 mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold text-[#190088] dark:text-white/90 tracking-tight">Chats</h1>
          {/* Indicador de tiempo real */}
          {conversacionesStore.origenDatos === "real" && enVivo && (
            <span
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-normal text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
              title="La bandeja se actualiza sola cuando llega un mensaje"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
              </span>
              En vivo
            </span>
          )}

          {/* Botón o indicador según estado del canal WhatsApp */}
          <div className="flex items-center gap-2 pl-2">
            {estadoCanales.whatsapp ? (
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
            ) : (
              <Link
                to="/pedidos/config?seccion=integraciones"
                className="group inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1 text-[12px] font-medium text-amber-900 transition-all hover:bg-amber-100 hover:border-amber-400 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                title="Canales de mensajería desconectados. Configurar en Integraciones"
              >
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                <span>Canales inactivos</span>
                <span className="text-[11px] font-bold text-[#190088] underline underline-offset-2 dark:text-amber-300">
                  Configurar
                </span>
              </Link>
            )}
          </div>
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

      {/* ── Aviso de Canales de Mensajería Desconectados ─────────────────── */}
      {!estadoCanales.hayActivos && (
        <div
          role="alert"
          className="shrink-0 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-amber-50/60 to-orange-50/50 p-3.5 sm:px-4 text-xs text-amber-950 shadow-theme-xs dark:border-amber-500/30 dark:from-amber-500/10 dark:via-amber-500/5 dark:to-transparent dark:text-amber-200"
        >
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
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
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-[#190088] dark:text-amber-200">
                Canales de mensajería desconectados
              </p>
              <p className="text-[#212121]/80 dark:text-amber-300/80">
                WhatsApp y canales sociales están inactivos. La recepción y envío de mensajes están pausados hasta reactivar la conexión.
              </p>
            </div>
          </div>
          <Link
            to="/pedidos/config?seccion=integraciones"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start sm:self-auto rounded-xl bg-[#190088] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#150070] active:scale-95"
          >
            <span>Conectar en Integraciones</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      )}

      {/* Si los canales están desconectados Y no hay mensajes en la bandeja, mostrar estado vacío enfocado */}
      {!estadoCanales.hayActivos && bandeja.length === 0 ? (
        <div className="flex flex-1 min-h-0 flex-col items-center justify-center rounded-2xl border border-[#ECECEC] bg-white p-8 text-center shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#EFE6D3]/60 text-[#190088] shadow-inner dark:bg-white/5 dark:text-amber-300">
            <svg
              width="38"
              height="38"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#FF3F1A] text-white ring-2 ring-white text-[11px] font-bold">
              !
            </span>
          </div>

          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            Canales sin sincronizar
          </span>

          <h2 className="text-2xl font-bold text-[#190088] dark:text-white/90 tracking-tight max-w-md">
            No hay canales de chat activos
          </h2>

          <p className="mt-2 text-sm text-[#212121]/70 dark:text-gray-400 max-w-lg leading-relaxed">
            Para recibir mensajes de tus clientes, gestionar conversaciones y automatizar la toma de pedidos, activa tu canal de WhatsApp o redes sociales en Ajustes.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/pedidos/config?seccion=integraciones"
              className="inline-flex items-center gap-2 rounded-xl bg-[#190088] px-5 py-2.5 text-sm font-bold text-white shadow-theme-xs transition-all hover:bg-[#150070] active:scale-95"
            >
              <span>Configurar canales en Integraciones</span>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl text-left">
            <div className="rounded-xl border border-[#ECECEC] p-3.5 bg-gray-50/50 dark:border-gray-800 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                <span>WhatsApp</span>
                <span className="text-[11px] text-amber-700 bg-amber-100/70 dark:bg-amber-500/20 px-2 py-0.5 rounded-md font-bold">Inactivo</span>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">Cloud API o número comercial</p>
            </div>

            <div className="rounded-xl border border-[#ECECEC] p-3.5 bg-gray-50/50 dark:border-gray-800 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                <span>Instagram</span>
                <span className="text-[11px] text-gray-500 bg-gray-200/70 dark:bg-gray-800 px-2 py-0.5 rounded-md font-medium">Inactivo</span>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">Mensajes directos de perfil</p>
            </div>

            <div className="rounded-xl border border-[#ECECEC] p-3.5 bg-gray-50/50 dark:border-gray-800 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                <span>Facebook</span>
                <span className="text-[11px] text-gray-500 bg-gray-200/70 dark:bg-gray-800 px-2 py-0.5 rounded-md font-medium">Inactivo</span>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">Messenger de página</p>
            </div>
          </div>
        </div>
      ) : (
        /* Contenedor principal de 2 columnas + panel lateral opcional */
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
                vista={vistaChat}
                onCambiarVista={setVistaChat}
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
              ? "flex w-72 border border-gray-200 p-4 opacity-100 2xl:w-80 dark:border-gray-800"
              : "flex w-0 max-w-0 border-0 p-0 opacity-0 pointer-events-none -ml-4 sm:-ml-5"
          }`}
        >
          {seleccionadaId !== null && (
            <div className="flex h-full min-w-[17rem] flex-col overflow-hidden 2xl:min-w-[19rem]">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-white/5 dark:text-gray-300">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Información del contacto
                  </h3>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pt-3 custom-scrollbar">
                <PanelContexto
                  convId={seleccionadaId}
                  onVerHistorialPedidos={() => setVistaChat("pedidos")}
                />
              </div>
            </div>
          )}
        </aside>
      </div>
    )}
    </div>
  );
});

export default ConversacionesPage;
