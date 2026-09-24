import { observer } from "mobx-react-lite";

import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { pedidosStore } from "@/stores";
import { puedeVerProgramados } from "@/stores/acceso.utils";
import { money } from "./widgets.comunes";
import {
  DIAS_SEMANA,
  construirRejillaMes,
  desplazarMes,
  esHoy,
  fechaLegible,
  hoyYmd,
  rangoDeMes,
  tituloMes,
  type MesCalendario,
} from "../inicio.calendario";

// ═══════════════════════════════════════════════════════════════════════════
// CALENDARIO DEL INICIO
// ═══════════════════════════════════════════════════════════════════════════
//
// El calendario es **el control del Inicio**, y está **guardado**, no a la
// vista: la pantalla no puede empezar con un mes entero ocupando el ancho, que
// es lo que pasaba cuando estaba desplegado. Se abre desde un botón pequeño en
// la cabecera y se cierra al elegir.
//
// ── Por qué un modal y no un popover ───────────────────────────────────────
//
// El `Popover` del catálogo tiene dos límites que aquí importan: ancho fijo de
// 300 px —una rejilla de 7 columnas ahí dentro queda de ~40 px por celda— y
// **no tiene modo controlado**, así que no se le puede cerrar al confirmar. Un
// `Modal` sí se cierra desde fuera. Y ya es el patrón de esta casa para elegir
// fecha: `ProgramarModal` es exactamente esto, un mes dentro de un modal.
//
// ── Mira hacia ATRÁS, y eso lo separa de `ProgramarModal` ──────────────────
//
// `ProgramarModal` programa: deshabilita el pasado y exige una hora futura.
// Este cuenta lo que ya pasó: no deshabilita nada, y un día futuro se atenúa
// porque no tiene nada que contar, no porque esté prohibido. Son la misma
// rejilla con la semántica invertida, y por eso no se comparten.
//
// ── Qué significa cada punto ───────────────────────────────────────────────
//
// Dos canales distintos, declarados en la leyenda, porque son dos preguntas
// distintas: los puntos NARANJAS son pedidos **recibidos** ese día (por
// `createdAt`, el mismo criterio que el gráfico y el KPI) y el punto ÍNDIGO es
// que ese día tiene pedidos **programados para** él (por `programadoPara`).
// Pintar los dos con el mismo color habría hecho creer que son lo mismo.
//
// ── Los programados exigen su capacidad ────────────────────────────────────
//
// `scheduled.read` gobierna todo lo programado en esta app. Sin esa capacidad
// los puntos índigos no se pintan y el resumen del mes no los cuenta: un
// indicador que se pinta siempre pero que el rol no puede abrir promete una
// sección que no existe. Los recibidos sí se pintan siempre, porque salen de
// `orders.read`, que es la capacidad que ya hace falta para ver esta pantalla.
//
// ═══════════════════════════════════════════════════════════════════════════

/** Máximo de puntos por celda: más de tres no se distinguen a simple vista. */
const MAX_PUNTOS = 3;

export interface CalendarioInicioWidgetProps {
  /** Mes que se está viendo. El estado vive en la página, no aquí. */
  mes: MesCalendario;
  /** Día seleccionado, "YYYY-MM-DD". */
  seleccion: string;
  onSeleccion: (ymd: string) => void;
  onMes: (mes: MesCalendario) => void;
}

/**
 * La rejilla y su resumen. **Sin superficie propia**: el `Modal` es la
 * superficie. Así el mismo contenido no arrastra un borde doble.
 */
export const CalendarioInicioWidget = observer(
  ({ mes, seleccion, onSeleccion, onMes }: CalendarioInicioWidgetProps) => {
    const hoy = hoyYmd();
    const celdas = construirRejillaMes(mes);
    const rango = rangoDeMes(mes);

    // ── Agregados del mes ────────────────────────────────────────────────────
    // Todo sale de getters del store. No hay una sola suma hecha a mano sobre
    // `pedidos`: el store es el dueño del bucketing por día local, y contarlo
    // aquí produciría un segundo número que puede discrepar del primero.
    const volumen = pedidosStore.volumenEntre(rango.desde, rango.hasta);
    const recibidosPorDia = new Map(volumen.map((v) => [v.fecha, v.total]));
    const recibidosMes = volumen.reduce((s, d) => s + d.total, 0);
    const ingresosMes = pedidosStore
      .ingresosEntre(rango.desde, rango.hasta)
      .reduce((s, d) => s + d.total, 0);

    const verProgramados = puedeVerProgramados();
    const programadosPorDia = new Map<string, number>();
    let programadosMes = 0;
    if (verProgramados) {
      for (const ymd of celdas) {
        if (!ymd) continue;
        const n = pedidosStore.countProgramadosDia(ymd);
        if (n > 0) programadosPorDia.set(ymd, n);
        programadosMes += n;
      }
    }

    return (
      <div>
        {/* Nav de mes */}
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink-title dark:text-white/90">{tituloMes(mes)}</h3>
          <div className="flex gap-2">
            {/* El nombre accesible va como HIJO, no como `aria-label`: el
                `Button` del catálogo tiene la interfaz de props cerrada y no
                reenvía atributos nativos, así que un `aria-label` aquí compila,
                se descarta y deja el botón sin nombre. Mismo patrón que
                `ProgramarModal` y `HistorialAtencionPage`. */}
            <Button size="icon" variant="outline" onClick={() => onMes(desplazarMes(mes, -1))}>
              <span className="sr-only">Mes anterior</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Button>
            <Button size="icon" variant="outline" onClick={() => onMes(desplazarMes(mes, 1))}>
              <span className="sr-only">Mes siguiente</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Rótulos de día. `DIAS_SEMANA[0]` es lunes y la rejilla también. */}
        <div className="grid grid-cols-7 gap-1">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="py-1.5 text-center text-xs font-semibold uppercase text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* Rejilla */}
        <div className="grid grid-cols-7 gap-1">
          {celdas.map((ymd, i) => {
            if (!ymd) return <div key={`hueco-${i}`} />;

            const recibidos = recibidosPorDia.get(ymd) ?? 0;
            const programados = programadosPorDia.get(ymd) ?? 0;
            const esSeleccionado = ymd === seleccion;
            const esDiaDeHoy = esHoy(ymd);
            const pasado = ymd < hoy;
            // Un día futuro no puede tener pedidos todavía. Se atenúa para no
            // sugerir que está vacío por falta de datos.
            const sinDatosAun = !pasado && !esDiaDeHoy;

            return (
              <button
                key={ymd}
                type="button"
                aria-pressed={esSeleccionado}
                aria-label={`${fechaLegible(ymd)}: ${recibidos} pedidos recibidos${
                  verProgramados ? `, ${programados} programados` : ""
                }`}
                title={
                  sinDatosAun
                    ? "Día por venir"
                    : `${recibidos} recibidos${programados > 0 ? ` · ${programados} programados` : ""}`
                }
                onClick={() => onSeleccion(ymd)}
                className={
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border text-sm transition-colors " +
                  (esSeleccionado
                    ? "border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10"
                    : "border-transparent hover:bg-gray-50 dark:hover:bg-white/[0.04]")
                }
              >
                <span
                  className={
                    "flex h-8 w-8 items-center justify-center rounded-full " +
                    (esDiaDeHoy
                      ? "bg-brand-500 font-semibold text-white"
                      : sinDatosAun
                        ? "text-gray-300 dark:text-gray-600"
                        : "text-gray-700 dark:text-gray-200")
                  }
                >
                  {Number(ymd.slice(8, 10))}
                </span>

                {/* Puntos: naranja = recibidos, índigo = programados para el día. */}
                {(recibidos > 0 || programados > 0) && (
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: Math.min(recibidos, MAX_PUNTOS) }).map((_, k) => (
                      <span key={`r${k}`} className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                    ))}
                    {programados > 0 && <span className="h-1.5 w-1.5 rounded-full bg-secondary-600" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Leyenda + resumen del mes */}
        <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              Recibidos
            </span>
            {verProgramados && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-secondary-600" />
                Programados para ese día
              </span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Recibidos</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-800 dark:text-white/90">
                {recibidosMes}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Programados</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-800 dark:text-white/90">
                {verProgramados ? programadosMes : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ingresos</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-800 dark:text-white/90">
                {money(ingresosMes)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// MODAL DEL CALENDARIO
// ═══════════════════════════════════════════════════════════════════════════

export interface CalendarioInicioModalProps extends CalendarioInicioWidgetProps {
  /** Vuelve al mes de hoy y selecciona hoy. */
  onHoy: () => void;
  onClose: () => void;
}

/**
 * El calendario dentro del modal que abre el botón de la cabecera.
 *
 * Elegir un día **no cierra**: se pueden mirar varios seguidos y el pie va
 * enseñando cuál está elegido. Se cierra con «Listo» o con Escape. Cerrar en
 * cada clic obligaría a reabrir para comparar dos días, que es justo lo que se
 * viene a hacer aquí.
 */
export const CalendarioInicioModal = observer(
  ({ mes, seleccion, onSeleccion, onMes, onHoy, onClose }: CalendarioInicioModalProps) => (
    <Modal isOpen onClose={onClose} className="max-w-3xl p-6 sm:p-8">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-ink-title dark:text-white/90">Elegir día</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          El día elegido manda en el resumen y en el gráfico de volumen.
        </p>
      </div>

      <CalendarioInicioWidget mes={mes} seleccion={seleccion} onSeleccion={onSeleccion} onMes={onMes} />

      <div className="mt-5 flex flex-col gap-4 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm capitalize text-gray-500 dark:text-gray-400">
          {fechaLegible(seleccion)}
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onHoy}>
            Hoy
          </Button>
          <Button size="sm" onClick={onClose}>
            Listo
          </Button>
        </div>
      </div>
    </Modal>
  ),
);

export default CalendarioInicioWidget;
