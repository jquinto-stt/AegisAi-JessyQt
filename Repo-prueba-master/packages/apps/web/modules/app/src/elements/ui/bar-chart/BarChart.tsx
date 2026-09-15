import { Chart } from "@/elements/ui/chart";
import type { ChartProps } from "@/elements/ui/chart";
import type { ApexOptions } from "apexcharts";

/**
 * Props for the **BarChart** component.
 * Same as ChartProps but without `type` (fixed to `"bar"`).
 * @kgId c889accac564
 */
export interface BarChartProps {
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
}

/**
 * BarChart — Thin wrapper over `Chart` with `type="bar"`.
 *
 * @kgId 4a7e1b3c9d02
 */
export function BarChart({ series, options, height, width, className }: BarChartProps) {
  return (
    <Chart
      type="bar"
      series={series}
      options={options}
      height={height}
      width={width}
      className={className}
    />
  );
}

export default BarChart;
