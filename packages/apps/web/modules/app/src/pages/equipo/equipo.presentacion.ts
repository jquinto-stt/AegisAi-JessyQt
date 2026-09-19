import { CAPACIDAD_GRUPOS, CAPACIDAD_LABEL, type Capacidad, type PortadorDeRol } from "@/stores/roles.store";
import { inicialesDe } from "@/utils";
import { esEfectiva, type Procedencia } from "./excepciones";

// ═══════════════════════════════════════════════════════════════════════════
// PRESENTACIÓN DEL ACCESO EN LENGUAJE DE NEGOCIO
// ═══════════════════════════════════════════════════════════════════════════
//
// Traduce el modelo de autorización a frases que entiende alguien que no es
// técnico. **No autoriza nada**: no decide quién puede qué, solo cuenta lo que
// `rolesStore.capacidadesEfectivas` ya decidió.
//
// El problema que resuelve. La pantalla de perfil mostraba las 18 capacidades
// como una tabla de cuatro columnas —categoría, etiqueta, código técnico y
// procedencia— con un interruptor por fila. Para responder "¿qué puede hacer
// Camila?" había que leer dieciocho filas y, de paso, entender qué significa
// `preparation.manage` y la diferencia entre "heredado del rol" y "concedido a
// mano". Eso es vocabulario de quien construyó el sistema, no de quien lo usa.
//
// La traducción va en tres pasos:
//
//   1. ÁREAS. Las 18 capacidades se agrupan en 7 áreas de negocio y cada área
//      recibe un nombre y una descripción en lenguaje llano. "Órdenes" pasa a
//      ser "Pedidos" y `preparation.manage` desaparece de la vista.
//
//   2. NIVEL. Cada área se resume en tres estados posibles —`si`, `parcial`,
//      `no`— calculados desde las capacidades efectivas. Cuando un área es
//      `parcial`, lo que importa es **qué falta**, no la lista entera: por eso
//      el resumen expone `faltantes` en vez de obligar a comparar.
//
//   3. TAREAS. Un puñado de perfiles con nombre de oficio ("Atiende el
//      mostrador", "Prepara y despacha") permiten dejar el conjunto de
//      capacidades de una persona de un solo gesto, sin tocar interruptores.
//
// Este módulo es lógica pura (sin React, sin store) para poder probarlo.
//
// ═══════════════════════════════════════════════════════════════════════════

// ── Nivel de acceso a un área ──────────────────────────────────────────────

/**
 * Cuánto cubre una persona de un área:
 *   - `si`      → tiene todas las capacidades del área.
 *   - `parcial` → tiene algunas. Es el caso que hay que explicar, porque "sí"
 *                 y "no" se entienden solos pero "parcial" no.
 *   - `no`      → no tiene ninguna.
 */
export type NivelArea = "si" | "parcial" | "no";

/** Etiqueta del nivel, para el chip de la fila. */
export const NIVEL_LABEL: Record<NivelArea, string> = {
  si: "Sí",
  parcial: "Parcial",
  no: "No",
};

/** Nivel calculado desde las capacidades efectivas de una persona. */
export function nivelDeArea(capacidades: Capacidad[], capacidadesDelArea: Capacidad[]): NivelArea {
  const tiene = new Set(capacidades);
  const activas = capacidadesDelArea.filter((c) => tiene.has(c)).length;
  if (activas === 0) return "no";
  return activas === capacidadesDelArea.length ? "si" : "parcial";
}

// ── Copy de cada área ──────────────────────────────────────────────────────

/**
 * Nombre y descripción de cada área en lenguaje de negocio.
 *
 * Clave = `id` de `CAPACIDAD_GRUPOS`. Se mantiene aparte del catálogo de
 * capacidades a propósito: `CAPACIDAD_GRUPOS` vive en el store porque agrupa
 * autorización, mientras que esto es solo cómo se llama en pantalla.
 */
export const AREA_COPY: Record<string, { label: string; resumen: string }> = {
  ordenes: {
    label: "Pedidos",
    resumen: "Los pedidos que entran y todo su recorrido hasta la entrega.",
  },
  preparacion: {
    label: "Preparación",
    resumen: "Preparar los pedidos confirmados y sacarlos a reparto.",
  },
  programados: {
    label: "Pedidos programados",
    resumen: "Pedidos agendados para más adelante en vez de para ahora.",
  },
  canales: {
    label: "Canal WhatsApp",
    resumen: "Atención externa y bot de WhatsApp para clientes.",
  },
  ajustes: {
    label: "Configuración",
    resumen: "Los ajustes del módulo de pedidos.",
  },
  equipo: {
    label: "Equipo",
    resumen: "Las personas que trabajan en el negocio.",
  },
  asistente: {
    label: "NECTO AI (Interno)",
    resumen: "Copiloto interno de IA para consultas del equipo (sin interacción con clientes).",
  },
};

/** Nombre del área, con respaldo al catálogo si aparece un grupo nuevo. */
export function labelDeArea(id: string): string {
  return AREA_COPY[id]?.label ?? CAPACIDAD_GRUPOS.find((g) => g.id === id)?.label ?? id;
}

/** Descripción del área en una línea. Cadena vacía si el grupo es desconocido. */
export function resumenDeArea(id: string): string {
  return AREA_COPY[id]?.resumen ?? "";
}

// ── Resumen por área ───────────────────────────────────────────────────────

/** Une una lista en español: "a", "a y b", "a, b y c". */
export function unirConY(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/** Etiqueta llana de una capacidad, en minúscula para encajar en una frase. */
export function etiquetaLlana(cap: Capacidad): string {
  return CAPACIDAD_LABEL[cap].toLowerCase();
}

/** Resumen de un área para una persona concreta. */
export interface ResumenArea {
  id: string;
  /** Nombre del área en lenguaje de negocio ("Pedidos", "Conversaciones"…). */
  label: string;
  /** Qué cubre el área, en una línea. No depende de la persona. */
  resumen: string;
  nivel: NivelArea;
  activas: number;
  total: number;
  /** Capacidades del área que la persona **sí** tiene, en lenguaje llano. */
  concedidas: string[];
  /**
   * Capacidades del área que le **faltan**, en lenguaje llano.
   *
   * Solo es la información accionable cuando el nivel es `parcial`: si tiene 5
   * de 6, lo que hay que revisar es la que falta. Vacío si tiene el área entera.
   */
  faltantes: string[];
}

/**
 * Resume las 7 áreas de negocio para un conjunto de capacidades efectivas.
 *
 * Devuelve siempre las 7 áreas, incluidas las que la persona no tiene: ver que
 * "Asistente IA: No" es información tan útil como ver que "Preparación: Sí".
 */
export function resumenDeAreas(capacidades: Capacidad[]): ResumenArea[] {
  const tiene = new Set(capacidades);

  return CAPACIDAD_GRUPOS.map((grupo) => {
    const concedidas = grupo.capacidades.filter((c) => tiene.has(c));
    const faltantes = grupo.capacidades.filter((c) => !tiene.has(c));

    return {
      id: grupo.id,
      label: labelDeArea(grupo.id),
      resumen: resumenDeArea(grupo.id),
      nivel: nivelDeArea(capacidades, grupo.capacidades),
      activas: concedidas.length,
      total: grupo.capacidades.length,
      concedidas: concedidas.map(etiquetaLlana),
      faltantes: faltantes.map(etiquetaLlana),
    };
  });
}

/** Número de áreas que la persona cubre por completo. */
export function areasCompletas(resumen: ResumenArea[]): number {
  return resumen.filter((a) => a.nivel === "si").length;
}

/**
 * Frase de una línea que resume el acceso entero, para el encabezado.
 *
 * Ejemplo: "Cubre 4 de 7 áreas. Le faltan cosas en Pedidos y Equipo. No tiene
 * acceso a Asistente IA." Es el resumen que evita tener que abrir nada.
 *
 * Va en frases separadas por punto, no encadenadas con comas: son tres ideas
 * distintas (cuánto cubre, dónde está a medias, qué no tiene) y una sola frase
 * larga se lee como un trabalenguas.
 */
export function fraseDeAcceso(resumen: ResumenArea[]): string {
  const completas = areasCompletas(resumen);
  const conHuecos = resumen.filter((a) => a.nivel === "parcial").map((a) => a.label);
  const sinNada = resumen.filter((a) => a.nivel === "no").map((a) => a.label);

  if (completas === resumen.length) return "Puede hacer todo lo que cubre el módulo de pedidos.";
  if (completas === 0 && conHuecos.length === 0) return "Todavía no tiene acceso a nada.";

  const partes: string[] = [`Cubre ${completas} de ${resumen.length} áreas`];
  if (conHuecos.length > 0) partes.push(`Le faltan cosas en ${unirConY(conHuecos)}`);
  if (sinNada.length > 0) partes.push(`No tiene acceso a ${unirConY(sinNada)}`);
  return `${partes.join(". ")}.`;
}

// ── Procedencia en lenguaje llano ──────────────────────────────────────────

/**
 * Cómo se cuenta de dónde viene una capacidad.
 *
 * El modelo tiene cuatro procedencias y la pantalla las mostraba las cuatro en
 * cada fila. Aquí se reducen a tres tonos, y el caso `rol` —el más frecuente y
 * el menos interesante— pasa a ser el estado por defecto que no hay que leer.
 */
export const PROCEDENCIA_HUMANA: Record<
  Procedencia,
  { label: string; tono: "neutro" | "mas" | "menos" }
> = {
  rol: { label: "Viene de su rol", tono: "neutro" },
  concedida: { label: "Se le dio de más", tono: "mas" },
  removida: { label: "Se le quitó", tono: "menos" },
  ninguna: { label: "No la tiene", tono: "neutro" },
};

// ── Guardas de seguridad sobre uno mismo (self-lockout) ────────────────────
//
// Estas funciones viven aquí, y no en la página, porque son **reglas de
// dominio**: "qué capacidades no puede revocarse a sí misma la sesión activa".
// La página solo las consulta para decidir si pinta el interruptor apagado.
//
// Nota importante de arquitectura: esto NO es autorización. La autorización es
// `hasPermission()` sobre el `AccessContext` (contrato §2). Esto es la variante
// "y además, no sobre ti mismo", que el contrato no cubría porque asume que el
// actor y el sujeto del cambio son distintos.

/**
 * Capacidades que sostienen "estar aquí administrando".
 *
 * Es un conjunto, no un booleano, porque la guarda se aplica en dos sitios con
 * granularidad distinta: el interruptor consulta la capacidad concreta que se
 * está tocando, y `motivoAutodesahuicio()` resume el conjunto entero para el
 * aviso de la cabecera. Un `esAdmin` habría obligado a ramificar por pantalla,
 * que es justo lo que el contrato prohíbe (invariante C9).
 */
export const CAPACIDADES_GESTION: Capacidad[] = ["team.manage"];

/** Datos de contacto editables en el perfil. */
export interface Contacto {
  nombre: string;
  email: string;
  telefono: string;
}

/** Resultado de validar el formulario de contacto. */
export interface ValidacionContacto {
  /** `true` solo si los tres campos pasan. */
  valido: boolean;
  /** Mensajes de error por campo. Vacío (`""`) en los campos correctos. */
  errores: Contacto;
}

/**
 * Comprobación básica de correo: `algo@dominio.algo`, sin espacios.
 *
 * Es deliberadamente superficial. No pretende implementar RFC 5322: en este
 * mockup no hay backend que verifique la dirección, así que lo único honesto es
 * atrapar el error de dedo evidente (una dirección sin `@`, o con el dominio a
 * medias) y no fingir una validación más fuerte de la que hay.
 */
export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/**
 * Valida los datos de contacto del perfil.
 *
 * Reglas: nombre no vacío, correo con forma de correo, y teléfono con al menos
 * 7 dígitos (se cuentan solo los dígitos, así que los separadores —espacios,
 * guiones, paréntesis— y el prefijo internacional no estorban).
 *
 * Los tres campos se validan siempre, sin cortocircuito: devolver el primer
 * error y callar los demás obliga a guardar y reintentar para descubrirlos.
 */
export function validarContacto(c: Contacto): ValidacionContacto {
  const errores: Contacto = { nombre: "", email: "", telefono: "" };

  if (c.nombre.trim().length === 0) {
    errores.nombre = "El nombre es obligatorio.";
  }

  if (c.email.trim().length === 0) {
    errores.email = "El correo electrónico es obligatorio.";
  } else if (!emailValido(c.email)) {
    errores.email = "Escribe un correo válido, con @ y dominio.";
  }

  const digitos = c.telefono.replace(/\D/g, "");
  if (c.telefono.trim().length === 0) {
    errores.telefono = "El teléfono es obligatorio.";
  } else if (digitos.length < 7) {
    errores.telefono = `El teléfono debe tener al menos 7 dígitos (tiene ${digitos.length}).`;
  }

  return { valido: !errores.nombre && !errores.email && !errores.telefono, errores };
}

// ── Alta de una persona nueva (modal "Invitar miembro") ────────────────────
//
// El perfil edita a alguien que ya existe; el alta crea a alguien que no. La
// diferencia no es cosmética: aquí hay que comprobar además que el correo no
// esté ya en la organización, y que se haya elegido un rol. Por eso el alta
// tiene su propia función en vez de reutilizar `validarContacto`.

/** Datos del formulario de alta de una persona del equipo. */
export interface AltaPersona {
  nombre: string;
  email: string;
  telefono: string;
  cargo: string;
  rolId: string;
}

/** Resultado de validar el alta. `errores` lleva un mensaje por campo. */
export interface ValidacionAlta {
  /** `true` solo si todos los campos pasan. */
  valido: boolean;
  errores: AltaPersona;
}

/**
 * Normaliza un correo para compararlo: sin espacios y en minúsculas.
 *
 * Es la misma normalización con la que se guarda y con la que se busca, para
 * que "  Camila.Ortiz@Negocio.COM " colisione con "camila.ortiz@negocio.com".
 * Comparar sin normalizar dejaría pasar duplicados escritos con otra caja.
 */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Mensaje exacto para el correo duplicado.
 *
 * Se exporta como constante para que la pantalla no lo reescriba a mano: el
 * texto es parte del requisito, y tenerlo duplicado en dos sitios garantiza que
 * un día digan cosas distintas.
 */
export const ERROR_EMAIL_DUPLICADO =
  "Ya existe una persona registrada con este correo en la organización.";

/**
 * Valida el formulario de alta de una persona.
 *
 * @param alta Datos en crudo del formulario.
 * @param correosExistentes Correos ya presentes en la organización. Se comparan
 *        normalizados, así que pasar los correos en crudo es correcto.
 *
 * Los cuatro campos se validan siempre, sin cortocircuito, para que el admin vea
 * todo lo que falta de una vez en lugar de descubrirlo campo a campo.
 */
export function validarAlta(alta: AltaPersona, correosExistentes: string[]): ValidacionAlta {
  const errores: AltaPersona = { nombre: "", email: "", telefono: "", cargo: "", rolId: "" };

  if (alta.nombre.trim().length === 0) {
    errores.nombre = "El nombre es obligatorio.";
  }

  const email = normalizarEmail(alta.email);
  if (email.length === 0) {
    errores.email = "El correo electrónico es obligatorio.";
  } else if (!emailValido(alta.email)) {
    errores.email = "Escribe un correo válido, con @ y dominio.";
  } else if (correosExistentes.some((e) => normalizarEmail(e) === email)) {
    // El duplicado se comprueba DESPUÉS del formato a propósito: a un correo
    // mal escrito no se le puede decir "ya existe" con honestidad, porque la
    // coincidencia sería con una cadena inválida.
    errores.email = ERROR_EMAIL_DUPLICADO;
  }

  const digitos = alta.telefono.replace(/\D/g, "");
  if (alta.telefono.trim().length === 0) {
    errores.telefono = "El teléfono es obligatorio.";
  } else if (digitos.length < 7) {
    errores.telefono = `El teléfono debe tener al menos 7 dígitos (tiene ${digitos.length}).`;
  }

  if (alta.rolId === "") {
    errores.rolId = "Elige un rol para esta persona.";
  }

  const valido =
    !errores.nombre && !errores.email && !errores.telefono && !errores.cargo && !errores.rolId;

  return { valido, errores };
}

/**
 * Explica en una frase por qué la sesión no puede revocarse su propia gestión
 * de equipo. Devuelve `null` si no hay nada que proteger (la persona mirada no
 * es la sesión, o su rol tampoco concede la capacidad).
 *
 * @param p Portador del rol de la persona inspeccionada.
 * @param capacidadesDelRol Capacidades base de su rol.
 */
export function motivoAutodesahucio(
  p: PortadorDeRol,
  capacidadesDelRol: Capacidad[],
): string | null {
  const tiene = CAPACIDADES_GESTION.filter((cap) => esEfectiva(p, cap, capacidadesDelRol));
  if (tiene.length === 0) return null;

  const nombres = unirConY(tiene.map((cap) => CAPACIDAD_LABEL[cap].toLowerCase()));
  return `No puedes revocar tu propio permiso de ${nombres}: perderías el acceso a esta pantalla y no habría quién te lo devolviera.`;
}

/** Un ajuste hecho a mano sobre el rol de una persona. */
export interface AjustePersona {
  capacidad: Capacidad;
  /** Etiqueta llana de la capacidad ("Confirmar órdenes"). */
  label: string;
  /** `mas` = se le concedió, `menos` = se le revocó. */
  tipo: "mas" | "menos";
}

/**
 * Los ajustes a mano de una persona, listos para mostrar.
 *
 * Es lo que la pantalla enseña en el bloque "ajustes solo para esta persona": no
 * las 18 capacidades, solo las que se desvían del rol. Una persona sin
 * excepciones devuelve `[]` y el bloque no se pinta.
 */
export function ajustesDe(p: PortadorDeRol): AjustePersona[] {
  const mas = (p.capacidadesExtra ?? []).map<AjustePersona>((capacidad) => ({
    capacidad,
    label: CAPACIDAD_LABEL[capacidad],
    tipo: "mas",
  }));
  const menos = (p.capacidadesRemovidas ?? []).map<AjustePersona>((capacidad) => ({
    capacidad,
    label: CAPACIDAD_LABEL[capacidad],
    tipo: "menos",
  }));
  return [...mas, ...menos];
}

// ── Perfiles de tarea ──────────────────────────────────────────────────────

/**
 * Un perfil de tarea: un puñado de capacidades con nombre de oficio.
 *
 * No es un rol. Un rol se guarda en el catálogo, se reutiliza y se asigna a
 * varias personas; un perfil de tarea es un atajo de la pantalla de perfil que
 * se traduce inmediatamente a excepciones de **esa** persona. Sirve para que
 * quien no quiere pensar en capacidades pueda decir "esto es un mostrador" y
 * seguir.
 */
export interface PerfilTarea {
  id: string;
  /** Nombre del oficio, no del permiso: "Atiende el mostrador". */
  nombre: string;
  /** Qué hace esa persona en una frase. */
  descripcion: string;
  capacidades: Capacidad[];
}

/**
 * Catálogo de perfiles de tarea.
 *
 * Los conjuntos son **subconjuntos de `CAPACIDADES`** y no inventan ninguna
 * capacidad nueva: el asistente solo puede conceder o revocar lo que el modelo
 * ya conoce. Cualquier cambio aquí se puede expresar con interruptores.
 */
export const PERFILES_TAREA: PerfilTarea[] = [
  {
    id: "mostrador",
    nombre: "Atiende el mostrador",
    descripcion: "Crea pedidos, los confirma y agenda entregas.",
    capacidades: [
      "orders.read",
      "orders.create",
      "orders.confirm",
      "scheduled.read",
      "scheduled.manage",
    ],
  },
  {
    id: "despacho",
    nombre: "Prepara y despacha",
    descripcion: "Prepara los pedidos confirmados y los entrega.",
    capacidades: ["orders.read", "preparation.read", "preparation.manage", "scheduled.read"],
  },
  {
    id: "mensajes",
    nombre: "Responde mensajes",
    descripcion: "Atiende a los clientes por WhatsApp.",
    capacidades: ["orders.read", "channels.read", "channels.respond"],
  },
  {
    id: "encargado",
    nombre: "Encargado de la tienda",
    descripcion: "Todo el ciclo de pedidos, los canales y la configuración.",
    capacidades: [
      "orders.read",
      "orders.create",
      "orders.confirm",
      "orders.cancel",
      "orders.edit",
      "preparation.read",
      "preparation.manage",
      "scheduled.read",
      "scheduled.manage",
      "channels.read",
      "channels.respond",
      "channels.manage",
      "settings.read",
    ],
  },
  {
    id: "consulta",
    nombre: "Solo consulta",
    descripcion: "Puede mirar los pedidos, sin cambiarlos.",
    capacidades: ["orders.read", "preparation.read", "scheduled.read"],
  },
];

/** Clave canónica de un conjunto de capacidades, para compararlos sin orden. */
function claveDe(capacidades: Capacidad[]): string {
  return [...capacidades].sort().join("|");
}

/**
 * Se reexporta desde `@/utils` (fuente única en toda la app) para que quien
 * consuma este módulo siga encontrándola aquí.
 */
export { inicialesDe };

/**
 * El perfil de tarea que **coincide exactamente** con las capacidades dadas.
 *
 * Devuelve `null` cuando no hay coincidencia, que es el caso normal: la mayoría
 * de la gente acaba con una combinación propia. La pantalla lo usa solo para
 * poner un nombre al conjunto actual cuando lo tiene, nunca para decidir nada.
 */
export function perfilQueEncaja(capacidades: Capacidad[]): PerfilTarea | null {
  const clave = claveDe(capacidades);
  return PERFILES_TAREA.find((p) => claveDe(p.capacidades) === clave) ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDACIÓN DEL EDITOR DE ROLES
// ═══════════════════════════════════════════════════════════════════════════
//
// El editor de roles permitía guardar cualquier cosa: un rol sin nombre, dos
// roles llamados igual, o un rol con cero capacidades. Los tres casos producen
// un rol que no se puede usar —no se distingue en la lista, o no concede nada
// y parece un fallo de permisos cuando en realidad es un rol vacío—, así que
// se validan aquí, que es lógica pura y se puede razonar sin montar React.

/**
 * Normaliza el nombre de un rol para compararlo: sin espacios sobrantes y en
 * minúsculas.
 *
 * También colapsa espacios internos repetidos: "Supervisor  de   Turno" y
 * "Supervisor de Turno" son el mismo nombre a ojos de quien lo lee, y dejarlos
 * pasar como distintos es exactamente cómo se acaba con dos roles iguales en la
 * lista. Se comparan sin acentos NO: "Turnos" y "turnós" son distintos, y
 * confundirlos sería adivinar la intención del admin.
 */
export function normalizarNombreRol(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Mensaje exacto para el nombre de rol vacío. */
export const ERROR_ROL_SIN_NOMBRE = "El rol necesita un nombre.";

/** Mensaje exacto para el nombre de rol duplicado. */
export const ERROR_ROL_DUPLICADO = "Ya existe otro rol con este nombre.";

/** Mensaje exacto para un rol sin capacidades. */
export const ERROR_ROL_SIN_CAPACIDADES =
  "Asigna al menos una capacidad: un rol sin permisos no concede nada.";

/** Datos editables de un rol, en crudo desde el formulario. */
export interface DatosRol {
  nombre: string;
  capacidades: Capacidad[];
}

/** Resultado de validar el editor de rol. */
export interface ValidacionRol {
  /** `true` solo si el rol se puede guardar. */
  valido: boolean;
  /** Mensaje para el campo nombre (vacío si está bien). */
  errorNombre: string;
  /** Mensaje para la sección de capacidades (vacío si está bien). */
  errorCapacidades: string;
}

/**
 * Valida el editor de un rol antes de guardarlo.
 *
 * @param datos Nombre y capacidades en crudo del formulario.
 * @param rolesExistentes Todos los roles del catálogo.
 * @param rolEditadoId Id del rol que se está editando, si es una edición.
 *
 * `rolEditadoId` es la pieza que evita el falso positivo más molesto: al
 * guardar un rol **sin cambiarle el nombre**, su propio nombre ya está en el
 * catálogo, así que sin excluirlo el editor se quejaría de que el rol choca
 * consigo mismo y el botón Guardar quedaría bloqueado para siempre. Al crear,
 * se pasa `undefined` y se comparan todos.
 */
export function validarRol(
  datos: DatosRol,
  rolesExistentes: { id: string; nombre: string }[],
  rolEditadoId?: string,
): ValidacionRol {
  let errorNombre = "";

  const normalizado = normalizarNombreRol(datos.nombre);
  if (normalizado.length === 0) {
    errorNombre = ERROR_ROL_SIN_NOMBRE;
  } else {
    const choca = rolesExistentes.some(
      (r) => r.id !== rolEditadoId && normalizarNombreRol(r.nombre) === normalizado,
    );
    if (choca) errorNombre = ERROR_ROL_DUPLICADO;
  }

  const errorCapacidades =
    datos.capacidades.length === 0 ? ERROR_ROL_SIN_CAPACIDADES : "";

  return {
    valido: !errorNombre && !errorCapacidades,
    errorNombre,
    errorCapacidades,
  };
}

/**
 * Motivo por el que un rol de sistema no se puede eliminar.
 *
 * El store ya lo impide (`RolesStore.eliminar` ignora los `sistema: true`), pero
 * eso es una defensa silenciosa: el botón desaparecía sin decir nada y quien lo
 * buscaba se quedaba sin saber si era un fallo. La pantalla usa este texto para
 * explicarlo en el propio control.
 */
export const MOTIVO_ROL_SISTEMA =
  "Los roles predeterminados del sistema no se pueden eliminar.";

/**
 * Frase que bloquea la eliminación de un rol que tiene gente asignada.
 *
 * Existe porque borrar un rol con miembros deja a esas personas sin
 * `rolId` válido, y el modelo es **fail-closed**: `capacidadesEfectivas` de un
 * rol inexistente devuelve `[]`, así que perderían todo el acceso de golpe y sin
 * aviso. Se dice cuántos son y qué hacer, en vez de un "no se puede" a secas.
 *
 * @param n Número de miembros asignados (se espera > 0).
 */
export function motivoRolConMiembros(n: number): string {
  return `No puedes eliminar este rol porque hay ${n} miembro(s) del equipo asignados a él. Reasigna a los usuarios antes de borrarlo.`;
}
