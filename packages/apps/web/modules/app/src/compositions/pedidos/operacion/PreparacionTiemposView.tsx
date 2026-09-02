import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { Pedido, UrgencyLevel, OperacionTab } from "../types";
import { Button, Card, Badge } from "@/elements";
import {
  ChefHat,
  CheckCircle2,
  Minus,
  Plus,
  Check,
  Printer,
} from "lucide-react";

export const PreparacionTiemposView: React.FC<{
  onNavigateOpTab?: (t: OperacionTab) => void;
}> = () => {
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
    setReadyToast(`¡Pedido ${orderId} (Turno #${turnNumber || "00"}) marcado como LISTO para entrega!`);
    setTimeout(() => setReadyToast(null), 3500);
  };

  const renderSection = (
    title: string,
    list: Pedido[],
    urgency: UrgencyLevel,
    _accentBorder: string,
    accentBadge: string,
    subdesc: string
  ) => {
    return (
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${accentBadge}`} />
            <h3 className="font-bold text-sm text-zinc-950 dark:text-zinc-50 tracking-tight">
              {title}
            </h3>
            <Badge variant="neutral" intent="kds.section.count" className="text-xs normal-case">
              {list.length} {list.length === 1 ? "comanda" : "comandas"}
            </Badge>
          </div>
          <span className="text-xs text-zinc-400 font-medium">{subdesc}</span>
        </div>

        {list.length === 0 ? (
          <Card variant="dashed" intent="kds.section.empty" className="p-8 text-center text-xs text-zinc-400 font-medium">
            Sin comandas en esta categoría de tiempo.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map(order => {
              const currentChecks = checkedItems[order.id] || new Set();
              const isAllChecked = currentChecks.size === order.items.length;
              const isDelayed = urgency === "RETRASADO";
              const progressPercent = Math.min(
                100,
                Math.round((order.elapsedMinutes / Math.max(1, order.estimatedMinutes)) * 100)
              );

              return (
                <Card
                  key={order.id}
                  intent="kds.order.card"
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`dark:bg-[#18181B] p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:shadow-md cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 ${
                    isDelayed
                      ? "border-rose-500/40 bg-rose-500/[0.02] dark:bg-rose-500/[0.04]"
                      : ""
                  }`}
                >
                  {/* Card Header: Turno & Timer */}
                  <div className="flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white border border-zinc-200 dark:border-zinc-700">
                          Turno #{order.turnNumber || "00"}
                        </span>
                        <span className="font-mono font-bold text-xs text-zinc-400">
                          {order.id}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-zinc-950 dark:text-zinc-50 truncate">
                        {order.customerName}
                      </h4>
                    </div>

                    {/* Countdown Timer */}
                    <div className="text-right">
                      <div
                        className={`flex items-center justify-end gap-1.5 font-mono font-black text-xl ${
                          isDelayed
                            ? "text-rose-600 dark:text-rose-400"
                            : urgency === "PROXIMO"
                            ? "text-amber-500"
                            : "text-zinc-950 dark:text-zinc-50"
                        }`}
                      >
                        {isDelayed && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-none" />}
                        <span>{order.elapsedMinutes}m</span>
                        <span className="text-xs font-normal text-zinc-400">/{order.estimatedMinutes}m</span>
                      </div>

                      {/* Micro Time Adjusters */}
                      <div className="flex items-center gap-1.5 mt-1.5 justify-end">
                        <Button
                          variant="outline"
                          intent="kds.order.estimate.decrease"
                          onClick={e => {
                            e.stopPropagation();
                            adjustEstimate(order.id, -5);
                          }}
                          className="w-6 h-6 p-0 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-xs"
                          title="Restar 5 min al pedido"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          intent="kds.order.estimate.increase"
                          onClick={e => {
                            e.stopPropagation();
                            adjustEstimate(order.id, 5);
                          }}
                          className="w-6 h-6 p-0 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-xs"
                          title="Sumar 5 min al pedido"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                      <span>Progreso de preparación</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isDelayed ? "bg-rose-500" : urgency === "PROXIMO" ? "bg-amber-500" : "bg-[#FF3F1A]"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Cooking Checklist */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      <span>Checklist de Preparación</span>
                      <span className="font-mono text-zinc-500">
                        {currentChecks.size}/{order.items.length} listos
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {order.items.map((it, idx) => {
                        const checked = currentChecks.has(idx);
                        return (
                          <Button
                            key={idx}
                            variant="ghost"
                            intent="kds.order.item.toggle"
                            onClick={e => {
                              e.stopPropagation();
                              toggleItemCheck(order.id, idx);
                            }}
                            className={`p-0 w-full p-2.5 rounded-2xl border text-left flex items-center justify-between text-xs transition-all cursor-pointer select-none ${
                              checked
                                ? "bg-zinc-100/70 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100"
                                : "bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span
                                className={`w-4 h-4 rounded-md border flex items-center justify-center flex-none transition-all ${
                                  checked
                                    ? "bg-[#FF3F1A] border-[#FF3F1A] text-white"
                                    : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                                }`}
                              >
                                {checked && <Check className="w-3 h-3 stroke-[3]" />}
                              </span>
                              <span className="font-mono font-bold text-xs text-[#FF3F1A]">
                                ×{it.quantity}
                              </span>
                              <span className={`font-semibold truncate text-xs ${checked ? "line-through opacity-60" : ""}`}>
                                {it.name}
                              </span>
                            </div>

                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-md border flex-none ml-2 ${
                                checked
                                  ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-600"
                                  : "bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-transparent"
                              }`}
                            >
                              {checked ? "Listo" : "Pendiente"}
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes / Special Instructions */}
                  {order.notes && (
                    <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-2.5 text-xs text-zinc-900 dark:text-zinc-100 space-y-0.5">
                      <strong className="font-bold text-[10px] uppercase tracking-wider text-zinc-500 block">
                        Instrucción Especial:
                      </strong>
                      <p className="italic text-[11px] text-zinc-600 dark:text-zinc-300">{order.notes}</p>
                    </div>
                  )}

                  {/* Card Bottom: Print Ticket & Ready Button */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                    <Button
                      variant="outline"
                      intent="kds.order.print"
                      onClick={e => {
                        e.stopPropagation();
                        setPrintTicketOrder(order);
                      }}
                      className="p-2.5 bg-white dark:bg-zinc-800 text-xs"
                      title="Imprimir comanda KDS"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="primary"
                      intent="kds.order.complete"
                      onClick={e => {
                        e.stopPropagation();
                        handleCompleteOrder(order.id, order.turnNumber);
                      }}
                      className="w-full py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs bg-[#FF3F1A] text-white hover:bg-[#e03716]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>{isAllChecked ? "¡Todo Listo! Despachar" : "Marcar Preparado"}</span>
                    </Button>
                  </div>
                </Card>

              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* KDS Industrial Command Header */}
      <Card intent="kds.header" className="dark:bg-[#121214] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Station Identity & Filters */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[#FF3F1A]">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
                  KDS Cocina & Estaciones
                </h2>
                <Badge variant="success" intent="kds.sync.status" className="rounded-md normal-case">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sincronizado
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                Comandas en preparación activa sincronizadas con los Pedidos en Vivo
              </p>
            </div>
          </div>

          {/* Station Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(["TODAS", "Horno", "Armado", "Empaque"] as const).map(st => (
              <Button
                key={st}
                variant="ghost"
                intent="kds.station.filter"
                onClick={() => setStationFilter(st)}
                className={`p-0 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  stationFilter === st
                    ? "bg-white text-[#212121] dark:bg-zinc-800 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700 shadow-2xs"
                    : "bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/80 dark:hover:bg-zinc-800"
                }`}
              >
                {st === "TODAS" ? "Todas las Estaciones" : st}
              </Button>
            ))}
          </div>
        </div>

        {/* Right: Real-time Kitchen Operations Metrics */}
        <div className="flex items-center gap-2.5 flex-wrap md:flex-nowrap justify-start md:justify-end">
          {/* KPI: En Fogón */}
          <div className="px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-left min-w-[110px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              En Fogón
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono font-bold text-lg text-zinc-950 dark:text-zinc-50">
                {prepOrders.length}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">
                ({totalUnitsInProduction} un.)
              </span>
            </div>
          </div>

          {/* KPI: Retrasos */}
          <div className={`px-4 py-2.5 rounded-2xl border text-left min-w-[110px] ${
            retrasados.length > 0
              ? "bg-rose-500/[0.04] border-rose-500/30 text-rose-600 dark:text-rose-400"
              : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 text-zinc-400"
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider block">
              Retrasos
            </span>
            <span className="font-mono font-bold text-lg">
              {retrasados.length}
            </span>
          </div>

          {/* KPI: Buffer */}
          <div className="px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-left min-w-[110px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Buffer Estimado
            </span>
            <span className="font-mono font-bold text-lg text-zinc-950 dark:text-zinc-50">
              +{shiftInfo.suggestedPrepBufferMinutes}m
            </span>
          </div>
        </div>
      </Card>

      {/* Ready Toast */}
      {readyToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500 text-white text-xs font-bold flex items-center justify-between shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{readyToast}</span>
          </div>
        </div>
      )}

      {/* KDS Sections by Urgency */}
      <div className="space-y-6">
        {renderSection(
          "Comandas Retrasadas",
          retrasados,
          "RETRASADO",
          "border-rose-500/50",
          "bg-rose-500 animate-pulse",
          "Superan el tiempo prometido"
        )}

        {renderSection(
          "Comandas Próximas al Límite",
          proximos,
          "PROXIMO",
          "border-amber-500/50",
          "bg-amber-500",
          "Terminar en <5 minutos"
        )}

        {renderSection(
          "Comandas a Tiempo",
          aTiempo,
          "A_TIEMPO",
          "border-zinc-200/80",
          "bg-emerald-500",
          "Dentro de la ventana estándar"
        )}
      </div>
    </div>
  );
};
