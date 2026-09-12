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
  onOpenSettings?: (tab?: any) => void;
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
  onOpenSettings,
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

  // Reactive WhatsApp Channel & Widget preferences
  const [whatsAppConfig, setWhatsAppConfig] = useState(() => {
    try {
      const ch = localStorage.getItem("necto_whatsapp_channel_enabled");
      const wg = localStorage.getItem("necto_whatsapp_widget_enabled");
      return {
        channelEnabled: ch !== null ? JSON.parse(ch) : true,
        widgetEnabled: wg !== null ? JSON.parse(wg) : true,
      };
    } catch (e) {
      return { channelEnabled: true, widgetEnabled: true };
    }
  });

  useEffect(() => {
    const handleWhatsAppConfigUpdate = () => {
      try {
        const ch = localStorage.getItem("necto_whatsapp_channel_enabled");
        const wg = localStorage.getItem("necto_whatsapp_widget_enabled");
        setWhatsAppConfig({
          channelEnabled: ch !== null ? JSON.parse(ch) : true,
          widgetEnabled: wg !== null ? JSON.parse(wg) : true,
        });
      } catch (e) {}
    };
    window.addEventListener("necto_whatsapp_config_changed", handleWhatsAppConfigUpdate);
    window.addEventListener("storage", handleWhatsAppConfigUpdate);
    return () => {
      window.removeEventListener("necto_whatsapp_config_changed", handleWhatsAppConfigUpdate);
      window.removeEventListener("storage", handleWhatsAppConfigUpdate);
    };
  }, []);

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

  return (
    <div className="w-full animate-fade-in">
      {/* Main Section Content */}
      <div>
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
        {section === "canales" && <CanalesView onOpenSettings={onOpenSettings} />}

        {/* 5. WHATSAPP / CONVERSACIONES (Acceso directo desde menú lateral de la tienda) */}
        {(section === "conversaciones" || section === "whatsapp") && (
          <ConversacionesView />
        )}

        {/* 6. CONFIGURACIÓN */}
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

      {/* Floating WhatsApp Widget — Only rendered when channel & widget are enabled in settings */}
      {whatsAppConfig.channelEnabled && whatsAppConfig.widgetEnabled && (
        <WhatsAppFloatingWidget
          onNavigateToFullView={() => handleSectionSwitch("conversaciones")}
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
  onOpenSettings?: (tab?: any) => void;
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
