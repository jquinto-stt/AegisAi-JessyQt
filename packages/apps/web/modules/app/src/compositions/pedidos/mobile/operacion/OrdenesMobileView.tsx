import React, { useMemo, useState } from "react";
import { usePedidos } from "../../context/PedidosContext";
import { Pedido, OrderStatus } from "../../types";
import { OrderStatusBadge, ChannelBadge, UrgencyBadge } from "../../shared/Badges";
import { MobileBottomSheet } from "../shared/MobileBottomSheet";
import {
  Plus,
  Search,
  ChefHat,
  CheckCircle2,
  ArrowRight,
  XCircle,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  Package,
  Printer,
  ShoppingBag,
} from "lucide-react";

/* Filtros de estado disponibles como chips horizontales. */
const STATUS_FILTERS: { id: OrderStatus | "TODOS"; label: string }[] = [
  { id: "TODOS", label: "Todos" },
  { id: "NUEVO", label: "Nuevos" },
  { id: "CONFIRMADO", label: "Confirmados" },
  { id: "EN_PREPARACION", label: "En Cocina" },
  { id: "LISTO", label: "Listos" },
  { id: "FINALIZADO", label: "Entregados" },
];

const fmtCOP = (n: number) => `$${(n || 0).toLocaleString("es-CO")}`;

export const OrdenesMobileView: React.FC = () => {
  const {
    orders,
    confirmOrder,
    sendToKitchen,
    markOrderReady,
    deliverOrder,
    setRejectModalOrder,
    setPrintTicketOrder,
  } = usePedidos();

  const [statusFilter, setStatusFilter] = useState<OrderStatus | "TODOS">("TODOS");
  const [search, setSearch] = useState("");
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  const activeOrders = useMemo(
    () => orders.filter(o => o.status !== "RECHAZADO" && o.status !== "CANCELADO"),
    [orders]
  );

  const filtered = useMemo(() => {
    let list = activeOrders;
    if (statusFilter !== "TODOS") list = list.filter(o => o.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        o =>
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          (o.customerPhone || "").toLowerCase().includes(q) ||
          String(o.turnNumber || "").includes(q) ||
          o.items.some(it => it.name.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      const rank: Record<OrderStatus, number> = {
        NUEVO: 0,
        EN_PREPARACION: 1,
        CONFIRMADO: 2,
        LISTO: 3,
        FINALIZADO: 5,
        RECHAZADO: 6,
        CANCELADO: 7,
      };
      return rank[a.status] - rank[b.status];
    });
  }, [activeOrders, statusFilter, search]);

  const detailOrder = orders.find(o => o.id === detailOrderId) || null;

  const counts = useMemo(() => {
    const c: Record<string, number> = { TODOS: activeOrders.length };
    activeOrders.forEach(o => {
      c[o.status] = (c[o.status] || 0) + 1;
    });
    return c;
  }, [activeOrders]);

  const advance = (order: Pedido) => {
    switch (order.status) {
      case "NUEVO":
        confirmOrder(order.id);
        break;
      case "CONFIRMADO":
        sendToKitchen(order.id);
        break;
      case "EN_PREPARACION":
        markOrderReady(order.id);
        break;
      case "LISTO":
        deliverOrder(order.id);
        break;
    }
  };

  const advanceLabel = (status: OrderStatus): string => {
    switch (status) {
      case "NUEVO":
        return "Confirmar";
      case "CONFIRMADO":
        return "Enviar a Cocina";
      case "EN_PREPARACION":
        return "Marcar Listo";
      case "LISTO":
        return "Entregar";
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Barra de filtros sticky ─────────────────────────────── */}
      <div className="flex-none sticky top-0 z-10 bg-gradient-to-b from-[#F4F4F2]/95 to-[#F4F4F2]/80 dark:from-[#1B1B1F]/95 dark:to-[#1B1B1F]/80 backdrop-blur-md px-4 pt-3 pb-2.5 space-y-2.5">
        {/* Search */}
        <div className="flex items-center gap-2.5 bg-white dark:bg-[#26262B] rounded-2xl px-4 h-11">
          <Search className="w-[18px] h-[18px] text-zinc-400 flex-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar pedido, cliente, plato…"
            className="flex-1 bg-transparent outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="text-zinc-400 active:scale-90">
              <XCircle className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>

        {/* Chips de estado */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {STATUS_FILTERS.map(f => {
            const active = statusFilter === f.id;
            const count = counts[f.id] || 0;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`flex-none flex items-center gap-1.5 h-8 px-3.5 rounded-full text-xs font-bold transition-all active:scale-95 whitespace-nowrap ${
                  active
                    ? "bg-[#190088] text-white"
                    : "bg-white/70 dark:bg-white/5 text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <span>{f.label}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-mono font-bold ${active ? "text-white/70" : "text-zinc-400"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Lista de pedidos ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-1.5 pb-28 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="pt-24 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#26262B] flex items-center justify-center text-zinc-400 mx-auto mb-3">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <p className="text-base font-bold text-zinc-800 dark:text-zinc-100">Sin pedidos</p>
            <p className="text-sm text-zinc-400 mt-0.5">Prueba con otro filtro.</p>
          </div>
        ) : (
          filtered.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onOpen={() => setDetailOrderId(order.id)}
              onAdvance={() => advance(order)}
              advanceLabel={advanceLabel(order.status)}
            />
          ))
        )}
      </div>

      {/* ── FAB: Nuevo Pedido ───────────────────────────────────── */}
      <button
        type="button"
        onClick={() => alert("Nuevo pedido manual (flujo existente)")}
        className="fixed right-4 bottom-[calc(80px+env(safe-area-inset-bottom))] z-20 h-14 w-14 rounded-full bg-[#FF3F1A] text-white shadow-lg shadow-[#FF3F1A]/30 flex items-center justify-center active:scale-95 transition-transform lg:hidden"
        title="Nuevo pedido"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* ── Detalle de pedido (bottom sheet) ────────────────────── */}
      <MobileBottomSheet
        open={!!detailOrder}
        onClose={() => setDetailOrderId(null)}
        fullHeight
        title={detailOrder ? `Pedido ${detailOrder.id}` : ""}
        subtitle={detailOrder?.customerName}
        icon={<Package className="w-5 h-5" />}
        footer={
          detailOrder ? (
            <OrderDetailActions
              order={detailOrder}
              onAdvance={() => advance(detailOrder)}
              advanceLabel={advanceLabel(detailOrder.status)}
              onReject={() => {
                setRejectModalOrder(detailOrder);
                setDetailOrderId(null);
              }}
              onPrint={() => setPrintTicketOrder(detailOrder)}
            />
          ) : null
        }
      >
        {detailOrder && <OrderDetailBody order={detailOrder} />}
      </MobileBottomSheet>
    </div>
  );
};

/* ── Tarjeta de pedido: solo lo esencial, detalles al abrir ───── */
const OrderCard: React.FC<{
  order: Pedido;
  onOpen: () => void;
  onAdvance: () => void;
  advanceLabel: string;
}> = ({ order, onOpen, onAdvance, advanceLabel }) => {
  const itemsSummary = order.items.map(it => `${it.quantity}× ${it.name}`).join(" · ");
  const isDelayed = order.urgency === "RETRASADO";

  return (
    <div className="rounded-2xl bg-white dark:bg-[#26262B] overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left px-4 pt-3.5 pb-3 active:bg-black/[0.02] dark:active:bg-white/[0.02] transition-colors"
      >
        {/* Nivel 1: turno + cliente · estado a la derecha */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-sm font-mono font-black px-2 py-0.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex-none">
              #{order.turnNumber || "—"}
            </span>
            <h3 className="font-bold text-[15px] text-zinc-950 dark:text-white truncate">
              {order.customerName}
            </h3>
            {order.isAIOrigin && <Sparkles className="w-3.5 h-3.5 text-[#FF3F1A] flex-none" />}
          </div>
          <OrderStatusBadge status={order.status} size="sm" />
        </div>

        {/* Nivel 2: resumen de items + total */}
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 line-clamp-1 flex-1">
            {itemsSummary}
          </p>
          <span className="font-black text-[15px] text-zinc-950 dark:text-white flex-none">
            {fmtCOP(order.total)}
          </span>
        </div>

        {/* Señal de urgencia: solo cuando importa (retraso) */}
        {isDelayed && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
            <Clock className="w-3 h-3" />
            Retrasado +{Math.max(0, order.elapsedMinutes - order.estimatedMinutes)}m
          </p>
        )}
      </button>

      {/* Acción principal, siempre visible */}
      {advanceLabel && (
        <div className="px-4 pb-3.5 pt-1">
          <button
            type="button"
            onClick={onAdvance}
            className="w-full h-10 rounded-xl bg-[#FF3F1A]/10 text-[#FF3F1A] font-bold text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
          >
            {order.status === "CONFIRMADO" ? (
              <ChefHat className="w-4 h-4" />
            ) : order.status === "EN_PREPARACION" || order.status === "LISTO" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            {advanceLabel}
          </button>
        </div>
      )}
    </div>
  );
};

/* ── Cuerpo del detalle de pedido ──────────────────────────────── */
const OrderDetailBody: React.FC<{ order: Pedido }> = ({ order }) => (
  <div className="space-y-4">
    {/* Estado + urgencia */}
    <div className="flex items-center gap-2 flex-wrap">
      <OrderStatusBadge status={order.status} />
      <UrgencyBadge urgency={order.urgency} elapsedMin={order.elapsedMinutes} estMin={order.estimatedMinutes} />
      <ChannelBadge channel={order.channel} />
    </div>

    {/* Datos del cliente */}
    <div className="bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl p-4 space-y-2.5 ring-1 ring-black/[0.03] dark:ring-white/5">
      {order.customerPhone && (
        <div className="flex items-center gap-3 text-sm">
          <span className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center flex-none">
            <Phone className="w-4 h-4 text-zinc-400" />
          </span>
          <span className="text-zinc-700 dark:text-zinc-200 font-medium">{order.customerPhone}</span>
        </div>
      )}
      {(order.deliveryAddress || order.customerAddress) && (
        <div className="flex items-start gap-3 text-sm">
          <span className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center flex-none">
            <MapPin className="w-4 h-4 text-zinc-400" />
          </span>
          <span className="text-zinc-700 dark:text-zinc-200 font-medium pt-1.5">
            {order.deliveryAddress || order.customerAddress}
          </span>
        </div>
      )}
      <div className="flex items-center gap-3 text-sm">
        <span className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center flex-none">
          <Clock className="w-4 h-4 text-zinc-400" />
        </span>
        <span className="text-zinc-700 dark:text-zinc-200 font-medium">
          {order.elapsedMinutes} min · estimado {order.estimatedMinutes} min
        </span>
      </div>
    </div>

    {/* Items */}
    <div>
      <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-2">
        Productos ({order.items.length})
      </h4>
      <div className="space-y-2">
        {order.items.map((it, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-3 bg-white dark:bg-zinc-900/40 rounded-2xl px-3.5 py-3 ring-1 ring-black/[0.03] dark:ring-white/5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono font-black text-sm text-white bg-[#FF3F1A] rounded-lg w-8 h-8 flex items-center justify-center flex-none">
                {it.quantity}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{it.name}</p>
                {(it.option || it.notes) && (
                  <p className="text-[11px] text-zinc-400 truncate">
                    {it.option}
                    {it.option && it.notes ? " · " : ""}
                    {it.notes}
                  </p>
                )}
              </div>
            </div>
            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex-none">
              {fmtCOP(it.unitPrice * it.quantity)}
            </span>
          </div>
        ))}
      </div>
    </div>

    {/* Nota especial */}
    {order.notes && (
      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-3.5 ring-1 ring-amber-200/60 dark:ring-amber-900/40">
        <p className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-0.5">
          Instrucción especial
        </p>
        <p className="text-sm italic text-amber-800 dark:text-amber-200">{order.notes}</p>
      </div>
    )}

    {/* Total */}
    <div className="flex items-center justify-between px-1 pt-1">
      <span className="text-sm font-bold text-zinc-500">Total</span>
      <span className="text-2xl font-black text-zinc-950 dark:text-white">{fmtCOP(order.total)}</span>
    </div>
  </div>
);

/* ── Acciones del detalle (footer sticky) ──────────────────────── */
const OrderDetailActions: React.FC<{
  order: Pedido;
  advanceLabel: string;
  onAdvance: () => void;
  onReject: () => void;
  onPrint: () => void;
}> = ({ order, advanceLabel, onAdvance, onReject, onPrint }) => {
  const canReject = order.status === "NUEVO" || order.status === "CONFIRMADO";
  const isTerminal = order.status === "FINALIZADO";

  if (isTerminal) {
    return (
      <button
        type="button"
        onClick={onPrint}
        className="w-full h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        <Printer className="w-4 h-4" />
        Reimprimir comanda
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onPrint}
        className="h-12 w-12 flex-none rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center active:scale-90"
        title="Imprimir comanda"
      >
        <Printer className="w-5 h-5" />
      </button>
      {canReject && (
        <button
          type="button"
          onClick={onReject}
          className="h-12 px-4 flex-none rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 ring-1 ring-rose-200/60 dark:ring-rose-900/40"
        >
          <XCircle className="w-4 h-4" />
          Rechazar
        </button>
      )}
      {advanceLabel && (
        <button
          type="button"
          onClick={onAdvance}
          className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-[#FF3F1A] to-[#FF6B4A] text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-[#FF3F1A]/30"
        >
          {order.status === "CONFIRMADO" ? <ChefHat className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {advanceLabel}
        </button>
      )}
    </div>
  );
};
