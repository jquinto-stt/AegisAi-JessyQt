import { makeAutoObservable } from "mobx";

import {
  ajustesDeAuditoria,
  diferenciaDe,
  disponibleDeLote,
  estadoDeStock,
  motivoNoConciliable,
  movimientosDe,
  nivelDeStock,
  obtenerLotesSugeridosFEFO,
  stockDe,
  stockTotalDe,
  totalDisponibleDe,
  urgenciaDeVencimiento,
  validarMovimiento,
  valorInventario,
  type Articulo,
  type AuditoriaInventario,
  type Bodega,
  type EstadoAuditoria,
  type EstadoLinea,
  type EstadoStock,
  type ItemAuditoria,
  type LoteArticulo,
  type LoteDisponible,
  type Movimiento,
  type NivelStock,
  type TipoMovimiento,
  type UnidadMedida,
  type UrgenciaVencimiento,
} from "@/domain/inventario/inventario.domain";

// ═══════════════════════════════════════════════════════════════════════════
// INVENTARIO — store del módulo
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Independencia (D1/D2) ─────────────────────────────────────────────────
// Este archivo NO importa nada de `pedidos`, y `stores/pedidos.store.ts` no
// importa nada de aquí. Los dos módulos comparten sesión, roles, organización,
// sidebar, `AppShell` y tema — eso es ser parte de Necto, no acoplamiento. Lo
// que NO comparten es dominio. Ver `stores/inventario.independencia.test.ts`.
//
// ── La existencia no se guarda: se deriva (I1) ────────────────────────────
// No hay ningún campo `cantidad` en `Articulo`. El stock de un artículo en una
// bodega es la suma de los efectos de sus movimientos (`stockDe`). Guardar
// además un `existencia.cantidad` serían dos fuentes de verdad para el mismo
// número, y cualquier bug las desincroniza en silencio — este repo ya pagó ese
// precio dos veces (`Conversacion.pedidoActivoId`, `ESTADO_PREP_META`).
//
// El coste es O(n) por lectura sobre los movimientos, y es despreciable:
// decenas de artículos y cientos de movimientos, con MobX memoizando el
// `computed` mientras nada cambie. Se declara y se acepta.
//
// ── Persistencia: solo la configuración, igual que Pedidos ────────────────
// En Pedidos los pedidos son seed en memoria y solo la configuración persiste
// (`necto.pedidosConfig`). Un kárdex que sí persistiera introduciría dos
// modelos de persistencia en el mismo producto sin ninguna razón que los
// distinga. Se sigue el mismo patrón: kárdex en memoria + `necto.inventarioConfig`.
//
// **Deuda declarada**: es defendible que un kárdex sobreviva a un recargue.
// Si algún día se decide eso, la coherencia pide revisarlo también en Pedidos,
// y eso es otro trabajo.
//
// ── Una sola bodega principal (I6) ────────────────────────────────────────
// `marcarPrincipal()` es la única forma de cambiar cuál es, y deja
// exactamente una en `true`. `eliminarBodega()` promueve otra si se lleva la
// principal, y rechaza borrar la última: el invariante no depende de que nadie
// llame a la acción correcta.
//
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS Y VOCABULARIO
// ═══════════════════════════════════════════════════════════════════════════

/** Severidad de la alerta de reposición. */
export type SeveridadAlerta = "baja" | "media" | "alta";

/**
 * Configuración del módulo de inventario (la única parte que persiste).
 *
 * Las tres secciones de `/inventario/config` salen de aquí: `general` (unidad
 * por defecto), `bodegas` (el catálogo, que vive en el store) y `alertas`.
 */
export interface InventarioConfig {
  /** Unidad de medida preseleccionada al dar de alta un artículo. */
  unidadPorDefecto: UnidadMedida;
  /** Activar el aviso de artículos por debajo de su punto de reorden. */
  alertaBajoMinimo: boolean;
  /** Con qué severidad se pinta ese aviso. */
  severidadAlerta: SeveridadAlerta;
  /**
   * Margen sobre el mínimo a partir del cual se considera «cerca del mínimo»,
   * en porcentaje. 0 = solo avisa por debajo del mínimo.
   */
  margenAviso: number;
}

/** Datos con los que se construye el store. Todo en memoria. */
export interface DatosInventario {
  articulos: Articulo[];
  bodegas: Bodega[];
  movimientos: Movimiento[];
  /**
   * Lotes con trazabilidad de vencimiento.
   *
   * **Opcional, y no por comodidad**: un catálogo sin lotes es un estado
   * legítimo —no todo artículo se rastrea por lote— y un escenario de test que
   * no los declara no está incompleto. Ausente y `[]` significan lo mismo.
   */
  lotes?: LoteArticulo[];
  /** Auditorías de inventario. Ausente y `[]` significan lo mismo. */
  auditorias?: AuditoriaInventario[];
}

/** Datos para registrar un movimiento. `id`, `fecha` y `actor` los pone el store. */
export type NuevoMovimiento = Omit<Movimiento, "id" | "fecha" | "actor"> & {
  actor?: string;
};

/** Resultado de registrar un movimiento: o el movimiento, o el motivo del «no». */
export type ResultadoRegistro =
  | { ok: true; movimiento: Movimiento }
  | { ok: false; motivo: string };

/** Resultado de una acción que puede rechazarse por una regla del dominio. */
export type ResultadoAccion = { ok: true } | { ok: false; motivo: string };

/** Abrir una auditoría: o la auditoría, o el motivo del «no». */
export type ResultadoApertura =
  | { ok: true; auditoria: AuditoriaInventario }
  | { ok: false; motivo: string };

/**
 * Conciliar una auditoría: o los movimientos que escribió, o el motivo del «no».
 *
 * Devuelve los movimientos y no un `{ ok: true }` pelado porque la pantalla
 * tiene que poder decir qué se ajustó: «conciliada» sin decir cuánto se movió
 * es un acuse de recibo, no un resultado.
 */
export type ResultadoConciliacion =
  | { ok: true; movimientos: Movimiento[] }
  | { ok: false; motivo: string };

/**
 * Una línea de auditoría resuelta para la pantalla: la línea, su artículo y los
 * dos números que el operador compara.
 *
 * `existenciaActual` es la existencia de HOY en la bodega de la auditoría y
 * puede diferir de `item.conteoTeorico` —la foto se congeló al abrir—. Ver
 * `InventarioStore.lineasDeAuditoria`.
 */
export interface LineaAuditoria {
  item: ItemAuditoria;
  articulo: Articulo;
  /** `conteoFisico − conteoTeorico`. `null` mientras no se cuente. */
  diferencia: number | null;
  /** Existencia teórica AHORA en la bodega de la auditoría. */
  existenciaActual: number;
}

/** Etiquetas legibles del kárdex. Ninguna superficie las escribe como literal. */
export const TIPO_MOVIMIENTO_LABEL: Record<TipoMovimiento, string> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
  transferencia: "Transferencia",
};

/** Etiquetas de estado de existencias. Derivadas, nunca persistidas (I3). */
export const ESTADO_STOCK_LABEL: Record<EstadoStock, string> = {
  agotado: "Agotado",
  bajo_minimo: "Bajo mínimo",
  reorden: "En reorden",
  ok: "Disponible",
};

/**
 * Color de badge de cada estado de existencias.
 *
 * **Sin verde, y no por gusto.** El manual de marca (`Esencia_necto/`, pág. «G»)
 * no tiene verde en ninguna página: cualquier verde en el producto es
 * contaminación. Se usan tres colores del catálogo y el criterio es «el color
 * marca la EXCEPCIÓN»: el estado normal va en neutro y solo se pinta lo que
 * requiere atención. El `success` verde que Pedidos usa para «listo/entregado»
 * no se copia aquí por eso.
 */
export const ESTADO_STOCK_BADGE: Record<EstadoStock, "light" | "warning" | "error"> = {
  agotado: "error",
  bajo_minimo: "warning",
  // `reorden` comparte el ámbar de `bajo_minimo`: es la misma llamada —«reponer»—
  // en su grado temprano. Lo que los distingue es la etiqueta y el orden, no un
  // cuarto color que el catálogo no tiene.
  reorden: "warning",
  ok: "light",
};

/**
 * Etiquetas de estado de una auditoría. Ninguna superficie las escribe a mano.
 */
export const ESTADO_AUDITORIA_LABEL: Record<EstadoAuditoria, string> = {
  en_proceso: "En proceso",
  completada: "Conciliada",
  cancelada: "Cancelada",
};

/**
 * Color de badge de cada estado de auditoría.
 *
 * La misma rampa de tres colores que los otros mapas del módulo, y por el mismo
 * motivo —el manual de marca no tiene verde—: `warning` para lo que está vivo y
 * exige trabajo, y neutro para lo que ya terminó. **`completada` no es
 * `success`**: conciliar una auditoría no es un logro, es el cierre de una
 * discrepancia.
 */
export const ESTADO_AUDITORIA_BADGE: Record<EstadoAuditoria, "light" | "warning" | "error"> = {
  en_proceso: "warning",
  completada: "light",
  cancelada: "light",
};

/**
 * Etiquetas de cómo quedó una línea del conteo. Ninguna superficie las escribe a
 * mano.
 */
export const ESTADO_LINEA_LABEL: Record<EstadoLinea, string> = {
  // «Sin contar» y no «Pendiente»: el operador tiene que poder distinguir de un
  // vistazo lo que le falta hacer de lo que ya comprobó.
  pendiente: "Sin contar",
  coincide: "Coincide",
  sobra: "Sobra",
  falta: "Falta",
};

/**
 * Color de badge de cada clase de línea.
 *
 * `coincide` va en neutro y no en verde, por la razón de siempre —el manual de
 * marca no tiene verde—, pero además por una de fondo: **una línea que cuadra no
 * es un logro, es la ausencia de un problema.** Pintarla de color la pondría a
 * competir con las dos que sí exigen algo.
 *
 * `pendiente` va en ámbar y no en neutro: es trabajo sin hacer, y una línea sin
 * contar tiene que verse en la tabla, no confundirse con una ya comprobada.
 */
export const ESTADO_LINEA_BADGE: Record<EstadoLinea, "light" | "warning" | "error"> = {
  pendiente: "warning",
  coincide: "light",
  sobra: "warning",
  falta: "error",
};

/** Etiquetas de severidad de alerta. */
export const SEVERIDAD_ALERTA_LABEL: Record<SeveridadAlerta, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

/** Etiquetas de urgencia de vencimiento. Ninguna superficie las escribe a mano. */
export const URGENCIA_VENCIMIENTO_LABEL: Record<UrgenciaVencimiento, string> = {
  vencido: "Vencido",
  critico: "Vence esta semana",
  proximo: "Vence pronto",
  aviso: "Próximo a vencer",
  ok: "Vigente",
  // No es «Vigente»: no saber la fecha no es estar bien. Ver el docblock de
  // `UrgenciaVencimiento`.
  desconocido: "Sin fecha legible",
};

/**
 * Color de badge de cada urgencia de vencimiento.
 *
 * La misma rampa de tres colores que `ESTADO_STOCK_BADGE`, y por el mismo motivo
 * —el manual de marca no tiene verde—: `error` para lo que ya se perdió,
 * `warning` para lo que exige atención (una semana o quince días), y neutro para
 * lo que solo se está avisando. `critico` y `proximo` comparten ámbar porque son
 * la misma llamada en dos grados; lo que los distingue es la etiqueta.
 */
export const URGENCIA_VENCIMIENTO_BADGE: Record<
  UrgenciaVencimiento,
  "light" | "warning" | "error"
> = {
  vencido: "error",
  critico: "warning",
  proximo: "warning",
  aviso: "light",
  ok: "light",
  desconocido: "warning",
};

/** Etiquetas de unidad de medida, para selects y tablas. */
export const UNIDAD_MEDIDA_LABEL: Record<UnidadMedida, string> = {
  unidad: "Unidad",
  kg: "Kilogramo",
  g: "Gramo",
  l: "Litro",
  ml: "Mililitro",
  caja: "Caja",
  porcion: "Porción",
};

/** Todas las unidades, en orden canónico (el que ve el `<select>`). */
export const UNIDADES_MEDIDA: UnidadMedida[] = [
  "unidad",
  "kg",
  "g",
  "l",
  "ml",
  "caja",
  "porcion",
];

/**
 * Los cuatro tipos de movimiento, en el orden en que se ofrecen.
 *
 * Orden deliberado y no alfabético: primero lo que MUEVE mercancía dentro o fuera
 * del sistema (`entrada`, `salida`), después `transferencia` —que solo cambia de
 * sitio— y al final `ajuste`, que es el único que reescribe la realidad sin un
 * hecho externo que lo respalde y por eso exige motivo (invariante I5).
 *
 * Vive aquí y no en el `<select>` para que el mismo orden lo usen el formulario y
 * los filtros del kárdex: dos listas del mismo vocabulario acababan discrepando.
 */
export const TIPOS_MOVIMIENTO: TipoMovimiento[] = [
  "entrada",
  "salida",
  "transferencia",
  "ajuste",
];

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN PERSISTIDA
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG_KEY = "necto.inventarioConfig";

const DEFAULT_CONFIG: InventarioConfig = {
  unidadPorDefecto: "unidad",
  alertaBajoMinimo: true,
  severidadAlerta: "media",
  margenAviso: 0,
};

/** Carga la config guardada, fusionada con los valores por defecto. */
function loadConfig(): InventarioConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<InventarioConfig>;
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        // Se revalida la forma: un valor de una versión anterior o manipulado a
        // mano no puede dejar la unidad en algo que no es una unidad.
        unidadPorDefecto: UNIDADES_MEDIDA.includes(parsed.unidadPorDefecto as UnidadMedida)
          ? (parsed.unidadPorDefecto as UnidadMedida)
          : DEFAULT_CONFIG.unidadPorDefecto,
        severidadAlerta: ["baja", "media", "alta"].includes(parsed.severidadAlerta as string)
          ? (parsed.severidadAlerta as SeveridadAlerta)
          : DEFAULT_CONFIG.severidadAlerta,
        margenAviso:
          Number.isFinite(parsed.margenAviso) && (parsed.margenAviso as number) >= 0
            ? (parsed.margenAviso as number)
            : DEFAULT_CONFIG.margenAviso,
      };
    }
  } catch {
    // Entorno sin localStorage o JSON inválido: se usan los valores por defecto.
  }
  return { ...DEFAULT_CONFIG };
}

function persistConfig(cfg: InventarioConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  } catch {
    // Sin localStorage: no-op (mock).
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED — el kárdex de arranque
// ═══════════════════════════════════════════════════════════════════════════
//
// Nace con DOS bodegas a propósito: el catálogo de la plataforma promete
// «Multi-almacén» (`CATALOGO_MODULOS.inventario.destacados`). Un módulo que
// naciera con una sola bodega dejaría esa frase mintiendo, y la alternativa
// —retirar el destacado— es empobrecer el producto por no sembrar un dato.
//
// El negocio del seed es el MISMO que el de Pedidos: **comida**. Un almacén de
// ropa junto a un catálogo de «Combo clásico / Bebida 350ml / Postre del día»
// es un demo incoherente: dos módulos del mismo negocio contando dos negocios.
//
// Los tres estados de existencias están representados (`ok`, `bajo_minimo` y
// `agotado`) para que las pantallas se vean con datos reales y no solo con el
// camino feliz. Las cantidades están elegidas para que el final de cada
// artículo caiga en el estado que se quiere mostrar, no al azar.

const BOD_COCINA = "bod-cocina";
const BOD_FRIA = "bod-fria";

/** ISO de `diasAtras` días atrás, a una hora fija (determinismo del seed). */
function fechaHace(diasAtras: number, hora = 9): string {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  d.setHours(hora, 0, 0, 0);
  return d.toISOString();
}

/** ISO de dentro de `dias`, a una hora fija. Para vencimientos del seed. */
function fechaEnDias(dias: number, hora = 9): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hora, 0, 0, 0);
  return d.toISOString();
}

/**
 * Constructor de un movimiento del seed. `id` explícito y correlativo: el seed
 * se lee como una tabla y sus ids son estables entre ejecuciones.
 *
 * `loteId` se pasa solo en los movimientos que **cambian** un lote ya existente
 * —una salida, un ajuste a la baja—, **nunca en la entrada que lo crea**: la
 * entrada ES el `cantidadInicial` del lote, y etiquetarla la contaría dos veces
 * (`disponibleDeLote` sumaría su efecto sobre un número que ya la incluye). Hay
 * un test que lo fija sobre el seed.
 */
function movimiento(
  id: string,
  diasAtras: number,
  articuloId: string,
  tipo: TipoMovimiento,
  cantidad: number,
  origenId: string | null,
  destinoId: string | null,
  extra: { motivo?: string; actor?: string; loteId?: string } = {},
): Movimiento {
  return {
    id,
    articuloId,
    tipo,
    cantidad,
    origenId,
    destinoId,
    motivo: extra.motivo,
    loteId: extra.loteId,
    fecha: fechaHace(diasAtras),
    actor: extra.actor ?? "d0",
  };
}

/** Datos de arranque del módulo. Puro y determinista salvo por las fechas. */
export function seed(): DatosInventario {
  const bodegas: Bodega[] = [
    { id: BOD_COCINA, nombre: "Cocina principal", principal: true },
    { id: BOD_FRIA, nombre: "Bodega fría", principal: false },
  ];

  const articulos: Articulo[] = [
    // ── Proteínas ─────────────────────────────────────────────────────────
    {
      id: "art-pollo",
      sku: "SKU-1001",
      nombre: "Pechuga de pollo",
      categoria: "Proteínas",
      unidad: "kg",
      minimo: 5,
      costoUnitario: 12000,
    },
    {
      id: "art-carne-molida",
      sku: "SKU-1002",
      nombre: "Carne molida",
      categoria: "Proteínas",
      unidad: "kg",
      minimo: 3,
      costoUnitario: 18000,
    },
    {
      id: "art-salmon",
      sku: "SKU-1003",
      nombre: "Salmón",
      categoria: "Proteínas",
      unidad: "kg",
      minimo: 2,
      costoUnitario: 35000,
    },

    // ── Lácteos ───────────────────────────────────────────────────────────
    {
      id: "art-mozzarella",
      sku: "SKU-2001",
      nombre: "Queso mozzarella",
      categoria: "Lácteos",
      unidad: "kg",
      minimo: 2,
      puntoReorden: 6,
      stockMaximo: 24,
      costoUnitario: 22000,
    },
    {
      id: "art-crema",
      sku: "SKU-2002",
      nombre: "Crema de leche",
      categoria: "Lácteos",
      unidad: "l",
      minimo: 3,
      costoUnitario: 8000,
    },

    // ── Insumos ───────────────────────────────────────────────────────────
    {
      id: "art-aceite",
      sku: "SKU-3001",
      nombre: "Aceite de oliva",
      categoria: "Insumos",
      unidad: "l",
      minimo: 2,
      puntoReorden: 8,
      stockMaximo: 30,
      costoUnitario: 15000,
    },
    {
      id: "art-harina",
      sku: "SKU-3002",
      nombre: "Harina de trigo",
      categoria: "Insumos",
      unidad: "kg",
      minimo: 10,
      costoUnitario: 3500,
    },

    // ── Bebidas ───────────────────────────────────────────────────────────
    {
      id: "art-jugo",
      sku: "SKU-4001",
      nombre: "Jugo de naranja",
      categoria: "Bebidas",
      unidad: "l",
      minimo: 5,
      puntoReorden: 15,
      stockMaximo: 60,
      costoUnitario: 6000,
    },

    // ── Postres ───────────────────────────────────────────────────────────
    {
      id: "art-chocolate",
      sku: "SKU-5001",
      nombre: "Chocolate",
      categoria: "Postres",
      unidad: "kg",
      minimo: 1,
      puntoReorden: 10,
      stockMaximo: 40,
      costoUnitario: 28000,
    },
    {
      id: "art-fresas",
      sku: "SKU-5002",
      nombre: "Fresas",
      categoria: "Postres",
      unidad: "kg",
      minimo: 2,
      puntoReorden: 4,
      stockMaximo: 20,
      costoUnitario: 14000,
    },
  ];

  const movimientos: Movimiento[] = [
    // ── Pechuga de pollo (min 5 kg) — termina «ok» con 12 ─────────────────
    movimiento("mv-001", 6, "art-pollo", "entrada", 20, null, BOD_COCINA, { actor: "d1" }),
    movimiento("mv-002", 2, "art-pollo", "salida", 8, BOD_COCINA, null, {
      actor: "d2",
      loteId: "lote-pol-01",
    }),

    // ── Carne molida (min 3 kg) — termina «ok» con 8 ──────────────────────
    movimiento("mv-003", 6, "art-carne-molida", "entrada", 12, null, BOD_COCINA, { actor: "d1" }),
    movimiento("mv-004", 1, "art-carne-molida", "salida", 4, BOD_COCINA, null, {
      actor: "d2",
      loteId: "lote-car-01",
    }),

    // ── Salmón (min 2 kg) — termina AGOTADO: es el caso que enseña que el
    //    stock se deriva y que 0 es un estado, no un artículo ausente.
    movimiento("mv-005", 5, "art-salmon", "entrada", 5, null, BOD_COCINA, { actor: "d1" }),
    movimiento("mv-006", 3, "art-salmon", "transferencia", 2, BOD_COCINA, BOD_FRIA, { actor: "d1" }),
    movimiento("mv-007", 1, "art-salmon", "salida", 3, BOD_COCINA, null, { actor: "d2" }),
    movimiento("mv-008", 0, "art-salmon", "salida", 2, BOD_FRIA, null, { actor: "d2" }),

    // ── Queso mozzarella (min 2 kg) — termina «ok» con 5 ──────────────────
    movimiento("mv-009", 6, "art-mozzarella", "entrada", 5, null, BOD_COCINA, { actor: "d1" }),

    // ── Crema de leche (min 3 l) — termina BAJO MÍNIMO con 2 ──────────────
    movimiento("mv-010", 7, "art-crema", "entrada", 10, null, BOD_COCINA, { actor: "d1" }),
    movimiento("mv-011", 1, "art-crema", "salida", 8, BOD_COCINA, null, {
      actor: "d2",
      loteId: "lote-cre-01",
    }),

    // ── Aceite de oliva (min 2 l) — termina «ok» con 6 ────────────────────
    movimiento("mv-012", 7, "art-aceite", "entrada", 6, null, BOD_COCINA, { actor: "d1" }),

    // ── Harina de trigo (min 10 kg) — termina BAJO MÍNIMO con 9 ───────────
    //    9 contra un mínimo de 10: el caso límite por un solo kilo.
    movimiento("mv-013", 7, "art-harina", "entrada", 9, null, BOD_COCINA, { actor: "d1" }),

    // ── Jugo de naranja (min 5 l) — termina «ok» con 14, repartido ────────
    movimiento("mv-014", 6, "art-jugo", "entrada", 30, null, BOD_COCINA, { actor: "d1" }),
    movimiento("mv-015", 4, "art-jugo", "transferencia", 10, BOD_COCINA, BOD_FRIA, { actor: "d1" }),
    movimiento("mv-016", 2, "art-jugo", "salida", 16, BOD_COCINA, null, { actor: "d2" }),

    // ── Chocolate (min 1 kg) — «ok», con el ajuste AL ALZA ────────────────
    //    Un conteo físico que encuentra más de lo que el sistema creía.
    movimiento("mv-017", 6, "art-chocolate", "entrada", 8, null, BOD_COCINA, { actor: "d1" }),
    movimiento("mv-018", 1, "art-chocolate", "ajuste", 1, null, BOD_COCINA, {
      motivo: "Conteo físico: diferencia a favor",
      actor: "d3",
    }),

    // ── Fresas (min 2 kg) — «ok», con el ajuste A LA BAJA ─────────────────
    //    El único movimiento del módulo que destruye existencia sin que salga
    //    de ningún sitio: por eso exige motivo (I5).
    movimiento("mv-019", 5, "art-fresas", "entrada", 10, null, BOD_FRIA, { actor: "d1" }),
    movimiento("mv-020", 1, "art-fresas", "ajuste", 7, BOD_FRIA, null, {
      motivo: "Merma por vencimiento",
      actor: "d3",
      loteId: "lote-fre-01",
    }),
  ];

  // ── Lotes ─────────────────────────────────────────────────────────────────
  //
  // Nueve lotes sobre ocho artículos, con las cinco bandas de vencimiento
  // representadas para que la pantalla no enseñe solo el camino feliz:
  //
  //   · `lote-har-01` (harina) venció hace dos días y sus 9 kg siguen en el
  //     almacén: es el caso que enseña que un lote vencido NO se despacha, y
  //     FEFO lo excluye en vez de ponerlo primero.
  //   · chocolate lleva DOS lotes, que es lo que hace que FEFO signifique algo:
  //     con un lote por artículo, «el que vence antes» no elige nada.
  //   · salmón y jugo no tienen ninguno: su mercancía se movió entre bodegas
  //     (mv-006, mv-015) y **un lote no se transfiere en esta versión** (deuda
  //     declarada). Un artículo sin lotes es un estado legítimo de la pantalla.
  //
  // La suma de `cantidadInicial` de cada artículo es su existencia en esa
  // bodega, y hay un test que lo fija: si alguien etiqueta una entrada con un
  // lote, el doble conteo se ve ahí y no en una pantalla.
  const lotes: LoteArticulo[] = [
    {
      id: "lote-pol-01",
      articuloId: "art-pollo",
      codigoLote: "POL-2609",
      fechaVencimiento: fechaEnDias(45),
      cantidadInicial: 20,
      almacenId: BOD_COCINA,
    },
    {
      id: "lote-car-01",
      articuloId: "art-carne-molida",
      codigoLote: "CAR-2609",
      fechaVencimiento: fechaEnDias(90),
      cantidadInicial: 12,
      almacenId: BOD_COCINA,
    },
    {
      id: "lote-moz-01",
      articuloId: "art-mozzarella",
      codigoLote: "MOZ-2610",
      fechaVencimiento: fechaEnDias(60),
      cantidadInicial: 5,
      almacenId: BOD_COCINA,
    },
    {
      id: "lote-cre-01",
      articuloId: "art-crema",
      codigoLote: "CRE-2609",
      // 25 días: dentro del aviso de un mes, fuera del de quince.
      fechaVencimiento: fechaEnDias(25),
      cantidadInicial: 10,
      almacenId: BOD_COCINA,
    },
    {
      id: "lote-ace-01",
      articuloId: "art-aceite",
      codigoLote: "ACE-2610",
      fechaVencimiento: fechaEnDias(20),
      cantidadInicial: 6,
      almacenId: BOD_COCINA,
    },
    {
      id: "lote-har-01",
      articuloId: "art-harina",
      codigoLote: "HAR-2609",
      // VENCIDO hace dos días. Sus 9 kg siguen contando como existencia —están
      // en el almacén— pero no son despachables.
      fechaVencimiento: fechaEnDias(-2),
      cantidadInicial: 9,
      almacenId: BOD_COCINA,
    },
    {
      id: "lote-cho-01",
      articuloId: "art-chocolate",
      codigoLote: "CHO-2609A",
      fechaVencimiento: fechaEnDias(12),
      cantidadInicial: 8,
      almacenId: BOD_COCINA,
    },
    {
      // El código «B» vence ANTES que el «A», y ese es justo el punto de FEFO:
      // el orden de salida lo fija el vencimiento, no el nombre del lote.
      id: "lote-cho-02",
      articuloId: "art-chocolate",
      codigoLote: "CHO-2609B",
      fechaVencimiento: fechaEnDias(3),
      cantidadInicial: 1,
      almacenId: BOD_COCINA,
    },
    {
      id: "lote-fre-01",
      articuloId: "art-fresas",
      codigoLote: "FRE-2609",
      fechaVencimiento: fechaEnDias(2),
      cantidadInicial: 10,
      almacenId: BOD_FRIA,
    },
  ];

  // ── Auditoría ─────────────────────────────────────────────────────────────
  //
  // Una auditoría ABIERTA en la bodega principal, con las cuatro situaciones
  // que la pantalla tiene que saber pintar, porque un conteo a medias es el
  // estado normal de un conteo:
  //
  //   · `pollo` — teórico 12, contado 11 → **falta 1**. Es el ajuste a la baja,
  //     el único movimiento del módulo que destruye existencia sin que salga de
  //     ningún sitio.
  //   · `harina` — teórico 9, contado 9 → **coincide**. No genera movimiento, y
  //     ese es el punto: conciliar no es «escribir un ajuste por línea».
  //   · `salmón` — teórico **0**, contado 2 → **sobra**. Un artículo que el
  //     sistema da por agotado con mercancía en el estante es justo lo que un
  //     conteo existe para encontrar, y solo aparece si se cuenta el catálogo
  //     entero en vez de lo que el sistema cree que hay.
  //   · `crema` — teórico 2, **sin contar** (`null`). Deja la auditoría
  //     INCOMPLETA a propósito: es lo que hace que `conciliarAuditoria` rechace
  //     y que la pantalla tenga algo que decir antes de dejarse pulsar.
  //
  // Los teóricos de esta foto salen del kárdex de arriba (pollo 20−8, harina 9,
  // salmón 5−2−3, crema 10−8) y hay un test que lo fija: una foto que no cuadre
  // con su kárdex es una auditoría que miente sobre lo que el sistema creía.
  const auditorias: AuditoriaInventario[] = [
    {
      id: "aud-2609",
      almacenId: BOD_COCINA,
      estado: "en_proceso",
      fechaInicio: fechaHace(1, 8),
      items: [
        { articuloId: "art-pollo", conteoTeorico: 12, conteoFisico: 11 },
        { articuloId: "art-harina", conteoTeorico: 9, conteoFisico: 9 },
        { articuloId: "art-salmon", conteoTeorico: 0, conteoFisico: 2 },
        { articuloId: "art-crema", conteoTeorico: 2, conteoFisico: null },
      ],
    },
  ];

  return { articulos, bodegas, movimientos, lotes, auditorias };
}

// ═══════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * InventarioStore — kárdex, catálogo de artículos y bodegas (mock, en memoria).
 *
 * El constructor acepta datos iniciales para que los tests puedan partir de un
 * escenario mínimo y leerlo sin depender del seed completo.
 */
export class InventarioStore {
  articulos: Articulo[];
  bodegas: Bodega[];
  movimientos: Movimiento[];
  /** Lotes con trazabilidad de vencimiento. `[]` si el catálogo no los usa. */
  lotes: LoteArticulo[];
  /** Auditorías de inventario (conteos físicos). `[]` si no hay ninguna. */
  auditorias: AuditoriaInventario[];

  /** Configuración del módulo (la única parte que persiste). */
  config: InventarioConfig = loadConfig();

  constructor(datos: DatosInventario = seed()) {
    this.articulos = datos.articulos;
    this.bodegas = datos.bodegas;
    this.movimientos = datos.movimientos;
    // Ausente y `[]` significan lo mismo: un catálogo sin lotes es legítimo.
    this.lotes = datos.lotes ?? [];
    this.auditorias = datos.auditorias ?? [];
    makeAutoObservable(this);
  }

  // ── Lectura del catálogo ──────────────────────────────────────────────────

  articuloPorId(id: string | null | undefined): Articulo | undefined {
    if (!id) return undefined;
    return this.articulos.find((a) => a.id === id);
  }

  articuloPorSku(sku: string): Articulo | undefined {
    return this.articulos.find((a) => a.sku === sku);
  }

  bodegaPorId(id: string | null | undefined): Bodega | undefined {
    if (!id) return undefined;
    return this.bodegas.find((b) => b.id === id);
  }

  /**
   * Nombre de una bodega, o «Exterior» si es `null`.
   *
   * «Exterior» no es un dato de la tabla: es la ausencia de bodega, y el kárdex
   * la nombra para que una entrada se lea «Exterior → Bodega central» y no
   * «— → Bodega central».
   */
  etiquetaBodega(id: string | null): string {
    if (id === null) return "Exterior";
    return this.bodegaPorId(id)?.nombre ?? "Bodega desconocida";
  }

  /** La bodega principal (I6: existe exactamente una). */
  get bodegaPrincipal(): Bodega | undefined {
    return this.bodegas.find((b) => b.principal);
  }

  /** Bodegas distintas de la dada — el destino de una transferencia. */
  otrasBodegas(id: string): Bodega[] {
    return this.bodegas.filter((b) => b.id !== id);
  }

  // ── Existencias (derivadas, I1) ───────────────────────────────────────────

  /** Existencia de un artículo en una bodega. Derivada del kárdex. */
  existenciaDe(articuloId: string, bodegaId: string): number {
    return stockDe(this.movimientos, articuloId, bodegaId);
  }

  /** Existencia total de un artículo, sumando bodegas. Derivada del kárdex. */
  existenciaTotal(articuloId: string): number {
    return stockTotalDe(this.movimientos, articuloId);
  }

  /** Estado de existencias de un artículo (derivado, I3). */
  estadoDe(articuloId: string): EstadoStock {
    const articulo = this.articuloPorId(articuloId);
    if (!articulo) return "agotado";
    return estadoDeStock(
      this.existenciaTotal(articuloId),
      articulo.minimo,
      articulo.puntoReorden,
    );
  }

  /** Nivel de un artículo — `ok` · `reorden` · `critico`. Agrupa `estadoDe`. */
  nivelDe(articuloId: string): NivelStock {
    return nivelDeStock(this.estadoDe(articuloId));
  }

  /**
   * Artículos **críticos**: en su mínimo o por debajo, agotados incluidos.
   *
   * El nombre es corto y el conjunto no: un artículo con 0 unidades también está
   * por debajo de su mínimo, así que entra aquí. Por eso este selector **no** es
   * el mismo conjunto que el estado `bajo_minimo` de `estadoDeStock` — ese
   * excluye los agotados y es lo que devuelve `enRiesgo`.
   *
   * Es el número que resume «cuántas cosas hay que reponer ya», que es la
   * pregunta del panel; quien necesite el desglose por estado tiene `agotados` y
   * `enRiesgo`. Cualquier superficie que pinte este número debe rotularlo como
   * «por debajo del mínimo», no como «bajo mínimo»: la segunda etiqueta ya
   * significa otra cosa en el badge de la tabla de existencias.
   *
   * El filtro pasa por `nivelDeStock`, y **no** por `!== "ok"`, desde que existe
   * el estado `reorden`: con la comparación anterior, un artículo que solo había
   * pasado su punto de reorden entraba en «por debajo del mínimo», y la cifra del
   * panel habría subido sin que nada hubiera empeorado.
   */
  get bajoMinimo(): Articulo[] {
    return this.articulos
      .filter((a) => this.nivelDe(a.id) === "critico")
      .sort((a, b) => this.existenciaTotal(a.id) - this.existenciaTotal(b.id));
  }

  /**
   * Artículos **en reorden**: pasaron su punto de reorden y todavía no su
   * mínimo. Es la lista de trabajo temprana — lo que hay que reponer **antes**
   * de que engrose `bajoMinimo`.
   *
   * Vacía si ningún artículo declara `puntoReorden`: sin umbral no hay banda de
   * aviso, y eso es un estado legítimo, no un error.
   */
  get articulosEnReorden(): Articulo[] {
    return this.articulos
      .filter((a) => this.estadoDe(a.id) === "reorden")
      .sort((a, b) => this.existenciaTotal(a.id) - this.existenciaTotal(b.id));
  }

  /** Artículos sin ninguna existencia. */
  get agotados(): Articulo[] {
    return this.articulos.filter((a) => this.estadoDe(a.id) === "agotado");
  }

  /** Artículos con stock pero en su mínimo o por debajo (excluye los agotados). */
  get enRiesgo(): Articulo[] {
    return this.articulos.filter((a) => this.estadoDe(a.id) === "bajo_minimo");
  }

  /**
   * Margen por encima del mínimo, en porcentaje, para el aviso de reposición.
   *
   * `Infinity` cuando el mínimo es 0: sin punto de reorden no hay nada que
   * avisar, y devolver 0 lo pintaría como «al límite».
   */
  margenSobreMinimo(articuloId: string): number {
    const articulo = this.articuloPorId(articuloId);
    if (!articulo || articulo.minimo <= 0) return Number.POSITIVE_INFINITY;
    return (this.existenciaTotal(articuloId) / articulo.minimo) * 100;
  }

  // ── Lotes y vencimientos ──────────────────────────────────────────────────
  //
  // La disponibilidad de un lote **no se guarda**: se deriva del kárdex con
  // `disponibleDeLote` (I1). Un campo `cantidadDisponible` en el lote sería la
  // segunda fuente de verdad del mismo número, y bastaría con que un movimiento
  // no lo actualizara para que la ficha del lote y el kárdex dieran cifras
  // distintas de la misma mercancía.

  /**
   * Los lotes de un artículo, con su disponibilidad resuelta y **ordenados por
   * vencimiento**.
   *
   * Devuelve **todos** los lotes, no solo los despachables: la ficha del
   * artículo tiene que poder enseñar el lote vencido y el agotado —son parte de
   * la historia de esa mercancía— y quien decide qué se despacha es
   * `lotesDespachablesDe`, no esta lista.
   */
  lotesDe(articuloId: string): LoteDisponible[] {
    return this.lotes
      .filter((l) => l.articuloId === articuloId)
      .map((l) => ({ ...l, disponible: disponibleDeLote(this.movimientos, l) }))
      .sort((a, b) => {
        const porFecha = a.fechaVencimiento.localeCompare(b.fechaVencimiento);
        if (porFecha !== 0) return porFecha;
        return a.codigoLote.localeCompare(b.codigoLote, "es");
      });
  }

  /**
   * La **secuencia de despacho** de un artículo: los lotes que se pueden sacar,
   * en orden FEFO.
   *
   * Se pide «todo lo despachable» —de ahí que la cantidad requerida sea el total
   * disponible— porque esta lista es para MIRAR: la ficha enseña el orden en que
   * saldría la mercancía. Cuando el llamador sabe cuánto necesita, usa
   * `obtenerLotesSugeridosFEFO` con esa cantidad y recibe solo el tramo
   * necesario.
   *
   * Excluye lo que no se puede despachar (vencido, sin existencia, fecha
   * ilegible), así que puede estar VACÍA con el artículo teniendo stock: es el
   * caso de la harina del seed, cuyos 9 kg vencieron.
   */
  lotesDespachablesDe(articuloId: string): LoteDisponible[] {
    const todos = this.lotesDe(articuloId);
    return obtenerLotesSugeridosFEFO(todos, totalDisponibleDe(todos));
  }

  /**
   * Lotes de un artículo que están **en banda de aviso o peor**: vencidos, a
   * menos de una semana, a menos de quince días o a menos de un mes.
   *
   * Es lo que enciende el aviso de la fila. Un lote ya agotado no entra aunque
   * esté vencido: no hay nada que retirar de él, y una alerta sobre mercancía
   * que ya no está es ruido que enseña a ignorar las alertas.
   */
  lotesPorVencerDe(articuloId: string): LoteDisponible[] {
    return this.lotesDe(articuloId).filter(
      (l) => l.disponible > 0 && urgenciaDeVencimiento(l.fechaVencimiento) !== "ok",
    );
  }

  /** Valor total del inventario a costo. */
  get valorTotal(): number {
    return valorInventario(this.movimientos, this.articulos, this.bodegas);
  }

  /** Número de artículos del catálogo. */
  get totalArticulos(): number {
    return this.articulos.length;
  }

  /** Categorías presentes en el catálogo, ordenadas alfabéticamente. */
  get categorias(): string[] {
    return [...new Set(this.articulos.map((a) => a.categoria))].sort((a, b) =>
      a.localeCompare(b, "es"),
    );
  }

  // ── Kárdex ────────────────────────────────────────────────────────────────

  /** Movimientos de un artículo, más reciente primero. */
  movimientosDe(articuloId: string): Movimiento[] {
    return movimientosDe(this.movimientos, articuloId);
  }

  /** Todo el kárdex, más reciente primero. */
  get kardex(): Movimiento[] {
    return this.movimientos
      .slice()
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  /** Los `n` movimientos más recientes. */
  movimientosRecientes(n = 8): Movimiento[] {
    return this.kardex.slice(0, n);
  }

  /** Movimientos que cumplen los filtros dados (los vacíos no filtran). */
  movimientosFiltrados(filtros: {
    articuloId?: string;
    bodegaId?: string;
    tipo?: TipoMovimiento;
  }): Movimiento[] {
    return this.kardex.filter((m) => {
      if (filtros.articuloId && m.articuloId !== filtros.articuloId) return false;
      if (filtros.tipo && m.tipo !== filtros.tipo) return false;
      // Una bodega aparece en el kárdex si es origen o destino: filtrar por
      // origen solamente escondería las entradas, que es medio kárdex.
      if (
        filtros.bodegaId &&
        m.origenId !== filtros.bodegaId &&
        m.destinoId !== filtros.bodegaId
      ) {
        return false;
      }
      return true;
    });
  }

  /** Etiqueta legible del trayecto de un movimiento: «Origen → Destino». */
  trayecto(m: Movimiento): string {
    return `${this.etiquetaBodega(m.origenId)} → ${this.etiquetaBodega(m.destinoId)}`;
  }

  // ── Escritura del kárdex ──────────────────────────────────────────────────

  /**
   * Registra un movimiento, **validándolo primero**.
   *
   * Es el único camino por el que entra un movimiento, y es fail-closed: si la
   * validación falla, no se muta nada y se devuelve el motivo legible. La UI
   * deshabilita el control y explica, pero un control deshabilitado no es una
   * regla: esta guarda es la que sostiene el invariante I2.
   */
  registrarMovimiento(datos: NuevoMovimiento): ResultadoRegistro {
    const articulo = this.articuloPorId(datos.articuloId);
    if (!articulo) {
      return { ok: false, motivo: "El artículo no existe." };
    }
    if (datos.origenId !== null && !this.bodegaPorId(datos.origenId)) {
      return { ok: false, motivo: "La bodega de origen no existe." };
    }
    if (datos.destinoId !== null && !this.bodegaPorId(datos.destinoId)) {
      return { ok: false, motivo: "La bodega de destino no existe." };
    }

    // ── Trazabilidad por lote ─────────────────────────────────────────────
    // Tres comprobaciones, y las tres evitan el mismo defecto: un movimiento
    // que AFIRMA trazabilidad que no tiene. Sin ellas, etiquetar un movimiento
    // con un lote inexistente —o de otro artículo— no daría error: no tocaría
    // ningún saldo y el kárdex quedaría diciendo que esa cantidad salió de un
    // lote que no existe.
    const lote =
      datos.loteId === undefined ? undefined : this.lotes.find((l) => l.id === datos.loteId);
    if (datos.loteId !== undefined && !lote) {
      return { ok: false, motivo: "El lote no existe." };
    }
    if (lote && lote.articuloId !== datos.articuloId) {
      return { ok: false, motivo: "El lote no es de ese artículo." };
    }
    if (lote && lote.almacenId !== datos.origenId && lote.almacenId !== datos.destinoId) {
      // Un movimiento que no toca la bodega del lote no le afecta: el efecto
      // sería 0 y la etiqueta quedaría de adorno.
      return { ok: false, motivo: "El movimiento no toca la bodega del lote." };
    }

    // La existencia contra la que se valida es la de la bodega de ORIGEN.
    // Validar contra el total del artículo dejaría retirar de una bodega vacía
    // lo que sobra en otra.
    const stockOrigen = datos.origenId === null ? 0 : this.existenciaDe(datos.articuloId, datos.origenId);

    const validacion = validarMovimiento(
      {
        articuloId: datos.articuloId,
        tipo: datos.tipo,
        cantidad: datos.cantidad,
        origenId: datos.origenId,
        destinoId: datos.destinoId,
        motivo: datos.motivo,
      },
      stockOrigen,
    );
    if (!validacion.ok) return validacion;

    const movimiento: Movimiento = {
      id: crypto.randomUUID(),
      articuloId: datos.articuloId,
      tipo: datos.tipo,
      cantidad: datos.cantidad,
      origenId: datos.origenId,
      destinoId: datos.destinoId,
      motivo: datos.motivo,
      loteId: datos.loteId,
      fecha: new Date().toISOString(),
      actor: datos.actor ?? "d0",
    };
    this.movimientos.push(movimiento);
    return { ok: true, movimiento };
  }

  // ── Escritura del catálogo ────────────────────────────────────────────────

  /** Da de alta un artículo. El SKU debe ser único (se valida aquí). */
  crearArticulo(datos: Omit<Articulo, "id">): { ok: true; articulo: Articulo } | { ok: false; motivo: string } {
    const sku = datos.sku.trim();
    if (sku === "") return { ok: false, motivo: "El SKU es obligatorio." };
    if (this.articuloPorSku(sku)) {
      return { ok: false, motivo: `Ya existe un artículo con el SKU «${sku}».` };
    }
    const articulo: Articulo = { ...datos, id: `art-${crypto.randomUUID()}`, sku };
    this.articulos.push(articulo);
    return { ok: true, articulo };
  }

  /** Actualiza un artículo. Ignora ids desconocidos. */
  actualizarArticulo(id: string, patch: Partial<Omit<Articulo, "id">>): void {
    const articulo = this.articuloPorId(id);
    if (!articulo) return;
    Object.assign(articulo, patch);
  }

  /**
   * Elimina un artículo. **Rechaza si tiene kárdex.**
   *
   * Borrarlo con movimientos dejaría movimientos huérfanos que seguirían
   * contando en `valorInventario` — un número que ya no se puede explicar
   * mirando el catálogo. Es la misma clase de defecto que el repo persigue:
   * una superficie que afirma algo que el sistema no puede sostener.
   *
   * Rechaza también si está en una auditoría abierta: la línea quedaría sin
   * artículo, `lineasDeAuditoria` no podría pintarla y el conteo no podría
   * conciliarse. Es la misma razón, un nivel antes.
   */
  eliminarArticulo(id: string): ResultadoAccion {
    if (!this.articuloPorId(id)) return { ok: false, motivo: "El artículo no existe." };
    const tieneKardex = this.movimientos.some((m) => m.articuloId === id);
    if (tieneKardex) {
      return {
        ok: false,
        motivo: "No se puede eliminar: el artículo tiene movimientos en el kárdex.",
      };
    }
    const enAuditoria = this.auditorias.some(
      (a) => a.estado === "en_proceso" && a.items.some((i) => i.articuloId === id),
    );
    if (enAuditoria) {
      return {
        ok: false,
        motivo: "No se puede eliminar: el artículo está en una auditoría abierta.",
      };
    }
    this.articulos = this.articulos.filter((a) => a.id !== id);
    return { ok: true };
  }

  /** Da de alta una bodega. Si nace principal, degrada la anterior. */
  crearBodega(datos: { nombre: string; principal?: boolean }): ResultadoAccion {
    const nombre = datos.nombre.trim();
    if (nombre === "") return { ok: false, motivo: "El nombre de la bodega es obligatorio." };
    if (this.bodegas.some((b) => b.nombre.toLowerCase() === nombre.toLowerCase())) {
      return { ok: false, motivo: `Ya existe una bodega llamada «${nombre}».` };
    }
    const id = `bod-${crypto.randomUUID()}`;
    if (datos.principal) {
      // I6: exactamente una principal. Se degradan las demás ANTES de añadir.
      this.bodegas.forEach((b) => {
        b.principal = false;
      });
    }
    this.bodegas.push({ id, nombre, principal: Boolean(datos.principal) });
    return { ok: true };
  }

  /** Marca una bodega como principal y degrada el resto (I6). */
  marcarPrincipal(id: string): ResultadoAccion {
    const bodega = this.bodegaPorId(id);
    if (!bodega) return { ok: false, motivo: "La bodega no existe." };
    this.bodegas.forEach((b) => {
      b.principal = b.id === id;
    });
    return { ok: true };
  }

  /**
   * Elimina una bodega. Rechaza si es la última, si tiene kárdex o si tiene una
   * auditoría abierta.
   *
   * Si se lleva la principal y quedan otras, promueve la primera: el invariante
   * I6 no puede depender de que nadie olvide llamar a `marcarPrincipal()`.
   *
   * La auditoría abierta bloquea igual que el kárdex, y por una razón que el
   * kárdex no cubre: una auditoría recién abierta **no tiene movimientos
   * todavía**, así que la bodega se podría borrar dejando un conteo abierto
   * apuntando a un almacén que ya no existe.
   */
  eliminarBodega(id: string): ResultadoAccion {
    const bodega = this.bodegaPorId(id);
    if (!bodega) return { ok: false, motivo: "La bodega no existe." };
    if (this.bodegas.length <= 1) {
      return { ok: false, motivo: "Debe quedar al menos una bodega." };
    }
    const tieneKardex = this.movimientos.some(
      (m) => m.origenId === id || m.destinoId === id,
    );
    if (tieneKardex) {
      return {
        ok: false,
        motivo: "No se puede eliminar: la bodega tiene movimientos en el kárdex.",
      };
    }
    if (this.auditoriaEnProceso(id)) {
      return {
        ok: false,
        motivo: "No se puede eliminar: la bodega tiene una auditoría abierta.",
      };
    }

    this.bodegas = this.bodegas.filter((b) => b.id !== id);
    if (bodega.principal && this.bodegas.length > 0) {
      this.bodegas[0].principal = true;
    }
    return { ok: true };
  }

  // ── Auditoría y conciliación (conteo físico) ──────────────────────────────
  //
  // Una auditoría es el único sitio del módulo donde el operador contradice al
  // sistema con un hecho. Tres reglas la sostienen, y las tres viven aquí y no
  // en la pantalla:
  //
  //   1. **`conteoTeorico` es una FOTO**, congelada al abrir. Ver el docblock de
  //      `ItemAuditoria`: si se leyera del kárdex en cada render, un movimiento
  //      a mitad del conteo movería el teórico y la diferencia dejaría de
  //      explicar lo que el operador vio.
  //   2. **Una sola auditoría abierta por bodega.** Dos conteos simultáneos
  //      sobre el mismo almacén partirían de la misma foto y el segundo
  //      ajustaría contra un teórico que ya no existe.
  //   3. **Conciliar es atómico o no es.** Si un ajuste se rechazara a mitad
  //      —la mercancía se movió durante el conteo y el teórico ya no alcanza—
  //      se deshacen los movimientos ya escritos y la auditoría sigue abierta,
  //      con el motivo. Media conciliación es peor que ninguna: deja el kárdex
  //      con parte del conteo aplicado y sin forma de saber cuál parte.

  auditoriaPorId(id: string): AuditoriaInventario | undefined {
    return this.auditorias.find((a) => a.id === id);
  }

  /** La auditoría abierta de una bodega, si la hay. Solo puede haber una. */
  auditoriaEnProceso(almacenId: string): AuditoriaInventario | undefined {
    return this.auditorias.find((a) => a.almacenId === almacenId && a.estado === "en_proceso");
  }

  /** Todas las auditorías abiertas, de cualquier bodega. */
  get auditoriasEnProceso(): AuditoriaInventario[] {
    return this.auditorias.filter((a) => a.estado === "en_proceso");
  }

  /** Auditorías de una bodega, más reciente primero. */
  auditoriasDe(almacenId: string): AuditoriaInventario[] {
    return this.auditorias
      .filter((a) => a.almacenId === almacenId)
      .slice()
      .sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
  }

  /**
   * Las líneas de una auditoría ya resueltas contra el catálogo.
   *
   * `existenciaActual` es la existencia de **hoy** en esa bodega, y puede no
   * coincidir con `item.conteoTeorico`: la foto se congeló al abrir y entre
   * abrir y conciliar puede haber entrado o salido mercancía. Se expone porque
   * la pantalla tiene que poder avisar de esa deriva **antes** de que el
   * operador confirme: conciliar contra un teórico viejo es justo el caso que
   * el guardarraíl de `conciliarAuditoria` rechaza, y enterarse al pulsar el
   * botón es enterarse tarde.
   */
  lineasDeAuditoria(auditoriaId: string): LineaAuditoria[] {
    const auditoria = this.auditoriaPorId(auditoriaId);
    if (!auditoria) return [];
    const lineas: LineaAuditoria[] = [];
    for (const item of auditoria.items) {
      const articulo = this.articuloPorId(item.articuloId);
      // Un artículo borrado con líneas abiertas no debería existir: se impide en
      // `eliminarArticulo`. Si aun así pasara, la línea se omite en vez de
      // pintarse sin nombre. **Y la conciliación falla**, no se salta la línea:
      // el guardarraíl y `ajustesDeAuditoria` leen `auditoria.items`, no esta
      // lista, así que el ajuste de ese artículo llegaría a
      // `registrarMovimiento` y lo rechazaría con su motivo —fail-closed, con la
      // auditoría abierta— en vez de cerrar un conteo dejando una línea fuera.
      if (!articulo) continue;
      lineas.push({
        item,
        articulo,
        diferencia: diferenciaDe(item),
        existenciaActual: this.existenciaDe(item.articuloId, auditoria.almacenId),
      });
    }
    return lineas;
  }

  /**
   * Abre una auditoría en una bodega, con el teórico **congelado ahora**.
   *
   * `articuloIds` por defecto es **todo el catálogo**, y no es pereza: contar
   * solo lo que el sistema cree que hay hace imposible encontrar un sobrante de
   * un artículo que el sistema da por agotado. El seed lo demuestra — el salmón
   * está en cero y su línea de auditoría nace con `conteoTeorico: 0`.
   */
  iniciarAuditoria(almacenId: string, articuloIds?: string[]): ResultadoApertura {
    if (!this.bodegaPorId(almacenId)) {
      return { ok: false, motivo: "La bodega no existe." };
    }
    const abierta = this.auditoriaEnProceso(almacenId);
    if (abierta) {
      return {
        ok: false,
        motivo: `Ya hay una auditoría abierta en esta bodega (${abierta.id}). Ciérrala o cancélala antes de abrir otra.`,
      };
    }

    const ids = articuloIds ?? this.articulos.map((a) => a.id);
    const items: ItemAuditoria[] = [];
    for (const articuloId of ids) {
      if (!this.articuloPorId(articuloId)) continue;
      if (items.some((i) => i.articuloId === articuloId)) continue;
      items.push({
        articuloId,
        conteoTeorico: this.existenciaDe(articuloId, almacenId),
        conteoFisico: null,
      });
    }
    if (items.length === 0) {
      return { ok: false, motivo: "No hay artículos que auditar." };
    }

    const auditoria: AuditoriaInventario = {
      id: `aud-${crypto.randomUUID()}`,
      almacenId,
      estado: "en_proceso",
      fechaInicio: new Date().toISOString(),
      items,
    };
    this.auditorias.push(auditoria);
    return { ok: true, auditoria };
  }

  /**
   * Anota lo contado a mano en una línea. `null` borra el conteo.
   *
   * Se acepta `null` porque «me equivoqué al teclear» tiene que poder
   * deshacerse: sin eso, una línea mal contada obligaría a cancelar la
   * auditoría entera. Una cantidad negativa sí se rechaza: no existe un conteo
   * físico de −3 kg.
   */
  registrarConteo(
    auditoriaId: string,
    articuloId: string,
    conteoFisico: number | null,
  ): ResultadoAccion {
    const auditoria = this.auditoriaPorId(auditoriaId);
    if (!auditoria) return { ok: false, motivo: "La auditoría no existe." };
    if (auditoria.estado !== "en_proceso") {
      return { ok: false, motivo: "La auditoría ya no está en proceso." };
    }
    const item = auditoria.items.find((i) => i.articuloId === articuloId);
    if (!item) return { ok: false, motivo: "El artículo no está en esta auditoría." };
    if (conteoFisico !== null && (!Number.isFinite(conteoFisico) || conteoFisico < 0)) {
      return { ok: false, motivo: "La cantidad contada no puede ser negativa." };
    }
    item.conteoFisico = conteoFisico;
    return { ok: true };
  }

  /**
   * Cierra la auditoría aplicando un ajuste por cada diferencia.
   *
   * Los movimientos salen de `ajustesDeAuditoria` (función pura) y entran por
   * `registrarMovimiento`, que es el único camino al kárdex: así cada ajuste
   * pasa por `validarMovimiento` con su motivo y el invariante I2 se sostiene
   * también aquí. No se escribe un segundo camino de escritura «porque es una
   * auditoría».
   */
  conciliarAuditoria(auditoriaId: string): ResultadoConciliacion {
    const auditoria = this.auditoriaPorId(auditoriaId);
    if (!auditoria) return { ok: false, motivo: "La auditoría no existe." };

    // El guardarraíl se pregunta a `motivoNoConciliable` y no se reescribe aquí:
    // es la misma función que la pantalla usa para deshabilitar el botón, así
    // que el texto que explica el botón apagado es literalmente el que saldría
    // al pulsarlo. Pero manda este: una pantalla no es una regla.
    const noConciliable = motivoNoConciliable(auditoria);
    if (noConciliable !== null) return { ok: false, motivo: noConciliable };

    const ajustes = ajustesDeAuditoria(auditoria);
    const desde = this.movimientos.length;
    for (const ajuste of ajustes) {
      const resultado = this.registrarMovimiento(ajuste);
      if (!resultado.ok) {
        // Atómico: se deshace lo ya escrito y la auditoría sigue abierta. El
        // caso real es que la mercancía se movió durante el conteo y el teórico
        // congelado ya no alcanza para el ajuste a la baja.
        this.movimientos.splice(desde);
        return {
          ok: false,
          motivo: `No se pudo conciliar: ${resultado.motivo} La auditoría sigue abierta.`,
        };
      }
    }

    auditoria.estado = "completada";
    return { ok: true, movimientos: this.movimientos.slice(desde) };
  }

  /**
   * Cancela una auditoría abierta. **No escribe nada en el kárdex.**
   *
   * Cancelar es abandonar el conteo, no aplicarlo: si cancelar ajustara, el
   * botón «cancelar» sería una segunda forma de conciliar con otro nombre.
   */
  cancelarAuditoria(auditoriaId: string): ResultadoAccion {
    const auditoria = this.auditoriaPorId(auditoriaId);
    if (!auditoria) return { ok: false, motivo: "La auditoría no existe." };
    if (auditoria.estado !== "en_proceso") {
      return { ok: false, motivo: "La auditoría ya no está en proceso." };
    }
    auditoria.estado = "cancelada";
    return { ok: true };
  }

  // ── Configuración ─────────────────────────────────────────────────────────
  updateConfig(data: Partial<InventarioConfig>): void {
    this.config = { ...this.config, ...data };
    persistConfig(this.config);
  }

  /** Restaura la configuración de fábrica (usado por los tests). */
  reiniciarConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
    persistConfig(this.config);
  }
}

export const inventarioStore = new InventarioStore();
