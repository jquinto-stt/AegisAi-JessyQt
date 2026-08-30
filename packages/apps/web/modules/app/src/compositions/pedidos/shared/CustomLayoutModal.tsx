import React, { useState } from "react";
import { OrderStatus } from "../types";
import {
  SlidersHorizontal,
  RotateCcw,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Layout,
  Maximize2,
  Sparkles,
  CheckCircle2,
  ChefHat,
  Package,
  Check as CheckIcon,
  Layers,
  Search,
  PanelTop,
} from "lucide-react";

export interface ColumnConfig {
  id: OrderStatus;
  title: string;
  visible: boolean;
}

export interface LayoutPreferences {
  showTopHeader: boolean;
  showBanner: boolean;
  showToolbar: boolean;
  columns: ColumnConfig[];
}

export const DEFAULT_LAYOUT_PREFS: LayoutPreferences = {
  showTopHeader: true,
  showBanner: false,
  showToolbar: true,
  columns: [
    { id: "NUEVO", title: "Nuevos & Por Confirmar", visible: true },
    { id: "CONFIRMADO", title: "Confirmados (En Cola)", visible: true },
    { id: "EN_PREPARACION", title: "En Cocina / Preparación", visible: true },
    { id: "LISTO", title: "Listos para Entrega", visible: true },
    { id: "FINALIZADO", title: "Entregados Hoy", visible: true },
  ],
};

const COLUMN_ICONS: Record<OrderStatus, any> = {
  NUEVO: Sparkles,
  CONFIRMADO: CheckCircle2,
  EN_PREPARACION: ChefHat,
  LISTO: Package,
  FINALIZADO: CheckIcon,
  RECHAZADO: X,
  CANCELADO: X,
};

export const CustomLayoutModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  prefs: LayoutPreferences;
  onSave: (newPrefs: LayoutPreferences) => void;
  onReset: () => void;
}> = ({ isOpen, onClose, prefs, onSave, onReset }) => {
  const [draftPrefs, setDraftPrefs] = useState<LayoutPreferences>(prefs);

  React.useEffect(() => {
    if (isOpen) {
      setDraftPrefs(prefs);
    }
  }, [isOpen, prefs]);

  if (!isOpen) return null;

  const handleToggleColumn = (id: OrderStatus) => {
    setDraftPrefs(prev => ({
      ...prev,
      columns: prev.columns.map(c =>
        c.id === id ? { ...c, visible: !c.visible } : c
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
      columns: newColumns,
    }));
  };

  const applyFocusMode = () => {
    setDraftPrefs({
      showTopHeader: false,
      showBanner: false,
      showToolbar: false,
      columns: draftPrefs.columns.map(c => ({
        ...c,
        visible: c.id !== "FINALIZADO",
      })),
    });
  };

  const applyFullMode = () => {
    setDraftPrefs({
      showTopHeader: true,
      showBanner: true,
      showToolbar: true,
      columns: draftPrefs.columns.map(c => ({ ...c, visible: true })),
    });
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#212121] rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] transition-all">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 flex-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-[#FF3F1A] flex items-center justify-center flex-none">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight">
                Personalizar Vista
              </h3>
              <p className="text-[11px] text-zinc-400 font-medium">
                Adapta las secciones y el orden del flujo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
          {/* Quick Presets */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={applyFocusMode}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-[#FF3F1A] bg-slate-50/60 dark:bg-zinc-800/40 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-bold text-xs group-hover:text-[#FF3F1A]">
                <Maximize2 className="w-3.5 h-3.5 text-[#FF3F1A]" />
                <span>Modo Enfoque</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">
                Sin barras, 100% tablero
              </p>
            </button>

            <button
              type="button"
              onClick={applyFullMode}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-[#FF3F1A] bg-slate-50/60 dark:bg-zinc-800/40 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-bold text-xs group-hover:text-[#FF3F1A]">
                <Layout className="w-3.5 h-3.5 text-[#FF3F1A]" />
                <span>Modo Completo</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">
                Todas las barras visibles
              </p>
            </button>
          </div>

          {/* Section 1: Visibility of Screen Segments */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-black tracking-wider uppercase text-zinc-400">
              Secciones Principales
            </span>

            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-900/40 divide-y divide-slate-100 dark:divide-zinc-800/80 overflow-hidden">
              {/* Top Module Navigation */}
              <div className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                    <PanelTop className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      Barra de Módulo
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      Pestañas superiores y utilidades
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDraftPrefs(p => ({ ...p, showTopHeader: !p.showTopHeader }))
                  }
                  className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 flex-none ${
                    draftPrefs.showTopHeader ? "bg-[#FF3F1A]" : "bg-slate-200 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      draftPrefs.showTopHeader ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Banner */}
              <div className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      Banner Informativo
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      Título y descripción de pantalla
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDraftPrefs(p => ({ ...p, showBanner: !p.showBanner }))
                  }
                  className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 flex-none ${
                    draftPrefs.showBanner ? "bg-[#FF3F1A]" : "bg-slate-200 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      draftPrefs.showBanner ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Toolbar */}
              <div className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      Barra de Filtros
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      Buscador, canales y selector
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDraftPrefs(p => ({ ...p, showToolbar: !p.showToolbar }))
                  }
                  className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 flex-none ${
                    draftPrefs.showToolbar ? "bg-[#FF3F1A]" : "bg-slate-200 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      draftPrefs.showToolbar ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Columns Reorder & Visibility */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-wider uppercase text-zinc-400">
                Columnas del Tablero
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">
                Reordena con las flechas
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-900/40 divide-y divide-slate-100 dark:divide-zinc-800/80 overflow-hidden">
              {draftPrefs.columns.map((col, idx) => {
                const Icon = COLUMN_ICONS[col.id] || Layers;
                const isFirst = idx === 0;
                const isLast = idx === draftPrefs.columns.length - 1;

                return (
                  <div
                    key={col.id}
                    className={`p-2.5 px-3 flex items-center justify-between gap-2 transition-all ${
                      col.visible ? "bg-white dark:bg-zinc-900/80" : "opacity-40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <GripVertical className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 flex-none" />
                      <div className="w-6 h-6 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#FF3F1A] flex items-center justify-center flex-none">
                        <Icon className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                        {col.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-none">
                      {/* Reorder Buttons */}
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => handleMoveColumn(idx, "up")}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                          isFirst
                            ? "text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
                            : "text-zinc-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                        }`}
                        title="Mover a la izquierda"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => handleMoveColumn(idx, "down")}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                          isLast
                            ? "text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
                            : "text-zinc-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                        }`}
                        title="Mover a la derecha"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Visibility Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleColumn(col.id)}
                        className={`w-8 h-5 rounded-full transition-colors cursor-pointer relative p-0.5 ml-1 ${
                          col.visible ? "bg-[#FF3F1A]" : "bg-slate-200 dark:bg-zinc-700"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                            col.visible ? "translate-x-3" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/60 dark:bg-zinc-900/60 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-3 flex-none">
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restablecer</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Aplicar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
