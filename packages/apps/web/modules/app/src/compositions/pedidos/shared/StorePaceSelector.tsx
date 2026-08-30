import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { StorePaceMode } from "../types";
import {
  Flame,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Store,
  X,
  Sparkles,
  ShieldAlert,
} from "lucide-react";

export const StorePaceSelector: React.FC = () => {
  const { storePace, setStorePace, shiftInfo } = usePedidos();
  const [isOpen, setIsOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const paceConfigs: Record<
    StorePaceMode,
    {
      label: string;
      sublabel: string;
      badgeText: string;
      desc: string;
      bufferText: string;
      pillClass: string;
      dotClass: string;
      borderActive: string;
      icon: any;
    }
  > = {
    rapida: {
      label: "Operación Rápida",
      sublabel: "Baja Demanda",
      badgeText: "-5 min colchón",
      desc: "Cocina desahogada. Reduce 5 min los tiempos prometidos en WhatsApp y Web para capturar más órdenes.",
      bufferText: "-5 min a la estimación",
      pillClass: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800",
      dotClass: "bg-emerald-500",
      borderActive: "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/30",
      icon: Zap,
    },
    habitual: {
      label: "Operación Habitual",
      sublabel: "Demanda Normal",
      badgeText: "Tiempo Estándar",
      desc: "Flujo balanceado de pedidos. Aplica los tiempos base de carta y dotación de cocina.",
      bufferText: "Sin buffer extra",
      pillClass: "bg-slate-100 text-zinc-800 border-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700",
      dotClass: "bg-zinc-600 dark:bg-zinc-300",
      borderActive: "border-[#FF3F1A] ring-2 ring-orange-500/20 bg-orange-50/20 dark:bg-orange-950/30",
      icon: Clock,
    },
    demorada: {
      label: "Operación Demorada",
      sublabel: "Alta Demanda / Salón Lleno",
      badgeText: "+10 min colchón",
      desc: "Alto volumen en salón o lluvia de pedidos. Suma +10 min para proteger a los cocineros del colapso.",
      bufferText: "+10 min de protección",
      pillClass: "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800",
      dotClass: "bg-[#FF3F1A] animate-pulse",
      borderActive: "border-[#FF3F1A] ring-2 ring-orange-500/20 bg-orange-50/20 dark:bg-orange-950/30",
      icon: Flame,
    },
  };

  const currentConfig = paceConfigs[storePace];
  const Icon = currentConfig.icon;

  const handleSelectPace = (mode: StorePaceMode) => {
    setStorePace(mode);
    setIsOpen(false);
    const msg =
      mode === "demorada"
        ? "Modo Demorado Activado (+10 min buffer para cocina)"
        : mode === "rapida"
        ? "Modo Rápido Activado (-5 min para captar más clientes)"
        : "Modo Habitual Restablecido";
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  return (
    <div className="relative">
      {/* Top Trigger Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex-none flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-black transition-all cursor-pointer shadow-xs hover:scale-102 active:scale-98 ${currentConfig.pillClass}`}
        title="Cambiar ritmo de demanda de la tienda"
      >
        <span className={`w-2.5 h-2.5 rounded-full flex-none ${currentConfig.dotClass}`} />
        <span className="whitespace-nowrap font-black">
          {currentConfig.label}
        </span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70 flex-none ml-0.5" />
      </button>

      {/* Popover / Modal Selector */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-[calc(100vw-32px)] max-w-sm sm:w-96 bg-white dark:bg-[#2C2D31] border-2 border-slate-200 dark:border-[#374151] rounded-3xl shadow-2xl z-50 p-4 sm:p-5 space-y-4 animate-scale-up">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950 text-[#FF3F1A] flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-gray-900 dark:text-gray-100">
                    Ritmo Operativo de Tienda
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Gestiona la promesa de tiempos según la demanda actual:
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              {(["rapida", "habitual", "demorada"] as const).map(mode => {
                const config = paceConfigs[mode];
                const isSelected = storePace === mode;
                const ModeIcon = config.icon;

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleSelectPace(mode)}
                    className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? config.borderActive
                        : "border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-850 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none mt-0.5 ${config.pillClass}`}
                    >
                      <ModeIcon className="w-4.5 h-4.5" />
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <h5 className="font-black text-xs text-gray-900 dark:text-gray-100">
                            {config.label}
                          </h5>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${config.pillClass}`}
                        >
                          {config.badgeText}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                        {config.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Current Shift Synergy Note */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400 flex items-center justify-between">
              <span>{shiftInfo.currentShift}</span>
              <strong className="text-gray-700 dark:text-gray-300 font-mono">
                Buffer cocina: +{shiftInfo.suggestedPrepBufferMinutes}m
              </strong>
            </div>
          </div>
        </>
      )}

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-2xl shadow-2xl text-xs font-black flex items-center gap-2 border border-gray-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
