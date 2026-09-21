/**
 * Utilidades de las superficies de Inventario.
 *
 * Archivo `.ts` sin JSX a propósito: `vitest` corre en `environment: 'node'` y
 * **ningún test del repo importa un `.tsx`**, así que todo lo que se pueda probar
 * con la suite —formato, filtros, orden— vive aquí y no dentro de una página.
 *
 * ── Por qué hay un `money` local y no se importa el de Pedidos ─────────────
 *
 * `pages/pedidos/widgets/widgets.comunes.tsx` ya tiene uno idéntico. Importarlo
 * sería una violación de D1/D2 en su forma más literal: una página de Inventario
 * dependiendo de un archivo de Pedidos. Y copiarlo desde el mismo sitio del
 * sistema (el locale del proyecto, `es-CO`) no es duplicar una regla de negocio,
 * es formatear. La duplicación está declarada aquí en vez de silenciada.
 *
 * ── Lo que NO hay aquí ─────────────────────────────────────────────────────
 *
 * Ninguna función deriva existencias ni estados. Eso es del store
 * (`existenciaDe`, `estadoDe`), que a su vez lo deriva del kárdex con el dominio
 * (`stockDe`, `estadoDeStock`). Un cálculo de stock en una capa de presentación
 * sería la segunda fuente de verdad que la invariante I1 prohíbe.
 */

import {
  UNIDAD_MEDIDA_LABEL,
  type Articulo,
  type EstadoStock,
  type UnidadMedida,
} from "@/stores";
import { normalizarTexto } from "@/domain/inventario/inventario.domain";

/** Importe en pesos, sin decimales. El locale del proyecto es `es-CO`. */
export const money = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

/**
 * Cantidad con su unidad, en la forma corta que usa la tabla: `12 und`, `5 kg`.
 *
 * Se usa una abreviatura propia y no `UNIDAD_MEDIDA_LABEL` porque esa etiqueta es
 * la del `<select>` de alta («Kilogramo»), y meter «Kilogramo» en una celda de
 * tabla rompe la columna. El mapa de abreviaturas es `Record<UnidadMedida, …>`:
 * añadir una unidad sin abreviatura es un error de compilación, no una celda con
 * `undefined`.
 */
const ABREVIATURA: Record<UnidadMedida, string> = {
  unidad: "und",
  kg: "kg",
  g: "g",
  l: "l",
  ml: "ml",
  caja: "caja",
  porcion: "porc",
};

export function cantidad(n: number, unidad: UnidadMedida): string {
  return `${n.toLocaleString("es-CO")} ${ABREVIATURA[unidad]}`;
}

/** Etiqueta larga de la unidad (para el formulario, no para la tabla). */
export function unidadLarga(unidad: UnidadMedida): string {
  return UNIDAD_MEDIDA_LABEL[unidad];
}

// ═══════════════════════════════════════════════════════════════════════════
// FECHAS
// ═══════════════════════════════════════════════════════════════════════════

const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/**
 * Fecha legible del kárdex: «Hoy 14:20», «Ayer 09:05», «12 sep».
 *
 * `ahora` entra por parámetro para que el test pueda fijar el reloj: una función
 * que lee `Date.now()` por dentro solo se puede probar esperando a que pase el
 * día.
 */
export function etiquetaFecha(iso: string, ahora: Date = new Date()): string {
  const f = new Date(iso);
  if (Number.isNaN(f.getTime())) return "—";

  const hhmm = `${String(f.getHours()).padStart(2, "0")}:${String(f.getMinutes()).padStart(2, "0")}`;
  const dia = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const ayer = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1);

  if (dia(f) === dia(ahora)) return `Hoy ${hhmm}`;
  if (dia(f) === dia(ayer)) return `Ayer ${hhmm}`;
  return `${f.getDate()} ${MESES[f.getMonth()]}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTROS Y ORDEN
// ═══════════════════════════════════════════════════════════════════════════

export interface FiltroArticulos {
  /** Texto libre: casa contra nombre y SKU, sin distinguir mayúsculas ni acentos. */
  texto?: string;
  categoria?: string | null;
}

/**
 * Filtra artículos por texto y categoría.
 *
 * El texto casa contra **nombre y SKU** porque son las dos formas en que un
 * operador busca: quien conoce el código lo teclea, quien no, escribe el nombre.
 * Buscar solo por nombre obligaría a abrir la ficha para confirmar un SKU.
 *
 * El plegado de acentos es el MISMO que usa el asistente (`normalizarTexto`):
 * la misma consulta tiene que encontrar lo mismo en la tabla y en el chat.
 */
export function filtrarArticulos(articulos: Articulo[], filtro: FiltroArticulos): Articulo[] {
  const texto = normalizarTexto(filtro.texto?.trim() ?? "");
  return articulos.filter((a) => {
    if (filtro.categoria && a.categoria !== filtro.categoria) return false;
    if (!texto) return true;
    return (
      normalizarTexto(a.nombre).includes(texto) || normalizarTexto(a.sku).includes(texto)
    );
  });
}

/**
 * Los artículos que tienen algo en un sitio, según una función de existencia.
 *
 * Recibe la función en vez de leer el store para poder probarse sin montar uno.
 * Un cero **no cuenta**: un artículo agotado en una bodega no «está» en ella.
 */
export function conExistencia(
  articulos: Articulo[],
  existenciaDe: (articuloId: string) => number,
): Articulo[] {
  return articulos.filter((a) => existenciaDe(a.id) > 0);
}

/** Gravedad de un estado, para ordenar. Menor = más urgente. */
const GRAVEDAD: Record<EstadoStock, number> = {
  agotado: 0,
  bajo_minimo: 1,
  ok: 2,
};

/**
 * Ordena por urgencia y, a igualdad, por nombre.
 *
 * El desempate por nombre no es cosmético: sin él, dos artículos agotados salen
 * en el orden del array de entrada, que cambia al registrar un movimiento — y una
 * lista de trabajo que se reordena sola cada vez que la tocas es imposible de
 * seguir con el dedo.
 */
export function ordenarPorUrgencia(
  articulos: Articulo[],
  estadoDe: (articuloId: string) => EstadoStock,
): Articulo[] {
  return [...articulos].sort((a, b) => {
    const g = GRAVEDAD[estadoDe(a.id)] - GRAVEDAD[estadoDe(b.id)];
    if (g !== 0) return g;
    return a.nombre.localeCompare(b.nombre, "es");
  });
}
