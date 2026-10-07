/**
 * Vocabulario visible del catálogo de productos.
 *
 * ── Regla de redacción ────────────────────────────────────────────────────
 *
 * **Nada de jerga.** El usuario de este módulo es un comerciante, no un
 * contador ni un ingeniero. Cada etiqueta se prueba con la pregunta «¿esto lo
 * entendería alguien que nunca ha usado un programa de inventario?».
 *
 *   «Stock bajo»        → «Queda poco»
 *   «Out of stock»      → «Agotado»
 *   «Umbral mínimo»     → «Cantidad mínima»
 *   «SKU»               → «Código»
 *   «Disponibilidad»    → «Estado»
 *
 * Las etiquetas viven aquí y no en el JSX por la razón de siempre: escritas a
 * mano en cada sitio, la primera que se ajuste deja a las otras discrepando sin
 * que nadie lo note hasta verlas en la misma pantalla.
 */

import type { BadgeColor } from "@/elements/ui/badge";
import type {
  SemaforoDisponibilidad,
  UnidadMedida,
} from "@/domain/inventarios/productos.domain";

// ═══════════════════════════════════════════════════════════════════════════
// SEMÁFORO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cómo se pinta y cómo se lee cada estado.
 *
 * Los colores son los **tintes de estado del tema** (`estado-verde`,
 * `estado-amarillo`, `estado-rojo`), no la paleta de marca: un semáforo de
 * disponibilidad es semántica, no identidad. El `Badge` del proyecto ya los
 * resuelve con texto en tinta de cuerpo, que es lo que los mantiene legibles
 * en los dos temas.
 */
export const SEMAFORO_META: Record<
  SemaforoDisponibilidad,
  { label: string; color: BadgeColor }
> = {
  disponible: { label: "Disponible", color: "success" },
  bajo: { label: "Queda poco", color: "warning" },
  agotado: { label: "Agotado", color: "error" },
};

export const OPCIONES_SEMAFORO: { value: SemaforoDisponibilidad; label: string }[] = [
  { value: "disponible", label: "Disponible" },
  { value: "bajo", label: "Queda poco" },
  { value: "agotado", label: "Agotado" },
];

// ═══════════════════════════════════════════════════════════════════════════
// UNIDADES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Singular y plural de cada unidad.
 *
 * El plural existe porque la tabla escribe «43 paquetes» y no «43 paquete»: la
 * cantidad y su unidad se leen como una sola frase, y una frase mal concordada
 * en la columna más leída de la pantalla se nota.
 */
export const UNIDAD_META: Record<UnidadMedida, { label: string; plural: string }> = {
  unidad: { label: "Unidad", plural: "unidades" },
  paquete: { label: "Paquete", plural: "paquetes" },
  caja: { label: "Caja", plural: "cajas" },
  kilo: { label: "Kilo", plural: "kilos" },
  litro: { label: "Litro", plural: "litros" },
};

export const OPCIONES_UNIDAD: { value: UnidadMedida; label: string }[] = [
  { value: "unidad", label: "Unidad" },
  { value: "paquete", label: "Paquete" },
  { value: "caja", label: "Caja" },
  { value: "kilo", label: "Kilo" },
  { value: "litro", label: "Litro" },
];

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES DE PANTALLA
// ═══════════════════════════════════════════════════════════════════════════

/** Valor del `<select>` que significa «sin filtrar». */
export const FILTRO_TODOS = "__todos__";

/**
 * Filas por página.
 *
 * Diez y no veinticinco (el valor que usa el módulo de conteos): esta tabla
 * tiene miniatura y seis columnas, así que cada fila ocupa bastante más alto, y
 * veinticinco productos dejarían la paginación fuera de la primera pantalla.
 */
export const FILAS_POR_PAGINA = 10;

/** Cuántos días antes del vencimiento se avisa en la ficha y en el detalle. */
export const DIAS_AVISO_VENCIMIENTO = 30;

/**
 * Tope de la foto que se puede subir, en bytes.
 *
 * 2 MB es lo que aguanta un `dataUrl` sin que la ficha tarde en pintar. Se
 * comprueba **antes** de leer el archivo, no después: leer un archivo de 40 MB
 * para descartarlo congela la pestaña.
 */
export const MAX_BYTES_IMAGEN = 2 * 1024 * 1024;

export const TEXTO_SOLO_LECTURA =
  "Solo puedes consultar. Pídele a quien administra tu cuenta que te dé permiso para editar productos.";
