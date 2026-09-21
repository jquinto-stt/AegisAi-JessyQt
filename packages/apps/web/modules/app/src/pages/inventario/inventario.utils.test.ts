import { describe, expect, it } from "vitest";

import type { Articulo, EstadoStock } from "@/stores";
import {
  cantidad,
  conExistencia,
  etiquetaFecha,
  filtrarArticulos,
  money,
  ordenarPorUrgencia,
} from "./inventario.utils";

// ═══════════════════════════════════════════════════════════════════════════
// FIXTURES MÍNIMOS
// ═══════════════════════════════════════════════════════════════════════════
//
// Se construyen aquí y no se importa el seed del store: estas funciones son puras
// y probarlas contra datos de negocio acoplaría el test a que el seed cambie de
// cifras — que es exactamente lo que `inventario.store.test.ts` fija por su lado.

const articulo = (over: Partial<Articulo> & { id: string }): Articulo => ({
  sku: `SKU-${over.id}`,
  nombre: `Artículo ${over.id}`,
  categoria: "General",
  unidad: "unidad",
  minimo: 1,
  costoUnitario: 1000,
  ...over,
});

const SALMON = articulo({ id: "a1", sku: "SKU-1003", nombre: "Salmón", categoria: "Proteínas", unidad: "kg" });
const HARINA = articulo({ id: "a2", sku: "SKU-3002", nombre: "Harina de trigo", categoria: "Insumos", unidad: "kg" });
const JUGO = articulo({ id: "a3", sku: "SKU-4001", nombre: "Jugo de naranja", categoria: "Bebidas", unidad: "l" });
const TODOS = [SALMON, HARINA, JUGO];

// ═══════════════════════════════════════════════════════════════════════════
// FORMATO
// ═══════════════════════════════════════════════════════════════════════════

describe("formato de importes y cantidades", () => {
  it("redondea y separa miles con el locale del proyecto", () => {
    // `es-CO` separa miles con punto. Se comprueba con `toLocaleString` en vez de
    // con el literal "32.000" para no afirmar algo que el locale decide: si el
    // entorno resuelve el locale a otra cosa, el test seguiría midiendo `money`.
    expect(money(32000)).toBe(`$${(32000).toLocaleString("es-CO")}`);
    expect(money(0)).toBe("$0");
  });

  it("no arrastra decimales a la tabla", () => {
    expect(money(1234.6)).toBe(`$${(1235).toLocaleString("es-CO")}`);
  });

  it("usa la abreviatura de la unidad, no la etiqueta larga del select", () => {
    expect(cantidad(12, "unidad")).toContain("und");
    expect(cantidad(5, "kg")).toContain("kg");
    expect(cantidad(3, "porcion")).toContain("porc");
    // El control que evita la regresión: la etiqueta del `<select>` no debe
    // colarse en una celda de tabla.
    expect(cantidad(5, "kg")).not.toContain("Kilogramo");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FECHAS
// ═══════════════════════════════════════════════════════════════════════════

describe("etiquetaFecha", () => {
  const ahora = new Date(2026, 8, 21, 14, 30); // 21 sep 2026, 14:30

  it("llama «Hoy» al mismo día, con hora", () => {
    expect(etiquetaFecha(new Date(2026, 8, 21, 9, 5).toISOString(), ahora)).toBe("Hoy 09:05");
  });

  it("llama «Ayer» al día anterior, y cruza bien el cambio de mes", () => {
    expect(etiquetaFecha(new Date(2026, 8, 20, 22, 0).toISOString(), ahora)).toBe("Ayer 22:00");
    // 1 de septiembre visto desde el 1 de septiembre: ayer es el 31 de agosto.
    const primero = new Date(2026, 8, 1, 12, 0);
    expect(etiquetaFecha(new Date(2026, 7, 31, 12, 0).toISOString(), primero)).toBe("Ayer 12:00");
  });

  it("a partir de anteayer usa día y mes, sin hora", () => {
    expect(etiquetaFecha(new Date(2026, 8, 12, 8, 0).toISOString(), ahora)).toBe("12 sep");
  });

  it("una fecha inválida no revienta la tabla", () => {
    expect(etiquetaFecha("no-es-una-fecha", ahora)).toBe("—");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FILTROS
// ═══════════════════════════════════════════════════════════════════════════

describe("filtrarArticulos", () => {
  it("sin filtro devuelve todo", () => {
    expect(filtrarArticulos(TODOS, {})).toHaveLength(3);
  });

  it("busca por nombre sin distinguir mayúsculas NI ACENTOS", () => {
    // Las dos formas de la misma búsqueda: quien escribe rápido teclea «salmon»
    // sin tilde, y el artículo se llama «Salmón». El plegado es el mismo que usa
    // el asistente (`normalizarTexto`), así que la tabla y el chat coinciden.
    expect(filtrarArticulos(TODOS, { texto: "salmon" }).map((a) => a.id)).toEqual(["a1"]);
    expect(filtrarArticulos(TODOS, { texto: "SALMÓN" }).map((a) => a.id)).toEqual(["a1"]);
  });

  it("busca también por SKU, que es como busca quien conoce el código", () => {
    expect(filtrarArticulos(TODOS, { texto: "3002" }).map((a) => a.id)).toEqual(["a2"]);
    expect(filtrarArticulos(TODOS, { texto: "sku-4001" }).map((a) => a.id)).toEqual(["a3"]);
  });

  it("combina texto y categoría (las dos condiciones, no una)", () => {
    expect(filtrarArticulos(TODOS, { texto: "harina", categoria: "Insumos" }).map((a) => a.id)).toEqual(["a2"]);
    // El texto casa, pero la categoría no: se exigen las DOS.
    expect(filtrarArticulos(TODOS, { texto: "harina", categoria: "Bebidas" })).toEqual([]);
  });

  it("un texto en blanco no filtra nada", () => {
    expect(filtrarArticulos(TODOS, { texto: "   " })).toHaveLength(3);
  });
});

describe("conExistencia", () => {
  it("deja fuera los ceros: agotado en una bodega no es estar en esa bodega", () => {
    const existencias: Record<string, number> = { a1: 0, a2: 4, a3: 0 };
    expect(conExistencia(TODOS, (id) => existencias[id] ?? 0).map((a) => a.id)).toEqual(["a2"]);
  });

  it("conserva el orden de entrada", () => {
    expect(conExistencia(TODOS, () => 1).map((a) => a.id)).toEqual(["a1", "a2", "a3"]);
  });
});

describe("ordenarPorUrgencia", () => {
  const estadoDe = (mapa: Record<string, EstadoStock>) => (id: string) => mapa[id] ?? "ok";

  it("pone primero los agotados y después los que están bajo mínimo", () => {
    const orden = ordenarPorUrgencia(
      TODOS,
      estadoDe({ a1: "ok", a2: "agotado", a3: "bajo_minimo" }),
    );
    expect(orden.map((a) => a.id)).toEqual(["a2", "a3", "a1"]);
  });

  it("desempata por nombre para que la lista no se reordene sola", () => {
    const zeta = articulo({ id: "z", nombre: "Zanahoria" });
    const alfa = articulo({ id: "y", nombre: "Aceite" });
    const orden = ordenarPorUrgencia([zeta, alfa], () => "agotado");
    expect(orden.map((a) => a.nombre)).toEqual(["Aceite", "Zanahoria"]);
  });

  it("no muta el array de entrada", () => {
    const original = [...TODOS];
    ordenarPorUrgencia(TODOS, estadoDe({ a2: "agotado" }));
    expect(TODOS).toEqual(original);
  });
});
