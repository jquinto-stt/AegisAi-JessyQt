import React, { useMemo, useState } from "react";
import { usePedidos } from "../../context/PedidosContext";
import { Pedido, UrgencyLevel } from "../../types";
import { MobileBottomSheet } from "../shared/MobileBottomSheet";
import {
  ChefHat,
  CheckCircle2,
  Minus,
  Plus,
  Check,
  Printer,
  ChevronRight,
} from "lucide-react";

type StationFilter = "TODAS" | "Horno" | "Armado" | "Empaque";

/* Color por nivel de urgencia — un único acento por estado, sin ruido. */
const URGENCY_THEME: Record<
  UrgencyLevel,
  { text: string; bar: string; dot: string; ring: string; label: string; order: number }
> = {
  RETRASADO: {
    text: "text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500",
    dot: "bg-rose-500",
    ring: "ring-rose-500/30",
    label: "Retrasadas",
    order: 0,
  },
  PROXIMO: {
    text: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
    ring: "ring-amber-500/30",
    label: "Próximas al límite",
    order: 1,
  },
  A_TIEMPO: {
    text: "text-zinc-500 dark:text-zinc-400",
    bar: "bg-[#FF3F1A]",
    dot: "bg-emerald-500",
    ring: "ring-black/5 dark:ring-white/10",
    label: "A tiempo",
    order: 2,
  },
};

export const KdsMobileView: React.FC = () => {
  const { orders, markOrderReady, adjustEstimate, setPrintTicketOrder } = usePedidos();

  const [stationFilter, setStationFilter] = useState<StationFilter>("TODAS");
  const [checkedItems, setCheckedItems] = useState<Record<string, Set<number>>>({});
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [readyToast, setReadyToast] = useState<string | null>(null);

  const prepOrders = useMemo(
    () => orders.filter(o => o.status === "EN_PREPARACION" || o.status === "CONFIRMADO"),
    [orders]
  );

  // Orden único: urgencia primero, sin trocear en múltiples secciones/tarjetas.
  const sorted = useMemo(
    () => [...prepOrders].sort((a, b) => URGENCY_THEME[a.urgency].order - URGENCY_THEME[b.urgency].order),
    [prepOrders]
  );

  const retrasados = prepOrders.filter(o => o.urgency === "RETRASADO").length;

  const detailOrder = orders.find(o => o.id === detailOrderId) || null;

  const toggleItemCheck = (orderId: string, itemIdx: number) => {
    setCheckedItems(prev => {
      const set = new Set(prev[orderId] || []);
      set.has(itemIdx) ? set.delete(itemIdx) : set.add(itemIdx);
      return { ...prev, [orderId]: set };
    });
  };

  const handleComplete = (order: Pedido) => {
    markOrderReady(order.id);
    setDetailOrderId(null);
    setReadyToast(`Turno #${order.turnNumber || "00"} listo para entrega`);
    setTimeout(() => setReadyToast(null), 2600);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Cabecera compacta: un solo resumen + filtro de estación ── */}
      <div className="flex-none sticky top-0 z-10 bg-gradient-to-b from-[#F4F4F2]/95 to-[#F4F4F2]/80 dark:from-[#1B1B1F]/95 dark:to-[#1B1B1F]/80 backdrop-blur-md px-4 pt-3 pb-2.5 space-y-2.5">
        {/* Resumen de una línea (reemplaza los 3 KPIs y el bloque de identidad) */}
        <div className="flex items-baseline justify-between">
          <h2 className="font-black text-lg text-zinc-950 dark:text-white tracking-tight">
            En preparación
            <span className="ml-2 text-zinc-400 font-bold text-base">{prepOrders.length}</span>
          </h2>
          {retrasados > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              {retrasados} {retrasados === 1 ? "retrasada" : "retrasadas"}
            </span>
          )}
        </div>

        {/* Estaciones (chips) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {(["TODAS", "Horno", "Armado", "Empaque"] as StationFilter[]).map(st => {
            const active = stationFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStationFilter(st)}
                className={`flex-none h-8 px-3.5 rounded-full text-xs font-bold transition-all active:scale-95 whitespace-nowrap ${
                  active
                    ? "bg-[#190088] text-white"
                    : "bg-white/70 dark:bg-white/5 text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {st === "TODAS" ? "Todas" : st}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Lista única de comandas (escaneo rápido) ────────────── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-1.5 pb-28 space-y-2.5">
        {sorted.length === 0 ? (
          <EmptyState />
        ) : (
          sorted.map(order => (
            <KdsComandaRow
              key={order.id}
              order={order}
              onOpen={() => setDetailOrderId(order.id)}
              onComplete={() => handleComplete(order)}
            />
          ))
        )}
      </div>

      {/* ── Detalle de comanda (bottom sheet: checklist, tiempo, nota) ── */}
      <MobileBottomSheet
        open={!!detailOrder}
        onClose={() => setDetailOrderId(null)}
        fullHeight
        title={detailOrder ? `Turno #${detailOrder.turnNumber || "00"}` : ""}
        subtitle={detailOrder?.customerName}
        icon={<ChefHat className="w-5 h-5" />}
        footer={
          detailOrder ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setPrintTicketOrder(detailOrder)}
                className="h-12 w-12 flex-none rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center active:scale-90"
                title="Imprimir comanda"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => handleComplete(detailOrder)}
                className="flex-1 h-12 rounded-2xl bg-[#FF3F1A] text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <CheckCircle2 className="w-5 h-5" />
                Marcar preparado
              </button>
            </div>
          ) : null
        }
      >
        {detailOrder && (
          <KdsDetailBody
            order={detailOrder}
            checks={checkedItems[detailOrder.id] || new Set()}
            onToggleItem={idx => toggleItemCheck(detailOrder.id, idx)}
            onAdjust={delta => adjustEstimate(detailOrder.id, delta)}
          />
        )}
      </MobileBottomSheet>

      {/* ── Toast "listo" ───────────────────────────────────────── */}
      {readyToast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(84px+env(safe-area-inset-bottom))] z-30 px-4 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-bold shadow-lg flex items-center gap-2 animate-slide-up max-w-[92vw] lg:hidden">
          <CheckCircle2 className="w-4 h-4 flex-none" />
          <span className="truncate">{readyToast}</span>
        </div>
      )}
    </div>
  );
};

/* ── Empty state ───────────────────────────────────────────────── */
const EmptyState: React.FC = () => (
  <div className="pt-24 text-center animate-fade-in">
    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#26262B] flex items-center justify-center text-emerald-500 mx-auto mb-3">
      <ChefHat className="w-7 h-7" />
    </div>
    <p className="text-base font-bold text-zinc-800 dark:text-zinc-100">Cocina despejada</p>
    <p className="text-sm text-zinc-400 mt-0.5">No hay comandas activas.</p>
  </div>
);

/* ── Fila de comanda: SOLO lo esencial para escanear ───────────── */
const KdsComandaRow: React.FC<{
  order: Pedido;
  onOpen: () => void;
  onComplete: () => void;
}> = ({ order, onOpen, onComplete }) => {
  const theme = URGENCY_THEME[order.urgency];
  const totalItems = order.items.reduce((s, it) => s + it.quantity, 0);
  const progress = Math.min(
    100,
    Math.round((order.elapsedMinutes / Math.max(1, order.estimatedMinutes)) * 100)
  );

  return (
    <div className="rounded-2xl bg-white dark:bg-[#26262B] overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left px-4 pt-3.5 pb-3 active:bg-black/[0.02] dark:active:bg-white/[0.02] transition-colors"
      >
        {/* Nivel 1: qué es (turno + cliente) · Nivel 2: cuánto falta (timer) */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2.5">
            <span className="text-sm font-mono font-black px-2 py-0.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex-none">
              #{order.turnNumber || "00"}
            </span>
            <div className="min-w-0">
              <p className="font-bold text-[15px] text-zinc-950 dark:text-white truncate leading-tight">
                {order.customerName}
              </p>
              <p className="text-xs text-zinc-400 font-medium leading-tight">
                {totalItems} {totalItems === 1 ? "producto" : "productos"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-none">
            <div className={`font-mono font-black text-xl leading-none ${theme.text}`}>
              {order.elapsedMinutes}
              <span className="text-xs font-bold text-zinc-400">/{order.estimatedMinutes}m</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
          </div>
        </div>

        {/* Barra de progreso fina (único indicador visual de urgencia) */}
        <div className="mt-3 w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${theme.bar}`} style={{ width: `${progress}%` }} />
        </div>
      </button>

      {/* Acción principal, siempre alcanzable */}
      <div className="px-4 pb-3.5 pt-1">
        <button
          type="button"
          onClick={onComplete}
          className="w-full h-10 rounded-xl bg-[#FF3F1A]/10 text-[#FF3F1A] font-bold text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
        >
          <CheckCircle2 className="w-4 h-4" />
          Marcar preparado
        </button>
      </div>
    </div>
  );
};

/* ── Detalle de comanda (dentro del bottom sheet) ──────────────── */
const KdsDetailBody: React.FC<{
  order: Pedido;
  checks: Set<number>;
  onToggleItem: (idx: number) => void;
  onAdjust: (delta: number) => void;
}> = ({ order, checks, onToggleItem, onAdjust }) => {
  const theme = URGENCY_THEME[order.urgency];
  const progress = Math.min(
    100,
    Math.round((order.elapsedMinutes / Math.max(1, order.estimatedMinutes)) * 100)
  );

  return (
    <div className="space-y-5">
      {/* Tiempo: dato principal del detalle */}
      <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Tiempo</p>
            <p className={`font-mono font-black text-3xl leading-none mt-1 ${theme.text}`}>
              {order.elapsedMinutes}
              <span className="text-base font-bold text-zinc-400">/{order.estimatedMinutes}m</span>
            </p>
          </div>
          {/* Ajustadores agrupados */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAdjust(-5)}
              className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center active:scale-90"
              title="Restar 5 min"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onAdjust(5)}
              className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center active:scale-90"
              title="Sumar 5 min"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="mt-3 w-full h-1.5 bg-zinc-200/70 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${theme.bar}`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Nota especial (solo si existe) */}
      {order.notes && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-0.5">
            Instrucción especial
          </p>
          <p className="text-sm italic text-amber-800 dark:text-amber-200">{order.notes}</p>
        </div>
      )}

      {/* Checklist de preparación */}
      <div>
        <div className="flex items-center justify-between mb-2 px-0.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Checklist
          </h4>
          <span className="text-[11px] font-mono font-bold text-zinc-400">
            {checks.size}/{order.items.length}
          </span>
        </div>
        <div className="space-y-1.5">
          {order.items.map((it, idx) => {
            const checked = checks.has(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onToggleItem(idx)}
                className={`w-full min-h-[52px] px-3.5 py-3 rounded-2xl text-left flex items-center gap-3 transition-all active:scale-[0.99] ${
                  checked ? "bg-zinc-100 dark:bg-zinc-800/80" : "bg-zinc-50 dark:bg-zinc-900/50"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center flex-none transition-all ${
                    checked
                      ? "bg-[#FF3F1A] text-white"
                      : "border-2 border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {checked && <Check className="w-4 h-4 stroke-[3]" />}
                </span>
                <span className="font-mono font-black text-sm text-[#FF3F1A] flex-none">
                  ×{it.quantity}
                </span>
                <span
                  className={`font-semibold text-sm truncate flex-1 ${
                    checked ? "line-through opacity-50 text-zinc-500" : "text-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  {it.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
