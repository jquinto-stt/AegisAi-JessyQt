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

export type IdModuloNegocio = "pedidos" | "inventario";
export type IdConector = "necto_ia" | "whatsapp";

export interface InfoModuloNegocio {
  id: IdModuloNegocio;
  nombre: string;
  /**
   * Nombre para el CROMO — sidebar, selector de módulo, encabezados de sección.
   *
   * `nombre` es la razón social («Pedidos & Fulfillment»): sirve para la ficha
   * del catálogo, donde hay espacio y se está vendiendo el módulo. No sirve para
   * una pestaña de 200 px, y por eso los dos sitios que pintan el nombre en el
   * cromo lo tenían ESCRITO A MANO — `"Pedidos"` literal en `AppSidebar` y en el
   * `ModuleSwitcher`. Con un solo módulo eso no se notaba; con dos, el sidebar
   * habría titulado «Pedidos» una sección de Inventario.
   *
   * Es la misma regla que ya rige el resto del cromo: **una etiqueta de módulo no
   * se escribe en un componente, se lee del catálogo.** Se declara aquí para que
   * añadir un módulo no exija editar tres componentes.
   */
  nombreCorto: string;
  tagline: string;
  descripcion: string;
  /**
   * Ruta de ENTRADA del módulo — a dónde se manda a alguien cuando «entra» a él.
   *
   * No es la ruta raíz del módulo por casualidad: en Pedidos, `/pedidos` es el
   * Tablero y `/pedidos/inicio` es la pantalla de llegada (es la que usan el logo
   * del sidebar, `homePathActual` de la sesión y el redirect del login). Si no
   * coinciden, manda la de entrada.
   */
  rutaPrincipal: string;
  rutaConfig?: string;
  /**
   * ¿Existe de verdad en el producto, o es una intención declarada?
   *
   * **Esta bandera es la única respuesta a «¿se puede usar hoy?»**, y las
   * superficies deben DERIVAR de ella en vez de decidirlo por su cuenta:
   *   · `ConfiguracionModulosPage` no ofrece instalar lo que no está disponible;
   *   · `OnboardingModulosPage` lo pinta «Próximamente» y deshabilitado.
   *
   * Los dos módulos del catálogo están en `true` desde el 21/09. El día que se
   * declare uno nuevo, se pone aquí a `true` y las dos superficies se encienden
   * solas — ninguna pregunta «¿es inventario?». Es el mismo patrón que
   * `integracionesStore.MODULOS_INTEGRABLES`, que ya lo hacía bien.
   *
   * **Debe coincidir con `MODULOS_INTEGRABLES[id].disponible`**: son dos
   * catálogos (el de módulos de negocio y el de módulos integrables en la IA) y
   * una discrepancia entre ellos hace que la app afirme dos cosas opuestas del
   * mismo módulo. Estuvo discrepando: aquí decía `true` y allí `false`.
   */
  disponible: boolean;
  /**
   * Tres o cuatro capacidades cortas, para la tarjeta del catálogo.
   *
   * Vive aquí y no en cada página porque es copy DEL MÓDULO, no de la pantalla:
   * mientras estuvo escrito a mano en `OnboardingModulosPage`, la misma ficha
   * tenía un texto distinto en cada sitio que la pintaba.
   */
  destacados: string[];
}

export interface InfoConectorModulo {
  id: IdConector;
  nombre: string;
  descripcion: string;
  beneficios: string[];
}

/**
 * Estado de un módulo **en una organización** (nivel 2).
 *
 * El TIPO vive aquí, junto al catálogo, porque describe la forma del estado
 * respecto de las claves del catálogo (`IdConector`). El DATO vive en
 * `organizacionStore`. Un tipo no pertenece a un nivel; un dato sí.
 */
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
    disponible: true,
    destacados: [
      "Tablero Kanban por estados",
      "Perfiles comerciales adaptables",
      "Agentes IA & WhatsApp",
    ],
  },
  inventario: {
    id: "inventario",
    nombre: "Inventario & Stock",
    nombreCorto: "Inventario",
    tagline: "Catálogo y Existencias",
    descripcion: "Control de productos, variantes, bodegas, alertas de reposición y stock disponible.",
    // `/inventario` es «Existencias» y `/inventario/inicio` es la pantalla de
    // llegada, igual que en Pedidos `/pedidos` es el Tablero y `/pedidos/inicio`
    // es el Inicio. **Manda la de entrada**, que es lo que este campo significa
    // (ver el docblock de `rutaPrincipal`): estaba apuntando a la raíz solo
    // porque con un módulo sin rutas daba igual a dónde apuntara.
    rutaPrincipal: "/inventario/inicio",
    rutaConfig: "/inventario/config",
    // `disponible: true` desde el 21/09 — y no es un flag suelto: es el último
    // paso de un encendido ATÓMICO. Se pasa a `true` a la vez que las cuatro
    // rutas ya existen, `SECCIONES.inventario` está declarada, el sidebar pinta
    // su rama y `MODULOS_INTEGRABLES.inventario` tiene proveedor. Encenderlo
    // antes habría ofrecido «Instalar» un módulo que al instalarse no aparecía
    // en ninguna parte.
    //
    // **Debe coincidir con `MODULOS_INTEGRABLES.inventario.disponible`**: son dos
    // catálogos y una discrepancia entre ellos hace que la app afirme dos cosas
    // opuestas del mismo módulo. Un test lo fija
    // (`plataforma.store.test.ts`).
    disponible: true,
    destacados: ["Kárdex y movimientos", "Multi-almacén"],
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
