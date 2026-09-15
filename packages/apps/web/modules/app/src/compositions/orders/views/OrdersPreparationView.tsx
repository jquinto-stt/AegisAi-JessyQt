/**
 * Pedidos → Mesa de alistamiento (§16)
 * =====================================
 *
 * El segundo puesto de trabajo: **lo que se está preparando ahora mismo**.
 *
 * ── Por qué esta pantalla es una mesa y no una tabla ────────────────────────
 *
 * ⚠️ Las otras cuatro pantallas listan órdenes para **decidir** sobre ellas: se
 * escanean, se comparan, se ordenan. Aquí el trabajo es distinto —hay que leer
 * **qué lleva** cada orden para alistarla— y una tabla obliga a abrir el detalle
 * para ver los ítems. Por eso el cuerpo son tarjetas de trabajo: cada una muestra
 * la orden con sus líneas a la vista, sin abrir nada. La diferencia de formato no
 * es decoración; es que la tarea es otra.
 *
 * ── Qué se opera aquí ───────────────────────────────────────────────────────
 *
 * Órdenes en `IN_PREPARATION`. La pregunta operativa es *"¿qué se me está
 * atrasando?"*, y por eso la columna vertebral de la tarjeta es el **tiempo en el
 * estado** con su nivel de urgencia, medido contra el umbral configurado (§17).
 *
 * ── §13 sigue vigente ──────────────────────────────────────────────────────
 *
 * ⚠️ Ni una acción en la tarjeta. Las transiciones se derivan del estado real y
 * viven en un solo sitio —el detalle (§14)—; si cada tarjeta ofreciera su propio
 * "Marcar como lista", habría tantas copias de la máquina de estados como
 * pantallas. La tarjeta **abre** la orden; no la mueve.
 */

import { useMemo } from "react";
import { ClipboardList, SlidersHorizontal, Timer } from "lucide-react";

import { Badge, Button, Card } from "@/elements";
import type { Order } from "@/contracts/order.contract";
import { FULFILLMENT_MODE_LABELS } from "../order-status.constants";
import { OrderSourceCell } from "../shared/OrderSource";
import { OrderStatusChip } from "../shared/OrderStatusChip";
import { OrdersEmptyState } from "../shared/OrdersEmptyState";
import { OrdersFilterBar } from "../shared/OrdersFilterBar";
import { OrdersMovementNotice } from "../shared/OrdersMovementBand";
import { OrdersScreenHeader } from "../shared/OrdersScreenHeader";
import { OrdersStagnationAlert } from "../shared/OrdersStagnationAlert";
import { orderIdentityLine } from "../shared/OrderCells";
import type { OperationalViewProps } from "../shared/operational-view";
import { OrdersQueueWalk } from "../shared/OrdersQueueWalk";
import { useOperationalScreen } from "../shared/use-operational-screen";
import type { OperationalPhase } from "../shared/use-operational-screen";
import { useOrderSort } from "../shared/use-order-sort";
import { useOrderWalk } from "../shared/use-order-walk";
import {
  URGENCY_LABELS,
  URGENCY_TO_BADGE,
  minutesInCurrentState,
  preparationOrders,
  urgencyOf,
} from "../operational/order-operations";
import { formatDuration, formatQuantity } from "../order-presentation.utils";

/* ── Fases del alistamiento ────────────────────────────────────────────────── */

type PreparationPhase = "all" | "fresh" | "working" | "late";

/**
 * Las fases siguen los **niveles de urgencia** del umbral vivo, no cortes
 * escritos aquí.
 *
 * ⚠️ Son las mismas bandas que pinta cada tarjeta, así que filtrar por "Demoradas"
 * y ver cuántas tarjetas rojas hay detrás es siempre el mismo número. Con cortes
 * propios, la pestaña y el color podrían discrepar.
 */
function buildPreparationPhases({
  stagnationMinutes,
}: {
  stagnationMinutes: number;
  inboxWaitMinutes: number;
}): readonly OperationalPhase<PreparationPhase>[] {
  const is = (level: "fresh" | "working" | "late") => (order: Order) =>
    urgencyOf(minutesInCurrentState(order), stagnationMinutes) === level;

  return [
    { key: "all", label: "En la mesa", match: () => true },
    { key: "fresh", label: URGENCY_LABELS.fresh, match: is("fresh") },
    { key: "working", label: URGENCY_LABELS.working, match: is("working") },
    { key: "late", label: URGENCY_LABELS.late, match: is("late") },
  ];
}

/** ⚠️ Estable: `useOperationalScreen` la usa como dependencia de memo. */
const PREPARATION_UNIVERSE = preparationOrders;

/** Cuántas líneas se muestran en la tarjeta antes de resumir. */
const VISIBLE_ITEMS = 3;

/* ── Tarjeta de trabajo ────────────────────────────────────────────────────── */

interface WorkCardProps {
  order: Order;
  thresholdMinutes: number;
  formatMoney: (amount: number) => string;
  onOpen: () => void;
}

function WorkCard({ order, thresholdMinutes, formatMoney, onOpen }: WorkCardProps) {
  const minutes = minutesInCurrentState(order);
  const urgency = urgencyOf(minutes, thresholdMinutes);
  const badge = URGENCY_TO_BADGE[urgency];
  const hiddenItems = order.items.length - VISIBLE_ITEMS;

  return (
    <Card
      data-preparation-card={order.number}
      data-order-urgency={urgency}
      className={`flex flex-col gap-3.5 p-4 ${
        urgency === "late"
          ? "border-error-200 dark:border-error-500/30"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      {/* ── Cabecera: identidad y urgencia ─────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* ⚠️ `<button>` nativo: es el acceso al detalle, no una acción sobre la
              orden (§13), y el `Button` del catálogo no reenviaría el ancla que
              las guardas leen para localizar la tarjeta. */}
          <button
            type="button"
            onClick={onOpen}
            data-order-row={order.number}
            data-intent="orders.preparation.open"
            className="cursor-pointer text-left"
          >
            <span className="block text-theme-sm font-semibold text-secondary-600 hover:text-brand-500 dark:text-white dark:hover:text-brand-400">
              {order.number}
            </span>
            <span className="mt-0.5 block truncate text-theme-xs text-gray-500 dark:text-gray-400">
              {orderIdentityLine(order)}
            </span>
          </button>
        </div>

        <div className="flex flex-none flex-col items-end gap-1.5">
          <OrderStatusChip status={order.status} />
          <span data-order-elapsed={minutes} className="inline-flex">
            <Badge color={badge.color} size="xs" className={badge.className}>
              <Timer className="mr-1 h-3 w-3" aria-hidden />
              {formatDuration(minutes)}
            </Badge>
          </span>
        </div>
      </div>

      {/* ── Los ítems a alistar (§5): lo que se lee para preparar la orden ──── */}
      <ul data-preparation-items className="flex flex-col gap-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
        {order.items.slice(0, VISIBLE_ITEMS).map(item => (
          <li key={item.id} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-theme-xs text-gray-700 dark:text-gray-200">
              {item.name}
              {item.options && item.options.length > 0 && (
                <span className="text-gray-400 dark:text-gray-500">
                  {" · "}
                  {item.options.map(option => option.value).join(" / ")}
                </span>
              )}
            </span>
            <span className="flex-none text-theme-xs font-medium tabular-nums text-gray-500 dark:text-gray-400">
              {formatQuantity(item.quantity)} {item.unit ?? "u"}
            </span>
          </li>
        ))}
        {hiddenItems > 0 && (
          <li className="text-theme-xs text-gray-400 dark:text-gray-500">
            y {hiddenItems} {hiddenItems === 1 ? "línea más" : "líneas más"}
          </li>
        )}
      </ul>

      {order.notes && (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-theme-xs leading-relaxed text-gray-600 dark:bg-white/[0.02] dark:text-gray-300">
          {order.notes}
        </p>
      )}

      {/* ── Pie: modalidad, canal e importe ─────────────────────────────────── */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-theme-xs text-gray-500 dark:text-gray-400">
            {FULFILLMENT_MODE_LABELS[order.fulfillment.mode]}
          </span>
          <OrderSourceCell source={order.source} />
        </div>
        <span className="text-theme-sm font-semibold tabular-nums text-gray-800 dark:text-white/90">
          {formatMoney(order.totals.total)}
        </span>
      </div>
    </Card>
  );
}

/* ── Vista ─────────────────────────────────────────────────────────────────── */

export function OrdersPreparationView({
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
  } = useOperationalScreen<PreparationPhase>({
    buildPhases: buildPreparationPhases,
    // ⚠️ El deep-link del Panel entra por aquí (§ Panel): pulsar "3 demoradas"
    // abre esta pantalla ya con esa fase puesta. La conversión a la unión concreta
    // es segura porque el valor sale de `attentionItems()` y la guarda comprueba
    // que todo valor que emite existe como fase en la pantalla destino.
    defaultPhase: (initialPhase as PreparationPhase | undefined) ?? "all",
    universe: PREPARATION_UNIVERSE,
    resultLabel: "órdenes en alistamiento",
  });

  // ⚠️ Se ordena por `elapsed` en descendente por defecto: en una mesa de trabajo,
  // lo que más lleva esperando es lo que primero hay que mirar. Ordenar por número
  // obligaría a recorrer toda la mesa para encontrar lo atrasado.
  const { apply } = useOrderSort("elapsed");

  const sorted = useMemo(() => apply(visible), [apply, visible]);

  /**
   * Recorrer la mesa con el teclado (§14).
   *
   * ⚠️ Los ids salen de `sorted` —la mesa **tal como se ve**— y no del universo:
   * avanzar lleva a la tarjeta siguiente de lo que el operador tiene delante, no a
   * una orden que su propio filtro dejó fuera. En una rejilla de tres columnas el
   * recorrido es el de lectura: izquierda a derecha y de arriba abajo.
   */
  const walkIds = useMemo(() => sorted.map(order => order.id), [sorted]);
  const walk = useOrderWalk(walkIds, openOrderId, onOpenOrder);

  return (
    <div data-orders-preparation className="flex flex-col gap-5">
      {/* ⚠️ Sin descripción: el título y las tarjetas —que ya traen sus líneas y
          su urgencia— dicen qué se opera aquí. */}
      <OrdersScreenHeader
        title="Mesa de alistamiento"
        alert={
          // ⚠️ El interruptor «Avisar de órdenes demoradas» (§17) se respeta aquí.
          // Antes se guardaba y ninguna pantalla lo leía: un ajuste sin consumidor
          // promete un control que no existe.
          alertOnStagnation && stagnant.length > 0 ? (
            <OrdersStagnationAlert
              orders={stagnant}
              thresholdMinutes={stagnationMinutes}
              scopeLabel="En alistamiento"
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
          pieza se autodescarta cuando la orden abierta no está en esta mesa. */}
      <OrdersQueueWalk {...walk} />

      {sorted.length === 0 ? (
        // ⚠️ `description` sólo cuando el vacío es real: con un filtro puesto, el
        // título ya dice que nada coincide y el botón ya dice qué hacer, así que
        // una frase más repetiría el botón con otras palabras (§15).
        <OrdersEmptyState
          icon={ClipboardList}
          anchor="alistamiento"
          title={
            filters.isFiltered ? "Ninguna orden coincide con los filtros" : "Nada en alistamiento"
          }
          description={
            filters.isFiltered ? undefined : "Nada en preparación ahora mismo."
          }
          action={
            filters.isFiltered ? (
              <Button
                size="sm"
                variant="outline"
                onClick={filters.reset}
                intent="orders.preparation.clear_filters"
                startIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              >
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map(order => (
            <WorkCard
              key={order.id}
              order={order}
              thresholdMinutes={stagnationMinutes}
              formatMoney={formatMoneyFor}
              onOpen={() => onOpenOrder(order.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default OrdersPreparationView;
