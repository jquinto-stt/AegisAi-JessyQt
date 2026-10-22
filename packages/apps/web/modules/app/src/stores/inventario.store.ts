/**
 * InventarioStore — estado del módulo Inventario.
 *
 * Orquesta, no decide: las reglas (qué deja un movimiento, cuánto reponer, qué
 * estado toma una orden tras recibirla) viven en `inventario.domain.ts`. Aquí se
 * valida con ellas, se escribe el resultado y se deja rastro en el libro de
 * movimientos.
 *
 * **Las existencias solo cambian por `registrarMovimiento`.** Recibir una orden
 * y aplicar un conteo no tocan `existencias` directamente: generan movimientos,
 * así el historial explica siempre cada unidad.
 *
 * Los datos viven en memoria (seed de demo). Cuando el módulo tenga tablas en
 * Supabase, este store es el único sitio que cambia.
 */
import { makeAutoObservable } from "mobx";
import {
  aplicarMovimiento,
  colaReorden,
  estadoStock,
  estadoTrasRecepcion,
  ordenAbierta,
  siguienteNumero,
  stockTotal,
  unidadesPendientes,
  valorArticulo,
  type Articulo,
  type ConfigInventario,
  type Conteo,
  type DatosMovimiento,
  type ItemReorden,
  type LineaOrdenCompra,
  type Movimiento,
  type OrdenCompra,
  type Proveedor,
  type Ubicacion,
} from "@/domain/inventario/inventario.domain";
import {
  ARTICULOS_SEED,
  CONFIG_SEED,
  CONTEOS_SEED,
  MOVIMIENTOS_SEED,
  ORDENES_SEED,
  PROVEEDORES_SEED,
  UBICACIONES_SEED,
} from "@/stores/inventario.seed";
import { organizacionStore } from "@/stores/organizacion.store";

export type Resultado<T = void> = { ok: true; valor: T } | { ok: false; error: string };

const ok = <T,>(valor: T): Resultado<T> => ({ ok: true, valor });
const fallo = (error: string): Resultado<never> => ({ ok: false, error });

export type DatosArticulo = Omit<Articulo, "id" | "existencias" | "activo">;
export type DatosProveedor = Omit<Proveedor, "id" | "activo">;

export interface DatosRegistroMovimiento extends DatosMovimiento {
  motivo: string;
  referencia?: string | null;
}

export interface DatosOrdenCompra {
  proveedorId: string;
  destinoId: string;
  fechaEsperada: string | null;
  lineas: Omit<LineaOrdenCompra, "recibida">[];
  notas: string;
}

const clonar = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

let secuencia = 0;
const nuevoId = (prefijo: string) => `${prefijo}-${Date.now().toString(36)}-${(secuencia++).toString(36)}`;

export class InventarioStore {
  ubicaciones: Ubicacion[] = [];
  proveedores: Proveedor[] = [];
  articulos: Articulo[] = [];
  movimientos: Movimiento[] = [];
  ordenes: OrdenCompra[] = [];
  conteos: Conteo[] = [];
  config: ConfigInventario = clonar(CONFIG_SEED);

  /**
   * @param responsable Nombre de quien opera, para el libro de movimientos. Se
   *   inyecta para que los tests no dependan de la sesión.
   */
  constructor(private readonly responsable: () => string = () => "Usuario") {
    this.restablecer();
    makeAutoObservable<InventarioStore, "responsable">(this, { responsable: false });
  }

  /** Vuelve al seed de demo. */
  restablecer() {
    this.ubicaciones = clonar(UBICACIONES_SEED);
    this.proveedores = clonar(PROVEEDORES_SEED);
    this.articulos = clonar(ARTICULOS_SEED);
    this.movimientos = clonar(MOVIMIENTOS_SEED);
    this.ordenes = clonar(ORDENES_SEED);
    this.conteos = clonar(CONTEOS_SEED);
    this.config = clonar(CONFIG_SEED);
  }

  // ── Búsquedas ───────────────────────────────────────────────────────────

  articulo(id: string): Articulo | undefined {
    return this.articulos.find((a) => a.id === id);
  }

  proveedor(id: string | null): Proveedor | undefined {
    return id ? this.proveedores.find((p) => p.id === id) : undefined;
  }

  ubicacion(id: string | null): Ubicacion | undefined {
    return id ? this.ubicaciones.find((u) => u.id === id) : undefined;
  }

  orden(id: string): OrdenCompra | undefined {
    return this.ordenes.find((o) => o.id === id);
  }

  conteo(id: string): Conteo | undefined {
    return this.conteos.find((c) => c.id === id);
  }

  nombreUbicacion(id: string | null): string {
    return this.ubicacion(id)?.nombre ?? "—";
  }

  nombreProveedor(id: string | null): string {
    return this.proveedor(id)?.nombre ?? "Sin proveedor";
  }

  // ── Derivados ───────────────────────────────────────────────────────────

  get articulosActivos(): Articulo[] {
    return this.articulos.filter((a) => a.activo);
  }

  get ubicacionesActivas(): Ubicacion[] {
    return this.ubicaciones.filter((u) => u.activa);
  }

  get proveedoresActivos(): Proveedor[] {
    return this.proveedores.filter((p) => p.activo);
  }

  /** Movimientos del más reciente al más antiguo. */
  get movimientosRecientes(): Movimiento[] {
    return [...this.movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  get colaReorden(): ItemReorden[] {
    return colaReorden(this.articulos, this.ordenes, {
      descontarEnTransito: this.config.descontarEnTransito,
      multiplo: this.config.multiploPedido,
    });
  }

  /** Último conteo aplicado de cada ubicación activa; `null` = nunca se ha contado. */
  get ultimoConteoPorUbicacion(): { ubicacion: Ubicacion; ultimo: Conteo | null; abierto: Conteo | null }[] {
    return this.ubicacionesActivas.map((u) => {
      const deAqui = this.conteos.filter((c) => c.ubicacionId === u.id);
      const ultimo = deAqui.filter((c) => c.estado === "aplicado").sort((a, b) => b.fecha.localeCompare(a.fecha))[0] ?? null;
      const abierto = deAqui.find((c) => c.estado === "en_progreso" || c.estado === "en_revision") ?? null;
      return { ubicacion: u, ultimo, abierto };
    });
  }

  /** Ubicación donde entra la mercancía por defecto (la configurada, o el primer almacén activo). */
  get ubicacionRecepcion(): Ubicacion | undefined {
    const conf = this.ubicacion(this.config.ubicacionRecepcionId);
    if (conf?.activa) return conf;
    return this.ubicacionesActivas.find((u) => u.tipo === "almacen") ?? this.ubicacionesActivas[0];
  }

  get resumen() {
    const activos = this.articulosActivos;
    let agotados = 0;
    let bajos = 0;
    let unidades = 0;
    let valor = 0;
    for (const a of activos) {
      const e = estadoStock(a);
      if (e === "agotado") agotados++;
      else if (e === "bajo") bajos++;
      unidades += stockTotal(a);
      valor += valorArticulo(a);
    }
    const abiertas = this.ordenes.filter(ordenAbierta);
    return {
      skus: activos.length,
      unidades,
      valor,
      agotados,
      bajos,
      ordenesAbiertas: abiertas.length,
      valorEnTransito: abiertas.reduce(
        (s, oc) => s + oc.lineas.reduce((t, l) => t + unidadesPendientes(l) * l.costoUnitario, 0),
        0,
      ),
      conteosAbiertos: this.conteos.filter((c) => c.estado === "en_progreso" || c.estado === "en_revision").length,
    };
  }

  /** Valor y alertas por categoría, de mayor a menor valor. */
  get valorPorCategoria() {
    const mapa = new Map<string, { categoria: string; valor: number; skus: number; alertas: number }>();
    for (const a of this.articulosActivos) {
      const fila = mapa.get(a.categoria) ?? { categoria: a.categoria, valor: 0, skus: 0, alertas: 0 };
      fila.valor += valorArticulo(a);
      fila.skus++;
      const e = estadoStock(a);
      if (e === "agotado" || e === "bajo") fila.alertas++;
      mapa.set(a.categoria, fila);
    }
    return [...mapa.values()].sort((x, y) => y.valor - x.valor);
  }

  /** Stock y valor por ubicación activa, de mayor a menor valor. */
  get stockPorUbicacion() {
    return this.ubicacionesActivas
      .map((u) => {
        let skus = 0;
        let unidades = 0;
        let valor = 0;
        for (const a of this.articulosActivos) {
          const n = a.existencias[u.id] ?? 0;
          if (n <= 0) continue;
          skus++;
          unidades += n;
          valor += n * a.costoUnitario;
        }
        return { ubicacion: u, skus, unidades, valor };
      })
      .sort((x, y) => y.valor - x.valor);
  }

  // ── Artículos ───────────────────────────────────────────────────────────

  private validarArticulo(d: DatosArticulo, idActual?: string): string | null {
    if (!d.sku.trim()) return "El SKU es obligatorio.";
    if (!d.nombre.trim()) return "El nombre es obligatorio.";
    const sku = d.sku.trim().toUpperCase();
    if (this.articulos.some((a) => a.sku === sku && a.id !== idActual)) return `Ya existe un artículo con el SKU ${sku}.`;
    if (d.costoUnitario < 0) return "El costo no puede ser negativo.";
    if (d.puntoReorden < 0 || d.stockMaximo < 0) return "Los niveles de stock no pueden ser negativos.";
    if (d.stockMaximo > 0 && d.stockMaximo <= d.puntoReorden) return "El stock máximo debe ser mayor que el punto de reorden.";
    return null;
  }

  crearArticulo(d: DatosArticulo): Resultado<Articulo> {
    const error = this.validarArticulo(d);
    if (error) return fallo(error);
    const articulo: Articulo = { ...d, sku: d.sku.trim().toUpperCase(), nombre: d.nombre.trim(), id: nuevoId("art"), existencias: {}, activo: true };
    this.articulos.push(articulo);
    return ok(articulo);
  }

  actualizarArticulo(id: string, d: DatosArticulo): Resultado<Articulo> {
    const a = this.articulo(id);
    if (!a) return fallo("El artículo ya no existe.");
    const error = this.validarArticulo(d, id);
    if (error) return fallo(error);
    Object.assign(a, d, { sku: d.sku.trim().toUpperCase(), nombre: d.nombre.trim() });
    return ok(a);
  }

  /** Archivar no borra: el artículo sale de la operación pero conserva su historial. */
  alternarArticuloActivo(id: string): Resultado {
    const a = this.articulo(id);
    if (!a) return fallo("El artículo ya no existe.");
    a.activo = !a.activo;
    return ok(undefined);
  }

  // ── Movimientos ─────────────────────────────────────────────────────────

  registrarMovimiento(d: DatosRegistroMovimiento): Resultado<Movimiento> {
    const a = this.articulo(d.articuloId);
    if (!a) return fallo("Selecciona un artículo.");
    if (!a.activo) return fallo("El artículo está archivado.");
    if (!d.motivo.trim()) return fallo("Indica el motivo del movimiento.");
    if (d.tipo === "salida" && this.config.referenciaObligatoriaSalidas && !d.referencia?.trim()) {
      return fallo("Las salidas necesitan un documento de referencia (pedido o remisión).");
    }
    const r = aplicarMovimiento(a.existencias, d);
    if (!r.ok) return r;
    a.existencias = r.existencias;
    const m: Movimiento = {
      id: nuevoId("mv"),
      fecha: new Date().toISOString(),
      tipo: d.tipo,
      articuloId: d.articuloId,
      cantidad: d.cantidad,
      origenId: d.tipo === "salida" || d.tipo === "transferencia" ? d.origenId : null,
      destinoId: d.tipo === "salida" ? null : d.destinoId,
      motivo: d.motivo.trim(),
      referencia: d.referencia?.trim() || null,
      responsable: this.responsable(),
    };
    this.movimientos.push(m);
    return ok(m);
  }

  // ── Proveedores ─────────────────────────────────────────────────────────

  private validarProveedor(d: DatosProveedor): string | null {
    if (!d.nombre.trim()) return "El nombre es obligatorio.";
    if (d.plazoEntregaDias < 0) return "El plazo de entrega no puede ser negativo.";
    return null;
  }

  crearProveedor(d: DatosProveedor): Resultado<Proveedor> {
    const error = this.validarProveedor(d);
    if (error) return fallo(error);
    const p: Proveedor = { ...d, nombre: d.nombre.trim(), id: nuevoId("pv"), activo: true };
    this.proveedores.push(p);
    return ok(p);
  }

  actualizarProveedor(id: string, d: DatosProveedor): Resultado<Proveedor> {
    const p = this.proveedor(id);
    if (!p) return fallo("El proveedor ya no existe.");
    const error = this.validarProveedor(d);
    if (error) return fallo(error);
    Object.assign(p, d, { nombre: d.nombre.trim() });
    return ok(p);
  }

  alternarProveedorActivo(id: string): Resultado {
    const p = this.proveedor(id);
    if (!p) return fallo("El proveedor ya no existe.");
    p.activo = !p.activo;
    return ok(undefined);
  }

  // ── Órdenes de compra ───────────────────────────────────────────────────

  crearOrdenCompra(d: DatosOrdenCompra): Resultado<OrdenCompra> {
    if (!this.proveedor(d.proveedorId)) return fallo("Selecciona un proveedor.");
    if (!this.ubicacion(d.destinoId)) return fallo("Selecciona la ubicación de destino.");
    const lineas = d.lineas.filter((l) => l.cantidad > 0);
    if (lineas.length === 0) return fallo("Agrega al menos un artículo con cantidad.");
    if (lineas.some((l) => !Number.isInteger(l.cantidad))) return fallo("Las cantidades deben ser enteras.");
    const oc: OrdenCompra = {
      id: nuevoId("oc"),
      numero: siguienteNumero(this.config.prefijoOrdenCompra, this.ordenes.map((o) => o.numero)),
      proveedorId: d.proveedorId,
      estado: "borrador",
      fechaCreacion: new Date().toISOString(),
      fechaEsperada: d.fechaEsperada,
      destinoId: d.destinoId,
      lineas: lineas.map((l) => ({ ...l, recibida: 0 })),
      notas: d.notas.trim(),
    };
    this.ordenes.push(oc);
    return ok(oc);
  }

  enviarOrden(id: string): Resultado {
    const oc = this.orden(id);
    if (!oc) return fallo("La orden ya no existe.");
    if (oc.estado !== "borrador") return fallo("Solo se envía una orden en borrador.");
    oc.estado = "enviada";
    if (!oc.fechaEsperada) {
      const plazo = this.proveedor(oc.proveedorId)?.plazoEntregaDias ?? 0;
      const f = new Date();
      f.setDate(f.getDate() + plazo);
      oc.fechaEsperada = f.toISOString();
    }
    return ok(undefined);
  }

  cancelarOrden(id: string): Resultado {
    const oc = this.orden(id);
    if (!oc) return fallo("La orden ya no existe.");
    if (oc.estado === "recibida" || oc.estado === "cancelada") return fallo("Esta orden ya está cerrada.");
    oc.estado = "cancelada";
    return ok(undefined);
  }

  /**
   * Registra lo que llegó. `recepcion` es artículo → unidades recibidas AHORA
   * (no acumuladas). Cada línea con unidades genera una entrada al destino.
   */
  recibirOrden(id: string, recepcion: Record<string, number>): Resultado<OrdenCompra> {
    const oc = this.orden(id);
    if (!oc) return fallo("La orden ya no existe.");
    if (!ordenAbierta(oc)) return fallo("Solo se recibe una orden enviada o parcial.");

    const aplicar: { linea: LineaOrdenCompra; n: number }[] = [];
    for (const linea of oc.lineas) {
      const n = recepcion[linea.articuloId] ?? 0;
      if (n === 0) continue;
      if (!Number.isInteger(n) || n < 0) return fallo("Las cantidades recibidas deben ser enteros positivos.");
      const art = this.articulo(linea.articuloId);
      if (n > unidadesPendientes(linea)) {
        return fallo(`Se reciben más unidades de las pendientes en ${art?.nombre ?? "un artículo"}.`);
      }
      // Se comprueba antes de mover nada: si una entrada fallara a mitad del
      // bucle, la orden quedaría con unas líneas recibidas y otras no.
      if (!art?.activo) return fallo(`${art?.nombre ?? "Un artículo"} está archivado; reactívalo para recibirlo.`);
      aplicar.push({ linea, n });
    }
    if (aplicar.length === 0) return fallo("Indica al menos una cantidad recibida.");

    for (const { linea, n } of aplicar) {
      const r = this.registrarMovimiento({
        tipo: "entrada",
        articuloId: linea.articuloId,
        cantidad: n,
        origenId: null,
        destinoId: oc.destinoId,
        motivo: "Recepción de orden de compra",
        referencia: oc.numero,
      });
      if (!r.ok) return r;
      linea.recibida += n;
    }
    oc.estado = estadoTrasRecepcion(oc.lineas);
    if (oc.estado === "recibida") oc.fechaRecepcion = new Date().toISOString();
    return ok(oc);
  }

  /**
   * Convierte artículos de la cola en órdenes en borrador, una por proveedor.
   * Los artículos sin proveedor o sin cantidad sugerida se omiten y se cuentan.
   * `notas` se suma a la nota por defecto de la configuración; si viene vacía,
   * las órdenes usan solo la nota configurada.
   */
  generarOrdenesDesdeReorden(
    articuloIds: string[],
    /** Cantidades editadas a mano; las ausentes toman la sugerida. */
    cantidades: Record<string, number> = {},
    notas?: string,
  ): Resultado<{ ordenes: OrdenCompra[]; omitidos: number }> {
    const cola = this.colaReorden
      .filter((i) => articuloIds.includes(i.articulo.id))
      .map((i) => (i.articulo.id in cantidades ? { ...i, sugerido: Math.max(0, Math.floor(cantidades[i.articulo.id])) } : i));
    const porProveedor = new Map<string, ItemReorden[]>();
    let omitidos = 0;
    for (const item of cola) {
      const pid = item.articulo.proveedorId;
      if (!pid || item.sugerido <= 0 || !this.proveedor(pid)?.activo) {
        omitidos++;
        continue;
      }
      porProveedor.set(pid, [...(porProveedor.get(pid) ?? []), item]);
    }
    if (porProveedor.size === 0) return fallo("Ninguno de los artículos tiene proveedor activo y cantidad por pedir.");

    const destino = this.ubicacionRecepcion;
    if (!destino) return fallo("No hay ninguna ubicación activa donde recibir.");
    const nota = notas?.trim();
    const creadas: OrdenCompra[] = [];
    for (const [proveedorId, items] of porProveedor) {
      const r = this.crearOrdenCompra({
        proveedorId,
        destinoId: destino.id,
        fechaEsperada: null,
        lineas: items.map((i) => ({ articuloId: i.articulo.id, cantidad: i.sugerido, costoUnitario: i.articulo.costoUnitario })),
        notas: nota || this.config.notasOrdenPorDefecto,
      });
      if (r.ok) creadas.push(r.valor);
    }
    return ok({ ordenes: creadas, omitidos });
  }

  // ── Conteos ─────────────────────────────────────────────────────────────

  /** Abre un conteo con todos los artículos activos que tienen o tuvieron stock en la ubicación. */
  crearConteo(ubicacionId: string, notas = ""): Resultado<Conteo> {
    if (!this.ubicacion(ubicacionId)) return fallo("Selecciona una ubicación.");
    if (this.conteos.some((c) => c.ubicacionId === ubicacionId && (c.estado === "en_progreso" || c.estado === "en_revision"))) {
      return fallo("Ya hay un conteo abierto en esa ubicación.");
    }
    const lineas = this.articulosActivos
      .filter((a) => ubicacionId in a.existencias)
      .map((a) => ({ articuloId: a.id, esperado: a.existencias[ubicacionId] ?? 0, contado: null }));
    if (lineas.length === 0) return fallo("No hay artículos registrados en esa ubicación.");
    const c: Conteo = {
      id: nuevoId("cnt"),
      numero: siguienteNumero("CNT", this.conteos.map((x) => x.numero)),
      ubicacionId,
      estado: "en_progreso",
      fecha: new Date().toISOString(),
      responsable: this.responsable(),
      lineas,
      notas: notas.trim(),
    };
    this.conteos.push(c);
    return ok(c);
  }

  registrarConteoLinea(conteoId: string, articuloId: string, contado: number | null): Resultado {
    const c = this.conteo(conteoId);
    if (!c) return fallo("El conteo ya no existe.");
    if (c.estado !== "en_progreso") return fallo("El conteo ya no admite cambios.");
    if (contado !== null && (!Number.isInteger(contado) || contado < 0)) return fallo("El conteo debe ser un entero mayor o igual a cero.");
    const l = c.lineas.find((x) => x.articuloId === articuloId);
    if (!l) return fallo("El artículo no está en este conteo.");
    l.contado = contado;
    return ok(undefined);
  }

  enviarConteoARevision(id: string): Resultado {
    const c = this.conteo(id);
    if (!c) return fallo("El conteo ya no existe.");
    if (c.estado !== "en_progreso") return fallo("Solo se envía a revisión un conteo en progreso.");
    if (c.lineas.some((l) => l.contado === null)) return fallo("Faltan artículos por contar.");
    c.estado = "en_revision";
    return ok(undefined);
  }

  /**
   * Aplica las diferencias como ajustes. Si la configuración exige revisión, el
   * conteo debe pasar antes por `en_revision`.
   */
  aplicarConteo(id: string): Resultado<{ ajustes: number }> {
    const c = this.conteo(id);
    if (!c) return fallo("El conteo ya no existe.");
    if (c.estado === "aplicado" || c.estado === "anulado") return fallo("Este conteo ya está cerrado.");
    if (c.lineas.some((l) => l.contado === null)) return fallo("Faltan artículos por contar.");
    if (this.config.requiereRevisionConteos && c.estado !== "en_revision") {
      return fallo("La configuración exige enviar el conteo a revisión antes de aplicarlo.");
    }

    let ajustes = 0;
    for (const l of c.lineas) {
      const a = this.articulo(l.articuloId);
      if (!a) continue;
      // La diferencia se calcula contra el stock ACTUAL, no contra el esperado
      // al abrir: si hubo movimientos durante el conteo, el ajuste deja la
      // ubicación exactamente en lo contado.
      const delta = (l.contado ?? 0) - (a.existencias[c.ubicacionId] ?? 0);
      if (delta === 0) continue;
      const r = this.registrarMovimiento({
        tipo: "ajuste",
        articuloId: a.id,
        cantidad: delta,
        origenId: null,
        destinoId: c.ubicacionId,
        motivo: "Conteo físico",
        referencia: c.numero,
      });
      if (!r.ok) return r;
      ajustes++;
    }
    c.estado = "aplicado";
    return ok({ ajustes });
  }

  anularConteo(id: string): Resultado {
    const c = this.conteo(id);
    if (!c) return fallo("El conteo ya no existe.");
    if (c.estado === "aplicado" || c.estado === "anulado") return fallo("Este conteo ya está cerrado.");
    c.estado = "anulado";
    return ok(undefined);
  }

  // ── Configuración ───────────────────────────────────────────────────────

  guardarConfig(parcial: Partial<ConfigInventario>): Resultado {
    const c = { ...this.config, ...parcial };
    const entero = (n: number) => Number.isInteger(n);
    if (!/^[A-Z]{1,5}$/.test(c.prefijoOrdenCompra)) return fallo("El prefijo debe tener de 1 a 5 letras mayúsculas.");
    if (!entero(c.diasCobertura) || c.diasCobertura < 1) return fallo("Los días de cobertura deben ser un entero de al menos 1.");
    if (!entero(c.multiploPedido) || c.multiploPedido < 1) return fallo("El múltiplo de pedido debe ser un entero de al menos 1.");
    if (!entero(c.puntoReordenPorDefecto) || c.puntoReordenPorDefecto < 0) return fallo("El punto de reorden por defecto no puede ser negativo.");
    if (!entero(c.stockMaximoPorDefecto) || c.stockMaximoPorDefecto <= c.puntoReordenPorDefecto) {
      return fallo("El stock máximo por defecto debe ser mayor que el punto de reorden por defecto.");
    }
    if (!(c.umbralDiferenciaPct >= 0 && c.umbralDiferenciaPct <= 100)) return fallo("El umbral de diferencia va de 0 a 100 %.");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.horaResumen)) return fallo("La hora del resumen debe tener el formato HH:MM.");
    if (c.alertaWhatsapp && !/^\+\d[\d ]{7,16}$/.test(c.whatsappDestino.trim())) {
      return fallo("Para las alertas por WhatsApp escribe un número con indicativo, p. ej. +57 300 123 4567.");
    }
    const recepcion = this.ubicacion(c.ubicacionRecepcionId);
    if (!recepcion?.activa) return fallo("La ubicación de recepción debe ser una ubicación activa.");
    for (const [tipo, lista] of Object.entries(c.motivos)) {
      if (lista.length === 0) return fallo(`Deja al menos un motivo para «${tipo}».`);
    }
    this.config = { ...c, whatsappDestino: c.whatsappDestino.trim() };
    return ok(undefined);
  }

  agregarCategoria(nombre: string): Resultado {
    const n = nombre.trim();
    if (!n) return fallo("Escribe el nombre de la categoría.");
    if (this.config.categorias.some((c) => c.toLowerCase() === n.toLowerCase())) return fallo("Esa categoría ya existe.");
    this.config.categorias.push(n);
    return ok(undefined);
  }

  /** Renombra la categoría y la cambia en todos sus artículos. */
  renombrarCategoria(actual: string, nuevo: string): Resultado {
    const n = nuevo.trim();
    if (!n) return fallo("Escribe el nuevo nombre.");
    if (n === actual) return ok(undefined);
    if (this.config.categorias.some((c) => c !== actual && c.toLowerCase() === n.toLowerCase())) return fallo("Esa categoría ya existe.");
    this.config.categorias = this.config.categorias.map((c) => (c === actual ? n : c));
    for (const a of this.articulos) if (a.categoria === actual) a.categoria = n;
    return ok(undefined);
  }

  eliminarCategoria(nombre: string): Resultado {
    if (this.articulos.some((a) => a.categoria === nombre)) return fallo("Hay artículos en esa categoría; muévelos antes de eliminarla.");
    this.config.categorias = this.config.categorias.filter((c) => c !== nombre);
    return ok(undefined);
  }

  agregarUbicacion(d: Pick<Ubicacion, "nombre" | "tipo">): Resultado<Ubicacion> {
    const nombre = d.nombre.trim();
    if (!nombre) return fallo("Escribe el nombre de la ubicación.");
    if (this.ubicaciones.some((u) => u.nombre.toLowerCase() === nombre.toLowerCase())) return fallo("Ya existe una ubicación con ese nombre.");
    const u: Ubicacion = { id: nuevoId("ub"), nombre, tipo: d.tipo, activa: true };
    this.ubicaciones.push(u);
    return ok(u);
  }

  actualizarUbicacion(id: string, d: Pick<Ubicacion, "nombre" | "tipo">): Resultado<Ubicacion> {
    const u = this.ubicacion(id);
    if (!u) return fallo("La ubicación ya no existe.");
    const nombre = d.nombre.trim();
    if (!nombre) return fallo("Escribe el nombre de la ubicación.");
    if (this.ubicaciones.some((x) => x.id !== id && x.nombre.toLowerCase() === nombre.toLowerCase())) return fallo("Ya existe una ubicación con ese nombre.");
    u.nombre = nombre;
    u.tipo = d.tipo;
    return ok(u);
  }

  /** Una ubicación con stock no se desactiva: el stock quedaría invisible. */
  alternarUbicacionActiva(id: string): Resultado {
    const u = this.ubicacion(id);
    if (!u) return fallo("La ubicación ya no existe.");
    if (u.activa && this.config.ubicacionRecepcionId === id) {
      return fallo("Es la ubicación de recepción; elige otra en Configuración › General antes de desactivarla.");
    }
    if (u.activa && this.articulos.some((a) => (a.existencias[id] ?? 0) > 0)) {
      return fallo("La ubicación tiene stock; transfiérelo antes de desactivarla.");
    }
    u.activa = !u.activa;
    return ok(undefined);
  }
}

function nombreDeSesion(): string {
  const u = organizacionStore.usuario;
  const nombre = u ? `${u.nombre} ${u.apellido}`.trim() : "";
  return nombre || "Usuario";
}

export const inventarioStore = new InventarioStore(nombreDeSesion);
