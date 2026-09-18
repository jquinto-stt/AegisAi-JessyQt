import { makeAutoObservable } from "mobx";
import { integracionesStore } from "./integraciones.store";

// ═══════════════════════════════════════════════════════════════════════════
// PLATAFORMA STORE (v2) — Módulos de Negocio y Conectores Scoped
// ═══════════════════════════════════════════════════════════════════════════
//
// Modelo de Arquitectura:
// 1. Módulos de Negocio Core (Verticales): Pedidos, Inventario.
// 2. Plugins / Conectores Scoped: Necto IA y Canales de WhatsApp se activan
//    por CADA módulo de negocio.
// 3. Efecto en Cascada:
//    - Un canal o plugin global (como Canales o Inteligencia en el sidebar)
//      solo se muestra si AL MENOS UN módulo activo tiene su conector prendido.
//    - Si Pedidos apaga Necto IA, integracionesStore desconecta Pedidos de la IA.
//
// ═══════════════════════════════════════════════════════════════════════════

export type IdModuloNegocio = "pedidos" | "inventario";
export type IdConector = "necto_ia" | "whatsapp";

export interface InfoModuloNegocio {
  id: IdModuloNegocio;
  nombre: string;
  tagline: string;
  descripcion: string;
  rutaPrincipal: string;
  rutaConfig?: string;
  disponible: boolean;
}

export interface InfoConectorModulo {
  id: IdConector;
  nombre: string;
  descripcion: string;
  beneficios: string[];
}

export const CATALOGO_MODULOS: Record<IdModuloNegocio, InfoModuloNegocio> = {
  pedidos: {
    id: "pedidos",
    nombre: "Pedidos & Delivery",
    tagline: "Ventas y Operaciones",
    descripcion: "Tablero de pedidos, cocina, delivery, estados en tiempo real y analítica de ventas.",
    rutaPrincipal: "/pedidos",
    rutaConfig: "/pedidos/config",
    disponible: true,
  },
  inventario: {
    id: "inventario",
    nombre: "Inventario & Stock",
    tagline: "Catálogo y Existencias",
    descripcion: "Control de productos, variantes, bodegas, alertas de reposición y stock disponible.",
    rutaPrincipal: "/inventario",
    disponible: true,
  },
};

export const DETALLE_CONECTORES: Record<IdModuloNegocio, Record<IdConector, InfoConectorModulo>> = {
  pedidos: {
    necto_ia: {
      id: "necto_ia",
      nombre: "Necto Intelligence (IA)",
      descripcion: "Permite a Necto IA analizar y operar sobre los pedidos de la tienda.",
      beneficios: [
        "Consultar pedidos activos, tiempos de entrega y cocina",
        "Generar resúmenes ejecutivos diarios y comparativas de ventas",
        "Sugerir respuestas automáticas ante dudas de clientes",
      ],
    },
    whatsapp: {
      id: "whatsapp",
      nombre: "Canales de WhatsApp",
      descripcion: "Conecta la bandeja de entrada y notificaciones automáticas de pedidos a WhatsApp.",
      beneficios: [
        "Envío de plantillas automáticas de estado (confirmado, en camino, listo)",
        "Recepción de pedidos y atención por chat unificado",
        "Historial de conversación sincronizado con cada pedido",
      ],
    },
  },
  inventario: {
    necto_ia: {
      id: "necto_ia",
      nombre: "Necto Intelligence (IA)",
      descripcion: "Permite a Necto IA responder sobre existencias y niveles de stock.",
      beneficios: [
        "Consultar existencias y ubicación de productos por chat",
        "Detectar productos próximos a agotarse",
        "Asistencia en reposición y catálogo",
      ],
    },
    whatsapp: {
      id: "whatsapp",
      nombre: "Canales de WhatsApp",
      descripcion: "Habilita consultas de disponibilidad de productos por WhatsApp.",
      beneficios: [
        "Respuestas instantáneas de stock a clientes por chat",
        "Envío de catálogo y precios por mensaje directo",
      ],
    },
  },
};

export interface EstadoModuloNegocio {
  activo: boolean;
  conectores: Record<IdConector, boolean>;
}

const STORAGE_KEY = "necto.plataforma.v2";

const ESTADO_INICIAL: Record<IdModuloNegocio, EstadoModuloNegocio> = {
  pedidos: {
    activo: true,
    conectores: {
      necto_ia: true,
      whatsapp: true,
    },
  },
  inventario: {
    activo: false,
    conectores: {
      necto_ia: false,
      whatsapp: false,
    },
  },
};

function cargarDesdeStorage(): Record<IdModuloNegocio, EstadoModuloNegocio> {
  if (typeof localStorage === "undefined") {
    return JSON.parse(JSON.stringify(ESTADO_INICIAL));
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(ESTADO_INICIAL));
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return JSON.parse(JSON.stringify(ESTADO_INICIAL));
    }

    return {
      pedidos: {
        activo: typeof parsed.pedidos?.activo === "boolean" ? parsed.pedidos.activo : ESTADO_INICIAL.pedidos.activo,
        conectores: {
          necto_ia: typeof parsed.pedidos?.conectores?.necto_ia === "boolean"
            ? parsed.pedidos.conectores.necto_ia
            : ESTADO_INICIAL.pedidos.conectores.necto_ia,
          whatsapp: typeof parsed.pedidos?.conectores?.whatsapp === "boolean"
            ? parsed.pedidos.conectores.whatsapp
            : ESTADO_INICIAL.pedidos.conectores.whatsapp,
        },
      },
      inventario: {
        activo: typeof parsed.inventario?.activo === "boolean" ? parsed.inventario.activo : ESTADO_INICIAL.inventario.activo,
        conectores: {
          necto_ia: typeof parsed.inventario?.conectores?.necto_ia === "boolean"
            ? parsed.inventario.conectores.necto_ia
            : ESTADO_INICIAL.inventario.conectores.necto_ia,
          whatsapp: typeof parsed.inventario?.conectores?.whatsapp === "boolean"
            ? parsed.inventario.conectores.whatsapp
            : ESTADO_INICIAL.inventario.conectores.whatsapp,
        },
      },
    };
  } catch {
    return JSON.parse(JSON.stringify(ESTADO_INICIAL));
  }
}

function guardarEnStorage(estado: Record<IdModuloNegocio, EstadoModuloNegocio>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  } catch {
    // Fail-safe silencioso
  }
}

export class PlataformaStore {
  modulos: Record<IdModuloNegocio, EstadoModuloNegocio>;

  constructor() {
    this.modulos = cargarDesdeStorage();
    makeAutoObservable(this);
  }

  /** ¿Está habilitado el módulo de negocio en la organización? */
  esModuloActivo(id: IdModuloNegocio): boolean {
    return Boolean(this.modulos[id]?.activo);
  }

  /** Activa o desactiva un módulo de negocio completo. */
  setModuloActivo(id: IdModuloNegocio, activo: boolean): void {
    if (!this.modulos[id]) return;
    this.modulos[id].activo = activo;
    this.sincronizarConectores(id);
    guardarEnStorage(this.modulos);
  }

  /** Toggle de activación del módulo de negocio. */
  toggleModulo(id: IdModuloNegocio): void {
    this.setModuloActivo(id, !this.esModuloActivo(id));
  }

  /** ¿Está habilitado un conector específico para un módulo de negocio? */
  esConectorActivo(moduloId: IdModuloNegocio, conectorId: IdConector): boolean {
    return Boolean(this.modulos[moduloId]?.activo && this.modulos[moduloId]?.conectores[conectorId]);
  }

  /** Activa o desactiva un conector en un módulo de negocio. */
  setConectorActivo(moduloId: IdModuloNegocio, conectorId: IdConector, activo: boolean): void {
    if (!this.modulos[moduloId]) return;
    this.modulos[moduloId].conectores[conectorId] = activo;
    this.sincronizarConectores(moduloId);
    guardarEnStorage(this.modulos);
  }

  /** Toggle de activación de un conector en un módulo. */
  toggleConector(moduloId: IdModuloNegocio, conectorId: IdConector): void {
    const actual = Boolean(this.modulos[moduloId]?.conectores[conectorId]);
    this.setConectorActivo(moduloId, conectorId, !actual);
  }

  /**
   * ¿Existe al menos un módulo activo que tenga este conector encendido?
   * Determina si la sección general (ej: Inteligencia o Canales) se pinta en el sidebar.
   */
  tieneConectorActivo(conectorId: IdConector): boolean {
    return (Object.keys(this.modulos) as IdModuloNegocio[]).some((mId) =>
      this.esConectorActivo(mId, conectorId)
    );
  }

  /**
   * Helper de compatibilidad con código que pregunte estaActivo("pedidos"),
   * estaActivo("asistente") o estaActivo("conversaciones").
   */
  estaActivo(id: string): boolean {
    if (id === "pedidos" || id === "inventario") {
      return this.esModuloActivo(id);
    }
    if (id === "asistente") {
      return this.tieneConectorActivo("necto_ia");
    }
    if (id === "conversaciones") {
      return this.tieneConectorActivo("whatsapp");
    }
    return false;
  }

  /** Sincroniza el store del Asistente (Necto IA) con el estado del conector de pedidos. */
  private sincronizarConectores(moduloId: IdModuloNegocio): void {
    if (moduloId === "pedidos") {
      const activo = this.esConectorActivo("pedidos", "necto_ia");
      if (activo) {
        integracionesStore.conectar("pedidos");
      } else {
        integracionesStore.desconectar("pedidos");
      }
    }
  }

  /** Restablece la configuración inicial. */
  reiniciar(): void {
    this.modulos = JSON.parse(JSON.stringify(ESTADO_INICIAL));
    this.sincronizarConectores("pedidos");
    guardarEnStorage(this.modulos);
  }

  /** Lista de catálogo de módulos. */
  get catalogoModulos(): InfoModuloNegocio[] {
    return Object.values(CATALOGO_MODULOS);
  }
}

export const plataformaStore = new PlataformaStore();
