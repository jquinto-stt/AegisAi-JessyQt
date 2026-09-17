import { sessionStore } from "@/stores/session.store";
import { CAPACIDAD_LABEL, type Capacidad } from "@/stores/roles.store";
import type { PedidoEstado } from "@/stores/pedidos.store";

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

/** Abrir WhatsApp / escribir al cliente desde un pedido. */
export function puedeEscribirCliente(): boolean {
  return puede("channels.read");
}

/** Ver la consola de conversaciones (bandeja y lectura de canales). */
export function puedeVerConversaciones(): boolean {
  return puede("channels.read");
}

/** Responder en una conversación (tomar/devolver y enviar como negocio). */
export function puedeResponderConversacion(): boolean {
  return puede("channels.respond");
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
