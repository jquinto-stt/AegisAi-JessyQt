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
import { diasParaVencer, normalizarTexto, type TipoMovimiento } from "@/domain/inventario/inventario.domain";

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

/**
 * Vencimiento en palabras: «vence en 3 días», «vence hoy», «venció hace 2 días».
 *
 * Es una etiqueta distinta de `etiquetaFecha` a propósito: un vencimiento no se
 * lee como una fecha del kárdex. «Hoy 09:00» describe un movimiento; de un lote
 * lo que importa es cuánto le queda, y «hoy» sin más ya dice que hay que
 * moverlo.
 *
 * `diasParaVencer` devuelve `null` con una fecha ilegible, y aquí se pinta una
 * raya —igual que en `etiquetaFecha`—: «—» es «no se sabe», que es distinto de
 * «vence hoy».
 */
export function etiquetaVencimiento(
  fechaVencimiento: string,
  hoy: Date = new Date(),
): string {
  const dias = diasParaVencer(fechaVencimiento, hoy);
  if (dias === null) return "—";
  if (dias === 0) return "vence hoy";
  if (dias === 1) return "vence mañana";
  if (dias === -1) return "venció ayer";
  if (dias > 0) return `vence en ${dias} días`;
  return `venció hace ${Math.abs(dias)} días`;
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

/**
 * Gravedad de un estado, para ordenar. Menor = más urgente.
 *
 * `reorden` va DESPUÉS de `bajo_minimo` y antes de `ok`: es la misma llamada que
 * «bajo mínimo» en su grado temprano, así que ordena por detrás de ella. La lista
 * de trabajo del panel pone primero lo que ya se quedó sin margen.
 */
const GRAVEDAD: Record<EstadoStock, number> = {
  agotado: 0,
  bajo_minimo: 1,
  reorden: 2,
  ok: 3,
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

// ═══════════════════════════════════════════════════════════════════════════
// FORMULARIO DE MOVIMIENTOS
// ═══════════════════════════════════════════════════════════════════════════

/** Sentido de un ajuste: aparece mercancía (al alza) o desaparece (a la baja). */
export type SentidoAjuste = "alta" | "baja";

/**
 * Traduce el formulario al par origen/destino del dominio.
 *
 * **Vive aquí, y no en `MovimientosPage.tsx`, porque tiene que poder probarse.**
 * Estuvo en la página con un docblock que decía que se probaba sola; no era
 * cierto: ningún test del repo importa un `.tsx`, así que esa promesa era
 * incumplible por construcción. Es la única lógica del formulario que puede
 * estar mal sin que se note —una transferencia con el origen y el destino
 * invertidos resta donde debería sumar, y el dominio **no lo detecta**: los dos
 * extremos siguen siendo bodegas distintas y válidas— y por eso se prueba sola.
 *
 * `null` significa «el exterior»: no es una bodega vacía, es la ausencia de
 * bodega, y es lo que distingue una compra de una transferencia.
 */
export function extremosDe(
  tipo: TipoMovimiento,
  bodegaId: string,
  bodegaDestinoId: string,
  sentido: SentidoAjuste,
): { origenId: string | null; destinoId: string | null } {
  switch (tipo) {
    case "entrada":
      return { origenId: null, destinoId: bodegaId };
    case "salida":
      return { origenId: bodegaId, destinoId: null };
    case "transferencia":
      // El traslado: la bodega elegida es el ORIGEN y la segunda el destino. Si
      // estos dos se invirtieran, la mercancía se movería en sentido contrario y
      // ninguna existencia cuadraría con su bodega.
      return { origenId: bodegaId, destinoId: bodegaDestinoId };
    case "ajuste":
      // Al alza: aparece mercancía que el sistema no tenía.
      // A la baja: desaparece mercancía que el sistema sí tenía.
      return sentido === "alta"
        ? { origenId: null, destinoId: bodegaId }
        : { origenId: bodegaId, destinoId: null };
  }
}

/**
 * ¿Este movimiento **retira** de la bodega elegida? Es la pregunta que decide
 * si el formulario tiene que enseñar cuánto hay disponible ahí.
 *
 * Se deriva de `extremosDe` en vez de repetir la tabla: una segunda lista de
 * «qué tipos restan» podría discrepar de la primera, y entonces la pantalla
 * enseñaría un disponible para un movimiento que no retira nada, o —peor— no lo
 * enseñaría para uno que sí.
 */
export function retiraDeBodega(
  tipo: TipoMovimiento,
  bodegaId: string,
  bodegaDestinoId: string,
  sentido: SentidoAjuste,
): boolean {
  return extremosDe(tipo, bodegaId, bodegaDestinoId, sentido).origenId !== null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEO FÍSICO
// ═══════════════════════════════════════════════════════════════════════════

/** Lo que se entendió de la casilla de conteo: un número, un vacío, o un «no». */
export type ConteoDigitado =
  | { valido: true; conteoFisico: number | null }
  | { valido: false; motivo: string };

/** Una cifra con un solo separador decimal: `12`, `12.5`, `0,75`. */
const CONTEO_SIMPLE = /^\d+(?:[.,]\d+)?$/;

/**
 * Un separador seguido de **exactamente tres dígitos**, que en `es-CO` es la
 * marca de millares (`1.000` = mil).
 */
const CONTEO_AMBIGUO = /^\d{1,3}(?:[.,]\d{3})+$/;

/**
 * Traduce lo tecleado en la casilla de conteo a lo que espera el dominio.
 *
 * ── Vacío es `null`, y `null` no es `0` ───────────────────────────────────
 * Una casilla en blanco significa «todavía no conté», que es un estado real del
 * conteo —el seed tiene una línea así a propósito—. Convertirla en `0` haría que
 * la auditoría se pudiera conciliar dando por contadas las líneas que nadie
 * miró, y ajustaría a cero mercancía que sí está en el estante.
 *
 * ── `1.000` se RECHAZA en vez de adivinar ─────────────────────────────────
 * El locale del proyecto es `es-CO`: ahí `1.000` es mil y `1,5` es uno y medio.
 * Pero `Number("1.000")` en JavaScript da `1`, y `Number("1,5")` da `NaN`. Las
 * dos lecturas son plausibles y no hay forma de saber cuál quiso el operador.
 * **Ante una cifra ambigua se pregunta, no se elige**: registrar 1 kg donde
 * había 1000 es un error que el kárdex ya no puede deshacer, y pedir que se
 * teclee `1000` o `1.5` cuesta dos segundos.
 *
 * Un cero **sí** es válido: contar cero es un conteo, y es justo lo que hace
 * falta cuando el sistema cree que hay algo y el estante está vacío.
 */
export function interpretarConteo(texto: string): ConteoDigitado {
  const limpio = texto.trim();
  if (limpio === "") return { valido: true, conteoFisico: null };
  if (!CONTEO_SIMPLE.test(limpio)) {
    return { valido: false, motivo: "Escribe solo el número, sin unidades ni texto." };
  }
  if (CONTEO_AMBIGUO.test(limpio)) {
    return {
      valido: false,
      motivo: "Esa cifra es ambigua: escríbela sin separador de millares.",
    };
  }
  const n = Number(limpio.replace(",", "."));
  if (!Number.isFinite(n)) {
    return { valido: false, motivo: "Esa cifra no es un número." };
  }
  return { valido: true, conteoFisico: n };
}

/**
 * Cantidad con signo explícito, para la columna de diferencia: `+2 kg`, `−1 kg`.
 *
 * El signo se escribe siempre —también en el `+`— porque una columna de
 * diferencias donde unas cifras llevan signo y otras no obliga a leer el número
 * entero para saber de qué lado está. Y se usa el signo menos tipográfico (−,
 * U+2212), no el guion: en una columna de cifras el guion se lee como un
 * separador.
 */
export function cantidadConSigno(n: number, unidad: UnidadMedida): string {
  const signo = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${signo}${cantidad(Math.abs(n), unidad)}`;
}
