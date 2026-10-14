/**
 * SubscriptionsListPage — "Mis suscripciones": lists persisted subscriptions.
 *
 * Rendered inside the AppShell (see `src/app/App.tsx`, route
 * "/app/suscripciones/listado"). Loads the persisted subscriptions from the
 * backend (`GET /api/subscriptions`, read from DynamoDB) and shows, per row:
 * plan, monthly amount, status badge, services count, buyer and creation date.
 *
 * Composed from Webi.AI Elements: Card, Badge, Button — plus a Tailwind table
 * (Elements has no table component).
 *
 * Related files:
 * - services/subscriptions.ts — listSubscriptions() + Subscription
 * - pages/SubscriptionPlansPage.tsx — the plans/checkout page (sibling route)
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
import { ListIcon, PlusIcon } from "@/icons";
import {
  listSubscriptions,
  formatAmount,
  type Subscription,
  type SubscriptionStatus,
} from "@/services/subscriptions";

/** Maps a subscription status to a badge color + human label. */
const STATUS_META: Record<SubscriptionStatus, { color: "success" | "warning" | "error"; label: string }> = {
  ACTIVE: { color: "success", label: "Activa" },
  SUSPENDED: { color: "warning", label: "Suspendida" },
  CANCELLED: { color: "error", label: "Cancelada" },
};

/** Formats an ISO date to a short local date-time, or "—" when absent/invalid. */
function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export const SubscriptionsListPage = () => {
  // ─── Data state ───────────────────────────────────────────────────────────
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  /** Loads (or reloads) the persisted subscriptions from the backend. */
  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const rows = await listSubscriptions();
      setSubscriptions(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las suscripciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageMeta title="Mis suscripciones" description="Consulta tus suscripciones a Necto" />
      <BasePageLayout
        header={
          <BasePageHeader
            title="Mis suscripciones"
            breadcrumbItems={[
              { label: "Inicio", href: "/" },
              { label: "Suscripciones", href: "/app/suscripciones" },
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
                <h3 className="font-semibold text-gray-800">Tus suscripciones</h3>
                <p className="text-sm text-gray-500">
                  {loading
                    ? "Cargando..."
                    : `${subscriptions.length} suscripción${subscriptions.length === 1 ? "" : "es"}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => void load()} loading={loading}>
                Actualizar
              </Button>
              <Link to="/app/suscripciones">
                <Button startIcon={<PlusIcon />}>Nueva suscripción</Button>
              </Link>
            </div>
          </div>

          {/* ── Error ───────────────────────────────────────────────────── */}
          {error && (
            <p className="mb-4 rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-600">{error}</p>
          )}

          {/* ── Empty state ─────────────────────────────────────────────── */}
          {!loading && !error && subscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-gray-100 text-gray-400">
                <ListIcon />
              </span>
              <h3 className="mt-4 font-semibold text-gray-800">Aún no hay suscripciones</h3>
              <p className="mt-1 max-w-xs text-sm text-gray-500">
                Cuando te suscribas a un plan aparecerá aquí con su estado.
              </p>
              <Link to="/app/suscripciones" className="mt-4">
                <Button startIcon={<PlusIcon />}>Ver planes</Button>
              </Link>
            </div>
          ) : (
            // ── Table ──────────────────────────────────────────────────────
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-3 font-medium">Estado</th>
                    <th className="px-3 py-3 font-medium">Plan</th>
                    <th className="px-3 py-3 font-medium">Cuota</th>
                    <th className="px-3 py-3 font-medium">Ciclo</th>
                    <th className="px-3 py-3 font-medium">Servicios</th>
                    <th className="px-3 py-3 font-medium">Cliente</th>
                    <th className="px-3 py-3 font-medium">Creada</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => {
                    const meta = STATUS_META[sub.status] ?? { color: "warning" as const, label: sub.status };
                    return (
                      <tr key={sub.subscriptionId} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-3">
                          <Badge color={meta.color}>{meta.label}</Badge>
                        </td>
                        <td className="px-3 py-3 text-gray-700">{sub.planName || "—"}</td>
                        <td className="px-3 py-3 font-medium text-gray-800">
                          {formatAmount(sub.amount, sub.currency)}
                        </td>
                        <td className="px-3 py-3 text-gray-600">{sub.billingCycle ?? "—"}</td>
                        <td className="px-3 py-3 text-gray-600">{sub.serviceCount ?? "—"}</td>
                        <td className="px-3 py-3 text-gray-600">
                          {sub.customerName || sub.customerEmail || "—"}
                        </td>
                        <td className="px-3 py-3 text-gray-500">{formatDate(sub.creationDate)}</td>
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

export default SubscriptionsListPage;
