import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { pedidosStore } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS (mismo patrón que el calendario de Agendamiento)
// ═══════════════════════════════════════════════════════════════════════════

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const toYmd = (d: Date) => isoOf(d.getFullYear(), d.getMonth(), d.getDate());
const toHm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const todayYmd = () => toYmd(new Date());

/** Fecha legible "martes, 15 de septiembre". */
const fechaLegible = (ymd: string) =>
  new Date(`${ymd}T00:00:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

/** "02:30 p. m." desde "HH:mm". */
const horaLegible = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
};

/** Franjas horarias cada `stepMin` min entre `desde` y `hasta` (horas). */
const generarFranjas = (desde = 6, hasta = 22, stepMin = 60): string[] => {
  const out: string[] = [];
  for (let h = desde; h <= hasta; h++) {
    for (let m = 0; m < 60; m += stepMin) {
      if (h === hasta && m > 0) break;
      out.push(`${pad(h)}:${pad(m)}`);
    }
  }
  return out;
};
const FRANJAS = generarFranjas(6, 22, 60);

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export interface ProgramarModalProps {
  /** Fecha inicial (Date) para pre-seleccionar. */
  valorInicial?: Date | null;
  /** Cierra el modal sin confirmar. */
  onClose: () => void;
  /** Confirma con la fecha elegida (ISO). */
  onConfirmar: (iso: string) => void;
  /**
   * Opcional: al hacer click en una tarjeta de pedido ya programado del panel.
   * El contexto decide el destino (navegar al tablero, enfocar la tarjeta…).
   * Si no se pasa, las tarjetas del panel no son interactivas.
   */
  onVerPedido?: (id: string) => void;
}

/**
 * ProgramarModal — selector visual de fecha y hora para programar un pedido.
 *
 * Replica el calendario del módulo de Agendamiento: grid mensual manual con
 * puntos indicadores en los días que ya tienen pedidos programados, y un panel
 * lateral que muestra los pedidos programados de ese día más las franjas
 * horarias disponibles. Valida que la combinación fecha+hora sea futura.
 */
export const ProgramarModal = observer(({ valorInicial, onClose, onConfirmar, onVerPedido }: ProgramarModalProps) => {
  const now = new Date();
  const inicial = valorInicial ?? null;

  const [year, setYear] = useState(inicial ? inicial.getFullYear() : now.getFullYear());
  const [month, setMonth] = useState(inicial ? inicial.getMonth() : now.getMonth());
  const [selected, setSelected] = useState<string>(inicial ? toYmd(inicial) : todayYmd());
  const [hora, setHora] = useState<string>(inicial ? toHm(inicial) : "");

  // ── Grid del mes (Lun-first), idéntico a Agendamiento ──
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  const esDiaPasado = (iso: string) => iso < todayYmd();

  const franjaEsFutura = (hm: string): boolean => {
    const [h, m] = hm.split(":").map(Number);
    const cand = new Date(`${selected}T00:00:00`);
    cand.setHours(h, m, 0, 0);
    return cand.getTime() > Date.now();
  };

  const seleccionFutura = !!selected && !!hora && franjaEsFutura(hora);

  const confirmar = () => {
    if (!seleccionFutura) return;
    const [h, m] = hora.split(":").map(Number);
    const d = new Date(`${selected}T00:00:00`);
    d.setHours(h, m, 0, 0);
    onConfirmar(d.toISOString());
  };

  const programadosDia = pedidosStore.programadosDelDia(selected);

  return (
    <Modal isOpen onClose={onClose} className="max-w-4xl p-6 sm:p-8">
      {/* Encabezado */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">Programar pedido</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Elige el día y luego la hora de activación.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calendario (idéntico al de Agendamiento, con puntos por día) */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            {/* Nav de mes */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{MESES[month]} {year}</h3>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" aria-label="Mes anterior" onClick={prevMonth}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </Button>
                <Button size="icon" variant="outline" aria-label="Mes siguiente" onClick={nextMonth}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </Button>
              </div>
            </div>

            {/* Encabezados de día */}
            <div className="grid grid-cols-7 gap-1">
              {DIAS.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-semibold uppercase text-gray-400">{d}</div>
              ))}
            </div>

            {/* Celdas */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (d === null) return <div key={i} />;
                const iso = isoOf(year, month, d);
                const count = pedidosStore.countProgramadosDia(iso);
                const isToday = iso === todayYmd();
                const isSelected = iso === selected;
                const pasado = esDiaPasado(iso);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={pasado}
                    onClick={() => setSelected(iso)}
                    className={
                      "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border text-sm transition-colors " +
                      (isSelected
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                        : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50") +
                      (pasado ? " cursor-not-allowed opacity-40" : "")
                    }
                  >
                    <span className={
                      "flex h-8 w-8 items-center justify-center rounded-full " +
                      (isToday ? "bg-brand-500 font-semibold text-white" : "text-gray-700 dark:text-gray-200")
                    }>
                      {d}
                    </span>
                    {count > 0 && (
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: Math.min(count, 3) }).map((_, k) => (
                          <span key={k} className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel del día seleccionado */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-sm font-semibold capitalize text-gray-800 dark:text-white/90">{fechaLegible(selected)}</h3>
            <p className="mt-0.5 text-xs text-gray-400">
              {programadosDia.length} {programadosDia.length === 1 ? "pedido programado" : "pedidos programados"}
            </p>

            {/* Pedidos ya programados ese día (click → ver el pedido en el tablero) */}
            {programadosDia.length > 0 && (
              <div className="mt-4 space-y-2">
                {programadosDia.map((p) => {
                  const clickable = !!onVerPedido;
                  return (
                    <div
                      key={p.id}
                      role={clickable ? "button" : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      onClick={clickable ? () => onVerPedido!(p.id) : undefined}
                      onKeyDown={
                        clickable
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onVerPedido!(p.id);
                              }
                            }
                          : undefined
                      }
                      className={
                        "rounded-xl border border-gray-200 p-3 dark:border-gray-800 " +
                        (clickable
                          ? "cursor-pointer transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:hover:border-brand-700 dark:hover:bg-brand-500/5"
                          : "")
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          {p.programadoPara ? horaLegible(toHm(new Date(p.programadoPara))) : "—"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge size="xs" color="light">{pedidosStore.modalidadLabel(p.modalidad)}</Badge>
                          {clickable && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-gray-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 truncate text-sm text-gray-700 dark:text-gray-200">{p.numero} · {p.cliente}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Horarios disponibles */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Horarios disponibles</p>
              <div className="grid grid-cols-3 gap-2">
                {FRANJAS.map((hm) => {
                  const deshabilitada = !franjaEsFutura(hm);
                  const activa = hora === hm;
                  return (
                    <button
                      key={hm}
                      type="button"
                      disabled={deshabilitada}
                      onClick={() => setHora(hm)}
                      className={
                        "rounded-lg border py-2 text-sm transition-colors " +
                        (activa
                          ? "border-brand-500 bg-brand-500 font-medium text-white"
                          : deshabilitada
                          ? "cursor-not-allowed border-gray-100 text-gray-300 dark:border-gray-800 dark:text-gray-700"
                          : "border-gray-200 text-gray-700 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-brand-500/10")
                      }
                    >
                      {hm}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen + acciones */}
      <div className="mt-6 flex flex-col gap-4 border-t border-gray-100 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 shrink-0 text-brand-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {hora ? (
            <span className="font-medium capitalize text-gray-800 dark:text-white/90">
              {fechaLegible(selected)} · {horaLegible(hora)}
            </span>
          ) : (
            <span className="text-gray-400">Elige una hora para continuar</span>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!seleccionFutura} onClick={confirmar}>Confirmar programación</Button>
        </div>
      </div>
    </Modal>
  );
});

export default ProgramarModal;
