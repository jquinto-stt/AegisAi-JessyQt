import React from "react";
import { formatearEntero, formatearMoneda } from "@/stores";
import { EnlaceTexto, Tarjeta, Vacio } from "./inventario.ui";

export interface ValorCategoria {
  categoria: string;
  valor: number;
  skus: number;
  alertas: number;
}

/** Dónde está el dinero del inventario: valor a costo por categoría, de mayor a menor. */
export function ValorPorCategoriaCard({
  categorias,
  valorTotal,
  onVerCatalogo,
}: {
  categorias: ValorCategoria[];
  valorTotal: number;
  onVerCatalogo?: () => void;
}) {
  const maximo = Math.max(1, ...categorias.map((c) => c.valor));
  return (
    <Tarjeta
      titulo="Valor por categoría"
      detalle="A costo de compra"
      accion={onVerCatalogo && <EnlaceTexto onClick={onVerCatalogo}>Ver catálogo</EnlaceTexto>}
    >
      {categorias.length === 0 ? (
        <Vacio>Todavía no hay artículos con existencias.</Vacio>
      ) : (
        <ul className="grid gap-x-10 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
          {categorias.map((c) => {
            const pct = valorTotal > 0 ? Math.round((c.valor / valorTotal) * 100) : 0;
            return (
              <li key={c.categoria}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-bold text-ink-body dark:text-white">{c.categoria}</span>
                  <span className="shrink-0 tabular-nums text-ink-body dark:text-white">{formatearMoneda(c.valor)}</span>
                </div>
                <span
                  className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10"
                  role="img"
                  aria-label={`${pct}% del valor del inventario`}
                >
                  <span className="block h-full rounded-full bg-ink-title dark:bg-accent-300" style={{ width: `${(c.valor / maximo) * 100}%` }} />
                </span>
                <p className="mt-1 text-theme-xs text-gray-600 dark:text-gray-400">
                  {pct}% del valor · {formatearEntero(c.skus)} {c.skus === 1 ? "artículo" : "artículos"}
                  {c.alertas > 0 && (
                    <span className="font-bold text-brand-700 dark:text-brand-400">
                      {" "}· {formatearEntero(c.alertas)} por reponer
                    </span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Tarjeta>
  );
}
