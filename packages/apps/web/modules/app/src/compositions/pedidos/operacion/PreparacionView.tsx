import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { Pedido } from "../types";
import {
  Package,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Search,
  Truck,
  ArrowRight,
  SlidersHorizontal,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/elements";
import { inventoryService } from "@/ModuloInventario/services/inventoryService";

export const PreparacionView: React.FC = () => {
  const {
    orders,
    markOrderReady,
    setSelectedOrderId,
    isPreparacionEnabled,
    setIsPreparacionEnabled,
  } = usePedidos();

  const [searchQuery, setSearchQuery] = useState("");
  const [checkedItems, setCheckedItems] = useState<Record<string, Set<number>>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Orders that are in preparation stage (CONFIRMADO or EN_PREPARACION)
  const pendingOrders = orders.filter(
    o => o.status === "CONFIRMADO" || o.status === "EN_PREPARACION"
  );

  const toggleItemCheck = (orderId: string, itemIdx: number) => {
    setCheckedItems(prev => {
      const current = new Set(prev[orderId] || []);
      if (current.has(itemIdx)) {
        current.delete(itemIdx);
      } else {
        current.add(itemIdx);
      }
      return { ...prev, [orderId]: current };
    });
  };

  const handleMarkReady = (order: Pedido) => {
    markOrderReady(order.id);
    showToast(`Pedido ${order.id} marcado como listo para entrega.`);
  };

  const filteredOrders = pendingOrders.filter(o => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.items.some(i => i.name.toLowerCase().includes(q))
    );
  });

  if (!isPreparacionEnabled) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 animate-fade-in">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 mb-4">
          <Package className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">
          La capacidad de Preparación está desactivada
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          En este momento el flujo de tu tienda avanza directamente de Confirmado a Listo.
          Si tu negocio necesita alistar, empaquetar o ensamblar pedidos físicamente, puedes activarla.
        </p>
        <div className="mt-6 flex justify-center">
          <Button
            size="sm"
            onClick={() => setIsPreparacionEnabled(true)}
            className="cursor-pointer font-medium"
          >
            Habilitar Preparación
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-xs font-semibold text-white shadow-xl dark:bg-white dark:text-gray-900 animate-slide-up">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Preparación
            </h2>
            <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              {pendingOrders.length} {pendingOrders.length === 1 ? "orden pendiente" : "órdenes pendientes"}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Alistamiento, preparación física y verificación de productos antes de la entrega o despacho.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar pedido, cliente o ítem..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-xs text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
          />
        </div>
      </div>

      {/* Grid of Preparation Cards */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 mb-3">
            <Package className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
            No hay pedidos pendientes de procesar
          </h4>
          <p className="mt-1 text-xs text-gray-400">
            Todas las órdenes confirmadas han sido preparadas y están listas para entrega.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map(order => {
            const checks = checkedItems[order.id] || new Set();
            const totalItems = order.items.length;
            const checkedCount = checks.size;
            const isCompleted = totalItems > 0 && checkedCount === totalItems;

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between transition-all hover:border-gray-300 dark:hover:border-gray-700"
              >
                <div>
                  {/* Top Bar: Order ID + Status */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => setSelectedOrderId(order.id)}
                      className="font-mono text-sm font-bold text-brand-500 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>{order.id}</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {order.channel}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="mt-3">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {order.customerName}
                    </h4>
                    {order.customerPhone && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />
                        <span>{order.customerPhone}</span>
                      </p>
                    )}
                    {order.customerAddress && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1 truncate">
                        <MapPin className="h-3 w-3 flex-none text-gray-400" />
                        <span className="truncate">{order.customerAddress}</span>
                      </p>
                    )}
                  </div>

                  {/* Items Checklist */}
                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Artículos de la orden
                    </p>
                    <div className="space-y-1.5">
                      {order.items.map((item, idx) => {
                        const isChecked = checks.has(idx);
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleItemCheck(order.id, idx)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                              isChecked
                                ? "border-emerald-200 bg-emerald-50/60 text-gray-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-gray-200"
                                : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300"
                            }`}
                          >
                            <span
                              className={`flex h-4 w-4 flex-none items-center justify-center rounded border transition-all ${
                                isChecked
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"
                              }`}
                            >
                              {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {item.quantity}×
                            </span>
                            <span
                              className={`flex-1 truncate ${
                                isChecked ? "line-through text-gray-400 dark:text-gray-500" : ""
                              }`}
                            >
                              {item.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer: Progress + Action Button */}
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">
                      Progreso
                    </span>
                    <span className="font-bold text-gray-800 dark:text-white">
                      {checkedCount} de {totalItems} preparados
                    </span>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleMarkReady(order)}
                    className="w-full justify-center cursor-pointer font-semibold"
                  >
                    Marcar como listo
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
