// ═══════════════════════════════════════════════════════════════════════════
// NOVEDADES — el catálogo y las reglas, sin React ni store
// ═══════════════════════════════════════════════════════════════════════════
//
// Una novedad es un pedido que la transportadora **no pudo entregar** y que
// devuelve al negocio para que decida qué hacer. La página «Gestión de
// novedades» es la cola donde el operador las resuelve.
//
// ── Tres ejes, no uno ──────────────────────────────────────────────────────
//
//   · ESTADO    → dónde está la novedad (pendiente, en espera, solucionada…).
//   · CAUSAL    → por qué falló la entrega. La escribe la transportadora; el
//                 negocio no la elige ni la corrige.
//   · SOLUCIÓN  → qué pidió el negocio para el segundo intento.
//
// Meter la solución dentro del estado —«Pendiente de nueva dirección»— obliga a
// inventar un estado por cada opción del desplegable y a que la columna Estado
// deje de caber. Son tres columnas porque son tres preguntas.
//
// ── Por qué las cinco soluciones no son un texto libre ────────────────────
//
// Cada una cambia algo distinto en el segundo intento: la fecha, la dirección,
// o la ciudad. Un campo de texto obligaría a la transportadora a interpretar
// prosa, y lo que se interpreta mal se devuelve.
// ═══════════════════════════════════════════════════════════════════════════

export type EstadoNovedad =
  | "pendiente"
  | "por_gestionar"
  | "en_espera"
  | "rechazada"
  | "solucionada";

/** Orden en que se ofrecen los filtros: del que pide acción al que ya cerró. */
export const ESTADOS_NOVEDAD: EstadoNovedad[] = [
  "pendiente",
  "por_gestionar",
  "en_espera",
  "rechazada",
  "solucionada",
];

export const ETIQUETA_ESTADO_NOVEDAD: Record<EstadoNovedad, string> = {
  pendiente: "Pendiente",
  por_gestionar: "Por gestionar",
  en_espera: "En espera de respuesta",
  rechazada: "Rechazada",
  solucionada: "Solucionada",
};

/**
 * Familia de tinte del badge, con los tokens `estado-*` del tema.
 *
 * `pendiente` va en amarillo y no en rojo: una novedad no es un error del
 * sistema, es trabajo por hacer. El rojo se guarda para `rechazada`, que sí
 * significa que lo que hicimos no sirvió.
 */
export const TINTE_ESTADO_NOVEDAD: Record<
  EstadoNovedad,
  "gris" | "amarillo" | "azul" | "rojo" | "verde"
> = {
  pendiente: "amarillo",
  por_gestionar: "azul",
  en_espera: "gris",
  rechazada: "rojo",
  solucionada: "verde",
};

/**
 * Clases del badge de estado, por familia de tinte.
 *
 * Vive aquí y no en cada pantalla porque el badge se pinta en tres sitios —la
 * cola, el detalle de la guía y la ventana de gestión— y tres copias divergen en
 * cuanto alguien retoca una. Es la misma razón por la que el color de etapa de
 * un pedido tiene un solo dueño.
 */
export const CLASE_TINTE_NOVEDAD: Record<string, string> = {
  gris: "bg-estado-gris text-ink-body dark:bg-estado-gris/15 dark:text-estado-gris",
  amarillo: "bg-estado-amarillo text-ink-body dark:bg-estado-amarillo/15 dark:text-estado-amarillo",
  azul: "bg-estado-azul text-ink-body dark:bg-estado-azul/15 dark:text-estado-azul",
  rojo: "bg-estado-rojo text-ink-body dark:bg-estado-rojo/15 dark:text-estado-rojo",
  verde: "bg-estado-verde text-ink-body dark:bg-estado-verde/15 dark:text-estado-verde",
};

/** Clases del badge para un estado concreto. */
export function claseEstadoNovedad(estado: EstadoNovedad): string {
  return CLASE_TINTE_NOVEDAD[TINTE_ESTADO_NOVEDAD[estado]];
}

// ── Soluciones ─────────────────────────────────────────────────────────────

export type SolucionNovedad =
  | "manana"
  | "fecha"
  | "misma_direccion"
  | "nueva_direccion"
  | "cambiar_ciudad";

/** Qué dato extra pide cada solución. `null` = no pide nada más. */
export type CampoExtra = "fecha" | "direccion" | "ciudad" | null;

export interface OpcionSolucion {
  id: SolucionNovedad;
  label: string;
  /** Cuándo aplica. Es lo que el operador lee antes de elegir. */
  ayuda: string;
  exige: CampoExtra;
  /** Texto del campo extra, cuando lo hay. */
  campoLabel?: string;
  campoAyuda?: string;
}

/**
 * Catálogo de soluciones, en el orden en que se ofrecen.
 *
 * El orden va de la intervención más pequeña a la más grande: mover una fecha,
 * después una dirección, y al final la ciudad. Quien resuelve empieza por
 * arriba y solo baja si la de arriba no sirve.
 */
export const SOLUCIONES_NOVEDAD: OpcionSolucion[] = [
  {
    id: "manana",
    label: "Reintentar entrega mañana",
    ayuda: "El cliente confirmó que mañana puede recibir en la dirección de la guía.",
    exige: null,
  },
  {
    id: "fecha",
    label: "Reintentar entrega en una fecha asignada",
    ayuda: "El cliente confirmó una fecha concreta, en la dirección de la guía.",
    exige: "fecha",
    campoLabel: "Fecha de reintento",
    campoAyuda: "El día en que el cliente dice que sí va a estar.",
  },
  {
    id: "misma_direccion",
    label: "Reintentar la entrega en la misma dirección de la guía",
    ayuda: "El cliente puede recibir en cualquier momento, en la dirección original.",
    exige: null,
  },
  {
    id: "nueva_direccion",
    label: "Entregar en nueva dirección",
    ayuda: "Otra dirección dentro de la misma ciudad de destino.",
    exige: "direccion",
    campoLabel: "Dirección nueva",
    campoAyuda: "Con barrio y punto de referencia: la transportadora no llama para preguntar.",
  },
  {
    id: "cambiar_ciudad",
    label: "Cambiar dirección de destino",
    ayuda: "Otra ciudad del mismo área metropolitana. Fuera de ella, se cancela y se crea un pedido nuevo.",
    exige: "ciudad",
    campoLabel: "Ciudad y dirección nuevas",
    campoAyuda: "Ciudad de destino y dirección completa, en el mismo campo.",
  },
];

export function solucionPorId(id: SolucionNovedad): OpcionSolucion | undefined {
  return SOLUCIONES_NOVEDAD.find((s) => s.id === id);
}

export function etiquetaSolucion(id: SolucionNovedad | undefined): string {
  if (!id) return "—";
  return solucionPorId(id)?.label ?? "—";
}

// ── Causales ───────────────────────────────────────────────────────────────

/**
 * Las causales que escribe la transportadora. No es un vocabulario cerrado: el
 * campo de la novedad es texto y cada transportadora nombra lo suyo. Este
 * catálogo es el que usa la semilla y el que se ofrece en el filtro.
 */
export const CAUSALES_NOVEDAD = [
  "Destinatario no contesta",
  "Reprogramado",
  "Dirección incorrecta",
  "Destinatario indica que ya no desea el producto",
  "Mercancía no entregada al destinatario - información incompleta",
  "Zona no cubierta por la transportadora",
] as const;

// ── La novedad ─────────────────────────────────────────────────────────────

export interface Novedad {
  id: string;
  /** Número de guía de la transportadora. */
  guia: string;
  transportadora: string;
  /**
   * Número del pedido (`P-014`). Es el ID que el operador escribe para buscar
   * y el que enlaza con `pedidosStore`.
   */
  ordenNumero: string;
  cliente: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  /** Lo que dijo la transportadora. Texto, no catálogo cerrado. */
  causal: string;
  estado: EstadoNovedad;
  creadaEn: string;
  /** Solución pedida. Solo existe cuando `estado` es `solucionada`. */
  solucion?: SolucionNovedad;
  /** Lo que se le manda a la transportadora para el segundo intento. */
  observaciones?: string;
  /** A nombre de quién va el segundo intento. */
  recibeNombre?: string;
  recibeTelefono?: string;
  fechaReintento?: string;
  direccionNueva?: string;
  ciudadNueva?: string;
  resueltaEn?: string;
}

/** Lo que el operador captura en la ventana «Gestionar novedad». */
export interface DatosSolucion {
  solucion: SolucionNovedad | "";
  observaciones: string;
  fechaReintento?: string;
  direccionNueva?: string;
  ciudadNueva?: string;
  /**
   * A nombre de quién va el segundo intento.
   *
   * No es el cliente del pedido: es quien va a recibir ESE día —la hija, el
   * portero, la oficina—. El mensajero pregunta por un nombre, y si no lo tiene
   * vuelve a llamar al mismo número que ya no contestó.
   */
  recibeNombre?: string;
  /** Teléfono de quien recibe, si es distinto del de la guía. */
  recibeTelefono?: string;
}

/**
 * Mínimo y máximo de la observación.
 *
 * El mínimo no es burocracia: la observación es lo único que la transportadora
 * lee en la calle, y «reintentar» a secas no dice cuándo, ni con quién, ni por
 * dónde entrar. El máximo es el del campo en la guía de la transportadora: lo
 * que pase de ahí se corta al imprimir la etiqueta, así que se corta aquí, donde
 * el operador lo ve.
 */
export const MIN_OBSERVACION = 10;
export const MAX_OBSERVACION = 50;

/** Mínimo del nombre de quien recibe. */
export const MIN_NOMBRE_RECIBE = 3;

/** Valida la captura. Devuelve los errores en el orden en que se pintan. */
export function validarSolucion(datos: DatosSolucion, ahora: Date = new Date()): string[] {
  const errores: string[] = [];
  const opcion = datos.solucion ? solucionPorId(datos.solucion) : undefined;

  if (!datos.solucion || !opcion) {
    errores.push("Elige cómo se reintenta la entrega.");
    return errores;
  }

  if (opcion.exige === "fecha") {
    const fecha = datos.fechaReintento?.trim();
    if (!fecha) {
      errores.push("Indica la fecha en que el cliente puede recibir.");
    } else if (fecha < hoyISO(ahora)) {
      // Comparar cadenas `YYYY-MM-DD` es comparar fechas: el formato ordena.
      errores.push("La fecha de reintento no puede estar en el pasado.");
    }
  }

  if (opcion.exige === "direccion" && !datos.direccionNueva?.trim()) {
    errores.push("Escribe la dirección nueva.");
  }

  if (opcion.exige === "ciudad" && !datos.ciudadNueva?.trim()) {
    errores.push("Escribe la ciudad y la dirección nuevas.");
  }

  const nombre = datos.recibeNombre?.trim() ?? "";
  if (nombre.length < MIN_NOMBRE_RECIBE) {
    errores.push("Escribe a nombre de quién va el segundo intento.");
  }

  // El teléfono es opcional —muchas veces es el mismo de la guía—, pero si se
  // escribe tiene que servir para llamar. Un «123» guardado es peor que vacío.
  const telefono = (datos.recibeTelefono ?? "").replace(/\D/g, "");
  if (telefono.length > 0 && telefono.length < 7) {
    errores.push("El teléfono de quien recibe no tiene suficientes dígitos.");
  }

  const observacion = datos.observaciones.trim();
  if (observacion.length < MIN_OBSERVACION) {
    errores.push(
      `Describe qué necesita la transportadora (mínimo ${MIN_OBSERVACION} caracteres).`,
    );
  }
  if (observacion.length > MAX_OBSERVACION) {
    errores.push(`La observación no puede pasar de ${MAX_OBSERVACION} caracteres.`);
  }

  return errores;
}

// ── Fechas y duración ──────────────────────────────────────────────────────

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** `2026-10-28` del día de hoy, en hora local. */
export function hoyISO(ahora: Date = new Date()): string {
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, "0");
  const d = String(ahora.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** `2026-10-28T14:07:00Z` → `28 oct 2026`. */
export function fechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** `2026-10-28T14:07:00Z` → `14:07`. */
export function horaDe(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Tiempo que lleva abierta la novedad, en días y horas.
 *
 * Se muestran las dos unidades porque una novedad de «0 días» puede llevar 23
 * horas encima, y esa diferencia es la que decide si todavía se alcanza a
 * corregir la ruta de hoy.
 */
export function diasEnNovedad(creadaEn: string, ahora: Date = new Date()): string {
  const desde = new Date(creadaEn).getTime();
  if (Number.isNaN(desde)) return "—";

  const totalMin = Math.max(0, Math.floor((ahora.getTime() - desde) / 60000));
  const dias = Math.floor(totalMin / 1440);
  const horas = Math.floor((totalMin % 1440) / 60);
  return `${dias} d · ${horas} h`;
}

// ── Lectura de la novedad ──────────────────────────────────────────────────

/**
 * Tres frases que resumen la novedad antes de decidir.
 *
 * Es la «interpretación» del concepto del cliente, pero **calculada del propio
 * registro**, no por un modelo: no hay servicio de IA conectado y escribir
 * «generado por IA» sobre una plantilla sería exactamente la superficie que este
 * proyecto no admite. Si mañana se conecta el asistente, esta función es el
 * único sitio que cambia.
 *
 * Las tres líneas responden, en orden, a las tres preguntas que el operador
 * hace al abrir la ventana: qué pasó, quién lo reportó y cuánto lleva parado, y
 * a dónde iba.
 */
export function interpretarNovedad(n: Novedad, ahora: Date = new Date()): string[] {
  const causal = n.causal.trim();
  const frase = causal.charAt(0).toLowerCase() + causal.slice(1);
  return [
    `El paquete no se pudo entregar: ${frase}.`,
    `La reportó ${n.transportadora} el ${fechaCorta(n.creadaEn)} y lleva ${diasEnNovedad(n.creadaEn, ahora)} abierta.`,
    `El pedido ${n.ordenNumero} iba a ${n.direccion}, ${n.ciudad}.`,
  ];
}

// ── Filtro ─────────────────────────────────────────────────────────────────

export interface FiltroNovedades {
  estados: EstadoNovedad[];
  /** Texto del buscador: número de pedido, guía o cliente. */
  busqueda: string;
}

const sinAcentos = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/**
 * Filtra por estado y por texto.
 *
 * La búsqueda es por **contiene** y no por igualdad: el operador escribe el ID
 * que le dictaron por teléfono, y un guion de más no puede dejar la pantalla
 * vacía. Se compara sin acentos para que «direccion» encuentre «Dirección».
 */
export function filtrarNovedades(novedades: Novedad[], filtro: FiltroNovedades): Novedad[] {
  const q = sinAcentos(filtro.busqueda);
  return novedades.filter((n) => {
    if (filtro.estados.length > 0 && !filtro.estados.includes(n.estado)) return false;
    if (!q) return true;
    return (
      sinAcentos(n.ordenNumero).includes(q) ||
      sinAcentos(n.guia).includes(q) ||
      sinAcentos(n.cliente).includes(q)
    );
  });
}

/** Una novedad se puede gestionar mientras no esté resuelta ni en manos de la transportadora. */
export function puedeGestionar(n: Novedad): boolean {
  return n.estado === "pendiente" || n.estado === "por_gestionar" || n.estado === "rechazada";
}
