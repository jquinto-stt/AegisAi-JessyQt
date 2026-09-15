/**
 * Pedidos — Pulso del día, hora a hora.
 * ======================================
 *
 * Dos series por hora: lo que **entró** y lo que **se cerró**. Es la única pieza
 * del Panel que no navega, y por eso está dibujada como forma y no como cifras.
 *
 * ── Por qué aquí sí se admite un gráfico que no se pulsa ────────────────────
 *
 * ⚠️ La regla del Panel es que ninguna cifra se pinte sin poder pulsarse. Este
 * gráfico no la incumple porque no presenta cifras: presenta una **forma**. La
 * lectura se obtiene al pasar el cursor, y los tres totales del día, que sí son
 * cifras, están debajo y sí llevan a su lista.
 *
 * La distinción no es un tecnicismo: es la diferencia entre un dato que promete
 * una acción y un dibujo que ayuda a entender el día. Si algún día esta gráfica
 * empieza a mostrar cifras propias, esas cifras tendrán que ser puertas.
 *
 * ── Por qué Recharts y no las barras a mano ────────────────────────────────
 *
 * ⚠️ La versión anterior dibujaba cada columna con un `<span>` y un `height` en
 * porcentaje. Funcionaba, pero **no era un gráfico**: no tenía ejes, ni rejilla, ni
 * lectura al pasar el cursor, ni escalas, ni un eje Y que dijera cuánto es "alto".
 * Con dos series superpuestas en columnas de 18 px, sin eje, el operador no podía
 * responder la única pregunta que la gráfica existe para responder —¿a qué hora
 * entró más de lo que salió?—, porque todo lo que veía era un perfil.
 *
 * Recharts ya era dependencia del proyecto, así que no entra nada nuevo: entra el
 * mismo lenguaje visual de la plantilla de referencia —barras de esquina redondeada,
 * rejilla horizontal discontinua, ejes sin línea ni marcas, leyenda de puntos— pero
 * sobre los tokens de la casa, no sobre su paleta azul.
 *
 * ── Por qué no se pintan las 24 horas ───────────────────────────────────────
 *
 * Una tienda que abre de 8 a 20 tendría 18 columnas vacías aplastando las 6 que
 * dicen algo. `todayHours` devuelve ya recortado el tramo con actividad, y cuando
 * no hubo ninguna devuelve vacío: aquí se dice con una frase en vez de dibujar un
 * eje sin datos, que es lo que hace un gráfico cuando miente por omisión.
 *
 * ── Los colores, y por qué se leen del token ───────────────────────────────
 *
 * ⚠️ Recharts pinta el color de una serie como **atributo de presentación** SVG
 * (`fill="…"`), y ahí `var(--color-brand-500)` no es válido: un atributo de
 * presentación no acepta `var()`. Escribir el hex a mano sería el segundo sitio
 * donde se decide de qué color es la marca —y el día que el tema cambie, la
 * gráfica se quedaría con el color viejo sin que nadie lo note—, así que el valor
 * se **lee** del token en tiempo de ejecución y sólo cae al literal si el token no
 * está disponible. La rejilla y los ejes no lo necesitan: heredan `currentColor`
 * del contenedor, que sí es una clase de Tailwind y por tanto cambia con el tema.
 */

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HourBucket } from "../operational/order-operations";

export interface OrdersDayRhythmChartProps {
  buckets: HourBucket[];
  /** Qué se dice cuando hoy todavía no se movió nada. */
  empty: string;
}

/** `8` → `08:00`. La hora se lee en el eje, no en un tooltip. */
function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/**
 * El token del que sale el color de cada serie, con su literal de respaldo.
 *
 * ⚠️ El respaldo no es un color inventado: es el valor que el token tiene hoy. Si
 * el tema cambia y esto se queda atrás, se queda atrás en un solo sitio y con el
 * nombre del token escrito al lado, que es como se encuentra.
 */
const SERIES_COLOR = {
  entered: { token: "--color-brand-500", fallback: "#ff3f1a" },
  closed: { token: "--color-success-500", fallback: "#12b76a" },
} as const;

/** El valor de un token del tema, o su respaldo si el token no está. */
function readToken(token: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value || fallback;
}

/**
 * El color de las etiquetas de los ejes.
 *
 * ⚠️ Es un literal y no un token a propósito: Recharts pinta el rótulo del eje como
 * `<text fill="…">`, y ahí vuelve a aplicar la misma limitación que en las barras.
 * `#98a2b3` —el paso 400 de la escala de grises— es el único de la escala que se lee
 * igual de bien sobre el blanco y sobre el `secondary-950`, así que sirve a los dos
 * temas sin necesidad de saber en cuál estamos.
 */
const AXIS_TICK_FILL = "#98a2b3";

/** Los props que Recharts pasa a un contenido de tooltip. */
interface RhythmTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { dataKey?: string | number; value?: number | string }[];
}

/**
 * La lectura de una hora.
 *
 * ⚠️ No es un adorno: es lo que sustituye al eje Y en la pregunta concreta. El eje
 * dice "2", esto dice "a las 14:00 entraron 2 y se cerró 1", que es la frase que el
 * operador necesita para decidir si el día va cargado.
 */
function RhythmTooltip({ active, label, payload }: RhythmTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const valueOf = (key: string): number =>
    Number(payload.find(entry => entry.dataKey === key)?.value ?? 0);

  const rows = [
    { key: "entered", label: "Entraron", value: valueOf("entered") },
    { key: "closed", label: "Se cerraron", value: valueOf("closed") },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-theme-sm dark:border-gray-800 dark:bg-secondary-950">
      <p className="text-theme-xs font-semibold text-secondary-600 dark:text-white/90">{label}</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {rows.map(row => (
          <li
            key={row.key}
            className="flex items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400"
          >
            <span
              aria-hidden
              className="size-2 flex-none rounded-full"
              style={{
                backgroundColor:
                  row.key === "entered"
                    ? readToken(SERIES_COLOR.entered.token, SERIES_COLOR.entered.fallback)
                    : readToken(SERIES_COLOR.closed.token, SERIES_COLOR.closed.fallback),
              }}
            />
            {row.label}
            <span className="ml-4 font-semibold tabular-nums text-gray-700 dark:text-gray-200">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OrdersDayRhythmChart({ buckets, empty }: OrdersDayRhythmChartProps) {
  /**
   * ⚠️ Los colores y la duración de la animación se resuelven una sola vez. La
   * animación no es decorativa —dibuja la forma de izquierda a derecha, que es como
   * se lee una serie temporal—, pero con `prefers-reduced-motion` se apaga a cero en
   * vez de acortarse: aquí no hay ningún `animationend` que esperar.
   */
  const { colors, animationDuration } = useMemo(
    () => ({
      colors: {
        entered: readToken(SERIES_COLOR.entered.token, SERIES_COLOR.entered.fallback),
        closed: readToken(SERIES_COLOR.closed.token, SERIES_COLOR.closed.fallback),
      },
      animationDuration:
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 600,
    }),
    []
  );

  const data = useMemo(
    () =>
      buckets.map(bucket => ({
        hour: bucket.hour,
        label: hourLabel(bucket.hour),
        entered: bucket.entered,
        closed: bucket.closed,
      })),
    [buckets]
  );

  if (buckets.length === 0) {
    return (
      <p
        data-orders-day-empty
        className="rounded-xl border border-dashed border-gray-200 px-3.5 py-4 text-theme-xs text-gray-400 dark:border-gray-800 dark:text-gray-500"
      >
        {empty}
      </p>
    );
  }

  const totalEntered = buckets.reduce((sum, bucket) => sum + bucket.entered, 0);
  const totalClosed = buckets.reduce((sum, bucket) => sum + bucket.closed, 0);

  const legend = [
    { key: "entered", label: "Entraron", color: colors.entered },
    { key: "closed", label: "Se cerraron", color: colors.closed },
  ];

  return (
    <div data-orders-day-chart className="flex flex-col gap-3">
      {/*
       * ⚠️ El SVG va `aria-hidden` y la serie se publica en la lista de abajo. Un
       * gráfico de Recharts es un montón de `<path>` sin texto: para un lector de
       * pantalla no hay nada, y para quien lo lea con el teclado tampoco. La lista
       * no es un truco para la guarda: es la única versión de estos datos que un
       * lector de pantalla puede leer.
       */}
      <div className="h-[180px] w-full text-gray-200 dark:text-gray-800" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 2, bottom: 0, left: -20 }}
            barGap={2}
            barCategoryGap="28%"
          >
            {/* Sólo rejilla horizontal: una vertical por hora convertiría el gráfico
                en una cuadrícula y competiría con las barras, que son el dato. */}
            <CartesianGrid vertical={false} stroke="currentColor" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: AXIS_TICK_FILL }}
              tickMargin={6}
            />
            {/* Sin título y sin línea: el eje existe para dar la escala, no para
                llevar un rótulo. `allowDecimals={false}` porque aquí se cuentan
                órdenes, y "0,5 órdenes" no es una lectura posible. */}
            <YAxis
              width={30}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: AXIS_TICK_FILL }}
            />
            <Tooltip
              cursor={{ fill: "currentColor", opacity: 0.5 }}
              content={<RhythmTooltip />}
            />
            <Bar
              dataKey="entered"
              fill={colors.entered}
              radius={[5, 5, 0, 0]}
              maxBarSize={18}
              animationDuration={animationDuration}
              animationEasing="ease-out"
            />
            <Bar
              dataKey="closed"
              fill={colors.closed}
              radius={[5, 5, 0, 0]}
              maxBarSize={18}
              animationDuration={animationDuration}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/*
       * ⚠️ La leyenda se pinta a mano y no con `<Legend />` de Recharts porque el
       * texto de su leyenda no acepta clases de Tailwind: habría que darle el color
       * del tema a mano, que es justo lo que aquí se evita. Los puntos usan el mismo
       * color resuelto que las barras, así que no pueden desincronizarse.
       */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {legend.map(entry => (
          <span
            key={entry.key}
            className="flex items-center gap-1.5 text-theme-xs text-gray-500 dark:text-gray-400"
          >
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.label}
          </span>
        ))}
      </div>

      <ul className="sr-only">
        {data.map(row => (
          <li
            key={row.hour}
            data-orders-day-hour={row.hour}
            data-orders-day-entered={row.entered}
            data-orders-day-closed={row.closed}
          >
            {row.label}: entraron {row.entered}, se cerraron {row.closed}.
          </li>
        ))}
      </ul>

      <p className="sr-only">
        Pulso de hoy por horas: entraron {totalEntered} órdenes y se cerraron {totalClosed}, entre
        las {hourLabel(buckets[0].hour)} y las {hourLabel(buckets[buckets.length - 1].hour)}.
      </p>
    </div>
  );
}

export default OrdersDayRhythmChart;
