import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  MessageCircle,
  Globe,
  Store,
  Phone,
  BarChart2,
  Calendar,
  Layers,
  ChefHat,
  Flame,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { GestionTab } from "../types";
import { Button } from "@/elements";

export const ResumenDashboardView: React.FC<{ onNavigateGestion?: (tab: GestionTab) => void }> = ({
  onNavigateGestion,
}) => {
  const { kpis, products, orders } = usePedidos();
  const [chartView, setChartView] = useState<"revenue" | "hourly">("revenue");
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "30d">("7d");

  // Revenue trend data
  const revenueTrend = [
    { day: "Lun", ventas: 2450, pedidos: 34 },
    { day: "Mar", ventas: 3120, pedidos: 42 },
    { day: "Mié", ventas: 2890, pedidos: 38 },
    { day: "Jue", ventas: 4200, pedidos: 56 },
    { day: "Vie", ventas: 6850, pedidos: 84 },
    { day: "Sáb", ventas: 7920, pedidos: 96 },
    { day: "Dom", ventas: 5400, pedidos: 68 },
  ];

  // Hourly demand data
  const hourlyData = [
    { hour: "11:00", comandas: 6, promedio: 4 },
    { hour: "12:00", comandas: 24, promedio: 18 },
    { hour: "13:00", comandas: 38, promedio: 26 },
    { hour: "14:00", comandas: 20, promedio: 15 },
    { hour: "15:00", comandas: 8, promedio: 6 },
    { hour: "19:00", comandas: 22, promedio: 16 },
    { hour: "20:00", comandas: 42, promedio: 30 },
    { hour: "21:00", comandas: 32, promedio: 24 },
    { hour: "22:00", comandas: 14, promedio: 10 },
  ];

  // Top products
  const topProducts = [...products]
    .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
    .slice(0, 4);

  // Channels 360° Intelligence
  const channelMetrics = [
    {
      channel: "WhatsApp IA",
      ticket: 14200,
      orders: 156,
      revenue: "$ 2.215.200",
      pct: 54,
      growth: "+18.4%",
      icon: <MessageCircle className="w-4 h-4 text-[#FF3F1A]" />,
      color: "bg-[#FF3F1A]",
    },
    {
      channel: "Portal Web Directo",
      ticket: 12800,
      orders: 84,
      revenue: "$ 1.075.200",
      pct: 28,
      growth: "+12.1%",
      icon: <Globe className="w-4 h-4 text-[#190088] dark:text-[#97D6DF]" />,
      color: "bg-[#190088] dark:bg-[#97D6DF]",
    },
    {
      channel: "Mostrador / Salón",
      ticket: 8400,
      orders: 42,
      revenue: "$ 352.800",
      pct: 12,
      growth: "+5.2%",
      icon: <Store className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />,
      color: "bg-zinc-600 dark:bg-zinc-400",
    },
    {
      channel: "Atención Telefónica",
      ticket: 9500,
      orders: 18,
      revenue: "$ 171.000",
      pct: 6,
      growth: "-2.8%",
      icon: <Phone className="w-4 h-4 text-zinc-400" />,
      color: "bg-zinc-400",
    },
  ];

  // Station Bottlenecks
  const stationsData = [
    { station: "Horno / Cocción", time: "12.4 min", target: "10 min", load: 88, status: "Alta Carga", isWarning: true },
    { station: "Armado / Mise en place", time: "4.8 min", target: "5 min", load: 62, status: "Óptimo", isWarning: false },
    { station: "Empaque & Despacho", time: "2.9 min", target: "3 min", load: 45, status: "Fluido", isWarning: false },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-950 text-white p-3 rounded-2xl border border-zinc-800 shadow-xl text-xs space-y-1">
          <p className="font-bold text-zinc-400">{label}</p>
          {chartView === "revenue" ? (
            <>
              <p className="text-sm font-extrabold text-[#FF3F1A]">
                ${payload[0]?.value?.toLocaleString()}k
              </p>
              <p className="text-[11px] text-zinc-300">
                {payload[0]?.payload?.pedidos} comandas registradas
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-extrabold text-[#FF3F1A]">
                {payload[0]?.value} comandas
              </p>
              <p className="text-[11px] text-zinc-400">
                Promedio habitual: {payload[0]?.payload?.promedio}
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ventas Totales */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Ventas Totales
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FF3F1A] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                ${(kpis.ingresosTotales / 1000).toFixed(0)}k
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> +14.2%
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">vs. período anterior ($2.8M)</p>
          </div>
        </div>

        {/* KPI 2: Comandas */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Comandas Procesadas
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FF3F1A] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                {kpis.pedidosHoy}
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> +8.5%
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1 font-medium">
              <span>{kpis.completados} despachados</span>
              <span>•</span>
              <span className="text-[#FF3F1A] font-bold">{kpis.enProceso} en cocina</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Ticket Promedio */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Ticket Promedio
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FF3F1A] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                ${(kpis.ticketPromedio / 1000).toFixed(1)}k
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> +4.1%
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Mayor gasto en WhatsApp IA</p>
          </div>
        </div>

        {/* KPI 4: Tiempo Promedio de Entrega */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Tiempo Promedio
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FF3F1A] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                18.4 min
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <ArrowDownRight className="w-3.5 h-3.5" /> -2.1m
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Meta del local: &lt;20 min</p>
          </div>
        </div>
      </div>

      {/* Main Chart Section: Switcher between Weekly Revenue & Peak Hours Demand */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-zinc-950 dark:text-white">
              {chartView === "revenue"
                ? "Evolución de Ingresos y Tendencia de Facturación"
                : "Demanda por Franja Horaria (Horas Pico de Cocina)"}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {chartView === "revenue"
                ? "Comportamiento del volumen de ventas y pedidos por día"
                : "Concentración de pedidos por hora para optimizar turnos y mise en place"}
            </p>
          </div>

          {/* Chart Toggle Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 text-xs font-bold self-start sm:self-auto">
            <button
              onClick={() => setChartView("revenue")}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                chartView === "revenue"
                  ? "bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white shadow-xs font-bold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Curva de Ventas ($)
            </button>
            <button
              onClick={() => setChartView("hourly")}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                chartView === "hourly"
                  ? "bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white shadow-xs font-bold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Horas Pico (KDS)
            </button>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartView === "revenue" ? (
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="nectoOrange" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF3F1A" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#FF3F1A" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  stroke="#71717A"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: "#E4E4E7", strokeWidth: 1 }}
                />
                <YAxis
                  stroke="#71717A"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="ventas"
                  stroke="#FF3F1A"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#nectoOrange)"
                />
              </AreaChart>
            ) : (
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="hour"
                  stroke="#71717A"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: "#E4E4E7", strokeWidth: 1 }}
                />
                <YAxis
                  stroke="#71717A"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="comandas"
                  fill="#FF3F1A"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Intelligence Grid: Channels Breakdown 360° */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-zinc-950 dark:text-white">
              Rendimiento Comercial & Facturación por Canal
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Desglose de facturación, volumen y ticket medio de cada canal de venta
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {channelMetrics.map(cm => (
            <div
              key={cm.channel}
              className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200/70 dark:border-zinc-800/70 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center shadow-2xs">
                    {cm.icon}
                  </div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{cm.channel}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  {cm.growth}
                </span>
              </div>

              <div>
                <p className="text-lg font-black text-zinc-950 dark:text-white">{cm.revenue}</p>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                  <span>{cm.orders} pedidos ({cm.pct}%)</span>
                  <span>Ticket: ${cm.ticket.toLocaleString()}</span>
                </div>
              </div>

              <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                <div className={`h-full rounded-full ${cm.color}`} style={{ width: `${cm.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column Section: Top Products & Kitchen Station Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Platos Más Vendidos */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-zinc-950 dark:text-white">
                Platos & Productos Más Vendidos
              </h4>
              <p className="text-xs text-zinc-500 mt-0.5">
                Volumen y facturación generada por receta
              </p>
            </div>
            <Button
              variant="ghost"
              intent="analytics.view.history"
              onClick={() => onNavigateGestion && onNavigateGestion("historial")}
              className="p-0 text-xs font-bold text-[#FF3F1A] hover:underline cursor-pointer"
            >
              Auditoría completa →
            </Button>
          </div>

          <div className="space-y-3 pt-2">
            {topProducts.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200/70 dark:border-zinc-800/70"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex-none">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs text-zinc-400">
                        #{idx + 1}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-950 dark:text-white truncate">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {p.salesCount || 18} ventas · ${(p.price || 0).toLocaleString()} c/u
                    </p>
                  </div>
                </div>

                <div className="text-right flex-none">
                  <p className="text-xs font-extrabold text-zinc-950 dark:text-white">
                    ${((p.price || 0) * (p.salesCount || 18)).toLocaleString()}
                  </p>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    +{(12 - idx * 2)}% hoy
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Eficiencia de Cocina & Estaciones */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs space-y-4">
          <div>
            <h4 className="text-sm font-bold text-zinc-950 dark:text-white">
              Eficiencia de Cocina & Tiempos KDS
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Tiempos reales de preparación por estación vs. objetivo
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {stationsData.map(st => (
              <div
                key={st.station}
                className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-zinc-950 dark:text-white">{st.station}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Objetivo: {st.target}</p>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-bold ${st.isWarning ? "text-[#FF3F1A]" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {st.time}
                  </span>
                  <span className="block text-[10px] text-zinc-400">{st.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
