import { useState, useEffect } from "react";
import type { ApexOptions } from "apexcharts";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Chart } from "@/elements/ui/chart";
import { uiStore, pedidosStore } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// ICONS & HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const ArrowUpIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-400">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ExpandIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const money = (n: number) => `$${n.toLocaleString("es-CO")}`;

// ═══════════════════════════════════════════════════════════════════════════
// KPI CARD (Fila 1 del Mockup adaptada a Pedidos)
// ═══════════════════════════════════════════════════════════════════════════

interface KpiMetricProps {
  title: string;
  value: string;
  badge: string;
  badgeType: "up" | "down";
  subtitle: string;
}

const KpiMetricCard = ({ title, value, badge, badgeType, subtitle }: KpiMetricProps) => {
  const isUp = badgeType === "up";

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm dark:border-gray-800/80 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
            isUp
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
          }`}
        >
          {badge}
        </span>
      </div>

      <div className="my-3 flex items-center gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-gray-900 sm:text-[28px] dark:text-white">
          {value}
        </span>
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
            isUp
              ? "bg-emerald-100/70 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
              : "bg-rose-100/70 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
          }`}
        >
          {isUp ? <ArrowUpIcon /> : <ArrowDownIcon />}
        </span>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// DRAWER / MODAL DEL DETALLE DEL EMBUDO (Panel Oscuro Solicitado)
// ═══════════════════════════════════════════════════════════════════════════

interface FunnelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  periodo: string;
  marca: string;
  equalizerBars: { pct: number; isMilestone: boolean }[];
  funnelMilestones: { label: string; count: string; pct: number }[];
}

const FunnelDetailDrawer = ({
  isOpen,
  onClose,
  periodo,
  marca,
  equalizerBars,
  funnelMilestones,
}: FunnelDrawerProps) => {
  // Manejo de la tecla Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-gray-900/30 backdrop-blur-xs transition-opacity duration-300 p-2 sm:p-4 dark:bg-black/60">
      {/* Contenedor flotante en modo claro limpio y luminoso */}
      <div className="relative flex h-full max-h-[96vh] w-full max-w-lg md:max-w-xl flex-col overflow-y-auto rounded-3xl border border-gray-200/80 bg-white p-5 sm:p-6 text-gray-900 shadow-2xl transition-all duration-300 dark:border-white/10 dark:bg-[#161619] dark:text-white">
        {/* Cabecera del Drawer con Filtros y Botón de Cierre */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20 dark:hover:text-white"
          >
            <CloseIcon />
          </button>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200/90 bg-gray-50/80 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs dark:border-white/10 dark:bg-[#222226] dark:text-gray-200">
              <CalendarIcon />
              <span>{periodo}</span>
              <ChevronDownIcon />
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200/90 bg-gray-50/80 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs dark:border-white/10 dark:bg-[#222226] dark:text-gray-200">
              <span>{marca}</span>
              <ChevronDownIcon />
            </div>
          </div>
        </div>

        {/* Fila 1: 2 Tarjetas KPI en modo claro */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {/* Tarjeta 1: Units Sold */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 shadow-xs dark:border-white/5 dark:bg-[#202024]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Units Sold</span>
              <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                -29%
              </span>
            </div>
            <div className="my-2 flex items-center gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">1,571</span>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-100/70 text-[10px] text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                <ArrowDownIcon />
              </span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">Down 29% this week</p>
          </div>

          {/* Tarjeta 2: Cart Abandonment */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 shadow-xs dark:border-white/5 dark:bg-[#202024]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Cart Abandonment</span>
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                -11%
              </span>
            </div>
            <div className="my-2 flex items-center gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">835</span>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100/70 text-[10px] text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <ArrowUpIcon />
              </span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">Up 11% this week</p>
          </div>
        </div>

        {/* Fila 2: Sales conversion (Embudo en modo claro) */}
        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-5 shadow-xs dark:border-white/5 dark:bg-[#202024]">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Sales conversion</h3>
              <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                Conversion process from leads to deals
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] text-gray-400 dark:text-gray-500">Conversion rate</p>
              <div className="mt-0.5 flex items-center justify-end gap-1">
                <span className="text-xl font-bold text-gray-900 dark:text-white">10%</span>
                <span className="rounded bg-gray-200/80 px-1 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-white/10 dark:text-gray-300">-</span>
              </div>
            </div>
          </div>

          {/* Barras de ecualizador en modo claro */}
          <div className="mt-5 flex flex-col">
            <div className="flex h-36 items-end justify-between gap-1 px-1">
              {equalizerBars.map((bar, idx) => (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  {bar.isMilestone && (
                    <span className="mb-1 text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                      {bar.pct}%
                    </span>
                  )}
                  <div
                    style={{ height: `${bar.pct}%` }}
                    className={`w-full max-w-[7px] rounded-full transition-all ${
                      bar.isMilestone ? "bg-emerald-500" : "bg-gray-200 dark:bg-[#34343D]"
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Fila de 4 hitos inferiores */}
            <div className="mt-3 grid grid-cols-4 border-t border-gray-200/70 pt-2.5 text-center dark:border-white/5">
              {funnelMilestones.map((m, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{m.label}</span>
                  <span className="text-xs font-bold text-gray-800 dark:text-white">{m.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fila 3: Sales by Region (Tabla en modo claro) */}
        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-5 shadow-xs dark:border-white/5 dark:bg-[#202024]">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Sales by Region</h3>

          <div className="mt-3 flex items-center justify-between border-b border-gray-200/70 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:border-white/5 dark:text-gray-500">
            <span className="w-1/3">Region</span>
            <span className="w-1/3 text-center">Orders</span>
            <span className="w-1/3 text-right">Net Revenue</span>
          </div>

          <div className="divide-y divide-gray-100 text-xs dark:divide-white/5">
            <div className="flex items-center justify-between py-2.5">
              <span className="w-1/3 text-gray-700 dark:text-gray-300">Spain</span>
              <div className="flex w-1/3 items-center justify-center gap-1 font-semibold text-gray-900 dark:text-white">
                <span>129</span>
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              </div>
              <span className="w-1/3 text-right font-medium text-gray-900 dark:text-white">€24,063.90</span>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <span className="w-1/3 text-gray-700 dark:text-gray-300">Rest of the world</span>
              <div className="flex w-1/3 items-center justify-center gap-1 font-semibold text-gray-900 dark:text-white">
                <span>7</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
              <span className="w-1/3 text-right font-medium text-gray-900 dark:text-white">€3,575.09</span>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <span className="w-1/3 text-gray-700 dark:text-gray-300">Europa</span>
              <div className="flex w-1/3 items-center justify-center gap-1 font-semibold text-gray-900 dark:text-white">
                <span>128</span>
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
              </div>
              <span className="w-1/3 text-right font-medium text-gray-900 dark:text-white">€23,864.11</span>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <span className="w-1/3 text-gray-700 dark:text-gray-300">Mexico</span>
              <div className="flex w-1/3 items-center justify-center gap-1 font-semibold text-gray-900 dark:text-white">
                <span>0</span>
              </div>
              <span className="w-1/3 text-right font-medium text-gray-900 dark:text-white">€40.06</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA ANALÍTICA DE PEDIDOS
// ═══════════════════════════════════════════════════════════════════════════

export const AnaliticaPage = observer(() => {
  const isDark = uiStore.isDarkMode;
  const [periodo] = useState<string>("Last 7 days");
  const [marca] = useState<string>("Redondo Brand");
  const [modalEmbudoAbierto, setModalEmbudoAbierto] = useState<boolean>(false);

  // Métricas del dominio de Pedidos
  const totalPedidos = pedidosStore.pedidos.length;
  const totalIngresos = pedidosStore.ingresoTotalEntregados();
  const ticketPromedio = pedidosStore.ticketPromedioEntregado();
  const tiempoCiclo = pedidosStore.tiempoPromedioCicloMin;
  const tasaCancelacion = pedidosStore.tasaCancelacion();
  const enCurso = pedidosStore.totalEnCurso;

  // ── 1. Gráfico "Volumen e Ingresos de Pedidos" (Sales & Returns) ──────────
  const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const pedidosPorDia = [28, 34, 42, 38, 64, 52, 45];
  const entregadosPorDia = [24, 30, 39, 35, 58, 48, 41];

  const salesChartSeries = [
    {
      name: "Pedidos recibidos",
      data: pedidosPorDia,
    },
    {
      name: "Pedidos entregados",
      data: entregadosPorDia,
    },
  ];

  const salesChartOptions: ApexOptions = {
    chart: {
      type: "area",
      fontFamily: "Inter, system-ui, sans-serif",
      toolbar: { show: false },
      zoom: { enabled: false },
      sparkline: { enabled: false },
    },
    colors: ["#10B981", isDark ? "#64748B" : "#CBD5E1"],
    stroke: {
      curve: "smooth",
      width: [2.5, 2],
    },
    fill: {
      type: ["gradient", "solid"],
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.22,
        opacityTo: 0.01,
        stops: [0, 90, 100],
      },
      colors: ["#10B981", "transparent"],
    },
    markers: {
      size: [0, 0],
      hover: { size: 5 },
    },
    xaxis: {
      categories: diasSemana,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: "#9CA3AF", fontSize: "12px", fontWeight: 400 },
      },
    },
    yaxis: {
      min: 0,
      max: 80,
      tickAmount: 4,
      labels: {
        formatter: (v) => `${Math.round(v)}`,
        style: { colors: "#9CA3AF", fontSize: "12px" },
      },
    },
    grid: {
      borderColor: isDark ? "#1F2937" : "#F3F4F6",
      strokeDashArray: 0,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    legend: { show: false },
    tooltip: {
      theme: isDark ? "dark" : "light",
      shared: true,
      intersect: false,
      y: {
        formatter: (val) => `${val} pedidos`,
      },
    },
  };

  // ── 2. Embudo del Pipeline de Pedidos (Equalizer Style) ───────────────────
  const funnelMilestones = [
    { label: "Leads", count: "1500", pct: 100 },
    { label: "Add to cart", count: "800", pct: 53 },
    { label: "Checkout", count: "200", pct: 13 },
    { label: "Deals", count: "150", pct: 10 },
  ];

  const equalizerBars = [
    { pct: 100, isMilestone: true },
    { pct: 95, isMilestone: false },
    { pct: 90, isMilestone: false },
    { pct: 84, isMilestone: false },
    { pct: 76, isMilestone: false },
    { pct: 68, isMilestone: false },
    { pct: 53, isMilestone: true },
    { pct: 46, isMilestone: false },
    { pct: 39, isMilestone: false },
    { pct: 32, isMilestone: false },
    { pct: 25, isMilestone: false },
    { pct: 18, isMilestone: false },
    { pct: 13, isMilestone: true },
    { pct: 12, isMilestone: false },
    { pct: 11, isMilestone: false },
    { pct: 10, isMilestone: true },
    { pct: 10, isMilestone: false },
    { pct: 10, isMilestone: false },
    { pct: 10, isMilestone: false },
  ];

  // ── 3. Canales y Modalidades de Pedidos (Traffic Sources) ─────────────────
  const trafficChannels = [
    { name: "WhatsApp", count: "148", color: "#10B981", widthPct: "52%" },
    { name: "Operador", count: "64", color: "#3B82F6", widthPct: "24%" },
    { name: "Domicilio", count: "48", color: "#F59E0B", widthPct: "16%" },
    { name: "Retiro local", count: "22", color: "#8B5CF6", widthPct: "8%" },
  ];

  // ── 4. Desempeño por Canal y Modalidad (Sales by Region) ──────────────────
  const salesByRegion = [
    { canal: "WhatsApp (Domicilio)", pedidos: 94, isUp: true, ingresos: money(4250000) },
    { canal: "WhatsApp (Retiro)", pedidos: 54, isUp: true, ingresos: money(2180000) },
    { canal: "Operador (Mostrador)", pedidos: 42, isUp: false, ingresos: money(1890000) },
    { canal: "Consumo en Sitio", pedidos: 16, isUp: true, ingresos: money(760000) },
  ];

  return (
    <>
      <PageMeta title="General metrics" description="Métricas generales y analítica de pedidos" />

      {/* Drawer oscuro al hacer clic en el embudo */}
      <FunnelDetailDrawer
        isOpen={modalEmbudoAbierto}
        onClose={() => setModalEmbudoAbierto(false)}
        periodo={periodo}
        marca={marca}
        equalizerBars={equalizerBars}
        funnelMilestones={funnelMilestones}
      />

      <div className="flex flex-col gap-6">
        {/* ════════════════════════════════════════════════════════════════════
            ENCABEZADO DE LA VISTA
        ════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
              General metrics
            </h1>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Desempeño operativo y financiero del módulo de pedidos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative inline-flex items-center gap-2 rounded-xl border border-gray-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 cursor-pointer">
              <CalendarIcon />
              <span>{periodo}</span>
              <ChevronDownIcon />
            </div>

            <div className="relative inline-flex items-center gap-2 rounded-xl border border-gray-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 cursor-pointer">
              <span>{marca}</span>
              <ChevronDownIcon />
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            FILA 1: 5 TARJETAS KPI ADAPTADAS A PEDIDOS
        ════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiMetricCard
            title="Profit Margin"
            value={totalIngresos > 0 ? money(totalIngresos) : "€123,927.85"}
            badge="+38%"
            badgeType="up"
            subtitle="Up 38% this week"
          />
          <KpiMetricCard
            title="Orders"
            value={totalPedidos > 0 ? `${totalPedidos + 2792}` : "2,792"}
            badge="+11%"
            badgeType="up"
            subtitle="Up 11% this week"
          />
          <KpiMetricCard
            title="Avg. Order Value"
            value={ticketPromedio > 0 ? money(ticketPromedio) : "857"}
            badge="-67%"
            badgeType="down"
            subtitle="Down 67% this week"
          />
          <KpiMetricCard
            title="Units Sold"
            value="1,571"
            badge="-29%"
            badgeType="down"
            subtitle="Down 29% this week"
          />
          <KpiMetricCard
            title="Cart Abandonment"
            value="835"
            badge="+11%"
            badgeType="up"
            subtitle="Up 11% this week"
          />
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            FILA 2: GRÁFICO PRINCIPAL + EMBUDO INTERACTIVO (Click para abrir drawer)
        ════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* ── Tarjeta Izquierda: Sales & Returns (7 columnas) ── */}
          <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-xs xl:col-span-7 dark:border-gray-800/80 dark:bg-gray-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Sales & Returns</h2>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  Total sales up 7%, while returns decreased by 12%
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Total sales</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xl font-bold text-gray-900 dark:text-white">4,782</span>
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                        +7%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <span className="h-2 w-2 rounded-full bg-gray-400" />
                      <span>Returns</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xl font-bold text-gray-900 dark:text-white">503</span>
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                        -12%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-4">
              <Chart
                type="area"
                series={salesChartSeries}
                options={salesChartOptions}
                height={260}
              />

              <div className="pointer-events-none absolute left-[64%] top-[28%] -translate-x-1/2 -translate-y-1/2 hidden sm:block">
                <div className="rounded-xl border border-gray-100 bg-white/95 px-3 py-1.5 text-center shadow-lg backdrop-blur-xs dark:border-gray-700 dark:bg-gray-800/95">
                  <p className="text-[11px] font-medium text-gray-400">14 March 2:39 PM</p>
                  <p className="text-xs font-bold text-gray-800 dark:text-white">4,782 sales</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tarjeta Derecha: Sales conversion (INTERACTIVA: Clic abre Drawer) ── */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setModalEmbudoAbierto(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setModalEmbudoAbierto(true);
            }}
            aria-label="Abrir vista detallada del embudo de conversión"
            className="group relative flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-xs xl:col-span-5 dark:border-gray-800/80 dark:bg-gray-900 cursor-pointer transition-all hover:border-emerald-300 hover:shadow-md dark:hover:border-emerald-500/40"
          >
            {/* Header del Funnel */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Sales conversion
                  </h2>
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gray-100 text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 dark:bg-gray-800 dark:text-gray-500 dark:group-hover:bg-emerald-500/20 dark:group-hover:text-emerald-400 transition-colors">
                    <ExpandIcon />
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  Conversion process from leads to deals
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-gray-400 dark:text-gray-500">Conversion rate</p>
                <div className="mt-0.5 flex items-center justify-end gap-1.5">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">10%</span>
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    +7%
                  </span>
                </div>
              </div>
            </div>

            {/* Visualizador de Funnel con Barras Escalonadas Estilo Equalizer */}
            <div className="mt-6 flex flex-col">
              <div className="flex h-44 items-end justify-between gap-1 sm:gap-1.5 px-2">
                {equalizerBars.map((bar, idx) => (
                  <div key={idx} className="flex flex-1 flex-col items-center justify-end h-full">
                    {bar.isMilestone && (
                      <span className="mb-1.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        {bar.pct}%
                      </span>
                    )}

                    <div
                      style={{ height: `${bar.pct}%` }}
                      className={`w-full max-w-[8px] rounded-full transition-all duration-300 ${
                        bar.isMilestone
                          ? "bg-emerald-500 group-hover:bg-emerald-400"
                          : "bg-gray-200/90 dark:bg-gray-700/60"
                      }`}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-4 border-t border-gray-100 pt-3 text-center dark:border-gray-800">
                {funnelMilestones.map((m, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{m.label}</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-white">{m.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            FILA 3: EFICIENCIA DE ENTREGA (Gauge) + CANALES + DESEMPEÑO POR CANAL
        ════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* ── 1. Sessions: Semi-Circle Radial Gauge (3 cols) ── */}
          <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-xs lg:col-span-3 dark:border-gray-800/80 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Sessions</h2>

            <div className="my-3 flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center">
                <svg viewBox="0 0 200 115" className="h-32 w-52 overflow-visible">
                  <path
                    d="M 25 100 A 75 75 0 0 1 175 100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="16"
                    strokeLinecap="round"
                    className="text-gray-100 dark:text-gray-800"
                  />
                  <path
                    d="M 25 100 A 75 75 0 0 1 175 100"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray="235.6"
                    strokeDashoffset="42"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>

                <div className="absolute top-12 flex flex-col items-center">
                  <span className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                    3,271
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">Unique Users</span>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3 border-b border-dashed border-gray-200 dark:border-gray-800" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 dark:text-gray-500">Total Sessions</span>
                <span className="font-bold text-gray-900 dark:text-white">4,182</span>
              </div>
            </div>
          </div>

          {/* ── 2. Traffic Sources: Barra segmentada + Lista (5 cols) ── */}
          <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-xs lg:col-span-5 dark:border-gray-800/80 dark:bg-gray-900">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Traffic Sources</h2>

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Marketing Spend</p>
                  <p className="mt-0.5 text-xs font-bold text-gray-800 dark:text-white">€11,596</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">CPA</p>
                  <p className="mt-0.5 text-xs font-bold text-gray-800 dark:text-white">€5.4</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Impressions</p>
                  <p className="mt-0.5 text-xs font-bold text-gray-800 dark:text-white">7,574,183</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Clicks</p>
                  <p className="mt-0.5 text-xs font-bold text-gray-800 dark:text-white">60,784</p>
                </div>
              </div>

              <div className="my-5 flex h-2 w-full gap-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                {trafficChannels.map((ch, idx) => (
                  <div
                    key={idx}
                    style={{ width: ch.widthPct, backgroundColor: ch.color }}
                    className="h-full rounded-full transition-all"
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 pt-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Shop
                </span>
                <span className="font-semibold text-gray-800 dark:text-white">3,707</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <span className="h-2 w-2 rounded-full bg-lime-500" />
                  Direct
                </span>
                <span className="font-semibold text-gray-800 dark:text-white">1,490</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Instagram
                </span>
                <span className="font-semibold text-gray-800 dark:text-white">979</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Google
                </span>
                <span className="font-semibold text-gray-800 dark:text-white">728</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  Facebook
                </span>
                <span className="font-semibold text-gray-800 dark:text-white">213</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <span className="h-2 w-2 rounded-full bg-pink-500" />
                  Others
                </span>
                <span className="font-semibold text-gray-800 dark:text-white">38</span>
              </div>
            </div>
          </div>

          {/* ── 3. Rendimiento por Canal y Modalidad: Tabla (4 cols) ── */}
          <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-xs lg:col-span-4 dark:border-gray-800/80 dark:bg-gray-900">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Sales by Region</h2>

              <div className="mt-4 flex items-center justify-between border-b border-gray-100 pb-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-800 dark:text-gray-500">
                <span className="w-1/3">Region</span>
                <span className="w-1/3 text-center">Orders</span>
                <span className="w-1/3 text-right">Net Revenue</span>
              </div>

              <div className="divide-y divide-gray-50 text-xs dark:divide-gray-800/60">
                {salesByRegion.map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2.5 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <span className="w-1/3 font-medium text-gray-700 dark:text-gray-200 truncate">
                      {r.canal}
                    </span>

                    <div className="flex w-1/3 items-center justify-center gap-1 font-semibold text-gray-800 dark:text-white">
                      <span>{r.pedidos}</span>
                      <span className={r.isUp ? "text-emerald-500" : "text-rose-500"}>
                        {r.isUp ? <ArrowUpIcon /> : <ArrowDownIcon />}
                      </span>
                    </div>

                    <span className="w-1/3 text-right font-medium text-gray-800 dark:text-white">
                      {r.ingresos}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default AnaliticaPage;
