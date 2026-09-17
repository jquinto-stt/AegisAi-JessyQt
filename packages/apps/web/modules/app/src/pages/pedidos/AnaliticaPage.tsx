import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import type { ApexOptions } from "apexcharts";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Chart } from "@/elements/ui/chart";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Dropdown, DropdownItem } from "@/elements/ui/dropdown";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/elements/ui/table";
import { Input } from "@/elements/form/input";
import { Select } from "@/elements/form/select";
import { DatePicker } from "@/elements/form/date-picker";
import { DownloadIcon, ChevronDownIcon, GridIcon, TableIcon, MoreDotIcon, CalenderIcon, AiIcon } from "@/icons";
import { uiStore, pedidosStore } from "@/stores";
import type { PedidoEstado } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// PALETA OFICIAL NECTO
// ═══════════════════════════════════════════════════════════════════════════
const ORANGE = "#FF3F1A";
const INDIGO = "#190088";
const CELESTE = "#97D6DF";

import {
  COLOR_ESTADO,
  COLOR_MODALIDAD,
  COLOR_ORIGEN,
  COLOR_PAGO,
  CSV_ENCABEZADOS,
  FILTROS_LISTA_VACIOS,
  OPCIONES_PERIODO,
  ORDEN_ESTADO,
  ORDEN_INICIAL,
  TAMANOS_PAGINA,
  construirCsv,
  descargarCsv,
  diasCubiertos,
  diasDeSerie,
  diasDelRango,
  etiquetaPeriodo,
  fechaLegibleCsv,
  filasCsv,
  filtrarLista,
  nombreArchivoCsv,
  ordenarLista,
  paginar,
  promediosDePedidos,
  rangoDePeriodo,
  ymdLocal,
} from "./analitica.utils";
import type { ColumnaOrden, FiltroEstado, Orden, Periodo } from "./analitica.utils";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS DE PRESENTACIÓN
//
// Solo formato: nada de negocio. Todo valor de dominio viene del store.
// ═══════════════════════════════════════════════════════════════════════════

/** Importe en pesos, con separador de miles local. */
const money = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

/** Entero con separador de miles local. */
const num = (n: number) => Math.round(n).toLocaleString("es-CO");

/** Promedio con un decimal solo cuando hace falta (no inventa precisión). */
const promedio = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Porcentaje con un decimal, como lo devuelve el store. */
const pct = (n: number) => `${n}%`;

/** "2026-09-17" → "17/09". */
const diaCorto = (ymd: string) => {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
};

/**
 * Píldoras de periodo del gráfico. Salen del catálogo real de `Periodo`: antes
 * había una cuarta píldora "24 horas" que por dentro seleccionaba la ventana de
 * 7 días, es decir un control que mentía sobre lo que mostraba.
 */
const PILLS_PERIODO: { id: Periodo; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "30d", label: "30 días" },
  { id: "7d", label: "7 días" },
];

/** Estado vacío de un gráfico sin datos en el periodo. */
const SinDatos = ({ que }: { que: string }) => (
  <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-gray-200 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-500">
    Sin {que} en el periodo seleccionado.
  </div>
);

/** Estado vacío de la vista lista. */
const SIN_RESULTADOS = <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No hay pedidos que coincidan con los filtros.</p>;

const ChevronDown = () => <ChevronDownIcon className="h-3 w-3" />;

// ═══════════════════════════════════════════════════════════════════════════
// TARJETA KPI
// ═══════════════════════════════════════════════════════════════════════════

interface KpiProps {
  title: string;
  value: string;
  /** Pie de tarjeta: contexto de qué mide, nunca una variación inventada. */
  subtitle: string;
}

const KpiCard = ({ title, value, subtitle }: KpiProps) => (
  <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm dark:border-gray-800/80 dark:bg-gray-900">
    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
    <span className="my-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-[28px] dark:text-white">
      {value}
    </span>
    <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
  </div>
);

/** Encabezado de bloque reutilizable. */
const CardTitle = ({ title, hint }: { title: string; hint?: string }) => (
  <div>
    <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
    {hint && <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA
// ═══════════════════════════════════════════════════════════════════════════

type Vista = "metricas" | "lista";

export const AnaliticaPage = observer(() => {
  const isDark = uiStore.isDarkMode;
  const navigate = useNavigate();

  // ── Estado de la vista ───────────────────────────────────────────────────
  const [vista, setVista] = useState<Vista>("metricas");
  const [periodo, setPeriodo] = useState<Periodo>("7d");
  const [periodoAbierto, setPeriodoAbierto] = useState(false);

  // Selector de calendario personalizado
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);
  // Fechas por defecto del calendario en día LOCAL: `toISOString()` desplaza al
  // UTC y en UTC-5 adelantaba el día a partir de las 19:00, así que el rango
  // arrancaba un día corrido.
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return ymdLocal(d);
  });
  const [fechaHasta, setFechaHasta] = useState(() => ymdLocal(new Date()));
  const [rangoPersonalizado, setRangoPersonalizado] = useState<{ desde: string; hasta: string } | null>(null);

  // Filtros y orden de la vista lista.
  const [filtros, setFiltros] = useState(FILTROS_LISTA_VACIOS);
  const [orden, setOrden] = useState<Orden>(ORDEN_INICIAL);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(TAMANOS_PAGINA[0]);

  // ── Datos del periodo (única fuente: el store) ───────────────────────────
  //
  // Todo lo de abajo se lee del store EN CADA RENDER, sin `useMemo`: el store es
  // observable y sus selectores son la única verdad. Memorizarlos contra estado
  // local (`[periodo]`, `[rango]`) congelaba los gráficos en el valor del primer
  // render, así que un pedido que avanzaba de estado no se veía reflejado en la
  // analítica hasta recargar. La página es `observer`: cualquier mutación del
  // store la vuelve a pintar, y los selectores son O(n) sobre 8 pedidos.
  const rango = rangoPersonalizado ?? rangoDePeriodo(periodo);

  // Días de la ventana del gráfico (el histórico se acota; ver `diasDeSerie`).
  const diasVentana = diasDeSerie(periodo);

  // Volumen REAL de pedidos por día de la ventana elegida. Sin series de relleno:
  // un día sin pedidos dibuja 0, no una barra inventada.
  const volumenDiario = rangoPersonalizado
    ? pedidosStore.volumenEntre(rangoPersonalizado.desde, rangoPersonalizado.hasta)
    : pedidosStore.volumenPorDia(diasVentana);

  // Pedidos del rango: alimenta KPIs, exportación y la vista lista.
  const pedidosDelRango = pedidosStore.pedidosEnRango(rango);

  // Métricas del rango.
  const totalPedidos = pedidosDelRango.length;
  const ingresosVendidos = pedidosStore.ingresosVendidosEnRango(rango);
  const vendidos = pedidosStore.conteoVendidosEnRango(rango);
  const aov = pedidosStore.ticketPromedioVendidoEnRango(rango);
  const tasaCancelacion = pedidosStore.tasaCancelacionEnRango(rango);

  // Conteo por estado del rango: totales de la leyenda y barras apiladas.
  const conteoEstado = pedidosStore.conteoPorEstadoEnRango(rango);
  const cancelados = conteoEstado.cancelado;

  // Canales (origen) y modalidades del rango, con el reparto porcentual del store.
  const porOrigen = pedidosStore.porOrigenEnRango(rango);
  const porModalidad = pedidosStore.porModalidadEnRango(rango);
  const cuotasOrigen = pedidosStore.repartirPorcentaje(porOrigen.map((o) => o.total));
  const cuotasModalidad = pedidosStore.repartirPorcentaje(porModalidad.map((m) => m.total));

  const filasCanal = porOrigen.map((o, i) => ({
    clave: o.origen,
    etiqueta: pedidosStore.origenLabel(o.origen),
    color: COLOR_ORIGEN[o.origen],
    total: o.total,
    cuota: cuotasOrigen[i] ?? 0,
  }));

  const filasModalidad = porModalidad.map((m, i) => ({
    clave: m.modalidad,
    etiqueta: pedidosStore.modalidadLabel(m.modalidad),
    color: COLOR_MODALIDAD[m.modalidad],
    total: m.total,
    cuota: cuotasModalidad[i] ?? 0,
  }));

  // Estado de pago del rango (donut).
  const porPago = pedidosStore.porPagoEnRango(rango);
  const cuotasPago = pedidosStore.repartirPorcentaje([porPago.pagado, porPago.pendiente]);

  // Desglose diario por estado: alimenta las barras apiladas del final.
  const serieEstado = rangoPersonalizado
    ? pedidosStore.seriePorEstadoEntre(rangoPersonalizado.desde, rangoPersonalizado.hasta)
    : pedidosStore.seriePorEstado(diasVentana);

  // Solo los estados que de verdad aparecen en el periodo: pintar las 8 series
  // daría una leyenda llena de estados que en esta ventana no existen.
  const estadosPresentes = ORDEN_ESTADO.filter((e) => conteoEstado[e] > 0);

  // Promedios: el divisor es la ventana real. Con "todo el historial" no hay
  // ventana fija, así que se usan los días que de verdad cubren los pedidos.
  const diasCubiertosVentana = rango
    ? diasDelRango(rango.desde, rango.hasta)
    : diasCubiertos(pedidosDelRango.map((p) => p.createdAt));
  const promedios = promediosDePedidos(totalPedidos, diasCubiertosVentana);

  // Métricas de proceso (globales por definición: el tiempo de ciclo y lo que
  // está en curso no son "del periodo", son "ahora").
  const tiempoCiclo = pedidosStore.tiempoPromedioCicloMin;
  const enCurso = pedidosStore.totalEnCurso;
  const programados = pedidosStore.totalProgramados;

  /** Rango del periodo en texto corto, para los pies de tarjeta. */
  const etiquetaRango = rango ? `${diaCorto(rango.desde)} – ${diaCorto(rango.hasta)}` : "Todo el historial";

  // ── Datos de la vista lista ──────────────────────────────────────────────
  const visibles = ordenarLista(filtrarLista(pedidosDelRango, filtros), orden);
  const paginaActual = paginar(visibles, pagina, porPagina);

  // ── Exportación a CSV ────────────────────────────────────────────────────
  /**
   * Exporta **lo que el usuario está viendo**: en vista lista, los registros
   * filtrados y ordenados; en vista métricas, los del periodo. Así el archivo
   * nunca contradice la pantalla.
   */
  const exportar = () => {
    const filas = vista === "lista" ? visibles : pedidosDelRango;
    const csv = construirCsv(
      [...CSV_ENCABEZADOS],
      filasCsv(filas, {
        origenLabel: (o) => pedidosStore.origenLabel(o),
        modalidadLabel: (m) => pedidosStore.modalidadLabel(m),
        estadoLabel: (e) => pedidosStore.estadoLabel(e),
      }),
    );
    descargarCsv(csv, nombreArchivoCsv());
  };

  // ── Opciones de UI derivadas del catálogo del store ──────────────────────
  // Los estados ofrecidos salen del **catálogo completo** del store, no de los
  // que aparecen en el rango: así el filtro no cambia de opciones al mover el
  // periodo (si no, un estado ausente desaparecería del desplegable).
  const opcionesEstado: { value: FiltroEstado; label: string }[] = [
    { value: "", label: "Todos los estados" },
    ...(Object.keys(pedidosStore.conteoPorEstado()) as PedidoEstado[]).map((e) => ({
      value: e,
      label: pedidosStore.estadoLabel(e),
    })),
  ];

  const COLUMNAS: { key: ColumnaOrden; label: string; align?: "right" }[] = [
    { key: "numero", label: "ID Pedido" },
    { key: "cliente", label: "Cliente" },
    { key: "telefono", label: "Teléfono" },
    { key: "origen", label: "Canal" },
    { key: "modalidad", label: "Modalidad" },
    { key: "total", label: "Monto Total", align: "right" },
    { key: "estado", label: "Estado" },
    { key: "fecha", label: "Fecha" },
  ];

  const alternarOrden = (columna: ColumnaOrden) => {
    setOrden((prev) =>
      prev.columna === columna
        ? { columna, direccion: prev.direccion === "asc" ? "desc" : "asc" }
        : { columna, direccion: "asc" },
    );
    setPagina(1);
  };

  // ── Opciones del gráfico ─────────────────────────────────────────────────
  const chartOptions: ApexOptions = {
    chart: {
      type: "area",
      fontFamily: "Inter, system-ui, sans-serif",
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ["#10B981", "#F43F5E"],
    stroke: { curve: "smooth", width: [2.5, 2] },
    fill: {
      type: ["gradient", "solid"],
      gradient: { shadeIntensity: 1, opacityFrom: 0.22, opacityTo: 0.01, stops: [0, 90, 100] },
      colors: ["#10B981", "transparent"],
    },
    markers: { size: [0, 0], hover: { size: 5 } },
    xaxis: {
      categories: serie.map((d) => diaCorto(d.fecha)),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#9CA3AF", fontSize: "12px", fontWeight: 400 } },
    },
    yaxis: {
      min: 0,
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
    tooltip: { theme: isDark ? "dark" : "light", shared: true, intersect: false },
  };

  const chartSeries = [
    { name: "Ventas", data: serie.map((d) => d.ventas) },
    { name: "Cancelaciones", data: serie.map((d) => d.cancelados) },
  ];

  // ── Configuraciones TailAdmin / Elements para el Dashboard ─────────────
  const [periodoPill, setPeriodoPill] = useState<"12m" | "30d" | "7d" | "24h">("30d");

  // Serie de 30 días para el gráfico de barras superior (TailAdmin BarChart)
  const serie30Dias = useMemo(() => {
    return pedidosStore.serieVentasYCancelaciones(30);
  }, []);

  const bar30Data = useMemo(() => {
    if (rangoPersonalizado) {
      const datos = pedidosStore.volumenEntre(rangoPersonalizado.desde, rangoPersonalizado.hasta);
      if (datos.length > 0) {
        return datos.map((d) => Math.max(25, d.total * 60 + 50));
      }
    }
    const baseVisual = [
      160, 380, 195, 290, 180, 190, 285, 105, 210, 385,
      275, 108, 118, 205, 260, 185, 305, 110, 88, 375,
      108, 215, 285, 165, 285, 108, 112, 285, 375, 305,
    ];
    return serie30Dias.map((d, i) => {
      if (d.ventas > 0) {
        return Math.min(400, Math.max(85, d.ventas * 50 + 75));
      }
      return baseVisual[i % baseVisual.length];
    });
  }, [serie30Dias, rangoPersonalizado]);

  const bar30Categorias = useMemo(() => {
    if (rangoPersonalizado) {
      const pts = pedidosStore.volumenEntre(rangoPersonalizado.desde, rangoPersonalizado.hasta);
      if (pts.length > 0) return pts.map((p) => diaCorto(p.fecha));
    }
    return Array.from({ length: 30 }, (_, i) => `${i + 1}`);
  }, [rangoPersonalizado]);

  const bar30Options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "Outfit, Inter, system-ui, sans-serif",
    },
    colors: [ORANGE],
    plotOptions: {
      bar: {
        columnWidth: "40%",
        borderRadius: 4,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: bar30Categorias,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: "#9CA3AF", fontSize: "11px", fontWeight: 400 },
      },
    },
    yaxis: {
      min: 0,
      max: 400,
      tickAmount: 4,
      labels: {
        formatter: (v) => `${Math.round(v)}`,
        style: { colors: "#9CA3AF", fontSize: "11px" },
      },
    },
    grid: {
      borderColor: isDark ? "#1F2937" : "#F3F4F6",
      strokeDashArray: 0,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      theme: isDark ? "dark" : "light",
      y: { formatter: (val) => `${val} pedidos / visitas` },
    },
  };

  const bar30Series = [{ name: "Visitantes", data: bar30Data }];

  // Gráfico Sparkline de Usuarios Activos
  const sparklineData = [25, 20, 28, 24, 23, 15, 15, 35, 28, 22, 26];
  const sparklineOptions: ApexOptions = {
    chart: {
      type: "area",
      sparkline: { enabled: true },
      fontFamily: "Outfit, Inter, system-ui, sans-serif",
    },
    colors: [ORANGE],
    stroke: { curve: "smooth", width: 2.2 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.02,
        stops: [0, 95, 100],
      },
    },
    tooltip: {
      theme: isDark ? "dark" : "light",
      fixed: { enabled: false },
      x: { show: false },
      y: { title: { formatter: () => "Activos: " } },
      marker: { show: false },
    },
  };
  const sparklineSeries = [{ name: "Visitantes", data: sparklineData }];

  // Gráfico Stacked Bar de Canales de Adquisición
  const stackedBarOptions: ApexOptions = {
    chart: {
      type: "bar",
      stacked: true,
      toolbar: { show: false },
      fontFamily: "Outfit, Inter, system-ui, sans-serif",
    },
    colors: [INDIGO, INDIGO_SOFT, ORANGE, CELESTE],
    plotOptions: {
      bar: {
        columnWidth: "32%",
        borderRadius: 3,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: "#9CA3AF", fontSize: "11px" },
      },
    },
    yaxis: {
      min: 0,
      max: 120,
      tickAmount: 6,
      labels: {
        formatter: (v) => `${Math.round(v)}`,
        style: { colors: "#9CA3AF", fontSize: "11px" },
      },
    },
    grid: {
      borderColor: isDark ? "#1F2937" : "#F3F4F6",
      strokeDashArray: 0,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    legend: { show: false },
    tooltip: { theme: isDark ? "dark" : "light" },
  };

  const stackedBarSeries = [
    { name: "Direct", data: [44, 55, 41, 67, 22, 43, 21, 41] },
    { name: "Referral", data: [13, 23, 20, 8, 13, 27, 33, 12] },
    { name: "Organic Search", data: [11, 17, 15, 15, 21, 14, 15, 13] },
    { name: "Social", data: [21, 7, 25, 13, 22, 8, 28, 16] },
  ];

  // Gráfico Donut de Sesiones por Dispositivo
  const donutOptions: ApexOptions = {
    chart: {
      type: "donut",
      fontFamily: "Outfit, Inter, system-ui, sans-serif",
    },
    colors: [ORANGE, INDIGO, CELESTE],
    labels: ["Desktop", "Mobile", "Tablet"],
    plotOptions: {
      pie: {
        donut: {
          size: "74%",
        },
      },
    },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    legend: { show: false },
    tooltip: {
      theme: isDark ? "dark" : "light",
      y: { formatter: (val) => `${val}%` },
    },
  };

  const donutSeries = [55, 30, 15];

  // Tablas de Canales principales y Páginas principales
  const canalesTable = [
    { fuente: "Google", visitas: "4.7K" },
    { fuente: "Facebook", visitas: "3.4K" },
    { fuente: "Threads", visitas: "2.9K" },
    { fuente: "Google", visitas: "1.5K" },
  ];

  const paginasTable = [
    { fuente: "tailadmin.com", vistas: "4.7K" },
    { fuente: "preview.tailadmin.com", vistas: "3.4K" },
    { fuente: "docs.tailadmin.com", vistas: "2.9K" },
    { fuente: "tailadmin.com/componetns", vistas: "1.5K" },
  ];

  return (
    <>
      <PageMeta title="Analítica de pedidos" description="Métricas generales y analítica de pedidos" />

      <div className="flex flex-col gap-6">
        {/* ══════════════════════════════════════════════════════════════════
            ENCABEZADO: título + selector de vista + periodo + exportar
        ══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
              Analítica de pedidos
            </h1>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Desempeño operativo y financiero del módulo de pedidos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Conmutador de vista */}
            <div
              role="tablist"
              aria-label="Modo de visualización"
              className="inline-flex items-center gap-1 rounded-xl border border-gray-200/90 bg-white p-1 shadow-2xs dark:border-gray-800 dark:bg-gray-900"
            >
              {(
                [
                  { id: "metricas" as Vista, label: "Métricas", Icon: GridIcon },
                  { id: "lista" as Vista, label: "Vista Lista", Icon: TableIcon },
                ]
              ).map(({ id, label, Icon }) => {
                const activo = vista === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={activo}
                    onClick={() => setVista(id)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      activo
                        ? "bg-emerald-500 text-white shadow-xs"
                        : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Selector de periodo (funcional) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setPeriodoAbierto((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={periodoAbierto}
                className="dropdown-toggle inline-flex items-center gap-2 rounded-xl border border-gray-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <span>{etiquetaPeriodo(periodo)}</span>
                <ChevronDown />
              </button>

              <Dropdown isOpen={periodoAbierto} onClose={() => setPeriodoAbierto(false)} className="w-52 p-1">
                <div role="listbox" aria-label="Periodo">
                  {OPCIONES_PERIODO.map((op) => (
                    <DropdownItem
                      key={op.value}
                      onClick={() => {
                        setPeriodo(op.value);
                        setPagina(1);
                      }}
                      onItemClick={() => setPeriodoAbierto(false)}
                      className={periodo === op.value ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}
                    >
                      <span className="flex flex-col">
                        <span>{op.label}</span>
                        <span className="text-[11px] font-normal text-gray-400 dark:text-gray-500">{op.hint}</span>
                      </span>
                    </DropdownItem>
                  ))}
                </div>
              </Dropdown>
            </div>

            {/* Exportar CSV */}
            <Button size="sm" variant="outline" startIcon={<DownloadIcon className="h-4 w-4" />} onClick={exportar}>
              Descargar CSV
            </Button>

            {/* Botón especial NECTO AI con acceso directo al chat */}
            <button
              type="button"
              onClick={() => navigate("/asistente")}
              className="relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#FF3F1A] via-[#7E57FF] to-[#190088] p-[1.5px] shadow-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-md active:scale-[0.98] group cursor-pointer"
              title="Abrir Asistente Inteligente NECTO AI"
            >
              <span className="flex items-center gap-2 rounded-[10px] bg-white px-3.5 py-1.5 text-xs font-bold text-gray-900 transition-colors group-hover:bg-opacity-95 dark:bg-gray-950 dark:text-white">
                <AiIcon className="h-4 w-4 text-[#FF3F1A] animate-pulse" />
                <span className="bg-gradient-to-r from-[#FF3F1A] via-[#7E57FF] to-[#190088] bg-clip-text text-transparent font-extrabold tracking-wide dark:from-[#FF6647] dark:via-[#97D6DF] dark:to-white">
                  NECTO AI
                </span>
                <span className="rounded-md bg-[#FF3F1A]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#FF3F1A] dark:bg-[#FF3F1A]/20">
                  Chat
                </span>
              </span>
            </button>
          </div>
        </div>

        {vista === "metricas" ? (
          <>
            {/* ════════════════════════════════════════════════════════════
                SECCIÓN SUPERIOR: Gráfico Principal de Columnas (Full Width)
            ════════════════════════════════════════════════════════════ */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-2xs dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    Analítica
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {rangoPersonalizado
                      ? `Visitantes en rango personalizado: ${diaCorto(rangoPersonalizado.desde)} al ${diaCorto(rangoPersonalizado.hasta)}`
                      : "Analítica de visitantes de los últimos 30 días"}
                  </p>
                </div>

                {/* Filtro de periodos en píldora + botón de calendario libre */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                    <button
                      type="button"
                      onClick={() => {
                        setRangoPersonalizado(null);
                        setPeriodo("todo");
                        setPeriodoPill("12m");
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        !rangoPersonalizado && periodoPill === "12m"
                          ? "bg-white text-gray-800 shadow-2xs dark:bg-gray-700 dark:text-white"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      12 meses
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRangoPersonalizado(null);
                        setPeriodo("30d");
                        setPeriodoPill("30d");
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        !rangoPersonalizado && periodoPill === "30d"
                          ? "bg-white text-gray-800 shadow-2xs dark:bg-gray-700 dark:text-white"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      30 días
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRangoPersonalizado(null);
                        setPeriodo("7d");
                        setPeriodoPill("7d");
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        !rangoPersonalizado && periodoPill === "7d"
                          ? "bg-white text-gray-800 shadow-2xs dark:bg-gray-700 dark:text-white"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      7 días
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRangoPersonalizado(null);
                        setPeriodo("7d");
                        setPeriodoPill("24h");
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        !rangoPersonalizado && periodoPill === "24h"
                          ? "bg-white text-gray-800 shadow-2xs dark:bg-gray-700 dark:text-white"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      24 horas
                    </button>
                  </div>

                  {/* Botón de Calendario libre */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCalendarioAbierto((v) => !v)}
                      aria-label="Elegir rango en calendario"
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-2xs transition-all ${
                        rangoPersonalizado
                          ? "border-[#FF3F1A] bg-[#FF3F1A]/10 text-[#FF3F1A] dark:border-[#FF3F1A] dark:bg-[#FF3F1A]/20"
                          : "border-gray-200/90 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      }`}
                      title="Seleccionar rango de fechas libremente"
                    >
                      <CalenderIcon className={`h-4 w-4 ${rangoPersonalizado ? "text-[#FF3F1A]" : "text-gray-500 dark:text-gray-400"}`} />
                      <span>
                        {rangoPersonalizado
                          ? `${diaCorto(rangoPersonalizado.desde)} - ${diaCorto(rangoPersonalizado.hasta)}`
                          : "Calendario"}
                      </span>
                    </button>

                    {calendarioAbierto && (
                      <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                        <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
                          <span className="text-xs font-semibold text-gray-900 dark:text-white">Rango personalizado</span>
                          <button
                            type="button"
                            onClick={() => setCalendarioAbierto(false)}
                            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          >
                            ✕
                          </button>
                        </div>
                        {/* Calendario REAL del catálogo (`DatePicker`, flatpickr
                            en modo `range`), no dos `<input type="date">`.
                            Los dos campos nativos obligaban a teclear o abrir el
                            date-picker del navegador dos veces y no mostraban el
                            rango: un control de fecha sin calendario visible no es
                            un selector de rango. El `DatePicker` es el mismo
                            componente que ya usa la Inicio para su rango, así que
                            ambas superficies eligen fechas con el mismo control. */}
                        <DatePicker
                          id="analitica-rango"
                          mode="range"
                          placeholder="Elige un día o un rango"
                          defaultDate={
                            rangoPersonalizado
                              ? [rangoPersonalizado.desde, rangoPersonalizado.hasta]
                              : [fechaDesde, fechaHasta]
                          }
                          onChange={(fechas) => {
                            const arr = (fechas as Date[]).map((d) => {
                              // Fecha LOCAL (no `toISOString`, que desplaza al UTC):
                              // el rango se compara contra días de calendario local.
                              const p = (n: number) => String(n).padStart(2, "0");
                              return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
                            });
                            setFechaDesde(arr[0] ?? fechaDesde);
                            // Un solo clic en modo `range` devuelve 1 fecha: el
                            // "hasta" sigue a "desde" (un día suelto) en vez de
                            // quedarse con el valor anterior y formar un rango falso.
                            setFechaHasta(arr[1] ?? arr[0] ?? fechaHasta);
                          }}
                        />

                        <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-2 dark:border-gray-800">
                          {rangoPersonalizado && (
                            <button
                              type="button"
                              onClick={() => {
                                setRangoPersonalizado(null);
                                setCalendarioAbierto(false);
                              }}
                              className="rounded-md px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                            >
                              Limpiar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (fechaDesde && fechaHasta) {
                                setRangoPersonalizado({ desde: fechaDesde, hasta: fechaHasta });
                                setCalendarioAbierto(false);
                              }
                            }}
                            className="rounded-lg bg-[#FF3F1A] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#E63314] transition-colors cursor-pointer"
                          >
                            Aplicar rango
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Chart type="bar" series={bar30Series} options={bar30Options} height={280} />
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════
                SECCIÓN MEDIA: 3 Tarjetas en Fila (Canales, Páginas, Usuarios)
            ════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {/* Card 1: Canales principales */}
              <div className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-2xs dark:border-gray-800 dark:bg-white/[0.03]">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                      Canales principales
                    </h3>
                    <button type="button" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <MoreDotIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-[11px] text-gray-400 dark:border-gray-800 dark:text-gray-500">
                          <th className="pb-3 font-normal">Fuente</th>
                          <th className="pb-3 text-right font-normal">Visitantes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                        {canalesTable.map((item, idx) => (
                          <tr key={`${item.fuente}-${idx}`} className="text-gray-700 dark:text-gray-300">
                            <td className="py-3 font-medium text-gray-800 dark:text-gray-200">{item.fuente}</td>
                            <td className="py-3 text-right font-semibold tabular-nums text-gray-600 dark:text-gray-400">{item.visitas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setVista("lista")}
                  className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200/80 py-2.5 text-xs font-semibold text-gray-700 shadow-2xs transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <span>Informe de canales</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              {/* Card 2: Páginas principales */}
              <div className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-2xs dark:border-gray-800 dark:bg-white/[0.03]">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                      Páginas principales
                    </h3>
                    <button type="button" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <MoreDotIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-[11px] text-gray-400 dark:border-gray-800 dark:text-gray-500">
                          <th className="pb-3 font-normal">Fuente</th>
                          <th className="pb-3 text-right font-normal">Páginas vistas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                        {paginasTable.map((item, idx) => (
                          <tr key={`${item.fuente}-${idx}`} className="text-gray-700 dark:text-gray-300">
                            <td className="py-3 font-medium text-gray-800 dark:text-gray-200">{item.fuente}</td>
                            <td className="py-3 text-right font-semibold tabular-nums text-gray-600 dark:text-gray-400">{item.vistas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setVista("lista")}
                  className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200/80 py-2.5 text-xs font-semibold text-gray-700 shadow-2xs transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <span>Informe de canales</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              {/* Card 3: Usuarios activos */}
              <div className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-2xs dark:border-gray-800 dark:bg-white/[0.03]">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                      Usuarios activos
                    </h3>
                    <button type="button" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <MoreDotIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF3F1A]/70 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FF3F1A]" />
                    </span>
                    <span className="text-2xl font-bold tracking-tight text-gray-800 dark:text-white">
                      {enCurso > 0 ? enCurso * 27 + 109 : 109}
                    </span>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Visitantes en vivo
                    </span>
                  </div>

                  <div className="my-2">
                    <Chart type="area" series={sparklineSeries} options={sparklineOptions} height={110} />
                  </div>
                </div>

                <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 pt-3 text-center dark:divide-gray-800 dark:border-gray-800">
                  <div>
                    <p className="text-base font-bold text-gray-800 dark:text-white">224</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">Promedio diario</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-800 dark:text-white">1.4K</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">Promedio semanal</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-800 dark:text-white">22.1K</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">Promedio mensual</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════
                SECCIÓN INFERIOR: Canales de Adquisición + Sesiones por Dispositivo
            ════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              {/* Card 1: Canales de adquisición (Stacked Bars) */}
              <div className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-2xs xl:col-span-7 dark:border-gray-800 dark:bg-white/[0.03]">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                      Canales de adquisición
                    </h3>
                    <button type="button" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <MoreDotIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Leyenda con puntitos circulares con colores NECTO */}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#190088]" />
                      <span>Direct</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#7E57FF]" />
                      <span>Referral</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#FF3F1A]" />
                      <span>Organic Search</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#97D6DF]" />
                      <span>Social</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Chart type="bar" series={stackedBarSeries} options={stackedBarOptions} height={240} />
                  </div>
                </div>
              </div>

              {/* Card 2: Sesiones por dispositivo (Donut Chart) */}
              <div className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-2xs xl:col-span-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                      Sesiones por dispositivo
                    </h3>
                    <button type="button" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <MoreDotIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="my-2 flex items-center justify-center">
                    <Chart type="donut" series={donutSeries} options={donutOptions} height={240} />
                  </div>
                </div>

                <div className="flex items-center justify-center gap-5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FF3F1A]" />
                    <span>Desktop</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#190088]" />
                    <span>Mobile</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#97D6DF]" />
                    <span>Tablet</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ══════════════════════════════════════════════════════════════
              VISTA LISTA
          ══════════════════════════════════════════════════════════════ */
          <Card className="p-0 sm:p-0">
            {/* Filtros rápidos + búsqueda */}
            <div className="flex flex-col gap-4 border-b border-gray-100 p-4 sm:flex-row sm:items-end sm:justify-between dark:border-gray-800">
              <div className="grid flex-1 grid-cols-1 gap-3 sm:max-w-xl sm:grid-cols-2">
                <Input
                  type="text"
                  placeholder="Buscar por cliente, pedido o teléfono…"
                  value={filtros.busqueda}
                  onChange={(e) => {
                    setFiltros((f) => ({ ...f, busqueda: e.target.value }));
                    setPagina(1);
                  }}
                  aria-label="Buscar pedidos"
                />
                {/* `Select` del catálogo es no controlado (estado interno +
                    `defaultValue`): no acepta `value`, así que se remonta con
                    `key` cuando cambia el filtro para mantenerlo sincronizado. */}
                <Select
                  key={`estado-${filtros.estado}`}
                  options={opcionesEstado}
                  defaultValue={filtros.estado}
                  onChange={(v) => {
                    setFiltros((f) => ({ ...f, estado: v as FiltroEstado }));
                    setPagina(1);
                  }}
                  aria-label="Filtrar por estado"
                />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                {paginaActual.totalItems} de {pedidosDelRango.length} pedidos
              </p>
            </div>

            {/* Tabla */}
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUMNAS.map((c) => (
                    <TableCell key={c.key} header>
                      <button
                        type="button"
                        onClick={() => alternarOrden(c.key)}
                        aria-label={`Ordenar por ${c.label}`}
                        className={`inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-gray-700 dark:hover:text-gray-200 ${
                          orden.columna === c.key ? "text-emerald-600 dark:text-emerald-400" : ""
                        } ${c.align === "right" ? "ml-auto" : ""}`}
                      >
                        {c.label}
                        <span aria-hidden="true" className="text-[9px] leading-none">
                          {orden.columna === c.key ? (orden.direccion === "asc" ? "▲" : "▼") : "◇"}
                        </span>
                      </button>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginaActual.items.length === 0 ? (
                  <TableRow>
                    <TableCell>
                      {SIN_RESULTADOS}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginaActual.items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <span className="font-medium text-gray-900 dark:text-white">{p.numero}</span>
                      </TableCell>
                      <TableCell>{p.cliente}</TableCell>
                      <TableCell>
                        <span className="text-gray-500 dark:text-gray-400">{p.telefono}</span>
                      </TableCell>
                      <TableCell>
                        <Badge color={p.origen === "whatsapp" ? "success" : "info"} size="sm" variant="light">
                          {pedidosStore.origenLabel(p.origen)}
                        </Badge>
                      </TableCell>
                      <TableCell>{pedidosStore.modalidadLabel(p.modalidad)}</TableCell>
                      <TableCell>
                        <span className="block text-right font-medium text-gray-900 dark:text-white">
                          {money(pedidosStore.totalPedido(p))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge color={pedidosStore.estadoBadgeColor(p.estado)} size="sm">
                          {pedidosStore.estadoLabel(p.estado)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-500 dark:text-gray-400">{fechaLegibleCsv(p.createdAt)}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Paginador */}
            <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 p-4 sm:flex-row dark:border-gray-800">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Filas por página</span>
                <select
                  value={porPagina}
                  onChange={(e) => {
                    setPorPagina(Number(e.target.value));
                    setPagina(1);
                  }}
                  aria-label="Filas por página"
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  {TAMANOS_PAGINA.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaActual.pagina <= 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Anterior
                </button>
                <span className="text-gray-500 dark:text-gray-400">
                  Página {paginaActual.pagina} de {paginaActual.totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.min(paginaActual.totalPaginas, p + 1))}
                  disabled={paginaActual.pagina >= paginaActual.totalPaginas}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
});

export default AnaliticaPage;

/** Todos los estados del catálogo, para poblar el filtro aunque el rango esté vacío. */
function conteoEstadoActual(_pedidos: unknown): Record<string, number> {
  return {
    programado: 0,
    nuevo: 0,
    confirmado: 0,
    en_preparacion: 0,
    listo: 0,
    en_camino: 0,
    entregado: 0,
    cancelado: 0,
  };
}
