import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  BarChart2,
  TrendingUp,
  Clock,
  Sparkles,
  ShoppingBag,
  Award,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Zap,
  ChefHat,
  ShieldAlert,
  Users,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Flame,
  Package,
} from "lucide-react";
import { NectoBanner } from "../shared/NectoBanner";

export const AnaliticaView: React.FC = () => {
  const { kpis, products, orders } = usePedidos();

  const [activeMetricTab, setActiveMetricTab] = useState<"overview" | "sales" | "revenue">("overview");
  const [timeRange, setTimeRange] = useState("Esta Semana");

  // Chart-03 Dataset: Weekly Area Chart
  const areaChartData = [
    { label: "Lun", pedidos: 85, ingresos: 2550, completados: 82 },
    { label: "Mar", pedidos: 110, ingresos: 3300, completados: 106 },
    { label: "Mié", pedidos: 95, ingresos: 2850, completados: 92 },
    { label: "Jue", pedidos: 140, ingresos: 4200, completados: 135 },
    { label: "Vie", pedidos: 210, ingresos: 6300, completados: 204 },
    { label: "Sáb", pedidos: 245, ingresos: 7350, completados: 238 },
    { label: "Dom", pedidos: 180, ingresos: 5400, completados: 175 },
  ];

  // Chart-01 Dataset: Hourly Demand Bar Chart
  const hourlyData = [
    { hour: "11:00", comandas: 6, promedio: 4 },
    { hour: "12:00", comandas: 22, promedio: 18 },
    { hour: "13:00", comandas: 34, promedio: 25 },
    { hour: "14:00", comandas: 18, promedio: 14 },
    { hour: "15:00", comandas: 8, promedio: 6 },
    { hour: "19:00", comandas: 20, promedio: 16 },
    { hour: "20:00", comandas: 38, promedio: 28 },
    { hour: "21:00", comandas: 29, promedio: 22 },
    { hour: "22:00", comandas: 14, promedio: 10 },
  ];

  // Radial Progress: On-time Delivery
  const radialData = [
    {
      name: "Cumplimiento",
      value: 86.4,
      fill: "#190088",
    },
  ];

  // Channels Breakdown Dataset
  const channelsData = [
    { name: "WhatsApp (Necto IA)", value: 52, color: "#FF3F1A" },
    { name: "Portal Web Directo", value: 28, color: "#190088" },
    { name: "Mostrador Presencial", value: 14, color: "#10b981" },
    { name: "Teléfono Tradicional", value: 6, color: "#94a3b8" },
  ];

  // Station Bottlenecks Dataset
  const stationsData = [
    { station: "Horno", time: 12.4, target: 10, load: 88, status: "Cuello de Botella", color: "#ef4444" },
    { station: "Armado", time: 4.8, target: 5, load: 62, status: "Óptimo", color: "#10b981" },
    { station: "Empaque", time: 2.9, target: 3, load: 45, status: "Fluido", color: "#3b82f6" },
    { station: "Caja/Despacho", time: 1.8, target: 2, load: 35, status: "Fluido", color: "#8b5cf6" },
  ];

  // Cancellation and Rejection Reasons Dataset
  const cancellationReasons = [
    { reason: "Falta de stock de sabor en catálogo", pct: 42, count: 18, color: "#FF3F1A" },
    { reason: "Demora estimada no aceptada por cliente", pct: 28, count: 12, color: "#f59e0b" },
    { reason: "Fuera de radio de cobertura", pct: 18, count: 8, color: "#190088" },
    { reason: "Cancelación voluntaria del cliente", pct: 12, count: 5, color: "#64748b" },
  ];

  // Channel Ticket & Retention Breakdown
  const channelTicketData = [
    { channel: "WhatsApp (Necto IA)", ticket: 14200, orders: 156, growth: "+18%", icon: Sparkles },
    { channel: "Portal Web Directo", ticket: 12800, orders: 84, growth: "+12%", icon: ShoppingBag },
    { channel: "Mostrador Presencial", ticket: 8400, orders: 42, growth: "+5%", icon: Users },
    { channel: "Teléfono Tradicional", ticket: 9500, orders: 18, growth: "-3%", icon: Clock },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xl text-xs space-y-1">
          <p className="font-extrabold text-gray-900 dark:text-gray-100">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="font-semibold" style={{ color: entry.color }}>
              {entry.name}:{" "}
              <strong>
                {entry.name === "Ingresos ($k)" ? `$${entry.value}k` : entry.value}
              </strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <NectoBanner
        icon={<BarChart2 className="w-6 h-6 text-[#FF3F1A]" />}
        title="Analítica y Métricas de Rendimiento"
        description="Visualizaciones dinámicas del rendimiento comercial, tiempos en cocina, embudo de incidencias y precisión IA."
        actionNode={
          <div className="flex bg-slate-100 dark:bg-gray-800 p-1 rounded-2xl border border-slate-200 dark:border-gray-700 text-xs font-bold shadow-xs">
            {["Hoy", "Esta Semana", "Este Mes"].map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                  timeRange === r
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs font-extrabold"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        }
      />

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Ventas Totales Proyectadas",
            value: `$${(kpis.ingresosTotales / 1000).toFixed(0)}k`,
            delta: "+14.8%",
            isPositive: true,
            desc: "vs. semana anterior",
            icon: <DollarSign className="w-4 h-4 text-[#FF3F1A]" />,
            color: "border-t-[#FF3F1A]",
          },
          {
            title: "Comandas Procesadas",
            value: kpis.pedidosHoy,
            delta: "+9.2%",
            isPositive: true,
            desc: "112 completadas con éxito",
            icon: <ShoppingBag className="w-4 h-4 text-[#190088] dark:text-indigo-400" />,
            color: "border-t-[#190088]",
          },
          {
            title: "Tiempo Promedio en Cocina",
            value: `${kpis.tiempoPromedioPrep} min`,
            delta: "-1.4 min",
            isPositive: true,
            desc: "Optimizado gracias al KDS",
            icon: <Clock className="w-4 h-4 text-emerald-500" />,
            color: "border-t-emerald-500",
          },
          {
            title: "Efectividad Asistente IA",
            value: "92.5%",
            delta: "+4.1%",
            isPositive: true,
            desc: "Aprobados sin corrección manual",
            icon: <Bot className="w-4 h-4 text-amber-500 animate-pulse" />,
            color: "border-t-amber-500",
          },
        ].map((card, i) => (
          <div
            key={i}
            className={`bg-white dark:bg-[#2C2D31] rounded-2xl border-2 border-t-4 ${card.color} border-slate-200/90 dark:border-[#374151] p-5 shadow-xs space-y-3 hover:shadow-md transition-all hover:scale-[1.01]`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {card.title}
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-gray-800 flex items-center justify-center">
                {card.icon}
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <p className="text-2xl sm:text-3xl font-black font-mono text-gray-900 dark:text-gray-100">
                {card.value}
              </p>
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-black px-2 py-0.5 rounded-full ${
                  card.isPositive
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {card.isPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {card.delta}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Weekly Area Curve */}
      <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100">
              Evolución Semanal de Comandas & Ingresos
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Comparativa de volumen de pedidos vs. facturación diaria estimada
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-gray-800 p-1 rounded-xl border border-slate-200 dark:border-gray-700 text-xs font-bold">
              <button
                onClick={() => setActiveMetricTab("overview")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMetricTab === "overview"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs font-black"
                    : "text-gray-500"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveMetricTab("sales")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMetricTab === "sales"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs font-black"
                    : "text-gray-500"
                }`}
              >
                Comandas
              </button>
              <button
                onClick={() => setActiveMetricTab("revenue")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMetricTab === "revenue"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs font-black"
                    : "text-gray-500"
                }`}
              >
                Ingresos
              </button>
            </div>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPedidos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF3F1A" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#FF3F1A" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#190088" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#190088" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
              />
              <Tooltip content={<CustomTooltip />} />
              {(activeMetricTab === "overview" || activeMetricTab === "sales") && (
                <Area
                  type="monotone"
                  dataKey="pedidos"
                  name="Comandas"
                  stroke="#FF3F1A"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorPedidos)"
                  isAnimationActive={true}
                  animationDuration={1000}
                />
              )}
              {(activeMetricTab === "overview" || activeMetricTab === "revenue") && (
                <Area
                  type="monotone"
                  dataKey="completados"
                  name="Completados"
                  stroke="#190088"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#colorIngresos)"
                  isAnimationActive={true}
                  animationDuration={1200}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NEW MODULE 1: Kitchen Station Bottlenecks & Hourly Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kitchen Station Load & Bottleneck Diagnosis */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-[#FF3F1A]" />
                Rendimiento y Tiempos por Estación de Cocina
              </h4>
              <p className="text-xs text-gray-400">Diagnóstico en tiempo real para balanceo de brigada</p>
            </div>
            <span className="text-xs font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-red-500" />
              Horno saturado
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {stationsData.map(s => (
              <div
                key={s.station}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-800/70 border border-slate-200/80 dark:border-gray-700/80 space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 dark:text-gray-100 font-extrabold">{s.station}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        s.load > 75
                          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      {s.status} ({s.load}% carga)
                    </span>
                  </div>
                  <div className="font-mono text-gray-500">
                    <span className="text-gray-900 dark:text-gray-100 font-black">{s.time} min</span> / meta {s.target} min
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${s.load}%`,
                      backgroundColor: s.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 text-xs text-orange-900 dark:text-orange-200 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-[#FF3F1A] flex-none mt-0.5" />
            <p>
              <strong>Recomendación Operativa:</strong> Reasignar 1 cocinero de la estación de Armado al Horno para reducir el tiempo de cocción en ~3.2 minutos.
            </p>
          </div>
        </div>

        {/* Hourly Distribution Bar Chart */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FF3F1A]" />
                Distribución por Horarios y Picos de Demanda
              </h4>
              <p className="text-xs text-gray-400">Picos clave a las 13:00 (Almuerzo) y 20:00 (Cena)</p>
            </div>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-950 px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-800">
              Pico 38 comandas
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="hour"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="comandas"
                  name="Comandas"
                  fill="#FF3F1A"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={1200}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* NEW MODULE 2: Conversion & Cancellation Funnel + Ticket Average Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Causes of Rejection & Cancellation */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                Auditoría de Cancelaciones & Rechazos
              </h4>
              <p className="text-xs text-gray-400">Tasa de efectividad de comanda: 94.2%</p>
            </div>
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              5.8% Fricción
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {cancellationReasons.map(r => (
              <div key={r.reason} className="space-y-1 text-xs">
                <div className="flex justify-between font-bold">
                  <span className="text-gray-700 dark:text-gray-300">{r.reason}</span>
                  <span className="font-mono text-gray-900 dark:text-gray-100 font-extrabold">
                    {r.count} ({r.pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${r.pct}%`, backgroundColor: r.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 flex justify-between items-center text-xs">
            <span className="text-gray-500 font-bold">Mitigación Principal:</span>
            <span className="font-extrabold text-[#190088] dark:text-indigo-400">
              Sincronización automática de stock en catálogo
            </span>
          </div>
        </div>

        {/* Ticket Average & Loyalty Comparison per Channel */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#190088] dark:text-indigo-400" />
                Ticket Promedio & Fidelización por Canal
              </h4>
              <p className="text-xs text-gray-400">WhatsApp lidera en pedidos de docenas y combos</p>
            </div>
            <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              68% Recurrentes
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {channelTicketData.map(ch => {
              const IconComponent = ch.icon;
              return (
                <div
                  key={ch.channel}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-800/80 border border-slate-200/80 dark:border-gray-700 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                      {ch.channel}
                    </span>
                    <IconComponent className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-black font-mono text-gray-900 dark:text-gray-100">
                      ${ch.ticket.toLocaleString("es-CL")}
                    </span>
                    <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                      {ch.growth}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold">{ch.orders} comandas en el período</p>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between text-xs">
            <span className="font-bold text-indigo-900 dark:text-indigo-200">
              Proporción de Clientes:
            </span>
            <div className="flex items-center gap-3 font-bold font-mono">
              <span className="text-emerald-600">68% Recurrentes</span>
              <span className="text-gray-400">·</span>
              <span className="text-indigo-600 dark:text-indigo-400">32% Nuevos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Channels Donut + Top Ranking Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Animated Donut Chart (Channels Breakdown) */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] p-5 sm:p-6 shadow-xs space-y-4">
          <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#FF3F1A]" /> Distribución por Canales de Entrada
          </h4>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-44 w-44 flex-none">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                    isAnimationActive={true}
                    animationDuration={1000}
                  >
                    {channelsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 flex-1 w-full text-xs">
              {channelsData.map(c => (
                <div
                  key={c.name}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-gray-800/80 border border-slate-100 dark:border-gray-700/60"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="font-bold text-gray-800 dark:text-gray-200">{c.name}</span>
                  </div>
                  <span className="font-mono font-black">{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Ranking Products */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] p-5 sm:p-6 shadow-xs space-y-4">
          <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" /> Top Productos Más Vendidos
          </h4>

          <div className="space-y-2.5 text-xs">
            {products.slice(0, 4).map((p, i) => (
              <div
                key={p.id}
                className="bg-slate-50 dark:bg-gray-800/80 p-3 rounded-xl flex items-center justify-between border border-slate-100 dark:border-gray-700 hover:scale-[1.01] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-orange-100 text-[#FF3F1A] font-black text-xs flex items-center justify-center flex-none">
                    #{i + 1}
                  </span>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-gray-100">{p.name}</p>
                    <p className="text-gray-400 font-mono">${p.price.toLocaleString("es-CL")}</p>
                  </div>
                </div>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg font-mono">
                  {120 - i * 25} unid.
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
