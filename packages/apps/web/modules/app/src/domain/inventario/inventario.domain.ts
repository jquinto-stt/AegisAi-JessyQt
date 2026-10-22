/**
 * Dominio del módulo Inventario — tipos y reglas puras.
 *
 * Nada aquí toca MobX, React ni el reloj: cada función recibe lo que necesita y
 * devuelve un valor nuevo. Así las reglas de stock (qué es «bajo», cuánto pedir,
 * qué deja un movimiento) se prueban sin montar el store, y el store solo
 * orquesta: valida con estas funciones y guarda el resultado.
 *
 * Modelo, de abajo arriba:
 *   · Ubicación   — dónde está físicamente el stock (almacén, bodega, estante).
 *   · Proveedor   — a quién se le compra.
 *   · Artículo    — el SKU, con existencias POR ubicación.
 *   · Movimiento  — el único camino para cambiar existencias (entrada, salida,
 *                   transferencia, ajuste). Es el libro mayor: nunca se edita.
 *   · Orden de compra — lo pedido a un proveedor; al recibirse genera entradas.
 *   · Conteo      — auditoría física; al aplicarse genera ajustes.
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export type TipoUbicacion = "almacen" | "bodega" | "estante" | "oficina" | "muelle";

export interface Ubicacion {
  id: string;
  nombre: string;
  tipo: TipoUbicacion;
  activa: boolean;
}

export interface Proveedor {
  id: string;
  nombre: string;
  nit: string;
  contacto: string;
  email: string;
  telefono: string;
  ciudad: string;
  /** Días hábiles desde que se envía la orden hasta que llega. */
  plazoEntregaDias: number;
  condicionesPago: string;
  activo: boolean;
}

export type UnidadMedida = "unidad" | "caja" | "paquete" | "rollo" | "litro" | "kg" | "resma";

export interface Articulo {
  id: string;
  sku: string;
  nombre: string;
  categoria: string;
  unidad: UnidadMedida;
  /** Costo de compra por unidad, en la moneda de la organización. */
  costoUnitario: number;
  proveedorId: string | null;
  /** Al llegar a este total (o por debajo) el artículo entra en la cola de reorden. */
  puntoReorden: number;
  /** Stock objetivo: hasta dónde se repone. */
  stockMaximo: number;
  /** Existencias por ubicación. Una ubicación ausente vale 0. */
  existencias: Record<string, number>;
  activo: boolean;
}

export type TipoMovimiento = "entrada" | "salida" | "transferencia" | "ajuste";

export interface Movimiento {
  id: string;
  /** ISO 8601. */
  fecha: string;
  tipo: TipoMovimiento;
  articuloId: string;
  /**
   * Unidades movidas. Positiva en entrada, salida y transferencia; en un ajuste
   * lleva signo (−3 = se dieron de baja tres unidades).
   */
  cantidad: number;
  /** Salida y transferencia descuentan de aquí. */
  origenId: string | null;
  /** Entrada, transferencia y ajuste suman (o restan, en el ajuste) aquí. */
  destinoId: string | null;
  motivo: string;
  /** Documento que lo originó: «OC-0004», «CNT-0002»… */
  referencia: string | null;
  responsable: string;
  /** Costo por unidad con el que entró la mercancía. Solo en entradas que lo declaran. */
  costoUnitario?: number;
}

export type EstadoOrdenCompra = "borrador" | "enviada" | "parcial" | "recibida" | "cancelada";

export interface LineaOrdenCompra {
  articuloId: string;
  cantidad: number;
  recibida: number;
  costoUnitario: number;
}

export interface OrdenCompra {
  id: string;
  numero: string;
  proveedorId: string;
  estado: EstadoOrdenCompra;
  fechaCreacion: string;
  fechaEsperada: string | null;
  /** Cuándo llegó la última unidad. Solo en órdenes `recibida`. */
  fechaRecepcion?: string | null;
  destinoId: string;
  lineas: LineaOrdenCompra[];
  notas: string;
}

export type EstadoConteo = "en_progreso" | "en_revision" | "aplicado" | "anulado";

export interface LineaConteo {
  articuloId: string;
  /** Lo que el sistema decía que había al abrir el conteo. */
  esperado: number;
  /** Lo que se contó. `null` = todavía sin contar. */
  contado: number | null;
}

export interface Conteo {
  id: string;
  numero: string;
  ubicacionId: string;
  estado: EstadoConteo;
  fecha: string;
  responsable: string;
  lineas: LineaConteo[];
  notas: string;
}

export type MetodoValoracion = "promedio" | "fifo";

export interface ConfigInventario {
  // ── General ──
  metodoValoracion: MetodoValoracion;
  unidadPorDefecto: UnidadMedida;
  /** Dónde entra la mercancía si nadie dice otra cosa: recepciones y órdenes nuevas. */
  ubicacionRecepcionId: string;

  // ── Reposición ──
  /** Días de consumo que debe cubrir una reposición (informativo en la cola). */
  diasCobertura: number;
  /** Valores que toma un artículo nuevo; cada artículo puede cambiarlos. */
  puntoReordenPorDefecto: number;
  stockMaximoPorDefecto: number;
  /** Si lo que ya viene en camino se descuenta de la cantidad sugerida. */
  descontarEnTransito: boolean;
  /** Las cantidades sugeridas se redondean hacia arriba a este múltiplo (1 = sin redondeo). */
  multiploPedido: number;

  // ── Órdenes de compra ──
  /** Prefijo de numeración de las órdenes de compra. */
  prefijoOrdenCompra: string;
  notasOrdenPorDefecto: string;

  // ── Movimientos ──
  /** Motivos sugeridos al registrar cada tipo de movimiento. */
  motivos: Record<TipoMovimiento, string[]>;
  /** Exige un documento de referencia (pedido, remisión) en cada salida. */
  referenciaObligatoriaSalidas: boolean;

  // ── Conteos ──
  /** Si está activo, aplicar un conteo con diferencias exige revisión previa. */
  requiereRevisionConteos: boolean;
  /** Conteo ciego: quien cuenta no ve la cantidad esperada, así no la copia. */
  conteoCiego: boolean;
  /** Diferencia (en % del esperado) a partir de la cual una línea se resalta para revisar. */
  umbralDiferenciaPct: number;

  // ── Alertas ──
  alertaStockBajo: boolean;
  alertaWhatsapp: boolean;
  /** Número que recibe las alertas por WhatsApp, con indicativo. */
  whatsappDestino: string;
  resumenDiario: boolean;
  /** «07:00». */
  horaResumen: string;

  categorias: string[];

  // ── Catálogo y recepción ──
  /** Si el código (SKU) se deja vacío al crear un artículo, se genera solo. */
  skuAutomatico: boolean;
  /** Cuánto más de lo pedido se acepta al recibir una orden (% de la línea). */
  toleranciaRecepcionPct: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// ETIQUETAS
// ═══════════════════════════════════════════════════════════════════════════

export const ETIQUETA_TIPO_UBICACION: Record<TipoUbicacion, string> = {
  almacen: "Almacén",
  bodega: "Bodega",
  estante: "Estante",
  oficina: "Oficina",
  muelle: "Muelle",
};

export const ETIQUETA_UNIDAD: Record<UnidadMedida, string> = {
  unidad: "Unidad",
  caja: "Caja",
  paquete: "Paquete",
  rollo: "Rollo",
  litro: "Litro",
  kg: "Kilogramo",
  resma: "Resma",
};

export const ETIQUETA_TIPO_MOVIMIENTO: Record<TipoMovimiento, string> = {
  entrada: "Entrada",
  salida: "Salida",
  transferencia: "Transferencia",
  ajuste: "Ajuste",
};

export const ETIQUETA_ESTADO_OC: Record<EstadoOrdenCompra, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  parcial: "Recibida parcial",
  recibida: "Recibida",
  cancelada: "Cancelada",
};

export const ETIQUETA_ESTADO_CONTEO: Record<EstadoConteo, string> = {
  en_progreso: "En progreso",
  en_revision: "En revisión",
  aplicado: "Aplicado",
  anulado: "Anulado",
};

// ═══════════════════════════════════════════════════════════════════════════
// STOCK
// ═══════════════════════════════════════════════════════════════════════════

export type EstadoStock = "agotado" | "bajo" | "normal" | "exceso";

export const ETIQUETA_ESTADO_STOCK: Record<EstadoStock, string> = {
  agotado: "Agotado",
  bajo: "Bajo mínimo",
  normal: "Normal",
  exceso: "Exceso",
};

export function stockTotal(a: Pick<Articulo, "existencias">): number {
  return Object.values(a.existencias).reduce((s, n) => s + n, 0);
}

export function stockEn(a: Pick<Articulo, "existencias">, ubicacionId: string): number {
  return a.existencias[ubicacionId] ?? 0;
}

/**
 * `bajo` incluye el punto de reorden exacto: «al llegar a 10, pide» significa
 * que con 10 ya hay que pedir.
 */
export function estadoStock(a: Pick<Articulo, "existencias" | "puntoReorden" | "stockMaximo">): EstadoStock {
  const total = stockTotal(a);
  if (total <= 0) return "agotado";
  if (total <= a.puntoReorden) return "bajo";
  if (a.stockMaximo > 0 && total > a.stockMaximo) return "exceso";
  return "normal";
}

export function valorArticulo(a: Pick<Articulo, "existencias" | "costoUnitario">): number {
  return stockTotal(a) * a.costoUnitario;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOVIMIENTOS
// ═══════════════════════════════════════════════════════════════════════════

export type DatosMovimiento = Pick<Movimiento, "tipo" | "articuloId" | "cantidad" | "origenId" | "destinoId">;

export type ResultadoExistencias =
  | { ok: true; existencias: Record<string, number> }
  | { ok: false; error: string };

/**
 * Lo que deja un movimiento en las existencias de un artículo. Nunca permite
 * stock negativo en una ubicación: una salida mayor que lo que hay es un error
 * de captura, no una deuda de inventario.
 */
export function aplicarMovimiento(existencias: Record<string, number>, m: DatosMovimiento): ResultadoExistencias {
  const r = { ...existencias };
  const hay = (id: string) => r[id] ?? 0;

  if (!Number.isFinite(m.cantidad) || !Number.isInteger(m.cantidad)) {
    return { ok: false, error: "La cantidad debe ser un número entero." };
  }

  switch (m.tipo) {
    case "entrada":
      if (!m.destinoId) return { ok: false, error: "Indica la ubicación de destino." };
      if (m.cantidad <= 0) return { ok: false, error: "La cantidad debe ser mayor que cero." };
      r[m.destinoId] = hay(m.destinoId) + m.cantidad;
      return { ok: true, existencias: r };

    case "salida":
      if (!m.origenId) return { ok: false, error: "Indica la ubicación de origen." };
      if (m.cantidad <= 0) return { ok: false, error: "La cantidad debe ser mayor que cero." };
      if (m.cantidad > hay(m.origenId)) {
        return { ok: false, error: `Solo hay ${hay(m.origenId)} unidades en esa ubicación.` };
      }
      r[m.origenId] = hay(m.origenId) - m.cantidad;
      return { ok: true, existencias: r };

    case "transferencia":
      if (!m.origenId || !m.destinoId) return { ok: false, error: "Indica origen y destino." };
      if (m.origenId === m.destinoId) return { ok: false, error: "El origen y el destino deben ser distintos." };
      if (m.cantidad <= 0) return { ok: false, error: "La cantidad debe ser mayor que cero." };
      if (m.cantidad > hay(m.origenId)) {
        return { ok: false, error: `Solo hay ${hay(m.origenId)} unidades en el origen.` };
      }
      r[m.origenId] = hay(m.origenId) - m.cantidad;
      r[m.destinoId] = hay(m.destinoId) + m.cantidad;
      return { ok: true, existencias: r };

    case "ajuste":
      if (!m.destinoId) return { ok: false, error: "Indica la ubicación que se ajusta." };
      if (m.cantidad === 0) return { ok: false, error: "Un ajuste de cero no cambia nada." };
      if (hay(m.destinoId) + m.cantidad < 0) {
        return { ok: false, error: `El ajuste dejaría stock negativo (hay ${hay(m.destinoId)}).` };
      }
      r[m.destinoId] = hay(m.destinoId) + m.cantidad;
      return { ok: true, existencias: r };
  }
}

/** Efecto neto del movimiento sobre el stock total (la transferencia es neutra). */
export function deltaTotal(m: Pick<Movimiento, "tipo" | "cantidad">): number {
  switch (m.tipo) {
    case "entrada":
      return m.cantidad;
    case "salida":
      return -m.cantidad;
    case "transferencia":
      return 0;
    case "ajuste":
      return m.cantidad;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ÓRDENES DE COMPRA
// ═══════════════════════════════════════════════════════════════════════════

export function totalOrden(oc: Pick<OrdenCompra, "lineas">): number {
  return oc.lineas.reduce((s, l) => s + l.cantidad * l.costoUnitario, 0);
}

export function unidadesPendientes(l: LineaOrdenCompra): number {
  return Math.max(0, l.cantidad - l.recibida);
}

/** Una orden «abierta» es la que todavía puede traer mercancía. */
export function ordenAbierta(oc: Pick<OrdenCompra, "estado">): boolean {
  return oc.estado === "enviada" || oc.estado === "parcial";
}

/** Unidades de un artículo ya pedidas y aún no recibidas. */
export function unidadesEnTransito(articuloId: string, ordenes: OrdenCompra[]): number {
  let n = 0;
  for (const oc of ordenes) {
    if (!ordenAbierta(oc)) continue;
    for (const l of oc.lineas) if (l.articuloId === articuloId) n += unidadesPendientes(l);
  }
  return n;
}

/** Estado tras registrar una recepción: completa si no queda nada pendiente. */
export function estadoTrasRecepcion(lineas: LineaOrdenCompra[]): EstadoOrdenCompra {
  const algoRecibido = lineas.some((l) => l.recibida > 0);
  const todoRecibido = lineas.every((l) => l.recibida >= l.cantidad);
  if (todoRecibido) return "recibida";
  return algoRecibido ? "parcial" : "enviada";
}

/** El número siguiente: «OC-0007» tras «OC-0006». Ignora números con otro prefijo. */
export function siguienteNumero(prefijo: string, existentes: string[]): string {
  const max = existentes.reduce((m, n) => {
    if (!n.startsWith(`${prefijo}-`)) return m;
    const v = parseInt(n.slice(prefijo.length + 1), 10);
    return Number.isFinite(v) && v > m ? v : m;
  }, 0);
  return `${prefijo}-${String(max + 1).padStart(4, "0")}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// COLA DE REORDEN
// ═══════════════════════════════════════════════════════════════════════════

export interface ItemReorden {
  articulo: Articulo;
  estado: EstadoStock;
  stock: number;
  enTransito: number;
  /** Lo que falta para llegar al objetivo, descontando lo que ya viene. */
  sugerido: number;
  /** Unidades que salen por día en promedio (últimos 30 días). 0 = sin salidas. */
  consumoDiario: number;
}

/**
 * Cuánto pedir: hasta el objetivo, contando lo que ya está en camino. El
 * objetivo es el stock máximo o, si el consumo real lo supera, lo que se gasta
 * en `diasCobertura` días. Si lo que viene ya alcanza, no se sugiere nada
 * aunque hoy el stock esté bajo.
 */
export function cantidadSugerida(a: Articulo, enTransito: number, multiplo = 1, consumoDiario = 0, diasCobertura = 0): number {
  const porConsumo = Math.ceil(consumoDiario * diasCobertura);
  const objetivo = Math.max(a.stockMaximo, a.puntoReorden + 1, porConsumo);
  const falta = Math.max(0, objetivo - stockTotal(a) - enTransito);
  if (falta === 0 || multiplo <= 1) return falta;
  return Math.ceil(falta / multiplo) * multiplo;
}

export interface OpcionesReorden {
  /** `false` = sugerir como si no viniera nada en camino. */
  descontarEnTransito?: boolean;
  multiplo?: number;
  /** Unidades por día que sale cada artículo (id → consumo). */
  consumoDiario?: Record<string, number>;
  /** Días de consumo que debe cubrir la reposición. 0 = solo el stock máximo. */
  diasCobertura?: number;
}

/**
 * Artículos activos en o bajo su punto de reorden, los agotados primero y,
 * dentro de cada grupo, los más lejos de su punto (en proporción) arriba.
 */
export function colaReorden(articulos: Articulo[], ordenes: OrdenCompra[], opciones: OpcionesReorden = {}): ItemReorden[] {
  const { descontarEnTransito = true, multiplo = 1, consumoDiario = {}, diasCobertura = 0 } = opciones;
  const items: ItemReorden[] = [];
  for (const a of articulos) {
    if (!a.activo) continue;
    const estado = estadoStock(a);
    if (estado !== "agotado" && estado !== "bajo") continue;
    const enTransito = unidadesEnTransito(a.id, ordenes);
    const consumo = consumoDiario[a.id] ?? 0;
    const sugerido = cantidadSugerida(a, descontarEnTransito ? enTransito : 0, multiplo, consumo, diasCobertura);
    items.push({ articulo: a, estado, stock: stockTotal(a), enTransito, sugerido, consumoDiario: consumo });
  }
  const cobertura = (i: ItemReorden) => (i.articulo.puntoReorden > 0 ? i.stock / i.articulo.puntoReorden : 0);
  return items.sort((x, y) => {
    if (x.estado !== y.estado) return x.estado === "agotado" ? -1 : 1;
    return cobertura(x) - cobertura(y);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEOS
// ═══════════════════════════════════════════════════════════════════════════

export function diferenciaLinea(l: LineaConteo): number {
  return l.contado === null ? 0 : l.contado - l.esperado;
}

export function progresoConteo(c: Pick<Conteo, "lineas">): { contadas: number; total: number } {
  return { contadas: c.lineas.filter((l) => l.contado !== null).length, total: c.lineas.length };
}

export function lineasConDiferencia(c: Pick<Conteo, "lineas">): LineaConteo[] {
  return c.lineas.filter((l) => diferenciaLinea(l) !== 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMATO
// ═══════════════════════════════════════════════════════════════════════════

const FORMATO_COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const FORMATO_ENTERO = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

export function formatearMoneda(valor: number): string {
  return FORMATO_COP.format(valor);
}

export function formatearEntero(valor: number): string {
  return FORMATO_ENTERO.format(valor);
}

/** «−3», «+12»: para diferencias y ajustes, donde el signo es el dato. */
export function formatearDelta(valor: number): string {
  if (valor === 0) return "0";
  return `${valor > 0 ? "+" : "−"}${FORMATO_ENTERO.format(Math.abs(valor))}`;
}

export function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * «hoy», «ayer», «hace 3 días», «en 5 días», y la fecha a partir de dos semanas.
 * Compara días de calendario, no horas: algo de ayer a las 23:50 es «ayer».
 */
export function fechaRelativa(iso: string, ahora: Date = new Date()): string {
  const d = new Date(iso);
  const dia = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dias = Math.round((dia(d) - dia(ahora)) / 86_400_000);
  if (dias === 0) return "hoy";
  if (dias === -1) return "ayer";
  if (dias === 1) return "mañana";
  if (dias < 0 && dias > -14) return `hace ${-dias} días`;
  if (dias > 0 && dias < 14) return `en ${dias} días`;
  return formatearFecha(iso);
}

export function formatearHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

export function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
