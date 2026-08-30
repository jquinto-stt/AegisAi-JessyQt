import React, { useState, useEffect } from "react";
import { PedidosProvider, usePedidos } from "./context/PedidosContext";
import { PedidosSection, OperacionTab, GestionTab } from "./types";
import { PedidosEnVivoView } from "./operacion/PedidosEnVivoView";
import { PreparacionTiemposView } from "./operacion/PreparacionTiemposView";
import { ProgramadosView } from "./operacion/ProgramadosView";
import { ResumenDashboardView } from "./gestion/ResumenDashboardView";
import { HistorialView } from "./gestion/HistorialView";
import { CatalogoInteligenteView } from "./gestion/CatalogoInteligenteView";
import { InsumosStockView } from "./gestion/InsumosStockView";
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
  DEFAULT_LAYOUT_PREFS,
  LayoutPreferences,
} from "./shared/CustomLayoutModal";
import {
  Sparkles,
  Zap,
  ShoppingBag,
  ChefHat,
  Calendar,
  Layers,
  Package,
  Repeat,
  Users,
  BarChart2,
  Bell,
  ShieldAlert,
  History,
  Store,
  Volume2,
  VolumeX,
  Camera,
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
  const { orders, isSoundEnabled, toggleSound, incidencias } = usePedidos();
  const [section, setSection] = useState<PedidosSection>(sectionProp);
  const [opTab, setOpTab] = useState<OperacionTab>(opTabProp);
  const [geTab, setGeTab] = useState<GestionTab>(geTabProp);

  const [isIncidenciasOpen, setIsIncidenciasOpen] = useState(false);
  const [isQuickStockOpen, setIsQuickStockOpen] = useState(false);

  // Layout Preferences for top header visibility
  const [layoutPrefs, setLayoutPrefs] = useState<LayoutPreferences>(() => {
    try {
      const saved = localStorage.getItem("necto_pedidos_layout_prefs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.showTopHeader === "boolean") return parsed;
      }
    } catch (e) {}
    return DEFAULT_LAYOUT_PREFS;
  });

  useEffect(() => {
    const handleLayoutUpdate = () => {
      try {
        const saved = localStorage.getItem("necto_pedidos_layout_prefs");
        if (saved) {
          setLayoutPrefs(JSON.parse(saved));
        }
      } catch (e) {}
    };
    window.addEventListener("necto_layout_changed", handleLayoutUpdate);
    window.addEventListener("storage", handleLayoutUpdate);
    return () => {
      window.removeEventListener("necto_layout_changed", handleLayoutUpdate);
      window.removeEventListener("storage", handleLayoutUpdate);
    };
  }, []);

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
      {/* Top Module Sub-header: Operación ↔ Gestión Pill Switcher & Sub-tabs (Toggleable via Personalizar Vista) */}
      {layoutPrefs.showTopHeader && (
      <div className="bg-white dark:bg-[#2C2D31] rounded-2xl p-3.5 sm:p-4 border border-slate-200 dark:border-[#374151] shadow-xs flex flex-col gap-3 flex-none">
        {/* Row 1: Section Switcher (Left) + Actions (Right) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-gray-800/80 pb-3">
          {/* Section Pill Switcher (4 Pilares) */}
          <div className="flex bg-slate-100 dark:bg-gray-800 p-1 rounded-2xl border border-slate-200 dark:border-gray-700 w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleSectionSwitch("operacion")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-none whitespace-nowrap ${
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
              onClick={() => handleSectionSwitch("menu")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-none whitespace-nowrap ${
                section === "menu"
                  ? "bg-[#FF3F1A] text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Menú & Stock</span>
            </button>

            <button
              onClick={() => handleSectionSwitch("analitica")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-none whitespace-nowrap ${
                section === "analitica"
                  ? "bg-[#FF3F1A] text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Analítica</span>
            </button>

            <button
              onClick={() => handleSectionSwitch("configuracion")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-none whitespace-nowrap ${
                section === "configuracion"
                  ? "bg-[#FF3F1A] text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Configuración</span>
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
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white"
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
                  ? "border-[#FF3F1A] bg-orange-50 dark:bg-orange-950/40 text-[#FF3F1A]"
                  : "border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-slate-100"
              }`}
            >
              <ShieldAlert className={`w-4 h-4 ${activeIncCount > 0 ? "text-[#FF3F1A]" : "text-gray-400"}`} />
              <span>Incidencias</span>
              {activeIncCount > 0 && (
                <span className="bg-[#FF3F1A] text-white px-1.5 py-0.2 rounded-full text-[10px] font-black">
                  {activeIncCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Sub-tabs Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none scroll-smooth max-w-full flex-nowrap sm:flex-wrap py-0.5">
          {section === "operacion" && (
            <>
              {[
                { id: "en-vivo" as OperacionTab, label: "Tablero de Pedidos", icon: <ShoppingBag className="w-3.5 h-3.5 flex-none" /> },
                { id: "preparacion" as OperacionTab, label: "KDS Cocina & Tiempos", icon: <ChefHat className="w-3.5 h-3.5 flex-none" /> },
                { id: "programados" as OperacionTab, label: "Programados & Futuros", icon: <Calendar className="w-3.5 h-3.5 flex-none" /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleOpTabSwitch(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer flex-none text-xs whitespace-nowrap ${
                    opTab === tab.id
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                      : "text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </>
          )}

          {(section === "menu" || (section === "gestion" && (geTab === "catalogo" || geTab === "insumos"))) && (
            <>
              {[
                { id: "catalogo" as GestionTab, label: "Catálogo de Platos", icon: <Layers className="w-3.5 h-3.5 flex-none" /> },
                { id: "insumos" as GestionTab, label: "Insumos & Stock (Escandallos)", icon: <Package className="w-3.5 h-3.5 flex-none" /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleGeTabSwitch(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer flex-none text-xs whitespace-nowrap ${
                    geTab === tab.id
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                      : "text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </>
          )}

          {(section === "analitica" || (section === "gestion" && (geTab === "resumen" || geTab === "historial" || geTab === "analitica"))) && (
            <>
              {[
                { id: "resumen" as GestionTab, label: "Dashboard Ejecutivo", icon: <BarChart2 className="w-3.5 h-3.5 flex-none" /> },
                { id: "historial" as GestionTab, label: "Historial de Ventas", icon: <History className="w-3.5 h-3.5 flex-none" /> },
                { id: "analitica" as GestionTab, label: "Rendimiento & Canales", icon: <BarChart2 className="w-3.5 h-3.5 flex-none" /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleGeTabSwitch(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer flex-none text-xs whitespace-nowrap ${
                    geTab === tab.id
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                      : "text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </>
          )}

          {(section === "configuracion" || (section === "gestion" && (geTab === "automatizaciones" || geTab === "turnos"))) && (
            <>
              {[
                { id: "automatizaciones" as GestionTab, label: "Automatizaciones & WhatsApp IA", icon: <Zap className="w-3.5 h-3.5 flex-none" /> },
                { id: "turnos" as GestionTab, label: "Turnos y Capacidad de Cocina", icon: <Users className="w-3.5 h-3.5 flex-none" /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleGeTabSwitch(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer flex-none text-xs whitespace-nowrap ${
                    geTab === tab.id
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
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
      )}

      {/* Main Tab Render Container */}
      <div className="flex-1 min-h-0">
        {section === "operacion" && (
          <>
            {opTab === "en-vivo" && <PedidosEnVivoView onNavigateOpTab={handleOpTabSwitch} />}
            {opTab === "preparacion" && <PreparacionTiemposView onNavigateOpTab={handleOpTabSwitch} />}
            {opTab === "programados" && <ProgramadosView onNavigateOpTab={handleOpTabSwitch} />}
          </>
        )}

        {(section === "menu" || section === "analitica" || section === "configuracion" || section === "gestion") && (
          <>
            {geTab === "resumen" && <ResumenDashboardView onNavigateGestion={handleGeTabSwitch} />}
            {geTab === "historial" && <HistorialView />}
            {geTab === "catalogo" && <CatalogoInteligenteView targetProductId={targetProductId} />}
            {geTab === "insumos" && <InsumosStockView />}
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
