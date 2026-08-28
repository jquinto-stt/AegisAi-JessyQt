import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { Pedido, UrgencyLevel, OperacionTab } from "../types";
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Minus,
  Plus,
  Users,
  ChevronRight,
  ShieldCheck,
  Check,
  ArrowLeft,
  Kanban,
  Package,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Timer,
  Utensils,
  Maximize2,
  Printer,
} from "lucide-react";
import { NectoBanner } from "../shared/NectoBanner";

export const PreparacionTiemposView: React.FC<{
  onNavigateOpTab?: (t: OperacionTab) => void;
}> = ({ onNavigateOpTab }) => {
  const { orders, markOrderReady, adjustEstimate, shiftInfo, setSelectedOrderId, setPrintTicketOrder } = usePedidos();

  const [stationFilter, setStationFilter] = useState<"TODAS" | "Horno" | "Armado" | "Empaque">("TODAS");
  const [checkedItems, setCheckedItems] = useState<Record<string, Set<number>>>({});
  const [readyToast, setReadyToast] = useState<string | null>(null);

  // Active cooking orders
  const prepOrders = orders.filter(
    o => o.status === "EN_PREPARACION" || o.status === "CONFIRMADO"
  );

  const retrasados = prepOrders.filter(o => o.urgency === "RETRASADO");
  const proximos = prepOrders.filter(o => o.urgency === "PROXIMO");
  const aTiempo = prepOrders.filter(o => o.urgency === "A_TIEMPO");

  // Production batch totals across all active orders in kitchen
  const batchTotals: Record<string, number> = {};
  prepOrders.forEach(o => {
    o.items.forEach(it => {
      batchTotals[it.name] = (batchTotals[it.name] || 0) + it.quantity;
    });
  });

  const totalUnitsInProduction = Object.values(batchTotals).reduce((a, b) => a + b, 0);

  const toggleItemCheck = (orderId: string, itemIdx: number) => {
    setCheckedItems(prev => {
      const orderSet = new Set(prev[orderId] || []);
      if (orderSet.has(itemIdx)) orderSet.delete(itemIdx);
      else orderSet.add(itemIdx);
      return { ...prev, [orderId]: orderSet };
    });
  };

  const handleCompleteOrder = (orderId: string, turnNumber?: number) => {
    markOrderReady(orderId);
    setReadyToast(`¡Comanda ${orderId} (Turno #${turnNumber || "00"}) marcada como LISTA para entrega!`);
    setTimeout(() => setReadyToast(null), 3500);
  };

  const renderSection = (
    title: string,
    list: Pedido[],
    urgency: UrgencyLevel,
    accentBorder: string,
    accentBadge: string,
    subdesc: string
  ) => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <span className={`w-3.5 h-3.5 rounded-full ${accentBadge}`} />
            <h3 className="font-black text-base text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full text-gray-500">
              {list.length} {list.length === 1 ? "comanda" : "comandas"}
            </span>
          </div>
          <span className="text-xs text-gray-400 font-semibold">{subdesc}</span>
        </div>

        {list.length === 0 ? (
          <div className="bg-slate-50/60 dark:bg-gray-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-gray-800 p-8 text-center text-xs text-gray-400 font-bold">
            Sin comandas en esta categoría de tiempo.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {list.map(order => {
              const currentChecks = checkedItems[order.id] || new Set();
              const isAllChecked = currentChecks.size === order.items.length;
              const isDelayed = urgency === "RETRASADO";
              const progressPercent = Math.min(
                100,
                Math.round((order.elapsedMinutes / Math.max(1, order.estimatedMinutes)) * 100)
              );

              return (
                <div
                  key={order.id}
                  className={`bg-white dark:bg-[#2C2D31] rounded-3xl border-2 shadow-xs p-5 flex flex-col justify-between gap-4 transition-all duration-300 hover:shadow-lg ${accentBorder}`}
                >
                  {/* Card Header: Turno Gigante & Timer */}
                  <div className="flex items-start justify-between border-b border-gray-100 dark:border-[#374151] pb-3.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black px-3 py-1 rounded-xl bg-orange-100 dark:bg-orange-950 text-[#FF3F1A] border border-orange-300 dark:border-orange-800">
                          Turno #{order.turnNumber || "00"}
                        </span>
                        <span className="font-mono font-black text-xs text-gray-400">
                          {order.id}
                        </span>
                      </div>
                      <h4 className="font-black text-sm text-gray-900 dark:text-gray-100 truncate">
                        {order.customerName}
                      </h4>
                    </div>

                    {/* Big Countdown Timer */}
                    <div className="text-right">
                      <div
                        className={`flex items-center justify-end gap-1.5 font-mono font-black text-2xl ${
                          isDelayed
                            ? "text-red-600 dark:text-red-400"
                            : urgency === "PROXIMO"
                            ? "text-amber-500"
                            : "text-[#190088] dark:text-indigo-300"
                        }`}
                      >
                        {isDelayed && <Flame className="w-5 h-5 text-red-500 animate-bounce flex-none" />}
                        <span>{order.elapsedMinutes}m</span>
                        <span className="text-xs font-normal text-gray-400">/{order.estimatedMinutes}m</span>
                      </div>

                      {/* Micro Time Adjusters */}
                      <div className="flex items-center gap-1.5 mt-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => adjustEstimate(order.id, -5)}
                          className="w-7 h-7 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-slate-100 cursor-pointer transition-colors"
                          title="Restar 5 min a la comanda"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustEstimate(order.id, 5)}
                          className="w-7 h-7 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-slate-100 cursor-pointer transition-colors"
                          title="Sumar 5 min de colchón a la comanda"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-gray-400">
                      <span>Progreso de cocción:</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isDelayed ? "bg-red-500" : urgency === "PROXIMO" ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Cooking Checklist with Touch Buttons */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                      <span>Checklist de Bandejas / Platos:</span>
                      <span className="text-gray-500 font-mono font-bold">
                        {currentChecks.size}/{order.items.length} listos
                      </span>
                    </div>

                    <div className="space-y-2">
                      {order.items.map((it, idx) => {
                        const checked = currentChecks.has(idx);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleItemCheck(order.id, idx)}
                            className={`w-full p-3 rounded-2xl border-2 text-left flex items-center justify-between text-xs transition-all cursor-pointer select-none ${
                              checked
                                ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                                : "bg-slate-50 dark:bg-gray-800/80 border-slate-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-3 truncate">
                              <span
                                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-none transition-all ${
                                  checked
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                                }`}
                              >
                                {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </span>
                              <span className="font-mono font-black text-sm text-[#FF3F1A]">
                                ×{it.quantity}
                              </span>
                              <span className={`font-bold truncate ${checked ? "line-through opacity-70" : ""}`}>
                                {it.name}
                              </span>
                            </div>

                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-lg border flex-none ml-2 ${
                                checked
                                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300"
                                  : "bg-slate-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-transparent"
                              }`}
                            >
                              {checked ? "Horneado" : "Pendiente"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes / Special Instructions */}
                  {order.notes && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-3 text-xs text-amber-900 dark:text-amber-200 space-y-0.5">
                      <strong className="font-black text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                        Instrucción Especial de Cocina:
                      </strong>
                      <p>{order.notes}</p>
                    </div>
                  )}

                  {/* Footer Complete Button & Print */}
                  <div className="pt-2 border-t border-gray-100 dark:border-[#374151] flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPrintTicketOrder(order)}
                      className="py-3 px-3.5 rounded-2xl border border-slate-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-[#FF3F1A] hover:bg-orange-50 dark:hover:bg-gray-800 transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Imprimir comanda térmica"
                    >
                      <Printer className="w-4 h-4" />
                      <span className="hidden sm:inline">Imprimir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedOrderId(order.id)}
                      className="py-3 px-3.5 rounded-2xl border border-slate-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      Detalle
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCompleteOrder(order.id, order.turnNumber)}
                      className={`flex-1 py-3 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 ${
                        isAllChecked
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse"
                          : "bg-[#190088] hover:bg-[#140070] text-white"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isAllChecked ? "¡Todo Horneado! Marcar Listo" : "Marcar Listo"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <NectoBanner
        icon={<ChefHat className="w-6 h-6 text-[#FF3F1A]" />}
        title="KDS Cocina y Tiempos de Elaboración"
        description="Pantalla táctil de producción en cocina: cuenta regresiva de cocción, checklist de horneado y sincronización con el Kanban."
        actionNode={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onNavigateOpTab?.("en-vivo")}
              className="py-2.5 px-4 rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-[#190088] text-xs font-black flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#190088] dark:text-indigo-400" />
              <span>Volver al Tablero Kanban</span>
            </button>

            <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/60 text-[#FF3F1A] font-black px-3.5 py-2 rounded-2xl border border-orange-200 dark:border-orange-800 text-xs">
              <Flame className="w-4 h-4 text-[#FF3F1A]" />
              <span>{prepOrders.length} comandas en fogón</span>
            </div>
          </div>
        }
      />

      {/* Real-time Kitchen Operations Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active cooking orders */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border-2 border-t-4 border-t-[#FF3F1A] border-slate-200/90 dark:border-[#374151] p-5 shadow-xs space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
            Comandas en Fogón
          </span>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-black font-mono text-gray-900 dark:text-gray-100">
              {prepOrders.length}
            </p>
            <span className="text-xs font-black text-[#FF3F1A] bg-orange-50 dark:bg-orange-950 px-2.5 py-0.5 rounded-full">
              En Producción
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            {totalUnitsInProduction} unidades totales a elaborar
          </p>
        </div>

        {/* KPI 2: Retrasados Warning */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border-2 border-t-4 border-t-red-500 border-slate-200/90 dark:border-[#374151] p-5 shadow-xs space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
            Retrasos Críticos
          </span>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-black font-mono text-red-600 dark:text-red-400">
              {retrasados.length}
            </p>
            <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950 px-2.5 py-0.5 rounded-full">
              {retrasados.length > 0 ? "Requiere Atención" : "Todo a tiempo"}
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Superan el tiempo prometido en carta</p>
        </div>

        {/* KPI 3: Suggested Prep Buffer */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border-2 border-t-4 border-t-[#190088] border-slate-200/90 dark:border-[#374151] p-5 shadow-xs space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
            Buffer Sugerido
          </span>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-black font-mono text-gray-900 dark:text-gray-100">
              +{shiftInfo.suggestedPrepBufferMinutes} <span className="text-sm font-normal text-gray-400">min</span>
            </p>
            <span className="text-xs font-bold text-[#190088] dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-0.5 rounded-full">
              {shiftInfo.currentShift}
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Calculado según la dotación activa de cocineros</p>
        </div>

        {/* KPI 4: Units in Oven */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border-2 border-t-4 border-t-emerald-500 border-slate-200/90 dark:border-[#374151] p-5 shadow-xs space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
            Unidades en Tanda
          </span>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-black font-mono text-gray-900 dark:text-gray-100">
              {totalUnitsInProduction}
            </p>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full">
              Capacidad 78%
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Agrupadas por receta y cocción</p>
        </div>
      </div>

      {/* Production Batch Summary (Tandas Totales en Cocina) */}
      <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border border-slate-200/90 dark:border-[#374151] p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950 text-[#FF3F1A] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-black text-sm text-gray-900 dark:text-gray-100">
                Resumen de Tandas Totales a Hornear en este Momento
              </h4>
              <p className="text-[11px] text-gray-400">
                Acumulado de unidades por receta para optimizar el espacio de las bandejas del horno.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-black text-[#190088] dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-3 py-1 rounded-xl">
            {totalUnitsInProduction} unidades totales
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {Object.keys(batchTotals).length === 0 ? (
            <p className="text-xs text-gray-400 font-semibold py-2">
              No hay productos en preparación actualmente.
            </p>
          ) : (
            Object.entries(batchTotals).map(([name, qty]) => (
              <div
                key={name}
                className="py-2 px-3.5 rounded-2xl bg-slate-50 dark:bg-gray-850 border border-slate-200 dark:border-gray-700 text-xs font-black flex items-center gap-2.5 shadow-xs"
              >
                <span className="w-6 h-6 rounded-xl bg-[#FF3F1A] text-white flex items-center justify-center font-mono font-black text-xs">
                  {qty}
                </span>
                <span className="text-gray-800 dark:text-gray-200">{name}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* KDS Columns by Urgency */}
      <div className="space-y-8">
        {renderSection(
          "Comandas Retrasadas",
          retrasados,
          "RETRASADO",
          "border-red-400 dark:border-red-900/80 bg-red-50/15",
          "bg-red-500 animate-ping",
          "Prioridad crítica de entrega"
        )}

        {renderSection(
          "Comandas Próximas al Límite",
          proximos,
          "PROXIMO",
          "border-amber-300 dark:border-amber-800/80 bg-amber-50/15",
          "bg-amber-500",
          "Preparación en curso a terminar en <5 min"
        )}

        {renderSection(
          "Comandas a Tiempo",
          aTiempo,
          "A_TIEMPO",
          "border-slate-200/90 dark:border-[#374151]",
          "bg-emerald-500",
          "Flujo regular de horneado"
        )}
      </div>

      {/* Floating Ready Toast */}
      {readyToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-2xl shadow-2xl text-xs font-black flex items-center gap-2.5 border border-gray-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none" />
          <span>{readyToast}</span>
        </div>
      )}
    </div>
  );
};
