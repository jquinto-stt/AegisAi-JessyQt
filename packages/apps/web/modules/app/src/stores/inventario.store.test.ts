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

const BOD_COCINA = "bod-cocina";
const BOD_FRIA = "bod-fria";
/** Tercera bodega del escenario sintético, para probar transferencias. */
const BOD_SECA = "bod-seca";

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
    { id: BOD_COCINA, nombre: "Cocina principal", principal: true },
    { id: BOD_FRIA, nombre: "Bodega fría", principal: false },
    { id: BOD_SECA, nombre: "Bodega seca", principal: false },
  ];
  const movimientos: Movimiento[] = [
    {
      id: "x1",
      articuloId: "a1",
      tipo: "entrada",
      cantidad: 10,
      origenId: null,
      destinoId: BOD_COCINA,
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
    expect(store.bodegaPrincipal?.id).toBe(BOD_COCINA);
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
    expect(store.existenciaDe("art-pollo", BOD_COCINA)).toBe(12);
    expect(store.existenciaTotal("art-pollo")).toBe(12);

    expect(store.existenciaDe("art-jugo", BOD_COCINA)).toBe(4);
    expect(store.existenciaDe("art-jugo", BOD_FRIA)).toBe(10);
    expect(store.existenciaTotal("art-jugo")).toBe(14);

    expect(store.existenciaTotal("art-salmon")).toBe(0);
    expect(store.existenciaTotal("art-harina")).toBe(9);
    expect(store.existenciaTotal("art-crema")).toBe(2);
  });

  it("clasifica el mínimo como «ok» y el agotado como «agotado»", () => {
    expect(store.estadoDe("art-mozzarella")).toBe("ok"); // 5 de mínimo 2
    expect(store.estadoDe("art-harina")).toBe("bajo_minimo"); // 9 de mínimo 10
    expect(store.estadoDe("art-salmon")).toBe("agotado"); // 0 de mínimo 2
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

  it("cubre el kárdex que exige la demo: transferencias, ajustes con motivo y actores distintos", () => {
    // El seed no es decorativo: es el escenario que el arnés de navegador
    // comprueba en pantalla. Si pierde una transferencia o un ajuste, las
    // pantallas dejan de ejercitar esos caminos sin que nada avise.
    expect(store.movimientos.filter((m) => m.tipo === "transferencia").length).toBeGreaterThanOrEqual(1);
    const ajustes = store.movimientos.filter((m) => m.tipo === "ajuste");
    expect(ajustes.length).toBeGreaterThanOrEqual(1);
    expect(ajustes.every((m) => (m.motivo ?? "").trim() !== "")).toBe(true);
    // Los dos sentidos del ajuste: uno suma y otro resta.
    expect(ajustes.some((m) => m.destinoId !== null)).toBe(true);
    expect(ajustes.some((m) => m.origenId !== null)).toBe(true);

    const actores = new Set(store.movimientos.map((m) => m.actor));
    expect(actores.size).toBeGreaterThanOrEqual(2);
    // Y todos los actores son operadores reales del seed de Pedidos.
    for (const actor of actores) expect(["d0", "d1", "d2", "d3"]).toContain(actor);
  });

  it("el kárdex entero cabe en los últimos siete días", () => {
    // Desde la medianoche de hace 7 días, no desde «ahora menos 168 horas»: el
    // seed fija la hora a las 09:00, y a las 11:00 esa resta ya dejaría fuera al
    // movimiento más antiguo por dos horas de reloj.
    const desde = new Date();
    desde.setDate(desde.getDate() - 7);
    desde.setHours(0, 0, 0, 0);

    for (const m of store.movimientos) {
      const t = new Date(m.fecha).getTime();
      expect(t).toBeGreaterThanOrEqual(desde.getTime());
      expect(t).toBeLessThanOrEqual(Date.now() + 60_000);
    }
  });

  it("no queda ninguna dimensión de variante en el kárdex (deuda declarada)", () => {
    // Se retiraron en v1: una variante sin SKU ni kárdex propios daría la misma
    // existencia a dos tallas distintas. El pin es sobre el seed real.
    expect(store.movimientos.every((m) => !("variante" in m))).toBe(true);
    expect(store.articulos.every((a) => !("variantes" in a))).toBe(true);
  });
});

describe("registrarMovimiento — el único camino por el que entra un movimiento", () => {
  it("registra una entrada válida y la existencia sube", () => {
    const store = new InventarioStore(escenario());
    const antes = store.existenciaDe("a1", BOD_COCINA);

    const r = store.registrarMovimiento({
      articuloId: "a1",
      tipo: "entrada",
      cantidad: 5,
      origenId: null,
      destinoId: BOD_COCINA,
    });

    expect(r.ok).toBe(true);
    expect(store.existenciaDe("a1", BOD_COCINA)).toBe(antes + 5);
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
      tipo: "transferencia",
      cantidad: 4,
      origenId: BOD_COCINA,
      destinoId: BOD_SECA,
    });

    expect(r.ok).toBe(true);
    expect(store.movimientos.length).toBe(antes + 1);
    expect(store.existenciaDe("a1", BOD_COCINA)).toBe(6);
    expect(store.existenciaDe("a1", BOD_SECA)).toBe(4);
    expect(store.existenciaTotal("a1")).toBe(10); // el total no cambia
  });

  it("CONTROL NEGATIVO: un movimiento inválido NO entra en el store", () => {
    const store = new InventarioStore(escenario());
    const movsAntes = store.movimientos.length;
    const stockAntes = store.existenciaDe("a1", BOD_COCINA);

    const r = store.registrarMovimiento({
      articuloId: "a1",
      tipo: "salida",
      cantidad: 999,
      origenId: BOD_COCINA,
      destinoId: null,
    });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debía rechazar");
    expect(r.motivo).toMatch(/insuficiente/i);
    // Ni el kárdex ni la existencia se movieron.
    expect(store.movimientos.length).toBe(movsAntes);
    expect(store.existenciaDe("a1", BOD_COCINA)).toBe(stockAntes);
  });

  it("valida contra la bodega de ORIGEN, no contra el total del artículo", () => {
    const store = new InventarioStore(escenario());
    // El total del artículo es 10, pero la bodega seca está VACÍA.
    const r = store.registrarMovimiento({
      articuloId: "a1",
      tipo: "salida",
      cantidad: 5,
      origenId: BOD_SECA,
      destinoId: null,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debía rechazar");
    expect(r.motivo).toContain("0");
  });

  it("rechaza un artículo o una bodega que no existen", () => {
    const store = new InventarioStore(escenario());
    expect(
      store.registrarMovimiento({
        articuloId: "no-existe",
        tipo: "entrada",
        cantidad: 1,
        origenId: null,
        destinoId: BOD_COCINA,
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
    expect(
      store.registrarMovimiento({
        articuloId: "a1",
        tipo: "transferencia",
        cantidad: 1,
        origenId: BOD_COCINA,
        destinoId: BOD_COCINA,
      }).ok,
    ).toBe(false);
  });

  it("exige motivo en un ajuste y no lo exige en una entrada", () => {
    const store = new InventarioStore(escenario());
    expect(
      store.registrarMovimiento({
        articuloId: "a2",
        tipo: "ajuste",
        cantidad: 3,
        origenId: null,
        destinoId: BOD_COCINA,
      }).ok,
    ).toBe(false);
    expect(
      store.registrarMovimiento({
        articuloId: "a2",
        tipo: "ajuste",
        cantidad: 3,
        origenId: null,
        destinoId: BOD_COCINA,
        motivo: "Conteo físico",
      }).ok,
    ).toBe(true);
  });
});

describe("bodegas — I6 se sostiene desde las acciones, no desde la UI", () => {
  it("marcarPrincipal deja exactamente una en true", () => {
    const store = new InventarioStore(escenario());
    expect(store.marcarPrincipal(BOD_SECA).ok).toBe(true);
    expect(store.bodegas.filter((b) => b.principal).map((b) => b.id)).toEqual([BOD_SECA]);
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
    expect(store.bodegaPrincipal?.id).toBe(BOD_COCINA);
  });

  it("rechaza un nombre repetido y uno vacío", () => {
    const store = new InventarioStore(escenario());
    expect(store.crearBodega({ nombre: "  " }).ok).toBe(false);
    // La comparación de nombres no distingue mayúsculas: «cocina principal» ya
    // existe como «Cocina principal».
    expect(store.crearBodega({ nombre: "cocina principal" }).ok).toBe(false);
    expect(store.bodegas).toHaveLength(3);
  });

  it("elimina una bodega sin kárdex y conserva la principal", () => {
    const store = new InventarioStore(escenario());
    expect(store.eliminarBodega(BOD_FRIA).ok).toBe(true);
    expect(store.bodegas).toHaveLength(2);
    expect(store.bodegaPrincipal?.id).toBe(BOD_COCINA);
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
    const r = store.eliminarBodega(BOD_COCINA);
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
    const central = store.movimientosFiltrados({ bodegaId: BOD_COCINA });
    expect(central.length).toBeGreaterThan(0);
    expect(
      central.every((m) => m.origenId === BOD_COCINA || m.destinoId === BOD_COCINA),
    ).toBe(true);
    // Hay al menos una entrada pura (origen null) a la bodega central.
    expect(central.some((m) => m.origenId === null)).toBe(true);
  });

  it("filtra por tipo y por artículo a la vez", () => {
    const ajustes = store.movimientosFiltrados({ tipo: "ajuste" });
    expect(ajustes).toHaveLength(2);
    expect(ajustes.every((m) => m.tipo === "ajuste")).toBe(true);

    // Las dos condiciones se exigen juntas: el artículo tiene tres movimientos y
    // solo uno de ellos es la transferencia.
    expect(store.movimientosFiltrados({ articuloId: "art-jugo" })).toHaveLength(3);
    const transferenciasDeJugo = store.movimientosFiltrados({
      articuloId: "art-jugo",
      tipo: "transferencia",
    });
    expect(transferenciasDeJugo).toHaveLength(1);
    expect(transferenciasDeJugo[0].tipo).toBe("transferencia");
  });

  it("nombra el exterior como «Exterior» y no con un guion", () => {
    expect(store.etiquetaBodega(null)).toBe("Exterior");
    expect(store.etiquetaBodega(BOD_COCINA)).toBe("Cocina principal");
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
