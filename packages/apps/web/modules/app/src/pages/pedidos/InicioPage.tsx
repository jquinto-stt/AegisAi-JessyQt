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
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import { pedidosStore, sessionStore, puedeGuardarConfig, puedeEscribirCliente, motivoSinPermiso } from "@/stores";
import type { Pedido } from "@/stores/pedidos.store";

// ═══════════════════════════════════════════════════════════════════════════
// PALETA
// ═══════════════════════════════════════════════════════════════════════════

// Paleta oficial NECTO (misma que usa el dashboard de Turnos).
const ORANGE = "#FF3F1A";
const INDIGO = "#190088";
const CELESTE = "#97D6DF";
const money = (n: number) => `$${n.toLocaleString("es-CO")}`;

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Abre WhatsApp del cliente en una pestaña nueva (wa.me, solo dígitos). */
const abrirWhatsApp = (telefono: string) => {
  const numero = telefono.replace(/[^\d]/g, "");
  if (numero) window.open(`https://wa.me/${numero}`, "_blank", "noopener,noreferrer");
};

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
  onClick,
}: {
  titulo: string;
  valor: string;
  cambio: string;
  positivo?: boolean;
  icon: React.ReactNode;
  onClick?: () => void;
}) => (
  <button type="button" onClick={onClick} className="block h-full w-full text-left" disabled={!onClick}>
    <Card className={"h-full " + (onClick ? "transition-all hover:border-brand-300 hover:shadow-theme-sm dark:hover:border-brand-700" : "")}>
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{titulo}</p>
        <span className="text-gray-300 dark:text-gray-600">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-gray-800 dark:text-white/90">{valor}</p>
      <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${positivo ? "text-success-600" : "text-error-500"}`}>
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

type Segmento = "todos" | "atencion" | "pago" | "bot";

const SEGMENTOS: { id: Segmento; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "atencion", label: "Requieren atención" },
  { id: "pago", label: "Pago pendiente" },
  { id: "bot", label: "Por WhatsApp (bot)" },
];

/** Inicial(es) para el avatar a partir del nombre. */
const iniciales = (nombre: string) =>
  nombre.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

/** Colores de avatar deterministas por nombre (fallback si la imagen falla). */
const avatarColor = (nombre: string) => {
  const colores = ["bg-brand-500", "bg-blue-light-500", "bg-success-500", "bg-warning-500", "bg-orange-500"];
  let h = 0;
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0;
  return colores[h % colores.length];
};

/**
 * URL de avatar generado (mock): DiceBear crea una ilustración consistente por
 * nombre. Como los clientes no tienen foto real, esto da una "foto" estable.
 */
const avatarUrl = (nombre: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nombre)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

/** Aplica el segmento sobre los pedidos en curso. */
const filtrarSegmento = (pedidos: Pedido[], seg: Segmento): Pedido[] => {
  switch (seg) {
    case "atencion":
      return pedidos.filter((p) => pedidosStore.esUrgente(p));
    case "pago":
      return pedidos.filter((p) => p.pagado === false);
    case "bot":
      return pedidos.filter((p) => p.origen === "whatsapp");
    default:
      return pedidos;
  }
};

/** Tiempo relativo legible: "15 min", "2 h", "3 d". */
const relativo = (min: number) => {
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} d`;
};

/** Subtítulo/rol del cliente = estado + modalidad (estilo "Project Manager" de la ref). */
const clienteRol = (p: Pedido) => `${pedidosStore.estadoLabel(p.estado)} · ${pedidosStore.modalidadLabel(p.modalidad)}`;

/**
 * Fila de cliente estilo "Chats" (referencia): avatar redondo con punto de
 * estado, nombre en negrita, rol tenue debajo, y tiempo a la derecha.
 */
const ClienteRow = observer(
  ({ p, onClick, showWhatsApp = false }: { p: Pedido; onClick: () => void; showWhatsApp?: boolean }) => {
  const urgente = pedidosStore.esUrgente(p);
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]"
    >
      <span className="relative shrink-0">
        <img
          src={avatarUrl(p.cliente)}
          alt={p.cliente}
          loading="lazy"
          onError={(e) => {
            // Fallback a iniciales si la imagen no carga.
            const el = e.currentTarget;
            el.style.display = "none";
            el.nextElementSibling?.classList.remove("hidden");
          }}
          className="h-11 w-11 rounded-full bg-gray-100 object-cover dark:bg-gray-800"
        />
        <span className={`hidden h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white [&:not(.hidden)]:inline-flex ${avatarColor(p.cliente)}`}>
          {iniciales(p.cliente)}
        </span>
        <span
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 ${urgente ? "bg-orange-500" : "bg-success-500"}`}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-gray-800 dark:text-white/90">{p.cliente}</p>
        <p className="truncate text-[13px] text-gray-400 dark:text-gray-500">{clienteRol(p)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {/* Etiqueta distintiva: atención (rojo) tiene prioridad sobre pago (naranja) */}
        {urgente ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-error-50 px-2 py-0.5 text-[11px] font-medium text-error-600 dark:bg-error-500/10 dark:text-error-400">
            <span className="h-1.5 w-1.5 rounded-full bg-error-500" />
            Requiere atención
          </span>
        ) : p.pagado === false ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-[11px] font-medium text-warning-600 dark:bg-warning-500/10 dark:text-warning-400">
            <span className="h-1.5 w-1.5 rounded-full bg-warning-500" />
            Pendiente de pago
          </span>
        ) : (
          <span className="text-[11px] font-medium text-success-600 dark:text-success-400">Al día</span>
        )}
        {showWhatsApp ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#17b363]">
            <WhatsAppIcon className="h-3.5 w-3.5" />
            Escribir
          </span>
        ) : (
          <span className="text-[13px] text-gray-400">{relativo(pedidosStore.minutosEnEstado(p))}</span>
        )}
      </div>
    </button>
  );
  },
);

const ClientesModal = observer(({ onClose }: { onClose: () => void }) => {
  const [seg, setSeg] = useState<Segmento>("todos");
  const [q, setQ] = useState("");

  const base = pedidosStore.enCurso();
  const query = q.trim().toLowerCase();
  const lista = filtrarSegmento(base, seg).filter(
    (p) => !query || p.cliente.toLowerCase().includes(query) || p.numero.toLowerCase().includes(query),
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
          placeholder="Buscar cliente o número…"
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
          lista.map((p) => (
            <ClienteRow
              key={p.id}
              p={p}
              onClick={() => abrirWhatsApp(p.telefono)}
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
  const items = [...pedidosStore.enCurso()]
    .sort((a, b) => pedidosStore.minutosEnEstado(b) - pedidosStore.minutosEnEstado(a))
    .slice(0, 5);
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">Clientes</h3>
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
        <p className="py-10 text-center text-sm text-gray-400">Sin clientes en curso.</p>
      ) : (
        <div className="space-y-1">
          {items.map((p) => <ClienteRow key={p.id} p={p} onClick={onAbrir} />)}
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
  // Demo: si el tramo elegido no tiene actividad real, muestra una curva de
  // ejemplo del mismo tamaño para que el gráfico sea demostrativo (no un punto).
  const volReal = volPuntos.map((p) => p.total);
  const volVacio = volReal.every((n) => n === 0);
  const demoCurva = (n: number) =>
    Array.from({ length: n }, (_, i) => {
      // Serie dentada estilo la referencia: onda base + "ruido" determinista
      // (misma semilla en cada render, así no salta con la línea recta).
      const x = (i / Math.max(1, n - 1)) * Math.PI * 2;
      const base = 30 + 10 * Math.sin(x) + 4 * Math.sin(x * 2 + 1);
      const ruido = 6 * Math.sin(i * 12.9898) + 4 * Math.sin(i * 4.1414 + 2);
      return Math.max(4, Math.round(base + ruido));
    });
  const volSeries = [{ name: "Pedidos", data: volVacio ? demoCurva(volPuntos.length) : volReal }];

  // Donut: en curso vs entregados vs cancelados (colores oficiales NECTO).
  const entregadosTot = pedidosStore.historial.filter((p) => p.estado === "entregado").length;
  const enCursoTot = pedidosStore.totalEnCurso;
  const canceladosTot = pedidosStore.historial.filter((p) => p.estado === "cancelado").length;
  const donutReal = enCursoTot + entregadosTot + canceladosTot;
  // Demo: si no hay nada, muestra un reparto de ejemplo.
  const donutVacio = donutReal === 0;
  const donutSeries = donutVacio ? [5, 8, 2] : [enCursoTot, entregadosTot, canceladosTot];
  const donutTotal = donutVacio ? 15 : donutReal;
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
          valor={String(recibidosHoy)}
          cambio={`${cambioRec >= 0 ? "+" : ""}${cambioRec}% vs ayer`}
          positivo={cambioRec >= 0}
          onClick={() => navigate("/pedidos?estado=nuevo")}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />
        <KpiCard
          titulo="En curso"
          valor={String(pedidosStore.totalEnCurso)}
          cambio={`${pedidosStore.urgentes.length} urgentes`}
          positivo={pedidosStore.urgentes.length === 0}
          onClick={() => navigate("/pedidos")}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" /></svg>}
        />
        <KpiCard
          titulo="Entregados hoy"
          valor={String(pedidosStore.entregadosHoy)}
          cambio="ver historial"
          positivo
          onClick={() => navigate("/pedidos/historial")}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard
          titulo="Programados"
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
              {volVacio && <span className="text-xs font-medium text-brand-500">Demo</span>}
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
          <LineChart series={volSeries} options={volOptions} height={300} />
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
                  className="flex flex-col rounded-xl border border-gray-200 p-4 text-left transition-all hover:border-brand-300 hover:shadow-theme-sm dark:border-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${pedidosStore.estadoDotClass(p.estado)}`} />
                      <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{p.cliente}</span>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-error-500">
                      <span className="h-2 w-2 rounded-full bg-error-500" />
                      Urgente
                    </span>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-800 dark:text-white/90">{pedidosStore.minutosEnEstado(p)}m</p>
                      <p className="text-xs text-gray-400">en {pedidosStore.estadoLabel(p.estado).toLowerCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">{p.numero}</p>
                      <p className="text-xs text-gray-400">{pedidosStore.modalidadLabel(p.modalidad)}</p>
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
            {donutVacio && <span className="text-xs font-medium text-brand-500">Demo</span>}
          </div>
          <div className="mt-2 flex justify-center">
            <PieChart series={donutSeries} options={donutOptions} height={300} />
          </div>
        </Card>
      </div>

      {clientesOpen && (
        <ClientesModal onClose={() => setClientesOpen(false)} />
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
    </>
  );
});

export default InicioPage;
