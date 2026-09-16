import type { Pedido, PedidoEstado, Modalidad } from "@/stores/pedidos.store";

/** Filtros aplicables al historial de pedidos. */
export interface HistorialFiltros {
  /** "entregado" | "cancelado" | "" (todos los terminales). */
  estado: "" | Extract<PedidoEstado, "entregado" | "cancelado">;
  /** Modalidad exacta o "" (todas). */
  modalidad: "" | Modalidad;
  /** Búsqueda por nombre de cliente o número (case-insensitive). */
  busqueda: string;
  /** Fecha desde (ISO "YYYY-MM-DD") o "" (sin límite inferior). */
  desde: string;
  /** Fecha hasta (ISO "YYYY-MM-DD") o "" (sin límite superior). */
  hasta: string;
}

export const FILTROS_VACIOS: HistorialFiltros = {
  estado: "",
  modalidad: "",
  busqueda: "",
  desde: "",
  hasta: "",
};

/** Fecha (YYYY-MM-DD) de referencia de un pedido terminal: finishedAt o createdAt. */
function fechaRef(p: Pedido): string {
  const iso = p.finishedAt ?? p.createdAt;
  return iso.slice(0, 10);
}

/**
 * Filtra una lista de pedidos (ya terminales) según los filtros dados.
 * Pura y sin efectos — apta para pruebas unitarias.
 */
export function filtrarHistorial(pedidos: Pedido[], f: HistorialFiltros): Pedido[] {
  const q = f.busqueda.trim().toLowerCase();
  return pedidos.filter((p) => {
    if (f.estado && p.estado !== f.estado) return false;
    if (f.modalidad && p.modalidad !== f.modalidad) return false;
    if (q && !(p.cliente.toLowerCase().includes(q) || p.numero.toLowerCase().includes(q))) return false;
    const fecha = fechaRef(p);
    if (f.desde && fecha < f.desde) return false;
    if (f.hasta && fecha > f.hasta) return false;
    return true;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// RESUMEN / ANALÍTICA (vista Resumen) — puro y testeable
// ═══════════════════════════════════════════════════════════════════════════

/** Total monetario de un pedido (precio × cantidad de cada item). */
function totalDe(p: Pedido): number {
  return p.items.reduce((s, it) => s + (it.precio ?? 0) * it.cantidad, 0);
}

export interface ResumenHistorial {
  /** Total de pedidos cerrados en el conjunto. */
  total: number;
  entregados: number;
  cancelados: number;
  /** Porcentaje de cancelación (0–100, redondeado). 0 si no hay pedidos. */
  tasaCancelacion: number;
  /** Ticket promedio de los ENTREGADOS (con items con precio). 0 si no hay. */
  ticketPromedio: number;
  /** Suma facturada de los entregados. */
  totalFacturado: number;
  /** Conteo por modalidad, ordenado de mayor a menor. */
  porModalidad: { modalidad: Modalidad; cantidad: number }[];
}

/**
 * Calcula KPIs sobre un conjunto de pedidos terminales (idealmente el YA
 * filtrado, para que el resumen refleje los filtros activos). Puro y sin efectos.
 */
export function resumenHistorial(pedidos: Pedido[]): ResumenHistorial {
  const total = pedidos.length;
  const entregadosList = pedidos.filter((p) => p.estado === "entregado");
  const entregados = entregadosList.length;
  const cancelados = pedidos.filter((p) => p.estado === "cancelado").length;

  const totalFacturado = entregadosList.reduce((s, p) => s + totalDe(p), 0);
  const conValor = entregadosList.filter((p) => totalDe(p) > 0).length;
  const ticketPromedio = conValor > 0 ? Math.round(totalFacturado / conValor) : 0;

  const tasaCancelacion = total > 0 ? Math.round((cancelados / total) * 100) : 0;

  const conteo = new Map<Modalidad, number>();
  for (const p of pedidos) conteo.set(p.modalidad, (conteo.get(p.modalidad) ?? 0) + 1);
  const porModalidad = Array.from(conteo.entries())
    .map(([modalidad, cantidad]) => ({ modalidad, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  return { total, entregados, cancelados, tasaCancelacion, ticketPromedio, totalFacturado, porModalidad };
}

// ═══════════════════════════════════════════════════════════════════════════
// AGRUPACIÓN POR DÍA (vista Timeline) — puro y testeable
// ═══════════════════════════════════════════════════════════════════════════

export interface GrupoDia {
  /** Clave del día "YYYY-MM-DD" (por finishedAt o createdAt). */
  dia: string;
  /** Pedidos de ese día, ordenados por hora de cierre descendente. */
  pedidos: Pedido[];
  /** Resumen del día (para el encabezado de la sección). */
  resumen: ResumenHistorial;
}

/**
 * Agrupa pedidos terminales por día de cierre, del más reciente al más antiguo.
 * Cada grupo trae su propio resumen. Puro y sin efectos.
 */
export function agruparPorDia(pedidos: Pedido[]): GrupoDia[] {
  const mapa = new Map<string, Pedido[]>();
  for (const p of pedidos) {
    const iso = p.finishedAt ?? p.createdAt;
    const dia = iso.slice(0, 10);
    const arr = mapa.get(dia);
    if (arr) arr.push(p);
    else mapa.set(dia, [p]);
  }
  return Array.from(mapa.entries())
    .sort((a, b) => b[0].localeCompare(a[0])) // día más reciente primero
    .map(([dia, lista]) => ({
      dia,
      pedidos: [...lista].sort((a, b) =>
        (b.finishedAt ?? b.createdAt).localeCompare(a.finishedAt ?? a.createdAt),
      ),
      resumen: resumenHistorial(lista),
    }));
}

/** Etiqueta legible de un día "YYYY-MM-DD": "Hoy", "Ayer" o "13 de septiembre". */
export function etiquetaDia(dia: string): string {
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (dia === fmt(hoy)) return "Hoy";
  if (dia === fmt(ayer)) return "Ayer";
  return new Date(`${dia}T00:00:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
}

// ═══════════════════════════════════════════════════════════════════════════
// HEATMAP: modalidad × día de la semana (para ApexCharts type="heatmap")
// ═══════════════════════════════════════════════════════════════════════════

/** Días de la semana en orden Lun→Dom (eje X del heatmap). */
export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

/** Índice 0..6 (Lun=0 … Dom=6) del día de cierre de un pedido. */
function indiceDiaSemana(p: Pedido): number {
  const iso = p.finishedAt ?? p.createdAt;
  const js = new Date(iso).getDay(); // 0=Dom … 6=Sáb
  return (js + 6) % 7; // 0=Lun … 6=Dom
}

/** Una serie de heatmap: nombre (modalidad) + puntos {x: día, y: conteo}. */
export interface HeatmapSerie {
  name: string;
  data: { x: string; y: number }[];
}

/**
 * Construye la matriz modalidad (filas) × día de la semana (columnas) contando
 * pedidos por celda. Devuelve una serie por modalidad presente, en el formato
 * que espera ApexCharts (type="heatmap"). Puro y testeable.
 *
 * `labelModalidad` traduce el id de modalidad a su etiqueta legible (se inyecta
 * para no acoplar el helper al store).
 */
export function matrizModalidadDia(
  pedidos: Pedido[],
  labelModalidad: (m: Modalidad) => string,
): HeatmapSerie[] {
  // Modalidades presentes, en orden canónico.
  const orden: Modalidad[] = ["retiro", "domicilio", "en_sitio"];
  const presentes = orden.filter((m) => pedidos.some((p) => p.modalidad === m));

  return presentes.map((m) => {
    const data = DIAS_SEMANA.map((dia, idx) => ({
      x: dia,
      y: pedidos.filter((p) => p.modalidad === m && indiceDiaSemana(p) === idx).length,
    }));
    return { name: labelModalidad(m), data };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HEATMAP DE DÍAS REALES (tipo GitHub): una celda por día en los últimos N días
// ═══════════════════════════════════════════════════════════════════════════

/** Una celda de actividad diaria: fecha "YYYY-MM-DD" + conteo de pedidos cerrados. */
export interface CeldaDia {
  fecha: string;
  cantidad: number;
}

/** Rangos de días disponibles para el heatmap. */
export const RANGOS_DIAS = [15, 30, 60, 90, 120, 240, 360] as const;
export type RangoDias = (typeof RANGOS_DIAS)[number];

/** "YYYY-MM-DD" local de una fecha. */
function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Actividad diaria de los últimos `dias` días (incluye hoy), del más antiguo al
 * más reciente. Cuenta los pedidos por día de cierre (finishedAt o createdAt).
 * Puro y testeable — la fecha de referencia se puede inyectar para tests.
 */
export function actividadDiaria(pedidos: Pedido[], dias: number, ref: Date = new Date()): CeldaDia[] {
  // Conteo por día.
  const conteo = new Map<string, number>();
  for (const p of pedidos) {
    const iso = p.finishedAt ?? p.createdAt;
    const dia = iso.slice(0, 10);
    conteo.set(dia, (conteo.get(dia) ?? 0) + 1);
  }
  // Genera las celdas de los últimos `dias` días (del más antiguo al más reciente).
  const celdas: CeldaDia[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(ref);
    d.setDate(ref.getDate() - i);
    const fecha = ymdLocal(d);
    celdas.push({ fecha, cantidad: conteo.get(fecha) ?? 0 });
  }
  return celdas;
}

/**
 * Organiza las celdas diarias en semanas (columnas) para un heatmap estilo
 * GitHub: cada semana es un array de 7 posiciones (Lun→Dom); las posiciones
 * anteriores al primer día real quedan como null (relleno). Puro y testeable.
 */
export function enSemanas(celdas: CeldaDia[]): (CeldaDia | null)[][] {
  if (celdas.length === 0) return [];
  const semanas: (CeldaDia | null)[][] = [];
  let semana: (CeldaDia | null)[] = [];

  // Relleno inicial hasta el día de semana del primer día (Lun=0 … Dom=6).
  const primerJs = new Date(`${celdas[0].fecha}T00:00:00`).getDay();
  const primerIdx = (primerJs + 6) % 7;
  for (let i = 0; i < primerIdx; i++) semana.push(null);

  for (const c of celdas) {
    semana.push(c);
    if (semana.length === 7) {
      semanas.push(semana);
      semana = [];
    }
  }
  // Última semana incompleta: rellena con null.
  if (semana.length > 0) {
    while (semana.length < 7) semana.push(null);
    semanas.push(semana);
  }
  return semanas;
}

/**
 * Actividad diaria entre dos fechas "YYYY-MM-DD" inclusive (del más antiguo al
 * más reciente). Cuenta pedidos por día de cierre. Si el rango es inválido
 * (desde > hasta) devuelve []. Puro y testeable.
 */
export function actividadEntre(pedidos: Pedido[], desde: string, hasta: string): CeldaDia[] {
  if (!desde || !hasta || desde > hasta) return [];

  const conteo = new Map<string, number>();
  for (const p of pedidos) {
    const dia = (p.finishedAt ?? p.createdAt).slice(0, 10);
    conteo.set(dia, (conteo.get(dia) ?? 0) + 1);
  }

  const celdas: CeldaDia[] = [];
  const cur = new Date(`${desde}T00:00:00`);
  const fin = new Date(`${hasta}T00:00:00`);
  // Límite de seguridad para no generar rangos absurdos (máx ~2 años).
  let guard = 0;
  while (cur.getTime() <= fin.getTime() && guard < 800) {
    const fecha = ymdLocal(cur);
    celdas.push({ fecha, cantidad: conteo.get(fecha) ?? 0 });
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return celdas;
}

// ═══════════════════════════════════════════════════════════════════════════
// AGRUPACIÓN POR MES (heatmap segmentado con etiqueta de mes)
// ═══════════════════════════════════════════════════════════════════════════

/** Etiquetas cortas de mes (índice 0=Ene … 11=Dic). */
export const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"] as const;

/** Un bloque de mes en el heatmap: etiqueta + semanas (columnas) alineadas Lun→Dom. */
export interface BloqueMes {
  /** Clave "YYYY-MM" del mes. */
  clave: string;
  /** Etiqueta corta (ej. "Sep 26" si abarca varios años, o "Sep"). */
  label: string;
  /** Semanas del mes: cada una 7 posiciones (Lun→Dom), null = relleno. */
  semanas: (CeldaDia | null)[][];
}

/**
 * Parte las celdas diarias en bloques por mes calendario; cada bloque se
 * organiza en semanas (Lun→Dom) con relleno para alinear el primer día del mes
 * a su día de semana. Puro y testeable.
 *
 * `multiAnio` añade el año a la etiqueta cuando el rango cruza más de un año.
 */
export function agruparPorMes(celdas: CeldaDia[]): BloqueMes[] {
  if (celdas.length === 0) return [];

  // Agrupa por "YYYY-MM" preservando el orden cronológico.
  const orden: string[] = [];
  const porMes = new Map<string, CeldaDia[]>();
  for (const c of celdas) {
    const clave = c.fecha.slice(0, 7);
    if (!porMes.has(clave)) {
      porMes.set(clave, []);
      orden.push(clave);
    }
    porMes.get(clave)!.push(c);
  }

  const anios = new Set(orden.map((k) => k.slice(0, 4)));
  const multiAnio = anios.size > 1;

  return orden.map((clave) => {
    const dias = porMes.get(clave)!;
    const mesIdx = Number(clave.slice(5, 7)) - 1;
    const anio = clave.slice(2, 4);
    const label = multiAnio ? `${MESES_CORTOS[mesIdx]} ${anio}` : MESES_CORTOS[mesIdx];
    return { clave, label, semanas: enSemanas(dias) };
  });
}
