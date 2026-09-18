import { makeAutoObservable } from "mobx";

// ═══════════════════════════════════════════════════════════════════════════
// PLATAFORMA STORE — Módulos Core y Plugins de la Organización
// ═══════════════════════════════════════════════════════════════════════════
//
// Administra qué módulos de negocio (verticales) y qué plugins (capacidades
// transversales / add-ons) están habilitados en la organización.
//
// Principios de arquitectura:
// 1. Fail-closed: Si un módulo está inactivo, no se renderiza en la navegación
//    y sus rutas rechazan el acceso.
// 2. Independencia de permisos: El acceso efectivo es la intersección entre
//    módulo activo en la plataforma Y permisos asignados al rol del operador.
// 3. Persistencia local reactiva con sincronización de estado.
//
// ═══════════════════════════════════════════════════════════════════════════

export type CategoriaPlataforma = "negocio" | "plugin";

export type IdPlataforma = "pedidos" | "inventario" | "conversaciones" | "asistente";

export interface ItemPlataforma {
  id: IdPlataforma;
  categoria: CategoriaPlataforma;
  nombre: string;
  descripcion: string;
  detalle: string;
  badgeLabel?: string;
  disponible: boolean;
  rutaPrincipal: string;
  rutaConfig?: string;
}

export const CATALOGO_PLATAFORMA: Record<IdPlataforma, ItemPlataforma> = {
  pedidos: {
    id: "pedidos",
    categoria: "negocio",
    nombre: "Pedidos & Delivery",
    descripcion: "Gestión completa de órdenes, cocina, delivery, historial y métricas de venta.",
    detalle: "Control de ciclo de vida del pedido, estados, asignación a repartidores y analítica operativa.",
    disponible: true,
    rutaPrincipal: "/pedidos",
    rutaConfig: "/pedidos/config",
  },
  inventario: {
    id: "inventario",
    categoria: "negocio",
    nombre: "Inventario & Stock",
    descripcion: "Control de catálogo de productos, existencias, alertas de reposición y bodegas.",
    detalle: "Permite gestionar variantes, costos, precios de venta y sincronización de existencias.",
    disponible: true,
    rutaPrincipal: "/inventario",
  },
  conversaciones: {
    id: "conversaciones",
    categoria: "plugin",
    nombre: "Canales de WhatsApp",
    descripcion: "Bandeja de entrada omnicanal para atención al cliente y mensajes entrantes de WhatsApp.",
    detalle: "Incluye chat en vivo, derivación inteligente a operadores e historial de conversaciones.",
    disponible: true,
    rutaPrincipal: "/conversaciones",
    rutaConfig: "/conversaciones/config",
  },
  asistente: {
    id: "asistente",
    categoria: "plugin",
    nombre: "Necto Intelligence (IA)",
    descripcion: "Copiloto con inteligencia artificial conectado a las herramientas de los módulos activos.",
    detalle: "Genera resúmenes ejecutivos, sugiere respuestas automáticas y analiza métricas operativas.",
    disponible: true,
    rutaPrincipal: "/asistente",
    rutaConfig: "/asistente/config",
  },
};

export const ORDEN_PLATAFORMA: IdPlataforma[] = [
  "pedidos",
  "inventario",
  "conversaciones",
  "asistente",
];

const STORAGE_KEY = "necto.plataforma.modulos";

const ESTADO_INICIAL: Record<IdPlataforma, boolean> = {
  pedidos: true,
  inventario: false,
  conversaciones: true,
  asistente: true,
};

function cargarDesdeStorage(): Record<IdPlataforma, boolean> {
  if (typeof localStorage === "undefined") {
    return { ...ESTADO_INICIAL };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...ESTADO_INICIAL };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return { ...ESTADO_INICIAL };

    return {
      pedidos: typeof parsed.pedidos === "boolean" ? parsed.pedidos : ESTADO_INICIAL.pedidos,
      inventario: typeof parsed.inventario === "boolean" ? parsed.inventario : ESTADO_INICIAL.inventario,
      conversaciones: typeof parsed.conversaciones === "boolean" ? parsed.conversaciones : ESTADO_INICIAL.conversaciones,
      asistente: typeof parsed.asistente === "boolean" ? parsed.asistente : ESTADO_INICIAL.asistente,
    };
  } catch {
    return { ...ESTADO_INICIAL };
  }
}

function guardarEnStorage(estado: Record<IdPlataforma, boolean>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  } catch {
    // Fail-safe silencioso
  }
}

export class PlataformaStore {
  activos: Record<IdPlataforma, boolean>;

  constructor() {
    this.activos = cargarDesdeStorage();
    makeAutoObservable(this);
  }

  /** Consulta si un módulo o plugin está activo en la organización. */
  estaActivo(id: IdPlataforma | string): boolean {
    return Boolean(this.activos[id as IdPlataforma]);
  }

  /** Activa o desactiva un módulo o plugin. */
  toggle(id: IdPlataforma): void {
    this.activos[id] = !this.activos[id];
    guardarEnStorage(this.activos);
  }

  /** Activa explícitamente un módulo o plugin. */
  activar(id: IdPlataforma): void {
    this.activos[id] = true;
    guardarEnStorage(this.activos);
  }

  /** Desactiva explícitamente un módulo o plugin. */
  desactivar(id: IdPlataforma): void {
    this.activos[id] = false;
    guardarEnStorage(this.activos);
  }

  /** Restablece la configuración de módulos a su estado inicial. */
  reiniciar(): void {
    this.activos = { ...ESTADO_INICIAL };
    guardarEnStorage(this.activos);
  }

  /** Catálogo completo con información de cada módulo. */
  get items(): ItemPlataforma[] {
    return ORDEN_PLATAFORMA.map((id) => CATALOGO_PLATAFORMA[id]);
  }

  /** Módulos de negocio (Core Verticals). */
  get modulosNegocio(): ItemPlataforma[] {
    return this.items.filter((item) => item.categoria === "negocio");
  }

  /** Plugins e integraciones (Cross-cutting Add-ons). */
  get plugins(): ItemPlataforma[] {
    return this.items.filter((item) => item.categoria === "plugin");
  }

  /** Cantidad de módulos y plugins activos en la organización. */
  get cantidadActivos(): number {
    return Object.values(this.activos).filter(Boolean).length;
  }
}

export const plataformaStore = new PlataformaStore();
