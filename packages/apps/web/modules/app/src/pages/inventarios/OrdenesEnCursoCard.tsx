import React from "react";
import { fechaRelativa, formatearEntero, formatearMoneda, type EstadoOrdenCompra } from "@/stores";
import { BarraAvance, cx, DistintivoOrden, EnlaceTexto, Tarjeta, Vacio } from "./inventario.ui";

export interface OrdenEnCurso {
  id: string;
  numero: string;
  proveedor: string;
  estado: EstadoOrdenCompra;
  recibidas: number;
  pedidas: number;
  valorPendiente: number;
  fechaEsperada: string | null;
  atrasada: boolean;
}

/** Órdenes de compra enviadas o parciales: cuánto llegó, cuándo llega el resto y cuánto falta por recibir. */
export function OrdenesEnCursoCard({
  ordenes,
  total,
  onVerTodas,
  onSeleccionar,
}: {
  ordenes: OrdenEnCurso[];
  total: number;
  onVerTodas?: () => void;
  onSeleccionar?: (id: string) => void;
}) {
  return (
    <Tarjeta
      titulo="Órdenes de compra en curso"
      detalle={total > ordenes.length ? `${ordenes.length} de ${total} abiertas` : undefined}
      accion={onVerTodas && <EnlaceTexto onClick={onVerTodas}>Ver órdenes</EnlaceTexto>}
    >
      {ordenes.length === 0 ? (
        <Vacio>No hay mercancía en camino.</Vacio>
      ) : (
        <ul className="-my-1">
          {ordenes.map((o) => (
            <li key={o.id} className="border-t border-gray-100 first:border-t-0 dark:border-white/5">
              <button
                type="button"
                onClick={() => onSeleccionar?.(o.id)}
                className="group -mx-2 block w-[calc(100%+1rem)] rounded-xl px-2 py-3 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-500 dark:hover:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2">
                      <span className="font-bold tabular-nums text-ink-body group-hover:underline dark:text-white">{o.numero}</span>
                      <DistintivoOrden estado={o.estado} />
                    </p>
                    <p className="mt-0.5 truncate text-theme-xs text-gray-600 dark:text-gray-400">{o.proveedor}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold tabular-nums text-ink-body dark:text-white">{formatearMoneda(o.valorPendiente)}</p>
                    <p className="text-theme-xs text-gray-600 dark:text-gray-400">por recibir</p>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <BarraAvance valor={o.recibidas} total={o.pedidas} ancho="flex-1" />
                  <span className="shrink-0 text-theme-xs tabular-nums text-gray-600 dark:text-gray-400">
                    {formatearEntero(o.recibidas)} de {formatearEntero(o.pedidas)} uds
                  </span>
                </div>
                <p
                  className={cx(
                    "mt-1.5 text-theme-xs",
                    o.atrasada ? "font-bold text-error-700 dark:text-error-400" : "text-gray-600 dark:text-gray-400",
                  )}
                >
                  {o.fechaEsperada
                    ? `${o.atrasada ? "Atrasada · se esperaba" : "Llega"} ${fechaRelativa(o.fechaEsperada)}`
                    : "Sin fecha de entrega"}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}
