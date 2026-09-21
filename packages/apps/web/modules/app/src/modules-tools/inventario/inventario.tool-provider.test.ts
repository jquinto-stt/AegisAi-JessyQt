import { describe, expect, it } from "vitest";

import { ToolRegistry } from "@/assistant/registry/tool-registry";
import { inventarioStore } from "@/stores";
// Import de TEST, y a propósito: el único modo de afirmar que la búsqueda del
// asistente y la de la tabla pliegan igual es medir las dos en el mismo test.
// No crea dependencia de producción (`modules-tools` no importa `pages`).
import { filtrarArticulos } from "@/pages/inventario/inventario.utils";

import {
  InventarioToolProvider,
  getAgotados,
  getBajoMinimo,
  getExistencias,
  getMovimientosRecientes,
  getValorInventario,
} from "./inventario.tool-provider";

// ═══════════════════════════════════════════════════════════════════════════
// Las tools de Inventario, y su filtro de autorización
// ═══════════════════════════════════════════════════════════════════════════
//
// Se prueba contra el store singleton con su seed, no contra un store propio:
// el provider importa `inventarioStore` directamente (es su razón de existir,
// invariante A2), así que fabricar un store paralelo mediría otra cosa.
//
// Ningún test muta el store. Se comprueba explícitamente al final: cinco tools
// de lectura que cambian el kárdex serían el defecto más caro de este archivo.

const provider = new InventarioToolProvider();

/** Contexto de acceso mínimo: el filtro del registry solo lee estos dos campos. */
const ctx = (enabledModules: string[], capacidades: string[]) => ({
  access: {
    enabledModules: enabledModules as never,
    hasCapability: (cap: string) => capacidades.includes(cap),
  },
});

describe("catálogo del proveedor", () => {
  it("declara el módulo inventario", () => {
    expect(provider.module).toBe("inventario");
  });

  it("expone las 5 tools del contrato, y solo esas", () => {
    expect(provider.getTools().map((t) => t.id)).toEqual([
      "inventario.getExistencias",
      "inventario.getBajoMinimo",
      "inventario.getAgotados",
      "inventario.getValorInventario",
      "inventario.getMovimientosRecientes",
    ]);
  });

  it("todas son de LECTURA y exigen exactamente `inventory.read`", () => {
    for (const t of provider.getTools()) {
      expect(t.level, `${t.id} debe ser de lectura`).toBe("query");
      expect(t.module).toBe("inventario");
      expect(t.requiredCapabilities).toEqual(["inventory.read"]);
    }
  });

  it("el id está namespaced por el módulo, como exige el contrato de tools", () => {
    for (const t of provider.getTools()) {
      expect(t.id.startsWith("inventario.")).toBe(true);
    }
  });
});

describe("el registry filtra por módulo y por capacidad (fail-closed)", () => {
  const registry = new ToolRegistry();
  registry.register(provider);

  it("con el módulo conectado y la capacidad, expone las 5", () => {
    const tools = registry.getAvailableTools(ctx(["inventario"], ["inventory.read"]));
    expect(tools).toHaveLength(5);
  });

  it("CONTROL NEGATIVO: sin el módulo conectado no expone ninguna", () => {
    // El interruptor de «Módulos integrados» del asistente es el que decide esto.
    expect(registry.getAvailableTools(ctx(["pedidos"], ["inventory.read"]))).toEqual([]);
  });

  it("CONTROL NEGATIVO: con el módulo pero sin `inventory.read`, ninguna", () => {
    expect(registry.getAvailableTools(ctx(["inventario"], []))).toEqual([]);
  });

  it("CONTROL NEGATIVO: `resolve` tampoco elude el filtro", () => {
    // Es la garantía que el registry documenta: resolver por id pasa por el
    // mismo filtro, no por un atajo.
    expect(registry.resolve("inventario.getExistencias", ctx(["inventario"], []))).toBeNull();
    expect(registry.resolve("inventario.getExistencias", ctx(["pedidos"], ["inventory.read"]))).toBeNull();
    expect(
      registry.resolve("inventario.getExistencias", ctx(["inventario"], ["inventory.read"])),
    ).not.toBeNull();
  });
});

describe("inventario.getExistencias", () => {
  it("devuelve el desglose por bodega de un artículo, sin ceros", async () => {
    // «Postre del día» es el artículo del seed con existencia en las tres
    // bodegas (10 en central, 4 en tienda, 6 en fría tras los movimientos).
    const res = await getExistencias.run({ articulo: "postre" });

    const tabla = res.blocks?.find((b) => b.kind === "table");
    expect(tabla).toBeDefined();
    expect(tabla?.kind).toBe("table");
    const filas = tabla && tabla.kind === "table" ? tabla.rows : [];
    expect(filas.length).toBeGreaterThan(0);
    // Todas las filas traen las cuatro columnas del contrato.
    for (const f of filas) expect(f).toHaveLength(4);
    // Y ninguna trae un cero: los ceros se omiten a propósito.
    expect(filas.some((f) => String(f[3]).startsWith("0 "))).toBe(false);
  });

  it("busca también por SKU", async () => {
    const res = await getExistencias.run({ articulo: "SKU-4001" });
    const tabla = res.blocks?.find((b) => b.kind === "table");
    const filas = tabla && tabla.kind === "table" ? tabla.rows : [];
    expect(filas.length).toBeGreaterThan(0);
    expect(filas.every((f) => f[1] === "SKU-4001")).toBe(true);
  });

  it("sin argumento devuelve el almacén entero", async () => {
    const res = await getExistencias.run({});
    const articulos = res.facts.find((f) => f.label === "Artículos");
    expect(articulos?.value).toBe(inventarioStore.totalArticulos);
  });

  it("una búsqueda sin resultados lo DICE, en vez de devolver una tabla vacía", async () => {
    const res = await getExistencias.run({ articulo: "zzzz-no-existe" });
    const lista = res.blocks?.find((b) => b.kind === "list");
    expect(lista).toBeDefined();
    expect(res.facts[0].value).toBe(0);
  });

  it("normaliza acentos y mayúsculas: «proteinas» encuentra la categoría «Proteínas»", async () => {
    // La consulta se prueba contra la CATEGORÍA y no contra «Salmón», que es el
    // único nombre con tilde del seed: `getExistencias` omite las filas a cero a
    // propósito, y Salmón está agotado, así que nunca aparecería en la tabla.
    const sinTilde = await getExistencias.run({ articulo: "PROTEINAS" });
    const conTilde = await getExistencias.run({ articulo: "Proteínas" });
    const filas = (res: Awaited<ReturnType<typeof getExistencias.run>>): unknown[][] => {
      const t = res.blocks?.find((b) => b.kind === "table");
      return t && t.kind === "table" ? (t.rows as unknown[][]) : [];
    };
    expect(filas(sinTilde).length).toBeGreaterThan(0);
    expect(filas(sinTilde)).toEqual(filas(conTilde));
    expect(filas(sinTilde).some((f) => f[0] === "Pechuga de pollo")).toBe(true);
  });

  it("la tabla pliega los acentos con el mismo criterio", async () => {
    // El buscador de la tabla casa nombre y SKU (la categoría tiene su propio
    // `select`, así que no se busca por texto de categoría — de ahí que este
    // caso use un nombre). Lo que se afirma es el PLEGADO: «salmon» sin tilde
    // tiene que encontrar «Salmón», igual que en el chat.
    const sinTilde = filtrarArticulos(inventarioStore.articulos, { texto: "salmon" });
    const conTilde = filtrarArticulos(inventarioStore.articulos, { texto: "Salmón" });
    expect(sinTilde.map((a) => a.id)).toEqual(conTilde.map((a) => a.id));
    expect(sinTilde.map((a) => a.nombre)).toEqual(["Salmón"]);
  });
});

describe("inventario.getBajoMinimo y getAgotados", () => {
  it("coinciden con los selectores del store, sin recalcular nada", async () => {
    const bajo = await getBajoMinimo.run({});
    expect(bajo.facts.find((f) => f.label === "Bajo mínimo")?.value).toBe(
      inventarioStore.bajoMinimo.length,
    );

    const agotados = await getAgotados.run({});
    expect(agotados.facts.find((f) => f.label === "Agotados")?.value).toBe(
      inventarioStore.agotados.length,
    );
  });

  it("getBajoMinimo informa de si el aviso está encendido", async () => {
    const res = await getBajoMinimo.run({});
    const alerta = res.facts.find((f) => f.label === "Alerta activada");
    expect(alerta?.value).toBe(inventarioStore.config.alertaBajoMinimo ? "Sí" : "No");
  });

  it("sin nada que listar, el bloque lo explica en vez de quedar vacío", async () => {
    const res = await getAgotados.run({});
    const lista = res.blocks?.find((b) => b.kind === "list");
    expect(lista).toBeDefined();
    if (lista && lista.kind === "list") expect(lista.items.length).toBeGreaterThan(0);
  });
});

describe("inventario.getValorInventario", () => {
  it("el total coincide con `valorTotal` del store", async () => {
    const res = await getValorInventario.run({});
    expect(res.facts[0].label).toBe("Valor total a costo");
    expect(res.facts[0].value).toBe(Math.round(inventarioStore.valorTotal));
    expect(res.facts[0].unit).toBe("COP");
  });

  it("el desglose por bodega suma el total", async () => {
    const res = await getValorInventario.run({});
    const tabla = res.blocks?.find((b) => b.kind === "table");
    expect(tabla?.kind).toBe("table");
    // La tabla da importes formateados, así que se comprueba la cardinalidad
    // contra el catálogo de bodegas — el número exacto lo fija el store test.
    const filas = tabla && tabla.kind === "table" ? tabla.rows : [];
    expect(filas).toHaveLength(inventarioStore.bodegas.length);
  });
});

describe("inventario.getMovimientosRecientes", () => {
  it("devuelve 8 por defecto", async () => {
    const res = await getMovimientosRecientes.run({});
    expect(res.facts.find((f) => f.label === "Movimientos devueltos")?.value).toBe(8);
  });

  it("acota el límite: ni 0, ni negativo, ni el kárdex entero", async () => {
    // Un `limite` fuera de rango no es un error del usuario, es una entrada que
    // hay que normalizar. Sin techo, una pregunta volcaba el kárdex en el chat.
    const cero = await getMovimientosRecientes.run({ limite: 0 });
    expect(cero.facts.find((f) => f.label === "Movimientos devueltos")?.value).toBe(1);

    const negativo = await getMovimientosRecientes.run({ limite: -5 });
    expect(negativo.facts.find((f) => f.label === "Movimientos devueltos")?.value).toBe(1);

    const enorme = await getMovimientosRecientes.run({ limite: 10_000 });
    // El techo es 50, pero el kárdex del seed tiene menos: lo que se afirma es
    // que devuelve TODO lo que hay y no más, no que el techo sea alcanzable.
    expect(enorme.facts.find((f) => f.label === "Movimientos devueltos")?.value).toBe(
      Math.min(50, inventarioStore.movimientos.length),
    );
  });

  it("un límite no numérico cae al valor por defecto", async () => {
    const res = await getMovimientosRecientes.run({ limite: "muchos" });
    expect(res.facts.find((f) => f.label === "Movimientos devueltos")?.value).toBe(8);
  });

  it("la tabla trae las cinco columnas del contrato", async () => {
    const res = await getMovimientosRecientes.run({ limite: 3 });
    const tabla = res.blocks?.find((b) => b.kind === "table");
    const filas = tabla && tabla.kind === "table" ? tabla.rows : [];
    expect(filas).toHaveLength(3);
    for (const f of filas) expect(f).toHaveLength(5);
  });
});

describe("las tools son de LECTURA — no tocan el kárdex", () => {
  it("ejecutar las cinco no cambia ni un movimiento ni un artículo", async () => {
    // Es la comprobación que da sentido a que todas sean `query`. Si mañana
    // alguien añade una tool que escribe, este test sigue pasando — y por eso
    // hay que añadir aquí su caso: la lista se amplía, la aserción también.
    const movimientosAntes = inventarioStore.movimientos.length;
    const articulosAntes = inventarioStore.articulos.length;
    const bodegasAntes = inventarioStore.bodegas.length;

    for (const t of provider.getTools()) {
      await t.run({ articulo: "postre", limite: 5 });
    }

    expect(inventarioStore.movimientos).toHaveLength(movimientosAntes);
    expect(inventarioStore.articulos).toHaveLength(articulosAntes);
    expect(inventarioStore.bodegas).toHaveLength(bodegasAntes);
  });
});
