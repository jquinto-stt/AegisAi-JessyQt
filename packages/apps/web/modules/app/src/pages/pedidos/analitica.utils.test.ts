import { describe, it, expect } from "vitest";

import type { Pedido } from "@/stores/pedidos.store";
import {
  OPCIONES_PERIODO,
  PERIODOS,
  rangoDePeriodo,
  diasDeSerie,
  etiquetaPeriodo,
  ymdLocal,
  filtrarLista,
  ordenarLista,
  paginar,
  esColumnaOrden,
  FILTROS_LISTA_VACIOS,
  escaparCampoCsv,
  construirCsv,
  filasCsv,
  nombreArchivoCsv,
  fechaLegibleCsv,
  CSV_ENCABEZADOS,
  TAMANOS_PAGINA,
  diasDelRango,
  diasCubiertos,
  promediosDePedidos,
  ORDEN_ESTADO,
  COLOR_ESTADO,
  COLOR_ORIGEN,
  COLOR_MODALIDAD,
} from "./analitica.utils";

// ── Helper: pedido mínimo válido con overrides ──────────────────────────────

let seq = 0;
function makePedido(overrides: Partial<Pedido> = {}): Pedido {
  seq += 1;
  const created = overrides.createdAt ?? new Date().toISOString();
  return {
    id: overrides.id ?? `t-${seq}`,
    numero: overrides.numero ?? `P-${String(seq).padStart(3, "0")}`,
    cliente: overrides.cliente ?? "Cliente Test",
    telefono: overrides.telefono ?? "+573000000000",
    modalidad: overrides.modalidad ?? "retiro",
    items: overrides.items ?? [{ nombre: "Item", cantidad: 1, precio: 1000 }],
    estado: overrides.estado ?? "nuevo",
    origen: overrides.origen ?? "whatsapp",
    createdAt: created,
    estadoDesde: overrides.estadoDesde ?? created,
    ...overrides,
  };
}

/** Etiquetas de prueba: reflejan lo que el store devolvería. */
const etiquetas = {
  origenLabel: (o: string) => (o === "whatsapp" ? "WhatsApp" : "Mostrador"),
  modalidadLabel: (m: string) =>
    m === "retiro" ? "Retiro" : m === "domicilio" ? "Domicilio" : "En sitio",
  estadoLabel: (e: string) => e,
} as unknown as Parameters<typeof filasCsv>[1];

// ═══════════════════════════════════════════════════════════════════════════
// PERIODOS
// ═══════════════════════════════════════════════════════════════════════════

describe("analitica.utils — periodos", () => {
  it("PERIODOS contiene exactamente las tres opciones requeridas", () => {
    expect([...PERIODOS]).toEqual(["7d", "30d", "todo"]);
  });

  it("OPCIONES_PERIODO expone 7 días, 30 días y todo el historial", () => {
    expect(OPCIONES_PERIODO.map((o) => o.value)).toEqual(["7d", "30d", "todo"]);
    expect(OPCIONES_PERIODO.map((o) => o.label)).toEqual([
      "Últimos 7 días",
      "Últimos 30 días",
      "Todo el historial",
    ]);
  });

  it("etiquetaPeriodo traduce cada clave", () => {
    expect(etiquetaPeriodo("7d")).toBe("Últimos 7 días");
    expect(etiquetaPeriodo("30d")).toBe("Últimos 30 días");
    expect(etiquetaPeriodo("todo")).toBe("Todo el historial");
  });

  it("rangoDePeriodo('todo') es null (sin filtro)", () => {
    expect(rangoDePeriodo("todo")).toBeNull();
  });

  it("rangoDePeriodo('7d') abarca hoy y los 6 días anteriores (7 días inclusive)", () => {
    const ref = new Date(2026, 8, 17, 12, 0); // 2026-09-17 local
    expect(rangoDePeriodo("7d", ref)).toEqual({ desde: "2026-09-11", hasta: "2026-09-17" });
  });

  it("rangoDePeriodo('30d') abarca 30 días inclusive", () => {
    const ref = new Date(2026, 8, 17, 12, 0);
    expect(rangoDePeriodo("30d", ref)).toEqual({ desde: "2026-08-19", hasta: "2026-09-17" });
  });

  it("rangoDePeriodo cruza el cambio de mes correctamente", () => {
    const ref = new Date(2026, 2, 3, 9, 0); // 2026-03-03 local
    expect(rangoDePeriodo("7d", ref)).toEqual({ desde: "2026-02-25", hasta: "2026-03-03" });
  });

  it("rangoDePeriodo usa el día LOCAL, no el UTC (no se corre de día)", () => {
    // 2026-09-17T02:00Z es 2026-09-16 21:00 en UTC-5: el rango debe cerrar el 16.
    const ref = new Date("2026-09-17T02:00:00Z");
    const rango = rangoDePeriodo("7d", ref)!;
    expect(rango.hasta).toBe(ymdLocal(ref));
  });

  it("diasDeSerie devuelve la ventana del periodo y acota 'todo' a 30", () => {
    expect(diasDeSerie("7d")).toBe(7);
    expect(diasDeSerie("30d")).toBe(30);
    expect(diasDeSerie("todo")).toBe(30);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FILTROS DE LA VISTA LISTA
// ═══════════════════════════════════════════════════════════════════════════

describe("analitica.utils — filtrarLista", () => {
  const pedidos = [
    makePedido({ numero: "P-001", cliente: "Juan Carlos", telefono: "+573001112233", estado: "nuevo" }),
    makePedido({ numero: "P-002", cliente: "María Fernanda", telefono: "+573002223344", estado: "entregado" }),
    makePedido({ numero: "P-003", cliente: "Pedro Ramírez", telefono: "+573003334455", estado: "cancelado" }),
  ];

  it("sin filtros devuelve todo", () => {
    expect(filtrarLista(pedidos, FILTROS_LISTA_VACIOS)).toHaveLength(3);
  });

  it("filtra por estado exacto", () => {
    const out = filtrarLista(pedidos, { busqueda: "", estado: "entregado" });
    expect(out.map((p) => p.numero)).toEqual(["P-002"]);
  });

  it("busca por nombre de cliente sin distinguir mayúsculas", () => {
    const out = filtrarLista(pedidos, { busqueda: "MARÍA", estado: "" });
    expect(out.map((p) => p.numero)).toEqual(["P-002"]);
  });

  it("busca por número de pedido", () => {
    expect(filtrarLista(pedidos, { busqueda: "p-003", estado: "" })[0]!.numero).toBe("P-003");
  });

  it("busca por teléfono", () => {
    expect(filtrarLista(pedidos, { busqueda: "3334455", estado: "" })[0]!.numero).toBe("P-003");
  });

  it("combina búsqueda y estado", () => {
    expect(filtrarLista(pedidos, { busqueda: "pedro", estado: "cancelado" })).toHaveLength(1);
    expect(filtrarLista(pedidos, { busqueda: "pedro", estado: "nuevo" })).toHaveLength(0);
  });

  it("ignora espacios alrededor de la búsqueda", () => {
    expect(filtrarLista(pedidos, { busqueda: "   juan   ", estado: "" })).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ORDEN
// ═══════════════════════════════════════════════════════════════════════════

describe("analitica.utils — ordenarLista", () => {
  const a = makePedido({
    numero: "P-001",
    cliente: "Zoe",
    createdAt: "2026-09-01T10:00:00.000Z",
    items: [{ nombre: "X", cantidad: 1, precio: 5000 }],
  });
  const b = makePedido({
    numero: "P-002",
    cliente: "Ana",
    createdAt: "2026-09-02T10:00:00.000Z",
    items: [{ nombre: "X", cantidad: 1, precio: 1000 }],
  });
  const base = [a, b];

  it("ordena por total descendente", () => {
    const out = ordenarLista(base, { columna: "total", direccion: "desc" });
    expect(out.map((p) => p.numero)).toEqual(["P-001", "P-002"]);
  });

  it("ordena por total ascendente", () => {
    const out = ordenarLista(base, { columna: "total", direccion: "asc" });
    expect(out.map((p) => p.numero)).toEqual(["P-002", "P-001"]);
  });

  it("ordena por cliente alfabéticamente", () => {
    expect(ordenarLista(base, { columna: "cliente", direccion: "asc" }).map((p) => p.cliente)).toEqual([
      "Ana",
      "Zoe",
    ]);
  });

  it("ordena por fecha descendente", () => {
    expect(ordenarLista(base, { columna: "fecha", direccion: "desc" }).map((p) => p.numero)).toEqual([
      "P-002",
      "P-001",
    ]);
  });

  it("no muta la lista de entrada", () => {
    const copia = [...base];
    ordenarLista(base, { columna: "total", direccion: "asc" });
    expect(base).toEqual(copia);
  });

  it("esColumnaOrden valida entradas y rechaza desconocidas", () => {
    expect(esColumnaOrden("total")).toBe(true);
    expect(esColumnaOrden("fecha")).toBe(true);
    expect(esColumnaOrden("inventada")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PAGINACIÓN
// ═══════════════════════════════════════════════════════════════════════════

describe("analitica.utils — paginar", () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it("devuelve la primera página con el tamaño pedido", () => {
    const p = paginar(items, 1, 10);
    expect(p.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(p.totalPaginas).toBe(3);
    expect(p.totalItems).toBe(25);
  });

  it("devuelve la última página parcial", () => {
    const p = paginar(items, 3, 10);
    expect(p.items).toEqual([21, 22, 23, 24, 25]);
    expect(p.pagina).toBe(3);
  });

  it("acota una página pedida más allá del final", () => {
    const p = paginar(items, 99, 10);
    expect(p.pagina).toBe(3);
    expect(p.items).toHaveLength(5);
  });

  it("acota una página menor que 1", () => {
    expect(paginar(items, 0, 10).pagina).toBe(1);
    expect(paginar(items, -5, 10).pagina).toBe(1);
  });

  it("con lista vacía devuelve 1 página vacía (no '0 de 0')", () => {
    const p = paginar([], 1, 10);
    expect(p.totalPaginas).toBe(1);
    expect(p.totalItems).toBe(0);
    expect(p.items).toEqual([]);
  });

  it("los tamaños de página ofrecidos son 10, 25 y 50", () => {
    expect([...TAMANOS_PAGINA]).toEqual([10, 25, 50]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CSV
// ═══════════════════════════════════════════════════════════════════════════

describe("analitica.utils — CSV", () => {
  it("no entrecomilla campos simples", () => {
    expect(escaparCampoCsv("Juan")).toBe("Juan");
    expect(escaparCampoCsv(25000)).toBe("25000");
  });

  it("entrecomilla y duplica comillas internas", () => {
    expect(escaparCampoCsv('Pérez, "el jefe"')).toBe('"Pérez, ""el jefe"""');
  });

  it("entrecomilla campos con coma", () => {
    expect(escaparCampoCsv("Combo, doble")).toBe('"Combo, doble"');
  });

  it("entrecomilla campos con salto de línea", () => {
    expect(escaparCampoCsv("linea1\nlinea2")).toBe('"linea1\nlinea2"');
  });

  it("construirCsv une encabezado y filas con CRLF", () => {
    const csv = construirCsv(["A", "B"], [[1, 2], [3, 4]]);
    expect(csv).toBe("A,B\r\n1,2\r\n3,4");
  });

  it("construirCsv respeta el escape en todas las filas", () => {
    const csv = construirCsv(["Nombre"], [["a,b"]]);
    expect(csv).toBe('Nombre\r\n"a,b"');
  });

  it("CSV_ENCABEZADOS son las 8 columnas de la vista lista", () => {
    expect([...CSV_ENCABEZADOS]).toEqual([
      "ID Pedido",
      "Cliente",
      "Teléfono",
      "Canal",
      "Modalidad",
      "Monto Total",
      "Estado",
      "Fecha",
    ]);
  });

  it("filasCsv proyecta cada pedido con las etiquetas del store y el total", () => {
    const p = makePedido({
      numero: "P-042",
      cliente: "Ana",
      telefono: "+573001112233",
      origen: "operador",
      modalidad: "domicilio",
      estado: "en_preparacion",
      items: [{ nombre: "X", cantidad: 3, precio: 25000 }],
      createdAt: "2026-09-17T15:30:00.000Z",
    });
    const [fila] = filasCsv([p], etiquetas);
    expect(fila![0]).toBe("P-042");
    expect(fila![1]).toBe("Ana");
    expect(fila![2]).toBe("+573001112233");
    expect(fila![3]).toBe("Mostrador");
    expect(fila![4]).toBe("Domicilio");
    expect(fila![5]).toBe(75000);
    expect(fila![6]).toBe("en_preparacion");
  });

  it("filasCsv calcula el total ignorando items sin precio", () => {
    const p = makePedido({
      items: [
        { nombre: "A", cantidad: 2, precio: 1000 },
        { nombre: "B", cantidad: 1 }, // sin precio
      ],
    });
    expect(filasCsv([p], etiquetas)[0]![5]).toBe(2000);
  });

  it("nombra el archivo stockflow-analitica-YYYY-MM-DD.csv", () => {
    expect(nombreArchivoCsv(new Date(2026, 8, 17, 12, 0))).toBe("stockflow-analitica-2026-09-17.csv");
  });

  it("fechaLegibleCsv produce 'YYYY-MM-DD HH:mm' local", () => {
    const out = fechaLegibleCsv("2026-09-17T15:30:00.000Z");
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it("fechaLegibleCsv devuelve '' con una fecha inválida", () => {
    expect(fechaLegibleCsv("no-es-fecha")).toBe("");
  });

  it("un pedido con cliente entrecomillado sobrevive al ciclo CSV", () => {
    const p = makePedido({ cliente: 'Pérez, "el jefe"', numero: "P-1", telefono: "+1" });
    const csv = construirCsv([...CSV_ENCABEZADOS], filasCsv([p], etiquetas));
    const [header, fila] = csv.split("\r\n");
    expect(header!.split(",")).toHaveLength(8);
    // La coma y las comillas del cliente quedan dentro de un único campo.
    expect(fila).toContain('"Pérez, ""el jefe"""');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MÉTRICAS DERIVADAS DE LA VENTANA
// ═══════════════════════════════════════════════════════════════════════════

describe("analitica.utils — métricas derivadas", () => {
  it("diasDelRango cuenta ambos extremos inclusive", () => {
    expect(diasDelRango("2026-09-11", "2026-09-17")).toBe(7);
    expect(diasDelRango("2026-09-17", "2026-09-17")).toBe(1);
    expect(diasDelRango("2026-08-19", "2026-09-17")).toBe(30);
  });

  it("diasDelRango devuelve 1 con un rango invertido o inválido (nunca divide entre 0)", () => {
    expect(diasDelRango("2026-09-17", "2026-09-10")).toBe(1);
    expect(diasDelRango("", "")).toBe(1);
    expect(diasDelRango("no-es-fecha", "2026-09-17")).toBe(1);
  });

  it("diasCubiertos mide del día local más antiguo al más reciente", () => {
    expect(diasCubiertos([])).toBe(1);
    expect(diasCubiertos(["2026-09-17T15:00:00"])).toBe(1);
    // 11 y 17 inclusive = 7 días.
    expect(diasCubiertos(["2026-09-17T12:00:00", "2026-09-11T12:00:00"])).toBe(7);
  });

  it("diasCubiertos ignora instantes inválidos", () => {
    expect(diasCubiertos(["no-es-fecha", "2026-09-17T12:00:00"])).toBe(1);
  });

  it("promediosDePedidos deriva la tasa diaria y la proyecta a 7 y 30 días", () => {
    expect(promediosDePedidos(70, 7)).toEqual({ diario: 10, semanal: 70, mensual: 300 });
  });

  it("promediosDePedidos da 0 con total 0 y nunca divide entre 0 días", () => {
    expect(promediosDePedidos(0, 7)).toEqual({ diario: 0, semanal: 0, mensual: 0 });
    expect(promediosDePedidos(5, 0).diario).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGOS DE PRESENTACIÓN
// ═══════════════════════════════════════════════════════════════════════════

describe("analitica.utils — catálogos de presentación", () => {
  it("ORDEN_ESTADO cubre los 8 estados del pipeline sin repetir", () => {
    expect(ORDEN_ESTADO).toHaveLength(8);
    expect(new Set(ORDEN_ESTADO).size).toBe(8);
  });

  it("COLOR_ESTADO define un color válido para cada estado", () => {
    for (const e of ORDEN_ESTADO) {
      expect(COLOR_ESTADO[e]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("los colores de canal y modalidad cubren todo su vocabulario", () => {
    expect(Object.keys(COLOR_ORIGEN).sort()).toEqual(["operador", "whatsapp"]);
    expect(Object.keys(COLOR_MODALIDAD).sort()).toEqual(["domicilio", "en_sitio", "retiro"]);
  });
});
