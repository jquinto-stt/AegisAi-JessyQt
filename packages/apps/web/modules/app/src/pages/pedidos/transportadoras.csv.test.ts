import { describe, it, expect } from "vitest";

import type { ConfiguracionFija, Recoleccion } from "@/domain/pedidos/recolecciones.domain";
import {
  CSV_CITAS_ENCABEZADOS,
  CSV_FIJAS_ENCABEZADOS,
  csvCitas,
  csvFijas,
  filasCsvCitas,
  filasCsvFijas,
  nombreArchivoRecolecciones,
} from "./transportadoras.csv";

const cita = (cambios: Partial<Recoleccion> = {}): Recoleccion => ({
  id: "rec-1",
  codigo: "REC-0001",
  tipo: "eventual",
  transportadora: "Envía",
  bodega: "Bodega Principal",
  fecha: "2026-10-28",
  horario: "14:00 - 16:00",
  paquetes: 24,
  despacha: "María Restrepo",
  estado: "programada",
  creadaEn: "2026-10-27T10:00:00.000Z",
  ...cambios,
});

const fija = (cambios: Partial<ConfiguracionFija> = {}): ConfiguracionFija => ({
  id: "cfg-1",
  transportadora: "Envía",
  activa: true,
  dias: ["jueves", "martes"],
  bodega: "Bodega Principal",
  direccion: "Calle 36 Sur #48B-85, Medellín",
  despachaNombre: "Fulanito",
  despachaApellidos: "De Tal",
  rango: "tarde",
  paquetes: 24,
  notas: "Llamar al llegar",
  actualizadaEn: "2026-10-27T10:00:00.000Z",
  ...cambios,
});

describe("transportadoras.csv — citas eventuales", () => {
  it("una fila por cita, en el orden de la tabla", () => {
    expect(filasCsvCitas([cita()])[0]).toEqual([
      "REC-0001",
      "Envía",
      "Bodega Principal",
      "2026-10-28",
      "14:00 - 16:00",
      "Programada",
      24,
      "María Restrepo",
    ]);
  });

  it("traduce el estado a su etiqueta y no al código interno", () => {
    expect(filasCsvCitas([cita({ estado: "con_novedad" })])[0][5]).toBe("Con novedad");
  });

  it("el CSV lleva la cabecera y una línea por fila", () => {
    const csv = csvCitas([cita(), cita({ id: "rec-2", codigo: "REC-0002" })]);
    const lineas = csv.split("\r\n");
    expect(lineas).toHaveLength(3);
    expect(lineas[0]).toBe(CSV_CITAS_ENCABEZADOS.join(","));
  });

  it("una bodega con coma no rompe las columnas", () => {
    const csv = csvCitas([cita({ bodega: "Bodega Norte, bloque B" })]);
    expect(csv.split("\r\n")[1]).toContain('"Bodega Norte, bloque B"');
  });

  it("sin citas solo queda la cabecera", () => {
    expect(csvCitas([])).toBe(CSV_CITAS_ENCABEZADOS.join(","));
  });
});

describe("transportadoras.csv — recolecciones fijas", () => {
  it("una fila por regla, con los días y el horario en palabras", () => {
    expect(filasCsvFijas([fija()])[0]).toEqual([
      "Envía",
      "Martes y jueves",
      "Tarde",
      "12:00 PM - 5:00 PM",
      "Bodega Principal",
      "Calle 36 Sur #48B-85, Medellín",
      "Fulanito De Tal",
      24,
      "Llamar al llegar",
      "Sí",
    ]);
  });

  it("dice «No» cuando la regla está pausada", () => {
    expect(filasCsvFijas([fija({ activa: false })])[0][9]).toBe("No");
  });

  it("junta nombre y apellidos sin dejar espacios de más", () => {
    expect(filasCsvFijas([fija({ despachaApellidos: "" })])[0][6]).toBe("Fulanito");
  });

  it("el CSV lleva la cabecera de reglas", () => {
    const lineas = csvFijas([fija()]).split("\r\n");
    expect(lineas[0]).toBe(CSV_FIJAS_ENCABEZADOS.join(","));
    expect(lineas).toHaveLength(2);
  });
});

describe("transportadoras.csv — nombre del archivo", () => {
  it("lleva el tipo y la fecha local", () => {
    expect(nombreArchivoRecolecciones("eventual", new Date(2026, 9, 27))).toBe(
      "recolecciones-eventual-2026-10-27.csv",
    );
    expect(nombreArchivoRecolecciones("fija", new Date(2026, 0, 5))).toBe(
      "recolecciones-fija-2026-01-05.csv",
    );
  });
});
