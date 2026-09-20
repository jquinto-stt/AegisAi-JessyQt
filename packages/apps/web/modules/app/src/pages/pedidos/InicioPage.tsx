import { useState, useEffect, useRef } from "react";
import type { ApexOptions } from "apexcharts";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { DatePicker } from "@/elements/form/date-picker";
import { LineChart } from "@/elements/ui/line-chart";
import { PieChart } from "@/elements/ui/pie-chart";
import { retardoEscalonado } from "@/utils";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import { Avatar } from "@/elements/ui/avatar";
import { AVATAR_MAP, inicialesDe } from "@/pages/conversaciones/conversaciones.utils";
import {
  pedidosStore,
  sessionStore,
  conversacionesStore,
  normalizarTelefono,
  ESTADO_CONVERSACION_LABEL,
  ATENCION_LABEL,
  puedeGuardarConfig,
  puedeEscribirCliente,
  motivoSinPermiso,
} from "@/stores";
import type { Pedido } from "@/stores/pedidos.store";
import type { ConversacionCanal } from "@/stores";
import { ChatDrawer } from "@/pages/conversaciones/components/ChatDrawer";
import { SinDatos } from "./SinDatos";

// ═══════════════════════════════════════════════════════════════════════════
// PALETA
// ═══════════════════════════════════════════════════════════════════════════

// Paleta oficial NECTO.
const ORANGE = "#FF3F1A";
const INDIGO = "#190088";
const CELESTE = "#97D6DF";
const money = (n: number) => `$${n.toLocaleString("es-CO")}`;

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const WhatsAppIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20z" />
  </svg>
);

// ── Campanita de alerta (Web Audio, sin archivos) ──────────────────────────
let _audioCtx: AudioContext | null = null;
let _ultimoDing = 0; // marca de tiempo del último toque, para evitar solapes
let _campanitaTimer: ReturnType<typeof setInterval> | null = null; // único timer global

/**
 * Reproduce UN doble "ding" suave tipo campanita. Falla en silencio.
 * Tiene un candado anti-solape: si ya sonó hace < 300 ms, ignora la llamada
 * (evita el "triple" cuando un clic cae encima de un tick del temporizador o
 * cuando React StrictMode monta el efecto dos veces en desarrollo).
 */
function reproducirCampanita() {
  // Candado de seguridad: si el usuario silenció la alerta, no suena NADA,
  // aunque quedara algún temporizador huérfano (p. ej. tras un HMR en dev).
  if (!pedidosStore.config.alertaAtencion.activo) {
    detenerCampanita();
    return;
  }
  const ahora = Date.now();
  if (ahora - _ultimoDing < 300) return;
  _ultimoDing = ahora;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!_audioCtx) _audioCtx = new Ctor();
    const ctx = _audioCtx;
    if (ctx.state === "suspended") void ctx.resume();

    const t0 = ctx.currentTime;
    // Dos tonos (campanita): 880 Hz y 1320 Hz, cortos y con decaimiento.
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

/**
 * Arranca (o reprograma) el ÚNICO temporizador global de la campanita. Siempre
 * limpia el anterior antes de crear uno nuevo, así nunca hay dos intervalos
 * sonando a la vez aunque el efecto se monte varias veces.
 */
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

// En desarrollo, al recargar este módulo (HMR) limpia el temporizador anterior
// para que no queden intervalos huérfanos sonando en segundo plano.
if (import.meta.hot) {
  import.meta.hot.dispose(() => detenerCampanita());
}

/**
 * Botón de altavoz para silenciar / reactivar la campanita de "requieren
 * atención". Refleja y persiste el estado en la config del módulo.
 *
 * **Autorización (Fase 2).** Escribe en la configuración del módulo
 * (`updateConfig`), así que exige `settings.manage`. Se muestra deshabilitado
 * en vez de oculto —es un control de cabecera, y ocultarlo haría pensar que la
 * alerta no se puede silenciar nunca— con el motivo en el `title`.
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
        // Altavoz con ondas (sonido activo)
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 8.5a5 5 0 010 7M18 6a9 9 0 010 12" />
        </svg>
      ) : (
        // Altavoz tachado (silenciado)
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M22 9l-6 6M16 9l6 6" />
        </svg>
      )}
    </button>
  );
});

/**
 * Campanita de "requieren atención": se balancea para llamar la atención
 * (solo si el sonido está activo) y muestra un badge con el conteo. No aparece
 * cuando no hay clientes urgentes. Al pulsarla ejecuta `onClick`.
 */
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
// 1) KPI CARD (valor grande + cambio "+X")
// ═══════════════════════════════════════════════════════════════════════════

const KpiCard = ({
  titulo,
  valor,
  cambio,
  positivo = true,
  icon,
  retardo,
  onClick,
}: {
  titulo: string;
  valor: string;
  cambio: string;
  positivo?: boolean;
  icon: React.ReactNode;
  /** `animationDelay` ya formateado. Ver `retardoEscalonado` en `@/utils`. */
  retardo?: string;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    style={{ animationDelay: retardo }}
    className="animate-entrada-lista block h-full w-full text-left"
    disabled={!onClick}
  >
    <Card className={"h-full " + (onClick ? "transition-all hover:border-brand-300 hover:shadow-2xs dark:hover:border-brand-700" : "")}>
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{titulo}</p>
        <span className="text-gray-300 dark:text-gray-600">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-800 dark:text-white/90">{valor}</p>
      {/* Delta en neutro: con 4 KPIs seguidos, verde/rojo saturado era ruido.
          La dirección la dan la flecha y el signo (+/-). */}
      <p className="mt-1.5 flex items-center gap-1 text-xs font-normal text-gray-500 dark:text-gray-400">
        {cambio}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
          {positivo ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H9m8 0v8" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l10 10M17 17H9m8 0V9" />
          )}
        </svg>
      </p>
    </Card>
  </button>
);

// ═══════════════════════════════════════════════════════════════════════════
// CLIENTES — tarjeta (lista tipo chats) + modal con buscador y segmentos
// ═══════════════════════════════════════════════════════════════════════════
//
// FUENTE DE VERDAD: `conversacionesStore`, NO `pedidosStore`.
//
// Una fila de esta tarjeta es un CLIENTE-EN-UN-CANAL, y esa entidad vive en el
// módulo Conversaciones. Antes se construía desde `pedidosStore.enCurso()`, lo
// que producía dos defectos encadenados: (1) el cliente que de verdad estaba
// esperando a un asesor no aparecía, porque su pedido podía no estar en curso, y
// (2) los rótulos de estado hablaban de pedidos ("En preparación · En sitio") en
// una tarjeta titulada "Clientes". Leer el hilo es leer la entidad correcta.
//
// El cruce con Pedidos se hace por teléfono normalizado vía `porTelefono`, y es
// SOLO de lectura: sirve para mostrar el pedido vivo del contacto y para ofrecer
// el atajo al Tablero. Conversaciones no conoce a Pedidos (invariante D2).

/** Identidad de una fila: el hilo + el pedido vivo de ese contacto, si lo hay. */
interface ClienteFila {
  conv: ConversacionCanal;
  /** Pedido activo del mismo teléfono (solo lectura). `undefined` si no hay. */
  pedido?: Pedido;
}

type Segmento = "todos" | "atencion" | "bot" | "humano";

const SEGMENTOS: { id: Segmento; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "atencion", label: "Requieren atención" },
  { id: "bot", label: "Atendidos por el bot" },
  { id: "humano", label: "Con asesor" },
];

/**
 * URL de avatar generado (fallback): DiceBear crea una ilustración si no hay foto en el mapa.
 */
const avatarUrl = (nombre: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nombre)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

/**
 * Filas de la tarjeta: todos los hilos con su pedido vivo resuelto.
 *
 * El pedido se busca por teléfono normalizado con el resolutor canónico de
 * Pedidos (`pedidoActivoDe`), que ya ignora los terminales. Un hilo sin pedido
 * es un caso legítimo y frecuente (el cliente escribe sin haber pedido), así que
 * `pedido` es opcional y la fila se adapta; NO se inventa un pedido ni se oculta
 * al cliente por no tenerlo.
 */
function filasDeClientes(): ClienteFila[] {
  return conversacionesStore.conversaciones.map((conv) => ({
    conv,
    pedido: pedidosStore.pedidoActivoDe(conv.contacto.telefono),
  }));
}

/** Aplica el segmento sobre las filas. Todos los ejes salen del hilo. */
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

/**
 * Tiempo relativo legible: "15 min", "2 h", "3 d".
 * Acepta minutos ya calculados por el store (nunca deriva por su cuenta).
 */
const relativo = (min: number) => {
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} d`;
};

/**
 * Estado de atención de la fila, en orden de prioridad. Es la etiqueta que
 * responde a la pregunta del negocio: "¿este cliente necesita algo de mí?".
 *
 * Tres casos, mutuamente excluyentes y exhaustivos:
 *  1. `en_espera` → el cliente PIDIÓ un asesor y nadie lo ha tomado. Es la
 *     urgencia real y la única que se colorea.
 *  2. lo lleva un asesor → ya hay alguien atendiéndolo.
 *  3. lo lleva el bot → nadie tiene que intervenir.
 *
 * El caso 1 NO se infiere de `noLeidos` ni de la antigüedad: solo de haber
 * pedido el humano. Ver `ConversacionesStore.requiereAtencionHumana`.
 */
type EstadoAtencionFila = "pide_asesor" | "con_asesor" | "con_bot";

function estadoAtencionDe(conv: ConversacionCanal): EstadoAtencionFila {
  if (conversacionesStore.requiereAtencionHumana(conv)) return "pide_asesor";
  return conversacionesStore.laLlevaElBot(conv) ? "con_bot" : "con_asesor";
}

/**
 * Fila de cliente estilo "Chats" (referencia): avatar redondo con punto de
 * estado, nombre en negrita, subtítulo con el pedido vivo (si lo hay), y a la
 * derecha el estado de ATENCIÓN con su tiempo de espera.
 */
const ClienteRow = observer(
  ({ fila, onClick, showWhatsApp = false }: { fila: ClienteFila; onClick: () => void; showWhatsApp?: boolean }) => {
  const { conv, pedido } = fila;
  const atencion = estadoAtencionDe(conv);

  // El subtítulo describe el PEDIDO cuando existe (es el contexto útil para
  // atender) y cae al estado del hilo cuando no. Nunca mezcla los dos: un
  // "Nuevo · Domicilio" pegado a un hilo cerrado sería una contradicción.
  const subtitulo = pedido
    ? `${pedidosStore.estadoLabel(pedido.estado)} · ${pedidosStore.modalidadLabel(pedido.modalidad)}`
    : `${ESTADO_CONVERSACION_LABEL[conv.estado]} · ${ATENCION_LABEL[conv.atencion]}`;

  return (
    <button
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
        <p className="truncate text-[15px] font-semibold text-gray-800 dark:text-white/90">{conv.contacto.nombre}</p>
        <p className="truncate text-[13px] text-gray-400 dark:text-gray-500">{subtitulo}</p>
      </div>
      {/* Una sola etiqueta de ESTADO DE ATENCIÓN; el resto pasa a texto muted.
          Solo "pide asesor" se colorea: es la única que exige una acción. */}
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
            <WhatsAppIcon className="h-3.5 w-3.5" />
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
      // El teléfono se busca sobre el valor normalizado Y el crudo: el usuario
      // teclea con espacios ("300 555 1122") tanto como sin ellos.
      f.conv.contacto.telefono.toLowerCase().includes(query) ||
      normalizarTelefono(f.conv.contacto.telefono).includes(query),
  );

  const countSeg = (s: Segmento) => filtrarSegmento(base, s).length;

  return (
    <Modal isOpen onClose={onClose} className="max-w-md p-6">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Clientes</h2>
        {/* Campanita animada: filtra a "requieren atención" al pulsarla */}
        <CampanitaAtencion onClick={() => setSeg("atencion")} />

        {/* Altavoz: silencia / reactiva la campanita (persistido en config) */}
        <div className="ml-auto">
          <BotonSilenciar />
        </div>
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400">
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

      {/* Segmentos */}
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

      {/* Lista */}
      <div className="max-h-[52vh] space-y-0.5 overflow-y-auto pr-1">
        {lista.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">Sin clientes en este filtro.</p>
        ) : (
          lista.map((f) => (
            <ClienteRow
              key={f.conv.id}
              fila={f}
              onClick={() => onChat(f.conv.id)}
              // Escribir al cliente es una acción de canal: `channels.read`.
              showWhatsApp={puedeEscribirCliente()}
            />
          ))
        )}
      </div>
    </Modal>
  );
});

const ClientesCard = observer(({ onAbrir }: { onAbrir: () => void }) => {
  // Orden: primero quien espera un asesor (más tiempo esperando, arriba),
  // después el resto por actividad reciente. Así la tarjeta abre por lo urgente
  // en lugar de depender del orden de inserción del seed.
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
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Clientes</h3>
        <div className="flex items-center gap-1">
          {/* Campanita animada: llama la atención y abre el modal al pulsarla */}
          <CampanitaAtencion onClick={onAbrir} />
          {/* Altavoz: silencia / reactiva la campanita de atención */}
          <BotonSilenciar />
          <button
            onClick={onAbrir}
            aria-label="Ver todos"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
            </svg>
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Sin conversaciones todavía.</p>
      ) : (
        <div className="space-y-1">
          {items.map((f) => <ClienteRow key={f.conv.id} fila={f} onClick={onAbrir} />)}
        </div>
      )}
    </Card>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// MODAL DE CALENDARIO — rango de fechas para el gráfico
// ═══════════════════════════════════════════════════════════════════════════

const RangoCalendarioModal = ({
  onClose,
  onAplicar,
}: {
  onClose: () => void;
  onAplicar: (desde: string, hasta: string) => void;
}) => {
  const [sel, setSel] = useState<string[]>([]);

  const ymd = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  // Aplica: 1 día = ese día (desde=hasta); 2 días = rango.
  const aplicar = () => {
    if (sel.length === 0) return;
    if (sel.length === 1) {
      onAplicar(sel[0], sel[0]);
      return;
    }
    const [a, b] = sel[0] <= sel[1] ? [sel[0], sel[1]] : [sel[1], sel[0]];
    onAplicar(a, b);
  };

  // Atajos rápidos.
  const hoy = new Date();
  const menos = (n: number) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - n);
    return d;
  };
  const atajos: { label: string; desde: string; hasta: string }[] = [
    { label: "Hoy", desde: ymd(hoy), hasta: ymd(hoy) },
    { label: "Ayer", desde: ymd(menos(1)), hasta: ymd(menos(1)) },
    { label: "Últimos 7 días", desde: ymd(menos(6)), hasta: ymd(hoy) },
    { label: "Últimos 30 días", desde: ymd(menos(29)), hasta: ymd(hoy) },
  ];

  return (
    <Modal isOpen onClose={onClose} className="max-w-md p-6">
      <h2 className="mb-1 text-xl font-bold text-gray-800 dark:text-white/90">Elegir periodo</h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Elige un día o un rango. Un solo día muestra ese día.
      </p>

      {/* Atajos */}
      <div className="mb-4 flex flex-wrap gap-2">
        {atajos.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => onAplicar(a.desde, a.hasta)}
            className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-brand-500/10"
          >
            {a.label}
          </button>
        ))}
      </div>

      <DatePicker
        id="rango-grafico"
        mode="range"
        placeholder="Elige un día o un rango"
        onChange={(dates) => setSel((dates as Date[]).map(ymd))}
      />

      <div className="mt-5 flex items-center justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button size="sm" disabled={sel.length === 0} onClick={aplicar}>Aplicar</Button>
      </div>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

export const InicioPage = observer(() => {
  const navigate = useNavigate();
  const operador = sessionStore.operadorSimulado;
  const esOperador = !!operador && operador.modulo === "pedidos";

  const [periodo, setPeriodo] = useState("Hoy");
  const [periodoOpen, setPeriodoOpen] = useState(false);
  const [clientesOpen, setClientesOpen] = useState(false);
  // Chat rápido (slide-over). Guarda el id de la CONVERSACIÓN, no el del pedido:
  // la tarjeta "Clientes" lista clientes-en-un-canal, así que un cliente sin
  // pedido también puede abrirse. `ChatDrawer` sigue aceptando un `pedido` para
  // las demás superficies, pero aquí la fila ya ES un hilo.
  const [chatDrawerConvId, setChatDrawerConvId] = useState<string | null>(null);
  const PERIODOS = ["Hoy", "Esta semana", "Semana pasada", "Este mes", "Últimos 3 meses"];

  // ── Alerta sonora recurrente: campanita mientras haya clientes que
  // requieren atención. La recurrencia se calibra en Configuración.
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
    // Un único temporizador global (evita solapes por StrictMode). El primer
    // aviso solo suena la primera vez que aparecen urgentes, no en cada re-render.
    iniciarCampanita(cadaSegundos, !yaAvisado.current);
    yaAvisado.current = true;
    return () => detenerCampanita();
  }, [alertaActiva, cadaSegundos]);

  // Rango de fechas del gráfico de Volumen (vacío = últimos 7 días).
  const [rangoGrafico, setRangoGrafico] = useState<{ desde: string; hasta: string } | null>(null);
  const [calendarioOpen, setCalendarioOpen] = useState(false);
  const fmtCorto = (ymd: string) => new Date(`${ymd}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" });

  // ── Datos ──
  const ultimos7 = pedidosStore.volumenPorDia(7);
  const recibidosHoy = ultimos7[ultimos7.length - 1]?.total ?? 0;
  const ayer = ultimos7[ultimos7.length - 2]?.total ?? 0;
  const cambioRec = ayer === 0 ? (recibidosHoy > 0 ? 100 : 0) : Math.round(((recibidosHoy - ayer) / ayer) * 100);

  const columnas = pedidosStore.columnasTablero;

  // Granularidad adaptativa del gráfico de volumen:
  //  - un solo día → por HORA (curva del día, estilo "hoy por hora").
  //  - rango de varios días → por DÍA.
  //  - sin rango → últimos 7 días (por día).
  const unSoloDia = !!rangoGrafico && rangoGrafico.desde === rangoGrafico.hasta;
  const volPuntos: { etiqueta: string; total: number }[] = unSoloDia
    ? pedidosStore.volumenPorHora(rangoGrafico!.desde, 6, 22).map((h) => ({ etiqueta: h.etiqueta, total: h.total }))
    : rangoGrafico
    ? pedidosStore.volumenEntre(rangoGrafico.desde, rangoGrafico.hasta).map((d) => ({ etiqueta: fmtCorto(d.fecha), total: d.total }))
    : pedidosStore
        .volumenPorDia(7)
        .map((d) => ({ etiqueta: DIAS[(new Date(`${d.fecha}T00:00:00`).getDay() + 6) % 7], total: d.total }));

  const volOptions: ApexOptions = {
    // Solo la FORMA de la referencia: línea recta (dentada) y delgada, con
    // línea de guía vertical punteada al pasar el cursor y tooltip con punto.
    // El color se mantiene en el naranja oficial de NECTO.
    colors: [ORANGE],
    chart: { fontFamily: "DM Sans, sans-serif", toolbar: { show: false } },
    stroke: { curve: "straight", width: 1.6 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.28, opacityTo: 0, shadeIntensity: 0.4, stops: [0, 100] } },
    dataLabels: { enabled: false },
    markers: { size: 0, strokeColors: ORANGE, strokeWidth: 2, hover: { size: 6 } },
    xaxis: {
      categories: volPuntos.map((p) => p.etiqueta),
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      crosshairs: {
        show: true,
        stroke: { color: "#94a3b8", width: 1, dashArray: 4 },
      },
    },
    grid: { yaxis: { lines: { show: true } } },
    legend: { show: false },
    tooltip: { x: { show: true }, marker: { show: true } },
  };
  // Sin relleno: si el tramo elegido no tiene actividad, la serie son los ceros
  // reales y la tarjeta enseña su estado vacío. Antes se dibujaba una onda
  // inventada con `Math.sin` para que el gráfico "se viera", marcada con un
  // distintivo "Demo" — pero en un panel de negocio nadie distingue de un
  // vistazo una serie falsa de una real, y se decide con ella.
  const volReal = volPuntos.map((p) => p.total);
  const volVacio = volReal.every((n) => n === 0);
  const volSeries = [{ name: "Pedidos", data: volReal }];

  // Donut: en curso vs entregados vs cancelados (colores oficiales NECTO).
  const entregadosTot = pedidosStore.historial.filter((p) => p.estado === "entregado").length;
  const enCursoTot = pedidosStore.totalEnCurso;
  const canceladosTot = pedidosStore.historial.filter((p) => p.estado === "cancelado").length;
  const donutReal = enCursoTot + entregadosTot + canceladosTot;
  const donutVacio = donutReal === 0;
  const donutSeries = [enCursoTot, entregadosTot, canceladosTot];
  const donutTotal = donutReal;
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
            total: { show: true, label: "Total", formatter: () => String(donutTotal) },
          },
        },
      },
    },
    dataLabels: { enabled: false },
  };

  // Requieren atención (urgentes / más antiguos).
  const atencion = [...pedidosStore.enCurso()]
    .sort((a, b) => pedidosStore.minutosEnEstado(b) - pedidosStore.minutosEnEstado(a))
    .slice(0, 3);

  // Tabla: pedidos en curso.
  const enCurso = pedidosStore.enCurso().slice(0, 5);

  return (
    <>
      <PageMeta title="Inicio · Pedidos" description="Resumen del periodo" />

      {/* Header + selector de periodo */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {esOperador ? `Hola, ${operador!.nombre}` : "Resumen"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Datos del periodo seleccionado</p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setPeriodoOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {periodo}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {periodoOpen && (
            <div className="absolute right-0 z-40 mt-1 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
              {PERIODOS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setPeriodo(p); setPeriodoOpen(false); }}
                  className={
                    "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/[0.03] " +
                    (p === periodo ? "font-medium text-brand-600 dark:text-brand-400" : "text-gray-700 dark:text-gray-200")
                  }
                >
                  {p}
                  {p === periodo && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fila 1 — 4 KPIs */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Recibidos hoy"
          retardo={retardoEscalonado(0)}
          valor={String(recibidosHoy)}
          cambio={`${cambioRec >= 0 ? "+" : ""}${cambioRec}% vs ayer`}
          positivo={cambioRec >= 0}
          onClick={() => navigate("/pedidos?estado=nuevo")}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />
        <KpiCard
          titulo="En curso"
          retardo={retardoEscalonado(1)}
          valor={String(pedidosStore.totalEnCurso)}
          cambio={`${pedidosStore.urgentes.length} urgentes`}
          positivo={pedidosStore.urgentes.length === 0}
          onClick={() => navigate("/pedidos")}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" /></svg>}
        />
        <KpiCard
          titulo="Entregados hoy"
          retardo={retardoEscalonado(2)}
          valor={String(pedidosStore.entregadosHoy)}
          cambio="ver historial"
          positivo
          onClick={() => navigate("/pedidos/historial")}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard
          titulo="Programados"
          retardo={retardoEscalonado(3)}
          valor={String(pedidosStore.totalProgramados)}
          cambio="en cola"
          positivo
          onClick={() => navigate("/pedidos")}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* Fila 2 — barras (izq, aprovecha el espacio) + clientes (der) */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Volumen de pedidos</h3>
            </div>
            {/* Chip de periodo dentro de la tarjeta → abre modal de calendario */}
            <button
              type="button"
              onClick={() => setCalendarioOpen(true)}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-theme-xs transition-colors hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {rangoGrafico
                ? rangoGrafico.desde === rangoGrafico.hasta
                  ? fmtCorto(rangoGrafico.desde)
                  : `${fmtCorto(rangoGrafico.desde)} – ${fmtCorto(rangoGrafico.hasta)}`
                : "Esta semana"}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {volVacio ? (
            <SinDatos que="pedidos" alto={300} />
          ) : (
            <LineChart series={volSeries} options={volOptions} height={300} />
          )}
          {rangoGrafico && (
            <button
              type="button"
              onClick={() => setRangoGrafico(null)}
              className="mt-2 text-xs font-medium text-gray-400 hover:text-gray-600"
            >
              Volver a esta semana
            </button>
          )}
        </Card>

        {/* Clientes (abre modal con buscador + segmentos) */}
        <ClientesCard onAbrir={() => setClientesOpen(true)} />
      </div>

      {/* Fila 3 — Requieren atención: tira ancha estilo "Estado de filas", debajo del gráfico */}
      <div className="mt-6">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Requieren atención</h3>
            <button onClick={() => navigate("/pedidos")} className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">
              Ver todos
            </button>
          </div>
          {atencion.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Nada requiere atención ahora mismo.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {atencion.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate("/pedidos")}
                  // Interior de una tarjeta: borde susurro en vez del gris
                  // completo (box-in-a-box) y sin sombra propia.
                  className="flex flex-col gap-3 rounded-xl border border-gray-200/70 bg-gray-50/40 p-4 text-left transition-colors hover:border-brand-300/70 dark:border-white/5 dark:bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${pedidosStore.estadoDotClass(p.estado)}`} />
                      <span className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{p.cliente}</span>
                    </div>
                    {/* Único indicador crítico de la tarjeta; el resto es muted. */}
                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-normal text-error-600 dark:text-error-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-error-500" />
                      Urgente
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xl font-semibold tracking-tight text-gray-800 dark:text-white/90">{pedidosStore.minutosEnEstado(p)}m</p>
                      <p className="mt-0.5 text-xs font-normal text-gray-400">en {pedidosStore.estadoLabel(p.estado).toLowerCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-normal text-gray-500 dark:text-gray-400">{p.numero}</p>
                      <p className="mt-0.5 text-xs font-normal text-gray-400">{pedidosStore.modalidadLabel(p.modalidad)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Fila 4 — tabla (izq) + donut (der) */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Tabla pedidos en curso */}
        <Card className="p-0 sm:p-0 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Pedidos en curso</h3>
            <button onClick={() => navigate("/pedidos")} className="text-gray-400 hover:text-gray-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16m0 0l-6-6m6 6l-6 6" /></svg>
            </button>
          </div>
          {enCurso.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Sin pedidos en curso.</p>
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
                  {enCurso.map((p) => (
                    <TableRow key={p.id} onClick={() => navigate(`/pedidos?detalle=${p.id}`)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                      <TableCell className="font-medium text-gray-800 dark:text-white/90">{p.numero}</TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400">{p.cliente}</TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400">{pedidosStore.modalidadLabel(p.modalidad)}</TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400">{pedidosStore.totalPedido(p) > 0 ? money(pedidosStore.totalPedido(p)) : "—"}</TableCell>
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

        {/* Donut */}
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Distribución</h3>
          </div>
          <div className="mt-2 flex justify-center">
            {donutVacio ? (
              <div className="w-full">
                <SinDatos que="pedidos" alto={300} />
              </div>
            ) : (
              <PieChart series={donutSeries} options={donutOptions} height={300} />
            )}
          </div>
        </Card>
      </div>

      {clientesOpen && (
        <ClientesModal
          onClose={() => setClientesOpen(false)}
          onChat={(id) => {
            // Cierra la lista para que el drawer quede como única superficie
            // modal visible, y abre el hilo del cliente elegido.
            setClientesOpen(false);
            setChatDrawerConvId(id);
          }}
        />
      )}

      {calendarioOpen && (
        <RangoCalendarioModal
          onClose={() => setCalendarioOpen(false)}
          onAplicar={(desde, hasta) => {
            setRangoGrafico({ desde, hasta });
            setCalendarioOpen(false);
          }}
        />
      )}

      {/* Chat rápido (slide-over). Misma instancia y mismo resolutor canónico de
          hilo que usa el tablero, para que ambas superficies no puedan
          discrepar sobre la misma conversación. */}
      <ChatDrawer
        // Aquí la fila YA es un hilo (tarjeta "Clientes"), así que se abre por
        // `convId`, que tiene prioridad sobre `pedido`. Un cliente sin pedido
        // puede abrirse igual: la ausencia de pedido se representa como ausencia.
        convId={chatDrawerConvId}
        onClose={() => setChatDrawerConvId(null)}
      />
    </>
  );
});

export default InicioPage;
