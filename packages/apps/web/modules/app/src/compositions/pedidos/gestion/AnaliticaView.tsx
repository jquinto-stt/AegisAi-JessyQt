import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Clock,
  Sparkles,
  ShoppingBag,
  Users,
  DollarSign,
  Flame,
  ArrowUpRight,
  MessageCircle,
  Globe,
  Store,
  Phone,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/elements";

export const AnaliticaView: React.FC = () => {
  const { kpis, products } = usePedidos();
  const [timeRange, setTimeRange] = useState("7d");

  // Hourly demand dataset
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

  // Channel metrics
  const channelMetrics = [
    {
      channel: "WhatsApp IA",
      ticket: 14200,
      orders: 156,
      revenue: "$ 2.215.200",
      growth: "+18.4%",
      icon: <MessageCircle className="w-4 h-4 text-[#FF3F1A]" />,
      color: "#FF3F1A",
    },
    {
      channel: "Portal Web Directo",
      ticket: 12800,
      orders: 84,
      revenue: "$ 1.075.200",
      growth: "+12.1%",
      icon: <Globe className="w-4 h-4 text-[#190088] dark:text-[#97D6DF]" />,
      color: "#190088",
    },
    {
      channel: "Mostrador / Salón",
      ticket: 8400,
      orders: 42,
      revenue: "$ 352.800",
      growth: "+5.2%",
      icon: <Store className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />,
      color: "#71717A",
    },
    {
      channel: "Atención Telefónica",
      ticket: 9500,
      orders: 18,
      revenue: "$ 171.000",
      growth: "-2.8%",
      icon: <Phone className="w-4 h-4 text-zinc-400" />,
      color: "#A1A1AA",
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
          <p className="text-sm font-extrabold text-[#FF3F1A]">
            {payload[0]?.value} comandas
          </p>
          <p className="text-[11px] text-zinc-400">
            Promedio histórico: {payload[0]?.payload?.promedio}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-base font-bold text-zinc-950 dark:text-white">
            Rendimiento Comercial & Análisis de Canales
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Comportamiento de la demanda, cuellos de botella y rentabilidad por canal
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold">
          {[
            { id: "today", label: "Hoy" },
            { id: "7d", label: "7 Días" },
            { id: "30d", label: "30 Días" },
            { id: "month", label: "Este Mes" },
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setTimeRange(r.id)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeRange === r.id
                  ? "bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Channels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {channelMetrics.map(cm => (
          <div
            key={cm.channel}
            className="p-5 rounded-3xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  {cm.icon}
                </div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{cm.channel}</span>
              </div>
              <span className={`text-[10px] font-bold ${cm.growth.startsWith("+") ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                {cm.growth}
              </span>
            </div>

            <div>
              <p className="text-xl font-black text-zinc-950 dark:text-white">{cm.revenue}</p>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                <span>{cm.orders} pedidos</span>
                <span>Ticket: ${cm.ticket.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hourly Demand Bar Chart */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-zinc-950 dark:text-white">
              Demanda de Comandas por Franja Horaria (Horas Pico)
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Identificación de picos de cocina para optimizar turnos y preparación
            </p>
          </div>
          <span className="text-xs font-bold text-[#FF3F1A] bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-900/60">
            Pico Mayor: 20:00 hs (42 comandas)
          </span>
        </div>

        <div className="h-64 sm:h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
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
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom 2 Columns: Kitchen Bottlenecks & Order Loss Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kitchen Bottlenecks */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs space-y-4">
          <div>
            <h4 className="text-sm font-bold text-zinc-950 dark:text-white">
              Eficiencia de Estaciones en Cocina
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Tiempos de permanencia en KDS vs. objetivo ideal
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

        {/* Motivos de Cancelación / Fricción */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs space-y-4">
          <div>
            <h4 className="text-sm font-bold text-zinc-950 dark:text-white">
              Auditoría de Fricción y Cancelaciones
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Motivos principales de comandas no concretadas
            </p>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between">
              <span className="text-zinc-800 dark:text-zinc-200 font-medium">Falta de stock de sabor en catálogo</span>
              <span className="font-bold text-[#FF3F1A]">42% (18 casos)</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between">
              <span className="text-zinc-800 dark:text-zinc-200 font-medium">Demora estimada no aceptada por cliente</span>
              <span className="font-bold text-zinc-700 dark:text-zinc-300">28% (12 casos)</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between">
              <span className="text-zinc-800 dark:text-zinc-200 font-medium">Fuera de radio de cobertura de delivery</span>
              <span className="font-bold text-zinc-700 dark:text-zinc-300">18% (8 casos)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
