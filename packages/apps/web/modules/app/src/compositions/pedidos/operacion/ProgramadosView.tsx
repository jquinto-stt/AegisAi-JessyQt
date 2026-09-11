import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { Pedido, OperacionTab } from "../types";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Package,
  ShoppingBag,
  ArrowLeft,
  Truck,
  Phone,
  Search,
  CalendarDays,
  ExternalLink,
  Boxes,
  Layers,
} from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  CardFooter,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  SegmentedControl,
} from "@/elements";
import { useBusiness } from "@/context/BusinessContext";

export const ProgramadosView: React.FC<{
  onNavigateOpTab?: (t: OperacionTab) => void;
}> = ({ onNavigateOpTab }) => {
  const {
    programados,
    recurrences,
    injectScheduledOrderToLive,
    setSelectedOrderId,
  } = usePedidos();
  const { semantics } = useBusiness();

  const [dateFilter, setDateFilter] = useState<string>("TODOS");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const hoyList = programados.filter(p => p.scheduledDate === "Hoy");
  const mananaList = programados.filter(p => p.scheduledDate === "Mañana");
  const futuraList = programados.filter(p => p.scheduledDate !== "Hoy" && p.scheduledDate !== "Mañana");

  const totalAmountAll = programados.reduce((sum, p) => sum + p.total, 0);

  const handleInjectToFulfillment = (orderId: string, customerName: string) => {
    injectScheduledOrderToLive(orderId, true);
    showToast(`¡Pedido ${orderId} de ${customerName} trasladado a la cola activa de Alistamiento & Despacho!`);
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
    <div className="space-y-6 animate-fade-in">
      {/* Toast feedback */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#190088] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold border border-white/20 animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-[#97D6DF]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-white via-zinc-50 to-white dark:from-[#18181B] dark:via-[#202024] dark:to-[#18181B] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FF3F1A]/10 text-[#FF3F1A] flex items-center justify-center font-bold shadow-inner">
            <Calendar className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
                Entregas Programadas & Despachos Futuros
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF3F1A]/10 text-[#FF3F1A] border border-[#FF3F1A]/20">
                Agenda Comercial
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Planificación y anticipación operativa para pedidos corporativos, cotizaciones pactadas y entregas en fecha específica.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => onNavigateOpTab?.("en-vivo")}
            className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1 text-[#FF3F1A]" />
            <span>Volver a Órdenes</span>
          </Button>
        </div>
      </div>

      {/* 4 Planning KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Hoy */}
        <Card className="p-4 border-l-4 border-l-[#FF3F1A] bg-white dark:bg-[#18181B]">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
            <span>Programados Hoy</span>
            <Clock className="w-4 h-4 text-[#FF3F1A]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black font-mono text-zinc-900 dark:text-zinc-100">
              {hoyList.length}
            </span>
            <span className="text-[11px] font-bold text-[#FF3F1A] bg-[#FF3F1A]/10 px-2 py-0.5 rounded-full">
              Prioridad alta
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Despachos programados para la jornada de hoy</p>
        </Card>

        {/* KPI 2: Mañana */}
        <Card className="p-4 border-l-4 border-l-[#190088] dark:border-l-[#97D6DF] bg-white dark:bg-[#18181B]">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
            <span>Programados Mañana</span>
            <CalendarDays className="w-4 h-4 text-[#190088] dark:text-[#97D6DF]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black font-mono text-[#190088] dark:text-[#97D6DF]">
              {mananaList.length}
            </span>
            <span className="text-[11px] font-bold text-[#190088] dark:text-[#97D6DF] bg-[#190088]/10 dark:bg-[#97D6DF]/20 px-2 py-0.5 rounded-full">
              Próxima salida
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Órdenes agendadas para el día de mañana</p>
        </Card>

        {/* KPI 3: Esta Semana */}
        <Card className="p-4 border-l-4 border-l-amber-500 bg-white dark:bg-[#18181B]">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
            <span>Próximos Días / Futuros</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black font-mono text-zinc-900 dark:text-zinc-100">
              {futuraList.length}
            </span>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
              En agenda
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Entregas pactadas a mediano plazo</p>
        </Card>

        {/* KPI 4: Monto Consolidado */}
        <Card className="p-4 border-l-4 border-l-emerald-500 bg-white dark:bg-[#18181B]">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
            <span>Valor Consolidado</span>
            <Truck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              ${totalAmountAll.toLocaleString("es-CO")}
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              COP
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Facturación total de entregas pactadas</p>
        </Card>
      </div>

      {/* Toolbar: Search, Date Filter & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#18181B] p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por orden programada, cliente o ítem..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-[#FF3F1A]"
            />
          </div>

          {/* Date Range Tabs */}
          <div className="flex items-center gap-1.5">
            {[
              { id: "TODOS", label: `Todos (${programados.length})` },
              { id: "HOY", label: `Hoy (${hoyList.length})` },
              { id: "MANANA", label: `Mañana (${mananaList.length})` },
              { id: "FUTUROS", label: `Próximos Días (${futuraList.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDateFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  dateFilter === tab.id
                    ? "bg-[#190088] text-white shadow-2xs"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* View Switcher */}
        <SegmentedControl
          intent="programados.view"
          tone="contrast"
          value={viewMode}
          onValueChange={v => setViewMode(v as any)}
          options={[
            { value: "cards", label: "Tarjetas de Entrega" },
            { value: "table", label: "Planilla de Agenda" },
          ]}
        />
      </div>

      {/* Main Content Area */}
      {filteredList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
            No hay despachos programados con los filtros seleccionados
          </h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Puedes agendar despachos futuros desde las conversaciones de WhatsApp o creando una orden con fecha pactada.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        /* Cards View: Scheduled Delivery Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredList.map(order => {
            const isToday = order.scheduledDate === "Hoy";
            return (
              <Card
                key={order.id}
                className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                {/* Header */}
                <CardHeader className="p-4 pb-3 border-b border-zinc-100 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg bg-[#FF3F1A]/10 text-[#FF3F1A] border border-[#FF3F1A]/20">
                        {order.id}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {order.channel.toUpperCase()}
                      </span>
                    </div>

                    {/* Scheduled Badge */}
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                        isToday
                          ? "bg-[#FF3F1A]/10 text-[#FF3F1A] border-[#FF3F1A]/30"
                          : "bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] border-[#190088]/30"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{order.scheduledDate || "Fecha pactada"} {order.scheduledTime ? `a las ${order.scheduledTime}` : ""}</span>
                    </span>
                  </div>

                  {/* Customer & Destination */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate flex items-center justify-between">
                      <span>{order.customerName}</span>
                      <span className="font-mono text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                        ${order.total.toLocaleString("es-CO")} COP
                      </span>
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      <MapPin className="w-3.5 h-3.5 flex-none text-zinc-400" />
                      <span className="truncate">
                        {order.customerAddress || "Dirección pactada por confirmar"}
                      </span>
                    </div>
                    {order.customerPhone && (
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <Phone className="w-3 h-3 flex-none" />
                        <span>{order.customerPhone}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                {/* Body: Products & Notes */}
                <CardBody className="p-4 space-y-3 flex-1">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    <span>Productos a Entregar</span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-400">
                      {order.items.reduce((s, i) => s + i.quantity, 0)} unidades
                    </span>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/70 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono font-bold text-[#190088] dark:text-[#97D6DF]">×{it.quantity}</span>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{it.name}</span>
                        </div>
                        <span className="font-mono text-zinc-500 flex-none ml-2">
                          ${(it.quantity * it.unitPrice).toLocaleString("es-CO")}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
                      <strong>Instrucción Logística:</strong> {order.notes}
                    </div>
                  )}

                  {order.recurringFrequency && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#190088] dark:text-[#97D6DF] bg-[#190088]/5 p-2 rounded-lg border border-[#190088]/15">
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>Frecuencia Recurrente: {order.recurringFrequency}</span>
                    </div>
                  )}
                </CardBody>

                {/* Footer Actions */}
                <CardFooter className="p-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedOrderId(order.id)}
                    className="py-1.5 px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                  >
                    Ver Detalle
                  </Button>

                  <Button
                    variant="primary"
                    onClick={() => handleInjectToFulfillment(order.id, order.customerName)}
                    className="flex-1 py-1.5 px-3 text-xs font-bold bg-[#190088] hover:bg-[#14006e] text-white shadow-xs"
                  >
                    <Boxes className="w-3.5 h-3.5 mr-1 text-[#97D6DF]" />
                    <span>Pasar a Alistamiento</span>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View: Scheduled Orders */
        <Card className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 text-xs font-bold uppercase">
              <TableRow>
                <TableCell className="py-3 px-4">Orden</TableCell>
                <TableCell className="py-3 px-4">Fecha & Hora Pactada</TableCell>
                <TableCell className="py-3 px-4">Cliente</TableCell>
                <TableCell className="py-3 px-4">Dirección Destino</TableCell>
                <TableCell className="py-3 px-4">Contenido</TableCell>
                <TableCell className="py-3 px-4">Total</TableCell>
                <TableCell className="py-3 px-4 text-right">Acción Logística</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {filteredList.map(order => (
                <TableRow key={order.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <TableCell className="py-3.5 px-4 font-mono font-bold text-[#FF3F1A]">
                    {order.id}
                    <span className="block text-[10px] text-zinc-400 font-normal uppercase">{order.channel}</span>
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                      {order.scheduledDate || "Pactada"}
                    </span>
                    <span className="text-[11px] font-mono text-[#190088] dark:text-[#97D6DF]">
                      {order.scheduledTime || "Sin hora fija"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{order.customerName}</p>
                    <p className="text-[11px] text-zinc-400">{order.customerPhone}</p>
                  </TableCell>
                  <TableCell className="py-3.5 px-4 max-w-xs truncate text-zinc-600 dark:text-zinc-300">
                    {order.customerAddress || "Dirección pactada por confirmar"}
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {order.items.reduce((s, i) => s + i.quantity, 0)} unidades
                    </span>
                    <span className="block text-[11px] text-zinc-400 truncate max-w-[200px]">
                      {order.items.map(i => i.name).join(", ")}
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    ${order.total.toLocaleString("es-CO")}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-right">
                    <Button
                      variant="primary"
                      onClick={() => handleInjectToFulfillment(order.id, order.customerName)}
                      className="py-1 px-3 text-xs font-bold bg-[#190088] hover:bg-[#14006e] text-white"
                    >
                      <Boxes className="w-3.5 h-3.5 mr-1 text-[#97D6DF]" />
                      <span>Alistar Ahora</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};
