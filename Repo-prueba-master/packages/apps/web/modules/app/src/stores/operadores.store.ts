import { makeAutoObservable } from "mobx";
import type { Modulo } from "@/stores/session.store";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estado de un operador dentro del equipo del administrador:
 * - `pendiente`: envió solicitud desde /operador/registro, falta aprobar.
 * - `activo`: aprobado, puede operar el módulo.
 * - `inactivo`: desactivado por el admin (sin acceso, pero no eliminado).
 */
export type OperadorEstado = "activo" | "pendiente" | "inactivo";

export interface Operador {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  estado: OperadorEstado;
  /** Módulo al que pertenece — las listas son independientes por módulo. */
  modulo: Modulo;
  /**
   * Permisos = secciones del módulo que el operador puede ver en la app.
   * Guarda los `id` de las secciones permitidas (ver SECCIONES).
   */
  permisos: string[];
  /**
   * Profesionales a los que está ligado el operador (solo Agendamiento).
   * Un operador de Agendamiento ayuda a uno o varios profesionales y solo ve
   * los datos de esos profesionales. En Turnos queda vacío (no aplica).
   */
  profesionalIds: string[];
  /**
   * Colas que el operador puede manejar (solo Turnos). El admin decide qué
   * colas ve; debe tener al menos una. En Agendamiento queda vacío (no aplica).
   */
  colaIds: string[];
}

/** Una sección visible del módulo, controlable por permisos. */
export interface Seccion {
  id: string;
  label: string;
  /** Ruta asociada (informativa, para futura integración con el sidebar). */
  path: string;
}

/**
 * Catálogo de secciones por módulo. Es lo que el admin puede activar/desactivar
 * en el perfil de cada operador. Los permisos de un operador son un subconjunto
 * de las secciones de SU módulo (nunca del otro).
 */
export const SECCIONES: Record<Modulo, Seccion[]> = {
  turnos: [
    { id: "inicio", label: "Inicio", path: "/dashboard" },
    { id: "turnos", label: "Mis Turnos", path: "/turnos" },
    { id: "recepcion", label: "Crear turno", path: "/recepcion" },
    { id: "colas", label: "Colas", path: "/colas" },
    { id: "encuestas", label: "Encuestas", path: "/encuestas" },
  ],
  agendamiento: [
    { id: "profesionales", label: "Profesionales", path: "/agendamiento/profesionales" },
    { id: "agenda", label: "Agenda", path: "/agendamiento" },
    { id: "calendario", label: "Calendario", path: "/agendamiento/calendario" },
    { id: "crear", label: "Agendar cita", path: "/agendamiento/crear" },
    { id: "analitica", label: "Analítica", path: "/agendamiento/analitica" },
  ],
};

/** Todos los ids de sección de un módulo (útil para "seleccionar todo" y seeds). */
const todasLasSecciones = (modulo: Modulo): string[] => SECCIONES[modulo].map((s) => s.id);

/**
 * Estadísticas de rendimiento de un operador (mock, sin backend).
 * Hoy los tickets no registran autor, así que estos números son de ejemplo
 * para el dashboard del admin. Cuando exista backend, se derivarían de la
 * actividad real del operador.
 */
export interface OperadorStats {
  /** Turnos que el operador dio de alta. */
  turnosCreados: number;
  /** Turnos que el operador pasó a atención / llamó. */
  turnosAtendidos: number;
  /** Turnos que completó hoy. */
  completadosHoy: number;
  /** Última actividad, texto legible relativo (ej. "hace 5 min"). */
  ultimaActividad: string;
}

/** Stats mock por id de operador (solo Turnos por ahora). */
const STATS_SEED: Record<string, OperadorStats> = {
  t1: { turnosCreados: 42, turnosAtendidos: 38, completadosHoy: 12, ultimaActividad: "hace 5 min" },
  t2: { turnosCreados: 18, turnosAtendidos: 25, completadosHoy: 7, ultimaActividad: "hace 22 min" },
  t3: { turnosCreados: 0, turnosAtendidos: 9, completadosHoy: 3, ultimaActividad: "hace 1 h" },
  t4: { turnosCreados: 5, turnosAtendidos: 2, completadosHoy: 0, ultimaActividad: "ayer" },
};

/** Stats por defecto para operadores sin datos en el seed (ej. recién creados). */
const STATS_VACIAS: OperadorStats = {
  turnosCreados: 0,
  turnosAtendidos: 0,
  completadosHoy: 0,
  ultimaActividad: "sin actividad",
};

/**
 * Estadísticas de encuestas COMPARTIDAS MANUALMENTE por un operador (mock).
 * Solo cuentan las que el operador comparte a mano desde su vista; las
 * encuestas automáticas que el sistema envía al cerrar turno NO suman aquí.
 */
export interface EncuestaStats {
  /** Encuestas que el operador compartió manualmente. */
  compartidas: number;
  /** Respuestas recibidas de las encuestas que compartió. */
  respuestas: number;
  /** Calificación promedio (1–5) de esas respuestas. 0 si no hay respuestas. */
  calificacionProm: number;
}

/** Stats de encuestas mock por id de operador (solo Turnos por ahora). */
const ENCUESTA_STATS_SEED: Record<string, EncuestaStats> = {
  t1: { compartidas: 34, respuestas: 21, calificacionProm: 4.6 },
  t2: { compartidas: 12, respuestas: 5, calificacionProm: 4.1 },
  t3: { compartidas: 8, respuestas: 3, calificacionProm: 3.7 },
  t4: { compartidas: 0, respuestas: 0, calificacionProm: 0 },
};

const ENCUESTA_STATS_VACIAS: EncuestaStats = {
  compartidas: 0,
  respuestas: 0,
  calificacionProm: 0,
};

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════

const SEED: Operador[] = [
  // ── Turnos (ligados a colas: 1=Consulta general, 2=Laboratorio, 3=Mesa/Pedidos) ──
  { id: "t1", nombre: "Laura Gómez", email: "laura.gomez@negocio.com", telefono: "+57 300 111 2233", estado: "activo", modulo: "turnos", permisos: todasLasSecciones("turnos"), profesionalIds: [], colaIds: ["1", "2", "3"] },
  { id: "t2", nombre: "Carlos Ruiz", email: "carlos.ruiz@negocio.com", telefono: "+57 301 222 3344", estado: "activo", modulo: "turnos", permisos: ["inicio", "turnos", "colas"], profesionalIds: [], colaIds: ["1"] },
  { id: "t3", nombre: "Andrea Peña", email: "andrea.pena@negocio.com", telefono: "+57 302 333 4455", estado: "pendiente", modulo: "turnos", permisos: ["inicio", "turnos"], profesionalIds: [], colaIds: ["2", "3"] },
  { id: "t4", nombre: "Julián Torres", email: "julian.torres@negocio.com", telefono: "+57 303 444 5566", estado: "inactivo", modulo: "turnos", permisos: ["inicio"], profesionalIds: [], colaIds: ["1"] },
  // ── Agendamiento (ligados a profesionales p1=Ana, p2=Luis, p3=María) ─────────
  { id: "a1", nombre: "Sofía Márquez", email: "sofia.marquez@negocio.com", telefono: "+57 310 555 6677", estado: "activo", modulo: "agendamiento", permisos: todasLasSecciones("agendamiento"), profesionalIds: ["p1"], colaIds: [] },
  { id: "a2", nombre: "Diego Herrera", email: "diego.herrera@negocio.com", telefono: "+57 311 666 7788", estado: "activo", modulo: "agendamiento", permisos: ["agenda", "calendario", "crear"], profesionalIds: ["p2", "p3"], colaIds: [] },
  { id: "a3", nombre: "Valentina Ríos", email: "valentina.rios@negocio.com", telefono: "+57 312 777 8899", estado: "pendiente", modulo: "agendamiento", permisos: ["agenda", "calendario"], profesionalIds: ["p1", "p2"], colaIds: [] },
];

// ═══════════════════════════════════════════════════════════════════════════
// STORE (mock)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * OperadoresStore — equipo de operadores del administrador (mock, sin backend).
 *
 * Cada módulo (turnos | agendamiento) tiene su propia lista independiente. El
 * admin puede crear operadores directamente, aprobar los que llegan por
 * solicitud (estado `pendiente`, enviada desde /operador/registro),
 * desactivarlos o eliminarlos.
 */
export class OperadoresStore {
  operadores: Operador[] = [...SEED];

  constructor() {
    makeAutoObservable(this);
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  /** Operadores de un módulo (lista independiente). */
  porModulo(modulo: Modulo): Operador[] {
    return this.operadores.filter((o) => o.modulo === modulo);
  }

  /** Cantidad de solicitudes pendientes de aprobar en un módulo. */
  pendientesCount(modulo: Modulo): number {
    return this.operadores.filter((o) => o.modulo === modulo && o.estado === "pendiente").length;
  }

  /** Estadísticas (mock) de un operador. Devuelve ceros si no tiene datos. */
  statsDe(id: string): OperadorStats {
    return STATS_SEED[id] ?? STATS_VACIAS;
  }

  /** Estadísticas de encuestas compartidas (mock) de un operador. */
  encuestaStatsDe(id: string): EncuestaStats {
    return ENCUESTA_STATS_SEED[id] ?? ENCUESTA_STATS_VACIAS;
  }

  // ── Acciones ────────────────────────────────────────────────────────────────

  /**
   * Crea un operador nuevo (activo de inmediato) en el módulo dado. Por defecto
   * recibe acceso a todas las secciones del módulo; el admin lo ajusta luego
   * desde su perfil.
   */
  crear(
    modulo: Modulo,
    data: { nombre: string; email: string; telefono: string; profesionalIds?: string[]; colaIds?: string[] }
  ) {
    this.operadores.push({
      id: `${modulo[0]}${Date.now()}`,
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      estado: "activo",
      modulo,
      permisos: todasLasSecciones(modulo),
      // Solo Agendamiento liga profesionales; en Turnos queda vacío.
      profesionalIds: modulo === "agendamiento" ? data.profesionalIds ?? [] : [],
      // Solo Turnos liga colas; en Agendamiento queda vacío.
      colaIds: modulo === "turnos" ? data.colaIds ?? [] : [],
    });
  }

  /** Actualiza los permisos (secciones visibles) de un operador. */
  setPermisos(id: string, permisos: string[]) {
    const op = this.operadores.find((o) => o.id === id);
    if (op) op.permisos = permisos;
  }

  /** Actualiza los profesionales ligados a un operador (solo Agendamiento). */
  setProfesionales(id: string, profesionalIds: string[]) {
    const op = this.operadores.find((o) => o.id === id);
    if (op) op.profesionalIds = profesionalIds;
  }

  /** Actualiza las colas que puede manejar un operador (solo Turnos). */
  setColas(id: string, colaIds: string[]) {
    const op = this.operadores.find((o) => o.id === id);
    if (op) op.colaIds = colaIds;
  }

  /** Aprueba una solicitud pendiente → pasa a activo. */
  aprobar(id: string) {
    const op = this.operadores.find((o) => o.id === id);
    if (op) op.estado = "activo";
  }

  /** Desactiva un operador (sin eliminarlo). */
  desactivar(id: string) {
    const op = this.operadores.find((o) => o.id === id);
    if (op) op.estado = "inactivo";
  }

  /** Reactiva un operador inactivo → activo. */
  activar(id: string) {
    const op = this.operadores.find((o) => o.id === id);
    if (op) op.estado = "activo";
  }

  /** Elimina un operador de la lista. */
  eliminar(id: string) {
    this.operadores = this.operadores.filter((o) => o.id !== id);
  }
}

export const operadoresStore = new OperadoresStore();
