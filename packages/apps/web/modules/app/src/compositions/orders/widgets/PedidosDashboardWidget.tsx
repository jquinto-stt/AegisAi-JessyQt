/**
 * Pedidos → Widget para el Dashboard de tienda (§25)
 * ===================================================
 *
 * ── La frontera que este archivo respeta (§25) ──────────────────────────────
 *
 *     "El Dashboard pertenece a la **Tienda**.
 *      El widget de Pedidos pertenece al **módulo Pedidos**."
 *
 * Es decir: Pedidos **no construye** un dashboard propio que compita con el de la
 * tienda. Aporta este widget y el shell del Dashboard decide dónde lo pinta,
 * filtrándolo por `business.activeModules` (ver `dashboardWidgetsFor`). Si el
 * módulo se desacopla, el widget desaparece sin que el shell sepa que existió.
 *
 * ⚠️ No hay métricas decorativas (§27, "Regla final"): los cuatro números son las
 * cuatro preguntas que un dueño de tienda se hace al abrir el día —cuánto entró
 * hoy, qué falta validar, qué se está trabajando y qué ya cerré—. No se añade
 * "ticket promedio" ni "tendencia semanal" porque no hay serie histórica de la que
 * salgan, y un número inventado en un dashboard es peor que su ausencia.
 */

import { ArrowRight, ClipboardCheck, PackageCheck, ShoppingBag, TrendingUp, XCircle } from "lucide-react";

import { Button, Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/elements";
import { useBusiness } from "@/context/BusinessContext";
import type { StoreDashboardContext } from "@/compositions/store-dashboard/store-dashboard.types";
import { ORDER_STATUS_LABELS } from "../order-status.constants";
import {
  formatMoney,
  formatRelative,
  formatSourceLabel,
} from "../order-presentation.utils";
import { useOrders } from "../context/OrdersContext";

/* ── Agregación (§25) ──────────────────────────────────────────────────────── */

/** ¿La orden se creó hoy (fecha local del operador)? */
function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

/* ── Widget ────────────────────────────────────────────────────────────────── */

export interface PedidosDashboardWidgetProps {
  ctx: StoreDashboardContext;
  /** Lleva a la sección de órdenes del módulo. */
  onOpenOrders: () => void;
}

export function PedidosDashboardWidget({ ctx, onOpenOrders }: PedidosDashboardWidgetProps) {
  const { orders } = useOrders();
  const { activeBusiness } = useBusiness();
  const currency = activeBusiness?.currency ?? ctx.business.currency;

  const today = orders.filter(order => isToday(order.createdAt));
  const pending = orders.filter(order => order.status === "PENDING");
  const working = orders.filter(order => order.status === "IN_PREPARATION");
  const completedToday = orders.filter(
    order => order.status === "COMPLETED" && isToday(order.updatedAt)
  );

  const todayRevenue = today
    .filter(order => order.status !== "CANCELLED")
    .reduce((sum, order) => sum + order.totals.total, 0);

  const recent = orders.slice(0, 4);

  /**
   * Las cuatro cifras de cabecera.
   *
   * ⚠️ `tone` sólo distingue lo que **requiere atención** (`warning` en lo que
   * falta validar, `error` en lo cancelado). El resto va neutro: pintar todo de
   * color convertiría el color en decoración y dejaría de señalar el problema.
   */
  const stats = [
    {
      key: "today",
      icon: ShoppingBag,
      label: "Órdenes hoy",
      value: String(today.length),
      tone: "neutral" as const,
    },
    {
      key: "pending",
      icon: ClipboardCheck,
      label: "Por validar",
      value: String(pending.length),
      tone: pending.length > 0 ? ("warning" as const) : ("neutral" as const),
    },
    {
      key: "working",
      icon: PackageCheck,
      label: "En preparación",
      value: String(working.length),
      tone: "neutral" as const,
    },
    {
      key: "completed",
      icon: TrendingUp,
      label: "Completadas hoy",
      value: String(completedToday.length),
      tone: "neutral" as const,
    },
  ];

  const toneClasses: Record<"neutral" | "warning" | "error", string> = {
    neutral: "text-gray-800 dark:text-white/90",
    warning: "text-warning-600 dark:text-warning-500",
    error: "text-error-600 dark:text-error-500",
  };

  return (
    <Card data-pedidos-widget="" className="flex h-full flex-col p-0 sm:p-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold">Pedidos</CardTitle>
            <CardDescription className="mt-0.5">
              Actividad de órdenes de esta sede.
            </CardDescription>
          </div>

          {/* ⚠️ §25 — "Ver pedidos →". El widget **enlaza** al módulo; no intenta
              gestionar órdenes desde el Dashboard. */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenOrders}
            className="flex-none text-brand-500 hover:text-brand-600"
          >
            Ver pedidos
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardBody className="flex flex-1 flex-col gap-5">
        {/* ── Las cuatro cifras ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-4">
          {stats.map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.key} data-pedidos-stat={stat.key} className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  <Icon className="h-3.5 w-3.5 flex-none" aria-hidden />
                  {stat.label}
                </span>
                <span className={`text-theme-xl font-bold ${toneClasses[stat.tone]}`}>
                  {stat.value}
                </span>
              </div>
            );
          })}
        </div>

        {/* Facturación de hoy: es un dato que sale de las órdenes reales, no una
            métrica decorativa — el total de lo que se pidió hoy. */}
        {today.length > 0 && (
          <p className="border-t border-gray-100 pt-4 text-theme-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
            Facturado hoy{" "}
            <span className="font-semibold text-gray-800 dark:text-white/90">
              {formatMoney(todayRevenue, currency)}
            </span>{" "}
            en {today.length} {today.length === 1 ? "orden" : "órdenes"}
          </p>
        )}

        {/* ── Actividad reciente (§25) ─────────────────────────────────────── */}
        {recent.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              Actividad reciente
            </p>
            <ul className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
              {recent.map(order => (
                <li
                  key={order.id}
                  data-pedidos-activity={order.number}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex-none text-theme-sm font-semibold text-secondary-600 dark:text-white/90">
                      {order.number}
                    </span>
                    <span className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
                      {ORDER_STATUS_LABELS[order.status]} · {formatSourceLabel(order.source)}
                    </span>
                  </span>
                  <span className="flex-none text-theme-xs text-gray-400 dark:text-gray-500">
                    {formatRelative(order.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Estado vacío: Pedidos acoplado pero sin órdenes todavía. No es un
            hueco que rellenar con ceros: es la verdad, y viene con su salida. */}
        {orders.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-[10.5px] bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
              <XCircle className="size-6" />
            </span>
            <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              Todavía no hay órdenes
            </p>
            <p className="max-w-sm text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Las órdenes entran por los canales de la tienda y se gestionan en el módulo Pedidos.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default PedidosDashboardWidget;
