import React from "react";
import { usePedidos } from "../context/PedidosContext";
import { X, CheckCircle2, ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/elements";

export const IncidenciasDrawer: React.FC = () => {
  const { incidencias, isIncidenciasOpen, setIsIncidenciasOpen, resolveIncidencia, setSelectedOrderId } =
    usePedidos();

  if (!isIncidenciasOpen) return null;

  const activeInc = incidencias.filter(i => !i.isResolved);
  const resolvedInc = incidencias.filter(i => i.isResolved);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end font-sans antialiased">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#212121]/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => setIsIncidenciasOpen(false)}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#121214] shadow-2xl border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-full z-10 animate-slide-left overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between bg-[#ECECEC]/30 dark:bg-zinc-900/50 flex-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#190088] text-white flex items-center justify-center flex-none shadow-xs">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#212121] dark:text-[#ECECEC] tracking-tight">
                Incidencias Operativas
              </h3>
              <p className="text-xs text-zinc-400 font-medium">
                {activeInc.length} activas · {resolvedInc.length} resueltas
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            intent="incidencias.close"
            onClick={() => setIsIncidenciasOpen(false)}
            className="w-8 h-8 p-0 rounded-xl text-zinc-400 hover:text-[#212121] dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 scrollbar-thin">
          {/* Active Incidences */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#190088] dark:text-[#97D6DF] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF3F1A] animate-pulse" />
                Requieren Intervención ({activeInc.length})
              </span>
            </div>

            {activeInc.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-400 font-medium bg-[#ECECEC]/30 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-2 p-5">
                <CheckCircle2 className="w-5 h-5 text-[#190088] dark:text-[#97D6DF]" />
                <span>No hay incidencias operativas activas en este turno.</span>
              </div>
            ) : (
              activeInc.map(inc => (
                <div
                  key={inc.id}
                  className="bg-[#ECECEC]/25 dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs space-y-2.5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#97D6DF]/20 text-[#190088] dark:text-[#97D6DF] border border-[#97D6DF]/40">
                      Severidad {inc.severity}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">{inc.timestamp}</span>
                  </div>

                  <p className="font-bold text-xs text-[#212121] dark:text-[#ECECEC]">
                    {inc.title}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-snug">
                    {inc.description}
                  </p>

                  <div className="pt-2 flex items-center justify-between border-t border-zinc-200/60 dark:border-zinc-800">
                    {inc.orderId ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderId(inc.orderId!);
                          setIsIncidenciasOpen(false);
                        }}
                        className="p-0 text-xs font-bold text-[#FF3F1A] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Ver pedido {inc.orderId}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <div />
                    )}

                    <Button
                      variant="primary"
                      intent="incidencias.resolve"
                      onClick={() => resolveIncidencia(inc.id)}
                      className="px-3 py-1.5 text-xs font-bold bg-[#FF3F1A] hover:bg-[#e03715] text-white"
                    >
                      Marcar Resuelta
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Resolved Incidences */}
          {resolvedInc.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF]" /> Resueltas en este Turno ({resolvedInc.length})
              </span>
              <div className="space-y-2">
                {resolvedInc.map(inc => (
                  <div
                    key={inc.id}
                    className="bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/70 rounded-2xl p-3 text-xs opacity-75"
                  >
                    <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{inc.title}</span>
                      <span className="font-mono">{inc.timestamp}</span>
                    </div>
                    <p className="text-zinc-400 line-through text-[11px] mt-1">{inc.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
