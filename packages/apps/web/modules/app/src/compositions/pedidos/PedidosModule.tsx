import React, { useState, useEffect } from "react";
import { PedidosProvider, usePedidos } from "./context/PedidosContext";
import { PedidosSection, OperacionTab, GestionTab } from "./types";
import { PedidosEnVivoView } from "./operacion/PedidosEnVivoView";
import { PreparacionTiemposView } from "./operacion/PreparacionTiemposView";
import { ProgramadosView } from "./operacion/ProgramadosView";
import { ConversacionesView } from "./operacion/ConversacionesView";
import { ResumenDashboardView } from "./gestion/ResumenDashboardView";
import { HistorialView } from "./gestion/HistorialView";
import { CatalogoInteligenteView } from "./gestion/CatalogoInteligenteView";
import { InsumosStockView } from "./gestion/InsumosStockView";
import { AutomatizacionesView } from "./gestion/AutomatizacionesView";
import { TurnosCapacidadView } from "./gestion/TurnosCapacidadView";
import { RolesPermisosView } from "./gestion/RolesPermisosView";
import { AnaliticaView } from "./gestion/AnaliticaView";
import { CanalesAsistenteView } from "./gestion/CanalesAsistenteView";
import { OrderDetailDrawer } from "./shared/OrderDetailDrawer";
import { AIInterpretationModal } from "./shared/AIInterpretationModal";
import { RejectCancelModal } from "./shared/RejectCancelModal";
import { IncidenciasDrawer } from "./shared/IncidenciasDrawer";
import { ThermalTicketModal } from "./shared/ThermalTicketModal";
import { WhatsAppFloatingWidget } from "./shared/WhatsAppFloatingWidget";
import { useBusiness } from "@/context/BusinessContext";

import {
  DEFAULT_LAYOUT_PREFS,
  LayoutPreferences,
} from "./shared/CustomLayoutModal";
import {
  Activity,
  ShoppingBag,
  ChefHat,
  Layers,
  Package,
  Users,
  BarChart2,
  Shield,
  SlidersHorizontal,
  ShieldAlert,
  History,
  Volume2,
  VolumeX,
  MessagesSquare,
  TrendingUp,
  Calendar,
  Smartphone,
  Truck,
} from "lucide-react";
import { Button } from "@/elements";


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
  geTabProp = "catalogo",
  targetOrderId,
  targetModal,
  targetProductId,
  onSectionChange,
  onOpTabChange,
  onGeTabChange,
}) => {
  const {
    orders,
    programados,
    isSoundEnabled,
    toggleSound,
    incidencias,
    setIsIncidenciasOpen,
    conversations,
    setSelectedOrderId,
    setAiModalOrder,
    setPrintTicketOrder,
  } = usePedidos();
  const { semantics } = useBusiness();
  const isFood = semantics?.requiresKitchenDisplay;

  const [section, setSection] = useState<PedidosSection>(sectionProp);
  const [opTab, setOpTab] = useState<OperacionTab>(opTabProp);
  const [geTab, setGeTab] = useState<GestionTab>(geTabProp || "catalogo");

  // Handle deep-linking from global notifications or search
  useEffect(() => {
    if (targetModal === "incidencias") {
      setIsIncidenciasOpen(true);
      return;
    }

    if (targetOrderId) {
      const order = orders.find(o => o.id === targetOrderId);
      if (order) {
        if (targetModal === "ai") {
          setAiModalOrder(order);
        } else if (targetModal === "ticket") {
          setPrintTicketOrder(order);
        } else {
          setSelectedOrderId(targetOrderId);
        }
      } else {
        setSelectedOrderId(targetOrderId);
      }
    }
  }, [targetOrderId, targetModal, orders, setAiModalOrder, setPrintTicketOrder, setSelectedOrderId, setIsIncidenciasOpen]);

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

    const handleNavigateEvent = (e: any) => {
      if (e.detail?.section) {
        setSection(e.detail.section);
        if (onSectionChange) onSectionChange(e.detail.section);
      }
      if (e.detail?.opTab) {
        setOpTab(e.detail.opTab);
        if (onOpTabChange) onOpTabChange(e.detail.opTab);
      }
      if (e.detail?.geTab) {
        setGeTab(e.detail.geTab);
        if (onGeTabChange) onGeTabChange(e.detail.geTab);
      }
    };
    window.addEventListener("necto_navigate_pedidos", handleNavigateEvent);

    return () => {
      window.removeEventListener("necto_layout_changed", handleLayoutUpdate);
      window.removeEventListener("storage", handleLayoutUpdate);
      window.removeEventListener("necto_navigate_pedidos", handleNavigateEvent);
    };
  }, [onSectionChange, onOpTabChange, onGeTabChange]);

  useEffect(() => {
    setSection(sectionProp);
  }, [sectionProp]);

  useEffect(() => {
    setOpTab(opTabProp);
  }, [opTabProp]);

  useEffect(() => {
    setGeTab(geTabProp || "catalogo");
  }, [geTabProp]);

  const handleSectionSwitch = (s: PedidosSection) => {
    setSection(s);
    if (s === "menu") {
      const nextGe = (geTab === "catalogo" || geTab === "insumos") ? geTab : "catalogo";
      setGeTab(nextGe);
      if (onGeTabChange) onGeTabChange(nextGe);
    } else if (s === "analitica") {
      const nextGe = (geTab === "resumen" || geTab === "historial" || geTab === "analitica") ? geTab : "resumen";
      setGeTab(nextGe);
      if (onGeTabChange) onGeTabChange(nextGe);
    } else if (s === "configuracion") {
      const nextGe = (geTab === "canales" || geTab === "roles" || geTab === "automatizaciones" || geTab === "turnos") ? geTab : "canales";
      setGeTab(nextGe);
      if (onGeTabChange) onGeTabChange(nextGe);
    }
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
  const pendingConversationsCount = conversations.filter(c => c.status === "REQUIERE_INTERVENCION").length;
  const isKanbanActive = section === "operacion" && opTab === "en-vivo";
  const shouldShowTopHeader = isKanbanActive ? layoutPrefs.showTopHeader : true;



  return (
    <div className="flex flex-col h-full space-y-3.5 p-2.5 sm:p-4 w-full">
      {/* Top Module Sub-header: Operación ↔ Menú ↔ Analítica ↔ Configuración Pill Switcher & Sub-tabs */}
      {shouldShowTopHeader && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-3.5 sm:p-4 border border-gray-200 dark:border-gray-800 shadow-theme-xs flex flex-col gap-3 flex-none animate-fade-in">

        {/* Row 1: Section Switcher (Left) + Actions (Right) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
          {/* Section Pill Switcher */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => handleSectionSwitch("operacion")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-none whitespace-nowrap ${
                section === "operacion"
                  ? "bg-brand-500 text-white shadow-theme-xs font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Activity className="size-3.5" />
              <span>Operación</span>
              {newOrdersCount + pendingConversationsCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${section === "operacion" ? "bg-white text-brand-500" : "bg-brand-500 text-white"}`}>
                  {newOrdersCount + pendingConversationsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSectionSwitch("menu")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-none whitespace-nowrap ${
                section === "menu"
                  ? "bg-brand-500 text-white shadow-theme-xs font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Layers className="size-3.5" />
              <span>{isFood ? "Menú & Carta" : "Catálogo de Venta"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSectionSwitch("analitica")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-none whitespace-nowrap ${
                section === "analitica"
                  ? "bg-brand-500 text-white shadow-theme-xs font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <BarChart2 className="size-3.5" />
              <span>Analítica & Reportes</span>
            </button>

            <button
              type="button"
              onClick={() => handleSectionSwitch("configuracion")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-none whitespace-nowrap ${
                section === "configuracion"
                  ? "bg-brand-500 text-white shadow-theme-xs font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Users className="size-3.5" />
              <span>Configuración</span>
            </button>
          </div>

          {/* Right Actions: Sound & Incidencias (Only visible in Operación) */}
          {section === "operacion" && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-end animate-fade-in">
              {/* Audio Alerts Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center justify-center flex-none ${
                  isSoundEnabled
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600"
                }`}
                title={isSoundEnabled ? "Alertas sonoras activadas" : "Alertas sonoras silenciadas"}
              >
                {isSoundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsIncidenciasOpen(true)}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer flex-none ${
                  activeIncCount > 0
                    ? "border-error-200 dark:border-error-500/30 bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 font-semibold"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:text-brand-500"
                }`}
              >
                <ShieldAlert className={`size-4 ${activeIncCount > 0 ? "text-error-500" : "text-gray-400"}`} />
                <span>Incidencias</span>
                {activeIncCount > 0 && (
                  <span className="bg-error-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                    {activeIncCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Row 2: Sub-tabs Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full flex-nowrap sm:flex-wrap py-0.5">
          {section === "operacion" && (
            <>
              {[
                {
                  id: "en-vivo" as OperacionTab,
                  label: "Órdenes",
                  icon: <ShoppingBag className="size-3.5 flex-none" />,
                  count: orders.length,
                  highlightBadge: newOrdersCount > 0 ? `${newOrdersCount} nuevos` : undefined,
                },
                {
                  id: "preparacion" as OperacionTab,
                  label: isFood ? "Pantalla KDS Cocina" : "Alistamiento & Despacho",
                  icon: isFood ? <ChefHat className="size-3.5 flex-none" /> : <Truck className="size-3.5 flex-none" />,
                  count: orders.filter(o => o.status === "EN_PREPARACION" || o.status === "CONFIRMADO").length,
                },
                {
                  id: "programados" as OperacionTab,
                  label: "Entregas Programadas",
                  icon: <Calendar className="size-3.5 flex-none" />,
                  count: programados.length,
                },
                {
                  id: "conversaciones" as OperacionTab,
                  label: "Conversaciones WhatsApp",
                  icon: <MessagesSquare className="size-3.5 flex-none" />,
                  count: conversations.length,
                  highlightBadge: pendingConversationsCount > 0 ? `${pendingConversationsCount} atención` : undefined,
                },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleOpTabSwitch(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer flex-none text-xs whitespace-nowrap ${
                    opTab === tab.id
                      ? "bg-brand-500 text-white font-semibold shadow-theme-xs"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                        opTab === tab.id
                          ? "bg-white/20 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {tab.highlightBadge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${opTab === tab.id ? "bg-white text-brand-500" : "bg-brand-500 text-white"}`}>
                      {tab.highlightBadge}
                    </span>
                  )}
                </button>
              ))}
            </>
          )}

          {(section === "menu" || (section === "gestion" && (geTab === "catalogo" || geTab === "insumos"))) && (
            <>
              {[
                {
                  id: "catalogo" as GestionTab,
                  label: isFood ? "Catálogo de Platos" : "Catálogo de Productos",
                  icon: <Layers className="size-3.5 flex-none" />,
                },
                ...(isFood
                  ? [
                      {
                        id: "insumos" as GestionTab,
                        label: "Insumos & Stock (Escandallos)",
                        icon: <Package className="size-3.5 flex-none" />,
                      },
                    ]
                  : []),
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleGeTabSwitch(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer flex-none text-xs whitespace-nowrap ${
                    geTab === tab.id
                      ? "bg-brand-500 text-white font-semibold shadow-theme-xs"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
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
                { id: "resumen" as GestionTab, label: "Resumen Dashboard", icon: <TrendingUp className="size-3.5 flex-none" /> },
                { id: "historial" as GestionTab, label: "Historial de Pedidos", icon: <History className="size-3.5 flex-none" /> },
                { id: "analitica" as GestionTab, label: "Métricas de Rendimiento", icon: <BarChart2 className="size-3.5 flex-none" /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleGeTabSwitch(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer flex-none text-xs whitespace-nowrap ${
                    geTab === tab.id
                      ? "bg-brand-500 text-white font-semibold shadow-theme-xs"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </>
          )}

          {(section === "configuracion" || (section === "gestion" && (geTab === "canales" || geTab === "roles" || geTab === "automatizaciones" || geTab === "turnos"))) && (
            <>
              {[
                { id: "canales" as GestionTab, label: "Canales & Asistente WhatsApp", icon: <Smartphone className="size-3.5 flex-none" /> },
                { id: "roles" as GestionTab, label: "Roles & Permisos del Equipo", icon: <Shield className="size-3.5 flex-none" /> },
                { id: "automatizaciones" as GestionTab, label: "Automatizaciones & Reglas WhatsApp", icon: <SlidersHorizontal className="size-3.5 flex-none" /> },
                {
                  id: "turnos" as GestionTab,
                  label: isFood ? "Turnos y Capacidad de Cocina" : "Turnos y Capacidad Operativa",
                  icon: <Users className="size-3.5 flex-none" />,
                },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleGeTabSwitch(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer flex-none text-xs whitespace-nowrap ${
                    geTab === tab.id
                      ? "bg-brand-500 text-white font-semibold shadow-theme-xs"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
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
            {(opTab === "en-vivo" || (opTab !== "preparacion" && opTab !== "programados" && opTab !== "conversaciones")) && (
              <PedidosEnVivoView onNavigateOpTab={handleOpTabSwitch} />
            )}
            {opTab === "preparacion" && <PreparacionTiemposView onNavigateOpTab={handleOpTabSwitch} />}
            {opTab === "programados" && <ProgramadosView onNavigateOpTab={handleOpTabSwitch} />}
            {opTab === "conversaciones" && <ConversacionesView />}
          </>
        )}

        {section === "menu" && (
          <>
            {(geTab === "catalogo" || geTab !== "insumos") && (
              <CatalogoInteligenteView targetProductId={targetProductId} />
            )}
            {geTab === "insumos" && <InsumosStockView />}
          </>
        )}

        {section === "analitica" && (
          <>
            {(geTab === "resumen" || (geTab !== "historial" && geTab !== "analitica")) && (
              <ResumenDashboardView onNavigateGestion={handleGeTabSwitch} />
            )}
            {geTab === "historial" && <HistorialView />}
            {geTab === "analitica" && <AnaliticaView />}
          </>
        )}

        {section === "configuracion" && (
          <>
            {(geTab === "canales" || (geTab !== "roles" && geTab !== "automatizaciones" && geTab !== "turnos")) && (
              <CanalesAsistenteView />
            )}
            {geTab === "roles" && <RolesPermisosView />}
            {geTab === "automatizaciones" && <AutomatizacionesView />}
            {geTab === "turnos" && <TurnosCapacidadView />}
          </>
        )}

        {section === "gestion" && (
          <>
            {geTab === "canales" && <CanalesAsistenteView />}
            {geTab === "catalogo" && <CatalogoInteligenteView targetProductId={targetProductId} />}
            {geTab === "insumos" && <InsumosStockView />}
            {geTab === "resumen" && <ResumenDashboardView onNavigateGestion={handleGeTabSwitch} />}
            {geTab === "historial" && <HistorialView />}
            {geTab === "analitica" && <AnaliticaView />}
            {geTab === "roles" && <RolesPermisosView />}
            {geTab === "automatizaciones" && <AutomatizacionesView />}
            {geTab === "turnos" && <TurnosCapacidadView />}
          </>
        )}
      </div>


      {/* Modals & Drawers */}
      <OrderDetailDrawer />
      <AIInterpretationModal />
      <RejectCancelModal />
      <IncidenciasDrawer />
      <ThermalTicketModal />
      {/* Floating WhatsApp Widget (Exclusively on Live Kanban / Bandeja) */}
      {section === "operacion" && opTab === "en-vivo" && (
        <WhatsAppFloatingWidget
          onNavigateToFullView={() => handleOpTabSwitch("conversaciones")}
        />
      )}
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
