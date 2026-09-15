import type { BusinessInstance, NectoModuleKey } from "@/context/BusinessContext";

/* ── Actividad reciente: el punto donde los módulos escriben ────────────────
 *
 * El widget de actividad es **de la tienda**, pero su contenido es de quien
 * produce el suceso: una orden nueva la sabe Pedidos, un stock bajo lo sabe
 * Inventarios. La tienda no los conoce y no debe conocerlos.
 *
 * Por eso la actividad se **recoge**, no se fabrica aquí. Hoy no hay ningún
 * módulo implementado, así que la recolección devuelve la lista vacía y el
 * widget pinta su estado vacío. Eso es información: "todavía no hay actividad
 * en esta tienda", no un hueco por llenar con métricas de mentira.
 * ────────────────────────────────────────────────────────────────────────── */

/** Qué clase de suceso es, para elegir su icono. */
export type StoreActivityKind = "order" | "stock" | "system";

/**
 * Un suceso de la tienda.
 *
 * ⚠️ `source` es el mismo eje que el de los widgets: quien produce el suceso es
 * quien lo declara, y así la actividad de un módulo desacoplado se puede
 * retirar sin que la tienda sepa qué era.
 */
export interface StoreActivityEntry {
  id: string;
  source: NectoModuleKey;
  kind: StoreActivityKind;
  title: string;
  /** Epoch en ms. Se pinta relativo con `formatRelativeTime`. */
  at: number;
}

/**
 * La actividad de esta tienda, ya ordenada de más reciente a más antigua.
 *
 * ⚠️ **Devuelve `[]` a propósito.** Ningún módulo está implementado, así que no
 * hay sucesos que contar. Rellenarlo con datos de ejemplo sería afirmar una
 * operación que no existe; el estado vacío del widget es la respuesta correcta
 * mientras tanto. Cuando un módulo aterrice, aporta aquí sus sucesos —y sólo
 * los suyos— sin que el Dashboard cambie de forma.
 */
export function collectStoreActivity(_business: BusinessInstance): StoreActivityEntry[] {
  return [];
}
