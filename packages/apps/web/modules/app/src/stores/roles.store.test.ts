import { describe, expect, it, vi } from "vitest";

/**
 * Tests del catálogo de roles y capacidades.
 *
 * Cubren el contrato de arquitectura:
 *   outputs/contrato-arquitectura-acceso-necto.md
 *
 * C4  ninguna capacidad nombra una pantalla
 * C7  las capacidades efectivas nunca exceden rol + extras
 * §2  la denegación gana sobre el rol y sobre los extras
 */

async function freshRolesStore() {
  vi.resetModules();
  const mod = await import("@/stores/roles.store");
  return mod;
}

describe("catálogo de capacidades", () => {
  it("C4: todas las capacidades nombran acciones, no pantallas", async () => {
    const { CAPACIDADES } = await freshRolesStore();

    // 23 = 18 de Pedidos/canales/equipo/asistente + 5 de Inventarios
    // (`inventory.read` / `count` / `manage` / `finalize` / `configure`).
    expect(CAPACIDADES).toHaveLength(23);
    for (const cap of CAPACIDADES) {
      // Formato `<dominio>.<accion>`.
      expect(cap).toMatch(/^[a-z]+\.[a-z]+$/);
    }
    // Sin duplicados.
    expect(new Set(CAPACIDADES).size).toBe(CAPACIDADES.length);
  });

  it("cada capacidad tiene etiqueta y pertenece a un grupo", async () => {
    const { CAPACIDADES, CAPACIDAD_LABEL, CAPACIDAD_GRUPOS } = await freshRolesStore();

    for (const cap of CAPACIDADES) {
      expect(CAPACIDAD_LABEL[cap]).toBeTruthy();
    }

    const agrupadas = CAPACIDAD_GRUPOS.flatMap((g) => g.capacidades);
    expect(new Set(agrupadas)).toEqual(new Set(CAPACIDADES));
  });
});

describe("capacidad assistant.use", () => {
  it("está incluida en el catálogo de capacidades", async () => {
    const { CAPACIDADES } = await freshRolesStore();

    expect(CAPACIDADES).toContain("assistant.use");
  });

  it("tiene una etiqueta legible no vacía", async () => {
    const { CAPACIDAD_LABEL } = await freshRolesStore();

    expect(CAPACIDAD_LABEL["assistant.use"]).toBeTruthy();
  });

  it("pertenece al grupo 'asistente' (Asistente)", async () => {
    const { CAPACIDAD_GRUPOS } = await freshRolesStore();

    const grupo = CAPACIDAD_GRUPOS.find((g) => g.id === "asistente");
    expect(grupo).toBeTruthy();
    expect(grupo?.label).toBe("Asistente");
    expect(grupo?.capacidades).toContain("assistant.use");
  });

  it("la incluye el rol admin_tienda", async () => {
    const { rolesStore, ROL_ADMIN } = await freshRolesStore();

    expect(rolesStore.porId(ROL_ADMIN)?.capacidades).toContain("assistant.use");
  });
});

describe("catálogo de roles", () => {
  it("incluye el rol de administrador con TODAS las capacidades del catálogo", async () => {
    const { rolesStore, CAPACIDADES, ROL_ADMIN } = await freshRolesStore();

    const admin = rolesStore.porId(ROL_ADMIN);
    expect(admin?.nombre).toBe("Administrador de tienda");
    expect(admin?.sistema).toBe(true);
    // Se compara contra `CAPACIDADES.length` y no contra un número escrito: el
    // rol administrador se define como `[...CAPACIDADES]`, así que un 22 fijo
    // aquí sería un segundo dato que envejece por su cuenta. El número vive en
    // el pin de arriba, que es el único sitio donde debe estar.
    expect(admin?.capacidades).toHaveLength(CAPACIDADES.length);
  });

  it("incluye los roles operativos del contrato", async () => {
    const { rolesStore } = await freshRolesStore();

    expect(rolesStore.porId("supervisor_pedidos")?.nombre).toBe("Supervisor de operaciones");
    expect(rolesStore.porId("vendedor")?.nombre).toBe("Operador");
    expect(rolesStore.porId("preparacion")?.nombre).toBe("Preparación");
    expect(rolesStore.porId("personalizado")?.capacidades).toEqual([]);
  });

  it("un rol desconocido no da capacidades (fail-closed)", async () => {
    const { rolesStore } = await freshRolesStore();

    expect(rolesStore.capacidadesDe("no-existe")).toEqual([]);
    expect(rolesStore.capacidadesDe(null)).toEqual([]);
    expect(rolesStore.capacidadesDe(undefined)).toEqual([]);
  });
});

describe("capacidades efectivas", () => {
  it("suma los extras del portador", async () => {
    const { rolesStore } = await freshRolesStore();

    const caps = rolesStore.capacidadesEfectivas({
      rolId: "vendedor",
      capacidadesExtra: ["channels.manage"],
    });

    expect(caps).toContain("orders.create");
    expect(caps).toContain("channels.manage");
  });

  it("la denegación gana sobre el rol", async () => {
    const { rolesStore } = await freshRolesStore();

    const caps = rolesStore.capacidadesEfectivas({
      rolId: "vendedor",
      capacidadesRemovidas: ["orders.cancel"],
    });

    expect(caps).toContain("orders.confirm");
    expect(caps).not.toContain("orders.cancel");
  });

  it("la denegación gana sobre un extra del mismo valor", async () => {
    const { rolesStore } = await freshRolesStore();

    const caps = rolesStore.capacidadesEfectivas({
      rolId: "personalizado",
      capacidadesExtra: ["orders.read", "team.manage"],
      capacidadesRemovidas: ["orders.read"],
    });

    expect(caps).toEqual(["team.manage"]);
  });

  it("C7: nunca devuelve una capacidad fuera de rol + extras", async () => {
    const { rolesStore } = await freshRolesStore();

    const caps = rolesStore.capacidadesEfectivas({ rolId: "preparacion" });
    expect(caps).toEqual(["orders.read", "preparation.read", "preparation.manage", "scheduled.read"]);
  });

  it("sin rol asignado devuelve vacío aunque haya extras removidas", async () => {
    const { rolesStore } = await freshRolesStore();

    expect(rolesStore.capacidadesEfectivas({ capacidadesRemovidas: ["orders.read"] })).toEqual([]);
  });
});

describe("mutaciones del catálogo", () => {
  it("crea, actualiza y duplica roles personalizados", async () => {
    const { rolesStore } = await freshRolesStore();

    const creado = rolesStore.crear({ nombre: "Cajero", capacidades: ["orders.read"] });
    expect(creado.sistema).toBe(false);
    expect(rolesStore.porId(creado.id)?.nombre).toBe("Cajero");

    rolesStore.actualizar(creado.id, { nombre: "Cajero nocturno", capacidades: ["orders.read", "orders.create"] });
    expect(rolesStore.porId(creado.id)?.nombre).toBe("Cajero nocturno");
    expect(rolesStore.capacidadesDe(creado.id)).toEqual(["orders.read", "orders.create"]);

    const copia = rolesStore.duplicar(creado.id, "Cajero (turno tarde)");
    expect(copia?.nombre).toBe("Cajero (turno tarde)");
    expect(rolesStore.capacidadesDe(copia!.id)).toEqual(["orders.read", "orders.create"]);
  });

  it("no elimina roles de sistema", async () => {
    const { rolesStore, ROL_ADMIN } = await freshRolesStore();

    rolesStore.eliminar(ROL_ADMIN);
    expect(rolesStore.porId(ROL_ADMIN)).toBeTruthy();

    rolesStore.eliminar("vendedor");
    expect(rolesStore.porId("vendedor")).toBeTruthy();
  });

  it("elimina roles personalizados", async () => {
    const { rolesStore } = await freshRolesStore();

    const creado = rolesStore.crear({ nombre: "Temporal" });
    rolesStore.eliminar(creado.id);

    expect(rolesStore.porId(creado.id)).toBeUndefined();
  });

  it("el catálogo por defecto no se contamina entre instancias", async () => {
    const { rolesStore, ROLES_SEED } = await freshRolesStore();

    rolesStore.crear({ nombre: "Ruido" });
    expect(rolesStore.roles).toHaveLength(ROLES_SEED.length + 1);
    // El SEED original no debe haberse mutado. 6 = administrador, supervisor de
    // operaciones, operador, preparación, analista de inventarios, personalizado.
    expect(ROLES_SEED).toHaveLength(6);
  });
});

describe("capacidades de Inventarios", () => {
  it("las cinco existen, tienen etiqueta y viven en su propio grupo", async () => {
    const { CAPACIDADES, CAPACIDAD_LABEL, CAPACIDAD_GRUPOS } = await freshRolesStore();

    const inventario = [
      "inventory.read",
      "inventory.count",
      "inventory.manage",
      "inventory.finalize",
      "inventory.configure",
    ] as const;

    for (const cap of inventario) {
      expect(CAPACIDADES).toContain(cap);
      expect(CAPACIDAD_LABEL[cap]).toBeTruthy();
    }

    const grupo = CAPACIDAD_GRUPOS.find((g) => g.id === "inventarios");
    expect(grupo).toBeDefined();
    expect(new Set(grupo?.capacidades)).toEqual(new Set(inventario));
  });

  it("«quien cuenta no firma»: el rol Operador tiene count y NO finalize", async () => {
    // Es la separación de responsabilidades del módulo, y se comprueba sobre el
    // rol de sistema en vez de sobre una descripción: si alguien añade
    // `inventory.finalize` al rol Operador, la firma deja de verificar nada y
    // este test lo dice.
    const { ROLES_SEED } = await freshRolesStore();

    const operador = ROLES_SEED.find((r) => r.id === "vendedor");
    expect(operador?.capacidades).toContain("inventory.count");
    expect(operador?.capacidades).not.toContain("inventory.finalize");
  });

  it("el Analista de inventarios solo puede leer: ni un permiso de mutación", async () => {
    const { ROLES_SEED } = await freshRolesStore();

    const analista = ROLES_SEED.find((r) => r.id === "analista_inventarios");
    expect(analista).toBeDefined();
    expect(analista?.capacidades).toEqual(["inventory.read", "settings.read"]);

    for (const cap of [
      "inventory.count",
      "inventory.manage",
      "inventory.finalize",
      "inventory.configure",
    ]) {
      expect(analista?.capacidades, `el analista no debería tener ${cap}`).not.toContain(cap);
    }
  });
});
