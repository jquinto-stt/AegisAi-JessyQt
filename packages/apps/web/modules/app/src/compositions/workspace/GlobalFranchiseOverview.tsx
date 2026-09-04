import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useBusiness, BusinessInstance } from "../../context/BusinessContext";
import { BusinessIcon } from "./BusinessIcon";
import { RoleSelectionModal } from "./RoleSelectionModal";
import { BusinessSettingsModal } from "./BusinessSettingsModal";
import {
  Building2,
  TrendingUp,
  ShoppingBag,
  Flame,
  ArrowRight,
  Zap,
  DollarSign,
  Sparkles,
  BarChart2,
  History,
  Store,
  Plus,
  Settings,
  Banknote,
  PackageCheck,
} from "lucide-react";
import { Button } from "@/elements";

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
  const activeOrdersInKitchen = 7;
  const avgTicket = "$ 101.000";

  return (
    <div className="w-full space-y-6 sm:space-y-8 antialiased">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-[#190088] via-[#14006e] to-[#190088] text-white p-6 sm:p-8 rounded-3xl border border-[#190088]/80 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-[#FF3F1A]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Visión Franquicia & Grupo
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300">
              Consolidación financiera y operativa de todas tus sucursales activas en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <Button
              variant="primary"
              intent="franchise.create.open"
              onClick={() => navigate("/onboarding")}
              className="py-3 px-5 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nueva Sucursal / Tienda</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Aggregate KPI Metrics Grid (1:1 Figma Design System) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Metric 1: Conversiones Totales / Ventas Totales */}
        <div className="rounded-2xl bg-white dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-snug">
              Ventas Totales Hoy
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-none">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <h4 className="text-2xl sm:text-3xl font-black text-[#190088] dark:text-white tracking-tight">
              {totalRevenue}
            </h4>
            <span className="text-xs font-bold text-emerald-500">
              ↑12%
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-snug">Consolidado de todas las sedes</p>
        </div>

        {/* Metric 2: Tasa de Conversión / Pedidos Despachados */}
        <div className="rounded-2xl bg-white dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-snug">
              Pedidos Despachados
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-none">
              <PackageCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <h4 className="text-2xl sm:text-3xl font-black text-[#190088] dark:text-white tracking-tight">
              {totalOrdersToday}
            </h4>
            <span className="text-xs font-bold text-emerald-500">
              ↑0.5%
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-snug">Completados y entregados hoy</p>
        </div>

        {/* Metric 3: ROI / Ticket Promedio */}
        <div className="rounded-2xl bg-white dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-snug">
              Ticket Promedio
            </span>
            <div className="w-7 h-7 rounded-xl bg-[#EFE6D3] dark:bg-[#37332A] text-amber-800 dark:text-[#EFE6D3] flex items-center justify-center flex-none">
              <Banknote className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <h4 className="text-2xl sm:text-3xl font-black text-[#190088] dark:text-white tracking-tight">
              {avgTicket}
            </h4>
            <span className="text-xs font-bold text-emerald-500">
              ↑18%
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-snug">Gasto promedio por cliente</p>
        </div>

        {/* Metric 4: Tasa de Crecimiento */}
        <div className="rounded-2xl bg-white dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-snug">
              Tasa de Crecimiento
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-none font-bold text-xs">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <h4 className="text-2xl sm:text-3xl font-black text-[#190088] dark:text-white tracking-tight">
              +15%
            </h4>
            <span className="text-xs font-bold text-emerald-500">
              ↑2%
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-snug">Comparado con el mes anterior</p>
        </div>
      </div>

      {/* Branch Breakdown Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-[#FF3F1A]" />
            <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-100 leading-tight">
              Sucursales y Marcas del Grupo
            </h2>
          </div>
          <span className="text-xs text-zinc-400 hidden sm:inline">
            Haz clic en una tarjeta para entrar directamente al panel operativo
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {businesses.map((biz, idx) => {
            const mockRevenue = idx === 0 ? "$ 3.120.000" : "$ 1.730.000";
            const mockTickets = idx === 0 ? "31 pedidos" : "17 pedidos";
            const mockInKitchen = idx === 0 ? 4 : 3;

            return (
              <div
                key={biz.id}
                onClick={() => {
                  switchBusiness(biz.id);
                  navigate("/app");
                }}
                className="relative rounded-3xl bg-white dark:bg-[#18181B] border border-zinc-200/90 dark:border-zinc-800 hover:border-[#FF3F1A] dark:hover:border-[#FF3F1A] transition-all shadow-2xs hover:shadow-lg flex flex-col justify-between overflow-hidden group cursor-pointer"
              >
                {/* Top Banner Cover Photo - 100% Nítido y Vívido */}
                <div className="h-32 sm:h-36 w-full relative overflow-hidden bg-zinc-900 flex-none select-none">
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
                    <div className="w-full h-full bg-gradient-to-r from-[#190088] via-[#FF3F1A] to-[#190088] opacity-80 flex items-center justify-center">
                      <Store className="w-8 h-8 text-white/40" />
                    </div>
                  )}
                  {/* Subtle bottom shadow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

                  {/* Status Badge floating on top-left of banner */}
                  <div className="absolute top-3.5 left-3.5 z-10">
                    <span className="px-3 py-1 rounded-full bg-[#190088]/80 backdrop-blur-md text-emerald-300 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 border border-emerald-400/40 shadow-md">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Operando
                    </span>
                  </div>

                  {/* High-Contrast Settings Gear Button on top-right of banner */}
                  <div className="absolute top-3.5 right-3.5 z-20">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBusinessForSettings(biz);
                      }}
                      title="Configurar branding, bot y parámetros de la sede"
                      className="h-9 px-3.5 rounded-full bg-white dark:bg-[#18181B] text-zinc-900 dark:text-zinc-100 hover:bg-[#FF3F1A] hover:text-white dark:hover:bg-[#FF3F1A] dark:hover:text-white border border-zinc-200/90 dark:border-zinc-700 shadow-xl flex items-center gap-2 font-bold text-xs hover:scale-105 active:scale-95 transition-all group/gear cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-[#FF3F1A] group-hover/gear:text-white group-hover/gear:rotate-90 transition-all duration-300" />
                      <span className="font-extrabold tracking-tight">Configurar Sede</span>
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 pt-3 space-y-5 flex-1 flex flex-col justify-between">
                  {/* Floating Logo / Avatar Row */}
                  <div className="flex items-center justify-between -mt-10 mb-1 z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-800 border-2 border-white dark:border-zinc-700 flex items-center justify-center flex-none shadow-lg overflow-hidden ring-4 ring-[#190088]/10 dark:ring-white/10">
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
                        <BusinessIcon iconKey={biz.iconKey} className="w-8 h-8 text-[#FF3F1A]" />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBusinessForSettings(biz);
                        }}
                        title="Configurar branding, bot y parámetros de la sede"
                        className="px-3 py-1.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:text-[#FF3F1A] dark:hover:text-[#FF3F1A] border border-zinc-300 dark:border-zinc-700 hover:border-[#FF3F1A] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer hover:scale-105"
                      >
                        <Settings className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF]" />
                        <span>Configurar</span>
                      </button>

                      <div className="px-3.5 py-1.5 rounded-full bg-[#190088] text-white group-hover:bg-[#FF3F1A] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm">
                        <span>Entrar</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>

                  {/* Title & Metadata (100% in card body with crystal-clear contrast) */}
                  <div className="space-y-1">
                    <h4 className="text-lg sm:text-xl font-black text-[#190088] dark:text-[#EFE6D3] leading-snug group-hover:text-[#FF3F1A] transition-colors truncate">
                      {biz.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      <span>{biz.city}</span>
                      <span>•</span>
                      <span className="px-2 py-0.5 rounded-md bg-[#190088]/10 dark:bg-[#190088]/30 font-mono font-bold text-[10px] text-[#190088] dark:text-blue-200 border border-[#190088]/20">
                        {biz.currency}
                      </span>
                    </div>
                  </div>

                  {/* Branch Live Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-[#F7F4EC]/60 dark:bg-zinc-900 border border-[#190088]/15 dark:border-zinc-800 text-center">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Ventas Hoy</span>
                      <span className="text-xs sm:text-sm font-extrabold text-[#190088] dark:text-blue-300">{mockRevenue}</span>
                    </div>
                    <div className="border-x border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Volumen</span>
                      <span className="text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-zinc-100">{mockTickets}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">KDS Cocina</span>
                      <span className="text-xs sm:text-sm font-extrabold text-[#FF3F1A]">{mockInKitchen} activos</span>
                    </div>
                  </div>

                  {/* 2 Analítica & Reportes Quick Actions */}
                  <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider block">
                      Analítica Corporativa & Auditoría
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Button
                        variant="ghost"
                        intent="franchise.analitica.resumen"
                        onClick={e => handleNavigateToAnalitica(e, biz.id, "resumen")}
                        className="p-2.5 rounded-2xl bg-zinc-100/80 hover:bg-[#EFE6D3] dark:bg-zinc-800/80 dark:hover:bg-[#37332A] text-zinc-800 dark:text-zinc-200 hover:text-[#FF3F1A] dark:hover:text-[#FF3F1A] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs group/btn"
                        title="Ver Dashboard Ejecutivo 360°"
                      >
                        <BarChart2 className="w-4 h-4 text-[#FF3F1A]" />
                        <span className="text-xs font-bold">Dashboard 360°</span>
                      </Button>

                      <Button
                        variant="ghost"
                        intent="franchise.analitica.historial"
                        onClick={e => handleNavigateToAnalitica(e, biz.id, "historial")}
                        className="p-2.5 rounded-2xl bg-zinc-100/80 hover:bg-[#EFE6D3] dark:bg-zinc-800/80 dark:hover:bg-[#37332A] text-zinc-800 dark:text-zinc-200 hover:text-[#FF3F1A] dark:hover:text-[#FF3F1A] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs group/btn"
                        title="Ver Historial de Ventas y Arqueos"
                      >
                        <History className="w-4 h-4 text-[#FF3F1A]" />
                        <span className="text-xs font-bold">Historial de Ventas</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
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
