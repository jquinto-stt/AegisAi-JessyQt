/**
 * Convenciones de clave sobre la tabla compartida (`pk`/`sk`, ver `infra/app.ts`).
 *
 * El índice `phoneNumberId → tienda` **no** necesita un GSI: se guarda como un
 * registro cuya `pk` **es** el número. Un GSI obligaría a indexar toda la tabla y a
 * mantener el índice cada vez que un número cambia de tienda; la clave directa se
 * resuelve con un `GetItem` y no hay índice que quede desfasado.
 *
 * ⚠️ Las claves se construyen **sólo aquí**. Un `pk` escrito a mano en otro sitio es
 * un registro que nadie vuelve a encontrar.
 */

const PHONE_PREFIX = "phone#";
const INBOUND_PREFIX = "inbound#";
const SEEN_PREFIX = "seen#";

/** `pk` del vínculo número → tienda. Es el índice, y se lee con un `GetItem`. */
export const channelLinkPk = (phoneNumberId: string): string => `${PHONE_PREFIX}${phoneNumberId}`;

/** `sk` del vínculo. Fijo: un número apunta a una sola tienda. */
export const CHANNEL_LINK_SK = "channel";

/** `pk` de los mensajes entrantes de una tienda: la partición es **por tienda**. */
export const inboundPk = (businessId: string): string => `${INBOUND_PREFIX}${businessId}`;

/**
 * `sk` de un mensaje entrante. Empieza por la fecha para que el rango salga en
 * orden de llegada, y lleva el id de Meta detrás para desempatar dos mensajes del
 * mismo segundo sin que uno pise al otro.
 */
export const inboundSk = (sentAt: string, messageId: string): string => `${sentAt}#${messageId}`;

/**
 * `pk` del registro de idempotencia de un mensaje de Meta.
 *
 * ⚠️ Meta **reintenta** la entrega, así que el mismo mensaje llega más de una vez.
 * Se escribe con una condición de "no existe" (`attribute_not_exists`) antes de
 * guardar: si la escritura falla porque ya estaba, el mensaje es un duplicado y se
 * descarta. Es lo que impide que un reintento se convierta en dos pedidos.
 */
export const seenMessagePk = (messageId: string): string => `${SEEN_PREFIX}${messageId}`;

/** `sk` del registro de idempotencia. Fijo: un id de Meta se ve una sola vez. */
export const SEEN_MESSAGE_SK = "meta";
