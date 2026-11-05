/**
 * RecoleccionesStore — las citas de recogida con cada transportadora.
 *
 * Orquesta, no decide: qué le falta a un formulario, qué código toca y en qué
 * orden se pintan las citas vive en `recolecciones.domain.ts`. Aquí solo se
 * valida con esas reglas y se escribe el resultado.
 */
import { makeAutoObservable } from "mobx";

import {
  ordenarDias,
  siguienteCodigo,
  validarConfiguracionFija,
  validarRecoleccion,
  type ConfiguracionFija,
  type DatosConfiguracionFija,
  type DatosRecoleccion,
  type Recoleccion,
} from "@/domain/pedidos/recolecciones.domain";

export type Resultado<T = void> = { ok: true; valor: T } | { ok: false; error: string };

const RECOLECCIONES_SEED: Recoleccion[] = [
  {
    id: "rec-seed-1",
    codigo: "REC-0001",
    tipo: "eventual",
    transportadora: "Envía",
    bodega: "Bodega Principal El Poblado",
    fecha: "2026-10-30",
    horario: "14:00 - 16:00",
    paquetes: 28,
    despacha: "Carlos Mario Restrepo",
    estado: "asignada",
    creadaEn: "2026-10-29T15:20:00.000Z",
  },
  {
    id: "rec-seed-2",
    codigo: "REC-0002",
    tipo: "eventual",
    transportadora: "Coordinadora",
    bodega: "Centro Logístico Itagüí",
    fecha: "2026-10-30",
    horario: "15:00 - 17:30",
    paquetes: 42,
    despacha: "Laura Sofía Giraldo",
    estado: "asignada",
    creadaEn: "2026-10-29T16:40:00.000Z",
  },
  {
    id: "rec-seed-3",
    codigo: "REC-0003",
    tipo: "eventual",
    transportadora: "Servientrega",
    bodega: "Sede Laureles",
    fecha: "2026-10-30",
    horario: "16:00 - 18:00",
    paquetes: 19,
    despacha: "Andrés Felipe Zapata",
    estado: "programada",
    creadaEn: "2026-10-30T08:10:00.000Z",
  },
  {
    id: "rec-seed-4",
    codigo: "REC-0004",
    tipo: "eventual",
    transportadora: "InterRapidísimo",
    bodega: "Bodega Norte Bello",
    fecha: "2026-10-30",
    horario: "10:00 - 12:00",
    paquetes: 15,
    despacha: "Julián Esteban Osorio",
    estado: "con_novedad",
    creadaEn: "2026-10-29T11:00:00.000Z",
  },
  {
    id: "rec-seed-5",
    codigo: "REC-0005",
    tipo: "eventual",
    transportadora: "TCC",
    bodega: "Centro Logístico Itagüí",
    fecha: "2026-10-31",
    horario: "09:00 - 11:30",
    paquetes: 35,
    despacha: "Laura Sofía Giraldo",
    estado: "asignada",
    creadaEn: "2026-10-30T09:30:00.000Z",
  },
  {
    id: "rec-seed-6",
    codigo: "REC-0006",
    tipo: "eventual",
    transportadora: "Envía",
    bodega: "Sede Laureles",
    fecha: "2026-10-31",
    horario: "14:00 - 16:30",
    paquetes: 22,
    despacha: "Andrés Felipe Zapata",
    estado: "programada",
    creadaEn: "2026-10-30T10:15:00.000Z",
  },
  {
    id: "rec-seed-7",
    codigo: "REC-0007",
    tipo: "eventual",
    transportadora: "Envío propio",
    bodega: "Bodega Principal El Poblado",
    fecha: "2026-10-31",
    horario: "11:00 - 13:00",
    paquetes: 14,
    despacha: "Carlos Mario Restrepo",
    estado: "asignada",
    creadaEn: "2026-10-30T10:45:00.000Z",
  },
  {
    id: "rec-seed-8",
    codigo: "REC-0008",
    tipo: "eventual",
    transportadora: "Servientrega",
    bodega: "Bodega Principal El Poblado",
    fecha: "2026-11-01",
    horario: "08:30 - 11:00",
    paquetes: 31,
    despacha: "Carlos Mario Restrepo",
    estado: "programada",
    creadaEn: "2026-10-30T11:05:00.000Z",
  },
  {
    id: "rec-seed-9",
    codigo: "REC-0009",
    tipo: "eventual",
    transportadora: "Coordinadora",
    bodega: "Bodega Norte Bello",
    fecha: "2026-11-01",
    horario: "13:30 - 16:00",
    paquetes: 26,
    despacha: "Julián Esteban Osorio",
    estado: "programada",
    creadaEn: "2026-10-30T11:20:00.000Z",
  },
  {
    id: "rec-seed-10",
    codigo: "REC-0010",
    tipo: "eventual",
    transportadora: "TCC",
    bodega: "Bodega Principal El Poblado",
    fecha: "2026-10-29",
    horario: "15:00 - 17:00",
    paquetes: 18,
    despacha: "Carlos Mario Restrepo",
    estado: "con_novedad",
    creadaEn: "2026-10-28T14:00:00.000Z",
  },
  {
    id: "rec-seed-11",
    codigo: "REC-0011",
    tipo: "eventual",
    transportadora: "InterRapidísimo",
    bodega: "Centro Logístico Itagüí",
    fecha: "2026-11-02",
    horario: "14:00 - 17:00",
    paquetes: 47,
    despacha: "Laura Sofía Giraldo",
    estado: "programada",
    creadaEn: "2026-10-30T11:50:00.000Z",
  },
  {
    id: "rec-seed-12",
    codigo: "REC-0012",
    tipo: "eventual",
    transportadora: "Coordinadora",
    bodega: "Sede Laureles",
    fecha: "2026-11-03",
    horario: "09:00 - 12:00",
    paquetes: 33,
    despacha: "Andrés Felipe Zapata",
    estado: "asignada",
    creadaEn: "2026-10-30T12:10:00.000Z",
  },
];

const CONFIGURACIONES_SEED: ConfiguracionFija[] = [
  {
    id: "cfg-seed-1",
    transportadora: "Coordinadora",
    activa: true,
    dias: ["lunes", "martes", "miercoles", "jueves", "viernes"],
    bodega: "Centro Logístico Itagüí",
    direccion: "Cra. 42 #75-83 Bodega 14, Autopista Sur, Itagüí",
    despachaNombre: "Laura Sofía",
    despachaApellidos: "Giraldo Montoya",
    rango: "tarde",
    paquetes: 40,
    notas: "Ingresar por muelle de carga #3 y anunciar placa en portería.",
    actualizadaEn: "2026-10-28T14:30:00.000Z",
  },
  {
    id: "cfg-seed-2",
    transportadora: "Envía",
    activa: true,
    dias: ["lunes", "miercoles", "viernes"],
    bodega: "Bodega Principal El Poblado",
    direccion: "Calle 10 #43A-30 Local 104, El Poblado, Medellín",
    despachaNombre: "Carlos Mario",
    despachaApellidos: "Restrepo Vélez",
    rango: "tarde",
    paquetes: 28,
    notas: "Timbrar en recepción de despachos; paquetes termo-sellados listos desde las 12:00 PM.",
    actualizadaEn: "2026-10-29T09:15:00.000Z",
  },
  {
    id: "cfg-seed-3",
    transportadora: "Servientrega",
    activa: true,
    dias: ["martes", "jueves", "sabado"],
    bodega: "Sede Laureles",
    direccion: "Circular 4 #73-22, Laureles, Medellín",
    despachaNombre: "Andrés Felipe",
    despachaApellidos: "Zapata Henao",
    rango: "manana",
    paquetes: 20,
    notas: "Parqueo habilitado en bahía lateral sobre la Circular 4.",
    actualizadaEn: "2026-10-27T17:00:00.000Z",
  },
  {
    id: "cfg-seed-4",
    transportadora: "TCC",
    activa: true,
    dias: ["martes", "jueves"],
    bodega: "Centro Logístico Itagüí",
    direccion: "Cra. 42 #75-83 Bodega 14, Autopista Sur, Itagüí",
    despachaNombre: "Laura Sofía",
    despachaApellidos: "Giraldo Montoya",
    rango: "manana",
    paquetes: 35,
    notas: "Despacho de cajas master y pedidos corporativos regionales.",
    actualizadaEn: "2026-10-26T11:45:00.000Z",
  },
  {
    id: "cfg-seed-5",
    transportadora: "InterRapidísimo",
    activa: false,
    dias: ["lunes", "miercoles", "viernes"],
    bodega: "Bodega Norte Bello",
    direccion: "Av. Regional #52-110 Bodega 6, Bello, Antioquia",
    despachaNombre: "Julián Esteban",
    despachaApellidos: "Osorio Cano",
    rango: "tarde",
    paquetes: 18,
    notas: "Regla pausada temporalmente por mantenimiento de muelle norte.",
    actualizadaEn: "2026-10-25T16:10:00.000Z",
  },
  {
    id: "cfg-seed-6",
    transportadora: "Envío propio",
    activa: true,
    dias: ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"],
    bodega: "Bodega Principal El Poblado",
    direccion: "Calle 10 #43A-30 Local 104, El Poblado, Medellín",
    despachaNombre: "Carlos Mario",
    despachaApellidos: "Restrepo Vélez",
    rango: "manana",
    paquetes: 15,
    notas: "Salida diaria de flota motorizada propia para entregas express Valle de Aburrá.",
    actualizadaEn: "2026-10-30T08:00:00.000Z",
  },
];

export class RecoleccionesStore {
  recolecciones: Recoleccion[] = RECOLECCIONES_SEED.map((r) => ({ ...r }));

  /**
   * Las recolecciones fijas: reglas que se repiten cada semana.
   *
   * Viven aparte de `recolecciones` porque no son citas: no tienen fecha ni
   * estado. Mezclarlas obligaría a que la mitad de los campos sobraran siempre.
   */
  configuraciones: ConfiguracionFija[] = CONFIGURACIONES_SEED.map((c) => ({
    ...c,
    dias: [...c.dias],
  }));

  constructor() {
    makeAutoObservable(this);
  }

  /**
   * Agenda una recolección.
   *
   * Nace en `programada` y no se puede crear en otro estado: la asignación la
   * confirma la transportadora, no el negocio que la pide. Dejar elegir
   * «Asignada» al crear sería escribir un hecho que todavía no ocurrió.
   */
  crear(datos: DatosRecoleccion): Resultado<Recoleccion> {
    const errores = validarRecoleccion(datos);
    if (errores.length > 0) return { ok: false, error: errores.join(" ") };

    const recoleccion: Recoleccion = {
      id: `rec-${Date.now()}-${this.recolecciones.length + 1}`,
      codigo: siguienteCodigo(this.recolecciones),
      tipo: datos.tipo,
      transportadora: datos.transportadora.trim(),
      bodega: datos.bodega.trim(),
      fecha: datos.fecha,
      horario: datos.horario.trim(),
      paquetes: Number(datos.paquetes),
      despacha: datos.despacha.trim(),
      estado: "programada",
      creadaEn: new Date().toISOString(),
    };

    this.recolecciones.unshift(recoleccion);
    return { ok: true, valor: recoleccion };
  }

  /** Cuántas citas hay en total (sin filtrar por pestaña ni por estado). */
  get total(): number {
    return this.recolecciones.length;
  }

  /**
   * Crea o actualiza una recolección fija.
   *
   * `id` decide cuál de las dos cosas: con id se edita la que existe —y se
   * conserva su estado activa/pausada, que es una decisión del operador y no del
   * formulario—, sin id se crea una nueva y nace activa.
   */
  guardarConfiguracion(datos: DatosConfiguracionFija, id?: string): Resultado<ConfiguracionFija> {
    const errores = validarConfiguracionFija(datos);
    if (errores.length > 0) return { ok: false, error: errores.join(" ") };

    const campos = {
      transportadora: datos.transportadora.trim(),
      dias: ordenarDias(datos.dias),
      bodega: datos.bodega.trim(),
      direccion: datos.direccion.trim(),
      despachaNombre: datos.despachaNombre.trim(),
      despachaApellidos: datos.despachaApellidos.trim(),
      rango: datos.rango,
      paquetes: Number(datos.paquetes),
      notas: datos.notas.trim(),
      actualizadaEn: new Date().toISOString(),
    };

    const existente = id ? this.configuraciones.find((c) => c.id === id) : undefined;
    if (existente) {
      Object.assign(existente, campos);
      return { ok: true, valor: existente };
    }

    const nueva: ConfiguracionFija = { id: `cfg-${Date.now()}`, activa: true, ...campos };
    this.configuraciones.unshift(nueva);
    return { ok: true, valor: nueva };
  }

  /** Pausa o reactiva una regla. Pausar no la borra: se puede volver a encender. */
  alternarActiva(id: string): void {
    const configuracion = this.configuraciones.find((c) => c.id === id);
    if (configuracion) configuracion.activa = !configuracion.activa;
  }

  /** Las reglas activas, que son las que la transportadora verá. */
  get configuracionesActivas(): number {
    return this.configuraciones.filter((c) => c.activa).length;
  }
}

export const recoleccionesStore = new RecoleccionesStore();
