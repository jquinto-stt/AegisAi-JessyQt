import { describe, expect, it } from "vitest";
import { CAPACIDADES, CAPACIDAD_GRUPOS, type Capacidad } from "@/stores/roles.store";
import {
  PERFILES_TAREA,
  ajustesDe,
  areasCompletas,
  etiquetaLlana,
  fraseDeAcceso,
  labelDeArea,
  nivelDeArea,
  perfilQueEncaja,
  resumenDeAreas,
  unirConY,
} from "./equipo.presentacion";

/**
 * Tests de la capa de presentación del acceso (equipo).
 *
 * Este módulo no autoriza nada: solo traduce el modelo a frases. Por eso los
 * tests comprueban dos cosas distintas:
 *
 *   1. Que la traducción es fiel — un área `parcial` no puede aparecer como
 *      `si`, y `faltantes` tiene que ser exactamente lo que falta.
 *   2. Que la traducción es **completa** — ninguna capacidad puede quedarse
 *      fuera de las 8 áreas, porque una capacidad invisible es un permiso que
 *      el admin no puede revisar.
 *
 * Referencias:
 *   src/pages/equipo/equipo.presentacion.ts
 *   src/pages/equipo/excepciones.ts
 */

// Roles de juguete, para no depender del seed.
const ROL_ORDENES_COMPLETO: Capacidad[] = [
  "orders.read",
  "orders.create",
  "orders.confirm",
  "orders.cancel",
  "orders.edit",
  "orders.delete",
];
const ROL_SOLO_LECTURA: Capacidad[] = ["orders.read"];

describe("nivel de área", () => {
  it("sin ninguna capacidad del área es «no»", () => {
    expect(nivelDeArea([], ROL_ORDENES_COMPLETO)).toBe("no");
    expect(nivelDeArea(["channels.read"], ROL_ORDENES_COMPLETO)).toBe("no");
  });

  it("con todas las capacidades del área es «si»", () => {
    expect(nivelDeArea(ROL_ORDENES_COMPLETO, ROL_ORDENES_COMPLETO)).toBe("si");
  });

  it("con algunas es «parcial»", () => {
    expect(nivelDeArea(ROL_SOLO_LECTURA, ROL_ORDENES_COMPLETO)).toBe("parcial");
  });

  it("ignora capacidades de otras áreas", () => {
    expect(nivelDeArea(["channels.manage", "team.manage"], ROL_ORDENES_COMPLETO)).toBe("no");
  });
});

describe("unirConY", () => {
  it("una lista vacía da cadena vacía", () => {
    expect(unirConY([])).toBe("");
  });

  it("un solo elemento va sin conjunción", () => {
    expect(unirConY(["Pedidos"])).toBe("Pedidos");
  });

  it("dos elementos van unidos con «y»", () => {
    expect(unirConY(["Pedidos", "Equipo"])).toBe("Pedidos y Equipo");
  });

  it("tres o más usan comas y una «y» final", () => {
    expect(unirConY(["Pedidos", "Equipo", "Configuración"])).toBe(
      "Pedidos, Equipo y Configuración",
    );
  });
});

describe("etiqueta llana", () => {
  it("pasa la etiqueta del catálogo a minúscula", () => {
    expect(etiquetaLlana("orders.confirm")).toBe("confirmar órdenes");
  });

  it("no rompe con acentos ni con la primera letra", () => {
    expect(etiquetaLlana("assistant.use")).toBe("usar asistente ia");
  });
});

describe("resumen por áreas", () => {
  it("devuelve siempre las 8 áreas, incluso sin ninguna capacidad", () => {
    const resumen = resumenDeAreas([]);
    expect(resumen).toHaveLength(8);
    expect(resumen.every((a) => a.nivel === "no")).toBe(true);
    expect(areasCompletas(resumen)).toBe(0);
  });

  it("con el catálogo completo todas las áreas están cubiertas", () => {
    const resumen = resumenDeAreas([...CAPACIDADES]);
    expect(resumen.every((a) => a.nivel === "si")).toBe(true);
    expect(areasCompletas(resumen)).toBe(8);
    expect(resumen.every((a) => a.faltantes.length === 0)).toBe(true);
  });

  it("reparte las 22 capacidades entre las áreas sin perder ni duplicar ninguna", () => {
    const resumen = resumenDeAreas([]);
    const vistas = resumen.flatMap((a) => a.concedidas.concat(a.faltantes));
    // `concedidas` y `faltantes` están en lenguaje llano, así que se compara por
    // el total: cada área declara tantas entradas como capacidades tiene.
    const total = resumen.reduce((n, a) => n + a.total, 0);
    expect(total).toBe(CAPACIDADES.length);
    expect(vistas).toHaveLength(CAPACIDADES.length);
  });

  it("no repite el id de área entre las 7 filas", () => {
    const ids = resumenDeAreas([]).map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cada área del resumen tiene un nombre en lenguaje de negocio", () => {
    for (const area of resumenDeAreas([])) {
      // `labelDeArea` cae al label del catálogo si falta el copy, así que un
      // nombre vacío delataría un área sin traducir.
      expect(labelDeArea(area.id)).not.toBe("");
      expect(area.label).not.toBe("");
      expect(area.resumen).not.toBe("");
    }
  });

  it("en un área parcial, `faltantes` es exactamente lo que falta", () => {
    // Órdenes con solo lectura: faltan las otras cinco.
    const area = resumenDeAreas(ROL_SOLO_LECTURA).find((a) => a.id === "ordenes")!;
    expect(area.nivel).toBe("parcial");
    expect(area.activas).toBe(1);
    expect(area.total).toBe(6);
    expect(area.concedidas).toEqual(["ver órdenes"]);
    expect(area.faltantes).toEqual([
      "crear órdenes",
      "confirmar órdenes",
      "cancelar órdenes",
      "editar órdenes",
      "eliminar órdenes",
    ]);
  });

  it("en un área completa, `faltantes` está vacío", () => {
    const area = resumenDeAreas(ROL_ORDENES_COMPLETO).find((a) => a.id === "ordenes")!;
    expect(area.nivel).toBe("si");
    expect(area.faltantes).toEqual([]);
    expect(area.concedidas).toHaveLength(6);
  });

  it("los totales por área coinciden con CAPACIDAD_GRUPOS", () => {
    const resumen = resumenDeAreas([]);
    for (const grupo of CAPACIDAD_GRUPOS) {
      const area = resumen.find((a) => a.id === grupo.id);
      expect(area?.total).toBe(grupo.capacidades.length);
    }
  });
});

describe("frase de acceso", () => {
  it("con todo concedido lo dice sin matices", () => {
    expect(fraseDeAcceso(resumenDeAreas([...CAPACIDADES]))).toBe(
      "Puede hacer todo lo que cubre el módulo de pedidos.",
    );
  });

  it("sin nada concedido lo dice sin matices", () => {
    expect(fraseDeAcceso(resumenDeAreas([]))).toBe("Todavía no tiene acceso a nada.");
  });

  it("con huecos nombra las áreas incompletas", () => {
    const frase = fraseDeAcceso(resumenDeAreas(ROL_SOLO_LECTURA));
    expect(frase).toContain("Cubre 0 de 8 áreas");
    expect(frase).toContain("Le faltan cosas en Pedidos");
    expect(frase).toContain("No tiene acceso a");
  });

  it("separa las ideas con punto, no con comas encadenadas", () => {
    const frase = fraseDeAcceso(resumenDeAreas(ROL_SOLO_LECTURA));
    // "Cubre 0 de 7 áreas. Le faltan cosas en Pedidos. No tiene acceso a …"
    expect(frase.split(". ").length).toBeGreaterThanOrEqual(3);
  });

  it("termina siempre en punto", () => {
    for (const caps of [[], ROL_SOLO_LECTURA, [...CAPACIDADES]]) {
      expect(fraseDeAcceso(resumenDeAreas(caps)).endsWith(".")).toBe(true);
    }
  });
});

describe("ajustes a mano", () => {
  it("sin excepciones no hay nada que mostrar", () => {
    expect(ajustesDe({ rolId: "r" })).toEqual([]);
  });

  it("las concesiones se marcan como «mas» y las revocaciones como «menos»", () => {
    const ajustes = ajustesDe({
      rolId: "r",
      capacidadesExtra: ["assistant.use"],
      capacidadesRemovidas: ["orders.cancel"],
    });
    expect(ajustes).toHaveLength(2);
    expect(ajustes.find((a) => a.capacidad === "assistant.use")).toMatchObject({
      tipo: "mas",
      label: "Usar asistente IA",
    });
    expect(ajustes.find((a) => a.capacidad === "orders.cancel")).toMatchObject({
      tipo: "menos",
      label: "Cancelar órdenes",
    });
  });
});

describe("perfiles de tarea", () => {
  it("ningún perfil inventa una capacidad fuera del catálogo", () => {
    const conocidas = new Set<string>(CAPACIDADES);
    for (const perfil of PERFILES_TAREA) {
      for (const cap of perfil.capacidades) {
        expect(conocidas.has(cap)).toBe(true);
      }
    }
  });

  it("ningún perfil repite una capacidad", () => {
    for (const perfil of PERFILES_TAREA) {
      expect(new Set(perfil.capacidades).size).toBe(perfil.capacidades.length);
    }
  });

  it("cada perfil tiene id único, nombre y descripción", () => {
    const ids = PERFILES_TAREA.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const perfil of PERFILES_TAREA) {
      expect(perfil.nombre).not.toBe("");
      expect(perfil.descripcion).not.toBe("");
      expect(perfil.capacidades.length).toBeGreaterThan(0);
    }
  });

  it("reconoce un conjunto que coincide exactamente", () => {
    const perfil = perfilQueEncaja(["orders.read", "preparation.read", "preparation.manage", "scheduled.read"]);
    expect(perfil?.id).toBe("despacho");
  });

  it("el orden de las capacidades no importa", () => {
    const invertido = [...PERFILES_TAREA[1].capacidades].reverse();
    expect(perfilQueEncaja(invertido)?.id).toBe(PERFILES_TAREA[1].id);
  });

  it("devuelve null cuando no coincide con ninguno", () => {
    expect(perfilQueEncaja(["orders.read"])).toBeNull();
    expect(perfilQueEncaja([])).toBeNull();
  });
});
