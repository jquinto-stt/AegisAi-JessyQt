/**
 * Domain: Inventarios retail — el producto que se vende y cuánto queda.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEROGACIÓN EXPRESA — 07/10/2026, decidida por el usuario
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `inventarios.domain.ts` (el módulo de CONTEO) prohíbe por escrito el
 * vocabulario de este archivo: «`Articulo`, bodega, kárdex, lote, FEFO,
 * `unidad: kg|g|l|ml|porcion`, costo, valorización, precio».
 *
 * Esa prohibición se escribió para el módulo de conteos, y **queda derogada
 * aquí de forma expresa y fechada**. El motivo es un cambio de producto, no un
 * descuido: el usuario decidió el 07/10/2026 que el módulo de Inventario
 * administra un **catálogo de productos vendibles con precio, existencia y
 * fecha de vencimiento**, y no solo actos de verificación. Su spec describe
 * nueve pantallas (catálogo, sedes, proveedores, órdenes de compra, reportes)
 * que no caben en el modelo de conteos.
 *
 * Lo que NO se relaja: la calidad. Sigue siendo 100 % puro (sin React, sin
 * MobX, sin `localStorage`, sin `Date.now()` dentro de las funciones), sigue
 * sin inventar dato que no exista, y sigue prefiriendo `null` a un cero
 * silencioso.
 *
 * ── Qué hay aquí ──────────────────────────────────────────────────────────
 *
 *   Producto          → lo que se vende, con su precio y su mínimo
 *   Sede              → dónde está físicamente
 *   ExistenciaSede    → cuánto hay de un producto en una sede
 *   SemaforoDisponibilidad → el estado derivado que se pinta como etiqueta
 *
 * ── El semáforo es DERIVADO, nunca almacenado ─────────────────────────────
 *
 * Guardar «está agotado» en la fila sería guardar una conclusión que deja de
 * ser cierta en cuanto entra mercancía. Se calcula con `semaforoDe()` cada vez
 * que se pinta, así que no puede quedar desfasado.
 *
 * ── Por qué la cantidad no vive en `Producto` ─────────────────────────────
 *
 * Porque un producto no tiene «una» cantidad: tiene una por sede. Con la
 * cantidad dentro de `Producto` el filtro por sede sería decorativo —no habría
 * nada que filtrar— y la pantalla de la ficha no podría enseñar el desglose.
 * El total que ve el usuario se SUMA en `cantidadTotal()`, no se almacena.
 */

import { normalizarTexto } from "./inventarios.domain";

// ═══════════════════════════════════════════════════════════════════════════
// UNIDAD — cómo se cuenta lo que se vende
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Unidad de venta. **Lista cerrada**, y a diferencia del módulo de conteos sí
 * nombra magnitudes físicas.
 *
 * En conteos la unidad cerrada se prohibió porque un negocio de activos fijos
 * no sabría qué elegir entre `kg` y `l`. Aquí el módulo ES de productos
 * vendibles, así que las magnitudes son el caso normal y no un sesgo de rubro.
 */
export type UnidadMedida = "unidad" | "paquete" | "caja" | "kilo" | "litro";

export const UNIDADES_MEDIDA: readonly UnidadMedida[] = [
  "unidad",
  "paquete",
  "caja",
  "kilo",
  "litro",
];

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTO
// ═══════════════════════════════════════════════════════════════════════════

export type EstadoProducto = "activo" | "inactivo";
export type TipoImpuesto = "exento" | "iva_0" | "iva_5" | "iva_19" | "impoconsumo";

export interface Producto {
  id: string;
  /**
   * Código corto con el que el comerciante identifica el producto. Único por
   * organización, sin distinguir mayúsculas ni tildes (ver `codigoProductoDuplicado`).
   */
  codigo: string;
  /** Código de barras EAN-13 / UPC opcional para escaneo en caja o bodega. */
  codigoBarras?: string | null;
  nombre: string;
  /** **Texto libre**, nunca unión cerrada: el usuario nombra sus categorías. */
  categoria: string;
  /** Precio al que se compra. Se usa para valorizar el inventario. */
  precioCompra: number;
  /** Precio al que se vende al público o cliente final. */
  precioVenta?: number;
  /** Régimen o tarifa impositiva colombiana aplicada. */
  impuesto?: TipoImpuesto;
  /** Si está visible para pedir desde catálogo virtual / tienda WhatsApp. */
  publicarEnCatalogo?: boolean;
  /** Notas o especificaciones para el cliente y el bodeguero. */
  descripcion?: string | null;
  /**
   * Cantidad a partir de la cual el producto se marca «Queda poco».
   *
   * `0` significa **sin aviso**: el producto solo se marca cuando llega a cero.
   * Es un valor legítimo, no un dato que falte.
   */
  minimo: number;
  unidad: UnidadMedida;
  /** `YYYY-MM-DD`, o `null` si el producto no vence (aseo, ferretería…). */
  vencimiento: string | null;
  /**
   * Foto embebida como `dataUrl`.
   */
  imagenDataUrl: string | null;
  /**
   * Baja **lógica**, nunca física: un producto con existencias o con historial
   * no se borra, se da de baja. Borrarlo dejaría existencias apuntando a nada.
   */
  estado: EstadoProducto;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEDE — dónde está
// ═══════════════════════════════════════════════════════════════════════════

export type EstadoSede = "activa" | "inactiva";

export interface Sede {
  id: string;
  nombre: string;
  /** Nombre comercial, si difiere del nombre de la sede. */
  nombreComercial: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  estado: EstadoSede;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXISTENCIA — cuánto hay, y dónde
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cuánto hay de **un** producto en **una** sede.
 *
 * Es la única cantidad que se almacena. `Producto` no tiene `cantidad` a
 * propósito: con el total guardado dentro del producto habría dos verdades
 * —el total y la suma de sus partes— y la primera que se desincronizara
 * produciría una tabla que no cuadra con su propio desglose.
 */
export interface ExistenciaSede {
  productoId: string;
  sedeId: string;
  cantidad: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEMÁFORO — el estado, derivado
// ═══════════════════════════════════════════════════════════════════════════

export type SemaforoDisponibilidad = "disponible" | "bajo" | "agotado";

/**
 * Estado de disponibilidad de un producto.
 *
 * Orden de las comprobaciones, que no es intercambiable:
 *   1. `cantidad <= 0` → agotado. Va primero: con `minimo === 0` un producto
 *      sin existencias caería en la segunda rama y se leería «queda poco»
 *      cuando en realidad no queda nada.
 *   2. `minimo > 0 && cantidad <= minimo` → queda poco. El `minimo > 0` es lo
 *      que hace que «mínimo 0» signifique de verdad *sin aviso*.
 *   3. → disponible.
 */
export function semaforoDe(
  cantidad: number,
  minimo: number,
): SemaforoDisponibilidad {
  if (cantidad <= 0) return "agotado";
  if (minimo > 0 && cantidad <= minimo) return "bajo";
  return "disponible";
}

/** ¿Es un estado que exige que el usuario haga algo? */
export function esAlerta(semaforo: SemaforoDisponibilidad): boolean {
  return semaforo === "bajo" || semaforo === "agotado";
}

// ═══════════════════════════════════════════════════════════════════════════
// AGREGADOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cuánto hay de un producto, sumando todas las sedes.
 *
 * `sedes` es opcional a propósito: sin él devuelve el total; con él, solo lo de
 * esas sedes. Es lo que permite que el filtro por sede y el total usen la MISMA
 * función en vez de dos sumas escritas por separado.
 */
export function cantidadTotal(
  existencias: readonly ExistenciaSede[],
  productoId: string,
  sedes?: readonly string[],
): number {
  let total = 0;
  for (const e of existencias) {
    if (e.productoId !== productoId) continue;
    if (sedes && !sedes.includes(e.sedeId)) continue;
    total += e.cantidad;
  }
  return total;
}

/**
 * Lo que vale el inventario: suma de `precioCompra × cantidad` de cada producto.
 *
 * Solo cuenta productos **activos**: un producto dado de baja puede conservar
 * existencias residuales, pero valorizarlas inflaría un número que el usuario
 * lee como «lo que tengo para vender».
 */
export function valorizacionDe(
  productos: readonly Producto[],
  existencias: readonly ExistenciaSede[],
): number {
  let total = 0;
  for (const p of productos) {
    if (p.estado !== "activo") continue;
    total += p.precioCompra * cantidadTotal(existencias, p.id);
  }
  return total;
}

export interface ResumenCatalogo {
  categorias: number;
  productos: number;
  valorizacion: number;
  /** Productos activos marcados «Queda poco». */
  porAgotar: number;
  /** Productos activos marcados «Agotado». */
  agotados: number;
}

/**
 * Los cuatro números de la tarjeta de resumen, calculados sobre los datos.
 *
 * Los cuatro salen de contar o sumar lo que ya existe. **No hay ninguno
 * inventado**: si mañana se quiere «más vendidos», eso exige datos de venta que
 * hoy no existen, y el sitio donde iría está declarado en el handoff en vez de
 * rellenarse con una cifra decorativa.
 */
export function resumenDeCatalogo(
  productos: readonly Producto[],
  existencias: readonly ExistenciaSede[],
): ResumenCatalogo {
  const activos = productos.filter((p) => p.estado === "activo");
  const categorias = new Set(
    activos.map((p) => normalizarTexto(p.categoria)).filter((c) => c.length > 0),
  );

  let porAgotar = 0;
  let agotados = 0;
  for (const p of activos) {
    const s = semaforoDe(cantidadTotal(existencias, p.id), p.minimo);
    if (s === "bajo") porAgotar++;
    else if (s === "agotado") agotados++;
  }

  return {
    categorias: categorias.size,
    productos: activos.length,
    valorizacion: valorizacionDe(activos, existencias),
    porAgotar,
    agotados,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDACIONES — compartidas por el formulario y el store
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sanea un precio o una cantidad escrita a mano.
 *
 * `""` → `null` (no se escribió), **nunca `0`**: `Number("")` es `0`, y ese
 * cero convertiría un campo vacío en «cuesta cero pesos». Un valor negativo o
 * no finito también → `null`: se descarta el dato malo en vez de inventar uno.
 */
export function sanearNumero(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "string") {
    const limpio = valor.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    if (limpio === "") return null;
    const n = Number(limpio);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.trunc(n);
  }
  if (!Number.isFinite(valor) || valor < 0) return null;
  return Math.trunc(valor);
}

/**
 * ¿El código ya lo usa otro producto?
 *
 * Compara ignorando mayúsculas y tildes: `A-12` y `a-12` son el mismo código
 * para cualquiera que los lea en una etiqueta.
 */
export function codigoProductoDuplicado(
  codigo: string,
  productos: readonly Producto[],
  exceptoId?: string,
): Producto | undefined {
  const clave = normalizarTexto(codigo);
  if (clave === "") return undefined;
  return productos.find(
    (p) => p.id !== exceptoId && normalizarTexto(p.codigo) === clave,
  );
}

/** ¿La fecha tiene forma `YYYY-MM-DD`? Sin esto, un texto libre se pinta igual. */
export function fechaValida(iso: string | null | undefined): boolean {
  if (!iso) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const t = Date.parse(`${iso}T00:00:00`);
  return !Number.isNaN(t);
}

/** Días que faltan para el vencimiento. `null` si no vence o la fecha no sirve. */
export function diasParaVencer(
  vencimiento: string | null,
  hoy: string,
): number | null {
  if (!fechaValida(vencimiento) || !fechaValida(hoy)) return null;
  const a = Date.parse(`${vencimiento as string}T00:00:00`);
  const b = Date.parse(`${hoy}T00:00:00`);
  return Math.round((a - b) / 86_400_000);
}

/** ¿Vence dentro de los próximos `dias` días (o ya venció)? */
export function vencimientoProximo(
  vencimiento: string | null,
  hoy: string,
  dias: number,
): boolean {
  const d = diasParaVencer(vencimiento, hoy);
  return d !== null && d <= dias;
}

/**
 * Motivo por el que un producto no se puede guardar, o `null` si sí se puede.
 *
 * Devuelve **el motivo concreto**, no un booleano: «no se puede» sin decir qué
 * falta obliga al usuario a adivinar cuál de los ocho campos está mal.
 */
export interface Revision {
  ok: boolean;
  motivo: string | null;
}

export function revisarProducto(datos: {
  nombre: string;
  codigo: string;
  precioCompra: number | null;
  cantidadInicial: number | null;
  minimo: number | null;
  vencimiento: string | null;
}): Revision {
  if (datos.nombre.trim().length === 0) {
    return { ok: false, motivo: "Escribe el nombre del producto" };
  }
  if (datos.codigo.trim().length === 0) {
    return { ok: false, motivo: "Escribe el código del producto" };
  }
  if (datos.precioCompra === null) {
    return { ok: false, motivo: "Escribe cuánto te cuesta comprarlo" };
  }
  if (datos.cantidadInicial === null) {
    return { ok: false, motivo: "Escribe cuántos tienes ahora" };
  }
  if (datos.minimo === null) {
    return { ok: false, motivo: "Escribe la cantidad mínima (puede ser 0)" };
  }
  if (datos.vencimiento !== null && !fechaValida(datos.vencimiento)) {
    return { ok: false, motivo: "La fecha de vencimiento no es válida" };
  }
  return { ok: true, motivo: null };
}

/**
 * Reparte una cantidad total entre las sedes activas.
 *
 * Se usa al crear un producto: el usuario escribe **un** número («cuántos hay
 * ahora») porque pedirle el desglose por sede en el alta es pedirle que sepa
 * algo que aún no ha decidido. La primera sede se lleva todo y las demás
 * quedan en cero, que es un reparto explícito y visible —no un promedio
 * inventado— y se corrige después desde la ficha del producto.
 *
 * Sin sedes activas devuelve vacío: el producto existe, pero no se le puede
 * atribuir existencia a ningún sitio. La UI lo dice en vez de esconderlo.
 */
export function repartirEnSedes(
  productoId: string,
  cantidad: number,
  sedes: readonly Sede[],
): ExistenciaSede[] {
  const activas = sedes.filter((s) => s.estado === "activa");
  return activas.map((s, i) => ({
    productoId,
    sedeId: s.id,
    cantidad: i === 0 ? cantidad : 0,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVEEDOR & ÓRDENES DE COMPRA
// ═══════════════════════════════════════════════════════════════════════════

export interface Proveedor {
  id: string;
  nombre: string;
  /** Logo comercial o avatar corporativo del proveedor en dataUrl / URL. */
  logoDataUrl?: string | null;
  productoPrincipal: string;
  categoria: string;
  telefono: string;
  email: string;
  aceptaDevoluciones: boolean;
  enCamino: number;
  precioBase?: number;
}

export type EstadoOrdenCompra = "confirmada" | "en_camino" | "retrasada" | "devuelta";

export interface OrdenCompra {
  id: string;
  numero: string;
  productoId: string;
  productoNombre: string;
  proveedorId?: string;
  proveedorNombre?: string;
  valorTotal: number;
  cantidad: number;
  unidad: string;
  fechaEntregaEstimada: string;
  estado: EstadoOrdenCompra;
  notificar: boolean;
  createdAt: string;
}

export interface AjusteStock {
  id: string;
  productoId: string;
  sedeId: string;
  cantidadAnterior: number;
  cantidadNueva: number;
  motivo: "merma" | "vencimiento" | "conteo" | "ingreso_manual" | "traslado";
  notas?: string;
  fecha: string;
}

