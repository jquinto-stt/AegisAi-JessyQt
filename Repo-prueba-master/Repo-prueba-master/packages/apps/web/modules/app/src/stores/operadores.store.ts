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

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════

const SEED: Operador[] = [
  // ── Turnos (operadores genéricos, sin profesional) ──────────────────────────
  { id: "t1", nombre: "Laura Gómez", email: "laura.gomez@negocio.com", telefono: "+57 300 111 2233", estado: "activo", modulo: "turnos", permisos: todasLasSecciones("turnos"), profesionalIds: [] },
  { id: "t2", nombre: "Carlos Ruiz", email: "carlos.ruiz@negocio.com", telefono: "+57 301 222 3344", estado: "activo", modulo: "turnos", permisos: ["inicio", "turnos", "colas"], profesionalIds: [] },
  { id: "t3", nombre: "Andrea Peña", email: "andrea.pena@negocio.com", telefono: "+57 302 333 4455", estado: "pendiente", modulo: "turnos", permisos: ["inicio", "turnos"], profesionalIds: [] },
  { id: "t4", nombre: "Julián Torres", email: "julian.torres@negocio.com", telefono: "+57 303 444 5566", estado: "inactivo", modulo: "turnos", permisos: ["inicio"], profesionalIds: [] },
  // ── Agendamiento (ligados a profesionales p1=Ana, p2=Luis, p3=María) ─────────
  { id: "a1", nombre: "Sofía Márquez", email: "sofia.marquez@negocio.com", telefono: "+57 310 555 6677", estado: "activo", modulo: "agendamiento", permisos: todasLasSecciones("agendamiento"), profesionalIds: ["p1"] },
  { id: "a2", nombre: "Diego Herrera", email: "diego.herrera@negocio.com", telefono: "+57 311 666 7788", estado: "activo", modulo: "agendamiento", permisos: ["agenda", "calendario", "crear"], profesionalIds: ["p2", "p3"] },
  { id: "a3", nombre: "Valentina Ríos", email: "valentina.rios@negocio.com", telefono: "+57 312 777 8899", estado: "pendiente", modulo: "agendamiento", permisos: ["agenda", "calendario"], profesionalIds: ["p1", "p2"] },
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

  // ── Acciones ────────────────────────────────────────────────────────────────

  /**
   * Crea un operador nuevo (activo de inmediato) en el módulo dado. Por defecto
   * recibe acceso a todas las secciones del módulo; el admin lo ajusta luego
   * desde su perfil.
   */
  crear(
    modulo: Modulo,
    data: { nombre: string; email: string; telefono: string; profesionalIds?: string[] }
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
