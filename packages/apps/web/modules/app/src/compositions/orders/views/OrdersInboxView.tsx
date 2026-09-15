/**
 * Pedidos → Bandeja de entrada (Triaje) (§11, §12)
 * =================================================
 *
 * El primer puesto de trabajo de la suite: **lo que ha entrado y nadie ha
 * validado todavía**.
 *
 * ── Qué se opera aquí ───────────────────────────────────────────────────────
 *
 * Órdenes en `PENDING` (por validar) y `CONFIRMED` (aceptadas, sin empezar). El
 * trabajo del operador es de **decisión**, no de ejecución: mirar la orden,
 * confirmarla para comprometerla o cancelarla. Nada de alistar ni despachar — eso
 * ocurre en las pantallas siguientes.
 *
 * ── Dos formas de mirar lo mismo ────────────────────────────────────────────
 *
 * ⚠️ La pantalla ofrece **lista** y **tablero**, y la lista es la de por defecto.
 * No es indecisión: son dos preguntas distintas sobre los mismos datos, y cuál
 * toca depende del momento.
 *
 *   · La **lista** responde "¿qué hay?" — se ordena, se busca, se compara por
 *     columna. Es la vista de trabajo cuando ya se sabe qué se está buscando.
 *
 *   · El **tablero** responde "¿cómo está repartido?" — cuánto sigue sin validar
 *     y cuánto ya está comprometido, en columnas. En una lista, el reparto sólo
 *     se ve contando filas a ojo, y con veinte órdenes eso ya no se hace.
 *
 * ⚠️ El tablero **no sustituye** a la lista y por eso no es lo primero: obligar a
 * mirar por columnas a quien venía a abrir una orden concreta sería cambiarle el
 * trabajo para enseñarle un gráfico. El conmutador vive en la cabecera, al lado
 * del título, porque es un ajuste de *cómo* se mira — no de *qué* se mira, que es
 * lo que gobiernan los filtros de abajo.
 *
 * ── Por qué no tiene métricas propias ───────────────────────────────────────
 *
 * ⚠️ Aquí hubo cuatro tarjetas de cifras, y se retiraron. La pregunta de esta
 * fase —"¿se me está acumulando la entrada?"— se responde ahora en el **Panel de
 * Pedidos**, que es una pantalla propia y donde cada cifra lleva a la lista que
 * la resuelve. Repetirlas en cada pestaña las dejaba idénticas en las cinco y
 * ocupaba la franja más valiosa de la pantalla.
 *
 * Lo que **sí** queda es la alerta de espera larga, porque no es un resumen: es
 * el aviso de que hay órdenes concretas —con nombre y número— que llevan
 * demasiado esperando, y se puede ir a ellas.
 *
 * ── Sobre el umbral de espera ───────────────────────────────────────────────
 *
 * ⚠️ Esta pantalla mide con `inboxWaitMinutes`, **no** con el umbral de demora de
 * alistamiento: una orden sin validar no se está trabajando —nadie la ha mirado—,
 * así que el tiempo razonable de espera es mucho menor que el de un alistamiento
 * en curso. Usar un solo umbral para las dos cosas marcaría como normal una orden
 * que lleva media hora sin que nadie la abra.
 */

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Columns3, Inbox, Package, Rows3, SlidersHorizontal, User } from "lucide-react";

import { Badge, Button, SegmentedControl } from "@/elements";
import type { SegmentOption } from "@/elements";
import type { Order, OrderStatus } from "@/contracts/order.contract";
import { useOrders } from "../context/OrdersContext";
import { OrderSourceCell } from "../shared/OrderSource";
import { OrderStatusChip } from "../shared/OrderStatusChip";
import { OrdersBoard } from "../shared/OrdersBoard";
import type { OrdersBoardLane } from "../shared/OrdersBoard";
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
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "../order-status.constants";
import { ORDER_STATUS_DOT_CLASSES } from "../order-presentation.utils";
import { INBOX_STATUSES, inboxOrders, minutesInCurrentState } from "../operational/order-operations";

/* ── Fases del triaje ──────────────────────────────────────────────────────── */

type InboxPhase = "all" | "pending" | "confirmed" | "waiting";

/**
 * Las fases del triaje.
 *
 * ⚠️ "Espera larga" se construye con el umbral **vivo** (`inboxWaitMinutes`), no
 * con una constante escrita aquí: es un juicio sobre el tiempo, y si el umbral se
 * cambiara en «Configuración del flujo», la pestaña seguiría contando con el
 * número viejo.
 */
function buildInboxPhases({
  inboxWaitMinutes,
}: {
  stagnationMinutes: number;
  inboxWaitMinutes: number;
}): readonly OperationalPhase<InboxPhase>[] {
  return [
    { key: "all", label: "Todas", match: () => true },
    { key: "pending", label: "Por validar", match: order => order.status === "PENDING" },
    { key: "confirmed", label: "Confirmadas", match: order => order.status === "CONFIRMED" },
    {
      key: "waiting",
      label: "Espera larga",
      match: order => minutesInCurrentState(order) >= inboxWaitMinutes,
    },
  ];
}

/** ⚠️ Estable: `useOperationalScreen` la usa como dependencia de memo. */
const INBOX_UNIVERSE = inboxOrders;

/* ── Conmutador de vista ───────────────────────────────────────────────────── */

type InboxViewMode = "list" | "board";

const VIEW_OPTIONS: SegmentOption<InboxViewMode>[] = [
  { value: "list", label: "Lista", icon: <Rows3 className="h-3.5 w-3.5" aria-hidden /> },
  { value: "board", label: "Tablero", icon: <Columns3 className="h-3.5 w-3.5" aria-hidden /> },
];

/* ── Carriles del tablero ──────────────────────────────────────────────────── */

/**
 * Los carriles del tablero.
 *
 * ⚠️ Salen de `INBOX_STATUSES` —**la misma lista** con la que `inboxOrders`
 * recorta el universo— y no de una lista escrita aquí. Es lo que garantiza que
 * los carriles **cubran** el universo: si el tablero declarara los suyos, añadir
 * un estado a la bandeja dejaría órdenes sin columna y el tablero las escondería.
 * (El propio tablero denuncia ese caso en vez de tragárselo, pero lo correcto es
 * que no pueda darse.)
 *
 * ⚠️ El punto de color sale del **tono del estado**, no de un color elegido aquí:
 * el carril "Por validar" tiene que ser del mismo color que el chip "Por validar"
 * de la tabla y del detalle.
 */
const INBOX_LANES: readonly OrdersBoardLane<OrderStatus>[] = INBOX_STATUSES.map(status => ({
  key: status,
  label: ORDER_STATUS_LABELS[status],
  match: (order: Order) => order.status === status,
  dotClass: ORDER_STATUS_DOT_CLASSES[ORDER_STATUS_TONES[status]],
}));

/**
 * Dentro de un carril, lo que más lleva esperando va arriba.
 *
 * ⚠️ El tablero **no** usa el orden que elija la tabla: en el tablero no hay
 * cabeceras donde pulsar, así que heredar el criterio de la lista sería ordenar
 * por algo que el operador no puede ver ni cambiar. Un carril se lee de arriba
 * abajo, y lo primero tiene que ser lo que más urge.
 */
const BY_WAIT_DESC = (a: Order, b: Order) =>
  minutesInCurrentState(b) - minutesInCurrentState(a);

/* ── Columnas ──────────────────────────────────────────────────────────────── */

/**
 * Las columnas del triaje, y por qué son cinco y no seis.
 *
 * ⚠️ Se retiró **«Entrega»**. En la Bandeja la pregunta es una —¿asumo esta
 * orden?— y la modalidad no la responde: nadie decide *cómo* se entrega antes de
 * aceptarla, y cuando importa de verdad (reparto con transporte) la pantalla que
 * la trabaja es Despacho, que ya agrupa por modalidad. El detalle la enseña en su
 * propia sección. Una columna que sólo se confirma, y que se paga con el ancho de
 * la lista, es ruido (§12).
 *
 * ⚠️ Y se conserva **«Carga»**: el número de ítems sí es señal de triaje —una
 * orden de veinte líneas no se valida como una de dos— y es un dato que no se
 * quiere descubrir abriendo el detalle.
 */
const INBOX_COLUMNS: OrdersTableColumn[] = [
  { key: "status", label: "Estado" },
  { key: "source", label: "Origen" },
  { key: "items", label: "Carga", sortable: true },
  { key: "elapsed", label: "Espera", sortable: true },
  { key: "total", label: "Total", sortable: true, align: "right" },
];

/* ── Vista ─────────────────────────────────────────────────────────────────── */

export function OrdersInboxView({
  onOpenOrder,
  openOrderId,
  onSeeMovement,
  movement,
  onDismissMovement,
  initialPhase,
}: OperationalViewProps) {
  const { transitionOrder } = useOrders();
  const {
    filters,
    phaseOptions,
    channelOptions,
    modeOptions,
    visible,
    universe,
    inboxWaitMinutes,
    alertOnStagnation,
    formatMoneyFor,
    resultLabel,
  } = useOperationalScreen<InboxPhase>({
    // ⚠️ El deep-link del Panel entra por aquí (§ Panel): pulsar "3 con espera
    // larga" abre esta pantalla ya con esa fase puesta. La conversión a la unión
    // concreta es segura porque el valor sale de `attentionItems()` y la guarda
    // comprueba que todo valor que emite existe como fase en la pantalla destino.
    defaultPhase: (initialPhase as InboxPhase | undefined) ?? "all",
    buildPhases: buildInboxPhases,
    universe: INBOX_UNIVERSE,
    resultLabel: "órdenes en bandeja",
  });

  const { sort, toggle, apply } = useOrderSort("elapsed");

  // Predeterminado en modo Tablero (experiencia visual táctil e intuitiva)
  const [view, setView] = useState<InboxViewMode>("board");

  const sorted = useMemo(() => apply(visible), [apply, visible]);

  /**
   * Recorrer la cola con el teclado (§14).
   *
   * ⚠️ Los ids salen de `sorted` —la lista **tal como se ve**, ya filtrada y
   * ordenada— y no del universo: avanzar tiene que llevar a la fila siguiente de lo
   * que el operador tiene delante, no a una orden que su propio filtro dejó fuera.
   */
  const walkIds = useMemo(() => sorted.map(order => order.id), [sorted]);
  const walk = useOrderWalk(walkIds, openOrderId, onOpenOrder);

  /**
   * Las órdenes que llevan demasiado esperando **en el triaje**.
   *
   * ⚠️ Se calcula aquí y no con `stagnant` del hook: esa usa el umbral de demora
   * de alistamiento, y esta fase mide con el de espera. Son dos juicios distintos
   * sobre el mismo tiempo, y mezclarlos marcaría como crítica una orden recién
   * confirmada.
   */
  const waiting = useMemo(
    () =>
      universe
        .filter(order => minutesInCurrentState(order) >= inboxWaitMinutes)
        .sort((a, b) => minutesInCurrentState(b) - minutesInCurrentState(a)),
    [universe, inboxWaitMinutes]
  );

  /**
   * El cuerpo de la tarjeta del tablero (Estilo Premium TailAdmin / Elements).
   *
   * Diseñado con tipografía legible, badge de canal destacado,
   * tiempo transcurrido y botón de acción rápida directo.
   */
  const renderCardBody = (order: Order) => {
    const isPending = order.status === "PENDING";
    const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);

    const handleQuickAction = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isPending) {
        transitionOrder(order.id, "CONFIRMED");
      } else if (order.status === "CONFIRMED") {
        transitionOrder(order.id, "IN_PREPARATION");
      }
    };

    return (
      <div className="flex flex-col gap-3">
        {/* Cabecera de la tarjeta: Número de orden grande + Precio destacado */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2.5 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-brand-600 dark:text-brand-400">
              {order.number}
            </span>
          </div>
          <div className="text-right">
            <span className="text-base font-bold tabular-nums text-gray-900 dark:text-white">
              {formatMoneyFor(order.totals.total)}
            </span>
          </div>
        </div>

        {/* Cliente y Resumen de carga */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-theme-sm font-medium text-gray-800 dark:text-white/90">
            <User className="h-4 w-4 flex-none text-gray-400" />
            <span className="truncate">{orderIdentityLine(order)}</span>
          </div>
          <span className="inline-flex flex-none items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-theme-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <Package className="h-3 w-3" />
            {totalItems} {totalItems === 1 ? "ítem" : "ítems"}
          </span>
        </div>

        {/* Metadatos: Origen (WhatsApp, Web, etc.) + Tiempo de Espera */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-theme-xs">
          <OrderSourceCell source={order.source} />
          <OrderElapsedCell order={order} thresholdMinutes={inboxWaitMinutes} />
        </div>

        {/* Acción directa de un clic (estilo tarjeta de atención de Turnos) */}
        <div className="mt-1 pt-2.5 border-t border-gray-100 dark:border-gray-800">
          {isPending ? (
            <button
              type="button"
              onClick={handleQuickAction}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 active:scale-[0.99] dark:bg-brand-600 dark:hover:bg-brand-500"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Confirmar pedido</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleQuickAction}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-secondary-700 active:scale-[0.99] dark:bg-secondary-500 dark:hover:bg-secondary-600"
            >
              <ArrowRight className="h-4 w-4" />
              <span>Pasar a alistamiento</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div data-orders-inbox className="flex flex-col gap-5">
      {/* ⚠️ Sin descripción: «Bandeja de entrada» ya dice qué es, y la barra de
          fases de abajo dice qué se puede acotar. Una frase que explique la
          pantalla compite con el título y empuja la lista hacia abajo. */}
      <OrdersScreenHeader
        title="Bandeja de entrada"
        aside={
          <SegmentedControl<InboxViewMode>
            intent="orders.inbox.view"
            options={VIEW_OPTIONS}
            value={view}
            onValueChange={setView}
          />
        }
        alert={
          // ⚠️ El interruptor «Avisar de órdenes demoradas» (§17) se respeta aquí.
          // Antes se guardaba y ninguna pantalla lo leía: un ajuste sin consumidor
          // promete un control que no existe.
          alertOnStagnation && waiting.length > 0 ? (
            <OrdersStagnationAlert
              orders={waiting}
              thresholdMinutes={inboxWaitMinutes}
              scopeLabel="Sin validar"
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

      {/* §27 — el movimiento ocurrido desde aquí se confirma en el sitio donde se
          hizo. Al confirmar una orden, la fila sale de la bandeja: sin esta
          franja, el único rastro sería que ya no está. */}
      <OrdersMovementNotice movement={movement} onDismiss={onDismissMovement} onSee={onSeeMovement} />

      {/* ⚠️ Se pinta sólo con el detalle abierto y más de una orden delante: la
          pieza se autodescarta cuando la orden abierta no está en esta lista. */}
      <OrdersQueueWalk {...walk} />

      {sorted.length === 0 ? (
        // ⚠️ El estado vacío es el mismo para las dos vistas. Un tablero con dos
        // columnas vacías diría "no hay nada" dos veces y peor.
        //
        // ⚠️ Y `description` sólo se pasa cuando el vacío es **real**: con un
        // filtro puesto, el título ya dice que nada coincide y el botón ya dice
        // qué hacer, así que la frase que había aquí repetía el botón con otras
        // palabras (§15).
        <OrdersEmptyState
          icon={Inbox}
          anchor="bandeja"
          title={
            filters.isFiltered ? "Ninguna orden coincide con los filtros" : "La bandeja está vacía"
          }
          description={
            filters.isFiltered
              ? undefined
              : "Todo lo que entró ya tiene un compromiso asumido."
          }
          action={
            filters.isFiltered ? (
              <Button
                size="sm"
                variant="outline"
                onClick={filters.reset}
                intent="orders.inbox.clear_filters"
                startIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              >
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : view === "board" ? (
        // ⚠️ El tablero recibe `visible` —ya filtrado por fase, canal, modalidad y
        // búsqueda—, no el universo: los filtros son de la pantalla, no de la
        // vista, y cambiar de vista no puede cambiar el conjunto de órdenes.
        <OrdersBoard
          anchor="bandeja"
          orders={visible}
          lanes={INBOX_LANES}
          onOpenOrder={onOpenOrder}
          renderCardBody={renderCardBody}
          sortWithinLane={BY_WAIT_DESC}
          emptyLaneLabel="Nada en este estado."
        />
      ) : (
        <OrdersTable
          anchor="bandeja"
          orders={sorted}
          columns={INBOX_COLUMNS}
          secondaryLine={orderIdentityLine}
          onOpenOrder={onOpenOrder}
          sort={sort}
          onSortChange={toggle}
          renderCell={(order, key) => {
            switch (key) {
              case "status":
                return <OrderStatusChip status={order.status} />;
              case "source":
                return <OrderSourceCell source={order.source} />;
              case "items":
                return <OrderItemsCell order={order} />;
              case "elapsed":
                return <OrderElapsedCell order={order} thresholdMinutes={inboxWaitMinutes} />;
              case "total":
                return <OrderTotalCell order={order} formatMoney={formatMoneyFor} />;
              default:
                return null;
            }
          }}
        />
      )}
    </div>
  );
}

export default OrdersInboxView;
