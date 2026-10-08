import { useState } from "react";
import { useSearchParams } from "react-router";
import type { ApexOptions } from "apexcharts";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Chart } from "@/elements/ui/chart";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/elements/ui/table";
import { Input } from "@/elements/form/input";
import { Select } from "@/elements/form/select";
import { DownloadIcon, ChevronDownIcon, GridIcon, TableIcon, TaskIcon, MoreDotIcon, CalenderIcon } from "@/icons";
import { uiStore, pedidosStore, ETIQUETA_PAGO } from "@/stores";
import { retardoEscalonado } from "@/utils";
import type { PedidoEstado } from "@/stores";
import { SinDatos } from "./SinDatos";
import { HistorialPage } from "./HistorialPage";
import { CalendarioRangoDropdown } from "./CalendarioRangoDropdown";

// ═══════════════════════════════════════════════════════════════════════════
// PALETA OFICIAL NECTO
//
// Solo el naranja de marca vive aquí: los colores por estado, canal, modalidad y
// pago son catálogos y salen de `analitica.utils`, para que un gráfico y su
// leyenda no puedan pintar lo mismo de dos colores distintos.
// ═══════════════════════════════════════════════════════════════════════════
const ORANGE = "#ff3f1a";

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
  diasDeSerie,
  etiquetaPeriodo,
  fechaLegibleCsv,
  filasCsv,
  filtrarLista,
  nombreArchivoCsv,
  ordenarLista,
  paginar,
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

type Vista = "metricas" | "historial" | "lista";

export const AnaliticaPage = observer(() => {
  const isDark = uiStore.isDarkMode;
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Estado de la vista ───────────────────────────────────────────────────
  const vistaInicial =
    searchParams.get("vista") === "historial" || searchParams.get("vista") === "lista"
      ? "historial"
      : "metricas";
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [periodo, setPeriodo] = useState<Periodo>("7d");
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

  // Métricas de proceso
  const tiempoCiclo = pedidosStore.tiempoPromedioCicloMin;

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
    const filas =
      vista === "historial" || vista === "lista"
        ? pedidosDelRango.filter((p) => p.estado === "entregado" || p.estado === "cancelado")
        : pedidosDelRango;
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
      labels: { style: { colors: "#98a2b3", fontSize: "11px", fontWeight: 400 } },
    },
    yaxis: {
      min: 0,
      // Sin `max` fijo: el eje lo escala Apex según el día con más pedidos. El
      // techo hardcodeado de 400 dejaba las barras aplastadas contra el suelo.
      forceNiceScale: true,
      tickAmount: 4,
      labels: {
        formatter: (v) => `${Math.round(v)}`,
        style: { colors: "#98a2b3", fontSize: "11px" },
      },
    },
    grid: {
      borderColor: isDark ? "#1d2939" : "#ececec",
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
      labels: { style: { colors: "#98a2b3", fontSize: "11px" } },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      tickAmount: 5,
      labels: {
        formatter: (v) => `${Math.round(v)}`,
        style: { colors: "#98a2b3", fontSize: "11px" },
      },
    },
    grid: {
      borderColor: isDark ? "#1d2939" : "#ececec",
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
              Consulta el comportamiento de tus pedidos y sus principales resultados.
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
                  { id: "historial" as Vista, label: "Historial", Icon: TaskIcon },
                ]
              ).map(({ id, label, Icon }) => {
                const activo = vista === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={activo}
                    onClick={() => {
                      setVista(id);
                      setSearchParams(id === "historial" ? { vista: "historial" } : {});
                    }}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      activo
                        ? "bg-accent-500 text-white shadow-theme-xs"
                        : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Selector de periodo y exportar CSV (estandarizados para Métricas e Historial) */}
            {/* Selector de periodo y rango con calendario desplegable */}
            <CalendarioRangoDropdown
              desde={rango?.desde ?? ""}
              hasta={rango?.hasta ?? ""}
              alineacion="right"
              etiquetaActiva={rangoPersonalizado ? undefined : etiquetaPeriodo(periodo)}
              onChange={(d, h) => {
                if (!d && !h) {
                  setPeriodo("todo");
                  setRangoPersonalizado(null);
                } else if (d && h) {
                  setRangoPersonalizado({ desde: d, hasta: h });
                }
                setPagina(1);
              }}
              onLimpiar={() => {
                setPeriodo("todo");
                setRangoPersonalizado(null);
                setPagina(1);
              }}
              presets={[
                {
                  id: "7d",
                  label: "Últimos 7 días",
                  hint: "La última semana",
                  getRango: () => {
                    setPeriodo("7d");
                    setRangoPersonalizado(null);
                    return rangoDePeriodo("7d");
                  },
                },
                {
                  id: "30d",
                  label: "Últimos 30 días",
                  hint: "El último mes",
                  getRango: () => {
                    setPeriodo("30d");
                    setRangoPersonalizado(null);
                    return rangoDePeriodo("30d");
                  },
                },
                {
                  id: "todo",
                  label: "Todo el historial",
                  hint: "Sin límite de fecha",
                  getRango: () => {
                    setPeriodo("todo");
                    setRangoPersonalizado(null);
                    return null;
                  },
                },
              ]}
            />

            <Button size="sm" variant="outline" startIcon={<DownloadIcon className="h-4 w-4" />} onClick={exportar}>
              Descargar CSV
            </Button>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

                  {/* Selector de Calendario para el Gráfico */}
                  <CalendarioRangoDropdown
                    desde={rangoPersonalizado?.desde ?? ""}
                    hasta={rangoPersonalizado?.hasta ?? ""}
                    alineacion="right"
                    placeholder="Calendario"
                    etiquetaActiva={
                      rangoPersonalizado
                        ? `${diaCorto(rangoPersonalizado.desde)} – ${diaCorto(rangoPersonalizado.hasta)}`
                        : undefined
                    }
                    onChange={(d, h) => {
                      if (!d && !h) {
                        setRangoPersonalizado(null);
                      } else {
                        setRangoPersonalizado({ desde: d, hasta: h });
                      }
                      setPagina(1);
                    }}
                    onLimpiar={() => {
                      setRangoPersonalizado(null);
                      setPagina(1);
                    }}
                  />
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
                SECCIÓN MEDIA: Canales de entrada y Modalidades de entrega
            ════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Card 1: Pedidos por canal de entrada */}
              <div className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
                <div>
                  <CardTitle title="¿Cómo llegan tus pedidos?" hint={`WhatsApp, mostrador y web · ${etiquetaRango}`} />

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
                  onClick={() => {
                    setVista("historial");
                    setSearchParams({ vista: "historial" });
                  }}
                  className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200/80 py-2.5 text-xs font-semibold text-gray-700 shadow-theme-xs transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white cursor-pointer"
                >
                  <span>Ver pedidos en historial</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              {/* Card 2: Pedidos por modalidad de entrega */}
              <div className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
                <div>
                  <CardTitle
                    title="¿Cómo se entregan?"
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
                  onClick={() => {
                    setVista("historial");
                    setSearchParams({ vista: "historial" });
                  }}
                  className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200/80 py-2.5 text-xs font-semibold text-gray-700 shadow-theme-xs transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white cursor-pointer"
                >
                  <span>Ver pedidos en historial</span>
                  <span aria-hidden="true">→</span>
                </button>
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
              HISTORIAL DE PEDIDOS
          ══════════════════════════════════════════════════════════════ */
          <div className="mt-1">
            <HistorialPage sinHeader rangoExterno={rango} />
          </div>
        )}
      </div>
    </>
  );
});

export default AnaliticaPage;
