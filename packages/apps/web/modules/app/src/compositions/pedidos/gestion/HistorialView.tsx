import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { OrderStatus, OrderChannel } from "../types";
import { OrderStatusBadge, ChannelBadge } from "../shared/Badges";
import {
  Calendar,
  Download,
  Eye,
  Search,
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Select,
} from "@/elements";

export const HistorialView: React.FC = () => {
  const { allOrders, setSelectedOrderId } = usePedidos();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "TODOS">("TODOS");
  const [channelFilter, setChannelFilter] = useState<OrderChannel | "TODOS">("TODOS");
  const [search, setSearch] = useState("");
  const [closingDate, setClosingDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Filtering over complete audit log
  const filtered = allOrders.filter(o => {
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
  const activeOrders = allOrders.filter(o => o.status !== "CANCELADO" && o.status !== "RECHAZADO");
  const totalSales = activeOrders.reduce((sum, o) => sum + o.total, 0);
  const completedCount = allOrders.filter(o => o.status === "FINALIZADO").length;
  const avgTicket = activeOrders.length > 0 ? Math.round(totalSales / activeOrders.length) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quick Cash Register Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-theme-xs space-y-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Total Facturado del Día
          </span>
          <p className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
            ${totalSales.toLocaleString("es-CO")} COP
          </p>
          <span className="text-xs text-gray-400">En {activeOrders.length} transacciones cobradas</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-theme-xs space-y-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Órdenes Completadas
          </span>
          <p className="text-2xl font-bold text-success-600 dark:text-success-400 font-mono">
            {completedCount}
          </p>
          <span className="text-xs text-gray-400">Despachadas con éxito al cliente</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-theme-xs space-y-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Ticket Promedio Consolidado
          </span>
          <p className="text-2xl font-bold text-brand-500 font-mono">
            ${avgTicket.toLocaleString("es-CO")} COP
          </p>
          <span className="text-xs text-gray-400">Promedio por comanda efectiva</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-theme-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="size-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ID de comanda o cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white focus:outline-hidden focus:border-brand-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200">
            <Calendar className="size-3.5 text-gray-400" />
            <input
              type="date"
              value={closingDate}
              onChange={e => setClosingDate(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-hidden cursor-pointer"
            />
          </div>

          <Select
            value={statusFilter}
            onChange={val => setStatusFilter(val as any)}
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
            value={channelFilter}
            onChange={val => setChannelFilter(val as any)}
            options={[
              { value: "TODOS", label: "Todos los Canales" },
              { value: "whatsapp", label: "WhatsApp IA" },
              { value: "web", label: "Portal Web" },
              { value: "presencial", label: "Mostrador" },
              { value: "telefono", label: "Teléfono" },
            ]}
          />

          <Button
            size="sm"
            variant="primary"
            startIcon={<Download className="size-3.5" />}
            onClick={handleExportCSV}
          >
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-theme-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader>ID Comanda</TableCell>
              <TableCell isHeader>Cliente</TableCell>
              <TableCell isHeader>Canal</TableCell>
              <TableCell isHeader>Items / Pedido</TableCell>
              <TableCell isHeader>Estado</TableCell>
              <TableCell isHeader>Total</TableCell>
              <TableCell isHeader className="text-right">Acción</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-8 text-center text-gray-400">
                  No se encontraron pedidos con los filtros seleccionados
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(order => (
                <TableRow
                  key={order.id}
                  className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <TableCell className="font-mono font-semibold text-gray-900 dark:text-white">
                    #{order.id.slice(-6)}
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{order.customerName}</p>
                    <p className="text-xs text-gray-400">{order.customerPhone || "Sin teléfono"}</p>
                  </TableCell>
                  <TableCell>
                    <ChannelBadge channel={order.channel} />
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-300 max-w-xs truncate text-xs">
                    {order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="font-mono font-bold text-gray-900 dark:text-white">
                    ${order.total.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      startIcon={<Eye className="size-3.5" />}
                      onClick={() => setSelectedOrderId(order.id)}
                      className="ml-auto"
                    >
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

