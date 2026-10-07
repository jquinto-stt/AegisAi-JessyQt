/**
 * Cómo se muestra el catálogo: formato, filtros y paginación.
 *
 * Todo aquí es **derivado**, nunca almacenado: si el formato de la moneda o el
 * criterio del filtro vivieran en cada componente, la tabla y el CSV podrían
 * discrepar sobre el mismo producto.
 */

import { coincideBusqueda } from "@/domain/inventarios/inventarios.domain";
import type {
  Producto,
  SemaforoDisponibilidad,
  UnidadMedida,
} from "@/domain/inventarios/productos.domain";
import { UNIDAD_META } from "./productos.constants";

// ═══════════════════════════════════════════════════════════════════════════
// FORMATO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pesos colombianos, sin decimales.
 *
 * `maximumFractionDigits: 0` porque en COP los centavos no se usan y mostrarlos
 * añade dos caracteres por celda a la columna más ancha de la tabla.
 */
const MONEDA_COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatearMoneda(valor: number): string {
  return MONEDA_COP.format(valor);
}

/** «43 paquetes», «1 caja». La cantidad y su unidad se leen como una frase. */
export function formatearCantidad(cantidad: number, unidad: UnidadMedida): string {
  const meta = UNIDAD_META[unidad];
  return `${cantidad.toLocaleString("es-CO")} ${cantidad === 1 ? meta.label.toLowerCase() : meta.plural}`;
}

const FECHA_CORTA = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * Fecha legible a partir de `YYYY-MM-DD`.
 *
 * Se parsea con `T00:00:00` **a propósito**: `new Date("2026-11-12")` se
 * interpreta como UTC y en Bogotá (UTC−5) retrocede al día anterior, así que un
 * vencimiento del 12 se leería como 11.
 */
export function formatearFecha(iso: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(`${iso}T00:00:00`);
  if (Number.isNaN(t)) return "—";
  return FECHA_CORTA.format(new Date(t));
}

/** Días que faltan para vencer, en días locales. `null` si no vence. */
export function diasParaVencer(iso: string | null, hoy: string): number | null {
  if (!iso) return null;
  const a = Date.parse(`${iso}T00:00:00`);
  const b = Date.parse(`${hoy}T00:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((a - b) / 86_400_000);
}

/**
 * Frase del vencimiento, con el aviso cuando está cerca.
 *
 * Devuelve **el hecho**, no una alarma genérica: «Venció hace 3 días» y «Vence
 * en 5 días» son accionables; «producto vencido» no dice cuánto hace.
 */
export function textoVencimiento(
  iso: string | null,
  hoy: string,
  diasAviso: number,
): { texto: string; urgente: boolean } {
  const dias = diasParaVencer(iso, hoy);
  if (dias === null) return { texto: "No vence", urgente: false };
  if (dias < 0) {
    const n = Math.abs(dias);
    return { texto: `Venció hace ${n} ${n === 1 ? "día" : "días"}`, urgente: true };
  }
  if (dias === 0) return { texto: "Vence hoy", urgente: true };
  if (dias <= diasAviso) {
    return { texto: `Vence en ${dias} ${dias === 1 ? "día" : "días"}`, urgente: true };
  }
  return { texto: formatearFecha(iso), urgente: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTRO Y ORDEN
// ═══════════════════════════════════════════════════════════════════════════

export interface Criterios {
  consulta: string;
  categoria: string;
  sede: string;
  semaforo: string;
  /** Valor de `FILTRO_TODOS` cuando no hay filtro. */
  todos: string;
}

/** Una fila ya resuelta: el producto y lo que la tabla necesita pintar. */
export interface FilaProducto {
  producto: Producto;
  cantidad: number;
  semaforo: SemaforoDisponibilidad;
}

/**
 * Aplica búsqueda, filtros y calcula el semáforo, en una sola pasada.
 *
 * El semáforo se calcula **después** de saber qué sede se está mirando, porque
 * «queda poco» de un producto con 40 unidades en total y 2 en la sede
 * seleccionada tiene que hablar de las 2, no de las 40.
 */
export function filasDe(
  productos: readonly Producto[],
  cantidadDe: (productoId: string, sedes?: readonly string[]) => number,
  semaforoDe: (producto: Producto, sedes?: readonly string[]) => SemaforoDisponibilidad,
  criterios: Criterios,
): FilaProducto[] {
  const { consulta, categoria, sede, semaforo, todos } = criterios;
  const sedes = sede === todos ? undefined : [sede];

  const filas: FilaProducto[] = [];
  for (const producto of productos) {
    if (categoria !== todos && producto.categoria !== categoria) continue;

    const cantidad = cantidadDe(producto.id, sedes);
    const estado = semaforoDe(producto, sedes);

    // El filtro por sede esconde lo que no tiene nada en esa sede: un producto
    // con cero unidades ahí no está «agotado en la sede», simplemente no está.
    if (sedes && cantidad === 0) continue;
    if (semaforo !== todos && estado !== semaforo) continue;

    if (
      !coincideBusqueda(
        consulta,
        producto.nombre,
        producto.codigo,
        producto.categoria,
      )
    ) {
      continue;
    }

    filas.push({ producto, cantidad, semaforo: estado });
  }
  return filas;
}

/** Página pedida, acotada al rango real. Nunca devuelve una página vacía. */
export function paginaValida(pagina: number, totalFilas: number, porPagina: number): number {
  const ultima = Math.max(0, Math.ceil(totalFilas / porPagina) - 1);
  return Math.min(Math.max(0, pagina), ultima);
}

export function recortarPagina<T>(filas: readonly T[], pagina: number, porPagina: number): T[] {
  const inicio = pagina * porPagina;
  return filas.slice(inicio, inicio + porPagina);
}

export function totalPaginas(totalFilas: number, porPagina: number): number {
  return Math.max(1, Math.ceil(totalFilas / porPagina));
}
