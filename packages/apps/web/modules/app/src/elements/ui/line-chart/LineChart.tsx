import { Chart } from "@/elements/ui/chart";
import type { ChartProps } from "@/elements/ui/chart";
import type { ApexOptions } from "apexcharts";

/**
 * Props for the **LineChart** component.
 * Same as ChartProps but without `type` (defaults to `"area"`).
 * @kgId 759925b4225d
 */
export interface LineChartProps {
  /** Chart data series. */
  series: ChartProps["series"];
  /** ApexCharts configuration options. */
  options?: ApexOptions;
  /** Chart height in pixels or CSS string. */
  height?: number | string;
  /** Chart width in pixels or CSS string. */
  width?: number | string;
  /** Additional CSS class for the wrapper `<div>`. */
  className?: string;
  /**
   * Chart sub-type: `"area"` (default) renders with gradient fill,
   * `"line"` renders a plain line without fill.
   * @default "area"
   */
  chartType?: "area" | "line";
}

/**
 * LineChart — Thin wrapper over `Chart` with `type="area"` by default.
 *
 * @kgId 8b2f6e4a1c07
 */
export function LineChart({
  series,
  options,
  height,
  width,
  className,
  chartType = "area",
}: LineChartProps) {
  return (
    <Chart
      type={chartType}
      series={series}
      options={options}
      height={height}
      width={width}
      className={className}
    />
  );
}

export default LineChart;
