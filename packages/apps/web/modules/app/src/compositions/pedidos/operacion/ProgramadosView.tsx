import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { OperacionTab } from "../types";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  ChefHat,
  ShoppingBag,
  ArrowLeft,
  CalendarDays,
  Activity,
} from "lucide-react";
import { NectoBanner } from "../shared/NectoBanner";
import { Button, SegmentedControl } from "@/elements";

export const ProgramadosView: React.FC<{
  onNavigateOpTab?: (t: OperacionTab) => void;
}> = ({ onNavigateOpTab }) => {
  const {
    programados,
    recurrences,
    injectScheduledOrderToLive,
    setSelectedOrderId,
  } = usePedidos();

  const [viewMode, setViewMode] = useState<"columns" | "timeline">("columns");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const hoyList = programados.filter(p => p.scheduledDate === "Hoy");
  const mananaList = programados.filter(p => p.scheduledDate === "Mañana");

  const pendingHoyList = hoyList.filter(p => !p.isInLiveQueue);
  const activeInLiveCount = hoyList.filter(p => p.isInLiveQueue).length;

  const totalHoyAmount = pendingHoyList.reduce((sum, p) => sum + p.total, 0);
  const totalMananaAmount = mananaList.reduce((sum, p) => sum + p.total, 0);

  const handleInjectNow = (orderId: string, customerName: string) => {
    injectScheduledOrderToLive(orderId, true);
    setSuccessToast(`¡Pedido de ${customerName} inyectado a Cocina KDS!`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <NectoBanner
        icon={<Calendar className="w-6 h-6 text-[#FF3F1A]" />}
        title="Pedidos Programados & Catering Futuro"
        description="Anticipación operativa para pedidos corporativos, eventos y entregas pactadas a una hora específica."
      />

      {/* Navigation Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#2C2D31] p-3.5 rounded-2xl border border-slate-200 dark:border-[#374151] shadow-xs">
        <Button
          variant="outline"
          intent="programados.back"
          onClick={() => onNavigateOpTab?.("en-vivo")}
          className="py-2 px-3.5 bg-slate-50 dark:bg-gray-800 text-xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#FF3F1A]" />
          <span>Volver a Pedidos</span>
        </Button>

        {/* View Switcher */}
        <SegmentedControl
          intent="programados.view"
          tone="accent"
          value={viewMode}
          onValueChange={setViewMode}
          options={[
            { value: "columns", label: "Vista Columnas" },
            { value: "timeline", label: "Línea de Tiempo" },
          ]}
        />
      </div>

      {/* Planning KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Hoy */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] p-5 shadow-xs space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Programados para Hoy
          </span>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black font-mono text-gray-900 dark:text-gray-100">
                {pendingHoyList.length}
              </p>
              {activeInLiveCount > 0 && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                  (+{activeInLiveCount} en vivo)
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-gray-900 dark:text-white bg-slate-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full font-mono">
              ${(totalHoyAmount / 1000).toFixed(0)}k COP
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Entregas pendientes de activación</p>
        </div>

        {/* KPI 2: Mañana */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] p-5 shadow-xs space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Programados para Mañana
          </span>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-black font-mono text-gray-900 dark:text-gray-100">
              {mananaList.length}
            </p>
            <span className="text-xs font-bold text-gray-900 dark:text-white bg-slate-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full font-mono">
              ${(totalMananaAmount / 1000).toFixed(0)}k COP
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Anticipación de materias primas y horneado</p>
        </div>

        {/* KPI 3: B2B Recurrentes */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] p-5 shadow-xs space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Suscripciones B2B
          </span>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-black font-mono text-gray-900 dark:text-gray-100">
              {recurrences.length}
            </p>
            <span className="text-xs font-bold text-gray-900 dark:text-white bg-slate-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">
              Automáticas
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Contratos recurrentes corporativos</p>
        </div>

        {/* KPI 4: Alerta Anticipada */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] p-5 shadow-xs space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Alerta Automática
          </span>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-black font-mono text-gray-900 dark:text-gray-100">
              30 <span className="text-sm font-normal text-gray-400">min</span>
            </p>
            <span className="text-xs font-bold text-gray-900 dark:text-white bg-slate-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">
              Activa
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Despierta pedido antes de la hora de entrega</p>
        </div>
      </div>

      {/* Floating Success Toast */}
      {successToast && (
        <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl p-4 text-xs text-zinc-900 dark:text-zinc-100 font-bold flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#FF3F1A] flex-none" />
            <span>{successToast}</span>
          </div>
          <Button
            variant="ghost"
            intent="programados.toast.goto"
            onClick={() => onNavigateOpTab?.("en-vivo")}
            className="p-0 underline font-black text-[#FF3F1A] cursor-pointer ml-4"
          >
            Ver en Pedidos →
          </Button>
        </div>
      )}

      {/* VIEW 1: COLUMNS VIEW */}
      {viewMode === "columns" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Hoy */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b-2 border-slate-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF3F1A]" />
                <h4 className="font-black text-sm text-gray-900 dark:text-gray-100">
                  Programados para Hoy ({hoyList.length})
                </h4>
              </div>
              <span className="text-xs font-mono font-black text-[#FF3F1A]">
                ${(totalHoyAmount / 1000).toFixed(0)}k
              </span>
            </div>

            <div className="space-y-3.5">
              {hoyList.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-gray-800 rounded-3xl text-gray-400 text-xs font-bold">
                  No hay más pedidos programados para hoy.
                </div>
              ) : (
                hoyList.map(item => (
                  <div
                    key={item.id}
                    className={`bg-white dark:bg-[#2C2D31] rounded-2xl border p-5 shadow-xs space-y-4 transition-all ${
                      item.isInLiveQueue
                        ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                        : "border-slate-200 dark:border-gray-700 hover:border-[#FF3F1A]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-gray-900 dark:text-gray-100">
                          {item.id}
                        </span>
                        {item.isInLiveQueue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            En Cocina
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-black text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-gray-800 text-[#FF3F1A] flex items-center gap-1.5 border border-slate-200 dark:border-gray-700">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pactado: {item.scheduledTime}</span>
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="font-black text-sm text-gray-900 dark:text-gray-100 truncate">
                        {item.customerName}
                      </p>
                      {item.customerAddress && (
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400 flex-none" />
                          <span>{item.customerAddress}</span>
                        </p>
                      )}
                    </div>

                    <div className="bg-slate-50 dark:bg-gray-800/80 rounded-2xl p-3.5 text-xs space-y-1.5 border border-slate-100 dark:border-gray-700">
                      {item.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between font-semibold text-gray-700 dark:text-gray-300">
                          <span>
                            <strong className="text-[#FF3F1A]">×{it.quantity}</strong> {it.name}
                          </span>
                          <span className="font-mono">${(it.unitPrice * it.quantity).toLocaleString("es-CO")}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-black text-zinc-900 dark:text-zinc-100 pt-2 border-t border-slate-200 dark:border-gray-700">
                        <span>Total Pedido:</span>
                        <span className="font-mono">${item.total.toLocaleString("es-CO")}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        intent="programados.order.ticket"
                        onClick={() => setSelectedOrderId(item.id)}
                        className="py-2.5 px-3 text-xs"
                      >
                        Ticket
                      </Button>

                      {item.isInLiveQueue ? (
                        <Button
                          variant="primary"
                          intent="programados.order.inlive"
                          onClick={() => onNavigateOpTab?.("en-vivo")}
                          className="flex-1 py-2.5 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>En Vivo (Ver Pedidos)</span>
                        </Button>
                      ) : (
                        <Button
                          variant="accent"
                          intent="programados.order.inject"
                          onClick={() => handleInjectNow(item.id, item.customerName)}
                          className="flex-1 py-2.5 px-3 text-xs bg-[#FF3F1A] hover:bg-[#e03412] text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ChefHat className="w-4 h-4 text-white" />
                          <span>Inyectar a Cocina</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 2: Mañana */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b-2 border-slate-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-zinc-700" />
                <h4 className="font-black text-sm text-gray-900 dark:text-gray-100">
                  Programados para Mañana ({mananaList.length})
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-gray-500">
                ${(totalMananaAmount / 1000).toFixed(0)}k
              </span>
            </div>

            <div className="space-y-3.5">
              {mananaList.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-gray-800 rounded-2xl text-gray-400 text-xs font-bold">
                  No hay pedidos agendados para mañana.
                </div>
              ) : (
                mananaList.map(item => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-gray-700 p-5 shadow-xs space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs text-gray-900 dark:text-gray-100">
                        {item.id}
                      </span>
                      <span className="font-mono font-black text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center gap-1.5 border border-slate-200 dark:border-gray-700">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Mañana {item.scheduledTime}</span>
                      </span>
                    </div>

                    <div>
                      <p className="font-black text-sm text-gray-900 dark:text-gray-100 truncate">
                        {item.customerName}
                      </p>
                      {item.customerAddress && (
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400 flex-none" />
                          <span>{item.customerAddress}</span>
                        </p>
                      )}
                    </div>

                    <div className="bg-slate-50 dark:bg-gray-800/80 rounded-2xl p-3.5 text-xs space-y-1.5 border border-slate-100 dark:border-gray-700">
                      {item.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between font-semibold text-gray-700 dark:text-gray-300">
                          <span>
                            <strong className="text-[#FF3F1A]">×{it.quantity}</strong> {it.name}
                          </span>
                          <span className="font-mono">${(it.unitPrice * it.quantity).toLocaleString("es-CO")}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-black text-zinc-900 dark:text-zinc-100 pt-2 border-t border-slate-200 dark:border-gray-700">
                        <span>Total Pedido:</span>
                        <span className="font-mono">${item.total.toLocaleString("es-CO")}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 3: Suscripciones B2B */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b-2 border-slate-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF3F1A]" />
                <h4 className="font-black text-sm text-gray-900 dark:text-gray-100">
                  Suscripciones B2B ({recurrences.length})
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-gray-400">Emisión recurrente</span>
            </div>

            <div className="space-y-3.5">
              {recurrences.map(rec => (
                <div
                  key={rec.id}
                  className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] p-5 shadow-xs space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-xs text-zinc-900 dark:text-zinc-100">
                      {rec.id} · {rec.frequency}
                    </span>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 border border-slate-200 dark:border-zinc-700">
                      {rec.isActive ? "Activo" : "Pausado"}
                    </span>
                  </div>

                  <div>
                    <h5 className="font-black text-sm text-gray-900 dark:text-gray-100">
                      {rec.customerName}
                    </h5>
                    <p className="text-xs text-gray-400 font-mono">{rec.phone}</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-gray-800/60 rounded-2xl p-2.5 text-xs space-y-1">
                    {rec.items.map((it, idx) => (
                      <p key={idx} className="text-gray-600 dark:text-gray-400">
                        {it.quantity}× {it.name}
                      </p>
                    ))}
                  </div>

                  <div className="text-xs text-gray-500 flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
                    <span>Próximo disparo:</span>
                    <strong className="text-gray-900 dark:text-gray-100 font-mono">{rec.nextExecution}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: TIMELINE VIEW */
        <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <h4 className="font-black text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#FF3F1A]" />
              <span>Cronograma de Entregas por Horas (Hoy)</span>
            </h4>
            <span className="text-xs font-mono text-gray-400">{hoyList.length} entregas agendadas</span>
          </div>

          <div className="relative border-l-2 border-slate-200 dark:border-gray-800 ml-4 space-y-6 pb-2">
            {hoyList.map(item => (
              <div key={item.id} className="relative pl-6 space-y-2">
                <div className="absolute -left-2.5 top-1.5 w-5 h-5 rounded-full bg-[#FF3F1A] border-4 border-white dark:border-[#2C2D31]" />

                <div className="bg-slate-50 dark:bg-gray-800/80 rounded-2xl p-4 border border-slate-200 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-[#FF3F1A]">
                        {item.scheduledTime}
                      </span>
                      <span className="font-mono font-bold text-xs text-gray-400">
                        ({item.id})
                      </span>
                    </div>
                    <p className="font-black text-sm text-gray-900 dark:text-gray-100">
                      {item.customerName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.items.map(i => `${i.quantity}× ${i.name}`).join(", ")}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-sm text-zinc-900 dark:text-zinc-100">
                      ${item.total.toLocaleString("es-CO")}
                    </span>

                    {item.isInLiveQueue ? (
                      <Button
                        variant="outline"
                        intent="programados.timeline.view"
                        onClick={() => onNavigateOpTab?.("en-vivo")}
                        className="py-2 px-3 text-xs text-emerald-600 dark:text-emerald-400 font-bold border-emerald-500/30 flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>En Vivo</span>
                      </Button>
                    ) : (
                      <Button
                        variant="accent"
                        intent="programados.timeline.inject"
                        onClick={() => handleInjectNow(item.id, item.customerName)}
                        className="py-2 px-3 text-xs bg-[#FF3F1A] hover:bg-[#e03412] text-white font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <ChefHat className="w-3.5 h-3.5 text-white" />
                        <span>Inyectar a Cocina</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
