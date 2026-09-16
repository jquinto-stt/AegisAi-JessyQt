import { makeAutoObservable } from "mobx";
import { operadoresStore, SECCIONES } from "@/stores/operadores.store";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Los módulos del producto. */
export type Modulo = "turnos" | "agendamiento" | "pedidos";

/** Rol del usuario dentro del negocio (mock — sin Cognito por ahora). */
export type Rol = "administrador" | "operador";

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCIA (mock, localStorage)
// ═══════════════════════════════════════════════════════════════════════════
//
// La sesión se guarda en localStorage para que sobreviva a recargas de página.
// Sin esto, al recargar se pierden módulos/rol y el sidebar cae al fallback
// (mostraba ambos módulos y ocultaba Operadores).

const SESSION_KEY = "necto.session";

interface SessionSnapshot {
  modulos: Modulo[];
  rol: Rol | null;
  operadorSimuladoId: string | null;
}

function loadSession(): SessionSnapshot {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<SessionSnapshot>;
      return {
        modulos: Array.isArray(s.modulos) ? s.modulos : [],
        rol: s.rol ?? null,
        operadorSimuladoId: s.operadorSimuladoId ?? null,
      };
    }
  } catch {
    // Sin localStorage o JSON inválido: sesión vacía.
  }
  return { modulos: [], rol: null, operadorSimuladoId: null };
}

function persistSession(s: SessionSnapshot): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    // Sin localStorage: no-op.
  }
}

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
  modulos: Modulo[] = [];
  rol: Rol | null = null;

  /**
   * Id del operador que se está simulando (mock). Cuando no es null, la app
   * corre "como" ese operador: el sidebar y las rutas se limitan a sus
   * permisos. La simulación se activa desde /seleccionar (rol operador →
   * "Simular").
   */
  operadorSimuladoId: string | null = null;

  constructor() {
    // Restaura la sesión guardada (sobrevive a recargas de página).
    const s = loadSession();
    this.modulos = s.modulos;
    this.rol = s.rol;
    this.operadorSimuladoId = s.operadorSimuladoId;
    makeAutoObservable(this);
  }

  /** Guarda el estado actual en localStorage. */
  private persist() {
    persistSession({
      modulos: this.modulos,
      rol: this.rol,
      operadorSimuladoId: this.operadorSimuladoId,
    });
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
    const label: Record<Modulo, string> = {
      turnos: "Turnos",
      agendamiento: "Agendamiento",
      pedidos: "Pedidos",
    };
    return this.modulos.map((m) => label[m]).join(" + ");
  }

  /**
   * Módulo "principal" con el que arranca la app tras la selección.
   * Regla acordada: si el usuario eligió varios, la prioridad de entrada es
   * Turnos → Agendamiento → Pedidos.
   */
  get moduloPrincipal(): Modulo | null {
    if (this.modulos.includes("turnos")) return "turnos";
    if (this.modulos.includes("agendamiento")) return "agendamiento";
    if (this.modulos.includes("pedidos")) return "pedidos";
    return null;
  }

  /**
   * Ruta de entrada tras iniciar sesión / entrar al módulo.
   * Es la sección "Inicio" del módulo principal (Turnos → /dashboard,
   * Pedidos → /pedidos/inicio, etc.), tanto para admin como para operador.
   */
  get moduloEntryPath() {
    const modulo = this.moduloPrincipal;
    if (modulo === null) return "/seleccionar";
    const inicio = SECCIONES[modulo].find((s) => s.id === "inicio");
    return inicio?.path ?? "/dashboard";
  }

  // ── Estado del flujo ────────────────────────────────────────────────────

  /** true cuando ya se eligió al menos un módulo y un rol. */
  get isReady() {
    return this.modulos.length > 0 && this.rol !== null;
  }

  // ── Simulación de operador ────────────────────────────────────────────────

  /** true si la app está corriendo en modo "simular operador". */
  get isSimulando() {
    return this.operadorSimuladoId !== null;
  }

  /** El operador que se está simulando (o null). */
  get operadorSimulado() {
    if (!this.operadorSimuladoId) return null;
    return operadoresStore.operadores.find((o) => o.id === this.operadorSimuladoId) ?? null;
  }

  /**
   * Secciones (ids) que el usuario actual puede ver.
   * - Simulando operador → sus permisos.
   * - Cualquier otro caso (admin) → null = sin restricción (ve todo).
   */
  get permisosActuales(): string[] | null {
    if (this.isSimulando) return this.operadorSimulado?.permisos ?? [];
    return null;
  }

  /** ¿El usuario actual puede ver la sección dada? Admin siempre true. */
  puedeVer(seccionId: string) {
    const permisos = this.permisosActuales;
    if (permisos === null) return true; // admin / sin simulación
    return permisos.includes(seccionId);
  }

  /**
   * Ids de colas visibles para el usuario actual (Turnos):
   * - Simulando operador → sus colas asignadas.
   * - Admin / sin simulación → null = sin restricción (ve todas).
   */
  get colasVisiblesIds(): string[] | null {
    if (this.isSimulando) return this.operadorSimulado?.colaIds ?? [];
    return null;
  }

  /** ¿Puede el usuario actual ver la cola dada? Admin siempre true. */
  puedeVerCola(colaId: string) {
    const ids = this.colasVisiblesIds;
    if (ids === null) return true;
    return ids.includes(colaId);
  }

  /**
   * Ids de profesionales visibles para el usuario actual (Agendamiento):
   * - Simulando operador → sus profesionales asignados.
   * - Admin / sin simulación → null = sin restricción (ve todos).
   */
  get profesionalesVisiblesIds(): string[] | null {
    if (this.isSimulando) return this.operadorSimulado?.profesionalIds ?? [];
    return null;
  }

  /** ¿Puede el usuario actual ver al profesional dado? Admin siempre true. */
  puedeVerProfesional(profesionalId: string) {
    const ids = this.profesionalesVisiblesIds;
    if (ids === null) return true;
    return ids.includes(profesionalId);
  }

  /**
   * Ruta "inicio" a la que volver según el usuario actual:
   * - Simulando operador → la primera sección que SÍ tiene permitida (para no
   *   caer en una ruta bloqueada). Si no tiene ninguna, su módulo de entrada.
   * - Admin / sin simulación → el módulo de entrada normal.
   */
  get homePathActual() {
    const op = this.operadorSimulado;
    if (op) {
      const secciones = SECCIONES[op.modulo];
      // Preferimos "Inicio" del módulo si lo tiene permitido; si no, su primera
      // sección permitida (para no caer en una ruta bloqueada).
      if (op.permisos.includes("inicio")) {
        const inicio = secciones.find((s) => s.id === "inicio");
        if (inicio) return inicio.path;
      }
      const primera = secciones.find((s) => op.permisos.includes(s.id));
      if (primera) return primera.path;
    }
    return this.moduloEntryPath;
  }

  // ── Mutadores ───────────────────────────────────────────────────────────

  /** Agrega o quita un módulo de la selección (toggle). */
  toggleModulo(modulo: Modulo) {
    if (this.modulos.includes(modulo)) {
      this.modulos = this.modulos.filter((m) => m !== modulo);
    } else {
      this.modulos = [...this.modulos, modulo];
    }
    this.persist();
  }

  /** Reemplaza la lista de módulos seleccionados. */
  setModulos(modulos: Modulo[]) {
    this.modulos = modulos;
    this.persist();
  }

  setRol(rol: Rol) {
    this.rol = rol;
    this.persist();
  }

  /** Aplica la selección completa de una sola vez. */
  configurar(modulos: Modulo[], rol: Rol) {
    this.modulos = modulos;
    this.rol = rol;
    this.persist();
  }

  /**
   * Entra en modo simulación como el operador dado (mock). Ajusta módulo y rol
   * a los del operador para que la app se comporte como si él estuviera dentro.
   */
  simular(operadorId: string) {
    const op = operadoresStore.operadores.find((o) => o.id === operadorId);
    if (!op) return;
    this.operadorSimuladoId = operadorId;
    this.rol = "operador";
    this.modulos = [op.modulo];
    this.persist();
  }

  /** Sale del modo simulación y limpia todo (vuelve al inicio del flujo). */
  salirSimulacion() {
    this.reset();
  }

  /** Limpia la sesión (ej. al cerrar sesión). */
  reset() {
    this.modulos = [];
    this.rol = null;
    this.operadorSimuladoId = null;
    this.persist();
  }
}

export const sessionStore = new SessionStore();
