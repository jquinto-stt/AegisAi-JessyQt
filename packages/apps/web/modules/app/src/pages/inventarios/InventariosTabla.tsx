// ═══════════════════════════════════════════════════════════════════════════
// TABLA DE INVENTARIOS — el listado del módulo
// ═══════════════════════════════════════════════════════════════════════════
//
// Es **puramente presentacional**: recibe las filas ya filtradas y ordenadas y
// avisa de lo que el usuario pulsa. No lee el store, no filtra, no ordena.
//
// El motivo no es purismo: la misma tabla la usa el listado y (con otro
// subconjunto) el detalle de una ubicación. Si filtrara por dentro, la segunda
// pantalla heredaría el filtro de la primera sin querer.

import { observer } from "mobx-react-lite";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/elements/ui/table";
import { EyeIcon } from "@/icons";
import { cn } from "@/utils";
import { Badge } from "@/elements/ui/badge";
import type { Inventario, Progreso } from "@/domain/inventarios/inventarios.domain";
import { TIPO_INVENTARIO_META } from "./inventarios.constants";
import { EstadoInventarioBadge, ProgresoBar } from "./inventarios.widgets";

export interface FilaInventario {
  inventario: Inventario;
  /** Camino de la ubicación ya resuelto: «Cliente › Sede › Ubicación». */
  camino: string;
  /** Nombre del responsable. */
  responsable: string;
  progreso: Progreso;
  /** Nº de líneas con sobra o falta. */
  discrepancias: number;
}

/**
 * Tabla de inventarios.
 *
 * `onAbrir` es obligatorio: una tabla de conteos cuyo único uso sea mirarla no
 * sirve de nada — el módulo existe para abrir el conteo y contarlo. Se hace
 * toda la fila clicable además del botón, porque el botón de 32 px es un blanco
 * pequeño para un operador con el portátil en una bodega.
 */
export const InventariosTabla = observer(function InventariosTabla({
  filas,
  onAbrir,
  vacio,
}: {
  filas: readonly FilaInventario[];
  onAbrir: (inventarioId: string) => void;
  /** Qué pintar cuando no hay filas. Lo decide la página, no la tabla. */
  vacio: React.ReactNode;
}) {
  if (filas.length === 0) return <>{vacio}</>;

  return (
    // `overflow-x-auto` y no `overflow-hidden`: con siete columnas anchas, la
    // tabla desborda antes que el contenedor, y `overflow-hidden` **recortaba**
    // las columnas de la derecha —el estado y el botón de abrir desaparecían sin
    // scroll posible— en vez de dejarlas alcanzar. Se vio en la captura a
    // 1440 px: «Exportar» cortado y la barra de avance pegada al borde. Una
    // tabla recortada no se lee como «no cabe», se lee como «falta información».
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableCell header className="w-[18rem] min-w-[16rem]">Conteo</TableCell>
            <TableCell header className="min-w-[13rem]">Ubicación</TableCell>
            <TableCell header className="w-[11rem]">Responsable</TableCell>
            <TableCell header className="w-[11rem]">Avance</TableCell>
            <TableCell header className="w-[10rem]">Diferencias</TableCell>
            <TableCell header className="w-[8rem]">Estado</TableCell>
            <TableCell header className="w-[6rem] text-right">Acción</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((f) => (
            <TableRow
              key={f.inventario.id}
              className="cursor-pointer transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
              onClick={() => onAbrir(f.inventario.id)}
            >
              <TableCell>
                <div className="block w-full text-left">
                  <span className="block font-mono text-xs text-gray-600 dark:text-gray-400">
                    {f.inventario.numero}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-semibold text-ink-title dark:text-gray-100">
                    {f.inventario.nombre}
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300">
                    {TIPO_INVENTARIO_META[f.inventario.tipo].label}
                  </span>
                </div>
              </TableCell>

              <TableCell>
                <span className="block truncate text-sm text-ink-body dark:text-gray-300" title={f.camino}>
                  {f.camino}
                </span>
              </TableCell>

              <TableCell>
                <span className="block truncate text-sm text-ink-body dark:text-gray-300">
                  {f.responsable}
                </span>
              </TableCell>

              <TableCell>
                <ProgresoBar progreso={f.progreso} />
              </TableCell>

              <TableCell>
                <ContadorDiscrepancias n={f.discrepancias} />
              </TableCell>

              <TableCell>
                <EstadoInventarioBadge estado={f.inventario.estado} />
              </TableCell>

              <TableCell className="text-right">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAbrir(f.inventario.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                >
                  <EyeIcon className="h-3.5 w-3.5" />
                  <span>Ver</span>
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

/**
 * Contador de discrepancias con texto amigable.
 */
export function ContadorDiscrepancias({ n, className }: { n: number; className?: string }) {
  if (n === 0) {
    return <span className={cn("text-xs text-gray-600 dark:text-gray-400", className)}>Sin diferencias</span>;
  }
  return (
    <Badge color="warning" size="sm" className={className}>
      {n} {n === 1 ? "diferencia" : "diferencias"}
    </Badge>
  );
}
