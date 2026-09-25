import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Badge } from "@/elements/ui/badge";
import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { Avatar } from "@/elements/ui/avatar";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import { AVATAR_MAP, inicialesDe } from "@/pages/conversaciones/conversaciones.utils";
import {
  pedidosStore,
  sessionStore,
  organizacionStore,
  conversacionesStore,
  normalizarTelefono,
  etiquetaEstado,
  ATENCION_LABEL,
  puedeEscribirCliente,
  puedeCrearPedido,
  motivoSinPermiso,
  puedeGuardarConfig,
} from "@/stores";
import type { Pedido } from "@/stores/pedidos.store";
import type { ConversacionCanal } from "@/stores";
import { ChatDrawer } from "@/pages/conversaciones/components/ChatDrawer";
import {
  money,
  relativo,
  ListaVacia,
} from "./widgets";
import {
  KpiProgramadosWidget,
  SalesTrendChartWidget,
  PrepQueueWidget,
  LogisticsDeliveryWidget,
  CalendarioInicioModal,
  ResumenDiaWidget,
} from "./widgets";
import {
  esHoy,
  fechaCorta,
  hoyYmd,
  mesActual,
  mesDeYmd,
  mismoMes,
  rangoDelMesHastaHoy,
  ymdDeMesDia,
  type MesCalendario,
} from "./inicio.calendario";

import {
  Users,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Plus,
  Calendar as CalendarIcon,
  ArrowUpRight,
  ChevronDown,
  AlertCircle,
  Filter,
  CheckCircle2,
  Clock
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// CAMPANITA DE ATENCIÓN (Web Audio, sin archivos)
// ═══════════════════════════════════════════════════════════════════════════

let _audioCtx: AudioContext | null = null;
let _ultimoDing = 0;
let _campanitaTimer: ReturnType<typeof setInterval> | null = null;

function reproducirCampanita() {
  if (!pedidosStore.config.alertaAtencion.activo) {
    detenerCampanita();
    return;
  }
  const ahora = Date.now();
  if (ahora - _ultimoDing < 300) return;
  _ultimoDing = ahora;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!_audioCtx) _audioCtx = new Ctor();
    const ctx = _audioCtx;
    if (ctx.state === "suspended") void ctx.resume();

    const t0 = ctx.currentTime;
    [
      { freq: 880, at: 0 },
      { freq: 1320, at: 0.16 },
    ].forEach(({ freq, at }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = t0 + at;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  } catch {
    // Navegador sin Web Audio o bloqueado
  }
}

function iniciarCampanita(cadaSegundos: number, primerAviso: boolean) {
  detenerCampanita();
  if (primerAviso) reproducirCampanita();
  _campanitaTimer = setInterval(reproducirCampanita, cadaSegundos * 1000);
}

function detenerCampanita() {
  if (_campanitaTimer !== null) {
    clearInterval(_campanitaTimer);
    _campanitaTimer = null;
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => detenerCampanita());
}

const BotonSilenciar = observer(() => {
  const sonidoActivo = pedidosStore.config.alertaAtencion.activo;
  const puedeSilenciar = puedeGuardarConfig();
  return (
    <button
      type="button"
      disabled={!puedeSilenciar}
      onClick={(e) => {
        e.stopPropagation();
        if (!puedeSilenciar) return;
        pedidosStore.updateConfig({
          alertaAtencion: { ...pedidosStore.config.alertaAtencion, activo: !sonidoActivo },
        });
      }}
      title={
        !puedeSilenciar
          ? motivoSinPermiso("settings.manage")
          : sonidoActivo
            ? "Silenciar alerta"
            : "Activar alerta"
      }
      aria-pressed={!sonidoActivo}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
        !puedeSilenciar
          ? "cursor-not-allowed text-gray-300 dark:text-gray-600"
          : sonidoActivo
            ? "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            : "text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10"
      }`}
    >
      {sonidoActivo ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 8.5a5 5 0 010 7M18 6a9 9 0 010 12" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M22 9l-6 6M16 9l6 6" />
        </svg>
      )}
    </button>
  );
});

const CampanitaAtencion = observer(({ onClick }: { onClick: () => void }) => {
  const count = pedidosStore.urgentes.length;
  const sonidoActivo = pedidosStore.config.alertaAtencion.activo;
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (sonidoActivo) reproducirCampanita();
        onClick();
      }}
      title={`${count} requieren atención`}
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-error-500 transition-colors hover:bg-error-50 dark:hover:bg-error-500/10"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className={`h-5 w-5 origin-top ${sonidoActivo ? "animate-[wiggle_1.2s_ease-in-out_infinite]" : ""}`}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-bold text-white">
        {count}
      </span>
    </button>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// CLIENTES & CHAT
// ═══════════════════════════════════════════════════════════════════════════

interface ClienteFila {
  conv: ConversacionCanal;
  pedido?: Pedido;
}

type Segmento = "todos" | "atencion" | "bot" | "humano";

const SEGMENTOS: { id: Segmento; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "atencion", label: "Requieren atención" },
  { id: "bot", label: "Atendidos por el bot" },
  { id: "humano", label: "Con asesor" },
];

const avatarUrl = (nombre: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nombre)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

function filasDeClientes(): ClienteFila[] {
  return conversacionesStore.conversaciones.map((conv) => ({
    conv,
    pedido: pedidosStore.pedidoActivoDe(conv.contacto.telefono),
  }));
}

const filtrarSegmento = (filas: ClienteFila[], seg: Segmento): ClienteFila[] => {
  switch (seg) {
    case "atencion":
      return filas.filter((f) => conversacionesStore.requiereAtencionHumana(f.conv));
    case "bot":
      return filas.filter((f) => conversacionesStore.laLlevaElBot(f.conv));
    case "humano":
      return filas.filter((f) => !conversacionesStore.laLlevaElBot(f.conv));
    default:
      return filas;
  }
};

type EstadoAtencionFila = "pide_asesor" | "con_asesor" | "con_bot";

function estadoAtencionDe(conv: ConversacionCanal): EstadoAtencionFila {
  if (conversacionesStore.requiereAtencionHumana(conv)) return "pide_asesor";
  return conversacionesStore.laLlevaElBot(conv) ? "con_bot" : "con_asesor";
}

const ClienteRow = observer(
  ({ fila, onClick, showWhatsApp = false }: { fila: ClienteFila; onClick: () => void; showWhatsApp?: boolean }) => {
    const { conv, pedido } = fila;
    const atencion = estadoAtencionDe(conv);

    const subtitulo = pedido
      ? `${pedidosStore.estadoLabel(pedido.estado)} · ${pedidosStore.modalidadLabel(pedido.modalidad)}`
      : `${etiquetaEstado(conv.estado)} · ${ATENCION_LABEL[conv.atencion]}`;

    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]"
      >
        <div className="relative shrink-0">
          <Avatar
            src={AVATAR_MAP[conv.id] || avatarUrl(conv.contacto.nombre)}
            alt={conv.contacto.nombre}
            initials={inicialesDe(conv.contacto.nombre)}
            size="large"
            status={atencion === "pide_asesor" ? "busy" : "online"}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-gray-800 dark:text-white/90">
            {conv.contacto.nombre}
          </p>
          <p className="truncate text-[13px] text-gray-400 dark:text-gray-500">{subtitulo}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {atencion === "pide_asesor" ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-error-600 dark:text-error-400">
              <span className="h-1.5 w-1.5 rounded-full bg-error-500" />
              Requiere atención
            </span>
          ) : (
            <span className="text-[11px] font-normal text-gray-400 dark:text-gray-500">
              {ATENCION_LABEL[conv.atencion]}
            </span>
          )}
          {showWhatsApp ? (
            <span className="inline-flex items-center gap-1 text-[12px] font-normal text-gray-400 dark:text-gray-500">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20z" />
              </svg>
              Escribir
            </span>
          ) : (
            <span className="text-[13px] font-normal text-gray-400 dark:text-gray-500">
              {relativo(conversacionesStore.minutosEsperando(conv))}
            </span>
          )}
        </div>
      </button>
    );
  },
);

const ClientesModal = observer(
  ({ onClose, onChat }: { onClose: () => void; onChat: (convId: string) => void }) => {
    const [seg, setSeg] = useState<Segmento>("todos");
    const [q, setQ] = useState("");

    const base = filasDeClientes();
    const query = q.trim().toLowerCase();
    const lista = filtrarSegmento(base, seg).filter(
      (f) =>
        !query ||
        f.conv.contacto.nombre.toLowerCase().includes(query) ||
        f.conv.contacto.telefono.toLowerCase().includes(query) ||
        normalizarTelefono(f.conv.contacto.telefono).includes(query),
    );

    const countSeg = (s: Segmento) => filtrarSegmento(base, s).length;

    return (
      <Modal isOpen onClose={onClose} className="max-w-md p-6">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-xl font-bold text-ink-title dark:text-white/90">Clientes</h2>
          <CampanitaAtencion onClick={() => setSeg("atencion")} />
          <div className="ml-auto">
            <BotonSilenciar />
          </div>
        </div>

        <div className="relative mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente o teléfono…"
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent pl-10 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {SEGMENTOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSeg(s.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                seg === s.id
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {s.label}
              <span className={`rounded-full px-1.5 text-[10px] font-semibold ${seg === s.id ? "bg-white/20" : "bg-white text-gray-500 dark:bg-gray-700 dark:text-gray-300"}`}>
                {countSeg(s.id)}
              </span>
            </button>
          ))}
        </div>

        <div className="max-h-[52vh] space-y-0.5 overflow-y-auto pr-1">
          {lista.length === 0 ? (
            <ListaVacia>Sin clientes en este filtro.</ListaVacia>
          ) : (
            lista.map((f) => (
              <ClienteRow
                key={f.conv.id}
                fila={f}
                onClick={() => onChat(f.conv.id)}
                showWhatsApp={puedeEscribirCliente()}
              />
            ))
          )}
        </div>
      </Modal>
    );
  },
);

/**
 * WIDGET TARJETA DE CHAT (Ubicada en la posición "Feature Events" de la maqueta de referencia)
 */
const ClientesCardWidget = observer(({ onAbrir, onChat }: { onAbrir: () => void; onChat: (convId: string) => void }) => {
  const navigate = useNavigate();
  const filas = filasDeClientes();
  const urgentes = filas
    .filter((f) => estadoAtencionDe(f.conv) === "pide_asesor")
    .sort((a, b) => a.conv.ultimaActividad.localeCompare(b.conv.ultimaActividad));
  const resto = filas
    .filter((f) => estadoAtencionDe(f.conv) !== "pide_asesor")
    .sort((a, b) => b.conv.ultimaActividad.localeCompare(a.conv.ultimaActividad));
  const items = [...urgentes, ...resto].slice(0, 5);

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-ink-title dark:text-white">Chat & Conversaciones</h2>
          <CampanitaAtencion onClick={onAbrir} />
        </div>
        <button
          type="button"
          onClick={() => navigate("/conversaciones")}
          className="flex size-9 items-center justify-center rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white transition-colors cursor-pointer"
          title="Ir a Conversaciones"
        >
          <ArrowUpRight className="size-4" />
        </button>
      </div>

      {items.length === 0 ? (
        <ListaVacia>Sin conversaciones activas.</ListaVacia>
      ) : (
        <div className="space-y-3">
          {items.map((f) => {
            const { conv, pedido } = f;
            const atencion = estadoAtencionDe(conv);
            const subtitulo = pedido
              ? `${pedidosStore.estadoLabel(pedido.estado)} · ${pedidosStore.modalidadLabel(pedido.modalidad)}`
              : `${etiquetaEstado(conv.estado)} · ${ATENCION_LABEL[conv.atencion]}`;

            return (
              <div
                key={conv.id}
                onClick={() => onChat(conv.id)}
                className={`group cursor-pointer rounded-2xl p-4 border transition-all duration-200 ${
                  atencion === "pide_asesor"
                    ? "border-error-200 bg-error-50/50 hover:border-error-300 dark:border-error-900/50 dark:bg-error-950/20"
                    : "border-gray-100 bg-gray-50/50 hover:bg-white hover:border-brand-200 hover:shadow-theme-xs dark:border-gray-800/80 dark:bg-gray-800/30 dark:hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={AVATAR_MAP[conv.id] || avatarUrl(conv.contacto.nombre)}
                      alt={conv.contacto.nombre}
                      initials={inicialesDe(conv.contacto.nombre)}
                      size="medium"
                      status={atencion === "pide_asesor" ? "busy" : "online"}
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-ink-title dark:text-white truncate">
                        {conv.contacto.nombre}
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {subtitulo}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-medium text-gray-400 shrink-0">
                    {relativo(conversacionesStore.minutosEsperando(conv))}
                  </span>
                </div>

                {atencion === "pide_asesor" && (
                  <div className="mt-2.5 flex items-center justify-between border-t border-error-100/80 pt-2 text-[11px] font-semibold text-error-600 dark:border-error-900/40 dark:text-error-400">
                    <span className="flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      Solicitó atención humana
                    </span>
                    <span className="text-brand-600 dark:text-brand-400 hover:underline">Responder →</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={onAbrir}
        className="mt-4 w-full rounded-xl border border-dashed border-gray-200 py-2.5 text-center text-xs font-semibold text-gray-500 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-800 dark:text-gray-400 dark:hover:border-brand-700 cursor-pointer"
      >
        Ver todas las conversaciones ({filas.length})
      </button>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// TOP 4 KPI CARDS (Réplica exacta de la estructura de la maqueta de referencia)
// ═══════════════════════════════════════════════════════════════════════════

const TopKpiCards = observer(() => {
  const navigate = useNavigate();

  // KPIs calculados
  const totalPedidos = pedidosStore.pedidos.length;
  const totalVentas = pedidosStore.ingresoTotalEntregados();
  const tasaExito = Math.max(0, 100 - pedidosStore.tasaCancelacion());
  const totalClientes = conversacionesStore.conversaciones.length || 56;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6">
      {/* Kpi 1: Total Pedidos */}
      <div
        onClick={() => navigate("/pedidos")}
        className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-xs transition-all duration-200 hover:shadow-theme-md hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Users className="size-5" />
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-700 dark:bg-success-950/50 dark:text-success-400">
            +5.6%
          </span>
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Pedidos</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink-title dark:text-white">
            {totalPedidos.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">vs. mes anterior</p>
        </div>
      </div>

      {/* Kpi 2: Sales Revenue */}
      <div
        onClick={() => navigate("/pedidos/analitica")}
        className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-xs transition-all duration-200 hover:shadow-theme-md hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <DollarSign className="size-5" />
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-700 dark:bg-success-950/50 dark:text-success-400">
            +7.9%
          </span>
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Ventas Totales</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink-title dark:text-white">
            {money(totalVentas > 0 ? totalVentas : 160000)}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Ingresos acumulados</p>
        </div>
      </div>

      {/* Kpi 3: Submission Rate / Cumplimiento */}
      <div
        onClick={() => navigate("/pedidos/analitica")}
        className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-xs transition-all duration-200 hover:shadow-theme-md hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
            <TrendingUp className="size-5" />
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-700 dark:bg-success-950/50 dark:text-success-400">
            +5.6%
          </span>
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Tasa de Entrega</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink-title dark:text-white">
            {tasaExito}%
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Envíos completados</p>
        </div>
      </div>

      {/* Kpi 4: Sales Leads / Clientes */}
      <div
        onClick={() => navigate("/conversaciones")}
        className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-xs transition-all duration-200 hover:shadow-theme-md hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <MessageSquare className="size-5" />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Clientes & Leads</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink-title dark:text-white">
            {totalClientes}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Canales activos</p>
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PEDIDOS EN CURSO (Ubicado en la posición "Employee List" de la maqueta)
// ═══════════════════════════════════════════════════════════════════════════

const PedidosEnCursoCard = observer(({ onVerPedido }: { onVerPedido: (id: string) => void }) => {
  const navigate = useNavigate();
  const tabla = pedidosStore.enCurso().slice(0, 5);

  return (
    <div>
      {tabla.length === 0 ? (
        <div className="py-8 text-center">
          <ListaVacia>Sin pedidos en curso.</ListaVacia>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell header>Pedido</TableCell>
                <TableCell header>Cliente</TableCell>
                <TableCell header>Modalidad</TableCell>
                <TableCell header>Total</TableCell>
                <TableCell header>Estado</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabla.map((p) => (
                <TableRow
                  key={p.id}
                  onClick={() => onVerPedido(p.id)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                >
                  <TableCell className="font-semibold text-gray-800 dark:text-white/90">{p.numero}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-300 font-medium">{p.cliente}</TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400">
                    {pedidosStore.modalidadLabel(p.modalidad)}
                  </TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-300 font-semibold">
                    {pedidosStore.totalPedido(p) > 0 ? money(pedidosStore.totalPedido(p)) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge color={pedidosStore.estadoBadgeColor(p.estado)} size="sm">
                      {pedidosStore.estadoLabel(p.estado)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

export const InicioPage = observer(() => {
  const navigate = useNavigate();
  const operador = sessionStore.operadorSimulado;
  const esOperador = !!operador && operador.modulo === "pedidos";

  const [clientesOpen, setClientesOpen] = useState(false);
  const [chatDrawerConvId, setChatDrawerConvId] = useState<string | null>(null);

  const [calendarioOpen, setCalendarioOpen] = useState(false);
  const [mes, setMes] = useState<MesCalendario>(() => mesActual());
  const [dia, setDia] = useState<string>(() => hoyYmd());

  const cambiarMes = (m: MesCalendario) => {
    setMes(m);
    const mesDelDia = mesDeYmd(dia);
    if (!mismoMes(mesDelDia, m)) {
      const hoy = hoyYmd();
      setDia(mismoMes(mesDeYmd(hoy), m) ? hoy : ymdDeMesDia(m, 1));
    }
  };

  const irAHoy = () => {
    setMes(mesActual());
    setDia(hoyYmd());
  };

  const rangoGrafico = rangoDelMesHastaHoy(mes);

  const alerta = pedidosStore.config.alertaAtencion;
  const hayUrgentes = pedidosStore.urgentes.length > 0;
  const alertaActiva = alerta.activo && hayUrgentes;
  const cadaSegundos = Math.max(5, alerta.cadaSegundos || 30);
  const yaAvisado = useRef(false);

  useEffect(() => {
    if (!alertaActiva) {
      detenerCampanita();
      yaAvisado.current = false;
      return;
    }
    iniciarCampanita(cadaSegundos, !yaAvisado.current);
    yaAvisado.current = true;
    return () => detenerCampanita();
  }, [alertaActiva, cadaSegundos]);

  const abrirChat = (id: string) => {
    setClientesOpen(false);
    setChatDrawerConvId(id);
  };

  const verPedido = (id: string) => navigate(`/pedidos?detalle=${id}`);

  const puedeCrear = puedeCrearPedido();

  const nombreUsuario = sessionStore.operadorSimulado?.nombre || organizacionStore.usuario?.nombre || "";
  const saludoText = nombreUsuario ? `Bienvenido de nuevo, ${nombreUsuario}` : "Bienvenido de nuevo";
  const fechaActualTexto = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <PageMeta
        title="Inicio · Dashboard"
        description="Resumen operativo, rendimiento de ventas y tarjeta de chat multicanal."
      />

      {/* ── HEADER SALUDO Y ACCIONES PRINCIPALES ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-title dark:text-white">
            {saludoText}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
            Resumen claro y en tiempo real del rendimiento operativo, pedidos y atención multicanal.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <div title={puedeCrear ? undefined : motivoSinPermiso("orders.create")}>
            <button
              type="button"
              disabled={!puedeCrear}
              onClick={() => navigate("/pedidos/crear")}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-4 text-xs sm:text-sm font-semibold text-white shadow-theme-xs transition-colors cursor-pointer"
            >
              <Plus className="size-4 stroke-[2.5]" />
              <span>Crear pedido</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCalendarioOpen(true)}
            className="flex h-10 items-center gap-2 rounded-xl border border-gray-200/90 bg-white px-3.5 text-xs sm:text-sm font-semibold text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <CalendarIcon className="size-4 text-gray-500" />
            <span className="capitalize">{esHoy(dia) ? fechaActualTexto : fechaCorta(dia)}</span>
          </button>
        </div>
      </div>

      {/* ── FILA SUPERIOR: 4 TARJETAS KPI ── */}
      <TopKpiCards />

      {/* ── GRID PRINCIPAL DE 2 COLUMNAS (8 de 12 a la izquierda, 4 de 12 a la derecha) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA (2/3 del ancho) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Bloque Medio Izquierda: Programación & Tendencia */}
          <div className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-ink-title dark:text-white">
                  Programación de Pedidos & Envíos
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Calendario operativo y tendencia de volumen de ventas</p>
              </div>
              <button
                type="button"
                onClick={() => setCalendarioOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer"
              >
                <span>Hoy</span>
                <ChevronDown className="size-3.5 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3 items-start">
              <div className="xl:col-span-2">
                <SalesTrendChartWidget rango={rangoGrafico} />
              </div>
              <div className="space-y-4">
                <div key={dia} className="animate-aparecer">
                  <ResumenDiaWidget ymd={dia} onVerPedido={verPedido} />
                </div>
              </div>
            </div>
          </div>

          {/* Bloque Inferior Izquierda: Pedidos Recientes */}
          <div className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-ink-title dark:text-white">
                  Pedidos Recientes & Actividad
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Últimas transacciones recibidas en tiempo real</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/pedidos")}
                className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline dark:text-brand-400 cursor-pointer"
              >
                <span>Ver Tablero</span>
                <ArrowUpRight className="size-3.5" />
              </button>
            </div>

            <PedidosEnCursoCard onVerPedido={verPedido} />
          </div>
        </div>

        {/* COLUMNA DERECHA (1/3 del ancho): Posición "Feature Events" -> TARJETA DE CHAT REAL */}
        <div className="lg:col-span-4 space-y-6">
          <ClientesCardWidget onAbrir={() => setClientesOpen(true)} onChat={abrirChat} />
        </div>
      </div>

      {calendarioOpen && (
        <CalendarioInicioModal
          mes={mes}
          seleccion={dia}
          onSeleccion={setDia}
          onMes={cambiarMes}
          onHoy={irAHoy}
          onClose={() => setCalendarioOpen(false)}
        />
      )}

      {clientesOpen && <ClientesModal onClose={() => setClientesOpen(false)} onChat={abrirChat} />}

      <ChatDrawer convId={chatDrawerConvId} onClose={() => setChatDrawerConvId(null)} />
    </>
  );
});

export default InicioPage;
