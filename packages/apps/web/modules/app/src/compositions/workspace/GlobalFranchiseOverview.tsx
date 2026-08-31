import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useBusiness, BusinessInstance } from "../../context/BusinessContext";
import { BusinessIcon } from "./BusinessIcon";
import { RoleSelectionModal } from "./RoleSelectionModal";
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
} from "lucide-react";
import { Button } from "@/elements";

export const GlobalFranchiseOverview: React.FC = () => {
  const navigate = useNavigate();
  const { businesses, switchBusiness, setIsCommandPaletteOpen } = useBusiness();
  const [roleSelectBiz, setRoleSelectBiz] = useState<BusinessInstance | null>(null);


  const handleNavigateToAnalitica = (
    e: React.MouseEvent,
    bizId: string,
    geTab: "resumen" | "historial" | "analitica"
  ) => {
    e.stopPropagation();
    switchBusiness(bizId);
    navigate("/", {
      state: {
        section: "analitica",
        geTab,
      },
    });
  };

  // Mock aggregated data across all active branches
  const totalRevenue = "$ 4.850.000";
  const totalOrdersToday = 48;
  const activeOrdersInKitchen = 7;
  const avgTicket = "$ 101.000";

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#FAFAFA] dark:bg-[#1E1E22] text-zinc-900 dark:text-zinc-100 antialiased">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 text-white dark:from-[#121214] dark:via-[#18181B] dark:to-[#121214] p-6 sm:p-8 rounded-3xl border border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-[#FF3F1A]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF3F1A]/20 text-[#FF3F1A] border border-[#FF3F1A]/30">
                <Sparkles className="w-3 h-3" /> Resumen Multi-Local en Tiempo Real
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Visión Franquicia & Grupo
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl">
              Consolidación financiera y operativa de todas tus sucursales activas en una sola pantalla.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              intent="franchise.command.open"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer border border-white/10"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Comando Rápido (Ctrl+K)</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Aggregate KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Revenue */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#2A2B30] border border-zinc-200 dark:border-zinc-700/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-400">
              Ventas Totales Hoy
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-zinc-950 dark:text-zinc-50">{totalRevenue}</h3>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> +18.4%
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">Agregado entre {businesses.length} locales</p>
        </div>

        {/* Metric 2: Orders Count */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#2A2B30] border border-zinc-200 dark:border-zinc-700/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-400">
              Pedidos Despachados
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-zinc-950 dark:text-zinc-50">{totalOrdersToday}</h3>
            <span className="text-xs font-bold text-zinc-500">Tickets hoy</span>
          </div>
          <p className="text-[11px] text-zinc-400">Promedio de {Math.round(totalOrdersToday / (businesses.length || 1))} pedidos/local</p>
        </div>

        {/* Metric 3: Active Kitchen Orders */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#2A2B30] border border-zinc-200 dark:border-zinc-700/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-400">
              En Cocina Ahora (KDS)
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-[#FF3F1A] flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-[#FF3F1A]">{activeOrdersInKitchen}</h3>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> En tiempo
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">Comandas en marcha en simultáneo</p>
        </div>

        {/* Metric 4: Avg Ticket */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#2A2B30] border border-zinc-200 dark:border-zinc-700/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-400">
              Ticket Promedio
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">

              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-zinc-950 dark:text-zinc-50">{avgTicket}</h3>
            <span className="text-xs font-bold text-zinc-400">COP</span>
          </div>
          <p className="text-[11px] text-zinc-400">Ratio de consumo consolidado</p>
        </div>
      </div>

      {/* Branch Breakdown Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#FF3F1A]" />
            <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-100">
              Sucursales y Marcas del Grupo
            </h2>
          </div>
          <span className="text-xs text-zinc-400">
            Accede a la analítica o panel operativo de cada franquicia
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {businesses.map((biz, idx) => {
            const mockRevenue = idx === 0 ? "$ 3.120.000" : "$ 1.730.000";
            const mockTickets = idx === 0 ? "31 pedidos" : "17 pedidos";
            const mockInKitchen = idx === 0 ? 4 : 3;

            return (
              <div
                key={biz.id}
                onClick={() => setRoleSelectBiz(biz)}
                className="relative p-6 rounded-3xl bg-white dark:bg-[#2A2B30] border border-zinc-200/90 dark:border-zinc-700/80 hover:border-[#FF3F1A] dark:hover:border-[#FF3F1A] transition-all shadow-2xs hover:shadow-md flex flex-col justify-between space-y-5 overflow-hidden group cursor-pointer"
              >
                {/* Background Banner Watermark if uploaded */}
                {biz.bannerUrl && (
                  <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.10] pointer-events-none overflow-hidden">
                    <img src={biz.bannerUrl} alt="" className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-500" />
                  </div>
                )}

                {/* Branch Header */}
                <div className="flex items-start justify-between gap-4 z-10">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-none shadow-2xs overflow-hidden">
                      {biz.logoUrl ? (
                        <img src={biz.logoUrl} alt={biz.name} className="w-full h-full object-cover" />
                      ) : (
                        <BusinessIcon iconKey={biz.iconKey} className="w-6 h-6 text-[#FF3F1A]" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-zinc-950 dark:text-zinc-50 leading-tight group-hover:text-[#FF3F1A] transition-colors">
                        {biz.name}
                      </h4>
                      <p className="text-xs text-zinc-400 font-medium mt-0.5">
                        {biz.city} · <span className="text-zinc-500 font-mono">{biz.currency}</span>
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold font-mono uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Operando
                  </span>
                </div>

                {/* Branch Live Metrics Row */}
                <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/60 text-center">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Ventas</span>
                    <span className="text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-zinc-100">{mockRevenue}</span>
                  </div>
                  <div className="border-x border-zinc-200 dark:border-zinc-700">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Volumen</span>
                    <span className="text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-zinc-100">{mockTickets}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">KDS Cocina</span>
                    <span className="text-xs sm:text-sm font-extrabold text-[#FF3F1A]">{mockInKitchen} activos</span>
                  </div>
                </div>

                {/* 3 Analítica & Reportes Quick Actions */}
                <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider block">
                    Analítica & Reportes de esta Franquicia
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="ghost"
                      intent="franchise.analitica.resumen"
                      onClick={e => handleNavigateToAnalitica(e, biz.id, "resumen")}
                      className="p-2 rounded-xl bg-zinc-100/80 hover:bg-[#FF3F1A] hover:text-white dark:bg-zinc-800 dark:hover:bg-[#FF3F1A] text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer shadow-2xs group/btn"
                      title="Ver Dashboard de Pedidos"
                    >
                      <BarChart2 className="w-3.5 h-3.5 text-[#FF3F1A] group-hover/btn:text-white transition-colors" />
                      <span className="text-[10px] font-medium leading-tight">Dashboard</span>
                    </Button>

                    <Button
                      variant="ghost"
                      intent="franchise.analitica.historial"
                      onClick={e => handleNavigateToAnalitica(e, biz.id, "historial")}
                      className="p-2 rounded-xl bg-zinc-100/80 hover:bg-[#FF3F1A] hover:text-white dark:bg-zinc-800 dark:hover:bg-[#FF3F1A] text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer shadow-2xs group/btn"
                      title="Ver Historial de Ventas"
                    >
                      <History className="w-3.5 h-3.5 text-[#FF3F1A] group-hover/btn:text-white transition-colors" />
                      <span className="text-[10px] font-medium leading-tight">Historial</span>
                    </Button>

                    <Button
                      variant="ghost"
                      intent="franchise.analitica.rendimiento"
                      onClick={e => handleNavigateToAnalitica(e, biz.id, "analitica")}
                      className="p-2 rounded-xl bg-zinc-100/80 hover:bg-[#FF3F1A] hover:text-white dark:bg-zinc-800 dark:hover:bg-[#FF3F1A] text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer shadow-2xs group/btn"
                      title="Ver Rendimiento & Canales"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-[#FF3F1A] group-hover/btn:text-white transition-colors" />
                      <span className="text-[10px] font-medium leading-tight">Rendimiento</span>
                    </Button>
                  </div>
                </div>

                {/* Footer Action: Enter Workspace via Profile Selector */}
                <Button
                  variant="primary"
                  intent="franchise.business.enter"
                  onClick={e => {
                    e.stopPropagation();
                    setRoleSelectBiz(biz);
                  }}
                  className="w-full py-2.5 px-4 text-xs justify-between"
                >
                  <span>Entrar al Tablero de Comandas</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
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
    </div>
  );
};

