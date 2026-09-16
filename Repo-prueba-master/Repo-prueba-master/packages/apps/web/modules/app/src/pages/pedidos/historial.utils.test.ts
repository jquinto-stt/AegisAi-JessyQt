import { describe, it, expect } from "vitest";
import { filtrarHistorial, FILTROS_VACIOS, type HistorialFiltros } from "./historial.utils";
import type { Pedido } from "@/stores/pedidos.store";

// ═══════════════════════════════════════════════════════════════════════════
// FIXTURE
// ═══════════════════════════════════════════════════════════════════════════

const pedido = (over: Partial<Pedido>): Pedido => ({
  id: over.id ?? "x",
  numero: over.numero ?? "P-000",
  cliente: over.cliente ?? "Cliente",
  telefono: "+1",
  modalidad: over.modalidad ?? "retiro",
  items: [],
  estado: over.estado ?? "entregado",
  origen: "whatsapp",
  createdAt: over.createdAt ?? "2026-09-10T10:00:00.000Z",
  estadoDesde: over.estadoDesde ?? "2026-09-10T10:00:00.000Z",
  finishedAt: over.finishedAt,
  notas: over.notas,
});

const DATA: Pedido[] = [
  pedido({ id: "1", numero: "P-001", cliente: "Ana López", estado: "entregado", modalidad: "domicilio", finishedAt: "2026-09-10T12:00:00.000Z" }),
  pedido({ id: "2", numero: "P-002", cliente: "Bruno Díaz", estado: "cancelado", modalidad: "retiro", finishedAt: "2026-09-11T09:00:00.000Z" }),
  pedido({ id: "3", numero: "P-003", cliente: "Ana Ramírez", estado: "entregado", modalidad: "en_sitio", finishedAt: "2026-09-12T15:00:00.000Z" }),
];

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("filtrarHistorial", () => {
  it("sin filtros devuelve todos", () => {
    expect(filtrarHistorial(DATA, FILTROS_VACIOS)).toHaveLength(3);
  });

  it("filtra por estado", () => {
    const res = filtrarHistorial(DATA, { ...FILTROS_VACIOS, estado: "entregado" });
    expect(res.map((p) => p.id)).toEqual(["1", "3"]);
  });

  it("filtra por modalidad", () => {
    const res = filtrarHistorial(DATA, { ...FILTROS_VACIOS, modalidad: "retiro" });
    expect(res.map((p) => p.id)).toEqual(["2"]);
  });

  it("busca por nombre de cliente (case-insensitive, parcial)", () => {
    const res = filtrarHistorial(DATA, { ...FILTROS_VACIOS, busqueda: "ana" });
    expect(res.map((p) => p.id)).toEqual(["1", "3"]);
  });

  it("busca por número de pedido", () => {
    const res = filtrarHistorial(DATA, { ...FILTROS_VACIOS, busqueda: "P-002" });
    expect(res.map((p) => p.id)).toEqual(["2"]);
  });

  it("filtra por rango de fechas (desde/hasta inclusive)", () => {
    const f: HistorialFiltros = { ...FILTROS_VACIOS, desde: "2026-09-11", hasta: "2026-09-11" };
    expect(filtrarHistorial(DATA, f).map((p) => p.id)).toEqual(["2"]);
  });

  it("combina filtros (AND)", () => {
    const f: HistorialFiltros = { ...FILTROS_VACIOS, estado: "entregado", modalidad: "en_sitio" };
    expect(filtrarHistorial(DATA, f).map((p) => p.id)).toEqual(["3"]);
  });

  it("usa createdAt si no hay finishedAt", () => {
    const sinFinish = [pedido({ id: "9", numero: "P-009", estado: "cancelado", createdAt: "2026-09-05T08:00:00.000Z" })];
    const f: HistorialFiltros = { ...FILTROS_VACIOS, hasta: "2026-09-05" };
    expect(filtrarHistorial(sinFinish, f).map((p) => p.id)).toEqual(["9"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RESUMEN / TIMELINE (vistas nuevas del historial)
// ═══════════════════════════════════════════════════════════════════════════

import { resumenHistorial, agruparPorDia } from "./historial.utils";

const conItems = (over: Partial<Pedido>, precio: number, cantidad: number): Pedido => ({
  ...pedido(over),
  items: [{ nombre: "X", cantidad, precio }],
});

describe("resumenHistorial", () => {
  it("cuenta entregados/cancelados y calcula tasa de cancelación", () => {
    const data: Pedido[] = [
      pedido({ id: "1", estado: "entregado" }),
      pedido({ id: "2", estado: "entregado" }),
      pedido({ id: "3", estado: "cancelado" }),
      pedido({ id: "4", estado: "cancelado" }),
    ];
    const r = resumenHistorial(data);
    expect(r.total).toBe(4);
    expect(r.entregados).toBe(2);
    expect(r.cancelados).toBe(2);
    expect(r.tasaCancelacion).toBe(50);
  });

  it("ticket promedio y total facturado solo cuentan entregados con precio", () => {
    const data: Pedido[] = [
      conItems({ id: "1", estado: "entregado" }, 1000, 2), // 2000
      conItems({ id: "2", estado: "entregado" }, 500, 2), // 1000
      conItems({ id: "3", estado: "cancelado" }, 9999, 5), // no cuenta (cancelado)
    ];
    const r = resumenHistorial(data);
    expect(r.totalFacturado).toBe(3000);
    expect(r.ticketPromedio).toBe(1500); // (2000+1000)/2 entregados con valor
  });

  it("agrupa por modalidad ordenado de mayor a menor", () => {
    const data: Pedido[] = [
      pedido({ id: "1", modalidad: "retiro", estado: "entregado" }),
      pedido({ id: "2", modalidad: "retiro", estado: "entregado" }),
      pedido({ id: "3", modalidad: "domicilio", estado: "cancelado" }),
    ];
    const r = resumenHistorial(data);
    expect(r.porModalidad[0]).toEqual({ modalidad: "retiro", cantidad: 2 });
    expect(r.porModalidad[1]).toEqual({ modalidad: "domicilio", cantidad: 1 });
  });

  it("conjunto vacío → todo en cero", () => {
    const r = resumenHistorial([]);
    expect(r.total).toBe(0);
    expect(r.tasaCancelacion).toBe(0);
    expect(r.ticketPromedio).toBe(0);
    expect(r.porModalidad).toEqual([]);
  });
});

describe("agruparPorDia", () => {
  it("agrupa por día de cierre y ordena del más reciente al más antiguo", () => {
    const data: Pedido[] = [
      pedido({ id: "1", estado: "entregado", finishedAt: "2026-09-10T12:00:00.000Z" }),
      pedido({ id: "2", estado: "cancelado", finishedAt: "2026-09-12T09:00:00.000Z" }),
      pedido({ id: "3", estado: "entregado", finishedAt: "2026-09-10T15:00:00.000Z" }),
    ];
    const grupos = agruparPorDia(data);
    expect(grupos.map((g) => g.dia)).toEqual(["2026-09-12", "2026-09-10"]);
    // El día 10 tiene 2 pedidos, con resumen propio.
    const dia10 = grupos.find((g) => g.dia === "2026-09-10")!;
    expect(dia10.pedidos).toHaveLength(2);
    expect(dia10.resumen.total).toBe(2);
    expect(dia10.resumen.entregados).toBe(2);
  });

  it("usa createdAt cuando no hay finishedAt", () => {
    const data = [pedido({ id: "9", estado: "cancelado", createdAt: "2026-09-05T08:00:00.000Z", finishedAt: undefined })];
    const grupos = agruparPorDia(data);
    expect(grupos[0].dia).toBe("2026-09-05");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HEATMAP: matriz modalidad × día de la semana
// ═══════════════════════════════════════════════════════════════════════════

import { matrizModalidadDia, DIAS_SEMANA } from "./historial.utils";
import type { Modalidad } from "@/stores/pedidos.store";

const lbl = (m: Modalidad) => ({ retiro: "Retiro", domicilio: "Domicilio", en_sitio: "En sitio" }[m]);

describe("matrizModalidadDia", () => {
  it("una serie por modalidad presente, cada una con 7 días", () => {
    // 2026-09-14 es lunes.
    const data: Pedido[] = [
      pedido({ id: "1", modalidad: "retiro", estado: "entregado", finishedAt: "2026-09-14T10:00:00.000Z" }),
      pedido({ id: "2", modalidad: "domicilio", estado: "entregado", finishedAt: "2026-09-14T11:00:00.000Z" }),
    ];
    const series = matrizModalidadDia(data, lbl);
    expect(series.map((s) => s.name).sort()).toEqual(["Domicilio", "Retiro"]);
    series.forEach((s) => expect(s.data).toHaveLength(DIAS_SEMANA.length));
  });

  it("cuenta los pedidos en la celda del día correcto (lunes)", () => {
    const data: Pedido[] = [
      pedido({ id: "1", modalidad: "retiro", estado: "entregado", finishedAt: "2026-09-14T10:00:00.000Z" }), // lunes
      pedido({ id: "2", modalidad: "retiro", estado: "cancelado", finishedAt: "2026-09-14T12:00:00.000Z" }), // lunes
    ];
    const [serieRetiro] = matrizModalidadDia(data, lbl);
    const lunes = serieRetiro.data.find((d) => d.x === "Lun")!;
    expect(lunes.y).toBe(2);
    // El resto de días en 0.
    expect(serieRetiro.data.filter((d) => d.x !== "Lun").every((d) => d.y === 0)).toBe(true);
  });

  it("no incluye modalidades sin pedidos", () => {
    const data = [pedido({ id: "1", modalidad: "retiro", estado: "entregado", finishedAt: "2026-09-14T10:00:00.000Z" })];
    const series = matrizModalidadDia(data, lbl);
    expect(series).toHaveLength(1);
    expect(series[0].name).toBe("Retiro");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVIDAD DIARIA (heatmap tipo GitHub)
// ═══════════════════════════════════════════════════════════════════════════

import { actividadDiaria } from "./historial.utils";

describe("actividadDiaria", () => {
  const REF = new Date("2026-09-15T12:00:00.000Z"); // referencia fija

  it("devuelve exactamente `dias` celdas, del más antiguo al más reciente", () => {
    const celdas = actividadDiaria([], 15, REF);
    expect(celdas).toHaveLength(15);
    expect(celdas[0].fecha < celdas[celdas.length - 1].fecha).toBe(true);
    // La última celda es el día de referencia.
    expect(celdas[celdas.length - 1].fecha).toBe("2026-09-15");
  });

  it("cuenta los pedidos en el día correcto y deja 0 en los vacíos", () => {
    const data: Pedido[] = [
      pedido({ id: "1", estado: "entregado", finishedAt: "2026-09-15T10:00:00.000Z" }),
      pedido({ id: "2", estado: "cancelado", finishedAt: "2026-09-15T18:00:00.000Z" }),
      pedido({ id: "3", estado: "entregado", finishedAt: "2026-09-14T09:00:00.000Z" }),
    ];
    const celdas = actividadDiaria(data, 30, REF);
    const dia15 = celdas.find((c) => c.fecha === "2026-09-15")!;
    const dia14 = celdas.find((c) => c.fecha === "2026-09-14")!;
    const dia13 = celdas.find((c) => c.fecha === "2026-09-13")!;
    expect(dia15.cantidad).toBe(2);
    expect(dia14.cantidad).toBe(1);
    expect(dia13.cantidad).toBe(0);
  });

  it("ignora pedidos fuera del rango de días", () => {
    const data = [pedido({ id: "x", estado: "entregado", finishedAt: "2026-08-01T10:00:00.000Z" })];
    const celdas = actividadDiaria(data, 15, REF); // 15 días antes del 15 sep no llega a agosto
    expect(celdas.reduce((s, c) => s + c.cantidad, 0)).toBe(0);
  });
});

import { enSemanas } from "./historial.utils";

describe("enSemanas", () => {
  it("agrupa en columnas de 7 (Lun→Dom) con relleno inicial", () => {
    // 2026-09-15 es martes → primerIdx = 1 (un null antes).
    const celdas = actividadDiaria([], 15, new Date("2026-09-01T12:00:00.000Z"));
    const semanas = enSemanas(celdas);
    // Todas las semanas tienen 7 posiciones.
    semanas.forEach((s) => expect(s).toHaveLength(7));
    // El total de celdas no nulas coincide con la cantidad de días.
    const noNulas = semanas.flat().filter((c) => c !== null).length;
    expect(noNulas).toBe(15);
  });

  it("lista vacía → sin semanas", () => {
    expect(enSemanas([])).toEqual([]);
  });
});

import { actividadEntre } from "./historial.utils";

describe("actividadEntre", () => {
  it("genera una celda por día entre desde y hasta (inclusive)", () => {
    const celdas = actividadEntre([], "2026-09-10", "2026-09-14");
    expect(celdas.map((c) => c.fecha)).toEqual([
      "2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13", "2026-09-14",
    ]);
  });

  it("cuenta pedidos por día de cierre dentro del rango", () => {
    const data: Pedido[] = [
      pedido({ id: "1", estado: "entregado", finishedAt: "2026-09-11T10:00:00.000Z" }),
      pedido({ id: "2", estado: "cancelado", finishedAt: "2026-09-11T18:00:00.000Z" }),
    ];
    const celdas = actividadEntre(data, "2026-09-10", "2026-09-12");
    expect(celdas.find((c) => c.fecha === "2026-09-11")!.cantidad).toBe(2);
    expect(celdas.find((c) => c.fecha === "2026-09-10")!.cantidad).toBe(0);
  });

  it("rango inválido o incompleto → vacío", () => {
    expect(actividadEntre([], "2026-09-14", "2026-09-10")).toEqual([]);
    expect(actividadEntre([], "", "2026-09-10")).toEqual([]);
  });
});

import { agruparPorMes } from "./historial.utils";

describe("agruparPorMes", () => {
  it("crea un bloque por mes calendario, en orden cronológico", () => {
    const celdas = actividadEntre([], "2026-08-28", "2026-09-03"); // cruza ago→sep
    const meses = agruparPorMes(celdas);
    expect(meses.map((m) => m.clave)).toEqual(["2026-08", "2026-09"]);
    expect(meses[0].label).toBe("Ago");
    expect(meses[1].label).toBe("Sep");
    // Cada bloque trae semanas de 7 posiciones.
    meses.forEach((m) => m.semanas.forEach((s) => expect(s).toHaveLength(7)));
  });

  it("añade el año a la etiqueta cuando el rango cruza más de un año", () => {
    const celdas = actividadEntre([], "2025-12-30", "2026-01-02");
    const meses = agruparPorMes(celdas);
    expect(meses.map((m) => m.label)).toEqual(["Dic 25", "Ene 26"]);
  });

  it("lista vacía → sin bloques", () => {
    expect(agruparPorMes([])).toEqual([]);
  });
});
