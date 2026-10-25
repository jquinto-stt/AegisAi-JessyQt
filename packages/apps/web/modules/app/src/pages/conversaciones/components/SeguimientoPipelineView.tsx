import { useState, useMemo, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";
import {
  BanknotesIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  ViewColumnsIcon,
  XMarkIcon,
  EllipsisVerticalIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

import { conversacionesStore } from "@/stores/conversaciones.store";
import { pedidosStore } from "@/stores/pedidos.store";
import type { ConversacionCanal } from "@/stores";
import { formatoMoneda, inicialesDe } from "@/utils";
import { ChatDrawer } from "@/pages/conversaciones/components/ChatDrawer";

// ═══════════════════════════════════════════════════════════════════════════
// ETAPAS DEL PIPELINE DE SEGUIMIENTO (Réplica exacta MasterShop)
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
}

export const ETAPAS_PIPELINE: ColumnaEtapaConfig[] = [
  { clave: "contacto_inicial", label: "Contacto Inicial", dotColor: "#2563EB" },   // Azul
  { clave: "oferta_enviada", label: "Oferta Enviada", dotColor: "#F97316" },       // Naranja
  { clave: "seguimiento", label: "Seguimiento", dotColor: "#0EA5E9" },             // Cyan / Celeste
  { clave: "en_cierre", label: "En Cierre", dotColor: "#10B981" },                 // Verde esmeralda
  { clave: "validacion_pago", label: "Validación de pago", dotColor: "#8B5CF6" },   // Violeta
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

/** Formateador de fecha idéntico a MasterShop: "Hoy · 16:44" o "15/10 · 19:53" */
function formatearFechaMasterShop(isoString: string): string {
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

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE TARJETA DE CONVERSACIÓN / LEAD (PIPELINE CARD)
// ═══════════════════════════════════════════════════════════════════════════

interface TarjetaPipelineProps {
  conv: ConversacionCanal;
  onAbrir: (convId: string) => void;
  onDragStart: (e: React.DragEvent, convId: string) => void;
}

const TarjetaPipeline = observer(({ conv, onAbrir, onDragStart }: TarjetaPipelineProps) => {
  const pedido = pedidosStore.pedidoActivoDe(conv.contacto.telefono);
  const valor = pedido ? pedidosStore.totalPedido(pedido) : 0;
  const fechaStr = formatearFechaMasterShop(conv.ultimaActividad);
  const iniciales = inicialesDe(conv.contacto.nombre);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, conv.id)}
      onClick={() => onAbrir(conv.id)}
      className="group relative cursor-pointer select-none rounded-2xl border border-gray-200/80 bg-white p-3 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md active:scale-[0.99] dark:border-gray-800 dark:bg-gray-900/90 dark:hover:border-gray-700"
    >
      {/* ── Fila superior: Avatar con iniciales, Nombre, Subtítulo y Fecha ── */}
      <div className="flex items-start gap-2.5">
        {/* Avatar redondo con iniciales y punto de WhatsApp */}
        <div className="relative shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700 dark:bg-white/10 dark:text-gray-200">
            {iniciales}
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#25D366] ring-2 ring-white dark:ring-gray-900"
            title="WhatsApp"
          />
        </div>

        {/* Nombre y subtítulo */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-1.5">
            <h4 className="truncate text-[13px] font-bold text-gray-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
              {conv.contacto.nombre}
            </h4>
            <span className="shrink-0 text-[10px] font-medium text-gray-400 dark:text-gray-500">
              {fechaStr}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 mt-0.5">
            <span className="truncate text-[11px] text-gray-400 dark:text-gray-500">
              Conversación ID: {conv.id.slice(0, 10)}
            </span>
            <EllipsisVerticalIcon className="h-3.5 w-3.5 text-gray-300 opacity-60 transition-opacity group-hover:opacity-100 dark:text-gray-600" />
          </div>
        </div>
      </div>

      {/* ── Fila inferior: Valor del negocio / "Sin valor" y etiqueta "Lead" ── */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-100/90 pt-2 dark:border-gray-800/80">
        <span
          className={`text-[12px] ${
            valor > 0
              ? "font-bold text-gray-900 dark:text-white"
              : "font-medium text-gray-400 dark:text-gray-500"
          }`}
        >
          {valor > 0 ? formatoMoneda(valor) : "Sin valor"}
        </span>

        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-white/10 dark:text-gray-300">
          {pedido ? "Cliente" : "Lead"}
        </span>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE COLUMNA DEL KANBAN
// ═══════════════════════════════════════════════════════════════════════════

interface ColumnaPipelineProps {
  config: ColumnaEtapaConfig;
  convs: ConversacionCanal[];
  onAbrir: (convId: string) => void;
  onDropConv: (convId: string, nuevaEtapa: EtapaSeguimiento) => void;
  onDragStart: (e: React.DragEvent, convId: string) => void;
}

const ColumnaPipeline = observer(
  ({ config, convs, onAbrir, onDropConv, onDragStart }: ColumnaPipelineProps) => {
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
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex h-full min-h-0 flex-1 min-w-[270px] xl:min-w-[290px] flex-col rounded-2xl border transition-all duration-200 ${
          isOver
            ? "border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20 dark:border-brand-500 dark:bg-brand-500/10"
            : "border-gray-200/60 bg-[#EBEDF0]/70 dark:border-white/5 dark:bg-white/[0.02]"
        } p-2.5 overflow-hidden`}
      >
        {/* Cabecera de la columna */}
        <div className="mb-2.5 px-1.5 pt-1">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full shadow-2xs"
              style={{ backgroundColor: config.dotColor }}
            />
            <h3 className="truncate text-sm font-bold text-gray-800 dark:text-gray-100">
              {config.label}
            </h3>
          </div>
          <p className="mt-1 pl-4.5 text-[11px] font-semibold text-gray-600 dark:text-gray-400">
            {formatoMoneda(totalDinero)}{" "}
            <span className="font-normal text-gray-400 dark:text-gray-500">
              · {convs.length}
            </span>
          </p>
        </div>

        {/* Lista de tarjetas con scroll suave y limpio */}
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1 pb-2 [scrollbar-width:thin]">
          {convs.map((c) => (
            <TarjetaPipeline
              key={c.id}
              conv={c}
              onAbrir={onAbrir}
              onDragStart={onDragStart}
            />
          ))}

          {convs.length === 0 && (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-300/70 p-6 text-center text-xs text-gray-400 dark:border-gray-800">
              Sin prospectos
            </div>
          )}
        </div>
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// VISTA PRINCIPAL: SEGUIMIENTO PIPELINE (MasterShop UI Exact Replica)
// ═══════════════════════════════════════════════════════════════════════════

interface SeguimientoPipelineViewProps {
  onCambiarAVistaChats?: () => void;
}

export const SeguimientoPipelineView = observer(
  ({ onCambiarAVistaChats }: SeguimientoPipelineViewProps) => {
    const navigate = useNavigate();
    const [busqueda, setBusqueda] = useState("");
    const [etapasMap, setEtapasMap] = useState<Record<string, EtapaSeguimiento>>(
      leerEtapasPersonalizadas
    );
    const [chatSeleccionadoId, setChatSeleccionadoId] = useState<string | null>(null);

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

    // Métricas totales del pipeline (Badge verde en el centro)
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

    const handleAbrirChat = (convId: string) => {
      setChatSeleccionadoId(convId);
    };

    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#F6F7F9] font-sans dark:bg-[#0B0F19]">
        {/* ── TOP BAR (RÉPLICA EXACTA DE LA FOTO MASTERSHOP) ── */}
        <header className="shrink-0 border-b border-gray-200/80 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-gray-800/80 dark:bg-gray-900/90 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Lado izquierdo: Selector 'Ventas' y Badge 'Total en Pipeline' */}
            <div className="flex items-center gap-3">
              {/* Dropdown 'Ventas' */}
              <div className="relative inline-flex items-center">
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-gray-800 shadow-2xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/80"
                >
                  <span>Ventas</span>
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              {/* Badge verde: Total en Pipeline: $ 8.787.400 / 470 */}
              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                <BanknotesIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Total en Pipeline: {formatoMoneda(totalValorPipeline)} / {totalProspectos}
                </span>
              </div>
            </div>

            {/* Lado derecho: Buscador por nombre y Selector de Vistas (Chats / Seguimiento) */}
            <div className="flex items-center gap-2.5">
              {/* Buscador */}
              <div className="relative w-48 sm:w-64">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Búsqueda por nombre..."
                  className="w-full rounded-xl border border-gray-200 bg-white py-1.5 pl-9 pr-8 text-xs text-gray-900 placeholder-gray-400 shadow-2xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Tag Colombia 🇨🇴 */}
              <div className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <span>🇨🇴</span>
                <span>Colombia</span>
              </div>

              {/* Botón de alternancia a vista Chats */}
              {onCambiarAVistaChats ? (
                <button
                  type="button"
                  onClick={onCambiarAVistaChats}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  title="Cambiar a consola de chats"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4 text-brand-500" />
                  <span className="hidden md:inline">Ver Chats</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate("/conversaciones")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  title="Cambiar a consola de chats"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4 text-brand-500" />
                  <span className="hidden md:inline">Ver Chats</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── CUERPO: 5 COLUMNAS KANBAN HORIZONTALES ── */}
        <main className="flex min-h-0 flex-1 gap-3.5 overflow-x-auto p-4 sm:p-5">
          {ETAPAS_PIPELINE.map((config) => (
            <ColumnaPipeline
              key={config.clave}
              config={config}
              convs={conversacionesPorEtapa[config.clave]}
              onAbrir={handleAbrirChat}
              onDropConv={handleDropConv}
              onDragStart={handleDragStart}
            />
          ))}
        </main>

        {/* ── DRAWER DE CHAT RÁPIDO AL HACER CLIC EN CUALQUIER TARJETA ── */}
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
