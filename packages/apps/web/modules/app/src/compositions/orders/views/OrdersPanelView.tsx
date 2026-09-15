/**
 * Pedidos → Panel de pedidos (destino de entrada del módulo)
 * ==========================================================
 *
 * La pantalla con la que abre el módulo. No opera órdenes: **resume el día y
 * lleva a donde sí se opera**.
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
 * ── Las tres capas, y por qué están en este orden ───────────────────────────
 *
 * 1. **Requiere tu atención** — lo urgente, como **filas accionables** y no como
 *    tarjetas. Cada fila dice qué pasa, cuántas órdenes son y **a dónde se va a
 *    resolverlas**, y al pulsarla la pantalla destino abre con esa fase ya puesta.
 *    Sólo aparece lo que tiene cifra: cuatro ceros no son información, son ruido
 *    con forma de dato.
 *
 * 2. **Tus pantallas** — los siete destinos con **una** cifra viva cada uno. Es el
 *    atajo que el operador venía a buscar: no "¿cuánto tengo?", sino "¿dónde
 *    tengo?".
 *
 * 3. **Ritmo de hoy** — lo ambiental, deliberadamente al final y en un solo bloque
 *    discreto: cuánto entró, cuánto se cerró y cuánto se canceló. Va acompañado de
 *    su **lectura** —si la cola creció o bajó—, porque tres números sueltos no
 *    dicen si el día va bien.
 *
 * ⚠️ La jerarquía es la del trabajo, no la del interés: lo que hay que hacer hoy
 * arriba, la navegación en medio, el contexto abajo. Un panel que empieza por el
 * ritmo del día obliga a leer tres bloques antes de saber si hay algo urgente.
 *
 * ── La regla que sostiene todo esto ─────────────────────────────────────────
 *
 * ⚠️ **Aquí no hay ninguna cifra que no se pueda pulsar.** Cada número de esta
 * pantalla es una puerta a la lista que lo resuelve. Es la diferencia entre un
 * panel y un cuadro de mando: el cuadro de mando se mira, el panel se usa. Si
 * algún día se añade una cifra que no lleva a ningún sitio, deja de ser este
 * bloque y pasa a ser la decoración que esta pantalla vino a retirar.
 */

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlarmClock,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Hourglass,
  LayoutDashboard,
  PackageCheck,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/elements";
import { cn } from "@/utils";
import { useOrders } from "../context/OrdersContext";
import { useFlowSettings } from "../operational/flow-settings";
import {
  attentionItems,
  destinationFigures,
  todayRhythm,
} from "../operational/order-operations";
import type {
  AttentionKey,
  DashboardTarget,
  TodayRhythm,
} from "../operational/order-operations";
import { ORDERS_SECTION_META } from "../shared/orders-destinations";
import type { OrdersSectionMeta } from "../shared/orders-destinations";
import { OrdersScreenHeader } from "../shared/OrdersScreenHeader";
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

  const net = entered - completed;
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

  if (cancelled > 0) {
    readings.push(
      `${cancelled} ${cancelled === 1 ? "cancelación" : "cancelaciones"}.`
    );
  }

  return readings.join(" ");
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

  const figures = useMemo(
    () => destinationFigures(orders, { stagnationMinutes }),
    [orders, stagnationMinutes]
  );

  const rhythm = useMemo(() => todayRhythm(orders), [orders]);

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
        (meta): meta is OrdersSectionMeta & { key: DashboardTarget } =>
          meta.key !== "panel"
      ),
    []
  );

  const labelOf = (key: DashboardTarget): string =>
    ORDERS_SECTION_META.find(meta => meta.key === key)?.shortLabel ?? key;

  const allClear =
    orders.length === 0
      ? "Todavía no hay órdenes. Cuando entren, aquí aparecerán las que se estén pasando de tiempo."
      : "Ninguna orden se está pasando de tiempo: todo va dentro del ritmo que fijaste.";

  const [viewMode, setViewMode] = useState<"all" | "analytics" | "operational">("all");

  const rhythmFigures = [
    { key: "entered", label: "Entraron", value: String(rhythm.entered) },
    { key: "completed", label: "Completadas", value: String(rhythm.completed) },
    { key: "cancelled", label: "Canceladas", value: String(rhythm.cancelled) },
  ];

  return (
    <div data-orders-panel className="flex flex-col gap-8">
      <OrdersScreenHeader
        title="Panel de pedidos"
        description="Centro de control y análisis de pedidos: monitoreo de colas, volumen transaccional y métricas de rendimiento en tiempo real."
        aside={
          <div className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-xs dark:border-gray-800 dark:bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setViewMode("all")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                viewMode === "all"
                  ? "bg-brand-50 text-brand-700 shadow-xs dark:bg-brand-500/15 dark:text-brand-300"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              )}
            >
              Completo
            </button>
            <button
              type="button"
              onClick={() => setViewMode("analytics")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                viewMode === "analytics"
                  ? "bg-brand-50 text-brand-700 shadow-xs dark:bg-brand-500/15 dark:text-brand-300"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              )}
            >
              <BarChart3 className="size-3.5" />
              Métricas y Gráficos
            </button>
            <button
              type="button"
              onClick={() => setViewMode("operational")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                viewMode === "operational"
                  ? "bg-brand-50 text-brand-700 shadow-xs dark:bg-brand-500/15 dark:text-brand-300"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              )}
            >
              <LayoutDashboard className="size-3.5" />
              Operativo
            </button>
          </div>
        }
      />

      {/* ── Vista Analítica TailAdmin ──────────────────────────────────────── */}
      {(viewMode === "all" || viewMode === "analytics") && (
        <OrdersAnalyticsSection
          orders={orders}
          onNavigateToSection={(section) => onNavigate(section as DashboardTarget)}
        />
      )}

      {/* ── Vista Operativa (Colas, Atajos y Ritmo) ───────────────────────── */}
      {(viewMode === "all" || viewMode === "operational") && (
        <div className="flex flex-col gap-6 pt-2">
          {viewMode === "all" && (
            <div className="flex items-center gap-3 border-t border-gray-200/80 pt-6 dark:border-gray-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Flujo Operativo de Pedidos
              </h3>
              <div className="h-px flex-1 bg-gray-200/80 dark:bg-gray-800" />
            </div>
          )}

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
            {pending.map(item => {
              const Icon = ATTENTION_ICONS[item.key];
              const isDanger = item.tone === "danger";
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    data-orders-attention={item.key}
                    data-orders-attention-count={item.count}
                    data-orders-attention-target={item.target}
                    data-orders-attention-phase={item.phase}
                    onClick={() => onNavigate(item.target, item.phase)}
                    className={cn(
                      "group flex w-full cursor-pointer items-center gap-3.5 rounded-xl border bg-white p-3.5 text-left transition-colors dark:bg-white/[0.03]",
                      isDanger
                        ? "border-error-200 hover:border-error-300 dark:border-error-500/25 dark:hover:border-error-500/40"
                        : "border-warning-200 hover:border-warning-300 dark:border-warning-500/25 dark:hover:border-warning-500/40"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 flex-none items-center justify-center rounded-lg",
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

      {/* ── 2. Los atajos ──────────────────────────────────────────────────── */}
      <PanelBlock
        anchor="destinations"
        title="Tus pantallas"
        hint="cada una con lo que tiene en cola"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {destinations.map(meta => {
            const Icon = meta.icon;
            const figure = figures[meta.key];
            return (
              <button
                key={meta.key}
                type="button"
                data-orders-shortcut={meta.key}
                data-orders-shortcut-value={figure.value}
                onClick={() => onNavigate(meta.key)}
                className="group flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-gray-700 dark:hover:bg-white/[0.06]"
              >
                <span className="flex size-10 flex-none items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors group-hover:bg-gray-200 group-hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:group-hover:bg-gray-700 dark:group-hover:text-gray-200">
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

                {/* La cifra viva, con su unidad. Es lo que convierte el atajo en
                    una decisión: "¿entro o no?". */}
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
      <PanelBlock anchor="rhythm" title="Ritmo de hoy">
        <Card className="flex flex-col gap-4 p-5">
          <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
            {rhythmFigures.map(figure => (
              <div
                key={figure.key}
                data-orders-rhythm={figure.key}
                data-orders-rhythm-value={figure.value}
                className="flex flex-col gap-1 px-4 first:pl-0 last:pr-0"
              >
                <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {figure.label}
                </span>
                <span className="text-theme-xl font-bold tabular-nums text-gray-800 dark:text-white/90">
                  {figure.value}
                </span>
              </div>
            ))}
          </div>

          <p className="border-t border-gray-100 pt-4 text-theme-xs leading-relaxed text-gray-500 dark:border-gray-800 dark:text-gray-400">
            {dayReading(rhythm)}
          </p>
        </Card>
      </PanelBlock>
        </div>
      )}
    </div>
  );
}

export default OrdersPanelView;
