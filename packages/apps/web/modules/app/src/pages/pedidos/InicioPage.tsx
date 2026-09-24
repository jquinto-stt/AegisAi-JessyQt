import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { Avatar } from "@/elements/ui/avatar";
import { PieChart } from "@/elements/ui/pie-chart";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import { AVATAR_MAP, inicialesDe } from "@/pages/conversaciones/conversaciones.utils";
import {
  pedidosStore,
  sessionStore,
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
import { SECCIONES, seccionesDisponibles } from "./inicio.composicion";

// ═══════════════════════════════════════════════════════════════════════════
// INICIO — agenda, resumen y las secciones del perfil
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Qué cambió, y por qué ─────────────────────────────────────────────────
//
// Esta pantalla tenía un **conmutador de vistas** en la cabecera (ejecutiva /
// atención / preparación / logística) que se ofrecía a quien pudiera gestionar
// equipo. Se retiró: era un control de navegación disfrazado de ajuste, y su
// efecto era esconder tres cuartas partes de la pantalla tras un clic.
//
// En su lugar hay un **calendario**, que cumple un papel distinto: no elige qué
// se pinta, elige QUÉ DÍA se mira. El día seleccionado recorre la página: el
// gráfico de volumen mide el mes que se está viendo y el panel del día enseña
// las filas de la fecha elegida.
//
// ── Retirar el conmutador NO fue «todos ven todo» ─────────────────────────
//
// La primera versión de este cambio apiló las cuatro vistas antiguas en un solo
// flujo **para todo el mundo**, y eso mezcló el trabajo de todos los perfiles.
// Medido con la sonda de perfiles (`outputs/inicio-perfiles-probe.mjs`): el rol
// `vendedor`, que no tiene NINGUNA capacidad `preparation.*`, recibía la cola de
// preparación, su contexto y la hoja de ruta de envíos — cinco bloques que no
// puede operar, en su pantalla de inicio. Los tres perfiles alcanzables veían
// exactamente las mismas doce tarjetas.
//
// La composición correcta está en `inicio.composicion.ts`: **secciones que
// dependen de la capacidad**, sin ningún control que las cambie. Lo que el
// perfil no puede operar no se pinta; lo que sí, se agrupa bajo un rótulo para
// que se lea como secciones y no como una pila.
//
// ── Una sección NO es un permiso ─────────────────────────────────────────
//
// Esto decide QUÉ SE PINTA, nunca QUÉ SE PUEDE HACER. Cada botón de cada widget
// vuelve a preguntar por su capacidad con `puede(...)` y se deshabilita con su
// motivo. Es la misma comprobación en los dos casos: no hay una rama que pueda
// mentir. Un administrador ve las cinco secciones; un `vendedor` ve tres y sigue
// pudiendo crear pedidos, porque tiene `orders.create`.
//
// ── El calendario es estado de la PÁGINA, no del widget ───────────────────
//
// `mes` y `dia` viven aquí porque los consumen tres piezas (el calendario, el
// panel del día y el gráfico). Si los guardara el widget, los otros dos no
// podrían responder a la elección y el calendario sería decorativo.
//
// ═══════════════════════════════════════════════════════════════════════════

// ── Paleta y utilidades locales ────────────────────────────────────────────
// `ORANGE`/`INDIGO`/`CELESTE`/`money`/`relativo` viven en
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

const ClientesCard = observer(({ onAbrir, onChat }: { onAbrir: () => void; onChat: (convId: string) => void }) => {
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
            <ClienteRow key={f.conv.id} fila={f} onClick={() => onChat(f.conv.id)} />
          ))}
        </div>
      )}
    </Card>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUES DE TRABAJO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pedidos en curso: la tabla viva del negocio.
 *
 * NO se filtra por el día del calendario a propósito. «En curso» es un estado
 * presente —lo que está abierto ahora mismo—, y acotarlo a una fecha pasada
 * daría una lista que ya no se puede operar. El día seleccionado manda en el
 * panel del día y en el gráfico, que sí son medidas de un periodo.
 */
const PedidosEnCursoCard = observer(({ onVerPedido }: { onVerPedido: (id: string) => void }) => {
  const navigate = useNavigate();
  const tabla = pedidosStore.enCurso().slice(0, 5);

  return (
    <Card className="p-0 sm:p-0">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-ink-title dark:text-white/90">Pedidos en curso</h3>
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
                  onClick={() => onVerPedido(p.id)}
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
  );
});

/** Distribución del histórico: en curso, entregados y cancelados. */
const DistribucionCard = observer(() => {
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

  return (
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
  );
});

/**
 * Encabezado de sección.
 *
 * Existe para que la pantalla se lea como «las secciones del trabajo de este
 * perfil» y no como una pila de tarjetas sin relación — que es exactamente lo
 * que se veía cuando las cuatro vistas antiguas se apilaron sin agrupar.
 *
 * El rótulo va en gris y en versalitas, como la marca de letra del manual
 * (`#535250`), **no en naranja**: es mobiliario de página, no acento de marca.
 * Y el filete que cierra la línea es el mismo recurso de composición del manual
 * (la columna de etiqueta separada del contenido por un trazo fino).
 */
const Seccion = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <section className="space-y-5">
    <div className="flex items-center gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {titulo}
      </h2>
      <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
    </div>
    {children}
  </section>
);

/** Contexto de la cola: cuánto hay en cada tramo de la preparación. */
const ContextoPreparacionCard = observer(() => (
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
));

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

export const InicioPage = observer(() => {
  const navigate = useNavigate();
  const operador = sessionStore.operadorSimulado;
  const esOperador = !!operador && operador.modulo === "pedidos";

  const [clientesOpen, setClientesOpen] = useState(false);
  const [chatDrawerConvId, setChatDrawerConvId] = useState<string | null>(null);

  // ── Estado del calendario: mes visible y día seleccionado ────────────────
  //
  // El calendario está **guardado**: la pantalla no empieza con un mes entero
  // ocupando el ancho. Se abre desde el botón de la cabecera, que además
  // enseña qué día está elegido — si el control estuviera escondido sin decir
  // sobre qué fecha informa todo lo de abajo, el usuario no tendría forma de
  // saberlo.
  //
  // Arranca en hoy, que es lo que se viene a mirar. No vive en la URL: el día
  // es una posición de lectura, no un destino, y un enlace a «el 3 de
  // septiembre» no es algo que nadie comparta.
  const [calendarioOpen, setCalendarioOpen] = useState(false);
  const [mes, setMes] = useState<MesCalendario>(() => mesActual());
  const [dia, setDia] = useState<string>(() => hoyYmd());

  /**
   * Cambia de mes y **arrastra la selección**.
   *
   * Si el día elegido no está en el mes nuevo, dejarlo seleccionado mostraría
   * un panel de un día que ya no se ve en la rejilla —un número que no
   * corresponde a nada de lo que hay en pantalla—. Se mueve a hoy si hoy cae en
   * el mes destino, y si no, al día 1.
   */
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

  // El gráfico mide el mes que se está viendo, hasta hoy. Ver
  // `rangoDelMesHastaHoy`: un mes en curso no ha terminado, y rellenar de ceros
  // la parte que aún no ha pasado se lee como una caída de ventas.
  const rangoGrafico = rangoDelMesHastaHoy(mes);

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

  // Una sola ruta para «abrir el chat de este cliente», la pidan la tarjeta o
  // el modal. La tarjeta antes llamaba a `onAbrir` (el listado) y el clic en un
  // cliente terminaba en el filtro en vez de en su conversación.
  const abrirChat = (id: string) => {
    setClientesOpen(false);
    setChatDrawerConvId(id);
  };

  /** Abre un pedido en el tablero. Único destino de «ver este pedido». */
  const verPedido = (id: string) => navigate(`/pedidos?detalle=${id}`);

  // ── Composición por capacidad ────────────────────────────────────────────
  //
  // `sessionStore.accessContext` es la única fuente de autorización (contrato
  // §2), y de ahí sale el conjunto con el que se decide qué secciones entran.
  // **No se lee el nombre del rol en ningún sitio**: un rol personalizado
  // funciona el primer día y a un rol al que se le quite una capacidad deja de
  // ofrecérsele la sección sola.
  const capacidades = sessionStore.accessContext.capacidades;
  const disponibles = seccionesDisponibles(capacidades);

  const tituloDe = (id: string) => SECCIONES.find((s) => s.id === id)?.titulo ?? "";

  // La acción primaria de la página. Vive en la cabecera y no en una tarjeta
  // «Acciones»: es la acción del módulo, no la de un bloque concreto. Se
  // deshabilita con el motivo si el perfil no puede crear, en vez de ocultarse
  // — quien atiende necesita saber que la acción existe y por qué no la tiene.
  const puedeCrear = puedeCrearPedido();

  return (
    <>
      <PageMeta
        title="Inicio · Pedidos"
        description="Agenda, resumen del negocio y las secciones de trabajo del perfil."
      />

      {/* Cabecera: saludo + qué es esta pantalla, y las dos acciones de página.
          El conmutador de vistas que vivía aquí a la derecha se retiró; su sitio
          lo ocupan ahora «Crear pedido» y el botón del calendario. */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-ink-title dark:text-white/90">
              {esOperador ? `Hola, ${operador!.nombre}` : "Inicio"}
            </h1>
            <CampanitaAtencion onClick={() => setClientesOpen(true)} />
          </div>
          {/* Decir que la página se compone es información útil, no adorno:
              explica por qué esta pantalla no es igual a la de otro perfil, y
              evita que se lea como «faltan cosas». */}
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Solo aparecen las secciones que tu perfil puede operar. El calendario elige el día que
            informan la agenda y el resumen del día.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div title={puedeCrear ? undefined : motivoSinPermiso("orders.create")}>
            <Button size="sm" disabled={!puedeCrear} onClick={() => navigate("/pedidos/crear")}>
              Crear pedido
            </Button>
          </div>

          {/* El botón ENUNCIA la fecha elegida, no solo la acción de abrir: es
              la única señal de sobre qué día habla la agenda. */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCalendarioOpen(true)}
            startIcon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          >
            <span className="capitalize">{esHoy(dia) ? "Hoy" : fechaCorta(dia)}</span>
          </Button>
        </div>
      </div>

      <div className="space-y-10">
        {/* ── Agenda: el mes que se está mirando y el día elegido ────────── */}
        {disponibles.includes("agenda") && (
          <Seccion titulo={tituloDe("agenda")}>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SalesTrendChartWidget rango={rangoGrafico} />
              </div>
              <div className="space-y-5">
                {/* `key` remonta el panel al cambiar de día: así el fundido de
                    entrada confirma que la elección hizo algo, en vez de
                    sustituir el contenido de golpe sin que se note. */}
                <div key={dia} className="animate-aparecer">
                  <ResumenDiaWidget ymd={dia} onVerPedido={verPedido} />
                </div>
                {/* Los programados son materia de agenda, no de preparación: van
                    con el calendario porque es ahí donde se ven las fechas. Se
                    autodescarta sin `scheduled.read`. */}
                <KpiProgramadosWidget />
              </div>
            </div>
          </Seccion>
        )}

        {/* ── Resumen del negocio: KPIs, curso y distribución ───────────── */}
        {disponibles.includes("resumen") && (
          <Seccion titulo={tituloDe("resumen")}>
            <KpiExecutiveWidget />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <PedidosEnCursoCard onVerPedido={verPedido} />
              </div>
              <DistribucionCard />
            </div>
          </Seccion>
        )}

        {/* ── Atención: lo que espera respuesta y el directorio de clientes ─ */}
        {disponibles.includes("atencion") && (
          <Seccion titulo={tituloDe("atencion")}>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <UrgentChatsWidget max={6} />
              </div>
              <ClientesCard onAbrir={() => setClientesOpen(true)} onChat={abrirChat} />
            </div>
          </Seccion>
        )}

        {/* ── Preparación: la cola y su contexto ─────────────────────────── */}
        {disponibles.includes("preparacion") && (
          <Seccion titulo={tituloDe("preparacion")}>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <PrepQueueWidget columnas={1} />
              </div>
              <ContextoPreparacionCard />
            </div>
          </Seccion>
        )}

        {/* ── Logística: la hoja de ruta, a todo el ancho ─────────────────── */}
        {disponibles.includes("logistica") && (
          <Seccion titulo={tituloDe("logistica")}>
            <LogisticsDeliveryWidget />
          </Seccion>
        )}
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
