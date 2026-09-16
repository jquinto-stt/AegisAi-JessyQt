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

    expect(CAPACIDADES).toHaveLength(17);
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
  it("incluye el rol de administrador con las 16 capacidades", async () => {
    const { rolesStore, CAPACIDADES, ROL_ADMIN } = await freshRolesStore();

    const admin = rolesStore.porId(ROL_ADMIN);
    expect(admin?.nombre).toBe("Administrador de tienda");
    expect(admin?.sistema).toBe(true);
    expect(admin?.capacidades).toHaveLength(CAPACIDADES.length);
  });

  it("incluye los roles operativos del contrato", async () => {
    const { rolesStore } = await freshRolesStore();

    expect(rolesStore.porId("supervisor_pedidos")?.nombre).toBe("Supervisor de pedidos");
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
    // El SEED original no debe haberse mutado.
    expect(ROLES_SEED).toHaveLength(5);
  });
});
