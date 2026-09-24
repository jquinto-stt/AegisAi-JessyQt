import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Modal } from "@/elements/ui/modal";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import { DatePicker } from "@/elements/form/date-picker";
import { pedidosStore, ETIQUETA_PAGO, puedeEscribirCliente } from "@/stores";
import { conversacionesStore } from "@/stores/conversaciones.store";
import type { Pedido } from "@/stores/pedidos.store";
import { abrirConversacionDe } from "@/pages/conversaciones/conversaciones.navegacion";
import {
  filtrarHistorial,
  FILTROS_VACIOS,
  type HistorialFiltros,
  actividadDiaria,
  actividadEntre,
  agruparPorMes,
  RANGOS_DIAS,
} from "./historial.utils";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Fecha legible (dd/mm/yyyy hh:mm) de un ISO. */
const fechaLegible = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20z" />
  </svg>
);

const DeliveryIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const MapPinIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const AlertTriangleIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// MENÚ DE ACCIONES POR FILA (9 puntos) — igual patrón que el tablero en Lista
// ═══════════════════════════════════════════════════════════════════════════

const AccionesMenu = observer(
  ({ pedido, onDetalle }: { pedido: Pedido; onDetalle: (id: string) => void }) => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
      if (!open) return;
      const close = () => setOpen(false);
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }, [open]);

    const run = (fn: () => void) => (e: React.MouseEvent) => {
      e.stopPropagation();
      setOpen(false);
      fn();
    };

    return (
      <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          aria-label="Acciones"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <circle cx="5" cy="5" r="1.6" /><circle cx="12" cy="5" r="1.6" /><circle cx="19" cy="5" r="1.6" />
            <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
            <circle cx="5" cy="19" r="1.6" /><circle cx="12" cy="19" r="1.6" /><circle cx="19" cy="19" r="1.6" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 z-40 mt-1 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
            <button
              type="button"
              onClick={run(() => onDetalle(pedido.id))}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-brand-500/10"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1 1 0 010-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178a1 1 0 010 .644C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Ver detalle
            </button>
            {/* Escribir al cliente es una acción de canal: `channels.read`.
                Abre el hilo DENTRO del sistema (no wa.me): ver
                `conversaciones.navegacion.ts`. Si el contacto no tiene hilo,
                no se navega y el ítem se deshabilita — crear una conversación
                vacía no es un efecto colateral aceptable de este botón. */}
            {puedeEscribirCliente() &&
              (() => {
                const tieneHilo = conversacionesStore.tieneConversacion(
                  pedido.telefono,
                );
                return (
                  <button
                    type="button"
                    disabled={!tieneHilo}
                    title={
                      tieneHilo
                        ? "Abrir la conversación de este cliente"
                        : "Este cliente no tiene conversación abierta"
                    }
                    onClick={run(() =>
                      abrirConversacionDe(pedido.telefono, navigate),
                    )}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#25D366] hover:bg-[#25D366]/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <WhatsAppIcon />
                    Abrir conversación
                  </button>
                );
              })()}
          </div>
        )}
      </div>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// HEATMAP DE ACTIVIDAD DIARIA (tipo GitHub) — grilla propia con zoom por rango
// ═══════════════════════════════════════════════════════════════════════════

/** Escala de color por número de pedidos con la paleta brand de Necto. */
const nivelColor = (n: number): string => {
  if (n <= 0) return "bg-gray-100 dark:bg-white/[0.06]";
  if (n === 1) return "bg-brand-100 dark:bg-brand-500/25";
  if (n <= 3) return "bg-brand-300 dark:bg-brand-500/50";
  if (n <= 5) return "bg-brand-400 dark:bg-brand-500/75";
  return "bg-brand-500 dark:bg-brand-500";
};

/** Leyenda de la escala (chips "menos → más"). */
const LEYENDA: { label: string; clase: string }[] = [
  { label: "0", clase: "bg-gray-100 dark:bg-white/[0.06]" },
  { label: "1", clase: "bg-brand-100 dark:bg-brand-500/25" },
  { label: "2–3", clase: "bg-brand-300 dark:bg-brand-500/50" },
  { label: "4–5", clase: "bg-brand-400 dark:bg-brand-500/75" },
  { label: "6+", clase: "bg-brand-500 dark:bg-brand-500" },
];

/** Etiqueta legible corta de una fecha "YYYY-MM-DD": "12 sep". */
const fechaCorta = (ymd: string) =>
  new Date(`${ymd}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" });

/** Etiquetas de los 7 días (filas del heatmap, Lun→Dom). */
const DIAS_FILA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/**
 * HeatmapActividad — mapa de actividad diaria (estilo calendario): filas = días
 * de la semana (Lun→Dom), columnas = semanas del rango. Las celdas abarcan todo
 * el ancho (7 columnas por semana repartidas). Rango configurable + zoom rueda.
 */
const HeatmapActividad = observer(
  ({
    pedidos,
    desde,
    hasta,
    onRango,
  }: {
    pedidos: Pedido[];
    desde: string;
    hasta: string;
    /** Fija el rango Desde/Hasta en los filtros al seleccionar en el heatmap. */
    onRango: (desde: string, hasta: string) => void;
  }) => {
  const [rangoIdx, setRangoIdx] = useState(RANGOS_DIAS.length - 1); // arranca en 360 días
  const dias = RANGOS_DIAS[rangoIdx];

  // Selección visual de rango: primer click = inicio, segundo = fin.
  const [selInicio, setSelInicio] = useState<string | null>(null);
  const [hoverFecha, setHoverFecha] = useState<string | null>(null);

  const clickCelda = (fecha: string) => {
    if (!selInicio) {
      setSelInicio(fecha);
      return;
    }
    // Segundo click: ordena el par y fija el rango en los filtros.
    const [d1, d2] = selInicio <= fecha ? [selInicio, fecha] : [fecha, selInicio];
    setSelInicio(null);
    setHoverFecha(null);
    onRango(d1, d2);
  };

  /** ¿La fecha está dentro del rango en curso de selección (inicio↔hover)? */
  const enSeleccion = (fecha: string): boolean => {
    if (!selInicio) return false;
    const otro = hoverFecha ?? selInicio;
    const lo = selInicio <= otro ? selInicio : otro;
    const hi = selInicio <= otro ? otro : selInicio;
    return fecha >= lo && fecha <= hi;
  };

  // Si el filtro tiene un rango Desde/Hasta, el heatmap dibuja EXACTAMENTE ese
  // rango (aunque sea 1, 2 o 3 días); si no, muestra los últimos N días del
  // selector. Así el heatmap se adapta a cualquier rango de fecha del filtro.
  const rangoManual = !!desde && !!hasta && desde <= hasta;
  const celdasReales = rangoManual ? actividadEntre(pedidos, desde, hasta) : actividadDiaria(pedidos, dias);
  const totalReal = celdasReales.reduce((s, c) => s + c.cantidad, 0);

  // Simulación para previsualización del año completo (solo para visualizar).
  // Genera una distribución orgánica tipo GitHub heatmap combinada con pedidos reales.
  const celdas = celdasReales.map((c) => {
    let h = 0;
    for (let i = 0; i < c.fecha.length; i++) h = (h * 31 + c.fecha.charCodeAt(i)) >>> 0;
    const seed = h % 100;
    let sim = 0;
    if (seed < 12) sim = 0; // ~12% sin actividad
    else if (seed < 38) sim = 1; // nivel 1 (1 pedido)
    else if (seed < 68) sim = 2 + (h % 2); // nivel 2 (2–3 pedidos)
    else if (seed < 88) sim = 4 + (h % 2); // nivel 3 (4–5 pedidos)
    else sim = 6 + (h % 4); // nivel 4 (6–9 pedidos)
    return { ...c, cantidad: Math.max(c.cantidad, sim) };
  });

  const meses = agruparPorMes(celdas); // bloques por mes, cada uno en semanas
  const totalRango = celdas.reduce((s, c) => s + c.cantidad, 0);

  // Ancho del contenedor (para que el heatmap ocupe todo el espacio disponible).
  const wrapRef = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const ro = new ResizeObserver(() => setAncho(el.clientWidth));
    ro.observe(el);
    setAncho(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Cancela una selección a medias (primer click hecho) si el usuario hace
  // click fuera del heatmap o presiona Escape.
  useEffect(() => {
    if (!selInicio) return;
    const cancelar = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setSelInicio(null);
        setHoverFecha(null);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelInicio(null);
        setHoverFecha(null);
      }
    };
    document.addEventListener("mousedown", cancelar);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", cancelar);
      document.removeEventListener("keydown", onEsc);
    };
  }, [selInicio]);

  // Reparto del ancho: columnas de semana totales y días efectivos
  const totalSemanas = meses.reduce((s, m) => s + m.semanas.length, 0);
  const numDias = rangoManual ? celdas.length : dias;
  const labelW = 28; // ancho de la columna de etiquetas de día

  // Adaptabilidad visual según la cantidad de días:
  // A menor cantidad de días, las celdas crecen y la separación entre meses
  // se distribuye homogéneamente a lo largo de todo el ancho del contenedor.
  const configEscala = useMemo(() => {
    if (numDias <= 30) return { cell: 28, cellGap: 6, minMesGap: 24 };
    if (numDias <= 60) return { cell: 26, cellGap: 5, minMesGap: 20 };
    if (numDias <= 120) return { cell: 24, cellGap: 5, minMesGap: 16 };
    if (numDias <= 180) return { cell: 20, cellGap: 4, minMesGap: 14 };
    if (numDias <= 240) return { cell: 17, cellGap: 4, minMesGap: 12 };
    // 360 días o rangos extensos:
    const baseCell = totalSemanas > 0 ? Math.max(10, Math.min(15, Math.floor((ancho - labelW - 100) / totalSemanas))) : 14;
    return { cell: baseCell, cellGap: 3, minMesGap: 10 };
  }, [numDias, totalSemanas, ancho]);

  const { cell, cellGap, minMesGap } = configEscala;

  return (
    <Card className="mb-6">
      {/* Encabezado: título + selector de rango + leyenda */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink-title dark:text-white/90">Actividad diaria</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-brand-600 dark:text-brand-400">Simulación anual</span>
            {" · "}
            {rangoManual ? (
              <>{totalRango} pedidos en el rango seleccionado</>
            ) : (
              <>{totalRango} pedidos en los últimos {dias} días</>
            )}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {selInicio
              ? "Ahora haz click en otra celda para cerrar el rango."
              : "Tip: haz click en dos celdas para filtrar por ese rango."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de días: solo cuando NO hay rango del filtro (el filtro manda) */}
          {!rangoManual && (
            <div className="w-40">
              <Select
                key={`rango-${rangoIdx}`}
                options={RANGOS_DIAS.map((d) => ({ value: String(d), label: `${d} días` }))}
                defaultValue={String(dias)}
                onChange={(v) => setRangoIdx(RANGOS_DIAS.indexOf(Number(v) as (typeof RANGOS_DIAS)[number]))}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">menos</span>
            {LEYENDA.map((l) => (
              <span key={l.label} className={`h-3.5 w-3.5 rounded ${l.clase}`} title={l.label} />
            ))}
            <span className="text-xs text-gray-400">más</span>
          </div>
        </div>
      </div>

      {/* Heatmap segmentado por mes: distribuido homogéneamente por todo el ancho de la tarjeta */}
      <div ref={wrapRef} className="w-full overflow-x-auto pb-1">
        <div className="flex w-full items-start min-w-fit gap-3 sm:gap-4">
          {/* Etiquetas de día (una sola vez, a la izquierda) */}
          <div
            className="flex shrink-0 flex-col"
            style={{ gap: `${cellGap}px`, width: labelW, paddingTop: 1 }}
          >
            {DIAS_FILA.map((d) => (
              <span
                key={d}
                className="flex items-center text-[10px] font-medium text-gray-400"
                style={{ height: `${cell}px` }}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Bloques de mes distribuidos homogéneamente abarcando todo el espacio */}
          <div
            className={`flex flex-1 items-start min-w-0 ${
              meses.length > 1 ? "justify-between" : "justify-start"
            }`}
            style={{ gap: `${minMesGap}px` }}
          >
            {meses.map((mes) => (
              <div key={mes.clave} className="flex shrink-0 flex-col items-center">
                <div className="flex" style={{ gap: `${cellGap}px` }}>
                  {mes.semanas.map((semana, wi) => (
                    <div key={wi} className="flex flex-col" style={{ gap: `${cellGap}px` }}>
                      {DIAS_FILA.map((_, fila) => {
                        const c = semana[fila];
                        if (!c)
                          return (
                            <div
                              key={fila}
                              className="rounded bg-transparent"
                              style={{ width: cell, height: cell }}
                            />
                          );
                        // Durante una selección en curso: resalta el tramo elegido
                        // y atenúa lo demás (sin anillos por celda). Fuera de una
                        // selección, las celdas se ven con su degradado natural.
                        const seleccionando = !!selInicio;
                        const enSel = enSeleccion(c.fecha);
                        const extremo = c.fecha === selInicio || c.fecha === hoverFecha;
                        return (
                          <button
                            key={c.fecha}
                            type="button"
                            onClick={() => clickCelda(c.fecha)}
                            onMouseEnter={() => selInicio && setHoverFecha(c.fecha)}
                            title={`${fechaCorta(c.fecha)}: ${c.cantidad} pedido${c.cantidad === 1 ? "" : "s"}`}
                            style={{ width: cell, height: cell }}
                            className={
                              "rounded transition-transform hover:scale-110 " +
                              nivelColor(c.cantidad) +
                              // Atenúa las celdas fuera del tramo mientras se selecciona.
                              (seleccionando && !enSel ? " opacity-30" : "") +
                              // Marca solo los dos extremos del tramo en curso.
                              (seleccionando && extremo
                                ? " ring-2 ring-brand-600 ring-offset-1 ring-offset-white dark:ring-white dark:ring-offset-gray-900"
                                : "")
                            }
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                {/* Etiqueta del mes, centrada bajo el bloque */}
                <div className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {mes.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * HistorialPage — pedidos en estado terminal (entregado / cancelado). Muestra
 * una franja de KPIs contextual (siempre visible, reacciona a los filtros) con
 * gráficos donut, y debajo la tabla para buscar/auditar pedidos concretos.
 * Filtros: estado, modalidad, rango de fecha, búsqueda. El filtrado usa
 * filtrarHistorial (helper puro y testeado).
 */
export const HistorialPage = observer(() => {
  const [filtros, setFiltros] = useState<HistorialFiltros>(FILTROS_VACIOS);
  const [detalleId, setDetalleId] = useState<string | null>(null);

  const terminales = pedidosStore.historial;
  const resultado = filtrarHistorial(terminales, filtros);
  const detalle = detalleId ? pedidosStore.getPedido(detalleId) ?? null : null;

  const set = <K extends keyof HistorialFiltros>(k: K, v: HistorialFiltros[K]) =>
    setFiltros((prev) => ({ ...prev, [k]: v }));

  const limpiar = () => setFiltros(FILTROS_VACIOS);
  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(FILTROS_VACIOS);

  return (
    <>
      <PageMeta title="Historial de pedidos" description="Pedidos entregados y cancelados" />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-title dark:text-white/90">Historial</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Pedidos ya cerrados: entregados y cancelados.
        </p>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label htmlFor="f-busqueda">Buscar</Label>
            <Input
              id="f-busqueda"
              placeholder="Cliente o número"
              value={filtros.busqueda}
              onChange={(e) => set("busqueda", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="f-estado">Estado</Label>
            <Select
              key={`estado-${hayFiltros ? "f" : "v"}`}
              options={[
                { value: "", label: "Todos" },
                { value: "entregado", label: "Entregado" },
                { value: "cancelado", label: "Cancelado" },
              ]}
              defaultValue={filtros.estado}
              placeholder="Todos"
              onChange={(v) => set("estado", v as HistorialFiltros["estado"])}
            />
          </div>
          <div>
            <Label htmlFor="f-modalidad">Modalidad</Label>
            <Select
              key={`modalidad-${hayFiltros ? "f" : "v"}`}
              options={[
                { value: "", label: "Todas" },
                ...pedidosStore.config.modalidades.map((m) => ({ value: m, label: pedidosStore.modalidadLabel(m) })),
              ]}
              defaultValue={filtros.modalidad}
              placeholder="Todas"
              onChange={(v) => set("modalidad", v as HistorialFiltros["modalidad"])}
            />
          </div>
          <div>
            <Label htmlFor="f-desde">Desde</Label>
            <DatePicker
              key={`desde-${hayFiltros ? "f" : "v"}`}
              id="f-desde"
              defaultDate={filtros.desde || undefined}
              placeholder="dd/mm/aaaa"
              onChange={(_dates, dateStr) => set("desde", dateStr)}
            />
          </div>
          <div>
            <Label htmlFor="f-hasta">Hasta</Label>
            <DatePicker
              key={`hasta-${hayFiltros ? "f" : "v"}`}
              id="f-hasta"
              defaultDate={filtros.hasta || undefined}
              placeholder="dd/mm/aaaa"
              onChange={(_dates, dateStr) => set("hasta", dateStr)}
            />
          </div>
        </div>
        {hayFiltros && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {resultado.length} resultado{resultado.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={limpiar}
              className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </Card>

      {/* Heatmap de actividad — bidireccional con el filtro Desde/Hasta:
          si el filtro tiene rango, el heatmap se adapta; y al seleccionar dos
          celdas, escribe el rango en el filtro (actualiza tabla y KPIs). */}
      <HeatmapActividad
        pedidos={resultado}
        desde={filtros.desde}
        hasta={filtros.hasta}
        onRango={(d, h) => setFiltros((prev) => ({ ...prev, desde: d, hasta: h }))}
      />

      {/* Tabla de pedidos */}
      {resultado.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No hay pedidos que coincidan con los filtros.
          </p>
        </Card>
      ) : (
        <Card className="p-0 sm:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell header>Pedido</TableCell>
                <TableCell header>Cliente</TableCell>
                <TableCell header>Modalidad</TableCell>
                <TableCell header>Estado</TableCell>
                <TableCell header>Cerrado</TableCell>
                <TableCell header className="text-right">Acciones</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultado.map((p) => (
                // Fila entera clicable → abre el detalle (mismo patrón que el tablero en Lista).
                <TableRow
                  key={p.id}
                  onClick={() => setDetalleId(p.id)}
                  className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                >
                  <TableCell className="font-medium text-gray-800 dark:text-white/90">{p.numero}</TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400">{p.cliente}</TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400">{pedidosStore.modalidadLabel(p.modalidad)}</TableCell>
                  <TableCell>
                    <Badge color={pedidosStore.estadoBadgeColor(p.estado)} size="sm">
                      {pedidosStore.estadoLabel(p.estado)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400">{fechaLegible(p.finishedAt ?? p.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <AccionesMenu pedido={p} onDetalle={(id) => setDetalleId(id)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {detalle && <DetalleModal pedido={detalle} onClose={() => setDetalleId(null)} />}
    </>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// DETALLE (modal, solo lectura)
// ═══════════════════════════════════════════════════════════════════════════

const DetalleModal = observer(({ pedido, onClose }: { pedido: Pedido; onClose: () => void }) => {
  const subtotal = pedidosStore.subtotalItems(pedido);
  const total = pedidosStore.totalPedido(pedido);
  const cambio = pedidosStore.cambioRequerido(pedido);

  const queryMaps = [
    pedido.direccionEntrega?.calle,
    pedido.direccionEntrega?.barrio,
  ]
    .filter(Boolean)
    .join(", ");

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryMaps)}`;

  return (
    <Modal isOpen onClose={onClose} className="max-w-lg p-6 sm:p-8">
      {/* Encabezado: título + estado debajo. pr-12 reserva espacio para la X. */}
      <div className="mb-5 pr-12">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-ink-title dark:text-white/90">{pedido.numero}</h2>
          <Badge color={pedidosStore.estadoBadgeColor(pedido.estado)} size="sm">
            {pedidosStore.estadoLabel(pedido.estado)}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{pedido.cliente} · {pedido.telefono}</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Modalidad</p>
          <p className="mt-1 text-sm text-gray-800 dark:text-white/90">{pedidosStore.modalidadLabel(pedido.modalidad)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Cerrado</p>
          <p className="mt-1 text-sm text-gray-800 dark:text-white/90">{fechaLegible(pedido.finishedAt ?? pedido.createdAt)}</p>
        </div>
      </div>

      {/* Logística de Entrega (Domicilio) */}
      {pedido.modalidad === "domicilio" && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-white/90">
              <DeliveryIcon className="h-3.5 w-3.5 text-brand-500" />
              Dirección de entrega
            </span>
            {pedido.direccionEntrega?.calle && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
              >
                <MapPinIcon className="h-3.5 w-3.5" />
                Abrir en Google Maps
              </a>
            )}
          </div>

          {pedido.direccionEntrega ? (
            <div className="mt-2 space-y-1 text-xs text-gray-700 dark:text-gray-300">
              <p className="font-semibold text-gray-800 dark:text-white">
                {pedido.direccionEntrega.calle}
              </p>
              {(pedido.direccionEntrega.barrio || pedido.direccionEntrega.referencia) && (
                <p className="text-gray-500 dark:text-gray-400">
                  {[pedido.direccionEntrega.barrio, pedido.direccionEntrega.referencia].filter(Boolean).join(" · ")}
                </p>
              )}
              {pedido.direccionEntrega.indicaciones && (
                <p className="italic text-gray-500 dark:text-gray-400">
                  "{pedido.direccionEntrega.indicaciones}"
                </p>
              )}
            </div>
          ) : (
            <p className="mt-1 flex items-center gap-1 text-xs text-warning-600 dark:text-warning-400">
              <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
              Sin dirección registrada.
            </p>
          )}

          {pedido.repartidor && (
            <div className="mt-2.5 border-t border-gray-200/60 pt-2 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-400">
              <span>Repartidor: </span>
              <span className="font-semibold text-gray-800 dark:text-white">{pedido.repartidor}</span>
            </div>
          )}
        </div>
      )}

      {/* Items */}
      {pedido.items.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Items</p>
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-white/5 dark:border-gray-800">
            {pedido.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-gray-700 dark:text-gray-300">{it.cantidad}× {it.nombre}</span>
                {it.precio !== undefined && (
                  <span className="text-gray-500 dark:text-gray-400">${(it.precio * it.cantidad).toLocaleString()}</span>
                )}
              </div>
            ))}

            {pedido.modalidad === "domicilio" && (pedido.costoEnvio ?? 0) > 0 && (
              <>
                <div className="flex items-center justify-between px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span>Subtotal items</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span>Costo de envío</span>
                  <span>${(pedido.costoEnvio ?? 0).toLocaleString()}</span>
                </div>
              </>
            )}

            {total > 0 && (
              <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold">
                <span className="text-gray-800 dark:text-white/90">Total</span>
                <span className="text-gray-800 dark:text-white/90">${total.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pago */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-xs dark:border-gray-800 dark:bg-white/[0.02]">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-400">Método de pago: </span>
            <span className="font-medium text-gray-700 capitalize dark:text-gray-300">
              {pedido.metodoPago ? pedido.metodoPago.replace("_", " ") : "No especificado"}
            </span>
          </div>
          <div>
            {/* «Pago», no «Estado»: el badge de estado del pedido está justo
                arriba y este campo es el estado de PAGO, un eje distinto. Dos
                campos rotulados «Estado» en la misma tarjeta obligan a adivinar
                cuál es cuál. */}
            <span className="text-gray-400">Pago: </span>
            <span className={pedido.pagado ? "font-semibold text-success-600" : "font-semibold text-warning-600"}>
              {pedido.pagado ? ETIQUETA_PAGO.pagado : ETIQUETA_PAGO.sinPagar}
            </span>
          </div>
        </div>
        {pedido.metodoPago === "efectivo" && pedido.pagaCon !== undefined && (
          <div className="mt-2 flex items-center justify-between border-t border-gray-200/60 pt-2 text-gray-600 dark:border-gray-800 dark:text-gray-400">
            <span>Abonó con: ${pedido.pagaCon.toLocaleString()}</span>
            {cambio > 0 && <span className="font-semibold text-success-600">Cambio: ${cambio.toLocaleString()}</span>}
          </div>
        )}
      </div>

      {pedido.notas && (
        <div className="mb-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Notas</p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{pedido.notas}</p>
        </div>
      )}

      <div className="flex items-center justify-end">
        <Button size="sm" variant="outline" onClick={onClose}>Cerrar</Button>
      </div>
    </Modal>
  );
});

export default HistorialPage;
