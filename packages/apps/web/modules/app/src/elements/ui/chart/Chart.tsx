import { useMemo } from "react";
import { observer } from "mobx-react-lite";
import { uiStore } from "@/stores";
import { prefiereMenosMovimiento } from "@/utils";

import type { ApexOptions } from "apexcharts";
import ReactApexChart from "react-apexcharts";

/**
 * Supported ApexCharts chart types.
 * @kgId 0ed8e8ee535d
 */
export type ChartType = "line" | "area" | "bar" | "pie" | "donut" | "radialBar" | "scatter" | "bubble" | "heatmap" | "candlestick" | "boxPlot" | "radar" | "polarArea" | "rangeBar" | "rangeArea" | "treemap";

/**
 * Props for the **Chart** component.
 * @kgId 55ed7c3113dc
 */
export interface ChartProps {
  /**
   * ApexCharts chart type — determines the visualization style.
   *
   * @example
   * ```tsx
   * <Chart type="line" series={[{ data: [10, 20, 30] }]} height={350} />
   * <Chart type="donut" series={[44, 55, 13]} height={300} />
   * ```
   */
  type: ChartType;

  /**
   * Chart data series — format depends on `type`.
   * See ApexCharts documentation for series format per chart type.
   */
  series: ApexOptions["series"];

  /**
   * ApexCharts configuration options. Theme-aware defaults (grid colors,
   * axis labels, tooltip theme) are merged automatically — consumer
   * options always take precedence via deep merge.
   *
   * @default `{}`
   */
  options?: ApexOptions;

  /** Chart height in pixels or CSS string. */
  height?: number | string;

  /** Chart width in pixels or CSS string. */
  width?: number | string;

  /** Additional CSS class for the wrapper `<div>`. */
  className?: string;
}

/**
 * Chart — Theme-aware wrapper over `react-apexcharts`.
 *
 * Solves the most tedious problem of using ApexCharts with dark mode:
 * automatic synchronization of grid, axis, tooltip, and legend colors
 * with the active theme. Consumer-provided options always take precedence.
 *
 * @remarks
 * **When to use Chart:**
 * - Use `Chart` for any data visualization — line charts, bar charts,
 *   pie/donut charts, radial progress, area charts, etc.
 * - The component is type-agnostic — pass `type` to select the
 *   visualization. Specific configuration goes in `options`.
 *
 * **Theme handling:**
 * - Observes `uiStore.isDarkMode` via MobX (`observer`).
 * - Recalculates color defaults via `useMemo` on theme change.
 * - Forces a full remount via dynamic `key` (`"dark"` / `"light"`)
 *   because ApexCharts doesn't reliably update axis/grid colors
 *   through prop changes alone.
 *
 * **Options merge:**
 * - Deep merge on `chart`, `grid`, `xaxis`, `yaxis`, `legend`, `tooltip`.
 * - `yaxis` has special handling — only merges if both sides are
 *   plain objects (ApexCharts accepts object or array).
 * - Consumer values always win over theme defaults.
 *
 * **Peer dependencies:**
 * - `apexcharts ^4.1.0`
 * - `react-apexcharts ^1.7.0`
 *
 * **Animation:**
 * - Configured centrally in `chartComun`: `speed` 600, gradual series stagger
 *   and `dynamicAnimation` on data updates. Consumer `options.chart` still
 *   wins, so a caller can opt out per chart.
 * - `animation.enabled` is driven by `prefiereMenosMovimiento()`. ApexCharts
 *   animates by default and knows nothing about media queries, so the
 *   preference has to be handed to it explicitly — the `css/base.css` guard
 *   cannot reach inside the canvas.
 * - The option is `chart.animations` (**plural**) and the duration key is
 *   `speed`, not `duration`. ApexCharts silently ignores unknown keys, so a
 *   typo here produces no error, no warning and no animation — only a chart
 *   that looks exactly like it did before. Verified against the installed
 *   `apexcharts@4.7.0`: the runtime reads `.animations` 42 times and
 *   `.animation` zero times, and never reads `.animations.easing`.
 *
 * **Limitations:**
 * - Deep merge is limited for complex nested options.
 *   See `TECH_DEBT.md` (Chart wrapper - Deep merge limitado).
 * - No `onEvent` callbacks exposed (dataPointSelection, etc.).
 * - Coupled to MobX `uiStore` for theme detection.
 * - `prefiereMenosMovimiento()` is read once inside the `useMemo`, so a change
 *   to the system preference only reaches ApexCharts on the next recompute
 *   (theme switch or new `options`), not live.
 *
 * @example Line chart
 * ```tsx
 * <Chart
 *   type="line"
 *   height={350}
 *   series={[{ name: "Sales", data: [30, 40, 35, 50, 49, 60] }]}
 *   options={{ xaxis: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] } }}
 * />
 * ```
 *
 * @example Donut chart
 * ```tsx
 * <Chart
 *   type="donut"
 *   height={300}
 *   series={[44, 55, 13, 43]}
 *   options={{ labels: ["Desktop", "Mobile", "Tablet", "Other"] }}
 * />
 * ```
 *
 * @see {@link RadialTargetCard} — Pre-composed radial progress widget.
 * @kgId ce2a78a7f5df
 */
export const Chart = observer(function Chart({
  type,
  series,
  options = {},
  height,
  width,
  className,
}: ChartProps) {
  const isDark = uiStore.isDarkMode;

  const mergedOptions = useMemo<ApexOptions>(() => {
    // ── Animación ────────────────────────────────────────────────────────────
    //
    // No depende del tema, así que se define UNA vez y se reusa en las dos
    // ramas. Duplicarla en cada una sería una segunda definición de la misma
    // decisión, que es exactamente lo que este archivo evita en `grid`, `xaxis`
    // o `tooltip`.
    //
    // Hasta ahora este componente hacía deep-merge de todo eso pero **nunca
    // tocaba `chart.animation`**. ApexCharts anima por defecto (~800 ms,
    // `easein`), así que el único sitio del proyecto que animaba era el único
    // que nadie había configurado: no respetaba `prefers-reduced-motion` ni
    // compartía las curvas del resto de la app.
    //
    // 600 ms y no los 800 por defecto: estos gráficos acompañan a una decisión
    // del usuario (cambiar el periodo), y una espera de casi un segundo entre la
    // pulsación y el dato se lee como lentitud, no como elegancia.
    const chartComun: NonNullable<ApexOptions["chart"]> = {
      background: "transparent",
      // El nombre es `animations`, en PLURAL. La documentación de ApexCharts
      // circula con las dos formas, pero en la 4.7.0 instalada el runtime lee
      // `.animations` 42 veces y `.animation` **ninguna**: en singular la
      // configuración se ignora en silencio, sin aviso ni error.
      animations: {
        // ApexCharts no entiende de Tailwind ni de media queries: la
        // preferencia hay que pasársela explícitamente o ignora que existe.
        enabled: !prefiereMenosMovimiento(),
        // `speed`, no `duration`. La clave `duration` no existe en esta versión
        // y también se ignoraría sin decir nada.
        speed: 600,
        // No se fija `easing` a propósito: la 4.7.0 no lee `animations.easing`
        // (0 accesos en el runtime, y no está en sus tipos), así que ponerlo
        // sería una línea muerta que aparenta configurar algo que no configura.
        //
        // Escalonado de series. Sin esto, en las barras apiladas las tres series
        // crecen a la vez y no se distingue cuál es cuál.
        animateGradually: { enabled: true, delay: 80 },
        // Animación al ACTUALIZAR, que aquí es el caso frecuente: al cambiar el
        // rango del periodo se recalculan las series. Sin esto las barras
        // saltarían al valor nuevo en lugar de transicionar hasta él.
        dynamicAnimation: { enabled: true, speed: 350 },
      },
    };

    const themeDefaults: ApexOptions = isDark
      ? {
          chart: chartComun,
          grid: { borderColor: "#212121" },
          xaxis: {
            labels: { style: { colors: "#A1A1A1" } },
            axisBorder: { color: "#3F3F3F" },
          },
          yaxis: { labels: { style: { colors: ["#A1A1A1"] } } },
          legend: { labels: { colors: "#D5D5D5" } },
          tooltip: { theme: "dark" },
        }
      : {
          chart: chartComun,
          grid: { borderColor: "#F4F4F4" },
          xaxis: {
            labels: { style: { colors: "#535250" } },
            axisBorder: { color: "#E7E7E7" },
          },
          yaxis: { labels: { style: { colors: ["#535250"] } } },
          legend: { labels: { colors: "#535250" } },
          tooltip: { theme: "light" },
        };

    // Handle yaxis which can be object or array
    const mergedYaxis = (() => {
      const consumerY = options.yaxis;
      const defaultY = themeDefaults.yaxis;
      if (!consumerY) return defaultY;
      if (!defaultY) return consumerY;
      if (Array.isArray(consumerY) || Array.isArray(defaultY)) return consumerY;
      return {
        ...defaultY,
        ...consumerY,
        labels: {
          ...(defaultY as ApexYAxis).labels,
          ...(consumerY as ApexYAxis).labels,
          style: {
            ...(defaultY as ApexYAxis).labels?.style,
            ...(consumerY as ApexYAxis).labels?.style,
          },
        },
      };
    })();

    // Deep-merge: consumer options override theme defaults
    return {
      ...themeDefaults,
      ...options,
      chart: { ...themeDefaults.chart, ...options.chart },
      grid: { ...themeDefaults.grid, ...options.grid },
      xaxis: {
        ...themeDefaults.xaxis,
        ...options.xaxis,
        labels: {
          ...(themeDefaults.xaxis as Record<string, unknown>)?.labels as ApexOptions["xaxis"],
          ...options.xaxis?.labels,
          style: {
            ...((themeDefaults.xaxis?.labels as Record<string, unknown>)?.style as Record<string, unknown>),
            ...options.xaxis?.labels?.style,
          },
        },
        axisBorder: {
          ...(themeDefaults.xaxis as Record<string, unknown>)?.axisBorder as Record<string, unknown>,
          ...options.xaxis?.axisBorder,
        },
      },
      yaxis: mergedYaxis,
      legend: {
        ...themeDefaults.legend,
        ...options.legend,
        labels: { ...themeDefaults.legend?.labels, ...options.legend?.labels },
      },
      tooltip: { ...themeDefaults.tooltip, ...options.tooltip },
    };
  }, [options, isDark]);

  // key forces full remount on theme change — ApexCharts does not
  // reliably update grid/axis colors via prop changes alone.
  return (
    <div className={className}>
      <ReactApexChart
        key={isDark ? "dark" : "light"}
        options={mergedOptions}
        series={series}
        type={type}
        height={height}
        width={width}
      />
    </div>
  );
});

export default Chart;