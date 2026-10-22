import React from "react";
import {
  deltaTotal,
  formatearDelta,
  formatearEntero,
  type Movimiento,
} from "@/stores";
import { cx, EnlaceTexto, Tarjeta } from "./inventario.ui";

const SEMANAS = 4;
const DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

/** Cuatro niveles: sin movimientos, 1, 2, 3 o más. El color sube con la actividad. */
const NIVEL = [
  "bg-gray-100 dark:bg-white/[0.06]",
  "bg-accent-300/50 dark:bg-accent-300/30",
  "bg-accent-300 dark:bg-accent-300/70",
  "bg-ink-title dark:bg-accent-200",
];
const LEYENDA = ["Sin movimientos", "1", "2", "3 o más"];

const inicioDelDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fechaCorta = (d: Date) => d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });

interface Celda {
  fecha: Date;
  movimientos: number;
  futura: boolean;
}

/**
 * Semanas de lunes a domingo, de la más antigua a la actual. Cuenta movimientos
 * por día (no unidades): una recepción de 200 cajas y un ajuste de 1 pesan lo
 * mismo, porque la pregunta es cuánto se trabajó la bodega.
 */
function construirSemanas(movimientos: Movimiento[], hoy: Date): Celda[][] {
  const base = inicioDelDia(hoy);
  const lunesActual = new Date(base);
  lunesActual.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  const inicio = new Date(lunesActual);
  inicio.setDate(lunesActual.getDate() - 7 * (SEMANAS - 1));

  const porDia = new Map<number, number>();
  for (const m of movimientos) {
    const dia = inicioDelDia(new Date(m.fecha)).getTime();
    porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
  }

  return Array.from({ length: SEMANAS }, (_, s) =>
    Array.from({ length: 7 }, (_, d) => {
      const fecha = new Date(inicio);
      fecha.setDate(inicio.getDate() + s * 7 + d);
      return {
        fecha,
        movimientos: porDia.get(fecha.getTime()) ?? 0,
        futura: fecha.getTime() > base.getTime(),
      };
    }),
  );
}

export function ActividadBodegaCard({
  movimientos,
  onVerMovimientos,
  hoy = new Date(),
}: {
  movimientos: Movimiento[];
  onVerMovimientos?: () => void;
  hoy?: Date;
}) {
  const semanas = construirSemanas(movimientos, hoy);
  const desde = semanas[0][0].fecha.getTime();
  const enPeriodo = movimientos.filter((m) => new Date(m.fecha).getTime() >= desde);

  const sumar = (tipo: Movimiento["tipo"]) =>
    enPeriodo.filter((m) => m.tipo === tipo).reduce((t, m) => t + deltaTotal(m), 0);
  const cifras = [
    { etiqueta: "Entraron", valor: formatearDelta(sumar("entrada")), nota: "unidades recibidas" },
    { etiqueta: "Salieron", valor: formatearDelta(sumar("salida")), nota: "despachos y consumo" },
    { etiqueta: "Ajustes", valor: formatearDelta(sumar("ajuste")), nota: "diferencias de conteo y bajas" },
  ];

  return (
    <Tarjeta
      titulo="Actividad de bodega"
      detalle={`Movimientos por día · últimas ${SEMANAS} semanas`}
      accion={onVerMovimientos && <EnlaceTexto onClick={onVerMovimientos}>Ver movimientos</EnlaceTexto>}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-center">
        <dl className="grid grid-cols-3 gap-4 lg:grid-cols-1 lg:gap-5">
          {cifras.map((c) => (
            <div key={c.etiqueta}>
              <dt className="text-theme-xs text-gray-600 dark:text-gray-400">{c.etiqueta}</dt>
              <dd className="mt-0.5 text-theme-2xl font-bold tabular-nums tracking-tight text-ink-title dark:text-white">
                {c.valor}
              </dd>
              <dd className="text-theme-xs text-gray-600 dark:text-gray-400">{c.nota}</dd>
            </div>
          ))}
        </dl>

        <div>
          <div
            className="grid grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-1.5 sm:gap-2"
            role="table"
            aria-label={`Movimientos registrados por día en las últimas ${SEMANAS} semanas`}
          >
            <span role="presentation" />
            {DIAS.map((d) => (
              <span key={d} role="columnheader" className="pb-1 text-center text-theme-xs text-gray-600 dark:text-gray-400">
                {d}
              </span>
            ))}
            {semanas.map((semana) => (
              <React.Fragment key={semana[0].fecha.toISOString()}>
                <span role="rowheader" className="self-center pr-2 text-right text-theme-xs tabular-nums text-gray-600 dark:text-gray-400">
                  {fechaCorta(semana[0].fecha)}
                </span>
                {semana.map((c) => {
                  const texto = c.futura
                    ? `${fechaCorta(c.fecha)}: aún no llega`
                    : `${fechaCorta(c.fecha)}: ${c.movimientos === 0 ? "sin movimientos" : `${formatearEntero(c.movimientos)} ${c.movimientos === 1 ? "movimiento" : "movimientos"}`}`;
                  return (
                    <span
                      key={c.fecha.toISOString()}
                      role="cell"
                      title={texto}
                      aria-label={texto}
                      className={cx(
                        "h-8 rounded-lg sm:h-9",
                        c.futura
                          ? "border border-dashed border-gray-200 dark:border-white/10"
                          : NIVEL[Math.min(c.movimientos, 3)],
                      )}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-theme-xs text-gray-600 dark:text-gray-400">
            {LEYENDA.map((l, i) => (
              <li key={l} className="flex items-center gap-1.5">
                <span className={cx("size-3 rounded", NIVEL[i])} aria-hidden />
                {l}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Tarjeta>
  );
}
