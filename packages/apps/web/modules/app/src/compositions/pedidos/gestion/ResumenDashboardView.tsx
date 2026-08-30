import React from "react";
import { usePedidos } from "../context/PedidosContext";
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Layers,
  Package,
  BarChart2,
  Star,
  Users,
  Flame,
  MessageCircle,
  Globe,
  Store,
  Phone,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  ChevronRight,
  Activity,
} from "lucide-react";
import { GestionTab } from "../types";
import { NectoBanner } from "../shared/NectoBanner";

export const ResumenDashboardView: React.FC<{ onNavigateGestion: (tab: GestionTab) => void }> = ({
  onNavigateGestion,
}) => {
  const {
    kpis,
    incidencias,
    products,
    ingredients,
    shiftInfo,
    orders,
    automations,
    setSelectedOrderId,
    setIsIncidenciasOpen,
  } = usePedidos();

  const activeInc = incidencias.filter(i => !i.isResolved);

  // Top 4 most ordered products with real photos & rankings
  const topProducts = [...products]
    .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
    .slice(0, 4);

  // Channel breakdown metrics calculation
  const channelCounts = {
    whatsapp: orders.filter(o => o.channel === "whatsapp").length,
    web: orders.filter(o => o.channel === "web").length,
    presencial: orders.filter(o => o.channel === "presencial").length,
    telefono: orders.filter(o => o.channel === "telefono").length,
  };
  const totalOrdersCount = orders.length || 1;

  const channelsData = [
    {
      id: "whatsapp",
      name: "WhatsApp IA",
      count: channelCounts.whatsapp,
      percent: Math.round((channelCounts.whatsapp / totalOrdersCount) * 100),
      accentColor: "#10B981",
      badgeClass: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
      progressClass: "bg-emerald-500",
      icon: <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    },
    {
      id: "web",
      name: "Portal Web Directo",
      count: channelCounts.web,
      percent: Math.round((channelCounts.web / totalOrdersCount) * 100),
      accentColor: "#190088",
      badgeClass: "bg-indigo-50 dark:bg-indigo-950/60 text-[#190088] dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800",
      progressClass: "bg-[#190088] dark:bg-indigo-500",
      icon: <Globe className="w-4 h-4 text-[#190088] dark:text-indigo-300" />,
    },
    {
      id: "presencial",
      name: "Mostrador / Salón",
      count: channelCounts.presencial,
      percent: Math.round((channelCounts.presencial / totalOrdersCount) * 100),
      accentColor: "#FF3F1A",
      badgeClass: "bg-orange-50 dark:bg-orange-950/60 text-[#FF3F1A] dark:text-orange-300 border border-orange-200 dark:border-orange-800",
      progressClass: "bg-[#FF3F1A]",
      icon: <Store className="w-4 h-4 text-[#FF3F1A]" />,
    },
    {
      id: "telefono",
      name: "Atención Telefónica",
      count: channelCounts.telefono,
      percent: Math.round((channelCounts.telefono / totalOrdersCount) * 100),
      accentColor: "#64748B",
      badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
      progressClass: "bg-slate-600 dark:bg-slate-400",
      icon: <Phone className="w-4 h-4 text-slate-600 dark:text-slate-300" />,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <NectoBanner
        icon={<TrendingUp className="w-6 h-6 text-[#FF3F1A]" />}
        title="Dashboard de Pedidos & Control Central"
        description="Monitoreo consolidado de métricas clave, platos más vendidos, capacidad de cocina y canales de comanda."
      />

      {/* Top Executive KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Pedidos Hoy */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Comandas Hoy
            </span>
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FF3F1A] flex items-center justify-center">
              <ShoppingBag className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-black text-gray-900 dark:text-gray-100 font-mono">
              {kpis.pedidosHoy}
            </p>
            <span className="text-xs font-bold text-gray-900 dark:text-white bg-slate-100 dark:bg-gray-800 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3 text-[#FF3F1A]" /> +14%
            </span>
          </div>
          <div className="pt-1 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-400 font-medium">
            <span>{kpis.completados} despachados</span>
            <span>{kpis.enProceso} en cocina</span>
          </div>
        </div>

        {/* KPI 2: Ingresos Totales */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Ventas del Día
            </span>
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FF3F1A] flex items-center justify-center">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-black text-[#FF3F1A] font-mono">
              ${(kpis.ingresosTotales / 1000).toFixed(0)}k
            </p>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              Ticket: ${(kpis.ticketPromedio / 1000).toFixed(1)}k
            </span>
          </div>
          <div className="pt-1 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-400 font-medium">
            <span>Meta diaria: $3.2M</span>
            <span className="text-gray-900 dark:text-white font-bold">88% logrado</span>
          </div>
        </div>

        {/* KPI 3: Tiempo Promedio Preparación */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Tiempo Promedio Prep.
            </span>
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-black text-gray-900 dark:text-gray-100 font-mono">
              {kpis.tiempoPromedioPrep} <span className="text-sm font-normal text-gray-400">min</span>
            </p>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-slate-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              Meta: &lt;18m
            </span>
          </div>
          <div className="pt-1 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-400 font-medium">
            <span>Despacho más rápido: 9m</span>
            <span>Máximo hoy: 23m</span>
          </div>
        </div>

        {/* KPI 4: Nivel de Satisfacción */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-[#374151] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Satisfacción Clientes
            </span>
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
              <Star className="w-4.5 h-4.5 text-[#FF3F1A]" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-1.5">
              <p className="text-3xl font-black text-gray-900 dark:text-gray-100 font-mono">
                4.9
              </p>
              <span className="text-xs font-bold text-[#FF3F1A] font-mono">★</span>
            </div>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              589 opiniones
            </span>
          </div>
          <div className="pt-1 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-400 font-medium">
            <span>98.2% positivas</span>
            <span className="text-[#FF3F1A] font-bold">Excelente</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: Platos Más Populares con su Acceso Directo a Catálogo */}
      <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border border-slate-200/90 dark:border-[#374151] p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-[#374151] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-[#FF3F1A] flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-gray-100 tracking-tight">
                Platos Estrella & Más Vendidos
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Productos con mayor rotación en cocina, fotografías reales y calificación verificada.
              </p>
            </div>
          </div>

          {/* Botón contextual a Catálogo de Productos */}
          <div className="flex items-center gap-2">
            {/* Botón contextual a Insumos & Stock */}
            <button
              onClick={() => onNavigateGestion("insumos")}
              className="p-2.5 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700 text-left flex items-center gap-3 transition-all cursor-pointer group shadow-xs"
            >
              <div className="w-7 h-7 rounded-xl bg-orange-50 dark:bg-orange-950/80 flex items-center justify-center">
                <Package className="w-4 h-4 text-[#FF3F1A]" />
              </div>
              <div>
                <p className="font-extrabold text-xs text-gray-900 dark:text-gray-100 group-hover:text-[#FF3F1A] transition-colors">
                  Insumos & Stock
                </p>
                <p className="text-[10px] text-gray-400">
                  {ingredients.filter(i => i.status === "CRITICO" || i.status === "AGOTADO").length} en alerta crítica
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#FF3F1A] group-hover:translate-x-0.5 transition-all ml-1" />
            </button>

            {/* Botón contextual a Catálogo de Productos */}
            <button
              onClick={() => onNavigateGestion("catalogo")}
              className="p-2.5 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700 text-left flex items-center gap-3 transition-all cursor-pointer group shadow-xs"
            >
              <div className="w-7 h-7 rounded-xl bg-orange-50 dark:bg-orange-950/80 flex items-center justify-center">
                <Layers className="w-4 h-4 text-[#FF3F1A]" />
              </div>
              <div>
                <p className="font-extrabold text-xs text-gray-900 dark:text-gray-100 group-hover:text-[#FF3F1A] transition-colors">
                  Catálogo de Productos
                </p>
                <p className="text-[10px] text-gray-400">
                  {products.length} platos · {products.filter(p => !p.isAvailable).length} pausados
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#FF3F1A] group-hover:translate-x-0.5 transition-all ml-1" />
            </button>
          </div>
        </div>

        {/* Top Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {topProducts.map((prod, idx) => (
            <div
              key={prod.id}
              onClick={() => onNavigateGestion("catalogo")}
              className="group bg-slate-50 dark:bg-gray-800/80 rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden hover:border-[#FF3F1A] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              {/* Product Photo */}
              <div className="relative h-36 w-full overflow-hidden bg-slate-200 dark:bg-gray-700">
                <img
                  src={prod.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"}
                  alt={prod.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Ranking Tag */}
                <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md text-amber-300 px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 shadow-sm">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>#{idx + 1} Más Pedido</span>
                </div>

                {/* Price Tag */}
                <div className="absolute bottom-2.5 right-2.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md text-gray-900 dark:text-white px-2.5 py-0.5 rounded-lg text-xs font-mono font-black shadow-sm">
                  ${prod.price.toLocaleString("es-CO")}
                </div>
              </div>

              {/* Product Content */}
              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-extrabold text-xs text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-[#FF3F1A] transition-colors">
                    {prod.name}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                    {prod.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-gray-700/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span className="font-mono text-gray-800 dark:text-gray-200">{prod.rating || 4.9}</span>
                    <span className="text-[10px] text-gray-400">({prod.reviewsCount || 85})</span>
                  </div>

                  <span className="text-[11px] font-extrabold text-[#190088] dark:text-blue-400 font-mono">
                    {prod.salesCount || 120} pedidos
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN 2: Canales de Venta & Capacidad de Cocina (Rediseñados con Alta Colorimetría) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canales de Venta */}
        <div className="lg:col-span-2 bg-white dark:bg-[#2C2D31] rounded-3xl border border-slate-200/90 dark:border-[#374151] p-6 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-[#374151] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-[#190088] dark:text-indigo-400 flex items-center justify-center">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">
                    Desglose de Pedidos por Canal
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Participación porcentual y volumen de comandas recibidas hoy.
                  </p>
                </div>
              </div>

              {/* Botón contextual a Analítica */}
              <button
                onClick={() => onNavigateGestion("analitica")}
                className="p-2 px-3.5 rounded-2xl bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-left flex items-center gap-2.5 transition-all cursor-pointer group shadow-xs"
              >
                <BarChart2 className="w-4 h-4 text-[#190088] dark:text-indigo-300" />
                <span className="font-extrabold text-xs text-[#190088] dark:text-indigo-300">
                  Analítica de Rendimiento
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#190088] dark:text-indigo-300 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Channel Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {channelsData.map(ch => (
                <div
                  key={ch.id}
                  className="bg-slate-50/90 dark:bg-gray-800/80 rounded-2xl p-4 border border-slate-200/80 dark:border-gray-700/80 space-y-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-900 shadow-xs border border-slate-200 dark:border-gray-700 flex items-center justify-center">
                        {ch.icon}
                      </div>
                      <span className="font-extrabold text-xs text-gray-900 dark:text-gray-100">
                        {ch.name}
                      </span>
                    </div>

                    <span className={`font-mono font-black text-xs px-2.5 py-1 rounded-xl ${ch.badgeClass}`}>
                      {ch.count} {ch.count === 1 ? "comanda" : "comandas"}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
                      <span>Participación del total</span>
                      <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{ch.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-200/90 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${ch.progressClass} rounded-full transition-all duration-500`}
                        style={{ width: `${ch.percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Capacidad Operativa de Cocina */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border border-slate-200/90 dark:border-[#374151] p-6 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#374151] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center">
                  <Users className="w-4.5 h-4.5 text-[#190088] dark:text-indigo-400" />
                </div>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">
                  Capacidad de Cocina
                </h3>
              </div>
              <span className="text-xs font-black text-amber-700 bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 px-3 py-0.5 rounded-full">
                {shiftInfo.capacityStatus}
              </span>
            </div>

            {/* Meter Bar */}
            <div className="bg-slate-50 dark:bg-gray-800/80 rounded-2xl p-4 border border-slate-200/80 dark:border-gray-700/80 space-y-2.5">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-gray-900 dark:text-gray-100 font-mono">
                    {shiftInfo.capacityPercent}%
                  </span>
                  <span className="text-[11px] font-bold text-gray-400">de ocupación</span>
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-300 font-extrabold font-mono">
                  {orders.filter(o => ["CONFIRMADO", "EN_PREPARACION"].includes(o.status)).length} / {shiftInfo.maxRecommendedOrders} máx
                </span>
              </div>

              <div className="w-full bg-slate-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    shiftInfo.capacityStatus === "Optima"
                      ? "bg-emerald-500"
                      : shiftInfo.capacityStatus === "Moderada"
                      ? "bg-amber-500"
                      : "bg-[#FF3F1A]"
                  }`}
                  style={{ width: `${shiftInfo.capacityPercent}%` }}
                />
              </div>
            </div>

            {/* Cocineros Activos */}
            <div className="space-y-2">
              <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                Personal en Turno Activo
              </p>
              <div className="space-y-2">
                {shiftInfo.activeStaff.slice(0, 3).map((st, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-gray-800/80 border border-slate-100 dark:border-gray-700 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-[#190088] text-white flex items-center justify-center font-black text-[11px]">
                        {st.name.charAt(0)}
                      </div>
                      <span className="font-bold text-gray-900 dark:text-gray-100">{st.name}</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-[#190088] dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60">
                      {st.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Botón contextual a Turnos y Capacidad */}
          <button
            onClick={() => onNavigateGestion("turnos")}
            className="w-full p-3 rounded-2xl bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-left flex items-center justify-between transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-[#190088] dark:text-indigo-300" />
              <span className="font-extrabold text-xs text-[#190088] dark:text-indigo-300">
                Gestionar Turnos y Roster ({shiftInfo.activeStaff.length} cocineros)
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#190088] dark:text-indigo-300 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* SECCIÓN 3: Alertas Operativas & Automatizaciones Activas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incidencias Activas con interacción directa */}
        <div className="lg:col-span-2 bg-white dark:bg-[#2C2D31] rounded-3xl border border-slate-200/90 dark:border-[#374151] p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-[#374151] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">
                  Alertas e Incidencias del Ecosistema
                </h3>
                <p className="text-xs text-gray-400">
                  {activeInc.length} incidentes requieren seguimiento en piso
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsIncidenciasOpen(true)}
              className="py-2 px-3.5 rounded-2xl bg-red-50 hover:bg-red-100/90 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 font-extrabold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-red-200 dark:border-red-800 shadow-xs"
            >
              <span>Abrir Panel de Incidencias</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {activeInc.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 font-medium">
                No hay incidencias activas en este momento.
              </div>
            ) : (
              activeInc.map(inc => (
                <div
                  key={inc.id}
                  onClick={() => {
                    if (inc.orderId) {
                      setSelectedOrderId(inc.orderId);
                    } else {
                      setIsIncidenciasOpen(true);
                    }
                  }}
                  className="bg-slate-50 dark:bg-gray-800/80 rounded-2xl p-4 border-l-4 border-l-[#FF3F1A] border border-slate-200/90 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-red-400 hover:shadow-xs transition-all cursor-pointer group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          inc.severity === "Alta"
                            ? "bg-red-600 text-white"
                            : "bg-amber-500 text-white"
                        }`}
                      >
                        {inc.severity}
                      </span>
                      <h4 className="font-extrabold text-xs text-gray-900 dark:text-gray-100 group-hover:text-[#FF3F1A] transition-colors">
                        {inc.title}
                      </h4>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{inc.description}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-none pt-1 sm:pt-0">
                    <span className="font-mono text-[10px] text-gray-400 bg-white dark:bg-gray-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-gray-700">
                      {inc.timestamp}
                    </span>
                    {inc.orderId ? (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedOrderId(inc.orderId!);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-[#FF3F1A] hover:bg-orange-600 text-white font-black text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                      >
                        Ver Comanda <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setIsIncidenciasOpen(true);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-[#190088] hover:bg-[#140070] text-white font-black text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                      >
                        Gestionar <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Automatizaciones y Reglas con botón contextual */}
        <div className="bg-white dark:bg-[#2C2D31] rounded-3xl border border-slate-200/90 dark:border-[#374151] p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#374151] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center">
                  <Zap className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">
                  Reglas en Segundo Plano
                </h3>
              </div>
              <span className="text-[10px] font-black text-purple-700 bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 px-2.5 py-0.5 rounded-full">
                {automations.filter(a => a.isActive).length} activas
              </span>
            </div>

            <div className="space-y-2.5">
              {automations.slice(0, 2).map(rule => (
                <div
                  key={rule.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-800/80 border border-slate-100 dark:border-gray-700 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-gray-900 dark:text-gray-100 truncate">
                      {rule.name}
                    </p>
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-none ${
                        rule.isActive ? "bg-emerald-500 shadow-xs" : "bg-gray-300"
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">
                    {rule.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Botón contextual a Automatizaciones */}
          <button
            onClick={() => onNavigateGestion("automatizaciones")}
            className="w-full p-3 rounded-2xl bg-purple-50/70 hover:bg-purple-100/80 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 text-left flex items-center justify-between transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-300" />
              <span className="font-extrabold text-xs text-purple-700 dark:text-purple-300">
                Automatizaciones & Reglas IA
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-600 dark:text-purple-300 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
