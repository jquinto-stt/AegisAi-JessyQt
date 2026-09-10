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
  Banknote,
  PackageCheck,
} from "lucide-react";
import { Button, Card, Badge } from "@/elements";
import { MetricCard } from "../metric-card";

export const GlobalFranchiseOverview: React.FC = () => {
  const navigate = useNavigate();
  const { businesses, switchBusiness } = useBusiness();
  const [roleSelectBiz, setRoleSelectBiz] = useState<BusinessInstance | null>(null);
  const [selectedBusinessForSettings, setSelectedBusinessForSettings] = useState<BusinessInstance | null>(null);

  const handleNavigateToAnalitica = (
    e: React.MouseEvent,
    bizId: string,
    geTab: "resumen" | "historial" | "analitica"
  ) => {
    e.stopPropagation();
    switchBusiness(bizId);
    navigate("/analitica", {
      state: {
        bizId,
        tab: geTab,
      },
    });
  };

  // Mock aggregated data across all active branches
  const totalRevenue = "$ 4.850.000";
  const totalOrdersToday = 48;
  const avgTicket = "$ 101.000";

  return (
    <div className="w-full space-y-6 sm:space-y-8 antialiased">
      {/* Enterprise Header — Same clean layout as Repo-prueba-master DashboardPage */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white/90">
              Visión Franquicia & Grupo
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
              </span>
              En vivo
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Consolidación financiera, operativa y gestión centralizada de todas las sucursales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            startIcon={<BarChart2 className="size-4" />}
            onClick={() => navigate("/analitica")}
          >
            Auditoría Global 360°
          </Button>
          <Button
            variant="primary"
            size="sm"
            startIcon={<Plus className="size-4" />}
            onClick={() => navigate("/onboarding")}
          >
            Nueva Sucursal / Tienda
          </Button>
        </div>
      </div>

      {/* Aggregate KPI Metrics Grid — Pure Elements MetricCard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <MetricCard
          layout="vertical"
          icon={<DollarSign className="size-5" />}
          iconBgClass="bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
          title="Ventas Totales Hoy"
          value={totalRevenue}
          change="12%"
          trend="up"
          comparisonText="vs ayer"
        />

        <MetricCard
          layout="vertical"
          icon={<PackageCheck className="size-5" />}
          iconBgClass="bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
          title="Pedidos Despachados"
          value={String(totalOrdersToday)}
          change="0.5%"
          trend="up"
          comparisonText="hoy"
        />

        <MetricCard
          layout="vertical"
          icon={<Banknote className="size-5" />}
          iconBgClass="bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400"
          title="Ticket Promedio"
          value={avgTicket}
          change="18%"
          trend="up"
          comparisonText="por cliente"
        />

        <MetricCard
          layout="vertical"
          icon={<TrendingUp className="size-5" />}
          iconBgClass="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
          title="Tasa de Crecimiento"
          value="+15%"
          change="2%"
          trend="up"
          comparisonText="vs mes ant."
        />
      </div>

      {/* Branch Breakdown Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="size-5 text-brand-500" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
              Sucursales y Marcas del Grupo
            </h2>
          </div>
          <span className="text-xs text-gray-400 hidden sm:inline">
            Selecciona una sede para entrar al panel de operaciones o gestionar su configuración
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {businesses.map((biz) => {
            return (
              <Card
                key={biz.id}
                onClick={() => setRoleSelectBiz(biz)}
                className="relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xs hover:shadow-theme-md hover:border-brand-500/50 transition-all flex flex-col justify-between overflow-hidden group cursor-pointer p-0"
              >
                {/* Top Banner Cover Photo */}
                <div className="h-32 sm:h-36 w-full relative overflow-hidden bg-gray-900 flex-none select-none">
                  {biz.bannerUrl ? (
                    <img
                      src={biz.bannerUrl}
                      alt={biz.name}
                      style={{
                        transform: biz.bannerTransform
                          ? `rotate(${biz.bannerTransform.rotate || 0}deg) scale(${biz.bannerTransform.scale || 1}) translate(${biz.bannerTransform.posX || 0}%, ${biz.bannerTransform.posY || 0}%)`
                          : undefined,
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-gray-800 to-gray-900 flex items-center justify-center">
                      <Store className="size-8 text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

                  {/* Status Badge */}
                  <div className="absolute top-3.5 left-3.5 z-10">
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-success-400 text-xs font-semibold flex items-center gap-1.5 border border-success-500/30">
                      <span className="size-1.5 rounded-full bg-success-500 animate-pulse" />
                      Operando
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 pt-3 space-y-4 flex-1 flex flex-col justify-between">
                  {/* Floating Logo / Avatar Row */}
                  <div className="flex items-center justify-between -mt-9 mb-1 z-10">
                    <div className="size-14 rounded-xl bg-white dark:bg-gray-800 border-2 border-white dark:border-gray-700 flex items-center justify-center flex-none shadow-theme-sm overflow-hidden">
                      {biz.logoUrl ? (
                        <img
                          src={biz.logoUrl}
                          alt={biz.name}
                          style={{
                            transform: biz.logoTransform
                              ? `rotate(${biz.logoTransform.rotate || 0}deg) scale(${biz.logoTransform.scale || 1}) translate(${biz.logoTransform.posX || 0}%, ${biz.logoTransform.posY || 0}%)`
                              : undefined,
                          }}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BusinessIcon iconKey={biz.iconKey} className="size-7 text-brand-500" />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBusinessForSettings(biz);
                        }}
                        title="Configurar branding, bot y parámetros de la sede"
                        startIcon={<Settings className="size-3.5 text-gray-500" />}
                      >
                        Configurar sede
                      </Button>

                      <Button
                        variant="primary"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          switchBusiness(biz.id);
                          navigate("/app?section=operacion&tab=en-vivo");
                        }}
                        endIcon={<ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />}
                      >
                        Entrar
                      </Button>
                    </div>
                  </div>

                  {/* Title & Metadata */}
                  <div className="space-y-1">
                    <h4 className="text-lg font-bold text-gray-800 dark:text-white/90 group-hover:text-brand-500 transition-colors truncate">
                      {biz.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                      <span>{biz.city}</span>
                      <span>•</span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono font-semibold text-[10px] text-gray-700 dark:text-gray-300">
                        {biz.currency}
                      </span>
                    </div>
                  </div>

                  {/* 2 Quick Actions */}
                  <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-[11px] font-mono uppercase text-gray-400 font-semibold tracking-wider block">
                      Analítica Corporativa & Auditoría
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Button
                        variant="outline"
                        size="sm"
                        startIcon={<BarChart2 className="size-3.5 text-brand-500" />}
                        onClick={(e) => handleNavigateToAnalitica(e, biz.id, "resumen")}
                        title="Ver Dashboard Ejecutivo 360°"
                      >
                        Dashboard 360°
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        startIcon={<History className="size-3.5 text-brand-500" />}
                        onClick={(e) => handleNavigateToAnalitica(e, biz.id, "historial")}
                        title="Ver Historial de Ventas y Arqueos"
                      >
                        Historial de Ventas
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
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
