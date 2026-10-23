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
import { ConversacionVacia } from "@/pages/conversaciones/components/ConversacionVacia";
import { Dropdown, DropdownItem } from "@/elements/ui/dropdown";
import type { FiltroBandeja, FiltroFecha } from "@/stores/conversaciones.types";

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
  const [menuFiltrosOpen, setMenuFiltrosOpen] = useState(false);
  const [recargando, setRecargando] = useState(false);
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

  const [enVivo, setEnVivo] = useState(tiempoRealActivo);

  useEffect(() => {
    setEnVivo(tiempoRealActivo());
  }, []);

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

  const handleRecargar = async () => {
    setRecargando(true);
    try {
      await conversacionesStore.cargarDesdeBase();
    } finally {
      setTimeout(() => setRecargando(false), 500);
    }
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden font-sans text-gray-900 dark:text-white/90">
      <PageMeta
        title="WhatsApp · Consola de Atención"
        description="Consola de mensajería y atención multicanal — bandeja, chat y contexto de clientes"
      />

      {/* ── Barra Superior (Buscador & Acciones Rápidas) ── */}
      <div className="shrink-0 mb-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Buscador de pedidos o teléfono */}
        <div className="relative flex-1 max-w-xl">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 dark:text-gray-500">
            <svg
              width="17"
              height="17"
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
            placeholder="Buscar por ID pedido o número de teléfono..."
            className="h-10 w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-800 placeholder:text-gray-400 shadow-theme-xs transition-colors focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-gray-500 dark:focus:border-brand-500"
          />
        </div>

        {/* Botones de acción derecha */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Botón Configurar Automatizaciones */}
          <Link
            to="/conversaciones/config"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
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
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Configurar Automatizaciones</span>
          </Link>

          {/* Botón Filtros con Dropdown */}
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => setMenuFiltrosOpen(!menuFiltrosOpen)}
              className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold shadow-theme-xs transition-colors ${
                conversacionesStore.filtro !== "todas" || conversacionesStore.filtroFecha !== "todas"
                  ? "border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-400"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
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
              <span>Filtros</span>
              {(conversacionesStore.filtro !== "todas" || conversacionesStore.filtroFecha !== "todas") && (
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              )}
            </button>
            <Dropdown
              isOpen={menuFiltrosOpen}
              onClose={() => setMenuFiltrosOpen(false)}
              className="w-64 p-2 max-h-96 overflow-y-auto custom-scrollbar"
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
                    className="w-full text-center text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 py-1 cursor-pointer"
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
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-theme-xs transition-colors hover:bg-gray-50 hover:text-gray-900 active:scale-95 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
            title="Recargar conversaciones"
            aria-label="Recargar conversaciones"
          >
            <svg
              width="15"
              height="15"
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
        </div>
      </div>

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
