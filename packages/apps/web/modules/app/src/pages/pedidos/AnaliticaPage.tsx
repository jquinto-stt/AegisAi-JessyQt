import { useState } from "react";
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
import { DownloadIcon, ChevronDownIcon, GridIcon, TableIcon, MoreDotIcon, CalenderIcon, ShootingStarIcon } from "@/icons";
import { uiStore, pedidosStore, ETIQUETA_PAGO } from "@/stores";
import { puede } from "@/stores/acceso.utils";
import { retardoEscalonado } from "@/utils";
import type { PedidoEstado } from "@/stores";
import { SinDatos } from "./SinDatos";

// ═══════════════════════════════════════════════════════════════════════════
// PALETA OFICIAL NECTO
//
// Solo el naranja de marca vive aquí: los colores por estado, canal, modalidad y
// pago son catálogos y salen de `analitica.utils`, para que un gráfico y su
// leyenda no puedan pintar lo mismo de dos colores distintos.
// ═══════════════════════════════════════════════════════════════════════════
const ORANGE = "#FF3C10";

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
  /** Retardo de entrada escalonado, en ms (p. ej. `"80ms"`). */
  retardo?: string;
}

const KpiCard = ({ title, value, subtitle, retardo }: KpiProps) => (
  <div
    className="animate-entrada-lista flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-xs transition-shadow hover:shadow-theme-sm dark:border-gray-800/80 dark:bg-gray-900"
    style={{ animationDelay: retardo }}
  >
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
    <h2 className="text-base font-semibold text-ink-title dark:text-white">{title}</h2>
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

  // Solo los estados que de verdad aparecen en la VENTANA DIBUJADA: pintar las 8
  // series daría una leyenda llena de estados que en este tramo no existen.
  //
  // Ojo con la fuente: se mira la serie, no el rango. En "todo el historial" el
  // rango abarca todo pero el gráfico se acota a 30 días (igual que el de arriba),
  // así que contar por rango mostraría estados con recuento y sin barra.
  const estadosPresentes = ORDEN_ESTADO.filter((e) => serieEstado.some((d) => d.porEstado[e] > 0));
  const totalEnVentana = (e: PedidoEstado) => serieEstado.reduce((s, d) => s + d.porEstado[e], 0);

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

  /**
   * En "todo el historial" los KPIs abarcan todo pero los gráficos se acotan a 30
   * días (`diasDeSerie`). Sin decirlo, la cabecera prometía un alcance que el
   * gráfico no tenía.
   */
  const notaVentana = rango ? "" : " · gráficos: últimos 30 días";

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

  // ── Gráficos: TODO lo que se pinta sale del store ────────────────────────
  //
  // Aquí vivían cuatro bloques con datos inventados de un panel web genérico:
  // "Visitantes" (30 valores fijos que además se escalaban con `d.ventas * 50 +
  // 75` para que la silueta quedara bonita), canales Direct/Referral/Organic
  // Search/Social, sesiones Desktop/Mobile/Tablet y tablas con Google, Facebook
  // y tailadmin.com. Ninguno medía un pedido, y el usuario leía esas cifras como
  // si fueran de su negocio. Ahora cada serie es una agregación real del store, y
  // el orden y el color salen del catálogo de `analitica.utils` para que un
  // gráfico y su leyenda no puedan discrepar.

  // Sparkline de la tarjeta "En curso": volumen real de los últimos 11 días.
  const sparklineData = pedidosStore.volumenPorDia(11).map((d) => d.total);

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
      gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 95, 100] },
    },
    tooltip: {
      theme: isDark ? "dark" : "light",
      fixed: { enabled: false },
      x: { show: false },
      y: { title: { formatter: () => "Pedidos: " } },
      marker: { show: false },
    },
  };
  const sparklineSeries = [{ name: "Pedidos", data: sparklineData }];

  // Barras del gráfico principal: pedidos por día de la ventana elegida.
  const volumenOptions: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "Outfit, Inter, system-ui, sans-serif",
    },
    colors: [ORANGE],
    plotOptions: {
      bar: { columnWidth: "40%", borderRadius: 4, borderRadiusApplication: "end" },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: volumenDiario.map((d) => diaCorto(d.fecha)),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#a1a1a1", fontSize: "11px", fontWeight: 400 } },
    },
    yaxis: {
      min: 0,
      // Sin `max` fijo: el eje lo escala Apex según el día con más pedidos. El
      // techo hardcodeado de 400 dejaba las barras aplastadas contra el suelo.
      forceNiceScale: true,
      tickAmount: 4,
      labels: {
        formatter: (v) => `${Math.round(v)}`,
        style: { colors: "#a1a1a1", fontSize: "11px" },
      },
    },
    grid: {
      borderColor: isDark ? "#282828" : "#f4f4f4",
      strokeDashArray: 0,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      theme: isDark ? "dark" : "light",
      y: { formatter: (val) => `${val} pedido${val === 1 ? "" : "s"}` },
    },
  };

  const volumenSeries = [{ name: "Pedidos", data: volumenDiario.map((d) => d.total) }];

  // ── Promedios de la tarjeta "En curso" ───────────────────────────────────
  // La tasa diaria es real (total ÷ días de la ventana); semanal y mensual son
  // esa misma tasa proyectada, y así se rotulan: "promedio", no "total".
  const promediosFilas = [
    { etiqueta: "Promedio diario", valor: promedio(promedios.diario) },
    { etiqueta: "Promedio semanal", valor: num(promedios.semanal) },
    { etiqueta: "Promedio mensual", valor: num(promedios.mensual) },
  ];

  // ── Barras apiladas: pedidos por estado a lo largo de la ventana ─────────
  // Una serie por estado PRESENTE en el periodo, no cuatro categorías fijas.
  const stackedOptions: ApexOptions = {
    chart: {
      type: "bar",
      stacked: true,
      toolbar: { show: false },
      fontFamily: "Outfit, Inter, system-ui, sans-serif",
    },
    colors: estadosPresentes.map((e) => COLOR_ESTADO[e]),
    plotOptions: {
      bar: { columnWidth: "32%", borderRadius: 3, borderRadiusApplication: "end" },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: serieEstado.map((d) => diaCorto(d.fecha)),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#a1a1a1", fontSize: "11px" } },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      tickAmount: 5,
      labels: {
        formatter: (v) => `${Math.round(v)}`,
        style: { colors: "#a1a1a1", fontSize: "11px" },
      },
    },
    grid: {
      borderColor: isDark ? "#282828" : "#f4f4f4",
      strokeDashArray: 0,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    legend: { show: false },
    tooltip: { theme: isDark ? "dark" : "light" },
  };

  const stackedSeries = estadosPresentes.map((e) => ({
    name: pedidosStore.estadoLabel(e),
    data: serieEstado.map((d) => d.porEstado[e]),
  }));

  // ── Donut: estado de pago de los pedidos del periodo ─────────────────────
  const donutOptions: ApexOptions = {
    chart: { type: "donut", fontFamily: "Outfit, Inter, system-ui, sans-serif" },
    colors: [COLOR_PAGO.pagado, COLOR_PAGO.pendiente],
    // Las etiquetas del pago salen de la constante del store, no de literales:/n    // el mismo hueco se rotulaba «Pendiente» aquí y «Pendiente de pago» en el
    // tablero. «Pendiente» a secas está tomado por el estado del hilo y por la
    // etapa del CRM, así que el gráfico no puede reutilizarlo.
    labels: [ETIQUETA_PAGO.pagado, ETIQUETA_PAGO.sinPagar],
    plotOptions: { pie: { donut: { size: "74%" } } },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    legend: { show: false },
    tooltip: {
      theme: isDark ? "dark" : "light",
      y: { formatter: (val) => `${val} pedido${val === 1 ? "" : "s"}` },
    },
  };

  const donutSeries = [porPago.pagado, porPago.pendiente];

  /** Leyenda del donut: cada porción con su recuento y su porcentaje real. */
  const leyendaPago = [
    {
      clave: "pagado",
      etiqueta: ETIQUETA_PAGO.pagado,
      color: COLOR_PAGO.pagado,
      total: porPago.pagado,
      cuota: cuotasPago[0] ?? 0,
    },
    {
      clave: "pendiente",
      etiqueta: ETIQUETA_PAGO.sinPagar,
      color: COLOR_PAGO.pendiente,
      total: porPago.pendiente,
      cuota: cuotasPago[1] ?? 0,
    },
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
            <h1 className="text-2xl font-bold tracking-tight text-ink-title sm:text-3xl dark:text-white">
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
              className="inline-flex items-center gap-1 rounded-xl border border-gray-200/90 bg-white p-1 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
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
                        ? "bg-success-500 text-white shadow-theme-xs"
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
                className="dropdown-toggle inline-flex items-center gap-2 rounded-xl border border-gray-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
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
                      className={periodo === op.value ? "font-semibold text-success-600 dark:text-success-400" : ""}
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

            {/* Acceso directo a NECTO AI.
                Píldora con **anillo degradado, relleno claro y texto en
                degradado**, más el destello de `ShootingStarIcon` — un icono que
                ya estaba en el proyecto sin un solo consumidor.

                El degradado recorre las **tres rampas de marca** en orden
                luminoso: `brand-500` (naranja NECTO) → `secondary-300` (violeta)
                → `accent-300` (cian). El original usaba esas mismas tres rampas
                pero terminaba en índigo `#15008B`, tan oscuro que un extremo del
                anillo se fundía con el fondo y el conjunto se leía sucio. Aquí
                las tres son claras, así que el recorrido se lee como color, no
                como mancha.

                **Animación al pasar el ratón** — el degradado va a doble ancho
                (`bg-[length:200%_100%]`) y el hover desplaza su posición de 0% a
                100%: los colores de NECTO **fluyen a través del anillo**. Se
                suma un halo cálido, el botón levanta 1px y el destello gira. La
                animación es la del propio degradado, así que no hace falta ni un
                `@keyframes` nuevo.

                **El texto lleva tonos MÁS OSCUROS que el anillo, y no es un
                descuido.** `accent-300` (#71d6e0) sobre blanco da 1.65:1 de
                contraste: ilegible. El anillo puede permitírselo porque es
                decoración; el texto no. Por eso el texto va por
                `brand-700` → `secondary-400` → `accent-700` (5.9:1, 8.1:1 y
                5.8:1) y los tonos claros se quedan en el anillo.

                Solo se ofrece a quien puede entrar: `/asistente` está guardada
                por `assistant.use`. */}
            {puede("assistant.use") && (
              <button
                type="button"
                onClick={() => navigate("/asistente")}
                title="Abrir NECTO AI — asistente interno"
                className="group inline-flex h-9 shrink-0 items-center rounded-full bg-gradient-to-r from-brand-500 via-secondary-300 to-accent-300 bg-[length:200%_100%] bg-[position:0%_50%] p-[1.5px] shadow-theme-md shadow-secondary-300/25 transition-all duration-500 ease-out hover:-translate-y-px hover:bg-[position:100%_50%] hover:shadow-theme-lg hover:shadow-brand-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
              >
                <span className="flex h-full items-center gap-2 rounded-full bg-white px-3.5 dark:bg-secondary-900">
                  <ShootingStarIcon className="h-4 w-4 shrink-0 text-brand-500 transition-transform duration-300 ease-out group-hover:rotate-[18deg] group-hover:scale-110 dark:text-brand-400" />
                  <span className="whitespace-nowrap bg-gradient-to-r from-brand-700 via-secondary-400 to-accent-700 bg-clip-text text-xs font-semibold text-transparent dark:from-brand-300 dark:via-secondary-200 dark:to-accent-200">
                    NECTO AI
                  </span>
                </span>
              </button>
            )}
          </div>
        </div>

        {vista === "metricas" ? (
          <>
            {/* ════════════════════════════════════════════════════════════
                FILA DE KPIs — cifras reales del rango seleccionado
                El subtítulo de la página promete "desempeño operativo y
                financiero", así que el dinero tiene que estar a la vista: antes
                se calculaban ingresos, ticket promedio y tasa de cancelación y
                se descartaban sin pintarlos.
            ════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <KpiCard
                title="Pedidos del periodo"
                value={num(totalPedidos)}
                subtitle={`${etiquetaRango}${notaVentana}`}
                retardo={retardoEscalonado(0)}
              />
              <KpiCard
                title="Ingresos vendidos"
                value={money(ingresosVendidos)}
                subtitle={`${num(vendidos)} pedido${vendidos === 1 ? "" : "s"} vendido${vendidos === 1 ? "" : "s"}`}
                retardo={retardoEscalonado(1)}
              />
              <KpiCard
                title="Ticket promedio"
                value={money(aov)}
                subtitle="Por pedido vendido"
                retardo={retardoEscalonado(2)}
              />
              <KpiCard
                title="Tasa de cancelación"
                value={pct(tasaCancelacion)}
                subtitle={`${num(cancelados)} cancelado${cancelados === 1 ? "" : "s"} en el periodo`}
                retardo={retardoEscalonado(3)}
              />
              <KpiCard
                title="Tiempo de ciclo"
                value={tiempoCiclo > 0 ? `${num(tiempoCiclo)} min` : "—"}
                subtitle="De la creación a la entrega"
                retardo={retardoEscalonado(4)}
              />
              <KpiCard
                title="En curso ahora"
                value={num(enCurso)}
                subtitle={`${num(programados)} programado${programados === 1 ? "" : "s"} esperando`}
                retardo={retardoEscalonado(5)}
              />
            </div>

            {/* ════════════════════════════════════════════════════════════
                SECCIÓN SUPERIOR: Gráfico Principal de Columnas (Full Width)
            ════════════════════════════════════════════════════════════ */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-ink-title dark:text-white/90">
                    Pedidos por día
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {etiquetaRango} · {num(totalPedidos)} pedido{totalPedidos === 1 ? "" : "s"} en el periodo
                    {notaVentana}
                  </p>
                </div>

                {/* Filtro de periodos en píldora + botón de calendario libre.
                    Las píldoras salen de `PILLS_PERIODO`, que es el catálogo real
                    de `Periodo`: antes había una cuarta píldora "24 horas" que por
                    dentro seleccionaba la ventana de 7 días, y el estado activo
                    vivía en una variable aparte que podía desincronizarse del
                    periodo de verdad. */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                    {PILLS_PERIODO.map(({ id, label }) => {
                      const activo = !rangoPersonalizado && periodo === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={activo}
                          onClick={() => {
                            setRangoPersonalizado(null);
                            setPeriodo(id);
                            setPagina(1);
                          }}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                            activo
                              ? "bg-white text-gray-800 shadow-theme-xs dark:bg-gray-700 dark:text-white"
                              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Botón de Calendario libre */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCalendarioAbierto((v) => !v)}
                      aria-label="Elegir rango en calendario"
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-theme-xs transition-all ${
                        rangoPersonalizado
                          ? "border-brand-500 bg-brand-500/10 text-brand-500 dark:border-brand-500 dark:bg-brand-500/20"
                          : "border-gray-200/90 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      }`}
                      title="Seleccionar rango de fechas libremente"
                    >
                      <CalenderIcon className={`h-4 w-4 ${rangoPersonalizado ? "text-brand-500" : "text-gray-500 dark:text-gray-400"}`} />
                      <span>
                        {rangoPersonalizado
                          ? `${diaCorto(rangoPersonalizado.desde)} - ${diaCorto(rangoPersonalizado.hasta)}`
                          : "Calendario"}
                      </span>
                    </button>

                    {calendarioAbierto && (
                      <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xl dark:border-gray-700 dark:bg-gray-900">
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
                            // Fecha LOCAL vía `ymdLocal` (no `toISOString`, que
                            // desplaza al UTC): el rango se compara contra días de
                            // calendario local.
                            const arr = (fechas as Date[]).map((d) => ymdLocal(d));
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
                            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-theme-xs hover:bg-brand-600 transition-colors cursor-pointer"
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
                {totalPedidos === 0 ? (
                  <SinDatos que="pedidos" />
                ) : (
                  <Chart type="bar" series={volumenSeries} options={volumenOptions} height={280} />
                )}
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════
                SECCIÓN MEDIA: canal + modalidad + ritmo de pedidos
                Las tres tarjetas leen del store: reparto por canal de entrada,
                reparto por modalidad de entrega y estado vivo del tablero.
            ════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {/* Card 1: Pedidos por canal de entrada */}
              <div className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
                <div>
                  <CardTitle title="Pedidos por canal" hint={`WhatsApp y mostrador · ${etiquetaRango}`} />

                  <div className="mt-4 space-y-3">
                    {filasCanal.map((f) => (
                      <div key={f.clave}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                            {f.etiqueta}
                          </span>
                          <span className="tabular-nums text-gray-500 dark:text-gray-400">
                            {num(f.total)} · {f.cuota}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${f.cuota}%`, backgroundColor: f.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setVista("lista")}
                  className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200/80 py-2.5 text-xs font-semibold text-gray-700 shadow-theme-xs transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <span>Ver los pedidos del periodo</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              {/* Card 2: Pedidos por modalidad de entrega */}
              <div className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
                <div>
                  <CardTitle
                    title="Modalidades de entrega"
                    hint={`${pedidosStore.config.modalidades.map((m) => pedidosStore.modalidadLabel(m)).join(", ")} · ${etiquetaRango}`}
                  />

                  <div className="mt-4 space-y-3">
                    {filasModalidad.map((f) => (
                      <div key={f.clave}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                            {f.etiqueta}
                          </span>
                          <span className="tabular-nums text-gray-500 dark:text-gray-400">
                            {num(f.total)} · {f.cuota}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${f.cuota}%`, backgroundColor: f.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setVista("lista")}
                  className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200/80 py-2.5 text-xs font-semibold text-gray-700 shadow-theme-xs transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <span>Ver los pedidos del periodo</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              {/* Card 3: Pedidos en curso (estado vivo del tablero) */}
              <div className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
                <div>
                  <CardTitle
                    title="Pedidos en curso"
                    hint={`En vivo ahora · promedios de ${etiquetaRango}`}
                  />

                  <div className="mt-3 flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500/70 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-500" />
                    </span>
                    <span className="text-2xl font-bold tracking-tight text-gray-800 dark:text-white">
                      {num(enCurso)}
                    </span>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">en curso</span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                    {num(programados)} programado{programados === 1 ? "" : "s"} esperando su hora
                  </p>

                  <div className="my-2">
                    {sparklineData.some((n) => n > 0) ? (
                      <Chart type="area" series={sparklineSeries} options={sparklineOptions} height={110} />
                    ) : (
                      <p className="flex h-[110px] items-center justify-center text-[11px] text-gray-400 dark:text-gray-500">
                        Sin pedidos en los últimos 11 días.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 pt-3 text-center dark:divide-gray-800 dark:border-gray-800">
                  {promediosFilas.map((p) => (
                    <div key={p.etiqueta}>
                      <p className="text-base font-bold text-gray-800 dark:text-white">{p.valor}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">{p.etiqueta}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════
                SECCIÓN INFERIOR: pedidos por estado + estado de pago
            ════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              {/* Card 1: Pedidos por estado (barras apiladas por día) */}
              <div className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-theme-xs xl:col-span-7 dark:border-gray-800 dark:bg-white/[0.03]">
                <div>
                  <CardTitle
                    title="Pedidos por estado"
                    hint={`Un segmento por estado del pipeline · ${etiquetaRango}${notaVentana}`}
                  />

                  {/* Leyenda derivada de los estados PRESENTES en la ventana, cada
                      uno con su recuento real. Antes eran cuatro etiquetas fijas
                      (Direct / Referral / Organic Search / Social). */}
                  {estadosPresentes.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                      {estadosPresentes.map((e) => (
                        <div key={e} className="flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: COLOR_ESTADO[e] }}
                          />
                          <span>{pedidosStore.estadoLabel(e)}</span>
                          <span className="tabular-nums text-gray-400 dark:text-gray-500">
                            ({num(totalEnVentana(e))})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4">
                    {estadosPresentes.length > 0 ? (
                      <Chart type="bar" series={stackedSeries} options={stackedOptions} height={240} />
                    ) : (
                      <SinDatos que="pedidos" />
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: Estado de pago (donut) */}
              <div className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-theme-xs xl:col-span-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <div>
                  <CardTitle title="Estado de pago" hint={`Pagado y pendiente · ${etiquetaRango}`} />

                  <div className="my-2 flex items-center justify-center">
                    {totalPedidos > 0 ? (
                      <Chart type="donut" series={donutSeries} options={donutOptions} height={240} />
                    ) : (
                      <SinDatos que="pedidos" />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  {leyendaPago.map((p) => (
                    <div key={p.clave} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span>
                        {p.etiqueta} · {num(p.total)} ({p.cuota}%)
                      </span>
                    </div>
                  ))}
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
                          orden.columna === c.key ? "text-success-600 dark:text-success-400" : ""
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
