/**
 * Exportación a CSV de las recolecciones.
 *
 * Mismas columnas que la tabla y que la tarjeta, en el mismo orden: un archivo
 * que no se parece a lo que se está mirando obliga a reconstruir mentalmente a
 * qué corresponde cada columna.
 *
 * Las funciones son puras —devuelven texto— y la descarga la dispara la página
 * con `descargarCsv`, igual que el resto de exportaciones del módulo.
 */
import {
  ETIQUETA_ESTADO_RECOLECCION,
  ETIQUETA_RANGO,
  HORARIO_RANGO,
  frecuenciaLegible,
  type ConfiguracionFija,
  type Recoleccion,
} from "@/domain/pedidos/recolecciones.domain";
import { construirCsv, ymdLocal } from "./analitica.utils";

export const CSV_CITAS_ENCABEZADOS = [
  "Id de recolección",
  "Transportadora",
  "Bodega",
  "Fecha programada",
  "Horario",
  "Estado",
  "N.º de paquetes",
  "Persona que despacha",
];

/** Una fila por cita, en el orden en que la tabla las pinta. */
export function filasCsvCitas(recolecciones: Recoleccion[]): (string | number)[][] {
  return recolecciones.map((r) => [
    r.codigo,
    r.transportadora,
    r.bodega,
    r.fecha,
    r.horario,
    ETIQUETA_ESTADO_RECOLECCION[r.estado],
    r.paquetes,
    r.despacha,
  ]);
}

export const CSV_FIJAS_ENCABEZADOS = [
  "Transportadora",
  "Días de la semana",
  "Rango",
  "Horario",
  "Bodega",
  "Dirección",
  "Persona que despacha",
  "N.º de paquetes",
  "Información adicional",
  "Activa",
];

/** Una fila por regla. «Activa» va como texto y no como `true`/`false`. */
export function filasCsvFijas(configuraciones: ConfiguracionFija[]): (string | number)[][] {
  return configuraciones.map((c) => [
    c.transportadora,
    frecuenciaLegible(c.dias),
    ETIQUETA_RANGO[c.rango],
    HORARIO_RANGO[c.rango],
    c.bodega,
    c.direccion,
    `${c.despachaNombre} ${c.despachaApellidos}`.trim(),
    c.paquetes,
    c.notas,
    c.activa ? "Sí" : "No",
  ]);
}

export function csvCitas(recolecciones: Recoleccion[]): string {
  return construirCsv(CSV_CITAS_ENCABEZADOS, filasCsvCitas(recolecciones));
}

export function csvFijas(configuraciones: ConfiguracionFija[]): string {
  return construirCsv(CSV_FIJAS_ENCABEZADOS, filasCsvFijas(configuraciones));
}

/** `recolecciones-eventual-2026-10-27.csv` */
export function nombreArchivoRecolecciones(
  tipo: "eventual" | "fija",
  ref: Date = new Date(),
): string {
  return `recolecciones-${tipo}-${ymdLocal(ref)}.csv`;
}
