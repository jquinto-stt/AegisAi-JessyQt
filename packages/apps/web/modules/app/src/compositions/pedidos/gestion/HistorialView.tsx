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
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Filter,
} from "lucide-react";
import { Button, Select, SearchInput } from "@/elements";

export const HistorialView: React.FC = () => {
  const { orders, setSelectedOrderId } = usePedidos();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "TODOS">("TODOS");
  const [channelFilter, setChannelFilter] = useState<OrderChannel | "TODOS">("TODOS");
  const [search, setSearch] = useState("");
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
      "Fecha",
      "Hora",
      "Cliente",
      "Canal",
      "Estado",
      "Metodo Pago",
      "Total ($)",
    ];
    const rows = filtered.map(o => [
      o.id,
      closingDate,
      o.createdAt,
      `"${o.customerName.replace(/"/g, '""')}"`,
      o.channel.toUpperCase(),
      o.status,
      (o.paymentMethod || "EFECTIVO").toUpperCase(),
      o.total,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `auditoria_ventas_${closingDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cash Register Closure Metrics
  const activeOrders = orders.filter(o => o.status !== "CANCELADO" && o.status !== "RECHAZADO");
  const totalSales = activeOrders.reduce((sum, o) => sum + o.total, 0);
  const completedCount = orders.filter(o => o.status === "FINALIZADO").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quick Cash Register Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Total Facturado
          </span>
          <p className="text-2xl font-black text-zinc-950 dark:text-white">
            ${totalSales.toLocaleString()}
          </p>
          <span className="text-[11px] text-zinc-400">En {activeOrders.length} transacciones activas</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Órdenes Completadas
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {completedCount}
          </p>
          <span className="text-[11px] text-zinc-400">Entregadas con éxito al cliente</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Ticket Promedio
          </span>
          <p className="text-2xl font-black text-[#FF3F1A]">
            ${activeOrders.length ? Math.round(totalSales / activeOrders.length).toLocaleString() : 0}
          </p>
          <span className="text-[11px] text-zinc-400">Gasto medio por comanda</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          intent="historial.search"
          className="flex-1 min-w-[220px] max-w-sm"
          placeholder="Buscar por ID de comanda o cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onClear={() => setSearch("")}
        />

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="date"
              value={closingDate}
              onChange={e => setClosingDate(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-zinc-700 dark:text-zinc-200 focus:outline-none cursor-pointer"
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
              { value: "EN_PREPARACION", label: "En Cocina" },
              { value: "LISTO", label: "Listos" },
              { value: "FINALIZADO", label: "Finalizados" },
              { value: "CANCELADO", label: "Cancelados" },
            ]}
          />

          <Select
            intent="historial.filter.channel"
            value={channelFilter}
            onChange={e => setChannelFilter(e.target.value as any)}
            options={[
              { value: "TODOS", label: "Todos los Canales" },
              { value: "whatsapp", label: "WhatsApp IA" },
              { value: "web", label: "Portal Web" },
              { value: "presencial", label: "Mostrador" },
              { value: "telefono", label: "Teléfono" },
            ]}
          />

          <Button
            variant="ghost"
            intent="historial.export"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-3xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200/80 dark:border-zinc-800/80 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4 pl-6">ID Comanda</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Canal</th>
                <th className="p-4">Items / Pedido</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Total</th>
                <th className="p-4 pr-6 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400">
                    No se encontraron pedidos con los filtros seleccionados
                  </td>
                </tr>
              ) : (
                filtered.map(order => (
                  <tr
                    key={order.id}
                    className="hover:bg-zinc-50 dark:hover:bg-[#18181B] transition-colors"
                  >
                    <td className="p-4 pl-6 font-bold text-zinc-950 dark:text-white">
                      #{order.id.slice(-6)}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{order.customerName}</p>
                      <p className="text-[11px] text-zinc-400">{order.customerPhone || "Sin teléfono"}</p>
                    </td>
                    <td className="p-4">
                      <ChannelBadge channel={order.channel} />
                    </td>
                    <td className="p-4 text-zinc-600 dark:text-zinc-300 max-w-xs truncate">
                      {order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                    </td>
                    <td className="p-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="p-4 font-bold text-zinc-950 dark:text-white">
                      ${order.total.toLocaleString()}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <Button
                        variant="ghost"
                        intent="historial.view.detail"
                        onClick={() => setSelectedOrderId(order.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-[#EFE6D3] dark:hover:bg-[#37332A] text-zinc-700 dark:text-zinc-200 hover:text-[#FF3F1A] dark:hover:text-[#FF3F1A] text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
