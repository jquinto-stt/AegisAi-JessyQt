/**
 * Domain: Inventario
 *
 * Contratos puros del módulo de inventario: tipos y funciones. Sin React, sin
 * MobX, sin `localStorage`, sin autorización — el mismo contrato que
 * `domain/pedidos/`.
 *
 * ── Qué NO hay aquí, y por qué ────────────────────────────────────────────
 * `domain/pedidos/` tiene dos archivos más (`pedidos.adapters.ts` y
 * `pedidos.profiles.ts`) que **no se copian**:
 *
 *   · un adaptador existe por una migración legacy→core ("Strangler Fig").
 *     Inventario no tiene legado: un adaptador aquí sería ceremonia pura.
 *   · los perfiles comerciales (`food`/`fashion`/`services`) son un concepto
 *     COMPARTIDO con Pedidos, y duplicarlo violaría la independencia (D1). Si
 *     algún día hacen falta, serán presets **de almacén**, propios.
 *
 * ── Independencia (D1/D2) ─────────────────────────────────────────────────
 * Este archivo no importa nada de `pedidos`, y `domain/pedidos/**` no importa
 * nada de aquí. Los dos vocabularios se parecen (los dos hablan de productos)
 * pero son **agregados distintos** que solo comparten el nombre. Ver el
 * docblock de `Articulo` y el de `CatalogoItem` en `stores/pedidos.store.ts`.
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Unidad de medida de un artículo. Es la unidad de su kárdex, no la de venta. */
export type UnidadMedida =
  | "unidad"
  | "kg"
  | "g"
  | "l"
  | "ml"
  | "caja"
  | "porcion";

/**
 * Artículo de inventario — lo que el almacén guarda.
 *
 * **Responde a «¿qué tengo, dónde y cuánto me costó?».** Su respuesta cambia
 * todos los días: el stock sube y baja con cada movimiento.
 *
 * **NO responde a «¿qué vendo y a cuánto?».** Eso es `CatalogoItem`, en Pedidos:
 * una lista de precios de venta congelada en el pedido. Los dos tipos no
 * comparten clave ni campo; son dos responsabilidades distintas y **está
 * declarado como deuda** (disparador: cuando el negocio pida «que un pedido
 * descuente stock», momento en que la independencia dejará de ser posible y
 * habrá que decidir el dueño del catálogo).
 *
 * ── Lo que este tipo NO declara ───────────────────────────────────────────
 * **Ningún campo de cantidad.** La existencia no se guarda: se DERIVA del
 * kárdex con `stockDe()` / `stockTotalDe()` (invariante I1). Un campo
 * `cantidad` aquí sería una segunda fuente de verdad para el mismo número, y
 * cualquier bug la desincronizaría en silencio. Este repo ya pagó ese precio
 * dos veces (`Conversacion.pedidoActivoId`, `ESTADO_PREP_META`) y las dos
 * quedaron escritas.
 *
 * Tampoco declara el estado (`agotado`/`bajo_minimo`): se deriva con
 * `estadoDeStock()` (invariante I3).
 */
export interface Articulo {
  id: string;
  /** Código único del artículo dentro del módulo. */
  sku: string;
  nombre: string;
  categoria: string;
  unidad: UnidadMedida;
  /** Punto de reorden. Por debajo, el artículo está «bajo mínimo». */
  minimo: number;
  /**
   * Costo unitario de referencia, para valorar el inventario a costo.
   *
   * **NO es precio de venta.** El precio de venta vive en Pedidos y no se lee
   * desde aquí (D1/D2).
   */
  costoUnitario: number;
  /**
   * Variantes (talla/color). Opcional: un artículo sin variantes no las declara.
   *
   * ⚠️ Simplificación declarada: una variante real tendría SKU propio y stock
   * propio. Aquí es una etiqueta dentro del mismo artículo. Se resuelve cuando
   * haya un caso de uso, no antes.
   */
  variantes?: string[];
}

/** Bodega (o almacén) — un sitio físico donde puede haber mercancía. */
export interface Bodega {
  id: string;
  nombre: string;
  /**
   * Bodega por defecto para movimientos nuevos.
   * **Exactamente una** bodega del catálogo está en `true` (invariante I6).
   */
  principal: boolean;
}

/**
 * El motivo del movimiento.
 *
 * **La DIRECCIÓN la dan `origenId`/`destinoId`, no el tipo.** Un movimiento es
 * siempre una transferencia de cantidad entre dos sitios, uno de los cuales
 * puede ser el exterior (`null`). Los cuatro tipos son casos del mismo
 * primitivo:
 *
 * | `tipo`          | origen   | destino  | Significado                             |
 * |-----------------|----------|----------|-----------------------------------------|
 * | `entrada`       | `null`   | bodega   | Llega mercancía de fuera (compra, devolución) |
 * | `salida`        | bodega   | `null`   | Sale del sistema (consumo, merma, venta manual) |
 * | `ajuste`        | `null`   | bodega   | Aparece mercancía que el sistema no tenía (conteo al alza) |
 * | `ajuste`        | bodega   | `null`   | Desaparece mercancía que el sistema sí tenía (conteo a la baja, rotura) |
 * | `transferencia` | bodega A | bodega B | Cambia de sitio sin salir del sistema   |
 *
 * Por eso `tipo` es **motivo** y no dirección: es lo que de verdad distingue
 * una entrada de un ajuste cuando los dos suman.
 */
export type TipoMovimiento = "entrada" | "salida" | "ajuste" | "transferencia";

/**
 * Un movimiento del kárdex.
 *
 * Una transferencia es **un** movimiento, no dos. Eso es lo que hace imposible
 * que quede a medias: no hay una mitad que se pueda perder.
 */
export interface Movimiento {
  id: string;
  articuloId: string;
  variante?: string;
  tipo: TipoMovimiento;
  /** Siempre positivo. El signo lo determina el par origen/destino. */
  cantidad: number;
  /** Bodega de origen. `null` = el exterior (una compra, una merma). */
  origenId: string | null;
  /** Bodega de destino. `null` = el exterior (un consumo, una venta manual). */
  destinoId: string | null;
  /** Obligatorio en `ajuste`. Sin motivo, un ajuste es una escritura sin explicación. */
  motivo?: string;
  /** Fecha ISO del movimiento. */
  fecha: string;
  /** Operador que lo registró (`operadorId`). */
  actor: string;
}

/** Estado de existencias derivado. Nunca se persiste (invariante I3). */
export type EstadoStock = "agotado" | "bajo_minimo" | "ok";

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES PURAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Efecto de un movimiento sobre UNA bodega. Positivo = entra, negativo = sale.
 *
 * Es la **única fórmula** del módulo: los cinco casos de la tabla de
 * `TipoMovimiento` salen de aquí, porque `origenId`/`destinoId` ya llevan la
 * dirección. Una transferencia resta en origen y suma en destino sin ningún
 * caso especial.
 */
export function efectoEnBodega(m: Movimiento, bodegaId: string): number {
  let delta = 0;
  if (m.destinoId === bodegaId) delta += m.cantidad;
  if (m.origenId === bodegaId) delta -= m.cantidad;
  return delta;
}

/**
 * Existencia de un artículo en una bodega, **derivada** de la suma de los
 * efectos de sus movimientos. No hay ningún campo que guardar ni que
 * desincronizar (invariante I1).
 *
 * @param variante Si se indica, solo cuenta los movimientos de esa variante.
 *                 Si se omite, cuenta **todos** los del artículo (es el total
 *                 del artículo en esa bodega, sumando variantes).
 *
 * Coste O(n) por lectura sobre el número de movimientos. Es despreciable en un
 * mock (decenas de artículos, cientos de movimientos) y MobX memoiza el
 * `computed` mientras nada cambie.
 */
export function stockDe(
  movs: readonly Movimiento[],
  articuloId: string,
  bodegaId: string,
  variante?: string,
): number {
  let total = 0;
  for (const m of movs) {
    if (m.articuloId !== articuloId) continue;
    if (variante !== undefined && m.variante !== variante) continue;
    total += efectoEnBodega(m, bodegaId);
  }
  return total;
}

/**
 * Existencia total de un artículo sumando todas las bodegas.
 *
 * @param variante Si se indica, solo cuenta esa variante. Si se omite, cuenta
 *                 todas.
 */
export function stockTotalDe(
  movs: readonly Movimiento[],
  articuloId: string,
  variante?: string,
): number {
  let total = 0;
  for (const m of movs) {
    if (m.articuloId !== articuloId) continue;
    if (variante !== undefined && m.variante !== variante) continue;
    total += (m.destinoId !== null ? m.cantidad : 0) - (m.origenId !== null ? m.cantidad : 0);
  }
  return total;
}

/**
 * Estado de existencias, **derivado** de la cantidad disponible y el punto de
 * reorden (invariante I3).
 *
 * `bajo_minimo` es estrictamente por debajo del mínimo: estar justo en el
 * mínimo es «ok» — el mínimo es el nivel al que hay que reponer, no un valor
 * que ya esté mal.
 */
export function estadoDeStock(disponible: number, minimo: number): EstadoStock {
  if (disponible <= 0) return "agotado";
  if (disponible < minimo) return "bajo_minimo";
  return "ok";
}

/**
 * Valor del inventario **a costo**: existencias totales × costo unitario,
 * sumando artículos y bodegas.
 *
 * Valora el total del artículo (todas sus variantes) para no contar dos veces
 * la misma mercancía: valorar por variante y además por «todas las variantes»
 * duplicaría el número.
 */
export function valorInventario(
  movs: readonly Movimiento[],
  articulos: readonly Articulo[],
  bodegas: readonly Bodega[],
): number {
  let total = 0;
  for (const a of articulos) {
    let existenciaTotal = 0;
    for (const b of bodegas) existenciaTotal += stockDe(movs, a.id, b.id);
    total += existenciaTotal * a.costoUnitario;
  }
  return total;
}

/**
 * Los movimientos de un artículo, **más reciente primero** — el orden en que se
 * lee un kárdex.
 *
 * @param variante Si se indica, solo esa variante. Si se omite, todas.
 */
export function movimientosDe(
  movs: readonly Movimiento[],
  articuloId: string,
  variante?: string,
): Movimiento[] {
  return movs
    .filter((m) => m.articuloId === articuloId)
    .filter((m) => variante === undefined || m.variante === variante)
    .slice()
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Resultado de validar un movimiento: o pasa, o pasa con el motivo escrito. */
export type ResultadoValidacion = { ok: true } | { ok: false; motivo: string };

/**
 * Valida un movimiento contra el stock vigente de su bodega de origen.
 *
 * **Fail-closed y con motivo legible**: la UI no pinta un botón gris sin
 * explicación, pinta el motivo. `{ ok: false, motivo }` es la única forma de
 * decir «no» — nunca un `false` pelado.
 *
 * Reglas (invariantes I2 e I5):
 *   · la cantidad debe ser mayor que cero;
 *   · `ajuste` exige `motivo` (sin él, un ajuste es una escritura sin
 *     explicación: la única acción del módulo que puede destruir información);
 *   · `entrada` sale del exterior y llega a una bodega; `salida` al revés;
 *   · `ajuste` tiene **un solo extremo**;
 *   · `transferencia` exige las dos bodegas y que sean distintas;
 *   · ningún movimiento puede dejar stock negativo en su bodega de origen.
 *
 * @param m            Movimiento sin `id`, `fecha` ni `actor` (los pone el store).
 * @param stockOrigen  Existencia ACTUAL de la bodega de origen. Se ignora si el
 *                     movimiento no retira de ninguna bodega (entrada, ajuste al alza).
 */
export function validarMovimiento(
  m: Omit<Movimiento, "id" | "fecha" | "actor">,
  stockOrigen: number,
): ResultadoValidacion {
  if (!Number.isFinite(m.cantidad) || m.cantidad <= 0) {
    return { ok: false, motivo: "La cantidad debe ser mayor que cero." };
  }

  const hayOrigen = m.origenId !== null;
  const hayDestino = m.destinoId !== null;

  if (hayOrigen && hayDestino && m.origenId === m.destinoId) {
    return {
      ok: false,
      motivo: "El origen y el destino deben ser bodegas distintas.",
    };
  }

  switch (m.tipo) {
    case "entrada":
      if (hayOrigen || !hayDestino) {
        return {
          ok: false,
          motivo: "Una entrada viene del exterior (sin origen) y llega a una bodega.",
        };
      }
      break;

    case "salida":
      if (!hayOrigen || hayDestino) {
        return {
          ok: false,
          motivo: "Una salida parte de una bodega y termina en el exterior (sin destino).",
        };
      }
      break;

    case "ajuste":
      if (hayOrigen === hayDestino) {
        return {
          ok: false,
          motivo: "Un ajuste tiene un solo extremo: o suma a una bodega o resta de una.",
        };
      }
      if (!m.motivo || m.motivo.trim() === "") {
        return { ok: false, motivo: "Un ajuste exige un motivo." };
      }
      break;

    case "transferencia":
      if (!hayOrigen || !hayDestino) {
        return {
          ok: false,
          motivo: "Una transferencia exige bodega de origen y de destino.",
        };
      }
      break;
  }

  // El único caso en que un movimiento puede dejar stock negativo es el que
  // RETIRA de una bodega: salida, transferencia y ajuste a la baja. Se compara
  // contra la existencia real de esa bodega, no contra el total del artículo.
  if (hayOrigen && stockOrigen < m.cantidad) {
    return {
      ok: false,
      motivo: `Stock insuficiente en la bodega de origen: hay ${stockOrigen} y se intentan retirar ${m.cantidad}.`,
    };
  }

  return { ok: true };
}
