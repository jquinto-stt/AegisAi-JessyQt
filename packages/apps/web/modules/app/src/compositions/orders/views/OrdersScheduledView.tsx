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
import { OrderSourceCell } from "../shared/OrderSource";
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
import { useOperationalScreen } from "../shared/use-operational-screen";
import type { OperationalPhase } from "../shared/use-operational-screen";
import { useOrderSort } from "../shared/use-order-sort";
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

const SCHEDULED_COLUMNS: OrdersTableColumn[] = [
  { key: "status", label: "Estado" },
  { key: "schedule", label: "Ventana comprometida", sortable: true },
  { key: "source", label: "Origen" },
  { key: "mode", label: "Entrega" },
  { key: "items", label: "Carga", sortable: true },
  { key: "total", label: "Total", sortable: true, align: "right" },
];

/* ── Vista ─────────────────────────────────────────────────────────────────── */

export function OrdersScheduledView({
  onOpenOrder,
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

  const renderCell = (order: Order, key: string) => {
    switch (key) {
      case "status":
        return <OrderStatusChip status={order.status} />;
      case "schedule":
        return <OrderScheduleCell order={order} />;
      case "source":
        return <OrderSourceCell source={order.source} />;
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
      <OrdersScreenHeader
        title="Programados"
        description="Órdenes con fecha y hora comprometidas, agrupadas por jornada. Una orden programada sigue teniendo su estado operativo: aquí se ve cuándo hay que ejecutarla, no en qué punto del flujo está."
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

      {sorted.length === 0 ? (
        <OrdersEmptyState
          icon={CalendarClock}
          anchor="programados"
          title={
            filters.isFiltered
              ? "Ninguna programada coincide con los filtros"
              : "No hay órdenes programadas"
          }
          description={
            filters.isFiltered
              ? "Ninguna de las órdenes programadas entra en el filtro elegido. Prueba a limpiarlo."
              : "Ninguna orden tiene fecha comprometida ahora mismo. Las que se programen desde el detalle aparecerán aquí agrupadas por jornada."
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
