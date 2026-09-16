import type { Capacidad, PortadorDeRol } from "@/stores/roles.store";

// ═══════════════════════════════════════════════════════════════════════════
// EXCEPCIONES POR PERSONA SOBRE SU ROL
// ═══════════════════════════════════════════════════════════════════════════
//
// Modelo (contrato §2):
//
//     capacidadesEfectivas = capacidades(rol) ∪ extras \ removidas
//
// La persona **hereda** el paquete de su rol y puede desviarse en dos sentidos:
//   - `capacidadesExtra`     → capacidades que el rol NO da y se conceden a mano.
//   - `capacidadesRemovidas` → capacidades del rol que se revocan a mano.
//     **La denegación gana siempre**, incluso sobre un extra del mismo valor.
//
// La regla de diseño que hace esto mantenible: **una excepción solo existe si
// cambia algo.** Si el rol ya concede la capacidad, concederla a mano no añade
// nada (y se evita); si el rol no la concede, revocarla a mano no quita nada
// (y se evita). Así, el conjunto de excepciones de una persona siempre es
// mínimo, y al cambiar de rol no quedan excepciones zombis que "recuerden" el
// rol anterior.
//
// Este módulo es lógica pura (sin React, sin store) para poder probarlo.
//
// ═══════════════════════════════════════════════════════════════════════════

/**
 * De dónde viene la capacidad de una persona. Es lo que la UI muestra como
 * "heredado del rol" vs "excepción", para que el admin entienda qué está
 * viendo antes de tocar nada.
 */
export type Procedencia =
  /** La concede el rol. */
  | "rol"
  /** No la da el rol, pero se concedió a mano. */
  | "concedida"
  /** El rol la concede, pero se revocó a mano. */
  | "removida"
  /** Ni el rol ni una excepción: no la tiene. */
  | "ninguna";

/**
 * Procedencia de una capacidad para un portador dado.
 *
 * @param capacidadesDelRol Capacidades base del rol de la persona.
 */
export function procedenciaDe(
  p: PortadorDeRol,
  cap: Capacidad,
  capacidadesDelRol: Capacidad[],
): Procedencia {
  // La revocación se evalúa primero: gana sobre todo lo demás.
  if (p.capacidadesRemovidas?.includes(cap)) return "removida";
  const delRol = capacidadesDelRol.includes(cap);
  if (p.capacidadesExtra?.includes(cap) && !delRol) return "concedida";
  if (delRol) return "rol";
  return "ninguna";
}

/** ¿La capacidad queda efectivamente concedida, según el modelo? */
export function esEfectiva(p: PortadorDeRol, cap: Capacidad, capacidadesDelRol: Capacidad[]): boolean {
  const proc = procedenciaDe(p, cap, capacidadesDelRol);
  return proc === "rol" || proc === "concedida";
}

/**
 * Calcula las excepciones resultantes de encender o apagar una capacidad.
 *
 * Devuelve el par completo (`extras`, `removidas`) listo para escribir con
 * `setCapacidadesExtra` / `setCapacidadesRemovidas`. Es idempotente y mantiene
 * el conjunto de excepciones mínimo.
 *
 * @param activar `true` para conceder, `false` para revocar.
 */
export function aplicarToggle(
  p: PortadorDeRol,
  cap: Capacidad,
  capacidadesDelRol: Capacidad[],
  activar: boolean,
): { capacidadesExtra: Capacidad[]; capacidadesRemovidas: Capacidad[] } {
  const delRol = capacidadesDelRol.includes(cap);
  const extra = new Set<Capacidad>(p.capacidadesExtra ?? []);
  const removidas = new Set<Capacidad>(p.capacidadesRemovidas ?? []);

  if (activar) {
    // Para que quede concedida basta con levantar cualquier revocación; solo
    // hace falta un extra si el rol no la da.
    removidas.delete(cap);
    if (!delRol) extra.add(cap);
  } else {
    // Un extra que se apaga deja de ser extra (ya no aporta nada). Si venía del
    // rol, hay que revocarla explícitamente.
    extra.delete(cap);
    if (delRol) removidas.add(cap);
  }

  return { capacidadesExtra: [...extra], capacidadesRemovidas: [...removidas] };
}

/**
 * Reexpresa las excepciones contra un rol nuevo, descartando las que no aportan
 * nada.
 *
 * Se llama al **cambiar de rol**: una revocación de "quitar `orders.cancel`"
 * solo tiene sentido si el rol nuevo concede `orders.cancel`. Si no lo concede,
 * la excepción es un no-op que hay que soltar — si no, quedaría "zombi",
 * revocando en silencio una capacidad si más adelante se volviera a un rol que
 * sí la da, y el admin no tendría forma de verlo.
 *
 * Preserva la semántica del modelo: la denegación sigue ganando.
 */
export function normalizar(
  p: PortadorDeRol,
  capacidadesDelRol: Capacidad[],
): { capacidadesExtra: Capacidad[]; capacidadesRemovidas: Capacidad[] } {
  const delRol = new Set(capacidadesDelRol);
  const tocadas = new Set<Capacidad>([...(p.capacidadesExtra ?? []), ...(p.capacidadesRemovidas ?? [])]);

  const capacidadesExtra: Capacidad[] = [];
  const capacidadesRemovidas: Capacidad[] = [];

  for (const cap of tocadas) {
    const proc = procedenciaDe(p, cap, capacidadesDelRol);
    if (proc === "concedida") {
      capacidadesExtra.push(cap);
    } else if (proc === "removida" && delRol.has(cap)) {
      capacidadesRemovidas.push(cap);
    }
    // "rol" y "ninguna" no son excepciones: se descartan.
  }

  return { capacidadesExtra, capacidadesRemovidas };
}
