/**
 * RecoleccionesStore — las citas de recogida con cada transportadora.
 *
 * Orquesta, no decide: qué le falta a un formulario, qué código toca y en qué
 * orden se pintan las citas vive en `recolecciones.domain.ts`. Aquí solo se
 * valida con esas reglas y se escribe el resultado.
 *
 * **Los datos viven en memoria.** No hay tabla de recolecciones en Supabase
 * todavía, y sembrar citas de ejemplo sería peor que no tener ninguna: una
 * recolección inventada se lee como una cita real a la que hay que estar. La
 * página arranca vacía a propósito y su estado vacío lo dice. Cuando exista el
 * conector de la transportadora, este store es el único sitio que cambia.
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

export class RecoleccionesStore {
  recolecciones: Recoleccion[] = [];

  /**
   * Las recolecciones fijas: reglas que se repiten cada semana.
   *
   * Viven aparte de `recolecciones` porque no son citas: no tienen fecha ni
   * estado. Mezclarlas obligaría a que la mitad de los campos sobraran siempre.
   */
  configuraciones: ConfiguracionFija[] = [];

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
