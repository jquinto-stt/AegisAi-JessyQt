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

      {/* ── Cabecera de la página ────────────────────────────────────────── */}
      {/* El título FALTABA. Medido con `outputs/modulos-verify/huella-modulos.mjs`:
          `/conversaciones` y `/conversaciones/historial` eran las DOS ÚNICAS
          pantallas de módulo sin `<h1>`. El primer elemento visible era el
          conmutador, así que la pantalla no decía dónde estabas.

          La fila ya era `justify-between` **con un solo hijo**: un
          `justify-between` de un hijo no reparte nada. Estaba preparada para un
          título a la izquierda y el conmutador a la derecha, y el título nunca
          llegó.

          `text-2xl font-bold text-ink-title`, el token de las demás pantallas de
          módulo (`/pedidos/inicio:864`, `/asistente:64`) — no el `text-xl` de las
          configuraciones: esto es una superficie de trabajo, no ajustes.

          El conmutador toma sus tres colores de `@/pages/config-layout`, así que
          el estado activo se pinta igual aquí que en el `Segmentado` de las
          pantallas de configuración. */}
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold text-ink-title dark:text-white/90">Conversaciones</h1>
          {/* Indicador de tiempo real. NO es un botón: la bandeja se actualiza
              sola cada 3 s cuando llega un mensaje (ver `@/lib/tiempo-real`).
              Se pinta solo si hay datos reales y el canal está activo — un punto
              verde permanente sobre el seed sería la misma mentira que el aviso
              de origen de datos existe para evitar. */}
          {conversacionesStore.origenDatos === "real" && enVivo && (
            <span
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
              title="La bandeja se actualiza sola cuando llega un mensaje"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              En vivo
            </span>
          )}
        </div>
        <div className={claseSegmentoTrack}>
          <button
            type="button"
            aria-current="page"
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${claseSegmentoActivo}`}
          >
            Chat en vivo
          </button>
          <button
            type="button"
            onClick={() => navigate("/conversaciones/historial")}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${claseSegmentoInactivo}`}
          >
            Historial de atención
          </button>
          <button
            type="button"
            onClick={() => navigate("/conversaciones/analitica")}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${claseSegmentoInactivo}`}
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
          className={`mb-3 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs ${
            conversacionesStore.origenDatos === "cargando"
              ? "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
              : "border-amber-300/60 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200/90"
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
          className="mb-3 flex items-start gap-2.5 rounded-xl border border-red-300/60 bg-red-50 px-3.5 py-2.5 text-xs text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200/90"
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
      <div className="flex h-[calc(100vh-8.5rem)] min-h-[620px] items-stretch gap-4 sm:gap-5">
        {/* ── Columna izquierda: ChatSidebar (Bandeja colapsable y retráctil) ── */}
        <aside
          aria-label="Bandeja de chats"
          className={`shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-theme-xs transition-all duration-300 ease-in-out dark:bg-white/[0.03] ${
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
        <section className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-white/[0.03]">
          {seleccionadaId !== null ? (
            <>
              {/* La `key` es lo que hace VISIBLE el cambio de conversación. Sin ella React
                  reutiliza la MISMA instancia de `ChatView` y solo le cambia las props, así
                  que la clase de entrada nunca se vuelve a disparar y el hilo nuevo aparece
                  de golpe. Con la `key`, cada conversación es un montaje nuevo y entra con
                  un fundido de 200 ms.
                  Consecuencia asumida: al remontar, el contenedor de mensajes vuelve a
                  `scrollTop = 0`. Es el mismo punto de partida que ya tenía la primera
                  conversación que se abría, así que el comportamiento queda CONSISTENTE
                  entre el primer hilo y los siguientes. Aterrizar en el último mensaje es
                  otra tarea (exige gestión de scroll) y no se aborda aquí. */}
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
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
              Selecciona una conversación para comenzar
            </div>
          )}
        </section>

        {/* ── Columna derecha: Panel de Contexto (Colapsable y retráctil) ── */}
        <aside
          aria-label="Panel de información del contacto"
          className={`shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-theme-xs transition-all duration-300 ease-in-out dark:bg-white/[0.03] ${
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
                  <h3 className="text-sm font-semibold text-ink-title dark:text-white/90">
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
