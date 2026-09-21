import { afterEach, describe, expect, it, vi } from "vitest";

import {
  InventarioStore,
  seed,
  type DatosInventario,
} from "./inventario.store";
import type { Articulo, Movimiento } from "@/domain/inventario/inventario.domain";

// ═══════════════════════════════════════════════════════════════════════════
// STORE DE INVENTARIO
// ═══════════════════════════════════════════════════════════════════════════
//
// Los números del seed se afirman EXPLÍCITAMENTE (no «es mayor que 0»): si el
// kárdex deja de cuadrar, el test dice cuánto se desvió y en qué artículo. Las
// fechas no entran en ninguna aserción de existencias — la existencia es una
// suma de cantidades, no de tiempos.
//
// El bloque que más importa es el CONTROL NEGATIVO: un movimiento inválido no
// entra en el store. Un test que solo prueba el camino feliz no distingue «no
// entra» de «no lo intenté».
//
// ═══════════════════════════════════════════════════════════════════════════

const BOD_CENTRAL = "bod-central";
const BOD_TIENDA = "bod-tienda";
const BOD_FRIA = "bod-fria";

/** Escenario mínimo y explícito, para leer los números sin depender del seed. */
function escenario(): DatosInventario {
  const articulos: Articulo[] = [
    {
      id: "a1",
      sku: "S1",
      nombre: "Artículo uno",
      categoria: "Cat",
      unidad: "unidad",
      minimo: 5,
      costoUnitario: 100,
      variantes: ["M", "L"],
    },
    {
      id: "a2",
      sku: "S2",
      nombre: "Artículo dos",
      categoria: "Cat",
      unidad: "kg",
      minimo: 0,
      costoUnitario: 50,
    },
  ];
  const bodegas = [
    { id: BOD_CENTRAL, nombre: "Central", principal: true },
    { id: BOD_TIENDA, nombre: "Tienda", principal: false },
    { id: BOD_FRIA, nombre: "Fría", principal: false },
  ];
  const movimientos: Movimiento[] = [
    {
      id: "x1",
      articuloId: "a1",
      variante: "M",
      tipo: "entrada",
      cantidad: 10,
      origenId: null,
      destinoId: BOD_CENTRAL,
      fecha: "2026-09-01T09:00:00.000Z",
      actor: "d0",
    },
  ];
  return { articulos, bodegas, movimientos };
}

describe("seed — el kárdex de arranque", () => {
  const store = new InventarioStore(seed());

  it("nace con al menos dos bodegas y EXACTAMENTE una principal (I6)", () => {
    // El catálogo de la plataforma promete «Multi-almacén»: una sola bodega
    // dejaría esa frase mintiendo.
    expect(store.bodegas.length).toBeGreaterThanOrEqual(2);
    expect(store.bodegas.filter((b) => b.principal)).toHaveLength(1);
    expect(store.bodegaPrincipal?.id).toBe(BOD_CENTRAL);
  });

  it("no tiene SKUs repetidos", () => {
    const skus = store.articulos.map((a) => a.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("representa los TRES estados de existencias", () => {
    // Un seed que solo enseñara el camino feliz no permitiría ver —ni probar—
    // las pantallas de alerta.
    const estados = new Set(store.articulos.map((a) => store.estadoDe(a.id)));
    expect(estados).toEqual(new Set(["ok", "bajo_minimo", "agotado"]));
  });

  it("toda existencia del seed es la suma de sus movimientos", () => {
    // Los números, explícitos. Si el kárdex deja de cuadrar, aquí se ve cuánto.
    expect(store.existenciaDe("art-postre", BOD_CENTRAL)).toBe(10);
    expect(store.existenciaDe("art-postre", BOD_TIENDA)).toBe(4);
    expect(store.existenciaDe("art-postre", BOD_FRIA)).toBe(6);
    expect(store.existenciaTotal("art-postre")).toBe(20);

    expect(store.existenciaTotal("art-vaso")).toBe(0);
    expect(store.existenciaTotal("art-azucar")).toBe(8);
    expect(store.existenciaTotal("art-leche")).toBe(20);
  });

  it("clasifica el mínimo como «ok» y el agotado como «agotado»", () => {
    expect(store.estadoDe("art-leche")).toBe("ok"); // 20 de mínimo 20
    expect(store.estadoDe("art-azucar")).toBe("bajo_minimo"); // 8 de mínimo 10
    expect(store.estadoDe("art-vaso")).toBe("agotado"); // 0 de mínimo 6
  });

  it("valora el inventario a costo con un número positivo y explicable", () => {
    expect(store.valorTotal).toBeGreaterThan(0);
    // El valor no puede depender del orden en que se lean las bodegas.
    const otro = new InventarioStore(seed());
    expect(otro.valorTotal).toBe(store.valorTotal);
  });

  it("ordena el kárdex del más reciente al más antiguo", () => {
    const fechas = store.kardex.map((m) => m.fecha);
    const ordenadas = [...fechas].sort((a, b) => b.localeCompare(a));
    expect(fechas).toEqual(ordenadas);
  });

  it("expone las variantes declaradas con su existencia", () => {
    const variantes = store.existenciasPorVariante("art-camisa");
    expect(variantes.map((v) => v.variante)).toEqual(["S", "M", "L"]);
    // Un artículo sin variantes devuelve una lista vacía, no una variante «undefined».
    expect(store.existenciasPorVariante("art-cafe")).toEqual([]);
  });
});

describe("registrarMovimiento — el único camino por el que entra un movimiento", () => {
  it("registra una entrada válida y la existencia sube", () => {
    const store = new InventarioStore(escenario());
    const antes = store.existenciaDe("a1", BOD_CENTRAL, "M");

    const r = store.registrarMovimiento({
      articuloId: "a1",
      variante: "M",
      tipo: "entrada",
      cantidad: 5,
      origenId: null,
      destinoId: BOD_CENTRAL,
    });

    expect(r.ok).toBe(true);
    expect(store.existenciaDe("a1", BOD_CENTRAL, "M")).toBe(antes + 5);
    if (!r.ok) throw new Error("debía aceptar");
    // `id`, `fecha` y `actor` los pone el store, no el llamador.
    expect(r.movimiento.id).toBeTruthy();
    expect(r.movimiento.fecha).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(r.movimiento.actor).toBe("d0");
  });

  it("una transferencia resta en origen y suma en destino en UN movimiento", () => {
    const store = new InventarioStore(escenario());
    const antes = store.movimientos.length;

    const r = store.registrarMovimiento({
      articuloId: "a1",
      variante: "M",
      tipo: "transferencia",
      cantidad: 4,
      origenId: BOD_CENTRAL,
      destinoId: BOD_TIENDA,
    });

    expect(r.ok).toBe(true);
    expect(store.movimientos.length).toBe(antes + 1);
    expect(store.existenciaDe("a1", BOD_CENTRAL, "M")).toBe(6);
    expect(store.existenciaDe("a1", BOD_TIENDA, "M")).toBe(4);
    expect(store.existenciaTotal("a1", "M")).toBe(10); // el total no cambia
  });

  it("CONTROL NEGATIVO: un movimiento inválido NO entra en el store", () => {
    const store = new InventarioStore(escenario());
    const movsAntes = store.movimientos.length;
    const stockAntes = store.existenciaDe("a1", BOD_CENTRAL, "M");

    const r = store.registrarMovimiento({
      articuloId: "a1",
      variante: "M",
      tipo: "salida",
      cantidad: 999,
      origenId: BOD_CENTRAL,
      destinoId: null,
    });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debía rechazar");
    expect(r.motivo).toMatch(/insuficiente/i);
    // Ni el kárdex ni la existencia se movieron.
    expect(store.movimientos.length).toBe(movsAntes);
    expect(store.existenciaDe("a1", BOD_CENTRAL, "M")).toBe(stockAntes);
  });

  it("valida contra la bodega de ORIGEN, no contra el total del artículo", () => {
    const store = new InventarioStore(escenario());
    // El total del artículo es 10, pero la bodega de tienda está VACÍA.
    const r = store.registrarMovimiento({
      articuloId: "a1",
      variante: "M",
      tipo: "salida",
      cantidad: 5,
      origenId: BOD_TIENDA,
      destinoId: null,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debía rechazar");
    expect(r.motivo).toContain("0");
  });

  it("rechaza un artículo, una bodega o una variante que no existen", () => {
    const store = new InventarioStore(escenario());
    expect(
      store.registrarMovimiento({
        articuloId: "no-existe",
        tipo: "entrada",
        cantidad: 1,
        origenId: null,
        destinoId: BOD_CENTRAL,
      }).ok,
    ).toBe(false);
    expect(
      store.registrarMovimiento({
        articuloId: "a1",
        tipo: "entrada",
        cantidad: 1,
        origenId: null,
        destinoId: "no-existe",
      }).ok,
    ).toBe(false);
    const r = store.registrarMovimiento({
      articuloId: "a1",
      variante: "XL",
      tipo: "entrada",
      cantidad: 1,
      origenId: null,
      destinoId: BOD_CENTRAL,
    });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.motivo).toContain("XL");
  });

  it("exige motivo en un ajuste y no lo exige en una entrada", () => {
    const store = new InventarioStore(escenario());
    expect(
      store.registrarMovimiento({
        articuloId: "a2",
        tipo: "ajuste",
        cantidad: 3,
        origenId: null,
        destinoId: BOD_CENTRAL,
      }).ok,
    ).toBe(false);
    expect(
      store.registrarMovimiento({
        articuloId: "a2",
        tipo: "ajuste",
        cantidad: 3,
        origenId: null,
        destinoId: BOD_CENTRAL,
        motivo: "Conteo físico",
      }).ok,
    ).toBe(true);
  });
});

describe("bodegas — I6 se sostiene desde las acciones, no desde la UI", () => {
  it("marcarPrincipal deja exactamente una en true", () => {
    const store = new InventarioStore(escenario());
    expect(store.marcarPrincipal(BOD_TIENDA).ok).toBe(true);
    expect(store.bodegas.filter((b) => b.principal).map((b) => b.id)).toEqual([BOD_TIENDA]);
  });

  it("crear una bodega principal degrada la anterior", () => {
    const store = new InventarioStore(escenario());
    expect(store.crearBodega({ nombre: "Nueva", principal: true }).ok).toBe(true);
    expect(store.bodegas.filter((b) => b.principal)).toHaveLength(1);
    expect(store.bodegaPrincipal?.nombre).toBe("Nueva");
  });

  it("crear una bodega sin marcar principal no cambia cuál es", () => {
    const store = new InventarioStore(escenario());
    store.crearBodega({ nombre: "Secundaria" });
    expect(store.bodegaPrincipal?.id).toBe(BOD_CENTRAL);
  });

  it("rechaza un nombre repetido y uno vacío", () => {
    const store = new InventarioStore(escenario());
    expect(store.crearBodega({ nombre: "  " }).ok).toBe(false);
    expect(store.crearBodega({ nombre: "central" }).ok).toBe(false);
    expect(store.bodegas).toHaveLength(3);
  });

  it("elimina una bodega sin kárdex y conserva la principal", () => {
    const store = new InventarioStore(escenario());
    expect(store.eliminarBodega(BOD_FRIA).ok).toBe(true);
    expect(store.bodegas).toHaveLength(2);
    expect(store.bodegaPrincipal?.id).toBe(BOD_CENTRAL);
  });

  it("al eliminar la PRINCIPAL, promueve otra: nunca queda sin principal", () => {
    // Se monta un escenario donde la principal no tiene kárdex, que es el único
    // caso en que se puede borrar. Sin esto, el test pasaría por no haber
    // tocado nunca la bodega principal.
    const store = new InventarioStore({
      articulos: escenario().articulos,
      bodegas: [
        { id: "b1", nombre: "Principal sin kárdex", principal: true },
        { id: "b2", nombre: "Otra", principal: false },
      ],
      movimientos: [],
    });
    expect(store.eliminarBodega("b1").ok).toBe(true);
    expect(store.bodegas.filter((b) => b.principal)).toHaveLength(1);
    expect(store.bodegaPrincipal?.id).toBe("b2");
  });

  it("rechaza eliminar una bodega con kárdex, con el motivo escrito", () => {
    const store = new InventarioStore(escenario());
    const r = store.eliminarBodega(BOD_CENTRAL);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.motivo).toMatch(/kárdex|kardex/i);
    expect(store.bodegas).toHaveLength(3);
  });

  it("rechaza eliminar la última bodega", () => {
    const store = new InventarioStore({
      articulos: escenario().articulos,
      bodegas: [{ id: "sola", nombre: "Única", principal: true }],
      movimientos: [],
    });
    const r = store.eliminarBodega("sola");
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.motivo).toMatch(/al menos una/i);
    expect(store.bodegas).toHaveLength(1);
  });
});

describe("catálogo de artículos", () => {
  it("crea un artículo y rechaza un SKU repetido o vacío", () => {
    const store = new InventarioStore(escenario());
    const nuevo = {
      sku: "S3",
      nombre: "Artículo tres",
      categoria: "Cat",
      unidad: "caja" as const,
      minimo: 1,
      costoUnitario: 10,
    };
    expect(store.crearArticulo(nuevo).ok).toBe(true);
    expect(store.totalArticulos).toBe(3);

    expect(store.crearArticulo(nuevo).ok).toBe(false);
    expect(store.crearArticulo({ ...nuevo, sku: "   " }).ok).toBe(false);
    expect(store.totalArticulos).toBe(3);
  });

  it("rechaza eliminar un artículo con kárdex, y acepta uno sin él", () => {
    const store = new InventarioStore(escenario());
    const conKardex = store.eliminarArticulo("a1");
    expect(conKardex.ok).toBe(false);
    expect(store.articuloPorId("a1")).toBeTruthy();

    expect(store.eliminarArticulo("a2").ok).toBe(true);
    expect(store.articuloPorId("a2")).toBeUndefined();
  });

  it("un artículo desconocido está agotado, no «ok» (fail-closed)", () => {
    const store = new InventarioStore(escenario());
    expect(store.estadoDe("no-existe")).toBe("agotado");
  });
});

describe("kárdex — filtros y lectura", () => {
  const store = new InventarioStore(seed());

  it("filtrar por bodega incluye las ENTRADAS a esa bodega, no solo las salidas", () => {
    // Filtrar por `origenId` a secas escondería medio kárdex.
    const central = store.movimientosFiltrados({ bodegaId: BOD_CENTRAL });
    expect(central.length).toBeGreaterThan(0);
    expect(
      central.every((m) => m.origenId === BOD_CENTRAL || m.destinoId === BOD_CENTRAL),
    ).toBe(true);
    // Hay al menos una entrada pura (origen null) a la bodega central.
    expect(central.some((m) => m.origenId === null)).toBe(true);
  });

  it("filtra por tipo y por artículo a la vez", () => {
    const ajustes = store.movimientosFiltrados({ tipo: "ajuste" });
    expect(ajustes).toHaveLength(2);
    expect(ajustes.every((m) => m.tipo === "ajuste")).toBe(true);

    const dePostre = store.movimientosFiltrados({ articuloId: "art-postre", tipo: "transferencia" });
    expect(dePostre).toHaveLength(2);
  });

  it("nombra el exterior como «Exterior» y no con un guion", () => {
    expect(store.etiquetaBodega(null)).toBe("Exterior");
    expect(store.etiquetaBodega(BOD_CENTRAL)).toBe("Bodega central");
    const entrada = store.kardex.find((m) => m.tipo === "entrada")!;
    expect(store.trayecto(entrada)).toMatch(/^Exterior → /);
  });

  it("movimientosRecientes devuelve los n primeros del kárdex ordenado", () => {
    const recientes = store.movimientosRecientes(5);
    expect(recientes).toHaveLength(5);
    expect(recientes.map((m) => m.id)).toEqual(store.kardex.slice(0, 5).map((m) => m.id));
  });
});

describe("configuración — persiste, y revalida lo que lee", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updateConfig guarda y reiniciarConfig vuelve a fábrica", () => {
    const store = new InventarioStore(escenario());
    store.updateConfig({ unidadPorDefecto: "kg", severidadAlerta: "alta" });
    expect(store.config.unidadPorDefecto).toBe("kg");
    expect(store.config.severidadAlerta).toBe("alta");

    store.reiniciarConfig();
    expect(store.config.unidadPorDefecto).toBe("unidad");
    expect(store.config.severidadAlerta).toBe("media");
  });

  it("un valor persistido inválido cae al valor por defecto, no al que traiga el fichero", () => {
    // Un dato de una versión anterior (o manipulado a mano) no puede dejar la
    // unidad en algo que no es una unidad de medida.
    const guardado: Record<string, string> = {
      "necto.inventarioConfig": JSON.stringify({
        unidadPorDefecto: "cajas-grandes",
        severidadAlerta: "catastrofica",
        margenAviso: -5,
      }),
    };
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => guardado[k] ?? null,
      setItem: (k: string, v: string) => {
        guardado[k] = v;
      },
    });

    const store = new InventarioStore(escenario());
    expect(store.config.unidadPorDefecto).toBe("unidad");
    expect(store.config.severidadAlerta).toBe("media");
    expect(store.config.margenAviso).toBe(0);
  });

  it("lee y conserva una configuración persistida válida", () => {
    const guardado: Record<string, string> = {
      "necto.inventarioConfig": JSON.stringify({
        unidadPorDefecto: "porcion",
        alertaBajoMinimo: false,
        severidadAlerta: "baja",
        margenAviso: 15,
      }),
    };
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => guardado[k] ?? null,
      setItem: (k: string, v: string) => {
        guardado[k] = v;
      },
    });

    const store = new InventarioStore(escenario());
    expect(store.config).toEqual({
      unidadPorDefecto: "porcion",
      alertaBajoMinimo: false,
      severidadAlerta: "baja",
      margenAviso: 15,
    });
  });
});
