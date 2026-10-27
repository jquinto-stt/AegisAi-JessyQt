import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "motion/react";
import ApexCharts from "apexcharts";

/*
 * Motion de las gráficas del dashboard (estilos en `css/dashboard.css`).
 *
 * Cada gráfica se anima según lo que representa, sin adornos:
 *  - Entrada: las series temporales se trazan de izquierda a derecha, las barras
 *    crecen desde su base y los medidores se llenan. Solo en la primera visita de
 *    la sesión y cuando la gráfica entra a la vista — la de inventario suele
 *    estar bajo el pliegue y se perdería si arrancara al montar.
 *  - Interacción (foco y ocultado de series, lectura del segmento bajo el
 *    cursor): siempre activa, porque es respuesta a lo que hace el usuario.
 */

/** Lo que tarda una tarjeta `.dash-pieza` en aterrizar según su turno (ver dashboard.css). */
const aterrizajeMs = (orden: number) => 250 + orden * 110 + 450;

/**
 * ¿Ya se puede montar/animar la gráfica y con cuánto retardo? Fuera de la intro se
 * monta de inmediato; en la intro espera a estar a la vista y, si eso ocurre antes
 * de que su tarjeta aterrice, espera también a la tarjeta.
 */
function useEntrada(ref: React.RefObject<HTMLElement | null>, intro: boolean, orden: number, t0: number) {
  const enVista = useInView(ref, { once: true, amount: 0.3 });
  const retardo = useMemo(
    () => (enVista ? Math.max(0, aterrizajeMs(orden) - (performance.now() - t0)) : 0),
    // El retardo se fija en el instante en que la gráfica entra a la vista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enVista],
  );
  return { listo: !intro || enVista, animar: intro && enVista, retardo };
}

const varRetardo = (ms: number) => ({ "--retardo": `${ms}ms` }) as React.CSSProperties;

// ─── Barrido con escáner para las gráficas de ApexCharts ─────────────────────

/**
 * Monta la gráfica de ApexCharts cuando entra a la vista, para que su animación
 * propia (barras que crecen, áreas que suben) ocurra delante del usuario y no
 * fuera de pantalla o detrás de una tarjeta que aún aterriza. Con `trazar`, la
 * serie además se traza de izquierda a derecha, en el sentido en que se lee el
 * tiempo.
 */
export function GraficaRevelada({
  intro,
  orden,
  t0,
  alto,
  foco = null,
  trazar = false,
  className = "",
  children,
}: {
  intro: boolean;
  orden: number;
  t0: number;
  alto: number;
  /** Índice (0-based) de la serie enfocada en la leyenda; el resto se atenúa. */
  foco?: number | null;
  /** Revelar de izquierda a derecha (series temporales). */
  trazar?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { listo, animar, retardo } = useEntrada(ref, intro, orden, t0);

  return (
    <div
      ref={ref}
      className={`grafica-revelada ${animar && trazar ? "grafica-revelada--trazo" : ""} ${className}`}
      style={{ minHeight: alto, ...varRetardo(retardo) }}
      data-foco={foco === null ? undefined : foco + 1}
    >
      {listo && children}
    </div>
  );
}

// ─── Series interactivas (leyenda que enfoca y oculta) ───────────────────────

export interface SerieLeyenda {
  nombre: string;
  /** Clase Tailwind o color para el punto de la leyenda. */
  color: string;
}

/**
 * Estado de foco y visibilidad de las series de una gráfica de ApexCharts.
 * El foco se pinta con CSS (`data-foco` + el `rel` que Apex pone en cada serie),
 * la visibilidad con `toggleSeries`, que Apex anima por su cuenta.
 */
export function useSeriesInteractivas(graficaId: string, totalSeries: number, isDark: boolean) {
  const [ocultas, setOcultas] = useState<ReadonlySet<string>>(new Set());
  const [foco, setFoco] = useState<number | null>(null);

  // `Chart` remonta ApexCharts al cambiar de tema y vuelve a mostrar todo.
  useEffect(() => setOcultas(new Set()), [isDark]);

  // `toggleSeries` va fuera del actualizador de estado: en StrictMode React lo
  // ejecuta dos veces y la serie se ocultaría y volvería a mostrarse.
  const alternar = useCallback(
    (nombre: string) => {
      const ocultar = !ocultas.has(nombre);
      // Ocultar la última serie visible dejaría la gráfica vacía y sin forma de leerla.
      if (ocultar && ocultas.size >= totalSeries - 1) return;
      ApexCharts.exec(graficaId, "toggleSeries", nombre);
      const next = new Set(ocultas);
      if (ocultar) {
        next.add(nombre);
        setFoco(null);
      } else next.delete(nombre);
      setOcultas(next);
    },
    [graficaId, totalSeries, ocultas],
  );

  return { ocultas, foco, setFoco, alternar };
}

/** Pastillas de leyenda: pasar el cursor enfoca la serie, clic la oculta o muestra. */
export function LeyendaSeries({
  series,
  ocultas,
  onFoco,
  onAlternar,
}: {
  series: SerieLeyenda[];
  ocultas: ReadonlySet<string>;
  onFoco: (indice: number | null) => void;
  onAlternar: (nombre: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Series de la gráfica">
      {series.map((s, i) => {
        const oculta = ocultas.has(s.nombre);
        return (
          <button
            key={s.nombre}
            type="button"
            aria-pressed={!oculta}
            onClick={() => onAlternar(s.nombre)}
            onPointerEnter={(e) => e.pointerType === "mouse" && !oculta && onFoco(i)}
            onPointerLeave={() => onFoco(null)}
            onFocus={() => !oculta && onFoco(i)}
            onBlur={() => onFoco(null)}
            title={oculta ? `Mostrar ${s.nombre}` : `Ocultar ${s.nombre}`}
            className={`leyenda-serie inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-bold ${
              oculta
                ? "border-dashed border-[#212121]/20 text-[#212121]/40 dark:border-white/20 dark:text-white/40"
                : "border-[#ECECEC] bg-white text-[#212121] dark:border-white/10 dark:bg-white/5 dark:text-[#ECECEC]"
            }`}
          >
            <span
              className="leyenda-serie__punto h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: oculta ? "transparent" : s.color, boxShadow: `inset 0 0 0 2px ${s.color}` }}
            />
            <span className={oculta ? "line-through" : ""}>{s.nombre}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Mini-gráficas ───────────────────────────────────────────────────────────

/** Lectura bajo una mini-gráfica: aparece al enfocar un segmento. */
function PieMini({ lectura, periodo }: { lectura: { color: string; texto: string } | null; periodo: string }) {
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <span
        aria-live="polite"
        className={`mini-lectura inline-flex items-center gap-1.5 text-[12px] font-bold text-[#212121] dark:text-white ${
          lectura ? "mini-lectura--visible" : ""
        }`}
      >
        {lectura && (
          <>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: lectura.color }} />
            {lectura.texto}
          </>
        )}
      </span>
      <span className="text-[12px] font-normal text-[#212121]/50 dark:text-[#ECECEC]/50">{periodo}</span>
    </div>
  );
}

const GRUPOS_TICKS = [
  { cantidad: 13, color: "#465FFF", clase: "", etiqueta: "del total" },
  { cantidad: 15, color: "#38BDF8", clase: "", etiqueta: "del total" },
  { cantidad: 14, color: "#CBD5E1", clase: "bg-gray-200 dark:bg-white/20", etiqueta: "restante" },
];
const TICKS = GRUPOS_TICKS.flatMap((g, grupo) => Array.from({ length: g.cantidad }, () => grupo));

/**
 * Ticks verticales segmentados por color. Entran llenándose de izquierda a
 * derecha como un medidor y, al pasar el cursor (o arrastrar el dedo), el grupo
 * bajo el puntero se destaca con su porcentaje.
 */
export function SegmentedTickBar({ intro, orden, t0, periodo }: { intro: boolean; orden: number; t0: number; periodo: string }) {
  const caja = useRef<HTMLDivElement | null>(null);
  const centros = useRef<number[]>([]);
  const cuadro = useRef(0);
  const { listo, animar, retardo } = useEntrada(caja, intro, orden, t0);
  const [grupo, setGrupo] = useState<number | null>(null);

  useEffect(() => () => cancelAnimationFrame(cuadro.current), []);

  const medir = () => {
    const nodo = caja.current;
    if (!nodo) return;
    centros.current = Array.from(nodo.children, (el) => {
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2;
    });
  };

  const mover = (e: React.PointerEvent) => {
    const x = e.clientX;
    cancelAnimationFrame(cuadro.current);
    cuadro.current = requestAnimationFrame(() => {
      let cercano = 0;
      let minimo = Infinity;
      centros.current.forEach((centro, i) => {
        const d = Math.abs(centro - x);
        if (d < minimo) {
          minimo = d;
          cercano = i;
        }
      });
      setGrupo(TICKS[cercano]);
    });
  };

  const salir = () => {
    cancelAnimationFrame(cuadro.current);
    setGrupo(null);
  };

  const total = TICKS.length;
  const lectura =
    grupo === null
      ? null
      : {
          color: GRUPOS_TICKS[grupo].color,
          texto: `${Math.round((GRUPOS_TICKS[grupo].cantidad / total) * 100)}% ${GRUPOS_TICKS[grupo].etiqueta}`,
        };

  return (
    <>
      <div className="w-full -mx-1 py-0.5 overflow-hidden">
        <div
          ref={caja}
          onPointerEnter={medir}
          onPointerMove={mover}
          onPointerLeave={salir}
          data-foco={grupo ?? undefined}
          style={varRetardo(retardo)}
          className={`mini-ticks w-full h-[52px] flex items-center justify-between gap-[3px] sm:gap-[3.5px] px-0.5 touch-pan-y ${
            !listo ? "mini-ticks--espera" : animar ? "mini-ticks--intro" : ""
          }`}
        >
          {TICKS.map((g, i) => (
            <span
              key={i}
              data-grupo={g}
              className={`h-5 sm:h-5.5 w-[3.5px] sm:w-[4px] rounded-xs shrink-0 ${GRUPOS_TICKS[g].clase}`}
              style={{
                ...(GRUPOS_TICKS[g].clase ? {} : { backgroundColor: GRUPOS_TICKS[g].color }),
                ["--i" as string]: i,
              }}
            />
          ))}
        </div>
      </div>
      <PieMini lectura={lectura} periodo={periodo} />
    </>
  );
}

const SEGMENTOS_PASTILLA = [
  { pct: 32, color: "#5E77F9", clase: "bg-[#5E77F9]" },
  { pct: 23, color: "#56B8E6", clase: "bg-[#56B8E6]" },
  { pct: 11, color: "#989BF3", clase: "bg-[#989BF3]" },
  { pct: 13, color: "#E084D9", clase: "bg-[#E084D9]" },
  { pct: 7, color: "#5EE19D", clase: "bg-[#5EE19D]" },
  { pct: 14, color: "#CBD5E1", clase: "bg-gray-200 dark:bg-white/20", restante: true },
];

/**
 * Barra horizontal de pastillas. Entran llenándose de izquierda a derecha y, al
 * enfocar una (cursor, toque o teclado), las demás se atenúan y se lee su porcentaje.
 */
export function HorizontalPillBar({ intro, orden, t0, periodo }: { intro: boolean; orden: number; t0: number; periodo: string }) {
  const caja = useRef<HTMLDivElement | null>(null);
  const { listo, animar, retardo } = useEntrada(caja, intro, orden, t0);
  const [foco, setFoco] = useState<number | null>(null);

  const lectura =
    foco === null
      ? null
      : {
          color: SEGMENTOS_PASTILLA[foco].color,
          texto: `${SEGMENTOS_PASTILLA[foco].pct}% ${SEGMENTOS_PASTILLA[foco].restante ? "restante" : "del total"}`,
        };

  return (
    <>
      <div className="w-full -mx-1 py-0.5 overflow-hidden">
        <div
          ref={caja}
          data-foco={foco ?? undefined}
          onPointerLeave={() => setFoco(null)}
          style={varRetardo(retardo)}
          className={`mini-pastillas w-full h-[52px] flex items-center gap-1.5 sm:gap-2 px-0.5 ${
            !listo ? "mini-pastillas--espera" : animar ? "mini-pastillas--intro" : ""
          }`}
        >
          {SEGMENTOS_PASTILLA.map((seg, i) => (
            <div
              key={i}
              tabIndex={0}
              role="img"
              aria-label={`${seg.pct}% ${seg.restante ? "restante" : "del total"}`}
              data-activa={foco === i || undefined}
              onPointerEnter={() => setFoco(i)}
              onFocus={() => setFoco(i)}
              onBlur={() => setFoco(null)}
              style={{ width: `${seg.pct}%`, ["--i" as string]: i }}
              className={`h-5 sm:h-5.5 rounded-sm sm:rounded-md shrink-0 cursor-pointer outline-none ${seg.clase}`}
            />
          ))}
        </div>
      </div>
      <PieMini lectura={lectura} periodo={periodo} />
    </>
  );
}
