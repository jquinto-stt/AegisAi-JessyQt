import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ajustesDeAuditoria,
  clasificarDiferencia,
  diasParaVencer,
  diferenciaDe,
  disponibleDeLote,
  efectoEnBodega,
  estadoDeStock,
  estaCompleta,
  itemsConDiferencia,
  motivoNoConciliable,
  movimientosDe,
  nivelDeStock,
  obtenerLotesSugeridosFEFO,
  resumenDeAuditoria,
  stockDe,
  stockTotalDe,
  totalDisponibleDe,
  UMBRALES_VENCIMIENTO,
  urgenciaDeVencimiento,
  validarMovimiento,
  valorInventario,
  type Articulo,
  type AuditoriaInventario,
  type Bodega,
  type EstadoLinea,
  type EstadoStock,
  type ItemAuditoria,
  type LoteArticulo,
  type LoteDisponible,
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
  // Sin esta línea, un `loteId` pasado al constructor se perdería en silencio y
  // los tests de lotes pasarían midiendo un movimiento sin trazabilidad: verde
  // por no estar mirando lo que dice mirar.
  loteId: parcial.loteId,
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

describe("traslados encadenados — saldo por almacén y total consolidado", () => {
  // El escenario que la invariante tiene que aguantar: varios traslados, uno de
  // ellos de VUELTA a una bodega por la que ya pasó. Con un solo traslado, un
  // error de signo se cancela solo si los dos extremos se suman mal a la vez;
  // con una cadena, cada eslabón deja su rastro en una bodega distinta.
  const BODEGA_C = "bod-seca";

  const cadena: Movimiento[] = [
    mov({ id: "e1", tipo: "entrada", cantidad: 100, destinoId: BODEGA_A }),
    mov({ id: "t1", tipo: "transferencia", cantidad: 30, origenId: BODEGA_A, destinoId: BODEGA_B }),
    mov({ id: "t2", tipo: "transferencia", cantidad: 10, origenId: BODEGA_B, destinoId: BODEGA_C }),
    // El traslado que vuelve: sale de C y regresa a A. Sin él, «resta en origen,
    // suma en destino» se puede cumplir con los signos cambiados.
    mov({ id: "t3", tipo: "transferencia", cantidad: 5, origenId: BODEGA_C, destinoId: BODEGA_A }),
    mov({ id: "s1", tipo: "salida", cantidad: 20, origenId: BODEGA_A }),
  ];

  /** Los movimientos hasta `n` inclusive — la cadena leída paso a paso. */
  const hasta = (n: number) => cadena.slice(0, n + 1);

  it("cada almacén queda con SU saldo tras varios traslados", () => {
    // Los números, explícitos: 100 − 30 + 5 − 20 · 30 − 10 · 10 − 5.
    expect(stockDe(cadena, "art-1", BODEGA_A)).toBe(55);
    expect(stockDe(cadena, "art-1", BODEGA_B)).toBe(20);
    expect(stockDe(cadena, "art-1", BODEGA_C)).toBe(5);
  });

  it("la suma de los saldos por almacén es la existencia total", () => {
    // Las dos derivaciones del mismo número tienen que coincidir: si se
    // separaran, el panel y la tabla darían cifras distintas del mismo almacén.
    const suma =
      stockDe(cadena, "art-1", BODEGA_A) +
      stockDe(cadena, "art-1", BODEGA_B) +
      stockDe(cadena, "art-1", BODEGA_C);
    expect(suma).toBe(stockTotalDe(cadena, "art-1"));
  });

  it("NINGÚN traslado mueve la existencia consolidada: solo la entrada y la salida", () => {
    // Paso a paso. Los cuatro primeros son un alta y tres traslados: el total se
    // queda clavado en 100 mientras la mercancía cambia de sitio. El quinto es
    // una salida al exterior, y ahí sí baja.
    expect(stockTotalDe(hasta(0), "art-1")).toBe(100); // entrada
    expect(stockTotalDe(hasta(1), "art-1")).toBe(100); // traslado A→B
    expect(stockTotalDe(hasta(2), "art-1")).toBe(100); // traslado B→C
    expect(stockTotalDe(hasta(3), "art-1")).toBe(100); // traslado C→A
    expect(stockTotalDe(hasta(4), "art-1")).toBe(80); // salida al exterior
    // Y el total es exactamente el de los movimientos que cruzan el exterior.
    expect(stockTotalDe(cadena, "art-1")).toBe(100 - 20);
  });

  it("solo los traslados, sin nada que cruce el exterior, suman 0", () => {
    // El caso puro: la mercancía nunca sale del sistema, así que el efecto
    // consolidado tiene que ser exactamente cero — no «casi cero».
    const soloTraslados = cadena.filter((m) => m.tipo === "transferencia");
    expect(soloTraslados).toHaveLength(3);
    expect(stockTotalDe(soloTraslados, "art-1")).toBe(0);
    for (const m of soloTraslados) {
      expect(efectoEnBodega(m, m.origenId as string)).toBe(-m.cantidad);
      expect(efectoEnBodega(m, m.destinoId as string)).toBe(m.cantidad);
    }
  });

  it("CONTROL NEGATIVO: un traslado con los extremos invertidos da OTROS saldos", () => {
    // Sin esto, el test de arriba pasaría igual con una función que sumara en
    // los dos extremos o que ignorara la dirección. Se comprueba que la
    // orientación cambia el resultado: 30 de A a B deja A en 55; 30 de B a A lo
    // dejaría en 115.
    //
    // El −40 de B es un estado IMPOSIBLE en la aplicación —`validarMovimiento`
    // rechaza retirar más de lo que hay en la bodega de origen— y solo se
    // alcanza construyendo el kárdex a mano, que es lo que hace este test. Es
    // justo el punto: la guarda del store impide el stock negativo, pero no
    // impide INVERTIR la dirección de un traslado que sí cuadra, y eso no lo
    // detecta nadie más que una aserción como esta.
    const invertido = cadena.map((m) =>
      m.id === "t1" ? { ...m, origenId: BODEGA_B, destinoId: BODEGA_A } : m,
    );
    expect(stockDe(invertido, "art-1", BODEGA_A)).toBe(115);
    expect(stockDe(invertido, "art-1", BODEGA_B)).toBe(-40);
    expect(stockDe(invertido, "art-1", BODEGA_A)).not.toBe(stockDe(cadena, "art-1", BODEGA_A));
    // El total consolidado, en cambio, no se entera de la inversión: por eso el
    // error solo se ve mirando el saldo por almacén, que es lo que se afirma aquí.
    expect(stockTotalDe(invertido, "art-1")).toBe(stockTotalDe(cadena, "art-1"));
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

describe("estadoDeStock — la banda de reorden (`puntoReorden`)", () => {
  it("sin `puntoReorden` no hay banda: el comportamiento es el de siempre", () => {
    // Es el caso de todo el catálogo que no declara el umbral. Si esto cambiara,
    // artículos que hoy están «ok» empezarían a avisar sin que nadie lo pidiera.
    expect(estadoDeStock(10, 10, undefined)).toBe("ok");
    expect(estadoDeStock(9, 10, undefined)).toBe("bajo_minimo");
  });

  it("por debajo del punto de reorden y sobre el mínimo está «reorden»", () => {
    expect(estadoDeStock(14, 10, 20)).toBe("reorden");
    expect(estadoDeStock(11, 10, 20)).toBe("reorden");
  });

  it("justo en el punto de reorden ya es «ok»: el umbral avisa, no condena", () => {
    // Misma regla que el mínimo: el nivel declarado es el punto AL QUE se repone,
    // así que estar en él todavía no es estar mal.
    expect(estadoDeStock(20, 10, 20)).toBe("ok");
    expect(estadoDeStock(21, 10, 20)).toBe("ok");
  });

  it("el mínimo manda sobre el reorden", () => {
    // Por debajo del mínimo es «bajo_minimo», no «reorden»: el reorden es el
    // aviso temprano, y cuando ya se tocó el suelo el aviso llega tarde.
    expect(estadoDeStock(9, 10, 20)).toBe("bajo_minimo");
  });

  it("agotado gana a todo: sin existencia no importa dónde esté el reorden", () => {
    expect(estadoDeStock(0, 10, 20)).toBe("agotado");
  });

  it("un `puntoReorden` que no supera el mínimo no describe banda y se ignora", () => {
    // No se inventa una banda invertida ni se degrada el estado: se ignora, que
    // es lo que declara el docblock de `Articulo.puntoReorden`.
    expect(estadoDeStock(10, 10, 10)).toBe("ok");
    expect(estadoDeStock(10, 10, 5)).toBe("ok");
    expect(estadoDeStock(9, 10, 5)).toBe("bajo_minimo");
  });
});

describe("nivelDeStock — los tres niveles con los que decide el operador", () => {
  it("agrupa los cuatro estados finos en tres", () => {
    expect(nivelDeStock("ok")).toBe("ok");
    expect(nivelDeStock("reorden")).toBe("reorden");
    // Los dos grados de «ya hay que reponer» son el MISMO nivel para el operador.
    expect(nivelDeStock("bajo_minimo")).toBe("critico");
    expect(nivelDeStock("agotado")).toBe("critico");
  });

  it("ningún estado declarado se queda sin nivel", () => {
    // La exhaustividad de verdad la fuerza el compilador: `ESTADO_STOCK_LABEL` y
    // `ESTADO_STOCK_BADGE` son `Record<EstadoStock, …>` en el store, así que
    // añadir un estado a la unión rompe el build hasta que se le dé etiqueta y
    // color. Este test cubre el otro lado: que `nivelDeStock` no devuelva nada
    // fuera de los tres niveles.
    const estados: EstadoStock[] = ["agotado", "bajo_minimo", "reorden", "ok"];
    for (const estado of estados) {
      expect(["ok", "reorden", "critico"]).toContain(nivelDeStock(estado));
    }
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

// ═══════════════════════════════════════════════════════════════════════════
// LOTES Y VENCIMIENTOS
// ═══════════════════════════════════════════════════════════════════════════
//
// Dos cosas se fijan aquí, y las dos son de la clase que no se ve en pantalla:
//
//  1. **La disponibilidad de un lote se DERIVA.** El tipo `LoteArticulo` no
//     declara `cantidadDisponible` —el diseño de partida lo pedía— y estos tests
//     son la prueba de que la alternativa funciona: `cantidadInicial` más el
//     efecto de los movimientos etiquetados con el lote.
//  2. **FEFO despacha por vencimiento y NO por lo que venció.** Un lote vencido
//     es el que antes vence, así que un orden por fecha sin filtro lo pondría
//     PRIMERO: la sugerencia sería «saca lo que ya no sirve». Se afirma la
//     exclusión, no solo el orden.

const HOY = new Date(2026, 8, 21, 14, 30); // 21 sep 2026, 14:30

/** ISO del día `dias` después de HOY. Negativo = ya pasó. */
function vence(dias: number): string {
  const d = new Date(2026, 8, 21);
  d.setDate(d.getDate() + dias);
  return d.toISOString();
}

const lote = (over: Partial<LoteArticulo> & { id: string }): LoteArticulo => ({
  articuloId: "art-1",
  codigoLote: `L-${over.id}`,
  fechaVencimiento: vence(60),
  cantidadInicial: 10,
  almacenId: BODEGA_A,
  ...over,
});

/** Un lote con su disponibilidad ya resuelta, para probar FEFO sin kárdex. */
const disp = (l: LoteArticulo, disponible: number): LoteDisponible => ({ ...l, disponible });

describe("disponibleDeLote — la existencia del lote se deriva (I1)", () => {
  const L = lote({ id: "L1", cantidadInicial: 10 });

  it("sin movimientos, el disponible es el inicial", () => {
    expect(disponibleDeLote([], L)).toBe(10);
  });

  it("una salida del lote resta, y un ajuste a la baja también", () => {
    const movs = [
      mov({ id: "m1", tipo: "salida", cantidad: 4, origenId: BODEGA_A, loteId: "L1" }),
      mov({
        id: "m2",
        tipo: "ajuste",
        cantidad: 1,
        origenId: BODEGA_A,
        motivo: "Rotura",
        loteId: "L1",
      }),
    ];
    expect(disponibleDeLote(movs, L)).toBe(5);
  });

  it("una devolución al mismo lote SUMA: el número es lo que dice el kárdex", () => {
    // Un ajuste al alza sobre el lote no es un caso raro: es la devolución de
    // mercancía que había salido. Si el disponible solo bajara nunca, el lote
    // valdría menos de lo que hay.
    const movs = [mov({ id: "m1", tipo: "ajuste", cantidad: 3, destinoId: BODEGA_A, motivo: "Devolución", loteId: "L1" })];
    expect(disponibleDeLote(movs, L)).toBe(13);
  });

  it("los movimientos de OTRO lote no le afectan", () => {
    const movs = [mov({ id: "m1", tipo: "salida", cantidad: 9, origenId: BODEGA_A, loteId: "L2" })];
    expect(disponibleDeLote(movs, L)).toBe(10);
  });

  it("un movimiento que no toca su bodega no le afecta", () => {
    // Frontera declarada del modelo: un lote vive en UNA bodega. Un movimiento
    // etiquetado con él que no la toque contribuye 0 — no resta por error.
    const movs = [mov({ id: "m1", tipo: "salida", cantidad: 9, origenId: BODEGA_B, loteId: "L1" })];
    expect(disponibleDeLote(movs, L)).toBe(10);
  });

  it("un lote agotado da 0, no un número negativo", () => {
    const movs = [mov({ id: "m1", tipo: "salida", cantidad: 10, origenId: BODEGA_A, loteId: "L1" })];
    expect(disponibleDeLote(movs, L)).toBe(0);
  });
});

describe("diasParaVencer y urgenciaDeVencimiento — los tres umbrales", () => {
  it("cuenta días de CALENDARIO, no horas", () => {
    // HOY son las 14:30 y el vencimiento está fijado a medianoche local: una
    // resta de instantes daría «2 días» donde hay 3. Es el mismo defecto que ya
    // obligó a arreglar un test del seed.
    expect(diasParaVencer(vence(3), HOY)).toBe(3);
    expect(diasParaVencer(vence(0), HOY)).toBe(0);
    expect(diasParaVencer(vence(-2), HOY)).toBe(-2);
  });

  it("una fecha ilegible devuelve null, no un número", () => {
    expect(diasParaVencer("no-es-una-fecha", HOY)).toBeNull();
  });

  it("el día del vencimiento todavía es `critico`: vencido es estrictamente pasado", () => {
    // La convención contraria retiraría mercancía buena un día antes.
    expect(urgenciaDeVencimiento(vence(0), HOY)).toBe("critico");
    expect(urgenciaDeVencimiento(vence(-1), HOY)).toBe("vencido");
  });

  it("corta en 7, 15 y 30 días, y los umbrales son INCLUSIVOS", () => {
    expect(urgenciaDeVencimiento(vence(1), HOY)).toBe("critico");
    expect(urgenciaDeVencimiento(vence(7), HOY)).toBe("critico");
    // CONTROL NEGATIVO del umbral: un día más ya es otra banda. Sin esta pareja,
    // un `<` en vez de un `<=` pasaría desapercibido.
    expect(urgenciaDeVencimiento(vence(8), HOY)).toBe("proximo");

    expect(urgenciaDeVencimiento(vence(15), HOY)).toBe("proximo");
    expect(urgenciaDeVencimiento(vence(16), HOY)).toBe("aviso");

    expect(urgenciaDeVencimiento(vence(30), HOY)).toBe("aviso");
    expect(urgenciaDeVencimiento(vence(31), HOY)).toBe("ok");
  });

  it("los umbrales declarados son los que se usan", () => {
    // Se afirma contra la constante y no contra literales sueltos: si alguien
    // mueve `UMBRALES_VENCIMIENTO.critico` a 10, esta línea lo sigue y la de
    // arriba se pone roja — que es justo lo que se quiere saber.
    expect(UMBRALES_VENCIMIENTO).toEqual({ critico: 7, proximo: 15, aviso: 30 });
    expect(urgenciaDeVencimiento(vence(UMBRALES_VENCIMIENTO.critico), HOY)).toBe("critico");
    expect(urgenciaDeVencimiento(vence(UMBRALES_VENCIMIENTO.critico + 1), HOY)).toBe("proximo");
  });

  it("una fecha ilegible es `desconocido`, NUNCA `ok`", () => {
    // Es la razón de ser del miembro: sin él, un lote con la fecha corrupta caía
    // por descarte en «vigente» y la pantalla afirmaba algo que no sabe.
    expect(urgenciaDeVencimiento("", HOY)).toBe("desconocido");
    expect(urgenciaDeVencimiento("2026-13-45", HOY)).toBe("desconocido");
  });
});

describe("obtenerLotesSugeridosFEFO — primero el que vence antes", () => {
  const A = disp(lote({ id: "A", codigoLote: "AAA", fechaVencimiento: vence(30) }), 10);
  const B = disp(lote({ id: "B", codigoLote: "BBB", fechaVencimiento: vence(5) }), 10);
  const C = disp(lote({ id: "C", codigoLote: "CCC", fechaVencimiento: vence(60) }), 10);

  it("ordena por vencimiento más próximo, no por el orden de entrada", () => {
    const orden = obtenerLotesSugeridosFEFO([A, B, C], 999, HOY);
    expect(orden.map((l) => l.id)).toEqual(["B", "A", "C"]);
  });

  it("devuelve solo el tramo necesario, con el lote que cruza la línea incluido", () => {
    // 25 contra lotes de 10: hacen falta tres, y el tercero entra entero aunque
    // solo se necesiten 5 de él. Media caja no se despacha.
    expect(obtenerLotesSugeridosFEFO([A, B, C], 25, HOY).map((l) => l.id)).toEqual(["B", "A", "C"]);
    // 10 se cubre con el primero.
    expect(obtenerLotesSugeridosFEFO([A, B, C], 10, HOY).map((l) => l.id)).toEqual(["B"]);
    // 11 necesita el primero y parte del segundo.
    expect(obtenerLotesSugeridosFEFO([A, B, C], 11, HOY).map((l) => l.id)).toEqual(["B", "A"]);
  });

  it("no muta el array de entrada", () => {
    const original = [A, B, C];
    obtenerLotesSugeridosFEFO(original, 999, HOY);
    expect(original.map((l) => l.id)).toEqual(["A", "B", "C"]);
  });

  it("desempata por código de lote para que el orden no baile", () => {
    // Dos lotes que vencen el mismo día. Sin desempate el orden saldría del
    // array de entrada, que cambia al registrar un movimiento: una lista de
    // despacho que se reordena sola no se puede seguir con el dedo.
    const z = disp(lote({ id: "z", codigoLote: "ZZZ", fechaVencimiento: vence(9) }), 5);
    const a = disp(lote({ id: "a", codigoLote: "AAA", fechaVencimiento: vence(9) }), 5);
    expect(obtenerLotesSugeridosFEFO([z, a], 99, HOY).map((l) => l.codigoLote)).toEqual(["AAA", "ZZZ"]);
    expect(obtenerLotesSugeridosFEFO([a, z], 99, HOY).map((l) => l.codigoLote)).toEqual(["AAA", "ZZZ"]);
  });

  it("EXCLUYE lo vencido aunque sea lo que antes vence", () => {
    // El caso que da sentido a todo: un orden por fecha sin filtro pondría este
    // lote PRIMERO —«saca lo que ya no sirve»—. Se afirma su ausencia y que el
    // tramo lo cubre el siguiente.
    const vencido = disp(lote({ id: "V", codigoLote: "VVV", fechaVencimiento: vence(-3) }), 50);
    const orden = obtenerLotesSugeridosFEFO([vencido, A, B], 10, HOY);
    expect(orden.map((l) => l.id)).toEqual(["B"]);
    expect(orden.some((l) => l.id === "V")).toBe(false);
  });

  it("EXCLUYE los lotes sin existencia y los de fecha ilegible", () => {
    const agotado = disp(lote({ id: "E", codigoLote: "EEE", fechaVencimiento: vence(1) }), 0);
    const ilegible = disp(lote({ id: "I", codigoLote: "III", fechaVencimiento: "no-es-fecha" }), 99);
    expect(obtenerLotesSugeridosFEFO([agotado, ilegible, B], 10, HOY).map((l) => l.id)).toEqual(["B"]);
  });

  it("si no alcanza, devuelve todo lo despachable — no falla ni inventa", () => {
    // La carencia no se esconde: el llamador compara con `totalDisponibleDe`.
    const orden = obtenerLotesSugeridosFEFO([A, B, C], 999, HOY);
    expect(orden).toHaveLength(3);
    expect(totalDisponibleDe(orden)).toBe(30);
    expect(totalDisponibleDe(orden)).toBeLessThan(999);
  });

  it("una cantidad no positiva no pide ningún lote", () => {
    expect(obtenerLotesSugeridosFEFO([A, B, C], 0, HOY)).toEqual([]);
    expect(obtenerLotesSugeridosFEFO([A, B, C], -5, HOY)).toEqual([]);
    expect(obtenerLotesSugeridosFEFO([A, B, C], Number.NaN, HOY)).toEqual([]);
  });

  it("sin lotes despachables devuelve vacío, no un lote vencido de consuelo", () => {
    const soloVencidos = [disp(lote({ id: "V1", fechaVencimiento: vence(-1) }), 10)];
    expect(obtenerLotesSugeridosFEFO(soloVencidos, 5, HOY)).toEqual([]);
  });
});

describe("totalDisponibleDe", () => {
  it("suma lo disponible, no lo inicial", () => {
    const l = lote({ id: "L1", cantidadInicial: 100 });
    expect(totalDisponibleDe([disp(l, 3), disp(lote({ id: "L2" }), 7)])).toBe(10);
  });

  it("sin lotes es 0", () => {
    expect(totalDisponibleDe([])).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AUDITORÍA Y CONCILIACIÓN
// ═══════════════════════════════════════════════════════════════════════════
//
// Una auditoría es el único sitio del módulo donde el operador contradice al
// sistema con un hecho, y lo que estos tests fijan es que **la diferencia no se
// guarda** (se deriva) y que **el ajuste que produce tiene la dirección en los
// extremos, no en el tipo**. Lo segundo es la parte que la spec pedía al revés
// (`'AJUSTE_ENTRADA'` / `'AJUSTE_SALIDA'`), así que además hay una aserción
// sobre el FUENTE que fija que esos dos miembros no existen.

/** Una línea de conteo. `fisico: null` = todavía sin contar. */
const item = (articuloId: string, teorico: number, fisico: number | null): ItemAuditoria => ({
  articuloId,
  conteoTeorico: teorico,
  conteoFisico: fisico,
});

const auditoria = (
  items: ItemAuditoria[],
  over: Partial<AuditoriaInventario> = {},
): AuditoriaInventario => ({
  id: "aud-1",
  almacenId: BODEGA_A,
  estado: "en_proceso",
  fechaInicio: "2026-09-21T08:00:00.000Z",
  items,
  ...over,
});

describe("diferenciaDe — «sin contar» no es «contar cero»", () => {
  it("físico − teórico, con el signo: positivo = sobra", () => {
    expect(diferenciaDe(item("a", 10, 12))).toBe(2);
    expect(diferenciaDe(item("a", 10, 7))).toBe(-3);
    expect(diferenciaDe(item("a", 10, 10))).toBe(0);
  });

  it("sin contar devuelve `null`, y `null` NO es `0`", () => {
    // Es la aserción que impide que una auditoría a medio hacer se pueda
    // conciliar: si `null` fuera `0`, la línea pasaría por «coincide» y el
    // conteo se cerraría dando por buenas las que nadie miró.
    expect(diferenciaDe(item("a", 10, null))).toBeNull();
    expect(diferenciaDe(item("a", 10, null))).not.toBe(0);
  });
});

describe("estaCompleta e itemsConDiferencia", () => {
  it("está completa cuando todas las líneas se contaron", () => {
    expect(estaCompleta(auditoria([item("a", 1, 1), item("b", 2, 0)]))).toBe(true);
    expect(estaCompleta(auditoria([item("a", 1, 1), item("b", 2, null)]))).toBe(false);
  });

  it("una auditoría sin líneas está completa (no hay nada que contar)", () => {
    expect(estaCompleta(auditoria([]))).toBe(true);
  });

  it("las líneas con diferencia son las contadas y distintas de cero", () => {
    const a = auditoria([item("a", 1, 2), item("b", 2, 2), item("c", 3, null), item("d", 4, 1)]);
    expect(itemsConDiferencia(a).map((i) => i.articuloId)).toEqual(["a", "d"]);
  });
});

describe("clasificarDiferencia — las cuatro clases", () => {
  it("clasifica los cuatro casos", () => {
    const casos: [number | null, EstadoLinea][] = [
      [null, "pendiente"],
      [0, "coincide"],
      [3, "sobra"],
      [-3, "falta"],
    ];
    for (const [diferencia, esperado] of casos) {
      expect(clasificarDiferencia(diferencia), `${diferencia}`).toBe(esperado);
    }
  });

  it("CONTROL NEGATIVO: `null` no cae en «coincide» ni `0` en «pendiente»", () => {
    // Sin esta mitad, un `diferencia === 0` que se hubiera escrito `!diferencia`
    // clasificaría el `null` como «coincide» y el test de arriba seguiría verde
    // porque comprueba las dos por separado.
    expect(clasificarDiferencia(null)).not.toBe("coincide");
    expect(clasificarDiferencia(0)).not.toBe("pendiente");
    // Y una décima de gramo no es cero: el umbral es la igualdad exacta.
    expect(clasificarDiferencia(0.1)).toBe("sobra");
    expect(clasificarDiferencia(-0.1)).toBe("falta");
  });
});

describe("resumenDeAuditoria — la tabla y los contadores no pueden discrepar", () => {
  const a = auditoria([
    item("a", 1, 2), // sobra
    item("b", 2, 2), // coincide
    item("c", 3, 1), // falta
    item("d", 4, null), // pendiente
    item("e", 5, 6), // sobra
  ]);

  it("cuenta cada clase", () => {
    expect(resumenDeAuditoria(a)).toEqual({
      pendiente: 1,
      coincide: 1,
      sobra: 2,
      falta: 1,
    });
  });

  it("las cuatro claves salen siempre, con cero incluidas", () => {
    // Una clave ausente obligaría a cada consumidor a escribir su propio `?? 0`,
    // que es donde se cuela el `NaN` en un KPI.
    const vacia = resumenDeAuditoria(auditoria([]));
    expect(Object.keys(vacia).sort()).toEqual(["coincide", "falta", "pendiente", "sobra"]);
    expect(Object.values(vacia)).toEqual([0, 0, 0, 0]);
  });

  it("la suma del resumen es el número de líneas, ni una más", () => {
    const r = resumenDeAuditoria(a);
    expect(r.pendiente + r.coincide + r.sobra + r.falta).toBe(a.items.length);
  });
});

describe("motivoNoConciliable — el mismo «no» para el botón y para el store", () => {
  it("una auditoría completa se puede conciliar", () => {
    expect(motivoNoConciliable(auditoria([item("a", 1, 1)]))).toBeNull();
  });

  it("con una línea sin contar lo dice en singular", () => {
    expect(motivoNoConciliable(auditoria([item("a", 1, 1), item("b", 2, null)]))).toBe(
      "Falta contar 1 artículo antes de conciliar.",
    );
  });

  it("con varias lo dice en plural y con la cuenta", () => {
    const motivo = motivoNoConciliable(
      auditoria([item("a", 1, null), item("b", 2, null), item("c", 3, 1)]),
    );
    expect(motivo).toBe("Faltan contar 2 artículos antes de conciliar.");
  });

  it("una auditoría que ya no está en proceso no se concilia", () => {
    for (const estado of ["completada", "cancelada"] as const) {
      expect(motivoNoConciliable(auditoria([item("a", 1, 1)], { estado }))).not.toBeNull();
    }
  });

  it("«coincide» NO bloquea: un conteo sin diferencias se concilia y no escribe nada", () => {
    // El caso que separa «no se puede» de «no hace falta»: una auditoría donde
    // todo cuadra se cierra igual, y el kárdex no gana un solo movimiento.
    const a = auditoria([item("a", 5, 5), item("b", 2, 2)]);
    expect(motivoNoConciliable(a)).toBeNull();
    expect(ajustesDeAuditoria(a)).toEqual([]);
  });
});

describe("ajustesDeAuditoria — un ajuste por diferencia, con la dirección en los extremos", () => {
  it("un sobrante entra a la bodega de la auditoría (destino, sin origen)", () => {
    const [ajuste] = ajustesDeAuditoria(auditoria([item("a", 10, 13)]));
    expect(ajuste.tipo).toBe("ajuste");
    expect(ajuste.cantidad).toBe(3);
    expect(ajuste.origenId).toBeNull();
    expect(ajuste.destinoId).toBe(BODEGA_A);
  });

  it("un faltante sale de la bodega de la auditoría (origen, sin destino)", () => {
    const [ajuste] = ajustesDeAuditoria(auditoria([item("a", 10, 8)]));
    expect(ajuste.tipo).toBe("ajuste");
    // La cantidad es SIEMPRE positiva: el signo ya está en qué extremo es nulo.
    expect(ajuste.cantidad).toBe(2);
    expect(ajuste.origenId).toBe(BODEGA_A);
    expect(ajuste.destinoId).toBeNull();
  });

  it("CONTROL NEGATIVO: el sobrante y el faltante NO son el mismo movimiento", () => {
    // Si la dirección se hubiera quedado en el signo de `cantidad` —o si los
    // extremos se hubieran invertido—, los dos ajustes de arriba saldrían
    // idénticos y los dos tests pasarían igual. Esta es la mitad que lo impide.
    const [sobra] = ajustesDeAuditoria(auditoria([item("a", 10, 13)]));
    const [falta] = ajustesDeAuditoria(auditoria([item("a", 10, 8)]));
    expect(sobra.origenId).not.toBe(falta.origenId);
    expect(sobra.destinoId).not.toBe(falta.destinoId);
    expect(sobra.destinoId).not.toBeNull();
    expect(falta.origenId).not.toBeNull();
  });

  it("las líneas sin contar y las que coinciden no generan movimiento", () => {
    const a = auditoria([item("a", 10, 10), item("b", 5, null), item("c", 2, 3)]);
    const ajustes = ajustesDeAuditoria(a);
    expect(ajustes).toHaveLength(1);
    expect(ajustes[0].articuloId).toBe("c");
  });

  it("el motivo lleva el id de la auditoría: un ajuste sin explicación no se audita después", () => {
    const ajustes = ajustesDeAuditoria(auditoria([item("a", 1, 2)], { id: "aud-777" }));
    expect(ajustes[0].motivo).toContain("aud-777");
    expect(ajustes[0].motivo?.trim()).not.toBe("");
  });

  it("un ajuste generado pasa `validarMovimiento` con el stock de su bodega", () => {
    // La costura entre las dos funciones: si `ajustesDeAuditoria` produjera algo
    // que `validarMovimiento` rechaza, la conciliación fallaría en el store y
    // aquí se vería antes.
    const [sobra] = ajustesDeAuditoria(auditoria([item("a", 0, 4)]));
    expect(validarMovimiento(sobra, 0).ok).toBe(true);

    const [falta] = ajustesDeAuditoria(auditoria([item("a", 10, 3)]));
    expect(validarMovimiento(falta, 10).ok).toBe(true);
    // Y con menos stock del que el ajuste pretende retirar, se rechaza: es el
    // caso real de que el almacén se movió durante el conteo.
    expect(validarMovimiento(falta, 5).ok).toBe(false);
  });
});

describe("el tipo NO tiene `'AJUSTE_ENTRADA'` / `'AJUSTE_SALIDA'` (fuente)", () => {
  const fuente = readFileSync(
    join(process.cwd(), "src", "domain", "inventario", "inventario.domain.ts"),
    "utf8",
  );

  /**
   * Sin los comentarios, la prosa que EXPLICA por qué no existen esos dos
   * miembros haría fallar la aserción de ausencia — y, al revés, una aserción
   * que sí los encontrara en un comentario no probaría nada del código. Mismo
   * criterio y misma función que en el bloque de I1/I3 de este archivo.
   */
  const sinComentarios = (s: string): string =>
    s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  const codigo = sinComentarios(fuente);

  it("la fuente se leyó de verdad", () => {
    expect(fuente.length).toBeGreaterThan(1000);
    expect(codigo).toContain("export type TipoMovimiento");
  });

  it("`TipoMovimiento` sigue teniendo cuatro miembros, y son los cuatro del motivo", () => {
    const m = /export type TipoMovimiento =([^;]+);/.exec(codigo);
    expect(m, "no se encontró la declaración de `TipoMovimiento`").not.toBeNull();
    const miembros = [...m![1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    expect(miembros.sort()).toEqual(["ajuste", "entrada", "salida", "transferencia"]);
  });

  it("CONTROL NEGATIVO: el detector de miembros MARCA una unión ampliada", () => {
    // Sin esta mitad, el test de arriba seguiría verde si el regex no capturara
    // nada útil. El detector tiene que poder ponerse rojo.
    const ampliada = codigo.replace(
      '"transferencia";',
      '"transferencia" | "ajuste_entrada";',
    );
    expect(ampliada).not.toBe(codigo);
    const m = /export type TipoMovimiento =([^;]+);/.exec(ampliada);
    expect(m![1]).toContain("ajuste_entrada");
  });

  it("y esos dos nombres no aparecen en el CÓDIGO (solo en la prosa que los rechaza)", () => {
    expect(codigo).not.toMatch(/ajuste_entrada/);
    expect(codigo).not.toMatch(/ajuste_salida/);
    expect(codigo).not.toMatch(/AJUSTE_ENTRADA/);
    // La prosa sí los nombra: si no, el test de arriba estaría afirmando una
    // ausencia sobre un archivo que nunca los mencionó, y no probaría que la
    // decisión se tomó.
    expect(fuente).toMatch(/AJUSTE_ENTRADA/);
  });
});
