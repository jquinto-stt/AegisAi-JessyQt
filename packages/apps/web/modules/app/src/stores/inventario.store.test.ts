import { afterEach, describe, expect, it, vi } from "vitest";

import {
  InventarioStore,
  seed,
  type DatosInventario,
} from "./inventario.store";
import {
  clasificarDiferencia,
  diferenciaDe,
  motivoNoConciliable,
  type Articulo,
  type AuditoriaInventario,
  type Movimiento,
} from "@/domain/inventario/inventario.domain";

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

  it("representa los CUATRO estados de existencias", () => {
    // Un seed que solo enseñara el camino feliz no permitiría ver —ni probar—
    // las pantallas de alerta.
    const estados = new Set(store.articulos.map((a) => store.estadoDe(a.id)));
    expect(estados).toEqual(new Set(["ok", "reorden", "bajo_minimo", "agotado"]));
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

  it("clasifica el punto de reorden como «reorden», bajo mínimo como «bajo_minimo» y el agotado como «agotado»", () => {
    expect(store.estadoDe("art-mozzarella")).toBe("reorden"); // 5 de mínimo 2 con puntoReorden 5
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

// ═══════════════════════════════════════════════════════════════════════════
// LOTES DEL SEED — la trazabilidad cuadra con el kárdex
// ═══════════════════════════════════════════════════════════════════════════
//
// El test que más importa de este bloque es el PRIMERO: los lotes del seed
// tienen que explicar la existencia de su bodega. Es lo que caza el error de
// modelado que el diseño de partida invitaba a cometer —etiquetar la ENTRADA que
// crea el lote— porque `disponibleDeLote` sumaría el efecto de esa entrada sobre
// un `cantidadInicial` que ya la incluye, y el lote valdría el doble.
//
// Los demás fijan la composición: que `lotesDe` resuelva la disponibilidad y
// ordene, y que `registrarMovimiento` no acepte una trazabilidad que no puede
// sostener.

describe("lotes del seed — la trazabilidad cuadra con el kárdex", () => {
  const store = new InventarioStore(seed());

  it("la suma de los lotes de un artículo es su existencia en esa bodega", () => {
    // Se recorre el catálogo en vez de afirmar artículos sueltos: así el test
    // sigue valiendo si mañana se añade un lote, y falla si alguien etiqueta una
    // entrada con un lote ya creado (doble conteo).
    const conLotes = new Set(store.lotes.map((l) => l.articuloId));
    expect(conLotes.size).toBeGreaterThanOrEqual(5);

    for (const articuloId of conLotes) {
      const lotes = store.lotesDe(articuloId);
      const porBodega = new Map<string, number>();
      for (const l of lotes) {
        porBodega.set(l.almacenId, (porBodega.get(l.almacenId) ?? 0) + l.disponible);
      }
      for (const [bodegaId, suma] of porBodega) {
        expect(`${articuloId}@${bodegaId}: ${suma}`).toBe(
          `${articuloId}@${bodegaId}: ${store.existenciaDe(articuloId, bodegaId)}`,
        );
      }
    }
  });

  it("la disponibilidad de un lote sale del kárdex, no de un campo guardado", () => {
    // Fresas: el lote entró con 10 y el ajuste a la baja le quitó 7.
    const fresas = store.lotesDe("art-fresas");
    expect(fresas).toHaveLength(1);
    expect(fresas[0].cantidadInicial).toBe(10);
    expect(fresas[0].disponible).toBe(3);
    expect(store.existenciaDe("art-fresas", BOD_FRIA)).toBe(3);

    // Crema: entró con 10 y salió 8.
    expect(store.lotesDe("art-crema")[0].disponible).toBe(2);
    // Pollo: entró con 20 y salió 8.
    expect(store.lotesDe("art-pollo")[0].disponible).toBe(12);
  });

  it("el tipo NO declara `cantidadDisponible`: el diseño de partida lo pedía", () => {
    // Se afirma sobre el objeto real, no sobre el fuente: si alguien añadiera el
    // campo, este test seguiría verde con `"cantidadDisponible" in lote`. Por eso
    // la aserción es sobre las CLAVES.
    const claves = Object.keys(store.lotes[0]).sort();
    expect(claves).toEqual([
      "almacenId",
      "articuloId",
      "cantidadInicial",
      "codigoLote",
      "fechaVencimiento",
      "id",
    ]);
  });

  it("ordena los lotes por vencimiento, y el de chocolate más urgente primero", () => {
    // El código «B» sale antes que el «A» porque vence antes: el orden lo fija
    // la fecha, no el nombre del lote.
    const chocolate = store.lotesDe("art-chocolate");
    expect(chocolate.map((l) => l.codigoLote)).toEqual(["CHO-2609B", "CHO-2609A"]);
    expect(chocolate[0].disponible).toBe(1);
    expect(chocolate[1].disponible).toBe(8);
  });

  it("la harina tiene stock y NINGÚN lote despachable: venció", () => {
    // El caso que enseña la diferencia entre «hay existencia» y «hay algo que
    // despachar», que es lo que FEFO tiene que no confundir.
    const harina = store.lotesDe("art-harina");
    expect(harina).toHaveLength(1);
    expect(harina[0].disponible).toBe(9);
    expect(store.existenciaTotal("art-harina")).toBe(9);
    expect(store.lotesDespachablesDe("art-harina")).toEqual([]);
    expect(store.lotesPorVencerDe("art-harina")).toHaveLength(1);
  });

  it("un artículo sin lotes es un estado legítimo, no un error", () => {
    // Salmón y jugo se movieron entre bodegas y un lote no se transfiere en esta
    // versión: no tienen ninguno.
    expect(store.lotesDe("art-salmon")).toEqual([]);
    expect(store.lotesDespachablesDe("art-salmon")).toEqual([]);
    expect(store.lotesPorVencerDe("art-salmon")).toEqual([]);
  });

  it("los lotes despachables salen en orden FEFO y excluyen lo vencido", () => {
    const despachables = store.lotesDespachablesDe("art-chocolate");
    expect(despachables.map((l) => l.codigoLote)).toEqual(["CHO-2609B", "CHO-2609A"]);
    // Y el conjunto global de despachables no contiene ningún lote de harina.
    const idsDespachables = new Set(
      store.articulos.flatMap((a) => store.lotesDespachablesDe(a.id).map((l) => l.id)),
    );
    expect(idsDespachables.has("lote-har-01")).toBe(false);
  });

  it("un lote agotado no entra en el aviso aunque esté vencido", () => {
    // Una alerta sobre mercancía que ya no está enseña a ignorar las alertas.
    const store2 = new InventarioStore({
      ...escenario(),
      lotes: [
        {
          id: "l-vencido-vacio",
          articuloId: "a1",
          codigoLote: "V-1",
          fechaVencimiento: new Date(Date.now() - 86_400_000).toISOString(),
          cantidadInicial: 0,
          almacenId: BOD_COCINA,
        },
      ],
    });
    expect(store2.lotesPorVencerDe("a1")).toEqual([]);
  });
});

describe("registrarMovimiento — trazabilidad por lote", () => {
  /** Escenario con un lote de 10 en la bodega de cocina. */
  function conLote() {
    return new InventarioStore({
      ...escenario(),
      lotes: [
        {
          id: "l-1",
          articuloId: "a1",
          codigoLote: "L-1",
          fechaVencimiento: "2027-01-01T00:00:00.000Z",
          cantidadInicial: 10,
          almacenId: BOD_COCINA,
        },
      ],
    });
  }

  it("una salida con lote baja la existencia Y la del lote", () => {
    const store = conLote();
    const r = store.registrarMovimiento({
      articuloId: "a1",
      tipo: "salida",
      cantidad: 4,
      origenId: BOD_COCINA,
      destinoId: null,
      loteId: "l-1",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("debía aceptar");
    expect(r.movimiento.loteId).toBe("l-1");
    expect(store.lotesDe("a1")[0].disponible).toBe(6);
    // Y la existencia del artículo sigue cuadrando con el lote.
    expect(store.existenciaDe("a1", BOD_COCINA)).toBe(10 - 4);
  });

  it("CONTROL NEGATIVO: un lote inexistente no entra en el kárdex", () => {
    // Sin esta guarda, el movimiento se registraría sin tocar ningún saldo de
    // lote: el kárdex quedaría diciendo que esa cantidad salió de un lote que no
    // existe, y nada lo delataría.
    const store = conLote();
    const antes = store.movimientos.length;
    const r = store.registrarMovimiento({
      articuloId: "a1",
      tipo: "salida",
      cantidad: 1,
      origenId: BOD_COCINA,
      destinoId: null,
      loteId: "no-existe",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debía rechazar");
    expect(r.motivo).toMatch(/lote no existe/i);
    expect(store.movimientos.length).toBe(antes);
  });

  it("rechaza un lote de OTRO artículo", () => {
    const store = conLote();
    const r = store.registrarMovimiento({
      articuloId: "a2",
      tipo: "salida",
      cantidad: 1,
      origenId: BOD_COCINA,
      destinoId: null,
      loteId: "l-1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debía rechazar");
    expect(r.motivo).toMatch(/no es de ese artículo/i);
  });

  it("rechaza un movimiento que no toca la bodega del lote", () => {
    // El efecto sería 0 y la etiqueta quedaría de adorno: el movimiento
    // afirmaría una trazabilidad que no ejerce.
    const store = conLote();
    const r = store.registrarMovimiento({
      articuloId: "a1",
      tipo: "salida",
      cantidad: 1,
      origenId: BOD_SECA,
      destinoId: null,
      loteId: "l-1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debía rechazar");
    expect(r.motivo).toMatch(/no toca la bodega del lote/i);
  });

  it("un movimiento sin lote sigue funcionando igual", () => {
    const store = conLote();
    const r = store.registrarMovimiento({
      articuloId: "a1",
      tipo: "salida",
      cantidad: 2,
      origenId: BOD_COCINA,
      destinoId: null,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("debía aceptar");
    expect(r.movimiento.loteId).toBeUndefined();
    // El lote NO baja: el movimiento no está etiquetado.
    expect(store.lotesDe("a1")[0].disponible).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AUDITORÍA Y CONCILIACIÓN
// ═══════════════════════════════════════════════════════════════════════════
//
// Lo que estos tests tienen que demostrar, en el orden en que importa:
//
//   1. **El teórico es una foto.** Un movimiento registrado DESPUÉS de abrir la
//      auditoría no lo mueve. Si lo moviera, la diferencia dejaría de explicar
//      lo que el operador vio cuando contó.
//   2. **Conciliar deja la existencia en lo contado.** Es el requisito literal
//      de la spec: la existencia teórica pasa a valer el conteo físico.
//   3. **Conciliar es atómico.** Un ajuste que el kárdex rechaza a mitad deshace
//      lo ya escrito y deja la auditoría abierta. Media conciliación es peor que
//      ninguna.
//   4. **Una línea sin contar bloquea.** Y bloquea ANTES de escribir, no
//      después: la mitad que se prueba es que el kárdex no ganó movimientos.

/** Auditoría mínima sobre `escenario()`. a1 tiene 10 en `BOD_COCINA`. */
function conAuditoria(
  items: { articuloId: string; conteoTeorico: number; conteoFisico: number | null }[],
  over: Partial<AuditoriaInventario> = {},
): InventarioStore {
  return new InventarioStore({
    ...escenario(),
    auditorias: [
      {
        id: "aud-x",
        almacenId: BOD_COCINA,
        estado: "en_proceso",
        fechaInicio: "2026-09-20T08:00:00.000Z",
        items,
        ...over,
      },
    ],
  });
}

describe("seed — la auditoría abierta cuadra con su kárdex", () => {
  const store = new InventarioStore(seed());
  const abierta = store.auditoriaEnProceso(BOD_COCINA);

  it("hay UNA auditoría abierta, en la bodega principal", () => {
    expect(abierta).toBeDefined();
    expect(abierta?.almacenId).toBe(BOD_COCINA);
    expect(abierta?.estado).toBe("en_proceso");
  });

  it("el teórico congelado es EXACTAMENTE la existencia del kárdex", () => {
    // Una foto que no cuadre con su kárdex es una auditoría que miente sobre lo
    // que el sistema creía, y la diferencia que enseñe no significa nada.
    for (const item of abierta!.items) {
      expect(
        store.existenciaDe(item.articuloId, BOD_COCINA),
        `teórico de «${item.articuloId}»`,
      ).toBe(item.conteoTeorico);
    }
    expect(abierta!.items.map((i) => [i.articuloId, i.conteoTeorico])).toEqual([
      ["art-pollo", 12],
      ["art-harina", 9],
      ["art-salmon", 0],
      ["art-crema", 2],
    ]);
  });

  it("deja una línea SIN contar, y por eso no se puede conciliar todavía", () => {
    expect(abierta!.items.filter((i) => i.conteoFisico === null)).toHaveLength(1);
    expect(motivoNoConciliable(abierta!)).toBe("Falta contar 1 artículo antes de conciliar.");
  });

  it("enseña las tres clases contadas: sobra, coincide y falta", () => {
    // El seed tiene que poder verse con datos, no solo con el camino feliz.
    const clases = abierta!.items
      .filter((i) => i.conteoFisico !== null)
      .map((i) => clasificarDiferencia(diferenciaDe(i)));
    expect(new Set(clases)).toEqual(new Set(["sobra", "coincide", "falta"]));
  });

  it("el sobrante es de un artículo que el sistema da por agotado", () => {
    // El caso que solo aparece si se cuenta el catálogo entero: el salmón está
    // en cero y en el estante hay dos.
    const salmon = abierta!.items.find((i) => i.articuloId === "art-salmon");
    expect(salmon?.conteoTeorico).toBe(0);
    expect(store.existenciaTotal("art-salmon")).toBe(0);
    expect(salmon?.conteoFisico).toBe(2);
  });
});

describe("iniciarAuditoria — la foto se congela al abrir", () => {
  it("un store sin auditorías declaradas arranca con `[]`, no con `undefined`", () => {
    // `escenario()` no declara `auditorias`: ausente y `[]` significan lo mismo.
    // Sin esto, un `datos.auditorias` sin `?? []` dejaría `undefined` y el primer
    // `.find()` de `auditoriaEnProceso` reventaría en la pantalla y no en un test.
    const store = new InventarioStore(escenario());
    expect(store.auditorias).toEqual([]);
    expect(store.auditoriasEnProceso).toEqual([]);
    expect(store.auditoriaEnProceso(BOD_COCINA)).toBeUndefined();
    expect(store.auditoriasDe(BOD_COCINA)).toEqual([]);
  });

  it("rechaza una bodega que no existe", () => {
    const store = new InventarioStore(escenario());
    const r = store.iniciarAuditoria("bod-inexistente");
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debía rechazar");
    expect(r.motivo).toMatch(/no existe/i);
  });

  it("rechaza una SEGUNDA auditoría en la misma bodega, y dice cuál está abierta", () => {
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 10, conteoFisico: null }]);
    const r = store.iniciarAuditoria(BOD_COCINA);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debía rechazar");
    expect(r.motivo).toContain("aud-x");
    expect(store.auditorias).toHaveLength(1);
  });

  it("abre en otra bodega sin problema", () => {
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 10, conteoFisico: null }]);
    const r = store.iniciarAuditoria(BOD_SECA);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("debía aceptar");
    expect(r.auditoria.almacenId).toBe(BOD_SECA);
    expect(store.auditoriasEnProceso).toHaveLength(2);
  });

  it("congela la existencia de HOY, bodega por bodega", () => {
    const store = new InventarioStore(escenario());
    const r = store.iniciarAuditoria(BOD_SECA, ["a1"]);
    if (!r.ok) throw new Error("debía aceptar");
    // a1 tiene 10 en COCINA y 0 en SECA: el teórico es el de la bodega contada.
    expect(r.auditoria.items).toEqual([
      { articuloId: "a1", conteoTeorico: 0, conteoFisico: null },
    ]);
  });

  it("EL TEÓRICO ES UNA FOTO: un movimiento posterior no lo mueve", () => {
    // El corazón del diseño. Si el teórico se leyera del kárdex en cada render,
    // la diferencia dejaría de explicar lo que el operador vio al contar.
    const store = new InventarioStore(escenario());
    const r = store.iniciarAuditoria(BOD_COCINA, ["a1"]);
    if (!r.ok) throw new Error("debía aceptar");
    const auditoriaId = r.auditoria.id;

    const salida = store.registrarMovimiento({
      articuloId: "a1",
      tipo: "salida",
      cantidad: 4,
      origenId: BOD_COCINA,
      destinoId: null,
    });
    expect(salida.ok).toBe(true);

    const linea = store.lineasDeAuditoria(auditoriaId)[0];
    expect(linea.item.conteoTeorico).toBe(10); // la foto, intacta
    expect(linea.existenciaActual).toBe(6); // la realidad, movida
    // Y las dos cifras se ven distintas: es lo que la pantalla avisa.
    expect(linea.existenciaActual).not.toBe(linea.item.conteoTeorico);
  });

  it("sin lista de artículos cuenta el catálogo ENTERO, agotados incluidos", () => {
    // Contar solo lo que el sistema cree que hay hace imposible encontrar un
    // sobrante de un artículo que el sistema da por agotado.
    const store = new InventarioStore(escenario());
    const r = store.iniciarAuditoria(BOD_COCINA);
    if (!r.ok) throw new Error("debía aceptar");
    expect(r.auditoria.items.map((i) => i.articuloId)).toEqual(["a1", "a2"]);
  });

  it("no repite una línea aunque el id venga dos veces", () => {
    const store = new InventarioStore(escenario());
    const r = store.iniciarAuditoria(BOD_COCINA, ["a1", "a1", "a2"]);
    if (!r.ok) throw new Error("debía aceptar");
    expect(r.auditoria.items.map((i) => i.articuloId)).toEqual(["a1", "a2"]);
  });

  it("ignora ids desconocidos y rechaza quedarse sin líneas", () => {
    const store = new InventarioStore(escenario());
    const conBasura = store.iniciarAuditoria(BOD_COCINA, ["a1", "no-existe"]);
    if (!conBasura.ok) throw new Error("debía aceptar");
    expect(conBasura.auditoria.items.map((i) => i.articuloId)).toEqual(["a1"]);

    const vacia = store.iniciarAuditoria(BOD_FRIA, ["no-existe"]);
    expect(vacia.ok).toBe(false);
    if (vacia.ok) throw new Error("debía rechazar");
    expect(vacia.motivo).toMatch(/no hay artículos/i);
  });
});

describe("registrarConteo — lo que se teclea, y lo que no", () => {
  it("anota el conteo y la diferencia sale de ahí", () => {
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 10, conteoFisico: null }]);
    expect(store.registrarConteo("aud-x", "a1", 7).ok).toBe(true);
    const linea = store.lineasDeAuditoria("aud-x")[0];
    expect(linea.item.conteoFisico).toBe(7);
    expect(linea.diferencia).toBe(-3);
  });

  it("`null` deshace un conteo mal tecleado", () => {
    // Sin esto, una línea mal contada obligaría a cancelar la auditoría entera.
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 10, conteoFisico: 7 }]);
    expect(store.registrarConteo("aud-x", "a1", null).ok).toBe(true);
    expect(store.lineasDeAuditoria("aud-x")[0].diferencia).toBeNull();
  });

  it("cero es un conteo válido: el estante vacío es un hecho", () => {
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 10, conteoFisico: null }]);
    expect(store.registrarConteo("aud-x", "a1", 0).ok).toBe(true);
    expect(store.lineasDeAuditoria("aud-x")[0].diferencia).toBe(-10);
  });

  it("CONTROL NEGATIVO: un conteo negativo no entra", () => {
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 10, conteoFisico: null }]);
    const r = store.registrarConteo("aud-x", "a1", -1);
    expect(r.ok).toBe(false);
    // Y no dejó rastro: la línea sigue sin contar.
    expect(store.lineasDeAuditoria("aud-x")[0].item.conteoFisico).toBeNull();
  });

  it("rechaza un artículo que no está en la auditoría", () => {
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 10, conteoFisico: null }]);
    const r = store.registrarConteo("aud-x", "a2", 3);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debía rechazar");
    expect(r.motivo).toMatch(/no está en esta auditoría/i);
  });

  it("rechaza contar en una auditoría ya cerrada", () => {
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 10, conteoFisico: 1 }], {
      estado: "completada",
    });
    expect(store.registrarConteo("aud-x", "a1", 5).ok).toBe(false);
  });

  it("rechaza una auditoría que no existe", () => {
    const store = new InventarioStore(escenario());
    expect(store.registrarConteo("aud-nada", "a1", 1).ok).toBe(false);
  });
});

describe("conciliarAuditoria — la existencia pasa a valer lo contado", () => {
  it("un FALTANTE baja la existencia al valor contado", () => {
    // El requisito literal de la spec.
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 10, conteoFisico: 7 }]);
    const r = store.conciliarAuditoria("aud-x");
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("debía aceptar");
    expect(r.movimientos).toHaveLength(1);
    expect(store.existenciaDe("a1", BOD_COCINA)).toBe(7);
  });

  it("un SOBRANTE sube la existencia al valor contado", () => {
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 10, conteoFisico: 14 }]);
    const r = store.conciliarAuditoria("aud-x");
    expect(r.ok).toBe(true);
    expect(store.existenciaDe("a1", BOD_COCINA)).toBe(14);
  });

  it("el movimiento que escribe es un `ajuste` con el id de la auditoría en el motivo", () => {
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 10, conteoFisico: 7 }]);
    const r = store.conciliarAuditoria("aud-x");
    if (!r.ok) throw new Error("debía aceptar");
    const m = r.movimientos[0];
    expect(m.tipo).toBe("ajuste");
    expect(m.cantidad).toBe(3);
    expect(m.origenId).toBe(BOD_COCINA);
    expect(m.destinoId).toBeNull();
    expect(m.motivo).toContain("aud-x");
  });

  it("una línea que COINCIDE no escribe nada", () => {
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 10, conteoFisico: 10 }]);
    const antes = store.movimientos.length;
    const r = store.conciliarAuditoria("aud-x");
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("debía aceptar");
    expect(r.movimientos).toEqual([]);
    expect(store.movimientos.length).toBe(antes);
    expect(store.existenciaDe("a1", BOD_COCINA)).toBe(10);
  });

  it("cierra la auditoría: pasa a `completada` y deja de estar en proceso", () => {
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 10, conteoFisico: 8 }]);
    store.conciliarAuditoria("aud-x");
    expect(store.auditoriaPorId("aud-x")?.estado).toBe("completada");
    expect(store.auditoriaEnProceso(BOD_COCINA)).toBeUndefined();
  });

  it("BLOQUEA con una línea sin contar, y no escribe NADA", () => {
    // La mitad que importa no es el rechazo: es que el kárdex no ganó el ajuste
    // de la línea que sí estaba contada.
    const store = conAuditoria([
      { articuloId: "a1", conteoTeorico: 10, conteoFisico: 4 },
      { articuloId: "a2", conteoTeorico: 0, conteoFisico: null },
    ]);
    const antes = store.movimientos.length;
    const r = store.conciliarAuditoria("aud-x");
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debía rechazar");
    expect(r.motivo).toMatch(/falta contar 1 artículo/i);
    expect(store.movimientos.length).toBe(antes);
    expect(store.existenciaDe("a1", BOD_COCINA)).toBe(10);
    expect(store.auditoriaPorId("aud-x")?.estado).toBe("en_proceso");
  });

  it("CONTROL NEGATIVO: conciliar dos veces no vuelve a ajustar", () => {
    // Sin esto, un botón pulsado dos veces aplicaría la diferencia dos veces y
    // la existencia quedaría por debajo de lo contado.
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 10, conteoFisico: 7 }]);
    expect(store.conciliarAuditoria("aud-x").ok).toBe(true);
    const trasPrimera = store.existenciaDe("a1", BOD_COCINA);
    const movs = store.movimientos.length;

    const segunda = store.conciliarAuditoria("aud-x");
    expect(segunda.ok).toBe(false);
    expect(store.existenciaDe("a1", BOD_COCINA)).toBe(trasPrimera);
    expect(store.movimientos.length).toBe(movs);
  });

  it("ATÓMICO: si un ajuste no cabe en el stock, deshace lo escrito y no cierra", () => {
    // El caso real: la mercancía se movió durante el conteo y el teórico
    // congelado ya no alcanza para el ajuste a la baja.
    //
    // El ORDEN de las líneas es la mitad del test: el sobrante de a2 va PRIMERO
    // y ya se habrá escrito cuando falle el faltante de a1. Si estuvieran al
    // revés, el bucle fallaría en la primera vuelta sin haber escrito nada y el
    // test pasaría sin haber ejercitado el deshacer.
    const store = conAuditoria([
      { articuloId: "a2", conteoTeorico: 0, conteoFisico: 5 }, // suma 5 a a2
      { articuloId: "a1", conteoTeorico: 10, conteoFisico: 0 }, // quiere retirar 10
    ]);
    // Alguien se lleva 8 kg de a1 entre contar y conciliar: quedan 2.
    const salida = store.registrarMovimiento({
      articuloId: "a1",
      tipo: "salida",
      cantidad: 8,
      origenId: BOD_COCINA,
      destinoId: null,
    });
    expect(salida.ok).toBe(true);
    const antes = store.movimientos.length;

    const r = store.conciliarAuditoria("aud-x");
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debía rechazar");
    expect(r.motivo).toMatch(/stock insuficiente/i);
    expect(r.motivo).toMatch(/sigue abierta/i);

    // Ni un movimiento más: ni el faltante que falló NI el sobrante de a2, que
    // ya estaba escrito cuando falló.
    expect(store.movimientos.length).toBe(antes);
    expect(store.existenciaDe("a2", BOD_COCINA)).toBe(0);
    expect(store.auditoriaPorId("aud-x")?.estado).toBe("en_proceso");
  });

  it("rechaza una auditoría que no existe", () => {
    const store = new InventarioStore(escenario());
    expect(store.conciliarAuditoria("aud-nada").ok).toBe(false);
  });
});

describe("DEUDA DECLARADA: el ajuste de auditoría no está etiquetado con lote", () => {
  // Este test no protege una virtud: fija una LIMITACIÓN conocida para que se
  // vea en vez de descubrirse. En un artículo con lotes, el ajuste mueve la
  // existencia del artículo pero no la disponibilidad derivada de sus lotes, así
  // que las dos cifras se separan hasta el siguiente movimiento etiquetado.
  //
  // Resolverlo exige contar POR LOTE, que es otra spec. Lo que no se hace es
  // elegir un lote «razonable»: un reparto inventado sería una trazabilidad que
  // el operador no declaró, y eso es peor que la deriva.
  it("el pollo baja a lo contado y su lote NO baja", () => {
    const store = new InventarioStore(seed());
    const auditoria = store.auditoriaEnProceso(BOD_COCINA)!;

    // El seed deja la crema sin contar: se cuenta para poder conciliar.
    const crema = auditoria.items.find((i) => i.articuloId === "art-crema")!;
    expect(store.registrarConteo(auditoria.id, crema.articuloId, crema.conteoTeorico).ok).toBe(true);

    const loteAntes = store.lotesDe("art-pollo")[0].disponible;
    expect(loteAntes).toBe(12);

    const r = store.conciliarAuditoria(auditoria.id);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("debía aceptar");

    // La existencia del artículo sí baja a lo contado: 11.
    expect(store.existenciaDe("art-pollo", BOD_COCINA)).toBe(11);
    // Y el lote se queda en 12: la deriva, medida y no supuesta.
    expect(store.lotesDe("art-pollo")[0].disponible).toBe(12);
    // El ajuste no lleva lote: es la causa, no un efecto colateral.
    const ajustePollo = r.movimientos.find((m) => m.articuloId === "art-pollo")!;
    expect(ajustePollo.tipo).toBe("ajuste");
    expect(ajustePollo.loteId).toBeUndefined();
  });

  it("el sobrante de un artículo agotado sí se escribe, y no toca ningún lote", () => {
    // El salmón no tiene lotes, así que aquí la deuda no muerde: es el control
    // de que el bloque de arriba mide la deuda y no un fallo general del ajuste.
    const store = new InventarioStore(seed());
    const auditoria = store.auditoriaEnProceso(BOD_COCINA)!;
    store.registrarConteo(auditoria.id, "art-crema", 2);
    const r = store.conciliarAuditoria(auditoria.id);
    if (!r.ok) throw new Error("debía aceptar");

    expect(store.existenciaDe("art-salmon", BOD_COCINA)).toBe(2);
    expect(r.movimientos.map((m) => m.articuloId).sort()).toEqual(["art-pollo", "art-salmon"]);
    expect(store.lotesDe("art-salmon")).toEqual([]);
  });
});

describe("cancelarAuditoria — cancelar no es conciliar con otro nombre", () => {
  it("cancela sin escribir nada en el kárdex", () => {
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 10, conteoFisico: 2 }]);
    const antes = store.movimientos.length;
    expect(store.cancelarAuditoria("aud-x").ok).toBe(true);
    expect(store.auditoriaPorId("aud-x")?.estado).toBe("cancelada");
    expect(store.movimientos.length).toBe(antes);
    expect(store.existenciaDe("a1", BOD_COCINA)).toBe(10);
  });

  it("CONTROL NEGATIVO: una auditoría cancelada ya no se concilia", () => {
    // Si cancelar dejara la auditoría conciliable, el botón «cancelar» sería una
    // forma de aplicar el conteo con otro nombre.
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 10, conteoFisico: 2 }]);
    store.cancelarAuditoria("aud-x");
    const r = store.conciliarAuditoria("aud-x");
    expect(r.ok).toBe(false);
    expect(store.existenciaDe("a1", BOD_COCINA)).toBe(10);
  });

  it("no cancela dos veces ni una que no existe", () => {
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 10, conteoFisico: null }]);
    expect(store.cancelarAuditoria("aud-x").ok).toBe(true);
    expect(store.cancelarAuditoria("aud-x").ok).toBe(false);
    expect(store.cancelarAuditoria("aud-nada").ok).toBe(false);
  });

  it("una auditoría cancelada libera la bodega para abrir otra", () => {
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 10, conteoFisico: null }]);
    store.cancelarAuditoria("aud-x");
    const r = store.iniciarAuditoria(BOD_COCINA, ["a1"]);
    expect(r.ok).toBe(true);
  });
});

describe("lineasDeAuditoria y auditoriasDe", () => {
  it("resuelve el artículo y los dos números de cada línea", () => {
    const store = conAuditoria([
      { articuloId: "a1", conteoTeorico: 10, conteoFisico: 12 },
      { articuloId: "a2", conteoTeorico: 0, conteoFisico: null },
    ]);
    const lineas = store.lineasDeAuditoria("aud-x");
    expect(lineas).toHaveLength(2);
    expect(lineas[0].articulo.nombre).toBe("Artículo uno");
    expect(lineas[0].diferencia).toBe(2);
    expect(lineas[0].existenciaActual).toBe(10);
    expect(lineas[1].diferencia).toBeNull();
  });

  it("una auditoría que no existe no devuelve líneas inventadas", () => {
    const store = new InventarioStore(escenario());
    expect(store.lineasDeAuditoria("aud-nada")).toEqual([]);
  });

  it("las auditorías de una bodega van de la más reciente a la más antigua", () => {
    const store = new InventarioStore({
      ...escenario(),
      auditorias: [
        {
          id: "vieja",
          almacenId: BOD_COCINA,
          estado: "cancelada",
          fechaInicio: "2026-09-01T08:00:00.000Z",
          items: [],
        },
        {
          id: "nueva",
          almacenId: BOD_COCINA,
          estado: "en_proceso",
          fechaInicio: "2026-09-20T08:00:00.000Z",
          items: [],
        },
        {
          id: "otra-bodega",
          almacenId: BOD_FRIA,
          estado: "completada",
          fechaInicio: "2026-09-21T08:00:00.000Z",
          items: [],
        },
      ],
    });
    expect(store.auditoriasDe(BOD_COCINA).map((a) => a.id)).toEqual(["nueva", "vieja"]);
    expect(store.auditoriasEnProceso.map((a) => a.id)).toEqual(["nueva"]);
  });
});

describe("una auditoría abierta bloquea lo que la dejaría huérfana", () => {
  it("no se puede eliminar un artículo que está en una auditoría abierta", () => {
    const store = conAuditoria([{ articuloId: "a2", conteoTeorico: 0, conteoFisico: null }]);
    // a2 no tiene kárdex, así que sin esta guarda se borraría y la línea se
    // quedaría sin artículo: no se podría pintar ni conciliar.
    const r = store.eliminarArticulo("a2");
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debía rechazar");
    expect(r.motivo).toMatch(/auditoría abierta/i);
  });

  it("sí se puede eliminar el mismo artículo si la auditoría ya está cerrada", () => {
    const store = conAuditoria([{ articuloId: "a2", conteoTeorico: 0, conteoFisico: null }], {
      estado: "cancelada",
    });
    expect(store.eliminarArticulo("a2").ok).toBe(true);
  });

  it("no se puede eliminar una bodega con una auditoría abierta y sin kárdex", () => {
    // El kárdex no cubre este caso: una auditoría recién abierta no tiene
    // movimientos todavía, así que la bodega se podría borrar dejando un conteo
    // apuntando a un almacén que ya no existe.
    const store = conAuditoria([{ articuloId: "a1", conteoTeorico: 0, conteoFisico: null }], {
      almacenId: BOD_SECA,
    });
    const r = store.eliminarBodega(BOD_SECA);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debía rechazar");
    expect(r.motivo).toMatch(/auditoría abierta/i);
  });
});
