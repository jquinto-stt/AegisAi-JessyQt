import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cabecera con la que Meta firma cada entrega del webhook.
 * Formato: `sha256=<hex>`.
 */
export const SIGNATURE_HEADER = "x-hub-signature-256";

/**
 * Verifica la firma `X-Hub-Signature-256` de Meta.
 *
 * ⚠️⚠️ Se calcula sobre el cuerpo **crudo**, byte a byte. Nunca sobre el JSON
 * reserializado: `JSON.stringify(JSON.parse(x))` reordena claves y quita espacios,
 * así que la firma no cuadraría — y una comprobación que "arreglara" eso aceptaría
 * cuerpos manipulados. Quien llama tiene que pasar el buffer tal como llegó, y por
 * eso el webhook captura el cuerpo antes del parser JSON (ver `raw-body.ts`).
 *
 * ⚠️ `appSecret` es un **secreto de servidor**. No puede llegar al navegador ni
 * viajar en la respuesta.
 *
 * Sin firma válida el mensaje **no** se procesa: es la única prueba de que la
 * entrega viene de Meta y no de cualquiera que conozca la URL del webhook, que es
 * pública por necesidad.
 */
export function verifyMetaSignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
  appSecret: string | undefined
): boolean {
  if (!rawBody || !signatureHeader || !appSecret) return false;

  const separator = signatureHeader.indexOf("=");
  if (separator === -1) return false;

  const scheme = signatureHeader.slice(0, separator).trim().toLowerCase();
  const digest = signatureHeader.slice(separator + 1).trim();
  if (scheme !== "sha256" || digest.length === 0) return false;

  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  const received = Buffer.from(digest, "hex");

  // ⚠️ Comparación en **tiempo constante**. Con `===` el tiempo depende del primer
  // byte que difiere, y eso permite ir adivinando la firma byte a byte. El chequeo
  // de longitud va antes porque `timingSafeEqual` lanza si difieren.
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

/**
 * Comparación en tiempo constante para un **secreto compartido** — hoy el token del
 * handshake de alta del webhook.
 *
 * Misma razón que arriba: `===` sobre una cadena corta filtra la longitud y el
 * prefijo que ya coinciden. La longitud se comprueba aparte porque
 * `timingSafeEqual` lanza si los buffers no miden lo mismo.
 */
export function safeEquals(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;

  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
