import React from "react";
import { ChevronRight, Package } from "lucide-react";
import { Card } from "@/elements/ui/card";
import { fotoDeProducto } from "./productos.fotos";
import { formatearEntero } from "@/stores";

export interface ProductoVendidoItem {
  id: string;
  nombre: string;
  variantes?: number;
  categoria: string;
  stock: number;
  colorEstado?: string;
}

const ITEMS_DEFAULT: ProductoVendidoItem[] = [
  {
    id: "art-ofi-1001",
    nombre: "Papel bond carta 75 g reprográfico",
    variantes: 6,
    categoria: "Papelería & Oficina",
    stock: 120,
    colorEstado: "bg-[#FF3F1A]",
  },
  {
    id: "art-emb-2001",
    nombre: "Caja de cartón corrugado 40x30x25",
    categoria: "Empaque & Embalaje",
    stock: 820,
    colorEstado: "bg-[#97D6DF]",
  },
  {
    id: "art-ele-4001",
    nombre: "Cinta aislante negra 3M Temflex 19mm",
    variantes: 4,
    categoria: "Electricidad & Redes",
    stock: 120,
    colorEstado: "bg-[#FF3F1A]",
  },
  {
    id: "art-fer-3001",
    nombre: "Juego de destornilladores de precisión",
    variantes: 2,
    categoria: "Ferretería & Taller",
    stock: 45,
    colorEstado: "bg-[#190088]",
  },
];

export function BestSellingProductsCard({
  items = ITEMS_DEFAULT,
  onVerMas,
  onSeleccionar,
}: {
  items?: ProductoVendidoItem[];
  onVerMas?: () => void;
  onSeleccionar?: (id: string) => void;
}) {
  return (
    <Card className="flex flex-col gap-5 p-5 sm:p-6 h-full font-sans border-[#ECECEC] dark:border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold tracking-tight text-[#190088] dark:text-white">
          Best selling product
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

      {/* Lista de productos */}
      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const foto = fotoDeProducto(item.id);
          return (
            <div
              key={item.id}
              onClick={() => onSeleccionar?.(item.id)}
              className="group flex items-center gap-3.5 rounded-2xl border border-[#ECECEC] bg-white p-3 transition-all hover:border-[#97D6DF] dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-[#97D6DF]/60 cursor-pointer"
            >
              {/* Thumbnail con borde Gris claro #ECECEC */}
              <div className="relative flex size-12 sm:size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#ECECEC] bg-white p-1 dark:border-white/10 dark:bg-white/[0.04]">
                {foto ? (
                  <img
                    src={foto.src}
                    alt={foto.alt || item.nombre}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <Package className="h-6 w-6 text-[#97D6DF]" />
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-[#212121] dark:text-white group-hover:text-[#FF3F1A] transition-colors">
                  {item.nombre}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] font-normal text-[#212121]/70 dark:text-[#ECECEC]/70">
                  {item.variantes && (
                    <span className="rounded-md bg-[#97D6DF]/25 px-2 py-0.5 text-[12px] font-bold text-[#190088] dark:text-[#97D6DF]">
                      {item.variantes} variants
                    </span>
                  )}
                  {item.variantes && <span className="text-[#ECECEC] dark:text-white/20">•</span>}
                  <span className="truncate max-w-[120px] sm:max-w-none">{item.categoria}</span>
                  <span className="text-[#ECECEC] dark:text-white/20">•</span>
                  <span className="inline-flex items-center gap-1 text-[#212121] dark:text-white font-normal whitespace-nowrap">
                    <span aria-hidden>📦</span>
                    <span>Stocked: <strong className="font-bold">{formatearEntero(item.stock)}</strong> in stock</span>
                  </span>
                </div>
              </div>

              {/* Indicador de estado a la derecha */}
              {item.colorEstado && (
                <div
                  className={`h-4 w-1 shrink-0 rounded-full ${item.colorEstado}`}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
