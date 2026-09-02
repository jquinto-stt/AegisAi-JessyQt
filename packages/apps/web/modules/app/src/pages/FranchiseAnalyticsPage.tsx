import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useBusiness } from "../context/BusinessContext";
import { PedidosProvider } from "../compositions/pedidos/context/PedidosContext";
import { ResumenDashboardView } from "../compositions/pedidos/gestion/ResumenDashboardView";
import { HistorialView } from "../compositions/pedidos/gestion/HistorialView";
import { AnaliticaView } from "../compositions/pedidos/gestion/AnaliticaView";
import { BusinessIcon } from "../compositions/workspace/BusinessIcon";
import {
  ArrowLeft,
  BarChart2,
  History,
  TrendingUp,
  Building2,
  Sparkles,
  Calendar,
  Layers,
} from "lucide-react";
import { Button } from "@/elements";
import { GestionTab } from "../compositions/pedidos/types";

type AnalyticsTab = "resumen" | "historial";

const FranchiseAnalyticsContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentBusiness, businesses, switchBusiness } = useBusiness();

  // Initial tab from route state or default to resumen
  const initialTab: AnalyticsTab =
    (location.state as any)?.tab === "historial" ? "historial" : "resumen";

  const [activeTab, setActiveTab] = useState<AnalyticsTab>(initialTab);

  const tabs: { id: AnalyticsTab; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: "resumen",
      label: "Dashboard Ejecutivo 360°",
      icon: <BarChart2 className="w-4 h-4" />,
      desc: "Facturación, horas pico, rendimiento por canal y platos estrella",
    },
    {
      id: "historial",
      label: "Historial de Ventas & Cierre",
      icon: <History className="w-4 h-4" />,
      desc: "Auditoría de comandas, arqueo de caja y exportación CSV",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0E0F12] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white antialiased">
      {/* Top Executive Header (Sin barra lateral de tienda) */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#121316]/95 backdrop-blur-md border-b border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Back to Hub + Franchise Identity */}
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

            {/* Franchise Info */}
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

          {/* Right: Branch Selector Quick Dropdown if multiple branches exist */}
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

        {/* Executive Subtabs Bar (2 Tabs) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                intent="analytics.tab.switch"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer flex-none ${
                  isActive
                    ? "bg-[#FF3F1A] text-white shadow-xs"
                    : "bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-[#EFE6D3] dark:hover:bg-[#37332A] hover:text-[#FF3F1A] dark:hover:text-[#FF3F1A]"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Button>
            );
          })}
        </div>
      </header>

      {/* Main Executive Body Container (Full Width, No Sidebar) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "resumen" && (
          <ResumenDashboardView
            onNavigateGestion={t => {
              if (t === "historial") {
                setActiveTab("historial");
              }
            }}
          />
        )}
        {activeTab === "historial" && <HistorialView />}
      </main>
    </div>
  );
};
    </div>
  );
};

export const FranchiseAnalyticsPage: React.FC = () => {
  return (
    <PedidosProvider>
      <FranchiseAnalyticsContent />
    </PedidosProvider>
  );
};

export default FranchiseAnalyticsPage;
