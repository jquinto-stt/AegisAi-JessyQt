import type { Capacidad } from "@/stores/roles.store";

// ═══════════════════════════════════════════════════════════════════════════
// SECCIONES DEL INICIO — qué ve cada perfil
// ═══════════════════════════════════════════════════════════════════════════
//
// `/pedidos/inicio` se compone **por capacidad**. Este archivo es el único
// sitio donde se decide qué secciones entran, y no hay ningún control que lo
// cambie: la pantalla se adapta sola.
//
// ── Por qué esto existe ───────────────────────────────────────────────────
//
// Antes había un conmutador de vistas (ejecutiva / atención / preparación /
// logística). Al retirarlo, la primera versión de esta pantalla **apiló las
// cuatro vistas en una sola página para todo el mundo**, y eso mezcló el
// trabajo de todos los perfiles: medido con la sonda de perfiles, el rol
// `vendedor` —que no tiene NINGUNA capacidad `preparation.*`— recibía la cola
// de preparación, su contexto y la hoja de ruta de envíos. Cinco bloques que no
// puede operar, en su pantalla de inicio.
//
// Retirar el conmutador no podía significar «todos ven todo». Significa: **no
// hay control, hay composición**. Lo que el perfil no puede operar, no se pinta.
//
// ── Por qué la sección se deriva de la CAPACIDAD y no del nombre del rol ──
//
// Es la invariante del contrato de acceso (`outputs/contrato-arquitectura-acceso-necto.md`
// §1.4, C4): **ninguna decisión se toma por cómo se llama el rol**. Un
// `if (rolId === "preparacion")` reintroduce por la puerta de atrás lo que el
// contrato elimina.
//
// Consecuencias concretas, y son la razón de hacerlo así:
//   · Un rol **personalizado** (el catálogo deja crear roles con las
//     capacidades que sean, y `personalizado` nace con cero) obtiene la
//     composición que sus capacidades permiten, sin ampliar ningún mapa.
//   · Si mañana se le quita `preparation.read` al rol `preparacion`, la sección
//     deja de aparecer sola. Con un mapa por rol seguiría apareciendo y
//     prometería una superficie que el rol ya no puede operar.
//   · El mismo rol ve una composición distinta según la ORGANIZACIÓN, porque
//     las capacidades efectivas salen de `sessionStore.accessContext`, que ya
//     cruza rol + excepciones + simulación.
//
// ── Una sección NO es un permiso ─────────────────────────────────────────
//
// Esto decide QUÉ SE PINTA, nunca QUÉ SE PUEDE HACER. Cada botón de cada widget
// vuelve a preguntar por su capacidad con `puede(...)`
// (`@/stores/acceso.utils`) y se deshabilita con su motivo. La comprobación es
// la misma en los dos casos, así que no hay una rama que pueda mentir.
//
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Las secciones de la página.
 *
 * El identificador nombra una **agrupación de trabajo**, no una persona ni un
 * rol: «preparacion» es «la cola de preparación», y la ve quien tenga capacidad
 * para operarla.
 */
export type SeccionInicio = "agenda" | "resumen" | "atencion" | "preparacion" | "logistica";

export interface MetaSeccion {
  id: SeccionInicio;
  /** Rótulo visible de la sección. Agrupa; no es el título de ninguna tarjeta. */
  titulo: string;
  /**
   * Capacidades que **habilitan** la sección.
   *
   * Semántica: se pinta si la sesión tiene **al menos una** (`some`), porque
   * cada lista es una disyunción de los trabajos que la sección sirve. Se lee
   * como «esta sección me sirve de algo si puedo hacer alguno de estos».
   */
  exige: Capacidad[];
}

/**
 * Orden canónico. Es el orden en que se apilan las secciones y el orden en que
 * se resuelve el respaldo de `seccionesDisponibles`.
 *
 * Va de lo general a lo específico: primero el estado del negocio, después la
 * agenda, y luego cada puesto de trabajo en el orden del ciclo del pedido
 * (atención → preparación → reparto). Ese orden es el mismo para todos los
 * perfiles: lo que cambia entre perfiles es QUÉ secciones entran, no en qué
 * orden. Un orden que dependiera del perfil haría que dos personas mirando la
 * misma pantalla no pudieran hablarse de «lo de arriba».
 */
export const SECCIONES: MetaSeccion[] = [
  {
    id: "agenda",
    titulo: "Agenda",
    // El calendario y el volumen del mes: medidas de un periodo, sobre `createdAt`.
    exige: ["orders.read"],
  },
  {
    id: "resumen",
    titulo: "Resumen del negocio",
    exige: ["orders.read"],
  },
  {
    id: "atencion",
    titulo: "Atención al cliente",
    // Existe para responder. `channels.read` es el umbral: sin él no se debería
    // ver ni el contacto, y ese umbral ya lo aplica el módulo de Conversaciones.
    exige: ["channels.read"],
  },
  {
    id: "preparacion",
    titulo: "Preparación",
    // `preparation.read` basta para VER la cola; avanzarla exige
    // `preparation.manage` y lo comprueba cada fila.
    exige: ["preparation.read", "preparation.manage"],
  },
  {
    id: "logistica",
    titulo: "Logística",
    // No existe un dominio `logistics.*` en el catálogo, e inventarlo sería
    // añadir una capacidad que ningún rol concede y dejar la sección muerta.
    // La logística es *la parte de la preparación que ocurre con el pedido ya
    // fuera* (`listo → en_camino → entregado`), y esas tres transiciones las
    // gobierna `preparation.manage` (`CAPACIDAD_POR_DESTINO`, `acceso.utils.ts`).
    exige: ["preparation.manage"],
  },
];

/** ¿Esta sesión puede ver esta sección? `some`, no `every`. */
export function puedeVerSeccion(seccion: SeccionInicio, capacidades: readonly Capacidad[]): boolean {
  const meta = SECCIONES.find((s) => s.id === seccion);
  if (!meta) return false;
  return meta.exige.some((c) => capacidades.includes(c));
}

/**
 * Secciones que esta sesión puede ver, en el orden canónico.
 *
 * **Nunca devuelve una lista vacía.** Un rol sin capacidades (el catálogo
 * permite crear uno: `personalizado` nace con `[]`) recibiría una pantalla en
 * blanco, que es peor que una pantalla sin permisos: el usuario no sabría si le
 * falta algo o si la aplicación está rota. Se le da el resumen, que es la
 * sección de LECTURA, y **sus widgets enseñarán sus propios motivos** — cada
 * acción dirá qué permiso falta en vez de desaparecer sin explicación.
 *
 * La degradación es segura porque el resumen no concede nada: solo cambia lo
 * que se *pinta*. Los controles siguen apagados por `puede(...)`.
 *
 * En la práctica este respaldo casi no se alcanza: `/pedidos/inicio` ya está
 * detrás de `CapabilityGuard capacidad="orders.read"`, así que quien llega aquí
 * tiene al menos esa capacidad y `resumen` entra por su propio pie.
 */
export function seccionesDisponibles(capacidades: readonly Capacidad[]): SeccionInicio[] {
  const secciones = SECCIONES.filter((s) => s.exige.some((c) => capacidades.includes(c))).map((s) => s.id);
  return secciones.length > 0 ? secciones : ["resumen"];
}
