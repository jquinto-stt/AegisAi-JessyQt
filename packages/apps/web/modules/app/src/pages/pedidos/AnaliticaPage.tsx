import { useState } from "react";
import type { ApexOptions } from "apexcharts";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { DatePicker } from "@/elements/form/date-picker";
import { Chart } from "@/elements/ui/chart";
import { pedidosStore } from "@/stores";
import type { PedidoEstado } from "@/stores/pedidos.store";

// ═══════════════════════════════════════════════════════════════════════════
// PALETA (oficial NECTO — misma que InicioPage / dashboard de Turnos)
// ═══════════════════════════════════════════════════════════════════════════

const ORANGE = "#FF3F1A";
const INDIGO = "#190088";
const CELESTE = "#97D6DF";
// Paleta ampliada para las distribuciones (donut/bar) con muchas categorías.
const PALETA = [INDIGO, ORANGE, CELESTE, "#7C5CFC", "#12B76A", "#F79009", "#EF4444", "#98A2B3"];

const money = (n: number) => `$${n.toLocaleString("es-CO")}`;

/** Fecha "YYYY-MM-DD" a partir de un Date (día local). */
const ymd = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Etiqueta corta y legible para el eje X ("2 sept."). */
const fmtCorto = (fecha: string) =>
  new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" });

/** Rango por defecto: últimos 7 días (incluye hoy). */
const rangoUltimos7 = (): { desde: string; hasta: string } => {
  const hoy = new Date();
  const desde = new Date(hoy);
  desde.setDate(hoy.getDate() - 6);
  return { desde: ymd(desde), hasta: ymd(hoy) };
};

// ═══════════════════════════════════════════════════════════════════════════
// KPI CARD (valor grande + etiqueta secundaria)
// ═══════════════════════════════════════════════════════════════════════════

const KpiCard = ({
  titulo,
  valor,
  detalle,
  icon,
}: {
  titulo: string;
  valor: string;
  detalle?: string;
  icon: React.ReactNode;
}) => (
  <Card className="h-full">
    <div className="flex items-start justify-between">
      <p className="text-sm text-gray-500 dark:text-gray-400">{titulo}</p>
      <span className="text-gray-300 dark:text-gray-600">{icon}</span>
    </div>
    <p className="mt-3 text-3xl font-bold text-gray-800 dark:text-white/90">{valor}</p>
    {detalle && <p className="mt-1 text-xs font-medium text-gray-400 dark:text-gray-500">{detalle}</p>}
  </Card>
);

// ── Iconos (mismo trazo que InicioPage) ─────────────────────────────────────
const IconMoney = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconTicket = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 010 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 010-4V7a2 2 0 00-2-2H5z" /></svg>;
const IconClock = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconCancel = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconInCurso = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" /></svg>;
const IconCheck = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

export const AnaliticaPage = observer(() => {
  const [rango, setRango] = useState<{ desde: string; hasta: string }>(rangoUltimos7);

  // ── Tendencias (alimentadas por el rango elegido) ─────────────────────────
  const volumen = pedidosStore.volumenEntre(rango.desde, rango.hasta);
  const ingresos = pedidosStore.ingresosEntre(rango.desde, rango.hasta);
  const etiquetasFecha = volumen.map((d) => fmtCorto(d.fecha));

  const volumenSeries = [{ name: "Pedidos", data: volumen.map((d) => d.total) }];
  const volumenOptions: ApexOptions = {
    colors: [ORANGE],
    chart: { fontFamily: "DM Sans, sans-serif", toolbar: { show: false } },
    stroke: { curve: "smooth", width: 2.4 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0, shadeIntensity: 0.4, stops: [0, 100] } },
    dataLabels: { enabled: false },
    markers: { size: 0, hover: { size: 5 } },
    xaxis: {
      categories: etiquetasFecha,
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    grid: { yaxis: { lines: { show: true } } },
    legend: { show: false },
    tooltip: { y: { formatter: (v) => `${v} pedidos` } },
  };

  const ingresosSeries = [{ name: "Ingresos", data: ingresos.map((d) => d.total) }];
  const ingresosOptions: ApexOptions = {
    colors: [INDIGO],
    chart: { fontFamily: "DM Sans, sans-serif", toolbar: { show: false } },
    stroke: { curve: "smooth", width: 2.4 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0, shadeIntensity: 0.4, stops: [0, 100] } },
    dataLabels: { enabled: false },
    markers: { size: 0, hover: { size: 5 } },
    xaxis: {
      categories: etiquetasFecha,
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: { labels: { formatter: (v) => money(Math.round(v)) } },
    grid: { yaxis: { lines: { show: true } } },
    legend: { show: false },
    tooltip: { y: { formatter: (v) => money(Math.round(v)) } },
  };

  // ── Distribución por ESTADO (omite estados sin pedidos) ───────────────────
  const conteoEstado = pedidosStore.conteoPorEstado();
  const estadosConDatos = (Object.keys(conteoEstado) as PedidoEstado[]).filter((e) => conteoEstado[e] > 0);
  const estadoSeries = [{ name: "Pedidos", data: estadosConDatos.map((e) => conteoEstado[e]) }];
  const estadoOptions: ApexOptions = {
    colors: [INDIGO],
    chart: { fontFamily: "DM Sans, sans-serif", toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "60%" } },
    dataLabels: { enabled: true },
    xaxis: { categories: estadosConDatos.map((e) => pedidosStore.estadoLabel(e)) },
    grid: { xaxis: { lines: { show: true } } },
    legend: { show: false },
  };

  // ── Distribución por MODALIDAD (donut) ────────────────────────────────────
  const modalidades = pedidosStore.porModalidad();
  const modalidadTotal = modalidades.reduce((s, m) => s + m.total, 0);
  const modalidadSeries = modalidades.map((m) => m.total);
  const modalidadOptions: ApexOptions = {
    colors: PALETA,
    labels: modalidades.map((m) => pedidosStore.modalidadLabel(m.modalidad)),
    chart: { fontFamily: "DM Sans, sans-serif" },
    stroke: { show: false },
    legend: { position: "bottom", horizontalAlign: "center" },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: { show: true, total: { show: true, label: "Total", formatter: () => String(modalidadTotal) } },
        },
      },
    },
    dataLabels: { enabled: false },
  };

  // ── Distribución por ORIGEN (WhatsApp vs Operador) ────────────────────────
  const origenes = pedidosStore.porOrigen();
  const origenLabel = (o: "whatsapp" | "operador") => (o === "whatsapp" ? "WhatsApp" : "Operador");
  const origenTotal = origenes.reduce((s, o) => s + o.total, 0);
  const origenSeries = origenes.map((o) => o.total);
  const origenOptions: ApexOptions = {
    colors: ["#17b363", INDIGO],
    labels: origenes.map((o) => origenLabel(o.origen)),
    chart: { fontFamily: "DM Sans, sans-serif" },
    stroke: { show: false },
    legend: { position: "bottom", horizontalAlign: "center" },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: { show: true, total: { show: true, label: "Total", formatter: () => String(origenTotal) } },
        },
      },
    },
    dataLabels: { enabled: false },
  };

  // ── Urgentes ahora ────────────────────────────────────────────────────────
  const urgentes = pedidosStore.urgentes;

  const sinVolumen = volumen.every((d) => d.total === 0);
  const sinIngresos = ingresos.every((d) => d.total === 0);
  const sinEstado = estadosConDatos.length === 0;
  const sinModalidad = modalidadTotal === 0;
  const sinOrigen = origenTotal === 0;

  return (
    <>
      <PageMeta title="Analítica de pedidos" description="Tendencias, ingresos y distribución de los pedidos" />

      {/* Header + selector de rango de fechas */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Analítica de pedidos</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tendencias del {fmtCorto(rango.desde)} al {fmtCorto(rango.hasta)}
          </p>
        </div>
        <div className="w-full sm:w-80">
          <DatePicker
            id="rango-analitica"
            mode="range"
            placeholder="Elige un rango de fechas"
            onChange={(dates) => {
              const ds = (dates as Date[]).map(ymd);
              if (ds.length === 0) return;
              if (ds.length === 1) {
                setRango({ desde: ds[0], hasta: ds[0] });
                return;
              }
              const [a, b] = ds[0] <= ds[1] ? [ds[0], ds[1]] : [ds[1], ds[0]];
              setRango({ desde: a, hasta: b });
            }}
          />
        </div>
      </div>

      {/* Fila de KPIs */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard titulo="Ingresos entregados" valor={money(pedidosStore.ingresoTotalEntregados())} detalle="acumulado" icon={IconMoney} />
        <KpiCard titulo="Ticket promedio" valor={money(pedidosStore.ticketPromedioEntregado())} detalle="por entregado" icon={IconTicket} />
        <KpiCard titulo="Tiempo de ciclo" valor={`${pedidosStore.tiempoPromedioCicloMin} min`} detalle="promedio" icon={IconClock} />
        <KpiCard titulo="Tasa de cancelación" valor={`${pedidosStore.tasaCancelacion()}%`} detalle="del total" icon={IconCancel} />
        <KpiCard titulo="En curso" valor={String(pedidosStore.totalEnCurso)} detalle={`${urgentes.length} urgentes`} icon={IconInCurso} />
        <KpiCard titulo="Entregados hoy" valor={String(pedidosStore.entregadosHoy)} detalle="hoy" icon={IconCheck} />
      </div>

      {/* Tendencias — volumen + ingresos */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Volumen de pedidos</h3>
            {sinVolumen && <span className="text-xs font-medium text-gray-400">Sin datos en el rango</span>}
          </div>
          <Chart type="area" series={volumenSeries} options={volumenOptions} height={300} />
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Ingresos</h3>
            {sinIngresos && <span className="text-xs font-medium text-gray-400">Sin datos en el rango</span>}
          </div>
          <Chart type="area" series={ingresosSeries} options={ingresosOptions} height={300} />
        </Card>
      </div>

      {/* Distribuciones — estado + modalidad + origen */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Por estado</h3>
          {sinEstado ? (
            <p className="py-16 text-center text-sm text-gray-400">Aún no hay pedidos.</p>
          ) : (
            <Chart type="bar" series={estadoSeries} options={estadoOptions} height={300} />
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Por modalidad</h3>
          {sinModalidad ? (
            <p className="py-16 text-center text-sm text-gray-400">Aún no hay pedidos.</p>
          ) : (
            <div className="flex justify-center">
              <Chart type="donut" series={modalidadSeries} options={modalidadOptions} height={300} />
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Por origen</h3>
          {sinOrigen ? (
            <p className="py-16 text-center text-sm text-gray-400">Aún no hay pedidos.</p>
          ) : (
            <div className="flex justify-center">
              <Chart type="donut" series={origenSeries} options={origenOptions} height={300} />
            </div>
          )}
        </Card>
      </div>

      {/* Pedidos urgentes ahora */}
      <div className="mt-6">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Pedidos urgentes ahora</h3>
            <span className="text-xs font-medium text-gray-400">{urgentes.length} en total</span>
          </div>
          {urgentes.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Nada requiere atención ahora mismo. 🎉</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {urgentes.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">{p.numero}</span>
                    <Badge color={pedidosStore.estadoBadgeColor(p.estado)} size="sm">
                      {pedidosStore.estadoLabel(p.estado)}
                    </Badge>
                  </div>
                  <p className="mt-2 truncate text-sm font-medium text-gray-800 dark:text-white/90">{p.cliente}</p>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-error-500">{pedidosStore.minutosEnEstado(p)}m</p>
                      <p className="text-xs text-gray-400">en {pedidosStore.estadoLabel(p.estado).toLowerCase()}</p>
                    </div>
                    <span className="text-xs text-gray-400">{pedidosStore.modalidadLabel(p.modalidad)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
});

export default AnaliticaPage;
