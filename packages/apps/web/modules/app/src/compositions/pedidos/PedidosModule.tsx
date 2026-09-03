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
import { OrderDetailDrawer } from "./shared/OrderDetailDrawer";
import { AIInterpretationModal } from "./shared/AIInterpretationModal";
import { RejectCancelModal } from "./shared/RejectCancelModal";
import { IncidenciasDrawer } from "./shared/IncidenciasDrawer";
import { ThermalTicketModal } from "./shared/ThermalTicketModal";
import { WhatsAppFloatingWidget } from "./shared/WhatsAppFloatingWidget";

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
  targetProductId,
  onSectionChange,
  onOpTabChange,
  onGeTabChange,
}) => {
  const { orders, isSoundEnabled, toggleSound, incidencias, setIsIncidenciasOpen, conversations } = usePedidos();
  const [section, setSection] = useState<PedidosSection>(sectionProp);
  const [opTab, setOpTab] = useState<OperacionTab>(opTabProp);
  const [geTab, setGeTab] = useState<GestionTab>(geTabProp || "catalogo");

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
    } else if (s === "configuracion") {
      const nextGe = (geTab === "roles" || geTab === "automatizaciones" || geTab === "turnos") ? geTab : "roles";
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
      {/* Top Module Sub-header: Operación ↔ Menú ↔ Configuración Pill Switcher & Sub-tabs */}
      {shouldShowTopHeader && (
        <div className="bg-white dark:bg-[#121316] rounded-3xl p-3.5 sm:p-4 border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs flex flex-col gap-3 flex-none animate-fade-in">

        {/* Row 1: Section Switcher (Left) + Actions (Right) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
          {/* Section Pill Switcher (3 Pilares) */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60 w-full sm:w-auto overflow-x-auto no-scrollbar">
            <Button
              variant="ghost"
              intent="pedidos.section.switch"
              onClick={() => handleSectionSwitch("operacion")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-none whitespace-nowrap ${
                section === "operacion"
                  ? "bg-[#190088] text-white border border-[#190088] shadow-2xs font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-[#190088] dark:hover:text-blue-300 hover:bg-blue-50/70 dark:hover:bg-[#190088]/20"
              }`}
            >
              <Activity className={`w-3.5 h-3.5 ${section === "operacion" ? "text-white" : "text-[#FF3F1A]"}`} />
              <span>Operación</span>
              {newOrdersCount + pendingConversationsCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${section === "operacion" ? "bg-white text-[#190088]" : "bg-[#FF3F1A] text-white"}`}>
                  {newOrdersCount + pendingConversationsCount}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              intent="pedidos.section.switch"
              onClick={() => handleSectionSwitch("menu")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-none whitespace-nowrap ${
                section === "menu"
                  ? "bg-[#190088] text-white border border-[#190088] shadow-2xs font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-[#190088] dark:hover:text-blue-300 hover:bg-blue-50/70 dark:hover:bg-[#190088]/20"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Menú & Stock</span>
            </Button>

            <Button
              variant="ghost"
              intent="pedidos.section.switch"
              onClick={() => handleSectionSwitch("configuracion")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-none whitespace-nowrap ${
                section === "configuracion"
                  ? "bg-[#190088] text-white border border-[#190088] shadow-2xs font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-[#190088] dark:hover:text-blue-300 hover:bg-blue-50/70 dark:hover:bg-[#190088]/20"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Configuración</span>
            </Button>
          </div>

          {/* Right Actions: Sound & Incidencias (Only visible in Operación) */}
          {section === "operacion" && (
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-end animate-fade-in">
              {/* Audio Alerts Toggle */}
              <Button
                variant="ghost"
                intent="pedidos.sound.toggle"
                onClick={toggleSound}
                className={`p-2 rounded-xl border transition-all cursor-pointer shadow-xs flex items-center justify-center flex-none ${
                  isSoundEnabled
                    ? "bg-[#FF3F1A] text-white border-[#FF3F1A]"
                    : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-zinc-600"
                }`}
                title={isSoundEnabled ? "Alertas sonoras activadas" : "Alertas sonoras silenciadas"}
              >
                {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>

              <Button
                variant="outline"
                intent="pedidos.incidencias.open"
                onClick={() => setIsIncidenciasOpen(true)}
                className={`py-2 px-3.5 text-xs flex-none ${
                  activeIncCount > 0
                    ? "border-[#FF3F1A] bg-orange-50 dark:bg-orange-950/40 text-[#FF3F1A]"
                    : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-[#212121] dark:text-zinc-100 hover:border-[#190088] hover:text-[#190088]"
                }`}
              >
                <ShieldAlert className={`w-4 h-4 ${activeIncCount > 0 ? "text-[#FF3F1A]" : "text-zinc-400"}`} />
                <span>Incidencias</span>
                {activeIncCount > 0 && (
                  <span className="bg-[#FF3F1A] text-white px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                    {activeIncCount}
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Row 2: Sub-tabs Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none scroll-smooth max-w-full flex-nowrap sm:flex-wrap py-0.5">
          {section === "operacion" && (
            <>
              {[
                {
                  id: "en-vivo" as OperacionTab,
                  label: "Órdenes",
                  icon: <ShoppingBag className="w-3.5 h-3.5 flex-none" />,
                  count: orders.length,
                  highlightBadge: newOrdersCount > 0 ? `${newOrdersCount} nuevos` : undefined,
                },
                {
                  id: "preparacion" as OperacionTab,
                  label: "Pantalla KDS Cocina",
                  icon: <ChefHat className="w-3.5 h-3.5 flex-none" />,
                  count: orders.filter(o => o.status === "EN_PREPARACION" || o.status === "CONFIRMADO").length,
                },
                {
                  id: "conversaciones" as OperacionTab,
                  label: "Conversaciones WhatsApp",
                  icon: <MessagesSquare className="w-3.5 h-3.5 flex-none" />,
                  count: conversations.length,
                  highlightBadge: pendingConversationsCount > 0 ? `${pendingConversationsCount} atención` : undefined,
                },
              ].map(tab => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  intent="pedidos.subtab.switch"
                  onClick={() => handleOpTabSwitch(tab.id)}
                  className={`px-3.5 py-1.5 min-h-[44px] sm:min-h-0 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer flex-none text-xs whitespace-nowrap ${
                    opTab === tab.id
                      ? "bg-[#190088] text-white border border-[#190088] shadow-2xs font-bold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-[#190088] dark:hover:text-blue-300 hover:bg-blue-50/70 dark:hover:bg-[#190088]/20"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${
                        opTab === tab.id
                          ? "bg-white/20 text-white"
                          : "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {tab.highlightBadge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse ${opTab === tab.id ? "bg-white text-[#190088]" : "bg-[#FF3F1A] text-white"}`}>
                      {tab.highlightBadge}
                    </span>
                  )}
                </Button>
              ))}
            </>
          )}


          {(section === "menu" || (section === "gestion" && (geTab === "catalogo" || geTab === "insumos"))) && (
            <>
              {[
                { id: "catalogo" as GestionTab, label: "Catálogo de Platos", icon: <Layers className="w-3.5 h-3.5 flex-none" /> },
                { id: "insumos" as GestionTab, label: "Insumos & Stock (Escandallos)", icon: <Package className="w-3.5 h-3.5 flex-none" /> },
              ].map(tab => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  intent="pedidos.subtab.switch"
                  onClick={() => handleGeTabSwitch(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer flex-none text-xs whitespace-nowrap ${
                    geTab === tab.id
                      ? "bg-[#190088] text-white border border-[#190088] shadow-2xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-[#190088] dark:hover:text-blue-300 hover:bg-blue-50/70 dark:hover:bg-[#190088]/20"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </Button>
              ))}
            </>
          )}


          {(section === "configuracion" || (section === "gestion" && (geTab === "roles" || geTab === "automatizaciones" || geTab === "turnos"))) && (
            <>
              {[
                { id: "roles" as GestionTab, label: "Roles & Permisos del Equipo", icon: <Shield className="w-3.5 h-3.5 flex-none" /> },
                { id: "automatizaciones" as GestionTab, label: "Automatizaciones & Reglas WhatsApp", icon: <SlidersHorizontal className="w-3.5 h-3.5 flex-none" /> },
                { id: "turnos" as GestionTab, label: "Turnos y Capacidad de Cocina", icon: <Users className="w-3.5 h-3.5 flex-none" /> },
              ].map(tab => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  intent="pedidos.subtab.switch"
                  onClick={() => handleGeTabSwitch(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer flex-none text-xs whitespace-nowrap ${
                    geTab === tab.id
                      ? "bg-[#190088] text-white border border-[#190088] shadow-2xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-[#190088] dark:hover:text-blue-300 hover:bg-blue-50/70 dark:hover:bg-[#190088]/20"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </Button>
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

        {(section === "menu" || section === "gestion") && (
          <>
            {(geTab === "catalogo" || geTab !== "insumos") && (
              <CatalogoInteligenteView targetProductId={targetProductId} />
            )}
            {geTab === "insumos" && <InsumosStockView />}
          </>
        )}

        {section === "configuracion" && (
          <>
            {(geTab === "roles" || (geTab !== "automatizaciones" && geTab !== "turnos")) && (
              <RolesPermisosView />
            )}
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
