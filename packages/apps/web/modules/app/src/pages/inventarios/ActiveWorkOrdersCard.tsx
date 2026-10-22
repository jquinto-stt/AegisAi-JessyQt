import React from "react";
import { Calendar, ChevronRight, DollarSign } from "lucide-react";
import { Card } from "@/elements/ui/card";
import { formatearEntero, formatearMoneda } from "@/stores";

export interface OrdenTrabajoItem {
  id: string;
  codigo: string;
  completado: number;
  requerido: number;
  fechaEsperada: string;
  costo: number;
}

const ORDENES_DEFAULT: OrdenTrabajoItem[] = [
  {
    id: "wo-026",
    codigo: "WO-026",
    completado: 500,
    requerido: 1000,
    fechaEsperada: "12 October 2026",
    costo: 10000,
  },
  {
    id: "wo-027",
    codigo: "WO-027",
    completado: 320,
    requerido: 500,
    fechaEsperada: "9 October 2026",
    costo: 8500,
  },
  {
    id: "wo-028",
    codigo: "WO-028",
    completado: 180,
    requerido: 200,
    fechaEsperada: "15 October 2026",
    costo: 4200,
  },
];

export function ActiveWorkOrdersCard({
  ordenes = ORDENES_DEFAULT,
  onVerMas,
  onSeleccionar,
}: {
  ordenes?: OrdenTrabajoItem[];
  onVerMas?: () => void;
  onSeleccionar?: (id: string) => void;
}) {
  return (
    <Card className="flex flex-col gap-5 p-5 sm:p-6 h-full font-sans border-[#ECECEC] dark:border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold tracking-tight text-[#190088] dark:text-white">
          Active work order
        </h3>
        {onVerMas && (
          <button
            type="button"
            onClick={onVerMas}
            className="group flex items-center gap-1 text-[12px] font-bold tracking-wider text-[#FF3F1A] hover:underline uppercase transition-all cursor-pointer select-none"
          >
            <span>VIEW MORE</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>

      {/* Tarjetas de órdenes */}
      <div className="flex flex-col gap-3.5">
        {ordenes.map((o) => {
          const pct = Math.min(100, Math.round((o.completado / o.requerido) * 100));

          return (
            <div
              key={o.id}
              onClick={() => onSeleccionar?.(o.id)}
              className="flex flex-col gap-3 rounded-2xl border border-[#ECECEC] bg-white p-4 transition-all hover:border-[#97D6DF] dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-[#97D6DF]/60 cursor-pointer"
            >
              {/* Línea superior: Código y desglose de cantidad */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                <span className="text-[16px] font-bold tracking-tight text-[#190088] dark:text-white">
                  {o.codigo}
                </span>

                <div className="flex items-center gap-1.5 text-[#212121]/70 dark:text-[#ECECEC]/70 font-normal">
                  <span>Total finished: <strong className="text-[#212121] dark:text-white font-bold">{formatearEntero(o.completado)}pcs</strong></span>
                  <span className="text-[#ECECEC] dark:text-white/20">·······</span>
                  <span>Required quantity: <strong className="text-[#212121] dark:text-white font-bold">{formatearEntero(o.requerido)}pcs</strong></span>
                </div>
              </div>

              {/* Barra de progreso con indicador de porcentaje */}
              <div className="relative flex items-center">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#ECECEC] dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#97D6DF] transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {/* Badge flotante con el % */}
                <span
                  className="absolute -top-2.5 -translate-x-1/2 rounded border border-[#97D6DF] bg-white dark:bg-[#212121] px-1.5 py-0.2 text-[12px] font-bold text-[#190088] dark:text-[#97D6DF] shadow-xs tabular-nums"
                  style={{ left: `${Math.max(6, Math.min(94, pct))}%` }}
                >
                  {pct}%
                </span>
              </div>

              {/* Metadatos inferiores: Fecha estimada y Costo */}
              <div className="mt-1 flex flex-wrap items-center justify-between gap-3 text-[12px] font-normal text-[#212121]/70 dark:text-[#ECECEC]/70">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#97D6DF]" />
                  <span>EXPECTED FINISHED DATE: <strong className="text-[#212121] dark:text-white font-bold">{o.fechaEsperada}</strong></span>
                </div>

                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-[#FF3F1A]" />
                  <span>WORK ORDER COST: <strong className="text-[#212121] dark:text-white font-bold">{formatearMoneda(o.costo)}</strong></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
