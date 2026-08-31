import React from "react";
import { usePedidos } from "../context/PedidosContext";
import { X, CheckCircle2, ShieldAlert, ArrowRight } from "lucide-react";
import { Button, Badge } from "@/elements";

export const IncidenciasDrawer: React.FC = () => {
  const { incidencias, isIncidenciasOpen, setIsIncidenciasOpen, resolveIncidencia, setSelectedOrderId } =
    usePedidos();

  if (!isIncidenciasOpen) return null;

  const activeInc = incidencias.filter(i => !i.isResolved);
  const resolvedInc = incidencias.filter(i => i.isResolved);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => setIsIncidenciasOpen(false)}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#121214] shadow-2xl border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-full z-10 animate-slide-left overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 flex-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-none border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-950 dark:text-zinc-50 tracking-tight">
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
            className="w-8 h-8 p-0 rounded-xl text-zinc-400"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Active Incidences */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Requieren Intervención ({activeInc.length})
              </span>
            </div>

            {activeInc.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-400 font-medium bg-zinc-50/50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-2 p-5">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>No hay incidencias operativas activas en este turno.</span>
              </div>
            ) : (
              activeInc.map(inc => (
                <div
                  key={inc.id}
                  className="bg-white dark:bg-[#18181B] border border-rose-500/30 bg-rose-500/[0.02] dark:bg-rose-500/[0.04] rounded-3xl p-4 shadow-2xs space-y-2.5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={inc.severity === "Alta" ? "danger" : "warning"}
                      intent="incidencias.severity"
                      className="normal-case"
                    >
                      Severidad {inc.severity}
                    </Badge>
                    <span className="font-mono text-[10px] text-zinc-400">{inc.timestamp}</span>
                  </div>

                  <p className="font-bold text-xs text-zinc-950 dark:text-zinc-50">
                    {inc.title}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-snug">
                    {inc.description}
                  </p>

                  <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                    {inc.orderId ? (
                      <Button
                        variant="ghost"
                        intent="incidencias.order.view"
                        onClick={() => {
                          setSelectedOrderId(inc.orderId!);
                          setIsIncidenciasOpen(false);
                        }}
                        className="p-0 text-xs font-bold text-[#FF3F1A] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Ver pedido {inc.orderId} <ArrowRight className="w-3 h-3" />
                      </Button>
                    ) : (
                      <div />
                    )}

                    <Button
                      variant="primary"
                      intent="incidencias.resolve"
                      onClick={() => resolveIncidencia(inc.id)}
                      className="px-3 py-1.5 text-xs"
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
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Resueltas en este Turno ({resolvedInc.length})
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
