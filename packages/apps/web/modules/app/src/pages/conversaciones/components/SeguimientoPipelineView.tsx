import { useState, useMemo, useEffect, useRef } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";
import {
  BanknotesIcon,
  CalculatorIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  ViewColumnsIcon,
  XMarkIcon,
  ArrowPathIcon,
  TagIcon,
  ChevronDownIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

import { Badge } from "@/elements/ui/badge";
import { conversacionesStore, presenciaDe } from "@/stores/conversaciones.store";
import { pedidosStore } from "@/stores/pedidos.store";
import type { ConversacionCanal } from "@/stores";
import { formatoMoneda, inicialesDe, retardoEscalonado } from "@/utils";
import { ultimoTexto } from "@/pages/conversaciones/conversaciones.utils";
import { ChatDrawer } from "@/pages/conversaciones/components/ChatDrawer";

// ═══════════════════════════════════════════════════════════════════════════
// ETAPAS DEL PIPELINE DE SEGUIMIENTO
// ═══════════════════════════════════════════════════════════════════════════

export type EtapaSeguimiento =
  | "contacto_inicial"
  | "oferta_enviada"
  | "seguimiento"
  | "en_cierre"
  | "validacion_pago";

export interface ColumnaEtapaConfig {
  clave: EtapaSeguimiento;
  label: string;
  dotColor: string;
  dotBg: string;
}

export const ETAPAS_PIPELINE: ColumnaEtapaConfig[] = [
  { clave: "contacto_inicial", label: "Contacto Inicial", dotColor: "#0284C7", dotBg: "bg-accent-500" },
  { clave: "oferta_enviada", label: "Oferta Enviada", dotColor: "#FF3F1A", dotBg: "bg-brand-500" },
  { clave: "seguimiento", label: "Seguimiento", dotColor: "#190088", dotBg: "bg-secondary-500" },
  { clave: "en_cierre", label: "En Cierre", dotColor: "#10B981", dotBg: "bg-success-500" },
  { clave: "validacion_pago", label: "Validación de pago", dotColor: "#F59E0B", dotBg: "bg-warning-500" },
];

const LOCAL_STORAGE_STAGES_KEY = "necto_seguimiento_etapas_v1";

function leerEtapasPersonalizadas(): Record<string, EtapaSeguimiento> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STAGES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function guardarEtapasPersonalizadas(mapa: Record<string, EtapaSeguimiento>) {
  try {
    localStorage.setItem(LOCAL_STORAGE_STAGES_KEY, JSON.stringify(mapa));
  } catch {}
}

/**
 * Deriva la etapa inicial de una conversación si no ha sido movida manualmente.
 */
function calcularEtapaPorDefecto(conv: ConversacionCanal): EtapaSeguimiento {
  if (conv.estado === "atendida") return "en_cierre";
  if (conv.estado === "en_espera") return "seguimiento";
  if (conv.estado === "cerrada") return "validacion_pago";
  return pedidosStore.pedidoActivoDe(conv.contacto.telefono)
    ? "oferta_enviada"
    : "contacto_inicial";
}

/** Formateador de fecha amigable integrado con el estilo Necto */
function formatearFechaNecto(isoString: string): string {
  try {
    const fecha = new Date(isoString);
    if (isNaN(fecha.getTime())) return "Reciente";

    const ahora = new Date();
    const esHoy =
      fecha.getDate() === ahora.getDate() &&
      fecha.getMonth() === ahora.getMonth() &&
      fecha.getFullYear() === ahora.getFullYear();

    const ayer = new Date(ahora);
    ayer.setDate(ayer.getDate() - 1);
    const esAyer =
      fecha.getDate() === ayer.getDate() &&
      fecha.getMonth() === ayer.getMonth() &&
      fecha.getFullYear() === ayer.getFullYear();

    const hora = fecha.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    if (esHoy) return `Hoy · ${hora}`;
    if (esAyer) return `Ayer · ${hora}`;

    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    return `${dia}/${mes} · ${hora}`;
  } catch {
    return "Reciente";
  }
}

/** Paleta de avatares de Necto */
const PALETA_AVATAR = [
  "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300",
  "bg-secondary-50 text-secondary-700 dark:bg-secondary-950/40 dark:text-secondary-300",
  "bg-accent-50 text-accent-700 dark:bg-accent-950/40 dark:text-accent-300",
  "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE TARJETA DE CONVERSACIÓN / LEAD (PIPELINE CARD)
// ═══════════════════════════════════════════════════════════════════════════

interface TarjetaPipelineProps {
  conv: ConversacionCanal;
  indice: number;
  onAbrir: (convId: string) => void;
  onDragStart: (e: React.DragEvent, convId: string) => void;
}

const TarjetaPipeline = observer(({ conv, indice, onAbrir, onDragStart }: TarjetaPipelineProps) => {
  const pedido = pedidosStore.pedidoActivoDe(conv.contacto.telefono);
  const valor = pedido ? pedidosStore.totalPedido(pedido) : 0;
  const fechaStr = formatearFechaNecto(conv.ultimaActividad);
  const iniciales = inicialesDe(conv.contacto.nombre);
  const preview = ultimoTexto(conv.id);
  const presencia = presenciaDe(conv.estado);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, conv.id)}
      onClick={() => onAbrir(conv.id)}
      style={{ animationDelay: retardoEscalonado(indice) }}
      className="group relative cursor-grab active:cursor-grabbing select-none rounded-2xl border border-gray-100 bg-white p-3.5 shadow-theme-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-theme-md dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-800"
    >
      {/* ── Fila superior: Avatar, Nombre, Subtítulo y Fecha ── */}
      <div className="flex items-start gap-3">
        {/* Avatar redondo Necto con iniciales y punto de presencia/WhatsApp */}
        <div className="relative shrink-0">
          <div
            className={`flex size-9 items-center justify-center rounded-full text-xs font-bold ${
              PALETA_AVATAR[indice % PALETA_AVATAR.length]
            }`}
          >
            {iniciales}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-white dark:ring-gray-900 ${
              presencia === "online"
                ? "bg-[#25D366]"
                : presencia === "busy"
                ? "bg-brand-500"
                : "bg-gray-400"
            }`}
            title="WhatsApp"
          />
        </div>

        {/* Nombre y subtítulo */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-1.5">
            <h4 className="truncate text-sm font-bold text-ink-title group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
              {conv.contacto.nombre}
            </h4>
            <span className="shrink-0 text-[10px] font-medium text-gray-400 dark:text-gray-500">
              {fechaStr}
            </span>
          </div>

          <p className="truncate text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            {conv.contacto.telefono}
          </p>

          {preview && (
            <p className="mt-1 line-clamp-1 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
              {preview}
            </p>
          )}
        </div>
      </div>

      {/* ── Fila inferior: Valor y Badges Necto ── */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5 dark:border-gray-800">
        <span
          className={`text-xs ${
            valor > 0
              ? "font-bold text-gray-900 dark:text-white"
              : "font-medium text-gray-400 dark:text-gray-500"
          }`}
        >
          {valor > 0 ? formatoMoneda(valor) : "Sin valor"}
        </span>

        <div className="flex items-center gap-1.5">
          {conv.noLeidos > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF3F1A] px-1 text-[10px] font-bold text-white shadow-theme-xs">
              {conv.noLeidos}
            </span>
          )}
          <Badge color={pedido ? "success" : "light"} size="sm">
            {pedido ? "Cliente" : "Lead"}
          </Badge>
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE COLUMNA DEL PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

interface ColumnaPipelineProps {
  config: ColumnaEtapaConfig;
  convs: ConversacionCanal[];
  onAbrir: (convId: string) => void;
  onDropConv: (convId: string, nuevaEtapa: EtapaSeguimiento) => void;
  onDragStart: (e: React.DragEvent, convId: string) => void;
  isSingleColumn?: boolean;
}

const ColumnaPipeline = observer(
  ({ config, convs, onAbrir, onDropConv, onDragStart, isSingleColumn }: ColumnaPipelineProps) => {
    const [isOver, setIsOver] = useState(false);

    // Suma de dinero de la columna (pedidos activos de sus contactos)
    const totalDinero = useMemo(() => {
      return convs.reduce((acc, c) => {
        const p = pedidosStore.pedidoActivoDe(c.contacto.telefono);
        return acc + (p ? pedidosStore.totalPedido(p) : 0);
      }, 0);
    }, [convs]);

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!isOver) setIsOver(true);
    };

    const handleDragLeave = () => {
      setIsOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsOver(false);
      const convId = e.dataTransfer.getData("text/plain");
      if (convId) {
        onDropConv(convId, config.clave);
      }
    };

    return (
      <section
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex h-full max-h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl border transition-all duration-200 ${
          isOver
            ? "border-brand-500 bg-brand-50/30 ring-2 ring-brand-500/20 dark:border-brand-500 dark:bg-brand-950/20"
            : "border-gray-100/80 bg-gray-50/90 dark:border-gray-800/60 dark:bg-white/[0.02]"
        } p-3 shadow-theme-xs`}
      >
        {/* Cabecera de la columna */}
        <header className="mb-3 shrink-0 px-1.5 pt-1">
          <div className="flex items-center gap-2">
            <span className={`size-2 shrink-0 rounded-full ${config.dotBg}`} />
            <h3 className="truncate text-sm font-bold text-ink-title dark:text-white">
              {config.label}
            </h3>
          </div>
          <p className="mt-1 pl-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            {formatoMoneda(totalDinero)}{" "}
            <span className="font-medium text-gray-400 dark:text-gray-500">
              · {convs.length}
            </span>
          </p>
        </header>

        {/* Lista de tarjetas con scroll suave y limpio */}
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1 pb-2 [scrollbar-width:thin]">
          {convs.map((c, i) => (
            <TarjetaPipeline
              key={c.id}
              conv={c}
              indice={i}
              onAbrir={onAbrir}
              onDragStart={onDragStart}
            />
          ))}

          {convs.length === 0 && (
            <div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200/80 py-10 text-center text-xs font-medium text-gray-400 dark:border-gray-800/80">
              Sin chats
            </div>
          )}
        </div>
      </section>
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// VISTA PRINCIPAL: SEGUIMIENTO PIPELINE (Diseño 100% Nativo Necto)
// ═══════════════════════════════════════════════════════════════════════════

interface SeguimientoPipelineViewProps {
  onCambiarAVistaChats?: () => void;
}

export const SeguimientoPipelineView = observer(
  ({ onCambiarAVistaChats }: SeguimientoPipelineViewProps) => {
    const navigate = useNavigate();
    const [busqueda, setBusqueda] = useState("");
    const [buscadorAbierto, setBuscadorAbierto] = useState(false);
    const [recargando, setRecargando] = useState(false);
    const [etapasFiltro, setEtapasFiltro] = useState<EtapaSeguimiento[]>([]);
    const [menuEtapasAbierto, setMenuEtapasAbierto] = useState(false);
    const menuEtapasRef = useRef<HTMLDivElement>(null);
    const [etapasMap, setEtapasMap] = useState<Record<string, EtapaSeguimiento>>(
      leerEtapasPersonalizadas
    );
    const [chatSeleccionadoId, setChatSeleccionadoId] = useState<string | null>(null);

    // Cierre al hacer click fuera del menú de etapas
    useEffect(() => {
      if (!menuEtapasAbierto) return;
      const handleClickFuera = (e: MouseEvent) => {
        if (menuEtapasRef.current && !menuEtapasRef.current.contains(e.target as Node)) {
          setMenuEtapasAbierto(false);
        }
      };
      document.addEventListener("mousedown", handleClickFuera);
      return () => document.removeEventListener("mousedown", handleClickFuera);
    }, [menuEtapasAbierto]);

    const toggleEtapaFiltro = (clave: EtapaSeguimiento) => {
      setEtapasFiltro((prev) =>
        prev.includes(clave) ? prev.filter((k) => k !== clave) : [...prev, clave]
      );
    };

    // Todas las conversaciones activas del store
    const conversaciones = conversacionesStore.conversaciones;

    // Asignación de etapas combinando lo automático con lo manual del usuario
    const conversacionesPorEtapa = useMemo(() => {
      const q = busqueda.trim().toLowerCase();
      const resultado: Record<EtapaSeguimiento, ConversacionCanal[]> = {
        contacto_inicial: [],
        oferta_enviada: [],
        seguimiento: [],
        en_cierre: [],
        validacion_pago: [],
      };

      for (const conv of conversaciones) {
        if (q) {
          const coincideNombre = conv.contacto.nombre.toLowerCase().includes(q);
          const coincideTel = conv.contacto.telefono.includes(q);
          const coincideId = conv.id.toLowerCase().includes(q);
          if (!coincideNombre && !coincideTel && !coincideId) continue;
        }

        const etapa = etapasMap[conv.id] || calcularEtapaPorDefecto(conv);
        if (resultado[etapa]) {
          resultado[etapa].push(conv);
        } else {
          resultado.contacto_inicial.push(conv);
        }
      }

      // Ordenar cada columna por última actividad descendente
      for (const k of Object.keys(resultado) as EtapaSeguimiento[]) {
        resultado[k].sort((a, b) => b.ultimaActividad.localeCompare(a.ultimaActividad));
      }

      return resultado;
    }, [conversaciones, etapasMap, busqueda]);

    // Columnas visibles según el filtro seleccionado (o todas si no hay filtro activo)
    const columnasVisibles = useMemo(() => {
      if (etapasFiltro.length === 0) return ETAPAS_PIPELINE;
      return ETAPAS_PIPELINE.filter((e) => etapasFiltro.includes(e.clave));
    }, [etapasFiltro]);

    // Métricas totales del pipeline
    const { totalValorPipeline, totalProspectos } = useMemo(() => {
      let suma = 0;
      let cantidad = 0;

      for (const k of Object.keys(conversacionesPorEtapa) as EtapaSeguimiento[]) {
        const lista = conversacionesPorEtapa[k];
        cantidad += lista.length;
        for (const conv of lista) {
          const p = pedidosStore.pedidoActivoDe(conv.contacto.telefono);
          if (p) suma += pedidosStore.totalPedido(p);
        }
      }

      return { totalValorPipeline: suma, totalProspectos: cantidad };
    }, [conversacionesPorEtapa]);

    const handleDragStart = (e: React.DragEvent, convId: string) => {
      e.dataTransfer.setData("text/plain", convId);
    };

    const handleDropConv = (convId: string, nuevaEtapa: EtapaSeguimiento) => {
      const nuevoMapa = { ...etapasMap, [convId]: nuevaEtapa };
      setEtapasMap(nuevoMapa);
      guardarEtapasPersonalizadas(nuevoMapa);
    };

    const handleRecargar = async () => {
      setRecargando(true);
      try {
        await conversacionesStore.cargarDesdeBase();
      } finally {
        setTimeout(() => setRecargando(false), 500);
      }
    };

    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden font-sans text-gray-900 dark:text-white/90">
        {/* ── BARRA SUPERIOR DE FILTROS Y ACCIONES (Idéntica a Pedidos) ── */}
        <header className="mb-4 sm:mb-6 shrink-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between min-w-0">
            {/* Lado izquierdo: Switcher (Chats / Seguimiento) y Filtro por etiquetas */}
            <div className="flex flex-wrap items-center gap-2.5 min-w-0">
              {/* Segmented Control Necto (Chats / Seguimiento) */}
              <div className="flex h-10 items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700 shadow-2xs shrink-0">
                {onCambiarAVistaChats ? (
                  <button
                    type="button"
                    onClick={onCambiarAVistaChats}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
                    title="Ir a consola de chats"
                  >
                    <ChatBubbleLeftRightIcon className="size-4 text-brand-500" />
                    <span>Chats</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/conversaciones")}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
                    title="Ir a consola de chats"
                  >
                    <ChatBubbleLeftRightIcon className="size-4 text-brand-500" />
                    <span>Chats</span>
                  </button>
                )}

                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-gray-900 shadow-theme-xs dark:bg-gray-900 dark:text-white cursor-default"
                >
                  <ViewColumnsIcon className="size-4 text-secondary-600 dark:text-accent-400" />
                  <span>Seguimiento</span>
                </button>
              </div>

              {/* Botón Filter y chips de etiquetas activas */}
              <div ref={menuEtapasRef} className="relative inline-block text-left shrink-0">
                <button
                  type="button"
                  onClick={() => setMenuEtapasAbierto((v) => !v)}
                  aria-expanded={menuEtapasAbierto}
                  aria-haspopup="true"
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-200/90 bg-white px-3 text-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700/80 dark:bg-gray-900/80 dark:text-gray-200 dark:hover:bg-gray-800 cursor-pointer select-none"
                >
                  <svg
                    className="size-3.5 text-gray-500 dark:text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <path d="M4 7h16M7 12h10M10 17h4" />
                  </svg>
                  <span>Filter</span>
                  {etapasFiltro.length > 0 && (
                    <span className="flex size-4.5 items-center justify-center rounded-full bg-secondary-100 text-[10px] font-bold text-secondary-700 dark:bg-accent-900/60 dark:text-accent-300">
                      {etapasFiltro.length}
                    </span>
                  )}
                </button>

                {menuEtapasAbierto && (
                  <div className="absolute left-0 top-full z-50 mt-1.5 w-60 rounded-xl border border-gray-200/90 bg-white p-1.5 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Filtrar por etiqueta
                    </div>
                    {ETAPAS_PIPELINE.map((e) => {
                      const seleccionada = etapasFiltro.includes(e.clave);
                      const count = conversacionesPorEtapa[e.clave]?.length || 0;
                      return (
                        <button
                          key={e.clave}
                          type="button"
                          onClick={() => toggleEtapaFiltro(e.clave)}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                            seleccionada
                              ? "bg-gray-100 font-semibold text-gray-900 dark:bg-gray-800 dark:text-white"
                              : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex size-4 items-center justify-center rounded border ${
                                seleccionada
                                  ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                                  : "border-gray-300 dark:border-gray-600"
                              }`}
                            >
                              {seleccionada && <CheckIcon className="size-3 stroke-[3]" />}
                            </div>
                            <span>{e.label}</span>
                          </div>
                          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                    {etapasFiltro.length > 0 && (
                      <>
                        <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                        <button
                          type="button"
                          onClick={() => setEtapasFiltro([])}
                          className="flex w-full items-center justify-center rounded-lg py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-red-400 cursor-pointer"
                        >
                          Limpiar filtros
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {etapasFiltro.length > 0 && (
                <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-0.5" />
              )}

              {etapasFiltro.map((clave) => {
                const info = ETAPAS_PIPELINE.find((e) => e.clave === clave);
                if (!info) return null;
                return (
                  <span
                    key={clave}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-200/90 bg-white px-3 text-xs font-medium text-gray-800 shadow-theme-xs dark:border-gray-700/80 dark:bg-gray-900/80 dark:text-gray-200"
                  >
                    <span>{info.label}</span>
                    <button
                      type="button"
                      onClick={() => toggleEtapaFiltro(clave)}
                      className="ml-0.5 rounded p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                      title={`Quitar ${info.label}`}
                    >
                      <XMarkIcon className="size-3.5 stroke-[2.5]" />
                    </button>
                  </span>
                );
              })}
            </div>

            {/* Acciones derechas (Idénticas a Pedidos) */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end lg:self-auto">
              {/* Aviso del total en dinero del pipeline */}
              <div className="flex h-10 items-center gap-2.5 rounded-xl border border-gray-200/90 bg-white px-3 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <CalculatorIcon className="size-4" />
                </div>
                <div className="flex items-center gap-1.5 whitespace-nowrap text-xs">
                  <span className="font-medium text-gray-500 dark:text-gray-400">
                    Total en Pipeline:
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {formatoMoneda(totalValorPipeline)}
                  </span>
                </div>
                <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  <ChatBubbleLeftRightIcon className="size-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                  <span>{totalProspectos}</span>
                </div>
              </div>
              {/* Buscador expandible con botón lupa */}
              {buscadorAbierto ? (
                <div className="relative h-10 w-48 sm:w-64 shrink-0">
                  <input
                    autoFocus
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar prospecto o teléfono…"
                    className="h-full w-full rounded-xl border border-brand-500 bg-brand-50/40 py-2 pl-9 pr-8 text-xs text-gray-900 placeholder-gray-400 focus:outline-none dark:border-brand-500 dark:bg-brand-950/40 dark:text-white"
                  />
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-500" />
                  {busqueda && (
                    <button
                      type="button"
                      onClick={() => setBusqueda("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    >
                      <XMarkIcon className="size-3.5" />
                    </button>
                  )}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  if (buscadorAbierto) setBusqueda("");
                  setBuscadorAbierto((v) => !v);
                }}
                aria-expanded={buscadorAbierto}
                aria-label={buscadorAbierto ? "Ocultar el buscador" : "Buscar prospectos"}
                title={buscadorAbierto ? "Ocultar el buscador" : "Buscar prospectos"}
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                  buscadorAbierto
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950/40 dark:text-brand-300"
                    : "border-gray-200/90 bg-white text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                }`}
              >
                <MagnifyingGlassIcon className="size-4" />
              </button>

              {/* Botón Refrescar */}
              <button
                type="button"
                onClick={handleRecargar}
                aria-label="Recargar pipeline"
                title="Recargar pipeline"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-gray-200/90 bg-white text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 cursor-pointer dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <ArrowPathIcon
                  className={`size-4 text-gray-600 dark:text-gray-400 ${
                    recargando ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </header>

        {/* ── CUERPO: COLUMNAS KANBAN HORIZONTALES CON ESTILO NECTO ── */}
        <main className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {columnasVisibles.map((config) => (
            <div
              key={config.clave}
              className={`flex min-h-0 ${
                columnasVisibles.length === 1 ? "w-full max-w-md" : "min-w-[260px] max-w-[380px] flex-1"
              }`}
            >
              <ColumnaPipeline
                config={config}
                convs={conversacionesPorEtapa[config.clave]}
                onAbrir={(id) => setChatSeleccionadoId(id)}
                onDropConv={handleDropConv}
                onDragStart={handleDragStart}
              />
            </div>
          ))}
        </main>

        {/* ── SLIDE-OVER / DRAWER NECTO PARA RESPONDER CHATS SIN SALIR ── */}
        {chatSeleccionadoId && (
          <ChatDrawer
            convId={chatSeleccionadoId}
            onClose={() => setChatSeleccionadoId(null)}
          />
        )}
      </div>
    );
  }
);

export default SeguimientoPipelineView;
