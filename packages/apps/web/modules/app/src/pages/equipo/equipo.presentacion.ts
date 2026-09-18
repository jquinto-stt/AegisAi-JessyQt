import { CAPACIDAD_GRUPOS, CAPACIDAD_LABEL, type Capacidad, type PortadorDeRol } from "@/stores/roles.store";
import { inicialesDe } from "@/utils";
import type { Procedencia } from "./excepciones";

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
