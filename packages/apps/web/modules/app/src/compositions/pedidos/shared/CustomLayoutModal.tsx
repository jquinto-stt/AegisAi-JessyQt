import React, { useState } from "react";
import { OrderStatus } from "../types";
import {
  SlidersHorizontal,
  RotateCcw,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Layout,
  Maximize2,
  Sparkles,
  CheckCircle2,
  ChefHat,
  Package,
  Check as CheckIcon,
  Layers,
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans antialiased">
      <div className="bg-white dark:bg-[#0E0E10] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] transition-all">
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 flex-none">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF3F1A]">
              Personalización
            </span>
            <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight">
              Estructura del Tablero
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
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
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-100 bg-zinc-50/60 dark:bg-zinc-900/60 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-semibold text-xs">
                <Maximize2 className="w-3.5 h-3.5 text-[#FF3F1A]" />
                <span>Modo Enfoque</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                100% columnas operativas
              </p>
            </button>

            <button
              type="button"
              onClick={applyFullMode}
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-100 bg-zinc-50/60 dark:bg-zinc-900/60 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-semibold text-xs">
                <Layout className="w-3.5 h-3.5 text-[#FF3F1A]" />
                <span>Modo Estándar</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                Todas las barras visibles
              </p>
            </button>
          </div>

          {/* Section 1: Visibility of Screen Segments */}
          <div className="space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              01. Secciones de Pantalla
            </span>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden">
              {/* Toolbar */}
              <div className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Barra de Filtros y Búsqueda
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    Buscador Ctrl+K, estados y canales
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDraftPrefs(p => ({ ...p, showToolbar: !p.showToolbar }))
                  }
                  className={`w-9 h-5 rounded-full transition-colors cursor-pointer relative p-0.5 flex-none ${
                    draftPrefs.showToolbar ? "bg-[#FF3F1A]" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      draftPrefs.showToolbar ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Columns Reordering & Visibility */}
          <div className="space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              02. Columnas de Estado
            </span>

            <div className="space-y-1.5">
              {draftPrefs.columns.map((col, idx) => (
                <div
                  key={col.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    col.visible
                      ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                      : "bg-zinc-50/40 dark:bg-zinc-950/40 border-zinc-200/50 dark:border-zinc-800/50 opacity-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleColumn(col.id)}
                      className={`w-4 h-4 rounded flex items-center justify-center text-white cursor-pointer transition-colors ${
                        col.visible ? "bg-[#FF3F1A]" : "bg-zinc-300 dark:bg-zinc-700"
                      }`}
                    >
                      {col.visible && <Check className="w-3 h-3" />}
                    </button>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {col.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 flex-none">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveColumn(idx, "up")}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === draftPrefs.columns.length - 1}
                      onClick={() => handleMoveColumn(idx, "down")}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 flex-none">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-mono text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restablecer</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="py-2 px-5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <span>Aplicar Cambios</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
