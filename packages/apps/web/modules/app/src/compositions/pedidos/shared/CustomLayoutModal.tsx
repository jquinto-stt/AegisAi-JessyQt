import React, { useState } from "react";
import { OrderStatus } from "../types";
import {
  RotateCcw,
  X,
  ChevronUp,
  ChevronDown,
  Layout,
  Maximize2,
  SlidersHorizontal,
  Eye,
  Layers,
  Sparkles,
  CheckCircle,
  ChefHat,
  CheckCircle2,
  PackageCheck,
  Clock,
  DollarSign,
  FileText,
  MessageSquare,
  Volume2,
  Bell,
  Sliders,
  Smartphone,
  Info,
  Tv,
  PanelTop,
  Search,
  Flag,
} from "lucide-react";
import { Button, Toggle } from "@/elements";

export interface ColumnConfig {
  id: OrderStatus;
  title: string;
  visible: boolean;
  wipLimit?: number;
}

export interface LayoutPreferences {
  activePreset: "standard" | "focus" | "kds" | "compact" | "custom";
  showTopHeader: boolean;
  showBanner: boolean;
  showToolbar: boolean;
  density: "compact" | "comfortable" | "detailed";
  showChannelBadge: boolean;
  showSlaProgress: boolean;
  showItemsSummary: boolean;
  showOrderTotal: boolean;
  showCustomerPhone: boolean;
  showCreatedAt: boolean;
  soundAlerts: boolean;
  soundAlertDelay: boolean;
  columns: ColumnConfig[];
}

export const DEFAULT_LAYOUT_PREFS: LayoutPreferences = {
  activePreset: "standard",
  showTopHeader: true,
  showBanner: false,
  showToolbar: true,
  density: "comfortable",
  showChannelBadge: true,
  showSlaProgress: true,
  showItemsSummary: true,
  showOrderTotal: true,
  showCustomerPhone: false,
  showCreatedAt: true,
  soundAlerts: true,
  soundAlertDelay: true,
  columns: [
    { id: "NUEVO", title: "Nuevos & Por Confirmar", visible: true },
    { id: "CONFIRMADO", title: "Confirmados (En Cola)", visible: true },
    { id: "EN_PREPARACION", title: "En Cocina / Preparación", visible: true },
    { id: "LISTO", title: "Listos para Entrega", visible: true },
    { id: "FINALIZADO", title: "Entregados Hoy", visible: true },
  ],
};

const COLUMN_META: Record<
  OrderStatus,
  { icon: React.ReactNode; description: string }
> = {
  NUEVO: {
    icon: <Sparkles className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />,
    description: "Comandas entrantes por WhatsApp, Web o Mostrador",
  },
  CONFIRMADO: {
    icon: <CheckCircle className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />,
    description: "Pedidos con pago validado listos para entrar al fogón",
  },
  EN_PREPARACION: {
    icon: <ChefHat className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />,
    description: "Comandas cocinándose con cronómetro SLA en vivo",
  },
  LISTO: {
    icon: <CheckCircle2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />,
    description: "Platos listos para empaque, despacho o retiro del comensal",
  },
  FINALIZADO: {
    icon: <PackageCheck className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />,
    description: "Historial de comandas despachadas y facturadas",
  },
  RECHAZADO: {
    icon: <X className="w-4 h-4 text-zinc-500" />,
    description: "Pedidos cancelados o descartados por el operador",
  },
  CANCELADO: {
    icon: <X className="w-4 h-4 text-zinc-500" />,
    description: "Pedidos cancelados",
  },
};

type SettingsTab = "layout" | "columns" | "cards" | "alerts";

export const CustomLayoutModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  prefs: LayoutPreferences;
  onSave: (newPrefs: LayoutPreferences) => void;
  onReset: () => void;
}> = ({ isOpen, onClose, prefs, onSave, onReset }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("layout");
  const [draftPrefs, setDraftPrefs] = useState<LayoutPreferences>(() => ({
    ...DEFAULT_LAYOUT_PREFS,
    ...prefs,
  }));

  React.useEffect(() => {
    if (isOpen) {
      setDraftPrefs({
        ...DEFAULT_LAYOUT_PREFS,
        ...prefs,
      });
      setActiveTab("layout");
    }
  }, [isOpen, prefs]);

  if (!isOpen) return null;

  const handleToggleColumn = (id: OrderStatus, visible: boolean) => {
    setDraftPrefs(prev => ({
      ...prev,
      activePreset: "custom",
      columns: prev.columns.map(c =>
        c.id === id ? { ...c, visible } : c
      ),
    }));
  };

  const handleMoveColumn = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= draftPrefs.columns.length) return;

    const newColumns = [...draftPrefs.columns];
    const [moved] = newColumns.splice(index, 1);
    newColumns.splice(targetIdx, 0, moved);

    setDraftPrefs(prev => ({
      ...prev,
      activePreset: "custom",
      columns: newColumns,
    }));
  };

  const applyPreset = (preset: LayoutPreferences["activePreset"]) => {
    if (preset === "standard") {
      setDraftPrefs({
        ...draftPrefs,
        activePreset: "standard",
        showTopHeader: true,
        showBanner: false,
        showToolbar: true,
        density: "comfortable",
        showChannelBadge: true,
        showSlaProgress: true,
        showItemsSummary: true,
        showOrderTotal: true,
        showCustomerPhone: false,
        showCreatedAt: true,
        columns: draftPrefs.columns.map(c => ({ ...c, visible: true })),
      });
    } else if (preset === "focus") {
      setDraftPrefs({
        ...draftPrefs,
        activePreset: "focus",
        showTopHeader: false,
        showBanner: false,
        showToolbar: true,
        density: "comfortable",
        showChannelBadge: true,
        showSlaProgress: true,
        showItemsSummary: true,
        showOrderTotal: true,
        showCustomerPhone: false,
        showCreatedAt: false,
        columns: draftPrefs.columns.map(c => ({
          ...c,
          visible: c.id !== "FINALIZADO",
        })),
      });
    } else if (preset === "kds") {
      setDraftPrefs({
        ...draftPrefs,
        activePreset: "kds",
        showTopHeader: false,
        showBanner: false,
        showToolbar: false,
        density: "detailed",
        showChannelBadge: true,
        showSlaProgress: true,
        showItemsSummary: true,
        showOrderTotal: false,
        showCustomerPhone: false,
        showCreatedAt: true,
        columns: draftPrefs.columns.map(c => ({
          ...c,
          visible: ["CONFIRMADO", "EN_PREPARACION", "LISTO"].includes(c.id),
        })),
      });
    } else if (preset === "compact") {
      setDraftPrefs({
        ...draftPrefs,
        activePreset: "compact",
        showTopHeader: true,
        showBanner: false,
        showToolbar: true,
        density: "compact",
        showChannelBadge: true,
        showSlaProgress: false,
        showItemsSummary: false,
        showOrderTotal: true,
        showCustomerPhone: false,
        showCreatedAt: true,
        columns: draftPrefs.columns.map(c => ({ ...c, visible: true })),
      });
    } else {
      setDraftPrefs(prev => ({ ...prev, activePreset: "custom" }));
    }
  };

  const handleSave = () => {
    onSave(draftPrefs);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in font-sans antialiased">
      <div className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl border border-zinc-200/90 dark:border-zinc-800 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] transition-all">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 flex-none bg-zinc-50/70 dark:bg-zinc-900/70">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF3F1A] font-bold">
                Control de Tablero
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold uppercase">
                Modo: {draftPrefs.activePreset}
              </span>
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Configuración de Vista Operativa
            </h3>
          </div>
          <Button
            variant="ghost"
            intent="layout.close"
            onClick={onClose}
            className="w-8 h-8 p-0 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Dynamic Contextual Live Preview Bar */}
        <div className="px-6 py-3 bg-zinc-100/70 dark:bg-zinc-900/90 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs">
            <Info className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {activeTab === "layout" && "Simulación de estructura de pantalla en tiempo real:"}
              {activeTab === "columns" && "Flujo de columnas activas en orden de izquierda a derecha:"}
              {activeTab === "cards" && "Vista previa en tiempo real de tu comanda Kanban:"}
              {activeTab === "alerts" && "Estado de alertas sonoras y notificaciones activas:"}
            </span>
          </div>

          {/* TAB 1 Preview: Full Screen Wireframe */}
          {activeTab === "layout" && (
            <div className="w-full sm:w-80 bg-white dark:bg-[#18181B] rounded-xl border border-zinc-200/90 dark:border-zinc-800 p-2 shadow-2xs space-y-1.5 select-none">
              {/* Mini Top Nav Header Bar */}
              <div
                className={`h-4 rounded flex items-center justify-between px-2 text-[8px] font-mono transition-all ${
                  draftPrefs.showTopHeader
                    ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                    : "bg-zinc-100 dark:bg-zinc-800/40 text-zinc-400 opacity-40 line-through"
                }`}
              >
                <span>Navegación Superior</span>
                <span>{draftPrefs.showTopHeader ? "VISIBLE" : "OCULTO"}</span>
              </div>

              {/* Mini Toolbar Bar */}
              <div
                className={`h-3.5 rounded flex items-center justify-between px-2 text-[8px] font-mono transition-all ${
                  draftPrefs.showToolbar
                    ? "bg-orange-50 dark:bg-orange-950/40 text-[#FF3F1A]"
                    : "bg-zinc-100 dark:bg-zinc-800/40 text-zinc-400 opacity-40 line-through"
                }`}
              >
                <span>Barra Filtros / Búsqueda</span>
                <span>{draftPrefs.showToolbar ? "VISIBLE" : "OCULTO"}</span>
              </div>

              {/* Mini Columns Wireframe */}
              <div className="flex gap-1 pt-0.5">
                {draftPrefs.columns
                  .filter(c => c.visible)
                  .map(c => (
                    <div
                      key={c.id}
                      className="flex-1 bg-zinc-100 dark:bg-zinc-800 h-5 rounded text-[7px] font-mono flex items-center justify-center text-zinc-500 truncate px-0.5"
                    >
                      {c.title.split(" ")[0]}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 2 Preview: Active Pipeline */}
          {activeTab === "columns" && (
            <div className="w-full sm:w-auto flex items-center gap-1.5 overflow-x-auto py-0.5 select-none">
              {draftPrefs.columns
                .filter(c => c.visible)
                .map((c, i, arr) => (
                  <React.Fragment key={c.id}>
                    <div className="px-2 py-1 rounded-md bg-white dark:bg-[#18181B] border border-zinc-200/90 dark:border-zinc-800 text-[10px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF3F1A]" />
                      <span>{c.title}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <span className="text-zinc-300 dark:text-zinc-600 font-bold">→</span>
                    )}
                  </React.Fragment>
                ))}
            </div>
          )}

          {/* TAB 3 Preview: Interactive Comanda Card */}
          {activeTab === "cards" && (
            <div className="w-full sm:w-80 bg-white dark:bg-[#18181B] rounded-xl border border-zinc-200/90 dark:border-zinc-800 p-2.5 shadow-2xs space-y-1.5 pointer-events-none select-none">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono font-bold text-[10px] text-zinc-500">
                    PED-1024
                  </span>
                  {draftPrefs.showChannelBadge && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      <MessageSquare className="w-2.5 h-2.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </span>
                  )}
                </div>
                {draftPrefs.showOrderTotal && (
                  <span className="font-mono font-bold text-[11px] text-zinc-900 dark:text-zinc-100">
                    $41.000
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <h5 className="font-bold text-[11px] text-zinc-900 dark:text-zinc-100 truncate">
                  Mariana Gómez
                  {draftPrefs.showCustomerPhone && (
                    <span className="font-mono text-[9px] text-zinc-400 font-normal ml-1">
                      · 310 987 6543
                    </span>
                  )}
                </h5>
              </div>

              {draftPrefs.showItemsSummary && (
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                  6× Empanadas Carne, 2× Coca-Cola
                </p>
              )}

              {draftPrefs.showSlaProgress && (
                <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[9px] font-mono text-zinc-400">
                  <span>12m transcurridos</span>
                  {draftPrefs.showCreatedAt && <span>20:07</span>}
                </div>
              )}
            </div>
          )}

          {/* TAB 4 Preview: Alerts status */}
          {activeTab === "alerts" && (
            <div className="w-full sm:w-auto flex items-center gap-2 select-none">
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 border ${
                draftPrefs.soundAlerts ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-zinc-100 text-zinc-400 border-zinc-200"
              }`}>
                <Volume2 className="w-3 h-3" />
                <span>Nuevos: {draftPrefs.soundAlerts ? "ACTIVO" : "SILENCIO"}</span>
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 border ${
                draftPrefs.soundAlertDelay ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-zinc-100 text-zinc-400 border-zinc-200"
              }`}>
                <Bell className="w-3 h-3" />
                <span>Retrasos: {draftPrefs.soundAlertDelay ? "ACTIVO" : "SILENCIO"}</span>
              </span>
            </div>
          )}
        </div>

        {/* Main Body: Tabs Navigation & Content */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden text-xs">
          {/* Left Navigation Bar */}
          <div className="w-full sm:w-56 bg-zinc-50/50 dark:bg-zinc-900/40 border-r border-zinc-200/80 dark:border-zinc-800 p-3 space-y-1 flex-none overflow-y-auto">
            <button
              type="button"
              onClick={() => setActiveTab("layout")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-left transition-all cursor-pointer ${
                activeTab === "layout"
                  ? "bg-white dark:bg-zinc-800 text-[#FF3F1A] shadow-xs border border-zinc-200/80 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Layout className="w-4 h-4 text-[#FF3F1A]" />
              <span>1. Modos & Cabeceras</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("columns")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-left transition-all cursor-pointer ${
                activeTab === "columns"
                  ? "bg-white dark:bg-zinc-800 text-[#FF3F1A] shadow-xs border border-zinc-200/80 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Layers className="w-4 h-4 text-[#FF3F1A]" />
              <span>2. Columnas Kanban</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("cards")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-left transition-all cursor-pointer ${
                activeTab === "cards"
                  ? "bg-white dark:bg-zinc-800 text-[#FF3F1A] shadow-xs border border-zinc-200/80 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Eye className="w-4 h-4 text-[#FF3F1A]" />
              <span>3. Diseño de Tarjetas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("alerts")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-left transition-all cursor-pointer ${
                activeTab === "alerts"
                  ? "bg-white dark:bg-zinc-800 text-[#FF3F1A] shadow-xs border border-zinc-200/80 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Bell className="w-4 h-4 text-[#FF3F1A]" />
              <span>4. Alertas & Audio</span>
            </button>
          </div>

          {/* Right Content Panel */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-thin">
            {/* TAB 1: LAYOUT & BARS */}
            {activeTab === "layout" && (
              <div className="space-y-6 animate-fade-in">
                {/* 1. Quick Presets */}
                <div className="space-y-3">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Presets Operativos
                    </h4>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs">
                      Selecciona un modo para auto-ajustar cabeceras y densidad.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Standard */}
                    <button
                      type="button"
                      onClick={() => applyPreset("standard")}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        draftPrefs.activePreset === "standard"
                          ? "border-[#FF3F1A] bg-orange-50/30 dark:bg-orange-950/20 text-[#212121] dark:text-zinc-100 ring-1 ring-[#FF3F1A]/30 shadow-xs"
                          : "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 bg-white dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <Layout className="w-3.5 h-3.5 text-[#FF3F1A]" />
                          <span>Modo Estándar</span>
                        </div>
                        {draftPrefs.activePreset === "standard" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF3F1A]" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                        5 columnas completas con todas las barras de control.
                      </p>
                    </button>

                    {/* Focus */}
                    <button
                      type="button"
                      onClick={() => applyPreset("focus")}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        draftPrefs.activePreset === "focus"
                          ? "border-[#FF3F1A] bg-orange-50/30 dark:bg-orange-950/20 text-[#212121] dark:text-zinc-100 ring-1 ring-[#FF3F1A]/30 shadow-xs"
                          : "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 bg-white dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <Maximize2 className="w-3.5 h-3.5 text-[#FF3F1A]" />
                          <span>Modo Enfoque Cocina</span>
                        </div>
                        {draftPrefs.activePreset === "focus" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF3F1A]" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                        Oculta despachados y menú superior para horas pico.
                      </p>
                    </button>

                    {/* KDS Mode */}
                    <button
                      type="button"
                      onClick={() => applyPreset("kds")}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        draftPrefs.activePreset === "kds"
                          ? "border-[#FF3F1A] bg-orange-50/30 dark:bg-orange-950/20 text-[#212121] dark:text-zinc-100 ring-1 ring-[#FF3F1A]/30 shadow-xs"
                          : "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 bg-white dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <Tv className="w-3.5 h-3.5 text-[#FF3F1A]" />
                          <span>Modo KDS Pantalla</span>
                        </div>
                        {draftPrefs.activePreset === "kds" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF3F1A]" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                        Solo columnas operativas para monitor de cocina sin barras.
                      </p>
                    </button>

                    {/* Compact */}
                    <button
                      type="button"
                      onClick={() => applyPreset("compact")}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        draftPrefs.activePreset === "compact"
                          ? "border-[#FF3F1A] bg-orange-50/30 dark:bg-orange-950/20 text-[#212121] dark:text-zinc-100 ring-1 ring-[#FF3F1A]/30 shadow-xs"
                          : "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 bg-white dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <Sliders className="w-3.5 h-3.5 text-[#FF3F1A]" />
                          <span>Modo Compacto</span>
                        </div>
                        {draftPrefs.activePreset === "compact" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF3F1A]" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                        Tarjetas condensadas para alta densidad de comandas.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 2. Screen Bars & Headers Granular Toggles */}
                <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Barras y Cabeceras de Pantalla
                    </h4>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs">
                      Oculta barras para ganar 100% de espacio vertical para tus pedidos.
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden shadow-2xs">
                    {/* Top Navigation Header */}
                    <div className="p-3.5 px-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center flex-none">
                          <PanelTop className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900 dark:text-zinc-100">
                            Menú y Navegación Superior
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Pestañas principales (Bandeja, KDS, Conversaciones, etc.)
                          </p>
                        </div>
                      </div>
                      <Toggle
                        checked={draftPrefs.showTopHeader}
                        onCheckedChange={next =>
                          setDraftPrefs(p => ({ ...p, activePreset: "custom", showTopHeader: next }))
                        }
                        size="md"
                        intent="layout.topheader.visibility"
                        ariaLabel="Mostrar menú y navegación superior"
                      />
                    </div>

                    {/* Toolbar / Search & Filters */}
                    <div className="p-3.5 px-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center flex-none">
                          <Search className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900 dark:text-zinc-100">
                            Barra de Filtros y Búsqueda
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Buscador Ctrl+K, filtros de canal y conmutador Kanban/Lista
                          </p>
                        </div>
                      </div>
                      <Toggle
                        checked={draftPrefs.showToolbar}
                        onCheckedChange={next =>
                          setDraftPrefs(p => ({ ...p, activePreset: "custom", showToolbar: next }))
                        }
                        size="md"
                        intent="layout.toolbar.visibility"
                        ariaLabel="Mostrar barra de filtros"
                      />
                    </div>

                    {/* Banner Info */}
                    <div className="p-3.5 px-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center flex-none">
                          <Flag className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900 dark:text-zinc-100">
                            Banner Informativo de Turno
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Barra contextual con estadísticas y recordatorios del local
                          </p>
                        </div>
                      </div>
                      <Toggle
                        checked={draftPrefs.showBanner}
                        onCheckedChange={next =>
                          setDraftPrefs(p => ({ ...p, activePreset: "custom", showBanner: next }))
                        }
                        size="md"
                        intent="layout.banner.visibility"
                        ariaLabel="Mostrar banner informativo"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: COLUMNS */}
            {activeTab === "columns" && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Columnas de Estado & Flujo Operativo
                  </h4>
                  <p className="text-zinc-500 dark:text-zinc-400 text-xs">
                    Activa o desactiva columnas con los switches y ordénalas según la secuencia de tu local.
                  </p>
                </div>

                <div className="space-y-2.5 pt-1">
                  {draftPrefs.columns.map((col, idx) => {
                    const meta = COLUMN_META[col.id] || COLUMN_META.NUEVO;

                    return (
                      <div
                        key={col.id}
                        className={`p-3.5 px-4 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          col.visible
                            ? "bg-white dark:bg-zinc-900 border-zinc-200/90 dark:border-zinc-800 shadow-2xs"
                            : "bg-zinc-50/50 dark:bg-zinc-950/50 border-zinc-200/50 dark:border-zinc-800/50 opacity-55"
                        }`}
                      >
                        {/* Column Icon + Info */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-none bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-300">
                            {meta.icon}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {col.title}
                              </h5>
                              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded font-medium">
                                Columna {idx + 1}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {meta.description}
                            </p>
                          </div>
                        </div>

                        {/* Controls: Reorder Arrows + SWITCH Toggle */}
                        <div className="flex items-center gap-3 flex-none pl-2 border-l border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveColumn(idx, "up")}
                              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-20 cursor-pointer transition-colors"
                              title="Mover hacia la izquierda"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === draftPrefs.columns.length - 1}
                              onClick={() => handleMoveColumn(idx, "down")}
                              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-20 cursor-pointer transition-colors"
                              title="Mover hacia la derecha"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Switch */}
                          <Toggle
                            checked={col.visible}
                            onCheckedChange={next => handleToggleColumn(col.id, next)}
                            size="md"
                            intent={`layout.column.toggle.${col.id}`}
                            ariaLabel={`Activar columna ${col.title}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: CARDS & PROPERTIES */}
            {activeTab === "cards" && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Elementos Visibles en Cada Tarjeta
                  </h4>
                  <p className="text-zinc-500 dark:text-zinc-400 text-xs">
                    Personaliza la información que se muestra en cada comanda para evitar sobrecarga visual.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden shadow-2xs">
                  {/* Channel Badge */}
                  <div className="p-3.5 px-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center flex-none">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">
                          Etiqueta de Canal (WhatsApp / Web / POS / Teléfono)
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Muestra el origen de la comanda en la esquina superior
                        </p>
                      </div>
                    </div>
                    <Toggle
                      checked={draftPrefs.showChannelBadge}
                      onCheckedChange={next =>
                        setDraftPrefs(p => ({ ...p, activePreset: "custom", showChannelBadge: next }))
                      }
                      size="md"
                      intent="layout.channel.visibility"
                      ariaLabel="Mostrar distintivo de canal"
                    />
                  </div>

                  {/* SLA & Timer */}
                  <div className="p-3.5 px-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center flex-none">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">
                          Cronómetro & Barra de Progreso SLA
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Tiempo transcurrido y barra de cocción en cocina
                        </p>
                      </div>
                    </div>
                    <Toggle
                      checked={draftPrefs.showSlaProgress}
                      onCheckedChange={next =>
                        setDraftPrefs(p => ({ ...p, activePreset: "custom", showSlaProgress: next }))
                      }
                      size="md"
                      intent="layout.sla.visibility"
                      ariaLabel="Mostrar barra de SLA"
                    />
                  </div>

                  {/* Items Summary */}
                  <div className="p-3.5 px-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center flex-none">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">
                          Desglose de Platos e Ítems
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Muestra los nombres y cantidades de los productos pedidos
                        </p>
                      </div>
                    </div>
                    <Toggle
                      checked={draftPrefs.showItemsSummary}
                      onCheckedChange={next =>
                        setDraftPrefs(p => ({ ...p, activePreset: "custom", showItemsSummary: next }))
                      }
                      size="md"
                      intent="layout.items.visibility"
                      ariaLabel="Mostrar resumen de platos"
                    />
                  </div>

                  {/* Total Price */}
                  <div className="p-3.5 px-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center flex-none">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">
                          Monto Total Monetario
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Muestra el precio total de la comanda
                        </p>
                      </div>
                    </div>
                    <Toggle
                      checked={draftPrefs.showOrderTotal}
                      onCheckedChange={next =>
                        setDraftPrefs(p => ({ ...p, activePreset: "custom", showOrderTotal: next }))
                      }
                      size="md"
                      intent="layout.total.visibility"
                      ariaLabel="Mostrar total de orden"
                    />
                  </div>

                  {/* Customer Phone */}
                  <div className="p-3.5 px-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center flex-none">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">
                          Teléfono de Contacto Directo
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Muestra el teléfono del cliente al lado de su nombre
                        </p>
                      </div>
                    </div>
                    <Toggle
                      checked={draftPrefs.showCustomerPhone}
                      onCheckedChange={next =>
                        setDraftPrefs(p => ({ ...p, activePreset: "custom", showCustomerPhone: next }))
                      }
                      size="md"
                      intent="layout.phone.visibility"
                      ariaLabel="Mostrar teléfono del cliente"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ALERTS & AUTOMATIONS */}
            {activeTab === "alerts" && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Alertas Sonoras & Automatizaciones
                  </h4>
                  <p className="text-zinc-500 dark:text-zinc-400 text-xs">
                    Configura notificaciones de audio para cocina y despacho en tiempo real.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden shadow-2xs">
                  {/* Sound on new order */}
                  <div className="p-3.5 px-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center flex-none">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">
                          Campana Sonora al Ingresar Pedido Nuevo
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Reproduce un tono audible cuando entra una comanda por WhatsApp o Web
                        </p>
                      </div>
                    </div>
                    <Toggle
                      checked={draftPrefs.soundAlerts}
                      onCheckedChange={next =>
                        setDraftPrefs(p => ({ ...p, activePreset: "custom", soundAlerts: next }))
                      }
                      size="md"
                      intent="layout.sound.orders"
                      ariaLabel="Activar sonido de nuevos pedidos"
                    />
                  </div>

                  {/* Sound on SLA delay */}
                  <div className="p-3.5 px-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center flex-none">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">
                          Alerta de Retraso Crítico en Cocina
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Avisa al operador cuando un pedido supera el tiempo estimado de cocción
                        </p>
                      </div>
                    </div>
                    <Toggle
                      checked={draftPrefs.soundAlertDelay}
                      onCheckedChange={next =>
                        setDraftPrefs(p => ({ ...p, activePreset: "custom", soundAlertDelay: next }))
                      }
                      size="md"
                      intent="layout.sound.delay"
                      ariaLabel="Activar sonido de retraso"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between gap-4 flex-none">
          <Button
            variant="ghost"
            intent="layout.reset"
            onClick={handleReset}
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1.5 p-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Todo</span>
          </Button>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              intent="layout.cancel"
              onClick={onClose}
              className="py-2 px-4 rounded-xl text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              intent="layout.save"
              onClick={handleSave}
              className="py-2 px-5 rounded-xl text-xs font-semibold shadow-xs"
            >
              Guardar Preferencias
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
