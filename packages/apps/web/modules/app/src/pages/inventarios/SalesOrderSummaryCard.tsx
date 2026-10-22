import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/elements/ui/card";

interface DiaResumen {
  dia: string;
  nombreCompleto: string;
  pedidos: number; // En miles (e.g. 65 = 65K)
  retornos: number; // En miles (e.g. 18 = 18K)
}

const DIAS_DEFAULT: DiaResumen[] = [
  { dia: "MON", nombreCompleto: "Lunes", pedidos: 65, retornos: 18 },
  { dia: "TUE", nombreCompleto: "Martes", pedidos: 78, retornos: 38 },
  { dia: "WED", nombreCompleto: "Miércoles", pedidos: 52, retornos: 8 },
  { dia: "THU", nombreCompleto: "Jueves", pedidos: 90, retornos: 50 },
  { dia: "FRI", nombreCompleto: "Viernes", pedidos: 68, retornos: 22 },
  { dia: "SAT", nombreCompleto: "Sábado", pedidos: 52, retornos: 14 },
  { dia: "SUN", nombreCompleto: "Domingo", pedidos: 88, retornos: 10 },
];

export function SalesOrderSummaryCard({
  dias = DIAS_DEFAULT,
  semana = "Week 1: 12 Jan - 19 Jan",
}: {
  dias?: DiaResumen[];
  semana?: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Escala máxima: 100K
  const MAX_K = 100;

  return (
    <Card className="flex flex-col justify-between gap-5 p-5 sm:p-6 h-full font-sans border-[#ECECEC] dark:border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold tracking-tight text-[#190088] dark:text-white">
          Sales order summary
        </h3>

        {/* Dropdown de semana */}
        <div className="flex items-center gap-1.5 rounded-lg border border-[#ECECEC] bg-white px-2.5 py-1 text-[12px] font-normal text-[#212121] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#ECECEC] cursor-pointer hover:border-[#97D6DF] transition-colors">
          <span className="h-3 w-0.5 rounded-full bg-[#97D6DF]" aria-hidden />
          <span>{semana}</span>
          <ChevronDown className="h-3.5 w-3.5 text-[#212121]/60 dark:text-[#ECECEC]/60" />
        </div>
      </div>

      {/* Gráfico de barras dobles */}
      <div className="relative mt-2 flex items-end gap-2 sm:gap-4">
        {/* Eje Y */}
        <div className="flex h-44 flex-col justify-between pb-6 text-right text-[12px] font-light text-[#212121]/60 dark:text-[#ECECEC]/60 select-none">
          <span>100K</span>
          <span>75K</span>
          <span>50K</span>
          <span>25K</span>
          <span>0</span>
        </div>

        {/* Columnas de los 7 días */}
        <div className="grid flex-1 grid-cols-7 gap-2 sm:gap-3.5">
          {dias.map((d, idx) => {
            const hPedidos = Math.min(100, Math.round((d.pedidos / MAX_K) * 100));
            const hRetornos = Math.min(100, Math.round((d.retornos / MAX_K) * 100));
            const esHover = hoverIndex === idx;

            return (
              <div
                key={d.dia}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                className="group flex flex-col items-center gap-2 cursor-pointer"
              >
                {/* Cápsula de fondo con Gris claro #ECECEC */}
                <div className="relative flex h-44 w-full max-w-[38px] items-end justify-center gap-1 rounded-2xl bg-[#ECECEC]/50 p-1 dark:bg-white/[0.04] transition-colors group-hover:bg-[#ECECEC] dark:group-hover:bg-white/[0.08]">
                  {/* Tooltip flotante */}
                  {esHover && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-lg bg-[#212121] px-2.5 py-1 text-[12px] font-normal text-white shadow-lg pointer-events-none dark:bg-white dark:text-[#212121]">
                      {d.dia}: {d.pedidos}K pedidos · {d.retornos}K dev.
                    </div>
                  )}

                  {/* Barra Azul profundo NECTO #190088 (Sales order) */}
                  <div
                    className="w-2.5 sm:w-3 rounded-full bg-[#190088] dark:bg-[#97D6DF] transition-all duration-300"
                    style={{ height: `${hPedidos}%` }}
                    title={`${d.dia} - Sales order: ${d.pedidos}K`}
                  />

                  {/* Barra Cyan NECTO #97D6DF (Sales returned) */}
                  <div
                    className="w-2.5 sm:w-3 rounded-full bg-[#97D6DF] dark:bg-[#FF3F1A] transition-all duration-300"
                    style={{ height: `${hRetornos}%` }}
                    title={`${d.dia} - Sales returned: ${d.retornos}K`}
                  />
                </div>

                {/* Etiqueta del día */}
                <span className="text-[12px] font-bold text-[#212121]/70 dark:text-[#ECECEC]/70 group-hover:text-[#190088] dark:group-hover:text-white transition-colors select-none">
                  {d.dia}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda inferior */}
      <div className="flex items-center justify-center gap-6 text-[12px] font-normal text-[#212121]/80 dark:text-[#ECECEC]/80 select-none">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-[#190088] dark:bg-[#97D6DF]" />
          <span>Sales order</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-[#97D6DF] dark:bg-[#FF3F1A]" />
          <span>Sales returned</span>
        </div>
      </div>
    </Card>
  );
}
