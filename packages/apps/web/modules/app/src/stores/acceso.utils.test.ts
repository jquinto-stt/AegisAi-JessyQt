import { describe, expect, it, vi } from "vitest";
import type { PedidoEstado } from "@/stores/pedidos.store";

/**
 * Tests de la capa de capacidad de Pedidos (Fase 2 del plan).
 *
 * Cubren el mapeo **transición del pipeline → capacidad** y los atajos que usan
 * las páginas. Es conocimiento de dominio, no presentación: si alguien cambia
 * qué permiso gobierna "confirmar un pedido", aquí debe romperse.
 *
 * Referencias:
 *   outputs/contrato-arquitectura-acceso-necto.md
 *   src/stores/acceso.utils.ts
 *
 * Invariantes relevantes:
 *   C3  fail-closed: lo que no está declarado se deniega
 *   C5  entrar a la sección no implica operar
 *   C7  nunca se amplían capacidades por conveniencia
 */

/**
 * Carga instancias frescas de stores + helpers.
 *
 * `acceso.utils` captura `sessionStore` en el momento del import, así que hay
 * que importarlo DESPUÉS de `resetModules()` para que apunte al store fresco.
 * El entorno es `node`: no hay `localStorage` y la sesión arranca vacía.
 */
async function freshAcceso() {
  vi.resetModules();
  const session = await import("@/stores/session.store");
  const operadores = await import("@/stores/operadores.store");
  const roles = await import("@/stores/roles.store");
  const acceso = await import("@/stores/acceso.utils");
  return {
    sessionStore: session.sessionStore,
    operadoresStore: operadores.operadoresStore,
    rolesStore: roles.rolesStore,
    acceso,
  };
}

/** Ids del SEED de operadores de pedidos (ver operadores.store.ts). */
const OP_SUPERVISOR = "d1"; // rolId: supervisor_pedidos
const OP_VENDEDOR = "d2"; // rolId: vendedor
const OP_VENDEDOR_2 = "d3"; // rolId: vendedor

// ═══════════════════════════════════════════════════════════════════════════
// MAPEO PURO — no necesita sesión
// ═══════════════════════════════════════════════════════════════════════════

describe("CAPACIDAD_POR_DESTINO (mapeo de dominio)", () => {
  it("declara una capacidad para cada destino alcanzable del pipeline", async () => {
    const { acceso } = await freshAcceso();

    // Todo estado al que se puede LLEGAR por avance (o cancelación) debe tener
    // capacidad declarada. `programado` y `nuevo` son estados de entrada, no
    // destinos de avance.
    const alcanzables: PedidoEstado[] = ["confirmado", "en_preparacion", "listo", "en_camino", "entregado", "cancelado"];
    for (const estado of alcanzables) {
      expect(acceso.CAPACIDAD_POR_DESTINO[estado], `falta capacidad para "${estado}"`).toBeTruthy();
    }

    // Los estados de entrada NO se alcanzan avanzando.
    expect(acceso.CAPACIDAD_POR_DESTINO.programado).toBeUndefined();
    expect(acceso.CAPACIDAD_POR_DESTINO.nuevo).toBeUndefined();
  });

  it("separa confirmar (orders.confirm) de preparar (preparation.manage)", async () => {
    const { acceso } = await freshAcceso();

    // Es la separación que da sentido al modelo: confirmar es una decisión
    // comercial, preparar es trabajo de cocina. Un rol de Preparación no debe
    // poder confirmar.
    expect(acceso.CAPACIDAD_POR_DESTINO.confirmado).toBe("orders.confirm");
    expect(acceso.CAPACIDAD_POR_DESTINO.en_preparacion).toBe("preparation.manage");
    expect(acceso.CAPACIDAD_POR_DESTINO.listo).toBe("preparation.manage");
    expect(acceso.CAPACIDAD_POR_DESTINO.en_camino).toBe("preparation.manage");
    expect(acceso.CAPACIDAD_POR_DESTINO.entregado).toBe("preparation.manage");
    expect(acceso.CAPACIDAD_POR_DESTINO.cancelado).toBe("orders.cancel");
  });

  it("capacidadParaAvanzar devuelve null para destinos sin capacidad", async () => {
    const { acceso } = await freshAcceso();

    expect(acceso.capacidadParaAvanzar(null)).toBeNull();
    expect(acceso.capacidadParaAvanzar("nuevo")).toBeNull();
    expect(acceso.capacidadParaAvanzar("programado")).toBeNull();
    expect(acceso.capacidadParaAvanzar("confirmado")).toBe("orders.confirm");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// C3 — FAIL-CLOSED
// ═══════════════════════════════════════════════════════════════════════════

describe("fail-closed (invariante C3)", () => {
  it("sin sesión, ninguna acción de pedidos está permitida", async () => {
    const { acceso } = await freshAcceso();

    expect(acceso.puedeMoverA("confirmado")).toBe(false);
    expect(acceso.puedeMoverA("entregado")).toBe(false);
    expect(acceso.puedeMoverA("cancelado")).toBe(false);
    expect(acceso.puedeConfirmarPedido()).toBe(false);
    expect(acceso.puedePrepararPedido()).toBe(false);
    expect(acceso.puedeCancelarPedido()).toBe(false);
    expect(acceso.puedeCrearPedido()).toBe(false);
    expect(acceso.puedeVerProgramados()).toBe(false);
    expect(acceso.puedeGestionarProgramados()).toBe(false);
    expect(acceso.puedeEscribirCliente()).toBe(false);
    expect(acceso.puedeEditarPlantillas()).toBe(false);
    expect(acceso.puedeGuardarConfig()).toBe(false);
    expect(acceso.puedeGestionarEquipo()).toBe(false);
  });

  it("puedeMoverA(null) es false: sin transición no hay acción que autorizar", async () => {
    const { sessionStore, acceso } = await freshAcceso();
    sessionStore.configurar(["pedidos"], "administrador");

    // Aunque la sesión tenga TODAS las capacidades, no hay destino → no hay
    // avance que autorizar.
    expect(acceso.puedeMoverA(null)).toBe(false);
  });

  it("un destino sin capacidad declarada se deniega incluso siendo admin", async () => {
    const { sessionStore, acceso } = await freshAcceso();
    sessionStore.configurar(["pedidos"], "administrador");

    // `nuevo` no está en el mapa: fail-closed, no fail-open.
    expect(acceso.puedeMoverA("nuevo")).toBe(false);
    expect(acceso.puedeMoverA("programado")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// C9 — el admin es un rol normal: todo concedido, sin rama especial
// ═══════════════════════════════════════════════════════════════════════════

describe("sesión directa de administrador (invariante C9)", () => {
  it("puede ejecutar todas las acciones de pedidos", async () => {
    const { sessionStore, acceso } = await freshAcceso();
    sessionStore.configurar(["pedidos"], "administrador");

    expect(acceso.puedeMoverA("confirmado")).toBe(true);
    expect(acceso.puedeMoverA("en_preparacion")).toBe(true);
    expect(acceso.puedeMoverA("entregado")).toBe(true);
    expect(acceso.puedeMoverA("cancelado")).toBe(true);
    expect(acceso.puedeCrearPedido()).toBe(true);
    expect(acceso.puedeVerProgramados()).toBe(true);
    expect(acceso.puedeGestionarProgramados()).toBe(true);
    expect(acceso.puedeEscribirCliente()).toBe(true);
    expect(acceso.puedeEditarPlantillas()).toBe(true);
    expect(acceso.puedeGuardarConfig()).toBe(true);
    expect(acceso.puedeGestionarEquipo()).toBe(true);
  });

  it("una sesión directa de operador NO está autenticada (no hay bypass)", async () => {
    const { sessionStore, acceso } = await freshAcceso();
    // Entrar "como operador" sin simular un operador concreto no da acceso:
    // la sesión directa de operador no resuelve a ningún rol.
    sessionStore.configurar(["pedidos"], "operador");

    expect(sessionStore.accessContext.autenticado).toBe(false);
    expect(acceso.puedeMoverA("confirmado")).toBe(false);
    expect(acceso.puedeCrearPedido()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CADA ROL VE EXACTAMENTE SUS ACCIONES
// ═══════════════════════════════════════════════════════════════════════════

describe("rol Preparación", () => {
  it("prepara y entrega, pero NO confirma, NO cancela y NO escribe al cliente", async () => {
    const { sessionStore, operadoresStore, acceso } = await freshAcceso();
    // El SEED no trae un operador de preparación: se le cambia el rol a uno
    // existente para ejercitar el rol real del catálogo.
    operadoresStore.setRol(OP_VENDEDOR, "preparacion");
    sessionStore.simular(OP_VENDEDOR);

    // Puede operar el pipeline de preparación.
    expect(acceso.puedeMoverA("en_preparacion")).toBe(true);
    expect(acceso.puedeMoverA("listo")).toBe(true);
    expect(acceso.puedeMoverA("en_camino")).toBe(true);
    expect(acceso.puedeMoverA("entregado")).toBe(true);
    expect(acceso.puedePrepararPedido()).toBe(true);

    // NO puede confirmar (decisión comercial).
    expect(acceso.puedeMoverA("confirmado")).toBe(false);
    expect(acceso.puedeConfirmarPedido()).toBe(false);

    // NO puede cancelar.
    expect(acceso.puedeMoverA("cancelado")).toBe(false);
    expect(acceso.puedeCancelarPedido()).toBe(false);

    // NO puede crear ni escribir al cliente.
    expect(acceso.puedeCrearPedido()).toBe(false);
    expect(acceso.puedeEscribirCliente()).toBe(false);

    // VE programados (scheduled.read) pero no los gestiona.
    expect(acceso.puedeVerProgramados()).toBe(true);
    expect(acceso.puedeGestionarProgramados()).toBe(false);

    // Nada de configuración ni equipo.
    expect(acceso.puedeGuardarConfig()).toBe(false);
    expect(acceso.puedeEditarPlantillas()).toBe(false);
    expect(acceso.puedeGestionarEquipo()).toBe(false);
  });
});

describe("rol Vendedor", () => {
  it("confirma, cancela, crea y agenda — pero NO prepara ni configura", async () => {
    const { sessionStore, acceso } = await freshAcceso();
    sessionStore.simular(OP_VENDEDOR);

    // Ciclo comercial.
    expect(acceso.puedeMoverA("confirmado")).toBe(true);
    expect(acceso.puedeMoverA("cancelado")).toBe(true);
    expect(acceso.puedeCrearPedido()).toBe(true);
    expect(acceso.puedeEscribirCliente()).toBe(true);

    // Programados: los ve y los gestiona.
    expect(acceso.puedeVerProgramados()).toBe(true);
    expect(acceso.puedeGestionarProgramados()).toBe(true);

    // NO prepara: no es su trabajo.
    expect(acceso.puedePrepararPedido()).toBe(false);
    expect(acceso.puedeMoverA("en_preparacion")).toBe(false);
    expect(acceso.puedeMoverA("listo")).toBe(false);
    expect(acceso.puedeMoverA("entregado")).toBe(false);

    // NO toca configuración ni equipo, ni edita plantillas.
    expect(acceso.puedeGuardarConfig()).toBe(false);
    expect(acceso.puedeEditarPlantillas()).toBe(false);
    expect(acceso.puedeGestionarEquipo()).toBe(false);
  });
});

describe("rol Supervisor de pedidos", () => {
  it("cubre el ciclo completo y canales, pero NO guarda configuración ni gestiona equipo", async () => {
    const { sessionStore, acceso } = await freshAcceso();
    sessionStore.simular(OP_SUPERVISOR);

    // Todo el pipeline.
    expect(acceso.puedeConfirmarPedido()).toBe(true);
    expect(acceso.puedePrepararPedido()).toBe(true);
    expect(acceso.puedeCancelarPedido()).toBe(true);
    expect(acceso.puedeCrearPedido()).toBe(true);
    expect(acceso.puedeGestionarProgramados()).toBe(true);

    // Canales completos (lee y edita plantillas).
    expect(acceso.puedeEscribirCliente()).toBe(true);
    expect(acceso.puedeEditarPlantillas()).toBe(true);

    // VE la configuración, pero no la edita: es la frontera `settings.read`
    // vs `settings.manage` que la ConfigPage hace visible como solo lectura.
    expect(acceso.puedeVerConfig()).toBe(true);
    expect(acceso.puedeGuardarConfig()).toBe(false);

    // NO gestiona el equipo.
    expect(acceso.puedeGestionarEquipo()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// C7 — las excepciones por operador no amplían por conveniencia
// ═══════════════════════════════════════════════════════════════════════════

describe("excepciones por operador (invariante C7)", () => {
  it("capacidadesExtra suma, capacidadesRemovidas resta, y la denegación gana", async () => {
    const { sessionStore, operadoresStore, acceso } = await freshAcceso();

    // Preparación + permiso explícito de confirmar.
    operadoresStore.setRol(OP_VENDEDOR, "preparacion");
    operadoresStore.setCapacidadesExtra(OP_VENDEDOR, ["orders.confirm"]);
    sessionStore.simular(OP_VENDEDOR);
    expect(acceso.puedeConfirmarPedido()).toBe(true);

    // Ahora se le quita explícitamente: la denegación gana sobre el extra.
    operadoresStore.setCapacidadesRemovidas(OP_VENDEDOR, ["orders.confirm"]);
    expect(acceso.puedeConfirmarPedido()).toBe(false);
    expect(acceso.puedeMoverA("confirmado")).toBe(false);
  });

  it("un operador sin rol no obtiene ninguna capacidad (fail-closed)", async () => {
    const { sessionStore, operadoresStore, acceso } = await freshAcceso();
    // `personalizado` es el rol fail-closed: sin capacidades.
    operadoresStore.setRol(OP_VENDEDOR_2, "personalizado");
    sessionStore.simular(OP_VENDEDOR_2);

    expect(acceso.puedeMoverA("confirmado")).toBe(false);
    expect(acceso.puedeMoverA("en_preparacion")).toBe(false);
    expect(acceso.puedeCrearPedido()).toBe(false);
    expect(acceso.puedeVerProgramados()).toBe(false);
  });

  it("un rol inexistente deniega todo (fail-closed)", async () => {
    const { sessionStore, operadoresStore, acceso } = await freshAcceso();
    operadoresStore.setRol(OP_VENDEDOR, "rol_que_no_existe");
    sessionStore.simular(OP_VENDEDOR);

    expect(acceso.puedeMoverA("confirmado")).toBe(false);
    expect(acceso.puedeMoverA("entregado")).toBe(false);
    expect(acceso.puedeEscribirCliente()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MENSAJES DE BLOQUEO
// ═══════════════════════════════════════════════════════════════════════════

describe("motivoSinPermiso", () => {
  it("nombra la capacidad con su etiqueta legible", async () => {
    const { acceso } = await freshAcceso();

    const msg = acceso.motivoSinPermiso("settings.manage");
    expect(msg).toContain("Editar configuración");
    expect(msg).toMatch(/requiere/i);

    expect(acceso.motivoSinPermiso("orders.cancel")).toContain("Cancelar órdenes");
    expect(acceso.motivoSinPermiso("channels.manage")).toContain("Gestionar canales");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// C5 — ENTRAR NO ES OPERAR
// ═══════════════════════════════════════════════════════════════════════════

describe("C5: entrar al tablero no implica operar", () => {
  it("un rol con solo orders.read ve el tablero pero no puede hacer nada", async () => {
    const { sessionStore, operadoresStore, rolesStore, acceso } = await freshAcceso();

    // Rol a medida: solo lectura.
    const rol = rolesStore.crear({ nombre: "Solo lectura", capacidades: ["orders.read"] });
    operadoresStore.setRol(OP_VENDEDOR, rol.id);
    sessionStore.simular(OP_VENDEDOR);

    // Puede ENTRAR (la ruta exige `orders.read`).
    expect(sessionStore.hasPermission("orders.read")).toBe(true);
    expect(sessionStore.puedeVerSeccion("pedidos", "tablero")).toBe(true);

    // Pero NO puede operar nada dentro.
    expect(acceso.puedeMoverA("confirmado")).toBe(false);
    expect(acceso.puedeMoverA("en_preparacion")).toBe(false);
    expect(acceso.puedeMoverA("cancelado")).toBe(false);
    expect(acceso.puedeEscribirCliente()).toBe(false);
    expect(acceso.puedeCrearPedido()).toBe(false);
    expect(acceso.puedeVerProgramados()).toBe(false);
  });
});
