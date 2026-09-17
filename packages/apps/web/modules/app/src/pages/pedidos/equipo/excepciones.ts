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
 * Calcula las excepciones necesarias para que la persona acabe teniendo
 * **exactamente** el conjunto `objetivo` de capacidades.
 *
 * Es el hermano por lote de `aplicarToggle`: sirve para el asistente de tareas,
 * donde el admin elige un perfil ("Atiende el mostrador") y el sistema tiene que
 * dejar el conjunto de capacidades igual a ese perfil de una sola vez, sin
 * obligarle a encender y apagar dieciocho interruptores.
 *
 * Se apoya en `aplicarToggle` capacidad por capacidad en vez de escribir los
 * conjuntos a mano, para que la minimalidad siga teniendo **una sola
 * definición**: una concesión que el rol ya da no se guarda como extra, y una
 * revocación de algo que el rol no da no se guarda como removida. Así el
 * asistente no puede introducir excepciones zombis que el editor manual no
 * crearía.
 *
 * `aplicarToggle` solo toca la capacidad que recibe, así que aplicar los toggles
 * en cualquier orden da el mismo resultado.
 *
 * @param objetivo Capacidades que la persona debe acabar teniendo.
 */
export function aplicarPreset(
  p: PortadorDeRol,
  objetivo: Capacidad[],
  capacidadesDelRol: Capacidad[],
): { capacidadesExtra: Capacidad[]; capacidadesRemovidas: Capacidad[] } {
  const deseadas = new Set<Capacidad>(objetivo);

  // Punto de partida: lo que la persona tiene HOY (rol ∪ extras \ removidas).
  const actuales = new Set<Capacidad>([...capacidadesDelRol, ...(p.capacidadesExtra ?? [])]);
  for (const cap of p.capacidadesRemovidas ?? []) actuales.delete(cap);

  // Solo hay que tocar la diferencia simétrica: lo que tiene y no quiere, más lo
  // que quiere y no tiene. El resto se deja intacto.
  const aTocar = new Set<Capacidad>([...actuales, ...deseadas]);

  let capacidadesExtra = [...(p.capacidadesExtra ?? [])];
  let capacidadesRemovidas = [...(p.capacidadesRemovidas ?? [])];

  for (const cap of aTocar) {
    const quiere = deseadas.has(cap);
    if (quiere === actuales.has(cap)) continue;
    const siguiente = aplicarToggle(
      { capacidadesExtra, capacidadesRemovidas },
      cap,
      capacidadesDelRol,
      quiere,
    );
    capacidadesExtra = siguiente.capacidadesExtra;
    capacidadesRemovidas = siguiente.capacidadesRemovidas;
  }

  return { capacidadesExtra, capacidadesRemovidas };
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
