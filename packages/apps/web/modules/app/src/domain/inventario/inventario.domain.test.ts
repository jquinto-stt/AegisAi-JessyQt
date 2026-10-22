import { describe, expect, it } from "vitest";
import {
  aplicarMovimiento,
  cantidadSugerida,
  colaReorden,
  estadoStock,
  estadoTrasRecepcion,
  fechaRelativa,
  formatearDelta,
  siguienteNumero,
  unidadesEnTransito,
  type Articulo,
  type EstadoOrdenCompra,
  type OrdenCompra,
} from "./inventario.domain";

function articulo(parcial: Partial<Articulo> = {}): Articulo {
  return {
    id: "a1",
    sku: "SKU-1",
    nombre: "Artículo",
    categoria: "General",
    unidad: "unidad",
    costoUnitario: 1000,
    proveedorId: "p1",
    puntoReorden: 10,
    stockMaximo: 50,
    existencias: {},
    activo: true,
    ...parcial,
  };
}

function orden(estado: EstadoOrdenCompra, articuloId: string, cantidad: number, recibida = 0): OrdenCompra {
  return {
    id: `oc-${estado}`,
    numero: "OC-0001",
    proveedorId: "p1",
    estado,
    fechaCreacion: "2026-10-01T00:00:00.000Z",
    fechaEsperada: null,
    destinoId: "u1",
    lineas: [{ articuloId, cantidad, recibida, costoUnitario: 1000 }],
    notas: "",
  };
}

describe("aplicarMovimiento", () => {
  const base = { u1: 10, u2: 0 };

  it("entrada suma al destino", () => {
    const r = aplicarMovimiento(base, { tipo: "entrada", articuloId: "a1", cantidad: 5, origenId: null, destinoId: "u1" });
    expect(r).toEqual({ ok: true, existencias: { u1: 15, u2: 0 } });
  });

  it("entrada a una ubicación sin registro parte de cero", () => {
    const r = aplicarMovimiento(base, { tipo: "entrada", articuloId: "a1", cantidad: 3, origenId: null, destinoId: "u9" });
    expect(r.ok && r.existencias.u9).toBe(3);
  });

  it("salida resta del origen", () => {
    const r = aplicarMovimiento(base, { tipo: "salida", articuloId: "a1", cantidad: 4, origenId: "u1", destinoId: null });
    expect(r.ok && r.existencias.u1).toBe(6);
  });

  it("salida mayor que el stock falla", () => {
    const r = aplicarMovimiento(base, { tipo: "salida", articuloId: "a1", cantidad: 11, origenId: "u1", destinoId: null });
    expect(r.ok).toBe(false);
  });

  it("transferencia mueve sin cambiar el total", () => {
    const r = aplicarMovimiento(base, { tipo: "transferencia", articuloId: "a1", cantidad: 7, origenId: "u1", destinoId: "u2" });
    expect(r).toEqual({ ok: true, existencias: { u1: 3, u2: 7 } });
  });

  it("transferencia con origen igual a destino falla", () => {
    const r = aplicarMovimiento(base, { tipo: "transferencia", articuloId: "a1", cantidad: 1, origenId: "u1", destinoId: "u1" });
    expect(r.ok).toBe(false);
  });

  it("transferencia mayor que el origen falla", () => {
    const r = aplicarMovimiento(base, { tipo: "transferencia", articuloId: "a1", cantidad: 20, origenId: "u1", destinoId: "u2" });
    expect(r.ok).toBe(false);
  });

  it("ajuste acepta signo negativo", () => {
    const r = aplicarMovimiento(base, { tipo: "ajuste", articuloId: "a1", cantidad: -3, origenId: null, destinoId: "u1" });
    expect(r.ok && r.existencias.u1).toBe(7);
  });

  it("ajuste que dejaría stock negativo falla", () => {
    const r = aplicarMovimiento(base, { tipo: "ajuste", articuloId: "a1", cantidad: -11, origenId: null, destinoId: "u1" });
    expect(r.ok).toBe(false);
  });

  it("ajuste de cero falla", () => {
    const r = aplicarMovimiento(base, { tipo: "ajuste", articuloId: "a1", cantidad: 0, origenId: null, destinoId: "u1" });
    expect(r.ok).toBe(false);
  });

  it("cantidad no entera falla", () => {
    const r = aplicarMovimiento(base, { tipo: "entrada", articuloId: "a1", cantidad: 1.5, origenId: null, destinoId: "u1" });
    expect(r.ok).toBe(false);
  });

  it("no muta las existencias de entrada", () => {
    const original = { u1: 10 };
    aplicarMovimiento(original, { tipo: "salida", articuloId: "a1", cantidad: 2, origenId: "u1", destinoId: null });
    expect(original).toEqual({ u1: 10 });
  });
});

describe("estadoStock", () => {
  it("0 unidades es agotado", () => {
    expect(estadoStock(articulo({ existencias: { u1: 0 } }))).toBe("agotado");
  });
  it("exactamente el punto de reorden es bajo", () => {
    expect(estadoStock(articulo({ existencias: { u1: 10 } }))).toBe("bajo");
  });
  it("uno por encima del punto es normal", () => {
    expect(estadoStock(articulo({ existencias: { u1: 11 } }))).toBe("normal");
  });
  it("el máximo exacto es normal y uno más es exceso", () => {
    expect(estadoStock(articulo({ existencias: { u1: 50 } }))).toBe("normal");
    expect(estadoStock(articulo({ existencias: { u1: 51 } }))).toBe("exceso");
  });
  it("suma todas las ubicaciones", () => {
    expect(estadoStock(articulo({ existencias: { u1: 6, u2: 6 } }))).toBe("normal");
  });
});

describe("cantidadSugerida", () => {
  it("repone hasta el máximo", () => {
    expect(cantidadSugerida(articulo({ existencias: { u1: 8 } }), 0)).toBe(42);
  });
  it("descuenta lo que está en tránsito", () => {
    expect(cantidadSugerida(articulo({ existencias: { u1: 8 } }), 30)).toBe(12);
  });
  it("no sugiere negativo si el tránsito ya alcanza", () => {
    expect(cantidadSugerida(articulo({ existencias: { u1: 8 } }), 100)).toBe(0);
  });
});

describe("unidadesEnTransito", () => {
  it("solo cuenta órdenes enviadas y parciales, y lo pendiente", () => {
    const ordenes = [
      orden("enviada", "a1", 10),
      orden("parcial", "a1", 10, 4),
      orden("borrador", "a1", 100),
      orden("cancelada", "a1", 100),
      orden("recibida", "a1", 100, 100),
      orden("enviada", "otro", 100),
    ];
    expect(unidadesEnTransito("a1", ordenes)).toBe(16);
  });
});

describe("colaReorden", () => {
  it("incluye bajos y agotados activos, agotados primero", () => {
    const cola = colaReorden(
      [
        articulo({ id: "bajo", existencias: { u1: 9 } }),
        articulo({ id: "normal", existencias: { u1: 30 } }),
        articulo({ id: "agotado", existencias: {} }),
        articulo({ id: "muy-bajo", existencias: { u1: 2 } }),
        articulo({ id: "archivado", existencias: {}, activo: false }),
      ],
      [],
    );
    expect(cola.map((i) => i.articulo.id)).toEqual(["agotado", "muy-bajo", "bajo"]);
  });

  it("refleja el tránsito en la sugerencia", () => {
    const [item] = colaReorden([articulo({ existencias: { u1: 5 } })], [orden("enviada", "a1", 20)]);
    expect(item.enTransito).toBe(20);
    expect(item.sugerido).toBe(25);
  });
});

describe("estadoTrasRecepcion", () => {
  const l = (cantidad: number, recibida: number) => ({ articuloId: "a", cantidad, recibida, costoUnitario: 1 });
  it("nada recibido sigue enviada", () => {
    expect(estadoTrasRecepcion([l(5, 0), l(3, 0)])).toBe("enviada");
  });
  it("algo recibido es parcial", () => {
    expect(estadoTrasRecepcion([l(5, 5), l(3, 0)])).toBe("parcial");
  });
  it("todo recibido es recibida", () => {
    expect(estadoTrasRecepcion([l(5, 5), l(3, 3)])).toBe("recibida");
  });
});

describe("siguienteNumero", () => {
  it("toma el máximo del mismo prefijo", () => {
    expect(siguienteNumero("OC", ["OC-0001", "OC-0006", "OC-0003"])).toBe("OC-0007");
  });
  it("ignora otros prefijos y arranca en 1", () => {
    expect(siguienteNumero("OC", ["CNT-0009", "OCX-0004"])).toBe("OC-0001");
  });
});

describe("formatearDelta", () => {
  it("lleva signo", () => {
    expect(formatearDelta(12)).toBe("+12");
    expect(formatearDelta(-3)).toBe("−3");
    expect(formatearDelta(0)).toBe("0");
  });
});

describe("cantidadSugerida con múltiplo", () => {
  it("redondea hacia arriba al múltiplo", () => {
    // máximo 50, stock 37 → faltan 13 → múltiplo 5 → 15
    expect(cantidadSugerida(articulo({ existencias: { u1: 37 } }), 0, 5)).toBe(15);
  });
  it("no redondea un cero", () => {
    expect(cantidadSugerida(articulo({ existencias: { u1: 60 } }), 0, 12)).toBe(0);
  });
  it("múltiplo 1 deja la cantidad exacta", () => {
    expect(cantidadSugerida(articulo({ existencias: { u1: 37 } }), 0, 1)).toBe(13);
  });
});

describe("colaReorden con opciones", () => {
  it("aplica el múltiplo a la sugerencia", () => {
    const [item] = colaReorden([articulo({ existencias: { u1: 7 } })], [], { multiplo: 10 });
    expect(item.sugerido).toBe(50);
  });
  it("descontarEnTransito:false sugiere como si no viniera nada", () => {
    const ordenes = [orden("enviada", "a1", 20)];
    const [con] = colaReorden([articulo({ existencias: { u1: 5 } })], ordenes);
    const [sin] = colaReorden([articulo({ existencias: { u1: 5 } })], ordenes, { descontarEnTransito: false });
    expect(con.sugerido).toBe(25);
    expect(sin.sugerido).toBe(45);
    expect(sin.enTransito).toBe(20);
  });
});

describe("fechaRelativa", () => {
  const ahora = new Date(2026, 9, 21, 10, 0);
  const dia = (d: number, h = 12) => new Date(2026, 9, 21 + d, h, 0).toISOString();
  it("hoy, ayer y mañana por día de calendario", () => {
    expect(fechaRelativa(dia(0, 1), ahora)).toBe("hoy");
    expect(fechaRelativa(new Date(2026, 9, 20, 23, 50).toISOString(), ahora)).toBe("ayer");
    expect(fechaRelativa(dia(1), ahora)).toBe("mañana");
  });
  it("días hacia atrás y hacia adelante dentro de dos semanas", () => {
    expect(fechaRelativa(dia(-3), ahora)).toBe("hace 3 días");
    expect(fechaRelativa(dia(5), ahora)).toBe("en 5 días");
  });
  it("más allá de dos semanas muestra la fecha", () => {
    expect(fechaRelativa(dia(-20), ahora)).not.toMatch(/hace/);
  });
});
