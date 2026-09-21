import { makeAutoObservable } from "mobx";

import {
  estadoDeStock,
  movimientosDe,
  stockDe,
  stockTotalDe,
  validarMovimiento,
  valorInventario,
  type Articulo,
  type Bodega,
  type EstadoStock,
  type Movimiento,
  type TipoMovimiento,
  type UnidadMedida,
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
  ok: "light",
};

/** Etiquetas de severidad de alerta. */
export const SEVERIDAD_ALERTA_LABEL: Record<SeveridadAlerta, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
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

/**
 * Constructor de un movimiento del seed. `id` explícito y correlativo: el seed
 * se lee como una tabla y sus ids son estables entre ejecuciones.
 */
function movimiento(
  id: string,
  diasAtras: number,
  articuloId: string,
  tipo: TipoMovimiento,
  cantidad: number,
  origenId: string | null,
  destinoId: string | null,
  extra: { motivo?: string; actor?: string } = {},
): Movimiento {
  return {
    id,
    articuloId,
    tipo,
    cantidad,
    origenId,
    destinoId,
    motivo: extra.motivo,
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
      costoUnitario: 28000,
    },
    {
      id: "art-fresas",
      sku: "SKU-5002",
      nombre: "Fresas",
      categoria: "Postres",
      unidad: "kg",
      minimo: 2,
      costoUnitario: 14000,
    },
  ];

  const movimientos: Movimiento[] = [
    // ── Pechuga de pollo (min 5 kg) — termina «ok» con 12 ─────────────────
    movimiento("mv-001", 6, "art-pollo", "entrada", 20, null, BOD_COCINA, { actor: "d1" }),
    movimiento("mv-002", 2, "art-pollo", "salida", 8, BOD_COCINA, null, { actor: "d2" }),

    // ── Carne molida (min 3 kg) — termina «ok» con 8 ──────────────────────
    movimiento("mv-003", 6, "art-carne-molida", "entrada", 12, null, BOD_COCINA, { actor: "d1" }),
    movimiento("mv-004", 1, "art-carne-molida", "salida", 4, BOD_COCINA, null, { actor: "d2" }),

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
    movimiento("mv-011", 1, "art-crema", "salida", 8, BOD_COCINA, null, { actor: "d2" }),

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
    }),
  ];

  return { articulos, bodegas, movimientos };
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

  /** Configuración del módulo (la única parte que persiste). */
  config: InventarioConfig = loadConfig();

  constructor(datos: DatosInventario = seed()) {
    this.articulos = datos.articulos;
    this.bodegas = datos.bodegas;
    this.movimientos = datos.movimientos;
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
    return estadoDeStock(this.existenciaTotal(articuloId), articulo.minimo);
  }

  /** Artículos por debajo de su punto de reorden, de menor a mayor existencia. */
  /**
   * Artículos **por debajo de su punto de reorden**: la unión de «bajo mínimo»
   * y «agotado».
   *
   * El nombre es corto y el conjunto no: un artículo con 0 unidades también está
   * por debajo de su mínimo, así que entra aquí. Por eso este selector **no** es
   * el mismo conjunto que el estado `bajo_minimo` de `estadoDeStock` — ese
   * excluye los agotados y es lo que devuelve `enRiesgo`.
   *
   * Es el número que resume «cuántas cosas hay que reponer», que es la pregunta
   * del panel; quien necesite el desglose por estado tiene `agotados` y
   * `enRiesgo`. Cualquier superficie que pinte este número debe rotularlo como
   * «por debajo del mínimo», no como «bajo mínimo»: la segunda etiqueta ya
   * significa otra cosa en el badge de la tabla de existencias.
   */
  get bajoMinimo(): Articulo[] {
    return this.articulos
      .filter((a) => this.estadoDe(a.id) !== "ok")
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
   * Elimina una bodega. Rechaza si es la última o si tiene kárdex.
   *
   * Si se lleva la principal y quedan otras, promueve la primera: el invariante
   * I6 no puede depender de que nadie olvide llamar a `marcarPrincipal()`.
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

    this.bodegas = this.bodegas.filter((b) => b.id !== id);
    if (bodega.principal && this.bodegas.length > 0) {
      this.bodegas[0].principal = true;
    }
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
