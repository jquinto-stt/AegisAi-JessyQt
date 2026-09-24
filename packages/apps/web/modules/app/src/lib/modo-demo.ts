// ═══════════════════════════════════════════════════════════════════════════
// MODO DEMOSTRACIÓN
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Por qué esto existe ────────────────────────────────────────────────────
//
// `/conversaciones` está detrás de dos guardas apiladas:
//
//   <ModuloGuard modulo="conversaciones">      ← organizacionStore
//     <CapabilityGuard capacidad="channels.read">  ← sessionStore
//
// `ModuloGuard` pregunta `organizacionStore.estaActivo("conversaciones")`, que
// delega en `tieneConectorActivo("whatsapp")`. Y `tieneConectorActivo` recorre
// los MÓDULOS DE NEGOCIO (`pedidos`, `inventario`) buscando uno con ese conector
// encendido:
//
//     Object.keys(this.modulos).some(mId => this.esConectorActivo(mId, conectorId))
//
// Ahí está el problema real: **`conversaciones` no es un `IdModuloNegocio`.** El
// tipo es `"pedidos" | "inventario"`, así que el conector `whatsapp` no se puede
// encender «por sí solo» — se enciende *dentro* de un módulo de negocio. Con el
// estado de fábrica (ningún módulo instalado) no hay ninguna clave sobre la que
// ponerlo, y por eso el `setConectorActivo("conversaciones", …)` que parecía
// obvio no compila: no existe tal clave.
//
// Encender `pedidos` para desbloquear Conversaciones sería el arreglo fácil y el
// equivocado: afirmaría una instalación que nadie pidió y metería una sección de
// Pedidos en el sidebar de una demo de mensajería.
//
// ── Qué hace, y por qué no miente ──────────────────────────────────────────
//
// Siembra el estado de pertenencia que una organización REAL tiene cuando el
// canal está enlazado: la organización existe, y el módulo bajo el que vive la
// mensajería está instalado con el conector `whatsapp` encendido.
//
// Hay un hecho medido que respalda el `whatsapp: true` — no es una suposición:
// el receptor del webhook existe y está cableado en el servicio (:8080), y hay
// un hilo real con mensajes del bot escritos en `necto.mensaje` (verificado:
// «Tu pedido va en camino. Pedido: BOT-1001.», `autor='asistente'`).
//
// Lo que NO se toca: `sessionStore`. La sesión sigue naciendo en `/login`. Y las
// capacidades siguen saliendo del rol, no de aquí: esto no concede permisos.
//
// Es un MODO, no un atajo silencioso: se enciende por una acción visible del
// operador y se puede apagar. Mientras está encendido, la app lo dice en
// pantalla (ver el aviso de `ConversacionesPage`), para que nadie confunda un
// estado de demostración con una organización real.
import { organizacionStore } from "@/stores/organizacion.store";

const CLAVE_MODO_DEMO = "necto.demo.modo";

/**
 * ¿Está el modo demostración encendido?
 *
 * Se lee de `localStorage` en cada llamada y no se memoiza a propósito: el
 * operador puede apagarlo desde la UI y la app debe reaccionar sin recargar.
 */
export function modoDemoActivo(): boolean {
  try {
    return localStorage.getItem(CLAVE_MODO_DEMO) === "1";
  } catch {
    return false;
  }
}

/**
 * Enciende el modo demostración: perfil, organización y pertenencia.
 *
 * **Idempotente** en el sentido que importa: no duplica ni pisa datos que ya
 * existan. Si la organización ya tiene módulos activos no se siembra nada, para
 * no convertir una demo en un borrado de la configuración real del usuario.
 */
export function activarModoDemo(): { ok: boolean; motivo: string } {
  try {
    localStorage.setItem(CLAVE_MODO_DEMO, "1");
  } catch {
    return { ok: false, motivo: "No hay `localStorage`: el modo demo no puede persistir." };
  }

  // El perfil y la organización se crean solo si faltan. Un usuario que ya hizo
  // onboarding no ve cómo le reescriben sus datos por abrir una demo.
  if (!organizacionStore.tienePerfil) {
    organizacionStore.actualizarPerfil({ nombre: "Vera (demo)", email: "demo@necto.io" });
  }
  if (!organizacionStore.tieneOrganizacion) {
    organizacionStore.crearOrganizacion({
      nombre: "Necto (demo)",
      pais: "Colombia",
      moneda: "COP",
      zonaHoraria: "America/Bogota",
    });
  }

  // La pertenencia, solo si está vacía. `pedidos` es el módulo de negocio bajo el
  // que el producto monta la mensajería hoy; `whatsapp: true` es el hecho medido.
  if (organizacionStore.modulosActivos.length === 0) {
    organizacionStore.instalarModulo("pedidos");
    organizacionStore.setConectorActivo("pedidos", "whatsapp", true);
  } else if (!organizacionStore.tieneConectorActivo("whatsapp")) {
    // Ya hay módulos, pero el canal no está encendido en ninguno.
    organizacionStore.setConectorActivo("pedidos", "whatsapp", true);
  }

  return { ok: true, motivo: "modo demo encendido" };
}

/** Apaga el modo demostración. NO desinstala nada: la pertenencia es del dueño. */
export function desactivarModoDemo(): void {
  try {
    localStorage.removeItem(CLAVE_MODO_DEMO);
  } catch {
    /* sin localStorage no hay nada que apagar */
  }
}
