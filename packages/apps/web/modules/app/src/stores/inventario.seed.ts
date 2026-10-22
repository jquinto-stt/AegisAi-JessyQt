/**
 * Datos de ejemplo del módulo Inventario.
 *
 * Una distribuidora de suministros con un almacén principal y cuatro puntos más.
 * El seed está armado para que cada pantalla tenga algo que enseñar: artículos
 * agotados y bajos (la cola de reorden no sale vacía), una orden parcial, un
 * conteo a medio hacer y otro esperando revisión.
 *
 * Las fechas son relativas a «ahora» para que el dashboard nunca muestre
 * actividad de hace meses al abrir la demo.
 */
import type {
  Articulo,
  ConfigInventario,
  Conteo,
  Movimiento,
  OrdenCompra,
  Proveedor,
  Ubicacion,
} from "@/domain/inventario/inventario.domain";

function haceDias(dias: number, hora = 10, minuto = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora, minuto, 0, 0);
  return d.toISOString();
}

function enDias(dias: number): string {
  return haceDias(-dias, 12);
}

export const UBICACIONES_SEED: Ubicacion[] = [
  { id: "ub-principal", nombre: "Almacén Principal", tipo: "almacen", activa: true },
  { id: "ub-norte", nombre: "Bodega Norte", tipo: "bodega", activa: true },
  { id: "ub-12c", nombre: "Estante 12-C", tipo: "estante", activa: true },
  { id: "ub-medellin", nombre: "Oficina Medellín", tipo: "oficina", activa: true },
  { id: "ub-muelle", nombre: "Muelle de Recepción", tipo: "muelle", activa: true },
];

export const PROVEEDORES_SEED: Proveedor[] = [
  {
    id: "pv-papeleria",
    nombre: "Papelería Andina S.A.S.",
    nit: "900.412.553-1",
    contacto: "Laura Gómez",
    email: "ventas@papeleriaandina.co",
    telefono: "+57 601 745 2210",
    ciudad: "Bogotá",
    plazoEntregaDias: 3,
    condicionesPago: "30 días",
    activo: true,
  },
  {
    id: "pv-empaques",
    nombre: "Empaques del Valle",
    nit: "805.019.874-6",
    contacto: "Andrés Caicedo",
    email: "pedidos@empaquesdelvalle.com",
    telefono: "+57 602 389 4410",
    ciudad: "Cali",
    plazoEntregaDias: 5,
    condicionesPago: "Contado",
    activo: true,
  },
  {
    id: "pv-ferreteria",
    nombre: "Ferretería Industrial El Tornillo",
    nit: "890.903.221-4",
    contacto: "Óscar Restrepo",
    email: "comercial@eltornillo.com.co",
    telefono: "+57 604 512 7788",
    ciudad: "Medellín",
    plazoEntregaDias: 4,
    condicionesPago: "45 días",
    activo: true,
  },
  {
    id: "pv-electro",
    nombre: "Electrocomponentes Caribe",
    nit: "802.006.118-9",
    contacto: "Daniela Pérez",
    email: "dperez@electrocaribe.co",
    telefono: "+57 605 360 9921",
    ciudad: "Barranquilla",
    plazoEntregaDias: 7,
    condicionesPago: "30 días",
    activo: true,
  },
  {
    id: "pv-aseo",
    nombre: "Distribuidora Aseo Total",
    nit: "901.233.640-2",
    contacto: "Camilo Herrera",
    email: "camilo@aseototal.co",
    telefono: "+57 310 448 1206",
    ciudad: "Bogotá",
    plazoEntregaDias: 2,
    condicionesPago: "15 días",
    activo: true,
  },
  {
    id: "pv-mobiliario",
    nombre: "Muebles Oficina Plus",
    nit: "830.145.902-7",
    contacto: "Sandra Molina",
    email: "smolina@oficinaplus.com",
    telefono: "+57 601 620 3345",
    ciudad: "Bogotá",
    plazoEntregaDias: 12,
    condicionesPago: "50% anticipo",
    activo: false,
  },
];

export const CATEGORIAS_SEED = [
  "Suministros de oficina",
  "Embalaje",
  "Herramientas y ferretería",
  "Electrónica",
  "Aseo y consumibles",
  "Repuestos",
  "Mobiliario",
];

type FilaArticulo = [
  sku: string,
  nombre: string,
  categoria: string,
  unidad: Articulo["unidad"],
  costo: number,
  proveedorId: string | null,
  puntoReorden: number,
  stockMaximo: number,
  existencias: Record<string, number>,
];

const FILAS: FilaArticulo[] = [
  ["OFI-1001", "Papel bond carta 75 g", "Suministros de oficina", "resma", 14500, "pv-papeleria", 40, 160, { "ub-principal": 96, "ub-norte": 24, "ub-medellin": 6 }],
  ["OFI-1002", "Bolígrafo tinta negra x12", "Suministros de oficina", "caja", 9800, "pv-papeleria", 15, 60, { "ub-principal": 8, "ub-medellin": 3 }],
  ["OFI-1003", "Resaltador amarillo x6", "Suministros de oficina", "paquete", 11200, "pv-papeleria", 10, 40, { "ub-principal": 22 }],
  ["OFI-1004", "Carpeta legajadora AZ", "Suministros de oficina", "unidad", 7600, "pv-papeleria", 20, 80, { "ub-principal": 0 }],
  ["OFI-1005", "Notas adhesivas 3x3 x12", "Suministros de oficina", "paquete", 18900, "pv-papeleria", 12, 48, { "ub-principal": 30, "ub-norte": 10 }],
  ["OFI-1006", "Tóner HP 105A", "Suministros de oficina", "unidad", 189000, "pv-papeleria", 4, 12, { "ub-principal": 3 }],
  ["EMB-2001", "Caja de cartón 40x30x30", "Embalaje", "unidad", 3200, "pv-empaques", 150, 600, { "ub-principal": 420, "ub-muelle": 60 }],
  ["EMB-2002", "Cinta de embalar transparente 48 mm", "Embalaje", "rollo", 5400, "pv-empaques", 60, 240, { "ub-principal": 44, "ub-muelle": 12 }],
  ["EMB-2003", "Plástico stretch 18\"", "Embalaje", "rollo", 38500, "pv-empaques", 10, 40, { "ub-principal": 18 }],
  ["EMB-2004", "Bolsa burbuja 30x40 x100", "Embalaje", "paquete", 42000, "pv-empaques", 8, 30, { "ub-norte": 9 }],
  ["EMB-2005", "Etiqueta térmica 100x150 x500", "Embalaje", "rollo", 27500, "pv-empaques", 12, 50, { "ub-principal": 0 }],
  ["FER-3001", "Taladro percutor 1/2\" 750 W", "Herramientas y ferretería", "unidad", 265000, "pv-ferreteria", 2, 6, { "ub-12c": 4 }],
  ["FER-3002", "Juego de destornilladores x10", "Herramientas y ferretería", "caja", 54000, "pv-ferreteria", 3, 10, { "ub-12c": 7 }],
  ["FER-3003", "Tornillo drywall 6x1\" x1000", "Herramientas y ferretería", "caja", 31000, "pv-ferreteria", 5, 20, { "ub-12c": 5 }],
  ["FER-3004", "Guantes de nitrilo talla M x100", "Herramientas y ferretería", "caja", 36500, "pv-ferreteria", 6, 24, { "ub-principal": 14, "ub-12c": 2 }],
  ["FER-3005", "Cinta métrica 8 m", "Herramientas y ferretería", "unidad", 22800, "pv-ferreteria", 4, 15, { "ub-12c": 11 }],
  ["ELE-4001", "Pilas alcalinas AA x48", "Electrónica", "caja", 98000, "pv-electro", 3, 12, { "ub-principal": 2 }],
  ["ELE-4002", "Cable HDMI 2 m", "Electrónica", "unidad", 18500, "pv-electro", 10, 40, { "ub-principal": 26, "ub-medellin": 4 }],
  ["ELE-4003", "Mouse inalámbrico", "Electrónica", "unidad", 45900, "pv-electro", 6, 24, { "ub-principal": 0 }],
  ["ELE-4004", "Regleta 6 tomas con protección", "Electrónica", "unidad", 62000, "pv-electro", 4, 16, { "ub-principal": 9 }],
  ["ELE-4005", "Lector de código de barras USB", "Electrónica", "unidad", 158000, "pv-electro", 2, 8, { "ub-principal": 5, "ub-norte": 1 }],
  ["ASE-5001", "Gel antibacterial 1 L", "Aseo y consumibles", "litro", 16800, "pv-aseo", 20, 80, { "ub-principal": 31, "ub-norte": 8, "ub-medellin": 2 }],
  ["ASE-5002", "Toalla de papel interfoliada x150", "Aseo y consumibles", "paquete", 8900, "pv-aseo", 40, 160, { "ub-principal": 36 }],
  ["ASE-5003", "Bolsa de basura negra 90x110 x10", "Aseo y consumibles", "paquete", 6200, "pv-aseo", 30, 120, { "ub-principal": 150 }],
  ["ASE-5004", "Desinfectante multiusos 3.8 L", "Aseo y consumibles", "unidad", 24500, "pv-aseo", 8, 30, { "ub-principal": 12 }],
  ["REP-6001", "Rodamiento 6000-2RS", "Repuestos", "unidad", 12400, "pv-ferreteria", 10, 40, { "ub-12c": 6 }],
  ["REP-6002", "Correa de transmisión 4L220", "Repuestos", "unidad", 28900, "pv-ferreteria", 4, 12, { "ub-12c": 5 }],
  ["REP-6003", "Kit de empaques tóricos surtidos", "Repuestos", "caja", 47000, "pv-ferreteria", 3, 10, { "ub-12c": 1 }],
  ["MOB-7001", "Silla ergonómica operativa", "Mobiliario", "unidad", 389000, "pv-mobiliario", 2, 8, { "ub-norte": 3 }],
  ["MOB-7002", "Estantería metálica 5 niveles", "Mobiliario", "unidad", 295000, "pv-mobiliario", 1, 4, { "ub-norte": 2 }],
];

export const ARTICULOS_SEED: Articulo[] = FILAS.map(
  ([sku, nombre, categoria, unidad, costo, proveedorId, puntoReorden, stockMaximo, existencias]) => ({
    id: `art-${sku.toLowerCase()}`,
    sku,
    nombre,
    categoria,
    unidad,
    costoUnitario: costo,
    proveedorId,
    puntoReorden,
    stockMaximo,
    existencias,
    activo: true,
  }),
);

const id = (sku: string) => `art-${sku.toLowerCase()}`;

export const MOVIMIENTOS_SEED: Movimiento[] = [
  { id: "mv-01", fecha: haceDias(0, 9, 12), tipo: "salida", articuloId: id("OFI-1001"), cantidad: 12, origenId: "ub-principal", destinoId: null, motivo: "Despacho a cliente", referencia: "PED-2291", responsable: "María López" },
  { id: "mv-02", fecha: haceDias(0, 8, 40), tipo: "transferencia", articuloId: id("ASE-5001"), cantidad: 2, origenId: "ub-norte", destinoId: "ub-medellin", motivo: "Reposición de oficina", referencia: null, responsable: "David Suárez" },
  { id: "mv-03", fecha: haceDias(1, 16, 5), tipo: "entrada", articuloId: id("EMB-2001"), cantidad: 200, origenId: null, destinoId: "ub-muelle", motivo: "Recepción de orden de compra", referencia: "OC-0002", responsable: "James Cárdenas" },
  { id: "mv-04", fecha: haceDias(1, 15, 30), tipo: "transferencia", articuloId: id("EMB-2001"), cantidad: 140, origenId: "ub-muelle", destinoId: "ub-principal", motivo: "Ubicación en estantería", referencia: null, responsable: "James Cárdenas" },
  { id: "mv-05", fecha: haceDias(1, 11, 20), tipo: "salida", articuloId: id("EMB-2002"), cantidad: 15, origenId: "ub-principal", destinoId: null, motivo: "Consumo interno", referencia: null, responsable: "María López" },
  { id: "mv-06", fecha: haceDias(2, 17, 45), tipo: "ajuste", articuloId: id("REP-6002"), cantidad: -2, origenId: null, destinoId: "ub-12c", motivo: "Conteo físico", referencia: "CNT-0001", responsable: "Carlos Mendoza" },
  { id: "mv-07", fecha: haceDias(2, 17, 45), tipo: "ajuste", articuloId: id("REP-6003"), cantidad: -1, origenId: null, destinoId: "ub-12c", motivo: "Conteo físico", referencia: "CNT-0001", responsable: "Carlos Mendoza" },
  { id: "mv-08", fecha: haceDias(2, 17, 45), tipo: "ajuste", articuloId: id("REP-6001"), cantidad: -2, origenId: null, destinoId: "ub-12c", motivo: "Conteo físico", referencia: "CNT-0001", responsable: "Carlos Mendoza" },
  { id: "mv-09", fecha: haceDias(3, 10, 0), tipo: "salida", articuloId: id("ELE-4003"), cantidad: 6, origenId: "ub-principal", destinoId: null, motivo: "Despacho a cliente", referencia: "PED-2274", responsable: "David Suárez" },
  { id: "mv-10", fecha: haceDias(3, 9, 15), tipo: "salida", articuloId: id("OFI-1002"), cantidad: 9, origenId: "ub-principal", destinoId: null, motivo: "Despacho a cliente", referencia: "PED-2270", responsable: "María López" },
  { id: "mv-11", fecha: haceDias(4, 14, 10), tipo: "entrada", articuloId: id("ASE-5003"), cantidad: 120, origenId: null, destinoId: "ub-principal", motivo: "Recepción de orden de compra", referencia: "OC-0001", responsable: "James Cárdenas" },
  { id: "mv-12", fecha: haceDias(4, 14, 10), tipo: "entrada", articuloId: id("ASE-5001"), cantidad: 24, origenId: null, destinoId: "ub-principal", motivo: "Recepción de orden de compra", referencia: "OC-0001", responsable: "James Cárdenas" },
  { id: "mv-13", fecha: haceDias(5, 12, 0), tipo: "salida", articuloId: id("ELE-4001"), cantidad: 4, origenId: "ub-principal", destinoId: null, motivo: "Consumo interno", referencia: null, responsable: "David Suárez" },
  { id: "mv-14", fecha: haceDias(5, 10, 30), tipo: "ajuste", articuloId: id("EMB-2004"), cantidad: -1, origenId: null, destinoId: "ub-norte", motivo: "Producto dañado", referencia: null, responsable: "Carlos Mendoza" },
  { id: "mv-15", fecha: haceDias(6, 16, 20), tipo: "salida", articuloId: id("OFI-1004"), cantidad: 18, origenId: "ub-principal", destinoId: null, motivo: "Despacho a cliente", referencia: "PED-2251", responsable: "María López" },
  { id: "mv-16", fecha: haceDias(7, 11, 0), tipo: "salida", articuloId: id("EMB-2005"), cantidad: 10, origenId: "ub-principal", destinoId: null, motivo: "Consumo interno", referencia: null, responsable: "James Cárdenas" },
  { id: "mv-17", fecha: haceDias(8, 9, 30), tipo: "entrada", articuloId: id("FER-3001"), cantidad: 2, origenId: null, destinoId: "ub-12c", motivo: "Devolución de cliente", referencia: "PED-2198", responsable: "Carlos Mendoza" },
  { id: "mv-18", fecha: haceDias(9, 15, 0), tipo: "transferencia", articuloId: id("OFI-1001"), cantidad: 24, origenId: "ub-principal", destinoId: "ub-norte", motivo: "Balanceo entre bodegas", referencia: null, responsable: "David Suárez" },
];

export const ORDENES_SEED: OrdenCompra[] = [
  {
    id: "oc-1",
    numero: "OC-0001",
    proveedorId: "pv-aseo",
    estado: "recibida",
    fechaCreacion: haceDias(7),
    fechaEsperada: haceDias(4),
    fechaRecepcion: haceDias(4, 14, 10),
    destinoId: "ub-principal",
    lineas: [
      { articuloId: id("ASE-5003"), cantidad: 120, recibida: 120, costoUnitario: 6200 },
      { articuloId: id("ASE-5001"), cantidad: 24, recibida: 24, costoUnitario: 16800 },
    ],
    notas: "",
  },
  {
    id: "oc-2",
    numero: "OC-0002",
    proveedorId: "pv-empaques",
    estado: "parcial",
    fechaCreacion: haceDias(6),
    fechaEsperada: haceDias(1),
    destinoId: "ub-muelle",
    lineas: [
      { articuloId: id("EMB-2001"), cantidad: 300, recibida: 200, costoUnitario: 3200 },
      { articuloId: id("EMB-2002"), cantidad: 120, recibida: 0, costoUnitario: 5400 },
    ],
    notas: "El proveedor confirmó el saldo de cajas para esta semana.",
  },
  {
    id: "oc-3",
    numero: "OC-0003",
    proveedorId: "pv-electro",
    estado: "enviada",
    fechaCreacion: haceDias(2),
    fechaEsperada: enDias(5),
    destinoId: "ub-principal",
    lineas: [
      { articuloId: id("ELE-4003"), cantidad: 12, recibida: 0, costoUnitario: 45900 },
      { articuloId: id("ELE-4001"), cantidad: 6, recibida: 0, costoUnitario: 98000 },
    ],
    notas: "",
  },
  {
    id: "oc-4",
    numero: "OC-0004",
    proveedorId: "pv-papeleria",
    estado: "borrador",
    fechaCreacion: haceDias(0, 8),
    fechaEsperada: null,
    destinoId: "ub-principal",
    lineas: [{ articuloId: id("OFI-1006"), cantidad: 6, recibida: 0, costoUnitario: 189000 }],
    notas: "",
  },
  {
    id: "oc-5",
    numero: "OC-0005",
    proveedorId: "pv-mobiliario",
    estado: "cancelada",
    fechaCreacion: haceDias(20),
    fechaEsperada: haceDias(8),
    destinoId: "ub-norte",
    lineas: [{ articuloId: id("MOB-7001"), cantidad: 4, recibida: 0, costoUnitario: 389000 }],
    notas: "Cancelada: el proveedor no tenía disponibilidad.",
  },
];

/**
 * Los conteos abiertos toman el «esperado» de las existencias actuales del
 * seed: si se escribiera a mano, un cambio en `FILAS` dejaría el conteo
 * reportando diferencias que no existen.
 */
function lineasDe(ubicacionId: string, contados: Record<string, number | null>) {
  return ARTICULOS_SEED.filter((a) => ubicacionId in a.existencias).map((a) => ({
    articuloId: a.id,
    esperado: a.existencias[ubicacionId] ?? 0,
    contado: a.sku in contados ? contados[a.sku] : null,
  }));
}

export const CONTEOS_SEED: Conteo[] = [
  {
    id: "cnt-1",
    numero: "CNT-0001",
    ubicacionId: "ub-12c",
    estado: "aplicado",
    fecha: haceDias(2, 17, 45),
    responsable: "Carlos Mendoza",
    lineas: [
      { articuloId: id("REP-6001"), esperado: 8, contado: 6 },
      { articuloId: id("REP-6002"), esperado: 7, contado: 5 },
      { articuloId: id("REP-6003"), esperado: 2, contado: 1 },
      { articuloId: id("FER-3002"), esperado: 7, contado: 7 },
    ],
    notas: "Conteo cíclico mensual de repuestos.",
  },
  {
    id: "cnt-2",
    numero: "CNT-0002",
    ubicacionId: "ub-norte",
    estado: "en_revision",
    fecha: haceDias(1, 12),
    responsable: "Mariana Duarte",
    lineas: lineasDe("ub-norte", { "OFI-1001": 22, "OFI-1005": 10, "EMB-2004": 9, "ASE-5001": 7, "ELE-4005": 1, "MOB-7001": 3, "MOB-7002": 2 }),
    notas: "",
  },
  {
    id: "cnt-3",
    numero: "CNT-0003",
    ubicacionId: "ub-principal",
    estado: "en_progreso",
    fecha: haceDias(0, 7, 30),
    responsable: "Felipe Restrepo",
    lineas: lineasDe("ub-principal", { "OFI-1001": 96, "OFI-1002": 8, "OFI-1003": 21, "OFI-1004": 0, "EMB-2001": 418 }),
    notas: "Conteo general de cierre de mes.",
  },
];

export const CONFIG_SEED: ConfigInventario = {
  metodoValoracion: "promedio",
  unidadPorDefecto: "unidad",
  ubicacionRecepcionId: "ub-principal",

  diasCobertura: 30,
  puntoReordenPorDefecto: 10,
  stockMaximoPorDefecto: 40,
  descontarEnTransito: true,
  multiploPedido: 1,

  prefijoOrdenCompra: "OC",
  notasOrdenPorDefecto: "Entregar en horario de 7:00 a 16:00. Adjuntar remisión con la factura.",

  motivos: {
    entrada: ["Compra", "Devolución de cliente", "Producción", "Donación"],
    salida: ["Despacho a cliente", "Consumo interno", "Muestra comercial", "Garantía"],
    transferencia: ["Reposición de punto", "Balanceo entre bodegas", "Ubicación en estantería"],
    ajuste: ["Conteo físico", "Producto dañado", "Producto vencido", "Pérdida o robo"],
  },
  referenciaObligatoriaSalidas: false,

  requiereRevisionConteos: true,
  conteoCiego: false,
  umbralDiferenciaPct: 10,

  alertaStockBajo: true,
  alertaWhatsapp: false,
  whatsappDestino: "",
  resumenDiario: true,
  horaResumen: "07:00",
  skuAutomatico: true,
  toleranciaRecepcionPct: 0,

  categorias: CATEGORIAS_SEED,
};
