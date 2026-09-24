// ═══════════════════════════════════════════════════════════════════════════
// CALENDARIO DEL INICIO — aritmética de fechas
// ═══════════════════════════════════════════════════════════════════════════
//
// Módulo PURO: sin React y sin store. Todo lo que hay aquí es una función de
// fecha a fecha, así que se puede razonar (y probar) sin montar un componente
// ni una sesión. Quien lee el store es el widget, no esto.
//
// ── Regla de bucketing: día de calendario LOCAL, nunca UTC ─────────────────
//
// Es la misma regla que ya documenta `pedidos.store.ts` (`ymdLocal`) y la que
// causó un defecto real: `toISOString().slice(0, 10)` en una zona con offset
// negativo (America/Bogota, UTC−5) **adelanta el día a partir de las 19:00
// locales**, así que un pedido de las 20:00 del día 17 se indexaba bajo el 18.
// Aquí se construye el "YYYY-MM-DD" con los componentes locales del `Date` y
// **nunca** se pasa por `toISOString`.
//
// ── Por qué existe y no se reutiliza el calendario de `ProgramarModal` ─────
//
// `ProgramarModal` construye su rejilla a mano y con otra responsabilidad:
// elige una fecha FUTURA y deshabilita el pasado, porque programa pedidos.
// Este calendario hace lo contrario: mira hacia atrás, cuenta lo que pasó y no
// deshabilita nada. Compartir la rejilla habría obligado a un parámetro que
// invierte la semántica del control, y esa es la clase de interruptor que
// termina mintiendo. Lo que sí se comparte es el CRITERIO: semana Lun-first,
// mismos rótulos, mismo "YYYY-MM-DD" local.
//
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Un mes del calendario.
 *
 * `month` es 0–11, igual que `Date.getMonth()`, para que no haya conversiones
 * al construir `Date`. Un mes "1" que en un sitio es enero y en otro febrero es
 * el tipo de discrepancia que este proyecto ya pagó una vez.
 */
export interface MesCalendario {
  year: number;
  /** Mes 0–11. */
  month: number;
}

/** Rótulos de mes, en el orden de `Date.getMonth()`. */
export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

/**
 * Rótulos de los días de la semana, **empezando en lunes**.
 *
 * La rejilla es Lun-first y `DIAS_SEMANA[i]` corresponde a la columna `i`, no a
 * `Date.getDay()`. La traducción la hace `construirRejillaMes`, que es el único
 * sitio donde se toca `getDay()`.
 */
export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

/** Dos dígitos con cero a la izquierda. */
export const pad2 = (n: number): string => String(n).padStart(2, "0");

/** "YYYY-MM-DD" del día de calendario **local** de un `Date`. */
export function ymdDeDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** El día de hoy como "YYYY-MM-DD" local. */
export function hoyYmd(): string {
  return ymdDeDate(new Date());
}

/** El mes al que pertenece un "YYYY-MM-DD". */
export function mesDeYmd(ymd: string): MesCalendario {
  const [y, m] = ymd.split("-").map(Number);
  return { year: y, month: (m || 1) - 1 };
}

/** El mes en el que estamos. */
export function mesActual(): MesCalendario {
  return mesDeYmd(hoyYmd());
}

/** "YYYY-MM-DD" de un día del mes (1–31). */
export function ymdDeMesDia(mes: MesCalendario, dia: number): string {
  return `${mes.year}-${pad2(mes.month + 1)}-${pad2(dia)}`;
}

/** Cuántos días tiene el mes. `new Date(y, m+1, 0)` = último día del mes `m`. */
export function diasDelMes(mes: MesCalendario): number {
  return new Date(mes.year, mes.month + 1, 0).getDate();
}

/**
 * Rejilla del mes, **lunes primero**, con `null` en los huecos.
 *
 * Devuelve "YYYY-MM-DD" por celda en vez de números sueltos: así el llamante no
 * tiene que volver a componer la fecha y no hay dos sitios que puedan componerla
 * distinto. La longitud es siempre múltiplo de 7, que es lo que permite pintarla
 * con un `grid-cols-7` sin filas a medias.
 */
export function construirRejillaMes(mes: MesCalendario): (string | null)[] {
  const primero = new Date(mes.year, mes.month, 1);
  // `getDay()` da domingo = 0; la rejilla quiere lunes = 0.
  const huecos = (primero.getDay() + 6) % 7;
  const total = diasDelMes(mes);

  const celdas: (string | null)[] = [];
  for (let i = 0; i < huecos; i++) celdas.push(null);
  for (let d = 1; d <= total; d++) celdas.push(ymdDeMesDia(mes, d));
  while (celdas.length % 7 !== 0) celdas.push(null);
  return celdas;
}

/** El mes desplazado `delta` meses (negativo = atrás), con el año ya ajustado. */
export function desplazarMes(mes: MesCalendario, delta: number): MesCalendario {
  const d = new Date(mes.year, mes.month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** "Septiembre 2026". */
export function tituloMes(mes: MesCalendario): string {
  return `${MESES[mes.month]} ${mes.year}`;
}

/** Primer y último día del mes, ambos inclusive. */
export function rangoDeMes(mes: MesCalendario): { desde: string; hasta: string } {
  return { desde: ymdDeMesDia(mes, 1), hasta: ymdDeMesDia(mes, diasDelMes(mes)) };
}

/**
 * El tramo del mes que **ya tiene datos**: de su primer día hasta hoy.
 *
 * Un mes en curso no ha terminado. Medir su volumen hasta el último día del
 * calendario rellenaría de ceros la parte que aún no ha pasado, y una serie que
 * cae a cero al final se lee como «las ventas se desplomaron» cuando lo único
 * que pasa es que todavía no son las fechas. El gráfico mide lo medido.
 *
 * Si el mes entero está en el futuro no hay nada que medir: se devuelve un
 * tramo de un solo día (el primero), que el gráfico pinta como «sin datos» en
 * vez de como una serie plana.
 */
export function rangoDelMesHastaHoy(mes: MesCalendario): { desde: string; hasta: string } {
  const { desde, hasta } = rangoDeMes(mes);
  const hoy = hoyYmd();
  if (desde > hoy) return { desde, hasta: desde };
  return { desde, hasta: hasta < hoy ? hasta : hoy };
}

/** ¿Los dos meses son el mismo? */
export function mismoMes(a: MesCalendario, b: MesCalendario): boolean {
  return a.year === b.year && a.month === b.month;
}

/** Fecha larga legible: "martes, 15 de septiembre". */
export function fechaLegible(ymd: string): string {
  return new Date(`${ymd}T00:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Fecha corta legible: "15 sep". */
export function fechaCorta(ymd: string): string {
  return new Date(`${ymd}T00:00:00`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Hora legible de un instante ISO: "02:30 p. m.".
 *
 * Se formatea con `es-CO` y no a mano porque el locale decide si el meridiano
 * va con puntos o sin ellos, y el resto de la app ya habla así.
 */
export function horaLegible(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

/** El día desplazado `n` días (negativo = atrás). */
export function sumarDias(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + n);
  return ymdDeDate(d);
}

/** ¿Es hoy? */
export function esHoy(ymd: string): boolean {
  return ymd === hoyYmd();
}

/**
 * ¿El día todavía no ha pasado?
 *
 * Se compara como cadena "YYYY-MM-DD": el formato es lexicográficamente
 * ordenable, así que no hace falta construir un `Date` ni preocuparse por la
 * hora del día. Un día futuro no tiene pedidos entregados y no puede tenerlos:
 * el panel del día lo dice en vez de mostrar un cero que parece un fallo.
 */
export function esFuturo(ymd: string): boolean {
  return ymd > hoyYmd();
}
