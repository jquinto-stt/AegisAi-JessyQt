import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  efectoEnBodega,
  estadoDeStock,
  movimientosDe,
  stockDe,
  stockTotalDe,
  validarMovimiento,
  valorInventario,
  type Articulo,
  type Bodega,
  type Movimiento,
} from "./inventario.domain";

// ═══════════════════════════════════════════════════════════════════════════
// DOMINIO DE INVENTARIO — aritmética del kárdex y validación
// ═══════════════════════════════════════════════════════════════════════════
//
// El corazón de la propuesta es que la existencia NO se guarda: se deriva. Estos
// tests fijan las dos cosas que eso obliga a demostrar: (a) la fórmula única de
// `efectoEnBodega` cubre los cinco casos, y (b) ningún movimiento puede dejar
// stock negativo, con el motivo escrito y no con un `false` pelado.
//
// El último bloque lee el FUENTE del dominio para afirmar una AUSENCIA (que
// `Articulo` no declara campo de cantidad ni de estado). Una aserción de
// ausencia pasa por defecto también cuando no está mirando nada, así que se
// comprueba además que el bloque que se está mirando existe y tiene campos: sin
// eso, un cambio de formato del `interface` dejaría el test verde y ciego.
//
// ═══════════════════════════════════════════════════════════════════════════

const BODEGA_A = "bod-central";
const BODEGA_B = "bod-bodega";

const mov = (
  parcial: Partial<Movimiento> & Pick<Movimiento, "tipo" | "cantidad">,
): Movimiento => ({
  id: parcial.id ?? "m-1",
  articuloId: parcial.articuloId ?? "art-1",
  tipo: parcial.tipo,
  cantidad: parcial.cantidad,
  origenId: parcial.origenId ?? null,
  destinoId: parcial.destinoId ?? null,
  motivo: parcial.motivo,
  fecha: parcial.fecha ?? "2026-09-21T10:00:00.000Z",
  actor: parcial.actor ?? "d0",
});

describe("efectoEnBodega — los cinco casos del primitivo", () => {
  it("entrada (exterior → bodega): suma en la bodega de destino", () => {
    const m = mov({ tipo: "entrada", cantidad: 10, destinoId: BODEGA_A });
    expect(efectoEnBodega(m, BODEGA_A)).toBe(10);
    expect(efectoEnBodega(m, BODEGA_B)).toBe(0);
  });

  it("salida (bodega → exterior): resta en la bodega de origen", () => {
    const m = mov({ tipo: "salida", cantidad: 4, origenId: BODEGA_A });
    expect(efectoEnBodega(m, BODEGA_A)).toBe(-4);
    expect(efectoEnBodega(m, BODEGA_B)).toBe(0);
  });

  it("ajuste al alza (exterior → bodega): suma", () => {
    const m = mov({ tipo: "ajuste", cantidad: 3, destinoId: BODEGA_A, motivo: "Conteo físico" });
    expect(efectoEnBodega(m, BODEGA_A)).toBe(3);
  });

  it("ajuste a la baja (bodega → exterior): resta", () => {
    const m = mov({ tipo: "ajuste", cantidad: 2, origenId: BODEGA_A, motivo: "Rotura" });
    expect(efectoEnBodega(m, BODEGA_A)).toBe(-2);
  });

  it("transferencia: resta en origen y suma en destino, en UN movimiento", () => {
    const m = mov({
      tipo: "transferencia",
      cantidad: 7,
      origenId: BODEGA_A,
      destinoId: BODEGA_B,
    });
    expect(efectoEnBodega(m, BODEGA_A)).toBe(-7);
    expect(efectoEnBodega(m, BODEGA_B)).toBe(7);
    // La misma cantidad no se duplica: la suma de efectos del sistema es 0.
    expect(efectoEnBodega(m, BODEGA_A) + efectoEnBodega(m, BODEGA_B)).toBe(0);
  });
});

describe("derivación de existencias (I1)", () => {
  const movs: Movimiento[] = [
    mov({ id: "m1", tipo: "entrada", cantidad: 100, destinoId: BODEGA_A }),
    mov({ id: "m2", tipo: "salida", cantidad: 30, origenId: BODEGA_A }),
    mov({ id: "m3", tipo: "transferencia", cantidad: 20, origenId: BODEGA_A, destinoId: BODEGA_B }),
    mov({ id: "m4", tipo: "entrada", cantidad: 5, destinoId: BODEGA_B }),
  ];

  it("stockDe es la suma de los efectos en esa bodega", () => {
    expect(stockDe(movs, "art-1", BODEGA_A)).toBe(50); // 100 - 30 - 20
    expect(stockDe(movs, "art-1", BODEGA_B)).toBe(25); // 20 + 5
  });

  it("stockTotalDe suma todas las bodegas", () => {
    expect(stockTotalDe(movs, "art-1")).toBe(75);
  });

  it("un artículo desconocido tiene existencia 0, no undefined", () => {
    expect(stockDe(movs, "no-existe", BODEGA_A)).toBe(0);
    expect(stockTotalDe(movs, "no-existe")).toBe(0);
  });
});

describe("estadoDeStock — derivado, nunca persistido (I3)", () => {
  it("sin existencia (o con existencia negativa) está agotado", () => {
    expect(estadoDeStock(0, 10)).toBe("agotado");
    expect(estadoDeStock(-3, 10)).toBe("agotado");
  });

  it("por debajo del mínimo está bajo mínimo", () => {
    expect(estadoDeStock(9, 10)).toBe("bajo_minimo");
    expect(estadoDeStock(1, 10)).toBe("bajo_minimo");
  });

  it("justo en el mínimo es «ok»: el mínimo es el nivel al que se repone", () => {
    expect(estadoDeStock(10, 10)).toBe("ok");
    expect(estadoDeStock(11, 10)).toBe("ok");
  });

  it("un mínimo de 0 solo marca agotado, nunca bajo mínimo", () => {
    expect(estadoDeStock(0, 0)).toBe("agotado");
    expect(estadoDeStock(1, 0)).toBe("ok");
  });
});

describe("validarMovimiento — fail-closed, con motivo legible", () => {
  const base = { articuloId: "art-1" };

  it("acepta los cinco casos válidos", () => {
    expect(
      validarMovimiento({ ...base, tipo: "entrada", cantidad: 5, origenId: null, destinoId: BODEGA_A }, 0),
    ).toEqual({ ok: true });
    expect(
      validarMovimiento({ ...base, tipo: "salida", cantidad: 5, origenId: BODEGA_A, destinoId: null }, 5),
    ).toEqual({ ok: true });
    expect(
      validarMovimiento({ ...base, tipo: "ajuste", cantidad: 2, origenId: null, destinoId: BODEGA_A, motivo: "Conteo" }, 0),
    ).toEqual({ ok: true });
    expect(
      validarMovimiento({ ...base, tipo: "ajuste", cantidad: 2, origenId: BODEGA_A, destinoId: null, motivo: "Rotura" }, 2),
    ).toEqual({ ok: true });
    expect(
      validarMovimiento({ ...base, tipo: "transferencia", cantidad: 3, origenId: BODEGA_A, destinoId: BODEGA_B }, 3),
    ).toEqual({ ok: true });
  });

  it("rechaza una cantidad no positiva", () => {
    const r = validarMovimiento(
      { ...base, tipo: "entrada", cantidad: 0, origenId: null, destinoId: BODEGA_A },
      0,
    );
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.motivo).toMatch(/mayor que cero/i);
  });

  it("rechaza una salida mayor que el stock, y el motivo dice los números", () => {
    const r = validarMovimiento(
      { ...base, tipo: "salida", cantidad: 8, origenId: BODEGA_A, destinoId: null },
      3,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debía rechazar");
    // El motivo es legible y cuantificado: no un «operación inválida».
    expect(r.motivo).toContain("3");
    expect(r.motivo).toContain("8");
    expect(r.motivo).toMatch(/insuficiente/i);
  });

  it("rechaza una transferencia mayor que el stock de origen", () => {
    const r = validarMovimiento(
      { ...base, tipo: "transferencia", cantidad: 10, origenId: BODEGA_A, destinoId: BODEGA_B },
      9,
    );
    expect(r.ok).toBe(false);
  });

  it("una entrada NO se valida contra el stock: no retira de ninguna bodega", () => {
    expect(
      validarMovimiento(
        { ...base, tipo: "entrada", cantidad: 999, origenId: null, destinoId: BODEGA_A },
        0,
      ),
    ).toEqual({ ok: true });
  });

  it("rechaza una entrada que trae origen, y una salida sin origen", () => {
    expect(
      validarMovimiento({ ...base, tipo: "entrada", cantidad: 1, origenId: BODEGA_A, destinoId: BODEGA_B }, 10).ok,
    ).toBe(false);
    expect(
      validarMovimiento({ ...base, tipo: "salida", cantidad: 1, origenId: null, destinoId: null }, 10).ok,
    ).toBe(false);
  });

  it("rechaza un ajuste sin motivo (I5)", () => {
    const r = validarMovimiento(
      { ...base, tipo: "ajuste", cantidad: 1, origenId: null, destinoId: BODEGA_A },
      0,
    );
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.motivo).toMatch(/motivo/i);

    // Un motivo en blanco tampoco es un motivo.
    expect(
      validarMovimiento(
        { ...base, tipo: "ajuste", cantidad: 1, origenId: null, destinoId: BODEGA_A, motivo: "   " },
        0,
      ).ok,
    ).toBe(false);
  });

  it("rechaza un ajuste con los dos extremos o con ninguno", () => {
    expect(
      validarMovimiento(
        { ...base, tipo: "ajuste", cantidad: 1, origenId: BODEGA_A, destinoId: BODEGA_B, motivo: "x" },
        10,
      ).ok,
    ).toBe(false);
    expect(
      validarMovimiento(
        { ...base, tipo: "ajuste", cantidad: 1, origenId: null, destinoId: null, motivo: "x" },
        10,
      ).ok,
    ).toBe(false);
  });

  it("rechaza una transferencia sin destino, y una con el mismo sitio en los dos extremos", () => {
    expect(
      validarMovimiento({ ...base, tipo: "transferencia", cantidad: 1, origenId: BODEGA_A, destinoId: null }, 10).ok,
    ).toBe(false);
    const r = validarMovimiento(
      { ...base, tipo: "transferencia", cantidad: 1, origenId: BODEGA_A, destinoId: BODEGA_A },
      10,
    );
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.motivo).toMatch(/distintas/i);
  });
});

describe("valorInventario y movimientosDe", () => {
  const articulos: Articulo[] = [
    {
      id: "art-1",
      sku: "SKU-1",
      nombre: "Camiseta",
      categoria: "Ropa",
      unidad: "unidad",
      minimo: 5,
      costoUnitario: 1000,
    },
    {
      id: "art-2",
      sku: "SKU-2",
      nombre: "Café",
      categoria: "Insumos",
      unidad: "kg",
      minimo: 2,
      costoUnitario: 2500,
    },
  ];
  const bodegas: Bodega[] = [
    { id: BODEGA_A, nombre: "Central", principal: true },
    { id: BODEGA_B, nombre: "Bodega", principal: false },
  ];

  it("valora a costo, sumando bodegas y artículos", () => {
    const movs: Movimiento[] = [
      mov({ id: "m1", articuloId: "art-1", tipo: "entrada", cantidad: 3, destinoId: BODEGA_A }),
      mov({ id: "m2", articuloId: "art-1", tipo: "entrada", cantidad: 2, destinoId: BODEGA_B }),
      mov({ id: "m3", articuloId: "art-2", tipo: "entrada", cantidad: 4, destinoId: BODEGA_A }),
    ];
    // (3+2)*1000 + 4*2500 = 5000 + 10000
    expect(valorInventario(movs, articulos, bodegas)).toBe(15000);
  });

  it("sin movimientos el valor es 0", () => {
    expect(valorInventario([], articulos, bodegas)).toBe(0);
  });

  it("movimientosDe devuelve los del artículo, más reciente primero", () => {
    const movs: Movimiento[] = [
      mov({ id: "m1", articuloId: "art-1", tipo: "entrada", cantidad: 1, destinoId: BODEGA_A, fecha: "2026-09-01T00:00:00.000Z" }),
      mov({ id: "m2", articuloId: "art-2", tipo: "entrada", cantidad: 1, destinoId: BODEGA_A, fecha: "2026-09-05T00:00:00.000Z" }),
      mov({ id: "m3", articuloId: "art-1", tipo: "salida", cantidad: 1, origenId: BODEGA_A, fecha: "2026-09-10T00:00:00.000Z" }),
    ];
    expect(movimientosDe(movs, "art-1").map((m) => m.id)).toEqual(["m3", "m1"]);
  });
});

describe("I1/I3 sobre el FUENTE: el tipo no declara cantidad ni estado", () => {
  const fuente = readFileSync(
    new URL("./inventario.domain.ts", import.meta.url),
    "utf8",
  );

  const cuerpoDe = (nombre: string): string => {
    const match = fuente.match(
      new RegExp(`export interface ${nombre} \\{([\\s\\S]*?)\\n\\}`),
    );
    return match?.[1] ?? "";
  };

  /**
   * Quita comentarios de bloque y de línea.
   *
   * Necesario porque lo que se afirma es «no declara un CAMPO», y el cuerpo
   * incluye docblocks: la primera versión de este test se puso roja por una
   * palabra escrita en la explicación, no por un campo. Un test que mira prosa
   * acaba midiendo la redacción, no el contrato.
   */
  const sinComentarios = (s: string): string =>
    s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("el bloque de Articulo existe y declara campos (control positivo)", () => {
    // Sin esto, un cambio de formato del `interface` dejaría las aserciones de
    // ausencia de abajo en verde y sin mirar nada.
    const cuerpo = cuerpoDe("Articulo");
    expect(cuerpo.length).toBeGreaterThan(0);
    expect(cuerpo).toContain("sku");
    expect(cuerpo).toContain("costoUnitario");
  });

  it("Articulo no declara ningún campo de cantidad: el stock se deriva", () => {
    const cuerpo = sinComentarios(cuerpoDe("Articulo"));
    expect(cuerpo).not.toMatch(/\bcantidad\b/);
    expect(cuerpo).not.toMatch(/\bexistencia\b/);
    expect(cuerpo).not.toMatch(/\bstock\b/);
  });

  it("Articulo no declara ningún campo de estado: agotado/bajo_minimo se derivan", () => {
    const cuerpo = sinComentarios(cuerpoDe("Articulo"));
    expect(cuerpo).not.toMatch(/\bestado\b/);
  });

  // Las variantes se retiraron de v1 (deuda declarada en el docblock del tipo).
  // El pin es una ausencia, y una ausencia se cumple sola cuando nadie mira: por
  // eso se afirma sobre el CUERPO sin comentarios —donde la palabra sí aparece,
  // explicando la deuda— y no sobre el archivo entero.
  it("Articulo no declara variantes, y la deuda está escrita", () => {
    expect(sinComentarios(cuerpoDe("Articulo"))).not.toMatch(/\bvariante/);
    expect(fuente).toMatch(/Deuda declarada: variantes/);
  });

  it("Movimiento no declara variante: el kárdex no tiene esa dimensión", () => {
    expect(sinComentarios(cuerpoDe("Movimiento"))).not.toMatch(/\bvariante/);
  });
});
