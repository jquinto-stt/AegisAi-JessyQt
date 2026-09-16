import { makeAutoObservable } from "mobx";
import type { Modulo } from "@/stores/session.store";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type OperadorEstado = "activo" | "pendiente" | "inactivo";

export interface Operador {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  estado: OperadorEstado;
  modulo: Modulo;
  permisos: string[];
}

export interface Seccion {
  id: string;
  label: string;
  path: string;
}

export const SECCIONES: Record<Modulo, Seccion[]> = {
  pedidos: [
    { id: "inicio", label: "Inicio", path: "/pedidos/inicio" },
    { id: "tablero", label: "Tablero", path: "/pedidos" },
    { id: "crear", label: "Crear pedido", path: "/pedidos/crear" },
    { id: "historial", label: "Historial", path: "/pedidos/historial" },
    { id: "configuracion", label: "Configuración", path: "/pedidos/config" },
  ],
};

const todasLasSecciones = (modulo: Modulo): string[] => SECCIONES[modulo].map((s) => s.id);

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════

const SEED: Operador[] = [
  { id: "d1", nombre: "Camila Ortiz", email: "camila.ortiz@negocio.com", telefono: "+57 320 111 2233", estado: "activo", modulo: "pedidos", permisos: todasLasSecciones("pedidos") },
  { id: "d2", nombre: "Mateo Vargas", email: "mateo.vargas@negocio.com", telefono: "+57 321 222 3344", estado: "activo", modulo: "pedidos", permisos: ["inicio", "tablero", "crear"] },
  { id: "d3", nombre: "Daniela Suárez", email: "daniela.suarez@negocio.com", telefono: "+57 322 333 4455", estado: "pendiente", modulo: "pedidos", permisos: ["inicio", "tablero"] },
];

// ═══════════════════════════════════════════════════════════════════════════
// STORE (mock)
// ═══════════════════════════════════════════════════════════════════════════

export class OperadoresStore {
  operadores: Operador[] = [...SEED];

  constructor() {
    makeAutoObservable(this);
  }

  porModulo(modulo: Modulo): Operador[] {
    return this.operadores.filter((o) => o.modulo === modulo);
  }

  pendientesCount(modulo: Modulo): number {
    return this.operadores.filter((o) => o.modulo === modulo && o.estado === "pendiente").length;
  }

  crear(
    modulo: Modulo,
    data: { nombre: string; email: string; telefono: string }
  ) {
    this.operadores.push({
      id: `d${Date.now()}`,
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      estado: "activo",
      modulo,
      permisos: todasLasSecciones(modulo),
    });
  }

  setPermisos(id: string, permisos: string[]) {
    const op = this.operadores.find((o) => o.id === id);
    if (op) op.permisos = permisos;
  }

  aprobar(id: string) {
    const op = this.operadores.find((o) => o.id === id);
    if (op) op.estado = "activo";
  }

  toggleActivo(id: string) {
    const op = this.operadores.find((o) => o.id === id);
    if (!op) return;
    op.estado = op.estado === "activo" ? "inactivo" : "activo";
  }

  eliminar(id: string) {
    this.operadores = this.operadores.filter((o) => o.id !== id);
  }
}

export const operadoresStore = new OperadoresStore();
