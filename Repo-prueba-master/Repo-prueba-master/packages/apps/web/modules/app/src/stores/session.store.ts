import { makeAutoObservable } from "mobx";
import { operadoresStore } from "./operadores.store";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type Modulo = "pedidos";
export type Rol = "administrador" | "operador";

const STORAGE_KEY = "necto_session_v1";

interface PersistedSession {
  modulos: Modulo[];
  rol: Rol | null;
  operadorSimuladoId: string | null;
}

function loadSession(): PersistedSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { modulos: [], rol: null, operadorSimuladoId: null };
    const parsed = JSON.parse(raw);
    return {
      modulos: parsed.modulos ?? [],
      rol: parsed.rol ?? null,
      operadorSimuladoId: parsed.operadorSimuladoId ?? null,
    };
  } catch {
    return { modulos: [], rol: null, operadorSimuladoId: null };
  }
}

function persistSession(data: PersistedSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignorar errores de quota en localStorage
  }
}

export class SessionStore {
  modulos: Modulo[] = [];
  rol: Rol | null = null;
  operadorSimuladoId: string | null = null;

  constructor() {
    const s = loadSession();
    this.modulos = s.modulos;
    this.rol = s.rol;
    this.operadorSimuladoId = s.operadorSimuladoId;
    makeAutoObservable(this);
  }

  private persist() {
    persistSession({
      modulos: this.modulos,
      rol: this.rol,
      operadorSimuladoId: this.operadorSimuladoId,
    });
  }

  get isAdmin() {
    return this.rol === "administrador";
  }

  get isOperador() {
    return this.rol === "operador";
  }

  get rolLabel() {
    if (this.rol === "administrador") return "Administrador";
    if (this.rol === "operador") return "Operador";
    return "";
  }

  hasModulo(modulo: Modulo) {
    return this.modulos.includes(modulo);
  }

  get moduloPrincipal(): Modulo | null {
    if (this.modulos.includes("pedidos")) return "pedidos";
    return null;
  }

  get moduloEntryPath() {
    return "/pedidos/inicio";
  }

  get isReady() {
    return this.modulos.length > 0 && this.rol !== null;
  }

  get isSimulando() {
    return this.operadorSimuladoId !== null;
  }

  get operadorSimulado() {
    if (!this.operadorSimuladoId) return null;
    return operadoresStore.operadores.find((o) => o.id === this.operadorSimuladoId) ?? null;
  }

  get permisosActuales(): string[] | null {
    if (this.isSimulando) return this.operadorSimulado?.permisos ?? [];
    return null;
  }

  puedeVer(seccionId: string) {
    const permisos = this.permisosActuales;
    if (permisos === null) return true;
    return permisos.includes(seccionId);
  }

  get homePathActual() {
    const op = this.operadorSimulado;
    if (op) {
      if (op.permisos.includes("inicio")) return "/pedidos/inicio";
      if (op.permisos.includes("tablero")) return "/pedidos";
      if (op.permisos.includes("crear")) return "/pedidos/crear";
      if (op.permisos.includes("historial")) return "/pedidos/historial";
      if (op.permisos.includes("configuracion")) return "/pedidos/config";
    }
    return this.moduloEntryPath;
  }

  configurar(modulos: Modulo[], rol: Rol) {
    this.modulos = modulos;
    this.rol = rol;
    this.persist();
  }

  setRol(rol: Rol) {
    this.rol = rol;
    this.persist();
  }

  simular(operadorId: string) {
    const op = operadoresStore.operadores.find((o) => o.id === operadorId);
    if (!op) return;
    this.operadorSimuladoId = operadorId;
    this.rol = "operador";
    this.modulos = ["pedidos"];
    this.persist();
  }

  salirSimulacion() {
    this.operadorSimuladoId = null;
    this.rol = "administrador";
    this.persist();
  }

  reset() {
    this.modulos = [];
    this.rol = null;
    this.operadorSimuladoId = null;
    this.persist();
  }
}

export const sessionStore = new SessionStore();
