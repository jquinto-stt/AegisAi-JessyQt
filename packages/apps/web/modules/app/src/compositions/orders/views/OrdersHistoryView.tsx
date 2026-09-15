/**
 * Pedidos → Historial y auditoría (§10, §14)
 * ===========================================
 *
 * El quinto puesto de trabajo, y el único que mira **hacia atrás**: órdenes
 * `COMPLETED`, `CANCELLED` y `RETURNED`, con su recorrido y sus motivos.
 *
 * ── Por qué esto es una pantalla y no un filtro de la Bandeja ───────────────
 *
 * ⚠️ Antes lo cerrado era un filtro de primer nivel dentro de la bandeja —"Cerradas
 * (3)"—, y funcionaba a medias: mezclaba en la misma lista lo que hay que hacer con
 * lo que ya se hizo, y el operador tenía que cambiar de mentalidad dentro de la
 * misma tabla. Un cierre es un hecho **consumado**: se consulta, se audita, se
 * busca un motivo. Es otra tarea, con otras columnas —"Cierre" y "Motivo" no
 * significan nada en una orden viva— y por eso tiene su propia pantalla.
 *
 * ── El visor de auditoría, rediseñado ───────────────────────────────────────
 *
 * ⚠️ §9/§10 exigen que una orden pueda responder *qué ocurrió, cuándo y por qué*.
 * El detalle ya lo hace (`OrderDetailDrawer`), pero abrir una orden por una para
 * reconstruir una cadena de cierres es exactamente lo que un auditor no debería
 * tener que hacer. Por eso aquí hay un **visor en línea**.
 *
 * ⚠️ La versión anterior del visor era una pila de cuatro pares rótulo/valor y,
 * debajo, la misma línea de tiempo del detalle. Tenía tres problemas de diseño,
 * no de contenido:
 *
 *   1. **No decía cuánto costó nada.** Enseñaba *qué* pasó con fecha, pero no
 *      cuánto tiempo estuvo la orden en cada estado — que es la única forma de
 *      ver si algo se atascó. Un historial sin duraciones no audita: narra.
 *   2. **No juzgaba.** "3 h en alistamiento" es un dato; saber que el umbral de
 *      la tienda son 25 min es la conclusión. El visor tenía el dato y no la
 *      conclusión, así que el auditor tenía que tener el umbral en la cabeza.
 *   3. **No enseñaba lo que el contrato ya guardaba.** `actor.ref`
 *      (`wa_conv_8812`, `erp_doc_55210`) y `metadata` (canal, pago, regla) se
 *      registraban en cada cambio y no salían en ninguna superficie. Justo los
 *      datos con los que se reconstruye un caso.
 *
 * ⚠️ El visor se elige con un `Select` —un filtro— y **no** con un botón en la
 * fila: §13 prohíbe acciones dentro de la fila, y la fila sigue teniendo un solo
 * acceso, que es abrir el detalle. Elegir qué auditar es filtrar, no accionar.
 */

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Archive, ArrowRight, ScrollText, SlidersHorizontal, TriangleAlert } from "lucide-react";

import { Button, Card, Select } from "@/elements";
import type { SelectOption } from "@/elements";
import type { Order } from "@/contracts/order.contract";
import { ORDER_STATUS_LABELS } from "../order-status.constants";
import { OrderSourceCell } from "../shared/OrderSource";
import { OrderStatusChip } from "../shared/OrderStatusChip";
import { OrderTimeline } from "../shared/OrderTimeline";
import { OrdersEmptyState } from "../shared/OrdersEmptyState";
import { OrdersFilterBar } from "../shared/OrdersFilterBar";
import { OrdersMovementNotice } from "../shared/OrdersMovementBand";
import { OrdersScreenHeader } from "../shared/OrdersScreenHeader";
import { OrdersTable } from "../shared/OrdersTable";
import type { OrdersTableColumn } from "../shared/OrdersTable";
import {
  OrderClosedCell,
  OrderModeCell,
  OrderReasonCell,
  OrderTotalCell,
  orderIdentityLine,
} from "../shared/OrderCells";
import type { OperationalViewProps } from "../shared/operational-view";
import { useOperationalScreen } from "../shared/use-operational-screen";
import type { OperationalPhase } from "../shared/use-operational-screen";
import { useOrderSort } from "../shared/use-order-sort";
import { useFlowSettings } from "../operational/flow-settings";
import {
  historyOrders,
  isLongVisit,
  orderCycle,
  orderStateVisits,
} from "../operational/order-operations";
import { formatDuration, formatOrderDate, formatRelative } from "../order-presentation.utils";

/* ── Fases del historial ───────────────────────────────────────────────────── */

type HistoryPhase = "all" | "completed" | "cancelled" | "returned";

/**
 * Las tres formas de cerrar una orden, más "todas".
 *
 * ⚠️ Son estados del contrato, no categorías inventadas: `COMPLETED`,
 * `CANCELLED` y `RETURNED` son los tres terminales que declara
 * `TERMINAL_ORDER_STATUSES`, y separarlos responde a la pregunta de auditoría
 * —"¿qué se canceló y por qué?"— sin tener que leer la columna de estado.
 */
function buildHistoryPhases(): readonly OperationalPhase<HistoryPhase>[] {
  return [
    { key: "all", label: "Todo el historial", match: () => true },
    { key: "completed", label: "Completadas", match: order => order.status === "COMPLETED" },
    { key: "cancelled", label: "Canceladas", match: order => order.status === "CANCELLED" },
    { key: "returned", label: "Devueltas", match: order => order.status === "RETURNED" },
  ];
}

/** ⚠️ Estable: `useOperationalScreen` la usa como dependencia de memo. */
const HISTORY_UNIVERSE = historyOrders;

/* ── Columnas ──────────────────────────────────────────────────────────────── */

const HISTORY_COLUMNS: OrdersTableColumn[] = [
  { key: "status", label: "Desenlace" },
  { key: "source", label: "Origen" },
  { key: "mode", label: "Entrega" },
  { key: "closed", label: "Cierre", sortable: true },
  { key: "reason", label: "Motivo" },
  { key: "total", label: "Total", sortable: true, align: "right" },
];

/* ── Visor de auditoría ────────────────────────────────────────────────────── */

interface AuditPanelProps {
  orders: Order[];
  audited: Order | undefined;
  onPick: (orderId: string) => void;
  /** El umbral de demora configurado (§17), para juzgar los tramos. */
  stagnationMinutes: number;
  /**
   * ⚠️ El formateador **de la sede**, no `$${amount}`. La ficha es un dato de la
   * misma orden que la tabla que tiene encima: si la tabla dice `$ 49.000` y la
   * ficha dice `$49000`, la misma cifra parece dos cifras distintas y la ficha
   * —que es la que se lee al auditar— es la que se ve mal.
   */
  formatMoney: (amount: number) => string;
}

/** Un dato de la ficha, con su rótulo. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-theme-xs text-gray-400 dark:text-gray-500">{label}</p>
      <div className="mt-0.5 text-theme-sm text-gray-800 dark:text-white/90">{children}</div>
    </div>
  );
}

function AuditPanel({
  orders,
  audited,
  onPick,
  stagnationMinutes,
  formatMoney,
}: AuditPanelProps) {
  const options: SelectOption[] = orders.map(order => {
    const last = order.history[order.history.length - 1];
    return {
      value: order.id,
      // ⚠️ La opción lleva el desenlace y la fecha además del número: un
      // desplegable de veinte órdenes numeradas no dice cuál es cuál, y el
      // auditor tendría que abrirlas de una en una para encontrarla. El número
      // identifica, el desenlace resume y la fecha ordena.
      label: `${order.number} · ${ORDER_STATUS_LABELS[order.status]}${
        last ? ` · ${formatOrderDate(last.at)}` : ""
      }`,
    };
  });

  const cycle = audited ? orderCycle(audited) : null;
  const visits = audited ? orderStateVisits(audited) : [];
  const lastEntry = audited?.history[audited.history.length - 1];

  /**
   * El tramo que más se salió del ritmo, si alguno lo hizo.
   *
   * ⚠️ Es la conclusión que el visor anterior no daba: no "el recorrido duró 3 h",
   * sino "3 h se fueron en alistamiento, y tu umbral son 25 min". Un visor de
   * auditoría que sólo enseña datos obliga a que el auditor ponga el criterio; el
   * criterio ya está configurado en la tienda y aquí sólo hay que aplicarlo.
   */
  const overrun = visits
    .filter(visit => isLongVisit(visit, stagnationMinutes))
    .sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0))[0];

  return (
    <Card data-orders-audit className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
            <ScrollText className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              Visor de auditoría
            </h3>
            <p className="mt-0.5 max-w-xl text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
              El recorrido completo de una orden cerrada: cada cambio, quién lo hizo, cuánto duró
              cada tramo y el motivo cuando lo hubo.
            </p>
          </div>
        </div>

        {/* ⚠️ `Select` del catálogo es **no controlado**. Para que el valor visible
            siga al de la orden auditada, el `key` es el propio id: al cambiar de
            orden el control se remonta con el nuevo valor por defecto, y no queda
            un desplegable que dice una orden y un panel que muestra otra. */}
        <Select
          key={audited?.id ?? "sin-orden"}
          options={options}
          defaultValue={audited?.id ?? ""}
          onChange={onPick}
          aria-label="Elegir la orden a auditar"
          className="h-9 w-auto min-w-[16rem] py-0 text-theme-xs"
        />
      </div>

      {audited && cycle && (
        <div className="grid grid-cols-1 gap-5 border-t border-gray-100 pt-4 dark:border-gray-800 lg:grid-cols-[19rem_minmax(0,1fr)]">
          {/* ── La ficha: el "qué" antes del "cómo" ─────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-theme-xl font-bold tracking-tight text-secondary-600 dark:text-white/90">
                {audited.number}
              </p>
              <OrderStatusChip status={audited.status} />
            </div>

            <div className="flex flex-col gap-2.5">
              <Fact label="Solicitante">{audited.requester.name}</Fact>
              <Fact label="Origen">
                <OrderSourceCell source={audited.source} />
              </Fact>
              <Fact label="Entrega">
                <OrderModeCell order={audited} />
              </Fact>
              <Fact label="Total">
                <OrderTotalCell order={audited} formatMoney={formatMoney} />
              </Fact>
            </div>

            {/* El ciclo: la primera cifra que un auditor quiere, y la que el visor
                anterior no daba. Abrió → cerró, y cuánto duró en total. */}
            <div
              data-orders-audit-cycle
              data-orders-audit-cycle-minutes={cycle.minutes ?? ""}
              className="rounded-xl bg-gray-50 p-3.5 dark:bg-white/[0.03]"
            >
              <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">Ciclo</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-theme-xs tabular-nums text-gray-500 dark:text-gray-400">
                <span>{formatOrderDate(cycle.openedAt)}</span>
                <ArrowRight className="h-3 w-3 flex-none" aria-hidden />
                <span>{cycle.closedAt ? formatOrderDate(cycle.closedAt) : "abierta"}</span>
              </p>
              <p className="mt-1.5 text-theme-xl font-bold tabular-nums text-gray-800 dark:text-white/90">
                {cycle.minutes !== null ? formatDuration(cycle.minutes) : "En curso"}
              </p>
            </div>

            {/* El tramo que se salió del ritmo. Sólo aparece cuando lo hubo: un
                aviso que sale siempre deja de ser un aviso. */}
            {overrun && (
              <div
                data-orders-audit-overrun={overrun.status}
                className="rounded-xl border-l-2 border-error-400 bg-error-50/60 px-3.5 py-2.5 dark:border-error-500/40 dark:bg-error-500/10"
              >
                <p className="flex items-center gap-1.5 text-theme-xs font-medium text-error-600 dark:text-error-500">
                  <TriangleAlert className="h-3.5 w-3.5 flex-none" aria-hidden />
                  Se salió del ritmo
                </p>
                <p className="mt-1 text-theme-xs leading-relaxed text-gray-700 dark:text-gray-200">
                  {formatDuration(overrun.minutes!)} en {ORDER_STATUS_LABELS[overrun.status]}, con un
                  umbral de {formatDuration(stagnationMinutes)}.
                </p>
              </div>
            )}

            {/* El motivo, destacado: es lo que un historial tiene que poder
                responder y lo primero que se busca al auditar (§9). */}
            <div
              data-orders-audit-reason
              className={`rounded-xl border-l-2 px-3.5 py-2.5 ${
                lastEntry?.reason
                  ? "border-warning-400 bg-warning-50/60 dark:border-warning-500/40 dark:bg-warning-500/10"
                  : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-white/[0.02]"
              }`}
            >
              <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                Motivo del cierre
              </p>
              <p className="mt-1 text-theme-xs leading-relaxed text-gray-700 dark:text-gray-200">
                {lastEntry?.reason ??
                  "Se cerró sin motivo registrado. Sólo la cancelación y la devolución lo exigen."}
              </p>
              {lastEntry && (
                <p className="mt-1.5 text-theme-xs text-gray-400 dark:text-gray-500">
                  {lastEntry.actor.name} · {formatOrderDate(lastEntry.at)}
                </p>
              )}
            </div>
          </div>

          {/* ── El recorrido ────────────────────────────────────────────────── */}
          <div className="min-w-0">
            <p className="mb-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              Recorrido · {audited.history.length}{" "}
              {audited.history.length === 1 ? "cambio" : "cambios"}
              {cycle.minutes !== null ? ` · ${formatDuration(cycle.minutes)} de ciclo` : ""}
            </p>
            <OrderTimeline order={audited} thresholdMinutes={stagnationMinutes} />
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── Vista ─────────────────────────────────────────────────────────────────── */

export function OrdersHistoryView({
  onOpenOrder,
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
    formatMoneyFor,
    resultLabel,
  } = useOperationalScreen<HistoryPhase>({
    buildPhases: buildHistoryPhases,
    defaultPhase: (initialPhase as HistoryPhase | undefined) ?? "all",
    universe: HISTORY_UNIVERSE,
    resultLabel: "órdenes cerradas",
  });

  // ⚠️ El visor necesita el umbral **configurado** para poder decir qué tramo se
  // salió del ritmo. Sin él sólo podría narrar el recorrido, que es justo lo que
  // se le reprochaba.
  const { settings } = useFlowSettings();

  // ⚠️ Por defecto, lo último que se cerró: en un historial, "lo más reciente" es
  // lo único que casi siempre se busca.
  const { sort, toggle, apply } = useOrderSort("closed");

  const sorted = useMemo(() => apply(visible), [apply, visible]);

  /**
   * Qué orden se audita.
   *
   * ⚠️ `null` significa "la primera de la lista", y no "ninguna": así, al abrir la
   * pantalla, el visor ya muestra algo útil —el último cierre— en vez de un panel
   * vacío esperando una elección que el operador tendría que adivinar.
   */
  const [auditedId, setAuditedId] = useState<string | null>(null);
  const audited = useMemo(
    () => sorted.find(order => order.id === auditedId) ?? sorted[0],
    [sorted, auditedId]
  );

  return (
    <div data-orders-history className="flex flex-col gap-5">
      <OrdersScreenHeader
        title="Historial y auditoría"
        description="Órdenes ya resueltas —completadas, canceladas o devueltas— con quién las cerró, cuándo y por qué. Aquí no se opera: se consulta y se responde por lo que ocurrió."
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
          icon={Archive}
          anchor="historial"
          title={
            filters.isFiltered ? "Ningún cierre coincide con los filtros" : "Todavía no hay historial"
          }
          description={
            filters.isFiltered
              ? "Ninguna orden cerrada entra en el filtro elegido. Prueba a limpiarlo."
              : "Ninguna orden se ha cerrado aún en esta sede. Cuando se complete, se cancele o se devuelva una, quedará registrada aquí con su motivo."
          }
          action={
            filters.isFiltered ? (
              <Button
                size="sm"
                variant="outline"
                onClick={filters.reset}
                intent="orders.history.clear_filters"
                startIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              >
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <OrdersTable
            anchor="historial"
            orders={sorted}
            columns={HISTORY_COLUMNS}
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
                case "mode":
                  return <OrderModeCell order={order} />;
                case "closed":
                  return <OrderClosedCell order={order} />;
                case "reason":
                  return <OrderReasonCell order={order} />;
                case "total":
                  return <OrderTotalCell order={order} formatMoney={formatMoneyFor} />;
                default:
                  return null;
              }
            }}
            footer={
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                {sorted.length} {sorted.length === 1 ? "cierre" : "cierres"} · último{" "}
                {sorted[0]?.history.length
                  ? formatRelative(sorted[0].history[sorted[0].history.length - 1].at)
                  : "—"}
              </p>
            }
          />

          <AuditPanel
            orders={sorted}
            audited={audited}
            onPick={setAuditedId}
            stagnationMinutes={settings.stagnationMinutes}
            formatMoney={formatMoneyFor}
          />
        </>
      )}
    </div>
  );
}

export default OrdersHistoryView;
