import { useState } from "react";
import type { ApexOptions } from "apexcharts";
import { observer } from "mobx-react-lite";
import { Card } from "@/elements/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import { BarChart } from "@/elements/ui/bar-chart";
import { LineChart } from "@/elements/ui/line-chart";
import { operadoresStore, type Operador } from "@/stores";
import { StarRating } from "./StarRating";

const SERIE_COLORS = ["#465fff", "#12b76a"];
type TipoGrafica = "bar" | "line";

/** Iniciales a partir del nombre. */
const inicialesDe = (nombre: string) => {
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : (p[0]?.[1] ?? ""))).toUpperCase();
};

/** Valor numérico: número destacado, o guion tenue si es 0. */
const Metrica = ({ value }: { value: number }) =>
  value > 0 ? (
    <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{value}</span>
  ) : (
    <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
  );

/**
 * OperariosEncuestas — sección de la vista de admin de Encuestas.
 *
 * Mide las encuestas que cada operador COMPARTIÓ MANUALMENTE (las automáticas
 * del sistema no cuentan aquí). Tabla + gráfica comparativa. Métricas mock.
 */
export const OperariosEncuestas = observer(() => {
  const operarios = operadoresStore.porModulo("turnos");

  return (
    <Card className="p-0 sm:p-0">
      {/* Encabezado de la sección */}
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Encuestas compartidas por operarios</h3>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Solo cuenta las encuestas que cada operario comparte manualmente. Las automáticas del sistema no se incluyen aquí.
        </p>
      </div>

      {operarios.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Aún no tienes operarios en Turnos.
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell header>Operario</TableCell>
                <TableCell header>Compartidas</TableCell>
                <TableCell header>Respuestas</TableCell>
                <TableCell header>Calificación prom.</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operarios.map((op) => <OperarioRow key={op.id} op={op} />)}
            </TableBody>
          </Table>

          <EncuestasChart operarios={operarios} />
        </>
      )}
    </Card>
  );
});

/** Fila de un operario con sus métricas de encuestas. */
const OperarioRow = observer(({ op }: { op: Operador }) => {
  const stats = operadoresStore.encuestaStatsDe(op.id);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
            {inicialesDe(op.nombre)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-800 dark:text-white/90">{op.nombre}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{op.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell><Metrica value={stats.compartidas} /></TableCell>
      <TableCell><Metrica value={stats.respuestas} /></TableCell>
      <TableCell>
        {stats.respuestas > 0 ? (
          <StarRating value={stats.calificacionProm} size="sm" showValue />
        ) : (
          <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
        )}
      </TableCell>
    </TableRow>
  );
});

/**
 * EncuestasChart — comparativa de operarios por encuestas compartidas y
 * respuestas recibidas. Selector de tipo (barras / línea).
 */
const EncuestasChart = observer(({ operarios }: { operarios: Operador[] }) => {
  const [tipo, setTipo] = useState<TipoGrafica>("bar");

  const nombres = operarios.map((o) => o.nombre);
  const stats = operarios.map((o) => operadoresStore.encuestaStatsDe(o.id));

  const series = [
    { name: "Compartidas", data: stats.map((s) => s.compartidas) },
    { name: "Respuestas", data: stats.map((s) => s.respuestas) },
  ];

  const options: ApexOptions = {
    colors: SERIE_COLORS,
    chart: { fontFamily: "DM Sans, sans-serif", toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: "55%", borderRadius: 4, borderRadiusApplication: "end" } },
    stroke: tipo === "line" ? { curve: "smooth", width: 2 } : { show: false },
    dataLabels: { enabled: false },
    xaxis: {
      categories: nombres,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    legend: { position: "top", horizontalAlign: "right", fontFamily: "DM Sans" },
    grid: { yaxis: { lines: { show: true } } },
  };

  return (
    <div className="border-t border-gray-100 px-5 py-5 dark:border-gray-800 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Comparativa de encuestas compartidas</h4>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoGrafica)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          aria-label="Tipo de gráfica"
        >
          <option value="bar">Barras</option>
          <option value="line">Línea</option>
        </select>
      </div>
      {tipo === "bar" ? (
        <BarChart series={series} options={options} height={300} />
      ) : (
        <LineChart series={series} options={options} height={300} />
      )}
    </div>
  );
});

export default OperariosEncuestas;
