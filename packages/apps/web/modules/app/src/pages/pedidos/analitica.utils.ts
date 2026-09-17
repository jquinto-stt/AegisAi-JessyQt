import type { Pedido, PedidoEstado, Modalidad, Origen, RangoFechas } from "@/stores/pedidos.store";

// ═══════════════════════════════════════════════════════════════════════════
// PERIODO (filtro temporal de la analítica)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Claves de periodo que ofrece el selector. `"todo"` = sin filtro (histórico
 * completo); el resto son ventanas de `n` días naturales terminando hoy.
 */
export const PERIODOS = ["7d", "30d", "todo"] as const;
export type Periodo = (typeof PERIODOS)[number];

/** Opción de periodo lista para pintar en el selector. */
export interface OpcionPeriodo {
  value: Periodo;
  /** Etiqueta visible. */
  label: string;
  /** Descripción corta para el ítem del menú. */
  hint: string;
}

/**
 * Catálogo de periodos, en el orden en que se muestran. Vive aquí (y no en el
 * componente) para que la página no escriba literales y para poder testearlo.
 */
export const OPCIONES_PERIODO: OpcionPeriodo[] = [
  { value: "7d", label: "Últimos 7 días", hint: "La última semana" },
  { value: "30d", label: "Últimos 30 días", hint: "El último mes" },
  { value: "todo", label: "Todo el historial", hint: "Sin filtro de fecha" },
];

/** Etiqueta legible de un periodo (para el trigger del selector). */
export function etiquetaPeriodo(p: Periodo): string {
  return OPCIONES_PERIODO.find((o) => o.value === p)?.label ?? "Todo el historial";
}

/** "YYYY-MM-DD" local de una fecha. */
export function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" local de hoy. */
export function hoyYmd(ref: Date = new Date()): string {
  return ymdLocal(ref);
}

/**
 * Nº de días que abarca cada periodo. `"todo"` no tiene ventana.
 */
const DIAS_POR_PERIODO: Record<Exclude<Periodo, "todo">, number> = {
  "7d": 7,
  "30d": 30,
};

/**
 * Traduce un periodo a un rango de días **local** inclusive, o `null` para
 * "todo el historial". Los rangos terminan hoy y empiezan `n - 1` días atrás,
 * de modo que "últimos 7 días" incluye el día de hoy más los 6 anteriores.
 *
 * `ref` permite inyectar la fecha en pruebas (por defecto, ahora).
 */
export function rangoDePeriodo(p: Periodo, ref: Date = new Date()): RangoFechas | null {
  if (p === "todo") return null;
  const dias = DIAS_POR_PERIODO[p];
  const hasta = new Date(ref);
  const desde = new Date(ref);
  desde.setDate(hasta.getDate() - (dias - 1));
  return { desde: ymdLocal(desde), hasta: ymdLocal(hasta) };
}

/** Nº de días de la serie del gráfico para cada periodo (el histórico se acota). */
export function diasDeSerie(p: Periodo): number {
  return p === "todo" ? 30 : DIAS_POR_PERIODO[p];
}

// ═══════════════════════════════════════════════════════════════════════════
// MÉTRICAS DERIVADAS DE LA VENTANA
// ═══════════════════════════════════════════════════════════════════════════
//
// Solo aritmética de presentación sobre números que ya vienen del store. Aquí no
// se cuenta ningún pedido: si hiciera falta contar, sería un método del store.

/**
 * Nº de días de calendario que abarca un rango [desde, hasta] **inclusive**,
 * ambos en "YYYY-MM-DD". Es el divisor del promedio diario. Devuelve 1 ante un
 * rango inválido o invertido, para no dividir entre cero.
 */
export function diasDelRango(desde: string, hasta: string): number {
  const a = new Date(`${desde}T00:00:00`);
  const b = new Date(`${hasta}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || a.getTime() > b.getTime()) return 1;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1);
}

/**
 * Nº de días cubiertos por una lista de instantes: del día local más antiguo al
 * más reciente (mínimo 1).
 *
 * Sirve para el periodo "todo el historial", que NO tiene ventana fija: dividir
 * el total histórico entre un `30` inventado daría un promedio falso. Con la
 * lista vacía devuelve 1 (nunca 0).
 */
export function diasCubiertos(instantes: string[]): number {
  if (instantes.length === 0) return 1;
  let min = "";
  let max = "";
  for (const iso of instantes) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    const dia = ymdLocal(d);
    if (!min || dia < min) min = dia;
    if (!max || dia > max) max = dia;
  }
  if (!min || !max) return 1;
  return diasDelRango(min, max);
}

/**
 * Promedios de pedidos a partir del total de la ventana y sus días.
 *
 * `diario` es una medición real (total ÷ días). `semanal` y `mensual` son esa
 * misma tasa **proyectada** a 7 y 30 días, no un conteo aparte: por eso se
 * rotulan como promedio y no como total. Con 0 pedidos, los tres son 0.
 */
export function promediosDePedidos(
  total: number,
  dias: number,
): { diario: number; semanal: number; mensual: number } {
  const d = Math.max(1, dias);
  const diario = total / d;
  return { diario, semanal: diario * 7, mensual: diario * 30 };
}

// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGOS DE PRESENTACIÓN (orden y color de los gráficos)
// ═══════════════════════════════════════════════════════════════════════════
//
// La página NO escribe colores sueltos ni decide el orden de un eje. Si lo
// hiciera, un gráfico y su leyenda podrían pintar el mismo estado de dos colores
// distintos y el orden cambiaría al mover el periodo. Los colores salen de la
// paleta NECTO y respetan la semántica del badge del store (`estadoBadgeColor`).

/** Orden canónico del pipeline, para leyendas y ejes estables. */
export const ORDEN_ESTADO: PedidoEstado[] = [
  "programado",
  "nuevo",
  "confirmado",
  "en_preparacion",
  "listo",
  "en_camino",
  "entregado",
  "cancelado",
];

/** Color de cada estado del pipeline. */
export const COLOR_ESTADO: Record<PedidoEstado, string> = {
  programado: "#94A3B8", // gris: aún no activo
  nuevo: "#3B82F6", // azul
  confirmado: "#190088", // indigo NECTO
  en_preparacion: "#F59E0B", // ámbar
  listo: "#10B981", // verde
  en_camino: "#7E57FF", // indigo suave NECTO
  entregado: "#059669", // verde profundo
  cancelado: "#F43F5E", // rojo
};

/** Color de cada canal de entrada. */
export const COLOR_ORIGEN: Record<Origen, string> = {
  whatsapp: "#10B981",
  operador: "#3B82F6",
};

/** Color de cada modalidad de entrega. */
export const COLOR_MODALIDAD: Record<Modalidad, string> = {
  retiro: "#8B5CF6",
  domicilio: "#F59E0B",
  en_sitio: "#EC4899",
};

/** Color del estado de pago (donut). */
export const COLOR_PAGO = {
  pagado: "#10B981",
  pendiente: "#F59E0B",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// FILTROS Y ORDEN DE LA VISTA LISTA
// ═══════════════════════════════════════════════════════════════════════════

/** Columnas por las que se puede ordenar la tabla de pedidos. */
export const COLUMNAS_ORDEN = [
  "numero",
  "cliente",
  "telefono",
  "origen",
  "modalidad",
  "total",
  "estado",
  "fecha",
] as const;
export type ColumnaOrden = (typeof COLUMNAS_ORDEN)[number];

export type DireccionOrden = "asc" | "desc";

export interface Orden {
  columna: ColumnaOrden;
  direccion: DireccionOrden;
}

/** Orden por defecto: lo más reciente primero. */
export const ORDEN_INICIAL: Orden = { columna: "fecha", direccion: "desc" };

/** Filtro rápido por estado: `""` = todos. */
export type FiltroEstado = "" | PedidoEstado;

/** Estado vacío de los filtros de la vista lista. */
export interface FiltrosLista {
  busqueda: string;
  estado: FiltroEstado;
}

export const FILTROS_LISTA_VACIOS: FiltrosLista = { busqueda: "", estado: "" };

/** Valida que un valor arbitrario sea una columna ordenable (type guard). */
export function esColumnaOrden(v: string): v is ColumnaOrden {
  return (COLUMNAS_ORDEN as readonly string[]).includes(v);
}

/**
 * Filtra pedidos por texto (cliente, nº de pedido o teléfono, sin distinguir
 * mayúsculas ni tildes de formato) y por estado exacto. Pura.
 */
export function filtrarLista(pedidos: Pedido[], f: FiltrosLista): Pedido[] {
  const q = f.busqueda.trim().toLowerCase();
  return pedidos.filter((p) => {
    if (f.estado && p.estado !== f.estado) return false;
    if (!q) return true;
    return (
      p.cliente.toLowerCase().includes(q) ||
      p.numero.toLowerCase().includes(q) ||
      p.telefono.toLowerCase().includes(q)
    );
  });
}

/** Total monetario de un pedido. Duplicado deliberado del del store: estas
 *  utilidades son puras sobre la entidad y no tienen acceso a la instancia. */
function totalDe(p: Pedido): number {
  return p.items.reduce((s, it) => s + (it.precio ?? 0) * it.cantidad, 0);
}

/**
 * Ordena una copia de la lista según `orden`. El desempate es estable por
 * `createdAt` descendente, para que dos pedidos con el mismo valor no bailen
 * entre renders. Pura: no muta la entrada.
 */
export function ordenarLista(pedidos: Pedido[], orden: Orden): Pedido[] {
  const factor = orden.direccion === "asc" ? 1 : -1;
  const valor = (p: Pedido): string | number => {
    switch (orden.columna) {
      case "numero":
        return p.numero;
      case "cliente":
        return p.cliente;
      case "telefono":
        return p.telefono;
      case "origen":
        return p.origen;
      case "modalidad":
        return p.modalidad;
      case "total":
        return totalDe(p);
      case "estado":
        return p.estado;
      case "fecha":
        return p.createdAt;
    }
  };
  return [...pedidos].sort((a, b) => {
    const va = valor(a);
    const vb = valor(b);
    let cmp: number;
    if (typeof va === "number" && typeof vb === "number") {
      cmp = (va - vb) * factor;
    } else {
      cmp = String(va).localeCompare(String(vb)) * factor;
    }
    if (cmp !== 0) return cmp;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/** Página de resultados + metadatos para pintar el paginador. */
export interface Pagina<T> {
  items: T[];
  /** Página actual, 1-based. */
  pagina: number;
  totalPaginas: number;
  totalItems: number;
}

/**
 * Trocea `items` en páginas de `porPagina`. La página pedida se acota al rango
 * válido (nunca devuelve una página vacía por pasarse de largo). Con lista
 * vacía devuelve 1 página vacía, para que el paginador no muestre "0 de 0".
 */
export function paginar<T>(items: T[], pagina: number, porPagina: number): Pagina<T> {
  const totalItems = items.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItems / porPagina));
  const actual = Math.min(Math.max(1, Math.floor(pagina) || 1), totalPaginas);
  const inicio = (actual - 1) * porPagina;
  return {
    items: items.slice(inicio, inicio + porPagina),
    pagina: actual,
    totalPaginas,
    totalItems,
  };
}

/** Tamaños de página ofrecidos en la vista lista. */
export const TAMANOS_PAGINA = [10, 25, 50] as const;

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN A CSV
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Escapa un campo para CSV.
 *
 * Regla: si el valor contiene separador, comilla doble o salto de línea, se
 * envuelve en comillas dobles y las comillas internas se duplican. Así un
 * cliente llamado `Pérez, "el jefe"` no rompe la estructura de columnas.
 * Se usa separador `,` y fin de línea CRLF, que es lo que Excel espera.
 */
export function escaparCampoCsv(valor: string | number): string {
  const s = String(valor ?? "");
  const necesitaComillas = /[",\r\n]/.test(s);
  if (!necesitaComillas) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Une filas ya construidas en un CSV completo (encabezado incluido). */
export function construirCsv(encabezados: string[], filas: (string | number)[][]): string {
  const lineas = [encabezados, ...filas].map((fila) =>
    fila.map(escaparCampoCsv).join(","),
  );
  return lineas.join("\r\n");
}

/** Columnas del CSV de pedidos, en orden. */
export const CSV_ENCABEZADOS = [
  "ID Pedido",
  "Cliente",
  "Teléfono",
  "Canal",
  "Modalidad",
  "Monto Total",
  "Estado",
  "Fecha",
] as const;

/** Formatea una fecha ISO como "YYYY-MM-DD HH:mm" local para el CSV. */
export function fechaLegibleCsv(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Mapea pedidos a filas de CSV usando **las etiquetas del store** para canal,
 * modalidad y estado, de modo que el archivo exportado diga lo mismo que la
 * pantalla (incluidos los alias configurados). El consumidor pasa los
 * formateadores del store para no duplicar el vocabulario aquí.
 */
export function filasCsv(
  pedidos: Pedido[],
  etiquetas: {
    origenLabel: (o: Origen) => string;
    modalidadLabel: (m: Modalidad) => string;
    estadoLabel: (e: PedidoEstado) => string;
  },
): (string | number)[][] {
  return pedidos.map((p) => [
    p.numero,
    p.cliente,
    p.telefono,
    etiquetas.origenLabel(p.origen),
    etiquetas.modalidadLabel(p.modalidad),
    totalDe(p),
    etiquetas.estadoLabel(p.estado),
    fechaLegibleCsv(p.createdAt),
  ]);
}

/** Nombre de archivo de la descarga: `stockflow-analitica-YYYY-MM-DD.csv`. */
export function nombreArchivoCsv(ref: Date = new Date()): string {
  return `stockflow-analitica-${ymdLocal(ref)}.csv`;
}

/**
 * Prefijo que Excel/LibreOffice necesitan para no reinterpretar los acentos al
 * abrir un CSV UTF-8 sin BOM (típico con "Teléfono" o "En preparación").
 */
export const BOM_UTF8 = "\uFEFF";

/**
 * Lanza la descarga de un CSV en el navegador. Aísla el efecto de DOM para que
 * el resto del módulo siga siendo puro y testeable. No hace nada si no hay
 * `document` (entorno de pruebas en node).
 */
export function descargarCsv(contenido: string, nombreArchivo: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([BOM_UTF8 + contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
