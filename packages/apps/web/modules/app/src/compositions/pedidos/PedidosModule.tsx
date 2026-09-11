import React, { useState, useEffect } from "react";
import { PedidosProvider, usePedidos } from "./context/PedidosContext";
import { PedidosSection, OperacionTab, GestionTab } from "./types";
import { PedidosEnVivoView } from "./operacion/PedidosEnVivoView";
import { ProgramadosView } from "./operacion/ProgramadosView";
import { PreparacionView } from "./operacion/PreparacionView";
import { CanalesView } from "./canales/CanalesView";
import { ConfiguracionView } from "./configuracion/ConfiguracionView";
import { ConversacionesView } from "./operacion/ConversacionesView";
import { ResumenDashboardView } from "./gestion/ResumenDashboardView";
import { HistorialView } from "./gestion/HistorialView";
import { CatalogoInteligenteView } from "./gestion/CatalogoInteligenteView";
import { InsumosStockView } from "./gestion/InsumosStockView";
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
  ShoppingBag,
  Package,
  SlidersHorizontal,
  ShieldAlert,
  Volume2,
  VolumeX,
  Calendar,
  Smartphone,
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
  sectionProp = "ordenes",
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
    isPreparacionEnabled,
  } = usePedidos();
  const { semantics } = useBusiness();

  // Normalize initial section
  const initialSection: PedidosSection =
    sectionProp === "operacion" ? "ordenes" : sectionProp;

  const [section, setSection] = useState<PedidosSection>(initialSection);
  const [opTab, setOpTab] = useState<OperacionTab>(opTabProp);
  const [geTab, setGeTab] = useState<GestionTab>(geTabProp || "catalogo");

  // Handle deep-linking from notifications or search
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

  // Layout preferences
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
        const s = e.detail.section === "operacion" ? "ordenes" : e.detail.section;
        setSection(s);
        if (onSectionChange) onSectionChange(s);
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
    const s = sectionProp === "operacion" ? "ordenes" : sectionProp;
    setSection(s);
  }, [sectionProp]);

  useEffect(() => {
    setOpTab(opTabProp);
  }, [opTabProp]);

  useEffect(() => {
    setGeTab(geTabProp || "catalogo");
  }, [geTabProp]);

  const handleSectionSwitch = (s: PedidosSection) => {
    const normalized = s === "operacion" ? "ordenes" : s;
    setSection(normalized);
    if (onSectionChange) onSectionChange(normalized);
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
  const pendingOrdersCount = orders.filter(
    o => o.status === "CONFIRMADO" || o.status === "EN_PREPARACION"
  ).length;

  const isKanbanActive = (section === "ordenes" || section === "operacion") && opTab === "en-vivo";
  const shouldShowTopHeader = isKanbanActive ? layoutPrefs.showTopHeader : true;

  // Active modular sections
  const modularSections = [
    {
      id: "ordenes" as PedidosSection,
      label: "Órdenes",
      icon: ShoppingBag,
      badge: newOrdersCount > 0 ? `${newOrdersCount} nuevos` : undefined,
    },
    {
      id: "programados" as PedidosSection,
      label: "Programados",
      icon: Calendar,
      count: programados.length,
    },
    ...(isPreparacionEnabled
      ? [
          {
            id: "preparacion" as PedidosSection,
            label: "Preparación",
            icon: Package,
            count: pendingOrdersCount,
          },
        ]
      : []),
    {
      id: "canales" as PedidosSection,
      label: "Canales",
      icon: Smartphone,
    },
    {
      id: "configuracion" as PedidosSection,
      label: "Configuración",
      icon: SlidersHorizontal,
    },
  ];

  return (
    <div className="flex flex-col h-full space-y-4 p-3 sm:p-5 w-full animate-fade-in">
      {/* Top Module Sub-header: Órdenes ↔ Programados ↔ Preparación ↔ Canales ↔ Configuración */}
      {shouldShowTopHeader && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-gray-800 shadow-theme-sm flex flex-col gap-3 flex-none">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Modular Section Pill Switcher */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
              {modularSections.map(sec => {
                const Icon = sec.icon;
                const isSelected =
                  section === sec.id ||
                  (sec.id === "ordenes" && section === "operacion");

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleSectionSwitch(sec.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-none whitespace-nowrap ${
                      isSelected
                        ? "bg-brand-500 text-white shadow-theme-xs font-semibold"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{sec.label}</span>
                    {sec.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          isSelected
                            ? "bg-white text-brand-500"
                            : "bg-brand-500 text-white"
                        }`}
                      >
                        {sec.badge}
                      </span>
                    )}
                    {sec.count !== undefined && !sec.badge && sec.count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {sec.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Actions: Sound & Incidencias */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-end">
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
          </div>
        </div>
      )}

      {/* Main Section Content */}
      <div className="flex-1 min-h-0">
        {/* 1. ÓRDENES (Default Kanban / Lista switcher) */}
        {(section === "ordenes" || section === "operacion") && (
          <>
            {opTab !== "conversaciones" && (
              <PedidosEnVivoView onNavigateOpTab={handleOpTabSwitch} />
            )}
            {opTab === "conversaciones" && <ConversacionesView />}
          </>
        )}

        {/* 2. PROGRAMADOS */}
        {section === "programados" && (
          <ProgramadosView onNavigateOpTab={handleOpTabSwitch} />
        )}

        {/* 3. PREPARACIÓN (Solo visible y montado cuando está habilitado) */}
        {section === "preparacion" && <PreparacionView />}

        {/* 4. CANALES */}
        {section === "canales" && <CanalesView />}

        {/* 5. CONFIGURACIÓN */}
        {section === "configuracion" && <ConfiguracionView />}

        {/* Retro-compatibilidad */}
        {section === "menu" && <CatalogoInteligenteView targetProductId={targetProductId} />}
        {section === "analitica" && <ResumenDashboardView onNavigateGestion={handleGeTabSwitch} />}
        {section === "gestion" && <ResumenDashboardView onNavigateGestion={handleGeTabSwitch} />}
      </div>

      {/* Modals & Drawers */}
      <OrderDetailDrawer />
      <AIInterpretationModal />
      <RejectCancelModal />
      <IncidenciasDrawer />
      <ThermalTicketModal />

      {/* Floating WhatsApp Widget on Live Orders */}
      {(section === "ordenes" || section === "operacion") && opTab === "en-vivo" && (
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
