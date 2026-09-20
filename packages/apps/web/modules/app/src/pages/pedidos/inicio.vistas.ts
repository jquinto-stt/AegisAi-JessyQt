import type { Capacidad } from "@/stores/roles.store";

// ═══════════════════════════════════════════════════════════════════════════
// VISTAS DEL INICIO — derivación por CAPACIDAD
// ═══════════════════════════════════════════════════════════════════════════
//
// `/pedidos/inicio` deja de ser un panel único y pasa a adaptarse a quien lo
// mira. Este archivo decide *qué* vista le toca, y es el único sitio donde esa
// decisión vive.
//
// ── Por qué la vista se deriva de capacidades y NO del nombre del rol ─────
//
// Es la regla del contrato de acceso (`outputs/contrato-arquitectura-acceso-necto.md`
// §1.4 y la invariante C4): **ninguna decisión se toma por cómo se llama el rol**.
// Un `if (rolId === "preparacion")` reintroduce por la puerta de atrás lo que el
// contrato elimina: una lista cerrada de roles dentro del código de una pantalla.
//
// Consecuencias concretas de derivar por capacidad, y son la razón de hacerlo:
//
//   · Un rol **personalizado** (el catálogo deja crear roles con las capacidades
//     que sean, y `personalizado` nace con cero) obtiene la vista que sus
//     capacidades permiten, sin que nadie amplíe ningún mapa. Con un `switch`
//     por `rolId`, ese rol se quedaría sin panel y habría que añadirlo a mano.
//   · Un rol **nuevo** funciona el primer día.
//   · Si mañana se le quita `preparation.manage` al rol `preparacion`, la vista
//     deja de ofrecerse sola. Con un mapa por rol, seguiría ofreciéndose y
//     prometería una pantalla que el rol ya no puede operar.
//   · El mismo rol ve una vista distinta según la ORGANIZACIÓN, porque las
//     capacidades efectivas salen de `sessionStore.accessContext`, que ya cruza
//     rol + excepciones + simulación.
//
// ── La "vista" NO es un permiso ───────────────────────────────────────────
//
// Elegir una vista cambia QUÉ SE PINTA, nunca QUÉ SE PUEDE HACER. Cada acción
// dentro de cada widget vuelve a preguntar por su capacidad con `puede(...)`
// (`@/stores/acceso.utils`). Esto es deliberado y está medido en el arnés: un
// administrador que previsualiza la mesa de preparación ve la cola de trabajo,
// pero el botón «Marcar listo» sigue deshabilitado si no tiene
// `preparation.manage` — y si lo tiene (el admin tiene las 18), entonces sí
// puede, porque de verdad puede. La comprobación es la misma en los dos casos,
// así que no hay una rama que pueda mentir.
//
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Las cuatro vistas del inicio.
 *
 * El identificador nombra una **agrupación de trabajo**, no una persona ni un
 * rol: «preparacion» significa «la cola de preparación», y la ve quien tenga
 * capacidad para operarla.
 */
export type VistaInicio = "ejecutiva" | "ventas" | "preparacion" | "logistica";

/**
 * Conjunto de capacidades que **habilitan** cada vista.
 *
 * Semántica: una vista se ofrece si la sesión tiene **al menos una** de estas
 * capacidades (`some`), porque cada lista es una disyunción de las acciones que
 * la vista sirve. Se lee como «esta vista me sirve de algo si puedo hacer alguno
 * de estos trabajos».
 *
 * ── Por qué estas capacidades y no otras ─────────────────────────────────
 *
 * `logistica` está incluida a propósito aunque el catálogo no tenga un dominio
 * `logistics.*`: **no existe**, y inventarlo sería añadir una capacidad que
 * ningún rol concede, dejando la vista muerta. La vista de logística es en
 * realidad *la parte de la preparación que ocurre con el pedido ya fuera*
 * (`listo → en_camino → entregado`), y las tres transiciones las gobierna
 * `preparation.manage` (`CAPACIDAD_POR_DESTINO`, `acceso.utils.ts:52-59`). O sea:
 * quien puede cerrar una entrega puede operar esta vista, y quien no, no.
 *
 * `channels.respond` —no `channels.read`— habilita `ventas`: la vista existe
 * para atender conversaciones, y `channels.read` solo permite mirarlas. Quien
 * solo puede leer las ve en su propia vista, pero no se le ofrece un panel cuyo
 * propósito es responder.
 */
export const CAPACIDADES_POR_VISTA: Record<VistaInicio, Capacidad[]> = {
  // Resumen de negocio: se sostiene sobre la lectura de órdenes.
  ejecutiva: ["orders.read"],
  // Atención al cliente: existe para responder, no para mirar.
  ventas: ["channels.respond"],
  // Mesa de preparación: iniciar preparación y cerrarla.
  preparacion: ["preparation.manage"],
  // Reparto: mover el pedido ya listo hasta la entrega confirmada.
  logistica: ["preparation.manage"],
};

/**
 * Metadatos de presentación de cada vista.
 *
 * `label` y `hint` son lo que ve el usuario en el conmutador y en la cabecera.
 * Se declaran aquí, junto a las capacidades que las habilitan, para que no
 * puedan divergir: una vista rebautizada no deja huérfano su criterio de acceso.
 */
export const VISTA_META: Record<VistaInicio, { label: string; hint: string; titulo: string }> = {
  ejecutiva: {
    label: "Vista ejecutiva",
    titulo: "Resumen",
    hint: "Ventas del día, tendencia y estado general del negocio.",
  },
  ventas: {
    label: "Vista de atención",
    titulo: "Panel de atención y ventas",
    hint: "Conversaciones que esperan respuesta y las órdenes que has abierto hoy.",
  },
  preparacion: {
    label: "Vista de preparación",
    titulo: "Mesa de preparación",
    hint: "Los pedidos confirmados en cola, con su tiempo de espera y el paso siguiente.",
  },
  logistica: {
    label: "Vista de logística",
    titulo: "Hoja de ruta de envíos",
    hint: "Pedidos listos y en camino, con su dirección de entrega y el cierre de la ruta.",
  },
};

/**
 * Orden canónico de las vistas.
 *
 * Es el orden en que se pintan los botones del conmutador y el orden en que se
 * resuelve el empate de `vistaPorDefecto`. Se declara una vez para que el
 * conmutador y la derivación no puedan discrepar sobre cuál es «la primera».
 */
export const ORDEN_VISTAS: VistaInicio[] = ["ejecutiva", "ventas", "preparacion", "logistica"];

/** ¿`v` es una vista conocida? El parámetro de la URL lo escribe el usuario. */
export const esVistaInicio = (v: string | null): v is VistaInicio =>
  v !== null && (ORDEN_VISTAS as string[]).includes(v);

/**
 * ¿Esta sesión puede ver esta vista?
 *
 * `some`, no `every`: la lista de capacidades de una vista es una disyunción de
 * trabajos que sirve. Con `every`, una sesión necesitaría el catálogo entero
 * para ver un panel.
 */
export function puedeVerVista(vista: VistaInicio, capacidades: readonly Capacidad[]): boolean {
  return CAPACIDADES_POR_VISTA[vista].some((c) => capacidades.includes(c));
}

/**
 * Vistas que esta sesión puede ver, en el orden canónico.
 *
 * **Nunca devuelve una lista vacía.** Un rol sin capacidades (el catálogo
 * permite crear uno: `personalizado` nace con `[]`) recibiría una pantalla en
 * blanco, que es peor que una pantalla sin permisos: el usuario no sabría si le
 * falta algo o si la aplicación está rota. Se le da la vista ejecutiva, que es
 * la de lectura, y **sus widgets enseñarán sus propios motivos** — cada acción
 * dirá qué permiso falta en vez de desaparecer sin explicación.
 *
 * La degradación es segura porque `ejecutiva` no concede nada: solo cambia lo
 * que se *pinta*. Los controles siguen apagados por `puede(...)`.
 */
export function vistasDisponibles(capacidades: readonly Capacidad[]): VistaInicio[] {
  const vistas = ORDEN_VISTAS.filter((v) => puedeVerVista(v, capacidades));
  return vistas.length > 0 ? vistas : ["ejecutiva"];
}

/**
 * La vista que corresponde por defecto a esta sesión.
 *
 * Se elige de **atrás hacia delante**, no de delante hacia atrás: el orden
 * canónico va de la vista más amplia (ejecutiva) a la más especializada
 * (logística), y quien tiene varias capacidades suele venir a hacer **lo más
 * concreto**. Un preparador que además puede leer órdenes entra a su mesa de
 * preparación, no a un resumen que no le sirve para trabajar.
 *
 * Esto importa de verdad: `admin_tienda` tiene las 18 capacidades, así que sin
 * esta regla entraría SIEMPRE a la vista ejecutiva y las otras tres vistas solo
 * existirían tras un clic, que es lo mismo que no existir para quien las usa.
 */
export function vistaPorDefecto(capacidades: readonly Capacidad[]): VistaInicio {
  const disponibles = vistasDisponibles(capacidades);
  return disponibles[disponibles.length - 1];
}

/**
 * ¿Hay algo que conmutar?
 *
 * El conmutador de la cabecera solo se pinta si hay más de una vista disponible.
 * Un control que abre una lista de un solo elemento no es un control: ocupa
 * sitio y no hace nada. La compuerta de PERMISO (`team.manage`) la aplica quien
 * pinta; esta función responde solo a «¿sirve de algo?».
 */
export function hayMasDeUnaVista(capacidades: readonly Capacidad[]): boolean {
  return vistasDisponibles(capacidades).length > 1;
}
