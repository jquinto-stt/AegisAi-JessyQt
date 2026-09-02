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
  CheckCircle2,
  BarChart2,
  History,
  Store,
  Plus,
  Settings,
} from "lucide-react";
import { Button } from "@/elements";

export const GlobalFranchiseOverview: React.FC = () => {
  const navigate = useNavigate();
  const { businesses, switchBusiness, setIsCommandPaletteOpen } = useBusiness();
  const [roleSelectBiz, setRoleSelectBiz] = useState<BusinessInstance | null>(null);
  const [selectedBusinessForSettings, setSelectedBusinessForSettings] = useState<BusinessInstance | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);


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
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#ECECEC] dark:bg-[#212121] text-[#212121] dark:text-[#ECECEC] antialiased">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-[#190088] via-[#14006e] to-[#190088] text-white p-6 sm:p-8 rounded-3xl border border-[#190088]/80 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-[#FF3F1A]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Visión Franquicia & Grupo
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300">
            Consolidación financiera y operativa de todas tus sucursales activas en una sola pantalla.
          </p>
        </div>
      </div>

      {/* Aggregate KPI Metrics Grid (TailAdmin Inspired Architecture) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Metric 1: Total Revenue */}
        <div className="rounded-2xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 p-5 md:p-6 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shadow-2xs">
            <DollarSign className="w-5 h-5" />
          </div>

          <div className="mt-5 flex items-end justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
                Ventas Totales Hoy
              </span>
              <h4 className="mt-1 text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                {totalRevenue}
              </h4>
            </div>

            <span className="flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 py-0.5 px-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
              <TrendingUp className="w-3.5 h-3.5" />
              18.4%
            </span>
          </div>
        </div>

        {/* Metric 2: Orders Count */}
        <div className="rounded-2xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 p-5 md:p-6 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-2xs">
            <ShoppingBag className="w-5 h-5" />
          </div>

          <div className="mt-5 flex items-end justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
                Pedidos Despachados
              </span>
              <h4 className="mt-1 text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                {totalOrdersToday}
              </h4>
            </div>

            <span className="flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/50 py-0.5 px-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
              {businesses.length} locales
            </span>
          </div>
        </div>

        {/* Metric 3: Active Kitchen Orders */}
        <div className="rounded-2xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 p-5 md:p-6 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-[#FF3F1A] shadow-2xs">
            <Flame className="w-5 h-5" />
          </div>

          <div className="mt-5 flex items-end justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
                En Cocina (KDS)
              </span>
              <h4 className="mt-1 text-2xl sm:text-3xl font-black text-[#FF3F1A] tracking-tight">
                {activeOrdersInKitchen}
              </h4>
            </div>

            <span className="flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 py-0.5 px-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
              <CheckCircle2 className="w-3.5 h-3.5" />
              En tiempo
            </span>
          </div>
        </div>

        {/* Metric 4: Avg Ticket */}
        <div className="rounded-2xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 p-5 md:p-6 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 shadow-2xs">
            <Zap className="w-5 h-5" />
          </div>

          <div className="mt-5 flex items-end justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
                Ticket Promedio
              </span>
              <h4 className="mt-1 text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                {avgTicket}
              </h4>
            </div>

            <span className="text-xs font-mono font-bold text-zinc-400">
              COP
            </span>
          </div>
        </div>
      </div>

      {/* Branch Breakdown Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-[#FF3F1A]" />
            <div>
              <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-100 leading-tight">
                Sucursales y Marcas del Grupo
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Accede a la analítica o entra al panel operativo de cada franquicia
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            intent="franchise.create.open"
            onClick={() => navigate("/onboarding")}
            className="py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nueva Sucursal / Tienda</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {businesses.map((biz, idx) => {
            const mockRevenue = idx === 0 ? "$ 3.120.000" : "$ 1.730.000";
            const mockTickets = idx === 0 ? "31 pedidos" : "17 pedidos";
            const mockInKitchen = idx === 0 ? 4 : 3;

            return (
              <div
                key={biz.id}
                onClick={() => {
                  switchBusiness(biz.id);
                  navigate("/");
                }}
                className="relative rounded-3xl bg-white dark:bg-[#18181B] border border-zinc-200/90 dark:border-zinc-800 hover:border-[#FF3F1A] dark:hover:border-[#FF3F1A] transition-all shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden group cursor-pointer"
              >
                {/* Top Banner Cover Photo - 100% Nítido y Vívido */}
                <div className="h-28 sm:h-32 w-full relative overflow-hidden bg-zinc-900 flex-none select-none">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  {/* Top Floating Actions: Settings Gear & Status Badge */}
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBusinessForSettings(biz);
                      }}
                      title="Configurar Local, Branding y Bot"
                      className="p-1.5 rounded-full bg-black/60 hover:bg-[#FF3F1A] backdrop-blur-md text-zinc-300 hover:text-white border border-white/20 hover:border-[#FF3F1A] transition-all cursor-pointer shadow-md flex items-center justify-center"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>

                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-emerald-400 text-[10px] font-bold font-mono uppercase tracking-wider flex items-center gap-1 border border-emerald-500/30 shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Operando
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 pt-0 space-y-5 flex-1 flex flex-col justify-between">
                  {/* Avatar overlapping the banner */}
                  <div className="flex items-end gap-3.5 -mt-7 z-10">
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 border-2 border-white dark:border-zinc-700 flex items-center justify-center flex-none shadow-md overflow-hidden ring-4 ring-black/5 dark:ring-black/20">
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
                        <BusinessIcon iconKey={biz.iconKey} className="w-7 h-7 text-[#FF3F1A]" />
                      )}
                    </div>
                    <div className="min-w-0 pb-1 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-base font-bold text-zinc-950 dark:text-zinc-50 leading-tight group-hover:text-[#FF3F1A] transition-colors truncate">
                          {biz.name}
                        </h4>
                        <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 group-hover:text-[#FF3F1A] flex items-center gap-1 transition-colors flex-none">
                          <span className="hidden sm:inline">Ingresar</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 font-medium mt-0.5">
                        {biz.city} · <span className="text-zinc-500 font-mono">{biz.currency}</span>
                      </p>
                    </div>
                  </div>

                  {/* Branch Live Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-center">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Ventas</span>
                      <span className="text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-zinc-100">{mockRevenue}</span>
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

