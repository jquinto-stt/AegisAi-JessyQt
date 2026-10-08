import { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { ChevronLeftIcon, ChevronRightIcon } from "@/icons";
import { pedidosStore } from "@/stores";
import { money } from "./widgets.comunes";
import {
  CalendarDaysIcon,
  ClockIcon,
  BellAlertIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  diasDeLaSemana,
  mesDeYmd,
  MESES,
  sumarDias,
  esHoy,
  hoyYmd,
} from "../inicio.calendario";

const DIAS_COLUMNAS = [
  { key: "lu", label: "Lu", nombre: "Lunes" },
  { key: "ma", label: "Ma", nombre: "Martes" },
  { key: "mi", label: "Mi", nombre: "Miércoles" },
  { key: "ju", label: "Ju", nombre: "Jueves" },
  { key: "vi", label: "Vi", nombre: "Viernes" },
  { key: "sa", label: "Sá", nombre: "Sábado" },
  { key: "do", label: "Do", nombre: "Domingo" },
] as const;

function formatHora(isoString?: string): string {
  if (!isoString) return "--:--";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("es-CO", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "--:--";
  }
}

export interface CalendarioSemanalWidgetProps {
  /** Día seleccionado en formato "YYYY-MM-DD". */
  seleccion: string;
  /** Callback al seleccionar un día. */
  onSeleccion: (ymd: string) => void;
  /** Opcional: abre el modal con el calendario del mes completo. */
  onAbrirModalCompleto?: () => void;
  /** Opcional: abre el detalle de un pedido al hacer clic. */
  onVerPedido?: (id: string) => void;
  className?: string;
}

/**
 * Widget de calendario semanal réplica del mockup oficial:
 * Cuadrícula de 7 días, nivel de ocupación y lista de pedidos programados para la fecha seleccionada.
 */
export const CalendarioSemanalWidget = observer(
  ({
    seleccion,
    onSeleccion,
    onAbrirModalCompleto,
    onVerPedido,
    className = "",
  }: CalendarioSemanalWidgetProps) => {
    const [fechaReferencia, setFechaReferencia] = useState<string>(() => seleccion || hoyYmd());
    const [horaActual, setHoraActual] = useState(() =>
      new Date().toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true })
    );

    useEffect(() => {
      const timer = setInterval(() => {
        setHoraActual(
          new Date().toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true })
        );
      }, 30000);
      return () => clearInterval(timer);
    }, []);

    useEffect(() => {
      if (seleccion) {
        setFechaReferencia(seleccion);
      }
    }, [seleccion]);

    const dias = diasDeLaSemana(fechaReferencia);
    const mesInfo = mesDeYmd(fechaReferencia);
    const tituloMes = `${MESES[mesInfo.month]} ${mesInfo.year}`;
    const esSemanaActual = dias.some((d) => esHoy(d));

    const anteriorSemana = () => {
      setFechaReferencia((prev) => sumarDias(prev, -7));
    };

    const siguienteSemana = () => {
      setFechaReferencia((prev) => sumarDias(prev, 7));
    };

    const irAHoy = () => {
      const hoy = hoyYmd();
      setFechaReferencia(hoy);
      onSeleccion(hoy);
    };

    // Pedidos programados para el día seleccionado
    const programados = pedidosStore.programadosDelDia(seleccion);
    // Pedidos recibidos en el día seleccionado (fallback para contexto si no hay programados)
    const recibidos = pedidosStore.recibidosEnDia(seleccion);

    return (
      <div
        className={`relative overflow-hidden rounded-3xl bg-[#190088] p-5 sm:p-6 text-white shadow-xl font-sans flex flex-col justify-between border border-white/10 ${className}`}
      >
        {/* Halos decorativos con la paleta oficial NECTO */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-[#97D6DF]/20 blur-2xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 size-44 rounded-full bg-[#FF3F1A]/15 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between h-full gap-3.5">
          {/* ── ENCABEZADO: TÍTULO MES + CONTROLES + HORA + CIUDAD ── */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Mes y año con botón de calendario */}
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white capitalize select-none">
                {tituloMes}
              </h2>
              {onAbrirModalCompleto && (
                <button
                  type="button"
                  onClick={onAbrirModalCompleto}
                  title="Ver mes completo"
                  className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Abrir calendario completo"
                >
                  <CalendarDaysIcon className="size-4.5" />
                </button>
              )}
            </div>

            {/* Navegación y pastillas de hora/ciudad */}
            <div className="flex items-center gap-2">
              {/* Botones redondos celestes */}
              <button
                type="button"
                onClick={anteriorSemana}
                title="Semana anterior"
                aria-label="Semana anterior"
                className="flex size-7.5 sm:size-8.5 items-center justify-center rounded-full bg-[#97D6DF] hover:bg-[#b0e8ee] active:scale-95 text-[#190088] shadow-sm transition-all cursor-pointer"
              >
                <ChevronLeftIcon className="size-4 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={siguienteSemana}
                title="Semana siguiente"
                aria-label="Semana siguiente"
                className="flex size-7.5 sm:size-8.5 items-center justify-center rounded-full bg-[#97D6DF] hover:bg-[#b0e8ee] active:scale-95 text-[#190088] shadow-sm transition-all cursor-pointer"
              >
                <ChevronRightIcon className="size-4 stroke-[2.5]" />
              </button>

              {/* Hora actual */}
              <div className="hidden sm:inline-flex items-center rounded-lg bg-white/10 border border-white/15 px-2.5 py-1 text-xs font-semibold text-white/90">
                {horaActual}
              </div>

              {/* Ciudad */}
              <div className="hidden sm:inline-flex items-center rounded-lg bg-white/10 border border-white/15 px-2.5 py-1 text-xs font-semibold text-white/90">
                Medellín
              </div>
            </div>
          </div>

          {/* ── CUADRÍCULA DE 7 DÍAS CON DIVISIONES Y ALTO CONTRASTE ── */}
          <div className="rounded-2xl border border-white/15 overflow-hidden bg-white/[0.03]">
            {/* Fila de etiquetas de día de la semana */}
            <div className="grid grid-cols-7 divide-x divide-white/15 border-b border-white/15 text-center">
              {DIAS_COLUMNAS.map((col) => (
                <div
                  key={col.key}
                  title={col.nombre}
                  className="py-1.5 text-xs sm:text-sm font-bold text-white select-none"
                >
                  {col.label}
                </div>
              ))}
            </div>

            {/* Fila de números de día */}
            <div className="grid grid-cols-7 divide-x divide-white/15 text-center">
              {dias.map((diaYmd) => {
                const numeroDia = parseInt(diaYmd.slice(8, 10), 10);
                const esSeleccionado = diaYmd === seleccion;
                const countProg = pedidosStore.countProgramadosDia(diaYmd);
                const countRecib = pedidosStore.recibidosEnDia(diaYmd).length;

                return (
                  <div
                    key={diaYmd}
                    onClick={() => onSeleccion(diaYmd)}
                    className="py-2 sm:py-2.5 px-0.5 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    {esSeleccionado ? (
                      <div className="relative flex size-8 sm:size-9 items-center justify-center rounded-full bg-[#FF3F1A] text-white font-extrabold text-sm sm:text-base shadow-[0_0_15px_rgba(255,63,26,0.65)] ring-2 ring-[#FF3F1A]/30">
                        <span>{numeroDia}</span>
                      </div>
                    ) : (
                      <span className="text-sm sm:text-base font-bold text-[#97D6DF] hover:text-white transition-colors">
                        {numeroDia}
                      </span>
                    )}

                    {/* Punto indicador si tiene pedidos */}
                    {!esSeleccionado && (countProg > 0 || countRecib > 0) && (
                      <span
                        className={`size-1 rounded-full mt-1 ${
                          countProg > 0 ? "bg-[#FF3F1A]" : "bg-[#97D6DF]"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── NIVEL DE OCUPACIÓN ── */}
          <div className="flex items-center gap-2.5 text-xs">
            <span className="font-semibold text-white/90 shrink-0 text-xs">Nivel de ocupación:</span>
            <div className="flex items-center gap-1 overflow-hidden py-0.5">
              <span className="h-2 w-10 sm:w-12 rounded-full bg-[#FF3F1A]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#991B1B]" />
              <span className="h-3 w-5 sm:w-6 rounded-md bg-[#97D6DF] shadow-xs" />
              <span className="h-2.5 w-2.5 rounded-sm bg-[#F59E0B]" />
              <span className="h-2 w-12 sm:w-14 rounded-sm bg-[#EAB308]" />
              <span className="h-2 w-8 sm:w-10 rounded-sm bg-[#10B981]" />
              <span className="h-2 w-8 sm:w-10 rounded-full bg-white/20" />
            </div>
          </div>

          {/* ── PEDIDOS PROGRAMADOS DEL DÍA ── */}
          <div className="pt-2 border-t border-white/15 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">
                Pedidos programados:
              </span>
              {programados.length > 0 && (
                <span className="text-[11px] font-bold text-[#97D6DF] bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                  {programados.length} en cola
                </span>
              )}
            </div>

            {programados.length > 0 ? (
              <div className="space-y-1">
                {programados.slice(0, 2).map((p, idx) => (
                  <div
                    key={p.id}
                    onClick={() => onVerPedido?.(p.id)}
                    className="flex items-center gap-2 text-xs text-white/95 hover:text-white cursor-pointer transition-colors group"
                  >
                    {idx % 2 === 0 ? (
                      <BellAlertIcon className="size-3.5 text-[#97D6DF] shrink-0" />
                    ) : (
                      <ClockIcon className="size-3.5 text-[#97D6DF] shrink-0" />
                    )}
                    <span className="font-mono font-bold text-[#97D6DF]">
                      {formatHora(p.programadoPara)}:
                    </span>
                    <span className="truncate group-hover:underline">
                      {p.numero} — {p.cliente} ({money(pedidosStore.totalPedido(p))})
                    </span>
                  </div>
                ))}
              </div>
            ) : recibidos.length > 0 ? (
              <div className="space-y-1">
                {recibidos.slice(0, 1).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => onVerPedido?.(p.id)}
                    className="flex items-center gap-2 text-xs text-white/90 hover:text-white cursor-pointer transition-colors group"
                  >
                    <ClockIcon className="size-3.5 text-[#97D6DF] shrink-0" />
                    <span className="font-mono font-semibold text-white/70">
                      {formatHora(p.createdAt)}:
                    </span>
                    <span className="truncate group-hover:underline">
                      {p.numero} — {p.cliente} ({money(pedidosStore.totalPedido(p))})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-white/60 py-0.5">
                <CheckCircleIcon className="size-3.5 text-[#97D6DF] shrink-0" />
                <span>Sin pedidos programados ni registrados para este día.</span>
              </div>
            )}
          </div>
        </div>

        {/* ── PIE: VOLVER A HOY SI SE NAVEGÓ FUERA ── */}
        {!esSemanaActual && (
          <div className="relative z-10 mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/70">
            <span>Visualizando otra semana</span>
            <button
              type="button"
              onClick={irAHoy}
              className="text-[#97D6DF] hover:text-white hover:underline font-bold cursor-pointer"
            >
              Volver a hoy
            </button>
          </div>
        )}
      </div>
    );
  }
);

export default CalendarioSemanalWidget;
