import { useState } from "react";
import { Link } from "react-router";
import { observer } from "mobx-react-lite";
import { ViewColumnsIcon } from "@heroicons/react/24/outline";
import { CanalAvatar } from "./CanalAvatar";
import { Badge } from "@/elements/ui/badge";
import { Dropdown, DropdownItem } from "@/elements/ui/dropdown";
import { retardoEscalonado } from "@/utils";
import { conversacionesStore, etiquetaEstado } from "@/stores/conversaciones.store";
import { pedidosStore } from "@/stores/pedidos.store";
import { uiStore } from "@/shell/stores/ui.store";
import type { FiltroBandeja, FiltroFecha } from "@/stores/conversaciones.types";
import {
  intencionDe,
  INTENCION_LABEL,
  INTENCION_BADGE,
} from "../conversaciones.clasificacion";
import {
  statusDe,
  formatearFechaListaChat,
  ultimoTexto,
} from "../conversaciones.utils";

const FILTROS_FECHA: ReadonlyArray<{ valor: FiltroFecha; etiqueta: string }> = [
  { valor: "todas", etiqueta: "Todas las fechas" },
  { valor: "hoy", etiqueta: "Hoy" },
  { valor: "ayer", etiqueta: "Ayer" },
  { valor: "7dias", etiqueta: "Últimos 7 días" },
  { valor: "30dias", etiqueta: "Últimos 30 días" },
  { valor: "este_mes", etiqueta: "Este mes" },
];

const FILTROS_ESTADO: ReadonlyArray<{ valor: FiltroBandeja; etiqueta: string }> = [
  { valor: "todas", etiqueta: "Todas las conversaciones" },
  { valor: "requieren_atencion", etiqueta: "Requieren atención" },
  { valor: "mis_conversaciones", etiqueta: "Mis conversaciones" },
  { valor: "sin_asignar", etiqueta: "Sin asignar" },
  { valor: "ia_activa", etiqueta: "IA activa" },
  { valor: "no_leidas", etiqueta: "Solo no leídas" },
  { valor: "cerradas", etiqueta: "Resueltas" },
];

interface BandejaListaProps {
  onToggle?: () => void;
  bandejaExpandida?: boolean;
}

export const BandejaLista = observer(({ onToggle, bandejaExpandida = true }: BandejaListaProps) => {
  const bandeja = conversacionesStore.bandeja;
  const seleccionadaId = conversacionesStore.seleccionadaId;
  const compacta = uiStore.densidadBandeja === "compacta";
  const [menuFiltrosOpen, setMenuFiltrosOpen] = useState(false);
  const [recargando, setRecargando] = useState(false);

  const handleRecargar = async () => {
    setRecargando(true);
    try {
      await conversacionesStore.cargarDesdeBase();
    } finally {
      setTimeout(() => setRecargando(false), 500);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden font-sans text-gray-800 dark:text-white/90">
      {/* Cabecera: Título "Chats", Filtros, Recargar y Buscador de contactos */}
      <div className="p-3.5 sm:p-4 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold tracking-tight text-[#190088] dark:text-white/90">
              Chats
            </h3>
            {conversacionesStore.totalNoLeidos > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF3F1A] px-1.5 text-[11px] font-bold text-white shadow-theme-xs">
                {conversacionesStore.totalNoLeidos}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Filtros Dropdown */}
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => setMenuFiltrosOpen(!menuFiltrosOpen)}
                className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs shadow-theme-xs transition-colors cursor-pointer ${
                  conversacionesStore.filtro !== "todas" || conversacionesStore.filtroFecha !== "todas"
                    ? "border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-400"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
                }`}
                title="Filtrar conversaciones"
                aria-label="Filtrar conversaciones"
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
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" />
                  <line x1="9" y1="8" x2="15" y2="8" />
                  <line x1="17" y1="16" x2="23" y2="16" />
                </svg>
                {(conversacionesStore.filtro !== "todas" || conversacionesStore.filtroFecha !== "todas") && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#FF3F1A]" />
                )}
              </button>

              <Dropdown
                isOpen={menuFiltrosOpen}
                onClose={() => setMenuFiltrosOpen(false)}
                className="w-60 p-2 max-h-96 overflow-y-auto custom-scrollbar left-0 sm:left-auto sm:right-0 z-50"
              >
                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Filtrar por fecha
                </div>
                <div className="mb-2 space-y-0.5">
                  {FILTROS_FECHA.map((f) => (
                    <DropdownItem
                      key={f.valor}
                      onItemClick={() => {
                        conversacionesStore.setFiltroFecha(f.valor);
                      }}
                      className={`text-xs ${
                        conversacionesStore.filtroFecha === f.valor
                          ? "font-bold text-brand-600 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-400"
                          : "font-normal text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                      }`}
                    >
                      {f.etiqueta}
                    </DropdownItem>
                  ))}
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-2 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Filtrar por estado
                </div>
                <div className="space-y-0.5">
                  {FILTROS_ESTADO.map((f) => (
                    <DropdownItem
                      key={f.valor}
                      onItemClick={() => {
                        conversacionesStore.setFiltro(f.valor);
                      }}
                      className={`text-xs ${
                        conversacionesStore.filtro === f.valor
                          ? "font-bold text-brand-600 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-400"
                          : "font-normal text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                      }`}
                    >
                      {f.etiqueta}
                    </DropdownItem>
                  ))}
                </div>

                {(conversacionesStore.filtro !== "todas" || conversacionesStore.filtroFecha !== "todas") && (
                  <div className="border-t border-gray-100 dark:border-gray-800 mt-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        conversacionesStore.setFiltro("todas");
                        conversacionesStore.setFiltroFecha("todas");
                        setMenuFiltrosOpen(false);
                      }}
                      className="w-full text-center text-xs font-semibold text-[#FF3F1A] hover:underline py-1 cursor-pointer"
                    >
                      Limpiar todos los filtros
                    </button>
                  </div>
                )}
              </Dropdown>
            </div>

            {/* Botón Refrescar */}
            <button
              type="button"
              onClick={handleRecargar}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-theme-xs transition-colors hover:bg-gray-50 hover:text-gray-900 active:scale-95 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-white cursor-pointer"
              title="Recargar conversaciones"
              aria-label="Recargar conversaciones"
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
                className={recargando ? "animate-spin" : ""}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>

            {/* Acceso a Seguimiento (Pipeline Kanban) */}
            <Link
              to="/conversaciones/seguimiento"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-theme-xs transition-colors hover:bg-gray-50 hover:text-gray-900 active:scale-95 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-white cursor-pointer"
              title="Abrir vista de Seguimiento"
              aria-label="Abrir vista de Seguimiento"
            >
              <ViewColumnsIcon className="h-4 w-4 text-[#190088] dark:text-[#97D6DF]" />
            </Link>
          </div>
        </div>

        {/* Buscador dentro de la tarjeta de contactos */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            value={conversacionesStore.busqueda}
            onChange={(e) => conversacionesStore.setBusqueda(e.target.value)}
            placeholder="Buscar chat, teléfono o ID..."
            className="h-9 w-full rounded-xl border border-gray-200 bg-[#ECECEC]/40 py-1.5 pl-9 pr-8 text-xs text-[#212121] placeholder:text-gray-400 transition-colors focus:border-[#FF3F1A] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#FF3F1A]/10 dark:border-gray-800 dark:bg-white/[0.04] dark:text-white/90 dark:placeholder:text-gray-500 dark:focus:border-[#FF3F1A] dark:focus:bg-transparent"
          />
          {conversacionesStore.busqueda && (
            <button
              type="button"
              onClick={() => conversacionesStore.setBusqueda("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title="Limpiar búsqueda"
              aria-label="Limpiar búsqueda"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Lista de Chats */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-3 py-2 custom-scrollbar">
        {bandeja.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="mb-3 flex items-center justify-center rounded-2xl bg-[#ECECEC]/30 p-3 dark:bg-white/[0.04]">
              <img
                src="/images/whatsapp/whatsapp-10.svg"
                alt="WhatsApp"
                className="h-7 w-auto max-w-[130px] object-contain opacity-80 dark:invert dark:opacity-85"
              />
            </div>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
              No se encontraron conversaciones
            </p>
            {conversacionesStore.busqueda ? (
              <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 max-w-[200px]">
                Ningún chat coincide con "{conversacionesStore.busqueda}".
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 max-w-[200px]">
                Tus conversaciones activas aparecerán aquí.
              </p>
            )}
            {(conversacionesStore.busqueda || conversacionesStore.filtro !== "todas" || conversacionesStore.filtroFecha !== "todas") && (
              <button
                type="button"
                onClick={() => {
                  conversacionesStore.setBusqueda("");
                  conversacionesStore.setFiltro("todas");
                  conversacionesStore.setFiltroFecha("todas");
                }}
                className="mt-3 text-[11px] font-semibold text-[#FF3F1A] hover:underline cursor-pointer"
              >
                Limpiar filtros y búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className={compacta ? "space-y-0.5" : "space-y-1"}>
            {bandeja.map((conv, i) => {
              const seleccionada = seleccionadaId === conv.id;
              const preview = ultimoTexto(conv.id) || conv.contacto.telefono || "Sin mensajes";
              const pedidoVivo = pedidosStore.pedidoActivoDe(conv.contacto.telefono);
              const idPedido = pedidoVivo?.numero || (pedidoVivo?.id ? pedidoVivo.id.slice(0, 6) : "");
              const intencion = intencionDe(conv.id);
              const fecha = formatearFechaListaChat(conv.ultimaActividad);

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    if (seleccionadaId === conv.id) {
                      conversacionesStore.seleccionar(null);
                    } else {
                      conversacionesStore.seleccionar(conv.id);
                    }
                  }}
                  style={{ animationDelay: retardoEscalonado(i) }}
                  className={`animate-entrada-lista group flex cursor-pointer items-center transition-colors ${
                    compacta ? "gap-2.5 rounded-xl px-3 py-2.5" : "gap-3 rounded-xl p-3"
                  } ${
                    seleccionada
                      ? "bg-brand-500/10 dark:bg-brand-500/15"
                      : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  {/* Avatar con foto o canal WhatsApp/Telegram y presencia */}
                  <div className="relative shrink-0">
                    <CanalAvatar
                      canal={conv.canal}
                      nombre={conv.contacto.nombre}
                      size={compacta ? "medium" : "large"}
                      status={statusDe(conv.estado)}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Fila 1: Nombre + Badges de intención/estado + Fecha */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex min-w-0 items-center gap-1.5 flex-wrap">
                        <h5
                          className={`truncate text-sm font-bold ${
                            seleccionada ? "text-brand-500 dark:text-brand-400" : "text-gray-900 dark:text-white/90"
                          }`}
                        >
                          {conv.contacto.nombre}
                        </h5>

                        {idPedido && (
                          <span className="rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-gray-700 dark:text-gray-300">
                            #{idPedido}
                          </span>
                        )}

                        <Badge size="xs" color={INTENCION_BADGE[intencion]}>
                          {INTENCION_LABEL[intencion]}
                        </Badge>

                        {conversacionesStore.requiereAtencionHumana(conv) && (
                          <span title={etiquetaEstado("en_espera")}>
                            <Badge size="xs" color="warning">
                              {etiquetaEstado("en_espera")}
                            </Badge>
                          </span>
                        )}
                      </div>

                      <span className="shrink-0 text-xs font-normal text-gray-400 dark:text-gray-500">
                        {fecha}
                      </span>
                    </div>

                    {/* Fila 2: Teléfono + Preview del mensaje */}
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400 font-normal">
                        {conv.contacto.telefono ? `${conv.contacto.telefono} · ` : ""}
                        {preview}
                      </p>
                      {conv.noLeidos > 0 && (
                        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white shadow-theme-xs">
                          {conv.noLeidos}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

export default BandejaLista;
