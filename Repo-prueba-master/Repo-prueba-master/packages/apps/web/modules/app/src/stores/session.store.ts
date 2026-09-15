import { makeAutoObservable } from "mobx";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Los dos módulos del producto. */
export type Modulo = "turnos" | "agendamiento";

/** Rol del usuario dentro del negocio (mock — sin Cognito por ahora). */
export type Rol = "administrador" | "operador";

// ═══════════════════════════════════════════════════════════════════════════
// SESSION STORE (mock)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SessionStore — fuente de verdad de la "configuración previa" del usuario:
 * qué módulos eligió trabajar (turnos y/o agendamiento) y con qué rol
 * (administrador | operador).
 *
 * Es 100% mock (no hay backend ni Cognito todavía). La vista de selección
 * (`/seleccionar`) escribe aquí, y el resto de la app lee de aquí para adaptar
 * lo que muestra según el rol.
 *
 * El usuario puede elegir uno o los dos módulos. Cuando exista auth real, `rol`
 * debería derivarse de los grupos de Cognito.
 */
export class SessionStore {
  /** Módulos seleccionados por el usuario (puede ser uno o los dos). */
  modulos: Modulo[] = ["turnos", "agendamiento"];
  rol: Rol | null = "administrador";

  constructor() {
    makeAutoObservable(this);
  }

  // ── Getters de rol ──────────────────────────────────────────────────────

  get isAdmin() {
    return this.rol === "administrador";
  }

  get isOperador() {
    return this.rol === "operador";
  }

  /** Etiqueta legible del rol actual. */
  get rolLabel() {
    if (this.rol === "administrador") return "Administrador";
    if (this.rol === "operador") return "Operador";
    return "";
  }

  // ── Getters de módulos ──────────────────────────────────────────────────

  /** true si el módulo dado está seleccionado. */
  hasModulo(modulo: Modulo) {
    return this.modulos.includes(modulo);
  }

  /** Etiqueta legible del conjunto de módulos seleccionados. */
  get modulosLabel() {
    return this.modulos
      .map((m) => (m === "turnos" ? "Turnos" : "Agendamiento"))
      .join(" + ");
  }

  /**
   * Módulo "principal" con el que arranca la app tras la selección.
   * Regla acordada: si el usuario eligió ambos, entra por Turnos.
   */
  get moduloPrincipal(): Modulo | null {
    if (this.modulos.includes("turnos")) return "turnos";
    if (this.modulos.includes("agendamiento")) return "agendamiento";
    return null;
  }

  /** Ruta funcional de entrada del módulo principal. */
  get moduloEntryPath() {
    const m = this.moduloPrincipal;
    if (m === "turnos") return "/turnos";
    if (m === "agendamiento") return "/agendamiento";
    return "/seleccionar";
  }

  // ── Estado del flujo ────────────────────────────────────────────────────

  /** true cuando ya se eligió al menos un módulo y un rol. */
  get isReady() {
    return this.modulos.length > 0 && this.rol !== null;
  }

  // ── Mutadores ───────────────────────────────────────────────────────────

  /** Agrega o quita un módulo de la selección (toggle). */
  toggleModulo(modulo: Modulo) {
    if (this.modulos.includes(modulo)) {
      this.modulos = this.modulos.filter((m) => m !== modulo);
    } else {
      this.modulos = [...this.modulos, modulo];
    }
  }

  /** Reemplaza la lista de módulos seleccionados. */
  setModulos(modulos: Modulo[]) {
    this.modulos = modulos;
  }

  setRol(rol: Rol) {
    this.rol = rol;
  }

  /** Aplica la selección completa de una sola vez. */
  configurar(modulos: Modulo[], rol: Rol) {
    this.modulos = modulos;
    this.rol = rol;
  }

  /** Limpia la sesión (ej. al cerrar sesión). */
  reset() {
    this.modulos = [];
    this.rol = null;
  }
}

export const sessionStore = new SessionStore();
