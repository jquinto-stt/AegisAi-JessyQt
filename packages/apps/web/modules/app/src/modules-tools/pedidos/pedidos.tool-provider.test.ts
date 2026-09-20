import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fc from "fast-check";

import { pedidosStore } from "@/stores";
import type { Pedido, PedidoEstado, Modalidad } from "@/stores/pedidos.store";
import type { Inference } from "@/assistant";

import {
  PedidosToolProvider,
  getResumenHoy,
  getVentasPeriodo,
  getCanalTop,
  getTiempoCiclo,
  getCancelados,
  getHoraPico,
  getPendientes,
  compararDias,
  diagnosticoDesempeno,
  compararSemanas,
  getTopProductos,
} from "./pedidos.tool-provider";

// ═══════════════════════════════════════════════════════════════════════════
// Helpers de prueba
// ═══════════════════════════════════════════════════════════════════════════

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" local de hoy (coincide con la convención del provider/store). */
const hoyYmd = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** ISO en `mins` minutos atrás desde ahora. */
const minutesAgoIso = (mins: number): string =>
  new Date(Date.now() - mins * 60000).toISOString();

/**
 * ISO que cae **hoy** (día de calendario local) y en el pasado, a cualquier hora.
 *
 * Existe por el mismo motivo que `rangoDe`: `minutesAgoIso(10)` a las 00:05 es
 * AYER, así que un test que cuenta «entregados hoy» con ese fixture falla durante
 * los primeros minutos de cada día. `pedidosStore.entregadosHoy` compara por día
 * de calendario local, así que el instante tiene que estar dentro del día, no
 * dentro de las últimas 24 h. Si la suite corre en el primer minuto del día, el
 * mínimo es el propio inicio del día.
 */
const hoyHacePocoIso = (): string => {
  const ahora = new Date();
  const inicioDeHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  return new Date(Math.max(inicioDeHoy.getTime(), ahora.getTime() - 10 * 60000)).toISOString();
};

/** "YYYY-MM-DD" local de un instante ISO dado. */
const ymdDeIso = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Rango `desde..hasta` que cubre un conjunto de instantes ISO.
 *
 * Los fixtures se construyen con `minutesAgoIso(...)`, así que su día local
 * depende de la hora a la que corre la suite: a las 00:30, un pedido de hace
 * 60 minutos cae en el día ANTERIOR y un rango anclado a "hoy" solo encuentra
 * parte de los pedidos. Derivar el rango de los propios fixtures hace el test
 * determinista a cualquier hora y no cambia lo que el test verifica.
 */
const rangoDe = (isos: string[]): { desde: string; hasta: string } => {
  const dias = isos.map(ymdDeIso).sort();
  return { desde: dias[0]!, hasta: dias[dias.length - 1]! };
};

/**
 * Construye un Pedido mínimo válido con overrides.
 *
 * `minutesAgoIso(n)` es "n minutos atrás": si la suite corre a las 00:30, ese
 * instante cae en el día local ANTERIOR. Por eso los tests de rango derivan
 * `desde..hasta` de los propios fixtures (`rangoDe`) en lugar de asumir que
 * todo cae "hoy".
 */
let seqCounter = 0;
function makePedido(overrides: Partial<Pedido> = {}): Pedido {
  seqCounter += 1;
  const created = overrides.createdAt ?? minutesAgoIso(30);
  return {
    id: overrides.id ?? `t-${seqCounter}`,
    numero: overrides.numero ?? `P-${pad(seqCounter)}`,
    cliente: overrides.cliente ?? "Cliente Test",
    telefono: overrides.telefono ?? "+573000000000",
    modalidad: overrides.modalidad ?? "retiro",
    items: overrides.items ?? [{ nombre: "Item", cantidad: 1, precio: 1000 }],
    notas: overrides.notas,
    estado: overrides.estado ?? "nuevo",
    origen: overrides.origen ?? "whatsapp",
    pagado: overrides.pagado,
    createdAt: created,
    estadoDesde: overrides.estadoDesde ?? created,
    finishedAt: overrides.finishedAt,
    programadoPara: overrides.programadoPara,
  };
}

// Copia del dataset sembrado para restaurarlo tras cada test (no contaminar
// otros suites que leen el singleton).
let backup: Pedido[] = [];

beforeEach(() => {
  backup = pedidosStore.pedidos.map((p) => ({ ...p, items: p.items.map((it) => ({ ...it })) }));
});

afterEach(() => {
  pedidosStore.pedidos = backup;
});

// ═══════════════════════════════════════════════════════════════════════════
// Tarea 6.3 — Tests unitarios del PedidosToolProvider
// ═══════════════════════════════════════════════════════════════════════════

describe("getResumenHoy", () => {
  it("devuelve 4 facts (Nuevos, En curso, Entregados hoy, Programados) y una source de pedidos", async () => {
    const res = await getResumenHoy.run({});
    expect(res.facts.map((f) => f.label)).toEqual([
      "Nuevos",
      "En curso",
      "Entregados hoy",
      "Programados",
    ]);
    expect(res.sources).toHaveLength(1);
    expect(res.sources[0]!.module).toBe("pedidos");
  });

  it("refleja los conteos del dataset fijado", async () => {
    pedidosStore.pedidos = [
      makePedido({ estado: "nuevo" }),
      makePedido({ estado: "nuevo" }),
      makePedido({ estado: "en_preparacion" }),
      // `hoyHacePocoIso()` y no `minutesAgoIso(10)`: «Entregados hoy» cuenta por
      // día de calendario local, y a las 00:05 «hace 10 minutos» es ayer.
      makePedido({ estado: "entregado", finishedAt: hoyHacePocoIso() }),
      makePedido({
        estado: "programado",
        programadoPara: new Date(Date.now() + 3600_000).toISOString(),
      }),
    ];
    const res = await getResumenHoy.run({});
    const byLabel = Object.fromEntries(res.facts.map((f) => [f.label, f.value]));
    expect(byLabel["Nuevos"]).toBe(2);
    // en curso = no terminales y no programados = 2 nuevos + 1 en_preparacion
    expect(byLabel["En curso"]).toBe(3);
    expect(byLabel["Entregados hoy"]).toBe(1);
    expect(byLabel["Programados"]).toBe(1);
  });
});

describe("getVentasPeriodo", () => {
  it("con desde > hasta devuelve un Fact de Error", async () => {
    const res = await getVentasPeriodo.run({ desde: "2024-02-10", hasta: "2024-02-01" });
    expect(res.facts).toHaveLength(1);
    expect(res.facts[0]!.label).toBe("Error");
  });

  it("con rango válido devuelve Volumen y Monto con period", async () => {
    const a = minutesAgoIso(30);
    const b = minutesAgoIso(60);
    pedidosStore.pedidos = [
      makePedido({ createdAt: a, items: [{ nombre: "A", cantidad: 2, precio: 1000 }] }),
      makePedido({ createdAt: b, items: [{ nombre: "B", cantidad: 1, precio: 5000 }] }),
    ];
    const { desde, hasta } = rangoDe([a, b]);
    const period = `${desde}..${hasta}`;
    const res = await getVentasPeriodo.run({ desde, hasta });
    const vol = res.facts.find((f) => f.label === "Volumen")!;
    const monto = res.facts.find((f) => f.label === "Monto")!;
    expect(vol.value).toBe(2);
    expect(vol.period).toBe(period);
    expect(monto.value).toBe(2 * 1000 + 5000);
    expect(monto.period).toBe(period);
  });

  it("con rango sin pedidos devuelve volumen 0 y monto 0", async () => {
    pedidosStore.pedidos = [makePedido({ createdAt: minutesAgoIso(30) })];
    const res = await getVentasPeriodo.run({ desde: "2000-01-01", hasta: "2000-01-02" });
    const vol = res.facts.find((f) => f.label === "Volumen")!;
    const monto = res.facts.find((f) => f.label === "Monto")!;
    expect(vol.value).toBe(0);
    expect(monto.value).toBe(0);
  });

  it("con rango válido incluye un block metrics y un block table exportable con columnas correctas", async () => {
    const a = minutesAgoIso(30);
    const b = minutesAgoIso(60);
    pedidosStore.pedidos = [
      makePedido({ createdAt: a, items: [{ nombre: "A", cantidad: 2, precio: 1000 }] }),
      makePedido({ createdAt: b, items: [{ nombre: "B", cantidad: 1, precio: 5000 }] }),
    ];
    const { desde, hasta } = rangoDe([a, b]);
    const res = await getVentasPeriodo.run({ desde, hasta });

    const metrics = res.blocks?.find((b) => b.kind === "metrics");
    expect(metrics).toBeDefined();
    const metricLabels = (metrics as { items: { label: string }[] }).items.map((i) => i.label);
    expect(metricLabels).toEqual(["Total vendido", "Nº de pedidos", "Ticket promedio"]);

    const table = res.blocks?.find((b) => b.kind === "table") as
      | { kind: "table"; columns: string[]; rows: unknown[]; exportable?: boolean }
      | undefined;
    expect(table).toBeDefined();
    expect(table!.exportable).toBe(true);
    expect(table!.columns).toEqual(["Fecha", "Pedido", "Cliente", "Total"]);
    expect(table!.rows).toHaveLength(2);
  });

  it("con desde > hasta no incluye blocks", async () => {
    const res = await getVentasPeriodo.run({ desde: "2024-02-10", hasta: "2024-02-01" });
    expect(res.blocks).toBeUndefined();
  });
});

describe("getPendientes", () => {
  it("devuelve un Fact 'Pendientes' con el conteo de pedidos en curso", async () => {
    pedidosStore.pedidos = [
      makePedido({ estado: "nuevo" }),
      makePedido({ estado: "en_preparacion" }),
      makePedido({ estado: "entregado", finishedAt: minutesAgoIso(10) }),
      makePedido({
        estado: "programado",
        programadoPara: new Date(Date.now() + 3600_000).toISOString(),
      }),
    ];
    const res = await getPendientes.run({});
    const fact = res.facts.find((f) => f.label === "Pendientes")!;
    // en curso = 1 nuevo + 1 en_preparacion (excluye entregado y programado)
    expect(fact.value).toBe(2);
  });

  it("devuelve un block list con un item por pendiente", async () => {
    pedidosStore.pedidos = [
      makePedido({ numero: "P-100", cliente: "Ana", estado: "nuevo", modalidad: "retiro" }),
      makePedido({ numero: "P-101", cliente: "Beto", estado: "en_preparacion", modalidad: "domicilio" }),
    ];
    const res = await getPendientes.run({});
    const list = res.blocks?.find((b) => b.kind === "list") as
      | { kind: "list"; items: { primary: string; secondary?: string; trailing?: string }[] }
      | undefined;
    expect(list).toBeDefined();
    expect(list!.items).toHaveLength(2);
    expect(list!.items[0]!.primary).toContain("P-100");
    expect(list!.items[0]!.primary).toContain("Ana");
    expect(typeof list!.items[0]!.secondary).toBe("string");
    expect(typeof list!.items[0]!.trailing).toBe("string");

    const table = res.blocks?.find((b) => b.kind === "table") as
      | { kind: "table"; columns: string[]; exportable?: boolean }
      | undefined;
    expect(table).toBeDefined();
    expect(table!.exportable).toBe(true);
    expect(table!.columns).toEqual(["Pedido", "Cliente", "Estado", "Total"]);
  });

  it("sin pendientes el Fact es 0 y el list va vacío", async () => {
    pedidosStore.pedidos = [
      makePedido({ estado: "entregado", finishedAt: minutesAgoIso(10) }),
    ];
    const res = await getPendientes.run({});
    expect(res.facts.find((f) => f.label === "Pendientes")!.value).toBe(0);
    const list = res.blocks?.find((b) => b.kind === "list") as
      | { kind: "list"; items: unknown[] }
      | undefined;
    expect(list).toBeDefined();
    expect(list!.items).toHaveLength(0);
  });
});

describe("compararSemanas", () => {
  it("devuelve facts de ventas y pedidos de ambas semanas", async () => {
    pedidosStore.pedidos = [
      // Esta semana (hoy)
      makePedido({ createdAt: minutesAgoIso(30), items: [{ nombre: "A", cantidad: 1, precio: 10000 }] }),
      // Semana pasada (hace ~8 días)
      makePedido({ createdAt: minutesAgoIso(8 * 24 * 60), items: [{ nombre: "B", cantidad: 1, precio: 5000 }] }),
    ];
    const res = await compararSemanas.run({});
    const labels = res.facts.map((f) => f.label);
    expect(labels).toContain("Ventas esta semana");
    expect(labels).toContain("Ventas semana pasada");
    expect(labels).toContain("Pedidos esta semana");
    expect(labels).toContain("Pedidos semana pasada");
  });

  it("devuelve dos blocks comparison (ventas con unit COP y pedidos sin unit)", async () => {
    pedidosStore.pedidos = [
      makePedido({ createdAt: minutesAgoIso(30), items: [{ nombre: "A", cantidad: 1, precio: 10000 }] }),
      makePedido({ createdAt: minutesAgoIso(8 * 24 * 60), items: [{ nombre: "B", cantidad: 1, precio: 5000 }] }),
    ];
    const res = await compararSemanas.run({});
    const comparisons = (res.blocks ?? []).filter((b) => b.kind === "comparison") as {
      kind: "comparison";
      unit?: string;
      items: { label: string }[];
    }[];
    expect(comparisons).toHaveLength(2);
    const ventas = comparisons.find((c) => c.items[0]!.label === "Ventas")!;
    const pedidos = comparisons.find((c) => c.items[0]!.label === "Pedidos")!;
    expect(ventas.unit).toBe("COP");
    expect(pedidos.unit).toBeUndefined();
  });

  it("con ventas en ambas semanas y variación distinta de 0 emite inference pattern trazable", async () => {
    pedidosStore.pedidos = [
      makePedido({ createdAt: minutesAgoIso(30), items: [{ nombre: "A", cantidad: 1, precio: 10000 }] }),
      makePedido({ createdAt: minutesAgoIso(8 * 24 * 60), items: [{ nombre: "B", cantidad: 1, precio: 5000 }] }),
    ];
    const res = await compararSemanas.run({});
    expect(res.inferences ?? []).toHaveLength(1);
    expect(res.inferences![0]!.kind).toBe("pattern");
    const labels = new Set(res.facts.map((f) => f.label));
    for (const ref of res.inferences![0]!.basedOn) {
      expect(labels.has(ref)).toBe(true);
    }
  });
});

describe("getCanalTop", () => {
  it("con whatsapp > operador el value contiene whatsapp", async () => {
    pedidosStore.pedidos = [
      makePedido({ origen: "whatsapp" }),
      makePedido({ origen: "whatsapp" }),
      makePedido({ origen: "operador" }),
    ];
    const res = await getCanalTop.run({});
    const fact = res.facts.find((f) => f.label === "Canal líder")!;
    expect(String(fact.value)).toContain("whatsapp");
  });

  it("sin pedidos el value es 'Sin datos'", async () => {
    pedidosStore.pedidos = [];
    const res = await getCanalTop.run({});
    const fact = res.facts.find((f) => f.label === "Canal líder")!;
    expect(fact.value).toBe("Sin datos");
  });
});

describe("getTiempoCiclo", () => {
  it("con un entregado con finishedAt devuelve Fact numérico con unit min", async () => {
    pedidosStore.pedidos = [
      makePedido({
        estado: "entregado",
        createdAt: minutesAgoIso(40),
        finishedAt: minutesAgoIso(10),
      }),
    ];
    const res = await getTiempoCiclo.run({});
    const fact = res.facts.find((f) => f.label === "Tiempo promedio de ciclo")!;
    expect(typeof fact.value).toBe("number");
    expect(fact.unit).toBe("min");
    expect(fact.value).toBe(30);
  });

  it("sin entregados el value es 'No disponible'", async () => {
    pedidosStore.pedidos = [makePedido({ estado: "nuevo" })];
    const res = await getTiempoCiclo.run({});
    const fact = res.facts.find((f) => f.label === "Tiempo promedio de ciclo")!;
    expect(fact.value).toBe("No disponible");
    expect(fact.unit).toBeUndefined();
  });
});

describe("getCancelados", () => {
  it("cuenta los cancelados", async () => {
    pedidosStore.pedidos = [
      makePedido({ estado: "cancelado", finishedAt: minutesAgoIso(10) }),
      makePedido({ estado: "cancelado", finishedAt: minutesAgoIso(20) }),
      makePedido({ estado: "nuevo" }),
    ];
    const res = await getCancelados.run({});
    expect(res.facts[0]!.value).toBe(2);
  });

  it("con 0 cancelados el value es 0", async () => {
    pedidosStore.pedidos = [makePedido({ estado: "nuevo" })];
    const res = await getCancelados.run({});
    expect(res.facts[0]!.value).toBe(0);
  });
});

describe("getHoraPico", () => {
  it("devuelve la franja de mayor volumen del día", async () => {
    const hoy = hoyYmd();
    // Dos pedidos a las 09:00 local, uno a las 15:00 local.
    const at = (h: number) => `${hoy}T${pad(h)}:30:00`;
    pedidosStore.pedidos = [
      makePedido({ createdAt: at(9) }),
      makePedido({ createdAt: at(9) }),
      makePedido({ createdAt: at(15) }),
    ];
    const res = await getHoraPico.run({ ymd: hoy });
    const fact = res.facts.find((f) => f.label === "Hora pico")!;
    expect(fact.value).toBe("9am");
    expect(fact.period).toBe(hoy);
  });

  it("sin pedidos ese día el value es 'No hay hora pico'", async () => {
    pedidosStore.pedidos = [makePedido({ createdAt: `${hoyYmd()}T09:00:00` })];
    const res = await getHoraPico.run({ ymd: "2000-01-01" });
    const fact = res.facts.find((f) => f.label === "Hora pico")!;
    expect(fact.value).toBe("No hay hora pico");
  });
});

describe("compararDias", () => {
  it("devuelve facts de volumen y entregados de ambos días", async () => {
    const diaA = "2024-03-01";
    const diaB = "2024-03-02";
    pedidosStore.pedidos = [
      makePedido({ createdAt: `${diaA}T10:00:00.000Z` }),
      makePedido({ createdAt: `${diaB}T10:00:00.000Z` }),
    ];
    const res = await compararDias.run({ diaA, diaB });
    const labels = res.facts.map((f) => f.label);
    expect(labels).toContain(`Volumen ${diaA}`);
    expect(labels).toContain(`Volumen ${diaB}`);
    expect(labels).toContain(`Entregados ${diaA}`);
    expect(labels).toContain(`Entregados ${diaB}`);
  });

  it("si ambos días tienen volumen y difieren hay una inference de patrón", async () => {
    const diaA = "2024-03-01";
    const diaB = "2024-03-02";
    pedidosStore.pedidos = [
      makePedido({ createdAt: `${diaA}T10:00:00.000Z` }),
      makePedido({ createdAt: `${diaB}T10:00:00.000Z` }),
      makePedido({ createdAt: `${diaB}T11:00:00.000Z` }),
    ];
    const res = await compararDias.run({ diaA, diaB });
    expect(res.inferences ?? []).toHaveLength(1);
    expect(res.inferences![0]!.kind).toBe("pattern");
  });

  it("si un día no tiene pedidos no hay inference de patrón", async () => {
    const diaA = "2024-03-01";
    const diaB = "2024-03-02";
    pedidosStore.pedidos = [makePedido({ createdAt: `${diaA}T10:00:00.000Z` })];
    const res = await compararDias.run({ diaA, diaB });
    expect(res.inferences ?? []).toHaveLength(0);
  });
});

describe("diagnosticoDesempeno", () => {
  it("devuelve 3 facts (Volumen últimos 7 días, Tiempo promedio de ciclo, Pedidos urgentes)", async () => {
    pedidosStore.pedidos = [makePedido({ estado: "nuevo" })];
    const res = await diagnosticoDesempeno.run({});
    expect(res.facts.map((f) => f.label)).toEqual([
      "Volumen últimos 7 días",
      "Tiempo promedio de ciclo",
      "Pedidos urgentes",
    ]);
  });

  it("con urgentes y ciclo > umbral hay inference de correlación", async () => {
    const umbral = pedidosStore.config.umbralUrgencia;
    // Urgente: en curso, tiempo en estado muy superior al objetivo.
    const urgente = makePedido({
      estado: "en_preparacion",
      createdAt: minutesAgoIso(200),
      estadoDesde: minutesAgoIso(umbral + 60),
    });
    // Entregado con ciclo alto (para superar el umbral en el promedio).
    const entregadoLento = makePedido({
      estado: "entregado",
      createdAt: minutesAgoIso(umbral + 200),
      finishedAt: minutesAgoIso(10),
    });
    pedidosStore.pedidos = [urgente, entregadoLento];
    const res = await diagnosticoDesempeno.run({});
    expect(res.inferences ?? []).toHaveLength(1);
    expect(res.inferences![0]!.kind).toBe("correlation");
  });

  it("sin urgentes no hay inference", async () => {
    pedidosStore.pedidos = [
      makePedido({ estado: "entregado", createdAt: minutesAgoIso(60), finishedAt: minutesAgoIso(10) }),
    ];
    const res = await diagnosticoDesempeno.run({});
    expect(res.inferences ?? []).toHaveLength(0);
  });
});

describe("PedidosToolProvider.getTools", () => {
  it("devuelve las 10 tools con module 'pedidos'", () => {
    const provider = new PedidosToolProvider();
    const tools = provider.getTools();
    expect(tools).toHaveLength(10);
    for (const tool of tools) {
      expect(tool.module).toBe("pedidos");
    }
    expect(tools.map((t) => t.id)).toEqual([
      "pedidos.getResumenHoy",
      "pedidos.getVentasPeriodo",
      "pedidos.getCanalTop",
      "pedidos.getTiempoCiclo",
      "pedidos.getCancelados",
      "pedidos.getHoraPico",
      "pedidos.getPendientes",
      "pedidos.compararDias",
      "pedidos.diagnosticoDesempeno",
      "pedidos.compararSemanas",
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Arbitrary de pedidos para los property tests (6.4 y 6.5)
// ═══════════════════════════════════════════════════════════════════════════

const ESTADOS: PedidoEstado[] = [
  "programado",
  "nuevo",
  "confirmado",
  "en_preparacion",
  "listo",
  "en_camino",
  "entregado",
  "cancelado",
];
const MODALIDADES: Modalidad[] = ["retiro", "domicilio", "en_sitio"];
const ORIGENES: Pedido["origen"][] = ["whatsapp", "operador"];

/** Minutos atrás dentro de una ventana amplia (hasta ~9 días). */
const arbMinsAtras = fc.integer({ min: 0, max: 13000 });

const arbItem = fc.record({
  nombre: fc.constantFrom("Item A", "Item B", "Item C"),
  cantidad: fc.integer({ min: 1, max: 5 }),
  precio: fc.integer({ min: 0, max: 50000 }),
});

/** Arbitrary de un Pedido mínimo válido y coherente. */
const arbPedido = fc
  .record({
    idn: fc.integer({ min: 0, max: 1_000_000 }),
    estado: fc.constantFrom(...ESTADOS),
    modalidad: fc.constantFrom(...MODALIDADES),
    origen: fc.constantFrom(...ORIGENES),
    items: fc.array(arbItem, { minLength: 1, maxLength: 4 }),
    createdMins: arbMinsAtras,
    estadoMins: arbMinsAtras,
    finishedMins: arbMinsAtras,
  })
  .map(({ idn, estado, modalidad, origen, items, createdMins, estadoMins, finishedMins }): Pedido => {
    const createdAt = minutesAgoIso(createdMins);
    const esTerminal = estado === "entregado" || estado === "cancelado";
    return {
      id: `fc-${idn}`,
      numero: `P-${pad(idn % 1000)}`,
      cliente: "Cliente",
      telefono: "+573000000000",
      modalidad,
      items,
      estado,
      origen,
      createdAt,
      estadoDesde: minutesAgoIso(Math.min(estadoMins, createdMins)),
      finishedAt: esTerminal ? minutesAgoIso(Math.min(finishedMins, createdMins)) : undefined,
      programadoPara:
        estado === "programado" ? new Date(Date.now() + 3600_000).toISOString() : undefined,
    };
  });

const arbDataset = fc.array(arbPedido, { maxLength: 25 });

/** Días candidatos: hoy y algunos días recientes para variar la comparación. */
const arbYmd = fc.constantFrom(
  hoyYmd(),
  new Date(Date.now() - 86_400_000).toISOString().slice(0, 10),
  new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10),
  new Date(Date.now() - 8 * 86_400_000).toISOString().slice(0, 10),
);

const KINDS_VALIDOS: Inference["kind"][] = ["correlation", "pattern", "hypothesis"];
const CONFIANZAS_VALIDAS: Inference["confidence"][] = ["baja", "media", "alta"];

// ═══════════════════════════════════════════════════════════════════════════
// Tarea 6.4 — Property 3: No causalidad
// Validates: Requirements 3.2, 11.2
// ═══════════════════════════════════════════════════════════════════════════

describe("Property 3: No causalidad", () => {
  it("toda inference de compararDias tiene kind ∈ {correlation, pattern, hypothesis}", async () => {
    await fc.assert(
      fc.asyncProperty(arbDataset, arbYmd, arbYmd, async (dataset, diaA, diaB) => {
        pedidosStore.pedidos = dataset;
        const res = await compararDias.run({ diaA, diaB });
        for (const inf of res.inferences ?? []) {
          expect(KINDS_VALIDOS).toContain(inf.kind);
        }
      }),
    );
  });

  it("toda inference de diagnosticoDesempeno tiene kind ∈ {correlation, pattern, hypothesis}", async () => {
    await fc.assert(
      fc.asyncProperty(arbDataset, async (dataset) => {
        pedidosStore.pedidos = dataset;
        const res = await diagnosticoDesempeno.run({});
        for (const inf of res.inferences ?? []) {
          expect(KINDS_VALIDOS).toContain(inf.kind);
        }
      }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tarea 6.5 — Property 4: Inferencias bien formadas y trazables
// Validates: Requirements 3.3, 3.4, 3.5, 3.6, 11.3
// ═══════════════════════════════════════════════════════════════════════════

describe("Property 4: Inferencias bien formadas y trazables", () => {
  const assertInferenciasTrazables = (res: {
    facts: { label: string }[];
    inferences?: Inference[];
  }) => {
    const labels = new Set(res.facts.map((f) => f.label));
    for (const inf of res.inferences ?? []) {
      expect(CONFIANZAS_VALIDAS).toContain(inf.confidence);
      expect(inf.basedOn.length).toBeGreaterThanOrEqual(1);
      for (const ref of inf.basedOn) {
        expect(labels.has(ref)).toBe(true);
      }
    }
  };

  it("compararDias: confidence válida, basedOn no vacío y trazable a Facts", async () => {
    await fc.assert(
      fc.asyncProperty(arbDataset, arbYmd, arbYmd, async (dataset, diaA, diaB) => {
        pedidosStore.pedidos = dataset;
        const res = await compararDias.run({ diaA, diaB });
        assertInferenciasTrazables(res);
      }),
    );
  });

  it("diagnosticoDesempeno: confidence válida, basedOn no vacío y trazable a Facts", async () => {
    await fc.assert(
      fc.asyncProperty(arbDataset, async (dataset) => {
        pedidosStore.pedidos = dataset;
        const res = await diagnosticoDesempeno.run({});
        assertInferenciasTrazables(res);
      }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getTopProductos — tool DECLARADA pero NO registrada
// ═══════════════════════════════════════════════════════════════════════════
//
// Esta tool no figura en `QUERY_TOOLS` ni en `ANALYZE_TOOLS`, así que el
// registry no la resuelve y ninguna regla de `REGLAS_INTENCION` apunta a ella:
// es inalcanzable por diseño. Precisamente por eso llevaba sin cobertura —y por
// eso conservaba, escondida en un `else`, una tabla de diez productos inventados
// en inglés ("Oversized T-Shirt", "Classic Tote Bag"…) que se habría mostrado al
// usuario como si fueran suyos si alguien hubiera registrado la tool.
//
// Estos tests fijan que el cálculo dice la verdad: o refleja los items reales
// del store, o va vacío. Nunca inventa.

describe("getTopProductos — no inventa datos", () => {
  it("no aparece en getTools(): es declarada, no registrada", () => {
    const ids = new PedidosToolProvider().getTools().map((t) => t.id);
    expect(ids).not.toContain("pedidos.getTopProductos");
    expect(ids).toHaveLength(10);
  });

  it("con pedidos reales, cada fila sale de los items del store", async () => {
    pedidosStore.pedidos = [
      makePedido({ items: [{ nombre: "Combo clásico", cantidad: 3, precio: 25000 }] }),
      makePedido({ items: [{ nombre: "Bebida 350ml", cantidad: 5, precio: 4000 }] }),
    ];
    const res = await getTopProductos.run({});
    const table = res.blocks?.find((b) => b.kind === "table") as
      | { columns: string[]; rows: (string | number)[][] }
      | undefined;

    const nombresReales = new Set(["Combo clásico", "Bebida 350ml"]);
    const nombresEnTabla = (table?.rows ?? []).map((r) => String(r[0]));

    expect(nombresEnTabla.length).toBeGreaterThan(0);
    for (const n of nombresEnTabla) {
      expect(nombresReales.has(n)).toBe(true);
    }
    // Ordenado por cantidad desc: "Bebida 350ml" (5) antes que "Combo clásico" (3).
    expect(nombresEnTabla[0]).toBe("Bebida 350ml");
  });

  it("sin pedidos la tabla va vacía, no rellena con productos de ejemplo", async () => {
    pedidosStore.pedidos = [];
    const res = await getTopProductos.run({});
    const table = res.blocks?.find((b) => b.kind === "table") as
      | { rows: (string | number)[][] }
      | undefined;

    expect(table?.rows ?? []).toHaveLength(0);
    // El Fact de líder lo dice en vez de inventar un producto.
    const lider = res.facts.find((f) => f.label === "Producto líder")!;
    expect(lider.value).toBe("Sin pedidos en el periodo");
  });

  it("las columnas describen solo campos que PedidoItem tiene, y en español", async () => {
    pedidosStore.pedidos = [makePedido()];
    const res = await getTopProductos.run({});
    const table = res.blocks?.find((b) => b.kind === "table") as
      | { title: string; columns: string[] }
      | undefined;

    // `PedidoItem` es {nombre, cantidad, precio?}: no hay categoría ni
    // devoluciones. "Category" (siempre "General") y "Returns" (siempre 0) eran
    // constantes disfrazadas de dato y se retiraron.
    expect(table?.columns).toEqual(["Producto", "Cantidad", "Pedidos", "Ventas"]);
    expect(table?.title).toBe("Top 10 productos");
    const plano = JSON.stringify(res);
    for (const prohibido of ["Oversized", "Tote Bag", "Category", "Returns", "Top 10 Products"]) {
      expect(plano).not.toContain(prohibido);
    }
  });
});
