import { describe, expect, it, vi } from "vitest";
import type { Capacidad, PortadorDeRol } from "@/stores/roles.store";

/**
 * Tests de las excepciones por persona sobre su rol (Fase 3).
 *
 * Esta es la lógica con más riesgo de la pantalla Equipo: decide qué capacidades
 * tiene realmente una persona cuando su rol y sus ajustes a mano discrepan.
 *
 * Referencias:
 *   src/pages/pedidos/equipo/excepciones.ts
 *   outputs/contrato-arquitectura-acceso-necto.md §2
 *
 * Invariantes relevantes:
 *   La denegación gana siempre (`removidas` sobre `extras` y sobre el rol).
 *   Una excepción solo existe si cambia algo (conjunto mínimo).
 */

/** Portador de rol de conveniencia. */
const portador = (p: Partial<PortadorDeRol> = {}): PortadorDeRol => ({
  rolId: "r",
  capacidadesExtra: [],
  capacidadesRemovidas: [],
  ...p,
});

// Roles de juguete, para no depender del catálogo real.
const ROL_COMPLETO: Capacidad[] = ["orders.read", "orders.confirm", "orders.cancel", "preparation.manage"];
const ROL_SOLO_LECTURA: Capacidad[] = ["orders.read"];

// ═══════════════════════════════════════════════════════════════════════════
// PROCEDENCIA
// ═══════════════════════════════════════════════════════════════════════════

describe("procedenciaDe", () => {
  it("sin excepciones, lo que da el rol se marca como heredado", async () => {
    const { procedenciaDe } = await import("./excepciones");
    const p = portador();

    expect(procedenciaDe(p, "orders.confirm", ROL_COMPLETO)).toBe("rol");
    expect(procedenciaDe(p, "preparation.manage", ROL_COMPLETO)).toBe("rol");
  });

  it("lo que no da el rol y no es excepción, no se tiene", async () => {
    const { procedenciaDe } = await import("./excepciones");
    const p = portador();

    expect(procedenciaDe(p, "team.manage", ROL_SOLO_LECTURA)).toBe("ninguna");
  });

  it("una capacidad concedida a mano se distingue del rol", async () => {
    const { procedenciaDe } = await import("./excepciones");
    const p = portador({ capacidadesExtra: ["orders.confirm"] });

    // El rol de solo lectura no la da → es una concesión explícita.
    expect(procedenciaDe(p, "orders.confirm", ROL_SOLO_LECTURA)).toBe("concedida");
  });

  it("una capacidad revocada a mano se distingue del rol", async () => {
    const { procedenciaDe } = await import("./excepciones");
    const p = portador({ capacidadesRemovidas: ["orders.cancel"] });

    expect(procedenciaDe(p, "orders.cancel", ROL_COMPLETO)).toBe("removida");
  });

  it("un extra redundante (el rol ya la da) se reporta como heredado", async () => {
    const { procedenciaDe } = await import("./excepciones");
    // Caso degenerado: alguien añadió a mano algo que el rol ya concedía.
    const p = portador({ capacidadesExtra: ["orders.read"] });

    // No se reporta como "concedida a mano" porque la concesión no aporta nada:
    // el rol ya la daba.
    expect(procedenciaDe(p, "orders.read", ROL_COMPLETO)).toBe("rol");
  });

  it("la denegación gana sobre una concesión del mismo valor", async () => {
    const { procedenciaDe } = await import("./excepciones");
    // Estado contradictorio: en ambas listas. No es alcanzable por la UI, pero
    // el modelo debe resolverlo de forma determinista: gana la denegación.
    const p = portador({ capacidadesExtra: ["orders.confirm"], capacidadesRemovidas: ["orders.confirm"] });

    expect(procedenciaDe(p, "orders.confirm", ROL_COMPLETO)).toBe("removida");
  });
});

describe("esEfectiva", () => {
  it("concuerda con la procedencia", async () => {
    const { esEfectiva } = await import("./excepciones");

    expect(esEfectiva(portador(), "orders.confirm", ROL_COMPLETO)).toBe(true);
    expect(esEfectiva(portador({ capacidadesRemovidas: ["orders.confirm"] }), "orders.confirm", ROL_COMPLETO)).toBe(false);
    expect(esEfectiva(portador({ capacidadesExtra: ["orders.confirm"] }), "orders.confirm", ROL_SOLO_LECTURA)).toBe(true);
    expect(esEfectiva(portador(), "orders.confirm", ROL_SOLO_LECTURA)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TOGGLE
// ═══════════════════════════════════════════════════════════════════════════

describe("aplicarToggle", () => {
  it("apagar una capacidad del rol la agrega a revocadas", async () => {
    const { aplicarToggle } = await import("./excepciones");
    const r = aplicarToggle(portador(), "orders.cancel", ROL_COMPLETO, false);

    expect(r.capacidadesRemovidas).toEqual(["orders.cancel"]);
    expect(r.capacidadesExtra).toEqual([]);
  });

  it("encender una capacidad que el rol no da la agrega a extras", async () => {
    const { aplicarToggle } = await import("./excepciones");
    const r = aplicarToggle(portador(), "orders.confirm", ROL_SOLO_LECTURA, true);

    expect(r.capacidadesExtra).toEqual(["orders.confirm"]);
    expect(r.capacidadesRemovidas).toEqual([]);
  });

  it("encender una capacidad revocada del rol levanta la revocación, sin crear un extra", async () => {
    const { aplicarToggle } = await import("./excepciones");
    const p = portador({ capacidadesRemovidas: ["orders.cancel"] });
    const r = aplicarToggle(p, "orders.cancel", ROL_COMPLETO, true);

    // El rol ya la da: un extra sería redundante.
    expect(r.capacidadesRemovidas).toEqual([]);
    expect(r.capacidadesExtra).toEqual([]);
  });

  it("apagar una capacidad concedida a mano la quita de extras, sin crear una revocación", async () => {
    const { aplicarToggle } = await import("./excepciones");
    const p = portador({ capacidadesExtra: ["orders.confirm"] });
    const r = aplicarToggle(p, "orders.confirm", ROL_SOLO_LECTURA, false);

    // El rol no la da: revocar no aportaría nada.
    expect(r.capacidadesExtra).toEqual([]);
    expect(r.capacidadesRemovidas).toEqual([]);
  });

  it("es idempotente: aplicar dos veces el mismo cambio da el mismo resultado", async () => {
    const { aplicarToggle } = await import("./excepciones");

    const una = aplicarToggle(portador(), "orders.cancel", ROL_COMPLETO, false);
    const dos = aplicarToggle(portador(una), "orders.cancel", ROL_COMPLETO, false);

    expect(dos).toEqual(una);
  });

  it("nunca deja la misma capacidad en extras y en revocadas", async () => {
    const { aplicarToggle } = await import("./excepciones");

    // Apagar y volver a encender, sobre el mismo portador.
    const apagada = aplicarToggle(portador(), "orders.cancel", ROL_COMPLETO, false);
    const encendida = aplicarToggle(portador(apagada), "orders.cancel", ROL_COMPLETO, true);

    expect(encendida.capacidadesRemovidas).not.toContain("orders.cancel");
    expect(encendida.capacidadesExtra).not.toContain("orders.cancel");
  });

  it("un ciclo apagar/encender sobre una capacidad que el rol no da vuelve al estado inicial", async () => {
    const { aplicarToggle } = await import("./excepciones");

    const encendida = aplicarToggle(portador(), "team.manage", ROL_COMPLETO, true);
    expect(encendida.capacidadesExtra).toEqual(["team.manage"]);

    const apagada = aplicarToggle(portador(encendida), "team.manage", ROL_COMPLETO, false);
    expect(apagada.capacidadesExtra).toEqual([]);
    expect(apagada.capacidadesRemovidas).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// NORMALIZACIÓN AL CAMBIAR DE ROL
// ═══════════════════════════════════════════════════════════════════════════

describe("normalizar", () => {
  it("suelta la revocación que el rol nuevo ya no concede (excepción zombi)", async () => {
    const { normalizar } = await import("./excepciones");
    // Revocó `orders.cancel` cuando tenía un rol que se lo daba; ahora pasa a un
    // rol que no lo da: la revocación ya no aporta nada.
    const p = portador({ capacidadesRemovidas: ["orders.cancel"] });

    const r = normalizar(p, ROL_SOLO_LECTURA);
    expect(r.capacidadesRemovidas).toEqual([]);
  });

  it("suelta la concesión que el rol nuevo ya concede", async () => {
    const { normalizar } = await import("./excepciones");
    const p = portador({ capacidadesExtra: ["orders.confirm"] });

    const r = normalizar(p, ROL_COMPLETO);
    expect(r.capacidadesExtra).toEqual([]);
  });

  it("conserva la revocación que el rol nuevo sí concede", async () => {
    const { normalizar } = await import("./excepciones");
    const p = portador({ capacidadesRemovidas: ["orders.cancel"] });

    const r = normalizar(p, ROL_COMPLETO);
    expect(r.capacidadesRemovidas).toEqual(["orders.cancel"]);
  });

  it("conserva la concesión que el rol nuevo no concede", async () => {
    const { normalizar } = await import("./excepciones");
    const p = portador({ capacidadesExtra: ["team.manage"] });

    const r = normalizar(p, ROL_COMPLETO);
    expect(r.capacidadesExtra).toEqual(["team.manage"]);
  });

  it("preserva la denegación en un estado contradictorio", async () => {
    const { normalizar, esEfectiva } = await import("./excepciones");
    const p = portador({ capacidadesExtra: ["orders.confirm"], capacidadesRemovidas: ["orders.confirm"] });

    const r = normalizar(p, ROL_COMPLETO);
    // Sigue sin tenerla: la denegación gana.
    expect(esEfectiva(portador(r), "orders.confirm", ROL_COMPLETO)).toBe(false);
  });

  it("normalizar un portador sin excepciones es un no-op", async () => {
    const { normalizar } = await import("./excepciones");
    const r = normalizar(portador(), ROL_COMPLETO);

    expect(r.capacidadesExtra).toEqual([]);
    expect(r.capacidadesRemovidas).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CONSISTENCIA CON EL STORE — el test de mayor valor
// ═══════════════════════════════════════════════════════════════════════════
//
// La UI decide el estado del interruptor con `esEfectiva`/`procedenciaDe`, pero
// quien concede el acceso de verdad es `rolesStore.capacidadesEfectivas`. Si
// ambas discrepan, la pantalla mostraría un interruptor encendido para una
// capacidad que el usuario no tiene (o al revés). Ese es exactamente el bug que
// estos tests previenen.

describe("consistencia con rolesStore.capacidadesEfectivas", () => {
  /** Todas las capacidades del catálogo real. */
  async function catalogo(): Promise<Capacidad[]> {
    const roles = await import("@/stores/roles.store");
    return roles.CAPACIDADES;
  }

  it("esEfectiva coincide con el store para todos los casos de excepción", async () => {
    vi.resetModules();
    const roles = await import("@/stores/roles.store");
    const { esEfectiva } = await import("./excepciones");
    const todas = await catalogo();

    // El rol real de Preparación, con distintas combinaciones de excepciones.
    const base = roles.rolesStore.capacidadesDe("preparacion");
    const combinaciones: PortadorDeRol[] = [
      { rolId: "preparacion" },
      { rolId: "preparacion", capacidadesExtra: ["orders.confirm"] },
      { rolId: "preparacion", capacidadesRemovidas: ["preparation.manage"] },
      { rolId: "preparacion", capacidadesExtra: ["team.manage"], capacidadesRemovidas: ["orders.read"] },
    ];

    for (const p of combinaciones) {
      const efectivasDelStore = new Set(roles.rolesStore.capacidadesEfectivas(p));
      for (const cap of todas) {
        expect(
          esEfectiva(p, cap, base),
          `discrepancia en "${cap}" con ${JSON.stringify(p)}`,
        ).toBe(efectivasDelStore.has(cap));
      }
    }
  });

  it("tras aplicarToggle, esEfectiva refleja el cambio pedido", async () => {
    vi.resetModules();
    const roles = await import("@/stores/roles.store");
    const { aplicarToggle, esEfectiva } = await import("./excepciones");

    const base = roles.rolesStore.capacidadesDe("vendedor"); // tiene orders.confirm, no preparation.manage
    const original: PortadorDeRol = { rolId: "vendedor" };

    // Apagar algo que el rol da.
    const sinConfirmar = portador(aplicarToggle(original, "orders.confirm", base, false));
    expect(esEfectiva(sinConfirmar, "orders.confirm", base)).toBe(false);
    // Y no haber tocado otra cosa.
    expect(esEfectiva(sinConfirmar, "orders.read", base)).toBe(true);

    // Encender algo que el rol no da.
    const conPreparacion = portador(aplicarToggle(original, "preparation.manage", base, true));
    expect(esEfectiva(conPreparacion, "preparation.manage", base)).toBe(true);
  });
});
