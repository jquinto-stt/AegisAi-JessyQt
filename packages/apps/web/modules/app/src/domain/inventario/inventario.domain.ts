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
 *
 * ── Variantes: fuera de v1, deuda declarada ───────────────────────────────
 * **Deuda declarada: variantes (talla/color) se omiten en v1.** Una variante
 * real necesita SKU propio y stock propio — no es un `string[]`. Declarar
 * `variantes: ["M", "L"]` sin darle a cada una su propia identidad y su propio
 * kárdex produciría un dato **incorrecto**: dos tallas distintas compartirían
 * una única cifra de existencia, y esa cifra no describiría ninguna de las dos.
 * Disparador: cuando el negocio necesite distinguir stock por variante.
 */
export interface Articulo {
  id: string;
  /** Código único del artículo dentro del módulo. */
  sku: string;
  nombre: string;
  categoria: string;
  unidad: UnidadMedida;
  /**
   * **Stock mínimo** — el suelo. Por debajo, el artículo está en crítico.
   *
   * Estar justo en el mínimo **no** es estar mal: el mínimo es el nivel al que
   * hay que reponer. Hasta el 21/09 este campo se llamaba «punto de reorden» en
   * su docblock y en el formulario, y era un nombre prestado: el punto de
   * reorden es OTRO nivel, por encima de este, y ahora tiene campo propio.
   */
  minimo: number;
  /**
   * **Punto de reorden** — el aviso temprano. Por debajo hay que reponer, aunque
   * todavía no se haya tocado el mínimo.
   *
   * Opcional: sin él el artículo solo avisa al llegar al mínimo, que es el
   * comportamiento anterior. Cuando existe debe ser **> `minimo`**; un punto de
   * reorden por debajo del mínimo no describe ninguna banda y se ignora en vez
   * de inventar una.
   */
  puntoReorden?: number;
  /**
   * **Stock máximo** u objetivo de reposición — «hasta dónde reponer».
   *
   * No cambia el estado de stock: es una referencia de reposición, no un umbral
   * de alarma, así que un artículo por encima de su máximo sigue estando «ok».
   */
  stockMaximo?: number;
  /**
   * Costo unitario de referencia, para valorar el inventario a costo.
   *
   * **NO es precio de venta.** El precio de venta vive en Pedidos y no se lee
   * desde aquí (D1/D2).
   */
  costoUnitario: number;
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
 *
 * ── Vocabulario: «traslado» ES esta `transferencia` ───────────────────────
 * Quien llegue buscando un tipo `'TRASLADO'` —o los campos `almacenOrigenId`,
 * `almacenDestinoId` y `usuarioId`— está buscando **esto**, con otros nombres.
 * No se añade un quinto miembro: dos nombres para el mismo hecho dejarían dos
 * entradas en `TIPOS_MOVIMIENTO`, dos filtros y dos badges para una sola
 * operación, y el mismo traslado podría quedar escrito de dos formas en el
 * kárdex sin que nada lo notara. La equivalencia, explícita:
 *
 * | nombre buscado     | nombre aquí     |
 * |--------------------|-----------------|
 * | tipo `'TRASLADO'`  | `transferencia` |
 * | `almacenOrigenId`  | `origenId`      |
 * | `almacenDestinoId` | `destinoId`     |
 * | `usuarioId`        | `actor`         |
 *
 * `cantidad`, `motivo` y `fecha` se llaman igual en los dos vocabularios.
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
  tipo: TipoMovimiento;
  /** Siempre positivo. El signo lo determina el par origen/destino. */
  cantidad: number;
  /** Bodega de origen. `null` = el exterior (una compra, una merma). */
  origenId: string | null;
  /** Bodega de destino. `null` = el exterior (un consumo, una venta manual). */
  destinoId: string | null;
  /**
   * Por qué se hizo el movimiento.
   *
   * **Obligatorio en `ajuste`** —sin motivo, un ajuste es una escritura sin
   * explicación— y **admitido en `transferencia`**, donde es lo único que
   * distingue «se movió al punto de venta» de «se movió porque sobraba sitio».
   * No se exige en la transferencia porque ahí sí hay un hecho externo que
   * respalda el movimiento: la mercancía se movió de verdad. Exigirlo sería
   * añadir fricción sin ganar ningún invariante.
   */
  motivo?: string;
  /**
   * Lote del que sale o al que entra esta cantidad. `undefined` = movimiento sin
   * trazabilidad por lote, que es el caso de todo artículo que no se rastrea así.
   *
   * **Es lo que hace que la existencia de un lote se pueda DERIVAR** en vez de
   * guardarse: sin este campo, `LoteArticulo.cantidadDisponible` tendría que ser
   * un número persistido, y sería la segunda fuente de verdad que la invariante
   * I1 prohíbe.
   */
  loteId?: string;
  /** Fecha ISO del movimiento. */
  fecha: string;
  /** Operador que lo registró (`operadorId`). */
  actor: string;
}

/**
 * Lote de un artículo — un grupo de mercancía que comparte vencimiento.
 *
 * Responde a «¿de qué me queda y hasta cuándo?», que es la pregunta que decide
 * qué se despacha primero.
 *
 * ── Lo que este tipo NO declara, y por qué ────────────────────────────────
 *
 * **Ningún campo `cantidadDisponible`.** El diseño de partida lo pedía, y sería
 * un error: un número guardado que dice cuánto queda se desincroniza del kárdex
 * en cuanto un movimiento no lo actualice, y entonces hay dos respuestas
 * distintas a la misma pregunta. Este repo ya pagó ese precio dos veces
 * (`Conversacion.pedidoActivoId`, `ESTADO_PREP_META`). La cantidad disponible se
 * **deriva** con `disponibleDeLote()` a partir de `cantidadInicial` y de los
 * movimientos etiquetados con el lote (invariante I1).
 *
 * `cantidadInicial` sí se declara porque es un HECHO del lote —cuánto entró en
 * él— y no cambia nunca; es de la misma familia que `Articulo.costoUnitario`.
 */
export interface LoteArticulo {
  id: string;
  articuloId: string;
  /** Código visible del lote, el que va impreso en la caja. */
  codigoLote: string;
  /** Fecha ISO de vencimiento. El día del vencimiento el lote todavía sirve. */
  fechaVencimiento: string;
  /** Cuánto entró en el lote. Hecho declarado, inmutable. */
  cantidadInicial: number;
  /** Bodega en la que está el lote. Un lote no se reparte entre bodegas. */
  almacenId: string;
}

/**
 * Estado de una auditoría de inventario (conteo físico).
 *
 * En minúscula, como todas las uniones del módulo (`TipoMovimiento`,
 * `EstadoStock`, `UrgenciaVencimiento`). El diseño de partida las pedía en
 * mayúscula —`'EN_PROCESO'`— y no hay ninguna unión así en el repo: la
 * convención no es cosmética, es lo que hace que un `EstadoAuditoria` y un
 * `TipoMovimiento` se lean igual en los mismos mapas exhaustivos.
 */
export type EstadoAuditoria = "en_proceso" | "completada" | "cancelada";

/**
 * Una línea de la auditoría: lo que el sistema decía de un artículo y lo que se
 * contó a mano.
 *
 * ── `conteoTeorico` es una FOTO, no una consulta ──────────────────────────
 * Se congela al abrir la auditoría. Podría leerse del kárdex en cada render y
 * sería un error: un movimiento registrado a mitad del conteo cambiaría el
 * teórico y la diferencia dejaría de explicar lo que el operador vio cuando
 * contó. La discrepancia tiene que ser contra el número que el sistema creía
 * **cuando empezó el conteo**.
 *
 * ── Lo que este tipo NO declara: `diferencia` ─────────────────────────────
 * El diseño de partida pedía un campo `diferencia`. Es `conteoFisico −
 * conteoTeorico`: un tercer número guardado para una resta de dos que ya están
 * aquí, y por tanto una tercera cosa que se puede desincronizar. Se deriva con
 * `diferenciaDe()`.
 */
export interface ItemAuditoria {
  articuloId: string;
  /** Existencia que el sistema daba al ABRIR la auditoría. Foto congelada. */
  conteoTeorico: number;
  /** Lo contado a mano. `null` = todavía sin contar, que no es contar cero. */
  conteoFisico: number | null;
}

/**
 * Una auditoría de inventario de una bodega.
 *
 * Es el único sitio del módulo donde el operador puede contradecir al sistema
 * con un hecho: por eso la conciliación exige motivo en cada ajuste (I5) y por
 * eso el kárdex guarda un movimiento por diferencia, con el id de la auditoría
 * escrito en él. Un ajuste sin explicación es una escritura que nadie puede
 * auditar después.
 */
export interface AuditoriaInventario {
  id: string;
  almacenId: string;
  estado: EstadoAuditoria;
  /** Fecha ISO de apertura. */
  fechaInicio: string;
  items: ItemAuditoria[];
}

/** Estado de existencias derivado. Nunca se persiste (invariante I3). */
export type EstadoStock = "agotado" | "bajo_minimo" | "reorden" | "ok";

/**
 * Los **tres niveles** con los que decide el operador: agrupa los cuatro estados
 * finos de `EstadoStock`.
 *
 * El dominio distingue cuatro estados porque la reposición necesita saber si ya
 * se tocó el suelo (`bajo_minimo`) o si solo se pasó el aviso (`reorden`), y si
 * no queda nada (`agotado`). El operador, en cambio, decide con tres: reponer ya
 * (`critico`), reponer pronto (`reorden`) o no hacer nada (`ok`).
 *
 * Vive aquí, y no en cada superficie, para que **la página, el filtro y los
 * selectores agrupen igual**. Dos definiciones de «crítico» que se separaran
 * darían dos cifras distintas del mismo almacén.
 */
export type NivelStock = "ok" | "reorden" | "critico";

/** Agrupa un estado fino en el nivel que ve el operador. */
export function nivelDeStock(estado: EstadoStock): NivelStock {
  if (estado === "ok") return "ok";
  if (estado === "reorden") return "reorden";
  // `bajo_minimo` y `agotado` son los dos grados de lo mismo: ya hay que reponer.
  return "critico";
}

// ═══════════════════════════════════════════════════════════════════════════
// TEXTO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pliega texto para comparar: minúsculas y sin acentos.
 *
 * Vive en el dominio, y no en cada superficie, porque **la tabla y el asistente
 * tienen que plegar igual**. Si la búsqueda de `/inventario` y la de la
 * herramienta del chat difirieran, «salmon» encontraría el artículo en un sitio
 * y no en el otro, y quien lo buscara concluiría que el dato no existe.
 *
 * Quien escribe una búsqueda no pone tildes: «salmon», «cafe», «analitica».
 */
export function normalizarTexto(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

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
 * Coste O(n) por lectura sobre el número de movimientos. Es despreciable en un
 * mock (decenas de artículos, cientos de movimientos) y MobX memoiza el
 * `computed` mientras nada cambie.
 */
export function stockDe(
  movs: readonly Movimiento[],
  articuloId: string,
  bodegaId: string,
): number {
  let total = 0;
  for (const m of movs) {
    if (m.articuloId !== articuloId) continue;
    total += efectoEnBodega(m, bodegaId);
  }
  return total;
}

/**
 * Existencia total de un artículo sumando todas las bodegas.
 */
export function stockTotalDe(movs: readonly Movimiento[], articuloId: string): number {
  let total = 0;
  for (const m of movs) {
    if (m.articuloId !== articuloId) continue;
    total += (m.destinoId !== null ? m.cantidad : 0) - (m.origenId !== null ? m.cantidad : 0);
  }
  return total;
}

/**
 * Estado de existencias, **derivado** de la cantidad disponible y los umbrales
 * (invariante I3). Cuatro estados, de más a menos grave:
 *
 * | Estado        | Cuándo                                        | Nivel      |
 * |---------------|-----------------------------------------------|------------|
 * | `agotado`     | `disponible <= 0`                             | `critico`  |
 * | `bajo_minimo` | por debajo del mínimo, con existencia         | `critico`  |
 * | `reorden`     | por debajo del punto de reorden, sobre el mínimo | `reorden` |
 * | `ok`          | en o por encima del punto de reorden          | `ok`       |
 *
 * `bajo_minimo` es estrictamente por debajo del mínimo: estar justo en el
 * mínimo ya es «reorden» — el mínimo es el nivel al que hay que reponer, no un
 * valor que ya esté mal.
 *
 * `puntoReorden` es **opcional y solo puede estrechar la banda de aviso**. Si no
 * llega, o si llega por debajo del mínimo, no hay banda de reorden y el
 * resultado es el de siempre: un punto de reorden por debajo del mínimo no
 * describe nada, así que se ignora en vez de inventar una banda invertida.
 */
export function estadoDeStock(
  disponible: number,
  minimo: number,
  puntoReorden?: number,
): EstadoStock {
  if (disponible <= 0) return "agotado";
  if (disponible < minimo) return "bajo_minimo";
  if (puntoReorden !== undefined && puntoReorden > minimo && disponible < puntoReorden) {
    return "reorden";
  }
  return "ok";
}

/**
 * Valor del inventario **a costo**: existencias totales × costo unitario,
 * sumando artículos y bodegas.
 *
 * Valoración a costo de referencia del artículo. **No es FIFO ni promedio
 * ponderado**: el módulo no guarda el costo de cada entrada, así que no puede
 * decir qué unidad concreta se consumió. Es el costo vigente del artículo
 * aplicado a la existencia total, que es la cifra útil para una demo y una
 * aproximación declarada para contabilidad.
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
 */
export function movimientosDe(movs: readonly Movimiento[], articuloId: string): Movimiento[] {
  return movs
    .filter((m) => m.articuloId === articuloId)
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

// ═══════════════════════════════════════════════════════════════════════════
// LOTES Y VENCIMIENTOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Existencia **disponible** de un lote, derivada de su kárdex (invariante I1).
 *
 * Es `cantidadInicial` más el efecto de todo movimiento etiquetado con ese lote
 * sobre **su** bodega. Se reutiliza `efectoEnBodega` en vez de escribir una
 * segunda aritmética: una fórmula propia para los lotes sería otra definición de
 * «cuánto queda», y dos definiciones del mismo número acaban discrepando.
 *
 * Un lote consumido del todo da 0, y uno al que le devolvieron mercancía puede
 * subir: el número es lo que el kárdex dice, no una cuenta regresiva.
 */
export function disponibleDeLote(movs: readonly Movimiento[], lote: LoteArticulo): number {
  let total = lote.cantidadInicial;
  for (const m of movs) {
    if (m.loteId !== lote.id) continue;
    total += efectoEnBodega(m, lote.almacenId);
  }
  return total;
}

/**
 * Días que faltan para el vencimiento. **Negativo** = ya venció, `0` = vence hoy.
 *
 * Devuelve `null` si la fecha no se puede leer. No devuelve `0` ni `NaN`: un
 * vencimiento ilegible no es «vence hoy» ni «no vence», y colapsarlo a un número
 * haría que un lote con la fecha corrupta pasara por bueno o por vencido según
 * la dirección en que se redondeara.
 *
 * Se comparan **días de calendario**, no instantes: `hoy` entra por parámetro y
 * se trunca a medianoche, porque «vence en 3 días» es una resta de fechas y no
 * de horas — el mismo cuidado que ya obligó a arreglar un test del seed.
 */
export function diasParaVencer(fechaVencimiento: string, hoy: Date = new Date()): number | null {
  const f = new Date(fechaVencimiento);
  if (Number.isNaN(f.getTime())) return null;
  const a = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const b = new Date(f.getFullYear(), f.getMonth(), f.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Los tres umbrales de aviso, en días. El más estrecho manda.
 *
 * Están aquí, y no repartidos por las superficies, para que el badge de la tabla
 * y el aviso del panel corten en el mismo día: dos listas de umbrales acabarían
 * discrepando y el mismo lote estaría «próximo» en un sitio y no en el otro.
 */
export const UMBRALES_VENCIMIENTO = {
  /** Una semana. Ya hay que mover el lote. */
  critico: 7,
  /** Quince días. Entra en la lista de trabajo. */
  proximo: 15,
  /** Un mes. Aviso temprano, todavía sin urgencia. */
  aviso: 30,
} as const;

/**
 * Banda de urgencia de un vencimiento, de más a menos grave.
 *
 * ── Por qué hay un `desconocido` ──────────────────────────────────────────
 * Una fecha ilegible **no es** un lote sano. Sin este miembro, `diasParaVencer`
 * devolviendo `null` caería por descarte en `ok`, y un lote con la fecha corrupta
 * se pintaría como «todo bien» — justo la superficie que miente que este repo no
 * admite. `desconocido` obliga a la UI a decir que no lo sabe, y a los mapas
 * exhaustivos a declararle etiqueta y color.
 *
 * ── `vencido` es estrictamente pasado ─────────────────────────────────────
 * El día del vencimiento el producto todavía sirve, así que `dias === 0` es
 * `critico`, no `vencido`. La convención contraria retiraría mercancía buena un
 * día antes.
 */
export type UrgenciaVencimiento = "vencido" | "critico" | "proximo" | "aviso" | "ok" | "desconocido";

/** Banda de urgencia de una fecha de vencimiento. */
export function urgenciaDeVencimiento(
  fechaVencimiento: string,
  hoy: Date = new Date(),
): UrgenciaVencimiento {
  const dias = diasParaVencer(fechaVencimiento, hoy);
  if (dias === null) return "desconocido";
  if (dias < 0) return "vencido";
  if (dias <= UMBRALES_VENCIMIENTO.critico) return "critico";
  if (dias <= UMBRALES_VENCIMIENTO.proximo) return "proximo";
  if (dias <= UMBRALES_VENCIMIENTO.aviso) return "aviso";
  return "ok";
}

/**
 * Un lote con su existencia **ya resuelta**.
 *
 * Existe para que la función de despacho sea pura sin dejar de ser útil: la
 * disponibilidad se calcula una vez, en el borde que tiene los movimientos
 * (el store), y la ordenación FEFO no necesita conocer el kárdex. La alternativa
 * —pasarle los movimientos a `obtenerLotesSugeridosFEFO`— mezclaría dos
 * responsabilidades en una firma.
 */
export interface LoteDisponible extends LoteArticulo {
  /** Existencia derivada con `disponibleDeLote`. */
  disponible: number;
}

/**
 * Lotes a despachar, **primero el que vence antes** (First Expired, First Out).
 *
 * Devuelve los lotes necesarios para cubrir `cantidadRequerida`, en el orden en
 * que hay que sacarlos. Incluye el lote que cruza la línea: si hacen falta 25 y
 * los lotes tienen 20 y 20, devuelve los dos, no uno y medio.
 *
 * ── Qué NO devuelve, y por qué ────────────────────────────────────────────
 *
 *  · **Lotes sin existencia** (`disponible <= 0`). Un lote vacío no se despacha.
 *  · **Lotes ya vencidos** y **lotes de fecha ilegible.** «A despachar» quiere
 *    decir despachable: devolver primero el que venció ayer sería una sugerencia
 *    que hay que desobedecer. Se excluyen en vez de ordenarlos, y la exclusión se
 *    ve: el total devuelto puede no cubrir lo pedido, y el llamador compara
 *    —`totalDisponibleDe`— en vez de suponer que siempre alcanza.
 *
 * ── Determinismo ──────────────────────────────────────────────────────────
 * Dos lotes que vencen el mismo día se ordenan por `codigoLote`. Sin desempate,
 * el orden saldría del array de entrada, que cambia al registrar un movimiento:
 * una lista de despacho que se reordena sola no se puede seguir con el dedo.
 *
 * `hoy` entra por parámetro por la misma razón que en `etiquetaFecha`: una
 * función que lee el reloj por dentro solo se prueba esperando a que pase el día.
 */
export function obtenerLotesSugeridosFEFO(
  lotes: readonly LoteDisponible[],
  cantidadRequerida: number,
  hoy: Date = new Date(),
): LoteDisponible[] {
  if (!Number.isFinite(cantidadRequerida) || cantidadRequerida <= 0) return [];

  // `filter` ya devuelve un array nuevo, así que `sort` no toca la entrada.
  const despachables = lotes
    .filter((l) => l.disponible > 0)
    .filter((l) => {
      const urgencia = urgenciaDeVencimiento(l.fechaVencimiento, hoy);
      return urgencia !== "vencido" && urgencia !== "desconocido";
    })
    .sort((a, b) => {
      const porFecha = a.fechaVencimiento.localeCompare(b.fechaVencimiento);
      if (porFecha !== 0) return porFecha;
      return a.codigoLote.localeCompare(b.codigoLote, "es");
    });

  const elegidos: LoteDisponible[] = [];
  let acumulado = 0;
  for (const lote of despachables) {
    if (acumulado >= cantidadRequerida) break;
    elegidos.push(lote);
    acumulado += lote.disponible;
  }
  return elegidos;
}

/**
 * Existencia total de un conjunto de lotes.
 *
 * Existe para que el llamador pueda comparar lo que hay contra lo que necesita
 * **sin volver a sumar por su cuenta**: la comparación «¿alcanza?» es la razón
 * de ser de `obtenerLotesSugeridosFEFO`, y una suma escrita en cada superficie
 * sería otro cálculo del mismo número.
 */
export function totalDisponibleDe(lotes: readonly LoteDisponible[]): number {
  let total = 0;
  for (const lote of lotes) total += lote.disponible;
  return total;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDITORÍA Y CONCILIACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Diferencia de una línea: `físico − teórico`. **Positiva = sobra mercancía.**
 *
 * Devuelve `null` mientras no se haya contado, y `null` **no es `0`**: «todavía
 * no conté» y «conté y coincide» son estados distintos, y colapsarlos haría que
 * una auditoría a medio hacer se pudiera conciliar como si estuviera terminada,
 * cerrando el conteo sin haber contado.
 */
export function diferenciaDe(item: ItemAuditoria): number | null {
  if (item.conteoFisico === null) return null;
  return item.conteoFisico - item.conteoTeorico;
}

/** ¿Se contaron todas las líneas? Una auditoría sin líneas está completa. */
export function estaCompleta(auditoria: AuditoriaInventario): boolean {
  return auditoria.items.every((i) => i.conteoFisico !== null);
}

/**
 * Las líneas con una diferencia real: contadas y distintas de cero.
 *
 * Es la lista que hay que conciliar, y la que la pantalla cuenta para decir
 * cuántas discrepancias hay. Una línea sin contar queda fuera —no se sabe— y una
 * contada que coincide también: no hay nada que ajustar.
 */
export function itemsConDiferencia(auditoria: AuditoriaInventario): ItemAuditoria[] {
  return auditoria.items.filter((i) => {
    const diferencia = diferenciaDe(i);
    return diferencia !== null && diferencia !== 0;
  });
}

/**
 * En qué acabó una línea: sin contar, coincidió, sobra o falta.
 *
 * Cuatro y no tres, porque **`pendiente` no es `coincide`**: colapsarlas haría
 * que una línea sin contar se pintara como cuadrada, que es exactamente lo que
 * un conteo no puede permitirse.
 */
export type EstadoLinea = "pendiente" | "coincide" | "sobra" | "falta";

/**
 * Clasifica la diferencia de una línea.
 *
 * Vive en el dominio y no en la página por una razón concreta: **la tabla y los
 * contadores tienen que coincidir**. Si la fila pintara su badge con un `> 0` y
 * el resumen contara con otro criterio, la pantalla podría decir «2 discrepancias»
 * sobre una tabla donde se ven tres — y ese defecto no lo ve ningún test de
 * página, porque ningún test del repo importa un `.tsx`.
 */
export function clasificarDiferencia(diferencia: number | null): EstadoLinea {
  if (diferencia === null) return "pendiente";
  if (diferencia === 0) return "coincide";
  return diferencia > 0 ? "sobra" : "falta";
}

/**
 * Cuántas líneas hay de cada clase. Es lo que la pantalla cuenta para su resumen.
 *
 * Usa `clasificarDiferencia` —la misma función que pinta cada fila—, así que el
 * contador y la tabla no pueden discrepar. Las cuatro claves salen siempre, con
 * cero incluidas: una clave ausente obligaría a cada consumidor a escribir su
 * propio `?? 0`, que es donde se cuela el `NaN`.
 */
export function resumenDeAuditoria(auditoria: AuditoriaInventario): Record<EstadoLinea, number> {
  const resumen: Record<EstadoLinea, number> = {
    pendiente: 0,
    coincide: 0,
    sobra: 0,
    falta: 0,
  };
  for (const item of auditoria.items) {
    resumen[clasificarDiferencia(diferenciaDe(item))] += 1;
  }
  return resumen;
}

/**
 * Por qué una auditoría **no** se puede conciliar todavía. `null` = sí se puede.
 *
 * Es una función y no un booleano para que el motivo sea **el mismo texto** en
 * los dos sitios que lo necesitan: el guardarraíl de `conciliarAuditoria` —que
 * es el que manda, porque una pantalla no es una regla— y el botón
 * deshabilitado, que tiene que explicarse con la misma frase que saldría al
 * pulsarlo. Dos redacciones del mismo «no» acaban discrepando.
 *
 * **No comprueba que la auditoría exista**: recibe la auditoría, así que existir
 * es responsabilidad de quien la busca. El store comprueba eso antes.
 */
export function motivoNoConciliable(auditoria: AuditoriaInventario): string | null {
  if (auditoria.estado !== "en_proceso") return "La auditoría ya no está en proceso.";
  const sinContar = auditoria.items.filter((i) => i.conteoFisico === null).length;
  if (sinContar === 1) return "Falta contar 1 artículo antes de conciliar.";
  if (sinContar > 1) return `Faltan contar ${sinContar} artículos antes de conciliar.`;
  return null;
}

/**
 * Los movimientos de kárdex que concilian una auditoría: **uno por diferencia**.
 *
 * ── Por qué `ajuste` y no `'AJUSTE_ENTRADA'` / `'AJUSTE_SALIDA'` ───────────
 * El diseño de partida pedía dos tipos nuevos. En este dominio **el tipo es el
 * MOTIVO y la dirección la dan los extremos**: un ajuste al alza es un `ajuste`
 * con `destinoId` y ninguno de origen, y a la baja es el mismo `ajuste` con
 * `origenId`. Añadir dos miembros a `TipoMovimiento` daría seis entradas en
 * `TIPOS_MOVIMIENTO`, seis filtros en el kárdex y seis badges para lo que siguen
 * siendo dos direcciones de un solo hecho — y rompería la fórmula única
 * (`efectoEnBodega`), que no necesita saber de qué tipo es un movimiento para
 * saber cuánto suma.
 *
 * ── El motivo no es decorativo ────────────────────────────────────────────
 * Cada ajuste lleva el id de la auditoría. Un ajuste es la única acción del
 * módulo que reescribe la realidad sin un hecho externo que la respalde, y el
 * kárdex tiene que poder decir de dónde salió: sin el motivo, seis meses después
 * esos movimientos son diferencias inexplicables.
 *
 * Las líneas sin contar y las que coinciden **no generan movimiento**: una
 * cantidad de 0 sería un renglón que no explica nada.
 *
 * ── Deuda declarada: un ajuste de auditoría NO está etiquetado con lote ────
 * `loteId` se deja sin poner, y la consecuencia es real: en un artículo con
 * lotes, el ajuste mueve la existencia del artículo pero **no** la
 * disponibilidad derivada de sus lotes (`disponibleDeLote` suma los movimientos
 * etiquetados), así que después de conciliar las dos cifras pueden separarse
 * hasta el siguiente movimiento etiquetado.
 *
 * No se resuelve aquí porque resolverlo bien exige **contar por lote** —una
 * línea de auditoría por lote, no por artículo— y eso cambia la forma del
 * conteo, que es otra spec. Lo que no se hace es elegir un lote «razonable»: un
 * reparto inventado sería una trazabilidad que el operador no declaró, y eso es
 * peor que la deriva. Está fijado por un test en `inventario.store.test.ts` para
 * que la limitación se vea en vez de descubrirse.
 */
export function ajustesDeAuditoria(
  auditoria: AuditoriaInventario,
): Omit<Movimiento, "id" | "fecha" | "actor">[] {
  const ajustes: Omit<Movimiento, "id" | "fecha" | "actor">[] = [];
  for (const item of auditoria.items) {
    const diferencia = diferenciaDe(item);
    if (diferencia === null || diferencia === 0) continue;
    ajustes.push({
      articuloId: item.articuloId,
      tipo: "ajuste",
      // Siempre positiva: el signo ya está en el par de extremos.
      cantidad: Math.abs(diferencia),
      origenId: diferencia < 0 ? auditoria.almacenId : null,
      destinoId: diferencia > 0 ? auditoria.almacenId : null,
      motivo: `Conteo físico · auditoría ${auditoria.id}`,
    });
  }
  return ajustes;
}
