import type { ApexOptions } from "apexcharts";
import { observer } from "mobx-react-lite";
import { Card, CardTitle } from "@/elements/ui/card";
import { LineChart } from "@/elements/ui/line-chart";
import { BarChart } from "@/elements/ui/bar-chart";
import { queuesStore } from "@/stores";

const ORANGE = "#FF3F1A";
const INDIGO = "#190088";
const WARN = "#FDB022";

/**
 * SurveyCharts — Rating trend, distribution, and satisfaction per queue.
 */
export const SurveyCharts = observer(() => {
  const trend = queuesStore.ratingTrend;
  const dist = queuesStore.ratingDistribution; // [5,4,3,2,1]
  const byQueue = queuesStore.avgByQueue;

  // ── Trend (line) ──
  const trendOptions: ApexOptions = {
    colors: [ORANGE],
    chart: { fontFamily: "DM Sans, sans-serif", toolbar: { show: false } },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0 } },
    dataLabels: { enabled: false },
    xaxis: { categories: trend.map((t) => t.day), axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: 0, max: 5, tickAmount: 5 },
    grid: { yaxis: { lines: { show: true } } },
    legend: { show: false },
  };
  const trendSeries = [{ name: "Promedio", data: trend.map((t) => t.avg) }];

  // ── Distribution (horizontal bar) ──
  const distOptions: ApexOptions = {
    colors: [WARN],
    chart: { fontFamily: "DM Sans, sans-serif", toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 5, borderRadiusApplication: "end", barHeight: "55%" } },
    dataLabels: { enabled: true },
    xaxis: { categories: ["5 ★", "4 ★", "3 ★", "2 ★", "1 ★"], axisBorder: { show: false }, axisTicks: { show: false } },
    legend: { show: false },
    grid: { xaxis: { lines: { show: true } } },
  };
  const distSeries = [{ name: "Respuestas", data: dist }];

  // ── Satisfaction by queue (bar) ──
  const queueOptions: ApexOptions = {
    colors: [INDIGO],
    chart: { fontFamily: "DM Sans, sans-serif", toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: "45%", borderRadius: 5, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    xaxis: { categories: byQueue.map((q) => q.name), axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: 0, max: 5, tickAmount: 5 },
    legend: { show: false },
    grid: { yaxis: { lines: { show: true } } },
  };
  const queueSeries = [{ name: "Promedio", data: byQueue.map((q) => Number(q.avg.toFixed(1))) }];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Card>
        <CardTitle>Tendencia en el tiempo</CardTitle>
        <div className="mt-4">
          <LineChart series={trendSeries} options={trendOptions} height={240} />
        </div>
      </Card>
      <Card>
        <CardTitle>Distribucion de calificaciones</CardTitle>
        <div className="mt-4">
          <BarChart series={distSeries} options={distOptions} height={240} />
        </div>
      </Card>
      <Card>
        <CardTitle>Satisfaccion por cola</CardTitle>
        <div className="mt-4">
          <BarChart series={queueSeries} options={queueOptions} height={240} />
        </div>
      </Card>
    </div>
  );
});

export default SurveyCharts;
