import React from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../context/BusinessContext";
import { BusinessIcon } from "../compositions/workspace/BusinessIcon";
import {
  ArrowLeft,
  BarChart2,
  DollarSign,
  PackageCheck,
  Banknote,
  TrendingUp,
} from "lucide-react";
import { Badge, Button } from "@/elements";
import { MetricCard } from "../compositions/metric-card";

const KPI_ICON_CHIP = "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400";

export const FranchiseAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeBusiness, businesses, switchBusiness } = useBusiness();

  // Aggregate metrics across active branches
  const totalRevenue = "$ 4.850.000";
  const totalOrdersToday = 48;
  const avgTicket = "$ 101.000";

  const kpis = [
    { icon: <DollarSign className="size-5" />, title: "Ventas totales hoy", value: totalRevenue, change: "12%", comparison: "vs ayer" },
    { icon: <PackageCheck className="size-5" />, title: "Pedidos despachados", value: String(totalOrdersToday), change: "0.5%", comparison: "hoy" },
    { icon: <Banknote className="size-5" />, title: "Ticket promedio", value: avgTicket, change: "18%", comparison: "por cliente" },
    { icon: <TrendingUp className="size-5" />, title: "Tasa de crecimiento", value: "+15%", change: "2%", comparison: "vs mes anterior" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white antialiased">
      {/* Top Executive Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/90 dark:border-gray-800/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              intent="analytics.back"
              onClick={() => navigate("/workspaces")}
              className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-beige dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 hover:text-brand-500 dark:hover:text-brand-500 flex items-center gap-2 text-theme-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Volver a Sucursales y Franquicias"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver a Franquicias</span>
            </Button>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden flex-none shadow-2xs">
                {activeBusiness?.logoUrl ? (
                  <img
                    src={activeBusiness.logoUrl}
                    alt={activeBusiness.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BusinessIcon
                    iconKey={activeBusiness?.iconKey || "store"}
                    className="w-5 h-5 text-brand-500"
                  />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-theme-sm font-bold text-gray-950 dark:text-white leading-tight">
                    {activeBusiness?.name || "Franquicia"}
                  </h1>
                  <Badge color="light" size="xs" className="font-mono uppercase tracking-wider">
                    Visión completa
                  </Badge>
                </div>
                <p className="text-theme-xs text-gray-500 mt-0.5">
                  {activeBusiness?.city} · Moneda: <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{activeBusiness?.currency}</span>
                </p>
              </div>
            </div>
          </div>

          {businesses.length > 1 && (
            <div className="flex items-center gap-2 self-end md:self-auto">
              <span className="text-theme-xs font-bold text-gray-400 uppercase tracking-wider hidden lg:inline">
                Sede:
              </span>
              <select
                value={activeBusiness?.id}
                onChange={e => switchBusiness(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-theme-xs font-bold text-gray-900 dark:text-gray-100 outline-none cursor-pointer hover:border-gray-400 transition-colors"
              >
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="p-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 text-brand-500">
            <BarChart2 className="w-6 h-6" />
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Visión completa y métricas corporativas
            </h2>
          </div>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400 max-w-2xl">
            Panel ejecutivo consolidado de operaciones. Las métricas operativas se sincronizan en tiempo real al registrar actividad en tus canales activos.
          </p>
        </div>

        {/* ── Aggregate KPIs ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map(kpi => (
            <MetricCard
              key={kpi.title}
              layout="vertical"
              icon={kpi.icon}
              iconBgClass={KPI_ICON_CHIP}
              title={kpi.title}
              value={kpi.value}
              change={kpi.change}
              trend="up"
              comparisonText={kpi.comparison}
              className="rounded-xl border-gray-100 shadow-none dark:border-gray-800"
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default FranchiseAnalyticsPage;
