import { makeAutoObservable } from "mobx";

// ═══════════════════════════════════════════════════════════════════════════
// CONTRATO DE ARQUITECTURA
// ═══════════════════════════════════════════════════════════════════════════
//
// Este archivo implementa el contrato de acceso de Necto:
//   outputs/contrato-arquitectura-acceso-necto.md
//
// Regla de autoridad: si este código contradice el contrato, gana el contrato.
//
// Resumen de los conceptos que viven aquí:
//   Rol        → paquete nombrado y reutilizable de capacidades (§1.3)
//   Capacidad  → unidad atómica de autorización; nombra una ACCIÓN (§1.4)
//
// Lo que NO vive aquí:
//   Sección    → destino de navegación (ver SECCIONES en operadores.store)
//   Scope      → qué datos se ven (ver DataScope en session.store)
//   Sesión     → quién opera y en qué módulos (ver session.store)
//
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// CAPACIDADES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Capacidad — unidad atómica de autorización. Nombra una **acción**, nunca una
 * pantalla ni una ruta.
 *
 * Formato: `<dominio>.<accion>`
 *
 * Prueba de olor (contrato §1.4): si una capacidad se puede satisfacer
 * simplemente "estando en una pantalla", está mal nombrada.
 *   `orders.page` ❌  →  `orders.read` ✅
 *
 * Contrato: §1.4. Invariante C4: ninguna capacidad puede nombrar una pantalla.
 */
export type Capacidad =
  // Órdenes de pedidos
  | "orders.read"
  | "orders.create"
  | "orders.confirm"
  | "orders.cancel"
  | "orders.edit"
  | "orders.delete"
  // Preparación
  | "preparation.read"
  | "preparation.manage"
  // Pedidos programados
  | "scheduled.read"
  | "scheduled.manage"
  // Canales (WhatsApp, etc.)
  | "channels.read"
  | "channels.respond"
  | "channels.manage"
  // Inventarios
  | "inventory.read"
  | "inventory.count"
  | "inventory.manage"
  | "inventory.finalize"
  | "inventory.configure"
  // Ajustes del módulo
  | "settings.read"
  | "settings.manage"
  // Equipo
  | "team.read"
  | "team.manage"
  // Asistente IA
  | "assistant.use";

/**
 * Catálogo completo de capacidades (pedidos + inventarios + asistente IA).
 */
export const CAPACIDADES: Capacidad[] = [
  "orders.read",
  "orders.create",
  "orders.confirm",
  "orders.cancel",
  "orders.edit",
  "orders.delete",
  "preparation.read",
  "preparation.manage",
  "scheduled.read",
  "scheduled.manage",
  "channels.read",
  "channels.respond",
  "channels.manage",
  "inventory.read",
  "inventory.count",
  "inventory.manage",
  "inventory.finalize",
  "inventory.configure",
  "settings.read",
  "settings.manage",
  "team.read",
  "team.manage",
  "assistant.use",
];

/** Etiqueta legible de cada capacidad (para el editor de roles y perfiles). */
export const CAPACIDAD_LABEL: Record<Capacidad, string> = {
  "orders.read": "Ver órdenes",
  "orders.create": "Crear órdenes",
  "orders.confirm": "Confirmar órdenes",
  "orders.cancel": "Cancelar órdenes",
  "orders.edit": "Editar órdenes",
  "orders.delete": "Eliminar órdenes",
  "preparation.read": "Ver preparación",
  "preparation.manage": "Gestionar preparación",
  "scheduled.read": "Ver programados",
  "scheduled.manage": "Gestionar programados",
  "channels.read": "Ver canales",
  "channels.respond": "Responder en canales",
  "channels.manage": "Gestionar canales",
  "inventory.read": "Ver inventarios",
  "inventory.count": "Contar y agregar elementos",
  "inventory.manage": "Gestionar elementos y ubicaciones",
  "inventory.finalize": "Finalizar y anular inventarios",
  "inventory.configure": "Configurar el módulo de inventarios",
  "settings.read": "Ver configuración",
  "settings.manage": "Editar configuración",
  "team.read": "Ver equipo",
  "team.manage": "Gestionar equipo",
  "assistant.use": "Usar asistente IA",
};

/**
 * Agrupación de capacidades para la UI. Sirve para que el editor de roles y el
 * perfil muestren los switches agrupados por área en vez de una lista plana.
 */
export interface CapacidadGrupo {
  id: string;
  label: string;
  capacidades: Capacidad[];
}

export const CAPACIDAD_GRUPOS: CapacidadGrupo[] = [
  { id: "ordenes", label: "Órdenes", capacidades: ["orders.read", "orders.create", "orders.confirm", "orders.cancel", "orders.edit", "orders.delete"] },
  { id: "preparacion", label: "Preparación", capacidades: ["preparation.read", "preparation.manage"] },
  { id: "programados", label: "Programados", capacidades: ["scheduled.read", "scheduled.manage"] },
  { id: "canales", label: "Canales", capacidades: ["channels.read", "channels.respond", "channels.manage"] },
  { id: "inventarios", label: "Inventarios", capacidades: ["inventory.read", "inventory.count", "inventory.manage", "inventory.finalize", "inventory.configure"] },
  { id: "ajustes", label: "Configuración", capacidades: ["settings.read", "settings.manage"] },
  { id: "equipo", label: "Equipo", capacidades: ["team.read", "team.manage"] },
  { id: "asistente", label: "Asistente", capacidades: ["assistant.use"] },
];

// ═══════════════════════════════════════════════════════════════════════════
// ROLES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rol — paquete **nombrado y reutilizable** de capacidades (contrato §1.3).
 */
export interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  capacidades: Capacidad[];
  /** Los roles de sistema no se pueden eliminar desde la UI. */
  sistema?: boolean;
}

export const ROL_ADMIN = "admin_tienda";

/** Catálogo inicial de roles (los 5 roles de Pedidos + analista de inventarios para Inventarios). */
export const ROLES_SEED: Rol[] = [
  {
    id: ROL_ADMIN,
    nombre: "Administrador de tienda",
    descripcion: "Control total de la tienda y de su equipo.",
    capacidades: [...CAPACIDADES],
    sistema: true,
  },
  {
    id: "supervisor_pedidos",
    nombre: "Supervisor de operaciones",
    descripcion: "Gestiona el ciclo operativo completo de órdenes, canales y métricas de equipo.",
    capacidades: [
      "orders.read", "orders.create", "orders.confirm", "orders.cancel", "orders.edit", "orders.delete",
      "preparation.read", "preparation.manage",
      "scheduled.read", "scheduled.manage",
      "channels.read", "channels.respond", "channels.manage",
      "inventory.read", "inventory.count", "inventory.manage",
      "settings.read",
      "team.read",
    ],
    sistema: true,
  },
  {
    id: "vendedor",
    nombre: "Operador",
    descripcion: "Crea y atiende órdenes, chats con clientes y pedidos programados.",
    capacidades: [
      "orders.read", "orders.create", "orders.confirm", "orders.cancel", "orders.edit",
      "scheduled.read", "scheduled.manage",
      "channels.read", "channels.respond",
      "inventory.read", "inventory.count",
    ],
    sistema: true,
  },
  {
    id: "preparacion",
    nombre: "Preparación",
    descripcion: "Prepara y despacha los pedidos confirmados en cocina o bodega.",
    capacidades: ["orders.read", "preparation.read", "preparation.manage", "scheduled.read"],
    sistema: true,
  },
  {
    id: "analista_inventarios",
    nombre: "Analista de inventarios",
    descripcion: "Consulta el módulo de inventarios y exporta reportes, sin modificar nada.",
    capacidades: [
      "inventory.read",
      "settings.read",
    ],
    sistema: true,
  },
  {
    id: "personalizado",
    nombre: "Personalizado",
    descripcion: "Empieza sin capacidades; se ajustan a medida según las necesidades.",
    capacidades: [],
    sistema: true,
  },
];

/**
 * Lo mínimo que necesita el cálculo de capacidades efectivas.
 *
 * Se declara estructuralmente (en vez de importar `Operador`) para que este
 * archivo no dependa de `operadores.store` y no se creen ciclos de imports.
 */
export interface PortadorDeRol {
  rolId?: string;
  capacidadesExtra?: Capacidad[];
  capacidadesRemovidas?: Capacidad[];
}

// ═══════════════════════════════════════════════════════════════════════════
// STORE (mock, en memoria)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * RolesStore — catálogo de roles del negocio (mock, sin backend).
 *
 * El catálogo vive en memoria: los roles creados o editados se pierden al
 * recargar la página. Igual que `OperadoresStore`, no persiste (decisión
 * explícita: no hay backend y no se añade localStorage para esto).
 */
export class RolesStore {
  roles: Rol[] = ROLES_SEED.map((r) => ({ ...r, capacidades: [...r.capacidades] }));

  constructor() {
    makeAutoObservable(this);
  }

  // ── Lectura ────────────────────────────────────────────────────────────────

  /** Rol por id, o undefined si no existe. */
  porId(id: string | null | undefined): Rol | undefined {
    if (!id) return undefined;
    return this.roles.find((r) => r.id === id);
  }

  /** Nombre legible de un rol (cadena vacía si no existe). */
  nombreDe(id: string | null | undefined): string {
    return this.porId(id)?.nombre ?? "";
  }

  /** Capacidades base de un rol. Cadena vacía si el rol no existe (fail-closed). */
  capacidadesDe(rolId: string | null | undefined): Capacidad[] {
    return this.porId(rolId)?.capacidades ?? [];
  }

  /**
   * Capacidades efectivas de un portador de rol (contrato §2):
   *
   *     capacidadesEfectivas = capacidades(rol) ∪ extras \ removidas
   *
   * **La denegación gana siempre**: `capacidadesRemovidas` gana sobre el rol y
   * sobre un `capacidadesExtra` del mismo valor.
   *
   * Si `rolId` falta o no existe → `[]` (fail-closed). Invariante C7: nunca
   * devuelve una capacidad que no venga del rol o de los extras.
   */
  capacidadesEfectivas(p: PortadorDeRol): Capacidad[] {
    const base = this.capacidadesDe(p.rolId);
    const extra = p.capacidadesExtra ?? [];
    const removidas = new Set<Capacidad>(p.capacidadesRemovidas ?? []);

    const union = new Set<Capacidad>([...base, ...extra]);
    for (const cap of removidas) union.delete(cap);
    return [...union];
  }

  // ── Acciones ───────────────────────────────────────────────────────────────

  /** Crea un rol nuevo (personalizado, nunca de sistema). */
  crear(data: { nombre: string; descripcion?: string; capacidades?: Capacidad[] }): Rol {
    const rol: Rol = {
      id: `rol_${Date.now()}`,
      nombre: data.nombre,
      descripcion: data.descripcion ?? "",
      capacidades: [...(data.capacidades ?? [])],
      sistema: false,
    };
    this.roles.push(rol);
    return rol;
  }

  /** Actualiza un rol existente. Ignora ids desconocidos. */
  actualizar(id: string, patch: Partial<Omit<Rol, "id" | "sistema">>) {
    const rol = this.porId(id);
    if (!rol) return;
    if (patch.nombre !== undefined) rol.nombre = patch.nombre;
    if (patch.descripcion !== undefined) rol.descripcion = patch.descripcion;
    if (patch.capacidades !== undefined) rol.capacidades = [...patch.capacidades];
  }

  /** Duplica un rol existente con un nombre nuevo. */
  duplicar(id: string, nombre?: string): Rol | null {
    const rol = this.porId(id);
    if (!rol) return null;
    return this.crear({
      nombre: nombre ?? `${rol.nombre} (copia)`,
      descripcion: rol.descripcion,
      capacidades: rol.capacidades,
    });
  }

  /**
   * Elimina un rol. Los roles de sistema (`sistema: true`) no se pueden borrar:
   * el administrador debe seguir existiendo.
   */
  eliminar(id: string) {
    const rol = this.porId(id);
    if (!rol || rol.sistema) return;
    this.roles = this.roles.filter((r) => r.id !== id);
  }
}

export const rolesStore = new RolesStore();
