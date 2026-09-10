import { Chart } from "@/elements/ui/chart";
import type { ChartProps } from "@/elements/ui/chart";
import type { ApexOptions } from "apexcharts";

/**
 * Props for the **PieChart** component.
 * Same as ChartProps but without `type` (fixed to `"donut"`).
 * @kgId 1073d4480c55
 */
export interface PieChartProps {
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
 * PieChart — Thin wrapper over `Chart` with `type="donut"`.
 *
 * @kgId 5c3d9e7f2a18
 */
export function PieChart({ series, options, height, width, className }: PieChartProps) {
  return (
    <Chart
      type="donut"
      series={series}
      options={options}
      height={height}
      width={width}
      className={className}
    />
  );
}

export default PieChart;
