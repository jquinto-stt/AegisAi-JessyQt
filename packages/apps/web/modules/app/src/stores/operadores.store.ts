import { makeAutoObservable } from "mobx";
import type { Modulo } from "@/stores/session.store";
import type { Capacidad } from "@/stores/roles.store";

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

  // ── Autorización (modelo nuevo, solo `pedidos`) ───────────────────────────
  //
  // Fuente de verdad de la autorización. Contrato:
  //   outputs/contrato-arquitectura-acceso-necto.md §4

  /** Cargo o designación del operador (ej. Head of Design, Vendedor Mostrador). */
  cargo?: string;
  /** URL de la foto de perfil del operador. */
  avatarUrl?: string;
  /** Rol asignado (ver `rolesStore`). De él se derivan las capacidades base. */
  rolId?: string;
  /** Excepciones que SUMAN capacidades sobre las del rol. */
  capacidadesExtra?: Capacidad[];
  /** Excepciones que RESTAN capacidades. La denegación gana siempre. */
  capacidadesRemovidas?: Capacidad[];

  // ── Legado (congelado: solo turnos y agendamiento) ────────────────────────

  /**
   * Permisos = secciones del módulo que el operador puede ver en la app.
   *
   * @deprecated LEGADO CONGELADO (contrato §4 / invariante C2).
   *
   * **No puede participar en ninguna decisión de autorización nueva.** Las
   * reglas son duras:
   *   1. No se lee desde rutas, acciones, guards ni componentes nuevos.
   *   2. No se escribe desde ninguna UI nueva.
   *   3. Solo lo lee el adaptador legado de `SessionStore.puedeVerSeccion`, y
   *      solo para `turnos` y `agendamiento`.
   *
   * Se retira cuando esos dos módulos migren a capacidades (fuera del alcance
   * del contrato). Mantenerlo vivo como fuente paralela es el riesgo que el
   * contrato existe para evitar.
   */
  permisos: string[];

  /**
   * Profesionales a los que está ligado el operador (solo Agendamiento).
   * Un operador de Agendamiento ayuda a uno o varios profesionales y solo ve
   * los datos de esos profesionales. En Turnos queda vacío (no aplica).
   *
   * Es **scope de datos**, no autorización (contrato §1.6).
   */
  profesionalIds: string[];
  /**
   * Colas que el operador puede manejar (solo Turnos). El admin decide qué
   * colas ve; debe tener al menos una. En Agendamiento queda vacío (no aplica).
   *
   * Es **scope de datos**, no autorización (contrato §1.6).
   */
  colaIds: string[];
}

/** Una sección visible del módulo, controlable por permisos. */
export interface Seccion {
  id: string;
  label: string;
  /** Ruta asociada (informativa, para futura integración con el sidebar). */
  path: string;
  /**
   * Capacidad **mínima para entrar** a esta sección (solo `pedidos`).
   *
   * Una sección es un destino de navegación, NO una unidad de autorización
   * (contrato §1.5). Entrar a una pantalla nunca implica poder operarla: p. ej.
   * `/pedidos/config` se entra con `settings.read` pero se guarda con
   * `settings.manage`. Invariante C5.
   *
   * Las secciones de `turnos` y `agendamiento` no declaran capacidad: siguen
   * con ids de sección porque esos módulos están congelados (contrato §5).
   */
  capacidad?: Capacidad;
}

/**
 * Catálogo de secciones por módulo. Es lo que el admin puede activar/desactivar
 * en el perfil de cada operador. Los permisos de un operador son un subconjunto
 * de las secciones de SU módulo (nunca del otro).
 */
export const SECCIONES: Record<Modulo, Seccion[]> = {
  // Pedidos: flujo de pedidos que llegan por WhatsApp hasta la entrega.
  // (La sección "Operadores" es solo-admin y no es un permiso togglable, igual
  // que en Turnos/Agendamiento; por eso no aparece en este catálogo.)
  //
  // Pedidos es el único módulo migrado a capacidades (contrato §5): cada
  // sección declara la capacidad mínima para ENTRAR. Las acciones de dentro se
  // gobiernan aparte con `hasPermission()`.
  pedidos: [
    { id: "inicio", label: "Inicio", path: "/pedidos/inicio", capacidad: "orders.read" },
    { id: "tablero", label: "Tablero", path: "/pedidos", capacidad: "orders.read" },
    { id: "crear", label: "Crear pedido", path: "/pedidos/crear", capacidad: "orders.create" },
    { id: "historial", label: "Historial", path: "/pedidos/historial", capacidad: "orders.read" },
    { id: "configuracion", label: "Configuración", path: "/pedidos/config", capacidad: "settings.read" },
    { id: "asistente", label: "Asistente", path: "/asistente", capacidad: "assistant.use" },
  ],
};

/** Todos los ids de sección de un módulo (útil para "seleccionar todo" y seeds). */
const todasLasSecciones = (modulo: Modulo): string[] => SECCIONES[modulo]?.map((s) => s.id) ?? [];

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
  // ── Pedidos (migrado a capacidades: el rol es la fuente de verdad) ──────────
  {
    id: "d0",
    nombre: "Tailor Davis (Tú)",
    email: "tailor.davis@negocio.com",
    telefono: "+57 300 123 4567",
    cargo: "Head of Operations",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    estado: "activo",
    modulo: "pedidos",
    rolId: "admin_tienda",
    permisos: todasLasSecciones("pedidos"),
    profesionalIds: [],
    colaIds: [],
  },
  {
    id: "d1",
    nombre: "Camila Ortiz",
    email: "camila.ortiz@negocio.com",
    telefono: "+57 320 111 2233",
    cargo: "Supervisora de Despacho",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    estado: "activo",
    modulo: "pedidos",
    rolId: "supervisor_pedidos",
    permisos: todasLasSecciones("pedidos"),
    profesionalIds: [],
    colaIds: [],
  },
  {
    id: "d2",
    nombre: "Mateo Vargas",
    email: "mateo.vargas@negocio.com",
    telefono: "+57 321 222 3344",
    cargo: "Operador de Mostrador",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    estado: "activo",
    modulo: "pedidos",
    rolId: "vendedor",
    permisos: ["inicio", "tablero", "crear"],
    profesionalIds: [],
    colaIds: [],
  },
  {
    id: "d3",
    nombre: "Daniela Suárez",
    email: "daniela.suarez@negocio.com",
    telefono: "+57 322 333 4455",
    cargo: "Atención y Pedidos",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
    estado: "pendiente",
    modulo: "pedidos",
    rolId: "vendedor",
    permisos: ["inicio", "tablero"],
    profesionalIds: [],
    colaIds: [],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// STORE (mock)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * OperadoresStore — equipo de operadores del administrador (mock, sin backend).
 *
 * Cada módulo (turnos | agendamiento | pedidos) tiene su propia lista
 * independiente. El admin puede crear operadores directamente, aprobar los que
 * llegan por solicitud (estado `pendiente`, enviada desde /operador/registro),
 * desactivarlos o eliminarlos.
 *
 * La autorización se guarda distinto según el módulo:
 *   - `pedidos` → `rolId` + excepciones (modelo nuevo, contrato §4)
 *   - `turnos` / `agendamiento` → `permisos[]` (legado congelado)
 *
 * Este store es **memoria pura**: no persiste, así que todo se pierde al
 * recargar. Es una decisión explícita del mock, no un olvido.
 */
export class OperadoresStore {
  operadores: Operador[] = [...SEED];

  /**
   * Callback que se avisa cuando cambia la lista de operadores.
   *
   * Existe para que `SessionStore` pueda reconciliar la sesión (p. ej. salir de
   * la simulación si el operador simulado se elimina o se desactiva) **sin
   * crear un import circular** entre los dos stores: este archivo no conoce a
   * `session.store`, solo expone el registro.
   */
  private listener: (() => void) | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  /** Registra el callback de cambios (un único suscriptor: la sesión). */
  onChange(cb: () => void) {
    this.listener = cb;
  }

  /** Avisa al suscriptor registrado. */
  private emit() {
    this.listener?.();
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  /** Operadores de un módulo (lista independiente). */
  porModulo(modulo: Modulo): Operador[] {
    return this.operadores.filter((o) => o.modulo === modulo);
  }

  /** Un operador por id, o undefined. */
  porId(id: string | null | undefined): Operador | undefined {
    if (!id) return undefined;
    return this.operadores.find((o) => o.id === id);
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
   * Crea un operador nuevo (activo de inmediato) en el módulo dado.
   *
   * Para `pedidos` el rol es la fuente de verdad: si no se indica `rolId` se
   * asigna `"personalizado"` (sin capacidades), que es el valor **fail-closed**.
   *
   * TODO(Fase 3): el modal de creación de `OperadoresPage` todavía no ofrece
   * selector de rol, así que hoy un operador de pedidos nace sin acceso y hay
   * que asignarle rol. La pantalla "Equipo" resuelve esto con un `Select`.
   */
  crear(
    modulo: Modulo,
    data: {
      nombre: string;
      email: string;
      telefono: string;
      rolId?: string;
      estado?: OperadorEstado;
      cargo?: string;
      avatarUrl?: string;
      profesionalIds?: string[];
      colaIds?: string[];
    }
  ) {
    this.operadores.push({
      id: `${modulo[0]}${Date.now()}`,
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      cargo: data.cargo,
      avatarUrl: data.avatarUrl,
      estado: data.estado ?? "activo",
      modulo,
      rolId: data.rolId ?? (modulo === "pedidos" ? "personalizado" : undefined),
      permisos: todasLasSecciones(modulo),
      // Solo Agendamiento liga profesionales; en Turnos queda vacío.
      profesionalIds: modulo === "agendamiento" ? data.profesionalIds ?? [] : [],
      // Solo Turnos liga colas; en Agendamiento queda vacío.
      colaIds: modulo === "turnos" ? data.colaIds ?? [] : [],
    });
    this.emit();
  }

  /**
   * Registra una solicitud de acceso: crea el operador en estado `pendiente`,
   * sin rol y sin permisos. El admin lo aprueba y le asigna rol desde "Equipo".
   *
   * Antes de esto, `/operador/registro` solo cambiaba a un estado de éxito
   * visual y no creaba nada: los `pendiente` de la tabla venían solo del SEED.
   */
  solicitar(data: { nombre: string; email: string; telefono: string; modulo: Modulo }) {
    this.operadores.push({
      id: `${data.modulo[0]}${Date.now()}`,
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      estado: "pendiente",
      modulo: data.modulo,
      rolId: undefined,
      permisos: [],
      profesionalIds: [],
      colaIds: [],
    });
    this.emit();
  }

  /**
   * Actualiza los permisos (secciones visibles) de un operador.
   *
   * @deprecated LEGADO CONGELADO (contrato §4). Solo para turnos y agendamiento.
   * El modelo nuevo escribe `rolId` + excepciones (`setRol`,
   * `setCapacidadesExtra`, `setCapacidadesRemovidas`).
   */
  setPermisos(id: string, permisos: string[]) {
    const op = this.porId(id);
    if (op) op.permisos = permisos;
    this.emit();
  }

  /**
   * Actualiza los datos de contacto de una persona del equipo.
   *
   * Es edición de **presentación**, no de autorización: no toca `rolId` ni las
   * excepciones (para eso están `setRol`, `setCapacidadesExtra`,
   * `setCapacidadesRemovidas`). Existe porque el perfil es una ruta real y
   * corregir un correo mal escrito no debería obligar a borrar y recrear a la
   * persona.
   */
  actualizarDatos(id: string, patch: { nombre?: string; email?: string; telefono?: string }) {
    const op = this.porId(id);
    if (!op) return;
    if (patch.nombre !== undefined) op.nombre = patch.nombre;
    if (patch.email !== undefined) op.email = patch.email;
    if (patch.telefono !== undefined) op.telefono = patch.telefono;
    this.emit();
  }

  /** Asigna el rol de un operador (fuente de verdad de la autorización). */
  setRol(id: string, rolId: string) {
    const op = this.porId(id);
    if (op) op.rolId = rolId;
    this.emit();
  }

  /** Reemplaza las excepciones que SUMAN capacidades sobre las del rol. */
  setCapacidadesExtra(id: string, capacidades: Capacidad[]) {
    const op = this.porId(id);
    if (op) op.capacidadesExtra = capacidades;
    this.emit();
  }

  /** Reemplaza las excepciones que RESTAN capacidades. La denegación gana. */
  setCapacidadesRemovidas(id: string, capacidades: Capacidad[]) {
    const op = this.porId(id);
    if (op) op.capacidadesRemovidas = capacidades;
    this.emit();
  }

  /** Actualiza los profesionales ligados a un operador (solo Agendamiento). */
  setProfesionales(id: string, profesionalIds: string[]) {
    const op = this.porId(id);
    if (op) op.profesionalIds = profesionalIds;
    this.emit();
  }

  /** Actualiza las colas que puede manejar un operador (solo Turnos). */
  setColas(id: string, colaIds: string[]) {
    const op = this.porId(id);
    if (op) op.colaIds = colaIds;
    this.emit();
  }

  /** Aprueba una solicitud pendiente → pasa a activo. */
  aprobar(id: string) {
    const op = this.porId(id);
    if (op) op.estado = "activo";
    this.emit();
  }

  /** Rechaza y descarta una solicitud pendiente. */
  rechazar(id: string) {
    this.eliminar(id);
  }

  /** Desactiva un operador (sin eliminarlo). */
  desactivar(id: string) {
    const op = this.porId(id);
    if (op) op.estado = "inactivo";
    this.emit();
  }

  /** Reactiva un operador inactivo → activo. */
  activar(id: string) {
    const op = this.porId(id);
    if (op) op.estado = "activo";
    this.emit();
  }

  /** Elimina un operador de la lista. */
  eliminar(id: string) {
    this.operadores = this.operadores.filter((o) => o.id !== id);
    this.emit();
  }
}

export const operadoresStore = new OperadoresStore();
