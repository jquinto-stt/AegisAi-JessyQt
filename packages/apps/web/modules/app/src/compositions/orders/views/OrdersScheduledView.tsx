/**
 * Pedidos → Programados (§15)
 * ============================
 *
 * El cuarto puesto de trabajo: **las órdenes con fecha y hora comprometidas**.
 *
 * ── Qué se opera aquí, y qué no ─────────────────────────────────────────────
 *
 * ⚠️ Programar **no es un estado**. Una orden programada sigue estando en
 * `PENDING`, `CONFIRMED` o `READY` —eso es lo que dice el ciclo de vida— y la
 * programación es un hecho aparte: *para cuándo es*. Por eso esta pantalla muestra
 * **las dos cosas a la vez** y no sustituye a ninguna otra: una orden aparece aquí
 * y también en la Bandeja o en Despacho, porque responde a dos preguntas distintas
 * —"¿en qué punto del flujo está?" y "¿cuándo hay que ejecutarla?"—.
 *
 * ⚠️ Sólo se listan las programadas **vivas**. Una orden completada conserva su
 * `schedule` —es un hecho histórico suyo—, pero mostrarla aquí prometería trabajo
 * que ya se hizo; su fecha pertenece al Historial.
 *
 * ── Por qué se agrupa por día ───────────────────────────────────────────────
 *
 * La pregunta de esta pantalla es *"¿qué tengo que sacar, y cuándo?"*, y se
 * responde por **jornadas**, no por filas sueltas: el operador planifica el día
 * entero de una vez. La agrupación es configurable (§17) porque una tienda con
 * programación diaria quiere ver los días, y una con una sola ventana al día
 * prefiere la tabla plana.
 */

import { useMemo } from "react";
import { CalendarClock, SlidersHorizontal } from "lucide-react";

import { Button } from "@/elements";
import type { Order } from "@/contracts/order.contract";
import { OrderStatusChip } from "../shared/OrderStatusChip";
import { OrdersEmptyState } from "../shared/OrdersEmptyState";
import { OrdersFilterBar } from "../shared/OrdersFilterBar";
import { OrdersMovementNotice } from "../shared/OrdersMovementBand";
import { OrdersOverdueAlert } from "../shared/OrdersOverdueAlert";
import { OrdersScreenHeader } from "../shared/OrdersScreenHeader";
import { OrdersStagnationAlert } from "../shared/OrdersStagnationAlert";
import { OrdersTable } from "../shared/OrdersTable";
import type { OrdersTableColumn } from "../shared/OrdersTable";
import {
  OrderItemsCell,
  OrderModeCell,
  OrderScheduleCell,
  OrderTotalCell,
  orderIdentityLine,
} from "../shared/OrderCells";
import type { OperationalViewProps } from "../shared/operational-view";
import { OrdersQueueWalk } from "../shared/OrdersQueueWalk";
import { useOperationalScreen } from "../shared/use-operational-screen";
import type { OperationalPhase } from "../shared/use-operational-screen";
import { useOrderSort } from "../shared/use-order-sort";
import { useOrderWalk } from "../shared/use-order-walk";
import { useFlowSettings } from "../operational/flow-settings";
import {
  SCHEDULE_STATE_LABELS,
  groupScheduledByDay,
  scheduleStateOf,
  scheduledOpenOrders,
} from "../operational/order-operations";
import { dayKey, formatDayLabel } from "../order-presentation.utils";

/* ── Fases de la programación ──────────────────────────────────────────────── */

type ScheduledPhase = "all" | "overdue" | "due_soon" | "upcoming";

/**
 * Las fases siguen el **estado de la programación** respecto a ahora.
 *
 * ⚠️ Este eje es independiente del estado operativo, y por eso las fases no son
 * `OrderStatus`: una orden `CONFIRMED` puede estar vencida y una `READY` puede ser
 * futura. Filtrar por estados aquí no respondería a la pregunta de la pantalla.
 */
function buildScheduledPhases(): readonly OperationalPhase<ScheduledPhase>[] {
  const is = (state: "overdue" | "due_soon" | "upcoming") => (order: Order) =>
    scheduleStateOf(order) === state;

  return [
    { key: "all", label: "Todas", match: () => true },
    { key: "overdue", label: SCHEDULE_STATE_LABELS.overdue, match: is("overdue") },
    { key: "due_soon", label: SCHEDULE_STATE_LABELS.due_soon, match: is("due_soon") },
    { key: "upcoming", label: SCHEDULE_STATE_LABELS.upcoming, match: is("upcoming") },
  ];
}

/** ⚠️ Estable: `useOperationalScreen` la usa como dependencia de memo. */
const SCHEDULED_UNIVERSE = scheduledOpenOrders;

/* ── Columnas ──────────────────────────────────────────────────────────────── */

/**
 * Las columnas de Programados.
 *
 * ⚠️ Se retiró **«Origen»**. Esta pantalla responde a *cuándo* hay que ejecutar
 * cada orden, y lo que eso exige saber es la ventana comprometida y **cómo sale**
 * —la modalidad sí es operativa aquí, porque planificar un reparto no es
 * planificar una recogida—. El canal de origen es contexto, no plan: vive en
 * «Canales de origen», que es la pantalla que existe para eso, y en el detalle.
 *
 * ⚠️ Y por eso **no** se retiró «Entrega», que en la Bandeja sí se retiró: la
 * misma columna es ruido en una pantalla y carga de trabajo en otra. La regla no
 * es "quitar columnas", es "quitar las que no se usan **aquí**" (§12).
 */
const SCHEDULED_COLUMNS: OrdersTableColumn[] = [
  { key: "status", label: "Estado" },
  { key: "schedule", label: "Ventana comprometida", sortable: true },
  { key: "mode", label: "Entrega" },
  { key: "items", label: "Carga", sortable: true },
  { key: "total", label: "Total", sortable: true, align: "right" },
];

/* ── Vista ─────────────────────────────────────────────────────────────────── */

export function OrdersScheduledView({
  onOpenOrder,
  openOrderId,
  onSeeMovement,
  movement,
  onDismissMovement,
  initialPhase,
}: OperationalViewProps) {
  const { settings } = useFlowSettings();

  const {
    filters,
    phaseOptions,
    channelOptions,
    modeOptions,
    visible,
    universe,
    stagnant,
    stagnationMinutes,
    alertOnStagnation,
    alertOnScheduledOverdue,
    formatMoneyFor,
    resultLabel,
  } = useOperationalScreen<ScheduledPhase>({
    buildPhases: buildScheduledPhases,
    // ⚠️ El deep-link del Panel entra por aquí (§ Panel): pulsar "vencidas" abre
    // esta pantalla ya con esa fase puesta. La conversión a la unión concreta es
    // segura porque el valor sale de `attentionItems()` y la guarda comprueba que
    // todo valor que emite existe como fase en la pantalla destino.
    defaultPhase: (initialPhase as ScheduledPhase | undefined) ?? "all",
    universe: SCHEDULED_UNIVERSE,
    resultLabel: "órdenes programadas",
  });

  const { sort, toggle, apply } = useOrderSort("schedule");

  const sorted = useMemo(() => apply(visible), [apply, visible]);

  /**
   * Los grupos por día, con las órdenes ya filtradas y ordenadas dentro de cada
   * uno. `dayKey`/`formatDayLabel` entran como funciones para que el agrupador no
   * tenga que saber cómo se formatea una fecha — eso es de presentación.
   */
  const groups = useMemo(
    () => groupScheduledByDay(sorted, dayKey, formatDayLabel),
    [sorted]
  );

  /**
   * Recorrer la cola con el teclado (§14).
   *
   * ⚠️ Los ids salen de `sorted` y no de `groups`: esta pantalla agrupa por día,
   * pero el agrupador **conserva el orden** de la lista, así que recorrer `sorted`
   * baja por los días igual que la vista —y evita que el recorrido dependa de cómo
   * se agrupe, que es presentación.
   */
  const walkIds = useMemo(() => sorted.map(order => order.id), [sorted]);
  const walk = useOrderWalk(walkIds, openOrderId, onOpenOrder);

  const renderCell = (order: Order, key: string) => {
    switch (key) {
      case "status":
        return <OrderStatusChip status={order.status} />;
      case "schedule":
        return <OrderScheduleCell order={order} />;
      case "mode":
        return <OrderModeCell order={order} />;
      case "items":
        return <OrderItemsCell order={order} />;
      case "total":
        return <OrderTotalCell order={order} formatMoney={formatMoneyFor} />;
      default:
        return null;
    }
  };

  return (
    <div data-orders-scheduled className="flex flex-col gap-5">
      {/* ⚠️ Sin descripción: las fases —vencida, por vencer, futura— y la columna
          de ventana comprometida ya dicen que aquí se lee *cuándo*, no *en qué
          punto del flujo*. La prosa repetía esa distinción antes de mostrarla. */}
      <OrdersScreenHeader
        title="Programados"
        alert={
          <>
            {/* ⚠️ Dos avisos distintos, y por eso van los dos: "vencida" mide el
                retraso contra la hora pactada y "sin mover" mide el tiempo en el
                estado actual. Una orden puede estar perfectamente viva y llevar dos
                horas de retraso, o al revés. Cada uno respeta su interruptor de
                «Configuración del flujo» (§17). */}
            {alertOnScheduledOverdue && <OrdersOverdueAlert orders={universe} />}
            {alertOnStagnation && stagnant.length > 0 && (
              <OrdersStagnationAlert
                orders={stagnant}
                thresholdMinutes={stagnationMinutes}
                scopeLabel="Programadas y sin mover"
              />
            )}
          </>
        }
        filters={
          <OrdersFilterBar
            phaseOptions={phaseOptions}
            phase={filters.phase}
            onPhaseChange={filters.setPhase}
            channelOptions={channelOptions}
            channel={filters.channel}
            onChannelChange={filters.setChannel}
            modeOptions={modeOptions}
            mode={filters.mode}
            onModeChange={filters.setMode}
            query={filters.query}
            onQueryChange={filters.setQuery}
            onClearQuery={filters.clearQuery}
            resultCount={visible.length}
            resultLabel={resultLabel}
            isFiltered={filters.isFiltered}
            onReset={filters.reset}
            resetToken={filters.resetToken}
          />
        }
      />

      <OrdersMovementNotice movement={movement} onDismiss={onDismissMovement} onSee={onSeeMovement} />

      {/* ⚠️ Se pinta sólo con el detalle abierto y más de una orden delante: la
          pieza se autodescarta cuando la orden abierta no está en esta lista. */}
      <OrdersQueueWalk {...walk} />

      {sorted.length === 0 ? (
        // ⚠️ `description` sólo cuando el vacío es real: con un filtro puesto, el
        // título ya dice que nada coincide y el botón ya dice qué hacer, así que
        // una frase más repetiría el botón con otras palabras (§15).
        <OrdersEmptyState
          icon={CalendarClock}
          anchor="programados"
          title={
            filters.isFiltered
              ? "Ninguna programada coincide con los filtros"
              : "No hay órdenes programadas"
          }
          description={
            filters.isFiltered ? undefined : "Ninguna orden tiene fecha comprometida."
          }
          action={
            filters.isFiltered ? (
              <Button
                size="sm"
                variant="outline"
                onClick={filters.reset}
                intent="orders.scheduled.clear_filters"
                startIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              >
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : settings.groupScheduledByDay ? (
        <div className="flex flex-col gap-7">
          {groups.map(group => (
            <section key={group.key} data-scheduled-day={group.key} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                  {group.label}
                </h3>
                <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                  {group.orders.length}{" "}
                  {group.orders.length === 1 ? "orden" : "órdenes"}
                </span>
                <span className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
              </div>

              <OrdersTable
                anchor={`programados-${group.key}`}
                orders={group.orders}
                columns={SCHEDULED_COLUMNS}
                secondaryLine={orderIdentityLine}
                onOpenOrder={onOpenOrder}
                sort={sort}
                onSortChange={toggle}
                renderCell={renderCell}
              />
            </section>
          ))}
        </div>
      ) : (
        // ⚠️ La tabla plana sólo aparece si la tienda lo pidió en «Configuración
        // del Flujo» (§17): es una preferencia de lectura, no una capacidad, y por
        // eso las dos formas comparten columnas y ordenación.
        <OrdersTable
          anchor="programados"
          orders={sorted}
          columns={SCHEDULED_COLUMNS}
          secondaryLine={orderIdentityLine}
          onOpenOrder={onOpenOrder}
          sort={sort}
          onSortChange={toggle}
          renderCell={renderCell}
        />
      )}
    </div>
  );
}

export default OrdersScheduledView;
