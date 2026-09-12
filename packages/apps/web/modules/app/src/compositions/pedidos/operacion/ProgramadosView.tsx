import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { OperacionTab } from "../types";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Package,
  Phone,
  Search,
  Plus,
  FileText,
  Smartphone,
  Globe,
  Store,
  Bike,
  CreditCard,
  GripVertical,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Table2,
  LayoutGrid,
} from "lucide-react";
import { Button, Badge } from "@/elements";

export const ProgramadosView: React.FC<{
  onNavigateOpTab?: (t: OperacionTab) => void;
}> = () => {
  const {
    programados,
    injectScheduledOrderToLive,
    setSelectedOrderId,
  } = usePedidos();

  const [dateFilter, setDateFilter] = useState<string>("TODOS");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isGroupOpen, setIsGroupOpen] = useState(true);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const hoyList = programados.filter(p => p.scheduledDate === "Hoy");
  const mananaList = programados.filter(p => p.scheduledDate === "Mañana");
  const futuraList = programados.filter(p => p.scheduledDate !== "Hoy" && p.scheduledDate !== "Mañana");

  const totalAmountAll = programados.reduce((sum, p) => sum + p.total, 0);

  const handleInjectToFulfillment = (orderId: string, customerName: string) => {
    injectScheduledOrderToLive(orderId, true);
    showToast(`Pedido ${orderId} de ${customerName} trasladado a la cola activa.`);
  };

  // Filter list
  const filteredList = programados.filter(order => {
    if (dateFilter === "HOY" && order.scheduledDate !== "Hoy") return false;
    if (dateFilter === "MANANA" && order.scheduledDate !== "Mañana") return false;
    if (dateFilter === "FUTUROS" && (order.scheduledDate === "Hoy" || order.scheduledDate === "Mañana")) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = order.id.toLowerCase().includes(q);
      const matchCust = order.customerName.toLowerCase().includes(q);
      const matchItem = order.items.some(i => i.name.toLowerCase().includes(q));
      if (!matchId && !matchCust && !matchItem) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Toast feedback */}
      {successToast && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl dark:bg-white dark:text-gray-900 animate-slide-up">
          <CheckCircle2 className="h-4 w-4 text-success-500" />
          <span>{successToast}</span>
        </div>
      )}

      {/* ── Single Authoritative Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Pedidos Programados
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {programados.length} {programados.length === 1 ? "pedido agendado" : "pedidos agendados"} · ${totalAmountAll.toLocaleString("es-CO")} en total
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white shadow-xs text-gray-900 dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Tarjetas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-white shadow-xs text-gray-900 dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
              <span>Tabla principal</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter Bar & Search ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, # orden o producto..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
          />
        </div>

        {/* Date Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "TODOS", label: `Todos (${programados.length})` },
            { id: "HOY", label: `Hoy (${hoyList.length})` },
            { id: "MANANA", label: `Mañana (${mananaList.length})` },
            { id: "FUTUROS", label: `Próximos días (${futuraList.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDateFilter(tab.id)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                dateFilter === tab.id
                  ? "bg-brand-500 text-white shadow-theme-xs"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content: Clean Cards or Table ── */}
      {filteredList.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 mb-3">
            <Calendar className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
            No hay pedidos programados con los filtros seleccionados
          </h4>
          <p className="mt-1 text-xs text-gray-400">
            Puedes agendar despachos futuros desde las conversaciones de WhatsApp o registrando órdenes pactadas.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredList.map(order => {
            const isToday = order.scheduledDate === "Hoy";
            const isTomorrow = order.scheduledDate === "Mañana";

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
                  {/* Top Bar: Icon + ID + Date Badge */}
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
                      <Badge
                        variant="light"
                        size="xs"
                        color={isToday ? "warning" : isTomorrow ? "info" : "light"}
                      >
                        {isToday ? "Hoy" : isTomorrow ? "Mañana" : "Agendado"}
                      </Badge>
                      <span className="text-[11px] text-gray-400 font-medium">
                        {order.scheduledTime ? order.scheduledTime : order.scheduledDate}
                      </span>
                    </div>
                  </div>

                  {/* Operational Signals: Modality & Items Count */}
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
                      {order.items.reduce((s, i) => s + i.quantity, 0)} unidades ({order.items.length} prods.)
                    </Badge>
                  </div>

                  {/* Operational Items Preview (Clean without artificial box-in-box) */}
                  <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800/80">
                    <div className="space-y-1.5">
                      {order.items.slice(0, 3).map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
                          <span className="truncate max-w-[200px]">
                            <strong className="text-brand-600 dark:text-brand-400 font-bold mr-1.5">{it.quantity}×</strong>
                            {it.name}
                          </span>
                          <span className="font-mono text-gray-400 text-[11px] flex-none ml-2">
                            ${(it.quantity * it.unitPrice).toLocaleString("es-CO")}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-[11px] text-gray-400 font-medium pt-0.5">
                          + {order.items.length - 3} producto(s) adicional(es)
                        </p>
                      )}
                    </div>

                    {order.notes && (
                      <p className="text-[11px] text-warning-700 dark:text-warning-300/90 font-medium truncate pt-1">
                        💬 Nota: "{order.notes}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total pactado:</span>
                      <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                        ${order.total.toLocaleString("es-CO")} COP
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions: Single Authoritative Full-width Button */}
                <div className="pt-3.5 border-t border-gray-100 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleInjectToFulfillment(order.id, order.customerName)}
                    className="w-full justify-center text-xs font-semibold cursor-pointer shadow-theme-xs"
                    startIcon={<Package className="h-3.5 w-3.5" />}
                  >
                    Pasar a Alistamiento
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── VIEW 2: PLAKY / MONDAY.COM MAIN TABLE ── */
        <div className="space-y-6 animate-fade-in">
          {filteredList.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 mb-3">
                <Table2 className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                No hay pedidos programados con los filtros seleccionados
              </h4>
              <p className="mt-1 text-xs text-gray-400">
                Puedes agendar despachos futuros desde las conversaciones de WhatsApp o registrando órdenes pactadas.
              </p>
            </div>
          ) : (
            (() => {
              const totalSum = filteredList.reduce((s, o) => s + o.total, 0);
              const totalUnits = filteredList.reduce((s, o) => s + o.items.reduce((sum, it) => sum + it.quantity, 0), 0);
              const hoyCount = filteredList.filter(o => o.scheduledDate === "Hoy").length;
              const mananaCount = filteredList.filter(o => o.scheduledDate === "Mañana").length;
              const otrosCount = filteredList.length - hoyCount - mananaCount;
              const totalCount = filteredList.length || 1;

              return (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
                  {/* Collapsible Group Header (Monday / Plaky style) */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50/90 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsGroupOpen(!isGroupOpen)}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary-600 hover:bg-secondary-700 text-white transition-all cursor-pointer shadow-xs"
                        title={isGroupOpen ? "Colapsar grupo" : "Expandir grupo"}
                      >
                        {isGroupOpen ? <ChevronDown className="h-4 w-4 stroke-[2.5]" /> : <ChevronRight className="h-4 w-4 stroke-[2.5]" />}
                      </button>
                      <h2 className="text-sm font-bold text-secondary-600 dark:text-secondary-400">
                        Cronograma de Despachos Programados
                      </h2>
                      <span className="rounded-full bg-white dark:bg-gray-800 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                        {filteredList.length} {filteredList.length === 1 ? "agendado" : "agendados"}
                      </span>
                      <span className="hidden sm:inline-block text-xs text-gray-400">
                        · {totalUnits} uds por despachar
                      </span>
                    </div>
                  </div>

                  {isGroupOpen && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left text-xs">
                        <thead className="bg-gray-50/50 dark:bg-gray-800/30 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                          <tr>
                            <th className="w-8 px-3 py-2.5 text-center"></th>
                            <th className="min-w-[220px] px-4 py-2.5">Orden & Cliente</th>
                            <th className="min-w-[120px] px-3 py-2.5">Canal</th>
                            <th className="min-w-[130px] px-3 py-2.5">Modalidad</th>
                            <th className="min-w-[140px] px-3 py-2.5">Fecha & Hora Pactada</th>
                            <th className="min-w-[150px] px-3 py-2.5">Artículos</th>
                            <th className="min-w-[120px] px-3 py-2.5">Total Pactado</th>
                            <th className="min-w-[140px] px-3 py-2.5 text-center">Programación</th>
                            <th className="min-w-[140px] px-4 py-2.5 text-right">Acción</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
                          {filteredList.map(order => {
                            const isToday = order.scheduledDate === "Hoy";
                            const isTomorrow = order.scheduledDate === "Mañana";

                            return (
                              <tr
                                key={order.id}
                                onClick={() => setSelectedOrderId(order.id)}
                                className="group transition-colors cursor-pointer border-l-[5px] border-l-secondary-600 hover:bg-gray-50/80 dark:hover:bg-white/[0.03]"
                              >
                                <td className="w-8 px-3 py-3 text-center">
                                  <GripVertical className="h-4 w-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity inline-block" />
                                </td>

                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-gray-900 dark:text-white group-hover:text-brand-500 transition-colors">
                                      {order.id}
                                    </span>
                                    <span className="font-semibold text-xs text-gray-800 dark:text-white truncate max-w-[140px]">
                                      {order.customerName}
                                    </span>
                                    {order.notes && (
                                      <span title={order.notes} className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-warning-700 dark:text-warning-300 bg-warning-50 dark:bg-warning-500/15 px-1.5 py-0.5 rounded-full border border-warning-200/60 dark:border-warning-500/30">
                                        <MessageSquare className="h-3 w-3" /> 1
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="px-3 py-3">
                                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border bg-secondary-50 text-secondary-700 border-secondary-200 dark:bg-secondary-950/40 dark:text-secondary-300 dark:border-secondary-800">
                                    <span className="capitalize">{order.channel}</span>
                                  </span>
                                </td>

                                <td className="px-3 py-3">
                                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                                    {order.customerAddress ? (
                                      <>
                                        <Bike className="h-3.5 w-3.5 text-brand-500 flex-none" />
                                        <span>Domicilio</span>
                                      </>
                                    ) : (
                                      <>
                                        <Store className="h-3.5 w-3.5 text-success-600 flex-none" />
                                        <span>Mostrador</span>
                                      </>
                                    )}
                                  </span>
                                </td>

                                <td className="px-3 py-3">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{order.scheduledDate || "Fecha pactada"}</span>
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400">{order.scheduledTime || "Sin hora fija"}</span>
                                  </div>
                                </td>

                                <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                                  <div className="text-xs">
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                      {order.items.reduce((s, it) => s + it.quantity, 0)} uds
                                    </span>
                                    <span className="text-gray-400 text-[11px] ml-1">
                                      ({order.items.length} {order.items.length === 1 ? "prod" : "prods"})
                                    </span>
                                  </div>
                                </td>

                                <td className="px-3 py-3 font-mono text-xs font-bold text-gray-900 dark:text-white">
                                  ${order.total.toLocaleString("es-CO")}
                                </td>

                                <td className="px-3 py-3 text-center">
                                  <span className={`block w-full py-1.5 px-3 rounded-md text-center text-xs font-bold uppercase tracking-wider shadow-xs ${
                                    isToday
                                      ? "bg-warning-500 text-white"
                                      : isTomorrow
                                      ? "bg-blue-light-600 text-white"
                                      : "bg-secondary-600 text-white"
                                  }`}>
                                    {isToday ? "Hoy" : isTomorrow ? "Mañana" : "Agendado"}
                                  </span>
                                </td>

                                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleInjectToFulfillment(order.id, order.customerName)}
                                    className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Package className="h-3.5 w-3.5" />
                                    <span>Alistar</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>

                        {/* Plaky / Monday Signature Footer Summary Bar */}
                        <tfoot className="bg-gray-50/80 dark:bg-gray-800/60 border-t-2 border-gray-200 dark:border-gray-700">
                          <tr>
                            <td className="w-8 px-3 py-2.5"></td>
                            <td className="px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                              Total {filteredList.length} agendadas
                            </td>
                            <td className="px-3 py-2.5"></td>
                            <td className="px-3 py-2.5"></td>
                            <td className="px-3 py-2.5"></td>
                            <td className="px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                              {totalUnits} uds
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-col text-xs font-mono">
                                <span className="text-[10px] text-gray-400 uppercase font-semibold">sum</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  ${totalSum.toLocaleString("es-CO")}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div
                                className="flex h-4 w-full rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-inner"
                                title={`Distribución: ${hoyCount} Hoy, ${mananaCount} Mañana, ${otrosCount} Próximos`}
                              >
                                {hoyCount > 0 && (
                                  <div
                                    style={{ width: `${(hoyCount / totalCount) * 100}%` }}
                                    className="bg-warning-500 transition-all"
                                    title={`${hoyCount} Para Hoy`}
                                  />
                                )}
                                {mananaCount > 0 && (
                                  <div
                                    style={{ width: `${(mananaCount / totalCount) * 100}%` }}
                                    className="bg-blue-light-600 transition-all"
                                    title={`${mananaCount} Para Mañana`}
                                  />
                                )}
                                {otrosCount > 0 && (
                                  <div
                                    style={{ width: `${(otrosCount / totalCount) * 100}%` }}
                                    className="bg-secondary-600 transition-all"
                                    title={`${otrosCount} Agendados futuros`}
                                  />
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
};
