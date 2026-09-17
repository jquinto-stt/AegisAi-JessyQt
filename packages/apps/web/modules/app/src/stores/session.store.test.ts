import { describe, expect, it, vi } from "vitest";

/**
 * Tests del núcleo de acceso (Fase 1 del plan).
 *
 * Cubren los invariantes del contrato de arquitectura:
 *   outputs/contrato-arquitectura-acceso-necto.md
 *
 * C1  tipoSesion no decide autorización
 * C2  permisos aislado (legado)
 * C3  capacidades nunca null; sin sesión ⇒ sin acceso
 * C5  entrar a una sección no implica operarla
 * C7  simular nunca amplía capacidades
 * C8  simular solo sobre activos, y es reversible
 * C9  el admin no tiene rama especial
 */

/**
 * Carga instancias frescas de los stores.
 *
 * `operadoresStore` y `rolesStore` son singletons con estado en memoria: sin
 * reiniciar el registro de módulos, los tests se pisarían entre sí (un
 * `desactivar` en un test afectaría al siguiente).
 *
 * El entorno de vitest es `node`, así que no hay `localStorage` y la sesión
 * arranca siempre vacía — que es justo el estado que interesa probar.
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

// ═══════════════════════════════════════════════════════════════════════════
// C3 / bug H2 — sin sesión NO hay acceso
// ═══════════════════════════════════════════════════════════════════════════

describe("sesión sin configurar (invariante C3, bug H2)", () => {
  it("no está autenticada y no puede ver ni hacer nada", async () => {
    const { sessionStore } = await freshStores();

    const ctx = sessionStore.accessContext;
    expect(ctx.autenticado).toBe(false);
    expect(ctx.capacidades).toEqual([]);
    expect(ctx.rolId).toBeNull();
    expect(ctx.tipoSesion).toBeNull();

    // La aserción clave: antes `permisosActuales === null` hacía que
    // `puedeVer()` devolviera true y la app se comportara como admin.
    expect(sessionStore.puedeVer("inicio")).toBe(false);
    expect(sessionStore.puedeVerSeccion("pedidos", "configuracion")).toBe(false);
    expect(sessionStore.hasPermission("orders.read")).toBe(false);
    expect(sessionStore.accesoTotal).toBe(false);
    expect(sessionStore.isReady).toBe(false);
  });


  it("una sección de pedidos sin capacidad declarada se deniega", async () => {
    const { sessionStore } = await freshStores();
    sessionStore.configurar(["pedidos"], "administrador");

    expect(sessionStore.puedeVerSeccion("pedidos", "no-existe")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// C9 — el administrador es un rol normal
// ═══════════════════════════════════════════════════════════════════════════

describe("administrador como rol normal (invariante C9)", () => {
  it("resuelve a `admin_tienda` y obtiene las 18 capacidades", async () => {
    const { sessionStore, rolesStore } = await freshStores();
    sessionStore.configurar(["pedidos"], "administrador");

    const ctx = sessionStore.accessContext;
    expect(ctx.autenticado).toBe(true);
    expect(ctx.rolId).toBe("admin_tienda");
    expect(ctx.capacidades).toHaveLength(18);
    expect(ctx.operadorId).toBeNull();

    expect(sessionStore.hasPermission("settings.manage")).toBe(true);
    expect(sessionStore.hasPermission("team.manage")).toBe(true);
    expect(sessionStore.puedeVerSeccion("pedidos", "configuracion")).toBe(true);
    expect(sessionStore.accesoTotal).toBe(true);

    // Se resuelve por rol, no por una lista especial del admin.
    expect(rolesStore.porId("admin_tienda")?.capacidades).toHaveLength(18);
  });

  it("una sesión directa de tipo operador NO está autenticada", async () => {
    const { sessionStore } = await freshStores();
    sessionStore.configurar(["pedidos"], "operador");

    expect(sessionStore.accessContext.autenticado).toBe(false);
    expect(sessionStore.accessContext.rolId).toBeNull();
    expect(sessionStore.puedeVerSeccion("pedidos", "tablero")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Simulación: capacidades efectivas, C5 y C7
// ═══════════════════════════════════════════════════════════════════════════

describe("simulación de operador", () => {
  it("d2 (Vendedor) puede crear pero no preparar ni configurar", async () => {
    const { sessionStore } = await freshStores();
    sessionStore.configurar(["pedidos"], "administrador");
    sessionStore.simular("d2");

    expect(sessionStore.isSimulando).toBe(true);
    expect(sessionStore.hasPermission("orders.create")).toBe(true);
    expect(sessionStore.hasPermission("orders.confirm")).toBe(true);
    expect(sessionStore.hasPermission("preparation.manage")).toBe(false);
    expect(sessionStore.hasPermission("team.manage")).toBe(false);
    expect(sessionStore.puedeVerSeccion("pedidos", "configuracion")).toBe(false);
    expect(sessionStore.puedeVerSeccion("pedidos", "tablero")).toBe(true);
  });

  it("C5: entrar a Configuración no implica poder guardarla", async () => {
    const { sessionStore } = await freshStores();
    sessionStore.configurar(["pedidos"], "administrador");
    // d1 = Supervisor de pedidos: tiene `settings.read` pero NO `settings.manage`.
    sessionStore.simular("d1");

    expect(sessionStore.puedeVerSeccion("pedidos", "configuracion")).toBe(true);
    expect(sessionStore.hasPermission("settings.read")).toBe(true);
    expect(sessionStore.hasPermission("settings.manage")).toBe(false);
  });

  it("C8: no simula operadores inactivos ni ids inexistentes", async () => {
    const { sessionStore } = await freshStores();
    sessionStore.configurar(["pedidos"], "administrador");

    // t4 está `inactivo` en el SEED.
    sessionStore.simular("t4");
    expect(sessionStore.isSimulando).toBe(false);

    sessionStore.simular("no-existe");
    expect(sessionStore.isSimulando).toBe(false);

    // Sigue siendo la sesión de admin intacta.
    expect(sessionStore.accessContext.autenticado).toBe(true);
  });

  it("C7: las capacidades del operador son las de su rol (nunca más)", async () => {
    const { sessionStore, operadoresStore, rolesStore } = await freshStores();
    sessionStore.simular("d2");

    const op = operadoresStore.porId("d2")!;
    const delRol = new Set(rolesStore.capacidadesDe(op.rolId));
    const extras = new Set(op.capacidadesExtra ?? []);

    for (const cap of sessionStore.accessContext.capacidades) {
      expect(delRol.has(cap) || extras.has(cap)).toBe(true);
    }
  });

  it("el admin simulado deja de tener acceso total", async () => {
    const { sessionStore } = await freshStores();
    sessionStore.configurar(["pedidos"], "administrador");
    expect(sessionStore.accesoTotal).toBe(true);

    sessionStore.simular("d2");
    expect(sessionStore.accesoTotal).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// C8 — la simulación es reversible (snapshot / restore)
// ═══════════════════════════════════════════════════════════════════════════

describe("entrar y salir de la simulación (invariante C8)", () => {
  it("salirSimulacion restaura la sesión previa, no la resetea", async () => {
    const { sessionStore } = await freshStores();
    sessionStore.configurar(["pedidos"], "administrador");

    sessionStore.simular("d2");
    expect(sessionStore.modulos).toEqual(["pedidos"]);
    expect(sessionStore.tipoSesion).toBe("operador");

    sessionStore.salirSimulacion();

    expect(sessionStore.isSimulando).toBe(false);
    expect(sessionStore.tipoSesion).toBe("administrador");
    expect(sessionStore.modulos).toEqual(["pedidos"]);
    // Y sigue siendo una sesión de admin utilizable (antes esto mandaba al login).
    expect(sessionStore.accessContext.autenticado).toBe(true);
    expect(sessionStore.accesoTotal).toBe(true);
  });

  it("simular dos veces conserva el snapshot original", async () => {
    const { sessionStore } = await freshStores();
    sessionStore.configurar(["turnos", "pedidos"], "administrador");

    sessionStore.simular("d2");
    sessionStore.simular("d1");
    expect(sessionStore.operadorSimuladoId).toBe("d1");

    sessionStore.salirSimulacion();
    expect(sessionStore.tipoSesion).toBe("administrador");
    expect(sessionStore.modulos).toEqual(["turnos", "pedidos"]);
  });

  it("salir sin snapshot limpia la sesión (no inventa un admin)", async () => {
    const { sessionStore } = await freshStores();
    // Forzamos el estado "simulando sin snapshot" que dejaría una sesión antigua.
    sessionStore.modulos = ["pedidos"];
    sessionStore.tipoSesion = "operador";
    sessionStore.operadorSimuladoId = "d2";

    sessionStore.salirSimulacion();

    expect(sessionStore.operadorSimuladoId).toBeNull();
    expect(sessionStore.tipoSesion).toBeNull();
    expect(sessionStore.modulos).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Reconciliación — el bug de "permisos degradados a []"
// ═══════════════════════════════════════════════════════════════════════════

describe("reconciliación sesión ↔ operadores", () => {
  it("desactivar al operador simulado sale de la simulación", async () => {
    const { sessionStore, operadoresStore } = await freshStores();
    sessionStore.configurar(["pedidos"], "administrador");
    sessionStore.simular("d1");
    expect(sessionStore.isSimulando).toBe(true);

    operadoresStore.desactivar("d1");

    expect(sessionStore.isSimulando).toBe(false);
    // Y recupera la sesión de admin en vez de quedarse sin permisos.
    expect(sessionStore.accessContext.autenticado).toBe(true);
    expect(sessionStore.hasPermission("team.manage")).toBe(true);
  });

  it("eliminar al operador simulado sale de la simulación", async () => {
    const { sessionStore, operadoresStore } = await freshStores();
    sessionStore.configurar(["pedidos"], "administrador");
    sessionStore.simular("d2");

    operadoresStore.eliminar("d2");

    expect(sessionStore.isSimulando).toBe(false);
    expect(sessionStore.accessContext.autenticado).toBe(true);
  });

  it("reconciliar con un id colgante restaura la sesión de admin (con snapshot)", async () => {
    const { sessionStore } = await freshStores();
    sessionStore.configurar(["pedidos"], "administrador");
    // Simular deja el snapshot de la sesión de admin.
    sessionStore.simular("d2");
    // Y ahora el id queda colgante, como tras recargar la página cuando el
    // operador simulado era de una sesión anterior (store en memoria).
    sessionStore.operadorSimuladoId = "d999";

    sessionStore.reconciliar();

    expect(sessionStore.isSimulando).toBe(false);
    // Con snapshot vuelve a la sesión de admin, no a cero permisos.
    expect(sessionStore.accessContext.autenticado).toBe(true);
    expect(sessionStore.hasPermission("team.manage")).toBe(true);
  });

  it("reconciliar sin snapshot limpia la sesión (no inventa un admin)", async () => {
    const { sessionStore } = await freshStores();
    sessionStore.configurar(["pedidos"], "administrador");
    // Sesión antigua sin `preSimulacion` persistido: no hay a dónde volver.
    sessionStore.operadorSimuladoId = "d999";

    sessionStore.reconciliar();

    expect(sessionStore.isSimulando).toBe(false);
    expect(sessionStore.accessContext.autenticado).toBe(false);
  });

  it("desactivar a otro operador no afecta a la simulación", async () => {
    const { sessionStore, operadoresStore } = await freshStores();
    sessionStore.configurar(["pedidos"], "administrador");
    sessionStore.simular("d1");

    operadoresStore.desactivar("d2");

    expect(sessionStore.isSimulando).toBe(true);
    expect(sessionStore.operadorSimuladoId).toBe("d1");
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// C1 — tipoSesion solo enruta, no autoriza
// ═══════════════════════════════════════════════════════════════════════════

describe("tipo de sesión vs autorización (invariante C1)", () => {
  it("cambiar el tipo de sesión a administrador es lo que da acceso", async () => {
    const { sessionStore } = await freshStores();

    sessionStore.configurar(["pedidos"], "operador");
    expect(sessionStore.hasPermission("orders.read")).toBe(false);

    // Mismo `modulos`, distinto tipo de sesión ⇒ distinto acceso. La decisión
    // sale del rol resuelto, no de leer `tipoSesion` en un guard.
    sessionStore.configurar(["pedidos"], "administrador");
    expect(sessionStore.hasPermission("orders.read")).toBe(true);
  });

  it("reset limpia también la simulación y el snapshot", async () => {
    const { sessionStore } = await freshStores();
    sessionStore.configurar(["pedidos"], "administrador");
    sessionStore.simular("d2");

    sessionStore.reset();

    expect(sessionStore.modulos).toEqual([]);
    expect(sessionStore.tipoSesion).toBeNull();
    expect(sessionStore.operadorSimuladoId).toBeNull();
    expect(sessionStore.preSimulacion).toBeNull();
    expect(sessionStore.accessContext.autenticado).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// homePathActual
// ═══════════════════════════════════════════════════════════════════════════

describe("homePathActual", () => {
  it("lleva al operador a su primera sección permitida", async () => {
    const { sessionStore } = await freshStores();
    // d2 (Vendedor) puede ver Inicio, así que aterriza ahí.
    sessionStore.simular("d2");
    expect(sessionStore.homePathActual).toBe("/pedidos/inicio");
  });

  it("el admin va al inicio de su módulo principal", async () => {
    const { sessionStore } = await freshStores();
    sessionStore.configurar(["pedidos"], "administrador");
    expect(sessionStore.homePathActual).toBe("/pedidos/inicio");
  });
});
