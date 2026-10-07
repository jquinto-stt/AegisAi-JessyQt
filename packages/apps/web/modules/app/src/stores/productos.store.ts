import { makeAutoObservable } from "mobx";

import {
  cantidadTotal,
  codigoProductoDuplicado,
  repartirEnSedes,
  resumenDeCatalogo,
  revisarProducto,
  sanearNumero,
  semaforoDe,
  type AjusteStock,
  type EstadoOrdenCompra,
  type ExistenciaSede,
  type OrdenCompra,
  type Producto,
  type Proveedor,
  type ResumenCatalogo,
  type Sede,
  type SemaforoDisponibilidad,
  type TipoImpuesto,
  type UnidadMedida,
} from "@/domain/inventarios/productos.domain";
import {
  AJUSTES_SEED,
  CATEGORIAS_SEED,
  EXISTENCIAS_SEED,
  ORDENES_SEED,
  PRODUCTOS_SEED,
  PROVEEDORES_SEED,
  SEDES_SEED,
} from "@/stores/productos.seed";

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTOS STORE — el catálogo de lo que se vende
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Qué es este store, y qué NO es ────────────────────────────────────────
//
// Es dueño de TRES colecciones: productos, sedes y existencias. El semáforo y
// el resumen **no** se guardan: se derivan en getters, porque un estado
// almacenado es un estado que puede quedar desfasado de la cantidad que lo
// produjo. Un producto guardado como «agotado» seguiría diciendo «agotado»
// después de recibir mercancía.
//
// ── Lo que este store NO hace ─────────────────────────────────────────────
//
// 1. **No decide permisos.** No conoce capacidades ni roles. La capa de acceso
//    decide si el botón existe; el store decide si la operación es legal.
// 2. **No importa ningún otro store.** Ni `sessionStore`, ni `pedidosStore`.
//    Eso permite probarlo sin montar el árbol de la aplicación — y es la razón
//    de que el resumen se calcule sobre estos datos y no sobre ventas: los
//    pedidos viven en otro store y este módulo no los mira.
// 3. **No persiste.** Mismo criterio que el resto del mock. Las fotos son
//    `dataUrl` de cientos de KB: un `localStorage` aquí reventaría la cuota
//    del navegador a la tercera imagen y daría la ilusión de que sobreviven.
//
// ── Las mutaciones comprueban el DATO, no el permiso ──────────────────────
//
// `crearProducto` rechaza un código repetido aunque quien llame sea un
// administrador. La autorización decide si el botón se pinta; el store decide
// si lo que se va a guardar tiene sentido. Son dos preguntas distintas.

/** Resultado de una mutación, con su motivo legible. No se lanza: se devuelve. */
export interface ResultadoGuardado {
  ok: boolean;
  motivo?: string;
  /** Id del producto afectado, para que la UI pueda navegar o marcarlo. */
  id?: string;
}

/**
 * Lo que la UI recoge del formulario.
 *
 * Los números llegan como **texto** porque es lo que hay en un `<input>`; el
 * store los saneaba con `sanearNumero`, que convierte `""` en `null` y nunca en
 * `0`. Acepta `number` también para que la ficha pueda guardar sin reformatear.
 */
export interface DatosProducto {
  nombre: string;
  codigo: string;
  codigoBarras?: string | null;
  categoria: string;
  precioCompra: string | number | null;
  precioVenta?: string | number | null;
  impuesto?: TipoImpuesto;
  publicarEnCatalogo?: boolean;
  descripcion?: string | null;
  cantidadInicial: string | number | null;
  minimo: string | number | null;
  unidad: UnidadMedida;
  vencimiento: string | null;
  imagenDataUrl: string | null;
}

const nuevoId = (prefijo: string) =>
  `${prefijo}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

export class ProductosStore {
  // ── Estado ────────────────────────────────────────────────────────────────

  productos: Producto[] = PRODUCTOS_SEED.map((p) => ({ ...p }));
  sedes: Sede[] = SEDES_SEED.map((s) => ({ ...s }));
  existencias: ExistenciaSede[] = EXISTENCIAS_SEED.map((e) => ({ ...e }));
  proveedores: Proveedor[] = PROVEEDORES_SEED.map((p) => ({ ...p }));
  ordenes: OrdenCompra[] = ORDENES_SEED.map((o) => ({ ...o }));
  ajustes: AjusteStock[] = AJUSTES_SEED.map((a) => ({ ...a }));

  /**
   * Categorías que ofrece el desplegable.
   *
   * **Sugerencias, no catálogo cerrado**: guardar una categoría nueva la añade
   * aquí, de modo que la segunda vez ya se puede elegir sin volver a escribirla.
   */
  categorias: string[] = [...CATEGORIAS_SEED];

  constructor() {
    makeAutoObservable(this);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // LECTURA
  // ═════════════════════════════════════════════════════════════════════════

  /** Los que están en uso. Un producto dado de baja no se ofrece para vender. */
  get productosActivos(): Producto[] {
    return this.productos.filter((p) => p.estado === "activo");
  }

  /** Orden estable por nombre, que es como el usuario busca en la tabla. */
  get productosOrdenados(): Producto[] {
    return [...this.productosActivos].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es"),
    );
  }

  get sedesActivas(): Sede[] {
    return this.sedes.filter((s) => s.estado === "activa");
  }

  /** Los cuatro números de la tarjeta de resumen. Derivados, nunca guardados. */
  get resumen(): ResumenCatalogo {
    return resumenDeCatalogo(this.productos, this.existencias);
  }

  productoPorId(id: string | null | undefined): Producto | undefined {
    if (!id) return undefined;
    return this.productos.find((p) => p.id === id);
  }

  sedePorId(id: string | null | undefined): Sede | undefined {
    if (!id) return undefined;
    return this.sedes.find((s) => s.id === id);
  }

  nombreDeSede(id: string): string {
    return this.sedePorId(id)?.nombre ?? "Sede desconocida";
  }

  /** Cuánto hay de un producto. Con `sedes`, solo lo de esas sedes. */
  cantidadDe(productoId: string, sedes?: readonly string[]): number {
    return cantidadTotal(this.existencias, productoId, sedes);
  }

  /** El estado del semáforo de un producto. Derivado en cada lectura. */
  semaforoDe(producto: Producto, sedes?: readonly string[]): SemaforoDisponibilidad {
    return semaforoDe(this.cantidadDe(producto.id, sedes), producto.minimo);
  }

  /** El desglose por sede, en el orden de las sedes declaradas. */
  existenciasDe(productoId: string): { sede: Sede; cantidad: number }[] {
    return this.sedes.map((sede) => ({
      sede,
      cantidad:
        this.existencias.find(
          (e) => e.productoId === productoId && e.sedeId === sede.id,
        )?.cantidad ?? 0,
    }));
  }

  /** ¿Hay algún producto que exija atención? Alimenta el contador del resumen. */
  get hayAlertas(): boolean {
    const r = this.resumen;
    return r.porAgotar > 0 || r.agotados > 0;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MUTACIONES
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Alta de producto.
   *
   * El orden importa: primero se sanea (texto → número o `null`), después se
   * revisa el resultado ya saneado, y solo entonces se comprueba el código
   * repetido. Al revés, un código vacío se leería como «repetido» contra el
   * primer producto sin código que hubiera.
   */
  crearProducto(datos: DatosProducto): ResultadoGuardado {
    const precioCompra = sanearNumero(datos.precioCompra);
    const cantidadInicial = sanearNumero(datos.cantidadInicial);
    const minimo = sanearNumero(datos.minimo);
    const nombre = datos.nombre.trim();
    const codigo = datos.codigo.trim();
    const categoria = datos.categoria.trim();

    const revision = revisarProducto({
      nombre,
      codigo,
      precioCompra,
      cantidadInicial,
      minimo,
      vencimiento: datos.vencimiento,
    });
    if (!revision.ok) return { ok: false, motivo: revision.motivo ?? "Datos incompletos" };

    const repetido = codigoProductoDuplicado(codigo, this.productos);
    if (repetido) {
      return {
        ok: false,
        motivo: `El código «${codigo}» ya lo usa «${repetido.nombre}». Usa otro.`,
      };
    }

    const precioVenta = sanearNumero(datos.precioVenta);

    const producto: Producto = {
      id: nuevoId("prod"),
      codigo,
      codigoBarras: datos.codigoBarras?.trim() || null,
      nombre,
      categoria: categoria.length > 0 ? categoria : "Sin categoría",
      precioCompra: precioCompra as number,
      precioVenta: precioVenta !== null ? precioVenta : Math.round((precioCompra as number) * 1.3),
      impuesto: datos.impuesto ?? "iva_19",
      publicarEnCatalogo: datos.publicarEnCatalogo ?? true,
      descripcion: datos.descripcion?.trim() || null,
      minimo: minimo as number,
      unidad: datos.unidad,
      vencimiento: datos.vencimiento,
      imagenDataUrl: datos.imagenDataUrl,
      estado: "activo",
      createdAt: new Date().toISOString(),
    };

    this.productos.push(producto);
    this.existencias.push(
      ...repartirEnSedes(producto.id, cantidadInicial as number, this.sedes),
    );
    if (!this.categorias.includes(producto.categoria)) {
      this.categorias = [...this.categorias, producto.categoria].sort((a, b) =>
        a.localeCompare(b, "es"),
      );
    }

    return { ok: true, id: producto.id };
  }

  /**
   * Edición de producto. La cantidad **no** se toca aquí.
   *
   * Cambiar la cantidad es un movimiento de existencias, no una edición de
   * ficha: se hace desde el desglose por sede, donde queda claro de qué sede
   * sale o a cuál entra. Permitir editar el total desde el formulario de ficha
   * haría que un ajuste de 200 unidades no dijera dónde ocurrió.
   */
  actualizarProducto(id: string, datos: DatosProducto): ResultadoGuardado {
    const producto = this.productoPorId(id);
    if (!producto) return { ok: false, motivo: "Ese producto ya no existe" };

    const precioCompra = sanearNumero(datos.precioCompra);
    const minimo = sanearNumero(datos.minimo);
    const nombre = datos.nombre.trim();
    const codigo = datos.codigo.trim();

    const revision = revisarProducto({
      nombre,
      codigo,
      precioCompra,
      cantidadInicial: 0,
      minimo,
      vencimiento: datos.vencimiento,
    });
    if (!revision.ok) return { ok: false, motivo: revision.motivo ?? "Datos incompletos" };

    const repetido = codigoProductoDuplicado(codigo, this.productos, id);
    if (repetido) {
      return {
        ok: false,
        motivo: `El código «${codigo}» ya lo usa «${repetido.nombre}». Usa otro.`,
      };
    }

    const precioVenta = sanearNumero(datos.precioVenta);

    producto.nombre = nombre;
    producto.codigo = codigo;
    producto.codigoBarras = datos.codigoBarras?.trim() || null;
    producto.categoria = datos.categoria.trim() || "Sin categoría";
    producto.precioCompra = precioCompra as number;
    if (precioVenta !== null) {
      producto.precioVenta = precioVenta;
    }
    if (datos.impuesto) {
      producto.impuesto = datos.impuesto;
    }
    if (typeof datos.publicarEnCatalogo === "boolean") {
      producto.publicarEnCatalogo = datos.publicarEnCatalogo;
    }
    producto.descripcion = datos.descripcion?.trim() || null;
    producto.minimo = minimo as number;
    producto.unidad = datos.unidad;
    producto.vencimiento = datos.vencimiento;
    producto.imagenDataUrl = datos.imagenDataUrl;

    if (!this.categorias.includes(producto.categoria)) {
      this.categorias = [...this.categorias, producto.categoria].sort((a, b) =>
        a.localeCompare(b, "es"),
      );
    }

    return { ok: true, id };
  }

  /**
   * Baja lógica.
   *
   * **No se borra nada.** El producto sale del catálogo y del selector, y sus
   * existencias se conservan: si mañana vuelve, la cantidad sigue ahí en vez de
   * haberse evaporado por una baja reversible. Reactivar es cambiar el estado.
   */
  darDeBajaProducto(id: string): ResultadoGuardado {
    const producto = this.productoPorId(id);
    if (!producto) return { ok: false, motivo: "Ese producto ya no existe" };
    producto.estado = "inactivo";
    return { ok: true, id };
  }

  reactivarProducto(id: string): ResultadoGuardado {
    const producto = this.productoPorId(id);
    if (!producto) return { ok: false, motivo: "Ese producto ya no existe" };
    producto.estado = "activo";
    return { ok: true, id };
  }

  // ── Sedes ─────────────────────────────────────────────────────────────────

  crearSede(datos: {
    nombre: string;
    nombreComercial?: string;
    direccion: string;
    ciudad: string;
    telefono: string;
  }): ResultadoGuardado {
    const nombre = datos.nombre.trim();
    if (!nombre) return { ok: false, motivo: "Escribe el nombre de la sede" };

    const nueva: Sede = {
      id: nuevoId("sede"),
      nombre,
      nombreComercial: datos.nombreComercial?.trim() || nombre,
      direccion: datos.direccion.trim() || "Sin dirección",
      ciudad: datos.ciudad.trim() || "Bogotá",
      telefono: datos.telefono.trim() || "Sin teléfono",
      estado: "activa",
    };
    this.sedes.push(nueva);
    return { ok: true, id: nueva.id };
  }

  actualizarSede(
    id: string,
    datos: {
      nombre: string;
      nombreComercial?: string;
      direccion: string;
      ciudad: string;
      telefono: string;
    },
  ): ResultadoGuardado {
    const sede = this.sedePorId(id);
    if (!sede) return { ok: false, motivo: "Esa sede no existe" };
    const nombre = datos.nombre.trim();
    if (!nombre) return { ok: false, motivo: "Escribe el nombre de la sede" };

    sede.nombre = nombre;
    sede.nombreComercial = datos.nombreComercial?.trim() || nombre;
    sede.direccion = datos.direccion.trim();
    sede.ciudad = datos.ciudad.trim();
    sede.telefono = datos.telefono.trim();
    return { ok: true, id };
  }

  // ── Proveedores ───────────────────────────────────────────────────────────

  proveedorPorId(id: string | null | undefined): Proveedor | undefined {
    if (!id) return undefined;
    return this.proveedores.find((p) => p.id === id);
  }

  crearProveedor(datos: {
    nombre: string;
    logoDataUrl?: string | null;
    productoPrincipal: string;
    categoria: string;
    telefono: string;
    email: string;
    aceptaDevoluciones: boolean;
    precioBase?: number;
  }): ResultadoGuardado {
    const nombre = datos.nombre.trim();
    if (!nombre) return { ok: false, motivo: "Escribe el nombre del proveedor" };

    const nuevo: Proveedor = {
      id: nuevoId("prov"),
      nombre,
      logoDataUrl: datos.logoDataUrl ?? null,
      productoPrincipal: datos.productoPrincipal.trim() || "Varios",
      categoria: datos.categoria.trim() || "General",
      telefono: datos.telefono.trim(),
      email: datos.email.trim(),
      aceptaDevoluciones: datos.aceptaDevoluciones,
      enCamino: 0,
      precioBase: datos.precioBase,
    };
    this.proveedores.push(nuevo);
    return { ok: true, id: nuevo.id };
  }

  // ── Órdenes de compra ─────────────────────────────────────────────────────

  ordenPorId(id: string | null | undefined): OrdenCompra | undefined {
    if (!id) return undefined;
    return this.ordenes.find((o) => o.id === id);
  }

  crearOrden(datos: {
    productoId: string;
    proveedorId?: string;
    cantidad: number;
    valorTotal: number;
    unidad: string;
    fechaEntregaEstimada: string;
    notificar?: boolean;
  }): ResultadoGuardado {
    const producto = this.productoPorId(datos.productoId);
    if (!producto) return { ok: false, motivo: "Selecciona un producto válido" };
    const proveedor = this.proveedorPorId(datos.proveedorId);

    const correlativo = `ORD-2026-${(this.ordenes.length + 1).toString().padStart(3, "0")}`;
    const nueva: OrdenCompra = {
      id: nuevoId("ord"),
      numero: correlativo,
      productoId: producto.id,
      productoNombre: producto.nombre,
      proveedorId: proveedor?.id,
      proveedorNombre: proveedor?.nombre || "Proveedor general",
      valorTotal: datos.valorTotal,
      cantidad: datos.cantidad,
      unidad: datos.unidad,
      fechaEntregaEstimada: datos.fechaEntregaEstimada,
      estado: "confirmada",
      notificar: Boolean(datos.notificar),
      createdAt: new Date().toISOString(),
    };
    this.ordenes.unshift(nueva);

    // Sumar a mercancía en camino si aplica
    if (proveedor) {
      proveedor.enCamino += datos.cantidad;
    }

    return { ok: true, id: nueva.id };
  }

  cambiarEstadoOrden(id: string, estado: EstadoOrdenCompra): ResultadoGuardado {
    const orden = this.ordenPorId(id);
    if (!orden) return { ok: false, motivo: "Esa orden no existe" };
    orden.estado = estado;
    return { ok: true, id };
  }

  // ── Ajustes de Stock ──────────────────────────────────────────────────────

  ajustesDe(productoId: string): AjusteStock[] {
    return this.ajustes.filter((a) => a.productoId === productoId);
  }

  ajustarStock(
    productoId: string,
    sedeId: string,
    nuevaCantidad: number,
    motivo: AjusteStock["motivo"],
    notas?: string,
  ): ResultadoGuardado {
    const existencia = this.existencias.find(
      (e) => e.productoId === productoId && e.sedeId === sedeId,
    );
    const anterior = existencia?.cantidad ?? 0;

    if (existencia) {
      existencia.cantidad = nuevaCantidad;
    } else {
      this.existencias.push({
        productoId,
        sedeId,
        cantidad: nuevaCantidad,
      });
    }

    const nuevoAjuste: AjusteStock = {
      id: nuevoId("ajuste"),
      productoId,
      sedeId,
      cantidadAnterior: anterior,
      cantidadNueva: nuevaCantidad,
      motivo,
      notas,
      fecha: new Date().toISOString(),
    };
    this.ajustes.unshift(nuevoAjuste);

    return { ok: true, id: nuevoAjuste.id };
  }

  // ── Gestión de Estado Cero y Carga Rápida ────────────────────────────────

  vaciarInventario(): void {
    this.productos = [];
    this.existencias = [];
    this.ajustes = [];
  }

  restaurarSeed(): void {
    this.productos = JSON.parse(JSON.stringify(PRODUCTOS_SEED));
    this.existencias = JSON.parse(JSON.stringify(EXISTENCIAS_SEED));
    this.ajustes = JSON.parse(JSON.stringify(AJUSTES_SEED));
  }

  cargarPresetSector(sector: "minimarket" | "farmacia" | "ferreteria"): void {
    const sedePrincipalId = this.sedes[0]?.id ?? "sede_centro";

    const presets: Record<
      "minimarket" | "farmacia" | "ferreteria",
      Array<{
        nombre: string;
        categoria: string;
        precioCompra: number;
        unidad: UnidadMedida;
        minimo: number;
        vencimiento?: string | null;
        stockInicial: number;
      }>
    > = {
      minimarket: [
        {
          nombre: "Arroz Premium 1 kg",
          categoria: "Alimentos",
          precioCompra: 3800,
          unidad: "paquete",
          minimo: 10,
          vencimiento: "2027-04-15",
          stockInicial: 25,
        },
        {
          nombre: "Aceite Vegetal 900 ml",
          categoria: "Alimentos",
          precioCompra: 7500,
          unidad: "litro",
          minimo: 8,
          vencimiento: "2027-02-10",
          stockInicial: 15,
        },
        {
          nombre: "Leche Entera 1 L",
          categoria: "Lácteos",
          precioCompra: 3200,
          unidad: "litro",
          minimo: 12,
          vencimiento: "2026-11-20",
          stockInicial: 18,
        },
        {
          nombre: "Café Molido Tradicional 250 g",
          categoria: "Bebidas",
          precioCompra: 6500,
          unidad: "paquete",
          minimo: 6,
          vencimiento: "2027-08-30",
          stockInicial: 12,
        },
        {
          nombre: "Detergente Multiusos 1 kg",
          categoria: "Aseo",
          precioCompra: 5200,
          unidad: "paquete",
          minimo: 5,
          stockInicial: 14,
        },
      ],
      farmacia: [
        {
          nombre: "Acetaminofén 500 mg (Caja x 100)",
          categoria: "Analgésicos",
          precioCompra: 12000,
          unidad: "caja",
          minimo: 5,
          vencimiento: "2028-01-30",
          stockInicial: 15,
        },
        {
          nombre: "Alcohol Antiséptico 70% 350 ml",
          categoria: "Primeros Auxilios",
          precioCompra: 4200,
          unidad: "unidad",
          minimo: 10,
          vencimiento: "2027-10-15",
          stockInicial: 30,
        },
        {
          nombre: "Suero Oral Electrolitos 500 ml",
          categoria: "Hidratación",
          precioCompra: 5500,
          unidad: "unidad",
          minimo: 8,
          vencimiento: "2027-06-20",
          stockInicial: 20,
        },
        {
          nombre: "Gasas Estériles (Paquete x 10)",
          categoria: "Material Médico",
          precioCompra: 2800,
          unidad: "paquete",
          minimo: 6,
          stockInicial: 18,
        },
      ],
      ferreteria: [
        {
          nombre: "Cinta Aislante Eléctrica 20 m",
          categoria: "Electricidad",
          precioCompra: 3200,
          unidad: "unidad",
          minimo: 10,
          stockInicial: 40,
        },
        {
          nombre: "Tornillo Goloso 1-1/2 (Caja x 100)",
          categoria: "Fijaciones",
          precioCompra: 9500,
          unidad: "caja",
          minimo: 4,
          stockInicial: 12,
        },
        {
          nombre: "Guantes de Nitrilo Industrial",
          categoria: "Seguridad",
          precioCompra: 6800,
          unidad: "unidad",
          minimo: 6,
          stockInicial: 16,
        },
        {
          nombre: "Silicona Multiusos Transparente 280 ml",
          categoria: "Adhesivos",
          precioCompra: 11000,
          unidad: "unidad",
          minimo: 5,
          stockInicial: 10,
        },
      ],
    };

    const lista = presets[sector];
    this.productos = [];
    this.existencias = [];

    lista.forEach((item, index) => {
      const id = nuevoId("producto");
      const codigo = `PRD-${sector.substring(0, 3).toUpperCase()}-${String(index + 1).padStart(3, "0")}`;
      this.productos.push({
        id,
        nombre: item.nombre,
        codigo,
        categoria: item.categoria,
        precioCompra: item.precioCompra,
        unidad: item.unidad,
        minimo: item.minimo,
        vencimiento: item.vencimiento ?? null,
        imagenDataUrl: null,
        estado: "activo",
        createdAt: new Date().toISOString(),
      });

      this.existencias.push({
        productoId: id,
        sedeId: sedePrincipalId,
        cantidad: item.stockInicial,
      });
    });
  }

  importarProductosCsv(
    items: Array<{
      nombre: string;
      categoria: string;
      precioCompra: number;
      unidad: UnidadMedida;
      minimo: number;
      stockInicial?: number;
    }>,
  ): { creados: number } {
    let contador = 0;

    for (const item of items) {
      if (!item.nombre || !item.nombre.trim()) continue;
      const res = this.crearProducto({
        nombre: item.nombre.trim(),
        codigo: "",
        categoria: item.categoria || "General",
        precioCompra: item.precioCompra || 0,
        cantidadInicial: item.stockInicial || 0,
        minimo: item.minimo || 5,
        unidad: item.unidad || "unidad",
        vencimiento: null,
        imagenDataUrl: null,
      });
      if (res.ok) {
        contador++;
      }
    }

    return { creados: contador };
  }
}

export const productosStore = new ProductosStore();
