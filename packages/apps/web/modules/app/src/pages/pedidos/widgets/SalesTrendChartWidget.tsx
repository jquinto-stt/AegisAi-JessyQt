import { useState } from "react";
import type { ApexOptions } from "apexcharts";
import { observer } from "mobx-react-lite";

import { Card } from "@/elements/ui/card";
import { DatePicker } from "@/elements/form/date-picker";
import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { LineChart } from "@/elements/ui/line-chart";
import { pedidosStore } from "@/stores";
import { SinDatos } from "../SinDatos";
import { ORANGE, CabeceraWidget } from "./widgets.comunes";

// ═══════════════════════════════════════════════════════════════════════════
// GRÁFICO DE TENDENCIA DE VENTAS
// ═══════════════════════════════════════════════════════════════════════════
//
// Se extrajo de `InicioPage` sin cambiar su comportamiento, incluida la
// granularidad adaptativa y el modal de rango. Lo que sí se conserva con
// cuidado es la decisión de NO rellenar: si el tramo elegido no tiene pedidos,
// se pinta el estado vacío en vez de una onda inventada.
//
// Esa regla tiene historia en este repo y merece repetirse: antes se dibujaba
// una serie falsa con `Math.sin` para que el gráfico «se viera», marcada con un
// distintivo «Demo». En un panel de negocio nadie distingue de un vistazo una
// serie falsa de una real, y se decide con ella. El widget puede quedarse
// vacío; lo que no puede es mentir.
// ═══════════════════════════════════════════════════════════════════════════

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** "YYYY-MM-DD" de una fecha local. */
const ymd = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Fecha corta legible para un eje: "5 sep". */
const fmtCorto = (fecha: string) =>
  new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" });

// ── Modal de rango ─────────────────────────────────────────────────────────

const RangoCalendarioModal = ({
  onClose,
  onAplicar,
}: {
  onClose: () => void;
  onAplicar: (desde: string, hasta: string) => void;
}) => {
  const [sel, setSel] = useState<string[]>([]);

  // Un día = ese día (desde=hasta); dos = el rango ordenado.
  const aplicar = () => {
    if (sel.length === 0) return;
    if (sel.length === 1) {
      onAplicar(sel[0], sel[0]);
      return;
    }
    const [a, b] = sel[0] <= sel[1] ? [sel[0], sel[1]] : [sel[1], sel[0]];
    onAplicar(a, b);
  };

  const hoy = new Date();
  const menos = (n: number) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - n);
    return d;
  };
  const atajos = [
    { label: "Hoy", desde: ymd(hoy), hasta: ymd(hoy) },
    { label: "Ayer", desde: ymd(menos(1)), hasta: ymd(menos(1)) },
    { label: "Últimos 7 días", desde: ymd(menos(6)), hasta: ymd(hoy) },
    { label: "Últimos 30 días", desde: ymd(menos(29)), hasta: ymd(hoy) },
  ];

  return (
    <Modal isOpen onClose={onClose} className="max-w-md p-6">
      <h2 className="mb-1 text-xl font-bold text-gray-800 dark:text-white/90">Elegir periodo</h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Elige un día o un rango. Un solo día muestra ese día.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {atajos.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => onAplicar(a.desde, a.hasta)}
            className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-brand-500/10"
          >
            {a.label}
          </button>
        ))}
      </div>

      <DatePicker
        id="rango-grafico"
        mode="range"
        placeholder="Elige un día o un rango"
        onChange={(dates) => setSel((dates as Date[]).map(ymd))}
      />

      <div className="mt-5 flex items-center justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button size="sm" disabled={sel.length === 0} onClick={aplicar}>
          Aplicar
        </Button>
      </div>
    </Modal>
  );
};

// ── Widget ─────────────────────────────────────────────────────────────────

export const SalesTrendChartWidget = observer(
  ({ alto = 300 }: { alto?: number }) => {
    const [rango, setRango] = useState<{ desde: string; hasta: string } | null>(null);
    const [calendarioOpen, setCalendarioOpen] = useState(false);

    // Granularidad adaptativa, decidida por el RANGO y no por el usuario:
    //  · un solo día       → por HORA (la curva del día)
    //  · un rango de días  → por DÍA
    //  · sin rango         → últimos 7 días, por día
    const unSoloDia = !!rango && rango.desde === rango.hasta;
    const puntos: { etiqueta: string; total: number }[] = unSoloDia
      ? pedidosStore
          .volumenPorHora(rango!.desde, 6, 22)
          .map((h) => ({ etiqueta: h.etiqueta, total: h.total }))
      : rango
        ? pedidosStore
            .volumenEntre(rango.desde, rango.hasta)
            .map((d) => ({ etiqueta: fmtCorto(d.fecha), total: d.total }))
        : pedidosStore
            .volumenPorDia(7)
            .map((d) => ({
              etiqueta: DIAS[(new Date(`${d.fecha}T00:00:00`).getDay() + 6) % 7],
              total: d.total,
            }));

    const real = puntos.map((p) => p.total);
    const vacio = real.every((n) => n === 0);

    const options: ApexOptions = {
      colors: [ORANGE],
      chart: { fontFamily: "DM Sans, sans-serif", toolbar: { show: false } },
      stroke: { curve: "straight", width: 1.6 },
      fill: {
        type: "gradient",
        gradient: { opacityFrom: 0.28, opacityTo: 0, shadeIntensity: 0.4, stops: [0, 100] },
      },
      dataLabels: { enabled: false },
      markers: { size: 0, strokeColors: ORANGE, strokeWidth: 2, hover: { size: 6 } },
      xaxis: {
        categories: puntos.map((p) => p.etiqueta),
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
        crosshairs: { show: true, stroke: { color: "#94a3b8", width: 1, dashArray: 4 } },
      },
      grid: { yaxis: { lines: { show: true } } },
      legend: { show: false },
      tooltip: { x: { show: true }, marker: { show: true } },
    };

    const etiquetaRango = rango
      ? rango.desde === rango.hasta
        ? fmtCorto(rango.desde)
        : `${fmtCorto(rango.desde)} – ${fmtCorto(rango.hasta)}`
      : "Esta semana";

    return (
      <Card>
        <CabeceraWidget
          titulo="Volumen de pedidos"
          accion={etiquetaRango}
          onAccion={() => setCalendarioOpen(true)}
        />

        {vacio ? (
          <SinDatos que="pedidos" alto={alto} />
        ) : (
          <LineChart series={[{ name: "Pedidos", data: real }]} options={options} height={alto} />
        )}

        {rango && (
          <button
            type="button"
            onClick={() => setRango(null)}
            className="mt-2 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Volver a esta semana
          </button>
        )}

        {calendarioOpen && (
          <RangoCalendarioModal
            onClose={() => setCalendarioOpen(false)}
            onAplicar={(desde, hasta) => {
              setRango({ desde, hasta });
              setCalendarioOpen(false);
            }}
          />
        )}
      </Card>
    );
  },
);

export default SalesTrendChartWidget;
