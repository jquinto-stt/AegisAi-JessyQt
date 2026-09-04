import React, { useState } from "react";
import {
  Truck,
  Building2,
  Package,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Phone,
  Mail,
  User,
  ArrowDownLeft,
  ChevronRight,
  Boxes,
} from "lucide-react";
import { PurchaseOrder, Supplier, StockLocation, InventoryProduct } from "../types/inventory.types";
import { NectoBanner } from "@/compositions/pedidos/shared/NectoBanner";
import { Button } from "@/elements";

interface PurchasingViewProps {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  locations: StockLocation[];
  products: InventoryProduct[];
  onReceiveOrder: (orderId: string) => Promise<any>;
}

export const PurchasingView: React.FC<PurchasingViewProps> = ({
  purchaseOrders,
  suppliers,
  locations,
  products,
  onReceiveOrder,
}) => {
  const [activeTab, setActiveTab] = useState<"orders" | "suppliers">("orders");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "received">("all");
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const filteredOrders = purchaseOrders.filter((po) => {
    if (statusFilter !== "all" && po.status !== statusFilter) return false;
    return true;
  });

  const handleReceive = async (orderId: string) => {
    try {
      setReceivingId(orderId);
      await onReceiveOrder(orderId);
    } catch (err: any) {
      alert(err?.message || "Error al recibir la orden de compra");
    } finally {
      setReceivingId(null);
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "—";
    try {
      return new Date(isoStr).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Official Clean Necto Banner */}
      <NectoBanner
        icon={<Truck className="w-6 h-6 text-[#FF3F1A]" />}
        title="Compras & Proveedores"
        description="Control comercial de compras, cuentas por pagar a proveedores y recepción directa de mercancía en bodega."
      />

      {/* View Mode Pills (Órdenes / Proveedores) */}
      <div className="bg-white dark:bg-[#151518] rounded-2xl p-2.5 sm:p-3 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "orders"
                ? "bg-[#190088] text-white border border-[#190088] shadow-2xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-[#190088] dark:hover:text-[#97D6DF]"
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Órdenes de Compra</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
              activeTab === "orders" ? "bg-white/20 text-white" : "bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
            }`}>
              {purchaseOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("suppliers")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "suppliers"
                ? "bg-[#190088] text-white border border-[#190088] shadow-2xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-[#190088] dark:hover:text-[#97D6DF]"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Directorio de Proveedores</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
              activeTab === "suppliers" ? "bg-white/20 text-white" : "bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
            }`}>
              {suppliers.length}
            </span>
          </button>
        </div>

        {activeTab === "orders" && (
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
              Todas ({purchaseOrders.length})
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
              Pendientes ({purchaseOrders.filter((o) => o.status === "pending").length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("received")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === "received"
                  ? "bg-[#190088] text-white border border-[#190088] shadow-2xs font-bold"
                  : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/60 hover:text-[#190088] dark:hover:text-[#97D6DF] hover:bg-blue-50/70 dark:hover:bg-[#190088]/20"
              }`}
            >
              Recibidas ({purchaseOrders.filter((o) => o.status === "received").length})
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Orders List */}
      {activeTab === "orders" && (
        <div className="space-y-4 sm:space-y-5">
          {filteredOrders.length === 0 ? (
            <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center text-zinc-400 space-y-2">
              <Truck className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600" />
              <p className="font-bold text-base text-zinc-700 dark:text-zinc-200">
                No hay órdenes de compra con el filtro seleccionado
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {filteredOrders.map((po) => (
                <div
                  key={po.id}
                  className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs hover:shadow-md hover:border-[#190088]/60 dark:hover:border-[#190088]/80 transition-all space-y-4"
                >
                  {/* Order Card Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-black font-mono text-zinc-900 dark:text-white">
                          {po.orderNumber}
                        </span>
                        {po.status === "pending" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-xs font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-3.5 h-3.5" />
                            En Espera de Recepción
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ingresada a Stock
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <span>Proveedor: <strong className="text-zinc-700 dark:text-zinc-300 font-bold">{po.supplierName}</strong></span>
                        <span>•</span>
                        <span>Destino: <strong className="text-zinc-700 dark:text-zinc-300">{po.targetLocationName}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                          Total Orden
                        </span>
                        <span className="text-lg font-black font-mono text-zinc-950 dark:text-white">
                          ${po.totalAmount.toLocaleString("es-CO")}
                        </span>
                      </div>

                      {po.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => handleReceive(po.id)}
                          disabled={receivingId === po.id}
                          className="flex items-center gap-2 text-xs font-bold whitespace-nowrap shadow-2xs bg-[#190088] hover:bg-[#150073] text-white px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                        >
                          <ArrowDownLeft className="w-4 h-4" />
                          <span>{receivingId === po.id ? "Ingresando..." : "Recibir en Almacén"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold uppercase font-mono tracking-wider text-zinc-400 block">
                      Ítems de la orden ({po.items.length})
                    </span>
                    <div className="rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/40 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/70">
                      {po.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 flex items-center justify-between text-xs hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                        >
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-white">
                              {item.productName}
                            </p>
                            <span className="font-mono text-[11px] text-zinc-400">
                              SKU: {item.productSku}
                            </span>
                          </div>

                          <div className="flex items-center gap-6">
                            <span className="text-zinc-500 font-mono">
                              {item.quantity} {item.unit} × ${item.unitPrice.toLocaleString("es-CO")}
                            </span>
                            <span className="font-black font-mono text-zinc-900 dark:text-white text-sm">
                              ${(item.quantity * item.unitPrice).toLocaleString("es-CO")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Footer Info */}
                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                    <span>Emitida: {formatDate(po.issueDate)}</span>
                    {po.receivedDate && <span>Recibida: {formatDate(po.receivedDate)}</span>}
                    {po.notes && <span className="italic max-w-md truncate">"{po.notes}"</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Suppliers Directory */}
      {activeTab === "suppliers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5 sm:gap-6">
          {suppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs hover:shadow-md hover:border-[#190088]/60 dark:hover:border-[#190088]/80 transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#190088]/10 dark:bg-[#190088]/20 border border-[#190088]/20 text-[#190088] dark:text-[#97D6DF] flex items-center justify-center flex-none">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-zinc-900 dark:text-white">
                      {sup.name}
                    </h4>
                    <span className="font-mono text-xs text-zinc-400">NIT: {sup.taxId}</span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/60">
                  ★ {sup.rating}
                </span>
              </div>

              <div className="space-y-2 p-3.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/70 text-xs">
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <User className="w-4 h-4 text-zinc-400 flex-none" />
                  <span>Contacto: <strong className="font-bold">{sup.contactPerson}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <Mail className="w-4 h-4 text-zinc-400 flex-none" />
                  <span>{sup.email}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <Phone className="w-4 h-4 text-zinc-400 flex-none" />
                  <span>{sup.phone}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                <span>Tiempo de entrega estimado:</span>
                <strong className="text-zinc-800 dark:text-zinc-200 font-mono">
                  {sup.leadTimeDays} {sup.leadTimeDays === 1 ? "día hábil" : "días hábiles"}
                </strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
