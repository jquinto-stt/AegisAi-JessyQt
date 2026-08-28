import React, { useState, useEffect } from "react";
import { PedidosProvider, usePedidos } from "./context/PedidosContext";
import { PedidosSection, OperacionTab, GestionTab } from "./types";
import { PedidosEnVivoView } from "./operacion/PedidosEnVivoView";
import { PreparacionTiemposView } from "./operacion/PreparacionTiemposView";
import { ProgramadosView } from "./operacion/ProgramadosView";
import { ResumenDashboardView } from "./gestion/ResumenDashboardView";
import { HistorialView } from "./gestion/HistorialView";
import { CatalogoInteligenteView } from "./gestion/CatalogoInteligenteView";
import { AutomatizacionesView } from "./gestion/AutomatizacionesView";
import { TurnosCapacidadView } from "./gestion/TurnosCapacidadView";
import { AnaliticaView } from "./gestion/AnaliticaView";
import { OrderDetailDrawer } from "./shared/OrderDetailDrawer";
import { AIInterpretationModal } from "./shared/AIInterpretationModal";
import { RejectCancelModal } from "./shared/RejectCancelModal";
import { IncidenciasDrawer } from "./shared/IncidenciasDrawer";
import { ThermalTicketModal } from "./shared/ThermalTicketModal";
import { StorePaceSelector } from "./shared/StorePaceSelector";
import {
  Sparkles,
  Zap,
  ShoppingBag,
  ChefHat,
  Calendar,
  Layers,
  Repeat,
  Users,
  BarChart2,
  Bell,
  ShieldAlert,
  History,
  Store,
  Volume2,
  VolumeX,
} from "lucide-react";

const PedidosContent: React.FC<{
  sectionProp?: PedidosSection;
  opTabProp?: OperacionTab;
  geTabProp?: GestionTab;
  targetOrderId?: string | null;
  targetModal?: "ticket" | "ai" | "incidencias" | "product" | null;
  targetProductId?: string | null;
  onSectionChange?: (s: PedidosSection) => void;
  onOpTabChange?: (t: OperacionTab) => void;
  onGeTabChange?: (t: GestionTab) => void;
}> = ({
  sectionProp = "operacion",
  opTabProp = "en-vivo",
  geTabProp = "resumen",
  targetOrderId,
  targetModal,
  targetProductId,
  onSectionChange,
  onOpTabChange,
  onGeTabChange,
}) => {
  const [section, setSection] = useState<PedidosSection>(sectionProp);
  const [opTab, setOpTab] = useState<OperacionTab>(opTabProp);
  const [geTab, setGeTab] = useState<GestionTab>(geTabProp);

  const {
    incidencias,
    setIsIncidenciasOpen,
    orders,
    setSelectedOrderId,
    setAiModalOrder,
    isSoundEnabled,
    toggleSound,
  } = usePedidos();

  useEffect(() => {
    if (targetOrderId) {
      if (targetModal === "ai") {
        const ord = orders.find(o => o.id === targetOrderId) || orders.find(o => o.channel === "whatsapp");
        if (ord) setAiModalOrder(ord);
      } else {
        setSelectedOrderId(targetOrderId);
      }
    } else if (targetModal === "incidencias") {
      setIsIncidenciasOpen(true);
    }
  }, [targetOrderId, targetModal, orders, setSelectedOrderId, setAiModalOrder, setIsIncidenciasOpen]);

  useEffect(() => {
    setSection(sectionProp);
  }, [sectionProp]);

  useEffect(() => {
    setOpTab(opTabProp);
  }, [opTabProp]);

  useEffect(() => {
    setGeTab(geTabProp);
  }, [geTabProp]);

  const handleSectionSwitch = (s: PedidosSection) => {
    setSection(s);
    if (onSectionChange) onSectionChange(s);
  };

  const handleOpTabSwitch = (t: OperacionTab) => {
    setOpTab(t);
    if (onOpTabChange) onOpTabChange(t);
  };

  const handleGeTabSwitch = (t: GestionTab) => {
    setGeTab(t);
    if (onGeTabChange) onGeTabChange(t);
  };

  const activeIncCount = incidencias.filter(i => !i.isResolved).length;
  const newOrdersCount = orders.filter(o => o.status === "NUEVO").length;

  return (
    <div className="flex flex-col h-full space-y-5 p-4 sm:p-6 max-w-[1600px] mx-auto w-full">
      {/* Top Module Sub-header: Operación ↔ Gestión Pill Switcher & Sub-tabs */}
      <div className="bg-white dark:bg-[#2C2D31] rounded-2xl p-3.5 sm:p-4 border border-slate-200 dark:border-[#374151] shadow-xs flex flex-col gap-3 flex-none">
        {/* Row 1: Section Switcher (Left) + Actions (Right) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-gray-800/80 pb-3">
          {/* Section Pill Switcher (Operación vs Gestión) */}
          <div className="flex bg-slate-100 dark:bg-gray-800 p-1 rounded-2xl border border-slate-200 dark:border-gray-700 w-full sm:w-auto">
            <button
              onClick={() => handleSectionSwitch("operacion")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                section === "operacion"
                  ? "bg-[#FF3F1A] text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Operación</span>
              {newOrdersCount > 0 && (
                <span className="text-[10px] bg-white text-[#FF3F1A] px-1.5 py-0.2 rounded-full font-black">
                  {newOrdersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleSectionSwitch("gestion")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                section === "gestion"
                  ? "bg-[#190088] text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Gestión</span>
            </button>
          </div>

          {/* Right Actions: Sound, Store Pace Kitchen Throttle & Incidencias */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-end">
            {/* Audio Alerts Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className={`p-2 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center justify-center flex-none ${
                isSoundEnabled
                  ? "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:scale-105"
                  : "bg-slate-100 dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-gray-400 hover:text-gray-600"
              }`}
              title={isSoundEnabled ? "Alertas sonoras de cocina activadas" : "Alertas sonoras silenciadas"}
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <StorePaceSelector />

            <button
              onClick={() => setIsIncidenciasOpen(true)}
              className={`py-2 px-3.5 rounded-xl border text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-xs flex-none ${
                activeIncCount > 0
                  ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 hover:bg-red-100"
                  : "border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-slate-100"
              }`}
            >
              <ShieldAlert className={`w-4 h-4 ${activeIncCount > 0 ? "text-red-600 animate-pulse" : "text-gray-400"}`} />
              <span>Incidencias</span>
              {activeIncCount > 0 && (
                <span className="bg-red-600 text-white px-1.5 py-0.2 rounded-full text-[10px] font-black">
                  {activeIncCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Sub-tabs Navigation (Smooth Horizontal Scroll on small screens, wrap cleanly on desktop) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none scroll-smooth max-w-full flex-nowrap sm:flex-wrap py-0.5">
          {section === "operacion" ? (
            <>
              {[
                { id: "en-vivo" as OperacionTab, label: "Tablero de Comandas", icon: <ShoppingBag className="w-3.5 h-3.5 flex-none" /> },
                { id: "preparacion" as OperacionTab, label: "Preparación y Tiempos", icon: <ChefHat className="w-3.5 h-3.5 flex-none" /> },
                { id: "programados" as OperacionTab, label: "Programados", icon: <Calendar className="w-3.5 h-3.5 flex-none" /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleOpTabSwitch(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer flex-none text-xs whitespace-nowrap ${
                    opTab === tab.id
                      ? "bg-orange-50 dark:bg-orange-950/60 text-[#FF3F1A] border border-orange-200 dark:border-orange-800 shadow-xs"
                      : "text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </>
          ) : (
            <>
              {[
                { id: "resumen" as GestionTab, label: "Dashboard Pedidos", icon: <BarChart2 className="w-3.5 h-3.5 flex-none" /> },
                { id: "historial" as GestionTab, label: "Historial", icon: <History className="w-3.5 h-3.5 flex-none" /> },
                { id: "catalogo" as GestionTab, label: "Catálogo", icon: <Layers className="w-3.5 h-3.5 flex-none" /> },
                { id: "automatizaciones" as GestionTab, label: "Automatizaciones & Recurrencias", icon: <Zap className="w-3.5 h-3.5 flex-none" /> },
                { id: "turnos" as GestionTab, label: "Turnos y Capacidad", icon: <Users className="w-3.5 h-3.5 flex-none" /> },
                { id: "analitica" as GestionTab, label: "Analítica", icon: <BarChart2 className="w-3.5 h-3.5 flex-none" /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleGeTabSwitch(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer flex-none text-xs whitespace-nowrap ${
                    geTab === tab.id
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-[#190088] dark:text-blue-400 border border-indigo-200 dark:border-indigo-800 shadow-xs"
                      : "text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Main Tab Render Container */}
      <div className="flex-1 min-h-0">
        {section === "operacion" && (
          <>
            {opTab === "en-vivo" && <PedidosEnVivoView onNavigateOpTab={handleOpTabSwitch} />}
            {opTab === "preparacion" && <PreparacionTiemposView onNavigateOpTab={handleOpTabSwitch} />}
            {opTab === "programados" && <ProgramadosView onNavigateOpTab={handleOpTabSwitch} />}
          </>
        )}

        {section === "gestion" && (
          <>
            {geTab === "resumen" && <ResumenDashboardView onNavigateGestion={handleGeTabSwitch} />}
            {geTab === "historial" && <HistorialView />}
            {geTab === "catalogo" && <CatalogoInteligenteView targetProductId={targetProductId} />}
            {geTab === "automatizaciones" && <AutomatizacionesView />}
            {geTab === "turnos" && <TurnosCapacidadView />}
            {geTab === "analitica" && <AnaliticaView />}
          </>
        )}
      </div>

      {/* Modals & Drawers */}
      <OrderDetailDrawer />
      <AIInterpretationModal />
      <RejectCancelModal />
      <IncidenciasDrawer />
      <ThermalTicketModal />
    </div>
  );
};

export const PedidosModule: React.FC<{
  sectionProp?: PedidosSection;
  opTabProp?: OperacionTab;
  geTabProp?: GestionTab;
  targetOrderId?: string | null;
  targetModal?: "ticket" | "ai" | "incidencias" | "product" | null;
  targetProductId?: string | null;
  onSectionChange?: (s: PedidosSection) => void;
  onOpTabChange?: (t: OperacionTab) => void;
  onGeTabChange?: (t: GestionTab) => void;
}> = props => {
  return (
    <PedidosProvider>
      <PedidosContent {...props} />
    </PedidosProvider>
  );
};
