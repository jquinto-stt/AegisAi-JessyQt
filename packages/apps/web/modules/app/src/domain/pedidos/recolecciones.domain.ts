/**
 * Recolecciones de transportadora — el dominio, sin UI ni store.
 *
 * ── Qué es una recolección y qué no ───────────────────────────────────────
 *
 * Una recolección es la CITA en la que una transportadora pasa por una bodega a
 * llevarse los paquetes ya alistados. No es un pedido ni un envío: un pedido
 * tiene guía y cliente; una recolección tiene una ventana horaria y una persona
 * que entrega el paquete en la puerta. Por eso vive en su propio tipo y no como
 * un campo de `Pedido`.
 *
 * ── Los tres estados, y por qué no hay un cuarto ──────────────────────────
 *
 * `programada` → la cita existe y nadie la ha confirmado.
 * `asignada`  → la transportadora confirmó que pasa (llega un mensajero).
 * `con_novedad` → pasó algo (no vino, vino incompleto, no había paquetes).
 *
 * No hay `completada`: el hecho de que la recolección haya ocurrido se lee en
 * los pedidos que salieron, no en la cita. Inventar un cuarto estado para
 * «terminada» obligaría a mantener dos fuentes de la misma verdad.
 *
 * ── El código es corto a propósito ────────────────────────────────────────
 *
 * `REC-0001` se dicta por teléfono y se escribe a mano en la planilla de la
 * transportadora. Un UUID sería único y sería ilegible en esa conversación.
 */

export type TipoRecoleccion = "eventual" | "fija";

export type EstadoRecoleccion = "programada" | "asignada" | "con_novedad";

export interface Recoleccion {
  id: string;
  /** `REC-0001`: el identificador que se dicta por teléfono. */
  codigo: string;
  tipo: TipoRecoleccion;
  transportadora: string;
  bodega: string;
  /** Fecha local en `YYYY-MM-DD` (sin hora: la hora es el horario). */
  fecha: string;
  /** Ventana horaria tal como la da la transportadora: «14:00 - 16:00». */
  horario: string;
  paquetes: number;
  /** Quién entrega los paquetes en la puerta de la bodega. */
  despacha: string;
  estado: EstadoRecoleccion;
  creadaEn: string;
}

export interface DatosRecoleccion {
  tipo: TipoRecoleccion;
  transportadora: string;
  bodega: string;
  fecha: string;
  horario: string;
  paquetes: number | string;
  despacha: string;
}

export const ETIQUETA_ESTADO_RECOLECCION: Record<EstadoRecoleccion, string> = {
  programada: "Programada",
  asignada: "Asignada",
  con_novedad: "Con novedad",
};

/** Los tres estados, en el orden en que se pintan los filtros rápidos. */
export const ESTADOS_RECOLECCION: readonly EstadoRecoleccion[] = [
  "programada",
  "asignada",
  "con_novedad",
];

/**
 * Qué le falta a un formulario de recolección para poder guardarse.
 *
 * Devuelve TODOS los errores, no el primero: quien llena seis campos merece ver
 * los seis de una vez y no descubrirlos de uno en uno. La UI los pinta juntos.
 */
export function validarRecoleccion(datos: DatosRecoleccion): string[] {
  const errores: string[] = [];
  if (!datos.transportadora?.trim()) errores.push("Elige la transportadora.");
  if (!datos.bodega?.trim()) errores.push("Escribe la bodega de donde se recoge.");
  if (!datos.fecha?.trim()) errores.push("Indica la fecha programada.");
  if (!datos.horario?.trim()) errores.push("Indica el horario de recolección.");
  const paquetes = Number(datos.paquetes);
  if (!Number.isFinite(paquetes) || paquetes <= 0) {
    errores.push("El número de paquetes tiene que ser mayor que cero.");
  }
  if (!datos.despacha?.trim()) errores.push("Escribe quién despacha.");
  return errores;
}

/**
 * Siguiente código libre de la lista.
 *
 * Se calcula sobre el MAYOR existente y no sobre `length + 1`: al borrar una
 * recolección del medio, contar elementos repartiría un código ya usado y dos
 * citas distintas terminarían con el mismo número en la planilla.
 */
export function siguienteCodigo(recolecciones: Recoleccion[]): string {
  const mayor = recolecciones.reduce((acc, r) => {
    const n = Number(String(r.codigo).replace(/\D/g, ""));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `REC-${String(mayor + 1).padStart(4, "0")}`;
}

export interface FiltroRecolecciones {
  tipo: TipoRecoleccion;
  estados: EstadoRecoleccion[];
  /** Nombre exacto de la transportadora, o `null` para no filtrar por ella. */
  transportadora?: string | null;
}

/**
 * Las recolecciones que la tabla debe enseñar.
 *
 * El tipo (Eventual / Fija) es una pestaña, no un filtro acumulable: se aplica
 * siempre. Los estados son acumulables, y con ninguno marcado no filtran nada
 * —«sin filtros» no es lo mismo que «ninguno», y confundirlos dejaría la tabla
 * vacía al abrir la página—.
 *
 * El orden es por fecha ascendente: la recolección de mañana importa más que la
 * del mes que viene, y el horario desempata el mismo día.
 */
export function filtrarRecolecciones(
  recolecciones: Recoleccion[],
  filtro: FiltroRecolecciones,
): Recoleccion[] {
  return recolecciones
    .filter((r) => r.tipo === filtro.tipo)
    .filter((r) => !filtro.transportadora || r.transportadora === filtro.transportadora)
    .filter((r) => filtro.estados.length === 0 || filtro.estados.includes(r.estado))
    .sort((a, b) => `${a.fecha} ${a.horario}`.localeCompare(`${b.fecha} ${b.horario}`));
}

// ═══════════════════════════════════════════════════════════════════════════
// RECOLECCIÓN FIJA — la cita que se repite
// ═══════════════════════════════════════════════════════════════════════════
//
// Una recolección eventual es un HECHO con fecha («pasa el jueves 30»); una fija
// es una REGLA («pasa todos los martes y jueves por la tarde»). Por eso no son el
// mismo tipo con un campo de más: la fija no tiene fecha ni estado, tiene días de
// la semana y una ventana horaria. Meterlas en un solo tipo obligaría a que media
// docena de campos fueran opcionales según el caso, y a que la tabla y las
// tarjetas pintaran huecos que no significan nada.

export type DiaSemana =
  | "lunes"
  | "martes"
  | "miercoles"
  | "jueves"
  | "viernes"
  | "sabado"
  | "domingo";

/** En el orden en que se leen y se pintan: la semana empieza el lunes. */
export const DIAS_SEMANA: readonly DiaSemana[] = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

export const ETIQUETA_DIA: Record<DiaSemana, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

/**
 * La inicial de cada día para los chips de la tarjeta.
 *
 * El miércoles va con «X» y no con «M»: en español martes y miércoles empiezan
 * igual, y dos chips con la misma letra no se distinguen de un vistazo.
 */
export const INICIAL_DIA: Record<DiaSemana, string> = {
  lunes: "L",
  martes: "M",
  miercoles: "X",
  jueves: "J",
  viernes: "V",
  sabado: "S",
  domingo: "D",
};

export type RangoRecoleccion = "manana" | "tarde";

export const ETIQUETA_RANGO: Record<RangoRecoleccion, string> = {
  manana: "Mañana",
  tarde: "Tarde",
};

/**
 * La ventana horaria de cada rango.
 *
 * El operador elige «mañana» o «tarde», no las horas: la transportadora es la que
 * fija su ventana, y dejar escribir horas libres producía citas que ella no
 * reconoce. Cuando exista el conector, estos dos valores vienen de su catálogo.
 */
export const HORARIO_RANGO: Record<RangoRecoleccion, string> = {
  manana: "8:00 AM - 12:00 PM",
  tarde: "12:00 PM - 5:00 PM",
};

export const RANGOS_RECOLECCION: readonly RangoRecoleccion[] = ["manana", "tarde"];

export interface ConfiguracionFija {
  id: string;
  transportadora: string;
  /** Pausada no borra la regla: deja de anunciarse y se puede reactivar. */
  activa: boolean;
  dias: DiaSemana[];
  bodega: string;
  direccion: string;
  despachaNombre: string;
  despachaApellidos: string;
  rango: RangoRecoleccion;
  paquetes: number;
  notas: string;
  actualizadaEn: string;
}

export interface DatosConfiguracionFija {
  transportadora: string;
  dias: DiaSemana[];
  bodega: string;
  direccion: string;
  despachaNombre: string;
  despachaApellidos: string;
  rango: RangoRecoleccion;
  paquetes: number | string;
  notas: string;
}

/**
 * Qué le falta a una configuración para poder guardarse.
 *
 * Devuelve TODOS los errores, igual que `validarRecoleccion`: el formulario los
 * pinta juntos y quien lo llena no descubre los problemas de uno en uno.
 */
export function validarConfiguracionFija(datos: DatosConfiguracionFija): string[] {
  const errores: string[] = [];
  if (!datos.transportadora?.trim()) errores.push("Elige la transportadora.");
  if (!datos.dias || datos.dias.length === 0) {
    errores.push("Elige al menos un día de la semana.");
  }
  if (!datos.bodega?.trim()) errores.push("Escribe la bodega de donde se recoge.");
  if (!datos.direccion?.trim()) errores.push("Escribe la dirección de la bodega.");
  if (!datos.despachaNombre?.trim()) errores.push("Escribe el nombre de quien despacha.");
  if (!datos.despachaApellidos?.trim()) errores.push("Escribe los apellidos de quien despacha.");
  const paquetes = Number(datos.paquetes);
  if (!Number.isFinite(paquetes) || paquetes <= 0) {
    errores.push("El número de paquetes tiene que ser mayor que cero.");
  }
  return errores;
}

/** Los días en el orden de la semana, sin repetidos. */
export function ordenarDias(dias: DiaSemana[]): DiaSemana[] {
  return DIAS_SEMANA.filter((dia) => dias.includes(dia));
}

/**
 * La frecuencia en palabras: «Martes y jueves», «Entre semana», «Todos los días».
 *
 * Existe para que la tarjeta no dependa de que el lector cuente chips de colores.
 * Los tres casos frecuentes se nombran; el resto se enumera.
 */
export function frecuenciaLegible(dias: DiaSemana[]): string {
  const orden = ordenarDias(dias);
  if (orden.length === 0) return "Sin días";
  if (orden.length === 7) return "Todos los días";
  if (orden.length === 5 && !orden.includes("sabado") && !orden.includes("domingo")) {
    return "Entre semana";
  }
  if (orden.length === 2 && orden.includes("sabado") && orden.includes("domingo")) {
    return "Fines de semana";
  }
  // En español los días van en minúscula dentro de la frase («martes y jueves»);
  // solo se pone en mayúscula la primera letra, porque la frase abre la línea.
  const nombres = orden.map((dia) => ETIQUETA_DIA[dia].toLocaleLowerCase("es"));
  const frase =
    nombres.length === 1
      ? nombres[0]
      : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
  return frase.charAt(0).toLocaleUpperCase("es") + frase.slice(1);
}
