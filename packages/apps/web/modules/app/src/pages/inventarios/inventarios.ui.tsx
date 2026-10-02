// ═══════════════════════════════════════════════════════════════════════════
// INVENTARIOS — piezas de la cabecera de página
// ═══════════════════════════════════════════════════════════════════════════

import type { ReactNode } from "react";
import { cn } from "@/utils";

/**
 * Cabecera de una pantalla del módulo.
 *
 * Se declara aquí, una sola vez, en vez de repetir el `h1` + subtítulo +
 * acciones en once páginas: con once copias, la primera que ajuste el tamaño
 * del título deja las otras diez discrepando y nadie lo nota hasta verlas en
 * fila. Es el mismo patrón que `ConfigHeader` del proyecto, sin el borde
 * inferior, porque estas pantallas ya llevan su propia separación.
 *
 * ── El `min-w-0` va en EL PADRE, y costó una medición descubrirlo ──────────
 *
 * Estaba solo en el `<div>` del título. No basta: en una fila flex, un hijo
 * **no puede encogerse por debajo de su ancho de contenido** salvo que el
 * contenedor lo permita, y el que reparte el espacio es el padre. Con
 * `justify-between` y sin `min-w-0` arriba, el bloque del título ocupaba su
 * ancho natural completo, empujaba las acciones fuera del viewport y arrastraba
 * TODA la columna: `document.scrollWidth` daba 1656 sobre un viewport de 1425
 * —231px de desborde— y en la captura se veía «Exportar» cortado.
 *
 * Lo contraintuitivo: **`main` desbordaba 0px y el documento 231px**. Mirar solo
 * el contenedor decía «todo bien»; el exceso vivía en un elemento de la
 * cabecera. Por eso el arreglo es `min-w-0` en el padre y `truncate`/`min-w-0`
 * en los hijos, que es lo que permite que el título ceda antes que los botones.
 */
export function CabeceraPagina({
  titulo,
  descripcion,
  acciones,
  volver,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
  volver?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {volver && <div className="mb-2.5">{volver}</div>}
        <h1 className="truncate text-xl sm:text-2xl font-bold tracking-tight text-ink-title dark:text-white">{titulo}</h1>
        {descripcion && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">{descripcion}</p>
        )}
      </div>
      {acciones && (
        <div className="flex shrink-0 flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {acciones}
        </div>
      )}
    </div>
  );
}

/**
 * Botón de «volver», accesible y con área de clic cómoda.
 */
export function EnlaceVolver({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -ml-2 text-xs sm:text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-brand-400"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
      {children}
    </button>
  );
}

/** Contenedor de página: ancho completo, con el espaciado vertical del módulo. */
export function ContenedorPagina({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex min-w-0 flex-col gap-6", className)}>{children}</div>;
}
