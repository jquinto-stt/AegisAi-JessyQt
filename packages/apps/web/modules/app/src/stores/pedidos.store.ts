import { makeAutoObservable } from "mobx";
import {
  BUSINESS_PROFILES,
  type BusinessProfile,
  type BusinessProfileType,
  type OrderCapability,
} from "../domain/pedidos/pedidos.profiles.js";
import { toOrderCore, toLegacyPedido } from "../domain/pedidos/pedidos.adapters.js";
import type { OrderCore } from "../domain/pedidos/pedidos.domain.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estados del pipeline de un pedido:
 *   nuevo → confirmado → en_preparacion → listo → en_camino → entregado
 * más `cancelado` (terminal, alcanzable desde cualquier estado no terminal).
 *
 * `programado` es un estado PREVIO al pipeline: el pedido aún no está activo,
 * espera a su hora programada (activación automática por tiempo o manual). No
 * cuenta como "en curso" ni entra al historial hasta activarse (pasa a `nuevo`).
 *
 * `confirmado` y `en_camino` son OPCIONALES: se pueden desactivar desde la
 * configuración del módulo. `en_camino` además solo aplica a pedidos con
 * modalidad `domicilio`.
 */
export type PedidoEstado =
  | "programado"
  | "nuevo"
  | "confirmado"
  | "en_preparacion"
  | "listo"
  | "en_camino"
  | "entregado"
  | "cancelado";

/** Modalidad de entrega del pedido (genérica, sin identidad de negocio). */
export type Modalidad = "retiro" | "domicilio" | "en_sitio";

/** Una línea del pedido: qué se pidió y cuánto. */
export interface PedidoItem {
  nombre: string;
  cantidad: number;
  /** Precio unitario opcional (viene del catálogo simple, si existe). */
  precio?: number;
}

/**
 * Por dónde entró el pedido. Dimensión independiente de `Modalidad` (cómo se
 * entrega) y de `PedidoEstado` (en qué punto del pipeline está): un pedido de
 * WhatsApp puede ser a domicilio o para retirar.
 */
export type Origen = "whatsapp" | "operador";

/**
 * Rango de días de calendario LOCAL, ambos inclusive, en formato "YYYY-MM-DD".
 * Es la entrada de todos los selectores `*EnRango` de la analítica.
 */
export interface RangoFechas {
  desde: string;
  hasta: string;
}

/** Dirección estructurada de entrega para pedidos con modalidad domicilio. */
export interface DireccionEntrega {
  calle: string;            // Ej: "Cra 45 # 12-34"
  barrio?: string;          // Ej: "El Poblado"
  referencia?: string;      // Ej: "Edificio Santillana, Apto 501"
  indicaciones?: string;    // Ej: "Timbre dañado, llamar al llegar"
}

/** Métodos de pago disponibles para el pedido. */
export type MetodoPago = "efectivo" | "transferencia" | "tarjeta" | "contra_entrega";

/** Un pedido que recorre el pipeline. Llega por WhatsApp (bot) o lo crea un operador. */
export interface Pedido {
  id: string;
  numero: string;            // legible, ej. "P-014"
  cliente: string;
  /**
   * Teléfono del cliente en formato E.164 (ej. "+573001112233"). Es la CLAVE DE
   * CRUCE con el módulo Conversaciones: `Contacto.telefono` guarda el mismo
   * valor, y `porTelefono` / `pedidoActivoDe` lo usan para enlazar el pedido con
   * su hilo de WhatsApp. La escritura al cliente ya NO ocurre aquí: se resuelve
   * en la capa de UI navegando a la conversación dentro del sistema.
   */
  telefono: string;
  modalidad: Modalidad;
  items: PedidoItem[];
  notas?: string;
  estado: PedidoEstado;
  origen: Origen;
  /** ¿El pedido ya fue pagado? (mock, para el segmento "Pago pendiente"). */
  pagado?: boolean;
  createdAt: string;         // ISO
  /** Momento en que entró al estado actual (para "tiempo en estado"). */
  estadoDesde: string;       // ISO
  finishedAt?: string;       // ISO — al entregar/cancelar
  /**
   * Fecha/hora ISO para la que se programó el pedido. Solo relevante mientras
   * el estado es `programado`; al activarse (manual o por tiempo) el pedido
   * pasa a `nuevo` y este campo queda como referencia histórica opcional.
   */
  programadoPara?: string;   // ISO

  /** Datos logísticos y de entrega */
  direccionEntrega?: DireccionEntrega;
  costoEnvio?: number;
  metodoPago?: MetodoPago;
  pagaCon?: number;          // Monto con el que abona para calcular el vuelto/cambio
  repartidor?: string;       // Nombre o alias del mensajero/repartidor asignado
}

/**
 * Un item del catálogo simple opcional (para autocompletar en Crear pedido).
 *
 * **Responde a «¿qué vendo y a cuánto?».** Es una lista de precios de venta, y
 * su respuesta queda CONGELADA en el pedido (los `OrderItem` guardan snapshots,
 * no punteros: cambiar un precio aquí no altera un pedido ya creado).
 *
 * **NO responde a «¿qué tengo, dónde y cuánto me costó?».** Eso es `Articulo`,
 * en Inventario: SKU, unidad de medida, punto de reorden, costo y bodega. Los
 * dos tipos no comparten clave ni campo; solo comparten el nombre de la cosa
 * que describen. **Deuda declarada** (ver `domain/inventario/inventario.domain.ts`),
 * con disparador: cuando el negocio pida «que un pedido descuente stock».
 */
export interface CatalogoItem {
  id: string;
  nombre: string;
  precio: number;
  /**
   * Tallas / variantes elegibles del item (`["S","M","L"]`, `["37","38"]`).
   *
   * Espeja `ProfileProductItem.variantesDisponibles` del dominio. Solo la traen los
   * perfiles que declaran la capacidad `variants` (moda); en el resto es `undefined`
   * y `CrearPedidoPage` no pinta el selector de talla.
   */
  variantesDisponibles?: string[];
}

/** Plantillas de WhatsApp que el bot "enviaría" en cada transición (solo texto). */
export interface PlantillasWhatsApp {
  recibido: string;
  confirmado: string;
  enPreparacion: string;
  listo: string;
  enCamino: string;
  entregado: string;
  cancelado: string;
}

/** Estados a los que aplica un alias / tiempo objetivo (los activos del pipeline). */
export type EstadoConfigurable = "nuevo" | "confirmado" | "en_preparacion" | "listo" | "en_camino";

/** Horario de atención del negocio. */
export interface HorarioAtencion {
  /** ¿Se aplica el horario? Si es false, se atiende siempre. */
  activo: boolean;
  /** Días laborales (0=Dom … 6=Sáb), en formato JS getDay(). */
  dias: number[];
  /** Hora de apertura "HH:mm". */
  apertura: string;
  /** Hora de cierre "HH:mm". */
  cierre: string;
}

/** Configuración editable del módulo, persistida en localStorage. */
export interface PedidosConfig {
  /** ¿Se usa el estado `confirmado` en el pipeline? */
  usarConfirmado: boolean;
  /** ¿Se usa el estado `en_camino` (reparto) en el pipeline? */
  usarEnCamino: boolean;
  /** Modalidades habilitadas para nuevos pedidos. */
  modalidades: Modalidad[];
  /** Minutos en un estado a partir de los cuales una tarjeta se marca urgente. */
  umbralUrgencia: number;
  /** Plantillas de mensaje por transición (SOLO REFERENCIA — no se envía nada). */
  plantillas: PlantillasWhatsApp;
  /** Catálogo simple opcional (vacío = campos libres en Crear pedido). */
  catalogo: CatalogoItem[];
  /**
   * Alias de etiqueta por estado (C). Renombra lo que se muestra sin cambiar la
   * lógica del pipeline. Clave = estado; valor = etiqueta personalizada (vacío = default).
   */
  aliasEstados: Partial<Record<EstadoConfigurable, string>>;
  /** Alias de etiqueta por modalidad. Vacío = etiqueta por defecto. */
  aliasModalidades: Partial<Record<Modalidad, string>>;
  /** Horario de atención del negocio (A). */
  horario: HorarioAtencion;
  /**
   * Tiempos objetivo por estado en minutos (B). Si un pedido supera su objetivo
   * se marca urgente. Reemplaza al umbral global cuando hay un valor por estado;
   * si un estado no tiene objetivo, cae en `umbralUrgencia`.
   */
  tiemposObjetivo: Partial<Record<EstadoConfigurable, number>>;
  /**
   * Alerta sonora recurrente cuando hay clientes que requieren atención.
   * `activo` enciende/apaga el sonido; `cadaSegundos` calibra cada cuánto suena.
   */
  alertaAtencion: AlertaAtencion;
  /** Perfil comercial del negocio (ej. 'food', 'fashion', 'services', 'general'). */
  perfilComercial?: import("../domain/pedidos/pedidos.profiles.js").BusinessProfileType;
  /** Capacidades comerciales activas para la tienda */
  capacidadesActivas?: import("../domain/pedidos/pedidos.profiles.js").OrderCapability[];
  /** Columnas dinámicas personalizadas del tablero (permite crear, renombrar, reordenar y eliminar). */
  columnasPersonalizadas?: ColumnaPersonalizada[];
}

/** Configuración de una columna personalizada en el tablero Kanban. */
export interface ColumnaPersonalizada {
  id: string;
  label: string;
  color?: string;
}

/** Configuración de la alerta sonora de "requieren atención". */
export interface AlertaAtencion {
  /** ¿Suena de forma recurrente cuando hay clientes que requieren atención? */
  activo: boolean;
  /** Cada cuántos segundos vuelve a sonar (por defecto 30). */
  cadaSegundos: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS / HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Estados no terminales, en orden del pipeline (incluye los opcionales). */
const PIPELINE_FULL: PedidoEstado[] = [
  "nuevo",
  "confirmado",
  "en_preparacion",
  "listo",
  "en_camino",
  "entregado",
];

/** Estados terminales (no admiten avance). */
const TERMINALES: PedidoEstado[] = ["entregado", "cancelado"];

const ESTADO_LABEL: Record<PedidoEstado, string> = {
  programado: "Programado",
  nuevo: "Nuevo",
  confirmado: "Confirmado",
  en_preparacion: "En preparación",
  listo: "Listo",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const MODALIDAD_LABEL: Record<Modalidad, string> = {
  retiro: "Retiro",
  domicilio: "Domicilio",
  en_sitio: "En sitio",
};

/**
 * Origen del pedido: por dónde entró. Es vocabulario de dominio propio, distinto
 * de la modalidad (cómo se entrega) y del estado (en qué punto del pipeline
 * está). La analítica agrupa por esta dimensión para separar el canal de
 * autoservicio (WhatsApp) del canal asistido (Operador).
 */
const ORIGEN_LABEL: Record<Origen, string> = {
  whatsapp: "WhatsApp",
  operador: "Mostrador",
};

/** Orden canónico de orígenes: estable en gráficos aunque falte uno. */
const ORIGEN_ORDEN: Origen[] = ["whatsapp", "operador"];

/**
 * Estados cuyo importe cuenta como **venta** en la analítica: el pedido fue
 * confirmado por el negocio y sigue vivo en el pipeline (o se entregó). Es la
 * definición que usa el AOV y la serie "Sales".
 */
const ESTADOS_VENTA: PedidoEstado[] = ["confirmado", "en_preparacion", "listo", "en_camino", "entregado"];

const DEFAULT_CONFIG: PedidosConfig = {
  usarConfirmado: true,
  usarEnCamino: true,
  modalidades: ["retiro", "domicilio", "en_sitio"],
  umbralUrgencia: 15,
  plantillas: {
    recibido: "¡Recibimos tu pedido! Lo estamos revisando.",
    confirmado: "Tu pedido fue confirmado y pronto entra en preparación.",
    enPreparacion: "¡Manos a la obra! Estamos preparando tu pedido.",
    listo: "Tu pedido está listo.",
    enCamino: "Tu pedido va en camino.",
    entregado: "¡Pedido entregado! Gracias por tu compra.",
    cancelado: "Tu pedido fue cancelado. Si tienes dudas, escríbenos.",
  },
  catalogo: [
    { id: "cat1", nombre: "Combo clásico", precio: 25000 },
    { id: "cat2", nombre: "Bebida 350ml", precio: 4000 },
    { id: "cat3", nombre: "Postre del día", precio: 8000 },
  ],
  aliasEstados: {},
  aliasModalidades: {},
  horario: {
    activo: false,
    dias: [1, 2, 3, 4, 5, 6], // Lun–Sáb por defecto
    apertura: "08:00",
    cierre: "20:00",
  },
  tiemposObjetivo: {},
  alertaAtencion: {
    activo: true,
    cadaSegundos: 30,
  },
  perfilComercial: "food",
  capacidadesActivas: [...BUSINESS_PROFILES.food.defaultCapabilities],
  columnasPersonalizadas: undefined,
};

// ── Proyección del catálogo ──────────────────────────────────────────────────
//
// El catálogo se proyecta desde `BusinessProfile.sampleCatalog` en DOS sitios
// (aquí, al aplicar un perfil, y en `ConfigPage`, al previsualizarlo en el
// borrador). Antes cada sitio reescribía el objeto a mano y los dos tiraban
// `variantesDisponibles`, así que el selector de talla de `CrearPedidoPage`
// era inalcanzable y el único síntoma eran 6 errores de `tsc`. Una sola
// función para que no vuelvan a divergir.

/**
 * Proyecta el catálogo de muestra de un preset al catálogo persistible.
 *
 * Conserva `variantesDisponibles` cuando el perfil las declara (moda). Se copia
 * el array en vez de compartir la referencia del preset, para que mutar el
 * catálogo del store no toque la constante del dominio.
 */
export function catalogoDesdePreset(preset: BusinessProfile): CatalogoItem[] {
  return preset.sampleCatalog.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    precio: c.precio,
    ...(c.variantesDisponibles ? { variantesDisponibles: [...c.variantesDisponibles] } : {}),
  }));
}

/**
 * Rehidrata `variantesDisponibles` en un catálogo ya guardado, tomándolas del
 * preset por `id`.
 *
 * Necesario porque las sesiones que ya corrieron el onboarding tienen en
 * `localStorage` un catálogo al que el mapper viejo le quitó las variantes: sin
 * este paso el arreglo de `catalogoDesdePreset` no les llegaría nunca. Nunca
 * pisa un valor existente, y un item cuyo `id` no esté en el preset se deja
 * intacto (el usuario pudo editar el catálogo a mano).
 */
function conVariantesDelPreset(catalogo: CatalogoItem[], preset: BusinessProfile): CatalogoItem[] {
  const variantesPorId = new Map<string, string[]>();
  for (const c of preset.sampleCatalog) {
    if (c.variantesDisponibles && c.variantesDisponibles.length > 0) {
      variantesPorId.set(c.id, [...c.variantesDisponibles]);
    }
  }
  if (variantesPorId.size === 0) return catalogo;

  return catalogo.map((item) => {
    if (item.variantesDisponibles && item.variantesDisponibles.length > 0) return item;
    const variantes = variantesPorId.get(item.id);
    return variantes ? { ...item, variantesDisponibles: variantes } : item;
  });
}

const CONFIG_KEY = "necto.pedidosConfig";

/** Carga la config guardada (merge con defaults) desde localStorage. */
function loadConfig(): PedidosConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PedidosConfig>;
      const perfil = parsed.perfilComercial ?? DEFAULT_CONFIG.perfilComercial;
      const preset = perfil ? BUSINESS_PROFILES[perfil] : BUSINESS_PROFILES.food;
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        plantillas: { ...DEFAULT_CONFIG.plantillas, ...(parsed.plantillas ?? {}) },
        modalidades: Array.isArray(parsed.modalidades) ? parsed.modalidades : DEFAULT_CONFIG.modalidades,
        catalogo: conVariantesDelPreset(
          Array.isArray(parsed.catalogo) ? parsed.catalogo : DEFAULT_CONFIG.catalogo,
          preset,
        ),
        aliasEstados: { ...(parsed.aliasEstados ?? {}) },
        aliasModalidades: { ...(parsed.aliasModalidades ?? {}) },
        horario: { ...DEFAULT_CONFIG.horario, ...(parsed.horario ?? {}) },
        tiemposObjetivo: { ...(parsed.tiemposObjetivo ?? {}) },
        alertaAtencion: { ...DEFAULT_CONFIG.alertaAtencion, ...(parsed.alertaAtencion ?? {}) },
        perfilComercial: perfil,
        capacidadesActivas: Array.isArray(parsed.capacidadesActivas)
          ? parsed.capacidadesActivas
          : [...preset.defaultCapabilities],
        columnasPersonalizadas: Array.isArray(parsed.columnasPersonalizadas)
          ? parsed.columnasPersonalizadas
          : undefined,
      };
    }
  } catch {
    // Entorno sin localStorage o JSON inválido: usa defaults.
  }
  return {
    ...DEFAULT_CONFIG,
    plantillas: { ...DEFAULT_CONFIG.plantillas },
    horario: { ...DEFAULT_CONFIG.horario },
    alertaAtencion: { ...DEFAULT_CONFIG.alertaAtencion },
    capacidadesActivas: [...DEFAULT_CONFIG.capacidadesActivas!],
    columnasPersonalizadas: undefined,
  };
}

/** Persiste la config en localStorage. */
function persistConfig(cfg: PedidosConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  } catch {
    // Sin localStorage: no-op (mock).
  }
}

const nowIso = () => new Date().toISOString();
const minutesSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
const minutesAgoIso = (mins: number) => new Date(Date.now() - mins * 60000).toISOString();

/**
 * Reduce un teléfono a sus dígitos, para comparar por identidad y no por
 * formato de presentación.
 *
 * Motivo: el mismo cliente se escribe de dos maneras en el mock. Este store
 * guarda E.164 compacto (`+573001112233`) y `conversaciones.seed` guarda el
 * mismo número agrupado con espacios (`+57 300 111 2233`), así que comparar las
 * cadenas crudas hacía que `porTelefono` no encontrara NADA. La normalización
 * vive aquí, en el punto de comparación, y no en los seeds: así un contacto
 * nuevo no depende de que quien lo escriba recuerde el formato.
 */
const soloDigitos = (telefono: string): string => telefono.replace(/\D/g, "");

/**
 * Convierte un instante a su día de calendario **LOCAL** en formato
 * "YYYY-MM-DD".
 *
 * Contrato de bucketing del store: **todo** índice por día usa la fecha local
 * del navegador, nunca el día UTC. `toISOString().slice(0, 10)` NO sirve para
 * esto — en zonas con offset negativo (p. ej. America/Bogota, UTC−5) el día UTC
 * se adelanta a partir de las 19:00 locales, así que un pedido de las 20:00 del
 * día 17 se indexaría bajo el día 18. Ese desfase hacía que `volumenEntre`,
 * `volumenPorDia`, `volumenPorHora` y `entregadosEnDia` discrepasen de
 * `ingresosEntre` (que ya usaba componentes locales) durante la franja
 * 19:00–23:59, y rompía los gráficos por día y los filtros de rango.
 *
 * Acepta un ISO completo o un "YYYY-MM-DD" ya normalizado. Devuelve "" si el
 * instante es inválido.
 */
const ymdLocal = (iso: string): string => {
  if (!iso) return "";
  // Ya viene como día calendario: no reinterpretarlo (evita corrimientos por
  // parsear "YYYY-MM-DD" como UTC).
  if (iso.length === 10 && !iso.includes("T")) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Día de calendario local "YYYY-MM-DD" de un `Date`. */
const ymdDeDate = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Recorre inclusive el rango de días locales [desde, hasta] y proyecta cada día
 * con `valor`. Comparte el guard de 400 iteraciones que evita un bucle infinito
 * si llegasen fechas corruptas. Devuelve [] si el rango es inválido.
 */
const recorrerDias = <T>(
  desde: string,
  hasta: string,
  proyectar: (fecha: string) => T,
): T[] => {
  if (!desde || !hasta || desde > hasta) return [];
  const out: T[] = [];
  const cur = new Date(`${desde}T00:00:00`);
  const fin = new Date(`${hasta}T00:00:00`);
  let guard = 0;
  while (cur.getTime() <= fin.getTime() && guard < 400) {
    out.push(proyectar(ymdDeDate(cur)));
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return out;
};

/**
 * Registro de conteo por estado con las **8 claves** de `PedidoEstado` a 0.
 * Devuelve un objeto NUEVO en cada llamada, para que nadie comparta un acumulador
 * por accidente. Existe para que los tres métodos que cuentan por estado
 * (`conteoPorEstado`, `conteoPorEstadoEnRango`, `seriePorEstado*`) declaren la
 * misma forma una sola vez: si mañana se añade un estado al pipeline, hay un
 * único sitio donde añadirlo.
 */
const conteoPorEstadoVacio = (): Record<PedidoEstado, number> => ({
  programado: 0,
  nuevo: 0,
  confirmado: 0,
  en_preparacion: 0,
  listo: 0,
  en_camino: 0,
  entregado: 0,
  cancelado: 0,
});

// ═══════════════════════════════════════════════════════════════════════════
// MEMORIA CRM DE DIRECCIONES (por teléfono normalizado)
// ═══════════════════════════════════════════════════════════════════════════

const CRM_DIRECCIONES_KEY = "necto.crm.direcciones";

const DEFAULT_DIRECCIONES_CRM: Record<string, DireccionEntrega[]> = {
  "573001112233": [
    {
      calle: "Cra 43A # 18 Sur-135",
      barrio: "El Poblado",
      referencia: "Edificio Santillana, Apto 402",
      indicaciones: "Dejar en portería o tocar timbre 402",
    },
  ],
  "573004445566": [
    {
      calle: "Calle 10 # 36-24",
      barrio: "Laureles",
      referencia: "Casa de dos pisos reja blanca",
      indicaciones: "Timbre funciona bien",
    },
  ],
  "573005556677": [
    {
      calle: "Av. Las Vegas # 7-45",
      barrio: "Envigado",
      referencia: "Local 102, frente al parque",
      indicaciones: "Preguntar por Andrés",
    },
  ],
};

function loadDireccionesCRM(): Record<string, DireccionEntrega[]> {
  try {
    const raw = localStorage.getItem(CRM_DIRECCIONES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_DIRECCIONES_CRM, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_DIRECCIONES_CRM };
}

function persistDireccionesCRM(data: Record<string, DireccionEntrega[]>): void {
  try {
    localStorage.setItem(CRM_DIRECCIONES_KEY, JSON.stringify(data));
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED
// ═══════════════════════════════════════════════════════════════════════════

const seed = (): Pedido[] => [
  {
    id: "pd1", numero: "P-001", cliente: "Ana Silva", telefono: "+573001112233", modalidad: "domicilio",
    items: [{ nombre: "Combo clásico", cantidad: 2, precio: 25000 }, { nombre: "Bebida 350ml", cantidad: 2, precio: 4000 }],
    notas: "Sin cebolla en uno.", estado: "nuevo", origen: "whatsapp", pagado: false,
    createdAt: minutesAgoIso(39), estadoDesde: minutesAgoIso(39),
    direccionEntrega: {
      calle: "Cra 43A # 18 Sur-135",
      barrio: "El Poblado",
      referencia: "Edificio Santillana, Apto 402",
      indicaciones: "Dejar en portería o tocar timbre 402",
    },
    costoEnvio: 5000,
    metodoPago: "efectivo",
    pagaCon: 70000,
  },
  {
    id: "pd2", numero: "P-002", cliente: "María Fernanda", telefono: "+573002223344", modalidad: "retiro",
    items: [{ nombre: "Postre del día", cantidad: 1, precio: 8000 }],
    estado: "listo", origen: "whatsapp", pagado: true,
    metodoPago: "transferencia",
    createdAt: minutesAgoIso(12), estadoDesde: minutesAgoIso(6),
  },
  {
    id: "pd3", numero: "P-003", cliente: "Pedro Ramírez", telefono: "+573003334455", modalidad: "en_sitio",
    items: [{ nombre: "Combo clásico", cantidad: 1, precio: 25000 }],
    notas: "Mesa 5.", estado: "en_preparacion", origen: "operador", pagado: false,
    metodoPago: "tarjeta",
    createdAt: minutesAgoIso(20), estadoDesde: minutesAgoIso(18),
  },
  {
    id: "pd4", numero: "P-004", cliente: "Lucía Torres", telefono: "+573004445566", modalidad: "domicilio",
    items: [{ nombre: "Combo clásico", cantidad: 3, precio: 25000 }, { nombre: "Postre del día", cantidad: 2, precio: 8000 }],
    estado: "listo", origen: "whatsapp", pagado: true,
    createdAt: minutesAgoIso(140), estadoDesde: minutesAgoIso(12),
    direccionEntrega: {
      calle: "Calle 10 # 36-24",
      barrio: "Laureles",
      referencia: "Casa de dos pisos reja blanca",
      indicaciones: "Timbre funciona bien",
    },
    costoEnvio: 4500,
    metodoPago: "transferencia",
    repartidor: "Carlos Mensajería",
  },
  {
    id: "pd5", numero: "P-005", cliente: "Andrés Gil", telefono: "+573005556677", modalidad: "domicilio",
    items: [{ nombre: "Bebida 350ml", cantidad: 4, precio: 4000 }],
    estado: "en_camino", origen: "whatsapp", pagado: false,
    createdAt: minutesAgoIso(60), estadoDesde: minutesAgoIso(15),
    // Este pedido SÍ trae notas del cliente, a propósito.
    //
    // Sin una nota previa, «anexar» y «pisar» producen el MISMO resultado y
    // ninguna comprobación puede distinguirlos. Es exactamente lo que pasó: el
    // sabotaje D (`p.notas = texto` en vez de anexar) se aplicó al bundle, se
    // comprobó que el binario servido era distinto (453ccb0b7e46 vs
    // 4a7dc2a43416) y la corrida salió VERDE igual — porque el pedido objetivo
    // no tenía nada que perder.
    //
    // Con esta nota, «pisar» borra la indicación del cliente y el arnés lo ve.
    notas: "Dejar en portería, el cliente trabaja hasta las 6.",
    direccionEntrega: {
      calle: "Av. Las Vegas # 7-45",
      barrio: "Envigado",
      referencia: "Local 102, frente al parque",
      indicaciones: "Preguntar por Andrés",
    },
    costoEnvio: 4000,
    metodoPago: "contra_entrega",
    pagaCon: 30000,
    repartidor: "Javier Moto 04",
  },
  {
    id: "pd6", numero: "P-006", cliente: "Sofía Díaz", telefono: "+573017773344", modalidad: "retiro",
    items: [{ nombre: "Combo clásico", cantidad: 1, precio: 25000 }],
    estado: "entregado", origen: "whatsapp", pagado: true,
    metodoPago: "transferencia",
    createdAt: minutesAgoIso(1_500), estadoDesde: minutesAgoIso(1_400), finishedAt: minutesAgoIso(1_400),
  },
  {
    id: "pd7", numero: "P-007", cliente: "Valentina Ríos", telefono: "+573018889900", modalidad: "domicilio",
    items: [{ nombre: "Postre del día", cantidad: 2, precio: 8000 }],
    notas: "Cliente no respondió.", estado: "cancelado", origen: "whatsapp",
    createdAt: minutesAgoIso(300), estadoDesde: minutesAgoIso(260), finishedAt: minutesAgoIso(260),
    direccionEntrega: {
      calle: "Transversal 39 # 74-12",
      barrio: "Conquistadores",
    },
    costoEnvio: 4000,
    metodoPago: "contra_entrega",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// STORE (mock — muta solo estado local)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * PedidosStore — flujo de pedidos que llegan por WhatsApp y recorren el
 * pipeline hasta la entrega (mock, sin backend).
 *
 * El pipeline efectivo depende de la config: `confirmado` y `en_camino` pueden
 * estar desactivados, y `en_camino` solo aplica a pedidos con modalidad
 * `domicilio`. `avanzar` calcula el siguiente estado válido respetando estas
 * reglas; `moverEstado` valida que la transición sea coherente con el pipeline.
 */
export class PedidosStore {
  pedidos: Pedido[] = seed();
  crmDirecciones: Record<string, DireccionEntrega[]> = loadDireccionesCRM();

  /** Configuración del módulo (persistida en localStorage). */
  config: PedidosConfig = loadConfig();

  private seq = seed().length;

  /** Handle del intervalo de activación de programados (solo navegador). */
  private tickHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // ── Config ────────────────────────────────────────────────────────────────

  updateConfig(data: Partial<PedidosConfig>): void {
    this.config = {
      ...this.config,
      ...data,
      plantillas: { ...this.config.plantillas, ...(data.plantillas ?? {}) },
    };
    persistConfig(this.config);
    // Fix #1: al cambiar la config, migrar pedidos que quedaron fuera del
    // pipeline efectivo (estado desactivado) al siguiente estado activo, para
    // que no queden varados (sin poder avanzar y con su columna desaparecida).
    this.migrarPedidosVarados();
  }

  private generarPedidosDemo(perfil: BusinessProfileType): Pedido[] {
  if (perfil === "fashion") {
    return [
      {
        id: "pd-f1", numero: "P-001", cliente: "Ana Silva", telefono: "+573001112233", modalidad: "domicilio",
        items: [
          { nombre: "Camiseta Oversize Algodón (M / Blanco)", cantidad: 2, precio: 45000 },
          { nombre: "Jean Mom Fit Tiro Alto (Talla 8 / Celeste)", cantidad: 1, precio: 98000 },
        ],
        notas: "Empacar para regalo por favor.", estado: "nuevo", origen: "whatsapp", pagado: false,
        createdAt: minutesAgoIso(39), estadoDesde: minutesAgoIso(39),
        direccionEntrega: { calle: "Cra 43A # 18 Sur-135", barrio: "El Poblado", referencia: "Edificio Santillana, Apto 402" },
        costoEnvio: 10000, metodoPago: "efectivo", pagaCon: 200000,
      },
      {
        id: "pd-f2", numero: "P-002", cliente: "María Fernanda", telefono: "+573002223344", modalidad: "retiro",
        items: [{ nombre: "Vestido Floral Silueta Midi (Talla S)", cantidad: 1, precio: 85000 }],
        estado: "confirmado", origen: "whatsapp", pagado: true, metodoPago: "transferencia",
        createdAt: minutesAgoIso(12), estadoDesde: minutesAgoIso(6),
      },
      {
        id: "pd-f3", numero: "P-003", cliente: "Pedro Ramírez", telefono: "+573003334455", modalidad: "domicilio",
        items: [{ nombre: "Chaqueta Denim Oversize Vintage (Talla L)", cantidad: 1, precio: 135000 }],
        notas: "Revisar costuras antes de despachar.", estado: "en_preparacion", origen: "operador", pagado: true, metodoPago: "tarjeta",
        createdAt: minutesAgoIso(45), estadoDesde: minutesAgoIso(20),
        direccionEntrega: { calle: "Transversal 39 # 74-12", barrio: "Conquistadores" },
        costoEnvio: 12000,
      },
      {
        id: "pd-f4", numero: "P-004", cliente: "Lucía Torres", telefono: "+573004445566", modalidad: "domicilio",
        items: [{ nombre: "Sneakers Urbanos Cuero Blanco (Talla 38)", cantidad: 1, precio: 160000 }],
        estado: "listo", origen: "whatsapp", pagado: true,
        createdAt: minutesAgoIso(140), estadoDesde: minutesAgoIso(12),
        direccionEntrega: { calle: "Calle 10 # 36-24", barrio: "Laureles" },
        costoEnvio: 10000, metodoPago: "transferencia", repartidor: "Coordinadora Guía #CO-99881",
      },
      {
        id: "pd-f5", numero: "P-005", cliente: "Andrés Gil", telefono: "+573005556677", modalidad: "domicilio",
        items: [{ nombre: "Camiseta Oversize Algodón (L / Negro)", cantidad: 1, precio: 45000 }],
        estado: "en_camino", origen: "whatsapp", pagado: true,
        createdAt: minutesAgoIso(60), estadoDesde: minutesAgoIso(15),
        direccionEntrega: { calle: "Av. Las Vegas # 7-45", barrio: "Envigado" },
        costoEnvio: 8000, metodoPago: "contra_entrega", repartidor: "Servientrega Guía #SE-12345",
      },
    ];
  }

  if (perfil === "services") {
    return [
      {
        id: "pd-s1", numero: "P-001", cliente: "Ana Silva", telefono: "+573001112233", modalidad: "en_sitio",
        items: [{ nombre: "Corte y Perfilado de Barba", cantidad: 1, precio: 35000 }],
        notas: "Cita 15:00 con Carlos.", estado: "nuevo", origen: "whatsapp", pagado: false,
        createdAt: minutesAgoIso(30), estadoDesde: minutesAgoIso(30),
      },
      {
        id: "pd-s2", numero: "P-002", cliente: "María Fernanda", telefono: "+573002223344", modalidad: "en_sitio",
        items: [{ nombre: "Masaje Terapéutico Anti-estrés (60 min)", cantidad: 1, precio: 95000 }],
        estado: "confirmado", origen: "whatsapp", pagado: true, metodoPago: "transferencia",
        createdAt: minutesAgoIso(20), estadoDesde: minutesAgoIso(10),
      },
      {
        id: "pd-s3", numero: "P-003", cliente: "Pedro Ramírez", telefono: "+573003334455", modalidad: "en_sitio",
        items: [{ nombre: "Limpieza Facial Profunda con Hidratación", cantidad: 1, precio: 85000 }],
        estado: "en_preparacion", origen: "operador", pagado: true, metodoPago: "tarjeta",
        createdAt: minutesAgoIso(40), estadoDesde: minutesAgoIso(15),
      },
      {
        id: "pd-s4", numero: "P-004", cliente: "Lucía Torres", telefono: "+573004445566", modalidad: "en_sitio",
        items: [{ nombre: "Sesión de Consultoría Profesional (1h)", cantidad: 1, precio: 120000 }],
        estado: "listo", origen: "whatsapp", pagado: true,
        createdAt: minutesAgoIso(50), estadoDesde: minutesAgoIso(5),
      },
      {
        id: "pd-s5", numero: "P-005", cliente: "Andrés Gil", telefono: "+573005556677", modalidad: "domicilio",
        items: [{ nombre: "Atención a Domicilio: Masaje Deportivo", cantidad: 1, precio: 110000 }],
        estado: "en_camino", origen: "whatsapp", pagado: true,
        createdAt: minutesAgoIso(60), estadoDesde: minutesAgoIso(25),
        direccionEntrega: { calle: "Av. Las Vegas # 7-45", barrio: "Envigado" },
        costoEnvio: 15000, repartidor: "Especialista Laura",
      },
    ];
  }

  return seed();
}

  /**
   * Cambia el perfil comercial del negocio (preset de onboarding / configuración).
   * Actualiza las capacidades activas por defecto, catálogo, alias de estados,
   * modalidades y pedidos representativos de esa industria.
   */
  setPerfilComercial(perfil: BusinessProfileType, resetPedidosDemo = true): void {
    const preset = BUSINESS_PROFILES[perfil] ?? BUSINESS_PROFILES.food;
    this.updateConfig({
      perfilComercial: perfil,
      capacidadesActivas: [...preset.defaultCapabilities],
      catalogo: catalogoDesdePreset(preset),
      modalidades: [...preset.defaultModalidades],
      aliasEstados: { ...preset.defaultAliasEstados },
      plantillas: { ...preset.defaultPlantillas },
    });
    if (resetPedidosDemo) {
      this.pedidos = this.generarPedidosDemo(perfil);
    }
  }

  /**
   * Comprueba de forma declarativa si una capacidad de negocio está habilitada.
   */
  tieneCapacidad(capacidad: OrderCapability): boolean {
    const perfil = this.config.perfilComercial ?? "food";
    const preset = BUSINESS_PROFILES[perfil] ?? BUSINESS_PROFILES.food;
    const activas = this.config.capacidadesActivas ?? preset.defaultCapabilities;
    return activas.includes(capacidad);
  }

  /**
   * Obtiene un pedido convertido al modelo limpio `OrderCore`.
   */
  getOrderCore(id: string): OrderCore | null {
    const legacy = this.getPedido(id);
    return legacy ? toOrderCore(legacy) : null;
  }

  /**
   * Da de alta un pedido partiendo directamente de la entidad limpia `OrderCore`.
   */
  crearOrderCore(core: OrderCore): Pedido {
    const legacy = toLegacyPedido(core);
    this.pedidos.push(legacy);
    return legacy;
  }

  /**
   * Fix #1 — Empuja los pedidos activos cuyo estado actual dejó de pertenecer al
   * pipeline efectivo (por desactivar `confirmado`/`en_camino`) al siguiente
   * estado activo disponible. Evita que queden inaccesibles tras cambiar config.
   */
  private migrarPedidosVarados(): void {
    for (const p of this.pedidos) {
      if (this.esTerminal(p.estado) || p.estado === "programado") continue;
      const pipeline = this.pipelineDe(p);
      if (pipeline.includes(p.estado)) continue; // sigue siendo válido
      // Estado varado: buscar el primer estado activo posterior según el orden
      // canónico del pipeline completo. Si no hay ninguno, cae en entregado.
      const ordenFull = PIPELINE_FULL.indexOf(p.estado);
      const destino =
        pipeline.find((e) => PIPELINE_FULL.indexOf(e) > ordenFull) ?? "entregado";
      p.estado = destino;
      p.estadoDesde = nowIso();
      if (this.esTerminal(destino)) p.finishedAt = nowIso();
    }
  }

  // ── Pipeline helpers ────────────────────────────────────────────────────

  /**
   * Secuencia de estados activa según la config, sin considerar modalidad.
   * Filtra `confirmado`/`en_camino` cuando están desactivados.
   */
  get estadosActivos(): PedidoEstado[] {
    return PIPELINE_FULL.filter((e) => {
      if (e === "confirmado" && !this.config.usarConfirmado) return false;
      if (e === "en_camino" && !this.config.usarEnCamino) return false;
      return true;
    });
  }

  /**
   * Columnas del tablero: estados activos del pipeline (sin `entregado`, que
   * es terminal y vive en el historial). El tablero muestra el trabajo en curso.
   * Si se configuraron columnas personalizadas, devuelve los IDs de dichas columnas.
   */
  get columnasTablero(): PedidoEstado[] {
    if (this.config.columnasPersonalizadas && this.config.columnasPersonalizadas.length > 0) {
      return this.config.columnasPersonalizadas.map((c) => c.id as PedidoEstado);
    }
    return this.estadosActivos.filter((e) => e !== "entregado");
  }

  /** Garantiza que la lista de columnas personalizadas esté inicializada */
  asegurarColumnasPersonalizadas(): ColumnaPersonalizada[] {
    if (!this.config.columnasPersonalizadas || this.config.columnasPersonalizadas.length === 0) {
      this.config.columnasPersonalizadas = this.estadosActivos
        .filter((e) => e !== "entregado")
        .map((e) => ({
          id: e,
          label: this.estadoLabel(e),
        }));
    }
    return this.config.columnasPersonalizadas;
  }

  /** Agrega una nueva columna al tablero Kanban */
  agregarColumna(label: string, color?: string): string {
    const cols = [...this.asegurarColumnasPersonalizadas()];
    const clean = label.trim();
    if (!clean) return "";
    const id = `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    cols.push({ id, label: clean, color });
    this.updateConfig({ columnasPersonalizadas: cols });
    return id;
  }

  /** Renombra una columna existente del tablero */
  renombrarColumna(id: string, nuevoLabel: string): void {
    const cols = [...this.asegurarColumnasPersonalizadas()];
    const target = cols.find((c) => c.id === id);
    if (target && nuevoLabel.trim()) {
      target.label = nuevoLabel.trim();
      this.updateConfig({ columnasPersonalizadas: [...cols] });
    }
  }

  /** Elimina una columna del tablero y migra sus pedidos a la primera columna disponible */
  eliminarColumna(id: string): void {
    const cols = [...this.asegurarColumnasPersonalizadas()];
    if (cols.length <= 1) return; // Mínimo 1 columna
    const filtradas = cols.filter((c) => c.id !== id);
    const destinoFallback = filtradas[0].id;
    for (const p of this.pedidos) {
      if (p.estado === id) {
        p.estado = destinoFallback as PedidoEstado;
        p.estadoDesde = nowIso();
      }
    }
    this.updateConfig({ columnasPersonalizadas: filtradas });
  }

  /** Reordena las columnas según el array de IDs suministrado */
  reordenarColumnas(nuevosIds: string[]): void {
    const cols = this.asegurarColumnasPersonalizadas();
    const mapa = new Map(cols.map((c) => [c.id, c]));
    const reordenadas: ColumnaPersonalizada[] = [];
    for (const id of nuevosIds) {
      const c = mapa.get(id);
      if (c) reordenadas.push(c);
    }
    for (const c of cols) {
      if (!reordenadas.some((r) => r.id === c.id)) {
        reordenadas.push(c);
      }
    }
    this.updateConfig({ columnasPersonalizadas: reordenadas });
  }

  /** Mueve un pedido directamente a cualquier columna (drag & drop o acción rápida) */
  moverAColumna(id: string, destinoColumna: string): boolean {
    const p = this.getPedido(id);
    if (!p) return false;
    p.estado = destinoColumna as PedidoEstado;
    p.estadoDesde = nowIso();
    if (this.esTerminal(destinoColumna as PedidoEstado)) {
      p.finishedAt = nowIso();
    }
    return true;
  }

  /** Pipeline efectivo para un pedido concreto: descarta `en_camino` si no es domicilio. */
  private pipelineDe(p: Pedido): PedidoEstado[] {
    return this.estadosActivos.filter((e) => {
      if (e === "en_camino" && p.modalidad !== "domicilio") return false;
      return true;
    });
  }

  /** true si `estado` es terminal (entregado/cancelado). */
  esTerminal(estado: PedidoEstado): boolean {
    return TERMINALES.includes(estado);
  }

  /** Siguiente estado válido para un pedido, o null si ya está en un estado terminal/final. */
  siguienteEstado(p: Pedido): PedidoEstado | null {
    if (this.esTerminal(p.estado)) return null;
    if (this.config.columnasPersonalizadas && this.config.columnasPersonalizadas.length > 0) {
      const cols = this.columnasTablero;
      const idx = cols.indexOf(p.estado);
      if (idx !== -1) {
        if (idx < cols.length - 1) return cols[idx + 1];
        return "entregado";
      }
    }
    const pipeline = this.pipelineDe(p);
    const idxPipe = pipeline.indexOf(p.estado);
    if (idxPipe === -1 || idxPipe >= pipeline.length - 1) return null;
    return pipeline[idxPipe + 1];
  }

  /**
   * ¿Es válida la transición estado→destino para este pedido?
   * Reglas: no partir de terminal; destino debe pertenecer al pipeline efectivo;
   * solo se avanza un paso hacia adelante. `cancelado` es válido desde cualquier
   * estado no terminal.
   */
  private transicionValida(p: Pedido, destino: PedidoEstado): boolean {
    if (this.esTerminal(p.estado)) return false;
    if (destino === "cancelado") return true;
    if (this.config.columnasPersonalizadas && this.config.columnasPersonalizadas.length > 0) {
      const cols = this.columnasTablero;
      if (cols.includes(destino) || destino === "entregado") return true;
    }
    const pipeline = this.pipelineDe(p);
    const from = pipeline.indexOf(p.estado);
    const to = pipeline.indexOf(destino);
    if (from === -1 || to === -1) return false;
    return to === from + 1;
  }

  // ── Lookups / agrupación ──────────────────────────────────────────────────

  getPedido(id: string): Pedido | undefined {
    return this.pedidos.find((p) => p.id === id);
  }

  /**
   * Pedidos asociados a un teléfono de contacto, ordenados por createdAt desc.
   * Es la puerta pública para que otros módulos (p. ej. Conversaciones) crucen
   * un contacto con sus pedidos SIN leer el array `pedidos` directamente. No
   * muta `pedidos`: `filter` ya devuelve un array nuevo sobre el que opera `sort`.
   *
   * La comparación es por DÍGITOS, no por cadena: los dos seeds del proyecto no
   * comparten formato — este store guarda E.164 compacto (`+573001112233`) y
   * `conversaciones.seed` guarda el mismo número agrupado con espacios
   * (`+57 300 111 2233`). Comparar crudo daba 0 cruces SIEMPRE, así que el
   * panel de contexto del chat nunca encontraba los pedidos del contacto.
   * Se normaliza en el punto de comparación para no tener que reescribir seeds
   * ni depender de que un contacto nuevo se guarde con el formato "correcto".
   */
  porTelefono(telefono: string): Pedido[] {
    const buscado = soloDigitos(telefono);
    if (buscado === "") return [];
    return this.pedidos
      .filter((p) => soloDigitos(p.telefono) === buscado)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Pedido ACTIVO de un contacto: el más reciente que NO está en estado terminal.
   *
   * Es el único selector que responde "¿en qué pedido está trabajando ahora este
   * contacto?", pregunta que necesitan las superficies del canal (la bandeja de
   * Conversaciones y el panel de contexto del chat). Existe para que ese filtro
   * viva en UN sitio: antes cada consumidor tendría que encadenar
   * `porTelefono(...)` con `esTerminal(...)`, y dos filtros copiados acaban
   * divergiendo (p. ej. uno incluiría `programado` y el otro no).
   *
   * Criterio de "activo": ni `entregado` ni `cancelado` (ver `TERMINALES`). A
   * diferencia de `enCurso`, SÍ cuenta `programado`: un pedido agendado para más
   * tarde sigue siendo el pedido vivo de ese contacto y el operador debe verlo
   * desde el chat — que "no esté en curso" es una distinción de cocina, no de
   * atención al cliente.
   *
   * Devuelve `undefined` si el contacto no tiene pedidos o si todos son
   * terminales. `porTelefono` ya ordena por createdAt desc, así que el primero
   * que pase el filtro es el más reciente.
   */
  pedidoActivoDe(telefono: string): Pedido | undefined {
    return this.porTelefono(telefono).find((p) => !this.esTerminal(p.estado));
  }

  /** Pedidos en un estado dado (para las columnas del tablero). */
  porEstado(estado: PedidoEstado): Pedido[] {
    return this.pedidos
      .filter((p) => p.estado === estado)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /**
   * Pedidos en curso (no terminales y ya activos), opcionalmente filtrados por
   * modalidad. Los `programado` NO cuentan como en curso: esperan su hora.
   */
  enCurso(modalidad?: Modalidad): Pedido[] {
    return this.pedidos.filter(
      (p) => !this.esTerminal(p.estado) && p.estado !== "programado" && (!modalidad || p.modalidad === modalidad),
    );
  }

  /**
   * Pedidos programados (aún no activos), ordenados por su hora programada
   * (más próximos primero). No entran en KPIs de "en curso" ni en el historial.
   */
  get programados(): Pedido[] {
    return this.pedidos
      .filter((p) => p.estado === "programado")
      .sort((a, b) => (a.programadoPara ?? a.createdAt).localeCompare(b.programadoPara ?? b.createdAt));
  }

  /**
   * Pedidos programados para un día concreto ("YYYY-MM-DD", hora local),
   * ordenados por hora. Útil para el calendario del modal de programación.
   */
  programadosDelDia(ymd: string): Pedido[] {
    return this.programados.filter((p) => {
      if (!p.programadoPara) return false;
      const d = new Date(p.programadoPara);
      const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return local === ymd;
    });
  }

  /** Cuántos pedidos hay programados en un día ("YYYY-MM-DD" local). */
  countProgramadosDia(ymd: string): number {
    return this.programadosDelDia(ymd).length;
  }

  /** Pedidos terminales (entregado/cancelado) — para el historial. */
  get historial(): Pedido[] {
    return this.pedidos
      .filter((p) => this.esTerminal(p.estado))
      .sort((a, b) => (b.finishedAt ?? b.createdAt).localeCompare(a.finishedAt ?? a.createdAt));
  }

  /**
   * Fix #1 (modalidades) — Modalidades a mostrar como filtro en el tablero: las
   * habilitadas en config MÁS las presentes en pedidos activos (para no ocultar
   * pedidos existentes cuya modalidad se desactivó). Solo se bloquean modalidades
   * nuevas al crear pedidos; los ya creados siguen siendo visibles y accionables.
   */
  get modalidadesTablero(): Modalidad[] {
    const enUso = new Set<Modalidad>(this.config.modalidades);
    for (const p of this.enCurso()) enUso.add(p.modalidad);
    // Mantener el orden canónico.
    return (["retiro", "domicilio", "en_sitio"] as Modalidad[]).filter((m) => enUso.has(m));
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────

  get totalNuevos(): number {
    return this.porEstado("nuevo").length;
  }

  get totalEnPreparacion(): number {
    return this.porEstado("en_preparacion").length;
  }

  get totalListos(): number {
    return this.porEstado("listo").length;
  }

  /** Pedidos entregados hoy (por finishedAt, día de calendario local). */
  get entregadosHoy(): number {
    const hoy = ymdDeDate(new Date());
    return this.pedidos.filter(
      (p) => p.estado === "entregado" && p.finishedAt && ymdLocal(p.finishedAt) === hoy,
    ).length;
  }

  /** Pedidos entregados en un día concreto ("YYYY-MM-DD" local, por finishedAt). */
  entregadosEnDia(ymd: string): number {
    return this.pedidos.filter(
      (p) => p.estado === "entregado" && p.finishedAt && ymdLocal(p.finishedAt) === ymd,
    ).length;
  }

  /** Total de pedidos en curso (no terminales y ya activos). */
  get totalEnCurso(): number {
    return this.enCurso().length;
  }

  /** Total de pedidos programados (aún no activos). */
  get totalProgramados(): number {
    return this.programados.length;
  }

  /** Pedidos en curso que ya superaron su tiempo objetivo (urgentes ahora). */
  get urgentes(): Pedido[] {
    return this.enCurso()
      .filter((p) => this.esUrgente(p))
      .sort((a, b) => this.minutosEnEstado(b) - this.minutosEnEstado(a));
  }

  /** El próximo pedido programado por hora (o null). */
  get proximoProgramado(): Pedido | null {
    return this.programados[0] ?? null;
  }

  /**
   * Volumen de pedidos recibidos por día en los últimos `dias` días (incluye
   * hoy), del más antiguo al más reciente. Cuenta por `createdAt`. Para el
   * gráfico "volumen del día" de la Inicio.
   */
  volumenPorDia(dias = 7): { fecha: string; total: number }[] {
    const conteo = new Map<string, number>();
    for (const p of this.pedidos) {
      const dia = ymdLocal(p.createdAt);
      conteo.set(dia, (conteo.get(dia) ?? 0) + 1);
    }
    const out: { fecha: string; total: number }[] = [];
    const hoy = new Date();
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - i);
      const fecha = ymdDeDate(d);
      out.push({ fecha, total: conteo.get(fecha) ?? 0 });
    }
    return out;
  }

  /**
   * Volumen de pedidos recibidos por hora de un día "YYYY-MM-DD" (00–23).
   * Para el gráfico cuando se elige un solo día (granularidad por hora).
   */
  volumenPorHora(ymd: string, desdeHora = 0, hastaHora = 23): { etiqueta: string; total: number }[] {
    const conteo = new Array(24).fill(0);
    for (const p of this.pedidos) {
      if (ymdLocal(p.createdAt) !== ymd) continue;
      const h = new Date(p.createdAt).getHours();
      conteo[h] += 1;
    }
    const out: { etiqueta: string; total: number }[] = [];
    for (let h = desdeHora; h <= hastaHora; h++) {
      const am = h < 12;
      const h12 = h % 12 === 0 ? 12 : h % 12;
      out.push({ etiqueta: `${h12}${am ? "am" : "pm"}`, total: conteo[h] });
    }
    return out;
  }

  /**
   * Volumen de pedidos recibidos por día entre dos fechas "YYYY-MM-DD" inclusive
   * (del más antiguo al más reciente). Cuenta por `createdAt`. Para el gráfico
   * de la Inicio con rango elegido en el calendario.
   */
  volumenEntre(desde: string, hasta: string): { fecha: string; total: number }[] {
    const conteo = new Map<string, number>();
    for (const p of this.pedidos) {
      const dia = ymdLocal(p.createdAt);
      conteo.set(dia, (conteo.get(dia) ?? 0) + 1);
    }
    return recorrerDias(desde, hasta, (fecha) => ({ fecha, total: conteo.get(fecha) ?? 0 }));
  }

  /**
   * Tiempo promedio de ciclo (minutos) de los pedidos entregados: desde
   * createdAt hasta finishedAt. 0 si no hay entregados con datos.
   */
  get tiempoPromedioCicloMin(): number {
    const entregados = this.pedidos.filter((p) => p.estado === "entregado" && p.finishedAt);
    if (entregados.length === 0) return 0;
    const total = entregados.reduce(
      (s, p) => s + Math.max(0, Math.round((new Date(p.finishedAt!).getTime() - new Date(p.createdAt).getTime()) / 60000)),
      0,
    );
    return Math.round(total / entregados.length);
  }

  // ── Analítica (distribuciones e ingresos) ──────────────────────────────────

  /**
   * Conteo de pedidos por estado sobre TODOS los pedidos (incluye terminales).
   * Devuelve un registro con las 8 claves de `PedidoEstado` (0 si no hay
   * ninguno). Puro: no muta `this.pedidos`. Útil para donut/barras por estado.
   */
  conteoPorEstado(): Record<PedidoEstado, number> {
    const base: Record<PedidoEstado, number> = {
      programado: 0,
      nuevo: 0,
      confirmado: 0,
      en_preparacion: 0,
      listo: 0,
      en_camino: 0,
      entregado: 0,
      cancelado: 0,
    };
    return this.pedidos.reduce((acc, p) => {
      acc[p.estado] += 1;
      return acc;
    }, base);
  }

  /**
   * Conteo de pedidos por modalidad, en orden canónico
   * ["retiro","domicilio","en_sitio"]. Incluye TODAS las modalidades (con 0 si
   * no hay ninguna) para que el gráfico sea estable. Puro: no muta `this.pedidos`.
   */
  porModalidad(): { modalidad: Modalidad; total: number }[] {
    const orden: Modalidad[] = ["retiro", "domicilio", "en_sitio"];
    return orden.map((modalidad) => ({
      modalidad,
      total: this.pedidos.filter((p) => p.modalidad === modalidad).length,
    }));
  }

  /**
   * Conteo de pedidos por origen ("whatsapp" | "operador"), en orden canónico.
   * Incluye ambos orígenes (con 0 si no hay ninguno). Puro: no muta `this.pedidos`.
   */
  porOrigen(): { origen: "whatsapp" | "operador"; total: number }[] {
    const orden: Array<"whatsapp" | "operador"> = ["whatsapp", "operador"];
    return orden.map((origen) => ({
      origen,
      total: this.pedidos.filter((p) => p.origen === origen).length,
    }));
  }

  /**
   * Ingresos ESTIMADOS por día entre dos fechas "YYYY-MM-DD" inclusive (del más
   * antiguo al más reciente). Suma `totalPedido(p)` de los pedidos ENTREGADOS
   * por su `finishedAt` (día local). Días sin ingresos → 0. Mismo patrón de
   * recorrido de fechas que `volumenEntre`. Puro: no muta `this.pedidos`.
   */
  ingresosEntre(desde: string, hasta: string): { fecha: string; total: number }[] {
    const conteo = new Map<string, number>();
    for (const p of this.pedidos) {
      if (p.estado !== "entregado" || !p.finishedAt) continue;
      const dia = ymdLocal(p.finishedAt);
      conteo.set(dia, (conteo.get(dia) ?? 0) + this.totalPedido(p));
    }
    return recorrerDias(desde, hasta, (fecha) => ({ fecha, total: conteo.get(fecha) ?? 0 }));
  }

  /**
   * Suma de `totalPedido` de todos los pedidos entregados (ingresos acumulados
   * del histórico mock). Puro: no muta `this.pedidos`.
   */
  ingresoTotalEntregados(): number {
    return this.pedidos
      .filter((p) => p.estado === "entregado")
      .reduce((s, p) => s + this.totalPedido(p), 0);
  }

  /**
   * Porcentaje (0..100) de pedidos cancelados sobre el total de pedidos,
   * redondeado a 1 decimal. 0 si no hay pedidos. Puro: no muta `this.pedidos`.
   */
  tasaCancelacion(): number {
    const total = this.pedidos.length;
    if (total === 0) return 0;
    const cancelados = this.pedidos.filter((p) => p.estado === "cancelado").length;
    return Math.round((cancelados / total) * 1000) / 10;
  }

  /**
   * Ticket (ingreso) promedio por pedido entregado:
   * ingresoTotalEntregados / nº entregados, redondeado a entero. 0 si no hay
   * entregados. Puro: no muta `this.pedidos`.
   */
  ticketPromedioEntregado(): number {
    const entregados = this.pedidos.filter((p) => p.estado === "entregado").length;
    if (entregados === 0) return 0;
    return Math.round(this.ingresoTotalEntregados() / entregados);
  }

  // ── Analítica por rango (para el filtro de periodo) ────────────────────────
  //
  // Un "rango" es `{ desde, hasta }` en días de calendario LOCAL "YYYY-MM-DD",
  // ambos inclusive. `null` significa "sin filtro" = todo el histórico. Todo el
  // cálculo de rango vive aquí: las páginas NUNCA filtran `pedidos` ni derivan
  // métricas por su cuenta (si lo hicieran habría dos verdades que pueden
  // divergir). Los métodos son puros: no mutan `this.pedidos`.

  /**
   * Pedidos cuyo día de creación cae dentro del rango (inclusive), ordenados
   * por `createdAt` descendente. Con rango `null` devuelve todo el histórico en
   * el mismo orden. Puro: no muta `this.pedidos`.
   */
  pedidosEnRango(rango: RangoFechas | null): Pedido[] {
    const base = rango
      ? this.pedidos.filter((p) => {
          const dia = ymdLocal(p.createdAt);
          return dia >= rango.desde && dia <= rango.hasta;
        })
      : [...this.pedidos];
    return base.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Conteo por estado limitado al rango. Mismas 8 claves que `conteoPorEstado`
   * (0 si no hay ninguno) para que los gráficos sean estables al cambiar de
   * periodo. Puro.
   */
  conteoPorEstadoEnRango(rango: RangoFechas | null): Record<PedidoEstado, number> {
    return this.pedidosEnRango(rango).reduce((acc, p) => {
      acc[p.estado] += 1;
      return acc;
    }, conteoPorEstadoVacio());
  }

  /**
   * Conteo por origen limitado al rango, en orden canónico. Incluye ambos
   * orígenes (con 0 si no hay ninguno). Puro.
   */
  porOrigenEnRango(rango: RangoFechas | null): { origen: Origen; total: number }[] {
    const enRango = this.pedidosEnRango(rango);
    return ORIGEN_ORDEN.map((origen) => ({
      origen,
      total: enRango.filter((p) => p.origen === origen).length,
    }));
  }

  /**
   * Conteo por modalidad limitado al rango, en orden canónico. Incluye todas las
   * modalidades (con 0 si no hay ninguna). Puro.
   */
  porModalidadEnRango(rango: RangoFechas | null): { modalidad: Modalidad; total: number }[] {
    const enRango = this.pedidosEnRango(rango);
    const orden: Modalidad[] = ["retiro", "domicilio", "en_sitio"];
    return orden.map((modalidad) => ({
      modalidad,
      total: enRango.filter((p) => p.modalidad === modalidad).length,
    }));
  }

  /**
   * Porcentaje (0..100) de cancelados sobre el total del rango, redondeado a
   * 1 decimal. 0 si el rango está vacío. Puro.
   */
  tasaCancelacionEnRango(rango: RangoFechas | null): number {
    const enRango = this.pedidosEnRango(rango);
    if (enRango.length === 0) return 0;
    const cancelados = enRango.filter((p) => p.estado === "cancelado").length;
    return Math.round((cancelados / enRango.length) * 1000) / 10;
  }

  /**
   * Importe total de los pedidos **vendidos** del rango, entendiendo por vendido
   * los estados de `ESTADOS_VENTA` (confirmado o posterior, incluido entregado).
   * Excluye `nuevo` (aún sin confirmar), `programado` (aún no activo) y
   * `cancelado`. Es la base del AOV pedido para la analítica. Puro.
   */
  ingresosVendidosEnRango(rango: RangoFechas | null): number {
    return this.pedidosEnRango(rango)
      .filter((p) => ESTADOS_VENTA.includes(p.estado))
      .reduce((s, p) => s + this.totalPedido(p), 0);
  }

  /** Nº de pedidos vendidos del rango (ver `ESTADOS_VENTA`). Puro. */
  conteoVendidosEnRango(rango: RangoFechas | null): number {
    return this.pedidosEnRango(rango).filter((p) => ESTADOS_VENTA.includes(p.estado)).length;
  }

  /**
   * Ticket promedio (AOV) del rango: `ingresosVendidosEnRango` /
   * `conteoVendidosEnRango`, redondeado a entero. 0 si no hay ventas.
   *
   * Definición acordada para la analítica: se divide entre los pedidos
   * **confirmados o posteriores**, no solo los entregados. Es distinta de
   * `ticketPromedioEntregado()` (que solo mira entregados) a propósito: miden
   * cosas distintas y ninguna sustituye a la otra. Puro.
   */
  ticketPromedioVendidoEnRango(rango: RangoFechas | null): number {
    const conteo = this.conteoVendidosEnRango(rango);
    if (conteo === 0) return 0;
    return Math.round(this.ingresosVendidosEnRango(rango) / conteo);
  }

  /**
   * Serie diaria para el gráfico "Ventas y cancelaciones" sobre los últimos
   * `dias` días naturales (incluye hoy), del más antiguo al más reciente.
   *
   * - `fecha`  — día local "YYYY-MM-DD" (eje X).
   * - `ventas` — pedidos con estado de `ESTADOS_VENTA` creados ese día.
   * - `cancelados` — pedidos cancelados creados ese día.
   *
   * Cuenta por `createdAt` (cuándo se recibió el pedido), no por `finishedAt`:
   * el eje representa la demanda de cada día. Devuelve una entrada por día,
   * con 0 donde no hubo nada, para que la serie no tenga huecos. Puro.
   */
  serieVentasYCancelaciones(dias: number): { fecha: string; ventas: number; cancelados: number }[] {
    const ventas = new Map<string, number>();
    const cancelados = new Map<string, number>();
    for (const p of this.pedidos) {
      const dia = ymdLocal(p.createdAt);
      if (ESTADOS_VENTA.includes(p.estado)) {
        ventas.set(dia, (ventas.get(dia) ?? 0) + 1);
      }
      if (p.estado === "cancelado") {
        cancelados.set(dia, (cancelados.get(dia) ?? 0) + 1);
      }
    }
    const out: { fecha: string; ventas: number; cancelados: number }[] = [];
    const hoy = new Date();
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - i);
      const fecha = ymdDeDate(d);
      out.push({
        fecha,
        ventas: ventas.get(fecha) ?? 0,
        cancelados: cancelados.get(fecha) ?? 0,
      });
    }
    return out;
  }

  /**
   * Serie diaria de pedidos **desglosada por estado** sobre los últimos `dias`
   * días naturales (incluye hoy), del más antiguo al más reciente.
   *
   * - `fecha`     — día local "YYYY-MM-DD" (eje X).
   * - `porEstado` — cuántos pedidos CREADOS ese día están hoy en cada estado,
   *   con las 8 claves de `PedidoEstado` (0 donde no hubo ninguno).
   *
   * Cuenta por `createdAt`, igual que `serieVentasYCancelaciones`: el eje mide la
   * demanda de cada día. Devuelve una entrada por día con TODOS los estados
   * presentes, para que las series apiladas conserven la misma longitud al mover
   * el periodo y no aparezcan huecos. Es el único desglose por día y estado del
   * store; la página no lo recompone por su cuenta. Puro.
   */
  seriePorEstado(dias: number): { fecha: string; porEstado: Record<PedidoEstado, number> }[] {
    const hoy = new Date();
    const desde = new Date(hoy);
    desde.setDate(hoy.getDate() - (Math.max(1, dias) - 1));
    return this.seriePorEstadoEntre(ymdDeDate(desde), ymdDeDate(hoy));
  }

  /**
   * Variante de `seriePorEstado` con rango explícito [desde, hasta] inclusive
   * ("YYYY-MM-DD" local), para cuando el usuario elige fechas en el calendario.
   * Puro.
   */
  seriePorEstadoEntre(desde: string, hasta: string): { fecha: string; porEstado: Record<PedidoEstado, number> }[] {
    const conteo = new Map<string, Record<PedidoEstado, number>>();
    for (const p of this.pedidos) {
      const dia = ymdLocal(p.createdAt);
      const bucket = conteo.get(dia) ?? conteoPorEstadoVacio();
      bucket[p.estado] += 1;
      conteo.set(dia, bucket);
    }
    return recorrerDias(desde, hasta, (fecha) => ({
      fecha,
      porEstado: conteo.get(fecha) ?? conteoPorEstadoVacio(),
    }));
  }

  /**
   * Reparto de los pedidos del rango según su **estado de pago** (`Pedido.pagado`).
   * `pendiente` agrupa todo lo que no está marcado como pagado (incluido el
   * `undefined` de los pedidos creados sin ese dato), de modo que ambos números
   * siempre suman el total del rango. Con rango `null`, todo el histórico. Puro.
   */
  porPagoEnRango(rango: RangoFechas | null): { pagado: number; pendiente: number } {
    const enRango = this.pedidosEnRango(rango);
    const pagado = enRango.filter((p) => p.pagado === true).length;
    return { pagado, pendiente: enRango.length - pagado };
  }

  /**
   * Reparto de un mismo total entre claves, en porcentaje entero que suma 100.
   * Sirve para las barras segmentadas (canales, modalidades) sin que cada
   * consumidor reimplemente el redondeo. Con total 0 todas las cuotas son 0.
   * Puro.
   */
  repartirPorcentaje(valores: number[]): number[] {
    const total = valores.reduce((s, v) => s + v, 0);
    if (total <= 0) return valores.map(() => 0);
    const crudos = valores.map((v) => (v / total) * 100);
    // Redondeo por mayor resto: garantiza que la suma de los enteros sea 100.
    const pisos = crudos.map((v) => Math.floor(v));
    let resto = 100 - pisos.reduce((s, v) => s + v, 0);
    const orden = crudos
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac);
    const out = [...pisos];
    for (const { i } of orden) {
      if (resto <= 0) break;
      out[i] += 1;
      resto -= 1;
    }
    return out;
  }

  /** El pedido en curso más reciente (para el hero del dashboard). */
  get ultimoPedido(): Pedido | null {
    const enCurso = this.enCurso();
    if (enCurso.length === 0) return null;
    return [...enCurso].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  /** Actividad reciente: últimos pedidos por createdAt (en curso o no). */
  actividadReciente(limit = 6): Pedido[] {
    return [...this.pedidos].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  // ── Derivados de tarjeta ──────────────────────────────────────────────────

  /** Minutos que lleva el pedido en su estado actual. */
  minutosEnEstado(p: Pedido): number {
    return minutesSince(p.estadoDesde);
  }

  /**
   * Minutos objetivo para el estado actual del pedido: usa el tiempo objetivo
   * por estado (config B) si existe; si no, cae en el umbral global.
   */
  objetivoDe(estado: PedidoEstado): number {
    const t = this.config.tiemposObjetivo[estado as EstadoConfigurable];
    return typeof t === "number" && t > 0 ? t : this.config.umbralUrgencia;
  }

  /** ¿La tarjeta es urgente? (supera su tiempo objetivo y no es terminal). */
  esUrgente(p: Pedido): boolean {
    if (this.esTerminal(p.estado) || p.estado === "programado") return false;
    return this.minutosEnEstado(p) >= this.objetivoDe(p.estado);
  }

  /** Subtotal monetario de los items del pedido (sin envío). */
  subtotalItems(p: Pedido): number {
    return p.items.reduce((s, it) => s + (it.precio ?? 0) * it.cantidad, 0);
  }

  /** Total monetario del pedido (subtotal items + costo de envío si aplica). */
  totalPedido(p: Pedido): number {
    return this.subtotalItems(p) + (p.costoEnvio ?? 0);
  }

  /** Monto a devolver si el cliente paga en efectivo con un billete mayor. */
  cambioRequerido(p: Pedido): number {
    if (p.metodoPago && p.metodoPago !== "efectivo") return 0;
    if (!p.pagaCon) return 0;
    return Math.max(0, p.pagaCon - this.totalPedido(p));
  }

  /** Resumen legible de items, ej. "2× Combo, 1× Postre". */
  resumenItems(p: Pedido): string {
    return p.items.map((it) => `${it.cantidad}× ${it.nombre}`).join(", ");
  }

  /** Asigna o actualiza el mensajero/repartidor responsable de la entrega. */
  asignarRepartidor(id: string, repartidor: string): boolean {
    const p = this.getPedido(id);
    if (!p) return false;
    p.repartidor = repartidor.trim() || undefined;
    return true;
  }

  /** Direcciones registradas para un cliente en la memoria CRM. */
  direccionesDe(telefono: string): DireccionEntrega[] {
    const digitos = soloDigitos(telefono);
    return this.crmDirecciones[digitos] ?? [];
  }

  /** Última dirección registrada para un cliente. */
  ultimaDireccionDe(telefono: string): DireccionEntrega | undefined {
    return this.direccionesDe(telefono)[0];
  }

  /** Guarda o actualiza una dirección en el historial del cliente (memoria CRM). */
  guardarDireccionCliente(telefono: string, dir: DireccionEntrega): void {
    const digitos = soloDigitos(telefono);
    if (!digitos || !dir.calle.trim()) return;
    const prev = this.crmDirecciones[digitos] ?? [];
    const filtered = prev.filter(
      (d) => d.calle.trim().toLowerCase() !== dir.calle.trim().toLowerCase()
    );
    this.crmDirecciones[digitos] = [dir, ...filtered].slice(0, 5);
    persistDireccionesCRM(this.crmDirecciones);
  }

  // ── Acciones ────────────────────────────────────────────────────────────

  /**
   * Crea un pedido (bot de WhatsApp u operador). Nace en estado `nuevo`, salvo
   * que se indique `programadoPara` con una fecha futura: en ese caso nace
   * `programado` y espera su hora (activación automática o manual).
   */
  crearPedido(data: {
    cliente: string;
    telefono: string;
    modalidad: Modalidad;
    items: PedidoItem[];
    notas?: string;
    origen?: "whatsapp" | "operador";
    /** ISO opcional; si es futuro, el pedido nace `programado`. */
    programadoPara?: string;
    direccionEntrega?: DireccionEntrega;
    costoEnvio?: number;
    metodoPago?: MetodoPago;
    pagaCon?: number;
    repartidor?: string;
  }): Pedido {
    this.seq += 1;
    const now = nowIso();
    const esFuturo = !!data.programadoPara && new Date(data.programadoPara).getTime() > Date.now();
    const pedido: Pedido = {
      id: crypto.randomUUID(),
      numero: `P-${String(this.seq).padStart(3, "0")}`,
      cliente: data.cliente,
      telefono: data.telefono,
      modalidad: data.modalidad,
      items: data.items,
      notas: data.notas,
      estado: esFuturo ? "programado" : "nuevo",
      origen: data.origen ?? "operador",
      createdAt: now,
      estadoDesde: now,
      programadoPara: esFuturo ? data.programadoPara : undefined,
      direccionEntrega: data.direccionEntrega,
      costoEnvio: data.costoEnvio,
      metodoPago: data.metodoPago,
      pagaCon: data.pagaCon,
      repartidor: data.repartidor,
    };
    this.pedidos.push(pedido);

    // Auto-registrar en memoria CRM si se especificó dirección
    if (data.direccionEntrega && data.direccionEntrega.calle.trim()) {
      this.guardarDireccionCliente(data.telefono, data.direccionEntrega);
    }

    return this.getPedido(pedido.id) ?? pedido;
  }

  /**
   * Reprograma un pedido programado a una nueva fecha/hora (ISO). Solo válido
   * mientras el pedido siga en estado `programado`. Devuelve true si se aplicó.
   */
  reprogramar(id: string, programadoPara: string): boolean {
    const p = this.getPedido(id);
    if (!p || p.estado !== "programado") return false;
    p.programadoPara = programadoPara;
    return true;
  }

  /**
   * Activa un pedido programado: lo pasa a `nuevo` y arranca el pipeline normal.
   * Válido solo desde `programado`. Devuelve true si se aplicó.
   */
  activarAhora(id: string): boolean {
    const p = this.getPedido(id);
    if (!p || p.estado !== "programado") return false;
    p.estado = "nuevo";
    p.estadoDesde = nowIso();
    return true;
  }

  /**
   * Activa todos los programados cuya hora ya llegó. Lo llama el tick (y puede
   * invocarse manualmente en tests). Devuelve cuántos activó.
   */
  activarProgramadosVencidos(): number {
    const ahora = Date.now();
    let activados = 0;
    for (const p of this.pedidos) {
      if (p.estado !== "programado") continue;
      if (p.programadoPara && new Date(p.programadoPara).getTime() <= ahora) {
        p.estado = "nuevo";
        p.estadoDesde = nowIso();
        activados += 1;
      }
    }
    return activados;
  }

  /**
   * Arranca el tick que activa programados vencidos periódicamente. Solo tiene
   * efecto en el navegador (mock: mientras la pestaña esté abierta). Idempotente.
   */
  iniciarTick(intervaloMs = 30000): void {
    if (this.tickHandle !== null) return;
    if (typeof setInterval === "undefined") return;
    this.activarProgramadosVencidos(); // barrido inmediato al montar
    this.tickHandle = setInterval(() => this.activarProgramadosVencidos(), intervaloMs);
  }

  /** Detiene el tick de activación (limpieza al desmontar). */
  detenerTick(): void {
    if (this.tickHandle !== null) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  /**
   * Mueve un pedido a un estado destino si la transición es válida.
   * Devuelve true si se aplicó, false si se rechazó (transición inválida).
   */
  moverEstado(id: string, destino: PedidoEstado): boolean {
    const p = this.getPedido(id);
    if (!p) return false;
    if (!this.transicionValida(p, destino)) return false;
    p.estado = destino;
    p.estadoDesde = nowIso();
    if (this.esTerminal(destino)) p.finishedAt = nowIso();
    return true;
  }

  /**
   * Avanza el pedido al siguiente estado válido de su pipeline. Devuelve el
   * nuevo estado, o null si ya no puede avanzar.
   */
  avanzar(id: string): PedidoEstado | null {
    const p = this.getPedido(id);
    if (!p) return null;
    const siguiente = this.siguienteEstado(p);
    if (!siguiente) return null;
    return this.moverEstado(id, siguiente) ? siguiente : null;
  }

  /** Cancela un pedido (válido desde cualquier estado no terminal). */
  cancelar(id: string): boolean {
    return this.moverEstado(id, "cancelado");
  }

  /**
   * Devuelve a la hoja de ruta un pedido que falló en la calle, para un segundo
   * intento de entrega.
   *
   * Va de `en_camino` (o `listo`) a `listo`, y es la ÚNICA transición hacia
   * ATRÁS del pipeline. Existe porque el desenlace natural de una entrega
   * fallida no es anular la venta: si el cliente no estaba, el negocio vuelve
   * mañana. Sin esta transición la única salida de `en_camino` sería `entregado`
   * o `cancelado`, así que «reintentar» no tendría forma de expresarse.
   *
   * NO se implementa aflojando `transicionValida` (que prohíbe retroceder): se
   * hace un método propio, explícito y con nombre. Un `moverEstado` que aceptara
   * cualquier destino convertiría una regla de negocio en un agujero por el que
   * cualquier UI podría devolver un pedido a `nuevo`.
   *
   * `en_camino` puede no pertenecer al pipeline efectivo (es opcional y solo
   * aplica a domicilio), así que la guarda comprueba el estado de ORIGEN, no una
   * posición en la lista.
   */
  reintentarEntrega(id: string): boolean {
    const p = this.getPedido(id);
    if (!p) return false;
    if (p.estado !== "en_camino" && p.estado !== "listo") return false;
    p.estado = "listo";
    p.estadoDesde = nowIso();
    // Se limpia la marca de cierre: el pedido vuelve a estar activo. Sin esto,
    // un pedido que ya había tocado un terminal arrastraría un `finishedAt`
    // mientras figura en la hoja de ruta, y el recaudo del día lo contaría como
    // cerrado hoy.
    delete p.finishedAt;
    return true;
  }

  /**
   * Anexa un bloque a las notas del pedido, conservando lo que ya había.
   *
   * Existe para que ninguna superficie tenga que hacer
   * `pedido.notas = \`Cancelado: ${motivo}\``, que MACHACA las notas del cliente
   * («Sin cebolla en uno», «Mesa 5»). El campo es del cliente; las superficies
   * solo tienen derecho a añadir.
   *
   * Devuelve `false` si el pedido no existe, para que el llamador pueda saber
   * que la nota no se escribió en vez de asumirlo.
   */
  anexarNota(id: string, bloque: string): boolean {
    const p = this.getPedido(id);
    if (!p) return false;
    const texto = bloque.trim();
    if (texto === "") return false;
    const previo = (p.notas ?? "").trim();
    p.notas = previo ? `${previo}\n${texto}` : texto;
    return true;
  }

  /** Elimina un pedido de la lista (mock). */
  eliminar(id: string): void {
    this.pedidos = this.pedidos.filter((p) => p.id !== id);
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  /** Etiqueta de estado, honrando columnas personalizadas y alias de config si existen. */
  estadoLabel(e: PedidoEstado): string {
    if (this.config.columnasPersonalizadas) {
      const custom = this.config.columnasPersonalizadas.find((c) => c.id === e);
      if (custom) return custom.label;
    }
    const alias = this.config.aliasEstados[e as EstadoConfigurable];
    return alias && alias.trim() ? alias.trim() : (ESTADO_LABEL[e] ?? (e as string));
  }

  /** Etiqueta de modalidad, honrando el alias de la config (C) si existe. */
  modalidadLabel(m: Modalidad): string {
    const alias = this.config.aliasModalidades[m];
    return alias && alias.trim() ? alias.trim() : MODALIDAD_LABEL[m];
  }

  /**
   * Etiqueta de origen (canal de entrada). Sin alias configurable: el origen es
   * una dimensión de sistema, no una etiqueta de negocio renombrable.
   */
  origenLabel(o: Origen): string {
    return ORIGEN_LABEL[o];
  }

  /**
   * ¿El negocio está abierto en el momento `ref` según el horario (A)?
   * Si el horario no está activo, siempre true. Considera día laboral + franja
   * apertura–cierre (misma jornada; no cruza medianoche).
   */
  estaAbierto(ref: Date = new Date()): boolean {
    const h = this.config.horario;
    if (!h.activo) return true;
    if (!h.dias.includes(ref.getDay())) return false;
    const min = ref.getHours() * 60 + ref.getMinutes();
    const [ah, am] = h.apertura.split(":").map(Number);
    const [ch, cm] = h.cierre.split(":").map(Number);
    return min >= ah * 60 + am && min < ch * 60 + cm;
  }

  /** Color semántico del Badge (Elements) según el estado. */
  estadoBadgeColor(e: PedidoEstado): "info" | "primary" | "warning" | "success" | "light" | "error" {
    const mapa: Record<string, "info" | "primary" | "warning" | "success" | "light" | "error"> = {
      programado: "light",
      nuevo: "info",
      confirmado: "primary",
      en_preparacion: "warning",
      listo: "success",
      en_camino: "primary",
      entregado: "success",
      cancelado: "error",
    };
    return mapa[e] ?? "primary";
  }

  /** Color del punto/acento de columna del tablero según el estado. */
  estadoDotClass(e: PedidoEstado): string {
    const mapa: Record<string, string> = {
      programado: "bg-gray-400",
      nuevo: "bg-accent-500",
      confirmado: "bg-brand-500",
      en_preparacion: "bg-warning-500",
      listo: "bg-success-500",
      en_camino: "bg-brand-500",
      entregado: "bg-success-600",
      cancelado: "bg-error-500",
    };
    return mapa[e] ?? "bg-brand-500";
  }
}

export const pedidosStore = new PedidosStore();
