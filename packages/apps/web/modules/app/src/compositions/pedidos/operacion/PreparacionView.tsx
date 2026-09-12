import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { Pedido } from "../types";
import {
  Package,
  Check,
  CheckCircle2,
  MapPin,
  Phone,
  Search,
  Smartphone,
  Globe,
  Store,
  Clock,
  FileText,
  Timer,
  Bike,
} from "lucide-react";
import { Button, Badge } from "@/elements";

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
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl dark:bg-white dark:text-gray-900 animate-slide-up">
          <CheckCircle2 className="h-4 w-4 text-success-500" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Single Authoritative Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Mesa de Preparación & Alistamiento
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {pendingOrders.length} {pendingOrders.length === 1 ? "orden en alistamiento" : "órdenes en alistamiento"}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, # orden o producto..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
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
            const progressPercent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

            const getChannelIcon = (ch?: string) => {
              switch (ch?.toLowerCase()) {
                case "whatsapp":
                  return <Smartphone className="h-5 w-5" />;
                case "web":
                  return <Globe className="h-5 w-5" />;
                default:
                  return <Store className="h-5 w-5" />;
              }
            };

            const getChannelStyle = (ch?: string) => {
              switch (ch?.toLowerCase()) {
                case "whatsapp":
                  return "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400";
                case "web":
                  return "bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400";
                default:
                  return "bg-secondary-50 text-secondary-600 dark:bg-secondary-500/15 dark:text-secondary-400";
              }
            };

            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 hover:border-gray-300 hover:shadow-theme-md dark:hover:border-gray-700 transition-all cursor-pointer space-y-4"
              >
                <div className="space-y-3.5">
                  {/* Top Bar: Channel Icon + ID + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-xs transition-transform group-hover:scale-105 ${getChannelStyle(order.channel)}`}>
                        {getChannelIcon(order.channel)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                            {order.id}
                          </h3>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700">
                            {order.channel}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate max-w-[160px] mt-0.5">
                          {order.customerName}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-none">
                      <Badge variant="light" size="xs" color="warning">
                        En Preparación
                      </Badge>
                      <div className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                        <Timer className="h-3 w-3 text-warning-500" />
                        <span>{order.elapsedMinutes}/{order.estimatedMinutes}m</span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Badges: Modality & Total Items */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant="light"
                      size="xs"
                      color="light"
                      startIcon={order.customerAddress ? <Bike className="w-3 h-3 text-brand-500" /> : <Store className="w-3 h-3 text-success-600" />}
                    >
                      {order.customerAddress ? "Domicilio" : "Mostrador / Local"}
                    </Badge>

                    <Badge variant="light" size="xs" color="light">
                      {order.items.reduce((s, it) => s + it.quantity, 0)} unidades ({totalItems} productos)
                    </Badge>
                  </div>

                  {/* Checklist Container */}
                  <div className="rounded-xl bg-gray-50/70 dark:bg-gray-800/40 p-3.5 border border-gray-100 dark:border-gray-800 space-y-2.5">
                    {/* Header with Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-gray-500 dark:text-gray-400">Progreso de alistamiento</span>
                        <span className="font-semibold text-gray-800 dark:text-white">
                          {checkedCount} de {totalItems} listos ({progressPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200/80 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-success-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Interactive Items */}
                    <div className="space-y-1.5 pt-1">
                      {order.items.map((item, idx) => {
                        const isChecked = checks.has(idx);
                        return (
                          <div
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleItemCheck(order.id, idx);
                            }}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                              isChecked
                                ? "border-success-200 bg-success-50/60 text-success-900 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-200"
                                : "border-gray-200/80 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className={`flex h-4 w-4 flex-none items-center justify-center rounded border transition-all ${
                                  isChecked
                                    ? "border-success-500 bg-success-500 text-white"
                                    : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"
                                }`}
                              >
                                {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                              </span>
                              <span className="font-bold text-gray-900 dark:text-white">
                                {item.quantity}×
                              </span>
                              <span className={`truncate ${isChecked ? "line-through text-gray-400 dark:text-gray-500 font-normal" : "font-medium"}`}>
                                {item.name}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer Action: Single Full-width Authoritative Action */}
                <div className="pt-3.5 border-t border-gray-100 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant={isCompleted ? "outline" : "primary"}
                    onClick={() => handleMarkReady(order)}
                    className={`w-full justify-center text-xs font-semibold cursor-pointer shadow-theme-xs ${
                      isCompleted ? "bg-success-600 hover:bg-success-700 text-white border-transparent" : ""
                    }`}
                    startIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  >
                    {isCompleted ? "Marcar Listo para Entrega" : "Completar Alistamiento"}
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
