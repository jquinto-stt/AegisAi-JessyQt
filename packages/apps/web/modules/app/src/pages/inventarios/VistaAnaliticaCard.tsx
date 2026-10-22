import React, { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { cx } from "./inventario.ui";

type Periodo = "day" | "week" | "month" | "quarter" | "year" | "all";

interface VistaAnaliticaProps {
  onVerDetalle?: () => void;
  stockMinimo?: number;
  stockPromedio?: number;
  stockMaximo?: number;
}

// Matriz de 12 meses (columnas) x 4 semanas (filas, de 4 a 1)
// Valores: nivel 1 (0-200), nivel 2 (200-1000), nivel 3 (1000-2000), nivel 4 (2000-3000)
const HEATMAP_DATA: Record<number, number[]> = {
  // Fila 4
  4: [2, 1, 1, 2, 4, 1, 1, 2, 4, 2, 4, 1],
  // Fila 3
  3: [1, 2, 2, 1, 1, 2, 1, 4, 1, 1, 2, 4],
  // Fila 2
  2: [1, 4, 4, 1, 1, 2, 2, 1, 1, 1, 4, 2],
  // Fila 1
  1: [4, 2, 4, 1, 2, 4, 1, 2, 4, 1, 2, 4],
};

const MESES = [
  { clave: "Jan", etiqueta: "Jan", nombre: "Enero" },
  { clave: "Feb", etiqueta: "Feb", nombre: "Febrero" },
  { clave: "Mar", etiqueta: "Mar", nombre: "Marzo" },
  { clave: "Apr", etiqueta: "Apr", nombre: "Abril" },
  { clave: "May", etiqueta: "May", nombre: "Mayo" },
  { clave: "Jun", etiqueta: "Jun", nombre: "Junio" },
  { clave: "Jul", etiqueta: "Jul", nombre: "Julio" },
  { clave: "Aug", etiqueta: "Aug", nombre: "Agosto" },
  { clave: "Sep", etiqueta: "Sep", nombre: "Septiembre" },
  { clave: "Oct", etiqueta: "Oct", nombre: "Octubre" },
  { clave: "Nov", etiqueta: "Nov", nombre: "Noviembre" },
  { clave: "Des", etiqueta: "Des", nombre: "Diciembre" },
];

const PERIODOS: { id: Periodo; etiqueta: string }[] = [
  { id: "day", etiqueta: "Day" },
  { id: "week", etiqueta: "Week" },
  { id: "month", etiqueta: "Month" },
  { id: "quarter", etiqueta: "Quarter" },
  { id: "year", etiqueta: "Year" },
  { id: "all", etiqueta: "All" },
];

export function VistaAnaliticaCard({
  onVerDetalle,
  stockMinimo = 97,
  stockPromedio = 140,
  stockMaximo = 259,
}: VistaAnaliticaProps) {
  const [periodoActivo, setPeriodoActivo] = useState<Periodo>("year");
  const [celdaHover, setCeldaHover] = useState<{ fila: number; colIdx: number; valor: number } | null>(null);

  // Mapeo de colores por nivel (exactos al diseño proporcionado)
  const colorNivel = (nivel: number) => {
    switch (nivel) {
      case 1:
        return "bg-[#EEF1FE] dark:bg-[#1E2340] border-transparent";
      case 2:
        return "bg-[#C8D4FD] dark:bg-[#2C3875] border-transparent";
      case 3:
        return "bg-[#8CA2FF] dark:bg-[#4357B8] border-transparent";
      case 4:
        return "bg-[#2A23F7] dark:bg-[#3D35FA] border-transparent";
      default:
        return "bg-[#EEF1FE] dark:bg-[#1E2340] border-transparent";
    }
  };

  const rangoTexto = (nivel: number) => {
    switch (nivel) {
      case 1:
        return "0 – 200";
      case 2:
        return "200 – 1,000";
      case 3:
        return "1,000 – 2,000";
      case 4:
        return "2,000 – 3,000";
      default:
        return "";
    }
  };

  return (
    <section
      className="relative w-full rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900/60 font-sans"
      aria-labelledby="analytic-view-title"
    >
      {/* ── Encabezado ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id="analytic-view-title"
          className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-white"
        >
          Analytic View
        </h2>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Selector de periodos */}
          <div className="flex items-center gap-1 sm:gap-2">
            {PERIODOS.map((p) => {
              const activo = periodoActivo === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodoActivo(p.id)}
                  className={cx(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs sm:text-sm font-medium transition-all cursor-pointer select-none",
                    activo
                      ? "border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
                  )}
                >
                  {activo && <span className="size-2 rounded-full bg-[#2A23F7] dark:bg-[#3D35FA]" />}
                  <span>{p.etiqueta}</span>
                </button>
              );
            })}
          </div>

          {/* Botón de acceso directo / ampliar */}
          {onVerDetalle && (
            <button
              type="button"
              onClick={onVerDetalle}
              title="Ver reporte detallado de movimientos"
              aria-label="Ver reporte detallado"
              className="flex size-8 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white cursor-pointer"
            >
              <ArrowUpRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Métricas principales (Minimal, Average, Maximum) ──── */}
      <div className="mt-6 sm:mt-8 grid grid-cols-3 items-start gap-4">
        {/* Minimal stock */}
        <div>
          <div className="flex items-center gap-1 text-2xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            <span>{stockMinimo}</span>
            <span className="text-xs sm:text-sm font-semibold text-gray-400 dark:text-gray-500">↗</span>
          </div>
          <p className="mt-1 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            Minimal stock
          </p>
        </div>

        {/* Average stock */}
        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1 text-2xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            <span>{stockPromedio}</span>
            <span className="text-xs sm:text-sm font-semibold text-gray-400 dark:text-gray-500">↗</span>
          </div>
          <p className="mt-1 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            Average stock
          </p>
        </div>

        {/* Maximum stock */}
        <div className="text-right sm:text-left">
          <div className="flex items-center justify-end sm:justify-start gap-1 text-2xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            <span>{stockMaximo}</span>
            <span className="text-xs sm:text-sm font-semibold text-gray-400 dark:text-gray-500">↗</span>
          </div>
          <p className="mt-1 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            Maximum stock
          </p>
        </div>
      </div>

      {/* ── Matriz Heatmap (12 columnas x 4 filas) ───────────── */}
      <div className="mt-8 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="min-w-[620px]">
          {/* Filas 4, 3, 2, 1 */}
          <div className="flex flex-col gap-2.5">
            {[4, 3, 2, 1].map((fila) => (
              <div key={fila} className="flex items-center gap-3">
                {/* Etiqueta del eje Y */}
                <span className="w-4 shrink-0 text-right text-xs font-medium text-gray-400 dark:text-gray-500 select-none">
                  {fila}
                </span>

                {/* Celdas de los 12 meses */}
                <div className="grid flex-1 grid-cols-12 gap-2.5">
                  {MESES.map((m, colIdx) => {
                    const nivel = HEATMAP_DATA[fila][colIdx] || 1;
                    const esHover =
                      celdaHover?.fila === fila && celdaHover?.colIdx === colIdx;

                    return (
                      <div
                        key={m.clave}
                        onMouseEnter={() => setCeldaHover({ fila, colIdx, valor: nivel })}
                        onMouseLeave={() => setCeldaHover(null)}
                        className={cx(
                          "relative h-10 sm:h-12 w-full rounded-xl sm:rounded-2xl transition-transform hover:scale-105 cursor-pointer",
                          colorNivel(nivel),
                        )}
                        title={`${m.nombre} (Semana ${fila}): ${rangoTexto(nivel)} unidades`}
                      >
                        {esHover && (
                          <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg pointer-events-none dark:bg-gray-100 dark:text-gray-900">
                            {m.etiqueta} W{fila}: {rangoTexto(nivel)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Eje X (Nombres de los meses) */}
          <div className="mt-3 flex items-center gap-3">
            <span className="w-4 shrink-0" aria-hidden />
            <div className="grid flex-1 grid-cols-12 gap-2.5 text-center text-xs font-medium text-gray-400 dark:text-gray-500 select-none">
              {MESES.map((m) => (
                <span key={m.clave}>{m.etiqueta}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Leyenda inferior (Transaction Stock) ─────────────── */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 select-none">
        <span className="font-semibold text-gray-800 dark:text-gray-200">
          Transaction Stock
        </span>

        <div className="flex items-center gap-2">
          <span className="size-3.5 rounded bg-[#EEF1FE] dark:bg-[#1E2340]" />
          <span>(0 - 200)</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="size-3.5 rounded bg-[#C8D4FD] dark:bg-[#2C3875]" />
          <span>(200 - 1,000)</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="size-3.5 rounded bg-[#8CA2FF] dark:bg-[#4357B8]" />
          <span>(1,000 - 2,000)</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="size-3.5 rounded bg-[#2A23F7] dark:bg-[#3D35FA]" />
          <span>(2,000 - 3,000)</span>
        </div>
      </div>
    </section>
  );
}
