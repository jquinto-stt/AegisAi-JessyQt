/**
 * Pedidos → Despacho y entrega (§8, §13)
 * =======================================
 *
 * El tercer puesto de trabajo: **lo terminado que todavía no ha llegado a su
 * destino, y lo que llegó y falta cerrar**.
 *
 * ── Por qué se separa por modalidad y no sólo por estado ────────────────────
 *
 * ⚠️ `pickup` y `delivery` son **dos trabajos distintos**, no dos etiquetas de la
 * misma fila. Una recogida se entrega en el mostrador y va de `READY` a
 * `DELIVERED` sin pasar por `IN_TRANSIT` (§8): no hay mensajero, no hay dirección,
 * no hay llamada. Un envío sale a la calle y sí pasa por tránsito. Mezclarlos en
 * una sola tabla obligaría al operador a leer la modalidad fila por fila para
 * saber si tiene que llamar a alguien — que es justo la decisión que viene a
 * tomar a esta pantalla. Por eso son dos bloques, y cada uno dice lo que hay que
 * hacer con él.
 *
 * ── Por qué `DELIVERED` está aquí y no en Historial ─────────────────────────
 *
 * ⚠️ Una orden entregada **sigue siendo trabajo de despacho**: llegó, pero nadie
 * la ha cerrado. El cierre (`DELIVERED → COMPLETED`) es un acto explícito, y
 * hasta que ocurra la orden tiene una tarea pendiente. Mandarla a Historial la
 * haría desaparecer de la operación con trabajo por hacer.
 */

import { useMemo } from "react";
import { PackageCheck, SlidersHorizontal, Store, Truck } from "lucide-react";

import { Button } from "@/elements";
import type { Order } from "@/contracts/order.contract";
import { OrderSourceCell } from "../shared/OrderSource";
import { OrderStatusChip } from "../shared/OrderStatusChip";
import { OrdersEmptyState } from "../shared/OrdersEmptyState";
import { OrdersFilterBar } from "../shared/OrdersFilterBar";
import { OrdersMovementNotice } from "../shared/OrdersMovementBand";
import { OrdersScreenHeader } from "../shared/OrdersScreenHeader";
import { OrdersStagnationAlert } from "../shared/OrdersStagnationAlert";
import { OrdersTable } from "../shared/OrdersTable";
import type { OrdersTableColumn } from "../shared/OrdersTable";
import {
  OrderElapsedCell,
  OrderItemsCell,
  OrderTotalCell,
  orderIdentityLine,
} from "../shared/OrderCells";
import type { OperationalViewProps } from "../shared/operational-view";
import { OrdersQueueWalk } from "../shared/OrdersQueueWalk";
import { useOperationalScreen } from "../shared/use-operational-screen";
import type { OperationalPhase } from "../shared/use-operational-screen";
import { useOrderSort } from "../shared/use-order-sort";
import { useOrderWalk } from "../shared/use-order-walk";
import {
  dispatchOrders,
  splitDispatchByMode,
} from "../operational/order-operations";

/* ── Fases del despacho ────────────────────────────────────────────────────── */

type DispatchPhase = "all" | "ready" | "transit" | "delivered";

/**
 * Fases por **estado**, porque la modalidad ya está resuelta por los bloques.
 *
 * ⚠️ Filtrar por modalidad *y* separar por modalidad sería dos veces lo mismo: el
 * eje que el operador necesita mover aquí es "¿qué queda por salir, qué va en
 * camino y qué llegó sin cerrar?".
 */
function buildDispatchPhases(): readonly OperationalPhase<DispatchPhase>[] {
  return [
    { key: "all", label: "Todo el despacho", match: () => true },
    { key: "ready", label: "Listas", match: order => order.status === "READY" },
    { key: "transit", label: "En camino", match: order => order.status === "IN_TRANSIT" },
    { key: "delivered", label: "Entregadas", match: order => order.status === "DELIVERED" },
  ];
}

/** ⚠️ Estable: `useOperationalScreen` la usa como dependencia de memo. */
const DISPATCH_UNIVERSE = dispatchOrders;

/* ── Columnas ──────────────────────────────────────────────────────────────── */

const BASE_COLUMNS: OrdersTableColumn[] = [
  { key: "status", label: "Estado" },
  { key: "source", label: "Origen" },
  { key: "items", label: "Carga", sortable: true },
  { key: "elapsed", label: "Tiempo", sortable: true },
  { key: "total", label: "Total", sortable: true, align: "right" },
];

/** En el bloque de transporte, el destino es una columna de trabajo. */
const TRANSIT_COLUMNS: OrdersTableColumn[] = [
  { key: "status", label: "Estado" },
  { key: "destination", label: "Destino" },
  { key: "items", label: "Carga", sortable: true },
  { key: "elapsed", label: "Tiempo", sortable: true },
  { key: "total", label: "Total", sortable: true, align: "right" },
];

/* ── Bloque de despacho ────────────────────────────────────────────────────── */

interface DispatchBlockProps {
  anchor: string;
  title: string;
  /**
   * Contexto que **no** se puede deducir del bloque.
   *
   * ⚠️ Opcional, y hoy no lo pasa ninguno de los dos bloques. Los dos llevaban
   * una frase explicando qué es una recogida y qué es un envío —"Recogidas y
   * atenciones en sitio: la orden no sale a la calle, así que se entrega en el
   * mostrador y no pasa por tránsito"—, y eso es describir la propia interfaz
   * (§8): el título ya dice dónde se entrega, la columna «Destino» dice a dónde
   * va cada orden, y que el bloque local no ofrezca tránsito se ve en el detalle
   * de cualquier orden suya. Sobrevive el prop para el caso en que un bloque
   * tenga que decir algo que no esté ya en pantalla.
   */
  description?: string;
  icon: typeof Store;
  orders: Order[];
  columns: OrdersTableColumn[];
  thresholdMinutes: number;
  formatMoney: (amount: number) => string;
  onOpenOrder: (orderId: string) => void;
  sort: ReturnType<typeof useOrderSort>["sort"];
  onSortChange: (key: string) => void;
  /** Qué se dice cuando el bloque está vacío. */
  emptyLine: string;
}

function DispatchBlock({
  anchor,
  title,
  description,
  icon: Icon,
  orders,
  columns,
  thresholdMinutes,
  formatMoney,
  onOpenOrder,
  sort,
  onSortChange,
  emptyLine,
}: DispatchBlockProps) {
  return (
    <section data-dispatch-block={anchor} className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            {title}
            <span className="ml-2 text-theme-xs font-medium text-gray-400 dark:text-gray-500">
              {orders.length}
            </span>
          </h3>
          {description ? (
            <p className="mt-0.5 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {orders.length === 0 ? (
        <p
          data-dispatch-empty={anchor}
          className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-theme-xs text-gray-400 dark:border-gray-800 dark:text-gray-500"
        >
          {emptyLine}
        </p>
      ) : (
        <OrdersTable
          anchor={anchor}
          orders={orders}
          columns={columns}
          secondaryLine={orderIdentityLine}
          onOpenOrder={onOpenOrder}
          sort={sort}
          onSortChange={onSortChange}
          renderCell={(order, key) => {
            switch (key) {
              case "status":
                return <OrderStatusChip status={order.status} />;
              case "source":
                return <OrderSourceCell source={order.source} />;
              case "destination":
                return (
                  <span
                    data-order-destination
                    className="line-clamp-2 max-w-[18rem] text-theme-xs leading-relaxed text-gray-600 dark:text-gray-300"
                  >
                    {order.fulfillment.address ??
                      order.fulfillment.locationRef ??
                      "Sin destino registrado"}
                  </span>
                );
              case "items":
                return <OrderItemsCell order={order} />;
              case "elapsed":
                return <OrderElapsedCell order={order} thresholdMinutes={thresholdMinutes} />;
              case "total":
                return <OrderTotalCell order={order} formatMoney={formatMoney} />;
              default:
                return null;
            }
          }}
        />
      )}
    </section>
  );
}

/* ── Vista ─────────────────────────────────────────────────────────────────── */

export function OrdersDispatchView({
  onOpenOrder,
  openOrderId,
  onSeeMovement,
  movement,
  onDismissMovement,
  initialPhase,
}: OperationalViewProps) {
  const {
    filters,
    phaseOptions,
    channelOptions,
    modeOptions,
    visible,
    stagnant,
    stagnationMinutes,
    alertOnStagnation,
    formatMoneyFor,
    resultLabel,
  } = useOperationalScreen<DispatchPhase>({
    buildPhases: buildDispatchPhases,
    // ⚠️ El deep-link del Panel entra por aquí (§ Panel): pulsar "listas para
    // entregar" abre esta pantalla ya con esa fase puesta. La conversión a la unión
    // concreta es segura porque el valor sale de `attentionItems()` y la guarda
    // comprueba que todo valor que emite existe como fase en la pantalla destino.
    defaultPhase: (initialPhase as DispatchPhase | undefined) ?? "all",
    universe: DISPATCH_UNIVERSE,
    resultLabel: "órdenes en despacho",
  });

  const { sort, toggle, apply } = useOrderSort("elapsed");

  // El orden se aplica **antes** de separar por modalidad, para que las dos tablas
  // compartan el criterio y sus filas sean comparables entre sí.
  const sorted = useMemo(() => apply(visible), [apply, visible]);
  const { onSite, withTransit } = useMemo(() => splitDispatchByMode(sorted), [sorted]);

  /**
   * Recorrer la cola con el teclado (§14).
   *
   * ⚠️ El orden de los ids es el de la **pantalla**, no el de `sorted`: esta
   * pantalla parte la lista en dos bloques —primero lo que se entrega en el local,
   * después lo que sale con transporte—, así que avanzar siguiendo `sorted`
   * saltaría de un bloque al otro y volvería, en vez de bajar por lo que se ve.
   */
  const walkIds = useMemo(
    () => [...onSite, ...withTransit].map(order => order.id),
    [onSite, withTransit]
  );
  const walk = useOrderWalk(walkIds, openOrderId, onOpenOrder);

  return (
    <div data-orders-dispatch className="flex flex-col gap-5">
      {/* ⚠️ Sin descripción: los dos bloques de abajo ya se titulan por modalidad
          y cada uno dice qué hay que hacer con él. La frase que lo explicaba era
          la misma información, en prosa y antes de que se viera. */}
      <OrdersScreenHeader
        title="Despacho y entrega"
        alert={
          // ⚠️ El interruptor «Avisar de órdenes demoradas» (§17) se respeta aquí.
          // Antes se guardaba y ninguna pantalla lo leía: un ajuste sin consumidor
          // promete un control que no existe.
          alertOnStagnation && stagnant.length > 0 ? (
            <OrdersStagnationAlert
              orders={stagnant}
              thresholdMinutes={stagnationMinutes}
              scopeLabel="En despacho"
            />
          ) : undefined
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

      {visible.length === 0 ? (
        // ⚠️ `description` sólo cuando el vacío es real: con un filtro puesto, el
        // título ya dice que nada coincide y el botón ya dice qué hacer, así que
        // una frase más repetiría el botón con otras palabras (§15).
        <OrdersEmptyState
          icon={PackageCheck}
          anchor="despacho"
          title={
            filters.isFiltered
              ? "Ninguna orden coincide con los filtros"
              : "No hay nada por despachar"
          }
          description={
            filters.isFiltered ? undefined : "Nada listo para salir ni entregas sin cerrar."
          }
          action={
            filters.isFiltered ? (
              <Button
                size="sm"
                variant="outline"
                onClick={filters.reset}
                intent="orders.dispatch.clear_filters"
                startIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              >
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-7">
          <DispatchBlock
            anchor="despacho-local"
            title="Se entregan en el local"
            icon={Store}
            orders={onSite}
            columns={BASE_COLUMNS}
            thresholdMinutes={stagnationMinutes}
            formatMoney={formatMoneyFor}
            onOpenOrder={onOpenOrder}
            sort={sort}
            onSortChange={toggle}
            emptyLine="No hay recogidas ni atenciones en sitio pendientes."
          />

          <DispatchBlock
            anchor="despacho-transporte"
            title="Salen con transporte"
            icon={Truck}
            orders={withTransit}
            columns={TRANSIT_COLUMNS}
            thresholdMinutes={stagnationMinutes}
            formatMoney={formatMoneyFor}
            onOpenOrder={onOpenOrder}
            sort={sort}
            onSortChange={toggle}
            emptyLine="No hay envíos con transporte pendientes."
          />
        </div>
      )}
    </div>
  );
}

export default OrdersDispatchView;
