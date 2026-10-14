import { useMemo } from "react";
import { observer } from "mobx-react-lite";
import { uiStore } from "@/stores";

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
 * **Limitations:**
 * - Deep merge is limited for complex nested options.
 *   See `TECH_DEBT.md` (Chart wrapper - Deep merge limitado).
 * - No `onEvent` callbacks exposed (dataPointSelection, etc.).
 * - Coupled to MobX `uiStore` for theme detection.
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
    const themeDefaults: ApexOptions = isDark
      ? {
          chart: { background: "transparent" },
          grid: { borderColor: "#1a2332" },
          xaxis: {
            labels: { style: { colors: "#9CA3AF" } },
            axisBorder: { color: "#374151" },
          },
          yaxis: { labels: { style: { colors: ["#9CA3AF"] } } },
          legend: { labels: { colors: "#D1D5DB" } },
          tooltip: { theme: "dark" },
        }
      : {
          chart: { background: "transparent" },
          grid: { borderColor: "#F2F4F7" },
          xaxis: {
            labels: { style: { colors: "#344054" } },
            axisBorder: { color: "#E4E7EC" },
          },
          yaxis: { labels: { style: { colors: ["#344054"] } } },
          legend: { labels: { colors: "#344054" } },
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