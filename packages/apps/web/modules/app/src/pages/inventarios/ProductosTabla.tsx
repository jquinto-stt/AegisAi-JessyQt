import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/elements/ui/table";
import { Badge } from "@/elements/ui/badge";
import { BoxCubeIcon } from "@/icons";
import { cn } from "@/utils";

import { DIAS_AVISO_VENCIMIENTO, SEMAFORO_META, UNIDAD_META } from "./productos.constants";
import {
  formatearCantidad,
  formatearMoneda,
  textoVencimiento,
  type FilaProducto,
} from "./productos.presentacion";

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTOS — la tabla
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Por qué la navegación va en un `<button>` dentro de la primera celda ────
//
// `TableRow` del catálogo **no acepta `onClick`**: no extiende los props del
// `<tr>`. Por eso el proyecto cuelga la navegación de una celda, y por eso el
// contrato de verificación (`verify-inventarios-render.mjs`) busca
// `td button, td a` dentro de la fila en vez de un `<a>` envolvente.
//
// Se usa un `<button>` y no un `<a href>` porque la navegación la hace el
// router con `navigate()`: un `<a>` con `href` recargaría la página entera.
// El `<button>` además es un solo tab stop, que es lo correcto para «abrir esta
// fila» — con la fila entera clicable y sin botón, el teclado no tendría por
// dónde entrar.
//
// ── La columna «Mínimo» se rotula corta a propósito ───────────────────────
//
// «Cantidad mínima antes de que te avisemos» no cabe en una columna de tabla.
// El encabezado dice «Mínimo» y el formulario explica el resto en su ayuda:
// la tabla es para escanear, no para enseñar el manual.

export function ProductosTabla({
  filas,
  hoy,
  onAbrir,
  sedeFiltrada,
}: {
  filas: FilaProducto[];
  /** `YYYY-MM-DD` local. Entra como parámetro para que la tabla sea determinista. */
  hoy: string;
  onAbrir: (productoId: string) => void;
  /** Nombre de la sede que se está mirando, o `null` si son todas. */
  sedeFiltrada: string | null;
}) {
  return (
    <div className="max-w-full overflow-x-auto">
      <Table>
        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
          <TableRow>
            <TableCell
              header
              className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
            >
              Producto
            </TableCell>
            <TableCell
              header
              className="px-5 py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400"
            >
              Precio de compra
            </TableCell>
            <TableCell
              header
              className="px-5 py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400"
            >
              {sedeFiltrada ? `Cuántos hay en ${sedeFiltrada}` : "Cuántos hay"}
            </TableCell>
            <TableCell
              header
              className="px-5 py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400"
            >
              Mínimo
            </TableCell>
            <TableCell
              header
              className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
            >
              Vence
            </TableCell>
            <TableCell
              header
              className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
            >
              Estado
            </TableCell>
          </TableRow>
        </TableHeader>

        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
          {filas.map(({ producto, cantidad, semaforo }) => {
            const meta = SEMAFORO_META[semaforo];
            const vence = textoVencimiento(
              producto.vencimiento,
              hoy,
              DIAS_AVISO_VENCIMIENTO,
            );

            return (
              <TableRow
                key={producto.id}
                className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
              >
                {/* Primera celda: miniatura + nombre, y aquí vive el control
                    clicable que abre la ficha. */}
                <TableCell className="px-5 py-3">
                  <button
                    type="button"
                    onClick={() => onAbrir(producto.id)}
                    data-producto={producto.id}
                    className="flex items-center gap-3 text-left"
                  >
                    <Miniatura producto={producto} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {producto.nombre}
                      </span>
                      <span className="block truncate text-gray-500 text-theme-xs dark:text-gray-400">
                        {producto.codigo} · {producto.categoria}
                      </span>
                    </span>
                  </button>
                </TableCell>

                <TableCell className="px-5 py-3 text-end text-gray-500 text-theme-sm tabular-nums dark:text-gray-400">
                  {formatearMoneda(producto.precioCompra)}
                </TableCell>

                <TableCell className="px-5 py-3 text-end text-theme-sm tabular-nums">
                  <span
                    className={cn(
                      "font-medium",
                      semaforo === "agotado"
                        ? "text-gray-400 dark:text-gray-500"
                        : "text-gray-800 dark:text-white/90",
                    )}
                  >
                    {cantidad.toLocaleString("es-CO")}
                  </span>
                  <span className="ml-1 text-gray-500 text-theme-xs dark:text-gray-400">
                    {cantidad === 1
                      ? UNIDAD_META[producto.unidad].label.toLowerCase()
                      : UNIDAD_META[producto.unidad].plural}
                  </span>
                </TableCell>

                <TableCell className="px-5 py-3 text-end text-gray-500 text-theme-sm tabular-nums dark:text-gray-400">
                  {producto.minimo === 0 ? "Sin aviso" : producto.minimo.toLocaleString("es-CO")}
                </TableCell>

                <TableCell className="px-5 py-3 text-theme-sm">
                  <span
                    className={cn(
                      vence.urgente
                        ? "font-medium text-brand-700 dark:text-brand-400"
                        : "text-gray-500 dark:text-gray-400",
                    )}
                  >
                    {vence.texto}
                  </span>
                </TableCell>

                <TableCell className="px-5 py-3">
                  <Badge size="sm" color={meta.color}>
                    {meta.label}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * La foto del producto, o un cuadro neutro cuando no hay.
 *
 * El cuadro vacío lleva un icono y **no** un color de estado: un hueco gris no
 * es «algo va mal», es «aquí no hay foto todavía». Pintarlo en rojo convertiría
 * una ausencia en una alarma.
 */
function Miniatura({ producto }: { producto: FilaProducto["producto"] }) {
  if (producto.imagenDataUrl) {
    return (
      <img
        src={producto.imagenDataUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-white/10"
      />
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 ring-1 ring-gray-200 dark:bg-white/5 dark:text-gray-500 dark:ring-white/10">
      <BoxCubeIcon className="h-4 w-4" />
    </span>
  );
}

/** Cantidad + unidad en una sola frase, para el CSV y la ficha. */
export function textoCantidad(cantidad: number, unidad: FilaProducto["producto"]["unidad"]) {
  return formatearCantidad(cantidad, unidad);
}
