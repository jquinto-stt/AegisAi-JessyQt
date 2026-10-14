/**
 * PaymentLinksListPage — "Enlaces activos": lists every persisted payment link.
 *
 * Rendered inside the AppShell (see `src/app/App.tsx`, route
 * "/app/enlaces/listado"). Loads the persisted payment orders from the backend
 * (`GET /api/payment-orders`), which reads them from DynamoDB and refreshes each
 * status against PayZen. The merchant sees, for every link: its live status
 * badge, amount, currency, delivery channel, buyer, creation date, and quick
 * actions (copy the link, open it, check its status on the creator page).
 *
 * This is the persistence payoff: links created earlier survive reloads and
 * remain visible here with their up-to-date payment state.
 *
 * Composed from Webi.AI Elements: Card, Badge, Button — plus a Tailwind table
 * (Elements has no table component). Status colors reuse the same STATUS_META
 * mapping as the creator page.
 *
 * Related files:
 * - services/payment-order.ts — listPaymentOrders() + StoredPaymentOrder
 * - pages/CreatePaymentLinkPage.tsx — the creator page (sibling route)
 * - app/App.tsx — route registration; app/AppSidebar.tsx — nav entry
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import BasePageLayout from "@/layouts/base-page/BasePageLayout";
import BasePageHeader from "@/layouts/base-page/BasePageHeader";
import { PageMeta } from "@/shell/meta";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { CopyIcon, CheckLineIcon, ListIcon, PlusIcon, ArrowRightIcon } from "@/icons";
import {
  listPaymentOrders,
  type StoredPaymentOrder,
  type PaymentOrderStatus,
  type PaymentOrderChannelType,
} from "@/services/payment-order";

/** Maps a payment-order status to a badge color + human label. */
const STATUS_META: Record<PaymentOrderStatus, { color: "success" | "warning" | "error" | "info"; label: string }> = {
  RUNNING: { color: "warning", label: "Pendiente" },
  PAID: { color: "success", label: "Pagado" },
  PARTIALLY_PAID: { color: "info", label: "Pago parcial" },
  EXPIRED: { color: "error", label: "Expirado" },
  CANCELLED: { color: "error", label: "Cancelado" },
};

/** Human label for each delivery channel. */
const CHANNEL_LABEL: Record<PaymentOrderChannelType, string> = {
  URL: "URL",
  WHATSAPP: "WhatsApp",
  MAIL: "Email",
  SMS: "SMS",
  IVR: "IVR",
};

/** Formats an integer smallest-unit amount to a display string (30050 → "300.50"). */
function formatAmount(amountSmallestUnit: number, currency: string): string {
  return `${(amountSmallestUnit / 100).toFixed(2)} ${currency}`;
}

/** Formats an ISO date to a short local date-time, or "—" when absent/invalid. */
function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export const PaymentLinksListPage = () => {
  // ─── Data state ───────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<StoredPaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [copiedId, setCopiedId] = useState<string | undefined>();

  /** Loads (or reloads) the persisted payment links from the backend. */
  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const rows = await listPaymentOrders();
      setOrders(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los enlaces.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load once on mount (and expose a manual refresh via the button).
  useEffect(() => {
    void load();
  }, [load]);

  /** Copies a payment link to the clipboard and flags it briefly. */
  async function handleCopy(order: StoredPaymentOrder) {
    await navigator.clipboard.writeText(order.paymentURL);
    setCopiedId(order.paymentOrderId);
    setTimeout(() => setCopiedId(undefined), 2000);
  }

  return (
    <>
      <PageMeta title="Enlaces activos" description="Consulta tus enlaces de pago y su estado" />
      <BasePageLayout
        header={
          <BasePageHeader
            title="Enlaces activos"
            breadcrumbItems={[
              { label: "Inicio", href: "/" },
              { label: "Enlaces de pago", href: "/app/enlaces" },
              { label: "Listado" },
            ]}
          />
        }
      >
        <Card>
          {/* ── Toolbar ─────────────────────────────────────────────────── */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-brand-50 text-brand-500">
                <ListIcon />
              </span>
              <div>
                <h3 className="font-semibold text-gray-800">Tus enlaces de pago</h3>
                <p className="text-sm text-gray-500">
                  {loading
                    ? "Cargando..."
                    : `${orders.length} enlace${orders.length === 1 ? "" : "s"} · estado actualizado desde PayZen`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => void load()} loading={loading}>
                Actualizar
              </Button>
              <Link to="/app/enlaces">
                <Button startIcon={<PlusIcon />}>Crear enlace</Button>
              </Link>
            </div>
          </div>

          {/* ── Error ───────────────────────────────────────────────────── */}
          {error && (
            <p className="mb-4 rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-600">{error}</p>
          )}

          {/* ── Empty state ─────────────────────────────────────────────── */}
          {!loading && !error && orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-gray-100 text-gray-400">
                <ListIcon />
              </span>
              <h3 className="mt-4 font-semibold text-gray-800">Aún no hay enlaces</h3>
              <p className="mt-1 max-w-xs text-sm text-gray-500">
                Cuando generes un enlace de pago aparecerá aquí con su estado.
              </p>
              <Link to="/app/enlaces" className="mt-4">
                <Button startIcon={<PlusIcon />}>Crear el primero</Button>
              </Link>
            </div>
          ) : (
            // ── Table ──────────────────────────────────────────────────────
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-3 font-medium">Estado</th>
                    <th className="px-3 py-3 font-medium">Monto</th>
                    <th className="px-3 py-3 font-medium">Canal</th>
                    <th className="px-3 py-3 font-medium">Cliente</th>
                    <th className="px-3 py-3 font-medium">Creado</th>
                    <th className="px-3 py-3 font-medium">Referencia</th>
                    <th className="px-3 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const meta = STATUS_META[order.status] ?? { color: "info" as const, label: order.status };
                    const isCopied = copiedId === order.paymentOrderId;
                    return (
                      <tr key={order.paymentOrderId} className="border-b border-gray-100 last:border-0">
                        {/* Status */}
                        <td className="px-3 py-3">
                          <Badge color={meta.color}>{meta.label}</Badge>
                        </td>
                        {/* Amount */}
                        <td className="px-3 py-3 font-medium text-gray-800">
                          {formatAmount(order.amount, order.currency)}
                        </td>
                        {/* Channel */}
                        <td className="px-3 py-3 text-gray-600">
                          {CHANNEL_LABEL[order.channelType] ?? order.channelType}
                        </td>
                        {/* Customer */}
                        <td className="px-3 py-3 text-gray-600">
                          {order.customerName || order.phoneNumber || "—"}
                        </td>
                        {/* Created */}
                        <td className="px-3 py-3 text-gray-500">{formatDate(order.creationDate)}</td>
                        {/* Reference */}
                        <td className="px-3 py-3 text-gray-500">{order.orderId || "—"}</td>
                        {/* Actions: copy + open */}
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => void handleCopy(order)}
                              className="grid size-8 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-brand-500"
                              aria-label="Copiar enlace"
                              title="Copiar enlace"
                            >
                              {isCopied ? <CheckLineIcon /> : <CopyIcon />}
                            </button>
                            <a
                              href={order.paymentURL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="grid size-8 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-brand-500"
                              aria-label="Abrir enlace de pago"
                              title="Abrir enlace"
                            >
                              <ArrowRightIcon />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </BasePageLayout>
    </>
  );
};

export default PaymentLinksListPage;
