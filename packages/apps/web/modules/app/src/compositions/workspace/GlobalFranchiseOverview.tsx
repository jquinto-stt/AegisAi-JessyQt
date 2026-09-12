import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useBusiness, BusinessInstance } from "../../context/BusinessContext";
import { BusinessIcon } from "./BusinessIcon";
import { RoleSelectionModal } from "./RoleSelectionModal";
import { BusinessSettingsModal } from "./BusinessSettingsModal";
import {
  Building2,
  TrendingUp,
  ArrowRight,
  DollarSign,
  BarChart2,
  History,
  Store,
  Plus,
  Settings,
  PackageCheck,
  Banknote,
  Sparkles,
} from "lucide-react";
import { Button, Card } from "@/elements";
import { MetricCard } from "../metric-card";

type AnalyticsTab = "resumen" | "historial" | "analitica";

/** Every KPI uses the same brand accent so the row reads as one system. */
const KPI_ICON_CHIP = "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400";

export const GlobalFranchiseOverview: React.FC = () => {
  const navigate = useNavigate();
  const { businesses, switchBusiness } = useBusiness();
  const [roleSelectBiz, setRoleSelectBiz] = useState<BusinessInstance | null>(null);
  const [selectedBusinessForSettings, setSelectedBusinessForSettings] = useState<BusinessInstance | null>(null);

  const goToAnalitica = (bizId: string, tab: AnalyticsTab) => {
    switchBusiness(bizId);
    navigate("/analitica", { state: { bizId, tab } });
  };

  // Mock aggregated data across all active branches
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
    <div className="w-full space-y-10 antialiased sm:space-y-12">
      {/* ── Page header ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-500">
            Grupo & Franquicia
          </span>
          <h1 className="text-[32px] font-black leading-[1.08] tracking-tight text-secondary-600 sm:text-[40px] dark:text-white">
            Visión consolidada
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-gray-500 dark:text-gray-400">
            Consolidación financiera, operativa y gestión centralizada de todas tus sucursales y marcas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            intent="hub.audit.global"
            startIcon={<BarChart2 className="size-4" />}
            onClick={() => navigate("/analitica")}
            className="rounded-full px-5 py-2.5 text-[13px] font-bold"
          >
            Auditoría 360°
          </Button>
          <Button
            variant="primary"
            intent="hub.branch.create"
            startIcon={<Plus className="size-4" />}
            onClick={() => navigate("/onboarding")}
            className="rounded-full px-5 py-2.5 text-[13px] font-bold"
          >
            Nueva sucursal
          </Button>
        </div>
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
            className="rounded-2xl border-gray-100 shadow-none dark:border-gray-800"
          />
        ))}
      </div>

      {/* ── Branches ───────────────────────────────────────────────── */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black tracking-tight text-secondary-600 dark:text-white">
              Sucursales y marcas
            </h2>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {businesses.length}
            </span>
          </div>
          <span className="hidden text-xs text-gray-400 sm:inline">
            Elige una sede para entrar al panel de operaciones o ajustar su configuración
          </span>
        </div>

        {businesses.length === 0 ? (
          /* ── Brand empty state ── */
          <div className="relative overflow-hidden rounded-3xl bg-brand-500 px-8 py-14 text-center text-white">
            <Store className="mx-auto mb-5 size-10 text-white/80" />
            <h3 className="text-xl font-black tracking-tight sm:text-2xl">Aún no tienes sucursales</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/85">
              Crea tu primera tienda y Necto preparará el catálogo, las existencias y los canales según tu modelo.
            </p>
            <Button
              variant="outline"
              intent="hub.branch.create.empty"
              startIcon={<Plus className="size-4" />}
              onClick={() => navigate("/onboarding")}
              className="mt-7 rounded-full border-0 bg-white px-6 py-3 text-[13px] font-bold text-brand-500 hover:bg-white/90 dark:bg-white dark:text-brand-500"
            >
              Crear mi primera tienda
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {businesses.map(biz => (
              <Card
                key={biz.id}
                onClick={() => setRoleSelectBiz(biz)}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border-gray-100 p-0 shadow-none transition-all hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-theme-md dark:border-gray-800"
              >
                {/* Cover — uploaded banner, or brand orange when there is none */}
                <div className="relative h-28 w-full flex-none overflow-hidden">
                  {biz.bannerUrl ? (
                    <>
                      <img
                        src={biz.bannerUrl}
                        alt={biz.name}
                        style={{
                          transform: biz.bannerTransform
                            ? `rotate(${biz.bannerTransform.rotate || 0}deg) scale(${biz.bannerTransform.scale || 1}) translate(${biz.bannerTransform.posX || 0}%, ${biz.bannerTransform.posY || 0}%)`
                            : undefined,
                        }}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    </>
                  ) : (
                    <div className="relative h-full w-full bg-gradient-to-br from-brand-500 to-brand-600">
                      <BusinessIcon
                        iconKey={biz.iconKey}
                        className="absolute -right-4 -bottom-6 size-28 text-white/20"
                      />
                    </div>
                  )}

                  <span className="absolute left-3.5 top-3.5 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/35 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                    <span className="size-1.5 rounded-full bg-success-400" />
                    Operando
                  </span>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col px-5 pb-5">
                  {/* Avatar + identity */}
                  <div className="-mt-7 flex items-end gap-3.5">
                    <div className="flex size-14 flex-none items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-white shadow-theme-sm dark:border-gray-900 dark:bg-gray-800">
                      {biz.logoUrl ? (
                        <img
                          src={biz.logoUrl}
                          alt={biz.name}
                          style={{
                            transform: biz.logoTransform
                              ? `rotate(${biz.logoTransform.rotate || 0}deg) scale(${biz.logoTransform.scale || 1}) translate(${biz.logoTransform.posX || 0}%, ${biz.logoTransform.posY || 0}%)`
                              : undefined,
                          }}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <BusinessIcon iconKey={biz.iconKey} className="size-7 text-brand-500" />
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-1">
                    <h4 className="truncate text-base font-black tracking-tight text-secondary-600 transition-colors group-hover:text-brand-500 dark:text-white">
                      {biz.name}
                    </h4>
                    <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                      {[biz.specialty, biz.city].filter(Boolean).join(" · ")}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {biz.currency}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {biz.activeModules.length} {biz.activeModules.length === 1 ? "módulo" : "módulos"}
                    </span>
                  </div>

                  {/* Actions — stopPropagation so card-level select does not fire */}
                  <div
                    className="mt-auto space-y-3 pt-5"
                    onClick={e => e.stopPropagation()}
                    role="presentation"
                  >
                    <div className="flex items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                      <Button
                        variant="primary"
                        intent="hub.branch.enter"
                        onClick={() => {
                          switchBusiness(biz.id);
                          navigate("/app?section=operacion&tab=en-vivo");
                        }}
                        endIcon={<ArrowRight className="size-4" />}
                        className="flex-1 rounded-full py-2.5 text-[13px] font-bold"
                      >
                        Entrar
                      </Button>
                      <Button
                        variant="outline"
                        intent="hub.branch.settings"
                        title="Configurar branding, bot y parámetros de la sede"
                        onClick={() => setSelectedBusinessForSettings(biz)}
                        startIcon={<Settings className="size-4" />}
                        className="rounded-full px-4 py-2.5 text-[13px] font-bold"
                      >
                        Configurar
                      </Button>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-semibold text-gray-400">
                      <button
                        type="button"
                        onClick={() => goToAnalitica(biz.id, "resumen")}
                        className="cursor-pointer transition-colors hover:text-brand-500"
                      >
                        Dashboard 360°
                      </button>
                      <span className="text-gray-300 dark:text-gray-700">·</span>
                      <button
                        type="button"
                        onClick={() => goToAnalitica(biz.id, "historial")}
                        className="cursor-pointer transition-colors hover:text-brand-500"
                      >
                        Historial de ventas
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {/* Add-branch tile — keeps the grid balanced and the CTA always visible */}
            <button
              type="button"
              onClick={() => navigate("/onboarding")}
              className="flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-gray-200 p-8 text-center transition-all hover:border-brand-500 hover:bg-brand-50/40 dark:border-gray-800 dark:hover:bg-brand-500/5"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                <Plus className="size-6" />
              </span>
              <span className="text-sm font-black tracking-tight text-secondary-600 dark:text-white">
                Nueva sucursal
              </span>
              <span className="max-w-[180px] text-xs leading-relaxed text-gray-400">
                Suma otra marca o sede al grupo en minutos
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ── Brand signature ────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2.5 pt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300 dark:text-gray-700">
        <Sparkles className="size-3.5" />
        <span>Nos cruzamos, nos unimos, crecemos · grow together</span>
      </div>

      {/* Role Selection Modal */}
      <RoleSelectionModal
        business={roleSelectBiz}
        isOpen={Boolean(roleSelectBiz)}
        onClose={() => setRoleSelectBiz(null)}
      />

      {/* Business Settings Modal (Edit Mode) */}
      {selectedBusinessForSettings && (
        <BusinessSettingsModal
          business={selectedBusinessForSettings}
          isOpen={Boolean(selectedBusinessForSettings)}
          onClose={() => setSelectedBusinessForSettings(null)}
        />
      )}
    </div>
  );
};

export default GlobalFranchiseOverview;
