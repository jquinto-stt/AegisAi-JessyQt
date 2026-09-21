import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { Avatar } from "@/elements/ui/avatar";
import { LineChart } from "@/elements/ui/line-chart";
import { PieChart } from "@/elements/ui/pie-chart";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import { AVATAR_MAP, inicialesDe } from "@/pages/conversaciones/conversaciones.utils";
import {
  pedidosStore,
  sessionStore,
  conversacionesStore,
  normalizarTelefono,
  ESTADO_CONVERSACION_LABEL,
  ATENCION_LABEL,
  puedeEscribirCliente,
  puedeCrearPedido,
  puedeGestionarEquipo,
  motivoSinPermiso,
  puedeGuardarConfig,
} from "@/stores";
import type { Pedido } from "@/stores/pedidos.store";
import type { ConversacionCanal } from "@/stores";
import type { ApexOptions } from "apexcharts";
import { ChatDrawer } from "@/pages/conversaciones/components/ChatDrawer";
import { SinDatos } from "./SinDatos";
import {
  ORANGE,
  INDIGO,
  CELESTE,
  money,
  relativo,
  CabeceraWidget,
  ListaVacia,
} from "./widgets";
import {
  KpiExecutiveWidget,
  KpiProgramadosWidget,
  SalesTrendChartWidget,
  UrgentChatsWidget,
  PrepQueueWidget,
  LogisticsDeliveryWidget,
} from "./widgets";
import {
  VISTA_META,
  esVistaInicio,
  hayMasDeUnaVista,
  vistaPorDefecto,
  vistasDisponibles,
  type VistaInicio,
} from "./inicio.vistas";

// ═══════════════════════════════════════════════════════════════════════════
// INICIO — panel adaptativo por rol
// ═══════════════════════════════════════════════════════════════════════════
//
// La pantalla deja de ser un panel único y pasa a ofrecer CUATRO vistas. Cuál se
// pinta se decide en `inicio.vistas.ts`, y la regla es una sola: **por capacidad,
// nunca por nombre de rol**. Ese archivo explica por qué; aquí se aplica.
//
// ── La vista NO es un permiso ─────────────────────────────────────────────
//
// El conmutador cambia QUÉ SE PINTA. Nada más. Cada botón de cada widget vuelve
// a preguntar por su capacidad con `puede(...)`. Un administrador que abre la
// vista de preparación ve la cola de trabajo y, como tiene `preparation.manage`,
// puede operarla; quien no la tenga verá el botón apagado con el motivo. Es la
// misma comprobación en los dos casos: no hay una rama que pueda mentir.
//
// ── El conmutador exige `team.manage` ─────────────────────────────────────
//
// Es la compuerta que pide la especificación, y se combina con una segunda
// condición —que haya más de una vista— porque un botón que abre una lista de
// un solo elemento no es un control. Quien no puede gestionar equipo entra
// directo a la vista de su rol, sin conmutador: la pantalla se adapta sola, que
// es el objetivo de todo esto.
//
// ═══════════════════════════════════════════════════════════════════════════

// ── Paleta y utilidades locales ────────────────────────────────────────────
// `ORANGE`/`INDIGO`/`CELESTE`/`money`/`relativo` viven ahora en
// `widgets/widgets.comunes` y se importan, para que la serie del gráfico y la
// del KPI no puedan divergir de color.

// ═══════════════════════════════════════════════════════════════════════════
// CAMPANITA DE ATENCIÓN (Web Audio, sin archivos)
// ═══════════════════════════════════════════════════════════════════════════
//
// El código de la campanita se conserva tal cual. Tiene dos decisiones que ya
// costaron trabajo y que no se deben perder en una reescritura:
//
//   · Un ÚNICO temporizador global, con candado anti-solape: sin él, un clic
//     sobre un tick del temporizador producía un triple ding.
//   · Si el usuario silenció la alerta, no suena NADA aunque quedara un
//     temporizador huérfano (p. ej. tras un HMR en desarrollo).

let _audioCtx: AudioContext | null = null;
let _ultimoDing = 0;
let _campanitaTimer: ReturnType<typeof setInterval> | null = null;

/** Reproduce UN doble "ding" suave tipo campanita. Falla en silencio. */
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
    // Navegador sin Web Audio o bloqueado: no pasa nada.
  }
}

/** Arranca (o reprograma) el ÚNICO temporizador global de la campanita. */
function iniciarCampanita(cadaSegundos: number, primerAviso: boolean) {
  detenerCampanita();
  if (primerAviso) reproducirCampanita();
  _campanitaTimer = setInterval(reproducirCampanita, cadaSegundos * 1000);
}

/** Detiene el temporizador global de la campanita (si estaba activo). */
function detenerCampanita() {
  if (_campanitaTimer !== null) {
    clearInterval(_campanitaTimer);
    _campanitaTimer = null;
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => detenerCampanita());
}

/**
 * Botón de altavoz para silenciar / reactivar la campanita.
 *
 * Escribe en la configuración del módulo, así que exige `settings.manage`. Se
 * muestra deshabilitado en vez de oculto —es un control de cabecera, y ocultarlo
 * haría pensar que la alerta no se puede silenciar nunca— con el motivo en el
 * `title`.
 */
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

/** Campanita que se balancea y muestra el conteo. No aparece si no hay urgencias. */
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
// CLIENTES — tarjeta + modal con buscador y segmentos
// ═══════════════════════════════════════════════════════════════════════════
//
// FUENTE DE VERDAD: `conversacionesStore`, NO `pedidosStore`. Una fila es un
// CLIENTE-EN-UN-CANAL, y esa entidad vive en el módulo Conversaciones. El cruce
// con Pedidos es por teléfono normalizado y es SOLO de lectura.

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
      : `${ESTADO_CONVERSACION_LABEL[conv.estado]} · ${ATENCION_LABEL[conv.atencion]}`;

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

const ClientesCard = observer(({ onAbrir }: { onAbrir: () => void }) => {
  const filas = filasDeClientes();
  const urgentes = filas
    .filter((f) => estadoAtencionDe(f.conv) === "pide_asesor")
    .sort((a, b) => a.conv.ultimaActividad.localeCompare(b.conv.ultimaActividad));
  const resto = filas
    .filter((f) => estadoAtencionDe(f.conv) !== "pide_asesor")
    .sort((a, b) => b.conv.ultimaActividad.localeCompare(a.conv.ultimaActividad));
  const items = [...urgentes, ...resto].slice(0, 5);

  return (
    <Card className="p-5">
      <CabeceraWidget
        titulo="Clientes"
        extra={
          <div className="flex items-center gap-1">
            <CampanitaAtencion onClick={onAbrir} />
            <BotonSilenciar />
          </div>
        }
        accion="Ver todos"
        onAccion={onAbrir}
      />
      {items.length === 0 ? (
        <ListaVacia>Sin conversaciones todavía.</ListaVacia>
      ) : (
        <div className="space-y-1">
          {items.map((f) => (
            <ClienteRow key={f.conv.id} fila={f} onClick={onAbrir} />
          ))}
        </div>
      )}
    </Card>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// CONMUTADOR DE VISTA (cabecera)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Selector de vista. Solo se pinta con `team.manage` Y más de una vista.
 *
 * No es un `Select` del catálogo sino un grupo de píldoras: son cuatro opciones
 * visibles a la vez y verlas todas es justamente lo que enseña que la pantalla
 * tiene varias caras. Un desplegable las escondería.
 */
const ConmutadorVista = observer(
  ({
    actual,
    disponibles,
    onElegir,
  }: {
    actual: VistaInicio;
    disponibles: VistaInicio[];
    onElegir: (v: VistaInicio) => void;
  }) => (
    <div
      role="group"
      aria-label="Vista del panel"
      className="inline-flex flex-wrap rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800"
    >
      {disponibles.map((v) => {
        const activa = v === actual;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={activa}
            onClick={() => onElegir(v)}
            className={
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
              (activa
                ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200")
            }
          >
            {VISTA_META[v].label}
          </button>
        );
      })}
    </div>
  ),
);

// ═══════════════════════════════════════════════════════════════════════════
// PANELES POR VISTA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Vista ejecutiva: KPIs, tendencia, distribución y la tabla de trabajo vivo.
 *
 * Es la vista más ancha, así que conserva lo que ya hacía la pantalla: el gráfico
 * de tendencia, el donut de distribución y la tabla de pedidos en curso, que
 * son la materia prima de un resumen.
 */
const PanelEjecutiva = observer(
  ({ onAbrirClientes }: { onAbrirClientes: () => void }) => {
    const navigate = useNavigate();

    const entregados = pedidosStore.historial.filter((p) => p.estado === "entregado").length;
    const enCurso = pedidosStore.totalEnCurso;
    const cancelados = pedidosStore.historial.filter((p) => p.estado === "cancelado").length;
    const total = enCurso + entregados + cancelados;

    const donutOptions: ApexOptions = {
      colors: [INDIGO, ORANGE, CELESTE],
      labels: ["En curso", "Entregados", "Cancelados"],
      chart: { fontFamily: "DM Sans, sans-serif" },
      stroke: { show: false },
      legend: { position: "bottom", horizontalAlign: "center" },
      plotOptions: {
        pie: {
          donut: {
            size: "65%",
            labels: {
              show: true,
              total: { show: true, label: "Total", formatter: () => String(total) },
            },
          },
        },
      },
      dataLabels: { enabled: false },
    };

    const tabla = pedidosStore.enCurso().slice(0, 5);

    return (
      <div className="space-y-6">
        <KpiExecutiveWidget />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SalesTrendChartWidget />
          </div>
          <ClientesCard onAbrir={onAbrirClientes} />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="p-0 sm:p-0 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-ink-title dark:text-white/90">
                Pedidos en curso
              </h3>
              <button
                type="button"
                onClick={() => navigate("/pedidos")}
                aria-label="Ver el tablero"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16m0 0l-6-6m6 6l-6 6" />
                </svg>
              </button>
            </div>
            {tabla.length === 0 ? (
              <div className="px-5 py-8">
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
                        onClick={() => navigate(`/pedidos?detalle=${p.id}`)}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                      >
                        <TableCell className="font-medium text-gray-800 dark:text-white/90">{p.numero}</TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400">{p.cliente}</TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400">
                          {pedidosStore.modalidadLabel(p.modalidad)}
                        </TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400">
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
          </Card>

          <Card>
            <CabeceraWidget titulo="Distribución" />
            <div className="mt-2 flex justify-center">
              {total === 0 ? (
                <div className="w-full">
                  <SinDatos que="pedidos" alto={300} />
                </div>
              ) : (
                <PieChart series={[enCurso, entregados, cancelados]} options={donutOptions} height={300} />
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  },
);

/**
 * Vista de atención: lo urgente primero, más el atajo a crear pedido.
 *
 * El botón de crear va aquí y no en la cabecera general porque es la acción
 * propia de este puesto: quien atiende es quien abre órdenes a mano.
 */
const PanelVentas = observer(
  ({ onAbrirClientes }: { onAbrirClientes: () => void }) => {
    const navigate = useNavigate();
    const puedeCrear = puedeCrearPedido();

    const hoyYmd = new Date().toISOString().slice(0, 10);
    const creadosHoy = pedidosStore.pedidos.filter((p) => p.createdAt.slice(0, 10) === hoyYmd).length;
    const urgentes = pedidosStore.urgentes.length;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <UrgentChatsWidget max={6} />
          </div>

          <div className="space-y-5">
            {/* Atajo a crear pedido. Se deshabilita con el motivo si el rol no
                puede, en vez de ocultarse: quien atiende necesita saber que la
                acción existe y por qué no la tiene. */}
            <Card>
              <CabeceraWidget titulo="Acciones" />
              <div title={puedeCrear ? undefined : motivoSinPermiso("orders.create")}>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!puedeCrear}
                  onClick={() => navigate("/pedidos/crear")}
                >
                  Crear pedido
                </Button>
              </div>
              <button
                type="button"
                onClick={onAbrirClientes}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-white/[0.03]"
              >
                Ver todos los clientes
              </button>
            </Card>

            <Card>
              <CabeceraWidget titulo="Hoy" />
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Órdenes creadas</span>
                  <span className="text-xl font-semibold tabular-nums text-gray-800 dark:text-white/90">
                    {creadosHoy}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Sin responder</span>
                  <span
                    className={
                      "text-xl font-semibold tabular-nums " +
                      (urgentes > 0
                        ? "text-error-600 dark:text-error-400"
                        : "text-gray-800 dark:text-white/90")
                    }
                  >
                    {urgentes}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <ClientesCard onAbrir={onAbrirClientes} />
      </div>
    );
  },
);

/**
 * Vista de preparación: la cola manda, y ocupa todo el ancho.
 *
 * La cola va a una columna (tarjetas grandes, que es lo que se lee de lejos en
 * una cocina) y los KPI de contexto al lado. En móvil se apila.
 */
const PanelPreparacion = observer(() => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <PrepQueueWidget columnas={1} />
      </div>
      <div className="space-y-5">
        <KpiProgramadosWidget />
        <Card>
          <CabeceraWidget titulo="Contexto" />
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">En preparación</span>
              <span className="text-xl font-semibold tabular-nums text-gray-800 dark:text-white/90">
                {pedidosStore.pedidos.filter((p) => p.estado === "en_preparacion").length}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Listos para salir</span>
              <span className="text-xl font-semibold tabular-nums text-gray-800 dark:text-white/90">
                {pedidosStore.pedidos.filter((p) => p.estado === "listo").length}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Confirmados en espera</span>
              <span className="text-xl font-semibold tabular-nums text-gray-800 dark:text-white/90">
                {pedidosStore.pedidos.filter((p) => p.estado === "confirmado").length}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
));

/**
 * Vista logística: la hoja de ruta y el recaudo.
 *
 * Se reutiliza la cola de preparación en su forma de dos columnas para que quien
 * reparte vea también lo que va a salir, que es lo que necesita para planificar
 * el viaje.
 */
const PanelLogistica = observer(() => (
  <div className="space-y-6">
    <LogisticsDeliveryWidget />
    <PrepQueueWidget columnas={2} />
  </div>
));

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

export const InicioPage = observer(() => {
  const operador = sessionStore.operadorSimulado;
  const esOperador = !!operador && operador.modulo === "pedidos";

  const [clientesOpen, setClientesOpen] = useState(false);
  const [chatDrawerConvId, setChatDrawerConvId] = useState<string | null>(null);

  // ── Vista derivada de las capacidades REALES de la sesión ────────────────
  //
  // `sessionStore.hasPermission` es la única fuente de autorización (contrato
  // §2), y de ahí sale el conjunto con el que se decide la vista. No se lee el
  // nombre del rol en ningún sitio.
  const capacidades = sessionStore.accessContext.capacidades;
  const permitidas = vistasDisponibles(capacidades);
  const porDefecto = vistaPorDefecto(capacidades);

  // La vista elegida vive en la URL: así un enlace puede apuntar a una vista
  // concreta, y `?vista=` sobrevive a una recarga. El valor lo escribe el
  // usuario, así que un invento NO puede dejar la pantalla en blanco: se cae a
  // la de por defecto. Y solo se acepta si además ESTÁ PERMITIDA — un
  // `?vista=preparacion` a mano no puede abrir una vista que el rol no tiene.
  const [searchParams, setSearchParams] = useSearchParams();
  const pedida = searchParams.get("vista");
  const vista: VistaInicio =
    esVistaInicio(pedida) && permitidas.includes(pedida) ? pedida : porDefecto;

  const elegirVista = (v: VistaInicio) => {
    const next = new URLSearchParams(searchParams);
    next.set("vista", v);
    setSearchParams(next, { replace: true });
  };

  // El conmutador exige `team.manage` (compuerta de la especificación) Y que
  // haya algo que conmutar. Sin lo segundo, un botón abriría una lista de uno.
  const mostrarConmutador = puedeGestionarEquipo() && hayMasDeUnaVista(capacidades);

  // ── Alerta sonora recurrente ─────────────────────────────────────────────
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

  const meta = VISTA_META[vista];

  return (
    <>
      <PageMeta
        title={`Inicio · Pedidos`}
        description={`${meta.titulo} — ${meta.hint}`}
      />

      {/* Cabecera: saludo + título de la vista, y el conmutador a la derecha. */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-ink-title dark:text-white/90">
              {esOperador ? `Hola, ${operador!.nombre}` : meta.titulo}
            </h1>
            <CampanitaAtencion onClick={() => setClientesOpen(true)} />
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {esOperador ? `${meta.titulo} · ${meta.hint}` : meta.hint}
          </p>
        </div>

        {mostrarConmutador && (
          <div className="shrink-0">
            <ConmutadorVista actual={vista} disponibles={permitidas} onElegir={elegirVista} />
          </div>
        )}
      </div>

      {/* El panel remonta al cambiar de vista: `key` fuerza el fundido de
          entrada en vez de sustituir los nodos de golpe. */}
      <div key={vista} className="animate-aparecer">
        {vista === "ejecutiva" && <PanelEjecutiva onAbrirClientes={() => setClientesOpen(true)} />}
        {vista === "ventas" && <PanelVentas onAbrirClientes={() => setClientesOpen(true)} />}
        {vista === "preparacion" && <PanelPreparacion />}
        {vista === "logistica" && <PanelLogistica />}
      </div>

      {clientesOpen && (
        <ClientesModal
          onClose={() => setClientesOpen(false)}
          onChat={(id) => {
            setClientesOpen(false);
            setChatDrawerConvId(id);
          }}
        />
      )}

      <ChatDrawer convId={chatDrawerConvId} onClose={() => setChatDrawerConvId(null)} />
    </>
  );
});

export default InicioPage;
