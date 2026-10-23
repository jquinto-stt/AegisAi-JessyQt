import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { observer } from "mobx-react-lite";
import { Avatar } from "@/elements/ui/avatar";
import { Badge } from "@/elements/ui/badge";
import { Modal } from "@/elements/ui/modal";
import { EyeIcon, ArrowRightIcon, AiIcon } from "@/icons";
import { conversacionesStore, etiquetaEstado } from "@/stores/conversaciones.store";
import { pedidosStore } from "@/stores/pedidos.store";
import { comportamientoScroll, formatoMoneda } from "@/utils";
import {
  claseSegmentoActivo,
  claseSegmentoInactivo,
} from "@/pages/config-layout";
import type { Mensaje } from "@/stores/conversaciones.types";
import { integracionesStore } from "@/stores/integraciones.store";
import type { ModuloIntegrable } from "@/stores/integraciones.store";
import { puede } from "@/stores/acceso.utils";
import { BotonHandoff } from "./BotonHandoff";
import { ContextoModulo } from "./ContextoModulo";
import { TextoMensajeFormateado } from "./TextoMensajeFormateado";
import { CanalAvatar } from "./CanalAvatar";
import {
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
  /** Vista activa controlada desde el exterior (ej. desde el panel lateral de contacto). */
  vista?: VistaChat;
  /** Callback para sincronizar cambios de vista activa. */
  onCambiarVista?: (vista: VistaChat) => void;
}

/**
 * Vista activa del panel del chat.
 *
 * `"conversacion"` es el hilo de mensajes —la vista por defecto y la única que
 * existe siempre—, `"pedidos"` es el historial comercial del contacto, y cualquier
 * otro valor es el id de un módulo conectado al asistente.
 */
export type VistaChat = "conversacion" | "pedidos" | ModuloIntegrable;

export const ChatView = observer(({
  convId,
  onTogglePanel,
  panelExpandido,
  onToggleBandeja,
  bandejaExpandida = true,
  sinCabecera = false,
  vista: vistaProp,
  onCambiarVista: onCambiarVistaProp,
}: ChatViewProps) => {

  // Vista activa del panel del chat: la conversación, el historial de pedidos, o el contexto de un módulo conectado.
  const [vistaLocal, setVistaLocal] = useState<VistaChat>("conversacion");
  const vistaActual = vistaProp ?? vistaLocal;
  const setVista = onCambiarVistaProp ?? setVistaLocal;

  // Paginación y control de scroll
  const [limiteMensajes, setLimiteMensajes] = useState(25);
  const [mostrarBotonBajar, setMostrarBotonBajar] = useState(false);
  const [trazaSeleccionada, setTrazaSeleccionada] = useState<{
    mensaje: Mensaje;
    traza: BotTrazabilidad;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const conv = conversacionesStore.getConversacion(convId);
  const items = conversacionesStore.lineaDeTiempo(convId);

  const itemsVisibles = items.slice(-limiteMensajes);
  const hayMasMensajes = items.length > limiteMensajes;

  // Auto-scroll al final cuando entra un mensaje o cambia la conversación.
  // `comportamientoScroll()` y no `"smooth"` fijo: el desplazamiento suave es
  // movimiento que el navegador NO neutraliza con `prefers-reduced-motion`, así
  // que sin esta consulta quien pidió menos movimiento lo recibiría igual.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: comportamientoScroll() });
  }, [convId, items.length]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const estaLejosDelFinal = scrollHeight - scrollTop - clientHeight > 150;
    setMostrarBotonBajar(estaLejosDelFinal);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: comportamientoScroll() });
  };

  // ── Pestañas de contexto ─────────────────────────────────────────────────
  const modulosContexto = integracionesStore.modulosConContexto.filter((m) =>
    puede(m.capacidad),
  );

  // Vista activa derivada: "conversacion" y "pedidos" son de primera clase siempre válidas.
  const vistaActiva: VistaChat =
    vistaActual === "conversacion" || vistaActual === "pedidos"
      ? vistaActual
      : modulosContexto.some((m) => m.id === vistaActual)
        ? vistaActual
        : "conversacion";

  const moduloActivo = modulosContexto.find((m) => m.id === vistaActiva) ?? null;
  const pedidosContacto = conv ? pedidosStore.porTelefono(conv.contacto.telefono) : [];

  if (!conv) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-gray-400">
        <p className="text-sm">Selecciona una conversación para comenzar</p>
      </div>
    );
  }

  return (
    <div className="animate-aparecer flex flex-1 min-h-0 flex-col overflow-hidden">
      {/* ── Cabecera del Chat (Estilo Webi.AI Elements / TailAdmin) ──
          Se omite cuando el chat se embebe en el drawer, que ya aporta su propia
          cabecera con la identidad del cliente y el nº de pedido. */}
      {/* ── Cabecera del Chat ── */}
      {!sinCabecera && (
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3.5 dark:border-gray-800 dark:bg-transparent sm:px-6 sm:py-4 xl:px-7 font-sans">
        <div className="flex items-center gap-3">
          {onToggleBandeja && (
            <button
              type="button"
              onClick={onToggleBandeja}
              title={bandejaExpandida ? "Colapsar chats" : "Mostrar lista de chats"}
              aria-label={bandejaExpandida ? "Colapsar chats" : "Mostrar lista de chats"}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                !bandejaExpandida
                  ? "border-brand-500/30 bg-brand-50 text-brand-600 shadow-theme-xs dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400"
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

          <CanalAvatar
            canal={conv.canal}
            nombre={conv.contacto.nombre}
            size="large"
            status={statusDe(conv.estado)}
          />
          <div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {conv.contacto.nombre}
            </h4>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {pedidosContacto.length > 0 && pedidosContacto[0] ? `${pedidosContacto[0].numero || pedidosContacto[0].id.slice(0, 6)} · ` : ""}{conv.contacto.telefono}
            </span>
          </div>
        </div>

        {/* Acciones superiores: Crear pedido, Handoff y Alternar información de contacto */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Botón Tomar / Devolver */}
          <BotonHandoff convId={conv.id} />

          {/* Botón Crear Pedido */}
          <Link
            to={`/pedidos/crear?telefono=${encodeURIComponent(conv.contacto.telefono)}&nombre=${encodeURIComponent(conv.contacto.nombre)}&chatId=${conv.id}`}
            title="Crear un nuevo pedido para este contacto"
            className="shrink-0 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-theme-xs transition-all active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="hidden sm:inline">Crear pedido</span>
          </Link>

          {/* Alternar panel de información del usuario */}
          {onTogglePanel && (
            <button
              type="button"
              onClick={onTogglePanel}
              title={panelExpandido ? "Ocultar información del contacto" : "Ver información del contacto"}
              className={`shrink-0 inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-theme-xs transition-all font-sans cursor-pointer ${
                panelExpandido
                  ? "border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-400"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Info. del pedido</span>
            </button>
          )}
        </div>
      </div>
      )}

      {/* ── Pestañas de contexto ────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Vistas de la conversación"
        className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-gray-200 px-3 py-2 sm:px-5 dark:border-gray-800 font-sans"
      >
        <TabContexto
          activo={vistaActiva === "conversacion"}
          onClick={() => setVista("conversacion")}
        >
          Conversación
        </TabContexto>

        <TabContexto
          activo={vistaActiva === "pedidos"}
          onClick={() => setVista("pedidos")}
        >
          <span className="flex items-center gap-1.5">
            <span>Historial de pedidos</span>
            {pedidosContacto.length > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  vistaActiva === "pedidos"
                    ? "bg-white text-brand-500"
                    : "bg-gray-200/70 text-gray-700 dark:bg-white/10 dark:text-gray-300"
                }`}
              >
                {pedidosContacto.length}
              </span>
            )}
          </span>
        </TabContexto>

        {modulosContexto
          .filter((m) => m.id !== "pedidos")
          .map((m) => (
            <TabContexto
              key={m.id}
              activo={vistaActiva === m.id}
              onClick={() => setVista(m.id)}
            >
              {m.label}
            </TabContexto>
          ))}
      </div>

      {vistaActiva === "conversacion" ? (
      /* ── Interior del Chat ── */
      <div
        role="tabpanel"
        aria-label="Conversación"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C9279' fill-opacity='0.07' fill-rule='evenodd'%3E%3Cpath d='M11 11h6v6h-6zm40 0h6v6h-6zm-20 20h6v6h-6zm-20 20h6v6h-6zm40 0h6v6h-6zm-20 20h6v6h-6zM32 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm40 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM12 34a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm40 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM32 54a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm40 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM12 74a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm40 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
        className="relative flex-1 space-y-5 overflow-y-auto bg-[#efeae2]/50 dark:bg-[#0b141a] px-5 py-5 custom-scrollbar sm:px-6 sm:py-6 xl:space-y-6 xl:px-8 xl:py-7 font-sans"
      >
        {hayMasMensajes && (
          <div className="flex justify-center py-2">
            <button
              type="button"
              onClick={() => setLimiteMensajes((prev) => prev + 25)}
              className="rounded-full bg-white border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
            >
              ↑ Cargar {items.length - limiteMensajes} mensajes anteriores
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="rounded-full bg-gray-200/70 px-4 py-1.5 text-center text-xs font-normal text-gray-500 dark:bg-white/10 dark:text-gray-400">
              Esta conversación aún no tiene mensajes.
            </p>
          </div>
        ) : (
          itemsVisibles.map((item) => {
            // Eventos del sistema: sutiles y centrados
            if (item.clase === "evento") {
              return (
                <div
                  key={item.data.id}
                  className="animate-entrada-lista my-3 flex justify-center"
                >
                  <span className="rounded-full bg-gray-200/70 px-3 py-1 text-center text-xs font-normal text-gray-500 dark:bg-white/10 dark:text-gray-400">
                    • {item.data.texto}
                  </span>
                </div>
              );
            }

            const m = item.data;
            const esCliente = m.autor === "cliente";
            const esBot = m.autor === "bot";

            // ── 1. CLIENTE: IZQUIERDA con Avatar y burbuja Blanca / TailAdmin ──
            if (esCliente) {
              return (
                <div key={m.id} className="animate-entrada-lista flex items-start gap-3 sm:gap-3.5">
                  <div className="shrink-0">
                    <CanalAvatar
                      canal={conv.canal}
                      nombre={conv.contacto.nombre}
                      size="medium"
                    />
                  </div>
                  <div className="flex flex-col items-start max-w-[85%] sm:max-w-lg lg:max-w-xl">
                    <div className="w-fit max-w-full rounded-2xl rounded-tl-sm bg-white border border-gray-200/80 px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-xs dark:border-gray-800 dark:bg-gray-800 dark:text-white/90">
                      <p className="mb-1 text-xs font-semibold text-brand-500 dark:text-brand-400">
                        {conv.contacto.nombre}
                      </p>
                      <TextoMensajeFormateado texto={m.contenido.texto} />
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 pl-1 text-[11px] font-normal text-gray-400 dark:text-gray-500">
                      <span>{horaDe(m.timestamp)}</span>
                    </div>
                  </div>
                </div>
              );
            }

            // ── 2. BOT CON ATENCIÓN INTELIGENTE (Negocio): DERECHA ──
            if (esBot) {
              const traza = getBotTrazabilidad(m, conv.estado);
              const puedeIrModulo =
                traza.modulo && modulosContexto.some((mod) => mod.id === traza.modulo);

              const pedidoId = m.payload?.pedidoId;
              const pedidoAsociado = pedidoId
                ? pedidosStore.getPedido(pedidoId) ||
                  pedidosStore.pedidos.find((p) => p.numero === pedidoId || p.id === pedidoId)
                : undefined;

              return (
                <div key={m.id} className="animate-entrada-lista flex justify-end">
                  <div className="flex flex-col items-end max-w-[85%] sm:max-w-lg lg:max-w-xl">
                    {/* Burbuja del bot: verde WhatsApp / TailAdmin en la derecha */}
                    <div className="w-fit min-w-0 max-w-full rounded-2xl rounded-tr-xs border border-emerald-200/60 bg-[#E7FEDB] px-4 py-3 text-sm leading-relaxed text-gray-900 shadow-xs break-words [overflow-wrap:anywhere] dark:border-emerald-800/40 dark:bg-[#005C4B] dark:text-gray-100">
                      {/* Cabecera sutil: Identidad IA + Botón discreto de trazabilidad on-demand */}
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-emerald-200/60 pb-1.5 dark:border-emerald-700/60">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                            {traza.nombreBot}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-emerald-200/70 border border-emerald-300 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/50 dark:border-emerald-700 dark:text-emerald-300">
                            IA
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTrazaSeleccionada({ mensaje: m, traza })}
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-emerald-800/80 transition-colors hover:bg-emerald-200/50 hover:text-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-800/50 cursor-pointer"
                          title="Inspeccionar trazabilidad técnica IA"
                        >
                          <AiIcon className="h-3 w-3" />
                          <span>Trazabilidad</span>
                        </button>
                      </div>

                      {/* Texto de la respuesta */}
                      <TextoMensajeFormateado texto={m.contenido.texto} />

                      {/* Tarjeta interactiva de pedido asociado si existe */}
                      {pedidoId && (
                        <div className="mt-3 w-full rounded-xl border border-emerald-200 bg-white/95 p-3 shadow-xs dark:border-gray-700 dark:bg-gray-900/90">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold tabular-nums text-gray-800 dark:text-white">
                                {pedidoAsociado ? pedidoAsociado.numero : `#${pedidoId}`}
                              </span>
                              {pedidoAsociado && (
                                <Badge
                                  size="xs"
                                  color={pedidosStore.estadoBadgeColor(pedidoAsociado.estado)}
                                  variant="light"
                                >
                                  {pedidosStore.estadoLabel(pedidoAsociado.estado)}
                                </Badge>
                              )}
                              {pedidoAsociado && (
                                <Badge
                                  size="xs"
                                  color={pedidoAsociado.pagado ? "success" : "warning"}
                                  variant="light"
                                >
                                  {pedidoAsociado.pagado ? "Pagado" : "Pendiente de pago"}
                                </Badge>
                              )}
                            </div>
                            {pedidoAsociado && (
                              <span className="text-xs font-semibold tabular-nums text-gray-800 dark:text-white">
                                {formatoMoneda(pedidosStore.totalPedido(pedidoAsociado))}
                              </span>
                            )}
                          </div>

                          <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-gray-100 pt-2 dark:border-gray-700/60">
                            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                              {pedidoAsociado?.items && pedidoAsociado.items.length > 0
                                ? `${pedidoAsociado.items.length} ${pedidoAsociado.items.length === 1 ? "artículo" : "artículos"}`
                                : "Detalle del pedido"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setVista("pedidos")}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 cursor-pointer"
                            >
                              <span>Ver pedido</span>
                              <ArrowRightIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Acción contextual si no hay pedido pero sí módulo vinculado */}
                      {!pedidoId && traza.accion && puedeIrModulo && (
                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-emerald-200/60 pt-2 dark:border-emerald-700/60">
                          <button
                            type="button"
                            onClick={() => setVista(traza.modulo!)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white/90 px-2.5 py-1 text-xs font-medium text-emerald-800 shadow-theme-xs transition-colors hover:bg-emerald-50 dark:border-emerald-700 dark:bg-gray-800 dark:text-emerald-300 dark:hover:bg-emerald-900/30 cursor-pointer"
                          >
                            <span>{traza.accion}</span>
                            <ArrowRightIcon className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-normal text-emerald-800/80 dark:text-emerald-300/80">
                            {horaDe(m.timestamp)}
                          </span>
                        </div>
                      )}

                      {/* Footer con wamid y hora */}
                      {(pedidoId || !traza.accion || !puedeIrModulo) && (
                        <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] font-normal text-emerald-800/80 dark:text-emerald-300/80">
                          <span className="font-mono text-[10px] bg-emerald-200/50 dark:bg-emerald-900/40 px-1 py-0.2 rounded">wamid</span>
                          <span>{horaDe(m.timestamp)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // ── 2.5 NOTA INTERNA DEL EQUIPO: Centro / Ancho destacado con fondo ámbar (no visible para cliente) ──
            if (m.esNotaInterna) {
              return (
                <div key={m.id} className="animate-entrada-lista my-3 flex justify-center">
                  <div className="w-full max-w-xl rounded-xl border border-amber-300/80 bg-amber-50/90 p-3.5 shadow-xs dark:border-amber-500/30 dark:bg-amber-950/20">
                    <div className="mb-1.5 flex items-center justify-between gap-2 border-b border-amber-200/80 pb-1 text-xs dark:border-amber-500/20">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-300">
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>Nota interna del equipo</span>
                      </div>
                      <span className="text-[11px] font-normal text-amber-700/80 dark:text-amber-400/80">
                        Solo visible para operadores · {horaDe(m.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm leading-relaxed text-amber-950 dark:text-amber-100">
                      <TextoMensajeFormateado texto={m.contenido.texto} />
                    </div>
                  </div>
                </div>
              );
            }

            // ── 3. ASESOR HUMANO (Equipo): DERECHA con Naranja NECTO (bg-brand-500) según Repo-prueba-master ──
            return (
              <div key={m.id} className="animate-entrada-lista flex justify-end">
                <div className="flex flex-col items-end max-w-[85%] sm:max-w-lg lg:max-w-xl">
                  <div className="w-fit max-w-full rounded-2xl rounded-tr-sm bg-brand-500 dark:bg-brand-500 px-4 py-3 text-left text-sm leading-relaxed text-white shadow-theme-xs">
                    {/* Distintivo claro de Asesor Humano */}
                    <div className="mb-1 flex items-center justify-end gap-1.5 text-xs font-medium text-white/90">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />
                      <span>Asesor</span>
                    </div>
                    <TextoMensajeFormateado texto={m.contenido.texto} className="text-white" />
                  </div>
                  <p className="mt-1 pr-1 text-right text-[11px] font-normal text-gray-400 dark:text-gray-500">
                    {horaDe(m.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
        {mostrarBotonBajar && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="animate-aparecer sticky bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-brand-500 hover:bg-brand-600 px-4 py-1.5 text-xs font-medium text-white shadow-lg transition-all hover:scale-105 active:scale-95 z-20"
          >
            ↓ Nuevos mensajes
          </button>
        )}

        {/* Botón flotante Detalle del Pedido (según screenshot MasterShop) */}
        {onTogglePanel && (
          <div className="sticky bottom-1 flex justify-end pr-1 pointer-events-none z-10">
            <button
              type="button"
              onClick={onTogglePanel}
              title={panelExpandido ? "Ocultar detalle del pedido" : "Ver detalle del pedido"}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200/90 bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-all hover:bg-gray-50 hover:text-gray-900 active:scale-95 cursor-pointer dark:border-gray-700/80 dark:bg-gray-800/95 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-400">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Detalle del Pedido</span>
            </button>
          </div>
        )}
      </div>
      ) : (
        /* Cuerpo de la pestaña de un módulo o Historial de pedidos.
        
           `key={vistaActiva}` NO es decorativa: las dos ramas de este ternario
           son un `<div>`, y React reconcilia por posición —al cambiar de
           pestaña reutilizaría el MISMO nodo, el `animate-aparecer` no se
           volvería a disparar y el cambio seguiría siendo un salto seco—. Con la
           clave, cada pestaña es un nodo nuevo y el fundido se ve.

           Fundido puro (`animate-aparecer`, 200 ms) y no `entrada-panel`: este
           panel ocupa todo el alto del chat, y el asentamiento de escala de
           `entrada-panel` sobre un área completa se lee como un zoom de
           diapositiva, no como una capa que se asienta. */
        <div
          key={vistaActiva}
          role="tabpanel"
          aria-label={vistaActiva === "pedidos" ? "Historial de pedidos" : (moduloActivo?.label ?? "Contexto del módulo")}
          className="animate-aparecer min-h-0 flex-1 overflow-hidden font-sans"
        >
          <ContextoModulo convId={convId} modulo={vistaActiva as ModuloIntegrable} />
        </div>
      )}

      {/* Modal de Trazabilidad e Inspección Técnica IA (On-Demand) */}
      <Modal
        isOpen={Boolean(trazaSeleccionada)}
        onClose={() => setTrazaSeleccionada(null)}
        className="max-w-md p-6 font-sans text-gray-800 dark:text-white/90"
      >
        {trazaSeleccionada && (
          <div>
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3.5 dark:border-gray-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <AiIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                  Trazabilidad de Inteligencia Artificial
                </h3>
                <p className="text-xs font-normal text-gray-500 dark:text-gray-400">
                  {trazaSeleccionada.traza.nombreBot} · {horaDe(trazaSeleccionada.mensaje.timestamp)}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  Flujo de ejecución e intención
                </span>
                <p className="mt-1.5 rounded-lg border border-gray-200 bg-gray-50 p-2.5 font-normal leading-relaxed text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {trazaSeleccionada.traza.flujo}
                </p>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="font-normal text-gray-500 dark:text-gray-400">
                  Módulo de contexto
                </span>
                <span
                  className="inline-flex items-center rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400"
                >
                  {trazaSeleccionada.traza.tag}
                </span>
              </div>

              {trazaSeleccionada.traza.accion && (
                <div className="flex items-center justify-between py-1">
                  <span className="font-normal text-gray-500 dark:text-gray-400">
                    Acción sugerida
                  </span>
                  <span className="font-semibold text-brand-600 dark:text-brand-400">
                    {trazaSeleccionada.traza.accion}
                  </span>
                </div>
              )}

              {trazaSeleccionada.mensaje.payload?.pedidoId && (
                <div className="flex items-center justify-between py-1">
                  <span className="font-normal text-gray-500 dark:text-gray-400">
                    Pedido vinculado
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-white">
                    #{trazaSeleccionada.mensaje.payload.pedidoId}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
              {trazaSeleccionada.traza.modulo &&
                modulosContexto.some((mod) => mod.id === trazaSeleccionada.traza.modulo) && (
                  <button
                    type="button"
                    onClick={() => {
                      const mod = trazaSeleccionada.traza.modulo!;
                      setTrazaSeleccionada(null);
                      setVista(mod);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600"
                  >
                    <span>Abrir módulo {trazaSeleccionada.traza.modulo}</span>
                    <ArrowRightIcon className="h-3 w-3" />
                  </button>
                )}
              <button
                type="button"
                onClick={() => setTrazaSeleccionada(null)}
                className="rounded-lg border border-gray-200 px-3.5 py-1.5 text-xs font-normal text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES LOCALES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * TabContexto — pestaña de la barra de vistas del chat.
 */
function TabContexto({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activo}
      onClick={onClick}
      className={
        "shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition-colors " +
        (activo
          ? "bg-brand-500 text-white font-medium shadow-theme-xs"
          : "text-gray-500 hover:text-gray-800 hover:bg-gray-100 font-normal dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5")
      }
    >
      {children}
    </button>
  );
}

interface BotTrazabilidad {
  nombreBot: string;
  flujo: string;
  tag: string;
  tagClass: string;
  modulo?: ModuloIntegrable;
  accion?: string;
}

function getBotTrazabilidad(m: Mensaje, estadoConv?: string): BotTrazabilidad {
  // 1. Pedidos
  if (m.moduloContexto === "pedidos" || m.payload?.pedidoId) {
    return {
      nombreBot: "Chatbot Necto",
      flujo: "Verificación de menú + [Catálogo de pedidos] + Validación operativa",
      tag: "+Pedidos",
      tagClass:
        "bg-brand-50 text-brand-600 border-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20",
      modulo: "pedidos",
      accion: m.payload?.pedidoId ? `Ver pedido #${m.payload.pedidoId}` : "Ver catálogo de pedidos",
    };
  }

  // 2. Handoff / derivación
  if (
    estadoConv === "handoff_solicitado" ||
    m.contenido.texto.toLowerCase().includes("asesor") ||
    m.contenido.texto.toLowerCase().includes("humano")
  ) {
    return {
      nombreBot: "Chatbot Necto",
      flujo: "Derivación asistida + [Mesa de ayuda] + Solicitud de handoff",
      tag: "+Handoff",
      tagClass:
        "bg-brand-50 text-brand-600 border-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20",
    };
  }

  // 3. Base de conocimiento / Asistente general
  return {
    nombreBot: "Chatbot Necto",
    flujo: "Atención inteligente + [Base de conocimiento] + Respuesta conversacional",
    tag: "+FAQ",
    tagClass:
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-gray-700",
  };
}

/**
 * BotAvatar — Avatar distintivo de robot con indicador IA en la esquina inferior.
 */
function BotAvatar() {
  return (
    <div className="relative h-9 w-9 shrink-0 sm:h-10 sm:w-10">
      <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-100 text-gray-700 shadow-theme-xs ring-1 ring-gray-200 dark:bg-white/10 dark:text-gray-300 dark:ring-gray-700">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="10" rx="3" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
          <line x1="8" y1="16" x2="8.01" y2="16" strokeWidth="2.5" />
          <line x1="16" y1="16" x2="16.01" y2="16" strokeWidth="2.5" />
        </svg>
      </div>
      <div
        className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-white shadow-theme-xs ring-2 ring-white dark:ring-gray-900"
        title="Agente IA de atención"
      >
        <svg
          className="h-2.5 w-2.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
    </div>
  );
}

export default ChatView;
