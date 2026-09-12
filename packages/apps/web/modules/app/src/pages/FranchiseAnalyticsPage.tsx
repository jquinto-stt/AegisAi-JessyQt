import React from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../context/BusinessContext";
import { BusinessIcon } from "../compositions/workspace/BusinessIcon";
import {
  ArrowLeft,
  BarChart2,
  TrendingUp,
  Building2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/elements";

export const FranchiseAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentBusiness, businesses, switchBusiness } = useBusiness();

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0E0F12] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white antialiased">
      {/* Top Executive Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#121316]/95 backdrop-blur-md border-b border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              intent="analytics.back"
              onClick={() => navigate("/workspaces")}
              className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-[#EFE6D3] dark:hover:bg-[#37332A] text-zinc-700 dark:text-zinc-200 hover:text-[#FF3F1A] dark:hover:text-[#FF3F1A] flex items-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Volver a Sucursales y Franquicias"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver a Franquicias</span>
            </Button>

            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden flex-none shadow-2xs">
                {currentBusiness?.logoUrl ? (
                  <img
                    src={currentBusiness.logoUrl}
                    alt={currentBusiness.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BusinessIcon
                    iconKey={currentBusiness?.iconKey || "store"}
                    className="w-5 h-5 text-[#FF3F1A]"
                  />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold text-zinc-950 dark:text-white leading-tight">
                    {currentBusiness?.name || "Franquicia"}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold font-mono uppercase tracking-wider border border-emerald-200/50 dark:border-emerald-800/50">
                    Analítica Corporativa
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {currentBusiness?.city} · Moneda: <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{currentBusiness?.currency}</span>
                </p>
              </div>
            </div>
          </div>

          {businesses.length > 1 && (
            <div className="flex items-center gap-2 self-end md:self-auto">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider hidden lg:inline">
                Sede:
              </span>
              <select
                value={currentBusiness?.id}
                onChange={e => switchBusiness(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none cursor-pointer hover:border-zinc-400 transition-colors"
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
        <div className="p-8 rounded-3xl bg-white dark:bg-[#121316] border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 text-brand-500">
            <BarChart2 className="w-6 h-6" />
            <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">
              Visión General de Franquicia
            </h2>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl">
            Panel ejecutivo consolidado de operaciones. Las métricas operativas se sincronizan en tiempo real al registrar actividad en tus canales activos.
          </p>
        </div>
      </main>
    </div>
  );
};

export default FranchiseAnalyticsPage;
