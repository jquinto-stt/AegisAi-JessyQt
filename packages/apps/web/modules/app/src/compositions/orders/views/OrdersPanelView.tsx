/**
 * Pedidos → Panel de pedidos (destino de entrada del módulo)
 * ==========================================================
 *
 * La pantalla con la que abre el módulo. No opera órdenes: **resume la operación
 * y lleva a donde sí se opera**.
 *
 * ── Por qué existe, y por qué antes no hacía falta ──────────────────────────
 *
 * ⚠️ Antes no existía, y en su lugar cada una de las cinco pantallas de trabajo
 * pintaba las mismas cuatro tarjetas de cifras en su cabecera. Eso no era un
 * resumen: era **el mismo** resumen cinco veces. "Por validar / Confirmadas /
 * Espera larga / En bandeja" aparecía idéntico encima de Alistamiento, de
 * Despacho y de Programados —pantallas cuyo universo no contiene ninguna orden
 * `PENDING`—, así que las cifras no respondían a la pregunta de ninguna fase y lo
 * único que hacían era ocupar la franja más valiosa de la pantalla y empujar hacia
 * abajo la lista, que es lo único que allí se opera.
 *
 * ⚠️ Y no se arreglaba poniendo cifras **distintas** en cada una. Una cifra sólo
 * tiene sentido donde se puede accionar, y una cabecera de pantalla no acciona
 * nada: informa y se queda ahí. El resumen pertenece a **una** pantalla, y es esta.
 *
 * ── La regla que sostiene todo esto ─────────────────────────────────────────
 *
 * ⚠️ **Aquí no hay ninguna cifra que no se pueda pulsar.** Cada número de esta
 * pantalla es una puerta a la lista que lo resuelve. Es la diferencia entre un
 * panel y un cuadro de mando: el cuadro de mando se mira, el panel se usa.
 *
 * ⚠️ La única excepción es la **forma** del gráfico horario, y no es una grieta en
 * la regla: un dibujo no es una cifra. Sus tres totales —los que sí se leen como
 * números— están debajo y sí llevan a su lista.
 *
 * ── Las tres capas, y por qué están en este orden ───────────────────────────
 *
 * 1. **Requiere tu atención** — lo urgente, como **filas accionables**. Cada fila
 *    dice qué pasa, cuántas órdenes son y **a dónde se va a resolverlas**, y al
 *    pulsarla la pantalla destino abre con esa fase ya puesta. Sólo aparece lo que
 *    tiene cifra: cuatro ceros no son información, son ruido con forma de dato.
 *
 * 2. **Cómo está repartido** — la forma de la operación, en barras donde **cada
 *    tramo es una puerta**: el flujo por estado y el reparto por canal de origen.
 *    Debajo, los siete destinos con su cifra viva, que son el atajo de siempre.
 *
 * 3. **Cómo va el día** — el pulso horario y sus tres totales. Va al final y en un
 *    solo bloque discreto: es contexto, no trabajo.
 *
 * ⚠️ La jerarquía es la del trabajo, no la del interés: lo que hay que hacer hoy
 * arriba, la navegación en medio, el contexto abajo. Un panel que empieza por el
 * ritmo del día obliga a leer tres bloques antes de saber si hay algo urgente.
 *
 * ── Por qué ya no hay conmutador de vistas ─────────────────────────────────
 *
 * ⚠️ Esta pantalla llegó a tener un selector "Completo / Métricas y gráficos /
 * Operativo" que separaba dos mitades de lo mismo. Era un error: las métricas de un
 * panel de pedidos **no son un informe**, son las mismas colas que se operan
 * miradas de otra forma. Separarlas obligaba a elegir entre saber cuánto hay y
 * poder ir a por ello, y en la vista "Operativo" las cifras volvían a ser tarjetas
 * que no llevaban a ningún sitio.
 *
 * ⚠️ Y la mitad analítica **inventaba sus datos**: `counts.whatsapp || 14`, un
 * `factor = 1.4` de fin de semana y un `+12.5%` escrito a mano. Sobre un panel de
 * pedidos eso no es un detalle de acabado: es afirmar cosas falsas sobre el
 * negocio de alguien. Todo lo que se pinta aquí sale de `order-operations`, medido
 * sobre las órdenes reales de la sede.
 */

import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  AlarmClock,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Hourglass,
  PackageCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { OPEN_ORDER_STATUSES } from "@/contracts/order.contract";
import { Card } from "@/elements";
import { cn } from "@/utils";
import { useOrders } from "../context/OrdersContext";
import { useFlowSettings } from "../operational/flow-settings";
import {
  attentionItems,
  channelFlow,
  destinationFigures,
  stageFlow,
  todayHours,
  todayRhythm,
} from "../operational/order-operations";
import type {
  AttentionKey,
  DashboardTarget,
  TodayRhythm,
} from "../operational/order-operations";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "../order-status.constants";
import type { OrderStatusTone } from "../order-status.constants";
import { formatSourceLabel } from "../order-presentation.utils";
import { ORDERS_SECTION_META } from "../shared/orders-destinations";
import type { OrdersSectionMeta } from "../shared/orders-destinations";
import { OrdersScreenHeader } from "../shared/OrdersScreenHeader";
import { OrdersFlowBar } from "../shared/OrdersFlowBar";
import type { FlowBarSegment } from "../shared/OrdersFlowBar";
import { OrdersDayRhythmChart } from "../shared/OrdersDayRhythmChart";
import { OrdersAnalyticsSection } from "./OrdersAnalyticsSection";

export interface OrdersPanelViewProps {
  /**
   * Lleva a un destino, opcionalmente con una fase ya elegida.
   *
   * ⚠️ La fase viaja con el destino porque es lo que hace accionable la cifra: si
   * el operador pulsa "3 demoradas" y aterriza en Alistamiento sin el filtro
   * puesto, tiene que volver a buscar a mano las tres órdenes que le acabamos de
   * contar. Quien resuelve el salto es el shell, que es quien posee la navegación.
   */
  onNavigate: (target: DashboardTarget, phase?: string) => void;
}

/* ── Presentación de cada condición de atención ────────────────────────────── */

/**
 * El icono de cada condición.
 *
 * ⚠️ `Record<AttentionKey, …>` y no un `switch` con `default`: así, el día que se
 * añada una condición a `attentionItems`, esto **no compila** hasta darle icono.
 * Un `default` la habría pintado con un icono genérico y nadie se habría enterado.
 */
const ATTENTION_ICONS: Record<AttentionKey, LucideIcon> = {
  staleInbox: Hourglass,
  latePreparation: AlarmClock,
  unsentReady: PackageCheck,
  overdueScheduled: CalendarClock,
};

/* ── Color de cada tramo de las barras ─────────────────────────────────────── */

/**
 * El relleno de un tramo del flujo, leído de su **tono de estado**.
 *
 * ⚠️ No hay una tabla de colores por estado: hay una de tonos —que ya existe en
 * `order-status.constants.ts` y es la que decide qué significa cada estado— y esto
 * sólo la traduce a clases. Escribir aquí `PENDING: gris, CONFIRMED: azul…` sería
 * el segundo sitio donde se decide qué significa un estado, y el día que cambie el
 * primero este se quedaría atrás sin que nadie lo note.
 *
 * ⚠️ Todos los rellenos son de paso 400–500 porque el rótulo va en blanco encima.
 */
const TONE_FILL: Record<OrderStatusTone, string> = {
  neutral: "bg-gray-400 dark:bg-gray-500",
  accent: "bg-secondary-500 dark:bg-secondary-400",
  progress: "bg-brand-500 dark:bg-brand-400",
  success: "bg-success-500 dark:bg-success-400",
  danger: "bg-error-500 dark:bg-error-400",
};

/**
 * El relleno de cada canal de origen.
 *
 * ⚠️ El vocabulario de canales es **abierto** (§18), así que esto es un mapa con
 * respaldo y no un `Record` cerrado: un canal que no esté aquí se pinta en gris y
 * sigue funcionando. Lo que **no** se hace es inventarle un color fijo por
 * posición en la lista —eso haría que el color de un canal cambiara al aparecer
 * otro, y el operador leería un cambio de negocio donde sólo hubo un reordenamiento.
 *
 * ⚠️ WhatsApp lleva su propio verde a propósito: es el color con el que el
 * operador ya reconoce el canal en el resto de la aplicación.
 */
const CHANNEL_FILL: Record<string, string> = {
  WHATSAPP: "bg-whatsapp-500 dark:bg-whatsapp-600",
  POS: "bg-secondary-500 dark:bg-secondary-400",
  WEB: "bg-brand-500 dark:bg-brand-400",
  COUNTER: "bg-gray-500 dark:bg-gray-400",
  API: "bg-success-500 dark:bg-success-400",
};
const CHANNEL_FILL_FALLBACK = "bg-gray-400 dark:bg-gray-500";

/* ── Lectura del día ───────────────────────────────────────────────────────── */

/**
 * Qué significan los tres números del día, en una frase.
 *
 * ⚠️ Vive en la vista y no en `order-operations` porque **no calcula nada**: los
 * tres números ya vienen medidos. Esto sólo los interpreta, y una interpretación
 * es redacción — cambia con el tono de la casa, no con el dominio.
 */
function dayReading({ entered, completed, cancelled }: TodayRhythm): string {
  if (entered === 0 && completed === 0 && cancelled === 0) {
    return "Todavía no se movió nada hoy.";
  }

  // ⚠️ «Cerrada» incluye la cancelación, igual que la leyenda verde del gráfico
  // —que es `completed + cancelled`—. La versión anterior restaba sólo
  // `completed`, así que la frase decía «entraron 18 más de las que se cerraron»
  // justo debajo de un gráfico cuya serie «Se cerraron» valía 3. Una orden
  // cancelada también sale de la cola: dejarla fuera del balance inflaba el
  // crecimiento con trabajo que nadie va a hacer.
  const closed = completed + cancelled;
  const net = entered - closed;
  const readings: string[] = [];

  if (net > 0) {
    readings.push(
      `La cola creció: entraron ${net} ${net === 1 ? "orden" : "órdenes"} más de las que se cerraron.`
    );
  } else if (net < 0) {
    readings.push(
      `La cola bajó: se cerraron ${-net} ${-net === 1 ? "orden" : "órdenes"} más de las que entraron.`
    );
  } else {
    readings.push("Entró y se cerró lo mismo: la cola se mantuvo.");
  }

  // Se enuncia como desglose de lo cerrado, no como una cifra que se suma al
  // balance: la cancelación ya está dentro de `closed`.
  if (cancelled > 0) {
    readings.push(
      cancelled === 1
        ? `De lo cerrado, ${cancelled} fue cancelación.`
        : `De lo cerrado, ${cancelled} fueron cancelaciones.`
    );
  }

  return readings.join(" ");
}

/** `3` → `3 órdenes`. Para las etiquetas accesibles de los tramos. */
function pluralOrders(count: number): string {
  return `${count} ${count === 1 ? "orden" : "órdenes"}`;
}

/* ── Piezas de la pantalla ─────────────────────────────────────────────────── */

/** Rótulo de bloque, con una pista opcional que explica el criterio de lectura. */
function PanelBlock({
  title,
  hint,
  anchor,
  children,
}: {
  title: string;
  hint?: string;
  anchor: string;
  children: ReactNode;
}) {
  return (
    <section data-orders-panel-block={anchor} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h3 className="text-theme-sm font-semibold text-secondary-600 dark:text-white/90">
          {title}
        </h3>
        {hint ? (
          <span className="text-theme-xs text-gray-400 dark:text-gray-500">{hint}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Rótulo de una barra: qué es y cuánto suma. */
function BarHeading({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <h4 className="text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </h4>
      <span className="text-theme-xs text-gray-400 dark:text-gray-500">{note}</span>
    </div>
  );
}

/* ── Vista ─────────────────────────────────────────────────────────────────── */

export function OrdersPanelView({ onNavigate }: OrdersPanelViewProps) {
  const { orders } = useOrders();
  const { settings } = useFlowSettings();
  const { stagnationMinutes, inboxWaitMinutes } = settings;

  const attention = useMemo(
    () => attentionItems(orders, { stagnationMinutes, inboxWaitMinutes }),
    [orders, stagnationMinutes, inboxWaitMinutes]
  );

  /**
   * ⚠️ Sólo se pintan las condiciones con cifra. Un "0" en una fila que existe
   * para reclamar atención no informa de nada y compite visualmente con las que sí
   * la reclaman; el caso "ninguna" se dice **una vez**, con una frase, no cuatro.
   */
  const pending = attention.filter(item => item.count > 0);

  /**
   * ⚠️ La barra se escala contra la condición **mayor**, no contra el total de
   * órdenes: sirve para comparar las condiciones entre sí —cuál pesa más—, y
   * medirlas contra el total las dejaría a todas en una franja invisible.
   */
  const heaviestAttention = Math.max(1, ...pending.map(item => item.count));

  const figures = useMemo(
    () => destinationFigures(orders, { stagnationMinutes }),
    [orders, stagnationMinutes]
  );

  const rhythm = useMemo(() => todayRhythm(orders), [orders]);
  const hours = useMemo(() => todayHours(orders), [orders]);

  const stages = useMemo(() => stageFlow(orders), [orders]);
  const sources = useMemo(() => channelFlow(orders, formatSourceLabel), [orders]);

  const liveCount = useMemo(
    () => orders.filter(order => !["COMPLETED", "CANCELLED", "RETURNED"].includes(order.status)).length,
    [orders]
  );

  /**
   * Los destinos que ofrece el bloque de atajos: todos menos este mismo panel.
   *
   * ⚠️ El predicado de tipo no es decoración. `ORDERS_SECTION_META` incluye
   * `"panel"` y `destinationFigures` **no** lo mide —no tiene sentido contar el
   * panel desde el panel—, así que sin estrechar el tipo aquí, indexar las cifras
   * con la clave ancha no compilaría. Y estrecharlo es también la forma de dejar
   * escrito el porqué: el panel no se enlaza a sí mismo.
   */
  const destinations = useMemo(
    () =>
      ORDERS_SECTION_META.filter(
        (meta): meta is OrdersSectionMeta & { key: DashboardTarget } => meta.key !== "panel"
      ),
    []
  );

  const labelOf = (key: DashboardTarget): string =>
    ORDERS_SECTION_META.find(meta => meta.key === key)?.shortLabel ?? key;

  const fullLabelOf = (key: DashboardTarget): string =>
    ORDERS_SECTION_META.find(meta => meta.key === key)?.label ?? key;

  const allClear =
    orders.length === 0
      ? "Todavía no hay órdenes. Cuando entren, aquí aparecerán las que se estén pasando de tiempo."
      : "Ninguna orden se está pasando de tiempo: todo va dentro del ritmo que fijaste.";

  /* ── Los tramos de las dos barras ───────────────────────────────────────── */

  /**
   * ⚠️ La barra de flujo muestra **sólo el trabajo vivo**, no el ciclo completo.
   *
   * Se probó con los nueve estados y el resultado era peor por dos razones a la
   * vez. La primera es de espacio: nueve tramos obligan a que los pequeños caigan
   * por debajo del ancho mínimo legible y el rótulo se corta —"Devuelta" quedaba en
   * "Dev…"—, con lo que el gráfico deja de poder leerse justo en los tramos que
   * menos órdenes tienen. La segunda es de significado: una orden completada o
   * cancelada **no está en el flujo**, es el resultado del día, y mezclarla con las
   * que sí esperan trabajo hace que la barra responda a dos preguntas distintas.
   *
   * Lo cerrado ya se cuenta donde corresponde: en los atajos (Historial) y en el
   * bloque del día, que separa completadas de canceladas.
   */
  const liveStages = stages.filter(
    segment => OPEN_ORDER_STATUSES.includes(segment.status) && segment.count > 0
  );

  const stageSegments: FlowBarSegment[] = liveStages.map(segment => ({
    key: segment.status,
    label: ORDER_STATUS_LABELS[segment.status],
    count: segment.count,
    fill: TONE_FILL[ORDER_STATUS_TONES[segment.status]],
    ariaLabel: `${ORDER_STATUS_LABELS[segment.status]}: ${pluralOrders(
      segment.count
    )}. Abrir ${fullLabelOf(segment.target)}.`,
  }));

  const sourceSegments: FlowBarSegment[] = sources.map(segment => ({
    key: segment.key,
    label: segment.label,
    count: segment.count,
    fill: CHANNEL_FILL[segment.key] ?? CHANNEL_FILL_FALLBACK,
    ariaLabel: `${segment.label}: ${pluralOrders(segment.count)}. Abrir Canales de origen.`,
  }));

  /* ── Los tres totales del día, cada uno con su puerta ───────────────────── */

  const rhythmFigures = [
    {
      key: "entered",
      label: "Entraron",
      value: rhythm.entered,
      // ⚠️ Este no lleva fase a propósito: lo que entró hoy no está todo en una
      // fase —parte ya se cerró—, así que prometer un filtro sería mentir. Lleva a
      // la bandeja, que es donde se triagea lo que va entrando.
      target: "bandeja" as DashboardTarget,
      phase: undefined,
      hint: "Ir a la bandeja de entrada",
    },
    {
      key: "completed",
      label: "Completadas",
      value: rhythm.completed,
      target: "historial" as DashboardTarget,
      phase: "completed",
      hint: "Ver las completadas de hoy en el historial",
    },
    {
      key: "cancelled",
      label: "Canceladas",
      value: rhythm.cancelled,
      target: "historial" as DashboardTarget,
      phase: "cancelled",
      hint: "Ver las canceladas de hoy en el historial",
    },
  ];

  return (
    <div data-orders-panel className="flex flex-col gap-8">
      <OrdersScreenHeader
        title="Panel de pedidos"
        description="Todo lo que tu operación tiene entre manos, y la puerta a donde se resuelve. Cada tramo de los gráficos abre la lista que representa."
      />

      {/* ── 1. Lo urgente ──────────────────────────────────────────────────── */}
      <PanelBlock
        anchor="attention"
        title="Requiere tu atención"
        hint={pending.length > 0 ? "por orden de trabajo" : undefined}
      >
        {pending.length === 0 ? (
          // ⚠️ El caso "nada" se dice una vez y en voz baja. Repetir las cuatro
          // condiciones con un cero cada una sería el mismo error que estas filas
          // vienen a corregir: cuatro cifras que no dicen nada.
          <div
            data-orders-attention-clear
            className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <CheckCircle2
              className="mt-0.5 size-4 flex-none text-success-600 dark:text-success-500"
              aria-hidden
            />
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">{allClear}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {pending.map((item, index) => {
              const Icon = ATTENTION_ICONS[item.key];
              const isDanger = item.tone === "danger";
              return (
                <li key={item.key} className="animate-fade-in" style={{ animationDelay: `${index * 60}ms` }}>
                  <button
                    type="button"
                    data-orders-attention={item.key}
                    data-orders-attention-count={item.count}
                    data-orders-attention-target={item.target}
                    data-orders-attention-phase={item.phase}
                    onClick={() => onNavigate(item.target, item.phase)}
                    className={cn(
                      "group relative flex w-full cursor-pointer items-center gap-3.5 overflow-hidden rounded-xl border bg-white p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-theme-sm dark:bg-white/[0.03]",
                      isDanger
                        ? "border-error-200 hover:border-error-300 dark:border-error-500/25 dark:hover:border-error-500/40"
                        : "border-warning-200 hover:border-warning-300 dark:border-warning-500/25 dark:hover:border-warning-500/40"
                    )}
                  >
                    {/*
                     * ⚠️ La barra de peso va **detrás** del contenido y al ras del
                     * borde inferior. Es lo que convierte cuatro filas sueltas en
                     * una comparación: dice de un vistazo qué condición pesa más,
                     * que es la pregunta que el operador se hace al elegir por
                     * dónde empieza. Su ancho se anima al montar.
                     */}
                    <span
                      aria-hidden
                      style={{ width: `${(item.count / heaviestAttention) * 100}%` }}
                      className={cn(
                        "absolute bottom-0 left-0 h-0.5 rounded-full",
                        isDanger ? "bg-error-400 dark:bg-error-500" : "bg-warning-400 dark:bg-warning-500"
                      )}
                    />

                    <span
                      className={cn(
                        "flex size-10 flex-none items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
                        isDanger
                          ? "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500"
                          : "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500"
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-theme-sm font-semibold text-secondary-600 dark:text-white/90">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
                        {item.detail}
                      </span>
                    </span>

                    <span className="flex flex-none items-center gap-3">
                      <span
                        className={cn(
                          "text-theme-xl font-bold tabular-nums",
                          isDanger
                            ? "text-error-600 dark:text-error-500"
                            : "text-warning-600 dark:text-warning-500"
                        )}
                      >
                        {item.count}
                      </span>
                      {/* A dónde lleva. Va oculto en móvil: ahí el espacio es del
                          rótulo y la cifra, y el destino se descubre al pulsar. */}
                      <span className="hidden items-center gap-1.5 text-theme-xs font-medium text-gray-400 sm:flex dark:text-gray-500">
                        {labelOf(item.target)}
                        <ArrowRight
                          className="size-3.5 transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PanelBlock>

      {/* ── 2. Tus pantallas operativas (lo que el operador viene a buscar) ─ */}
      <PanelBlock anchor="destinations" title="Tus pantallas" hint="cada una con lo que tiene en cola">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {destinations.map((meta, index) => {
            const Icon = meta.icon;
            const figure = figures[meta.key];
            return (
              <button
                key={meta.key}
                type="button"
                data-orders-shortcut={meta.key}
                data-orders-shortcut-value={figure.value}
                onClick={() => onNavigate(meta.key)}
                style={{ animationDelay: `${index * 40}ms` }}
                className="group animate-fade-in flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/40"
              >
                <span className="flex size-10 flex-none items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors group-hover:bg-brand-50 group-hover:text-brand-500 dark:bg-gray-800 dark:text-gray-400 dark:group-hover:bg-brand-500/15 dark:group-hover:text-brand-400">
                  <Icon className="size-5" aria-hidden />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-theme-sm font-semibold text-secondary-600 dark:text-white/90">
                    {meta.shortLabel}
                  </span>
                  <span className="mt-0.5 block text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    {meta.purpose}
                  </span>
                </span>

                <span className="flex flex-none flex-col items-end">
                  <span className="text-theme-xl font-bold tabular-nums text-gray-800 dark:text-white/90">
                    {figure.value}
                  </span>
                  <span className="text-theme-xs font-medium text-gray-400 dark:text-gray-500">
                    {figure.unit}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </PanelBlock>

      {/* ── 3. El contexto ─────────────────────────────────────────────────── */}
      <PanelBlock anchor="rhythm" title="Cómo va el día" hint="hora a hora, y su puerta">
        <Card className="flex flex-col gap-5 p-5">
          <OrdersDayRhythmChart
            buckets={hours}
            empty="Hoy todavía no se movió nada: ni una orden entró ni se cerró ninguna."
          />

          {/*
           * ⚠️ Los tres totales son **botones**, no cifras pintadas. Completadas y
           * canceladas llevan su fase —el historial sabe contar exactamente esas
           * dos— y entraron no la lleva porque lo que entró hoy está repartido por
           * todo el flujo y ningún filtro lo aísla.
           */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 pt-4 dark:divide-gray-800 dark:border-gray-800">
            {rhythmFigures.map(figure => (
              <button
                key={figure.key}
                type="button"
                data-orders-rhythm={figure.key}
                data-orders-rhythm-value={figure.value}
                aria-label={`${figure.label} hoy: ${figure.value}. ${figure.hint}.`}
                onClick={() => onNavigate(figure.target, figure.phase)}
                className="group flex cursor-pointer flex-col gap-1 rounded-lg px-4 text-left transition-colors first:pl-0 last:pr-0 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
              >
                <span className="flex items-center gap-1 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {figure.label}
                  <ArrowRight
                    className="size-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                    aria-hidden
                  />
                </span>
                <span className="text-theme-xl font-bold tabular-nums text-gray-800 dark:text-white/90">
                  {figure.value}
                </span>
              </button>
            ))}
          </div>

          <p
            data-orders-day-reading
            className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400"
          >
            {dayReading(rhythm)}
          </p>
        </Card>
      </PanelBlock>

      {/* ── 4. Dashboard Inteligente TailAdmin (12 columnas) ───────────────── */}
      <PanelBlock
        anchor="analytics"
        title="Métricas de Rendimiento y Análisis"
        hint="inteligencia de datos TailAdmin"
      >
        <OrdersAnalyticsSection
          orders={orders}
          onNavigateToSection={(key) => onNavigate(key as DashboardTarget)}
        />
      </PanelBlock>
    </div>
  );
}

export default OrdersPanelView;
