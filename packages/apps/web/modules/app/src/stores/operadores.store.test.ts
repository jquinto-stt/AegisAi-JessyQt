import { describe, expect, it, vi } from "vitest";
import type { Operador, OperadoresStore } from "@/stores/operadores.store";
import type { Modulo } from "@/stores/session.store";

/**
 * Tests del flujo de solicitud de acceso (Fase 4 del plan).
 *
 * `/operador/registro` ahora llama de verdad a `operadoresStore.solicitar()`;
 * antes solo cambiaba a una tarjeta de éxito y **no creaba nada**, así que los
 * operadores `pendiente` de la tabla venían únicamente del SEED.
 *
 * Estos tests fijan las dos propiedades que importan:
 *
 *   1. La solicitud aterriza como `pendiente` en el módulo pedido, sin
 *      contaminar los otros módulos.
 *   2. **Pedir acceso no otorga acceso.** Sin rol asignado las capacidades
 *      efectivas son `[]`, y un `pendiente` no se puede impersonar (invariante
 *      C8). El acceso solo llega cuando el admin aprueba **y** asigna un rol.
 */

/**
 * Carga instancias frescas de los stores.
 *
 * `operadoresStore` y `rolesStore` son singletons con estado en memoria: sin
 * reiniciar el registro de módulos los tests se pisarían entre sí (una solicitud
 * creada en un test aparecería en el siguiente).
 *
 * El entorno de vitest es `node`, así que no hay `localStorage` y la sesión
 * arranca siempre vacía.
 */
async function freshStores() {
  vi.resetModules();
  const session = await import("@/stores/session.store");
  const operadores = await import("@/stores/operadores.store");
  const roles = await import("@/stores/roles.store");
  return {
    sessionStore: session.sessionStore,
    operadoresStore: operadores.operadoresStore,
    rolesStore: roles.rolesStore,
  };
}

/** Última persona añadida a un módulo (las altas hacen push al final). */
function ultimoDe(operadoresStore: OperadoresStore, modulo: Modulo): Operador {
  const ops = operadoresStore.porModulo(modulo);
  return ops[ops.length - 1];
}

const SOLICITUD = { nombre: "Nueva Persona", email: "nueva@negocio.com", telefono: "+57 300 000 0000" };

// ═══════════════════════════════════════════════════════════════════════════
// solicitar() — la solicitud se registra de verdad
// ═══════════════════════════════════════════════════════════════════════════

describe("solicitar() registra la solicitud", () => {
  it("añade la persona como pendiente en el módulo pedido", async () => {
    const { operadoresStore } = await freshStores();
    const antes = operadoresStore.porModulo("pedidos").length;

    operadoresStore.solicitar({ ...SOLICITUD, modulo: "pedidos" });

    const ops = operadoresStore.porModulo("pedidos");
    expect(ops).toHaveLength(antes + 1);

    const nuevo = ultimoDe(operadoresStore, "pedidos");
    expect(nuevo.estado).toBe("pendiente");
    expect(nuevo.modulo).toBe("pedidos");
    expect(nuevo.nombre).toBe(SOLICITUD.nombre);
    expect(nuevo.email).toBe(SOLICITUD.email);
    expect(nuevo.telefono).toBe(SOLICITUD.telefono);
  });

  it("aparece en la lista de pendientes que ve el admin", async () => {
    const { operadoresStore } = await freshStores();

    operadoresStore.solicitar({ ...SOLICITUD, modulo: "pedidos" });

    const pendientes = operadoresStore
      .porModulo("pedidos")
      .filter((o) => o.estado === "pendiente");
    expect(pendientes.some((o) => o.email === SOLICITUD.email)).toBe(true);
  });

  // Aquí vivía «no contamina los otros módulos», que comparaba
  // `pendientesCount("turnos")` y `pendientesCount("agendamiento")` antes y
  // después de una solicitud. Los dos módulos se retiraron, así que la
  // distinción que el test guardaba ya no existe y el test habría pasado por
  // vacuidad. Vuelve el día que `Modulo` deje de tener un solo valor.
});

// ═══════════════════════════════════════════════════════════════════════════
// Fail-closed — la solicitud NO otorga acceso por sí misma
// ═══════════════════════════════════════════════════════════════════════════

describe("pedir acceso no otorga acceso (fail-closed)", () => {
  it("nace sin rol y con cero capacidades efectivas", async () => {
    const { operadoresStore, rolesStore } = await freshStores();

    operadoresStore.solicitar({ ...SOLICITUD, modulo: "pedidos" });
    const nuevo = ultimoDe(operadoresStore, "pedidos");

    expect(nuevo.rolId).toBeUndefined();
    // Lo que de verdad importa: sin rol, no hay ninguna capacidad.
    expect(rolesStore.capacidadesEfectivas(nuevo)).toEqual([]);
  });

  it("aprobarla la deja activa pero SIN capacidades hasta que tenga rol", async () => {
    const { operadoresStore, rolesStore } = await freshStores();

    operadoresStore.solicitar({ ...SOLICITUD, modulo: "pedidos" });
    const nuevo = ultimoDe(operadoresStore, "pedidos");

    operadoresStore.aprobar(nuevo.id);

    const aprobado = operadoresStore.porId(nuevo.id)!;
    expect(aprobado.estado).toBe("activo");
    // Aprobar es dar de alta a la persona, no darle permisos: eso es el rol.
    expect(rolesStore.capacidadesEfectivas(aprobado)).toEqual([]);
  });

  it("con rol asignado ya tiene las capacidades de ese rol", async () => {
    const { operadoresStore, rolesStore } = await freshStores();

    operadoresStore.solicitar({ ...SOLICITUD, modulo: "pedidos" });
    const nuevo = ultimoDe(operadoresStore, "pedidos");
    operadoresStore.aprobar(nuevo.id);
    operadoresStore.setRol(nuevo.id, "vendedor");

    const capacidades = rolesStore.capacidadesEfectivas(operadoresStore.porId(nuevo.id)!);
    expect(capacidades).toContain("orders.create");
    expect(capacidades).toContain("orders.confirm");
    // Un Vendedor no prepara pedidos.
    expect(capacidades).not.toContain("preparation.manage");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// C8 — solo se puede impersonar a quien está activo
// ═══════════════════════════════════════════════════════════════════════════

describe("una solicitud pendiente no se puede impersonar (invariante C8)", () => {
  it("simular() la rechaza mientras sigue pendiente", async () => {
    const { sessionStore, operadoresStore } = await freshStores();

    operadoresStore.solicitar({ ...SOLICITUD, modulo: "pedidos" });
    const nuevo = ultimoDe(operadoresStore, "pedidos");

    sessionStore.simular(nuevo.id);

    expect(sessionStore.isSimulando).toBe(false);
    expect(sessionStore.accessContext.autenticado).toBe(false);
  });

  it("simular() la acepta después de aprobarla", async () => {
    const { sessionStore, operadoresStore } = await freshStores();

    operadoresStore.solicitar({ ...SOLICITUD, modulo: "pedidos" });
    const nuevo = ultimoDe(operadoresStore, "pedidos");
    operadoresStore.aprobar(nuevo.id);

    sessionStore.simular(nuevo.id);

    expect(sessionStore.isSimulando).toBe(true);
    // Recién aprobada, sin rol: la sesión está autenticada pero sin capacidades.
    expect(sessionStore.accessContext.autenticado).toBe(true);
    expect(sessionStore.accessContext.capacidades).toEqual([]);
  });
});
