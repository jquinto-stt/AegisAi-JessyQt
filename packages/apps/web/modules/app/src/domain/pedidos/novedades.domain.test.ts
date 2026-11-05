import { describe, expect, it } from "vitest";

import {
  MAX_OBSERVACION,
  MIN_OBSERVACION,
  diasEnNovedad,
  etiquetaSolucion,
  fechaCorta,
  filtrarNovedades,
  hoyISO,
  interpretarNovedad,
  puedeGestionar,
  validarSolucion,
  type DatosSolucion,
  type Novedad,
} from "./novedades.domain";

/**
 * Contrato de la gestión de novedades.
 *
 * La parte que se prueba aquí es la que decide si una solución se puede enviar a
 * la transportadora. Es la que, mal, manda un mensajero a una dirección que no
 * existe o a una fecha que ya pasó.
 */

const HOY = new Date("2026-10-28T10:00:00");

const base: DatosSolucion = {
  solucion: "manana",
  observaciones: "El cliente está en la oficina hasta las 6 p.m.",
  recibeNombre: "Camila",
};

const conFecha = (fecha: string): DatosSolucion => ({
  solucion: "fecha",
  observaciones: "El cliente está ese día desde las 8 a.m.",
  fechaReintento: fecha,
  recibeNombre: "Camila",
});

describe("validarSolucion", () => {
  it("exige elegir una solución", () => {
    const errores = validarSolucion({ ...base, solucion: "" }, HOY);
    expect(errores).toHaveLength(1);
    expect(errores[0]).toContain("Elige");
  });

  it("una solución sin campo extra y con observación larga es válida", () => {
    expect(validarSolucion(base, HOY)).toEqual([]);
  });

  it("una observación corta no vale: es lo único que lee el mensajero", () => {
    const errores = validarSolucion({ ...base, observaciones: "ok" }, HOY);
    expect(errores.some((e) => e.includes(String(MIN_OBSERVACION)))).toBe(true);
  });

  it("una observación de espacios no cuenta como observación", () => {
    const errores = validarSolucion({ ...base, observaciones: "              " }, HOY);
    expect(errores.length).toBeGreaterThan(0);
  });

  it("«fecha asignada» sin fecha no pasa", () => {
    const errores = validarSolucion({ ...conFecha(""), fechaReintento: "" }, HOY);
    expect(errores.some((e) => e.includes("fecha"))).toBe(true);
  });

  it("«fecha asignada» con una fecha de ayer no pasa", () => {
    const errores = validarSolucion(conFecha("2026-10-27"), HOY);
    expect(errores.some((e) => e.includes("pasado"))).toBe(true);
  });

  it("«fecha asignada» con hoy sí pasa", () => {
    expect(validarSolucion(conFecha(hoyISO(HOY)), HOY)).toEqual([]);
  });

  it("«nueva dirección» exige la dirección", () => {
    const errores = validarSolucion(
      { ...base, solucion: "nueva_direccion", direccionNueva: "  " },
      HOY,
    );
    expect(errores.some((e) => e.includes("dirección nueva"))).toBe(true);
  });

  it("«cambiar ciudad» exige ciudad y dirección", () => {
    const errores = validarSolucion({ ...base, solucion: "cambiar_ciudad", ciudadNueva: "" }, HOY);
    expect(errores.some((e) => e.includes("ciudad"))).toBe(true);
  });

  it("sin nombre de quién recibe no se puede solucionar", () => {
    const errores = validarSolucion({ ...base, recibeNombre: "  " }, HOY);
    expect(errores.some((e) => e.includes("nombre de quién"))).toBe(true);
  });

  it("un teléfono a medias no pasa, pero vacío sí", () => {
    expect(validarSolucion({ ...base, recibeTelefono: "123" }, HOY).length).toBeGreaterThan(0);
    expect(validarSolucion({ ...base, recibeTelefono: "" }, HOY)).toEqual([]);
  });

  it("el teléfono se valida por dígitos, no por longitud del texto", () => {
    expect(validarSolucion({ ...base, recibeTelefono: "+57 300 111 2233" }, HOY)).toEqual([]);
  });

  it("la observación no puede pasar del tope de la guía", () => {
    const larga = "x".repeat(MAX_OBSERVACION + 1);
    const errores = validarSolucion({ ...base, observaciones: larga }, HOY);
    expect(errores.some((e) => e.includes(String(MAX_OBSERVACION)))).toBe(true);
  });

  it("las soluciones sin campo extra no piden nada más", () => {
    for (const solucion of ["manana", "misma_direccion"] as const) {
      expect(validarSolucion({ ...base, solucion }, HOY)).toEqual([]);
    }
  });
});

const novedad = (parcial: Partial<Novedad>): Novedad => ({
  id: "n",
  guia: "50000112926",
  transportadora: "Envía",
  ordenNumero: "P-010",
  cliente: "Alejandro Vélez",
  telefono: "+57 302 333 4455",
  direccion: "Calle 45 #12-30",
  ciudad: "Bogotá",
  causal: "Destinatario no contesta",
  estado: "pendiente",
  creadaEn: "2026-10-28T09:00:00",
  ...parcial,
});

describe("interpretarNovedad", () => {
  it("devuelve tres frases, en el orden qué pasó / quién / a dónde", () => {
    const lineas = interpretarNovedad(novedad({}), new Date("2026-10-28T13:00:00"));
    expect(lineas).toHaveLength(3);
    expect(lineas[0]).toContain("no se pudo entregar");
    expect(lineas[1]).toContain("Envía");
    expect(lineas[2]).toContain("P-010");
  });

  it("no inventa códigos que el registro no tiene", () => {
    const lineas = interpretarNovedad(novedad({}), new Date("2026-10-28T13:00:00"));
    expect(lineas.join(" ")).not.toMatch(/código/i);
  });
});

describe("filtrarNovedades", () => {
  const lista = [
    novedad({ id: "a", ordenNumero: "P-010", estado: "pendiente" }),
    novedad({ id: "b", ordenNumero: "P-009", estado: "solucionada", guia: "50000999999" }),
    novedad({ id: "c", cliente: "Dirección Rara", estado: "pendiente" }),
  ];

  it("sin filtros devuelve todo", () => {
    expect(filtrarNovedades(lista, { estados: [], busqueda: "" })).toHaveLength(3);
  });

  it("filtra por estado", () => {
    const r = filtrarNovedades(lista, { estados: ["pendiente"], busqueda: "" });
    expect(r.map((n) => n.id)).toEqual(["a", "c"]);
  });

  it("filtra por número de orden", () => {
    const r = filtrarNovedades(lista, { estados: [], busqueda: "P-009" });
    expect(r.map((n) => n.id)).toEqual(["b"]);
  });

  it("filtra por guía", () => {
    const r = filtrarNovedades(lista, { estados: [], busqueda: "50000999999" });
    expect(r.map((n) => n.id)).toEqual(["b"]);
  });

  it("busca sin acentos y sin distinguir mayúsculas", () => {
    const r = filtrarNovedades(lista, { estados: [], busqueda: "direccion" });
    expect(r.map((n) => n.id)).toEqual(["c"]);
  });

  it("un texto que no coincide devuelve lista vacía, no todo", () => {
    expect(filtrarNovedades(lista, { estados: [], busqueda: "ZZZ" })).toEqual([]);
  });
});

describe("puedeGestionar", () => {
  it("solo las que esperan decisión del negocio", () => {
    expect(puedeGestionar(novedad({ estado: "pendiente" }))).toBe(true);
    expect(puedeGestionar(novedad({ estado: "por_gestionar" }))).toBe(true);
    expect(puedeGestionar(novedad({ estado: "rechazada" }))).toBe(true);
    expect(puedeGestionar(novedad({ estado: "en_espera" }))).toBe(false);
    expect(puedeGestionar(novedad({ estado: "solucionada" }))).toBe(false);
  });
});

describe("diasEnNovedad", () => {
  it("cuenta días y horas", () => {
    expect(diasEnNovedad("2026-10-27T07:00:00", new Date("2026-10-28T10:00:00"))).toBe("1 d · 3 h");
  });

  it("menos de un día se dice en horas", () => {
    expect(diasEnNovedad("2026-10-28T04:30:00", new Date("2026-10-28T10:00:00"))).toBe("0 d · 5 h");
  });

  it("una fecha futura no cuenta en negativo", () => {
    expect(diasEnNovedad("2026-10-30T10:00:00", new Date("2026-10-28T10:00:00"))).toBe("0 d · 0 h");
  });
});

describe("formato", () => {
  it("fecha corta en es-CO", () => {
    expect(fechaCorta("2026-10-28T14:07:00")).toBe("28 oct 2026");
  });

  it("una solución sin etiqueta dice «—», no una cadena vacía", () => {
    expect(etiquetaSolucion(undefined)).toBe("—");
  });

  it("cada solución del catálogo tiene etiqueta", () => {
    expect(etiquetaSolucion("nueva_direccion")).toContain("nueva dirección");
  });
});
