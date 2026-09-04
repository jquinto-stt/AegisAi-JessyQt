import React, { useState } from "react";
import {
  Truck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Phone,
  Mail,
  User,
  ArrowDownLeft,
  Search,
  FileText,
  Boxes,
  MapPin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  PurchaseOrder,
  Supplier,
  StockLocation,
  InventoryProduct,
} from "../types/inventory.types";

interface PurchasingViewProps {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  locations: StockLocation[];
  products: InventoryProduct[];
  onReceiveOrder: (orderId: string) => Promise<any>;
  onOpenNewPurchaseOrder?: () => void;
  onOpenNewSupplier?: () => void;
}

export const PurchasingView: React.FC<PurchasingViewProps> = ({
  purchaseOrders,
  suppliers,
  locations,
  products,
  onReceiveOrder,
  onOpenNewPurchaseOrder,
  onOpenNewSupplier,
}) => {
  const [activeTab, setActiveTab] = useState<"orders" | "suppliers">("orders");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "received">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const filteredOrders = purchaseOrders.filter((po) => {
    if (statusFilter !== "all" && po.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = po.orderNumber.toLowerCase().includes(q);
      const matchSup = po.supplierName.toLowerCase().includes(q);
      const matchLoc = po.targetLocationName.toLowerCase().includes(q);
      const matchNotes = (po.notes || "").toLowerCase().includes(q);
      return matchNum || matchSup || matchLoc || matchNotes;
    }
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

  const pendingOrders = purchaseOrders.filter((po) => po.status === "pending").length;
  const receivedOrders = purchaseOrders.filter((po) => po.status === "received").length;
  const totalPurchasesValue = purchaseOrders.reduce((acc, po) => acc + po.totalAmount, 0);

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-fade-in max-w-7xl mx-auto">
      {/* ── 1. Minimalist Purchasing Overview Strip (Zero Clutter) ── */}
      <div className="bg-white dark:bg-[#151518] rounded-2xl p-3 sm:px-4 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 sm:gap-6 divide-x divide-zinc-200 dark:divide-zinc-800 text-xs overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-baseline gap-2 flex-none">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Total Facturado:</span>
            <span className="font-mono font-black text-sm text-zinc-900 dark:text-white">
              ${totalPurchasesValue.toLocaleString("es-CO")}
            </span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-baseline gap-2 flex-none">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Pendientes Recepción:</span>
            <span className="font-mono font-black text-sm text-amber-600 dark:text-amber-400">
              {pendingOrders}
            </span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-baseline gap-2 flex-none">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Recibidas en Bodega:</span>
            <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
              {receivedOrders}
            </span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-baseline gap-2 flex-none">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Proveedores Activos:</span>
            <span className="font-mono font-bold text-xs text-zinc-600 dark:text-zinc-300">
              {suppliers.length}
            </span>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2 flex-none ml-auto">
          {onOpenNewPurchaseOrder && (
            <button
              type="button"
              onClick={onOpenNewPurchaseOrder}
              className="px-3.5 py-1.5 rounded-xl bg-[#190088] hover:bg-[#150073] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Factura de Compra</span>
            </button>
          )}

          {onOpenNewSupplier && (
            <button
              type="button"
              onClick={onOpenNewSupplier}
              className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Building2 className="w-3.5 h-3.5 text-[#190088]" />
              <span>Nuevo Proveedor</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. View Mode Pills & Search / Filters Toolbar ── */}
      <div className="bg-white dark:bg-[#151518] rounded-2xl p-2.5 sm:p-3 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Main Tabs (Órdenes vs Proveedores) */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl w-fit flex-none">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "orders"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-[#190088]"
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Facturas & Órdenes</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                activeTab === "orders"
                  ? "bg-[#190088] text-white"
                  : "bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {purchaseOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("suppliers")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "suppliers"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-[#190088]"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Proveedores</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                activeTab === "suppliers"
                  ? "bg-[#190088] text-white"
                  : "bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {suppliers.length}
            </span>
          </button>
        </div>

        {/* Filters and Search when viewing orders */}
        {activeTab === "orders" && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar factura, proveedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:outline-hidden focus:ring-1 focus:ring-[#190088] text-zinc-900 dark:text-white"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === "all"
                    ? "bg-[#190088] text-white font-bold shadow-2xs"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-[#190088]"
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === "pending"
                    ? "bg-amber-600 text-white font-bold shadow-2xs"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-amber-600"
                }`}
              >
                Pendientes ({pendingOrders})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("received")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === "received"
                    ? "bg-emerald-600 text-white font-bold shadow-2xs"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600"
                }`}
              >
                Recibidas ({receivedOrders})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Tab 1: High Density Purchase Orders Table ── */}
      {activeTab === "orders" && (
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/75 dark:bg-zinc-900/50 text-[10px] font-mono uppercase font-bold text-zinc-400">
                  <th className="py-2.5 px-4">Orden / Factura</th>
                  <th className="py-2.5 px-3">Fecha Emisión</th>
                  <th className="py-2.5 px-3">Proveedor</th>
                  <th className="py-2.5 px-3">Bodega Destino</th>
                  <th className="py-2.5 px-3 text-center">Ítems</th>
                  <th className="py-2.5 px-3 text-right">Total Factura</th>
                  <th className="py-2.5 px-3 text-center">Estado Recepción</th>
                  <th className="py-2.5 px-4 text-right">Acciones de Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400">
                      <Truck className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                      <p className="font-bold text-zinc-700 dark:text-zinc-300">
                        No hay facturas u órdenes de compra registradas
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Crea una con "+ Nueva Factura de Compra" para ingresar mercadería y costo al inventario.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((po) => {
                    const isExpanded = expandedOrderId === po.id;
                    const totalQty = po.items.reduce((acc, it) => acc + it.quantity, 0);

                    return (
                      <React.Fragment key={po.id}>
                        <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                          {/* Factura / Orden */}
                          <td className="py-3 px-4 font-mono font-black text-zinc-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span>{po.orderNumber}</span>
                              {po.notes && (
                                <span className="text-[10px] font-sans font-normal text-zinc-400 truncate max-w-[120px]" title={po.notes}>
                                  ({po.notes})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Fecha */}
                          <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300 font-mono text-[11px]">
                            {formatDate(po.issueDate)}
                          </td>

                          {/* Proveedor */}
                          <td className="py-3 px-3 font-bold text-zinc-900 dark:text-white">
                            {po.supplierName}
                          </td>

                          {/* Bodega Destino */}
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                              <MapPin className="w-3 h-3 text-[#FF3F1A] flex-none" />
                              <span>{po.targetLocationName}</span>
                            </span>
                          </td>

                          {/* Ítems */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setExpandedOrderId(isExpanded ? null : po.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[11px] font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                            >
                              <span>{po.items.length} ítems ({totalQty} u.)</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          </td>

                          {/* Total */}
                          <td className="py-3 px-3 text-right font-mono font-black text-sm text-zinc-900 dark:text-white">
                            ${po.totalAmount.toLocaleString("es-CO")}
                          </td>

                          {/* Estado */}
                          <td className="py-3 px-3 text-center">
                            {po.status === "received" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                Ingresada a Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                <Clock className="w-3 h-3" />
                                Pendiente
                              </span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {po.status === "pending" ? (
                              <button
                                type="button"
                                onClick={() => handleReceive(po.id)}
                                disabled={receivingId === po.id}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 ml-auto transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                <span>{receivingId === po.id ? "Ingresando..." : "Recibir en Almacén"}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] font-mono text-zinc-400">
                                Recibida {formatDate(po.receivedDate)}
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Renglones Expandibles */}
                        {isExpanded && (
                          <tr className="bg-zinc-50/75 dark:bg-zinc-900/60 border-y border-zinc-200/80 dark:border-zinc-800">
                            <td colSpan={8} className="p-4">
                              <div className="space-y-2">
                                <span className="text-[10px] font-mono uppercase font-bold text-zinc-400 block">
                                  Detalle de Renglones Facturados ({po.items.length})
                                </span>
                                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden">
                                  {po.items.map((it, idx) => (
                                    <div
                                      key={idx}
                                      className="px-4 py-2 flex items-center justify-between text-xs"
                                    >
                                      <div>
                                        <span className="font-bold text-zinc-900 dark:text-white">
                                          {it.productName}
                                        </span>
                                        <span className="font-mono text-[11px] text-zinc-400 ml-2">
                                          SKU: {it.productSku}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4 font-mono">
                                        <span className="text-zinc-500">
                                          {it.quantity} {it.unit} × ${it.unitPrice.toLocaleString("es-CO")}
                                        </span>
                                        <span className="font-bold text-zinc-900 dark:text-white">
                                          ${(it.quantity * it.unitPrice).toLocaleString("es-CO")}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 4. Tab 2: High Density Suppliers Directory Table ── */}
      {activeTab === "suppliers" && (
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/75 dark:bg-zinc-900/50 text-[10px] font-mono uppercase font-bold text-zinc-400">
                  <th className="py-2.5 px-4">Proveedor / Razón Social</th>
                  <th className="py-2.5 px-3">NIT / RUT</th>
                  <th className="py-2.5 px-3">Contacto Directo</th>
                  <th className="py-2.5 px-3">Correo Electrónico</th>
                  <th className="py-2.5 px-3">Teléfono</th>
                  <th className="py-2.5 px-3 text-center">Plazo Entrega</th>
                  <th className="py-2.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {suppliers.map((sup) => (
                  <tr
                    key={sup.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] flex items-center justify-center flex-none">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {sup.name}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-zinc-600 dark:text-zinc-300">
                      {sup.taxId}
                    </td>

                    <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300 font-medium">
                      {sup.contactPerson}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      {sup.email}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      {sup.phone}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-zinc-700 dark:text-zinc-300">
                      {sup.leadTimeDays} días
                    </td>

                    <td className="py-3 px-4 text-right">
                      {onOpenNewPurchaseOrder && (
                        <button
                          type="button"
                          onClick={onOpenNewPurchaseOrder}
                          className="px-3 py-1.5 rounded-xl bg-[#190088]/10 hover:bg-[#190088]/20 text-[#190088] dark:text-[#97D6DF] font-bold text-xs transition-colors cursor-pointer"
                        >
                          + Facturar Compra
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
