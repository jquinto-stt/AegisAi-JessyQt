/**
 * Registro local de solicitudes de soporte.
 *
 * ⚠️ **Todavía no hay canal conectado.** `createSupportRequest` guarda la
 * solicitud en el almacenamiento del navegador y devuelve una referencia; **no**
 * la envía a ningún buzón, y por eso la página lo dice en voz alta en lugar de
 * dar a entender que un equipo la ha recibido.
 *
 * El aislamiento es deliberado, y es el mismo patrón que `SupportButton`: el día
 * que exista el canal real se cambia **esta función** y ni el formulario ni la
 * página se tocan. Si la llamada de red viviera dentro del componente, el
 * formulario tendría que reescribirse entero.
 *
 * ⚠️ Toda lectura y escritura va envuelta en `try/catch`, por la misma razón que
 * `legal/cookie-consent.ts`: en modo privado, o con el almacenamiento bloqueado,
 * `localStorage` **lanza** al acceder. Sin la guarda, un formulario de soporte
 * tumbaría la página entera.
 *
 * ⚠️ La clave lleva versión. Subirla es la forma de invalidar las solicitudes
 * guardadas bajo un formato anterior.
 */

/** Clave del registro vigente. */
export const SUPPORT_REQUESTS_KEY = "necto_support_requests_v1";

/** Alfabeto de la referencia: sin `I`, `O`, `0` ni `1`, que se confunden al
 *  dictarlos por teléfono o al copiarlos de un correo. */
const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface SupportRequest {
  /** Identificador interno, estable y único dentro del dispositivo. */
  id: string;
  /** Referencia legible que se le da a la persona (`SUP-20260915-4F2A`). */
  reference: string;
  /** `value` de `SUPPORT_TOPICS`. */
  topic: string;
  subject: string;
  message: string;
  /** Correo al que se responde. Puede ser el de la sesión o uno distinto. */
  email: string;
  /** ISO de creación. */
  createdAt: string;
}

export interface SupportRequestInput {
  topic: string;
  subject: string;
  message: string;
  email: string;
}

/** `AAAAMMDD` en hora **local**: la referencia se lee como una fecha, y el ISO
 *  en UTC puede caer en el día anterior para quien escribe de noche. */
function stamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function suffix(length = 4): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
  }
  return out;
}

/** Lee el registro. Un fallo de almacenamiento o un JSON corrupto se leen como
 *  "no hay nada", que es el peor caso aceptable: la solicitud nueva se escribe
 *  igual. */
export function readSupportRequests(): SupportRequest[] {
  try {
    const raw = localStorage.getItem(SUPPORT_REQUESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SupportRequest[]) : [];
  } catch {
    return [];
  }
}

/** Añade la solicitud al registro. Devuelve si se pudo escribir. */
export function appendSupportRequest(request: SupportRequest): boolean {
  try {
    const all = [...readSupportRequests(), request];
    localStorage.setItem(SUPPORT_REQUESTS_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

/**
 * Punto único de envío. **Aquí es donde irá la llamada al canal real.**
 *
 * Crea la solicitud, la registra en el dispositivo y la devuelve para que el
 * formulario pueda confirmar con la referencia. El `id` y la `reference` se
 * generan antes de escribir para que lo que se enseña y lo que se guarda sean
 * el mismo objeto, y no dos construcciones que puedan divergir.
 */
export function createSupportRequest(input: SupportRequestInput): SupportRequest {
  const now = new Date();
  const reference = `SUP-${stamp(now)}-${suffix()}`;
  const request: SupportRequest = {
    id: `${reference}-${now.getTime()}`,
    reference,
    topic: input.topic,
    subject: input.subject.trim(),
    message: input.message.trim(),
    email: input.email.trim().toLowerCase(),
    createdAt: now.toISOString(),
  };

  appendSupportRequest(request);
  return request;
}
