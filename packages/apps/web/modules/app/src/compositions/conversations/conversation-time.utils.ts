/**
 * Conversaciones — Utilidades de presentación
 * ==========================================
 *
 * Formateo de fechas y horas del hilo.
 *
 * ⚠️ Se escriben a mano en lugar de añadir `date-fns`: lo que hace falta son tres
 * funciones cortas y sin configuración regional, y una dependencia nueva en el
 * bundle por tres `format` no se paga sola. Si algún día el canal necesita
 * localización real, este es el único archivo que cambia.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** `HH:mm` en 24 h. Es la hora de la burbuja y de la fila de la lista. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Cómo se fecha una fila de la lista.
 *
 * La escala es la de cualquier mensajería y **no** una fecha completa: hoy sólo la
 * hora, ayer "ayer", esta semana el día de la semana, y de ahí en adelante la
 * fecha corta. Una lista con `14/09/2026 07:41` en cada fila no se puede leer de
 * un vistazo, que es justo para lo que sirve la lista.
 */
export function formatListTimestamp(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.floor((startOfToday - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / DAY_MS);

  if (diffDays <= 0) return formatTime(iso);
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][d.getDay()];
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * El separador de día dentro del hilo.
 *
 * "Hoy" y "Ayer" se nombran; el resto se fecha. La clave es que el operador sepa
 * **cuándo** se dijo algo sin tener que interpretar una fecha absoluta.
 */
export function formatDaySeparator(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.round((startOfToday - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / DAY_MS);

  if (diffDays <= 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/**
 * Agrupa los mensajes por día para pintar los separadores.
 *
 * ⚠️ La clave del grupo es la **fecha**, no el mensaje: agrupar por mensaje daría
 * un separador por burbuja. Y el orden de los grupos es el de llegada de los
 * mensajes, que el proveedor ya entrega cronológico.
 *
 * ⚠️ Es **genérica** en el tipo del mensaje: conserva el mensaje entero, no una
 * versión recortada. Antes devolvía sólo `{ id, sentAt }`, y quien la consumía
 * tenía que volver a cruzar los ids con la lista original para recuperar el
 * contenido — trabajo que se podía evitar en el sitio donde el dato ya estaba.
 */
export function groupMessagesByDay<T extends { id: string; sentAt: string }>(
  messages: readonly T[]
): { dayKey: string; dayIso: string; messages: T[] }[] {
  const groups: { dayKey: string; dayIso: string; messages: T[] }[] = [];

  for (const message of messages) {
    const d = new Date(message.sentAt);
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const last = groups[groups.length - 1];

    if (last && last.dayKey === dayKey) {
      last.messages.push(message);
    } else {
      groups.push({ dayKey, dayIso: message.sentAt, messages: [message] });
    }
  }

  return groups;
}

/**
 * ¿Los mensajes son del mismo autor y van seguidos en el tiempo?
 *
 * Sirve para **agrupar visualmente** una ráfaga de mensajes del mismo lado: la
 * burbuja recorta su esquina sólo en el primer y último mensaje del bloque, que es
 * lo que hace legible una conversación rápida en lugar de una columna de globos
 * sueltos. Las dos horas de margen evitan agrupar mensajes que, aunque sean del
 * mismo lado, están claramente separados en el tiempo.
 */
export function isSameBurst(
  previous: { direction: string; sentAt: string } | undefined,
  current: { direction: string; sentAt: string }
): boolean {
  if (!previous) return false;
  if (previous.direction !== current.direction) return false;
  return new Date(current.sentAt).getTime() - new Date(previous.sentAt).getTime() < 2 * 60 * 60 * 1000;
}
