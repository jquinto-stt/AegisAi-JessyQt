/**
 * Seed del catálogo de productos — datos de ejemplo para el módulo de Inventario.
 *
 * ── Criterio ──────────────────────────────────────────────────────────────
 *
 * El seed tiene que **cubrir los tres estados del semáforo en la PRIMERA
 * página** de la tabla, o las capturas de verificación salen todas verdes y no
 * prueban nada.
 *
 * La primera versión de este archivo declaraba tres productos «queda poco» que
 * no lo estaban: Harpic sumaba 9 con mínimo 6, Ariel 12 con mínimo 7 y Jet 13
 * con mínimo 10 —los tres por ENCIMA de su umbral—, así que el estado
 * intermedio del semáforo no aparecía nunca y el resumen decía «Queda poco: 0»
 * sobre una pantalla que parecía correcta. El reparto de abajo está calculado
 * para que la suma caiga del lado correcto de cada umbral.
 *
 * También tiene que haber **productos sin fecha de vencimiento** (aseo,
 * ferretería): si todos vencieran, la columna «Vence» parecería obligatoria y
 * la ficha no probaría el caso «no vence».
 *
 * ── Lo que este seed NO es ────────────────────────────────────────────────
 *
 * No son cifras de venta. Son existencias y precios de compra, que es lo que el
 * catálogo administra. Los precios están en pesos colombianos y son plausibles
 * para un comercio de barrio, no tomados de ninguna lista real.
 */

import type {
  AjusteStock,
  ExistenciaSede,
  OrdenCompra,
  Producto,
  Proveedor,
  Sede,
} from "@/domain/inventarios/productos.domain";

// ═══════════════════════════════════════════════════════════════════════════
// SEDES
// ═══════════════════════════════════════════════════════════════════════════

export const SEDES_SEED: Sede[] = [
  {
    id: "sede_centro",
    nombre: "Sede Centro",
    nombreComercial: "Necto Centro",
    direccion: "Calle 45 # 12-30, local 4",
    ciudad: "Bogotá",
    telefono: "601 555 0182",
    estado: "activa",
  },
  {
    id: "sede_norte",
    nombre: "Sede Norte",
    nombreComercial: "Necto Norte",
    direccion: "Carrera 15 # 82-14",
    ciudad: "Bogotá",
    telefono: "601 555 0437",
    estado: "activa",
  },
  {
    id: "sede_sur",
    nombre: "Bodega Sur",
    nombreComercial: "Bodega Sur",
    direccion: "Avenida 68 # 22-05, bodega 9",
    ciudad: "Bogotá",
    telefono: "601 555 0910",
    estado: "activa",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Reparto de existencias por producto, en el orden de `SEDES_SEED`.
 *
 * Se declara aparte del producto para que **la suma sea legible de un vistazo**
 * y para que el total de la tabla no se escriba a mano en dos sitios: si el
 * reparto cambiara y el total no, la tabla se contradiría con su desglose.
 *
 * Cada `reparto` está anotado con su suma y el estado que produce, porque el
 * error de la primera versión fue exactamente no hacer esa cuenta.
 */
type Reparto = [centro: number, norte: number, sur: number];

interface FilaProducto {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  precioCompra: number;
  minimo: number;
  unidad: Producto["unidad"];
  vencimiento: string | null;
  reparto: Reparto;
}

const FILAS: FilaProducto[] = [
  // ── Disponible ─────────────────────────────────────────────────────────
  {
    id: "prod_aceite",
    codigo: "PRD-001",
    nombre: "Aceite de girasol 1 L",
    categoria: "Despensa",
    precioCompra: 11500,
    minimo: 6,
    unidad: "litro",
    vencimiento: "2027-06-15",
    reparto: [8, 6, 4], // 18 > 6 → disponible
  },
  {
    id: "prod_bocadillo",
    codigo: "PRD-002",
    nombre: "Bocadillo veleño",
    categoria: "Dulces",
    precioCompra: 1500,
    minimo: 15,
    unidad: "unidad",
    vencimiento: "2026-12-05",
    reparto: [25, 20, 15], // 60 > 15 → disponible
  },
  {
    id: "prod_cafe",
    codigo: "PRD-003",
    nombre: "Café Sello Rojo 250 g",
    categoria: "Café",
    precioCompra: 9800,
    minimo: 6,
    unidad: "paquete",
    vencimiento: "2027-01-30",
    reparto: [7, 4, 3], // 14 > 6 → disponible
  },
  {
    id: "prod_maggi",
    codigo: "PRD-004",
    nombre: "Caldo de gallina Maggi",
    categoria: "Sopas y caldos",
    precioCompra: 2400,
    minimo: 12,
    unidad: "paquete",
    vencimiento: "2026-11-12",
    reparto: [18, 15, 10], // 43 > 12 → disponible
  },
  {
    id: "prod_cocacola",
    codigo: "PRD-005",
    nombre: "Coca-Cola 400 ml",
    categoria: "Bebidas",
    precioCompra: 2100,
    minimo: 10,
    unidad: "unidad",
    vencimiento: "2026-12-20",
    reparto: [20, 14, 7], // 41 > 10 → disponible
  },
  {
    id: "prod_scotch",
    codigo: "PRD-006",
    nombre: "Esponja Scotch-Brite",
    categoria: "Aseo",
    precioCompra: 3200,
    minimo: 8,
    unidad: "unidad",
    vencimiento: null,
    reparto: [17, 15, 11], // 43 > 8 → disponible
  },
  {
    id: "prod_jabon",
    codigo: "PRD-007",
    nombre: "Jabón Rey barra",
    categoria: "Aseo",
    precioCompra: 2900,
    minimo: 10,
    unidad: "unidad",
    vencimiento: null,
    reparto: [12, 11, 8], // 31 > 10 → disponible
  },
  {
    id: "prod_leche",
    codigo: "PRD-008",
    nombre: "Leche Alquería 1 L",
    categoria: "Lácteos",
    precioCompra: 4200,
    minimo: 12,
    unidad: "litro",
    vencimiento: "2026-11-02",
    reparto: [9, 8, 5], // 22 > 12 → disponible
  },
  {
    id: "prod_redbull",
    codigo: "PRD-009",
    nombre: "Red Bull 250 ml",
    categoria: "Bebidas",
    precioCompra: 6900,
    minimo: 9,
    unidad: "unidad",
    vencimiento: "2027-03-08",
    reparto: [14, 12, 10], // 36 > 9 → disponible
  },

  // ── Queda poco ─────────────────────────────────────────────────────────
  {
    id: "prod_ariel",
    codigo: "PRD-010",
    nombre: "Ariel polvo 900 g",
    categoria: "Aseo",
    precioCompra: 12900,
    minimo: 7,
    unidad: "paquete",
    vencimiento: null,
    reparto: [3, 2, 1], // 6 ≤ 7 → queda poco
  },
  {
    id: "prod_jet",
    codigo: "PRD-011",
    nombre: "Chocolatina Jet",
    categoria: "Dulces",
    precioCompra: 1200,
    minimo: 10,
    unidad: "unidad",
    vencimiento: "2026-10-28",
    reparto: [4, 3, 2], // 9 ≤ 10 → queda poco
  },
  {
    id: "prod_harpic",
    codigo: "PRD-012",
    nombre: "Harpic limpiador 500 ml",
    categoria: "Aseo",
    precioCompra: 8500,
    minimo: 6,
    unidad: "unidad",
    vencimiento: null,
    reparto: [3, 2, 1], // 6 ≤ 6 → queda poco (justo en el umbral)
  },

  // ── Agotado ────────────────────────────────────────────────────────────
  {
    id: "prod_arroz",
    codigo: "PRD-013",
    nombre: "Arroz Diana 500 g",
    categoria: "Despensa",
    precioCompra: 2800,
    minimo: 8,
    unidad: "paquete",
    vencimiento: "2027-04-22",
    reparto: [0, 0, 0], // 0 → agotado
  },
  {
    id: "prod_panela",
    codigo: "PRD-014",
    nombre: "Panela cuadrada",
    categoria: "Despensa",
    precioCompra: 3500,
    minimo: 10,
    unidad: "unidad",
    vencimiento: "2027-02-18",
    reparto: [0, 0, 0], // 0 → agotado
  },
  {
    id: "prod_papel",
    codigo: "PRD-015",
    nombre: "Papel higiénico Familia x4",
    categoria: "Aseo",
    precioCompra: 6400,
    minimo: 8,
    unidad: "paquete",
    vencimiento: null,
    reparto: [0, 0, 0], // 0 → agotado
  },
];

/**
 * Momento de alta de los datos de ejemplo.
 *
 * Fijo y no `new Date()`: un seed con fecha de hoy haría que «creado hace 3
 * días» dijera cosas distintas en cada recarga y que dos capturas del mismo
 * estado no coincidieran.
 */
const ALTA = "2026-09-28T14:20:00.000Z";

export const PRODUCTOS_SEED: Producto[] = FILAS.map((f) => ({
  id: f.id,
  codigo: f.codigo,
  nombre: f.nombre,
  categoria: f.categoria,
  precioCompra: f.precioCompra,
  minimo: f.minimo,
  unidad: f.unidad,
  vencimiento: f.vencimiento,
  imagenDataUrl: null,
  estado: "activo",
  createdAt: ALTA,
}));

export const EXISTENCIAS_SEED: ExistenciaSede[] = FILAS.flatMap((f) =>
  SEDES_SEED.map((s, i) => ({
    productoId: f.id,
    sedeId: s.id,
    cantidad: f.reparto[i],
  })),
);

/**
 * Categorías sugeridas para el desplegable del formulario.
 *
 * Son **sugerencias, no un catálogo cerrado**: se pintan como opciones del
 * `<select>` y escribir una nueva sigue estando permitido. Se derivan de los
 * productos del seed para que la lista nunca ofrezca una categoría vacía.
 */
export const CATEGORIAS_SEED: string[] = Array.from(
  new Set(PRODUCTOS_SEED.map((p) => p.categoria)),
).sort((a, b) => a.localeCompare(b, "es"));

// ═══════════════════════════════════════════════════════════════════════════
// PROVEEDORES
// ═══════════════════════════════════════════════════════════════════════════

export const PROVEEDORES_SEED: Proveedor[] = [
  {
    id: "prov_colgate",
    nombre: "Distribuidora Alimentos del Valle",
    productoPrincipal: "Aceite de girasol 1 L",
    categoria: "Despensa",
    telefono: "310 445 9012",
    email: "pedidos@alimentosdelvalle.co",
    aceptaDevoluciones: true,
    enCamino: 24,
    precioBase: 11000,
  },
  {
    id: "prov_nestle",
    nombre: "Comercializadora Dulces & Café",
    productoPrincipal: "Café Sello Rojo 250 g",
    categoria: "Café",
    telefono: "312 889 0034",
    email: "ventas@dulcesycafe.com",
    aceptaDevoluciones: true,
    enCamino: 0,
    precioBase: 9500,
  },
  {
    id: "prov_unilever",
    nombre: "Químicos y Aseo Nacional",
    productoPrincipal: "Ariel polvo 900 g",
    categoria: "Aseo",
    telefono: "315 220 7711",
    email: "contacto@aseonacional.co",
    aceptaDevoluciones: false,
    enCamino: 18,
    precioBase: 12500,
  },
  {
    id: "prov_molinos",
    nombre: "Molinos y Granos de Colombia",
    productoPrincipal: "Arroz Diana 500 g",
    categoria: "Despensa",
    telefono: "317 654 3210",
    email: "abastecimiento@granoscolombia.com",
    aceptaDevoluciones: true,
    enCamino: 40,
    precioBase: 2600,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// ÓRDENES DE COMPRA
// ═══════════════════════════════════════════════════════════════════════════

export const ORDENES_SEED: OrdenCompra[] = [
  {
    id: "ord_101",
    numero: "ORD-2026-001",
    productoId: "prod_aceite",
    productoNombre: "Aceite de girasol 1 L",
    proveedorId: "prov_colgate",
    proveedorNombre: "Distribuidora Alimentos del Valle",
    sedeId: "sede_centro",
    sedeNombre: "Sede Centro",
    valorTotal: 276000,
    cantidad: 24,
    unidad: "litros",
    fechaEntregaEstimada: "2026-10-12",
    estado: "en_camino",
    notificar: true,
    createdAt: "2026-10-02T10:00:00.000Z",
  },
  {
    id: "ord_102",
    numero: "ORD-2026-002",
    productoId: "prod_arroz",
    productoNombre: "Arroz Diana 500 g",
    proveedorId: "prov_molinos",
    proveedorNombre: "Molinos y Granos de Colombia",
    sedeId: "sede_norte",
    sedeNombre: "Sede Norte",
    valorTotal: 112000,
    cantidad: 40,
    unidad: "paquetes",
    fechaEntregaEstimada: "2026-10-09",
    estado: "confirmada",
    notificar: false,
    createdAt: "2026-10-03T11:30:00.000Z",
  },
  {
    id: "ord_103",
    numero: "ORD-2026-003",
    productoId: "prod_ariel",
    productoNombre: "Ariel polvo 900 g",
    proveedorId: "prov_unilever",
    proveedorNombre: "Químicos y Aseo Nacional",
    sedeId: "sede_centro",
    sedeNombre: "Sede Centro",
    valorTotal: 232200,
    cantidad: 18,
    unidad: "paquetes",
    fechaEntregaEstimada: "2026-10-05",
    estado: "retrasada",
    notificar: true,
    createdAt: "2026-09-29T16:00:00.000Z",
  },
  {
    id: "ord_104",
    numero: "ORD-2026-004",
    productoId: "prod_cafe",
    productoNombre: "Café Sello Rojo 250 g",
    proveedorId: "prov_nestle",
    proveedorNombre: "Comercializadora Dulces & Café",
    sedeId: "sede_norte",
    sedeNombre: "Sede Norte",
    valorTotal: 196000,
    cantidad: 20,
    unidad: "paquetes",
    fechaEntregaEstimada: "2026-09-30",
    estado: "devuelta",
    notificar: false,
    createdAt: "2026-09-25T09:00:00.000Z",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// AJUSTES HISTÓRICOS
// ═══════════════════════════════════════════════════════════════════════════

export const AJUSTES_SEED: AjusteStock[] = [
  {
    id: "ajuste_1",
    productoId: "prod_aceite",
    sedeId: "sede_centro",
    cantidadAnterior: 10,
    cantidadNueva: 8,
    motivo: "merma",
    notas: "Envase roto durante descarga",
    fecha: "2026-10-01T14:30:00.000Z",
  },
  {
    id: "ajuste_2",
    productoId: "prod_arroz",
    sedeId: "sede_sur",
    cantidadAnterior: 5,
    cantidadNueva: 0,
    motivo: "conteo",
    notas: "Agotado en mostrador",
    fecha: "2026-10-02T16:15:00.000Z",
  },
];

