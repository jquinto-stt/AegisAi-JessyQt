import { makeAutoObservable } from "mobx";

// ═══════════════════════════════════════════════════════════════════════════
// NIVEL 1 — PLATAFORMA (catálogo)
// ═══════════════════════════════════════════════════════════════════════════
//
//   Nivel 1 · PLATAFORMA    ¿qué módulos y conectores EXISTEN?   ← este archivo
//   Nivel 2 · ORGANIZACIÓN  ¿qué tiene ACTIVADO esta empresa?    (organizacion.store)
//   Nivel 3 · SESIÓN        ¿qué OPERA esta persona?             (session.store)
//
//   Regla de dirección: Sesión ⊆ Organización ⊆ Plataforma.
//   Cada nivel puede RESTRINGIR al de abajo. Ninguno puede AMPLIAR.
//
// ── Qué cambió, y por qué ─────────────────────────────────────────────────
// Este store **mezclaba dos niveles**. Guardaba el catálogo (correcto: es global
// y constante) junto con `modulos[id].{instalado, activo, conectores}`, que es
// estado **por organización**, bajo una clave de `localStorage` sin `orgId`
// (`necto.plataforma.v2`).
//
// Ese estado se mudó a `organizacionStore`, que es su nivel. El síntoma que lo
// delataba: `esModuloActivo("pedidos")` se leía «la plataforma tiene Pedidos
// activo» cuando significaba «esta organización lo tiene». Y el defecto real:
// dos consumidores leían de aquí y otros dos de `organizacionStore`, así que
// «¿tiene Pedidos esta organización?» tenía dos respuestas en el mismo render.
//
// ── Lo que este store NO hace ─────────────────────────────────────────────
// 1. **No tiene estado propio.** No persiste nada, no muta nada. Es un catálogo
//    de solo lectura. Si alguna vez necesita un `set`, está en el nivel equivocado.
// 2. **No decide qué tiene activo nadie.** Eso es nivel 2.
// 3. **No decide acceso.** Eso es nivel 3 (capacidades) y el nivel 2 (pertenencia).
//
// El catálogo está indexado por `Record<IdModuloNegocio, …>`, así que es
// **exhaustivo por construcción**: no se puede añadir un módulo al tipo sin darle
// entrada aquí, y el compilador lo exige. Es el mismo patrón que
// `integracionesStore.MODULOS_INTEGRABLES`, que sí estaba bien hecho.
//
// ═══════════════════════════════════════════════════════════════════════════

export type IdModuloNegocio = "pedidos";
export type IdConector = "necto_ia" | "whatsapp";

export interface InfoModuloNegocio {
  id: IdModuloNegocio;
  nombre: string;
  nombreCorto: string;
  tagline: string;
  descripcion: string;
  rutaPrincipal: string;
  rutaConfig?: string;
  rutaOnboarding?: string;
  disponible: boolean;
  destacados: string[];
}

export interface InfoConectorModulo {
  id: IdConector;
  nombre: string;
  descripcion: string;
  beneficios: string[];
}

export interface EstadoModuloNegocio {
  instalado: boolean;
  activo: boolean;
  conectores: Record<IdConector, boolean>;
}

/** Conectores posibles de cualquier módulo, en orden canónico. */
export const IDS_CONECTORES: IdConector[] = ["necto_ia", "whatsapp"];

export const CATALOGO_MODULOS: Record<IdModuloNegocio, InfoModuloNegocio> = {
  pedidos: {
    id: "pedidos",
    nombre: "Pedidos & Fulfillment",
    nombreCorto: "Pedidos",
    tagline: "Ventas y Operaciones",
    descripcion: "Tablero de pedidos, preparación y despacho, envíos, estados en tiempo real y analítica de ventas.",
    rutaPrincipal: "/pedidos/inicio",
    rutaConfig: "/pedidos/config",
    rutaOnboarding: "/onboarding/pedidos",
    disponible: true,
    destacados: [
      "Tablero Kanban por estados",
      "Perfiles comerciales adaptables",
      "Agentes IA & WhatsApp",
    ],
  },
};

export const DETALLE_CONECTORES: Record<IdModuloNegocio, Record<IdConector, InfoConectorModulo>> = {
  pedidos: {
    necto_ia: {
      id: "necto_ia",
      nombre: "Necto Intelligence (IA)",
      descripcion: "Permite a Necto IA analizar y operar sobre los pedidos de la tienda.",
      beneficios: [
        "Consultar pedidos activos, tiempos de entrega y preparación",
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
};

/**
 * PlataformaStore — el catálogo de lo que Necto ofrece. **Solo lectura.**
 *
 * No tiene estado ni persistencia: es una vista sobre las constantes de arriba.
 * Existe como objeto para que las superficies pregunten «¿qué ofrece Necto?» sin
 * importar las constantes directamente, y para tener un sitio donde añadir
 * consultas del catálogo sin abrir el nivel 2.
 */
export class PlataformaStore {
  constructor() {
    makeAutoObservable(this);
  }

  /** Lista del catálogo, en orden de declaración. */
  get catalogoModulos(): InfoModuloNegocio[] {
    return Object.values(CATALOGO_MODULOS);
  }

  /** ¿Existe el módulo en el producto (aunque la organización no lo tenga)? */
  esModuloDisponible(id: IdModuloNegocio): boolean {
    return Boolean(CATALOGO_MODULOS[id]?.disponible);
  }

  /** Los conectores que un módulo puede llegar a tener, según el catálogo. */
  conectoresDe(id: IdModuloNegocio): IdConector[] {
    const detalle = DETALLE_CONECTORES[id];
    if (!detalle) return [];
    return (Object.keys(detalle) as IdConector[]).filter((c) => Boolean(detalle[c]));
  }
}

export const plataformaStore = new PlataformaStore();
