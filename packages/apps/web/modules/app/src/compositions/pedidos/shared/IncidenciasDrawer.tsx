import React from "react";
import { usePedidos } from "../context/PedidosContext";
import { X, AlertTriangle, CheckCircle, CheckCircle2, Clock, ShieldAlert, ArrowRight } from "lucide-react";

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
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsIncidenciasOpen(false)}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#2C2D31] shadow-2xl border-l border-slate-200 dark:border-[#374151] flex flex-col h-full z-10 animate-slide-left overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-[#374151] flex items-center justify-between bg-slate-50 dark:bg-gray-800/80 flex-none">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Incidencias Operativas
              </h3>
              <p className="text-xs text-gray-400">
                {activeInc.length} activas · {resolvedInc.length} resueltas
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsIncidenciasOpen(false)}
            className="w-7 h-7 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 text-gray-400 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Active Incidences */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Requieren Intervención
            </h4>

            {activeInc.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400 font-medium bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-gray-700 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>No hay incidencias operativas activas en este turno.</span>
              </div>
            ) : (
              activeInc.map(inc => (
                <div
                  key={inc.id}
                  className="bg-white dark:bg-gray-800 border-2 border-red-300 dark:border-red-900/80 rounded-2xl p-3.5 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        inc.severity === "Alta"
                          ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                          : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                      }`}
                    >
                      Severidad {inc.severity}
                    </span>
                    <span className="font-mono text-[10px] text-gray-400">{inc.timestamp}</span>
                  </div>

                  <p className="font-extrabold text-xs text-gray-900 dark:text-gray-100">
                    {inc.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
                    {inc.description}
                  </p>

                  <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-gray-700/60">
                    {inc.orderId ? (
                      <button
                        onClick={() => {
                          setSelectedOrderId(inc.orderId!);
                          setIsIncidenciasOpen(false);
                        }}
                        className="text-xs font-bold text-[#FF3F1A] dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Ver pedido {inc.orderId} <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <div />
                    )}

                    <button
                      onClick={() => resolveIncidencia(inc.id)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      Marcar Resuelta
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Resolved Incidences */}
          {resolvedInc.length > 0 && (
            <div className="space-y-2.5 pt-4 border-t border-gray-100 dark:border-gray-700">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Resueltas Recientemente
              </h4>
              <div className="space-y-2">
                {resolvedInc.map(inc => (
                  <div
                    key={inc.id}
                    className="bg-slate-50 dark:bg-gray-800/40 border border-slate-200 dark:border-gray-700 rounded-xl p-3 text-xs opacity-75"
                  >
                    <div className="flex items-center justify-between text-gray-400 text-[10px]">
                      <span>{inc.title}</span>
                      <span>{inc.timestamp}</span>
                    </div>
                    <p className="text-gray-500 line-through text-[11px] mt-1">{inc.description}</p>
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
