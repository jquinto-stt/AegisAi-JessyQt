import { sessionStore } from "@/stores/session.store";
import { rolesStore, CAPACIDAD_LABEL, type Capacidad } from "@/stores/roles.store";
import type { PedidoEstado } from "@/stores/pedidos.store";
import { organizacionStore } from "@/stores/organizacion.store";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS DE CAPACIDAD — módulo Pedidos
// ═══════════════════════════════════════════════════════════════════════════
//
// Este archivo es la **capa de conveniencia** entre el núcleo de autorización
// (`sessionStore.hasPermission`) y las páginas de Pedidos.
//
// Existe por dos razones:
//
//   1. Las páginas no importan `sessionStore` directamente para decidir
//      acciones: piden una pregunta de dominio ("¿puedo confirmar este
//      pedido?"), no un string de capacidad suelto. Un solo lugar donde
//      cambiar la semántica.
//
//   2. El mapeo "transición del pipeline → capacidad" es **conocimiento de
//      dominio**, no de presentación. Antes vivía implícito en qué botones
//      se dibujaban; ahora es explícito y testeable.
//
// Qué NO es este archivo:
//   - No es autorización. Delega SIEMPRE en `hasPermission()`, que es la
//     fuente de verdad (contrato §2).
//   - No es scope de datos. "¿Qué pedidos veo?" es otra pregunta (contrato §1.6).
//   - No hay backend. Todo es mock en memoria.
//
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Capacidad exigida para **mover** un pedido hasta el estado `destino`.
 *
 * Es un mapa por estado DESTINO, no por estado origen, porque el pipeline es
 * dinámico: `confirmado` y `en_camino` son opcionales y `en_camino` solo aplica
 * a domicilio (`pedidosStore.pipelineDe`). El destino es lo único estable.
 *
 * Semántica de cada entrada:
 *   - `confirmado`     → aceptar el pedido como válido. Decisión comercial.
 *   - `en_preparacion` → empieza la preparación física.
 *   - `listo`          → la preparación terminó.
 *   - `en_camino`      → salió a reparto (solo domicilio).
 *   - `entregado`      → cierre con entrega confirmada (EntregaModal).
 *   - `cancelado`      → anulación.
 *
 * `programado` y `nuevo` NO aparecen: no se llega a ellos por avance del
 * pipeline. `programado → nuevo` es `activarAhora` (`scheduled.manage`).
 *
 * Fail-closed (invariante C3): un destino ausente de este mapa se **deniega**,
 * no se permite. `puedeMoverA()` lo garantiza.
 */
export const CAPACIDAD_POR_DESTINO: Partial<Record<PedidoEstado, Capacidad>> = {
  confirmado: "orders.confirm",
  en_preparacion: "preparation.manage",
  listo: "preparation.manage",
  en_camino: "preparation.manage",
  entregado: "preparation.manage",
  cancelado: "orders.cancel",
};

// ── Primitiva ──────────────────────────────────────────────────────────────

/**
 * ¿La sesión actual tiene la capacidad dada?
 *
 * Wrapper fino sobre `sessionStore.hasPermission`. Las páginas de Pedidos usan
 * esto en vez de leer el store, para tener un único punto de cambio si mañana
 * la autorización se resuelve de otra forma.
 */
export function puede(capacidad: Capacidad): boolean {
  return sessionStore.hasPermission(capacidad);
}

// ── Transiciones del pipeline ──────────────────────────────────────────────

/**
 * ¿Puede la sesión mover un pedido hasta `destino`?
 *
 * @param destino Estado destino, o `null` si el pedido ya no puede avanzar
 *                (`pedidosStore.siguienteEstado()` devuelve `null` en terminales).
 *                `null` → `false`: sin transición no hay acción que autorizar.
 */
export function puedeMoverA(destino: PedidoEstado | null): boolean {
  if (!destino) return false;
  const capacidad = CAPACIDAD_POR_DESTINO[destino];
  // Fail-closed: destino sin capacidad declarada = denegado (C3).
  return capacidad ? puede(capacidad) : false;
}

/** Capacidad que exige llegar a `destino`, o `null` si no hay ninguna declarada. */
export function capacidadParaAvanzar(destino: PedidoEstado | null): Capacidad | null {
  if (!destino) return null;
  return CAPACIDAD_POR_DESTINO[destino] ?? null;
}

// ── Acciones concretas de la UI ────────────────────────────────────────────
//
// Atajos con nombre propio para las afordancias que se repiten. Evitan que una
// página tenga que recordar qué capacidad gobierna cada botón.

/** Confirmar un pedido (avance a `confirmado`). */
export function puedeConfirmarPedido(): boolean {
  return puede("orders.confirm");
}

/** Operar la preparación y el cierre (avance a `en_preparacion`/`listo`/`en_camino`/`entregado`). */
export function puedePrepararPedido(): boolean {
  return puede("preparation.manage");
}

/** Cancelar un pedido. */
export function puedeCancelarPedido(): boolean {
  return puede("orders.cancel");
}

/** Crear pedidos manualmente. */
export function puedeCrearPedido(): boolean {
  return puede("orders.create");
}

/**
 * Editar los datos de un pedido ya creado (repartidor asignado, correcciones).
 *
 * ── Por qué existe (08/10) ────────────────────────────────────────────────
 *
 * `orders.edit` estaba declarada desde el principio pero **no tenía ningún
 * lector**: el input de «Repartidor asignado» del `DetallePedidoModal` escribía
 * en el store sin comprobar nada. Cualquier rol que pudiera ABRIR el detalle
 * —Preparación, con solo `orders.read`— podía reasignar el reparto, que es una
 * mutación de la logística del pedido.
 *
 * El ayudante se escribe una sola vez para que la capacidad no se teclee a mano
 * en la condición: una cadena mal escrita en un `puede(...)` no da error de
 * compilación y deniega en silencio.
 */
export function puedeEditarPedido(): boolean {
  return puede("orders.edit");
}

// ── Programados ────────────────────────────────────────────────────────────

/** Ver la sección de pedidos programados. */
export function puedeVerProgramados(): boolean {
  return puede("scheduled.read");
}

/** Activar o reprogramar un pedido programado. */
export function puedeGestionarProgramados(): boolean {
  return puede("scheduled.manage");
}

// ── Canales (WhatsApp) ─────────────────────────────────────────────────────

/**
 * Abrir WhatsApp / escribir al cliente desde un pedido.
 *
 * ── Por qué exige `channels.respond` y NO `channels.read` (corregido 08/10) ─
 *
 * Pedía `channels.read`, y eso convertía el botón «WhatsApp» del detalle del
 * pedido, del tablero y del historial en un **control que miente**: un rol con
 * acceso de solo lectura al canal (leer la bandeja) veía el botón y podía
 * abrir el hilo para escribir. Leer un canal y escribir en él son dos acciones
 * distintas — es exactamente el corte que `channels.read` / `channels.respond`
 * declara en el catálogo de capacidades.
 *
 * Coincide a propósito con `puedeResponderConversacion()`: las dos responden
 * «¿puede esta sesión mandar un mensaje al cliente?». Se conserva el nombre
 * porque el punto de vista es distinto (desde un PEDIDO, no desde la bandeja),
 * pero la capacidad que lo gobierna es una sola.
 */
export function puedeEscribirCliente(): boolean {
  return puede("channels.respond");
}

/** Ver la consola de conversaciones (bandeja y lectura de canales). */
export function puedeVerConversaciones(): boolean {
  return puede("channels.read");
}

/** Comprueba si hay al menos un canal de mensajería (WhatsApp, IG, FB) conectado y activo. */
export function hayCanalesMensajeriaActivos(): boolean {
  try {
    const guardado =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("pedidos_canales_integraciones")
        : null;
    if (guardado) {
      const parsed = JSON.parse(guardado);
      const whatsapp =
        parsed.whatsapp !== undefined
          ? Boolean(parsed.whatsapp)
          : organizacionStore.esConectorActivo("pedidos", "whatsapp");
      const instagram = Boolean(parsed.instagram);
      const facebook = Boolean(parsed.facebook);
      return whatsapp || instagram || facebook;
    }
  } catch {}
  return organizacionStore.esConectorActivo("pedidos", "whatsapp");
}

/** Responder en una conversación (tomar/devolver y enviar como negocio). */
export function puedeResponderConversacion(): boolean {
  return puede("channels.respond");
}

/** Comprueba si el operador tiene permiso Y hay canales activos para poder enviar mensajes. */
export function puedeEscribirEnConversaciones(): boolean {
  return puedeResponderConversacion() && hayCanalesMensajeriaActivos();
}

/** Editar las plantillas de mensaje del canal. */
export function puedeEditarPlantillas(): boolean {
  return puede("channels.manage");
}

// ── Configuración y equipo ─────────────────────────────────────────────────

/** Guardar cambios de configuración del módulo. */
export function puedeGuardarConfig(): boolean {
  return puede("settings.manage");
}

/** Ver y editar la configuración del módulo. */
export function puedeVerConfig(): boolean {
  return puede("settings.read");
}

/** Gestionar el equipo (roles y operadores). */
export function puedeGestionarEquipo(): boolean {
  return puede("team.manage");
}

// ── Inventarios ────────────────────────────────────────────────────────────
//
// Cinco ayudantes, uno por capacidad. Existen para que las pantallas no
// escriban la cadena `"inventory.finalize"` a mano en una condición: una
// capacidad mal escrita en un `puede(...)` **no da error de compilación** pero
// sí deniega en silencio, que es la peor forma de fallar. Con el ayudante, el
// nombre de la capacidad se escribe una sola vez y el compilador lo revisa.

/** Ver el módulo de Inventarios completo (las siete secciones) y exportar. */
export function puedeVerInventarios(): boolean {
  return puede("inventory.read");
}

/** Crear inventarios, agregar y editar líneas, contar, adjuntar evidencia. */
export function puedeContarInventario(): boolean {
  return puede("inventory.count");
}

/** Crear, editar y dar de baja elementos y ubicaciones. */
export function puedeGestionarCatalogo(): boolean {
  return puede("inventory.manage");
}

/**
 * Finalizar y anular un inventario. **Es la firma.**
 *
 * Va separada de `count` a propósito: quien recorrió el almacén y contó no
 * debería cerrar su propio conteo sin revisión, o la firma no verifica nada.
 */
export function puedeFinalizarInventario(): boolean {
  return puede("inventory.finalize");
}

/** Guardar la configuración del módulo de Inventarios. */
export function puedeConfigurarInventarios(): boolean {
  return puede("inventory.configure");
}

// ── Mensajes de por qué una acción está bloqueada ──────────────────────────

/**
 * Explica en lenguaje natural qué permiso falta para una capacidad.
 *
 * Sirve para `title` / tooltips de botones deshabilitados: en vez de un botón
 * gris sin explicación, "Requiere el permiso «Cancelar pedidos»".
 */
export function motivoSinPermiso(capacidad: Capacidad): string {
  return `Requiere el permiso «${CAPACIDAD_LABEL[capacidad]}».`;
}

// ── Presentación de la simulación ("Viendo como") ──────────────────────────

/**
 * Nombre del rol del operador que se está simulando.
 *
 * ── Por qué esto vive aquí y no en `sessionStore` ────────────────────────
 *
 * El nombre de un rol es **presentación**, y `AccessContext` es
 * exclusivamente autorización: el contrato (§1.8) prohíbe meter datos de
 * presentación ahí, y la invariante C6 mantiene el scope de datos fuera también.
 * Por eso el store expone `rolId` —el hecho— y la traducción a un nombre legible
 * se resuelve en esta capa, que ya es la encargada de convertir hechos de los
 * stores en algo que una pantalla pueda pintar.
 *
 * ── Por qué el fallback no es una cadena vacía ───────────────────────────
 *
 * `rolesStore.nombreDe()` devuelve `""` cuando el rol no existe, que es correcto
 * para autorización (fail-closed) pero **incorrecto para pintar**: un chip que
 * dijera «Viendo como: » con el nombre en blanco parece un fallo de la
 * aplicación. Se distingue el caso, y se dice «Sin rol» — que además es la
 * verdad útil, porque un operador sin rol no tiene ninguna capacidad.
 *
 * Devuelve `null` cuando NO hay simulación: así el llamador decide si pinta el
 * chip, en vez de recibir una cadena que parezca un nombre real.
 */
export function rolSimuladoNombre(): string | null {
  const op = sessionStore.operadorSimulado;
  if (!op) return null;
  // `op.rolId` puede ser `undefined` si el operador se creó por la vía que no
  // lo asigna (`operadores.store.solicitar`, que deja `rolId: undefined`) y
  // nunca pasó por la aprobación que lo normaliza. En ese caso `nombreDe()`
  // devuelve `""` y esta capa declara «Sin rol», que es la verdad útil: un
  // operador sin rol no tiene ninguna capacidad.
  return rolesStore.nombreDe(op.rolId) || "Sin rol";
}

/**
 * Nombre del operador que se está simulando, o `null` si no hay simulación.
 *
 * Acompaña a `rolSimuladoNombre()`: el indicador de «Viendo como» necesita las
 * dos cosas para ser útil.
 */
export function operadorSimuladoNombre(): string | null {
  return sessionStore.operadorSimulado?.nombre ?? null;
}
