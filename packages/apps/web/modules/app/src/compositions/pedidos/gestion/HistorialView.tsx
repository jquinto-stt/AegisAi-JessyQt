import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { OrderStatus, OrderChannel } from "../types";
import { OrderStatusBadge, ChannelBadge } from "../shared/Badges";
import {
  Calendar,
  Download,
  Eye,
  History,
  Receipt,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";

import { NectoBanner } from "../shared/NectoBanner";
import { Button, Select, SearchInput } from "@/elements";

export const HistorialView: React.FC = () => {
  const { orders, setSelectedOrderId, shiftInfo } = usePedidos();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "TODOS">("TODOS");
  const [channelFilter, setChannelFilter] = useState<OrderChannel | "TODOS">("TODOS");
  const [search, setSearch] = useState("");
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [closingDate, setClosingDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Filtering
  const filtered = orders.filter(o => {
    if (statusFilter !== "TODOS" && o.status !== statusFilter) return false;
    if (channelFilter !== "TODOS" && o.channel !== channelFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchId = o.id.toLowerCase().includes(q);
      const matchCustomer = o.customerName.toLowerCase().includes(q);
      if (!matchId && !matchCustomer) return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = [
      "ID Comanda",
      "Turno",
      "Fecha",
      "Hora Creacion",
      "Cliente",
      "Telefono",
      "Canal",
      "Estado",
      "Metodo Pago",
      "Productos",
      "Total ($)",
    ];
    const rows = filtered.map(o => [
      o.id,
      o.turnNumber ? `#${o.turnNumber}` : "N/A",
      closingDate,
      o.createdAt,
      `"${o.customerName.replace(/"/g, '""')}"`,
      `"${(o.customerPhone || "N/A").replace(/"/g, '""')}"`,
      o.channel.toUpperCase(),
      o.status,
      (o.paymentMethod || "EFECTIVO").toUpperCase(),
      `"${o.items.map(i => `${i.quantity}x ${i.name}`).join(" + ").replace(/"/g, '""')}"`,
      o.total,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `cierre_caja_Z_${closingDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cash Register Closure Metrics
  const activeOrders = orders.filter(o => o.status !== "CANCELADO" && o.status !== "RECHAZADO");
  const totalSales = activeOrders.reduce((sum, o) => sum + o.total, 0);
  const completedCount = orders.filter(o => o.status === "FINALIZADO").length;
  const inPrepCount = orders.filter(o => ["CONFIRMADO", "EN_PREPARACION", "LISTO"].includes(o.status)).length;
  const canceledCount = orders.filter(o => o.status === "CANCELADO" || o.status === "RECHAZADO").length;

  const paymentBreakdown = {
    mercadopago: activeOrders.filter(o => o.paymentMethod === "mercadopago").reduce((s, o) => s + o.total, 0),
    efectivo: activeOrders.filter(o => (o.paymentMethod === "efectivo" || !o.paymentMethod)).reduce((s, o) => s + o.total, 0),
    transferencia: activeOrders.filter(o => o.paymentMethod === "transferencia").reduce((s, o) => s + o.total, 0),
    pos: activeOrders.filter(o => o.paymentMethod === "pos").reduce((s, o) => s + o.total, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <NectoBanner
        icon={<History className="w-6 h-6 text-[#FF3F1A]" />}
        title="Historial y Auditoría de Pedidos"
        description="Registro inmutable de todas las transiciones, comandas y motivos de cancelación."
      />

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#2C2D31] rounded-2xl p-4 border border-slate-200 dark:border-[#374151] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          intent="historial.search"
          className="flex-1 min-w-[240px] max-w-sm"
          placeholder="Buscar por ID o cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onClear={() => setSearch("")}
        />

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Date Picker Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-[#374151] rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="date"
              value={closingDate}
              onChange={e => setClosingDate(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"
            />
          </div>

          <Select
            intent="historial.filter.status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            options={[
              { value: "TODOS", label: "Todos los Estados" },
              { value: "NUEVO", label: "Nuevos" },
              { value: "CONFIRMADO", label: "Confirmados" },
              { value: "EN_PREPARACION", label: "En Preparación" },
              { value: "LISTO", label: "Listos" },
              { value: "FINALIZADO", label: "Finalizados" },
              { value: "CANCELADO", label: "Cancelados" },
              { value: "RECHAZADO", label: "Rechazados" },
            ]}
          />

          <Select
            intent="historial.filter.channel"
            value={channelFilter}
            onChange={e => setChannelFilter(e.target.value as any)}
            options={[
              { value: "TODOS", label: "Todos los Canales" },
              { value: "whatsapp", label: "WhatsApp" },
              { value: "web", label: "Web Necto" },
              { value: "presencial", label: "Mostrador" },
              { value: "telefono", label: "Teléfono" },
            ]}
          />

          <Button
            variant="accent"
            intent="historial.closing.open"
            onClick={() => setShowClosingModal(true)}
            className="py-2 px-3.5 text-xs"
          >
            <Receipt className="w-3.5 h-3.5" /> Cierre de Turno / Caja
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-800/80 text-gray-400 font-extrabold uppercase tracking-wider border-b border-gray-100 dark:border-[#374151]">
              <tr>
                <th className="p-4">Pedido ID</th>
                <th className="p-4">Hora Creación</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Canal</th>
                <th className="p-4">Productos</th>
                <th className="p-4">Total</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-[#374151] text-gray-700 dark:text-gray-300">
              {filtered.map(order => (
                <tr
                  key={order.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-gray-800/60 transition-colors"
                >
                  <td className="p-4 font-mono font-extrabold text-gray-900 dark:text-gray-100">
                    {order.id}
                  </td>
                  <td className="p-4 font-mono text-gray-500">{order.createdAt}</td>
                  <td className="p-4 font-bold text-gray-900 dark:text-gray-100">
                    {order.customerName}
                  </td>
                  <td className="p-4">
                    <ChannelBadge channel={order.channel} />
                  </td>
                  <td className="p-4 max-w-xs truncate">
                    {order.items.map(i => `${i.quantity}× ${i.name}`).join(", ")}
                  </td>
                  <td className="p-4 font-mono font-black text-[#190088] dark:text-blue-400">
                    ${order.total.toLocaleString("es-CL")}
                  </td>
                  <td className="p-4">
                    <OrderStatusBadge status={order.status} size="sm" />
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      variant="outline"
                      intent="historial.order.detail"
                      onClick={() => setSelectedOrderId(order.id)}
                      className="px-3 py-1.5 rounded-lg text-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-400" /> Detalle
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Register Closure Modal */}
      {showClosingModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setShowClosingModal(false)}
          />

          <div className="relative w-full max-w-lg bg-white dark:bg-[#2C2D31] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#374151] z-10 p-6 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#374151] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-[#190088] dark:text-indigo-400 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-gray-100">
                    Cierre de Turno & Cuadre de Caja (Z)
                  </h3>
                  <p className="text-xs text-gray-400">
                    Turno: {shiftInfo.currentShift} · Reporte contable de caja
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                intent="historial.closing.close"
                onClick={() => setShowClosingModal(false)}
                className="w-8 h-8 p-0 text-gray-400"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Date Selection for Closure */}
            <div className="bg-slate-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#190088] dark:text-indigo-400" />
                <span>Fecha del Cierre:</span>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  intent="historial.closing.date.today"
                  onClick={() => setClosingDate(new Date().toISOString().split("T")[0])}
                  className="p-0 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-gray-600 hover:bg-slate-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  Hoy
                </Button>
                <Button
                  variant="ghost"
                  intent="historial.closing.date.yesterday"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setClosingDate(d.toISOString().split("T")[0]);
                  }}
                  className="p-0 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-gray-600 hover:bg-slate-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  Ayer
                </Button>
                <input
                  type="date"
                  value={closingDate}
                  onChange={e => setClosingDate(e.target.value)}
                  className="bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-600 rounded-lg px-2 py-1 text-xs font-mono font-bold text-gray-800 dark:text-gray-200 cursor-pointer"
                />
              </div>
            </div>

            {/* Main KPI Highlight */}
            <div className="bg-slate-50 dark:bg-gray-800/80 rounded-2xl p-4 border border-slate-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold uppercase text-gray-500">
                  Total Facturado del Turno
                </span>
                <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 font-mono">
                  ${totalSales.toLocaleString("es-CL")}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-gray-500">Ticket Promedio</span>
                <p className="text-lg font-black text-[#FF3F1A] font-mono">
                  ${Math.round(totalSales / (completedCount + inPrepCount || 1)).toLocaleString("es-CL")}
                </p>
              </div>
            </div>

            {/* Breakdown by Payment Method */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                Desglose por Método de Cobro
              </h4>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
                  <span className="text-gray-500 font-semibold block">MercadoPago / QR</span>
                  <span className="text-sm font-black font-mono text-emerald-600">
                    ${paymentBreakdown.mercadopago.toLocaleString("es-CL")}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
                  <span className="text-gray-500 font-semibold block">Efectivo en Caja</span>
                  <span className="text-sm font-black font-mono text-emerald-600">
                    ${paymentBreakdown.efectivo.toLocaleString("es-CL")}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
                  <span className="text-gray-500 font-semibold block">Transferencia Bancaria</span>
                  <span className="text-sm font-black font-mono text-emerald-600">
                    ${paymentBreakdown.transferencia.toLocaleString("es-CL")}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
                  <span className="text-gray-500 font-semibold block">POS / Tarjeta Débito</span>
                  <span className="text-sm font-black font-mono text-emerald-600">
                    ${paymentBreakdown.pos.toLocaleString("es-CL")}
                  </span>
                </div>
              </div>
            </div>

            {/* Volume Stats */}
            <div className="p-3.5 bg-slate-50 dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 flex justify-between items-center text-xs font-bold">
              <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{completedCount} Finalizadas</span>
              </span>
              <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{inPrepCount} En Proceso</span>
              </span>
              <span className="text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{canceledCount} Canceladas</span>
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="outline"
                intent="historial.closing.cancel"
                onClick={() => setShowClosingModal(false)}
                className="flex-1 py-2.5 px-4 text-xs"
              >
                Cerrar
              </Button>
              <Button
                variant="ghost"
                intent="historial.closing.export.csv"
                onClick={handleExportCSV}
                className="p-0 flex-1 py-2.5 px-4 rounded-xl bg-[#190088] hover:bg-[#140070] text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" /> Descargar CSV
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
