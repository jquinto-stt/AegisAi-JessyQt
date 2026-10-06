import type { BadgeColor } from "@/elements/ui/badge";
import type {
  CondicionElemento,
  EstadoElemento,
  EstadoInventario,
  EstadoLinea,
  SeveridadAlerta,
  TipoAlerta,
  TipoInventario,
  UnidadElemento,
} from "@/domain/inventarios/inventarios.domain";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES DE PRESENTACIÓN — INVENTARIOS
// ═══════════════════════════════════════════════════════════════════════════
//
// Cómo se llaman y cómo se pintan las cosas del módulo. **Nada de autorización
// aquí**: eso vive en `roles.store` y `session.store`.
//
// ── Criterio de color ─────────────────────────────────────────────────────
//
// `BadgeColor` del catálogo es semántico, no decorativo, y el módulo lo usa con
// esa disciplina:
//
//   · `warning` es la **rampa naranja** y compite con la marca (§Identidad
//     visual). Se usa solo donde de verdad hay que mirar: «falta» y «sobra»,
//     que son los dos hechos que exigen una decisión.
//   · `error` (rojo) queda para lo que está roto: `dañado` y severidad alta.
//   · `info` (celeste) es informativo y no alarmante: es el color de «en curso».
//   · `light` (gris) es neutro o archivado: `sin_esperado`, `anulado`,
//     `inactivo`. Un hecho sin comparación no es un problema, así que no lleva
//     color de problema.
//   · `success` (verde) se usa **solo** donde el hecho es de verdad bueno:
//     `coincide`, `finalizado`, `activo`. Es el verde del catálogo, no una
//     elección libre — la marca no tiene verde propio.

// ── Inventario: estado ────────────────────────────────────────────────────

export const ESTADO_INVENTARIO_META: Record<
  EstadoInventario,
  { label: string; color: BadgeColor; descripcion: string }
> = {
  borrador: {
    label: "Borrador",
    color: "light",
    descripcion: "Se están cargando elementos. Todavía nadie ha empezado a contar.",
  },
  en_curso: {
    label: "En curso",
    color: "info",
    descripcion: "El conteo está abierto y hay elementos por registrar.",
  },
  finalizado: {
    label: "Finalizado",
    color: "success",
    descripcion: "Conteo cerrado y firmado. Es la referencia del próximo conteo de esta ubicación.",
  },
  anulado: {
    label: "Anulado",
    color: "dark",
    descripcion: "Se conserva para consulta, pero no cuenta como referencia ni aparece en los reportes activos.",
  },
};

export const OPCIONES_ESTADO_INVENTARIO: { value: string; label: string }[] = [
  { value: "__todos__", label: "Todos los estados" },
  { value: "borrador", label: "Borrador" },
  { value: "en_curso", label: "En curso" },
  { value: "finalizado", label: "Finalizado" },
  { value: "anulado", label: "Anulado" },
];

// ── Inventario: tipo ──────────────────────────────────────────────────────

/**
 * Los tres tipos de conteo.
 *
 * ── Por qué ya no hay `hint` ────────────────────────────────────────────────
 *
 * Antes cada tipo traía un párrafo de dos líneas explicando mecánica interna
 * («la cantidad esperada se copia del último conteo finalizado», «no se calcula
 * diferencia»). Eso es un manual, no una interfaz: si hay que explicar cómo
 * funciona el sistema para poder elegir, el problema es la elección, no la falta
 * de texto.
 *
 * Ahora cada tipo trae **una sola línea de consecuencia** —qué pasa si eliges
 * esto— y la elección se hace con una pregunta que el usuario ya sabe responder:
 * «¿Ya has contado aquí antes?». `eleccion` dice a cuál de las dos tarjetas
 * pertenece cada tipo, para que la vista no tenga su propia lista de cuáles son
 * principales: esa decisión se toma aquí y en un solo sitio.
 *
 * `label` se conserva porque lo usan la tabla, el detalle y los reportes.
 */
export const TIPO_INVENTARIO_META: Record<
  TipoInventario,
  {
    /** Nombre corto del tipo, para badges, tabla y reportes. */
    label: string;
    /** Título de la tarjeta de elección, en el idioma del usuario. */
    titulo: string;
    /** UNA línea: qué pasa si eliges esto. Nunca cómo funciona por dentro. */
    consecuencia: string;
    /** A cuál de las dos tarjetas de la pregunta binaria pertenece. */
    eleccion: EleccionConteo;
  }
> = {
  inicial: {
    label: "Inicial",
    titulo: "Es la primera vez",
    consecuencia: "Sin comparación: lo que cuentes queda como punto de partida.",
    eleccion: "primera_vez",
  },
  periodico: {
    label: "Periódico",
    titulo: "Ya hay un conteo anterior",
    consecuencia: "Se compara contra el último conteo cerrado de esta ubicación.",
    eleccion: "con_referencia",
  },
  final: {
    label: "Final",
    titulo: "Cerrar el ciclo",
    consecuencia: "Cierra el ciclo: el número queda como definitivo.",
    eleccion: "con_referencia",
  },
};

/**
 * La pregunta que sustituye a la lista de tres tipos.
 *
 * Es binaria a propósito: el usuario sabe si ha contado ahí antes o no. La
 * diferencia entre «periódico» y «final» es de ciclo, no de método, y se decide
 * después —`final` se ofrece como acción contextual, y solo cuando la ubicación
 * ya tiene un conteo cerrado—. Así deja de haber una opción que haya que
 * entender de antemano.
 */
export const PREGUNTA_ELECCION_CONTEO = "¿Ya has contado aquí antes?";

export type EleccionConteo = "primera_vez" | "con_referencia";

/** Las dos tarjetas, en orden. La vista lee esto; no decide cuáles son. */
export const OPCIONES_ELECCION_CONTEO: TipoInventario[] = ["inicial", "periodico"];

/** El tipo que NO se elige al crear: es un cierre y se ofrece aparte. */
export const TIPO_CIERRE_CICLO: TipoInventario = "final";

export const OPCIONES_TIPO_INVENTARIO: { value: TipoInventario; label: string }[] = [
  { value: "inicial", label: "Inicial" },
  { value: "periodico", label: "Periódico" },
  { value: "final", label: "Final" },
];

// ── Línea: estado derivado ────────────────────────────────────────────────

/**
 * Los cinco estados derivados de una línea.
 *
 * `sobra` y `falta` comparten color (`warning`) porque son el mismo tipo de
 * hecho —una discrepancia que exige decidir— visto en dos direcciones; el signo
 * de la diferencia distingue cuál es. Pintarlas de colores distintos sugeriría
 * que una es más grave que la otra, y no lo es: sobrar también descuadra.
 */
export const ESTADO_LINEA_META: Record<
  EstadoLinea,
  { label: string; color: BadgeColor; descripcion: string }
> = {
  pendiente: {
    label: "Pendiente",
    color: "warning",
    descripcion: "Sin contar. Todavía no se registró ninguna cantidad.",
  },
  coincide: {
    label: "Coincide",
    color: "success",
    descripcion: "Lo observado es igual a lo esperado.",
  },
  sobra: {
    label: "Sobra",
    color: "warning",
    descripcion: "Hay más de lo esperado.",
  },
  falta: {
    label: "Falta",
    color: "warning",
    descripcion: "Hay menos de lo esperado.",
  },
  sin_esperado: {
    label: "Sin referencia",
    color: "light",
    descripcion: "Este elemento no estaba en el conteo de referencia. No se compara contra nada.",
  },
};

export const OPCIONES_ESTADO_LINEA: { value: string; label: string }[] = [
  { value: "__todas__", label: "Todos los estados" },
  { value: "pendiente", label: "Pendiente" },
  { value: "coincide", label: "Coincide" },
  { value: "sobra", label: "Sobra" },
  { value: "falta", label: "Falta" },
  { value: "sin_esperado", label: "Sin referencia" },
];

// ── Línea: condición ─────────────────────────────────────────────────────

export const CONDICION_META: Record<
  CondicionElemento,
  { label: string; color: BadgeColor; descripcion: string }
> = {
  bueno: {
    label: "Bueno",
    color: "success",
    descripcion: "En condiciones de uso.",
  },
  regular: {
    label: "Regular",
    color: "warning",
    descripcion: "Usable, pero con desgaste visible.",
  },
  dañado: {
    label: "Dañado",
    color: "error",
    descripcion: "No es usable en su estado actual.",
  },
  no_aplica: {
    label: "Sin evaluar",
    color: "light",
    descripcion: "No se evaluó la condición. Se registró solo la cantidad.",
  },
};

export const OPCIONES_CONDICION: { value: CondicionElemento; label: string }[] = [
  { value: "no_aplica", label: "Sin evaluar" },
  { value: "bueno", label: "Bueno" },
  { value: "regular", label: "Regular" },
  { value: "dañado", label: "Dañado" },
];

// ── Elemento ──────────────────────────────────────────────────────────────

export const ESTADO_ELEMENTO_META: Record<
  EstadoElemento,
  { label: string; color: BadgeColor; descripcion: string }
> = {
  activo: {
    label: "Activo",
    color: "success",
    descripcion: "Se puede agregar a nuevos conteos.",
  },
  // El rótulo es «De baja», no «Inactivo»: es el vocabulario que ya usan el
  // filtro de la lista, la acción de la fila («Dar de baja» / «Reactivar») y el
  // diálogo de confirmación. «Inactivo» era una quinta palabra para el mismo
  // hecho, y hacía que filtrar por «De baja» devolviera filas que se leían
  // «Inactivo» — el usuario no podía saber si eran lo mismo.
  inactivo: {
    label: "De baja",
    color: "light",
    descripcion: "Dado de baja. No aparece en el selector de conteo, pero su historial se conserva.",
  },
};

export const OPCIONES_ESTADO_ELEMENTO: { value: string; label: string }[] = [
  { value: "__todos__", label: "Todos los estados" },
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "De baja" },
];

/**
 * `unidad` — la distinción más neutra posible: se cuenta de uno en uno, o por
 * conjunto. **No es una magnitud física**, y el `hint` lo dice para que nadie
 * intente escribir «kilogramos»: si el negocio pesa, cuenta bultos o cajas.
 */
export const UNIDAD_META: Record<
  UnidadElemento,
  { label: string; hint: string }
> = {
  unidad: {
    label: "Unidad",
    hint: "Se cuenta de uno en uno: una silla, un extintor, un portátil.",
  },
  grupo: {
    label: "Grupo",
    hint: "Se cuenta por conjunto: un juego de llaves, una caja de resmas. El número es de conjuntos, no de piezas.",
  },
};

export const OPCIONES_UNIDAD: { value: UnidadElemento; label: string }[] = [
  { value: "unidad", label: "Unidad" },
  { value: "grupo", label: "Grupo" },
];

// ── Ubicación ─────────────────────────────────────────────────────────────

export const NIVEL_UBICACION_META: Record<
  "cliente" | "sede" | "ubicacion",
  { label: string; labelPlural: string; hint: string }
> = {
  cliente: {
    label: "Cliente",
    labelPlural: "Clientes",
    hint: "El nivel más alto. Agrupa todas las sedes de una misma cuenta.",
  },
  sede: {
    label: "Sede",
    labelPlural: "Sedes",
    hint: "Un lugar físico: una dirección, una planta, un punto de operación.",
  },
  ubicacion: {
    label: "Ubicación",
    labelPlural: "Ubicaciones",
    hint: "El espacio concreto donde se cuenta: un almacén, una oficina, una bodega. El conteo siempre ocurre aquí.",
  },
};

// ── Alertas ───────────────────────────────────────────────────────────────

export const SEVERIDAD_META: Record<
  SeveridadAlerta,
  { label: string; color: BadgeColor }
> = {
  alta: { label: "Alta", color: "error" },
  media: { label: "Media", color: "warning" },
  baja: { label: "Baja", color: "info" },
};

export const TIPO_ALERTA_META: Record<
  TipoAlerta,
  { label: string; descripcion: string }
> = {
  linea_danada: {
    label: "Elemento dañado",
    descripcion: "Alguna línea del conteo quedó registrada con condición «dañado».",
  },
  inventario_estancado: {
    label: "Conteo estancado",
    descripcion: "Un conteo abierto lleva más días sin moverse que el umbral configurado.",
  },
  inventario_pendiente: {
    label: "Conteo sin iniciar",
    descripcion: "Hay elementos cargados esperando a que alguien empiece a contar.",
  },
};

// ── Tabs del detalle de elemento ──────────────────────────────────────────

export const TABS_ELEMENTO = ["informacion", "evidencia", "historial"] as const;
export type TabElemento = (typeof TABS_ELEMENTO)[number];

export const TAB_ELEMENTO_LABEL: Record<TabElemento, string> = {
  informacion: "Información",
  evidencia: "Evidencia",
  historial: "Historial",
};

// ── Claves de filtro (sentinelas) ─────────────────────────────────────────

/**
 * Sentinelas de «todos» en los `<Select>`.
 *
 * Se usa una cadena imposible en vez de `null` para que el `value` del `<select>`
 * siga siendo un `string`, como en `equipo.constants`. El valor no puede
 * colisionar con un id real porque ningún id empieza por doble guion bajo.
 */
export const FILTRO_TODOS = "__todos__";
export const FILTRO_SIN_UBICACION = "__sin_ubicacion__";

/** Cuántas filas se pintan antes de recortar, con el aviso «Mostrando n de N». */
export const FILAS_POR_PAGINA = 25;
