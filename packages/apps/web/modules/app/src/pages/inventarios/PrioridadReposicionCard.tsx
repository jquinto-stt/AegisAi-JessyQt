import React from "react";
import { Package } from "lucide-react";
import { ETIQUETA_UNIDAD, formatearEntero, type ItemReorden } from "@/stores";
import { fotoDeProducto } from "./productos.fotos";
import { DistintivoStock, EnlaceTexto, NivelStock, Tarjeta, Vacio } from "./inventario.ui";

/** Lo primero de la cola de reorden: agotados antes que bajos, con la cantidad sugerida a pedir. */
export function PrioridadReposicionCard({
  items,
  total,
  onVerCola,
  onSeleccionar,
}: {
  items: ItemReorden[];
  total: number;
  onVerCola?: () => void;
  onSeleccionar?: (articuloId: string) => void;
}) {
  return (
    <Tarjeta
      titulo="Reponer primero"
      detalle={total > items.length ? `${items.length} de ${total} en la cola de reorden` : undefined}
      accion={onVerCola && total > 0 && <EnlaceTexto onClick={onVerCola}>Ver cola</EnlaceTexto>}
    >
      {items.length === 0 ? (
        <Vacio>Nada por reponer: todo está sobre su punto de reorden.</Vacio>
      ) : (
        <ul className="-my-1">
          {items.map((i) => {
            const a = i.articulo;
            const foto = fotoDeProducto(a.id);
            return (
              <li key={a.id} className="border-t border-gray-100 first:border-t-0 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => onSeleccionar?.(a.id)}
                  className="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-500 dark:hover:bg-white/[0.03]"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-white p-1 dark:border-white/10 dark:bg-white/[0.04]">
                    {foto ? (
                      <img src={foto.src} alt="" className="h-full w-full object-contain" loading="lazy" />
                    ) : (
                      <Package className="h-5 w-5 text-gray-400" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 font-bold text-ink-body group-hover:underline sm:line-clamp-1 dark:text-white">{a.nombre}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <DistintivoStock estado={i.estado} />
                      <span className="hidden sm:inline-flex">
                        <NivelStock stock={i.stock} puntoReorden={a.puntoReorden} stockMaximo={a.stockMaximo} estado={i.estado} ancho="w-16" />
                      </span>
                      <span className="text-theme-xs tabular-nums text-gray-600 dark:text-gray-400">
                        {formatearEntero(i.stock)} de mín. {formatearEntero(a.puntoReorden)}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-theme-xs text-gray-600 dark:text-gray-400">Pedir</span>
                    <span className="block font-bold tabular-nums text-ink-body dark:text-white">
                      {i.sugerido > 0 ? formatearEntero(i.sugerido) : "—"}
                    </span>
                    {i.sugerido > 0 && (
                      <span className="block text-theme-xs text-gray-600 dark:text-gray-400">{ETIQUETA_UNIDAD[a.unidad].toLowerCase()}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Tarjeta>
  );
}
