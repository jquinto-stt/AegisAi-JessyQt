import React, { useState } from "react";
import {
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Package,
  Boxes,
  ArrowRight,
  Hammer,
} from "lucide-react";
import { BuildOrder, InventoryProduct, StockLocation } from "../types/inventory.types";
import { Button } from "@/elements";

interface ManufacturingViewProps {
  buildOrders: BuildOrder[];
  products: InventoryProduct[];
  locations: StockLocation[];
  onExecuteBuild: (buildOrderId: string) => Promise<any>;
}

export const ManufacturingView: React.FC<ManufacturingViewProps> = ({
  buildOrders,
  products,
  locations,
  onExecuteBuild,
}) => {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [executingId, setExecutingId] = useState<string | null>(null);

  const filteredOrders = buildOrders.filter((bo) => {
    if (statusFilter !== "all" && bo.status !== statusFilter) return false;
    return true;
  });

  const handleExecute = async (buildOrderId: string) => {
    try {
      setExecutingId(buildOrderId);
      await onExecuteBuild(buildOrderId);
    } catch (err: any) {
      alert(err?.message || "Error al ejecutar el ensamble de producción.");
    } finally {
      setExecutingId(null);
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "—";
    try {
      return new Date(isoStr).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const pendingBuilds = buildOrders.filter((bo) => bo.status === "pending").length;
  const completedBuilds = buildOrders.filter((bo) => bo.status === "completed").length;

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-fade-in max-w-7xl mx-auto">
      {/* ── 1. Minimalist Manufacturing Overview Strip (Zero Clutter) ── */}
      <div className="bg-white dark:bg-[#151518] rounded-2xl p-3 sm:px-4 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 sm:gap-6 divide-x divide-zinc-200 dark:divide-zinc-800 text-xs overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-baseline gap-2 flex-none">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Total Kits Compuestos:</span>
            <span className="font-mono font-black text-sm text-zinc-900 dark:text-white">
              {buildOrders.length}
            </span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-baseline gap-2 flex-none">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Pendientes de Armado:</span>
            <span className="font-mono font-black text-sm text-amber-600 dark:text-amber-400">
              {pendingBuilds}
            </span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-baseline gap-2 flex-none">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Armados Completados:</span>
            <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
              {completedBuilds}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-[#151518] rounded-2xl p-2.5 sm:p-3 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "all"
                ? "bg-[#190088] text-white border border-[#190088] shadow-2xs font-bold"
                : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/60 hover:text-[#190088] dark:hover:text-[#97D6DF] hover:bg-blue-50/70 dark:hover:bg-[#190088]/20"
            }`}
          >
            Todos ({buildOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "pending"
                ? "bg-[#190088] text-white border border-[#190088] shadow-2xs font-bold"
                : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/60 hover:text-[#190088] dark:hover:text-[#97D6DF] hover:bg-blue-50/70 dark:hover:bg-[#190088]/20"
            }`}
          >
            Pendientes ({buildOrders.filter((b) => b.status === "pending").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("completed")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "completed"
                ? "bg-[#190088] text-white border border-[#190088] shadow-2xs font-bold"
                : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/60 hover:text-[#190088] dark:hover:text-[#97D6DF] hover:bg-blue-50/70 dark:hover:bg-[#190088]/20"
            }`}
          >
            Completadas ({buildOrders.filter((b) => b.status === "completed").length})
          </button>
        </div>
      </div>

      {/* Build Orders Cards */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center text-zinc-400 space-y-2">
          <Boxes className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600" />
          <p className="font-bold text-base text-zinc-700 dark:text-zinc-200">
            No hay kits ni órdenes de armado con el filtro seleccionado
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredOrders.map((bo) => {
            // Comprobar si todos los componentes tienen stock suficiente
            const canBuild = bo.bom.every((comp) => {
              const currentP = products.find((p) => p.id === comp.componentProductId);
              const needed = comp.quantityRequired * bo.quantityToBuild;
              return currentP && currentP.stockActual >= needed;
            });

            return (
              <div
                key={bo.id}
                className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs hover:shadow-md hover:border-[#190088]/60 dark:hover:border-[#190088]/80 transition-all space-y-5"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-black font-mono text-zinc-900 dark:text-white">
                        {bo.buildNumber}
                      </span>
                      {bo.status === "pending" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-xs font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <Clock className="w-3.5 h-3.5" />
                          Pendiente de Ejecución
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ensamble Finalizado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">
                      Producto Resultante:{" "}
                      <strong className="text-zinc-800 dark:text-zinc-200 font-bold">
                        {bo.outputProductName}
                      </strong>{" "}
                      ({bo.quantityToBuild} unidades) en{" "}
                      <strong className="text-zinc-800 dark:text-zinc-200">
                        {bo.locationName}
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {bo.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => handleExecute(bo.id)}
                        disabled={!canBuild || executingId === bo.id}
                        className="flex items-center gap-2 text-xs font-bold whitespace-nowrap shadow-2xs bg-[#190088] hover:bg-[#150073] text-white px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>{executingId === bo.id ? "Procesando..." : "Ejecutar Ensamble"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* BOM Components List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase font-mono tracking-wider text-zinc-400 block">
                      Lista de Materiales (BOM) & Consumo Requerido
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      Total componentes: {bo.bom.length}
                    </span>
                  </div>

                  <div className="rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/40 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/70">
                    {bo.bom.map((comp) => {
                      const currentP = products.find((p) => p.id === comp.componentProductId);
                      const totalNeeded = comp.quantityRequired * bo.quantityToBuild;
                      const hasEnough = currentP ? currentP.stockActual >= totalNeeded : false;

                      return (
                        <div
                          key={comp.id}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                        >
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-white">
                              {comp.componentName}
                            </p>
                            <span className="font-mono text-[11px] text-zinc-400">
                              SKU: {comp.componentSku} · {comp.quantityRequired} {comp.unit}/unidad
                            </span>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-zinc-400 block font-mono">
                                Requerido Total
                              </span>
                              <strong className="font-mono text-zinc-900 dark:text-white text-sm">
                                {totalNeeded} {comp.unit}
                              </strong>
                            </div>

                            <div className="text-right min-w-[100px]">
                              <span className="text-[10px] uppercase font-bold text-zinc-400 block font-mono">
                                Stock Actual
                              </span>
                              <span
                                className={`font-mono text-xs font-bold ${
                                  hasEnough
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-[#FF3F1A]"
                                }`}
                              >
                                {currentP ? currentP.stockActual : 0} {comp.unit}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                  <span>Creado: {formatDate(bo.createdAt)}</span>
                  {bo.completedAt && <span>Completado: {formatDate(bo.completedAt)}</span>}
                  {bo.notes && <span className="italic max-w-md truncate">"{bo.notes}"</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
